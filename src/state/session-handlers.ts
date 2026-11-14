import { classifyCapability } from "../capability/classifier.ts";
import { detectConversationalQuestionPrompt } from "../ingress/daemon-message-hydration.ts";
import { computeAdjacentSummonTile, layoutWorkshopRoom } from "../spatial/index.ts";
import {
  LIFECYCLE_TIMERS_MS,
  type CharacterLifecycleState, type CharacterState, type SummoningRitualState, type TelemetryEvent, type WorkshopRoomState,
} from "../types/domain.ts";
import { reconcileCharacterMessages, syncCharacterWorkflow } from "./armory-and-workflow.ts";
import { updateContextMana } from "./context-mana.ts";
import { deriveEquipmentLoadout } from "./equipment-loadout.ts";
import { isDeletedHostDirectory, normalizeLocationDirectory } from "./location-normalization.ts";
import { openOrUpdateConversationalQuestGate } from "./quest-gate-handlers.ts";
import {
  bumpCharacterRevision, createCharacterDefaultState, ensureRoom,
  equipSkillGrimoire, mergeHydratedRecentTools, retireParentSubagents, transitionCharacterState,
} from "./reducer-helpers.ts";
import type {
  InternalWorldStoreState, MutationCollector, SessionUpsertedEvent,
  SubagentSpawnedTelemetryEvent,
} from "./reducer-types.ts";

function linkParentAndChild(
  state: InternalWorldStoreState, parent: CharacterState, child: CharacterState,
  room: WorkshopRoomState, timestampMs: number, castRitual: boolean, collector: MutationCollector,
): void {
  if (!parent.childSessionIds.includes(child.sessionId)) parent.childSessionIds.push(child.sessionId);
  for (const g of parent.skillGrimoires) equipSkillGrimoire(state, child, g.skillId, "inherited", timestampMs, g.name, parent.sessionId);
  const parentTile = parent.currentTile ? { ...parent.currentTile } : { x: 8, y: 4 };
  const roomLayout = layoutWorkshopRoom(room);
  const occupiedTiles = castRitual
    ? room.characterIds.map((id) => state.characters[id]?.currentTile).filter((t): t is { x: number; y: number } => Boolean(t))
    : undefined;
  const childIdx = Math.max(0, parent.childSessionIds.indexOf(child.sessionId));
  const summonTile = computeAdjacentSummonTile(roomLayout, parentTile, childIdx, occupiedTiles);
  child.spawnTile = { ...summonTile }; child.currentTile = { ...summonTile }; child.targetTile = { ...summonTile };

  if (castRitual) {
    parent.isOpenInOpenCode = true; parent.hasUnviewedResult = false;
    if (parent.lifecycleState === "RestingInLounge" || parent.lifecycleState === "Archived") transitionCharacterState(state, parent, "Thinking", timestampMs);
    const ritual: SummoningRitualState = {
      ritualId: `ritual:${parent.sessionId}:${child.sessionId}`, parentSessionId: parent.sessionId,
      subagentSessionId: child.sessionId, roomId: room.roomId, parentTile: { ...parentTile },
      summonTile: { ...summonTile }, startedAtMs: timestampMs,
      endsAtMs: timestampMs + LIFECYCLE_TIMERS_MS.SUMMONING_RITUAL_DWELL_MS, active: true,
    };
    parent.summoningRitual = ritual; child.summoningRitual = ritual;
    room.activeSummoningRituals = [
      ...(room.activeSummoningRituals ?? []).filter((r) => !(r.parentSessionId === parent.sessionId && (r.subagentSessionId === null || r.subagentSessionId === child.sessionId))),
      ritual,
    ];
  }
  bumpCharacterRevision(state, parent.characterId); bumpCharacterRevision(state, child.characterId);
  collector.changedCharacterIds.add(parent.characterId); collector.changedCharacterIds.add(child.characterId);
}

