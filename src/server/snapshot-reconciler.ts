import { existsSync } from "node:fs";
import type { OpenCodeDaemonClientPort } from "../ingress/index.ts";
import {
  isLocalDaemonEndpoint,
  isSystemRootOrHomeDirectory,
  normalizeLocationDirectory,
  resolveLocalProjectDir,
} from "../state/index.ts";
import type {
  GuildSnapshot,
  SessionChatMessage,
  SessionTributeRecord,
} from "../types/domain.ts";

export interface ReconcilePersistedSnapshotInput {
  readonly stagedSnapshot: GuildSnapshot;
  readonly persistedSnapshot: Partial<GuildSnapshot> | null | undefined;
  readonly daemonClient: OpenCodeDaemonClientPort;
  readonly daemonUrl: string;
  readonly deletedSessionIds: readonly string[];
  readonly deletedRoomIds: readonly string[];
  readonly isStillCurrentEpoch: () => boolean;
}

function extractParentAndHomePrefixes(roomIds: Iterable<string>): Set<string> {
  const prefixes = new Set<string>();
  for (const raw of roomIds) {
    const norm = normalizeLocationDirectory(raw).toLowerCase();
    const slash = norm.lastIndexOf("/");
    if (slash > 0) prefixes.add(norm.slice(0, slash));
    const homeMatch = /^(\/(?:[a-z]\/)?(?:home|users)\/[^/]+)/i.exec(norm);
    if (homeMatch?.[1]) prefixes.add(homeMatch[1].toLowerCase());
  }
  return prefixes;
}

function matchesDiscoveredWorkspacePrefixes(normRoomId: string, prefixes: ReadonlySet<string>): boolean {
  const lower = normRoomId.toLowerCase();
  for (const pfx of prefixes) {
    if (lower.startsWith(`${pfx}/`)) return true;
  }
  return false;
}

