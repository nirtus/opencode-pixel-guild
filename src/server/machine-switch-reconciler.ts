import {
  clearRemoteDirectoryRunners,
  createHttpOpenCodeDaemonClient,
  createOpenCodeClientAdapter,
  fetchWithDockerHostFallback,
  setActiveGitCacheScope,
  type DiscoveredOpenCodeService,
  type OpenCodeClientAdapter,
  type OpenCodeDaemonClientPort,
} from "../ingress/index.ts";
import { createWorldStateReducer, normalizeDaemonEndpointUrl } from "../state/index.ts";
import type { GuildStateEmission, WorldStateReducer } from "../types/domain.ts";
import type { GuildChronicleStorePort, MachineScopeKey } from "./chronicle-sqlite-store.ts";
import type { GuildOperatorProfile, PairedOpenCodeMachine } from "./operator-store.ts";
import { reconcilePersistedSnapshotWithDaemon, sanitizeOfflinePersistedSnapshot } from "./snapshot-reconciler.ts";

export function getMachineScopeKey(opId: string, url?: string | null): MachineScopeKey {
  const clean = normalizeDaemonEndpointUrl(url);
  return clean ? `${opId}@@${clean}` : opId;
}

export function buildDaemonAuthHeaders(password?: string): Record<string, string> {
  return password
    ? { Authorization: "Basic " + Buffer.from(`opencode:${password}`).toString("base64") }
    : {};
}

const LOCAL_DISCOVERY_CACHE_TTL_MS = 60_000;
const localDiscoveryInfoCache = new WeakMap<
  () => Promise<DiscoveredOpenCodeService>,
  { expiresAtMs: number; url: string; headers: Record<string, string>; urls: string[] }
>();

export async function resolveEffectiveDaemonEndpoint(
  cleanUrl: string,
  password: string | undefined,
  options: {
    discoverService?: () => Promise<DiscoveredOpenCodeService>;
    hasCustomDaemonClient: boolean;
  },
): Promise<{ effectiveUrl: string; effectiveHeaders: Record<string, string> }> {
  let effectiveUrl = cleanUrl;
  let effectiveHeaders = buildDaemonAuthHeaders(password);
  if (
    options.discoverService &&
    !options.hasCustomDaemonClient &&
    /\.(opentunnel\.xyz|lhr\.life)\b/i.test(cleanUrl)
  ) {
    try {
      const nowMs = Date.now();
      let cached = localDiscoveryInfoCache.get(options.discoverService);
      if (!cached || cached.expiresAtMs <= nowMs) {
        try {
          const svc = await options.discoverService();
          let urls = Array.isArray(svc.urls) ? svc.urls : null;
          if (!urls) {
            const infoRes = await fetch(`${svc.url.replace(/\/+$/, "")}/api/info`, {
              headers: { Accept: "application/json", ...svc.headers },
              signal: AbortSignal.timeout(800),
            });
            if (infoRes.ok) {
              const info = (await infoRes.json()) as { urls?: string[] };
              urls = Array.isArray(info?.urls) ? info.urls : [];
            } else {
              urls = [];
            }
          }
          cached = { expiresAtMs: Date.now() + LOCAL_DISCOVERY_CACHE_TTL_MS, url: svc.url, headers: svc.headers, urls };
        } catch {
          cached = { expiresAtMs: Date.now() + LOCAL_DISCOVERY_CACHE_TTL_MS, url: "", headers: {}, urls: [] };
        }
        localDiscoveryInfoCache.set(options.discoverService, cached);
      }
      const normClean = normalizeDaemonEndpointUrl(cleanUrl);
      if (cached.url && cached.urls.some((u) => normalizeDaemonEndpointUrl(u) === normClean)) {
        effectiveUrl = cached.url;
        effectiveHeaders = cached.headers;
      }
    } catch {
      /* use remote tunnel directly */
    }
  }
  return { effectiveUrl, effectiveHeaders };
}

