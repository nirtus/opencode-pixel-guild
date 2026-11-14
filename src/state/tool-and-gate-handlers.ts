import { classifyCapability, isBuiltinOpenCodePlugin, resolveResourceCargo } from "../capability/classifier.ts";
import { resolvePreparationStationDisplayName } from "../encounter/index.ts";
import { computeAdjacentSummonTile, layoutWorkshopRoom } from "../spatial/index.ts";
import { LIFECYCLE_TIMERS_MS, type SkillActivationSource, type SummoningRitualState, type TelemetryEvent, type ToolExecutionRecord } from "../types/domain.ts";
import { applyArmoryTransition, cleanChatMessagePrefix, resolveToolCategory, syncCharacterWorkflow } from "./armory-and-workflow.ts";
import { updateContextMana } from "./context-mana.ts";
import { deriveEquipmentLoadout } from "./equipment-loadout.ts";
import { normalizeLocationDirectory } from "./location-normalization.ts";
import { buildQuestionToolQuestGate, clearAllResolvedQuestGates, clearResolvedQuestGateSession, handleQuestGateOpened, handleQuestGateResolved, isQuestGateAlreadyResolved, recordResolvedQuestGate } from "./quest-gate-handlers.ts";
import { allocateNextToolSequence, bumpCharacterRevision, ensurePluginAlcove, ensureRoom, equipSkillGrimoire, resolveWorkstationAnchorTile, sortRecentToolsNewestFirst, transitionCharacterState } from "./reducer-helpers.ts";
import type { InternalWorldStoreState, MutationCollector } from "./reducer-types.ts";

export { buildQuestionToolQuestGate, clearAllResolvedQuestGates, clearResolvedQuestGateSession, handleQuestGateOpened, handleQuestGateResolved, isQuestGateAlreadyResolved, recordResolvedQuestGate };

