import { normalizeDaemonEndpointUrl } from "../state/index.ts";
import type { GuildSnapshot, GuildStateEmission } from "../types/domain.ts";
import { clientState } from "./client-state.ts";
import {
  getOperatorHeaders,
  refreshCachedOperatorProfile,
  withOperatorQuery,
} from "./operator-session-store.ts";
import { applyAuthoritativeSnapshot } from "./snapshot-gate.ts";

export const LIVE_STREAM_WATCHDOG_POLL_MS = 10_000;
export const LIVE_STREAM_FALLBACK_FETCH_MS = 20_000;
export const LIVE_STREAM_ZOMBIE_REOPEN_MS = 35_000;

export interface EventSourceLike {
  readonly readyState: number;
  addEventListener(type: string, listener: (ev: { data?: string }) => void): void;
  close(): void;
}

export interface LiveStreamControllerOptions {
  readonly onHudSync: () => void;
  readonly onEmissionApplied?: (emission: GuildStateEmission, prevSnapshot: GuildSnapshot) => void;
  readonly isDisabled?: () => boolean;
  readonly createEventSource?: (url: string) => EventSourceLike;
  readonly fetchImpl?: typeof fetch;
  readonly now?: () => number;
  readonly watchdogPollMs?: number;
  readonly fallbackFetchMs?: number;
  readonly zombieReopenMs?: number;
  readonly bindLifecycleListeners?: boolean;
}

export interface LiveStreamController {
  open(): void;
  ensureConnected(forceReopen?: boolean): void;
  syncSnapshotNow(options?: { allowVersionReset?: boolean }): Promise<boolean>;
  runWatchdogTick(): void;
  close(): void;
}

const STREAM_RESET_DELTA_KINDS = new Set([
  "stream.connected",
  "snapshot.hydrated",
  "adapter.switched",
]);

