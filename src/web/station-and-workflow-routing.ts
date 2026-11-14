import { classifyCharacterWorkflowIntent, deriveOverheadActionLabel, extractCapabilityToolName, isCharacterActivelyFixingBug, isExplorationAgentClass, resolveCanonicalPreparationStation } from "../encounter/index.ts";
import { isSubagentArchivedOrUnneeded } from "../spatial/index.ts";
import type { DirectionalTurnaround } from "../sprites/index.ts";
import { reconcileCharacterRoleArchetype, resolveGuildRoleArchetype, type CharacterState, type WorkflowIntentKind } from "../types/domain.ts";
import { clientState, hasCharacterUnviewedResult, isCharacterWaitingAtGate } from "./client-state.ts";
import { ASSEMBLY_PACING_SIDES, type AssemblyPacingSide, allocateLoungeSeatSlot, allocateStationPerimeterSlot, LOUNGE_SEAT_SLOTS, PENTAGRAM_CENTER, PREPARATION_STATION_GEOMETRY_CATALOG, resolveInwardStationFacing, resolveLoungeSeatSlot, SOUTH_DOOR_FOYER_WAYPOINT, SOUTH_GUILD_DOOR_ENTRANCE, STATION_BASE_ANCHORS, WILDS_SEARCH_WAYPOINTS } from "./station-geometry-catalog.ts";
import { assignThinkingRoamTarget, resolveReportingScrollSlotOffset } from "./walker-separation.ts";
import { allocateCombatMonsterPerimeterSlot } from "./wilds-bug-targeting.ts";

export { ASSEMBLY_PACING_SIDES, type AssemblyPacingSide, allocateStationPerimeterSlot, LOUNGE_SEAT_SLOTS, PENTAGRAM_CENTER, PREPARATION_STATION_GEOMETRY_CATALOG, resolveInwardStationFacing, resolveLoungeSeatSlot, SOUTH_DOOR_FOYER_WAYPOINT, SOUTH_GUILD_DOOR_ENTRANCE, STATION_BASE_ANCHORS, WILDS_SEARCH_WAYPOINTS };

export interface ResolvedCharacterSlot {
  x: number; y: number;
  station: "Library" | "Spyglass" | "Forge" | "Tinker" | "Armory" | "Enchanter" | "Alchemy" | "Stockpile" | "Assembly" | "Lounge" | "WildsSearch" | "Combat";
  role: "MAGE" | "WARRIOR" | "SCOUT" | "ALCHEMIST" | "CLERIC" | "SAPPER";
  workflowIntent: WorkflowIntentKind; overheadLabel: string;
  facingDirection?: DirectionalTurnaround;
  questMarker?: "?" | "!" | null; carriedCargo?: string | null;
  isActing: boolean; pacingSide?: AssemblyPacingSide;
  timestampMs?: number; sequenceOrder?: number; actionId?: string;
}

export function resolveCharacterRole(c: CharacterState): ResolvedCharacterSlot["role"] {
  if (c.agentClass || c.skillGrimoires?.length || c.distilledSkillHistory?.length || c.title) {
    return reconcileCharacterRoleArchetype(c);
  }
  const roleArch = (c.roleArchetype || "").toUpperCase();
  if (roleArch === "MAGE" || roleArch === "WARRIOR" || roleArch === "SCOUT" || roleArch === "ALCHEMIST" || roleArch === "CLERIC" || roleArch === "SAPPER") return roleArch;
  if (roleArch === "ARTIFICER") return "ALCHEMIST";
  if (roleArch === "DEMOLITIONIST") return "SAPPER";
  return resolveGuildRoleArchetype(c.agentClass);
}

export function resolveCharacterWorkflowIntent(c: CharacterState, hasActiveRoomBug: boolean): WorkflowIntentKind {
  return classifyCharacterWorkflowIntent(c, { hasActiveRoomBug, ignoreStoredIntent: Boolean(hasActiveRoomBug) });
}