export function handleToolStarted(
  state: InternalWorldStoreState, event: Extract<TelemetryEvent, { type: "tool.started" }>, collector: MutationCollector,
): void {
  const char = state.characters[event.sessionId];
  if (!char) return;
  const cap = classifyCapability({
    kind: "tool", identifier: event.toolName, input: event.toolInput,
    agentColor: char.visualTraits.primaryHex, catalog: state.catalog,
  });
  const isSubagentSpawnTool =
    event.toolName.trim().toLowerCase() === "subagent" || event.toolName.trim().toLowerCase() === "task";
  const isQuestionTool = event.toolName.trim().toLowerCase() === "question";
  if (isQuestionTool && isQuestGateAlreadyResolved(state, event.callId)) return;
  if (!isQuestionTool && char.questGate?.kind === "question") {
    recordResolvedQuestGate(state, char.questGate.gateId);
    delete state.questGates[char.questGate.gateId]; char.questGate = null;
  }
  const preservedWorkstation =
    char.activeWorkstation ?? char.recentTools.find((r) => r.toolName.toLowerCase() !== "question")?.workstation ?? "Arcane Lectern";
  const targetWorkstation = isQuestionTool ? preservedWorkstation : cap.targetWorkstation;
  const cargo = resolveResourceCargo({ workstation: targetWorkstation, toolName: event.toolName, pluginNamespace: cap.pluginNamespace });
  const toolCategory = resolveToolCategory({ toolName: event.toolName, workstation: targetWorkstation, skillId: cap.skillId, pluginNamespace: cap.pluginNamespace });
  const existingRunning = char.recentTools.find(
    (r) => (event.callId && r.callId === event.callId) || (!event.callId && r.toolName === event.toolName && r.status === "running"),
  );
  if (isSubagentSpawnTool || isQuestionTool) {
    char.equippingAtArmory = false;
    if (isSubagentSpawnTool) char.lastEquippedToolCategory = toolCategory;
  } else if (!existingRunning) {
    applyArmoryTransition(char, toolCategory, cap.kind === "skill");
    if (toolCategory !== "skill") {
      char.equippingAtArmory =
        char.equippingAtArmory &&
        (char.recentTools.length === 0 || char.lastEquippedToolCategory !== toolCategory);
    }
  }

  char.lifecycleState = isQuestionTool ? "BlockedAtQuestGate" : "WorkingAtStation";
  char.stateEnteredAtMs = event.timestampMs;
  char.lastActivityAtMs = event.timestampMs;
  char.activeCapability = cap;
  char.activeWorkstation = targetWorkstation;
  char.activePluginNamespace = cap.pluginNamespace;
  char.secondaryAlcoveTargets = [...cap.secondaryAlcoveNamespaces];
  char.activeResourceCargo = isSubagentSpawnTool || isQuestionTool ? null : cargo;
  char.deferredLifecycleState = null;
  char.errorState = null;
  char.hasUnviewedResult = false;
  char.isOpenInOpenCode = true; char.reportScroll = null; char.idleAtMs = undefined;
  const parentChar = char.parentId ? state.characters[char.parentId] : undefined;
  if (parentChar) {
    parentChar.isOpenInOpenCode = true; parentChar.hasUnviewedResult = false;
    if (parentChar.lifecycleState === "RestingInLounge" || parentChar.lifecycleState === "Archived") transitionCharacterState(state, parentChar, "Thinking", event.timestampMs);
    collector.changedCharacterIds.add(parentChar.characterId);
  }

  if (isQuestionTool) {
    buildQuestionToolQuestGate(state, char, event, event.timestampMs, event.toolInput);
  }

  const room = state.rooms[char.roomId];
  if (isSubagentSpawnTool) {
    const parentTile = char.currentTile ? { ...char.currentTile } : { x: 8, y: 4 };
    char.currentTile = { ...parentTile };
    char.targetTile = { ...parentTile };
    if (room) {
      const roomLayout = layoutWorkshopRoom(room);
      const occupiedTiles = room.characterIds
        .map((id) => state.characters[id]?.currentTile)
        .filter((t): t is { x: number; y: number } => Boolean(t));
      const summonTile = computeAdjacentSummonTile(roomLayout, parentTile, char.childSessionIds.length, occupiedTiles);
      const ritual: SummoningRitualState = {
        ritualId: `ritual:${char.sessionId}:${event.timestampMs}`,
        parentSessionId: char.sessionId,
        subagentSessionId: null,
        roomId: room.roomId,
        parentTile: { ...parentTile },
        summonTile: { ...summonTile },
        startedAtMs: event.timestampMs,
        endsAtMs: event.timestampMs + LIFECYCLE_TIMERS_MS.SUMMONING_RITUAL_DWELL_MS,
        active: true,
      };
      char.summoningRitual = ritual;
      room.activeSummoningRituals = [
        ...(room.activeSummoningRituals ?? []).filter((r) => r.parentSessionId !== char.sessionId),
        ritual,
      ];
    }
  } else {
    const stationTile = resolveWorkstationAnchorTile(targetWorkstation);
    char.currentTile = { ...stationTile };
    char.targetTile = { ...stationTile };
  }

  char.dwellUntilMs = !isQuestionTool && cap.minimumDwellMs > 0 ? event.timestampMs + cap.minimumDwellMs : null;
  if (cap.kind === "skill" && cap.skillId) {
    equipSkillGrimoire(state, char, cap.skillId, "skill-tool", event.timestampMs, cap.displayName);
  }

  const callId =
    existingRunning?.callId ?? event.callId ?? `${char.sessionId}:tool:${event.sequenceCursor ?? event.timestampMs}:${char.recentTools.length + 1}`;
  const canonicalStartTs = existingRunning?.startedAtMs ?? existingRunning?.timestampMs ?? event.timestampMs;
  const seqOrder = existingRunning?.sequenceOrder ?? allocateNextToolSequence(state, char);
  const newRecord: ToolExecutionRecord = {
    callId, toolName: event.toolName, workstation: targetWorkstation,
    preparationStation: resolvePreparationStationDisplayName({
      toolName: event.toolName, workstation: targetWorkstation, pluginNamespace: cap.pluginNamespace,
      workflowIntent: char.workflowIntent, agentClass: char.agentClass,
    }),
    pluginNamespace: cap.pluginNamespace, resourceCargo: cargo.kind, status: "running",
    inputPreview: cap.inputPreview || existingRunning?.inputPreview || event.toolName,
    ...(existingRunning?.outputPreview ? { outputPreview: existingRunning.outputPreview } : {}),
    timestampMs: canonicalStartTs, startedAtMs: canonicalStartTs, sequenceOrder: seqOrder,
  };
  char.recentTools = sortRecentToolsNewestFirst([newRecord, ...char.recentTools.filter((r) => r.callId !== callId)]);
  char.equipmentLoadout = deriveEquipmentLoadout(char);

  if (room) {
    if (cap.pluginNamespace) {
      const alcove = ensurePluginAlcove(state, room, cap.pluginNamespace, event.timestampMs);
      if (alcove) alcove.lastInvokedAtMs = event.timestampMs;
    }
    for (const secNs of cap.secondaryAlcoveNamespaces) {
      const alcove = ensurePluginAlcove(state, room, secNs, event.timestampMs);
      if (alcove) alcove.lastInvokedAtMs = event.timestampMs;
    }
    room.lastActivityAtMs = Math.max(room.lastActivityAtMs, event.timestampMs);
    collector.changedRoomIds.add(room.roomId);
    collector.deltaRoomId = room.roomId;
  }

  if (typeof event.sequenceCursor === "number") char.sequenceCursor = Math.max(char.sequenceCursor, event.sequenceCursor);
  syncCharacterWorkflow(char);
  bumpCharacterRevision(state, char.characterId);

  collector.changedCharacterIds.add(char.characterId);
  collector.deltaSessionId = char.sessionId;
  collector.description = `${char.title} working at ${cap.targetWorkstation} (${cap.displayName})`;
}