export function transitionSubagentToReportingScroll(
  state: InternalWorldStoreState, char: CharacterState, timestampMs: number, summary?: string,
  deferToState: CharacterLifecycleState = "RestingInLounge", dwellMs: number = LIFECYCLE_TIMERS_MS.REPORTING_SCROLL_DWELL_MS,
): void {
  const parentId = char.parentId ?? char.parentSessionId ?? null;
  const parentChar = parentId ? state.characters[parentId] : undefined;
  const parentTile = parentChar?.currentTile ? { ...parentChar.currentTile } : { x: 8, y: 4 };
  char.lifecycleState = "ReportingScroll"; char.stateEnteredAtMs = timestampMs; char.idleAtMs = timestampMs;
  char.lastActivityAtMs = Math.max(char.lastActivityAtMs, timestampMs);
  char.activeWorkstation = null; char.activePluginNamespace = null; char.secondaryAlcoveTargets = [];
  char.activeCapability = null; char.activeResourceCargo = null; char.equippingAtArmory = false;
  char.targetTile = { ...parentTile };
  char.reportScroll = {
    fromSubagentSessionId: char.sessionId, toParentSessionId: parentId ?? "",
    targetTile: { ...parentTile }, summary: summary ?? `Completed ${char.title}`,
    createdAtMs: timestampMs, deliveredAtMs: null,
  };
  char.dwellUntilMs = timestampMs + dwellMs; char.deferredLifecycleState = deferToState;
  syncCharacterWorkflow(char); bumpCharacterRevision(state, char.characterId);
}

