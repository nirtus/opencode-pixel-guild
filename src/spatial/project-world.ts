import {
  LIFECYCLE_TIMERS_MS,
  type CharacterState,
  type GuildSnapshot,
  type ProjectWorldVisualSeed,
  type WildernessBiomeKind,
  type WorkshopRoomState,
} from "../types/domain.ts";
import type { TileBounds } from "./tile-grid.ts";
import {
  annexWorkshopRoom,
  buildFloorplanAggregates,
  type GuildFloorplanLayout,
  type PlacedWorkshopRoomLayout,
} from "./floorplan-packing.ts";
import { normalizeRoomDirectory } from "./room-layout.ts";
import type { WorkshopRoomLayoutInput } from "./room-layout-types.ts";

export type ProjectRosterMode = "active-squads" | "full-lineage";

const BIOMES: readonly WildernessBiomeKind[] = ["forest", "dungeon", "dryland"];

const BIOME_DETAILS: Record<
  WildernessBiomeKind,
  { name: string; groundBaseHex: string; groundAltHex: string; pathColorHex: string; fogTintRgba: string }
> = {
  forest: {
    name: "Dark Forest Wilderness", groundBaseHex: "#1d281d", groundAltHex: "#162016",
    pathColorHex: "#3d2e20", fogTintRgba: "rgba(10, 16, 12, 0.94)",
  },
  dungeon: {
    name: "Blighted Dungeon Wilds", groundBaseHex: "#221e29", groundAltHex: "#1a1721",
    pathColorHex: "#332d3b", fogTintRgba: "rgba(12, 9, 18, 0.95)",
  },
  dryland: {
    name: "Scorched Dryland Badlands", groundBaseHex: "#423325", groundAltHex: "#36291d",
    pathColorHex: "#574432", fogTintRgba: "rgba(18, 13, 9, 0.93)",
  },
};

export function seedProjectWorldVisuals(projectIdOrPath: string): ProjectWorldVisualSeed {
  const norm = normalizeRoomDirectory(projectIdOrPath || "/guild");
  let hash = 5381;
  for (let i = 0; i < norm.length; i += 1) {
    hash = ((hash << 5) + hash) + norm.charCodeAt(i);
    hash |= 0;
  }
  const positiveHash = Math.abs(hash);
  const biome = BIOMES[positiveHash % BIOMES.length];
  const details = BIOME_DETAILS[biome];
  const monsterSetKey = String(((positiveHash >> 3) % 10) + 1).padStart(2, "0");
  const severityIndex = (positiveHash >> 7) % 3;
  const ambientSeverity: "peaceful" | "contested" | "infested" =
    severityIndex === 0 ? "peaceful" : severityIndex === 1 ? "contested" : "infested";

  return {
    projectId: norm, biome, biomeName: details.name, monsterSetKey, ambientSeverity,
    groundBaseHex: details.groundBaseHex, groundAltHex: details.groundAltHex,
    pathColorHex: details.pathColorHex, fogTintRgba: details.fogTintRgba,
  };
}

export interface ProjectWorldTab {
  projectId: string;
  projectName: string;
  sessionCount: number;
  active: boolean;
}

export interface ProjectWorldLayout {
  projectId: string;
  projectName: string;
  primaryRoom: PlacedWorkshopRoomLayout;
  worktreeRooms: PlacedWorkshopRoomLayout[];
  allRooms: Record<string, PlacedWorkshopRoomLayout>;
  topBarTabs: ProjectWorldTab[];
  worldBounds: TileBounds;
  floorplan: GuildFloorplanLayout;
  visualSeed: ProjectWorldVisualSeed;
}

export function isCharacterWaitingAtGate(c: CharacterState): boolean {
  return c.lifecycleState === "BlockedAtQuestGate" || Boolean(c.questGate);
}

