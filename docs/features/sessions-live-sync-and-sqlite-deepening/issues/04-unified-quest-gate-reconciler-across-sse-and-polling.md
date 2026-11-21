# 04: Unified Quest Gate Reconciler Across Live SSE & Full-Turn Hydration

Type: grilling
Label: wayfinder:grilling
Status: resolved
Blocked by: 01

## Question

How should **Quest Gate** detection, ID correlation, and resolution (`!` for `Permission.Request`, `?` for `question` tool and conversational assistant questions) be unified across `src/ingress/daemon-sse-mapper.ts`, `src/ingress/daemon-message-hydration.ts`, `src/ingress/daemon-location-state.ts`, `src/state/quest-gate-handlers.ts`, and `src/state/batch-reconciler.ts` so input signals are never missed on SSE, skipped for subagents, wiped by 15s polling, or stuck on ID mismatches?

## Answer

Confirmed in Grilling Round 1 (`Q4`):
1. **Shared Conversational `?` Question Detector Across SSE & Hydration**:
   - Extract a shared pure helper `detectConversationalQuestionPrompt(text: string): { isQuestion: boolean; reason: string } | null` used by both `hydrateSessionMessages` (`src/ingress/daemon-message-hydration.ts`) and `handleSessionIdle` / `handleSessionStatus` (`src/state/session-handlers.ts`).
   - When a session transitions to `idle` over SSE (`session.idle` or `session.status: "idle"`) and has no open gate yet, inspect `char.lastAssistantText`: if `detectConversationalQuestionPrompt` matches, open a `question` **Quest Gate** (`marker: "?"`, `BlockingAtQuestGate`) immediately in real time instead of sending the character to `RestingInLounge`.
2. **Full-Turn Message Inspection & Subagent Hydration**:
   - In `hydrateSessionMessages` (`src/ingress/daemon-message-hydration.ts:157–214`), remove the unconditional `break;` at `line 213` after `messages[0]`; instead, inspect all assistant messages in the latest turn up until the most recent `user` message (`if (msgRole === "user") break;`) so a trailing step/metadata envelope never hides an active `question` tool part or conversational `?` prompt.
   - In `fetchDaemonLocationState` (`src/ingress/daemon-location-state.ts:229–245`), include active and recently updated **Squad Subagent**s and root sessions in `hydrateSessionIds`.
3. **Canonical Per-Session Gate Slot & Reconnect Preservation**:
   - In `src/state/quest-gate-handlers.ts`, maintain at most one active gate per `sessionId`: opening a gate for `sessionId` removes any previous `state.questGates` entry for that `sessionId` and stores alias IDs (`gateId`, `callId`, `formId`).
   - In `handlePermissionOrQuestionResolved` (`src/state/quest-gate-handlers.ts:101–128`), match by `gate.gateId === event.gateId || gate.callId === event.gateId || gate.sessionId === event.sessionId` so replying to a permission or form always clears `char.questGate` and transitions the character out of `BlockedAtQuestGate`.
   - In `handleStreamReconnected` (`src/state/batch-reconciler.ts:321–330`), preserve an existing `char.questGate` on a session that is still idle/blocked if the gate was opened via SSE within the current turn and has not been resolved.

## Acceptance Criteria

- [x] Conversational assistant questions ending with `?` or `❓` open a `?` **Quest Gate** (`BlockedAtQuestGate`) immediately when `session.idle` arrives over SSE as well as during HTTP message hydration.
- [x] `hydrateSessionMessages` inspects all assistant messages in the latest turn (until the most recent `user` message) and hydrates both root **Guild Adventurer**s and **Squad Subagent**s.
- [x] Resolving a permission (`!`) or question (`?`) gate by `gateId`, `callId`, `formId`, or `sessionId` always clears `char.questGate` and `state.questGates`, and 15s reconnect sweeps do not wipe unresolved SSE gates.
