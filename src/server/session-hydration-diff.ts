import {
  buildHydratedSessionEvents,
  isPendingQuestionCompletedByTools,
  type SessionMessageHydration,
} from "../ingress/index.ts";
import {
  mergeQuestGateFields,
  normalizeQuestGateFields,
  type CharacterState,
  type SessionChatMessage,
  type TelemetryEvent,
  type ToolExecutionRecord,
  type WorldStateReducer,
} from "../types/domain.ts";

const MAX_IN_MEMORY_MESSAGES = 60;

function hasMessageChanges(
  existingMsgs: readonly SessionChatMessage[] | undefined,
  incomingMsgs: readonly SessionChatMessage[] | undefined,
): boolean {
  if (!incomingMsgs || incomingMsgs.length === 0) return false;
  const tailIncoming = incomingMsgs.slice(-MAX_IN_MEMORY_MESSAGES);
  const existing = existingMsgs ?? [];
  if (tailIncoming.length > existing.length) return true;

  const existingById = new Map<string, SessionChatMessage>();
  for (const m of existing) existingById.set(m.messageId, m);
  for (const m of tailIncoming) {
    const cur = existingById.get(m.messageId);
    if (!cur) return true;
    if (m.role !== cur.role) return true;
    if (m.text.length > cur.text.length || (m.text.length === cur.text.length && m.text !== cur.text)) return true;
  }
  return false;
}

function hasToolChanges(
  existingTools: readonly ToolExecutionRecord[] | undefined,
  incomingTools: readonly ToolExecutionRecord[] | undefined,
): boolean {
  if (!incomingTools || incomingTools.length === 0) return false;
  const existingByCallId = new Map<string, ToolExecutionRecord>();
  for (const t of existingTools ?? []) existingByCallId.set(t.callId, t);

  for (const t of incomingTools) {
    const cur = existingByCallId.get(t.callId);
    if (!cur) return true;
    if ((t.status ?? "completed") !== cur.status) return true;
    if (t.outputPreview && t.outputPreview !== cur.outputPreview) return true;
    if (t.inputPreview && t.inputPreview !== cur.inputPreview) return true;
  }
  return false;
}

function isPendingQuestionUnchanged(
  charNow: CharacterState,
  pq: NonNullable<SessionMessageHydration["pendingQuestion"]>,
): boolean {
  const cur = charNow.questGate;
  if (!cur || cur.kind !== "question") return false;
  if (charNow.lifecycleState !== "BlockedAtQuestGate") return false;
  const effectiveGateId =
    cur.gateId.startsWith("frm_") && !pq.gateId.startsWith("frm_")
      ? cur.gateId
      : pq.gateId;
  if (cur.gateId !== effectiveGateId) return false;
  if (cur.title !== (pq.title || "Waiting for User Input")) return false;
  if (cur.reason !== pq.reason) return false;
  if ((cur.source ?? "form") !== (pq.source ?? "form")) return false;
  const curFields = normalizeQuestGateFields(cur.fields);
  const mergedFields = mergeQuestGateFields(cur.fields, pq.fields);
  if (JSON.stringify(curFields) !== JSON.stringify(mergedFields)) return false;
  return true;
}

export function dispatchHydratedSessionIfChanged(
  activeReducer: WorldStateReducer,
  charNow: CharacterState,
  hydrated: SessionMessageHydration,
  sessionId: string,
  locationDirectory: string,
): boolean {
  const existingQGateId =
    charNow.questGate?.kind === "question" ? charNow.questGate.gateId : null;
  const pq = hydrated.pendingQuestion;
  const pqDone = isPendingQuestionCompletedByTools(pq, hydrated.recentTools);

  const effectiveAssistantText = pqDone ? undefined : hydrated.lastAssistantText;
  const tailIncoming = hydrated.messages?.slice(-MAX_IN_MEMORY_MESSAGES);
  const latestIncomingUser = tailIncoming
    ? [...tailIncoming].reverse().find((m) => m.role === "user")
    : undefined;
  const effectiveUserPromptText = latestIncomingUser?.text
    ? latestIncomingUser.text.slice(0, 8000)
    : hydrated.lastUserPromptText;

  const messagesChanged = hasMessageChanges(charNow.messages, hydrated.messages);
  const toolsChanged = hasToolChanges(charNow.recentTools, hydrated.recentTools);
  const assistantTextChanged =
    effectiveAssistantText !== undefined &&
    (effectiveAssistantText ?? null) !== (charNow.lastAssistantText ?? null);
  const userPromptChanged =
    effectiveUserPromptText !== undefined &&
    (effectiveUserPromptText ?? null) !== (charNow.lastUserPromptText ?? null);

  const hydratedLastRole =
    hydrated.messages?.[hydrated.messages.length - 1]?.role ??
    charNow.messages?.[charNow.messages.length - 1]?.role;
  const needsGateResolve = Boolean(
    existingQGateId && (!pq || pqDone || hydratedLastRole === "user"),
  );
  const wantsGateOpen = Boolean(pq && !pqDone && hydratedLastRole !== "user");
  const needsGateOpen = Boolean(
    wantsGateOpen && pq && !isPendingQuestionUnchanged(charNow, pq),
  );
  const hasDataChange =
    messagesChanged || toolsChanged || assistantTextChanged || userPromptChanged;

  if (!hasDataChange && !needsGateResolve && !needsGateOpen) {
    return false;
  }

  if (hasDataChange || needsGateResolve) {
    const events = buildHydratedSessionEvents(
      hydrated,
      sessionId,
      locationDirectory,
      existingQGateId,
      false,
    );
    if (events.length > 1) {
      activeReducer.dispatchBatch(events);
    } else {
      for (const hEv of events) activeReducer.dispatch(hEv);
    }
  }

  if (needsGateOpen && pq) {
    const charAfter = activeReducer.getSnapshot().characters[sessionId];
    const lastRoleAfter = charAfter?.messages?.[charAfter.messages.length - 1]?.role;
    if (lastRoleAfter !== "user") {
      activeReducer.dispatch({
        type: "question.requested",
        timestampMs: Date.now(),
        sessionId,
        locationDirectory,
        gateId: pq.gateId,
        title: pq.title || "Waiting for User Input",
        reason: pq.reason,
        prompt: pq.reason,
        source: pq.source,
        fields: pq.fields,
      } as unknown as TelemetryEvent);
    }
  }

  return true;
}
