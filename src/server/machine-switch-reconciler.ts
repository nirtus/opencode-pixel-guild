import {
  clearRemoteDirectoryRunners,
  createHttpOpenCodeDaemonClient,
  createOpenCodeClientAdapter,
  invalidateGitStatusCache,
  invalidateTaskProgressCache,
  type DiscoveredOpenCodeService,
  type OpenCodeClientAdapter,
  type OpenCodeDaemonClientPort,
} from "../ingress/index.ts";
import { createWorldStateReducer, normalizeDaemonEndpointUrl } from "../state/index.ts";
import type { GuildStateEmission, WorldStateReducer } from "../types/domain.ts";
import type { GuildChronicleStorePort, MachineScopeKey } from "./chronicle-sqlite-store.ts";
import type { GuildOperatorProfile } from "./operator-store.ts";
import { reconcilePersistedSnapshotWithDaemon } from "./snapshot-reconciler.ts";

export function getMachineScopeKey(opId: string, url?: string | null): MachineScopeKey {
  const clean = normalizeDaemonEndpointUrl(url);
  return clean ? `${opId}@@${clean}` : opId;
}

export function buildDaemonAuthHeaders(password?: string): Record<string, string> {
  return password
    ? { Authorization: "Basic " + Buffer.from(`opencode:${password}`).toString("base64") }
    : {};
}

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
      const svc = await options.discoverService();
      const infoRes = await fetch(`${svc.url.replace(/\/+$/, "")}/api/info`, {
        headers: { Accept: "application/json", ...svc.headers },
        signal: AbortSignal.timeout(1500),
      });
      if (infoRes.ok) {
        const info = (await infoRes.json()) as { urls?: string[] };
        const normClean = normalizeDaemonEndpointUrl(cleanUrl);
        if (
          Array.isArray(info?.urls) &&
          info.urls.some((u) => normalizeDaemonEndpointUrl(u) === normClean)
        ) {
          effectiveUrl = svc.url;
          effectiveHeaders = svc.headers;
        }
      }
    } catch {
      /* use remote tunnel directly */
    }
  }
  return { effectiveUrl, effectiveHeaders };
}

export interface CreateRuntimePairingControllerOptions {
  readonly operatorId: string;
  readonly profile: GuildOperatorProfile;
  readonly reducer: WorldStateReducer;
  readonly chronicleStore: GuildChronicleStorePort;
  readonly discoverService?: () => Promise<DiscoveredOpenCodeService>;
  readonly createDaemonClient?: (url: string, headers: Record<string, string>) => OpenCodeDaemonClientPort;
  readonly onAdapterChanged: (adapter: OpenCodeClientAdapter | undefined, client?: OpenCodeDaemonClientPort) => void;
  readonly onPasswordChanged: (password?: string) => void;
  readonly flushPendingSave: (scopeUrl: string | null) => void;
  readonly persistAll: () => void;
}

export interface RuntimePairingController {
  isPairingInFlight(): boolean;
  getLastStableDaemonUrl(): string | null;
  pairDaemon(targetUrl: string, password?: string): Promise<boolean>;
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
  let pendingAdapter: OpenCodeClientAdapter | null = null;

  const stopAdapters = () => {
    pendingAdapter?.stop();
    pendingAdapter = null;
    activeAdapter?.stop();
    activeAdapter = undefined;
    opts.onAdapterChanged(undefined);
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
      const isDifferentMachine =
        wasInFlight ||
        normalizeDaemonEndpointUrl(prevSnap.daemonUrl) !== normalizeDaemonEndpointUrl(cleanUrl);
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
          if (prevSnap.daemonUrl && prevSnap.daemonUrl !== prevStableUrl) {
            clearRemoteDirectoryRunners(prevSnap.daemonUrl);
          }
          if (!prevStableUrl && !prevSnap.daemonUrl) clearRemoteDirectoryRunners();
          invalidateGitStatusCache();
          invalidateTaskProgressCache();
        }
        opts.reducer.reset?.({ adapter: "opencode-client", daemonUrl: cleanUrl });
      } else {
        opts.reducer.dispatch({
          type: "adapter.switched",
          timestampMs: Date.now(),
          adapter: "opencode-client",
          daemonUrl: cleanUrl,
        });
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
        pendingAdapter = null;
        opts.onAdapterChanged(ca, dc);
        await ca.startLiveSubscription?.();
        if (currentEpoch !== pairingEpoch) { ca.stop(); return false; }
        opts.profile.reachable = true;
        opts.profile.lastSyncedAtMs = Date.now();
        opts.profile.errorMessage = null;
        for (const m of opts.profile.pairedMachines) {
          if (m.daemonUrl === cleanUrl) {
            m.reachable = true;
            m.lastSyncedAtMs = opts.profile.lastSyncedAtMs;
            m.errorMessage = null;
          }
        }
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
        if (isDifferentMachine) {
          opts.reducer.reset?.({ adapter: "opencode-client", daemonUrl: cleanUrl });
          if (baseSnap) opts.reducer.hydrateFromSnapshot?.(baseSnap);
        }
        opts.onAdapterChanged(undefined, dc);
        opts.profile.reachable = false;
        opts.profile.errorMessage = err instanceof Error ? err.message : "Failed to reach OpenCode daemon";
        for (const m of opts.profile.pairedMachines) {
          if (m.daemonUrl === cleanUrl) {
            m.reachable = false;
            m.errorMessage = opts.profile.errorMessage;
          }
        }
        lastStableDaemonUrl = cleanUrl;
        pairingInFlight = false;
        opts.persistAll();
        return false;
      }
    },
  };
}