export function handleToolCompleted(
  state: InternalWorldStoreState,
  event: Extract<TelemetryEvent, { type: "tool.completed" }>,
  collector: MutationCollector,
): void {
  const char = state.characters[event.sessionId];
  if (!char) return;

  updateContextMana(char.contextMana, event.tokens);
  if (typeof event.sequenceCursor === "number") char.sequenceCursor = Math.max(char.sequenceCursor, event.sequenceCursor);
  char.lastActivityAtMs = Math.max(char.lastActivityAtMs, event.timestampMs);

  const rawInputPreview =
    (event as { inputPreview?: string; toolInput?: string }).inputPreview ??
    (event as { toolInput?: string }).toolInput;
  const rawOutputPreview =
    event.outputPreview ??
    (event as { toolOutput?: string }).toolOutput;

  const runningRecord = char.recentTools.find(
    (r) => (event.callId && r.callId === event.callId) || (r.toolName === event.toolName && r.status === "running"),
  );
  if (runningRecord) {
    runningRecord.status = "completed";
    if (rawInputPreview && (!runningRecord.inputPreview || runningRecord.inputPreview === runningRecord.toolName)) {
      runningRecord.inputPreview = rawInputPreview;
    }
    if (rawOutputPreview !== undefined) runningRecord.outputPreview = rawOutputPreview;
    runningRecord.completedAtMs = event.timestampMs;
    if (!runningRecord.timestampMs) runningRecord.timestampMs = event.timestampMs;
    if (runningRecord.sequenceOrder === undefined) runningRecord.sequenceOrder = allocateNextToolSequence(state, char);
  } else {
    const cap = classifyCapability({
      kind: "tool", identifier: event.toolName, input: rawInputPreview as any,
      agentColor: char.visualTraits.primaryHex, catalog: state.catalog,
    });
    const cargo = resolveResourceCargo({ workstation: cap.targetWorkstation, toolName: event.toolName, pluginNamespace: cap.pluginNamespace });
    const callId =
      event.callId ?? `${char.sessionId}:tool:${event.sequenceCursor ?? event.timestampMs}:${char.recentTools.length + 1}`;
    const seqOrder = allocateNextToolSequence(state, char);
    char.recentTools = sortRecentToolsNewestFirst([
      {
        callId, toolName: event.toolName, workstation: cap.targetWorkstation,
        preparationStation: resolvePreparationStationDisplayName({
          toolName: event.toolName, workstation: cap.targetWorkstation, pluginNamespace: cap.pluginNamespace,
          workflowIntent: char.workflowIntent, agentClass: char.agentClass,
        }),
        pluginNamespace: cap.pluginNamespace, resourceCargo: cargo.kind, status: "completed" as const,
        inputPreview: cap.inputPreview || (typeof rawInputPreview === "string" ? rawInputPreview : "") || event.toolName, outputPreview: rawOutputPreview,
        timestampMs: event.timestampMs, startedAtMs: event.timestampMs, completedAtMs: event.timestampMs, sequenceOrder: seqOrder,
      },
      ...char.recentTools,
    ]);
  }

  if (event.toolName.trim().toLowerCase() === "question" && char.questGate?.kind === "question") {
    recordResolvedQuestGate(state, char.questGate.gateId);
    delete state.questGates[char.questGate.gateId];
    char.questGate = null;
  }
  const stillRunning = char.recentTools.find((r) => r.status === "running");
  if (stillRunning) {
    char.lifecycleState = "WorkingAtStation";
    char.activeWorkstation = stillRunning.workstation;
    char.activePreparationStation = stillRunning.preparationStation;
    char.activePluginNamespace = stillRunning.pluginNamespace;
    char.activeCapability = classifyCapability({
      kind: "tool", identifier: stillRunning.toolName, input: stillRunning.inputPreview,
      agentColor: char.visualTraits.primaryHex, catalog: state.catalog,
    });
  } else if (char.dwellUntilMs && event.timestampMs < char.dwellUntilMs) {
    char.deferredLifecycleState = "Thinking";
  } else {
    transitionCharacterState(state, char, "Thinking", event.timestampMs);
  }
  char.equipmentLoadout = deriveEquipmentLoadout(char);
  syncCharacterWorkflow(char);
  if (stillRunning?.preparationStation) char.activePreparationStation = stillRunning.preparationStation;
  bumpCharacterRevision(state, char.characterId);

  collector.changedCharacterIds.add(char.characterId);
  collector.changedRoomIds.add(char.roomId);
  collector.deltaSessionId = char.sessionId;
  collector.deltaRoomId = char.roomId;
}