export function handleSessionUpserted(
  state: InternalWorldStoreState, event: SessionUpsertedEvent, collector: MutationCollector,
): void {
  if (state.deletedSessionIds.has(event.sessionId) || (event.parentId && state.deletedSessionIds.has(event.parentId))) return;
  let char = state.characters[event.sessionId];
  const isUnknownRootDir = !event.locationDirectory || event.locationDirectory === "/";
  if (!char && isUnknownRootDir && (event.preserveActivityTimestamp || (event.lastAssistantText !== undefined && !event.title && !event.agentClass))) return;
  const effectiveLocationDirectory = char && isUnknownRootDir ? char.roomId : event.locationDirectory;
  if (isDeletedHostDirectory(effectiveLocationDirectory, undefined, state.daemonUrl)) return;
  const normEffectiveDir = normalizeLocationDirectory(effectiveLocationDirectory);
  if (state.deletedRoomIds.has(normEffectiveDir) && !state.rooms[normEffectiveDir]) {
    if (event.preserveActivityTimestamp || event.parentId) return;
    state.deletedRoomIds.delete(normEffectiveDir);
  } else if (!event.preserveActivityTimestamp && !event.parentId) {
    state.deletedRoomIds.delete(normEffectiveDir);
  }
  const explicitUpdatedAtMs = typeof event.updatedAtMs === "number" && event.updatedAtMs > 0 ? event.updatedAtMs : null;
  const activityTimestampMs = explicitUpdatedAtMs ?? event.timestampMs;

  const room = ensureRoom(state, effectiveLocationDirectory, activityTimestampMs);
  const parentId = event.parentId ?? null;
  const agentClass = event.agentClass ?? char?.agentClass ?? "build";
  const agentCap = classifyCapability({ kind: "agent", identifier: agentClass, agentColor: event.agentColor, catalog: state.catalog });

  if (!char) {
    char = createCharacterDefaultState(state, {
      sessionId: event.sessionId, parentId, room, title: event.title ?? event.sessionId, agentClass,
      modelId: event.modelId ?? "default", visualTraits: agentCap.visualTraits, tokens: event.tokens,
      timestampMs: event.timestampMs, activityTimestampMs, sequenceCursor: event.sequenceCursor ?? 0,
      isOpenInOpenCode: event.isOpenInOpenCode ?? true,
    });
    if (event.preserveActivityTimestamp && event.timestampMs - activityTimestampMs > 15_000) {
      char.lifecycleState = event.idleAtMs ? "RestingInLounge" : "Thinking";
      char.dwellUntilMs = null;
      char.deferredLifecycleState = null;
      char.stateEnteredAtMs = activityTimestampMs;
    }
    if (parentId && state.characters[parentId]) {
      const isLiveSpawn = event.isOpenInOpenCode !== false && Math.abs(event.timestampMs - activityTimestampMs) < 15_000;
      linkParentAndChild(state, state.characters[parentId], char, room, event.timestampMs, isLiveSpawn, collector);
    }
    for (const existingChar of Object.values(state.characters)) {
      if (existingChar.parentId === char.sessionId) linkParentAndChild(state, char, existingChar, room, event.timestampMs, false, collector);
    }
    state.characters[char.sessionId] = char;
    if (!room.characterIds.includes(char.characterId)) room.characterIds.push(char.characterId);
  } else {
    if (char.roomId !== room.roomId) {
      const prevRoom = state.rooms[char.roomId];
      if (prevRoom) prevRoom.characterIds = prevRoom.characterIds.filter((id) => id !== char!.characterId);
      char.roomId = room.roomId;
    }
    if (!room.characterIds.includes(char.characterId)) room.characterIds.push(char.characterId);
    char.projectId = room.projectId;
    char.projectName = room.projectName;
    if (parentId && !char.parentId) {
      char.parentId = parentId;
      char.parentSessionId = parentId;
      char.role = "Squad Subagent";
      if (state.characters[parentId]) {
        const isLiveSpawn = event.isOpenInOpenCode !== false && Math.abs(event.timestampMs - activityTimestampMs) < 15_000;
        linkParentAndChild(state, state.characters[parentId], char, room, event.timestampMs, isLiveSpawn, collector);
      }
    }
    if (event.title) char.title = event.title;
    if (event.agentClass) { char.agentClass = event.agentClass; char.visualTraits = agentCap.visualTraits; }
    if (event.modelId) char.modelId = event.modelId;
    if (event.isOpenInOpenCode !== undefined) char.isOpenInOpenCode = event.isOpenInOpenCode;
    updateContextMana(char.contextMana, event.tokens, char.modelId, state.catalog.models);
    if (typeof event.sequenceCursor === "number") char.sequenceCursor = Math.max(char.sequenceCursor, event.sequenceCursor);
    if (explicitUpdatedAtMs !== null) char.lastActivityAtMs = explicitUpdatedAtMs;
    else if (!event.preserveActivityTimestamp) char.lastActivityAtMs = Math.max(char.lastActivityAtMs, event.timestampMs);
  }
  if (event.idleAtMs !== undefined) char.idleAtMs = event.idleAtMs;
  const reqDeferred = (event as { deferredLifecycleState?: CharacterLifecycleState }).deferredLifecycleState;
  if (reqDeferred && char.lifecycleState === "Entering") char.deferredLifecycleState = reqDeferred;
  if (typeof event.viewedAtMs === "number") char.viewedAtMs = Math.max(char.viewedAtMs ?? 0, event.viewedAtMs);
  if (event.turnOutcome !== undefined) char.turnOutcome = event.turnOutcome;
  if (!char.parentId && char.role !== "Squad Subagent") {
    const latestTurnTs = Math.max(char.idleAtMs ?? 0, char.lastActivityAtMs ?? 0);
    const isPostCompactionIdle =
      !char.hasUnviewedResult &&
      typeof char.contextMana.lastDistilledAtMs === "number" &&
      char.contextMana.lastDistilledAtMs > 0 &&
      (char.idleAtMs ?? 0) <= char.contextMana.lastDistilledAtMs + 15_000;
    if (isPostCompactionIdle) {
      char.hasUnviewedResult = false;
      char.viewedAtMs = Math.max(char.viewedAtMs ?? 0, latestTurnTs);
    } else if (typeof char.viewedAtMs === "number" && char.viewedAtMs > 0 && latestTurnTs > 0 && char.viewedAtMs >= latestTurnTs) char.hasUnviewedResult = false;
    else if (typeof char.viewedAtMs === "number" && typeof char.idleAtMs === "number" && char.viewedAtMs >= char.idleAtMs) char.hasUnviewedResult = false;
    else if (event.hasUnviewedResult !== undefined) char.hasUnviewedResult = event.hasUnviewedResult;
    const isRecentlyViewed = typeof char.viewedAtMs === "number" && char.viewedAtMs > 0 && event.timestampMs - char.viewedAtMs < LIFECYCLE_TIMERS_MS.HISTORICAL_ARCHIVE_IDLE_MS;
    if (char.hasUnviewedResult || isRecentlyViewed) char.isOpenInOpenCode = true;
    if ((char.isOpenInOpenCode || char.hasUnviewedResult || isRecentlyViewed) && char.lifecycleState === "Archived") {
      transitionCharacterState(state, char, "RestingInLounge", activityTimestampMs, { preserveLastActivity: true });
    }
  }
  if (event.worktreeDirectory) char.locationDirectory = normalizeLocationDirectory(event.worktreeDirectory);
  if (event.lastAssistantText !== undefined) char.lastAssistantText = event.lastAssistantText;
  if (event.lastUserPromptText !== undefined) char.lastUserPromptText = event.lastUserPromptText;
  reconcileCharacterMessages(char, event.messages, event.lastAssistantText, activityTimestampMs);
  if (event.recentTools && event.recentTools.length > 0) mergeHydratedRecentTools(state, char, event.recentTools, activityTimestampMs);
  const latestMsgRole = char.messages?.[char.messages.length - 1]?.role;
  const hasRunningNonQTool = char.recentTools.some((r) => r.status === "running" && r.toolName.toLowerCase() !== "question");
  if (latestMsgRole === "user" && char.questGate?.source === "conversational") {
    delete state.questGates[char.questGate.gateId];
    char.questGate = null;
  } else if (event.lastAssistantText && latestMsgRole !== "user" && !hasRunningNonQTool && (!char.questGate || char.questGate.source === "conversational") && char.lifecycleState !== "Archived") {
    const convQ = detectConversationalQuestionPrompt(char.lastAssistantText);
    if (convQ) openOrUpdateConversationalQuestGate(state, char, convQ, activityTimestampMs);
  }
  syncCharacterWorkflow(char);
  char.equipmentLoadout = deriveEquipmentLoadout(char);
  bumpCharacterRevision(state, char.characterId);
  collector.changedRoomIds.add(room.roomId);
  collector.changedCharacterIds.add(char.characterId);
  collector.deltaSessionId = char.sessionId;
  collector.deltaRoomId = room.roomId;
  collector.description = `Upserted ${char.role} ${char.title}`;
}