export async function reconcilePersistedSnapshotWithDaemon(
  input: ReconcilePersistedSnapshotInput,
): Promise<{ mergedSnap: Partial<GuildSnapshot>; prunedTributeSessionIds: string[] }> {
  const {
    stagedSnapshot,
    persistedSnapshot,
    daemonClient,
    daemonUrl,
    deletedSessionIds,
    deletedRoomIds,
    isStillCurrentEpoch,
  } = input;

  const mergedRooms = { ...stagedSnapshot.rooms };
  const mergedRoomOrder = [...stagedSnapshot.roomOrder];
  const mergedCharacters = { ...stagedSnapshot.characters };
  const mergedDeletedRooms = new Set<string>([
    ...(stagedSnapshot.deletedRoomIds ?? []).map(normalizeLocationDirectory),
    ...deletedRoomIds.map(normalizeLocationDirectory),
  ]);
  const mergedDeletedSessions = new Set<string>([
    ...(stagedSnapshot.deletedSessionIds ?? []),
    ...deletedSessionIds,
  ]);
  const liveParentPrefixes = extractParentAndHomePrefixes(Object.keys(stagedSnapshot.rooms));
  const prunedForeignRoomIds = new Set<string>();
  const probedDirCache = new Map<string, Promise<boolean>>();

  const probeDirOnce = async (rawDir: string): Promise<boolean | null> => {
    if (!daemonClient.probeDirectory) return null;
    const norm = normalizeLocationDirectory(rawDir);
    let pending = probedDirCache.get(norm);
    if (!pending) {
      pending = daemonClient
        .probeDirectory(rawDir, { checkGit: false })
        .then((p) => p.exists)
        .catch(() => false);
      probedDirCache.set(norm, pending);
    }
    return pending;
  };

  const baseRoomsWithChars = new Set<string>();
  for (const [rid, room] of Object.entries(persistedSnapshot?.rooms ?? {})) {
    if ((room?.characterIds?.length ?? 0) > 0) baseRoomsWithChars.add(normalizeLocationDirectory(rid));
  }
  for (const ch of Object.values(persistedSnapshot?.characters ?? {})) {
    if (ch?.roomId) baseRoomsWithChars.add(normalizeLocationDirectory(ch.roomId));
  }

  const candidateRooms: Array<{ normRoomId: string; rawDir: string; persistedRoom: NonNullable<(typeof persistedSnapshot)["rooms"]>[string] }> = [];
  for (const [rawRoomId, persistedRoom] of Object.entries(persistedSnapshot?.rooms ?? {})) {
    const normRoomId = normalizeLocationDirectory(rawRoomId);
    if (mergedRooms[normRoomId] || mergedDeletedRooms.has(normRoomId)) continue;
    if (!persistedRoom || persistedRoom.isWorktree || isSystemRootOrHomeDirectory(normRoomId)) {
      prunedForeignRoomIds.add(normRoomId);
      continue;
    }
    if (baseRoomsWithChars.has(normRoomId)) {
      prunedForeignRoomIds.add(normRoomId);
      continue;
    }
    candidateRooms.push({ normRoomId, rawDir: persistedRoom.locationDirectory || normRoomId, persistedRoom });
  }

  const roomProbeResults = await Promise.all(
    candidateRooms.map(async (c) => ({ ...c, probed: await probeDirOnce(c.rawDir) })),
  );
  if (!isStillCurrentEpoch()) return { mergedSnap: stagedSnapshot, prunedTributeSessionIds: [] };

  for (const { normRoomId, rawDir, persistedRoom, probed } of roomProbeResults) {
    let verified = false;
    if (probed !== null) {
      verified = probed;
    } else if (isLocalDaemonEndpoint(daemonUrl)) {
      verified =
        resolveLocalProjectDir(rawDir, existsSync, daemonUrl) !== null ||
        (liveParentPrefixes.size > 0 && matchesDiscoveredWorkspacePrefixes(normRoomId, liveParentPrefixes));
    } else if (liveParentPrefixes.size > 0) {
      verified = matchesDiscoveredWorkspacePrefixes(normRoomId, liveParentPrefixes);
    } else {
      verified = Object.keys(persistedSnapshot?.characters ?? {}).length === 0;
    }
    if (verified) {
      mergedRooms[normRoomId] = structuredClone(persistedRoom);
      if (!mergedRoomOrder.includes(normRoomId)) mergedRoomOrder.push(normRoomId);
      daemonClient.recordDirectory?.(rawDir);
    } else {
      prunedForeignRoomIds.add(normRoomId);
    }
  }

  for (const [sid, liveChar] of Object.entries(mergedCharacters)) {
    const prevChar = persistedSnapshot?.characters?.[sid];
    if (!prevChar) continue;
    if (prevChar.messages?.length) {
      const byId = new Map<string, SessionChatMessage>();
      for (const m of prevChar.messages) byId.set(m.messageId, m);
      for (const m of liveChar.messages ?? []) {
        const cur = byId.get(m.messageId);
        if (!cur || (m.text?.length ?? 0) >= (cur.text?.length ?? 0)) byId.set(m.messageId, m);
      }
      liveChar.messages = [...byId.values()].sort((a, b) => a.createdAtMs - b.createdAtMs).slice(-60);
    }
    if (!liveChar.lastUserPromptText && prevChar.lastUserPromptText) liveChar.lastUserPromptText = prevChar.lastUserPromptText;
    if (!liveChar.lastAssistantText && prevChar.lastAssistantText) liveChar.lastAssistantText = prevChar.lastAssistantText;
  }

  const validRoomIds = new Set<string>([...Object.keys(mergedRooms), ...mergedDeletedRooms]);
  const isRoomOwnedByMachine = (rawDir?: string | null): boolean => {
    if (!rawDir) return false;
    const norm = normalizeLocationDirectory(rawDir);
    if (!norm || norm === "/") return false;
    if (validRoomIds.has(norm)) return true;
    for (const valid of validRoomIds) {
      if (norm.startsWith(`${valid}/.worktrees/`) || norm.startsWith(`${valid}/worktree/`)) return true;
    }
    return false;
  };

  const filteredBaseTribute: Record<string, SessionTributeRecord> = {};
  const prunedTributeSessionIds: string[] = [];
  const tributeProbeCandidates: Array<{ sid: string; rec: SessionTributeRecord; recDir: string }> = [];
  for (const [sid, rec] of Object.entries(persistedSnapshot?.tributeLedger ?? {})) {
    if (!rec?.sessionId) continue;
    const recDir = rec.roomId || rec.locationDirectory || "";
    const normRecRoom = normalizeLocationDirectory(recDir);
    const isLiveChar = Boolean(mergedCharacters[sid]);
    const isPrunedRoom = Boolean(normRecRoom && prunedForeignRoomIds.has(normRecRoom));
    const belongsToValid = isRoomOwnedByMachine(rec.roomId) || isRoomOwnedByMachine(rec.locationDirectory);
    if (isLiveChar || (!isPrunedRoom && belongsToValid)) {
      filteredBaseTribute[sid] = rec;
    } else if (!isPrunedRoom && validRoomIds.size === 0 && prunedForeignRoomIds.size === 0) {
      tributeProbeCandidates.push({ sid, rec, recDir });
    } else {
      prunedTributeSessionIds.push(sid);
    }
  }
  if (tributeProbeCandidates.length > 0) {
    const probedTributes = await Promise.all(
      tributeProbeCandidates.map(async (item) => ({
        ...item,
        probed: item.recDir ? await probeDirOnce(item.recDir) : null,
      })),
    );
    if (!isStillCurrentEpoch()) return { mergedSnap: stagedSnapshot, prunedTributeSessionIds: [] };
    for (const { sid, rec, probed } of probedTributes) {
      if (probed === false) prunedTributeSessionIds.push(sid);
      else filteredBaseTribute[sid] = rec;
    }
  }

  return {
    mergedSnap: {
      ...stagedSnapshot,
      rooms: mergedRooms,
      roomOrder: mergedRoomOrder,
      characters: mergedCharacters,
      tributeLedger: { ...filteredBaseTribute, ...(stagedSnapshot.tributeLedger ?? {}) },
      deletedSessionIds: [...mergedDeletedSessions],
      deletedRoomIds: [...mergedDeletedRooms],
    },
    prunedTributeSessionIds,
  };
}