function classifyToolCategory(tool: string): string {
  if (!tool) return "";
  if (/(^|[^a-z0-9])skill(s)?($|[^a-z0-9])/.test(tool)) return "skill";
  if (/(^|[^a-z0-9])(subagent|task|batch|todowrite|todoread)($|[^a-z0-9])/.test(tool)) return "subagent";
  if (/(^|[^a-z0-9])(bash|shell|test|build|terminal)($|[^a-z0-9])/.test(tool)) return "shell";
  if (/(^|[^a-z0-9])(edit|write|patch|apply_patch|multiedit|notebookedit)($|[^a-z0-9])/.test(tool)) return "editor";
  if (/(^|[^a-z0-9])(read|glob|grep|list|ls|lsp|codesearch)($|[^a-z0-9])/.test(tool)) return "reader";
  if (/(^|[^a-z0-9])(websearch|webfetch|fetch)($|[^a-z0-9])/.test(tool)) return "web";
  if (/(^|[^a-z0-9])(execute|mcp|plugin)($|[^a-z0-9])/.test(tool)) return "plugin";
  return "tool";
}

export function resolveCharacterOverheadLabel(c: CharacterState, workflowIntent: WorkflowIntentKind, station: ResolvedCharacterSlot["station"], isEquippingAtArmory: boolean): string {
  if (station === "Assembly") return "Thinking...";
  return deriveOverheadActionLabel(c, { workflowIntent, station, isEquippingAtArmory, ignoreStoredLabel: Boolean(isEquippingAtArmory || station === "Combat") });
}

export function resolveToolRecordTargetSlot(c: CharacterState, rec: NonNullable<CharacterState["recentTools"]>[number], stationOccupantCounts: Map<string, number>, hasActiveRoomBug: boolean): ResolvedCharacterSlot {
  const workflowIntent = resolveCharacterWorkflowIntent(c, hasActiveRoomBug);
  const role = resolveCharacterRole(c);
  const rawTool = (rec.toolName || "").replace(/^tool:/i, "").toLowerCase();
  const existingWalker = clientState.characterWalkers.get(c.sessionId);
  const walkerInCombat = Boolean(existingWalker && !existingWalker.despawnCompleted && (existingWalker.resolvedSlot?.station === "Combat" || existingWalker.currentX >= 760));
  const isCombatTool = /edit|write|patch|multiedit|notebookedit|bash|shell|terminal|test|hunt/.test(rawTool) || (walkerInCombat && !/^(skill|skills|subagent|task|batch|todowrite|todoread|question)$/.test(rawTool));
  const station: ResolvedCharacterSlot["station"] =
    hasActiveRoomBug && workflowIntent === "debugging-hunt" && !isExplorationAgentClass(c.agentClass) && isCombatTool
      ? "Combat"
      : resolveCanonicalPreparationStation({ toolName: rawTool, lastToolName: rawTool, workstation: rec.workstation, pluginNamespace: rec.pluginNamespace, workflowIntent, agentClass: c.agentClass });
  const perimSlot = station === "Combat"
    ? allocateCombatMonsterPerimeterSlot({ character: c, stationOccupantCounts, walker: existingWalker, allWalkers: clientState.characterWalkers, activeCharacters: clientState.currentSnapshot.characters })
    : allocateStationPerimeterSlot({ sessionId: `${c.sessionId}:tool:${rec.callId || rec.timestampMs || 0}`, station, stationOccupantCounts, walker: existingWalker, allWalkers: clientState.characterWalkers, activeCharacters: clientState.currentSnapshot.characters });
  const overheadLabel = deriveOverheadActionLabel(
    { ...c, lifecycleState: "WorkingAtStation", activeCapability: { toolName: rawTool, displayName: rawTool } as any, activeWorkstation: rec.workstation },
    { workflowIntent, station, isEquippingAtArmory: false, ignoreStoredLabel: true },
  );
  const recTs = (rec as { startedAtMs?: number }).startedAtMs ?? rec.timestampMs;
  return {
    x: perimSlot.x, y: perimSlot.y, station, role, workflowIntent,
    overheadLabel, facingDirection: perimSlot.facingDirection,
    questMarker: null, carriedCargo: rec.resourceCargo ?? null, isActing: true,
    ...(typeof recTs === "number" && Number.isFinite(recTs) ? { timestampMs: recTs } : {}),
    ...(typeof rec.sequenceOrder === "number" ? { sequenceOrder: rec.sequenceOrder } : {}),
    ...(rec.callId ? { actionId: rec.callId } : {}),
  };
}