function isRestingOrCompactingAtRest(char: CharacterState): boolean {
  return (
    char.lifecycleState === "RestingInLounge" || char.lifecycleState === "Archived" ||
    (char.lifecycleState === "DistillingContextMana" && char.deferredLifecycleState === "RestingInLounge") ||
    char.activePreparationStation === "Break Lounge"
  );
}

export function handleSubagentSpawned(state: InternalWorldStoreState, event: SubagentSpawnedTelemetryEvent, collector: MutationCollector): void {
  handleSessionUpserted(state, { ...event, type: "session.upserted" }, collector);
}

export function handleSessionIdle(state: InternalWorldStoreState, event: Extract<TelemetryEvent, { type: "session.idle" }>, collector: MutationCollector): void {
  const char = state.characters[event.sessionId];
  if (!char) return;
  if (event.summary && !char.lastAssistantText) char.lastAssistantText = event.summary;
  updateContextMana(char.contextMana, event.tokens);
  if (typeof event.sequenceCursor === "number") char.sequenceCursor = Math.max(char.sequenceCursor, event.sequenceCursor);
  const isPostRestCompactionIdle =
    char.lifecycleState === "DistillingContextMana" ||
    (!char.hasUnviewedResult &&
      typeof char.contextMana.lastDistilledAtMs === "number" &&
      char.contextMana.lastDistilledAtMs >= (char.idleAtMs ?? 0));
  if (!isPostRestCompactionIdle && (!char.questGate || char.questGate.source === "conversational") && char.lastAssistantText) {
    const convQ = detectConversationalQuestionPrompt(char.lastAssistantText);
    if (convQ) openOrUpdateConversationalQuestGate(state, char, convQ, event.timestampMs);
  }
  if (char.questGate) {
    char.lifecycleState = "BlockedAtQuestGate"; char.dwellUntilMs = null; char.deferredLifecycleState = null;
    char.activeWorkstation = char.activeWorkstation ?? char.recentTools.find((r) => r.toolName.toLowerCase() !== "question")?.workstation ?? "Arcane Lectern";
    syncCharacterWorkflow(char); bumpCharacterRevision(state, char.characterId);
    collector.changedCharacterIds.add(char.characterId); collector.changedRoomIds.add(char.roomId);
    collector.deltaSessionId = char.sessionId; collector.deltaRoomId = char.roomId;
    return;
  }

  if (char.role === "Squad Subagent" && char.parentId) {
    if (!event.summary && !event.outcome && char.lifecycleState === "Entering" && char.recentTools.length === 0 && !char.lastAssistantText && event.timestampMs - char.stateEnteredAtMs < 5_000) return;
    transitionSubagentToReportingScroll(state, char, event.timestampMs, event.summary, "RestingInLounge");
  } else {
    if (!isPostRestCompactionIdle) {
      char.idleAtMs = event.timestampMs; char.turnOutcome = event.outcome ?? "succeeded";
      char.hasUnviewedResult = true; char.isOpenInOpenCode = true;
    } else {
      char.hasUnviewedResult = false;
      char.viewedAtMs = Math.max(char.viewedAtMs ?? 0, event.timestampMs, char.idleAtMs ?? 0, char.lastActivityAtMs ?? 0);
    }
    if (char.dwellUntilMs && event.timestampMs < char.dwellUntilMs) {
      char.deferredLifecycleState = "RestingInLounge"; syncCharacterWorkflow(char); bumpCharacterRevision(state, char.characterId);
    } else {
      transitionCharacterState(state, char, "RestingInLounge", event.timestampMs, { preserveLastActivity: isPostRestCompactionIdle });
    }
    retireParentSubagents(state, char, event.timestampMs, collector);
  }
  collector.changedCharacterIds.add(char.characterId); collector.changedRoomIds.add(char.roomId);
  collector.deltaSessionId = char.sessionId; collector.deltaRoomId = char.roomId;
}

