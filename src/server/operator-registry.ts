import { randomBytes } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { discoverLocalOpenCodeService, type DiscoveredOpenCodeService, type OpenCodeClientAdapter, type OpenCodeDaemonClientPort, resolveAndRedeemOpenCodePairing } from "../ingress/index.ts";
import { DEMO_SCENARIO_PRESETS, type DemoScenarioPresetId, type DemoScenarioRunResult, runDemoScenarioPreset } from "../simulator/demo-guild-simulator.ts";
import { createWorldStateReducer, isLocalDaemonEndpoint } from "../state/index.ts";
import type { GuildStateEmission, WorldStateReducer } from "../types/domain.ts";
import type { GuildApiRouterContext } from "./api-router.ts";
import { handleOperatorHttpRoutes, type OperatorWorkspaceRegistryPort } from "./operator-routes.ts";
import { createGuildChronicleStore, type GuildChronicleStorePort } from "./chronicle-sqlite-store.ts";
import { createRuntimePairingController, getMachineScopeKey, probePairedMachineAvailability } from "./machine-switch-reconciler.ts";
import { buildFallbackOperatorResponse, createInitialOperatorProfile, type GuildOperatorPreferences, type GuildOperatorProfile, hashOperatorPassword, type PairedOpenCodeMachine, stripPrivateOperatorFields, syncProfileActiveMachineState, verifyOperatorPassword } from "./operator-store.ts";
import { createSseBroadcaster } from "./sse-broadcaster.ts";

export type { GuildOperatorPreferences, GuildOperatorProfile, PairedOpenCodeMachine };

export interface OperatorWorkspaceRuntime {
  profile: GuildOperatorProfile; daemonPassword?: string; reducer: WorldStateReducer; sseClients: Set<ServerResponse>;
  clientAdapter?: OpenCodeClientAdapter; daemonClient?: Pick<OpenCodeDaemonClientPort, "deleteSession" | "deleteRoomResources" | "executeCommand"> | OpenCodeDaemonClientPort;
  unsubscribeReducer: () => void; toRouterContext(): GuildApiRouterContext; pairDaemon(daemonUrl: string, daemonPassword?: string): Promise<boolean>; refreshAvailability(forceSweepActive?: boolean): Promise<void>; resetDisconnected(): void; close(): void;
}

export interface CreateOperatorRegistryOptions {
  defaultContext: () => GuildApiRouterContext; defaultDaemonUrl: string; storeFilePath?: string; dataDirPath?: string;
  requireAuth?: boolean; fetchImpl?: typeof fetch; discoverService?: () => Promise<DiscoveredOpenCodeService>;
  createDaemonClient?: (url: string, headers: Record<string, string>) => OpenCodeDaemonClientPort;
}

export function resolveRequestOperatorId(req: IncomingMessage, urlObj: URL): string | null {
  const headerVal = req.headers["x-guild-operator-id"];
  if (typeof headerVal === "string" && headerVal.trim()) return headerVal.trim();
  const queryVal = urlObj.searchParams.get("operatorId")?.trim();
  if (queryVal) return queryVal;
  const cookieHeader = req.headers.cookie;
  if (typeof cookieHeader === "string") {
    const match = /(?:^|;\s*)guild_operator_id=([^;]+)/.exec(cookieHeader);
    if (match?.[1]?.trim()) return decodeURIComponent(match[1].trim());
  }
  return null;
}

