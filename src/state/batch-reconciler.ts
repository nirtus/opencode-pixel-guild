import { isBuiltinOpenCodePlugin } from "../capability/classifier.ts";
import { detectConversationalQuestionPrompt } from "../ingress/daemon-message-hydration.ts";
import { LIFECYCLE_TIMERS_MS, mergeQuestGateFields, type QuestGateState, type ReconnectLogEntry, type TelemetryEvent } from "../types/domain.ts";
import { syncCharacterWorkflow } from "./armory-and-workflow.ts";
import { syncCharacterTributeRecord, updateContextMana } from "./context-mana.ts";
import { deriveEquipmentLoadout } from "./equipment-loadout.ts";
import { isDeletedHostDirectory, normalizeLocationDirectory } from "./location-normalization.ts";
import { bumpCharacterRevision, ensurePluginAlcove, ensureRoom, equipSkillGrimoire, mergeHydratedRecentTools, pruneDeletedHostRooms, transitionCharacterState } from "./reducer-helpers.ts";
import { SUBAGENT_RETURN_TRANSIT_MS, type InternalWorldStoreState, type MutationCollector } from "./reducer-types.ts";
import { handleSessionCompacted, handleSessionIdle, handleSessionUpserted, transitionSubagentToReportingScroll } from "./session-handlers.ts";
import { isQuestionReasonAlreadyResolved, openOrUpdateConversationalQuestGate, recordResolvedQuestGate } from "./quest-gate-handlers.ts";
import { handleMessageUserPrompt, handleQuestGateOpened, handleQuestGateResolved, handleSkillActivated, handleToolCompleted, handleToolStarted, isQuestGateAlreadyResolved } from "./tool-and-gate-handlers.ts";

export function handleLocationDiscovered(state: InternalWorldStoreState, event: Extract<TelemetryEvent, { type: "location.discovered" }>, collector: MutationCollector): void {
  if (isDeletedHostDirectory(event.locationDirectory, undefined, state.daemonUrl)) return;
  const normLoc = normalizeLocationDirectory(event.locationDirectory);
  if (event.explicit) state.deletedRoomIds.delete(normLoc);
  if (state.deletedRoomIds.has(normLoc) && !state.rooms[normLoc]) {
    collector.description = `Skipped demolished 0-session Workshop Room ${normLoc}`;
    return;
  }
  const room = ensureRoom(state, event.locationDirectory, event.timestampMs, {
    projectId: event.projectId, projectName: event.projectName, isWorktree: event.isWorktree, parentProjectDirectory: event.parentProjectDirectory,
  });
  collector.changedRoomIds.add(room.roomId); collector.deltaRoomId = room.roomId;
  collector.description = `Discovered Workshop Room ${room.projectName}`;
}

