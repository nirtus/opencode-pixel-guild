# 04. Fix Consecutive & Mid-Turn Question Gate Drops Across Reducer and Ingress

Type: bug
Label: ready-for-agent
Status: open
Blocked by: none

## Context

Following the initial implementation of two-way **Quest Gate** settlement, Question Gates became unreliable in live OpenCode sessions—specifically failing to appear on consecutive questions (2nd+ question in a session) or disappearing within milliseconds of being asked even while the actual OpenCode session displays an active question.

Diagnosis (`@diagnosing-bugs`) identified five interacting root causes:

1. **Historical `recentTools` OR-Condition Kills Every 2nd+ Question in a Session (`src/state/reducer-helpers.ts:258-264`, `src/ingress/daemon-message-hydration.ts:354`, `src/server/api-router.ts:232`)**:
   - All three locations evaluate whether a question gate is completed via:
     ```ts
     r.status === "completed" && (r.callId === gateId || r.toolName.trim().toLowerCase() === "question")
     ```
   - Because `recentTools` stores up to 30 historical tool executions across the session, once a session completes **one** `question` tool in Turn 1, `r.toolName.trim().toLowerCase() === "question" && r.status === "completed"` remains permanently `true` for the rest of the session. Every subsequent question (Question #2, Question #3, whether a structured `question` tool or a conversational question) immediately evaluates `pqDone = true` and is settled and blacklisted by `mergeHydratedRecentTools`.

2. **Same-Turn `session.status` (`"thinking"` / `"working"`) & Mid-Stream Text Frames Destroy Newly Opened Question Gates (`src/state/session-handlers.ts:171-177,253-256`, `src/ingress/daemon-sse-mapper.ts:135-148,192-204`)**:
   - `daemon-sse-mapper.ts` maps `session.status: { type: "busy" }`, `session.step.streamed`, and `session.reasoning.ended` to `{ type: "session.status", status: "thinking" }`.
   - In OpenCode V2, while a `question` tool is running/waiting or immediately after `tool.started` / `question.asked` / streaming text is emitted in the same step, OpenCode emits `session.status: { type: "busy" }` or `session.step.streamed`.
   - `handleSessionStatus` (`src/state/session-handlers.ts:253-256`) unconditionally calls `settleCharacterQuestGate(state, char, { clearLastAssistantText: char.questGate.kind === "question" })`, which destroys the active gate, sets `char.lastAssistantText = null`, marks running `question` tools in `char.recentTools` as `"completed"`, and permanently blacklists `gateId` and `reason` in `resolvedGateIdsByState` / `resolvedQuestionReasonsByState`.
   - Similarly, `handleSessionUpserted` (`src/state/session-handlers.ts:171-177`) opens and settles conversational gates on partial mid-stream `message.part.updated` text chunks; if a subsequent text chunk or `session.step.streamed` arrives before `session.idle`, the conversational gate is settled and blacklisted before the assistant finishes speaking.

3. **Generic `"Awaiting user answer"` Fallback Reason Poisons `resolvedQuestionReasonsByState` on `status: "pending"` Tool Frames (`src/state/quest-gate-handlers.ts:35-53,188-255`)**:
   - In OpenCode V2, `message.part.updated` for `part.type === "tool"` first fires with `part.state.status === "pending"` and empty `part.state.input = {}` while the model is still streaming tool call JSON arguments.
   - `buildQuestionToolQuestGate` falls back to `reason = "Awaiting user answer"` when `fields` is empty. When that gate is settled, `recordResolvedQuestionReason` records `"Awaiting user answer"` in `resolvedQuestionReasonsByState`.
   - When the next `question` tool call starts with `status: "pending"` and `input: {}`, `isQuestionReasonAlreadyResolved(state, char.sessionId, "Awaiting user answer", gateId)` returns `true` and lines 235–236 call `recordResolvedQuestGate(state, rawGateId)`—blacklisting the new `callId` before its `status: "running"` frame with the actual `questions` array arrives.

4. **`settleCharacterQuestGate` Blindly Marks Newly Hydrated `"running"` `question` Tools as `"completed"` and Resolved (`src/state/session-handlers.ts:168-174`, `src/state/quest-gate-handlers.ts:119-123`)**:
   - In `handleSessionUpserted`, `mergeHydratedRecentTools` runs at line 168 (adding any new `status: "running"` `question` tool to `char.recentTools`) *before* line 173 checks `if (char.questGate?.source === "conversational" && ...)` and calls `settleCharacterQuestGate(state, char)`.
   - Inside `settleCharacterQuestGate`, lines 119–123 loop over all `char.recentTools` where `rec.toolName === "question"`, force `rec.status = "completed"`, and call `recordResolvedQuestGate(state, rec.callId)`—killing the brand-new running `question` tool that was just merged 5 lines earlier.

5. **`part.id` (`prt_...`) vs `part.callID` (`call_...`) vs `/api/question` (`que_...`) ID Mismatch Across SSE and HTTP (`src/ingress/daemon-message-hydration.ts:148,291`, `src/ingress/daemon-location-state.ts:103,227`, `src/ingress/daemon-command-ops.ts:347-362`)**:
   - `daemon-sse-mapper.ts:339` uses `part.callID ?? part.id` (`call_...`), whereas `daemon-message-hydration.ts:148,291` uses `part.id ?? part.callID` (`prt_...`).
   - OpenCode V2 exposes pending `question` tool requests at `/api/question` (with `id: "que_..."` and `tool.callID: "call_..."`), whereas `daemon-location-state.ts` and `daemon-command-ops.ts` only query `/api/form`.

## Requirements

1. **Fix `recentTools` Question Completion Checks (`src/state/reducer-helpers.ts`, `src/ingress/daemon-message-hydration.ts`, `src/server/api-router.ts`)**:
   - Never treat a question gate (`pq` or `char.questGate`) as completed merely because *some* historical tool in `recentTools` has `toolName === "question"` and `status === "completed"`.
   - A question gate is completed by `recentTools` **only** if:
     - For a conversational gate (`source === "conversational"`): never completed by a historical `question` tool record in `recentTools`.
     - For a structured `form` / `question` tool gate: there is NO `question` tool with `status === "running"` in `recentTools`, AND either a tool record with `r.callId === gateId` has `status === "completed"` or (when `gateId` is a `que_...` / `frm_...` / `question:${sessionId}` ID that differs from `call_...`) the **newest** `question` tool in `recentTools` has `status === "completed"` and `startedAtMs >= gate.openedAtMs - 5_000`.
2. **Prevent Placeholder Reason Poisoning & Premature `status: "pending"` Blacklisting (`src/state/quest-gate-handlers.ts`, `src/ingress/daemon-sse-mapper.ts`)**:
   - Do not record or match generic placeholder strings (`"Awaiting user answer"`, `"Waiting for User Input"`, `"Question Prompt"`, `"Permission Request"`, `"tool"`, `"question"`) in `recordResolvedQuestionReason` or `isQuestionReasonAlreadyResolved`.
   - In `daemon-sse-mapper.ts` (`message.part.updated` for `part.type === "tool"`), do not emit `tool.started` for `toolName === "question"` when `status === "pending"` and `part.state?.input` / `part.input` has no `questions` / `fields` yet (wait for `status === "running"` or non-empty input, or allow `buildQuestionToolQuestGate` to update in-place without blacklisting when `incomingFields.length === 0`).
   - When a new `question` tool starts or `question.asked` / `form.asked` arrives with a new `gateId` / `callId`, clear any stale conversational resolved reasons for that session so a new question turn is never blocked by prior turn state.
3. **Protect Active Question Gates from Same-Turn `"thinking"` / `"busy"` Status & Mid-Stream Churn (`src/state/session-handlers.ts`, `src/state/quest-gate-handlers.ts`)**:
   - In `handleSessionStatus` (`src/state/session-handlers.ts`):
     - Do **not** call `settleCharacterQuestGate` on `status === "thinking"` or `"working"` if `char.questGate?.source === "form"` (a structured `question` tool / form gate) while a `question` tool is currently `"running"` in `char.recentTools` (or when the gate was just opened in the current step and no `tool.completed` / `question.resolved` / `message.user.prompt` has occurred). Keep `char.lifecycleState = "BlockedAtQuestGate"`.
     - For `char.questGate?.source === "conversational"`, if `status === "thinking"` or `"working"` arrives while the assistant is still streaming the same turn, clear `char.questGate` without blacklisting `char.lastAssistantText` in `resolvedQuestionReasonsByState` so that when `session.idle` arrives at the end of the turn, `handleSessionIdle` can open the final conversational gate cleanly.
   - In `settleCharacterQuestGate` (`src/state/quest-gate-handlers.ts`):
     - Only mark a `char.recentTools` record as `completed` / resolved if `gateId && rec.callId === gateId` (or if `char.questGate?.source === "form"` and `rec.status === "running"` and we are explicitly settling that form gate, **never** when settling a `source === "conversational"` gate).
   - In `handleSessionUpserted` (`src/state/session-handlers.ts`):
     - Settle any superseded `source === "conversational"` gate **before** `mergeHydratedRecentTools` runs, or ensure settling a conversational gate never touches `char.recentTools`.
4. **Unify `callID` vs `id` and Support OpenCode V2 `/api/question` (`src/ingress/daemon-message-hydration.ts`, `src/ingress/daemon-location-state.ts`, `src/ingress/daemon-command-ops.ts`)**:
   - In `src/ingress/daemon-message-hydration.ts` (lines 148 and 291), prefer `part.callID ?? part.id` (matching `daemon-sse-mapper.ts:339`) so SSE `tool.started` and HTTP message hydration use identical `call_...` IDs.
   - In `src/ingress/daemon-location-state.ts`, fetch `/api/question${query}` alongside `/api/form${query}` (merging any pending questions and mapping `q.tool?.callID` / `q.id` and `q.questions` / `q.fields`).
   - In `src/ingress/daemon-command-ops.ts`, include `/api/question` (and `POST /api/question/:id/reply` / `POST /api/question/:id/reject`) alongside `/api/form` when resolving or dismissing a structured `source === "form"` question gate.
5. **Regression Tests & Live Container Verification**:
   - Add deterministic unit/integration tests in `tests/51-quest-gate-sync-and-bypass.test.ts` reproducing:
     1. Two consecutive `question` tool calls in the same session (Question 1 answered -> Question 2 asked via `pending` empty input -> `running` with questions + `session.status: "thinking"` + message hydration with Question 1 in `recentTools`).
     2. A conversational question in Turn 1 followed by a `question` tool call in Turn 2 (and vice versa).
     3. Same-turn `session.status: { type: "busy" }` / `session.step.streamed` arriving right after `tool.started (question)` or `question.asked`.
   - Keep all files under `src/` strictly `<= 400` lines (`tests/00-architecture-invariants.test.ts`).
   - Deploy to `opencode-pixel-guild-visualizer` on port `4310` (`npm run docker:up`), run `npm test`, and capture visual proof.
