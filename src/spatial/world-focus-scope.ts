import type {
  CharacterState,
  GuildSnapshot,
  WorkshopRoomState,
} from "../types/domain.ts";
import { resolveProjectHeraldry } from "./project-heraldry.ts";
import { resolveRoomCanonicalProjectRoot } from "./project-world.ts";
import { normalizeRoomDirectory } from "./room-layout.ts";

export interface WorldFocusOptions {
  readonly selectedRoomId?: string | null;
  readonly selectedProjectId?: string | null;
  readonly isAllWorldsFocused?: boolean;
}

export interface WorldFocusScope {
  readonly isMultiProjectScope: boolean;
  readonly selectedProjectRoom: WorkshopRoomState | null;
  readonly scopedRooms: WorkshopRoomState[];
  readonly scopedCharacters: CharacterState[];
}

export function resolveWorldFocusScope(
  snapshot: GuildSnapshot,
  options?: WorldFocusOptions,
): WorldFocusScope {
  const allRoomIds =
    snapshot.roomOrder?.length > 0
      ? snapshot.roomOrder
      : Object.keys(snapshot.rooms ?? {});
  const allRooms = allRoomIds
    .map((rid) => snapshot.rooms?.[rid])
    .filter((r): r is WorkshopRoomState => Boolean(r));
  const allCharacters = Object.values(snapshot.characters ?? {});

  const rawRoomId = options?.selectedRoomId?.trim() || null;
  const rawProjectId = options?.selectedProjectId?.trim() || null;
  const focusRaw =
    options?.isAllWorldsFocused === true ? null : (rawRoomId || rawProjectId);

  if (!focusRaw) {
    return {
      isMultiProjectScope: true,
      selectedProjectRoom: null,
      scopedRooms: allRooms,
      scopedCharacters: allCharacters,
    };
  }

  const normFocus = normalizeRoomDirectory(focusRaw).toLowerCase();
  const focusLower = focusRaw.toLowerCase();
  const cleanSuffix = focusLower.replace(/^\/+/, "");
  const directRoom =
    snapshot.rooms?.[focusRaw] ??
    snapshot.rooms?.[normalizeRoomDirectory(focusRaw)] ??
    allRooms.find((r) => {
      const normRoom = normalizeRoomDirectory(r.locationDirectory || r.roomId).toLowerCase();
      return normRoom === normFocus || (r.projectId && r.projectId.toLowerCase() === focusLower);
    }) ??
    allRooms.find((r) => (r.projectName || "").toLowerCase() === focusLower) ??
    (cleanSuffix
      ? allRooms.find((r) => {
          const normRoom = normalizeRoomDirectory(r.locationDirectory || r.roomId).toLowerCase();
          return normRoom.endsWith("/" + cleanSuffix);
        })
      : undefined);
  const targetProjectRoot = resolveProjectHeraldry(
    directRoom ?? focusRaw,
    snapshot,
  ).projectId.toLowerCase();

  const scopedRooms = allRooms.filter((r) => {
    if (
      r.roomId === focusRaw ||
      normalizeRoomDirectory(r.roomId).toLowerCase() === normFocus
    ) {
      return true;
    }
    if (
      r.projectId === focusRaw ||
      normalizeRoomDirectory(r.locationDirectory).toLowerCase() === normFocus ||
      (r.parentProjectDirectory &&
        normalizeRoomDirectory(r.parentProjectDirectory).toLowerCase() ===
          normFocus)
    ) {
      return true;
    }
    const { projectRoot } = resolveRoomCanonicalProjectRoot(r);
    if (projectRoot.toLowerCase() === targetProjectRoot) {
      return true;
    }
    return (
      resolveProjectHeraldry(r, snapshot).projectId.toLowerCase() ===
      targetProjectRoot
    );
  });

  const normRoomId = rawRoomId
    ? normalizeRoomDirectory(rawRoomId).toLowerCase()
    : null;
  const explicitSelectedRoom = normRoomId
    ? scopedRooms.find(
        (r) =>
          r.roomId === rawRoomId ||
          normalizeRoomDirectory(r.roomId).toLowerCase() === normRoomId,
      )
    : undefined;

  const selectedProjectRoom =
    explicitSelectedRoom ??
    scopedRooms.find((r) => !r.isWorktree) ??
    scopedRooms[0] ??
    directRoom ??
    null;

  const scopedRoomSet = new Set(scopedRooms.map((r) => r.roomId));
  const scopedCharacters = allCharacters.filter((ch) => {
    if (scopedRoomSet.has(ch.roomId)) return true;
    if (
      normalizeRoomDirectory(ch.roomId || ch.locationDirectory).toLowerCase() ===
      normFocus
    ) {
      return true;
    }
    return (
      resolveProjectHeraldry(ch, snapshot).projectId.toLowerCase() ===
      targetProjectRoot
    );
  });

  return {
    isMultiProjectScope: false,
    selectedProjectRoom,
    scopedRooms,
    scopedCharacters,
  };
}