export function handleCatalogHydrated(state: InternalWorldStoreState, event: Extract<TelemetryEvent, { type: "catalog.hydrated" }>, collector: MutationCollector): void {
  for (const s of event.skills ?? []) {
    const skillId = (s.id || s.name || "").trim();
    if (skillId) state.catalog.skills[skillId] = { id: skillId, name: s.name ?? skillId, kind: "skill", description: s.description };
  }
  for (const plugin of event.plugins ?? []) {
    const ns = plugin.namespace.trim().toLowerCase();
    if (isBuiltinOpenCodePlugin(ns, plugin.source?.type)) continue;
    state.catalog.plugins[ns] = { id: ns, name: plugin.name ?? plugin.namespace, kind: "plugin", namespace: ns, status: plugin.status ?? "connected" };
    if (event.locationDirectory) {
      const normLoc = normalizeLocationDirectory(event.locationDirectory);
      if (state.deletedRoomIds.has(normLoc) && !state.rooms[normLoc]) continue;
      const room = ensureRoom(state, event.locationDirectory, event.timestampMs);
      ensurePluginAlcove(state, room, ns, 0, { displayName: plugin.name, status: plugin.status, toolCount: plugin.toolCount, statusMessage: plugin.statusMessage });
      collector.changedRoomIds.add(room.roomId); collector.deltaRoomId = room.roomId;
    }
  }
  const roomAgents: Array<import("../types/domain.ts").CapabilityCatalogEntry> = [];
  for (const a of event.agents ?? []) {
    const id = (a.id || a.name || "").trim();
    if (!id) continue;
    const entry: import("../types/domain.ts").CapabilityCatalogEntry = { id, name: a.name ?? id, kind: "agent", color: a.color, description: a.description, mode: a.mode, hidden: a.hidden, disabled: a.disabled };
    state.catalog.agents[id] = entry; roomAgents.push(entry);
  }
  if (event.locationDirectory && roomAgents.length > 0) {
    const normLoc = normalizeLocationDirectory(event.locationDirectory);
    if (!state.deletedRoomIds.has(normLoc) || state.rooms[normLoc]) {
      const room = ensureRoom(state, event.locationDirectory, event.timestampMs);
      room.availableAgents = roomAgents; collector.changedRoomIds.add(room.roomId); collector.deltaRoomId = room.roomId;
    }
  }
  for (const t of event.tools ?? []) {
    state.catalog.tools[t.id] = { id: t.id, name: t.name ?? t.id, kind: "tool", namespace: t.namespace };
  }
  if (event.models) {
    state.catalog.models ??= {};
    for (const model of event.models) {
      if (!model.id || !(model.limitContext > 0)) continue;
      const entry = {
        id: model.id, providerId: model.providerId, name: model.name ?? model.id,
        limitContext: model.limitContext, limitOutput: model.limitOutput,
      };
      const shortId = model.id.split("/").pop() ?? model.id;
      const keys = [model.id, model.id.toLowerCase(), shortId, shortId.toLowerCase()];
      if (model.providerId) keys.push(`${model.providerId}/${shortId}`, `${model.providerId}/${shortId}`.toLowerCase());
      for (const k of keys) state.catalog.models[k] = entry;
    }
    for (const char of Object.values(state.characters)) {
      updateContextMana(char.contextMana, undefined, char.modelId, state.catalog.models);
      char.equipmentLoadout = deriveEquipmentLoadout(char);
      bumpCharacterRevision(state, char.characterId);
      collector.changedCharacterIds.add(char.characterId);
    }
  }
}

export function handleTasksHydrated(state: InternalWorldStoreState, event: Extract<TelemetryEvent, { type: "tasks.hydrated" }> | Extract<TelemetryEvent, { type: "goal.progress" }>, collector: MutationCollector): void {
  if (isDeletedHostDirectory(event.locationDirectory, undefined, state.daemonUrl)) return;
  const normLoc = normalizeLocationDirectory(event.locationDirectory);
  if (state.deletedRoomIds.has(normLoc) && !state.rooms[normLoc]) return;
  const room = state.rooms[normLoc] ?? ensureRoom(state, event.locationDirectory, event.timestampMs);
  if (!event.roomId && room.taskProgress && room.taskProgress.source === "none" && room.taskProgress.totalTasks > 0 && event.taskProgress.source === "none" && event.taskProgress.totalTasks === 0) return;
  room.taskProgress =
    event.taskProgress.totalTasks === 0
      ? { ...event.taskProgress, hydratedAtMs: event.taskProgress.hydratedAtMs ?? event.timestampMs }
      : { ...event.taskProgress };
  collector.changedRoomIds.add(room.roomId);
  collector.deltaRoomId = room.roomId;
  collector.description = `Hydrated task progress for ${room.projectName}: ${event.taskProgress.resolvedTasks}/${event.taskProgress.totalTasks} tasks resolved`;
}

