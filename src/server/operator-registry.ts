import { randomBytes } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createHttpOpenCodeDaemonClient, createOpenCodeClientAdapter, discoverLocalOpenCodeService, type DiscoveredOpenCodeService, type OpenCodeClientAdapter, type OpenCodeDaemonClientPort, resolveAndRedeemOpenCodePairing } from "../ingress/index.ts";
import { DEMO_SCENARIO_PRESETS, type DemoScenarioPresetId, type DemoScenarioRunResult, runDemoScenarioPreset } from "../simulator/demo-guild-simulator.ts";
import { createWorldStateReducer } from "../state/index.ts";
import type { GuildStateEmission, WorldStateReducer } from "../types/domain.ts";
import type { GuildApiRouterContext } from "./api-router.ts";
import { handleOperatorHttpRoutes, type OperatorWorkspaceRegistryPort } from "./operator-routes.ts";
import { createGuildChronicleStore, type GuildChronicleStorePort } from "./chronicle-sqlite-store.ts";
import { buildFallbackOperatorResponse, createInitialOperatorProfile, type GuildOperatorPreferences, type GuildOperatorProfile, hashOperatorPassword, type PairedOpenCodeMachine, stripPrivateOperatorFields, syncProfileActiveMachineState, verifyOperatorPassword } from "./operator-store.ts";

export type { GuildOperatorPreferences, GuildOperatorProfile, PairedOpenCodeMachine };

export interface OperatorWorkspaceRuntime {
  profile: GuildOperatorProfile; daemonPassword?: string; reducer: WorldStateReducer; sseClients: Set<ServerResponse>;
  clientAdapter?: OpenCodeClientAdapter; daemonClient?: Pick<OpenCodeDaemonClientPort, "deleteSession" | "deleteRoomResources" | "executeCommand"> | OpenCodeDaemonClientPort;
  unsubscribeReducer: () => void; toRouterContext(): GuildApiRouterContext; pairDaemon(daemonUrl: string, daemonPassword?: string): Promise<boolean>; close(): void;
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
  const buildAuthHeaders = (password?: string): Record<string, string> =>
    password ? { Authorization: "Basic " + Buffer.from(`opencode:${password}`).toString("base64") } : {};