function positionAtArmoryWardrobe(
  state: InternalWorldStoreState, char: NonNullable<InternalWorldStoreState["characters"][string]>,
  skillId: string, timestampMs: number, withCargo: boolean,
): void {
  const cap = classifyCapability({ kind: "skill", identifier: skillId, catalog: state.catalog });
  const stationTile = resolveWorkstationAnchorTile("Armory Wardrobe");
  char.lifecycleState = "WorkingAtStation"; char.stateEnteredAtMs = timestampMs; char.lastActivityAtMs = timestampMs;
  char.activeWorkstation = "Armory Wardrobe"; char.activeCapability = cap;
  char.currentTile = { ...stationTile }; char.targetTile = { ...stationTile };
  if (withCargo) char.activeResourceCargo = resolveResourceCargo({ workstation: "Armory Wardrobe", toolName: "skill" });
  char.dwellUntilMs = timestampMs + LIFECYCLE_TIMERS_MS.ARCANE_LECTERN_MIN_DWELL_MS;
  char.deferredLifecycleState = "Thinking"; char.equippingAtArmory = true; char.lastEquippedToolCategory = "skill";
  char.equipmentLoadout = deriveEquipmentLoadout(char); syncCharacterWorkflow(char); bumpCharacterRevision(state, char.characterId);
}

export function handleSkillActivated(
  state: InternalWorldStoreState,
  event: Extract<TelemetryEvent, { type: "skill.activated" }> | Extract<TelemetryEvent, { type: "message.skill.item" }>,
  collector: MutationCollector,
): void {
  const char = state.characters[event.sessionId];
  if (!char) return;
  const source: SkillActivationSource = event.type === "message.skill.item" ? "skill-message" : (event.source ?? "skill-tool");
  equipSkillGrimoire(state, char, event.skillId, source, event.timestampMs, event.skillName);
  positionAtArmoryWardrobe(state, char, event.skillId, event.timestampMs, true);
  if (typeof event.sequenceCursor === "number") char.sequenceCursor = Math.max(char.sequenceCursor, event.sequenceCursor);
  collector.changedCharacterIds.add(char.characterId); collector.changedRoomIds.add(char.roomId);
  collector.deltaSessionId = char.sessionId; collector.deltaRoomId = char.roomId;
  collector.description = `${char.title} equipping skill ${event.skillName ?? event.skillId} at Armory Wardrobe`;
}