export function handleSessionStatus(state: InternalWorldStoreState, event: Extract<TelemetryEvent, { type: "session.status" }>, collector: MutationCollector): void {
  const char = state.characters[event.sessionId];
  if (!char) return;
  updateContextMana(char.contextMana, event.tokens);
  if (typeof event.sequenceCursor === "number") char.sequenceCursor = Math.max(char.sequenceCursor, event.sequenceCursor);
  if (char.lifecycleState === "DistillingContextMana" && (char.dwellUntilMs === null || event.timestampMs < char.dwellUntilMs) && event.status !== "archived") {
    if (event.status === "idle") { char.deferredLifecycleState = "RestingInLounge"; syncCharacterWorkflow(char); bumpCharacterRevision(state, char.characterId); }
    collector.changedCharacterIds.add(char.characterId); collector.changedRoomIds.add(char.roomId);
    collector.deltaSessionId = char.sessionId; collector.deltaRoomId = char.roomId;
    return;
  }
  if (event.status === "thinking" || event.status === "working") {
    char.hasUnviewedResult = false; char.isOpenInOpenCode = true; char.reportScroll = null; char.idleAtMs = undefined;
    const p = char.parentId ? state.characters[char.parentId] : undefined;
    if (p) {
      p.isOpenInOpenCode = true; p.hasUnviewedResult = false;
      if (p.lifecycleState === "RestingInLounge" || p.lifecycleState === "Archived") transitionCharacterState(state, p, "Thinking", event.timestampMs);
      collector.changedCharacterIds.add(p.characterId);
    }
  }
  if (event.status === "idle" && (!char.questGate || char.questGate.source === "conversational") && char.lastAssistantText) {
    const convQ = detectConversationalQuestionPrompt(char.lastAssistantText);
    if (convQ) openOrUpdateConversationalQuestGate(state, char, convQ, event.timestampMs);
  }
  if (event.status === "idle" && char.questGate) {
    char.lifecycleState = "BlockedAtQuestGate"; char.dwellUntilMs = null; char.deferredLifecycleState = null;
    char.activeWorkstation = char.activeWorkstation ?? char.recentTools.find((r) => r.toolName.toLowerCase() !== "question")?.workstation ?? "Arcane Lectern";
    syncCharacterWorkflow(char); bumpCharacterRevision(state, char.characterId);
  } else {
    const nextState: CharacterLifecycleState = event.status === "thinking" ? "Thinking" : event.status === "working" ? "WorkingAtStation" : event.status === "archived" ? "Archived" : "RestingInLounge";
    if (nextState === "Thinking" && char.lifecycleState === "WorkingAtStation" && ((char.dwellUntilMs && event.timestampMs < char.dwellUntilMs) || char.recentTools.some((r) => r.status === "running"))) {
      char.deferredLifecycleState = "Thinking"; syncCharacterWorkflow(char); bumpCharacterRevision(state, char.characterId);
    } else {
      transitionCharacterState(state, char, nextState, event.timestampMs);
      if (nextState === "RestingInLounge" || nextState === "Archived") retireParentSubagents(state, char, event.timestampMs, collector);
    }
  }
  collector.changedCharacterIds.add(char.characterId); collector.changedRoomIds.add(char.roomId);
  collector.deltaSessionId = char.sessionId; collector.deltaRoomId = char.roomId;
}

