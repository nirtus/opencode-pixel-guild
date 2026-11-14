import { isDeletedHostDirectory, normalizeLocationDirectory } from "../state/world-reducer.ts";
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
  const sessionCursors = new Map<string, number>();
  const sessionDirectoryBySessionId = new Map<string, string>();
  const deletedRoomDirs = new Set<string>();
  const deletedSessionIds = new Set<string>();
  const canonicalByWorktreeMap = new Map<string, string>();
  const knownRoomMeta = new Map<string, { rawDirectory: string; projectId?: string; projectName?: string; isWorktree: boolean }>();

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
      for (const [wtDir, canonDir] of canonicalByWorktreeMap.entries()) {
        if (canonDir === norm) deletedRoomDirs.add(wtDir);
      }
      for (const knownDir of knownRoomMeta.keys()) {
        if (knownDir.startsWith(`${norm}/.worktrees/`) || knownDir.startsWith(`${norm}/worktree/`)) {
          deletedRoomDirs.add(knownDir);
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
    if (!activeSink) return;
    if (isReconnect) options.client.clearCaches?.();
    const curSnap = activeSnapshotGetter?.();
    if (curSnap?.deletedRoomIds?.length) evictDeletedRooms(curSnap.deletedRoomIds);
    if (curSnap?.deletedSessionIds?.length) evictDeletedSessions(curSnap.deletedSessionIds);
    const now = Date.now();
    const discoveredDirs = new Map<string, { directory: string; rawDirectory: string; projectId?: string; projectName?: string; isWorktree: boolean; parentProjectDirectory: string | null }>();
    const projectRootById = new Map<string, string>();

    const projects = await options.client.getProjects();
    for (const proj of projects) {
      if (isDeletedHostDirectory(proj.directory, undefined, daemonUrl)) continue;
      const rootDir = normalizeLocationDirectory(proj.directory);
      if (proj.id && proj.id !== "global" && rootDir !== "/" && !/^\/(?:home|Users|c\/Users)\/[^/]+$/i.test(rootDir)) {
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
        (locMeta.directory === "/" ||
          locMeta.directory.includes("/.local/share/opencode/worktree/") ||
          /^\/(?:home|Users|c\/Users)\/[^/]+$/i.test(locMeta.directory)) &&
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

      if (state.skills?.length || state.plugins?.length || state.agents?.length || state.models?.length) {
        sweepEvents.push({
          type: "catalog.hydrated", timestampMs: now, locationDirectory: targetCanonDir,
          skills: state.skills, plugins: state.plugins, agents: state.agents, models: state.models,
        });
      }

      const activeSetForTasks = new Set(state.activeSessionIds ?? []);
      await scanGitStatusAsync(locMeta.rawDirectory, { ttlMs: activeSetForTasks.size > 0 ? 15_000 : 60_000 });
      const taskProgress = deriveProjectTaskProgress(locMeta.rawDirectory);
      if (targetCanonDir === locMeta.directory || taskProgress.source === "docs/features") {
        const isLocalGit = isLocalGitRepository(locMeta.rawDirectory);
        const prevProg = activeSnapshotGetter?.().rooms?.[targetCanonDir]?.taskProgress;
        const effectiveTaskProgress =
          isReconnect && taskProgress.totalTasks === 0 && prevProg?.totalTasks === 0 && typeof prevProg.hydratedAtMs === "number"
            ? { ...taskProgress, hydratedAtMs: prevProg.hydratedAtMs }
            : taskProgress;
        sweepEvents.push({
          type: "tasks.hydrated", timestampMs: now, ...(isLocalGit ? { roomId: targetCanonDir } : {}),
          locationDirectory: targetCanonDir, taskProgress: effectiveTaskProgress,
        });
      }

      let sessionLogs: Record<string, ReconnectLogEntry[]> | undefined = state.sessionLogs ? { ...state.sessionLogs } : undefined;
      if (isReconnect && options.client.getSessionLogAfter) {
        for (const sessionMeta of state.sessions ?? []) {
          if (sessionLogs?.[sessionMeta.sessionId]) continue;
          const afterCursor = sessionCursors.get(sessionMeta.sessionId) ?? 0;
          const incrementalEntries = await options.client.getSessionLogAfter(sessionMeta.sessionId, afterCursor);
          if (incrementalEntries.length > 0) {
            sessionLogs ??= {};
            sessionLogs[sessionMeta.sessionId] = incrementalEntries;
            for (const entry of incrementalEntries) {
              sessionCursors.set(sessionMeta.sessionId, Math.max(sessionCursors.get(sessionMeta.sessionId) ?? 0, entry.cursor));
            }
          }
        }
      }

      if (
        deletedRoomDirs.has(locMeta.directory) ||
        deletedRoomDirs.has(targetCanonDir) ||
        (locMeta.parentProjectDirectory && deletedRoomDirs.has(locMeta.parentProjectDirectory))
      ) {
        continue;
      }
      const taggedSessions = Array.isArray(state.sessions)
        ? state.sessions
            .filter((s) => !deletedSessionIds.has(s.sessionId) && !(s.parentId && deletedSessionIds.has(s.parentId)))
            .map((s) => {
              sessionDirectoryBySessionId.set(s.sessionId, targetCanonDir);
              return { ...s, locationDirectory: locMeta.directory };
            })
        : undefined;
      const filteredActiveIds = (state.activeSessionIds ?? []).filter((id) => !deletedSessionIds.has(id));
      const existingCanon = reconciliationByDir.get(targetCanonDir);
      if (existingCanon) {
        existingCanon.activeSessionIds = [...new Set([...existingCanon.activeSessionIds, ...filteredActiveIds])];
        existingCanon.sessions =
          existingCanon.sessions !== undefined && taggedSessions !== undefined
            ? [...existingCanon.sessions, ...taggedSessions]
            : existingCanon.sessions ?? taggedSessions;
        existingCanon.pendingPermissions = [...(existingCanon.pendingPermissions ?? []), ...(state.pendingPermissions ?? [])];
        existingCanon.pendingQuestions = [...(existingCanon.pendingQuestions ?? []), ...(state.pendingQuestions ?? [])];
        if (sessionLogs) existingCanon.sessionLogs = { ...(existingCanon.sessionLogs ?? {}), ...sessionLogs };
      } else {
        const canonMeta = discoveredDirs.get(targetCanonDir) ?? locMeta;
        const entry: LocationReconciliationSnapshot = {
          locationDirectory: targetCanonDir, projectId: canonMeta.projectId, projectName: canonMeta.projectName,
          isWorktree: canonMeta.isWorktree, parentProjectDirectory: canonMeta.parentProjectDirectory,
          activeSessionIds: filteredActiveIds, sessions: taggedSessions,
          pendingPermissions: state.pendingPermissions ?? [], pendingQuestions: state.pendingQuestions ?? [], sessionLogs,
        };
        reconciliationByDir.set(targetCanonDir, entry);
        reconciliationLocations.push(entry);
      }
    }

    if (reconciliationLocations.length > 0 || isReconnect) {
      sweepEvents.push({ type: "stream.reconnected", timestampMs: now, locations: reconciliationLocations });

      for (const loc of reconciliationLocations) {
        const activeSet = new Set(loc.activeSessionIds);
      const blockedSessionIds = new Set([...(loc.pendingPermissions ?? []).map((p) => p.sessionId), ...(loc.pendingQuestions ?? []).map((q) => q.sessionId)]);
      for (const sessionMeta of loc.sessions ?? []) {
        const activeToolName = sessionMeta.activeTool?.toolName;
        if (activeSet.has(sessionMeta.sessionId) && !blockedSessionIds.has(sessionMeta.sessionId) && activeToolName && activeToolName.trim().toLowerCase() !== "question") {
          sweepEvents.push({
            type: "tool.started", timestampMs: Math.max(now, sessionMeta.activeTool?.timestampMs ?? now), sessionId: sessionMeta.sessionId,
            ...(sessionMeta.activeTool?.callId ? { callId: sessionMeta.activeTool.callId } : {}), toolName: activeToolName, toolInput: sessionMeta.activeTool?.toolInput,
          });
        }
      }
      }
    }

    if (sweepEvents.length > 0) {
      if (activeBatchSink) activeBatchSink(sweepEvents);
      else for (const ev of sweepEvents) activeSink(ev);
    }
  }

  async function startLiveSubscription(): Promise<void> {
    if (unsubscribeEvents || !options.client.subscribeEvents) return;
    unsubscribeEvents = await options.client.subscribeEvents((rawEv) => {
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
            activeSink?.({ type: "tasks.hydrated", timestampMs: Date.now(), locationDirectory: roomDir, taskProgress: deriveProjectTaskProgress(rawDir) });
          } else {
            void scanGitStatusAsync(rawDir, { force: true }).then(() => {
              if (deletedRoomDirs.has(roomDir)) return;
              invalidateTaskProgressCache(rawDir);
              activeSink?.({ type: "tasks.hydrated", timestampMs: Date.now(), roomId: roomDir, locationDirectory: roomDir, taskProgress: deriveProjectTaskProgress(rawDir) });
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
              if (!hydrated || !activeSink || deletedSessionIds.has(ev.sessionId) || deletedRoomDirs.has(locDir)) return;
              const pq = hydrated.pendingQuestion;
              const pqDone = Boolean(pq && hydrated.recentTools?.some((t) => t.status === "completed" && (t.callId === pq.gateId || t.toolName.trim().toLowerCase() === "question")));
              activeSink({
                type: "session.upserted", timestampMs: Date.now(), sessionId: ev.sessionId, locationDirectory: locDir,
                lastAssistantText: pqDone ? undefined : hydrated.lastAssistantText, lastUserPromptText: hydrated.lastUserPromptText,
                messages: hydrated.messages, recentTools: hydrated.recentTools, preserveActivityTimestamp: true,
              });
              if (ev.type === "session.idle" && pq && !pqDone && hydrated.messages?.at(-1)?.role !== "user") {
                activeSink({ type: "question.requested", timestampMs: Date.now(), sessionId: ev.sessionId, gateId: pq.gateId, title: pq.title || "Waiting for User Input", reason: pq.reason, source: pq.source, fields: pq.fields });
              }
            }).catch(() => {});
          }
        }
      }
    }, () => { void sweepAllLocations(true).catch(() => {}); });
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
      const sink: (event: TelemetryEvent) => void = typeof sinkOrReducer === "function" ? sinkOrReducer : (event) => sinkOrReducer.dispatch(event);
      const batchCandidate = (sinkOrReducer as { dispatchBatch?: (events: ReadonlyArray<TelemetryEvent>) => unknown }).dispatchBatch;
      activeSink = sink;
      activeSnapshotGetter = typeof sinkOrReducer !== "function" && typeof sinkOrReducer.getSnapshot === "function" ? () => sinkOrReducer.getSnapshot() : null;
      activeBatchSink = typeof batchCandidate === "function" ? (events) => batchCandidate.call(sinkOrReducer, events) : null;
      const initialSnap = activeSnapshotGetter?.();
      if (initialSnap?.deletedRoomIds?.length) evictDeletedRooms(initialSnap.deletedRoomIds);
      if (initialSnap?.deletedSessionIds?.length) evictDeletedSessions(initialSnap.deletedSessionIds);
      daemonUrl = options.discoverDaemon ? (await options.discoverDaemon()).url : "http://127.0.0.1:4096";
      sink({ type: "adapter.switched", timestampMs: Date.now(), adapter: "opencode-client", daemonUrl });
      await sweepAllLocations(false);
      await startLiveSubscription();
    },
    stop() {
      if (unsubscribeEvents) { unsubscribeEvents(); unsubscribeEvents = null; }
      activeSink = null; activeBatchSink = null;
    },
  };
}
