import { isDeletedHostDirectory, isSystemRootOrHomeDirectory, normalizeLocationDirectory } from "../state/world-reducer.ts";
import { createSweepDigestTracker } from "./adapter-sweep-digests.ts";
import { appendReconnectedActiveToolEvents, type DiscoveredLocationMeta, mergeLocationReconciliationEntry } from "./adapter-sweep-helpers.ts";
import { buildHydratedSessionEvents } from "./daemon-message-hydration.ts";
import { invalidateGitStatusCache, isLocalGitRepository, scanGitStatusAsync } from "./git-status-scanner.ts";
import { deriveProjectTaskProgress, invalidateTaskProgressCache } from "./issue-tracker-scanner.ts";
import type { LocationReconciliationSnapshot, ReconnectLogEntry, TelemetryEvent } from "../types/domain.ts";
import type { CreateOpenCodeClientAdapterOptions, DeleteRoomResourcesResult, OpenCodeClientAdapter } from "./daemon-types.ts";

export function createOpenCodeClientAdapter(options: CreateOpenCodeClientAdapterOptions): OpenCodeClientAdapter {
  let activeSink: ((event: TelemetryEvent) => void) | null = null;
  let activeBatchSink: ((events: ReadonlyArray<TelemetryEvent>) => void) | null = null;
  let activeSnapshotGetter: (() => import("../types/domain.ts").GuildSnapshot) | null = null;
  let unsubscribeEvents: (() => void) | null = null;
  let daemonUrl: string | null = null;
  let runEpoch = 0;
  let isStopped = false;
  const isStale = (epoch: number): boolean => isStopped || epoch !== runEpoch || !activeSink;
  const sessionCursors = new Map<string, number>();
  const sessionDirectoryBySessionId = new Map<string, string>();
  const deletedRoomDirs = new Set<string>();
  const deletedSessionIds = new Set<string>();
  const canonicalByWorktreeMap = new Map<string, string>();
  const knownRoomMeta = new Map<string, { rawDirectory: string; projectId?: string; projectName?: string; isWorktree: boolean }>();
  const sweepDigests = createSweepDigestTracker();

  function evictDeletedSessions(ids: Iterable<string>): void {
    for (const id of ids) {
      if (!id) continue;
      deletedSessionIds.add(id); sessionDirectoryBySessionId.delete(id); sessionCursors.delete(id);
    }
  }

  function evictDeletedRooms(dirs: Iterable<string>): void {
    for (const raw of dirs) {
      if (!raw) continue;
      const norm = normalizeLocationDirectory(raw);
      if (!norm || norm === "/") continue;
      deletedRoomDirs.add(norm);
      sweepDigests.evictDir(norm);
      for (const [wtDir, canonDir] of canonicalByWorktreeMap.entries()) {
        if (canonDir === norm) { deletedRoomDirs.add(wtDir); sweepDigests.evictDir(wtDir); }
      }
      for (const knownDir of knownRoomMeta.keys()) {
        if (knownDir.startsWith(`${norm}/.worktrees/`) || knownDir.startsWith(`${norm}/worktree/`)) {
          deletedRoomDirs.add(knownDir);
          sweepDigests.evictDir(knownDir);
        }
      }
    }
  }

  function recordEventCursor(event: TelemetryEvent): void {
    if ("sessionId" in event && typeof event.sessionId === "string" && "sequenceCursor" in event && typeof event.sequenceCursor === "number") {
      sessionCursors.set(event.sessionId, Math.max(sessionCursors.get(event.sessionId) ?? 0, event.sequenceCursor));
    }
  }

  let activeSweepPromise: Promise<void> | null = null;
  let queuedSweepPromise: Promise<void> | null = null;
  let queuedSweepReconnect = false;

  async function sweepAllLocations(isReconnect = false): Promise<void> {
    if (activeSweepPromise) {
      queuedSweepReconnect = queuedSweepReconnect || isReconnect;
      if (!queuedSweepPromise) {
        const runQueued = async () => {
          const nextReconnect = queuedSweepReconnect;
          queuedSweepReconnect = false;
          queuedSweepPromise = null;
          await sweepAllLocations(nextReconnect);
        };
        queuedSweepPromise = activeSweepPromise.then(runQueued, runQueued);
      }
      return queuedSweepPromise;
    }
    activeSweepPromise = runSweepAllLocations(isReconnect).finally(() => {
      activeSweepPromise = null;
    });
    return activeSweepPromise;
  }

  async function runSweepAllLocations(isReconnect = false): Promise<void> {
    const epoch = runEpoch;
    if (isStale(epoch)) return;
    if (isReconnect) options.client.clearCaches?.();
    const curSnap = activeSnapshotGetter?.();
    if (curSnap?.deletedRoomIds?.length) evictDeletedRooms(curSnap.deletedRoomIds);
    if (curSnap?.deletedSessionIds?.length) evictDeletedSessions(curSnap.deletedSessionIds);
    const now = Date.now();
    const discoveredDirs = new Map<string, DiscoveredLocationMeta>();
    const projectRootById = new Map<string, string>();

    const projects = await options.client.getProjects();
    if (isStale(epoch)) return;
    for (const proj of projects) {
      if (isDeletedHostDirectory(proj.directory, undefined, daemonUrl)) continue;
      const rootDir = normalizeLocationDirectory(proj.directory);
      if (proj.id && proj.id !== "global" && !isSystemRootOrHomeDirectory(rootDir)) {
        projectRootById.set(proj.id, rootDir);
      }
      discoveredDirs.set(rootDir, { directory: rootDir, rawDirectory: proj.directory, projectId: proj.id, projectName: proj.name, isWorktree: false, parentProjectDirectory: null });
      for (const sandboxDir of proj.sandboxes ?? []) {
        if (isDeletedHostDirectory(sandboxDir, undefined, daemonUrl)) continue;
        const normSandbox = normalizeLocationDirectory(sandboxDir);
        if (normSandbox !== rootDir) canonicalByWorktreeMap.set(normSandbox, rootDir);
        discoveredDirs.set(normSandbox, { directory: normSandbox, rawDirectory: sandboxDir, projectId: proj.id, projectName: undefined, isWorktree: true, parentProjectDirectory: rootDir });
      }
    }

    const locations = await options.client.getLocations();
    if (isStale(epoch)) return;
    for (const loc of locations) {
      if (isDeletedHostDirectory(loc.directory, undefined, daemonUrl)) continue;
      const normDir = normalizeLocationDirectory(loc.directory);
      if (!discoveredDirs.has(normDir)) {
        const isWorktree = normDir.includes("/worktree/") || normDir.includes("/.worktrees/");
        const parentRoot = loc.projectId && loc.projectId !== "global" && projectRootById.has(loc.projectId) && projectRootById.get(loc.projectId) !== normDir ? (projectRootById.get(loc.projectId) ?? null) : null;
        if (parentRoot && parentRoot !== "/") canonicalByWorktreeMap.set(normDir, parentRoot);
        discoveredDirs.set(normDir, { directory: normDir, rawDirectory: loc.directory, projectId: loc.projectId ?? normDir, isWorktree: Boolean(isWorktree || parentRoot), parentProjectDirectory: parentRoot });
      }
    }
    for (const [normDir, meta] of knownRoomMeta.entries()) {
      if (!discoveredDirs.has(normDir) && !deletedRoomDirs.has(normDir) && !isDeletedHostDirectory(meta.rawDirectory, undefined, daemonUrl)) {
        discoveredDirs.set(normDir, { directory: normDir, rawDirectory: meta.rawDirectory, projectId: meta.projectId ?? normDir, projectName: meta.projectName, isWorktree: meta.isWorktree, parentProjectDirectory: null });
      }
    }

    const reconciliationLocations: LocationReconciliationSnapshot[] = [];
    const reconciliationByDir = new Map<string, LocationReconciliationSnapshot>();
    const sweepEvents: TelemetryEvent[] = [];

    const activeDiscovered = [...discoveredDirs.values()].filter(
      (locMeta) =>
        !deletedRoomDirs.has(locMeta.directory) &&
        !(locMeta.parentProjectDirectory && deletedRoomDirs.has(locMeta.parentProjectDirectory)),
    );
    const locEntries = await Promise.all(
      activeDiscovered.map(async (locMeta) => {
        knownRoomMeta.set(locMeta.directory, { rawDirectory: locMeta.rawDirectory, projectId: locMeta.projectId, projectName: locMeta.projectName, isWorktree: locMeta.isWorktree });
        const state = await options.client.getLocationState(locMeta.rawDirectory);
        return { locMeta, state };
      }),
    );
    if (isStale(epoch)) return;

    for (const { locMeta, state } of locEntries) {
      if (
        deletedRoomDirs.has(locMeta.directory) ||
        (locMeta.parentProjectDirectory && deletedRoomDirs.has(locMeta.parentProjectDirectory))
      ) {
        continue;
      }
      const totalSessionsInLoc =
        (state.sessions ?? []).filter((s) => !deletedSessionIds.has(s.sessionId)).length +
        (state.activeSessionIds ?? []).filter((id) => !deletedSessionIds.has(id)).length;

      if (
        (isSystemRootOrHomeDirectory(locMeta.directory) ||
          locMeta.directory.includes("/.local/share/opencode/worktree/")) &&
        totalSessionsInLoc === 0
      ) continue;

      sweepEvents.push({
        type: "location.discovered", timestampMs: now, locationDirectory: locMeta.directory,
        projectId: locMeta.projectId, projectName: locMeta.projectName, isWorktree: locMeta.isWorktree, parentProjectDirectory: locMeta.parentProjectDirectory,
      });

      const targetCanonDir =
        locMeta.parentProjectDirectory && locMeta.parentProjectDirectory !== "/" &&
        !deletedRoomDirs.has(locMeta.parentProjectDirectory) && discoveredDirs.has(locMeta.parentProjectDirectory)
          ? locMeta.parentProjectDirectory
          : locMeta.directory;

      if (
        (state.skills?.length || state.plugins?.length || state.agents?.length || state.models?.length) &&
        sweepDigests.shouldEmitCatalog(locMeta.directory, state, isReconnect)
      ) {
        sweepEvents.push({
          type: "catalog.hydrated", timestampMs: now, locationDirectory: targetCanonDir,
          skills: state.skills, plugins: state.plugins, agents: state.agents, models: state.models,
        });
      }

      const activeSetForTasks = new Set(state.activeSessionIds ?? []);
      await scanGitStatusAsync(locMeta.rawDirectory, { ttlMs: activeSetForTasks.size > 0 ? 15_000 : 60_000 });
      if (isStale(epoch)) return;
      const taskProgress = deriveProjectTaskProgress(locMeta.rawDirectory);
      if (targetCanonDir === locMeta.directory || taskProgress.source === "docs/features") {
        const isLocalGit = isLocalGitRepository(locMeta.rawDirectory);
        const prevProg = activeSnapshotGetter?.().rooms?.[targetCanonDir]?.taskProgress;
        const effectiveTaskProgress =
          isReconnect && taskProgress.totalTasks === 0 && prevProg?.totalTasks === 0 && typeof prevProg.hydratedAtMs === "number"
            ? { ...taskProgress, hydratedAtMs: prevProg.hydratedAtMs }
            : taskProgress;
        if (sweepDigests.shouldEmitTaskProgress(targetCanonDir, effectiveTaskProgress, prevProg, isLocalGit, isReconnect)) {
          sweepEvents.push({
            type: "tasks.hydrated", timestampMs: now, ...(isLocalGit ? { roomId: targetCanonDir } : {}),
            locationDirectory: targetCanonDir, taskProgress: effectiveTaskProgress,
          });
        }
      }

      let sessionLogs: Record<string, ReconnectLogEntry[]> | undefined = state.sessionLogs ? { ...state.sessionLogs } : undefined;
      if (isReconnect && options.client.getSessionLogAfter) {
        for (const sessionMeta of state.sessions ?? []) {
          if (sessionLogs?.[sessionMeta.sessionId]) continue;
          const afterCursor = sessionCursors.get(sessionMeta.sessionId) ?? 0;
          const incrementalEntries = await options.client.getSessionLogAfter(sessionMeta.sessionId, afterCursor);
          if (isStale(epoch)) return;
          if (incrementalEntries.length > 0) {
            sessionLogs ??= {};
            sessionLogs[sessionMeta.sessionId] = incrementalEntries;
            for (const entry of incrementalEntries) {
              sessionCursors.set(sessionMeta.sessionId, Math.max(sessionCursors.get(sessionMeta.sessionId) ?? 0, entry.cursor));
            }
          }
        }
      }

      if (deletedRoomDirs.has(locMeta.directory) || deletedRoomDirs.has(targetCanonDir) || (locMeta.parentProjectDirectory && deletedRoomDirs.has(locMeta.parentProjectDirectory))) continue;
      mergeLocationReconciliationEntry({
        reconciliationByDir, reconciliationLocations, discoveredDirs, locMeta, targetCanonDir,
        state, deletedSessionIds, sessionDirectoryBySessionId, sessionLogs,
      });
    }

    if (reconciliationLocations.length > 0 || isReconnect) {
      sweepEvents.push({ type: "stream.reconnected", timestampMs: now, locations: reconciliationLocations });
      appendReconnectedActiveToolEvents(sweepEvents, reconciliationLocations, now);
    }

    if (isStale(epoch)) return;
    if (sweepEvents.length > 0) {
      if (activeBatchSink) activeBatchSink(sweepEvents);
      else for (const ev of sweepEvents) activeSink?.(ev);
    }
  }

  async function startLiveSubscription(): Promise<void> {
    const epoch = runEpoch;
    if (unsubscribeEvents || !options.client.subscribeEvents || isStale(epoch)) return;
    const unsub = await options.client.subscribeEvents((rawEv) => {
      if (isStale(epoch)) return;
      let ev = rawEv;
      if (ev.type === "session.deleted") {
        evictDeletedSessions([ev.sessionId]);
      } else if ("sessionId" in ev && typeof ev.sessionId === "string" && deletedSessionIds.has(ev.sessionId)) {
        return;
      }
      if (ev.type === "session.upserted") {
        let normEvDir = normalizeLocationDirectory(ev.locationDirectory);
        if (normEvDir === "/" || !normEvDir) {
          const cachedDir = sessionDirectoryBySessionId.get(ev.sessionId);
          if (cachedDir) { normEvDir = cachedDir; ev = { ...ev, locationDirectory: cachedDir }; }
        }
        if (isDeletedHostDirectory(ev.locationDirectory, undefined, daemonUrl)) return;
        const mappedCanonical = canonicalByWorktreeMap.get(normEvDir);
        const isTombstoned = deletedRoomDirs.has(normEvDir) || Boolean(mappedCanonical && deletedRoomDirs.has(mappedCanonical));
        if (isTombstoned) {
          if (ev.preserveActivityTimestamp || ev.parentId) return;
          deletedRoomDirs.delete(normEvDir);
          if (mappedCanonical) deletedRoomDirs.delete(mappedCanonical);
        }
        const finalDir = mappedCanonical && !deletedRoomDirs.has(mappedCanonical) ? mappedCanonical : normEvDir;
        if (finalDir && finalDir !== "/") sessionDirectoryBySessionId.set(ev.sessionId, finalDir);
        if (mappedCanonical && !deletedRoomDirs.has(mappedCanonical)) {
          ev = { ...ev, locationDirectory: mappedCanonical, worktreeDirectory: normEvDir } as TelemetryEvent;
        }
      }
      recordEventCursor(ev);
      activeSink?.(ev);
      if (ev.type === "session.compacted") {
        const postCompactChar = activeSnapshotGetter?.().characters?.[ev.sessionId];
        if (postCompactChar && !postCompactChar.hasUnviewedResult) {
          void options.client.executeCommand?.({ command: "session.view", sessionId: ev.sessionId, directory: postCompactChar.locationDirectory, idleAtMs: Date.now() }).catch(() => {});
        }
      }
      const cleanTool = (ev.type === "tool.completed" ? ev.toolName : "").replace(/^tool:/i, "");
      const isMutatingTool = ev.type === "tool.completed" && /^(edit|write|apply_patch|patch|multiedit|notebookedit|bash|shell|execute)$/i.test(cleanTool);
      if ((isMutatingTool || ev.type === "session.idle" || ev.type === "session.error") && "sessionId" in ev) {
        const roomDir = sessionDirectoryBySessionId.get(ev.sessionId);
        const rawDir = roomDir ? (knownRoomMeta.get(roomDir)?.rawDirectory ?? roomDir) : undefined;
        if (roomDir && rawDir && !deletedRoomDirs.has(roomDir) && (isMutatingTool || ev.type === "session.idle")) {
          invalidateGitStatusCache(rawDir); invalidateTaskProgressCache(rawDir);
          if (!isLocalGitRepository(rawDir)) {
            const nextProg = deriveProjectTaskProgress(rawDir);
            sweepDigests.recordTaskProgress(roomDir, nextProg, false);
            activeSink?.({ type: "tasks.hydrated", timestampMs: Date.now(), locationDirectory: roomDir, taskProgress: nextProg });
          } else {
            void scanGitStatusAsync(rawDir, { force: true }).then(() => {
              if (isStale(epoch) || deletedRoomDirs.has(roomDir)) return;
              invalidateTaskProgressCache(rawDir);
              const nextProg = deriveProjectTaskProgress(rawDir);
              sweepDigests.recordTaskProgress(roomDir, nextProg, true);
              activeSink?.({ type: "tasks.hydrated", timestampMs: Date.now(), roomId: roomDir, locationDirectory: roomDir, taskProgress: nextProg });
            }).catch(() => {});
          }
        }
        if ((ev.type === "session.idle" || ev.type === "session.error") && options.client.getSessionMessages) {
          const postIdleChar = activeSnapshotGetter?.().characters?.[ev.sessionId];
          if (ev.type === "session.idle" && postIdleChar && !postIdleChar.hasUnviewedResult && typeof postIdleChar.contextMana?.lastDistilledAtMs === "number" && postIdleChar.contextMana.lastDistilledAtMs >= (postIdleChar.idleAtMs ?? 0) - 5_000) {
            void options.client.executeCommand?.({ command: "session.view", sessionId: ev.sessionId, directory: postIdleChar.locationDirectory, idleAtMs: Date.now() }).catch(() => {});
          } else {
            void options.client.getSessionMessages(ev.sessionId, rawDir).then((hydrated) => {
              const locDir = roomDir ?? "/";
              if (isStale(epoch) || !hydrated || deletedSessionIds.has(ev.sessionId) || deletedRoomDirs.has(locDir)) return;
              const existingGate = activeSnapshotGetter?.().characters?.[ev.sessionId]?.questGate;
              const existingQGateId = existingGate?.kind === "question" ? existingGate.gateId : null;
              for (const hEv of buildHydratedSessionEvents(hydrated, ev.sessionId, locDir, existingQGateId, ev.type === "session.idle")) activeSink?.(hEv);
            }).catch(() => {});
          }
        }
      }
    }, () => { if (!isStale(epoch)) void sweepAllLocations(true).catch(() => {}); });
    if (isStale(epoch)) { unsub?.(); return; }
    unsubscribeEvents = unsub;
  }

  return {
    kind: "opencode-client", getDaemonUrl: () => daemonUrl, sweepAllLocations, startLiveSubscription, evictDeletedSessions, evictDeletedRooms,
    async registerLocation(rawDirectory, meta) {
      const normDir = normalizeLocationDirectory(rawDirectory);
      if (!normDir || normDir === "/") return;
      deletedRoomDirs.delete(normDir);
      for (const [wtDir, canonDir] of canonicalByWorktreeMap.entries()) if (canonDir === normDir) deletedRoomDirs.delete(wtDir);
      options.client.recordDirectory?.(rawDirectory);
      knownRoomMeta.set(normDir, { rawDirectory, projectId: meta?.projectId ?? normDir, projectName: meta?.projectName, isWorktree: false });
      activeSink?.({
        type: "location.discovered", timestampMs: Date.now(), locationDirectory: rawDirectory,
        projectId: meta?.projectId ?? normDir, projectName: meta?.projectName, isWorktree: false, parentProjectDirectory: null, explicit: true,
      });
    },
    async deleteRoom(roomId, meta) {
      const normDir = normalizeLocationDirectory(roomId);
      const known = knownRoomMeta.get(normDir);
      const rawDirectory = known?.rawDirectory ?? roomId;
      const isWorktree = meta?.isWorktree ?? known?.isWorktree ?? (normDir.includes("/worktree/") || normDir.includes("/.worktrees/"));
      const projectId = meta?.projectId ?? known?.projectId;
      evictDeletedRooms([normDir]);
      const snapBefore = activeSnapshotGetter?.();
      if (snapBefore) {
        const preEvictIds = Object.values(snapBefore.characters)
          .filter((c) => deletedRoomDirs.has(normalizeLocationDirectory(c.roomId)) || deletedRoomDirs.has(normalizeLocationDirectory(c.locationDirectory)))
          .map((c) => c.sessionId);
        if (preEvictIds.length) evictDeletedSessions(preEvictIds);
      }
      activeSink?.({ type: "room.deleted", timestampMs: Date.now(), roomId: normDir, locationDirectory: rawDirectory });
      const result: DeleteRoomResourcesResult = options.client.deleteRoomResources
        ? await options.client.deleteRoomResources({ directory: rawDirectory, projectId, isWorktree })
        : { deletedSessionIds: [], deletedPtyIds: [], deletedShellIds: [], worktreeRemoved: false, locationEvicted: false };
      if (result.deletedSessionIds?.length) evictDeletedSessions(result.deletedSessionIds);
      return result;
    },
    async start(sinkOrReducer) {
      runEpoch += 1; isStopped = false; sweepDigests.clear();
      const epoch = runEpoch;
      const sink: (event: TelemetryEvent) => void = typeof sinkOrReducer === "function" ? sinkOrReducer : (event) => sinkOrReducer.dispatch(event);
      const batchCandidate = (sinkOrReducer as { dispatchBatch?: (events: ReadonlyArray<TelemetryEvent>) => unknown }).dispatchBatch;
      activeSink = sink;
      activeSnapshotGetter = typeof sinkOrReducer !== "function" && typeof sinkOrReducer.getSnapshot === "function" ? () => sinkOrReducer.getSnapshot() : null;
      activeBatchSink = typeof batchCandidate === "function" ? (events) => batchCandidate.call(sinkOrReducer, events) : null;
      const initialSnap = activeSnapshotGetter?.();
      if (initialSnap?.deletedRoomIds?.length) evictDeletedRooms(initialSnap.deletedRoomIds);
      if (initialSnap?.deletedSessionIds?.length) evictDeletedSessions(initialSnap.deletedSessionIds);
      daemonUrl = options.discoverDaemon ? (await options.discoverDaemon()).url : "http://127.0.0.1:4096";
      if (isStale(epoch)) return;
      sink({ type: "adapter.switched", timestampMs: Date.now(), adapter: "opencode-client", daemonUrl });
      await sweepAllLocations(false);
      if (isStale(epoch)) return;
      await startLiveSubscription();
    },
    stop() {
      isStopped = true; runEpoch += 1; sweepDigests.clear();
      if (unsubscribeEvents) { unsubscribeEvents(); unsubscribeEvents = null; }
      activeSink = null; activeBatchSink = null; activeSnapshotGetter = null;
    },
  };
}