export function handleSessionCompacting(state: InternalWorldStoreState, event: Extract<TelemetryEvent, { type: "session.compacting" }>, collector: MutationCollector): void {
  const char = state.characters[event.sessionId];
  if (!char) return;
  const wasResting = isRestingOrCompactingAtRest(char);
  if (char.lifecycleState !== "DistillingContextMana") char.stateEnteredAtMs = event.timestampMs;
  char.lifecycleState = "DistillingContextMana";
  char.dwellUntilMs = null;
  char.deferredLifecycleState = wasResting ? "RestingInLounge" : "Thinking";
  char.activePluginNamespace = null;
  char.secondaryAlcoveTargets = [];
  char.activeResourceCargo = null;
  if (wasResting || !char.hasUnviewedResult) {
    char.hasUnviewedResult = false;
    char.viewedAtMs = Math.max(char.viewedAtMs ?? 0, event.timestampMs, char.idleAtMs ?? 0, char.lastActivityAtMs ?? 0);
  }
  if (wasResting) {
    char.activeWorkstation = null;
    char.activePreparationStation = "Break Lounge";
    char.currentTile = char.currentTile ?? { x: 3, y: 9 };
    char.targetTile = { ...char.currentTile };
  } else {
    char.lastActivityAtMs = Math.max(char.lastActivityAtMs, event.timestampMs);
    char.activeWorkstation = char.activeWorkstation ?? char.recentTools.find((r) => r.toolName.toLowerCase() !== "question")?.workstation ?? "Arcane Lectern";
    char.targetTile = char.currentTile ? { ...char.currentTile } : { x: 8, y: 4 };
  }
  if (typeof event.sequenceCursor === "number") char.sequenceCursor = Math.max(char.sequenceCursor, event.sequenceCursor);
  syncCharacterWorkflow(char); bumpCharacterRevision(state, char.characterId);
  collector.changedCharacterIds.add(char.characterId); collector.changedRoomIds.add(char.roomId);
  collector.deltaSessionId = char.sessionId; collector.deltaRoomId = char.roomId;
}

export function handleSessionCompacted(state: InternalWorldStoreState, event: Extract<TelemetryEvent, { type: "session.compacted" }>, collector: MutationCollector): void {
  const char = state.characters[event.sessionId];
  if (!char) return;
  const wasResting = isRestingOrCompactingAtRest(char);
  const wasAlreadyCompacting = char.lifecycleState === "DistillingContextMana" && char.dwellUntilMs === null;
  updateContextMana(char.contextMana, event.tokens);
  char.contextMana.compactionCount += 1; char.contextMana.lastDistilledAtMs = event.timestampMs;
  if (wasResting || !char.hasUnviewedResult) {
    char.hasUnviewedResult = false;
    char.viewedAtMs = Math.max(char.viewedAtMs ?? 0, event.timestampMs, char.idleAtMs ?? 0, char.lastActivityAtMs ?? 0);
  }
  if (!event.tokens?.usedTokens) {
    char.contextMana.usedTokens = Math.floor(char.contextMana.usedTokens * 0.25);
    char.contextMana.fillRatio = char.contextMana.limitTokens > 0 ? char.contextMana.usedTokens / char.contextMana.limitTokens : 0;
  }
  if (char.skillGrimoires.length > 0) {
    char.distilledSkillHistory.push(...char.skillGrimoires); char.skillGrimoires = [];
  }
  if (typeof event.sequenceCursor === "number") char.sequenceCursor = Math.max(char.sequenceCursor, event.sequenceCursor);
  if (wasAlreadyCompacting && event.timestampMs - char.stateEnteredAtMs >= LIFECYCLE_TIMERS_MS.DISTILLING_CONTEXT_MANA_DWELL_MS) {
    transitionCharacterState(state, char, wasResting ? "RestingInLounge" : "Thinking", event.timestampMs, { preserveLastActivity: wasResting });
  } else {
    const startedAt = wasAlreadyCompacting ? char.stateEnteredAtMs : event.timestampMs;
    char.lifecycleState = "DistillingContextMana"; char.stateEnteredAtMs = startedAt;
    if (!wasResting) char.lastActivityAtMs = event.timestampMs;
    char.activeWorkstation = wasResting ? null : (char.activeWorkstation ?? char.recentTools.find((r) => r.toolName.toLowerCase() !== "question")?.workstation ?? "Arcane Lectern");
    char.activePluginNamespace = null; char.secondaryAlcoveTargets = [];
    char.currentTile = wasResting ? (char.currentTile ?? { x: 3, y: 9 }) : (char.currentTile ?? { x: 8, y: 4 });
    char.targetTile = { ...char.currentTile };
    char.activeResourceCargo = null;
    char.dwellUntilMs = startedAt + LIFECYCLE_TIMERS_MS.DISTILLING_CONTEXT_MANA_DWELL_MS;
    char.deferredLifecycleState = wasResting ? "RestingInLounge" : "Thinking";
    syncCharacterWorkflow(char); bumpCharacterRevision(state, char.characterId);
  }
  if (wasResting) retireParentSubagents(state, char, event.timestampMs, collector);
  collector.changedCharacterIds.add(char.characterId); collector.changedRoomIds.add(char.roomId);
  collector.deltaSessionId = char.sessionId; collector.deltaRoomId = char.roomId;
}

