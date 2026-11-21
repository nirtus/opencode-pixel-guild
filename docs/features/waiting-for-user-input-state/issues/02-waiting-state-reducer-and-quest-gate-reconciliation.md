# 02: Waiting State Reducer & Quest Gate Reconciliation

Type: task
Label: wayfinder:task
Status: resolved
Blocked by: 01

## Question

Building on [01: Ingress Detection for Tool & Conversational User Questions](./01-ingress-conversational-and-tool-question-detection.md), how should `WorldStateReducer` (`src/state/session-handlers.ts`, `src/state/tool-and-gate-handlers.ts`, `src/state/batch-reconciler.ts`, and `src/web/client-state.ts`) maintain the character in a waiting state (`BlockedAtQuestGate` with `?` marker) instead of transitioning them to `RestingInLounge`?

## Specification

- In `src/state/tool-and-gate-handlers.ts`:
  - When `tool.started` runs with `toolName === "question"`, open a question `QuestGateState` (`kind: "question"`, `marker: "?"`) and transition the character to `BlockedAtQuestGate` while preserving their last active workstation (or defaulting to `"Arcane Lectern"`).
  - When `message.user.prompt` or a subsequent non-question `tool.started` arrives, clear any existing question `questGate` on the character so they resume active work.
- In `src/state/session-handlers.ts` and `src/state/batch-reconciler.ts`:
  - Ensure that a session with an active `questGate` (`BlockedAtQuestGate`) is not overwritten to `RestingInLounge` during location reconciliation (`handleStreamReconnected`), and transitions to `BlockedAtQuestGate` whenever `pendingQuestions` or `pendingPermissions` includes the session.
- In `src/web/client-state.ts`:
  - Update `isCharacterActivelyOpen` to check `c.lifecycleState === "BlockedAtQuestGate" || Boolean(c.questGate)` alongside legacy state checks so waiting characters remain visible in Active Squads mode.
- Add unit tests in `tests/` verifying reducer state transitions for `question` tool calls, conversational question gates across `stream.reconnected`, and resolution on `message.user.prompt`.

## Answer

Updated `handleToolStarted`, `handleToolCompleted`, and `handleMessageUserPrompt` in `src/state/tool-and-gate-handlers.ts` so `question` tool calls open a `QuestGateState` (`kind: "question"`, `marker: "?"`), transition the character to `BlockedAtQuestGate` while preserving their last active workstation (defaulting to `"Arcane Lectern"`), and clear the gate on user prompt or subsequent tool activity. Updated `handleStreamReconnected` in `src/state/batch-reconciler.ts` and `isCharacterActivelyOpen` in `src/web/client-state.ts` so sessions with pending questions stay in `BlockedAtQuestGate` rather than `RestingInLounge`.
