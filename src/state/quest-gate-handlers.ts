import {
  detectConversationalQuestionPrompt,
  mergeQuestGateFields,
  normalizeQuestGateFields,
  type CharacterState,
  type ConversationalQuestionDetection,
  type QuestGateState,
  type TelemetryEvent,
} from "../types/domain.ts";
import { syncCharacterWorkflow } from "./armory-and-workflow.ts";
import { bumpCharacterRevision, transitionCharacterState } from "./reducer-helpers.ts";
import type {
  InternalWorldStoreState,
  MutationCollector,
  PermissionRequestedTelemetryEvent,
  QuestionAskedTelemetryEvent,
} from "./reducer-types.ts";

const resolvedGateIdsByState = new WeakMap<InternalWorldStoreState, Set<string>>();
const resolvedQuestionReasonsByState = new WeakMap<InternalWorldStoreState, Map<string, Set<string>>>();

export function recordResolvedQuestGate(
  state: InternalWorldStoreState,
  gateId: string | null | undefined,
): void {
  if (!gateId) return;
  let set = resolvedGateIdsByState.get(state);
  if (!set) {
    set = new Set<string>();
    resolvedGateIdsByState.set(state, set);
  }
  set.add(gateId);
}

function recordResolvedQuestionReason(
  state: InternalWorldStoreState,
  sessionId: string,
  reason: string | null | undefined,
): void {
  const trimmed = reason?.trim();
  if (!sessionId || !trimmed) return;
  let bySession = resolvedQuestionReasonsByState.get(state);
  if (!bySession) {
    bySession = new Map<string, Set<string>>();
    resolvedQuestionReasonsByState.set(state, bySession);
  }
  let reasons = bySession.get(sessionId);
  if (!reasons) {
    reasons = new Set<string>();
    bySession.set(sessionId, reasons);
  }
  reasons.add(trimmed);
}

export function isQuestGateAlreadyResolved(
  state: InternalWorldStoreState,
  gateId: string | null | undefined,
): boolean {
  if (!gateId) return false;
  return resolvedGateIdsByState.get(state)?.has(gateId) ?? false;
}

export function isQuestionReasonAlreadyResolved(
  state: InternalWorldStoreState,
  sessionId: string,
  reason: string | null | undefined,
  gateId: string | null | undefined,
): boolean {
  if (isQuestGateAlreadyResolved(state, gateId)) return true;
  const trimmed = reason?.trim();
  if (!trimmed) return false;
  return resolvedQuestionReasonsByState.get(state)?.get(sessionId)?.has(trimmed) ?? false;
}

export function clearResolvedQuestGateSession(
  state: InternalWorldStoreState,
  sessionId: string,
  options?: { keepSpecificGateIds?: boolean },
): void {
  if (!sessionId) return;
  resolvedQuestionReasonsByState.get(state)?.delete(sessionId);
  const set = resolvedGateIdsByState.get(state);
  if (!set) return;
  set.delete(`question:${sessionId}`);
  const convPrefix = `question:${sessionId}:conv:`;
  const allPrefix = `question:${sessionId}:`;
  for (const gid of [...set]) {
    if (gid.startsWith(convPrefix) || (!options?.keepSpecificGateIds && gid.startsWith(allPrefix))) {
      set.delete(gid);
    }
  }
}

export function clearAllResolvedQuestGates(state: InternalWorldStoreState): void {
  resolvedGateIdsByState.delete(state);
  resolvedQuestionReasonsByState.delete(state);
}

function clearResolvedCharacterQuestionGate(
  state: InternalWorldStoreState,
  char: CharacterState,
): void {
  if (
    char.questGate?.kind === "question" &&
    (isQuestGateAlreadyResolved(state, char.questGate.gateId) ||
      isQuestionReasonAlreadyResolved(state, char.sessionId, char.questGate.reason, char.questGate.gateId))
  ) {
    delete state.questGates[char.questGate.gateId];
    char.questGate = null;
    if (char.lifecycleState === "BlockedAtQuestGate") {
      char.lifecycleState = char.activeWorkstation ? "WorkingAtStation" : "RestingInLounge";
    }
  }
}