export async function probePairedMachineAvailability(
  machine: PairedOpenCodeMachine,
  options: {
    discoverService?: () => Promise<DiscoveredOpenCodeService>;
    createDaemonClient?: (url: string, headers: Record<string, string>) => OpenCodeDaemonClientPort;
    fetchImpl?: typeof fetch;
  },
): Promise<{ reachable: boolean; errorMessage: string | null }> {
  const cleanUrl = (machine.daemonUrl || "").trim();
  if (!cleanUrl) return { reachable: false, errorMessage: "Missing daemonUrl" };
  try {
    const { effectiveUrl, effectiveHeaders } = await resolveEffectiveDaemonEndpoint(cleanUrl, machine.daemonPassword, {
      discoverService: options.discoverService,
      hasCustomDaemonClient: Boolean(options.createDaemonClient),
    });
    if (options.createDaemonClient) {
      const dc = options.createDaemonClient(effectiveUrl, effectiveHeaders);
      dc.clearCaches?.();
      try {
        await dc.getLocations();
        return { reachable: true, errorMessage: null };
      } finally {
        dc.abortAll?.();
      }
    }
    const rootUrl = effectiveUrl.replace(/\/+$/, "");
    for (const probePath of ["/api/info", "/api/project"]) {
      const res = await fetchWithDockerHostFallback(
        `${rootUrl}${probePath}`,
        { headers: { Accept: "application/json", ...effectiveHeaders } },
        options.fetchImpl,
        2500,
      );
      if (res.ok) return { reachable: true, errorMessage: null };
      if (res.status !== 404) {
        return { reachable: false, errorMessage: `OpenCode daemon returned HTTP ${res.status} on ${probePath}` };
      }
    }
    return { reachable: false, errorMessage: "OpenCode daemon returned HTTP 404" };
  } catch (err) {
    return {
      reachable: false,
      errorMessage: err instanceof Error ? err.message : "Failed to reach OpenCode daemon",
    };
  }
}

export interface CreateRuntimePairingControllerOptions {
  readonly operatorId: string;
  readonly profile: GuildOperatorProfile;
  readonly reducer: WorldStateReducer;
  readonly chronicleStore: GuildChronicleStorePort;
  readonly discoverService?: () => Promise<DiscoveredOpenCodeService>;
  readonly createDaemonClient?: (url: string, headers: Record<string, string>) => OpenCodeDaemonClientPort;
  readonly fetchImpl?: typeof fetch;
  readonly onAdapterChanged: (adapter: OpenCodeClientAdapter | undefined, client?: OpenCodeDaemonClientPort) => void;
  readonly onPasswordChanged: (password?: string) => void;
  readonly flushPendingSave: (scopeUrl: string | null) => void;
  readonly persistAll: () => void;
}

export interface RuntimePairingController {
  isPairingInFlight(): boolean;
  getLastStableDaemonUrl(): string | null;
  pairDaemon(targetUrl: string, password?: string): Promise<boolean>;
  refreshPairedMachinesAvailability(options?: { forceSweepActive?: boolean }): Promise<void>;
  resetDisconnected(): void;
  cancelForDemo(): void;
  close(): void;
}

