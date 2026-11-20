import type {
  LocationReconciliationSnapshot,
  ReconnectLogEntry,
  TelemetryEvent,
} from "../types/domain.ts";
import type { OpenCodeDaemonLocationPayload } from "./daemon-types.ts";

export interface DiscoveredLocationMeta {
  directory: string;
  rawDirectory: string;
  projectId?: string;
  projectName?: string;
  isWorktree: boolean;
  parentProjectDirectory: string | null;
}

export interface MergeLocationReconciliationInput {
  readonly reconciliationByDir: Map<string, LocationReconciliationSnapshot>;
  readonly reconciliationLocations: LocationReconciliationSnapshot[];
  readonly discoveredDirs: Map<string, DiscoveredLocationMeta>;
  readonly locMeta: DiscoveredLocationMeta;
  readonly targetCanonDir: string;
  readonly state: OpenCodeDaemonLocationPayload;
  readonly deletedSessionIds: ReadonlySet<string>;
  readonly sessionDirectoryBySessionId: Map<string, string>;
  readonly sessionLogs: Record<string, ReconnectLogEntry[]> | undefined;
}

export function mergeLocationReconciliationEntry(input: MergeLocationReconciliationInput): void {
  const {
    reconciliationByDir,
    reconciliationLocations,
    discoveredDirs,
    locMeta,
    targetCanonDir,
    state,
    deletedSessionIds,
    sessionDirectoryBySessionId,
    sessionLogs,
  } = input;
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
        : (existingCanon.sessions ?? taggedSessions);
    existingCanon.pendingPermissions = [
      ...(existingCanon.pendingPermissions ?? []),
      ...(state.pendingPermissions ?? []),
    ];
    existingCanon.pendingQuestions = [
      ...(existingCanon.pendingQuestions ?? []),
      ...(state.pendingQuestions ?? []),
    ];
    if (sessionLogs) {
      existingCanon.sessionLogs = { ...(existingCanon.sessionLogs ?? {}), ...sessionLogs };
    }
    return;
  }
  const canonMeta = discoveredDirs.get(targetCanonDir) ?? locMeta;
  const entry: LocationReconciliationSnapshot = {
    locationDirectory: targetCanonDir,
    projectId: canonMeta.projectId,
    projectName: canonMeta.projectName,
    isWorktree: canonMeta.isWorktree,
    parentProjectDirectory: canonMeta.parentProjectDirectory,
    activeSessionIds: filteredActiveIds,
    sessions: taggedSessions,
    pendingPermissions: state.pendingPermissions ?? [],
    pendingQuestions: state.pendingQuestions ?? [],
    sessionLogs,
  };
  reconciliationByDir.set(targetCanonDir, entry);
  reconciliationLocations.push(entry);
}

export function appendReconnectedActiveToolEvents(
  sweepEvents: TelemetryEvent[],
  reconciliationLocations: ReadonlyArray<LocationReconciliationSnapshot>,
  nowMs: number,
): void {
  for (const loc of reconciliationLocations) {
    const activeSet = new Set(loc.activeSessionIds);
    const blockedSessionIds = new Set([
      ...(loc.pendingPermissions ?? []).map((p) => p.sessionId),
      ...(loc.pendingQuestions ?? []).map((q) => q.sessionId),
    ]);
    for (const sessionMeta of loc.sessions ?? []) {
      const activeToolName = sessionMeta.activeTool?.toolName;
      if (
        activeSet.has(sessionMeta.sessionId) &&
        !blockedSessionIds.has(sessionMeta.sessionId) &&
        activeToolName &&
        activeToolName.trim().toLowerCase() !== "question"
      ) {
        sweepEvents.push({
          type: "tool.started",
          timestampMs: Math.max(nowMs, sessionMeta.activeTool?.timestampMs ?? nowMs),
          sessionId: sessionMeta.sessionId,
          ...(sessionMeta.activeTool?.callId ? { callId: sessionMeta.activeTool.callId } : {}),
          toolName: activeToolName,
          toolInput: sessionMeta.activeTool?.toolInput,
        });
      }
    }
  }
}