export function handleMessageUserPrompt(
  state: InternalWorldStoreState,
  event: Extract<TelemetryEvent, { type: "message.user.prompt" }>,
  collector: MutationCollector,
): void {
  const char = state.characters[event.sessionId];
  if (!char) return;
  const incomingText = event.promptText.trim().slice(0, 8000);
  const incomingPfx = cleanChatMessagePrefix(incomingText);
  const existingMsgs = [...(char.messages ?? [])];
  const prevMsg = existingMsgs[existingMsgs.length - 1];
  const matchingIdx = existingMsgs.findIndex(
    (m) => m.role === "user" && cleanChatMessagePrefix(m.text) === incomingPfx,
  );
  const isHistoricalEcho = matchingIdx >= 0 && Boolean(prevMsg && event.timestampMs <= prevMsg.createdAtMs);
  const isDuplicatePrompt =
    isHistoricalEcho ||
    Boolean(prevMsg && prevMsg.role === "user" && cleanChatMessagePrefix(prevMsg.text) === incomingPfx);
  if (!isHistoricalEcho) char.lastUserPromptText = incomingText;
  const alreadyProgressedTurn =
    isHistoricalEcho ||
    (char.lifecycleState === "DistillingContextMana" && char.dwellUntilMs === null) ||
    (isDuplicatePrompt &&
      (char.lifecycleState === "WorkingAtStation" ||
        char.lifecycleState === "BlockedAtQuestGate" ||
        char.lifecycleState === "DistillingContextMana" ||
        (char.lifecycleState === "RestingInLounge" &&
          Boolean(char.lastAssistantText || (typeof char.idleAtMs === "number" && char.idleAtMs >= (prevMsg?.createdAtMs ?? 0))))));
  if (!alreadyProgressedTurn) char.lastAssistantText = null;
  const targetIdx = isHistoricalEcho ? matchingIdx : existingMsgs.length - 1;
  const targetMsg = existingMsgs[targetIdx];
  if (isDuplicatePrompt && targetMsg) {
    const mergedSkills = Array.from(new Set([...(targetMsg.attachedSkills ?? []), ...(event.skills ?? [])]));
    existingMsgs[targetIdx] = {
      ...targetMsg,
      text: incomingText.length >= targetMsg.text.length ? incomingText : targetMsg.text,
      ...(mergedSkills.length > 0 ? { attachedSkills: mergedSkills } : {}),
    };
    char.messages = existingMsgs;
  } else {
    char.messages = [
      ...existingMsgs,
      { messageId: `user:${char.sessionId}:${event.timestampMs}`, role: "user" as const, text: incomingText, attachedSkills: event.skills, createdAtMs: Math.max(event.timestampMs, (prevMsg?.createdAtMs ?? 0) + 1) },
    ].slice(-60);
  }
  char.isOpenInOpenCode = true;
  if (alreadyProgressedTurn) {
    for (const skillId of event.skills ?? []) equipSkillGrimoire(state, char, skillId, "prompt-attachment", event.timestampMs, undefined, null, false);
    bumpCharacterRevision(state, char.characterId);
    collector.changedCharacterIds.add(char.characterId); collector.changedRoomIds.add(char.roomId);
    collector.deltaSessionId = char.sessionId; collector.deltaRoomId = char.roomId;
    return;
  }
  char.hasUnviewedResult = false; char.turnOutcome = null;
  if (!(event as { preserveActivityTimestamp?: boolean }).preserveActivityTimestamp) {
    clearResolvedQuestGateSession(state, char.sessionId, { keepSpecificGateIds: true });
  }
  if (char.questGate) {
    recordResolvedQuestGate(state, char.questGate.gateId);
    delete state.questGates[char.questGate.gateId]; char.questGate = null;
  }
  for (const rec of char.recentTools) {
    if (rec.status === "running" && rec.toolName.trim().toLowerCase() === "question") {
      rec.status = "completed"; recordResolvedQuestGate(state, rec.callId);
    }
  }
  const attachedSkills = new Set<string>(event.skills ?? []);
  const mentionRegex = /(?:^|\s)@([a-zA-Z0-9_-]{2,})/g;
  let match: RegExpExecArray | null = mentionRegex.exec(event.promptText);
  while (match !== null) {
    const candidate = match[1];
    if (state.catalog.skills[candidate] || state.catalog.skills[candidate.toLowerCase()] || !candidate.includes(".")) {
      attachedSkills.add(candidate);
    }
    match = mentionRegex.exec(event.promptText);
  }

  if (attachedSkills.size > 0) {
    let lastSkillId = "";
    for (const skillId of attachedSkills) {
      equipSkillGrimoire(state, char, skillId, "prompt-attachment", event.timestampMs);
      lastSkillId = skillId;
    }
    positionAtArmoryWardrobe(state, char, lastSkillId, event.timestampMs, false);
  } else {
    transitionCharacterState(state, char, "Thinking", event.timestampMs);
  }

  if (typeof event.sequenceCursor === "number") char.sequenceCursor = Math.max(char.sequenceCursor, event.sequenceCursor);
  collector.changedCharacterIds.add(char.characterId); collector.changedRoomIds.add(char.roomId);
  collector.deltaSessionId = char.sessionId; collector.deltaRoomId = char.roomId;
}

export function handlePluginStatusUpdated(
  state: InternalWorldStoreState,
  event: Extract<TelemetryEvent, { type: "plugin.status.updated" }>,
  collector: MutationCollector,
): void {
  if (isBuiltinOpenCodePlugin(event.namespace)) return;
  const normLoc = normalizeLocationDirectory(event.locationDirectory);
  if (state.deletedRoomIds.has(normLoc) && !state.rooms[normLoc]) return;
  const room = ensureRoom(state, event.locationDirectory, event.timestampMs);
  ensurePluginAlcove(state, room, event.namespace, event.timestampMs, {
    displayName: event.displayName, status: event.status, toolCount: event.toolCount, statusMessage: event.statusMessage,
  });
  collector.changedRoomIds.add(room.roomId); collector.deltaRoomId = room.roomId;
}