export function createRuntimePairingController(
  opts: CreateRuntimePairingControllerOptions,
): RuntimePairingController {
  let pairingEpoch = 0;
  let pairingInFlight = false;
  let initialSyncCompleted = false;
  let lastStableDaemonUrl: string | null = opts.profile.daemonUrl;
  let activeAdapter: OpenCodeClientAdapter | undefined;
  let activeDaemonClient: OpenCodeDaemonClientPort | undefined;
  let pendingAdapter: OpenCodeClientAdapter | null = null;

  const stopAdapters = () => {
    pendingAdapter?.stop();
    pendingAdapter = null;
    activeAdapter?.stop();
    activeAdapter = undefined;
    opts.onAdapterChanged(undefined);
  };

  const applyActiveReachability = (reachable: boolean, errorMessage: string | null) => {
    const nowMs = Date.now();
    let changed = opts.profile.reachable !== reachable || opts.profile.errorMessage !== errorMessage;
    opts.profile.reachable = reachable;
    opts.profile.errorMessage = errorMessage;
    if (reachable) opts.profile.lastSyncedAtMs = nowMs;
    const normActive = normalizeDaemonEndpointUrl(opts.profile.daemonUrl);
    for (const m of opts.profile.pairedMachines) {
      if (m.isActive || (normActive && normalizeDaemonEndpointUrl(m.daemonUrl) === normActive)) {
        if (m.reachable !== reachable || m.errorMessage !== errorMessage) changed = true;
        m.reachable = reachable;
        m.errorMessage = errorMessage;
        if (reachable) m.lastSyncedAtMs = nowMs;
      }
    }
    return changed;
  };

  return {
    isPairingInFlight: () => pairingInFlight,
    getLastStableDaemonUrl: () => lastStableDaemonUrl,
    resetDisconnected() {
      pairingEpoch += 1;
      pairingInFlight = false;
      lastStableDaemonUrl = null;
      stopAdapters();
      opts.onAdapterChanged(undefined, undefined);
      opts.reducer.reset?.({ adapter: "opencode-client", daemonUrl: null });
      opts.reducer.hydrateFromSnapshot?.(opts.reducer.getSnapshot());
    },
    cancelForDemo() {
      pairingEpoch += 1;
      pairingInFlight = false;
      lastStableDaemonUrl = null;
      stopAdapters();
    },
    close() {
      pairingEpoch += 1;
      if (!pairingInFlight && lastStableDaemonUrl) {
        opts.flushPendingSave(lastStableDaemonUrl);
      }
      pairingInFlight = false;
      stopAdapters();
    },
    async pairDaemon(targetUrl: string, password?: string): Promise<boolean> {
      const currentEpoch = ++pairingEpoch;
      const cleanUrl = targetUrl.trim();
      const prevSnap = opts.reducer.getSnapshot();
      const wasInFlight = pairingInFlight;
      const prevStableUrl = lastStableDaemonUrl;
  const isDifferentMachine = wasInFlight || normalizeDaemonEndpointUrl(prevSnap.daemonUrl) !== normalizeDaemonEndpointUrl(cleanUrl);
      const shouldAuthoritativeReconcile = isDifferentMachine || !initialSyncCompleted;
      if (!wasInFlight) opts.flushPendingSave(prevStableUrl ?? prevSnap.daemonUrl);
      pairingInFlight = true;
      stopAdapters();
      opts.onPasswordChanged(password);
      opts.profile.daemonUrl = cleanUrl;
      opts.profile.paired = true;
      opts.profile.adapterMode = "opencode-client";
      opts.profile.updatedAtMs = Date.now();
      if (isDifferentMachine || prevSnap.activeAdapter === "demo-simulator") {
        if (isDifferentMachine) {
          if (prevStableUrl) clearRemoteDirectoryRunners(prevStableUrl);
          if (prevSnap.daemonUrl && prevSnap.daemonUrl !== prevStableUrl) clearRemoteDirectoryRunners(prevSnap.daemonUrl);
          if (!prevStableUrl && !prevSnap.daemonUrl) clearRemoteDirectoryRunners();
          setActiveGitCacheScope(cleanUrl);
        }
        opts.reducer.reset?.({ adapter: "opencode-client", daemonUrl: cleanUrl });
      } else {
        setActiveGitCacheScope(cleanUrl);
        opts.reducer.dispatch({ type: "adapter.switched", timestampMs: Date.now(), adapter: "opencode-client", daemonUrl: cleanUrl });
      }

      const { effectiveUrl, effectiveHeaders } = await resolveEffectiveDaemonEndpoint(cleanUrl, password, {
        discoverService: opts.discoverService,
        hasCustomDaemonClient: Boolean(opts.createDaemonClient),
      });
      if (currentEpoch !== pairingEpoch) return false;

      const dc = (opts.createDaemonClient ?? createHttpOpenCodeDaemonClient)(effectiveUrl, effectiveHeaders);
      const ca = createOpenCodeClientAdapter({ discoverDaemon: async () => ({ url: effectiveUrl }), client: dc });
      pendingAdapter = ca;

      const targetKey = getMachineScopeKey(opts.operatorId, cleanUrl);
      const baseSnap = isDifferentMachine ? opts.chronicleStore.loadSnapshot(targetKey) : prevSnap;
      if (baseSnap?.deletedSessionIds?.length) ca.evictDeletedSessions?.(baseSnap.deletedSessionIds);
      if (baseSnap?.deletedRoomIds?.length) ca.evictDeletedRooms?.(baseSnap.deletedRoomIds);

      const stagingReducer = createWorldStateReducer({ initialAdapter: "opencode-client", daemonUrl: cleanUrl });
      if (
        !shouldAuthoritativeReconcile &&
        baseSnap &&
        (Object.keys(baseSnap.rooms ?? {}).length > 0 ||
          Object.keys(baseSnap.characters ?? {}).length > 0 ||
          Object.keys(baseSnap.tributeLedger ?? {}).length > 0 ||
          (baseSnap.deletedSessionIds?.length ?? 0) > 0 ||
          (baseSnap.deletedRoomIds?.length ?? 0) > 0)
      ) {
        stagingReducer.hydrateFromSnapshot?.(baseSnap, opts.reducer.getCatalog());
      }

      let targetReducer: WorldStateReducer = stagingReducer;
      const proxyReducer = {
        dispatch: (ev: Parameters<WorldStateReducer["dispatch"]>[0]) => {
          if (currentEpoch !== pairingEpoch) return undefined as unknown as GuildStateEmission;
          return targetReducer.dispatch(ev);
        },
        dispatchBatch: (evs: Parameters<WorldStateReducer["dispatchBatch"]>[0]) => {
          if (currentEpoch !== pairingEpoch) return null;
          return targetReducer.dispatchBatch(evs);
        },
        getSnapshot: () => targetReducer.getSnapshot(),
      } as WorldStateReducer;

      try {
        await ca.start(proxyReducer);
        if (currentEpoch !== pairingEpoch) { ca.stop(); return false; }
        const stagedSnap = stagingReducer.getSnapshot();
        const curDel = isDifferentMachine ? (baseSnap?.deletedSessionIds ?? []) : (opts.reducer.getSnapshot().deletedSessionIds ?? []);
        const curDelRooms = isDifferentMachine ? (baseSnap?.deletedRoomIds ?? []) : (opts.reducer.getSnapshot().deletedRoomIds ?? []);
        const { mergedSnap, prunedTributeSessionIds } = shouldAuthoritativeReconcile
          ? await reconcilePersistedSnapshotWithDaemon({
              stagedSnapshot: stagedSnap,
              persistedSnapshot: baseSnap,
              daemonClient: dc,
              daemonUrl: cleanUrl,
              deletedSessionIds: curDel,
              deletedRoomIds: curDelRooms,
              isStillCurrentEpoch: () => currentEpoch === pairingEpoch,
            })
          : {
              mergedSnap: {
                ...stagedSnap,
                tributeLedger: { ...(baseSnap?.tributeLedger ?? {}), ...(stagedSnap.tributeLedger ?? {}) },
                deletedSessionIds: [...new Set([...(stagedSnap.deletedSessionIds ?? []), ...curDel])],
                deletedRoomIds: [...new Set([...(stagedSnap.deletedRoomIds ?? []), ...curDelRooms])],
              },
              prunedTributeSessionIds: [],
            };
        if (currentEpoch !== pairingEpoch) { ca.stop(); return false; }
        if (
          shouldAuthoritativeReconcile ||
          Object.keys(stagedSnap.rooms).length > 0 ||
          (stagedSnap.deletedRoomIds?.length ?? 0) > 0 ||
          curDelRooms.length > 0
        ) {
          opts.reducer.reset?.({ adapter: "opencode-client", daemonUrl: cleanUrl });
          opts.reducer.hydrateFromSnapshot?.(mergedSnap, stagingReducer.getCatalog());
        }
        targetReducer = opts.reducer;
        activeAdapter = ca;
        activeDaemonClient = dc;
        pendingAdapter = null;
        opts.onAdapterChanged(ca, dc);
        await ca.startLiveSubscription?.();
        if (currentEpoch !== pairingEpoch) { ca.stop(); return false; }
        applyActiveReachability(true, null);
        lastStableDaemonUrl = cleanUrl;
        initialSyncCompleted = true;
        pairingInFlight = false;
        if (prunedTributeSessionIds.length > 0) {
          opts.chronicleStore.pruneTributeSessions(targetKey, prunedTributeSessionIds);
        }
        opts.chronicleStore.saveSnapshot(targetKey, opts.reducer.getSnapshot());
        opts.persistAll();
        return true;
      } catch (err) {
        ca.stop();
        if (pendingAdapter === ca) pendingAdapter = null;
        if (currentEpoch !== pairingEpoch) return false;
        if (shouldAuthoritativeReconcile) {
          opts.reducer.reset?.({ adapter: "opencode-client", daemonUrl: cleanUrl });
          const safeOfflineSnap = sanitizeOfflinePersistedSnapshot(baseSnap);
          if (safeOfflineSnap) opts.reducer.hydrateFromSnapshot?.(safeOfflineSnap);
        }
        activeDaemonClient = dc;
        opts.onAdapterChanged(undefined, dc);
        applyActiveReachability(false, err instanceof Error ? err.message : "Failed to reach OpenCode daemon");
        lastStableDaemonUrl = cleanUrl;
        pairingInFlight = false;
        opts.persistAll();
        return false;
      }
    },
    async refreshPairedMachinesAvailability(options) {
      if (pairingInFlight || opts.profile.adapterMode !== "opencode-client") return;
      let changed = false;
      const nonActive = opts.profile.pairedMachines.filter((m) => !m.isActive);
      const nonActiveTask = Promise.all(
        nonActive.map(async (m) => {
          const res = await probePairedMachineAvailability(m, {
            discoverService: opts.discoverService,
            createDaemonClient: opts.createDaemonClient,
            fetchImpl: opts.fetchImpl,
          });
          if (m.reachable !== res.reachable || m.errorMessage !== res.errorMessage) changed = true;
          m.reachable = res.reachable;
          m.errorMessage = res.errorMessage;
          if (res.reachable) m.lastSyncedAtMs = Date.now();
        }),
      );
      if (activeAdapter) {
        if (options?.forceSweepActive) activeDaemonClient?.clearCaches?.();
        try {
          await activeAdapter.sweepAllLocations(false);
          if (applyActiveReachability(true, null)) changed = true;
        } catch (err) {
          if (applyActiveReachability(false, err instanceof Error ? err.message : "Failed to reach OpenCode daemon")) changed = true;
        }
      } else if (opts.profile.daemonUrl) {
        const activeMachine = opts.profile.pairedMachines.find((m) => m.isActive);
        await this.pairDaemon(opts.profile.daemonUrl, activeMachine?.daemonPassword);
      }
      await nonActiveTask;
      if (changed) opts.persistAll();
    },
  };
}