export function hasCharacterUnviewedResult(c: CharacterState): boolean {
  if (c.parentId || c.role === "Squad Subagent") return false;
  if (
    c.lifecycleState === "WorkingAtStation" ||
    c.lifecycleState === "Thinking" ||
    c.lifecycleState === "Entering" ||
    c.lifecycleState === "DistillingContextMana" ||
    isCharacterWaitingAtGate(c)
  ) {
    return false;
  }
  if (c.hasUnviewedResult === true) return true;
  if (c.hasUnviewedResult === false) return false;
  return (
    typeof c.idleAtMs === "number" &&
    c.idleAtMs > 0 &&
    (typeof c.viewedAtMs !== "number" || c.viewedAtMs < c.idleAtMs)
  );
}

export function isCharacterActivelyOpen(c: CharacterState): boolean {
  if (!c.parentId && hasCharacterUnviewedResult(c)) {
    return true;
  }
  if (c.lifecycleState === "Archived") {
    return false;
  }
  const isActiveTurn =
    c.lifecycleState === "WorkingAtStation" ||
    c.lifecycleState === "Thinking" ||
    c.lifecycleState === "Entering" ||
    isCharacterWaitingAtGate(c) ||
    Boolean(c.activeCapability);
  if (c.parentId) {
    return isActiveTurn || c.lifecycleState === "ReportingScroll";
  }
  const isRecentlyViewedRoot =
    typeof c.viewedAtMs === "number" &&
    c.viewedAtMs > 0 &&
    Date.now() - c.viewedAtMs < LIFECYCLE_TIMERS_MS.HISTORICAL_ARCHIVE_IDLE_MS;
  return (
    c.isOpenInOpenCode === true ||
    isRecentlyViewedRoot ||
    isActiveTurn ||
    c.lifecycleState === "DistillingContextMana"
  );
}

export function isSubagentArchivedOrUnneeded(
  c: CharacterState,
  charactersById?: Readonly<Record<string, CharacterState>> | null,
): boolean {
  const parentId = c.parentId ?? c.parentSessionId ?? null;
  const isSubagent = Boolean(parentId || c.role === "Squad Subagent");
  if (!isSubagent) return false;
  if (c.lifecycleState === "Archived" || c.lifecycleState === "RestingInLounge") {
    return true;
  }
  if (parentId && charactersById) {
    const parent = charactersById[parentId];
    if (
      parent &&
      (hasCharacterUnviewedResult(parent) ||
        parent.lifecycleState === "RestingInLounge" ||
        parent.lifecycleState === "Archived")
    ) {
      return true;
    }
  }
  return false;
}

export function resolveRoomCanonicalProjectRoot(input: {
  roomId: string;
  locationDirectory?: string;
  parentProjectDirectory?: string | null;
  isWorktree?: boolean;
}): { projectRoot: string; isWorktree: boolean } {
  const normDir = normalizeRoomDirectory(input.locationDirectory ?? input.roomId);
  const parentDir = input.parentProjectDirectory
    ? normalizeRoomDirectory(input.parentProjectDirectory)
    : null;
  const isWorktree = Boolean(input.isWorktree || parentDir || normDir.includes("/.worktrees/"));
  const projectRoot = parentDir ?? (isWorktree ? normDir.replace(/\/\.worktrees\/.*$/, "") : normDir);
  return { projectRoot, isWorktree };
}

export function matchProjectTabSelection<
  T extends { projectId: string; projectName: string; active?: boolean },
>(projTabs: ReadonlyArray<T>, candidateId: string | null | undefined): T | undefined {
  if (!candidateId || !candidateId.trim()) return undefined;
  let decoded = candidateId.trim();
  try {
    decoded = decodeURIComponent(decoded).trim();
  } catch {
    // Keep raw trimmed string if malformed URI component
  }
  const normCandidate = normalizeRoomDirectory(decoded).toLowerCase();
  const rawLower = decoded.toLowerCase();
  const cleanSuffix = rawLower.replace(/^\/+/, "");

  return (
    projTabs.find((t) => {
      const pIdLower = t.projectId.toLowerCase();
      const normTabId = normalizeRoomDirectory(t.projectId).toLowerCase();
      return normTabId === normCandidate || pIdLower === normCandidate || pIdLower === rawLower;
    }) ??
    projTabs.find((t) => t.projectName.toLowerCase() === rawLower) ??
    (cleanSuffix
      ? projTabs.find((t) => {
          const pIdLower = t.projectId.toLowerCase();
          const normTabId = normalizeRoomDirectory(t.projectId).toLowerCase();
          return pIdLower.endsWith("/" + cleanSuffix) || normTabId.endsWith("/" + cleanSuffix);
        })
      : undefined) ??
    projTabs.find((t) => t.projectId.toLowerCase().includes(rawLower))
  );
}

