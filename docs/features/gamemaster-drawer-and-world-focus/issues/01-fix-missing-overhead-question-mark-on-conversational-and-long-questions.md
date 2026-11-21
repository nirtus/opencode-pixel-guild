# 01: Fix Missing Overhead Question Mark (`?`) on Conversational & Long Questions

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: None (can start immediately)

**What to build:** Fix the multi-layer ingress, reducer, and canvas routing bug where a **Guild Character** asking conversational/grilling questions (`❓ **Q1** ...` or a trailing question) fails to display the `?` **Quest Gate** marker above its head and instead sits in the **Break Lounge** as `Resting`.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] **SSE Long-Message Question Retention (`src/ingress/daemon-sse-mapper.ts`)**: Raise `lastAssistantText` retention on `session.text.ended`, `message.part.updated`, `message.updated`, and `session.message.content.updated` from `4,000` to `16,000` characters (preserving the tail when text exceeds `16,000` chars so questions at the end of a long architectural review are never chopped off).
- [x] **Idle Session Hydration Cache & Timestamp Fix (`src/ingress/daemon-location-state.ts`)**: Include `s.time?.idle` and `s.time?.busy` in `resolveSessionActivityMs(s)`, never write failed (`null`) hydrations into `idleMessageHydrationCache`, and invalidate `idleMessageHydrationCache` whenever a session transitions from active to idle so newly completed turns are always hydrated.
- [x] **Remove Premature 10-Minute Question Gate Deletion (`src/ingress/daemon-message-hydration.ts`, `src/ingress/daemon-location-state.ts`, `src/state/batch-reconciler.ts`)**: Remove the `600,000 ms` (`10 minute`) cutoff that deletes unanswered conversational **Quest Gate**s on open (non-archived) sessions while the operator is reading and answering questions.
- [x] **Reconcile Conversational Questions Across Sweep, Upsert & On-Demand Fetch (`src/state/batch-reconciler.ts`, `src/state/session-handlers.ts`, `src/server/api-router.ts`)**:
  - In `handleStreamReconnected`, preserve existing conversational `questGate`s (or open one via `detectConversationalQuestionPrompt(char.lastAssistantText)`) when the session is idle, non-archived, and has no newer user reply after the assistant question.
  - In `handleSessionUpserted` and `handleSessionStatus("idle")`, check `detectConversationalQuestionPrompt(char.lastAssistantText)` when `char.lifecycleState === "RestingInLounge"` or transitioning to idle, transitioning the character to `BlockedAtQuestGate`.
  - In `GET /api/guild/session/:id/messages` (`src/server/api-router.ts`), if `hydrated.pendingQuestion` is present, dispatch `question.requested` so selecting a character immediately reconciles its **Quest Gate**.
- [x] **Canvas Station Routing Priority (`src/web/station-and-workflow-routing.ts`)**: Evaluate `isWaitingAtGate` (`c.lifecycleState === "BlockedAtQuestGate" || Boolean(c.questGate)`) *before* the `RestingInLounge` fallback so any character with an open `questGate` stands at its station with `questMarker: "?" | "!"` above its head.
- [x] **Unit & Integration Tests**: Add tests verifying that a 6,000+ character assistant message ending with `❓ **Q1** - ...` opens a `?` **Quest Gate**, survives `stream.reconnected` sweeps and `timer.tick` events beyond 10 minutes, and renders `questMarker: "?"` on the canvas until answered by a `message.user.prompt`.

## Answer

Implemented and verified with unit/integration tests in `tests/24-gamemaster-drawer-and-world-focus.test.ts` and live 1600x1000 headless Chrome screenshots in `docs/images/`.