export function openOrUpdateConversationalQuestGate(
  state: InternalWorldStoreState,
  char: CharacterState,
  convQ: ConversationalQuestionDetection,
  openedAtMs: number,
): boolean {
  const gateId = `question:${char.sessionId}:conv:${convQ.gateHash}`;
  if (
    isQuestGateAlreadyResolved(state, gateId) ||
    isQuestionReasonAlreadyResolved(state, char.sessionId, convQ.reason, gateId)
  ) {
    return false;
  }
  if (char.questGate && char.questGate.gateId !== gateId) {
    delete state.questGates[char.questGate.gateId];
  }
  const gate: QuestGateState = {
    gateId,
    sessionId: char.sessionId,
    roomId: char.roomId,
    kind: "question",
    marker: "?",
    title: convQ.title || "Waiting for User Input",
    reason: convQ.reason,
    openedAtMs: state.questGates[gateId]?.openedAtMs ?? openedAtMs,
    source: "conversational",
    fields: convQ.fields,
  };
  char.questGate = gate;
  state.questGates[gateId] = gate;
  char.lifecycleState = "BlockedAtQuestGate";
  char.dwellUntilMs = null;
  char.deferredLifecycleState = null;
  char.activeWorkstation =
    char.activeWorkstation ??
    char.recentTools.find((r) => r.toolName.toLowerCase() !== "question")?.workstation ??
    "Arcane Lectern";
  return true;
}

export function buildQuestionToolQuestGate(
  state: InternalWorldStoreState,
  char: CharacterState,
  event: Pick<Extract<TelemetryEvent, { type: "tool.started" }>, "callId" | "timestampMs" | "toolInput">,
  nowMs: number = event.timestampMs,
  rawInput: unknown = event.toolInput,
): QuestGateState | null {
  const rawGateId = event.callId ?? `question:${char.sessionId}:${nowMs}`;
  const preserveFrmId =
    char.questGate?.kind === "question" &&
    char.questGate.gateId.startsWith("frm_") &&
    !rawGateId.startsWith("frm_")
      ? char.questGate.gateId
      : null;
  const gateId = preserveFrmId ?? rawGateId;
  if (isQuestGateAlreadyResolved(state, rawGateId) || isQuestGateAlreadyResolved(state, gateId)) {
    clearResolvedCharacterQuestionGate(state, char);
    return null;
  }
  let parsedInput: unknown = rawInput;
  if (typeof parsedInput === "string") {
    try {
      parsedInput = JSON.parse(parsedInput);
    } catch {
      // keep rawInput as-is if not valid JSON
    }
  }
  const firstQ =
    parsedInput && typeof parsedInput === "object" && Array.isArray((parsedInput as { questions?: unknown[] }).questions)
      ? ((parsedInput as { questions: Array<{ header?: string; question?: string }> }).questions[0] ?? null)
      : null;
  const sameExistingGate = char.questGate?.gateId === gateId ? char.questGate : null;
  if (char.questGate && char.questGate.gateId !== gateId) {
    delete state.questGates[char.questGate.gateId];
    char.questGate = null;
  }
  const incomingFields = normalizeQuestGateFields(parsedInput);
  const fields = mergeQuestGateFields(sameExistingGate?.fields, incomingFields);
  const joinedQuestions = incomingFields.map((f) => f.question.trim()).filter(Boolean).join("\n\n");
  const reason =
    joinedQuestions ||
    firstQ?.question?.trim() ||
    fields[0]?.question ||
    sameExistingGate?.reason ||
    char.activeCapability?.inputPreview ||
    "Awaiting user answer";
  if (isQuestionReasonAlreadyResolved(state, char.sessionId, reason, gateId)) {
    recordResolvedQuestGate(state, rawGateId);
    recordResolvedQuestGate(state, gateId);
    clearResolvedCharacterQuestionGate(state, char);
    return null;
  }
  const gate: QuestGateState = {
    gateId,
    sessionId: char.sessionId,
    roomId: char.roomId,
    kind: "question",
    marker: "?",
    title: firstQ?.header?.trim() || fields[0]?.header || sameExistingGate?.title || "Waiting for User Input",
    reason,
    openedAtMs: sameExistingGate?.openedAtMs ?? nowMs,
    source: "form",
    fields,
  };
  char.questGate = gate;
  state.questGates[gate.gateId] = gate;
  return gate;
}