export function filterProjectRooms(
  snapshot: GuildSnapshot,
  selectedProjectId?: string | null,
): WorkshopRoomState[] {
  const allRooms = Object.values(snapshot.rooms || {});
  if (allRooms.length === 0 || !selectedProjectId || !selectedProjectId.trim()) {
    return allRooms;
  }
  let decoded = selectedProjectId.trim();
  try {
    decoded = decodeURIComponent(decoded).trim();
  } catch {
    // Ignore decode error
  }
  const target = decoded.toLowerCase();
  const normTarget = normalizeRoomDirectory(decoded).toLowerCase();
  const cleanSuffix = target.replace(/^\/+/, "");
  const exactMatches = allRooms.filter((r) => {
    const { projectRoot } = resolveRoomCanonicalProjectRoot(r);
    const rootLower = projectRoot.toLowerCase();
    const dir = normalizeRoomDirectory(r.locationDirectory || r.roomId).toLowerCase();
    const pId = (r.projectId || "").toLowerCase();
    const parentDir = r.parentProjectDirectory
      ? normalizeRoomDirectory(r.parentProjectDirectory).toLowerCase()
      : "";
    return (
      rootLower === normTarget ||
      rootLower === target ||
      dir === normTarget ||
      dir === target ||
      pId === target ||
      (parentDir !== "" && (parentDir === normTarget || parentDir === target))
    );
  });
  const winningSeed =
    exactMatches.length > 0
      ? exactMatches
      : allRooms.filter((r) => (r.projectName || "").toLowerCase() === target).length > 0
        ? allRooms.filter((r) => (r.projectName || "").toLowerCase() === target)
        : cleanSuffix
          ? allRooms.filter((r) => {
              const { projectRoot } = resolveRoomCanonicalProjectRoot(r);
              const rootLower = projectRoot.toLowerCase();
              const dir = normalizeRoomDirectory(r.locationDirectory || r.roomId).toLowerCase();
              return rootLower.endsWith("/" + cleanSuffix) || dir.endsWith("/" + cleanSuffix);
            })
          : [];
  if (winningSeed.length === 0) return allRooms;
  const matchedRoots = new Set(
    winningSeed.map((r) => resolveRoomCanonicalProjectRoot(r).projectRoot.toLowerCase()),
  );
  const matching = allRooms.filter(
    (r) =>
      winningSeed.includes(r) ||
      matchedRoots.has(resolveRoomCanonicalProjectRoot(r).projectRoot.toLowerCase()),
  );
  return matching.length > 0 ? matching : allRooms;
}

export function countProjectSessions(
  snapshot: GuildSnapshot,
  projectId: string,
  rosterMode: ProjectRosterMode = "active-squads",
): number {
  const normTarget = normalizeRoomDirectory(projectId).toLowerCase();
  const rawTarget = projectId.trim().toLowerCase();
  const allChars = Object.values(snapshot.characters || {});
  const matching = allChars.filter((c) => {
    if (rosterMode !== "full-lineage" && c.lifecycleState === "Archived" && !hasCharacterUnviewedResult(c)) return false;
    const dir = normalizeRoomDirectory(c.locationDirectory || c.roomId || "").toLowerCase();
    const room = snapshot.rooms?.[c.roomId];
    const roomRoot = room
      ? resolveRoomCanonicalProjectRoot(room).projectRoot.toLowerCase()
      : dir.replace(/\/\.worktrees\/.*$/, "");
    const pId = (room?.projectId || "").toLowerCase();
    const parentDir = room?.parentProjectDirectory
      ? normalizeRoomDirectory(room.parentProjectDirectory).toLowerCase()
      : "";
    return (
      roomRoot === normTarget ||
      roomRoot === rawTarget ||
      dir === normTarget ||
      dir.startsWith(normTarget + "/.worktrees/") ||
      pId === rawTarget ||
      parentDir === normTarget
    );
  });

  if (rosterMode === "full-lineage") {
    return matching.length;
  }
  const activeCount = matching.filter(isCharacterActivelyOpen).length;
  return activeCount > 0 ? activeCount : Math.min(1, matching.length);
}

