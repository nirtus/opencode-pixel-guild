# 01. Deepen the Quest Gate Lifecycle Module in WorldStateReducer

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: none

## Context

Currently, **Quest Gate** state mutations (`char.questGate` and `state.questGates[gateId]`) leak across five reducer modules (`src/state/quest-gate-handlers.ts`, `src/state/session-handlers.ts`, `src/state/tool-and-gate-handlers.ts`, `src/state/batch-reconciler.ts`, and `src/state/reducer-helpers.ts`). When a question is answered in actual OpenCode (TUI/CLI/web):
- `handleSessionStatus` (`session-handlers.ts`) transitions the character to `"thinking"` or `"working"` without clearing `char.questGate`, so `handleSessionIdle` later forces the character back to `BlockedAtQuestGate`.
- `mergeHydratedRecentTools` (`reducer-helpers.ts`) marks the `question` tool `completed` in `char.recentTools` without settling `char.questGate`.
- `handleSessionUpserted` (`session-handlers.ts`) leaves conversational gates open when a new assistant turn completes without a question.
- `handleMessageUserPrompt` (`tool-and-gate-handlers.ts`) returns early when `alreadyProgressedTurn` is true before clearing `char.questGate`.
- `session-handlers.ts` and `batch-reconciler.ts` import `detectConversationalQuestionPrompt` from `../ingress/daemon-message-hydration.ts` instead of `../types/domain.ts`.

## Requirements

1. **Consolidate Gate Settlement in `src/state/quest-gate-handlers.ts`**:
   - Add a canonical helper `settleCharacterQuestGate(state, char, timestampMs?)` that records `char.questGate.gateId` (and `char.questGate.reason` for questions) in `resolvedGateIdsByState` / `resolvedQuestionReasonsByState`, deletes `state.questGates[char.questGate.gateId]`, and sets `char.questGate = null`.
   - Call `settleCharacterQuestGate` whenever:
     - `handleSessionStatus` transitions a character to `"thinking"` or `"working"`.
     - `handleToolStarted` starts a non-question tool while `char.questGate` is open.
     - `handleToolCompleted` completes a tool where `toolName.toLowerCase() === "question"` or `event.callId === char.questGate?.gateId`.
     - `mergeHydratedRecentTools` merges a completed `question` tool (`toolName.toLowerCase() === "question"` or `callId === char.questGate?.gateId` with `status === "completed"`).
     - `handleMessageUserPrompt` receives a user prompt (settle `char.questGate` *before* the `alreadyProgressedTurn` early return).
     - `handleSessionUpserted` updates a session whose `char.questGate?.source === "conversational"` and either `latestMsgRole === "user"` or (`event.lastAssistantText` is non-empty and `detectConversationalQuestionPrompt(event.lastAssistantText)` is `null`).
2. **Eliminate `state -> ingress` Import Inversion**:
   - Import `detectConversationalQuestionPrompt` in `src/state/session-handlers.ts` and `src/state/batch-reconciler.ts` from `../types/domain.ts`.
3. **Unit Tests & Line Ceiling**:
   - Add unit tests in `tests/` covering all 4 settlement signals in `WorldStateReducer`.
   - Keep all files under `src/` strictly `<= 400` lines.

## Answer

- Consolidated Quest Gate settlement into `settleCharacterQuestGate` in `src/state/quest-gate-handlers.ts` and wired it across `src/state/session-handlers.ts`, `src/state/reducer-helpers.ts`, and `src/state/tool-and-gate-handlers.ts` so gates automatically clear on `thinking`/`working` transitions, completed `question` tool hydrations, non-question assistant turns, and `message.user.prompt` events.
- Replaced `../ingress/daemon-message-hydration.ts` imports in `src/state/session-handlers.ts` and `src/state/batch-reconciler.ts` with `../types/domain.ts`.
- Verified with unit tests in `tests/51-quest-gate-sync-and-bypass.test.ts` and live Docker container deployment (`opencode-pixel-guild-visualizer` on port `4310`).