export function handleQuestGateOpened(
  state: InternalWorldStoreState,
  event: PermissionRequestedTelemetryEvent | QuestionAskedTelemetryEvent,
  collector: MutationCollector,
): void {
  const char = state.characters[event.sessionId];
  if (!char) return;
  if (isQuestGateAlreadyResolved(state, event.gateId)) {
    clearResolvedCharacterQuestionGate(state, char);
    return;
  }
  const isPermission = event.type === "permission.requested";
  const kind = isPermission ? "permission" : "question";
  const source = event.source ?? (kind === "permission" ? "permission" : "form");
  const lastMsgRole = char.messages?.[char.messages.length - 1]?.role;
  if (kind === "question" && source === "conversational" && lastMsgRole === "user") {
    return;
  }
  const effectiveGateId =
    kind === "question" &&
    char.questGate?.kind === "question" &&
    char.questGate.gateId.startsWith("frm_") &&
    !event.gateId.startsWith("frm_")
      ? char.questGate.gateId
      : event.gateId;
  if (
    isQuestGateAlreadyResolved(state, effectiveGateId) ||
    (kind === "question" && isQuestionReasonAlreadyResolved(state, char.sessionId, event.reason, effectiveGateId))
  ) {
    recordResolvedQuestGate(state, event.gateId);
    recordResolvedQuestGate(state, effectiveGateId);
    clearResolvedCharacterQuestionGate(state, char);
    return;
  }
  const isSameOpenGate =
    char.questGate?.gateId === effectiveGateId && char.lifecycleState === "BlockedAtQuestGate";
  if (char.questGate && char.questGate.gateId !== effectiveGateId) {
    delete state.questGates[char.questGate.gateId];
    char.questGate = null;
  }
  const incomingFields = event.fields;
  let mergedFields =
    kind === "question"
      ? mergeQuestGateFields(char.questGate?.fields, incomingFields)
      : normalizeQuestGateFields(incomingFields);
  if (kind === "question" && mergedFields.length === 0 && source === "conversational") {
    mergedFields = [...(detectConversationalQuestionPrompt(event.reason)?.fields ?? [])];
  }
  const gate: QuestGateState = {
    gateId: effectiveGateId,
    sessionId: char.sessionId,
    roomId: char.roomId,
    kind,
    marker: isPermission ? "!" : "?",
    title: event.title,
    reason: event.reason,
    openedAtMs: isSameOpenGate ? char.questGate!.openedAtMs : event.timestampMs,
    source,
    fields: mergedFields.length > 0 ? mergedFields : undefined,
    action: event.action,
    resources: event.resources,
  };
  char.questGate = gate;
  state.questGates[gate.gateId] = gate;
  char.lifecycleState = "BlockedAtQuestGate";
  char.dwellUntilMs = null;
  char.deferredLifecycleState = null;
  if (!isSameOpenGate) {
    char.stateEnteredAtMs = event.timestampMs;
    char.lastActivityAtMs = event.timestampMs;
  }
  if (typeof event.sequenceCursor === "number") char.sequenceCursor = Math.max(char.sequenceCursor, event.sequenceCursor);
  syncCharacterWorkflow(char);
  bumpCharacterRevision(state, char.characterId);
  collector.changedCharacterIds.add(char.characterId);
  collector.changedRoomIds.add(char.roomId);
  collector.deltaSessionId = char.sessionId;
  collector.deltaRoomId = char.roomId;
}

export function handleQuestGateResolved(
  state: InternalWorldStoreState,
  event:
    | Extract<TelemetryEvent, { type: "permission.resolved" }>
    | Extract<TelemetryEvent, { type: "question.resolved" }>,
  collector: MutationCollector,
): void {
  const char = state.characters[event.sessionId];
  recordResolvedQuestGate(state, event.gateId);
  if (char?.questGate?.gateId) {
    recordResolvedQuestGate(state, char.questGate.gateId);
  }
  if (char?.questGate?.kind === "question" || event.type === "question.resolved") {
    recordResolvedQuestionReason(state, event.sessionId, char?.questGate?.reason);
    recordResolvedQuestionReason(state, event.sessionId, char?.lastAssistantText);
  }
  delete state.questGates[event.gateId];
  for (const [gid, g] of Object.entries(state.questGates)) {
    if (g.sessionId === event.sessionId) {
      recordResolvedQuestGate(state, gid);
      if (g.kind === "question") recordResolvedQuestionReason(state, event.sessionId, g.reason);
      delete state.questGates[gid];
    }
  }
  if (!char) return;
  for (const rec of char.recentTools) {
    if (rec.callId === event.gateId || rec.toolName.trim().toLowerCase() === "question") {
      if (rec.status === "running") rec.status = "completed";
      recordResolvedQuestGate(state, rec.callId);
    }
  }
  if (event.type === "question.resolved") {
    char.lastAssistantText = null;
  }
  char.questGate = null;
  if (char.lifecycleState === "BlockedAtQuestGate") {
    if (char.activeWorkstation) {
      char.lifecycleState = "WorkingAtStation";
      char.stateEnteredAtMs = event.timestampMs;
    } else {
      transitionCharacterState(state, char, "Thinking", event.timestampMs);
    }
  }
  if (typeof event.sequenceCursor === "number") char.sequenceCursor = Math.max(char.sequenceCursor, event.sequenceCursor);
  syncCharacterWorkflow(char);
  bumpCharacterRevision(state, char.characterId);
  collector.changedCharacterIds.add(char.characterId);
  collector.changedRoomIds.add(char.roomId);
  collector.deltaSessionId = char.sessionId;
  collector.deltaRoomId = char.roomId;
}