export function layoutProjectWorld(
  source: WorkshopRoomLayoutInput[] | GuildSnapshot,
  selectedProjectId?: string | null,
  rosterMode: ProjectRosterMode = "active-squads",
): ProjectWorldLayout {
  const isSnapshot = !Array.isArray(source);
  const inputs: WorkshopRoomLayoutInput[] = Array.isArray(source)
    ? source
    : source.roomOrder
        .map((id) => source.rooms[id])
        .filter((r): r is NonNullable<typeof r> => Boolean(r));

  const projectGroups = new Map<
    string,
    { primary?: WorkshopRoomLayoutInput; worktrees: WorkshopRoomLayoutInput[] }
  >();

  for (const input of inputs) {
    const { projectRoot, isWorktree } = resolveRoomCanonicalProjectRoot(input);
    if (!projectGroups.has(projectRoot)) {
      projectGroups.set(projectRoot, { worktrees: [] });
    }
    const group = projectGroups.get(projectRoot)!;
    if (isWorktree) {
      group.worktrees.push(input);
    } else {
      group.primary = input;
    }
  }

  const projectRoots = [...projectGroups.keys()];
  const candidateTabs = projectRoots.map((root) => {
    const grp = projectGroups.get(root)!;
    const pInput = grp.primary ?? grp.worktrees[0];
    const name = pInput?.projectName ?? (root.split("/").filter(Boolean).pop() || "project");
    return { projectId: root, projectName: name };
  });

  const matchedTab = matchProjectTabSelection(candidateTabs, selectedProjectId);
  const activeRoot = matchedTab?.projectId ?? projectRoots[0] ?? "/guild";

  const activeGroup = projectGroups.get(activeRoot) ?? {
    primary: inputs[0] ?? { roomId: activeRoot },
    worktrees: [],
  };

  const primaryInput = activeGroup.primary ?? { roomId: activeRoot };
  const worldInputs = [primaryInput, ...activeGroup.worktrees];

  let floorplan = buildFloorplanAggregates({}, [], {});
  for (const roomInput of worldInputs) {
    floorplan = annexWorkshopRoom(floorplan, roomInput);
  }

  const primaryRoomId = normalizeRoomDirectory(primaryInput.roomId);
  const primaryRoom = floorplan.rooms[primaryRoomId] ?? Object.values(floorplan.rooms)[0];

  const worktreeRooms = activeGroup.worktrees
    .map((wt) => floorplan.rooms[normalizeRoomDirectory(wt.roomId)])
    .filter((r): r is PlacedWorkshopRoomLayout => Boolean(r));

  const hasCharacters = isSnapshot && Object.keys(source.characters || {}).length > 0;
  const topBarTabs: ProjectWorldTab[] = candidateTabs.map((tab) => {
    const grp = projectGroups.get(tab.projectId)!;
    const fallbackRoomCount = (grp.primary ? 1 : 0) + grp.worktrees.length;
    const sessionCount = isSnapshot
      ? (hasCharacters ? countProjectSessions(source, tab.projectId, rosterMode) : 0)
      : fallbackRoomCount;
    return { projectId: tab.projectId, projectName: tab.projectName, sessionCount, active: tab.projectId === activeRoot };
  });

  const visualSeed = seedProjectWorldVisuals(activeRoot);
  return {
    projectId: activeRoot, projectName: primaryRoom?.room?.projectName ?? "Guild Project",
    primaryRoom, worktreeRooms, allRooms: floorplan.rooms, topBarTabs,
    worldBounds: floorplan.worldBounds, floorplan, visualSeed,
  };
}