export function handleTimerTick(
  state: InternalWorldStoreState, event: Extract<TelemetryEvent, { type: "timer.tick" }>, collector: MutationCollector,
): void {
  pruneDeletedHostRooms(state, collector);
  for (const room of Object.values(state.rooms)) {
    if (room.activeSummoningRituals && room.activeSummoningRituals.length > 0) {
      const beforeLen = room.activeSummoningRituals.length;
      room.activeSummoningRituals = room.activeSummoningRituals.filter((r) => event.timestampMs < r.endsAtMs);
      if (room.activeSummoningRituals.length !== beforeLen) collector.changedRoomIds.add(room.roomId);
    }
  }
  for (const char of Object.values(state.characters)) {
    if (char.summoningRitual?.active && event.timestampMs >= char.summoningRitual.endsAtMs) {
      char.summoningRitual = { ...char.summoningRitual, active: false };
      syncCharacterWorkflow(char); bumpCharacterRevision(state, char.characterId); collector.changedCharacterIds.add(char.characterId);
    }
    if (char.equippingAtArmory && event.timestampMs - char.lastActivityAtMs >= 1450) {
      char.equippingAtArmory = false;
      syncCharacterWorkflow(char); bumpCharacterRevision(state, char.characterId); collector.changedCharacterIds.add(char.characterId);
    }
    if (char.dwellUntilMs !== null && event.timestampMs >= char.dwellUntilMs) {
      if (char.lifecycleState === "WorkingAtStation" && char.deferredLifecycleState === null) {
        char.dwellUntilMs = null;
      } else {
        if (char.lifecycleState === "ReportingScroll" && char.reportScroll && char.reportScroll.deliveredAtMs === null) {
          char.reportScroll.deliveredAtMs = event.timestampMs;
        }
        transitionCharacterState(state, char, char.deferredLifecycleState ?? "Thinking", event.timestampMs);
        collector.changedCharacterIds.add(char.characterId);
        collector.changedRoomIds.add(char.roomId);
      }
    } else if (char.lifecycleState === "RestingInLounge") {
      const isChild = char.parentId !== null || char.role === "Squad Subagent";
      const hasUnviewed = !isChild && char.hasUnviewedResult === true;
      const keepOpenRoot = !isChild && event.timestampMs > 1_000_000_000_000 && (hasUnviewed || char.isOpenInOpenCode === true);
      const thresholdMs = isChild ? SUBAGENT_RETURN_TRANSIT_MS : LIFECYCLE_TIMERS_MS.HISTORICAL_ARCHIVE_IDLE_MS;
      const idleMs = Math.max(
        event.timestampMs - Math.max(char.lastActivityAtMs, char.viewedAtMs ?? 0),
        event.timestampMs - char.stateEnteredAtMs,
      );
      if (!keepOpenRoot && idleMs >= thresholdMs) {
        transitionCharacterState(state, char, "Archived", event.timestampMs, { preserveLastActivity: true });
        collector.changedCharacterIds.add(char.characterId);
        collector.changedRoomIds.add(char.roomId);
      }
    }
  }
}

function replayLogEntry(
  state: InternalWorldStoreState,
  sessionId: string,
  entry: ReconnectLogEntry & { outputPreview?: string },
  collector: MutationCollector,
): void {
  const base = { timestampMs: entry.timestampMs, sessionId, sequenceCursor: entry.cursor };
  if (entry.type === "tool.started" && entry.toolName) {
    handleToolStarted(state, { ...base, type: "tool.started", toolName: entry.toolName, toolInput: entry.toolInput }, collector);
  } else if (entry.type === "tool.completed" && entry.toolName) {
    handleToolCompleted(state, { ...base, type: "tool.completed", toolName: entry.toolName, outputPreview: entry.outputPreview, tokens: entry.tokens }, collector);
  } else if ((entry.type === "skill.activated" || entry.type === "message.skill.item") && entry.skillId) {
    handleSkillActivated(state, { ...base, type: entry.type, skillId: entry.skillId }, collector);
  } else if (entry.type === "message.user.prompt") {
    handleMessageUserPrompt(state, { ...base, type: "message.user.prompt", promptText: entry.promptText ?? "", skills: entry.skills }, collector);
  } else if (entry.type === "session.compacted") {
    handleSessionCompacted(state, { ...base, type: "session.compacted", tokens: entry.tokens }, collector);
  } else if (entry.type === "session.idle") {
    handleSessionIdle(state, { ...base, type: "session.idle", tokens: entry.tokens }, collector);
  } else if ((entry.type === "permission.requested" || entry.type === "question.requested") && entry.gateId) {
    handleQuestGateOpened(state, { ...base, type: entry.type, gateId: entry.gateId, title: entry.title ?? (entry.type === "permission.requested" ? "Permission Request" : "Question Prompt"), reason: entry.reason ?? "" }, collector);
  } else if ((entry.type === "permission.resolved" || entry.type === "question.resolved") && entry.gateId) {
    handleQuestGateResolved(state, { ...base, type: entry.type, gateId: entry.gateId }, collector);
  }
}