  function createRuntime(
    operatorId: string,
    input: {
      username?: string; passwordHash?: string; label?: string; daemonUrl?: string | null;
      daemonPassword?: string; pairedMachines?: PairedOpenCodeMachine[]; preferences?: Partial<GuildOperatorPreferences>;
    } = {},
  ): OperatorWorkspaceRuntime {
    const profile = createInitialOperatorProfile(operatorId, input);
    const reducer = createWorldStateReducer({ initialAdapter: "opencode-client", daemonUrl: profile.daemonUrl });
    const persistedSnap = chronicleStore?.loadSnapshot(operatorId);
    if (persistedSnap) reducer.hydrateFromSnapshot?.(persistedSnap);
    const sseClients = new Set<ServerResponse>();
    let saveTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleSnapshotSave = () => {
      if (!chronicleStore || saveTimer) return;
      saveTimer = setTimeout(() => { saveTimer = null; chronicleStore.saveSnapshot(operatorId, reducer.getSnapshot()); }, 1200);
      saveTimer.unref?.();
    };
    const unsubscribeReducer = reducer.subscribe((emission: GuildStateEmission) => {
      if (emission.delta.kind === "session.deleted" || emission.delta.kind === "room.deleted") {
        if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
        for (const id of emission.delta.changedCharacterIds) chronicleStore?.deleteSessionMessages(operatorId, id);
        chronicleStore?.saveSnapshot(operatorId, emission.snapshot);
      } else if (emission.delta.kind !== "timer.tick") scheduleSnapshotSave();
      if (sseClients.size === 0) return;
      const payload = `data: ${JSON.stringify(emission)}\n\n`;
      for (const client of sseClients) {
        if (!client.writableEnded) {
          try { client.write(payload); } catch { sseClients.delete(client); }
        }
      }
    });

    const runtime: OperatorWorkspaceRuntime = {
      profile, daemonPassword: input.daemonPassword, reducer, sseClients, unsubscribeReducer,
      async pairDaemon(targetUrl: string, password?: string): Promise<boolean> {
        const cleanUrl = targetUrl.trim();
        const prevSnap = reducer.getSnapshot();
        const isDifferentMachine = prevSnap.daemonUrl !== null && prevSnap.daemonUrl !== cleanUrl;
        runtime.clientAdapter?.stop();
        runtime.daemonPassword = password;
        runtime.profile.daemonUrl = cleanUrl;
        runtime.profile.paired = true;
        runtime.profile.adapterMode = "opencode-client";
        runtime.profile.updatedAtMs = Date.now();
        if (prevSnap.activeAdapter === "demo-simulator") {
          reducer.reset?.({ adapter: "opencode-client", daemonUrl: cleanUrl });
        } else {
          reducer.dispatch({ type: "adapter.switched", timestampMs: Date.now(), adapter: "opencode-client", daemonUrl: cleanUrl });
        }

        let effectiveUrl = cleanUrl;
        let effectiveHeaders = buildAuthHeaders(password);
        if (options.discoverService && !options.createDaemonClient && /\.(opentunnel\.xyz|lhr\.life)\b/i.test(cleanUrl)) {
          try {
            const svc = await options.discoverService();
            const infoRes = await fetch(`${svc.url.replace(/\/+$/, "")}/api/info`, { headers: { Accept: "application/json", ...svc.headers }, signal: AbortSignal.timeout(1500) });
            if (infoRes.ok) {
              const info = (await infoRes.json()) as { urls?: string[] };
              if (Array.isArray(info?.urls) && info.urls.some((u) => cleanUrl.startsWith(u.replace(/\/+$/, "")))) {
                effectiveUrl = svc.url;
                effectiveHeaders = svc.headers;
              }
            }
          } catch { /* use remote tunnel directly */ }
        }
        const dc = (options.createDaemonClient ?? createHttpOpenCodeDaemonClient)(effectiveUrl, effectiveHeaders);
        const ca = createOpenCodeClientAdapter({ discoverDaemon: async () => ({ url: effectiveUrl }), client: dc });
        if (!isDifferentMachine) {
          if (prevSnap.deletedSessionIds?.length) ca.evictDeletedSessions?.(prevSnap.deletedSessionIds);
          if (prevSnap.deletedRoomIds?.length) ca.evictDeletedRooms?.(prevSnap.deletedRoomIds);
        }
        const stagingReducer = createWorldStateReducer({ initialAdapter: "opencode-client", daemonUrl: cleanUrl });
        if (!isDifferentMachine && (Object.keys(prevSnap.rooms).length > 0 || Object.keys(prevSnap.characters).length > 0 || Object.keys(prevSnap.tributeLedger ?? {}).length > 0 || (prevSnap.deletedSessionIds?.length ?? 0) > 0 || (prevSnap.deletedRoomIds?.length ?? 0) > 0)) {
          stagingReducer.hydrateFromSnapshot?.(prevSnap, reducer.getCatalog());
        }
        let targetReducer: WorldStateReducer = stagingReducer;
        const proxyReducer = {
          dispatch: (ev: Parameters<WorldStateReducer["dispatch"]>[0]) => targetReducer.dispatch(ev),
          dispatchBatch: (evs: Parameters<WorldStateReducer["dispatchBatch"]>[0]) => targetReducer.dispatchBatch(evs),
        } as WorldStateReducer;
        runtime.daemonClient = dc;
        runtime.clientAdapter = ca;
        try {
          await ca.start(proxyReducer);
          const stagedSnap = stagingReducer.getSnapshot();
          const curDel = reducer.getSnapshot().deletedSessionIds ?? [];
          const curDelRooms = reducer.getSnapshot().deletedRoomIds ?? [];
          if (isDifferentMachine || Object.keys(stagedSnap.rooms).length > 0 || (stagedSnap.deletedRoomIds?.length ?? 0) > 0 || curDelRooms.length > 0) {
            reducer.reset?.({ adapter: "opencode-client", daemonUrl: cleanUrl });
            const mergedSnap = isDifferentMachine
              ? { ...stagedSnap, tributeLedger: { ...(prevSnap.tributeLedger ?? {}), ...(stagedSnap.tributeLedger ?? {}) } }
              : { ...stagedSnap, tributeLedger: { ...(prevSnap.tributeLedger ?? {}), ...(stagedSnap.tributeLedger ?? {}) }, deletedSessionIds: [...new Set([...(stagedSnap.deletedSessionIds ?? []), ...curDel])], deletedRoomIds: [...new Set([...(stagedSnap.deletedRoomIds ?? []), ...curDelRooms])] };
            reducer.hydrateFromSnapshot?.(mergedSnap, stagingReducer.getCatalog());
          }
          targetReducer = reducer;
          await ca.startLiveSubscription?.();
          runtime.profile.reachable = true; runtime.profile.lastSyncedAtMs = Date.now(); runtime.profile.errorMessage = null;
          for (const m of runtime.profile.pairedMachines) {
            if (m.daemonUrl === cleanUrl) { m.reachable = true; m.lastSyncedAtMs = runtime.profile.lastSyncedAtMs; m.errorMessage = null; }
          }
          const finalSnap = reducer.getSnapshot();
          if (Object.keys(finalSnap.rooms).length > 0 || (finalSnap.deletedRoomIds?.length ?? 0) > 0) chronicleStore?.saveSnapshot(operatorId, finalSnap);
          persistAll();
          return true;
        } catch (err) {
          if (isDifferentMachine) {
            reducer.reset?.({ adapter: "opencode-client", daemonUrl: cleanUrl });
            reducer.hydrateFromSnapshot?.(stagingReducer.getSnapshot());
          }
          runtime.profile.reachable = false;
          runtime.profile.errorMessage = err instanceof Error ? err.message : "Failed to reach OpenCode daemon";
          for (const m of runtime.profile.pairedMachines) {
            if (m.daemonUrl === cleanUrl) { m.reachable = false; m.errorMessage = runtime.profile.errorMessage; }
          }
          persistAll();
          return false;
        }
      },
      toRouterContext(): GuildApiRouterContext {
        return {
          daemonUrl: runtime.profile.daemonUrl ?? options.defaultDaemonUrl,
          sseClients: runtime.sseClients,
          getReducer: () => runtime.reducer,
          getActiveAdapter: () => runtime.reducer.getSnapshot().activeAdapter,
          activatePreset(presetId: DemoScenarioPresetId): DemoScenarioRunResult {
            if (!(presetId in DEMO_SCENARIO_PRESETS)) throw new Error(`Unknown demo scenario preset: ${String(presetId)}`);
            runtime.clientAdapter?.stop();
            runtime.clientAdapter = undefined;
            runtime.profile.reachable = false;
            runtime.profile.adapterMode = "demo-simulator";
            runtime.reducer.reset?.({ adapter: "demo-simulator", daemonUrl: null });
            return runDemoScenarioPreset(presetId, runtime.reducer);
          },
          clientAdapter: runtime.clientAdapter,
          daemonClient: runtime.daemonClient,
          onRefresh: async () => {
            if (runtime.clientAdapter) {
              await runtime.clientAdapter.sweepAllLocations(false);
              const snapAfter = runtime.reducer.getSnapshot();
              if (Object.keys(snapAfter.rooms).length === 0 && !(snapAfter.deletedRoomIds?.length) && options.discoverService && !options.createDaemonClient) {
                try { const svc = await options.discoverService(); await runtime.pairDaemon(svc.url, svc.password); } catch { /* ignore */ }
              }
            } else if (runtime.profile.daemonUrl) {
              await runtime.pairDaemon(runtime.profile.daemonUrl, runtime.daemonPassword);
            } else if (options.discoverService) {
              try { const svc = await options.discoverService(); await runtime.pairDaemon(svc.url, svc.password); } catch { /* ignore */ }
            }
          },
        };
      },
      close() {
        if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; chronicleStore?.saveSnapshot(operatorId, reducer.getSnapshot()); }
        runtime.clientAdapter?.stop();
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
      });
    }
  }
  if (chronicleStore && savedProfiles.length > 0) chronicleStore.saveOperators(savedProfiles);
  const tickTimer = setInterval(() => { const nowMs = Date.now(); for (const runtime of operators.values()) runtime.reducer.dispatch({ type: "timer.tick", timestampMs: nowMs }); }, 1_000);
  tickTimer.unref?.();
  const sweepTimer = setInterval(() => { for (const runtime of operators.values()) if (runtime.clientAdapter && runtime.profile.adapterMode === "opencode-client") void runtime.clientAdapter.sweepAllLocations(false).catch(() => {}); }, 15_000);
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
    if (shouldActivate && active) await runtime.pairDaemon(active.daemonUrl, active.daemonPassword);
    persistAll(); return stripPrivateOperatorFields(runtime.profile);
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
    }
    persistAll();
    return stripPrivateOperatorFields(runtime.profile);
  }

  async function removeOperatorMachine(operatorId: string | null, machineId: string) {
    const runtime = operatorId ? operators.get(operatorId) : undefined;
    if (!runtime) return null;
    runtime.profile.pairedMachines = runtime.profile.pairedMachines.filter((m) => m.machineId !== machineId);
    const nextActive = syncProfileActiveMachineState(runtime.profile);
    if (nextActive) {
      await runtime.pairDaemon(nextActive.daemonUrl, nextActive.daemonPassword);
    } else {
      runtime.clientAdapter?.stop(); runtime.clientAdapter = undefined; runtime.daemonClient = undefined;
      runtime.reducer.reset?.({ adapter: "opencode-client", daemonUrl: null });
      runtime.reducer.hydrateFromSnapshot?.(runtime.reducer.getSnapshot());
    }
    persistAll();
    return stripPrivateOperatorFields(runtime.profile);
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