export function createOperatorWorkspaceRegistry(options: CreateOperatorRegistryOptions): OperatorWorkspaceRegistryPort {
  const operators = new Map<string, OperatorWorkspaceRuntime>();
  const lockedEmptyReducer = createWorldStateReducer({ initialAdapter: "opencode-client", daemonUrl: null });
  const lockedSseClients = new Set<ServerResponse>();
  const chronicleStore: GuildChronicleStorePort = createGuildChronicleStore({ dataDirPath: options.dataDirPath, operatorsFilePath: options.storeFilePath });
  const persistAll = (): void => chronicleStore.saveOperators([...operators.values()].map((r) => r.profile));

  function createRuntime(
    operatorId: string,
    input: {
      username?: string; passwordHash?: string; label?: string; daemonUrl?: string | null;
      daemonPassword?: string; pairedMachines?: PairedOpenCodeMachine[]; preferences?: Partial<GuildOperatorPreferences>;
    } = {},
  ): OperatorWorkspaceRuntime {
    const profile = createInitialOperatorProfile(operatorId, input);
    let lastKnownDaemonUrl: string | null = profile.daemonUrl;
    let isPairingInFlight = () => false;
    let getStableDaemonUrl = () => lastKnownDaemonUrl ?? profile.daemonUrl;
    const reducer = createWorldStateReducer({
      initialAdapter: "opencode-client",
      daemonUrl: profile.daemonUrl,
      onBeforeArchiveCharacter: (char) => {
        if (!chronicleStore || isPairingInFlight() || !char.messages?.length) return;
        chronicleStore.upsertSessionMessages(getStoreKey(getStableDaemonUrl()), char.sessionId, char.messages);
      },
    });
    const getStoreKey = (url?: string | null) => getMachineScopeKey(operatorId, url ?? reducer.getSnapshot().daemonUrl ?? profile.daemonUrl);
    const initKey = getStoreKey(profile.daemonUrl);
    const persistedSnap = chronicleStore?.loadSnapshot(initKey) ?? (initKey !== operatorId && profile.pairedMachines.length <= 1 ? chronicleStore?.loadSnapshot(operatorId) : null);
    if (persistedSnap) reducer.hydrateFromSnapshot?.(persistedSnap);
    const sseClients = new Set<ServerResponse>();
    const sseBroadcaster = createSseBroadcaster(sseClients);
    let saveTimer: ReturnType<typeof setTimeout> | null = null;
    const flushPendingSave = (scopeUrl: string | null) => {
      if (!saveTimer) return;
      clearTimeout(saveTimer); saveTimer = null;
      if (scopeUrl) chronicleStore.saveSnapshot(getStoreKey(scopeUrl), reducer.getSnapshot());
    };
    const pairingController = createRuntimePairingController({
      operatorId, profile, reducer, chronicleStore,
      discoverService: options.discoverService, createDaemonClient: options.createDaemonClient, fetchImpl: options.fetchImpl,
      onAdapterChanged: (ca, dc) => {
        if (!ca) sseBroadcaster.reset();
        runtime.clientAdapter = ca;
        if (dc !== undefined) runtime.daemonClient = dc;
      },
      onPasswordChanged: (pw) => { runtime.daemonPassword = pw; },
      flushPendingSave,
      persistAll,
    });
    isPairingInFlight = () => pairingController.isPairingInFlight();
    getStableDaemonUrl = () => pairingController.getLastStableDaemonUrl() ?? lastKnownDaemonUrl ?? profile.daemonUrl;
    const scheduleSnapshotSave = () => {
      if (!chronicleStore || saveTimer || pairingController.isPairingInFlight()) return;
      const scopedUrl = reducer.getSnapshot().daemonUrl ?? profile.daemonUrl;
      if (!scopedUrl) return;
      const snapKey = getStoreKey(scopedUrl);
      saveTimer = setTimeout(() => {
        saveTimer = null;
        if (pairingController.isPairingInFlight()) return;
        const curSnap = reducer.getSnapshot();
        if (getStoreKey(curSnap.daemonUrl ?? profile.daemonUrl) !== snapKey) return;
        chronicleStore.saveSnapshot(snapKey, curSnap);
      }, 1200);
      saveTimer.unref?.();
    };
    const unsubscribeReducer = reducer.subscribe((emission: GuildStateEmission) => {
      lastKnownDaemonUrl = emission.snapshot.daemonUrl;
      if (emission.delta.kind === "session.deleted" || emission.delta.kind === "room.deleted") {
        if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
        if (!pairingController.isPairingInFlight()) {
          const curKey = getStoreKey();
          for (const id of emission.delta.changedCharacterIds) chronicleStore?.deleteSessionMessages(curKey, id);
          chronicleStore?.saveSnapshot(curKey, emission.snapshot);
        }
      } else if (emission.delta.kind !== "timer.tick") scheduleSnapshotSave();
      sseBroadcaster.broadcast(emission);
    });

    const runtime: OperatorWorkspaceRuntime = {
      profile, daemonPassword: input.daemonPassword, reducer, sseClients, unsubscribeReducer,
      pairDaemon: (targetUrl, password) => pairingController.pairDaemon(targetUrl, password),
      refreshAvailability: (forceSweepActive) => pairingController.refreshPairedMachinesAvailability({ forceSweepActive }),
      resetDisconnected: () => {
        if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
        lastKnownDaemonUrl = null;
        pairingController.resetDisconnected();
        runtime.daemonClient = undefined;
      },
      toRouterContext(): GuildApiRouterContext {
        return {
          daemonUrl: runtime.profile.daemonUrl ?? options.defaultDaemonUrl,
          sseClients: runtime.sseClients,
          getReducer: () => runtime.reducer,
          getActiveAdapter: () => runtime.reducer.getSnapshot().activeAdapter,
          getStoredSessionMessages: (sessionId: string) => chronicleStore.getSessionMessages(getStoreKey(), sessionId),
          activatePreset(presetId: DemoScenarioPresetId): DemoScenarioRunResult {
            if (!(presetId in DEMO_SCENARIO_PRESETS)) throw new Error(`Unknown demo scenario preset: ${String(presetId)}`);
            if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
            pairingController.cancelForDemo();
            runtime.profile.reachable = false;
            runtime.profile.adapterMode = "demo-simulator";
            runtime.reducer.reset?.({ adapter: "demo-simulator", daemonUrl: null });
            return runDemoScenarioPreset(presetId, runtime.reducer);
          },
          clientAdapter: runtime.clientAdapter,
          daemonClient: runtime.daemonClient,
          onDaemonCommandResult: (result) => {
            if (runtime.profile.adapterMode !== "opencode-client") return;
            if (result.ok) {
              if (!runtime.profile.reachable || runtime.profile.errorMessage) {
                const nowMs = Date.now();
                runtime.profile.reachable = true; runtime.profile.errorMessage = null; runtime.profile.lastSyncedAtMs = nowMs;
                for (const m of runtime.profile.pairedMachines) if (m.isActive) { m.reachable = true; m.errorMessage = null; m.lastSyncedAtMs = nowMs; }
                persistAll();
              }
            } else if (result.error && !/\bHTTP [234]\d\d\b/i.test(result.error)) {
              runtime.profile.reachable = false; runtime.profile.errorMessage = result.error;
              for (const m of runtime.profile.pairedMachines) if (m.isActive) { m.reachable = false; m.errorMessage = result.error; }
              persistAll();
            }
          },
          onRefresh: async () => {
            const currentUrl = runtime.profile.daemonUrl ?? runtime.reducer.getSnapshot().daemonUrl;
            const isLocalPairing = !currentUrl || isLocalDaemonEndpoint(currentUrl);
            if (runtime.clientAdapter || runtime.profile.daemonUrl) {
              await pairingController.refreshPairedMachinesAvailability({ forceSweepActive: true });
              const snapAfter = runtime.reducer.getSnapshot();
              if (
                isLocalPairing &&
                Object.keys(snapAfter.rooms).length === 0 &&
                !(snapAfter.deletedRoomIds?.length) &&
                options.discoverService &&
                !options.createDaemonClient
              ) {
                try { const svc = await options.discoverService(); await runtime.pairDaemon(svc.url, svc.password); } catch { /* ignore */ }
              }
            } else if (options.discoverService) {
              try { const svc = await options.discoverService(); await runtime.pairDaemon(svc.url, svc.password); } catch { /* ignore */ }
            }
          },
        };
      },
      close() {
        pairingController.close();
        if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
        sseBroadcaster.close();
        for (const client of runtime.sseClients) if (!client.writableEnded) client.end();
        runtime.sseClients.clear();
        runtime.unsubscribeReducer();
      },
    };
    operators.set(operatorId, runtime);
    return runtime;
  }

  const savedProfiles = chronicleStore.loadOperators();
  for (const saved of savedProfiles) {
    if (!saved?.operatorId) continue;
    const rt = createRuntime(saved.operatorId, {
      username: saved.username, passwordHash: saved.passwordHash, label: saved.label, daemonUrl: saved.daemonUrl,
      daemonPassword: saved.pairedMachines?.find((m) => m.isActive)?.daemonPassword, pairedMachines: saved.pairedMachines, preferences: saved.preferences,
    });
    if (saved.daemonUrl && !options.createDaemonClient) {
      void rt.pairDaemon(saved.daemonUrl, rt.daemonPassword).then(async (ok) => {
        if (!ok && options.discoverService && /^https?:\/\/(127\.0\.0\.1|localhost|0\.0\.0\.0|host\.docker\.internal)(:\d+)?(\/|$)/i.test(saved.daemonUrl || "")) {
          try {
            const svc = await options.discoverService();
            if (svc.url && svc.url !== saved.daemonUrl) {
              for (const m of rt.profile.pairedMachines) if (m.isActive && m.daemonUrl === saved.daemonUrl) { m.daemonUrl = svc.url; if (svc.password) m.daemonPassword = svc.password; }
              await rt.pairDaemon(svc.url, svc.password);
            }
          } catch { /* ignore */ }
        }
        await rt.refreshAvailability(false);
      });
    } else if (saved.pairedMachines?.length) {
      void rt.refreshAvailability(false).catch(() => {});
    }
  }
  if (chronicleStore && savedProfiles.length > 0) chronicleStore.saveOperators(savedProfiles);
  const tickTimer = setInterval(() => { const nowMs = Date.now(); for (const runtime of operators.values()) runtime.reducer.dispatch({ type: "timer.tick", timestampMs: nowMs }); }, 1_000);
  tickTimer.unref?.();
  const sweepTimer = setInterval(() => { for (const runtime of operators.values()) if (runtime.profile.adapterMode === "opencode-client") void runtime.refreshAvailability(false).catch(() => {}); }, 15_000);
  sweepTimer.unref?.();

  async function registerOperator(input: { username?: string; password?: string; label?: string; pairingLink?: string; daemonUrl?: string; daemonPassword?: string; machineLabel?: string; preferences?: Partial<GuildOperatorPreferences>; isExplicitRegister?: boolean }) {
    const username = input.username?.trim() || undefined;
    const existingByUsername = username ? [...operators.values()].find((r) => r.profile.username.toLowerCase() === username.toLowerCase()) : undefined;
    if (existingByUsername) {
      throw Object.assign(new Error(`Username '${username}' is already registered`), { statusCode: 409 });
    }
    const operatorId = `op_${randomBytes(8).toString("hex")}`;
    const rawUrlInput = input.pairingLink?.trim() || input.daemonUrl?.trim() || undefined;
    const resolvedPair = rawUrlInput ? await resolveAndRedeemOpenCodePairing(rawUrlInput, input.daemonPassword, options.fetchImpl) : null;
    const initialMachines: PairedOpenCodeMachine[] = resolvedPair?.daemonUrl
      ? [{ machineId: `mach_${randomBytes(6).toString("hex")}`, label: input.machineLabel?.trim() || "Primary Machine", daemonUrl: resolvedPair.daemonUrl, daemonPassword: resolvedPair.daemonPassword, reachable: false, isActive: true, lastSyncedAtMs: null, errorMessage: null }]
      : [];
    const runtime = createRuntime(operatorId, {
      username: username ?? operatorId, passwordHash: input.password ? hashOperatorPassword(input.password) : undefined,
      label: input.label ?? username, daemonUrl: resolvedPair?.daemonUrl, daemonPassword: resolvedPair?.daemonPassword,
      pairedMachines: initialMachines, preferences: input.preferences,
    });
    if (resolvedPair?.daemonUrl) await runtime.pairDaemon(resolvedPair.daemonUrl, resolvedPair.daemonPassword);
    else if (!input.isExplicitRegister && options.discoverService) { try { const svc = await options.discoverService(); await runtime.pairDaemon(svc.url, svc.password); } catch { /* ignore */ } }
    persistAll(); return stripPrivateOperatorFields(runtime.profile);
  }
  async function loginOperator(username: string, password: string) {
    const matched = [...operators.values()].find((r) => r.profile.username.toLowerCase() === username.trim().toLowerCase());
    if (!matched) return null;
    if (!matched.profile.passwordHash ? Boolean(password.trim()) : !verifyOperatorPassword(password, matched.profile.passwordHash)) return null;
    const activeMachine = syncProfileActiveMachineState(matched.profile);
    if (activeMachine && !matched.clientAdapter) await matched.pairDaemon(activeMachine.daemonUrl, activeMachine.daemonPassword);
    return stripPrivateOperatorFields(matched.profile);
  }
  function getOperatorProfile(operatorId: string | null) {
    if (!operatorId || (options.requireAuth && !operators.has(operatorId))) return buildFallbackOperatorResponse(options.requireAuth, () => options.defaultContext().getReducer().getSnapshot());
    return stripPrivateOperatorFields((operators.get(operatorId) ?? createRuntime(operatorId)).profile);
  }
  async function pairOperatorMachine(operatorId: string | null, input: { label?: string; pairingLink?: string; daemonUrl?: string; daemonPassword?: string; discoverLocal?: boolean; activate?: boolean }) {
    if (options.requireAuth && (!operatorId || !operators.has(operatorId))) throw Object.assign(new Error("Authentication required to pair an OpenCode machine"), { statusCode: 401 });
    const targetOpId = operatorId || `op_${randomBytes(8).toString("hex")}`;
    const runtime = operators.get(targetOpId) ?? createRuntime(targetOpId);
    const rawUrl = input.pairingLink?.trim() || input.daemonUrl?.trim() || "";
    const isLocalAuto = input.discoverLocal === true || rawUrl.toLowerCase() === "local";
    let redeemed: { daemonUrl: string; daemonPassword?: string };
    if (isLocalAuto) {
      const svc = await (options.discoverService ? options.discoverService() : discoverLocalOpenCodeService());
      redeemed = { daemonUrl: svc.url, daemonPassword: svc.password };
    } else {
      if (!rawUrl) throw new Error("daemonUrl or pairing link is required");
      redeemed = await resolveAndRedeemOpenCodePairing(rawUrl, input.daemonPassword, options.fetchImpl);
      if (!redeemed.daemonPassword && options.discoverService && /(?:127\.0\.0\.1|localhost|host\.docker\.internal)/i.test(redeemed.daemonUrl)) {
        try { const svc = await options.discoverService(); if (svc.password) redeemed = { ...redeemed, daemonPassword: svc.password }; } catch { /* ignore */ }
      }
    }
    const shouldActivate = input.activate !== false || runtime.profile.pairedMachines.length === 0;
    const newMachine: PairedOpenCodeMachine = {
      machineId: `mach_${randomBytes(6).toString("hex")}`, label: input.label?.trim() || (isLocalAuto ? "Local OpenCode" : "OpenCode Machine"),
      daemonUrl: redeemed.daemonUrl, daemonPassword: redeemed.daemonPassword, reachable: false, isActive: shouldActivate, lastSyncedAtMs: null, errorMessage: null,
    };
    runtime.profile.pairedMachines.push(newMachine);
    const active = syncProfileActiveMachineState(runtime.profile, shouldActivate ? newMachine.machineId : null);
    if (shouldActivate && active) {
      await runtime.pairDaemon(active.daemonUrl, active.daemonPassword);
    } else {
      const probe = await probePairedMachineAvailability(newMachine, {
        discoverService: options.discoverService,
        createDaemonClient: options.createDaemonClient,
        fetchImpl: options.fetchImpl,
      });
      newMachine.reachable = probe.reachable;
      newMachine.errorMessage = probe.errorMessage;
      if (probe.reachable) newMachine.lastSyncedAtMs = Date.now();
    }
    persistAll(); return { ...stripPrivateOperatorFields(runtime.profile), snapshot: runtime.reducer.getSnapshot() };
  }

  async function updateOperatorMachine(operatorId: string | null, machineId: string, patch: { label?: string; daemonUrl?: string; daemonPassword?: string; activate?: boolean }) {
    const runtime = operatorId ? operators.get(operatorId) : undefined;
    if (!runtime) return null;
    const target = runtime.profile.pairedMachines.find((m) => m.machineId === machineId);
    if (!target) return undefined;
    if (patch.label?.trim()) target.label = patch.label.trim();
    if (patch.daemonUrl?.trim()) {
      const redeemed = await resolveAndRedeemOpenCodePairing(patch.daemonUrl.trim(), patch.daemonPassword ?? target.daemonPassword, options.fetchImpl);
      target.daemonUrl = redeemed.daemonUrl;
      target.daemonPassword = redeemed.daemonPassword;
    } else if (patch.daemonPassword !== undefined) {
      target.daemonPassword = patch.daemonPassword;
    }
    if (patch.activate === true) {
      const active = syncProfileActiveMachineState(runtime.profile, machineId);
      if (active) await runtime.pairDaemon(active.daemonUrl, active.daemonPassword);
    } else if (patch.daemonUrl?.trim() || patch.daemonPassword !== undefined) {
      if (target.isActive) {
        await runtime.pairDaemon(target.daemonUrl, target.daemonPassword);
      } else {
        const probe = await probePairedMachineAvailability(target, {
          discoverService: options.discoverService,
          createDaemonClient: options.createDaemonClient,
          fetchImpl: options.fetchImpl,
        });
        target.reachable = probe.reachable;
        target.errorMessage = probe.errorMessage;
        if (probe.reachable) target.lastSyncedAtMs = Date.now();
      }
    }
    persistAll();
    return { ...stripPrivateOperatorFields(runtime.profile), snapshot: runtime.reducer.getSnapshot() };
  }

  async function removeOperatorMachine(operatorId: string | null, machineId: string) {
    const runtime = operatorId ? operators.get(operatorId) : undefined;
    if (!runtime) return null;
    runtime.profile.pairedMachines = runtime.profile.pairedMachines.filter((m) => m.machineId !== machineId);
    const nextActive = syncProfileActiveMachineState(runtime.profile);
    if (nextActive) {
      await runtime.pairDaemon(nextActive.daemonUrl, nextActive.daemonPassword);
    } else {
      runtime.resetDisconnected();
    }
    persistAll();
    return { ...stripPrivateOperatorFields(runtime.profile), snapshot: runtime.reducer.getSnapshot() };
  }
  async function updateOperatorProfile(operatorId: string | null, patch: { username?: string; label?: string; password?: string; adapterMode?: "demo-simulator" | "opencode-client"; preferences?: Partial<GuildOperatorPreferences>; daemonUrl?: string; daemonPassword?: string }) {
    if (options.requireAuth && (!operatorId || !operators.has(operatorId))) {
      return buildFallbackOperatorResponse(options.requireAuth, () => options.defaultContext().getReducer().getSnapshot());
    }
    const targetOpId = operatorId || `op_${randomBytes(8).toString("hex")}`;
    const runtime = operators.get(targetOpId) ?? createRuntime(targetOpId);
    if (patch.username?.trim()) {
      const nextUname = patch.username.trim();
      const conflict = [...operators.values()].some((r) => r.profile.operatorId !== runtime.profile.operatorId && r.profile.username.toLowerCase() === nextUname.toLowerCase());
      if (conflict) {
        const conflictErr = new Error(`Username '${nextUname}' is already registered`) as Error & { statusCode?: number };
        conflictErr.statusCode = 409; throw conflictErr;
      }
      runtime.profile.username = nextUname;
    }
    if (patch.label?.trim()) runtime.profile.label = patch.label.trim();
    if (patch.password?.trim()) runtime.profile.passwordHash = hashOperatorPassword(patch.password.trim());
    if (patch.adapterMode === "demo-simulator" || patch.adapterMode === "opencode-client") runtime.profile.adapterMode = patch.adapterMode;
    if (patch.preferences && typeof patch.preferences === "object") runtime.profile.preferences = { ...runtime.profile.preferences, ...patch.preferences };
    if (patch.daemonUrl?.trim()) {
      const redeemed = await resolveAndRedeemOpenCodePairing(patch.daemonUrl.trim(), patch.daemonPassword ?? runtime.daemonPassword, options.fetchImpl);
      await runtime.pairDaemon(redeemed.daemonUrl, redeemed.daemonPassword);
    }
    runtime.profile.updatedAtMs = Date.now(); persistAll();
    return stripPrivateOperatorFields(runtime.profile);
  }
  function deleteOperator(operatorId: string | null) {
    if (operatorId && operators.has(operatorId)) {
      operators.get(operatorId)!.close(); operators.delete(operatorId);
      chronicleStore?.deleteOperatorData(operatorId); persistAll();
    }
    return { ok: true as const, deletedOperatorId: operatorId ?? "op_default" };
  }
  function resolveContextForRequest(req: IncomingMessage, urlObj: URL): GuildApiRouterContext {
    const opId = resolveRequestOperatorId(req, urlObj);
    const existing = opId ? operators.get(opId) : undefined;
    if (existing) return { ...existing.toRouterContext(), authenticated: true };
    if (options.requireAuth) {
      lockedEmptyReducer.reset?.({ adapter: "opencode-client", daemonUrl: null });
      return { authenticated: false, daemonUrl: "", sseClients: lockedSseClients, getReducer: () => lockedEmptyReducer, getActiveAdapter: () => "opencode-client", activatePreset: (presetId: DemoScenarioPresetId) => runDemoScenarioPreset(presetId, lockedEmptyReducer) };
    }
    return options.defaultContext();
  }
  function closeAll(): void {
    clearInterval(tickTimer); clearInterval(sweepTimer);
    for (const runtime of operators.values()) runtime.close();
    operators.clear(); chronicleStore?.close();
  }
  const registry: OperatorWorkspaceRegistryPort = { registerOperator, loginOperator, getOperatorProfile, updateOperatorProfile, pairOperatorMachine, updateOperatorMachine, removeOperatorMachine, deleteOperator, resolveRequestOperatorId, tryHandleOperatorCrudRoute: (req, res, urlObj) => handleOperatorHttpRoutes(req, res, urlObj, registry), resolveContextForRequest, closeAll };
  return registry;
}