import {
  CANONICAL_PARTY_ROSTERS,
  PARTY_KEY_ORDER,
} from "../sprites/hero-party-catalog.ts";
import type {
  CharacterState,
  GuildSnapshot,
  WorkshopRoomState,
} from "../types/domain.ts";
import {
  hasCharacterUnviewedResult,
  isCharacterActivelyOpen,
  isCharacterWaitingAtGate,
  isSubagentArchivedOrUnneeded,
  type ProjectRosterMode,
  resolveRoomCanonicalProjectRoot,
} from "./project-world.ts";
import { normalizeRoomDirectory } from "./room-layout.ts";

export interface ProjectHeraldryDescriptor {
  readonly projectId: string;
  readonly projectName: string;
  readonly shortTag: string;
  readonly crestIcon: string;
  readonly partyKey: string;
  readonly partyName: string;
  readonly primaryHex: string;
  readonly secondaryHex: string;
  readonly accentHex: string;
  readonly auraHex: string;
  readonly textHex: string;
  readonly isWorktree: boolean;
  readonly worktreeName: string | null;
}

const PARTY_CREST_ICONS: Readonly<Record<string, string>> = Object.freeze({
  "01": "🛡️",
  "02": "❄️",
  "03": "🌿",
  "04": "🔮",
  "05": "☀️",
  "06": "⚓",
  "07": "⚒️",
  "09": "🏜️",
  "10": "⚡",
});

const snapshotAssignmentCache = new WeakMap<GuildSnapshot, Map<string, string>>();

function hashProjectSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function deriveProjectShortTag(projectName: string): string {
  const clean = (projectName || "guild")
    .trim()
    .replace(/^.*[/\\]/, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-");
  const rawParts = clean.split(/[-_]+/).filter(Boolean);
  if (rawParts.length === 0) return "GUILD";
  const parts =
    rawParts.length > 1 && rawParts[0].toLowerCase() === "opencode"
      ? rawParts.slice(1)
      : rawParts;
  const abbreviatePart = (p: string): string => {
    const up = p.toUpperCase();
    if (up === "VISUALIZER") return "VIZ";
    if (up === "GATEWAY") return "GW";
    if (up === "SERVICE" || up === "SERVER") return "SVC";
    return up;
  };
  const mapped = parts.map(abbreviatePart);
  const joined = mapped.join("-");
  if (joined.length < 3) return `${joined}-PRJ`.slice(0, 6);
  if (joined.length <= 10) return joined;
  if (mapped.length >= 2) {
    return `${mapped[0].slice(0, 4)}-${mapped[mapped.length - 1].slice(0, 5)}`.slice(0, 10);
  }
  return joined.slice(0, 10);
}

function extractWorktreeBranchName(rawDir: string): string | null {
  const norm = normalizeRoomDirectory(rawDir);
  const wtMatch = /\/(?:\.worktrees|worktree)\/([^/]+)/i.exec(norm);
  return wtMatch ? wtMatch[1] : null;
}

function collectCanonicalHostProjects(
  snapshot?: GuildSnapshot | null,
): Array<{ projectRoot: string; projectName: string }> {
  const byRoot = new Map<string, string>();
  if (snapshot?.rooms) {
    const ids = snapshot.roomOrder?.length ? snapshot.roomOrder : Object.keys(snapshot.rooms);
    for (const rid of ids) {
      const r = snapshot.rooms[rid];
      if (!r) continue;
      const { projectRoot, isWorktree } = resolveRoomCanonicalProjectRoot(r);
      const fallbackName = projectRoot.split("/").filter(Boolean).pop() || "guild";
      const candidateName = !isWorktree && r.projectName ? r.projectName : fallbackName;
      if (!byRoot.has(projectRoot) || !isWorktree) byRoot.set(projectRoot, candidateName);
    }
  }
  if (snapshot?.characters) {
    for (const ch of Object.values(snapshot.characters)) {
      const room = snapshot.rooms?.[ch.roomId];
      const locRoom = ch.locationDirectory ? snapshot.rooms?.[normalizeRoomDirectory(ch.locationDirectory)] : undefined;
      const inferredParent = ch.roomId && ch.locationDirectory && normalizeRoomDirectory(ch.roomId) !== normalizeRoomDirectory(ch.locationDirectory) ? ch.roomId : undefined;
      const { projectRoot } = resolveRoomCanonicalProjectRoot({
        roomId: ch.roomId || ch.locationDirectory, locationDirectory: ch.locationDirectory,
        parentProjectDirectory: locRoom?.parentProjectDirectory ?? room?.parentProjectDirectory ?? inferredParent,
        isWorktree: locRoom?.isWorktree ?? room?.isWorktree,
      });
      if (!byRoot.has(projectRoot)) {
        const name = ch.projectName || room?.projectName || projectRoot.split("/").filter(Boolean).pop() || "guild";
        byRoot.set(projectRoot, name);
      }
    }
  }
  return [...byRoot.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([projectRoot, projectName]) => ({ projectRoot, projectName }));
}

function getOrBuildPartyAssignmentMap(snapshot?: GuildSnapshot | null): Map<string, string> {
  if (snapshot && snapshotAssignmentCache.has(snapshot)) {
    return snapshotAssignmentCache.get(snapshot)!;
  }
  const roots = collectCanonicalHostProjects(snapshot).map((p) => p.projectRoot);
  const assigned = new Map<string, string>();
  const usedPartyKeys = new Set<string>();
  const totalParties = PARTY_KEY_ORDER.length;

  for (const root of roots) {
    const baseIdx = hashProjectSeed(root.toLowerCase()) % totalParties;
    let chosenKey = PARTY_KEY_ORDER[baseIdx];
    for (let step = 0; step < totalParties; step++) {
      const candidate = PARTY_KEY_ORDER[(baseIdx + step) % totalParties];
      if (!usedPartyKeys.has(candidate)) {
        chosenKey = candidate;
        break;
      }
    }
    usedPartyKeys.add(chosenKey);
    assigned.set(root, chosenKey);
  }
  if (snapshot) snapshotAssignmentCache.set(snapshot, assigned);
  return assigned;
}

export type HeraldryTargetInput =
  | string
  | CharacterState
  | WorkshopRoomState
  | {
      projectId?: string;
      projectName?: string;
      roomId?: string;
      locationDirectory?: string;
      parentProjectDirectory?: string | null;
      isWorktree?: boolean;
    };

export function resolveProjectHeraldry(
  target: HeraldryTargetInput | null | undefined,
  snapshot?: GuildSnapshot | null,
): ProjectHeraldryDescriptor {
  let effectiveTarget = target;
  if (
    effectiveTarget &&
    typeof effectiveTarget === "object" &&
    "parentId" in effectiveTarget &&
    effectiveTarget.parentId &&
    snapshot?.characters?.[effectiveTarget.parentId] &&
    effectiveTarget.roomId === snapshot.characters[effectiveTarget.parentId].roomId
  ) {
    effectiveTarget = snapshot.characters[effectiveTarget.parentId];
  }

  let rawDir = "/guild";
  let explicitName: string | undefined;
  let parentDir: string | null | undefined;
  let explicitWorktree: boolean | undefined;

  if (typeof effectiveTarget === "string") {
    rawDir = effectiveTarget || "/guild";
  } else if (effectiveTarget && typeof effectiveTarget === "object") {
    const roomFromSnap =
      "roomId" in effectiveTarget && effectiveTarget.roomId && snapshot?.rooms?.[effectiveTarget.roomId]
        ? snapshot.rooms[effectiveTarget.roomId]
        : undefined;
    rawDir =
      effectiveTarget.locationDirectory ||
      effectiveTarget.roomId ||
      roomFromSnap?.locationDirectory ||
      effectiveTarget.projectId ||
      "/guild";
    parentDir =
      ("parentProjectDirectory" in effectiveTarget
        ? effectiveTarget.parentProjectDirectory
        : undefined) ?? roomFromSnap?.parentProjectDirectory;
    explicitWorktree =
      ("isWorktree" in effectiveTarget ? effectiveTarget.isWorktree : undefined) ??
      roomFromSnap?.isWorktree;
    const primaryRoom =
      parentDir && snapshot?.rooms?.[normalizeRoomDirectory(parentDir)]
        ? snapshot.rooms[normalizeRoomDirectory(parentDir)]
        : roomFromSnap;
    explicitName =
      ("projectName" in effectiveTarget && effectiveTarget.projectName
        ? effectiveTarget.projectName
        : undefined) ??
      (primaryRoom && !primaryRoom.isWorktree ? primaryRoom.projectName : undefined) ??
      roomFromSnap?.projectName;
  }

  const { projectRoot, isWorktree } = resolveRoomCanonicalProjectRoot({
    roomId: rawDir,
    locationDirectory: rawDir,
    parentProjectDirectory: parentDir,
    isWorktree: explicitWorktree,
  });

  const rootRoom = snapshot?.rooms?.[projectRoot];
  const projectName =
    (rootRoom?.projectName && !rootRoom.isWorktree ? rootRoom.projectName : undefined) ||
    explicitName ||
    projectRoot.split("/").filter(Boolean).pop() ||
    "guild";

  const assignmentMap = getOrBuildPartyAssignmentMap(snapshot);
  const partyKey =
    assignmentMap.get(projectRoot) ??
    PARTY_KEY_ORDER[hashProjectSeed(projectRoot.toLowerCase()) % PARTY_KEY_ORDER.length];
  const party = CANONICAL_PARTY_ROSTERS[partyKey] ?? CANONICAL_PARTY_ROSTERS["01"];

  return Object.freeze({
    projectId: projectRoot,
    projectName,
    shortTag: deriveProjectShortTag(projectName),
    crestIcon: PARTY_CREST_ICONS[partyKey] ?? "🛡️",
    partyKey,
    partyName: party.name,
    primaryHex: party.primary,
    secondaryHex: party.secondary,
    accentHex: party.accent,
    auraHex: party.aura,
    textHex: party.textCol,
    isWorktree,
    worktreeName: isWorktree ? extractWorktreeBranchName(rawDir) : null,
  });
}

export interface CharacterWorldFocusState {
  readonly isWorldFocused: boolean;
  readonly isFocusedMember: boolean;
  readonly isDimmed: boolean;
  readonly focusedProjectId: string | null;
  readonly heraldry: ProjectHeraldryDescriptor;
}

export function resolveCharacterWorldFocus(
  target: HeraldryTargetInput | null | undefined,
  snapshot?: GuildSnapshot | null,
  selectedProjectId?: string | null,
): CharacterWorldFocusState {
  const heraldry = resolveProjectHeraldry(target, snapshot);
  const rawFocus = selectedProjectId?.trim() || null;
  if (!rawFocus) {
    return Object.freeze({
      isWorldFocused: false,
      isFocusedMember: false,
      isDimmed: false,
      focusedProjectId: null,
      heraldry,
    });
  }
  const focusHeraldry = resolveProjectHeraldry(rawFocus, snapshot);
  const isFocusedMember =
    heraldry.projectId.toLowerCase() === focusHeraldry.projectId.toLowerCase() ||
    heraldry.projectName.toLowerCase() === focusHeraldry.projectName.toLowerCase();
  return Object.freeze({
    isWorldFocused: true,
    isFocusedMember,
    isDimmed: !isFocusedMember,
    focusedProjectId: focusHeraldry.projectId,
    heraldry,
  });
}

export function listHostProjectHeraldries(
  snapshot?: GuildSnapshot | null,
): ProjectHeraldryDescriptor[] {
  const seen = new Set<string>();
  const result: ProjectHeraldryDescriptor[] = [];
  for (const p of collectCanonicalHostProjects(snapshot)) {
    const h = resolveProjectHeraldry(
      { roomId: p.projectRoot, locationDirectory: p.projectRoot, projectName: p.projectName },
      snapshot,
    );
    const key = h.projectId.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(h);
    }
  }
  return result;
}