export function handleSessionError(state: InternalWorldStoreState, event: Extract<TelemetryEvent, { type: "session.error" }>, collector: MutationCollector): void {
  const char = state.characters[event.sessionId];
  if (!char) return;
  char.errorState = { message: event.message, retryCount: event.retryCount ?? (char.errorState?.retryCount ?? 0) + 1, occurredAtMs: event.timestampMs };
  for (const rec of char.recentTools) if (rec.status === "running") rec.status = "error";
  if (!char.parentId && char.role !== "Squad Subagent") { char.idleAtMs = event.timestampMs; char.turnOutcome = "failed"; char.hasUnviewedResult = true; char.isOpenInOpenCode = true; }
  transitionCharacterState(state, char, "RestingInLounge", event.timestampMs);
  retireParentSubagents(state, char, event.timestampMs, collector);
  if (typeof event.sequenceCursor === "number") char.sequenceCursor = Math.max(char.sequenceCursor, event.sequenceCursor);
  char.equipmentLoadout = deriveEquipmentLoadout(char); syncCharacterWorkflow(char); bumpCharacterRevision(state, char.characterId);
  collector.changedCharacterIds.add(char.characterId); collector.changedRoomIds.add(char.roomId); collector.deltaSessionId = char.sessionId; collector.deltaRoomId = char.roomId;
}

export function handleSessionViewed(state: InternalWorldStoreState, event: Extract<TelemetryEvent, { type: "session.viewed" }>, collector: MutationCollector): void {
  const char = state.characters[event.sessionId];
  if (!char) return;
  char.viewedAtMs = Math.max(char.viewedAtMs ?? 0, event.viewedAtMs ?? event.timestampMs, char.idleAtMs ?? 0, char.lastActivityAtMs ?? 0, event.timestampMs);
  if (typeof char.idleAtMs !== "number" || char.idleAtMs <= 0) char.idleAtMs = char.viewedAtMs;
  char.hasUnviewedResult = false; char.stateEnteredAtMs = Math.max(char.stateEnteredAtMs, event.timestampMs);
  if (typeof event.sequenceCursor === "number") char.sequenceCursor = Math.max(char.sequenceCursor, event.sequenceCursor);
  syncCharacterWorkflow(char); bumpCharacterRevision(state, char.characterId);
  collector.changedCharacterIds.add(char.characterId); collector.changedRoomIds.add(char.roomId); collector.deltaSessionId = char.sessionId; collector.deltaRoomId = char.roomId;
}

export function handleSessionArchived(state: InternalWorldStoreState, event: Extract<TelemetryEvent, { type: "session.archived" }>, collector: MutationCollector): void {
  const char = state.characters[event.sessionId];
  if (!char) return;
  transitionCharacterState(state, char, "Archived", event.timestampMs);
  retireParentSubagents(state, char, event.timestampMs, collector);
  if (typeof event.sequenceCursor === "number") char.sequenceCursor = Math.max(char.sequenceCursor, event.sequenceCursor);
  collector.changedCharacterIds.add(char.characterId); collector.changedRoomIds.add(char.roomId); collector.deltaSessionId = char.sessionId; collector.deltaRoomId = char.roomId;
}