export function createLiveStreamController(
  options: LiveStreamControllerOptions,
): LiveStreamController {
  const now = options.now ?? (() => Date.now());
  const watchdogPollMs = options.watchdogPollMs ?? LIVE_STREAM_WATCHDOG_POLL_MS;
  const fallbackFetchMs = options.fallbackFetchMs ?? LIVE_STREAM_FALLBACK_FETCH_MS;
  const zombieReopenMs = options.zombieReopenMs ?? LIVE_STREAM_ZOMBIE_REOPEN_MS;
  const createEventSourceFn =
    options.createEventSource ??
    ((url: string) => new EventSource(url) as unknown as EventSourceLike);
  const fetchFn: typeof fetch =
    options.fetchImpl ?? ((input, init) => globalThis.fetch(input, init));

  let activeEventSource: EventSourceLike | null = null;
  let lastSseActivityAtMs = now();
  let watchdogTimer: ReturnType<typeof setInterval> | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let snapshotSyncInFlight: Promise<boolean> | null = null;
  let lifecycleBound = false;
  let closed = false;

  const isClosedReadyState = (es: EventSourceLike | null): boolean => {
    const closedConst = typeof EventSource !== "undefined" ? EventSource.CLOSED : 2;
    return !es || es.readyState === closedConst;
  };

  async function syncSnapshotNow(syncOpts?: { allowVersionReset?: boolean }): Promise<boolean> {
    if (closed || options.isDisabled?.()) return false;
    if (snapshotSyncInFlight) return snapshotSyncInFlight;
    snapshotSyncInFlight = (async () => {
      try {
        const res = await fetchFn("/api/guild/snapshot", {
          headers: getOperatorHeaders(),
        });
        if (!res.ok) return false;
        const snap = (await res.json()) as GuildSnapshot | null;
        if (snap && snap.rooms && applyAuthoritativeSnapshot(snap, syncOpts)) {
          options.onHudSync();
          return true;
        }
      } catch {
        // Ignore transient network errors
      }
      return false;
    })().finally(() => {
      snapshotSyncInFlight = null;
    });
    return snapshotSyncInFlight;
  }

  function handleLiveMessage(rawData: string | undefined): void {
    if (!rawData) return;
    lastSseActivityAtMs = now();
    try {
      const emission = JSON.parse(rawData) as GuildStateEmission | null;
      if (!emission || !emission.snapshot) return;
      const prevSnapshot = clientState.currentSnapshot;
      const allowVersionReset = STREAM_RESET_DELTA_KINDS.has(emission.delta?.kind ?? "");
      const applied = applyAuthoritativeSnapshot(emission.snapshot, {
        allowVersionReset,
      });
      if (!applied) return;
      options.onEmissionApplied?.(emission, prevSnapshot);
      options.onHudSync();
    } catch {
      // Ignore malformed SSE payload
    }
  }

  function handleHeartbeat(rawData: string | undefined): void {
    lastSseActivityAtMs = now();
    if (!rawData) return;
    try {
      const hb = JSON.parse(rawData) as {
        version?: number;
        timestampMs?: number;
        daemonUrl?: string | null;
      } | null;
      if (!hb) return;
      const cur = clientState.currentSnapshot;
      const curVer = typeof cur?.version === "number" ? cur.version : 0;
      const hbVer = typeof hb.version === "number" ? hb.version : 0;
      const curUrl = normalizeDaemonEndpointUrl(cur?.daemonUrl) || null;
      const hbUrl = normalizeDaemonEndpointUrl(hb.daemonUrl) || null;
      const versionDrifted = hbVer > 0 && hbVer !== curVer;
      const hostDrifted = Boolean(hbUrl && curUrl && hbUrl !== curUrl);
      if (versionDrifted || hostDrifted) {
        const allowVersionReset =
          hbVer < curVer &&
          typeof hb.timestampMs === "number" &&
          hb.timestampMs > (cur?.timestampMs ?? 0);
        void syncSnapshotNow({ allowVersionReset });
      }
    } catch {
      // Ignore heartbeat parse errors
    }
  }

  function handlePageResume(): void {
    if (closed || options.isDisabled?.()) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    const silenceMs = now() - lastSseActivityAtMs;
    if (isClosedReadyState(activeEventSource) || silenceMs >= fallbackFetchMs) {
      open();
    }
    void syncSnapshotNow();
  }

  function handleOnline(): void {
    if (closed || options.isDisabled?.()) return;
    open();
    void syncSnapshotNow();
  }

  function bindBrowserLifecycle(): void {
    if (lifecycleBound || options.bindLifecycleListeners === false) return;
    lifecycleBound = true;
    if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
      document.addEventListener("visibilitychange", handlePageResume);
    }
    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      window.addEventListener("online", handleOnline);
      window.addEventListener("pageshow", handlePageResume);
    }
  }

  function runWatchdogTick(): void {
    if (closed || options.isDisabled?.()) return;
    const silenceMs = now() - lastSseActivityAtMs;
    if (isClosedReadyState(activeEventSource) || silenceMs >= zombieReopenMs) {
      open();
      void syncSnapshotNow();
    } else if (silenceMs >= fallbackFetchMs) {
      void syncSnapshotNow();
    }
    if (clientState.isAuthenticated && !options.fetchImpl) {
      void refreshCachedOperatorProfile().then(() => options.onHudSync());
    }
  }

  function open(): void {
    if (closed || options.isDisabled?.()) return;
    if (!options.createEventSource && typeof EventSource === "undefined") return;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    activeEventSource?.close();
    const es = createEventSourceFn(withOperatorQuery("/api/guild/events"));
    activeEventSource = es;
    lastSseActivityAtMs = now();

    es.addEventListener("error", () => {
      if (isClosedReadyState(es) && activeEventSource === es && !closed) {
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          if (activeEventSource === es && !closed) {
            open();
            void syncSnapshotNow();
          }
        }, 2000);
        reconnectTimer.unref?.();
      }
    });
    es.addEventListener("message", (ev) => {
      if (activeEventSource !== es || closed) return;
      handleLiveMessage(ev.data);
    });
    es.addEventListener("heartbeat", (ev) => {
      if (activeEventSource !== es || closed) return;
      handleHeartbeat(ev.data);
    });

    bindBrowserLifecycle();
    if (!watchdogTimer && watchdogPollMs > 0) {
      watchdogTimer = setInterval(runWatchdogTick, watchdogPollMs);
      watchdogTimer.unref?.();
    }
  }

  function ensureConnected(forceReopen = false): void {
    if (forceReopen || isClosedReadyState(activeEventSource)) {
      open();
    }
  }

  function close(): void {
    closed = true;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (watchdogTimer) {
      clearInterval(watchdogTimer);
      watchdogTimer = null;
    }
    activeEventSource?.close();
    activeEventSource = null;
    if (lifecycleBound) {
      lifecycleBound = false;
      if (typeof document !== "undefined" && typeof document.removeEventListener === "function") {
        document.removeEventListener("visibilitychange", handlePageResume);
      }
      if (typeof window !== "undefined" && typeof window.removeEventListener === "function") {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("pageshow", handlePageResume);
      }
    }
  }

  return { open, ensureConnected, syncSnapshotNow, runWatchdogTick, close };
}