export function resolveEffectiveCharacterLifecycleState(c: CharacterState, timestampMs: number): CharacterState["lifecycleState"] {
  if (c.lifecycleState === "Entering" && typeof c.dwellUntilMs === "number") {
    const dwellClockMs = c.dwellUntilMs >= 1_000_000_000_000 && timestampMs < 1_000_000_000_000 ? Date.now() : timestampMs;
    if (dwellClockMs >= c.dwellUntilMs) return c.deferredLifecycleState ?? "Thinking";
  }
  return c.lifecycleState;
}

export function resolveCharacterTargetSlot(
  c: CharacterState,
  loungeSeatIndex: number,
  stationOccupantCounts: Map<string, number>,
  timestampMs: number,
  hasActiveRoomBug: boolean,
): ResolvedCharacterSlot {
  const workflowIntent = resolveCharacterWorkflowIntent(c, hasActiveRoomBug);
  const role = resolveCharacterRole(c);
  const isWaitingAtGate = isCharacterWaitingAtGate(c);
  const questMarker: "?" | "!" | null = isWaitingAtGate
    ? (c.questGate?.marker ?? (c.questGate?.kind === "permission" ? "!" : "?"))
    : null;
  const effectiveLifecycleState = resolveEffectiveCharacterLifecycleState(c, timestampMs);
  if (isSubagentArchivedOrUnneeded(c, clientState.currentSnapshot.characters)) {
    return { x: PENTAGRAM_CENTER.x, y: PENTAGRAM_CENTER.y, station: "Enchanter", role, workflowIntent, overheadLabel: "Despawning", facingDirection: "south", questMarker: null, isActing: true };
  }
  // Completed Squad Subagent carrying a Report Scroll walks back to its parent Guild Adventurer
  if (effectiveLifecycleState === "ReportingScroll") {
    const parentId = c.parentId ?? c.parentSessionId ?? c.reportScroll?.toParentSessionId ?? null;
    const parentWalker = parentId ? clientState.characterWalkers.get(parentId) : undefined;
    const parentChar = parentId ? clientState.currentSnapshot.characters?.[parentId] : undefined;
    let parentBase = STATION_BASE_ANCHORS.Enchanter;
    if (parentWalker) {
      parentBase = { x: parentWalker.currentX, y: parentWalker.currentY };
    } else if (parentChar) {
      const parentStation = resolveCanonicalPreparationStation({
        toolName: extractCapabilityToolName(parentChar.activeCapability),
        lastToolName: parentChar.recentTools?.[0]?.toolName,
        workstation: parentChar.activeWorkstation,
        lastEquippedToolCategory: parentChar.lastEquippedToolCategory,
      });
      if (parentStation in STATION_BASE_ANCHORS) {
        parentBase = STATION_BASE_ANCHORS[parentStation as keyof typeof STATION_BASE_ANCHORS];
      }
    }
    const scrollTarget = resolveReportingScrollSlotOffset(parentBase, parentId, stationOccupantCounts);
    return {
      x: scrollTarget.x, y: scrollTarget.y, station: "Enchanter",
      role, workflowIntent, overheadLabel: "Reporting Scroll", facingDirection: scrollTarget.facingDirection, questMarker: null, isActing: true,
    };
  }

  const existingWalkerForCompact = clientState.characterWalkers.get(c.sessionId);
  const isCompactingAtRest =
    effectiveLifecycleState === "DistillingContextMana" &&
    (c.deferredLifecycleState === "RestingInLounge" || c.activePreparationStation === "Break Lounge" || existingWalkerForCompact?.resolvedSlot?.station === "Lounge");
  if (effectiveLifecycleState === "DistillingContextMana" && existingWalkerForCompact) {
    if (existingWalkerForCompact.assignedStation === "Lounge" && typeof existingWalkerForCompact.assignedSlotIdx === "number") {
      stationOccupantCounts.set("LoungeSeat:" + existingWalkerForCompact.assignedSlotIdx, 1);
    } else if (existingWalkerForCompact.assignedStation && typeof existingWalkerForCompact.assignedSlotIdx === "number") {
      stationOccupantCounts.set(existingWalkerForCompact.assignedStation, Math.max(stationOccupantCounts.get(existingWalkerForCompact.assignedStation) ?? 0, existingWalkerForCompact.assignedSlotIdx + 1));
    }
    return {
      x: existingWalkerForCompact.currentX, y: existingWalkerForCompact.currentY,
      station: existingWalkerForCompact.resolvedSlot?.station ?? (isCompactingAtRest ? "Lounge" : "Enchanter"),
      role, workflowIntent, overheadLabel: "Compacting...",
      facingDirection: existingWalkerForCompact.facingDirection ?? existingWalkerForCompact.resolvedSlot?.facingDirection ?? "south",
      questMarker: null, carriedCargo: c.activeResourceCargo?.kind ?? null, isActing: true,
    };
  }
  const isSubagent = Boolean(c.parentId || c.parentSessionId || c.role === "Squad Subagent");
  const isActivelyWorking =
    !isCompactingAtRest && (isWaitingAtGate || effectiveLifecycleState !== "RestingInLounge") && effectiveLifecycleState !== "Archived" &&
    (isSubagent || c.isOpenInOpenCode !== false || effectiveLifecycleState === "WorkingAtStation" || Boolean(c.activeCapability) || isWaitingAtGate) &&
    (effectiveLifecycleState === "WorkingAtStation" || effectiveLifecycleState === "Thinking" || effectiveLifecycleState === "Entering" ||
      effectiveLifecycleState === "DistillingContextMana" || isWaitingAtGate || Boolean(c.activeCapability));

  if ((!isWaitingAtGate && (!isActivelyWorking || effectiveLifecycleState === "RestingInLounge")) || effectiveLifecycleState === "Archived") {
    const existingWalker = clientState.characterWalkers.get(c.sessionId);
    const lockedInStation = Boolean(
      existingWalker &&
        (existingWalker.isWalking ||
          (existingWalker.slotQueue && existingWalker.slotQueue.length > 0) ||
          (typeof existingWalker.dwellUntilMs === "number" && existingWalker.dwellUntilMs > timestampMs)),
    );
    if (existingWalker && !lockedInStation && existingWalker.assignedStation !== "Lounge") {
      existingWalker.assignedStation = undefined;
      existingWalker.assignedSlotIdx = undefined;
    }
    if (isSubagent) {
      return { x: PENTAGRAM_CENTER.x, y: PENTAGRAM_CENTER.y, station: "Enchanter", role, workflowIntent, overheadLabel: "Despawning", facingDirection: "south", questMarker: null, isActing: true };
    }
    const seat = allocateLoungeSeatSlot(c.sessionId, loungeSeatIndex, stationOccupantCounts, existingWalker, clientState.characterWalkers);
    const unviewedLabel = isCompactingAtRest
      ? "Compacting..."
      : hasCharacterUnviewedResult(c)
        ? (c.turnOutcome === "failed" || c.errorState ? "⚠️ Turn Failed" : c.turnOutcome === "interrupted" ? "⏹ Interrupted" : "✓ Result Ready")
        : effectiveLifecycleState === "Archived" ? "Archived" : "Resting";
    return {
      x: seat.x, y: seat.y, station: "Lounge", role, workflowIntent,
      overheadLabel: unviewedLabel, facingDirection: seat.facingDirection, questMarker: null, isActing: true,
    };
  }

  const rawCapTool = extractCapabilityToolName(c.activeCapability) || (c.activeWorkstation === "Armory Wardrobe" ? "skill" : "");
  const nonQuestionRecent = (c.recentTools || []).find((rt) => (rt.toolName || "").toLowerCase() !== "question");
  const lastTool = ((c as { lastTool?: string }).lastTool || nonQuestionRecent?.toolName || c.lastEquippedToolCategory || "")
    .replace(/^tool:/i, "").toLowerCase();
  const tool = rawCapTool && rawCapTool !== "question" ? rawCapTool : lastTool;
  const toolCategory = classifyToolCategory(tool);

  let walker = clientState.characterWalkers.get(c.sessionId);
  let createdWalker = false;
  if (!walker) {
    walker = {
      currentX: STATION_BASE_ANCHORS.Enchanter.x,
      currentY: STATION_BASE_ANCHORS.Enchanter.y,
      targetX: STATION_BASE_ANCHORS.Enchanter.x,
      targetY: STATION_BASE_ANCHORS.Enchanter.y,
      isWalking: false, facingLeft: false, walkCycle: 0, lastToolCategory: "",
      armoryUntilMs: 0, searchWaypointIdx: loungeSeatIndex, lastArmoryTriggerKey: "",
    };
    clientState.characterWalkers.set(c.sessionId, walker);
    createdWalker = true;
  }

  const isSkillAction = toolCategory === "skill" || c.activeWorkstation === "Armory Wardrobe" || c.activeCapability?.kind === "skill";
  const isLockedInActiveWalk = walker.isWalking && Boolean(walker.resolvedSlot?.isActing) && walker.resolvedSlot?.station !== "Lounge";
  const triggerKey = `${toolCategory || c.lastEquippedToolCategory || ""}:${c.stateEnteredAtMs || 0}:${Boolean(c.equippingAtArmory)}`;
  const compareNowMs = timestampMs < 1_000_000_000_000 && (c.stateEnteredAtMs ?? 0) >= 1_000_000_000_000 ? Date.now() : timestampMs;
  if (c.equippingAtArmory && (isSkillAction || workflowIntent !== "debugging-hunt") && !isLockedInActiveWalk && walker.lastArmoryTriggerKey !== triggerKey) {
    const useEnteredTs = typeof c.stateEnteredAtMs === "number" && c.stateEnteredAtMs > 0 && compareNowMs >= c.stateEnteredAtMs && compareNowMs - c.stateEnteredAtMs < 60_000;
    walker.armoryUntilMs = (useEnteredTs ? c.stateEnteredAtMs! : compareNowMs) + 1450;
    walker.lastArmoryTriggerKey = triggerKey;
  }
  if (toolCategory) walker.lastToolCategory = toolCategory;

  const armoryNowMs = typeof walker.armoryUntilMs === "number" && walker.armoryUntilMs >= 1_000_000_000_000 && timestampMs < 1_000_000_000_000 ? Date.now() : timestampMs;
  const armoryActive = typeof walker.armoryUntilMs === "number" && armoryNowMs < walker.armoryUntilMs;
  const isEquippingAtArmory = !isWaitingAtGate && (isSkillAction || workflowIntent !== "debugging-hunt") && armoryActive;
  let station: ResolvedCharacterSlot["station"] = "Library";

  if (isEquippingAtArmory || (!isWaitingAtGate && isSkillAction)) {
    station = "Armory";
  } else if (isWaitingAtGate) {
    station = resolveCanonicalPreparationStation({
      toolName: tool, lastToolName: lastTool, workstation: c.activeWorkstation || nonQuestionRecent?.workstation,
      lastEquippedToolCategory: c.lastEquippedToolCategory, gateHint: c.questGate?.kind === "permission" ? c.questGate?.title : null,
      pluginNamespace: c.activePluginNamespace,
    });
  } else if (
    workflowIntent === "debugging-hunt" &&
    hasActiveRoomBug &&
    !isExplorationAgentClass(c.agentClass) &&
    (isCharacterActivelyFixingBug(c) || (!walker.despawnCompleted && (walker.resolvedSlot?.station === "Combat" || walker.currentX >= 760)))
  ) {
    station = "Combat";
  } else if (workflowIntent === "debugging-hunt" && !hasActiveRoomBug && !tool && c.activeWorkstation === "Crafting Workbench") {
    station = "WildsSearch";
  } else {
    station = resolveCanonicalPreparationStation({
      toolName: tool, lastToolName: lastTool, workstation: c.activeWorkstation || nonQuestionRecent?.workstation,
      lastEquippedToolCategory: c.lastEquippedToolCategory, pluginNamespace: c.activePluginNamespace,
      workflowIntent, agentClass: c.agentClass,
    });
  }

  const hasRunningTool =
    Boolean(rawCapTool && rawCapTool !== "question") ||
    Boolean((c.recentTools || []).some((rt) => rt.status === "running" && (rt.toolName || "").toLowerCase() !== "question"));
  const ritualEndsAt = c.summoningRitual?.endsAtMs;
  const ritualClockMs =
    typeof ritualEndsAt === "number" && ritualEndsAt >= 1_000_000_000_000 && timestampMs < 1_000_000_000_000 ? Date.now() : timestampMs;
  const isSummoningActive = Boolean(c.summoningRitual?.active) && (typeof ritualEndsAt !== "number" || ritualClockMs < ritualEndsAt);
  const hasActiveChildSubagent = Boolean(
    (c.childSessionIds || []).some((cid) => {
      const child = clientState.currentSnapshot.characters?.[cid];
      return child && child.lifecycleState !== "RestingInLounge" && child.lifecycleState !== "Archived";
    }),
  );
  if (hasActiveChildSubagent && !hasRunningTool && !isWaitingAtGate && !isEquippingAtArmory) station = "Enchanter";
  const isEnteringFoyer =
    !isSubagent && effectiveLifecycleState === "Entering" && !hasRunningTool && !isWaitingAtGate &&
    !isEquippingAtArmory && !isSummoningActive && !hasActiveChildSubagent && !c.activeWorkstation;
  const isThinkingPacing =
    (effectiveLifecycleState === "Thinking" ||
      (effectiveLifecycleState === "WorkingAtStation" && !c.activeWorkstation && !c.activeCapability && !c.activePluginNamespace)) &&
    !hasRunningTool && !isWaitingAtGate &&
    !isEquippingAtArmory && !isSummoningActive && !hasActiveChildSubagent &&
    station !== "Combat" && station !== "WildsSearch";

  if (!isThinkingPacing && !isEnteringFoyer && station !== "Assembly") {
    (walker as { lastNonPacingStation?: string }).lastNonPacingStation = station;
  }

  let resolvedX = 195, resolvedY = 135;
  let resolvedFacing: DirectionalTurnaround = "north";
  let pacingSide: AssemblyPacingSide | undefined;

  if (isEnteringFoyer) {
    walker.assignedStation = undefined; walker.assignedSlotIdx = undefined;
    const foyerOcc = stationOccupantCounts.get("EnteringFoyer") ?? 0;
    stationOccupantCounts.set("EnteringFoyer", foyerOcc + 1);
    const foyerShiftX = foyerOcc <= 0 ? 0 : (foyerOcc % 2 === 1 ? -1 : 1) * Math.ceil(foyerOcc / 2) * 32;
    resolvedX = Math.max(304, Math.min(496, SOUTH_DOOR_FOYER_WAYPOINT.x + foyerShiftX));
    resolvedY = SOUTH_DOOR_FOYER_WAYPOINT.y;
    resolvedFacing = SOUTH_DOOR_FOYER_WAYPOINT.facingDirection;
    station = "Lounge";
  } else if (isThinkingPacing) {
    const rememberedStation = (walker as { lastNonPacingStation?: string }).lastNonPacingStation;
    const hasExplicitStationHint = Boolean(tool || c.activeWorkstation || nonQuestionRecent?.workstation || c.lastEquippedToolCategory);
    const lastStation = hasExplicitStationHint
      ? station
      : (rememberedStation ||
          (walker.resolvedSlot?.station && walker.resolvedSlot.station !== "Assembly" && walker.resolvedSlot.overheadLabel !== "Entering Hall"
            ? walker.resolvedSlot.station
            : station));
    const roam = assignThinkingRoamTarget(walker, c.sessionId, lastStation, stationOccupantCounts, timestampMs, {
      chamberWidth: clientState.chamberWidth, chamberHeight: clientState.chamberHeight, wildsWidth: clientState.wildsWidth,
    });
    resolvedX = roam.x; resolvedY = roam.y; resolvedFacing = roam.facingDirection; pacingSide = roam.pacingSide; station = "Assembly";
  } else if (station === "Combat") {
    const allocated = allocateCombatMonsterPerimeterSlot({
      character: c, stationOccupantCounts, walker, createdWalker,
      allWalkers: clientState.characterWalkers, activeCharacters: clientState.currentSnapshot.characters,
    });
    resolvedX = allocated.x; resolvedY = allocated.y; resolvedFacing = allocated.facingDirection;
  } else {
    const allocated = allocateStationPerimeterSlot({
      sessionId: c.sessionId, station, stationOccupantCounts, walker, createdWalker,
      allWalkers: clientState.characterWalkers, activeCharacters: clientState.currentSnapshot.characters,
    });
    resolvedX = allocated.x; resolvedY = allocated.y; resolvedFacing = allocated.facingDirection;
  }

  if (createdWalker && walker) {
    const isSubagent = Boolean(c.parentId || c.parentSessionId || c.role === "Squad Subagent");
    const spawnAtDoor = !isSubagent && effectiveLifecycleState === "Entering";
    walker.currentX = isSubagent ? PENTAGRAM_CENTER.x : spawnAtDoor ? SOUTH_GUILD_DOOR_ENTRANCE.x : resolvedX;
    walker.currentY = isSubagent ? PENTAGRAM_CENTER.y : spawnAtDoor ? SOUTH_GUILD_DOOR_ENTRANCE.y : resolvedY;
    walker.targetX = resolvedX;
    walker.targetY = resolvedY;
    walker.isWalking = spawnAtDoor && Math.hypot(resolvedX - walker.currentX, resolvedY - walker.currentY) > 3;
    walker.facingDirection = isSubagent ? "south" : spawnAtDoor ? SOUTH_GUILD_DOOR_ENTRANCE.facingDirection : resolvedFacing;
    walker.facingLeft = walker.facingDirection === "west";
  }

  const overheadLabel = questMarker === "?" ? "" : isEnteringFoyer ? "Entering Hall" : resolveCharacterOverheadLabel(c, workflowIntent, station, isEquippingAtArmory);
  return {
    x: resolvedX, y: resolvedY, station, role, workflowIntent, overheadLabel,
    facingDirection: resolvedFacing,
    questMarker, carriedCargo: c.activeResourceCargo?.kind ?? null,
    isActing: !isThinkingPacing && !isEnteringFoyer, ...(pacingSide ? { pacingSide } : {}),
  };
}