export function selectVisibleHostCharacters(
  snapshot: GuildSnapshot,
  rosterMode: ProjectRosterMode = "active-squads",
  selectedRoomId?: string | null,
  selectedProjectId?: string | null,
  options?: { readonly strictWorldScope?: boolean },
): CharacterState[] {
  const allChars = Object.values(snapshot.characters || {});
  const rawFocus = selectedProjectId?.trim() || selectedRoomId?.trim() || null;
  const focusRoot = rawFocus
    ? resolveProjectHeraldry(rawFocus, snapshot).projectId.toLowerCase()
    : null;
  const scopedChars =
    options?.strictWorldScope && focusRoot
      ? allChars.filter((c) => resolveProjectHeraldry(c, snapshot).projectId.toLowerCase() === focusRoot)
      : allChars;
  if (options?.strictWorldScope && focusRoot && scopedChars.length === 0) return [];

  const sortByActivity = (a: CharacterState, b: CharacterState): number => {
    if (focusRoot) {
      const aFocus = resolveProjectHeraldry(a, snapshot).projectId.toLowerCase() === focusRoot ? 1 : 0;
      const bFocus = resolveProjectHeraldry(b, snapshot).projectId.toLowerCase() === focusRoot ? 1 : 0;
      if (aFocus !== bFocus) return bFocus - aFocus;
    }
    const aGate = isCharacterWaitingAtGate(a) ? 1 : 0;
    const bGate = isCharacterWaitingAtGate(b) ? 1 : 0;
    if (aGate !== bGate) return bGate - aGate;
    const aWorking = a.lifecycleState !== "RestingInLounge" && a.lifecycleState !== "Archived" ? 1 : 0;
    const bWorking = b.lifecycleState !== "RestingInLounge" && b.lifecycleState !== "Archived" ? 1 : 0;
    if (aWorking !== bWorking) return bWorking - aWorking;
    const aOpen = isCharacterActivelyOpen(a) ? 1 : 0;
    const bOpen = isCharacterActivelyOpen(b) ? 1 : 0;
    return aOpen !== bOpen ? bOpen - aOpen : (b.lastActivityAtMs || 0) - (a.lastActivityAtMs || 0);
  };

  if (rosterMode === "full-lineage") {
    return [...scopedChars].sort(sortByActivity).slice(0, 60);
  }

  const byProjectRoot = new Map<string, CharacterState[]>();
  for (const ch of scopedChars) {
    if ((ch.lifecycleState === "Archived" && !hasCharacterUnviewedResult(ch)) || isSubagentArchivedOrUnneeded(ch, snapshot.characters)) continue;
    const room = snapshot.rooms?.[ch.roomId];
    const { projectRoot } = resolveRoomCanonicalProjectRoot({
      roomId: ch.roomId || ch.locationDirectory,
      locationDirectory: ch.locationDirectory,
      parentProjectDirectory: room?.parentProjectDirectory,
      isWorktree: room?.isWorktree,
    });
    const list = byProjectRoot.get(projectRoot) ?? [];
    list.push(ch);
    byProjectRoot.set(projectRoot, list);
  }

  const activeCombined: CharacterState[] = [];
  const idleProjectLeads: CharacterState[] = [];
  for (const groupChars of byProjectRoot.values()) {
    groupChars.sort(sortByActivity);
    const openInProject = groupChars.filter(isCharacterActivelyOpen);
    if (openInProject.length > 0) {
      activeCombined.push(...openInProject);
    } else {
      const mostRecentRoot = groupChars.find((c) => !c.parentId);
      if (mostRecentRoot) idleProjectLeads.push(mostRecentRoot);
    }
  }

  idleProjectLeads.sort(sortByActivity);
  const combined = [...activeCombined, ...idleProjectLeads].sort(sortByActivity);
  if (combined.length > 0) return combined.slice(0, Math.max(16, activeCombined.length + idleProjectLeads.length));

  const fallbackSorted = [...scopedChars].sort(sortByActivity);
  const mostRecentRoot = fallbackSorted.find((c) => !c.parentId);
  return mostRecentRoot ? [mostRecentRoot] : fallbackSorted.slice(0, 1);
}
