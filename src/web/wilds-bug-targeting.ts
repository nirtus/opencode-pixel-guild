import {
  classifyCharacterWorkflowIntent, deriveBugMonsterEncounter, deriveBugMonsterTitle, evaluateRecentToolHealth,
  isCharacterActivelyFixingBug, isCharacterExploringOrGatheringInfo, isExplorationAgentClass, isShellFailureOutput,
} from "../encounter/index.ts";
import { anchorWorldPoint } from "../scene/index.ts";
import { resolveProjectHeraldry, seedProjectWorldVisuals } from "../spatial/index.ts";
import type { DirectionalTurnaround } from "../sprites/index.ts";
import type { CharacterState } from "../types/domain.ts";
import { MONSTER_SETS } from "./asset-manifests.ts";
import { clientState, getActiveRoom, getSelectedProjectRoom, getVisibleProjectCharacters, isCharacterWaitingAtGate } from "./client-state.ts";
import { isClientGateResolved } from "./quest-gate-card.ts";
import { allocateStationPerimeterSlot, buildCombatLairPerimeterSlots, LAIR_POSITIONS } from "./station-geometry-catalog.ts";

export { buildCombatLairPerimeterSlots, LAIR_POSITIONS };

export interface NamedWildernessBug {
  id: string; ownerSessionId: string | null; assignedSessionIds: ReadonlyArray<string>;
  projectId: string; lairIndex: number; bugName: string; monsterName: string;
  role: string; tier: number; file: string; scale: number; aura: string;
  x: number; y: number; inCombat: boolean; discovered: boolean; hpPct: number;
}

