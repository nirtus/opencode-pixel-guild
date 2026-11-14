import { normalizeLocationDirectory } from "../spatial/index.ts";
import type { GuildSnapshot } from "../types/domain.ts";
import { clientState } from "./client-state.ts";
import { syncClientViewedSessionsToSnapshot } from "./command-scroll-controller.ts";

export interface ApplyAuthoritativeSnapshotOptions {
  readonly allowVersionReset?: boolean;
  readonly roomIdHint?: string;
}

const clientDeletedSessionIds = new Set<string>();
const clientDeletedRoomIds = new Set<string>();
const killingSessionIds = new Set<string>();
const demolishingRoomIds = new Set<string>();
const resolvingGateIds = new Set<string>();
let pendingOperatorAction: string | null = null;

export function resetAuthoritativeSnapshotGate(): void {
  clientDeletedSessionIds.clear();
  clientDeletedRoomIds.clear();
  killingSessionIds.clear();
  demolishingRoomIds.clear();
  resolvingGateIds.clear();
  pendingOperatorAction = null;
}

export function recordClientDeletedSession(sessionId: string | null | undefined): void {
  if (!sessionId) return;
  clientDeletedSessionIds.add(sessionId);
}

export function recordClientDeletedRoom(roomId: string | null | undefined): void {
  if (!roomId) return;
  clientDeletedRoomIds.add(roomId);
  const norm = normalizeLocationDirectory(roomId);
  if (norm) clientDeletedRoomIds.add(norm);
}

export function clearClientDeletedRoom(roomId: string | null | undefined): void {
  if (!roomId) return;
  clientDeletedRoomIds.delete(roomId);
  const norm = normalizeLocationDirectory(roomId);
  if (norm) clientDeletedRoomIds.delete(norm);
}

export function markSessionKilling(sessionId: string, active: boolean): void {
  if (!sessionId) return;
  if (active) killingSessionIds.add(sessionId);
  else killingSessionIds.delete(sessionId);
}

export function isSessionKilling(sessionId: string | null | undefined): boolean {
  return Boolean(sessionId && killingSessionIds.has(sessionId));
}

export function markRoomDemolishing(roomId: string, active: boolean): void {
  if (!roomId) return;
  if (active) demolishingRoomIds.add(roomId);
  else demolishingRoomIds.delete(roomId);
}

export function isRoomDemolishing(roomId: string | null | undefined): boolean {
  if (!roomId) return demolishingRoomIds.size > 0;
  const norm = normalizeLocationDirectory(roomId);
  return demolishingRoomIds.has(roomId) || Boolean(norm && demolishingRoomIds.has(norm));
}

export function markGateResolving(gateId: string | null | undefined, active: boolean): void {
  if (!gateId) return;
  if (active) resolvingGateIds.add(gateId);
  else resolvingGateIds.delete(gateId);
}

export function isGateResolving(gateId: string | null | undefined): boolean {
  return Boolean(gateId && resolvingGateIds.has(gateId));
}

export function setPendingOperatorAction(action: string | null): void {
  pendingOperatorAction = action;
}

export function getPendingOperatorAction(): string | null {
  return pendingOperatorAction;
}

function pruneClientTombstonesFromSnapshot(snap: GuildSnapshot): void {
  if (Array.isArray(snap.deletedSessionIds)) {
    for (const sid of snap.deletedSessionIds) {
      if (sid) clientDeletedSessionIds.add(sid);
    }
  }
  if (Array.isArray(snap.deletedRoomIds)) {
    for (const rid of snap.deletedRoomIds) {
      if (rid) recordClientDeletedRoom(rid);
    }
  }
  if (clientDeletedRoomIds.size > 0 && snap.rooms) {
    for (const [roomKey, room] of Object.entries(snap.rooms)) {
      const normKey = normalizeLocationDirectory(roomKey);
      const normLoc = normalizeLocationDirectory(room?.locationDirectory || roomKey);
      const normParent = room?.parentProjectDirectory
        ? normalizeLocationDirectory(room.parentProjectDirectory)
        : "";
      if (
        clientDeletedRoomIds.has(roomKey) ||
        (normKey && clientDeletedRoomIds.has(normKey)) ||
        (normLoc && clientDeletedRoomIds.has(normLoc)) ||
        (normParent && clientDeletedRoomIds.has(normParent))
      ) {
        delete snap.rooms[roomKey];
        if (Array.isArray(snap.roomOrder)) {
          snap.roomOrder = snap.roomOrder.filter((id) => id !== roomKey);
        }
        if (snap.characters) {
          for (const [cid, ch] of Object.entries(snap.characters)) {
            if (ch.roomId === roomKey || normalizeLocationDirectory(ch.locationDirectory) === normLoc) {
              delete snap.characters[cid];
            }
          }
        }
      }
    }
  }
  if (clientDeletedSessionIds.size > 0 && snap.characters) {
    for (const sid of clientDeletedSessionIds) {
      if (snap.characters[sid]) {
        delete snap.characters[sid];
      }
    }
    if (snap.rooms) {
      for (const room of Object.values(snap.rooms)) {
        if (Array.isArray(room.characterIds)) {
          room.characterIds = room.characterIds.filter((id) => !clientDeletedSessionIds.has(id));
        }
        if (Array.isArray(room.activeSessionIds)) {
          room.activeSessionIds = room.activeSessionIds.filter((id) => !clientDeletedSessionIds.has(id));
        }
      }
    }
  }
}

export function applyAuthoritativeSnapshot(
  nextSnap: GuildSnapshot | null | undefined,
  options: ApplyAuthoritativeSnapshotOptions = {},
): boolean {
  if (!nextSnap || typeof nextSnap !== "object") return false;
  if (options.allowVersionReset) {
    clientDeletedSessionIds.clear();
    clientDeletedRoomIds.clear();
  }
  const curSnap = clientState.currentSnapshot;
  const curVer = typeof curSnap?.version === "number" ? curSnap.version : 0;
  const nextVer = typeof nextSnap.version === "number" ? nextSnap.version : 0;

  if (!options.allowVersionReset && curVer > 0 && nextVer > 0 && nextVer < curVer) {
    if (options.roomIdHint && curSnap?.rooms?.[options.roomIdHint] && nextSnap.rooms?.[options.roomIdHint]) {
      curSnap.rooms[options.roomIdHint] = {
        ...curSnap.rooms[options.roomIdHint]!,
        taskProgress: nextSnap.rooms[options.roomIdHint]!.taskProgress,
      };
    }
    return false;
  }

  pruneClientTombstonesFromSnapshot(nextSnap);
  syncClientViewedSessionsToSnapshot(nextSnap);
  clientState.currentSnapshot = nextSnap;
  return true;
}