export function handleStreamReconnected(
  state: InternalWorldStoreState,
  event: Extract<TelemetryEvent, { type: "stream.reconnected" }>,
  collector: MutationCollector,
): void {
  for (const loc of event.locations) {
    if (isDeletedHostDirectory(loc.locationDirectory, undefined, state.daemonUrl)) continue;
    const normLoc = normalizeLocationDirectory(loc.locationDirectory);
    if (state.deletedRoomIds.has(normLoc) && !state.rooms[normLoc]) continue;
    const room = ensureRoom(state, loc.locationDirectory, event.timestampMs, {
      projectId: loc.projectId, projectName: loc.projectName, isWorktree: loc.isWorktree, parentProjectDirectory: loc.parentProjectDirectory,
    });
    collector.changedRoomIds.add(room.roomId);

    const previouslyActiveIds = new Set<string>();
    for (const charId of room.characterIds) {
      const existing = state.characters[charId];
      if (existing && (existing.lifecycleState === "Entering" || existing.lifecycleState === "WorkingAtStation" || existing.lifecycleState === "Thinking")) {
        previouslyActiveIds.add(existing.sessionId);
      }
    }

    for (const sessionMeta of loc.sessions ?? []) {
      if (state.deletedSessionIds.has(sessionMeta.sessionId) || (sessionMeta.parentId && state.deletedSessionIds.has(sessionMeta.parentId))) continue;
      const preChar = state.characters[sessionMeta.sessionId];
      if (preChar && typeof sessionMeta.compactedAtMs === "number" && sessionMeta.compactedAtMs > 0 && (preChar.contextMana.lastDistilledAtMs ?? 0) < sessionMeta.compactedAtMs) {
        preChar.contextMana.lastDistilledAtMs = sessionMeta.compactedAtMs;
        preChar.contextMana.compactionCount = Math.max(1, preChar.contextMana.compactionCount);
      }
      handleSessionUpserted(state, {
        type: "session.upserted", timestampMs: event.timestampMs, sessionId: sessionMeta.sessionId,
        parentId: sessionMeta.parentId ?? null, locationDirectory: room.locationDirectory,
        worktreeDirectory: sessionMeta.locationDirectory, title: sessionMeta.title,
        agentClass: sessionMeta.agentClass, modelId: sessionMeta.modelId, tokens: sessionMeta.tokens,
        recentTools: sessionMeta.recentTools, lastAssistantText: sessionMeta.lastAssistantText,
        lastUserPromptText: sessionMeta.lastUserPromptText, messages: sessionMeta.messages,
        updatedAtMs: typeof sessionMeta.updatedAtMs === "number" ? sessionMeta.updatedAtMs : undefined,
        idleAtMs: typeof sessionMeta.idleAtMs === "number" ? sessionMeta.idleAtMs : undefined,
        viewedAtMs: typeof sessionMeta.viewedAtMs === "number" ? sessionMeta.viewedAtMs : undefined,
        turnOutcome: typeof sessionMeta.turnOutcome === "string" ? sessionMeta.turnOutcome : undefined,
        hasUnviewedResult: typeof sessionMeta.hasUnviewedResult === "boolean" ? sessionMeta.hasUnviewedResult : undefined,
        isOpenInOpenCode: typeof sessionMeta.isOpenInOpenCode === "boolean" ? sessionMeta.isOpenInOpenCode : undefined,
        preserveActivityTimestamp: true,
      }, collector);
      const char = state.characters[sessionMeta.sessionId];
      const isActivelyEquippingSkill = sessionMeta.activeTool?.toolName?.trim().toLowerCase() === "skill";
      for (const skillId of sessionMeta.skills ?? []) {
        if (char) equipSkillGrimoire(state, char, skillId, "prompt-attachment", event.timestampMs, undefined, null, isActivelyEquippingSkill);
      }
      if (char && sessionMeta.activeTool?.toolName && !char.recentTools.some((r) => r.toolName === sessionMeta.activeTool?.toolName)) {
        mergeHydratedRecentTools(state, char, [{
          toolName: sessionMeta.activeTool.toolName, toolInput: sessionMeta.activeTool.toolInput,
          status: loc.activeSessionIds.includes(sessionMeta.sessionId) ? "running" : "completed", timestampMs: event.timestampMs,
        }], event.timestampMs);
      }
      if (char) {
        if (sessionMeta.lastAssistantText !== undefined) char.lastAssistantText = sessionMeta.lastAssistantText;
        if (typeof sessionMeta.compactedAtMs === "number" && sessionMeta.compactedAtMs > 0 && (char.contextMana.lastDistilledAtMs ?? 0) < sessionMeta.compactedAtMs) {
          char.contextMana.lastDistilledAtMs = sessionMeta.compactedAtMs;
          char.contextMana.compactionCount = Math.max(1, char.contextMana.compactionCount);
        }
        char.equipmentLoadout = deriveEquipmentLoadout(char); syncCharacterWorkflow(char);
        bumpCharacterRevision(state, char.characterId); collector.changedCharacterIds.add(char.characterId);
      }
    }

    for (const [sessionId, entries] of Object.entries(loc.sessionLogs ?? {})) {
      const char = state.characters[sessionId];
      if (!char) continue;
      for (const entry of [...entries].sort((a, b) => a.cursor - b.cursor)) {
        if (entry.cursor <= char.sequenceCursor) continue;
        state.lastTimestampMs = Math.max(state.lastTimestampMs, entry.timestampMs);
        replayLogEntry(state, sessionId, entry, collector);
        char.sequenceCursor = Math.max(char.sequenceCursor, entry.cursor);
        collector.changedCharacterIds.add(char.characterId);
      }
    }

    if (!Array.isArray(loc.sessions) && loc.activeSessionIds.length === 0 && (loc.pendingPermissions?.length ?? 0) === 0 && (loc.pendingQuestions?.length ?? 0) === 0) continue;

    const activeGateIds = new Set<string>();
    const gateEntries = [
      ...(loc.pendingPermissions ?? []).map((p) => ({ ...p, kind: "permission" as const, marker: "!" as const })),
      ...(loc.pendingQuestions ?? []).map((q) => ({ ...q, kind: "question" as const, marker: "?" as const })),
    ];
    for (const g of gateEntries) {
      if (isQuestGateAlreadyResolved(state, g.gateId)) continue;
      if (g.kind === "question" && isQuestionReasonAlreadyResolved(state, g.sessionId, g.reason, g.gateId)) {
        recordResolvedQuestGate(state, g.gateId);
        continue;
      }
      activeGateIds.add(g.gateId);
      const char = state.characters[g.sessionId];
      if (char) {
        const gAny = g as { source?: QuestGateState["source"]; fields?: QuestGateState["fields"]; action?: string; resources?: readonly string[] };
        const src = gAny.source ?? (g.kind === "permission" ? "permission" : "form");
        let mergedFields = g.kind === "question" ? mergeQuestGateFields(char.questGate?.fields, gAny.fields) : gAny.fields;
        if (g.kind === "question" && (!mergedFields || mergedFields.length === 0) && src === "conversational") mergedFields = detectConversationalQuestionPrompt(g.reason)?.fields;
        const gate: QuestGateState = {
          gateId: g.gateId, sessionId: char.sessionId, roomId: room.roomId, kind: g.kind, marker: g.marker,
          title: g.title, reason: g.reason, openedAtMs: state.questGates[g.gateId]?.openedAtMs ?? event.timestampMs,
          source: src, fields: mergedFields && mergedFields.length > 0 ? mergedFields : gAny.fields, action: gAny.action, resources: gAny.resources,
        };
        char.questGate = gate; state.questGates[gate.gateId] = gate;
        char.lifecycleState = "BlockedAtQuestGate"; char.dwellUntilMs = null; char.deferredLifecycleState = null;
        syncCharacterWorkflow(char); bumpCharacterRevision(state, char.characterId); collector.changedCharacterIds.add(char.characterId);
      }
    }

    for (const [gateId, gate] of Object.entries(state.questGates)) {
      if (gate.roomId === room.roomId && !activeGateIds.has(gateId)) {
        const char = state.characters[gate.sessionId];
        const meta = loc.sessions?.find((s) => s.sessionId === gate.sessionId);
        const lastRole = char?.messages?.[char.messages.length - 1]?.role;
        const isBusy = loc.activeSessionIds.includes(gate.sessionId) || Boolean(meta?.activeTool) || lastRole === "user";
        if (gate.source === "conversational" && char && !meta?.archived && char.lifecycleState !== "Archived" && !isBusy && detectConversationalQuestionPrompt(char.lastAssistantText)) {
          activeGateIds.add(gateId);
          continue;
        }
        delete state.questGates[gateId];
        if (char && char.questGate?.gateId === gateId) {
          char.questGate = null;
          bumpCharacterRevision(state, char.characterId);
        }
      }
    }

    const activeSet = new Set(loc.activeSessionIds.filter((id) => !state.deletedSessionIds.has(id)));
    for (const charId of room.characterIds) {
      const char = state.characters[charId];
      if (!char) continue;
      if (char.parentId && activeSet.has(char.sessionId)) activeSet.add(char.parentId);
      if (char.childSessionIds.some((childId) => activeSet.has(childId))) activeSet.add(char.sessionId);
    }

    for (const charId of [...room.characterIds]) {
      const char = state.characters[charId];
      if (!char) continue;
      const meta = loc.sessions?.find((s) => s.sessionId === char.sessionId);
      const ageMs = event.timestampMs - Math.max(char.stateEnteredAtMs, char.lastActivityAtMs);
      if (Array.isArray(loc.sessions) && loc.sessions.length > 0 && !meta && !activeSet.has(char.sessionId) && ageMs > 15_000) {
        if (char.parentId && state.characters[char.parentId]) {
          state.characters[char.parentId].childSessionIds = state.characters[char.parentId].childSessionIds.filter((id) => id !== char.sessionId);
        }
        for (const [gateId, gate] of Object.entries(state.questGates)) {
          if (gate.sessionId === char.sessionId) delete state.questGates[gateId];
        }
        syncCharacterTributeRecord(state.tributeLedger, char, state.rooms);
        delete state.characters[char.sessionId];
        state.characterRevisions.delete(char.characterId);
        room.characterIds = room.characterIds.filter((id) => id !== char.characterId);
        collector.changedCharacterIds.add(char.characterId);
        continue;
      }
      if (meta?.archived) {
        transitionCharacterState(state, char, "Archived", event.timestampMs, { preserveLastActivity: true });
        collector.changedCharacterIds.add(char.characterId);
        continue;
      }
      if ((!char.questGate || char.questGate.source === "conversational") && !activeSet.has(char.sessionId) && !meta?.archived && char.lifecycleState !== "Archived" && char.lastAssistantText) {
        const lastRole = char.messages?.[char.messages.length - 1]?.role;
        const convQ = lastRole !== "user" ? detectConversationalQuestionPrompt(char.lastAssistantText) : null;
        if (convQ) openOrUpdateConversationalQuestGate(state, char, convQ, event.timestampMs);
      }
      if (char.questGate) {
        char.lifecycleState = "BlockedAtQuestGate"; char.dwellUntilMs = null; char.deferredLifecycleState = null;
        char.activeWorkstation = char.activeWorkstation ?? char.recentTools.find((r) => r.toolName.toLowerCase() !== "question")?.workstation ?? "Arcane Lectern";
        syncCharacterWorkflow(char); bumpCharacterRevision(state, char.characterId); collector.changedCharacterIds.add(char.characterId);
        continue;
      }
      const isCompletedChild =
        (char.parentId !== null || char.role === "Squad Subagent") &&
        (char.reportScroll !== null || (typeof char.idleAtMs === "number" && char.idleAtMs > 0)) &&
        (char.lifecycleState === "ReportingScroll" || char.lifecycleState === "RestingInLounge" || char.lifecycleState === "Archived") &&
        !meta?.activeTool && (typeof meta?.updatedAtMs !== "number" || (meta.updatedAtMs ?? 0) <= Math.max(char.idleAtMs ?? 0, char.lastActivityAtMs, char.stateEnteredAtMs));
      if (isCompletedChild) { activeSet.delete(char.sessionId); char.isOpenInOpenCode = false; }
      const hasActiveChild = char.childSessionIds.some((childId) => activeSet.has(childId));
      if (activeSet.has(char.sessionId) || hasActiveChild) {
        activeSet.add(char.sessionId);
        char.isOpenInOpenCode = true;
        const sweepClearedActiveTool = Boolean(meta && "activeTool" in meta && !meta.activeTool);
        if (sweepClearedActiveTool) for (const rec of char.recentTools) if (rec.status === "running") rec.status = "completed";
        const shouldThink = char.lifecycleState === "RestingInLounge" || char.lifecycleState === "Entering" || char.lifecycleState === "Archived" || (char.lifecycleState === "WorkingAtStation" && sweepClearedActiveTool) || (char.lifecycleState === "BlockedAtQuestGate" && !char.questGate);
        if (shouldThink) {
          transitionCharacterState(state, char, "Thinking", event.timestampMs);
          collector.changedCharacterIds.add(char.characterId);
        }
      } else if (char.parentId !== null || char.role === "Squad Subagent") {
        const parentActive = Boolean(char.parentId && activeSet.has(char.parentId));
        if (previouslyActiveIds.has(char.sessionId) && parentActive) {
          transitionSubagentToReportingScroll(state, char, event.timestampMs, undefined, "Archived", SUBAGENT_RETURN_TRANSIT_MS);
          collector.changedCharacterIds.add(char.characterId);
        } else if (!(parentActive && char.lifecycleState === "ReportingScroll" && char.dwellUntilMs !== null && event.timestampMs < char.dwellUntilMs) && char.lifecycleState !== "Archived") {
          if (char.reportScroll && char.reportScroll.deliveredAtMs === null) char.reportScroll.deliveredAtMs = event.timestampMs;
          transitionCharacterState(state, char, "Archived", event.timestampMs, { preserveLastActivity: true });
          collector.changedCharacterIds.add(char.characterId);
        }
      } else if (char.lifecycleState !== "Archived" || char.hasUnviewedResult) {
        const explicitlyOpen = Boolean(meta?.isOpenInOpenCode === true) || Boolean(char.hasUnviewedResult);
        const lastRelevantMs = Math.max(char.lastActivityAtMs, char.viewedAtMs ?? 0);
        const nextIdleState = !explicitlyOpen && event.timestampMs - lastRelevantMs >= LIFECYCLE_TIMERS_MS.HISTORICAL_ARCHIVE_IDLE_MS ? "Archived" : "RestingInLounge";
        if (char.lifecycleState === "DistillingContextMana" && ((char.dwellUntilMs !== null && event.timestampMs < char.dwellUntilMs) || (char.dwellUntilMs === null && event.timestampMs - char.stateEnteredAtMs < 15_000))) {
          if (!char.deferredLifecycleState) char.deferredLifecycleState = nextIdleState;
        }
        else if (char.lifecycleState !== nextIdleState) {
          transitionCharacterState(state, char, nextIdleState, event.timestampMs, { preserveLastActivity: true });
          collector.changedCharacterIds.add(char.characterId);
        }
      }
    }
    room.activeSessionIds = [...activeSet];
  }
  pruneDeletedHostRooms(state, collector);
  collector.description = `Reconciled ${event.locations.length} location(s) after stream reconnect`;
}