function normalizeBugTitleKey(raw?: string | null): string {
  return (raw ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function hasRunningNonQuestionTool(c: CharacterState): boolean {
  const rawCapTool = (c.activeCapability?.toolName || c.activeCapability?.displayName || c.activeCapability?.capabilityId || "")
    .replace(/^tool:/i, "").toLowerCase();
  return (
    Boolean(rawCapTool && rawCapTool !== "question") ||
    Boolean((c.recentTools || []).some((rt) => rt.status === "running" && (rt.toolName || "").toLowerCase() !== "question"))
  );
}

function isWalkerEngagedInWildsCombat(sessionId: string): boolean {
  const w = clientState.characterWalkers.get(sessionId);
  return Boolean(w && !w.despawnCompleted && (w.resolvedSlot?.station === "Combat" || w.slotQueue?.some((s) => s.station === "Combat")));
}

function isCharacterInCombatStation(c: CharacterState, snapshot = clientState.currentSnapshot): boolean {
  if (
    isExplorationAgentClass(c.agentClass) || c.lifecycleState === "RestingInLounge" || c.lifecycleState === "Archived" ||
    c.lifecycleState === "ReportingScroll" || (c.isOpenInOpenCode === false && c.lifecycleState !== "WorkingAtStation" && !c.activeCapability) ||
    isCharacterWaitingAtGate(c)
  ) {
    return false;
  }
  const walkerInCombat = isWalkerEngagedInWildsCombat(c.sessionId);
  if (!walkerInCombat && !isCharacterActivelyFixingBug(c)) return false;
  const hasRunningTool = hasRunningNonQuestionTool(c);
  if (c.lifecycleState === "Entering" && !hasRunningTool && !c.activeWorkstation && !walkerInCombat) return false;
  const hasActiveChildSubagent = Boolean(
    (c.childSessionIds || []).some((cid) => {
      const child = snapshot?.characters?.[cid];
      return child && child.lifecycleState !== "RestingInLounge" && child.lifecycleState !== "Archived";
    }),
  );
  return !(hasActiveChildSubagent && !hasRunningTool);
}

function resolveCharacterFailureSeverity(
  c: CharacterState,
  hasNonQuestionGate: boolean,
): { tier: 1 | 2 | 3 | 4; hasExplicitObstacle: boolean; fallbackHint: string } {
  let shellFailures = 0;
  let toolErrors = 0;
  let fallbackHint = c.errorState?.message ?? "";
  for (const t of c.recentTools ?? []) {
    const norm = (t.toolName ?? "").trim().replace(/^tool:/i, "").toLowerCase();
    if (/^(read|grep|glob|list|ls|lsp|codesearch|webfetch|websearch|fetch|todoread|list_mcp_resources|read_mcp_resource|question)$/.test(norm)) continue;
    if (/^(bash|shell|terminal|test)$/.test(norm) && isShellFailureOutput(t.outputPreview)) {
      shellFailures += 1;
      if (!fallbackHint && t.outputPreview) fallbackHint = t.outputPreview;
    } else if (t.status === "error") {
      toolErrors += 1;
      if (!fallbackHint && (t.outputPreview || t.inputPreview)) fallbackHint = t.outputPreview || t.inputPreview || "";
    }
  }
  const hasExplicitObstacle = hasNonQuestionGate || shellFailures > 0 || toolErrors > 0 || Boolean(c.errorState);
  const tier: 1 | 2 | 3 | 4 = hasNonQuestionGate ? 4 : shellFailures >= 2 ? 3 : shellFailures === 1 || toolErrors > 0 || Boolean(c.errorState) ? 2 : 1;
  return { tier, hasExplicitObstacle, fallbackHint };
}

let cachedBugMonstersSnapshotRef: unknown = null;
let cachedBugMonstersKey = "";
let cachedBugMonstersResult: NamedWildernessBug[] = [];
const stickyLairByBugId = new Map<string, number>();

function assignStickyLairPositions(bugs: NamedWildernessBug[]): void {
  const activeIds = new Set(bugs.map((b) => b.id));
  for (const existingId of stickyLairByBugId.keys()) {
    if (!activeIds.has(existingId)) stickyLairByBugId.delete(existingId);
  }
  const usedLairs = new Set<number>();
  const unassigned: NamedWildernessBug[] = [];
  for (const bug of bugs) {
    const saved = stickyLairByBugId.get(bug.id);
    if (saved !== undefined && saved >= 0 && saved < LAIR_POSITIONS.length && !usedLairs.has(saved)) {
      bug.lairIndex = saved;
      usedLairs.add(saved);
    } else {
      unassigned.push(bug);
    }
  }
  for (const bug of unassigned) {
    let chosen = 0;
    for (let idx = 0; idx < LAIR_POSITIONS.length; idx++) {
      if (!usedLairs.has(idx)) { chosen = idx; break; }
    }
    usedLairs.add(chosen);
    stickyLairByBugId.set(bug.id, chosen);
    bug.lairIndex = chosen;
  }
  for (const bug of bugs) {
    const pos = LAIR_POSITIONS[bug.lairIndex % LAIR_POSITIONS.length];
    bug.x = pos.x;
    bug.y = pos.y;
  }
}

export function deriveProjectBugMonsters(): NamedWildernessBug[] {
  const snap = clientState.currentSnapshot;
  const activeRoom = getActiveRoom();
  const activeProjId = activeRoom?.projectId || activeRoom?.locationDirectory || clientState.selectedProjectId || "/guild";
  const visibleChars = getVisibleProjectCharacters().filter((c) => c.lifecycleState !== "RestingInLounge" && c.lifecycleState !== "Archived");
  const nonQuestionGates = Object.values(snap.questGates || {}).filter(
    (g) => g.kind !== "question" && !isClientGateResolved(g.gateId, g.sessionId, g.reason || g.title),
  );
  const gateCount = nonQuestionGates.length;
  const charHealthSig = visibleChars
    .map((c) => `${c.sessionId}:${c.lifecycleState}:${c.title ?? ""}:${c.activeWorkstation ?? ""}:${c.activeCapability?.displayName ?? ""}:${c.errorState?.message ?? ""}:${c.recentTools?.[0]?.callId ?? ""}:${c.recentTools?.[0]?.status ?? ""}:${isWalkerEngagedInWildsCombat(c.sessionId) ? 1 : 0}`)
    .join("|");
  const scopeMode = clientState.isAllWorldsFocused ? "all" : "scoped";
  const memoKey = `${snap.version}:${scopeMode}:${activeProjId}:${clientState.selectedRoomId || ""}:${clientState.rosterMode}:${gateCount}:${activeRoom?.taskProgress?.resolvedTasks ?? 0}/${activeRoom?.taskProgress?.totalTasks ?? 0}:${charHealthSig}`;
  if (cachedBugMonstersSnapshotRef === snap && cachedBugMonstersKey === memoKey) return cachedBugMonstersResult;

  const projectSeed = seedProjectWorldVisuals(activeProjId);
  const currentMonsterSet = projectSeed.monsterSetKey || "01";
  const monsterSet = MONSTER_SETS[currentMonsterSet] || MONSTER_SETS["01"];

  const participants: Array<{
    char: CharacterState; isFixing: boolean; hasGate: boolean; hasError: boolean;
    tier: 1 | 2 | 3 | 4; hasExplicitObstacle: boolean; fallbackHint: string;
  }> = [];

  for (const c of visibleChars) {
    const room = snap.rooms?.[c.roomId];
    const roomDone = Boolean(room?.taskProgress && room.taskProgress.totalTasks > 0 && room.taskProgress.resolvedTasks >= room.taskProgress.totalTasks);
    const health = evaluateRecentToolHealth(c.recentTools);
    const hasGate = nonQuestionGates.some((g) => g.sessionId === c.sessionId);
    const hasError = (!health.hasPassingShellRun && health.hasUnresolvedFailure) || Boolean(c.errorState);
    const hasLatestActiveError = c.recentTools?.[0]?.status === "error" || Boolean(c.errorState);
    const hasOngoingDebugFix =
      !health.hasPassingShellRun && !isCharacterExploringOrGatheringInfo(c) && classifyCharacterWorkflowIntent(c) === "debugging-hunt" &&
      (c.recentTools ?? []).some((rt) => /^(edit|write|patch|apply_patch|multiedit|notebookedit|bash|shell|terminal|test|hunt)$/i.test((rt.toolName ?? "").trim().replace(/^tool:/i, "")));
    const isFixing = !health.hasPassingShellRun && isCharacterInCombatStation(c, snap);
    if (roomDone && !isFixing && !hasOngoingDebugFix && !hasError && !hasLatestActiveError && !hasGate) continue;
    if (!isFixing && !hasOngoingDebugFix && !hasGate && !hasError) continue;

    const { tier, hasExplicitObstacle, fallbackHint } = resolveCharacterFailureSeverity(c, hasGate);
    participants.push({ char: c, isFixing, hasGate, hasError, tier, hasExplicitObstacle, fallbackHint });
  }

  participants.sort((a, b) => {
    const aIsSub = Boolean(a.char.parentId || a.char.parentSessionId || a.char.role === "Squad Subagent");
    const bIsSub = Boolean(b.char.parentId || b.char.parentSessionId || b.char.role === "Squad Subagent");
    if (aIsSub !== bIsSub) return aIsSub ? 1 : -1;
    if (a.isFixing !== b.isFixing) return a.isFixing ? -1 : 1;
    return 0;
  });

  const bugs: NamedWildernessBug[] = [];
  const participantMetaByBugId = new Map<string, { charMonsterSet: typeof monsterSet; hasExplicitObstacle: boolean; tier: number }>();

  for (const entry of participants) {
    const { char: ch, isFixing, tier, hasExplicitObstacle, fallbackHint } = entry;
    const parentId = ch.parentId || ch.parentSessionId || null;

    if (parentId) {
      const parentBug = bugs.find((b) => b.ownerSessionId === parentId || b.assignedSessionIds.includes(parentId));
      if (parentBug) {
        const parentChar = snap.characters?.[parentId];
        const sameQuestTitle = !ch.title || !parentChar?.title || normalizeBugTitleKey(ch.title) === normalizeBugTitleKey(parentChar.title);
        if (sameQuestTitle || bugs.length >= LAIR_POSITIONS.length) {
          if (!parentBug.assignedSessionIds.includes(ch.sessionId)) parentBug.assignedSessionIds = [...parentBug.assignedSessionIds, ch.sessionId];
          if (isFixing) { parentBug.inCombat = true; parentBug.hpPct = 0.48; }
          continue;
        }
      }
    }

    if (bugs.length >= LAIR_POSITIONS.length) {
      const heraldry = resolveProjectHeraldry(ch, snap);
      const fallbackBug = bugs.find((b) => b.projectId === heraldry.projectId) ?? bugs[0];
      if (fallbackBug) {
        if (!fallbackBug.assignedSessionIds.includes(ch.sessionId)) fallbackBug.assignedSessionIds = [...fallbackBug.assignedSessionIds, ch.sessionId];
        if (isFixing) { fallbackBug.inCombat = true; fallbackBug.hpPct = 0.48; }
      }
      continue;
    }

    const lairIndex = bugs.length;
    const pos = LAIR_POSITIONS[lairIndex % LAIR_POSITIONS.length];
    const heraldry = resolveProjectHeraldry(ch, snap);
    const charMonsterSet = MONSTER_SETS[seedProjectWorldVisuals(heraldry.projectId || activeProjId).monsterSetKey || "01"] || monsterSet;
    const mDef = hasExplicitObstacle
      ? charMonsterSet[(lairIndex + Math.max(0, tier - 1)) % charMonsterSet.length] || charMonsterSet[0]
      : charMonsterSet[(lairIndex + 1) % charMonsterSet.length] || charMonsterSet[0];
    const titleWords = (ch.title || "").replace(/[^a-zA-Z0-9 _-]/g, "").trim();
    const rawLabel = titleWords ? (titleWords.length > 20 ? `${titleWords.slice(0, 19)}…` : titleWords) : deriveBugMonsterTitle(tier, fallbackHint);
    const cleanTitle = rawLabel.length > 22 ? `${rawLabel.slice(0, 21)}…` : rawLabel;
    const bugName = cleanTitle.startsWith("[") ? cleanTitle : `[${heraldry.shortTag}] ${cleanTitle || "Unhandled Defect"}`;
    const bugId = `debug-bug:${ch.sessionId}`;
    participantMetaByBugId.set(bugId, { charMonsterSet, hasExplicitObstacle, tier });

    bugs.push({
      id: bugId, ownerSessionId: ch.sessionId, assignedSessionIds: [ch.sessionId],
      projectId: heraldry.projectId, lairIndex, bugName, monsterName: mDef.name, role: mDef.role,
      tier: mDef.tier, file: mDef.file, scale: mDef.scale, aura: heraldry.accentHex || mDef.aura,
      x: pos.x, y: pos.y, inCombat: isFixing, discovered: true, hpPct: isFixing ? 0.48 : 0.88,
    });
  }

  if (bugs.length === 0 && nonQuestionGates.length > 0) {
    const visibleIds = new Set(visibleChars.map((c) => c.sessionId));
    const activeTargetProjId = resolveProjectHeraldry(activeRoom ?? activeProjId, snap).projectId.toLowerCase();
    const hasAnyRoomsOrChars = Object.keys(snap.characters || {}).length > 0 || Object.keys(snap.rooms || {}).length > 0;
    const roomGates = nonQuestionGates.filter((g) => {
      if (clientState.isAllWorldsFocused || !hasAnyRoomsOrChars || visibleIds.has(g.sessionId)) return true;
      const gateChar = snap.characters?.[g.sessionId];
      if (gateChar) return resolveProjectHeraldry(gateChar, snap).projectId.toLowerCase() === activeTargetProjId;
      return Object.values(snap.rooms || {}).some(
        (r) => resolveProjectHeraldry(r, snap).projectId.toLowerCase() === activeTargetProjId && (r.characterIds?.includes(g.sessionId) || r.activeSessionIds?.includes(g.sessionId)),
      );
    });
    const allowedGateIds = new Set(roomGates.map((g) => g.gateId));
    const projectScopedSnapshot = {
      ...snap,
      characters: Object.fromEntries(visibleChars.map((c) => [c.sessionId, c])),
      questGates: Object.fromEntries(Object.entries(snap.questGates || {}).filter(([k, g]) => allowedGateIds.has(g.gateId || k))),
    };
    const encounters = deriveBugMonsterEncounter(projectScopedSnapshot, currentMonsterSet).filter((m) => m.status !== "defeated");
    for (let i = 0; i < encounters.length && bugs.length < LAIR_POSITIONS.length; i++) {
      const enc = encounters[i];
      const gateOwnerId = roomGates[i]?.sessionId ?? enc.combatTargetSessionId ?? null;
      const sourceChar = (gateOwnerId ? snap.characters?.[gateOwnerId] : undefined) ?? visibleChars[0];
      const heraldry = resolveProjectHeraldry(sourceChar ?? activeRoom, snap);
      const mDef = monsterSet[Math.max(0, Math.min(3, enc.tier - 1))] || monsterSet[0];
      const lairIndex = bugs.length;
      const pos = LAIR_POSITIONS[lairIndex];
      const rawBugTitle = enc.bugTitle || `${mDef.role} Anomaly`;
      const cleanTitle = rawBugTitle.length > 22 ? `${rawBugTitle.slice(0, 21)}…` : rawBugTitle;
      const shortBugName = cleanTitle.startsWith("[") ? cleanTitle : `[${heraldry.shortTag}] ${cleanTitle}`;
      bugs.push({
        id: enc.monsterId || `bug-${i}`, ownerSessionId: gateOwnerId, assignedSessionIds: gateOwnerId ? [gateOwnerId] : [],
        projectId: heraldry.projectId, lairIndex, bugName: shortBugName, monsterName: mDef.name, role: mDef.role,
        tier: mDef.tier, file: mDef.file, scale: mDef.scale, aura: heraldry.accentHex || mDef.aura,
        x: pos.x, y: pos.y, inCombat: false, discovered: true, hpPct: 0.9,
      });
    }
  }

  assignStickyLairPositions(bugs);
  for (const bug of bugs) {
    const meta = participantMetaByBugId.get(bug.id);
    if (!meta) continue;
    const mDef = meta.hasExplicitObstacle
      ? meta.charMonsterSet[(bug.lairIndex + Math.max(0, meta.tier - 1)) % meta.charMonsterSet.length] || meta.charMonsterSet[0]
      : meta.charMonsterSet[(bug.lairIndex + 1) % meta.charMonsterSet.length] || meta.charMonsterSet[0];
    bug.monsterName = mDef.name; bug.role = mDef.role; bug.tier = mDef.tier; bug.file = mDef.file; bug.scale = mDef.scale;
  }

  cachedBugMonstersSnapshotRef = snap;
  cachedBugMonstersKey = memoKey;
  cachedBugMonstersResult = bugs;
  return bugs;
}

export function deriveScopedGameMasterBugMonsters(): NamedWildernessBug[] {
  const allBugs = deriveProjectBugMonsters();
  const selectedRoom = getSelectedProjectRoom();
  const isSingleWorld = !clientState.isAllWorldsFocused && Boolean(clientState.selectedProjectId || clientState.selectedRoomId || selectedRoom);
  const focusProjectId = isSingleWorld ? (clientState.selectedProjectId || selectedRoom?.projectId || selectedRoom?.locationDirectory || clientState.selectedRoomId) : null;
  if (!isSingleWorld || !focusProjectId) return allBugs;
  const focusLower = resolveProjectHeraldry(focusProjectId, clientState.currentSnapshot).projectId.toLowerCase();
  return allBugs.filter((b) => (b.projectId || "").toLowerCase() === focusLower);
}

export function resolveTargetBugMonsterForCharacter(
  c: CharacterState,
  bugs: ReadonlyArray<NamedWildernessBug> = deriveProjectBugMonsters(),
): NamedWildernessBug | null {
  if (bugs.length === 0) return null;
  const direct = bugs.find((b) => b.ownerSessionId === c.sessionId || b.assignedSessionIds.includes(c.sessionId) || b.id === `debug-bug:${c.sessionId}`);
  if (direct) return direct;
  const parentId = c.parentId || c.parentSessionId || null;
  if (parentId) {
    const parentMatch = bugs.find((b) => b.ownerSessionId === parentId || b.assignedSessionIds.includes(parentId) || b.id === `debug-bug:${parentId}`);
    if (parentMatch) return parentMatch;
  }
  if (c.childSessionIds && c.childSessionIds.length > 0) {
    const childMatch = bugs.find((b) => c.childSessionIds!.some((cid) => b.ownerSessionId === cid || b.assignedSessionIds.includes(cid)));
    if (childMatch) return childMatch;
  }
  const heraldry = resolveProjectHeraldry(c, clientState.currentSnapshot);
  return bugs.find((b) => b.projectId === heraldry.projectId) ?? bugs[0];
}

export const COMBAT_MELEE_PROXIMITY_PX = 96;
const COMBAT_SLOT_ARRIVAL_RADIUS_PX = 16;

function isWalkerSettledInCombatNearBug(
  walker: { currentX: number; currentY: number; targetX: number; targetY: number; isWalking?: boolean; despawnCompleted?: boolean; resolvedSlot?: { station?: string; isActing?: boolean } | null } | undefined,
  bug: NamedWildernessBug,
): boolean {
  if (!walker || walker.isWalking || walker.despawnCompleted || walker.currentX < 800) return false;
  const rSlot = walker.resolvedSlot;
  if (!rSlot || !rSlot.isActing || rSlot.station !== "Combat") return false;
  if (Math.hypot(walker.targetX - walker.currentX, walker.targetY - walker.currentY) > COMBAT_SLOT_ARRIVAL_RADIUS_PX) return false;
  return Math.hypot(walker.currentX - (800 + bug.x), walker.currentY - bug.y) <= COMBAT_MELEE_PROXIMITY_PX;
}

export function isCharacterPhysicallyFightingBug(
  sessionId: string | undefined,
  slot: { x?: number; y?: number; station: string; isActing: boolean } | null | undefined,
  isWalking: boolean,
  bugs: ReadonlyArray<NamedWildernessBug> = deriveProjectBugMonsters(),
): boolean {
  if (isWalking || !slot || !slot.isActing || slot.station !== "Combat") return false;
  if (!sessionId || !clientState.characterWalkers.has(sessionId)) {
    return typeof slot.x === "number" ? slot.x >= 800 : bugs.length > 0;
  }
  return bugs.some((b) => isWalkerSettledInCombatNearBug(clientState.characterWalkers.get(sessionId), b));
}

export function isBugMonsterPhysicallyEngaged(bug: NamedWildernessBug): boolean {
  if (!bug.inCombat || clientState.characterWalkers.size === 0) return false;
  for (const walker of clientState.characterWalkers.values()) {
    if (isWalkerSettledInCombatNearBug(walker, bug)) return true;
  }
  return false;
}

export function hasHeroFightingMonster(bugs: ReadonlyArray<NamedWildernessBug> = deriveProjectBugMonsters()): boolean {
  for (const c of getVisibleProjectCharacters()) {
    const walker = clientState.characterWalkers.get(c.sessionId);
    if (walker && walker.resolvedSlot) {
      const isActiveOrWalkingBack = (c.lifecycleState !== "RestingInLounge" && c.lifecycleState !== "Archived") || walker.isWalking;
      if (!walker.despawnCompleted && isActiveOrWalkingBack && walker.currentX >= 760) return true;
      continue;
    }
    if (c.lifecycleState === "RestingInLounge" || c.lifecycleState === "Archived" || !bugs.some((b) => b.inCombat)) continue;
    const isSub = Boolean(c.parentId || c.parentSessionId || c.role === "Squad Subagent");
    if (!isSub && c.lifecycleState !== "Entering" && isCharacterInCombatStation(c)) return true;
  }
  return false;
}

export function resolveHeroWorldCanvasPosition(
  walker: { currentX: number; currentY: number; resolvedSlot?: { station?: string } | null },
  cw: number, ch: number, wildsW: number, bugs: ReadonlyArray<NamedWildernessBug>,
): { x: number; y: number } {
  const basePos = anchorWorldPoint(walker.currentX, walker.currentY, cw, ch, wildsW);
  if (walker.currentX < 800 || walker.resolvedSlot?.station !== "Combat" || wildsW >= 800) return basePos;
  const nearbyBug = bugs.find((b) => Math.hypot(walker.currentX - (800 + b.x), walker.currentY - b.y) <= COMBAT_MELEE_PROXIMITY_PX);
  if (!nearbyBug) return basePos;
  const dist = Math.hypot(walker.currentX - (800 + nearbyBug.x), walker.currentY - nearbyBug.y);
  const blend = Math.max(0, Math.min(1, (COMBAT_MELEE_PROXIMITY_PX - dist) / 40));
  const bugPos = anchorWorldPoint(800 + nearbyBug.x, nearbyBug.y, cw, ch, wildsW);
  const standoffX = bugPos.x + (walker.currentX - (800 + nearbyBug.x));
  const standoffY = bugPos.y + (walker.currentY - nearbyBug.y);
  return { x: basePos.x + (standoffX - basePos.x) * blend, y: basePos.y + (standoffY - basePos.y) * blend };
}

export function allocateCombatMonsterPerimeterSlot(input: {
  character: CharacterState; stationOccupantCounts: Map<string, number>;
  walker?: { currentX: number; currentY: number; assignedStation?: string; assignedSlotIdx?: number };
  createdWalker?: boolean; allWalkers?: ReadonlyMap<string, { currentX: number; currentY: number; assignedStation?: string; assignedSlotIdx?: number }>;
  activeCharacters?: Readonly<Record<string, CharacterState>>;
}): { x: number; y: number; facingDirection: DirectionalTurnaround; slotIdx: number; lairIndex: number } {
  const { character, stationOccupantCounts, walker, createdWalker = false, allWalkers, activeCharacters } = input;
  const targetBug = resolveTargetBugMonsterForCharacter(character);
  const lairIndex = targetBug ? targetBug.lairIndex : 0;
  const lairPos = targetBug ? { x: targetBug.x, y: targetBug.y } : LAIR_POSITIONS[0];
  const allocated = allocateStationPerimeterSlot({
    sessionId: character.sessionId, station: "Combat", stationOccupantCounts, walker, createdWalker, allWalkers, activeCharacters,
    customSlots: buildCombatLairPerimeterSlots(lairPos.x, lairPos.y),
    customFocalCenter: { x: 800 + lairPos.x, y: lairPos.y },
    customStationKey: `Combat:${targetBug?.id ?? `lair-${lairIndex}`}`,
  });
  return { ...allocated, lairIndex };
}