export function resolveCharacterDisplayBadge(
  c: CharacterState,
  hasActiveRoomBug: boolean,
): { workflowIntent: WorkflowIntentKind; station: ResolvedCharacterSlot["station"]; overheadVerb: string; workflowShortLabel: string } {
  const workflowIntent = resolveCharacterWorkflowIntent(c, hasActiveRoomBug);
  const isCompactingAtRest = c.lifecycleState === "DistillingContextMana" && (c.deferredLifecycleState === "RestingInLounge" || c.activePreparationStation === "Break Lounge");
  const isRestingOrArchived =
    (!isCharacterWaitingAtGate(c) && (isCompactingAtRest || c.lifecycleState === "RestingInLounge" || (c.isOpenInOpenCode === false && c.lifecycleState !== "WorkingAtStation" && !c.activeCapability))) ||
    c.lifecycleState === "Archived";
  const rawCapTool = extractCapabilityToolName(c.activeCapability) || (c.activeWorkstation === "Armory Wardrobe" ? "skill" : "");
  const rawTool = (rawCapTool || c.recentTools?.[0]?.toolName || "").replace(/^tool:/i, "").toLowerCase();
  const isSkillAction = classifyToolCategory(rawTool) === "skill" || c.activeWorkstation === "Armory Wardrobe" || c.activeCapability?.kind === "skill";
  const station: ResolvedCharacterSlot["station"] = isRestingOrArchived
    ? "Lounge"
    : isSkillAction || (c.equippingAtArmory && workflowIntent !== "debugging-hunt")
      ? "Armory"
      : workflowIntent === "debugging-hunt" && hasActiveRoomBug && isCharacterActivelyFixingBug(c)
        ? "Combat"
        : resolveCanonicalPreparationStation({
            toolName: rawTool, lastToolName: c.recentTools?.[0]?.toolName,
            workstation: c.activeWorkstation, lastEquippedToolCategory: c.lastEquippedToolCategory,
            pluginNamespace: c.activePluginNamespace, workflowIntent, agentClass: c.agentClass,
          });
  const overheadVerb = c.lifecycleState === "DistillingContextMana"
    ? "Compacting..."
    : isRestingOrArchived && hasCharacterUnviewedResult(c)
      ? (c.turnOutcome === "failed" || c.errorState ? "⚠️ Turn Failed" : c.turnOutcome === "interrupted" ? "⏹ Interrupted" : "✓ Result Ready")
      : resolveCharacterOverheadLabel(c, workflowIntent, station, Boolean(c.equippingAtArmory || isSkillAction));
  const workflowShortLabel = workflowIntent === "debugging-hunt" ? "👾 Debug" : workflowIntent === "information-gathering" ? "🔭 Info" : "⚙️ Build";
  return { workflowIntent, station, overheadVerb, workflowShortLabel };
}
