# 01: Idle-Safe `timer.tick` Short-Circuit, Bounded Transcript History & Deduplicated Server Polling

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: None (can start immediately)

**What to build:** Eliminate the 1 Hz multi-megabyte `structuredClone` and SSE broadcast storm during idle `timer.tick` intervals, cap per-character in-memory chat transcripts with deterministic message IDs so `GuildSnapshot` never grows without bound, and skip redundant unauthenticated daemon sweeps when operator authentication is enabled.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Short-circuit `timer.tick` in `WorldStateReducer` when zero rooms and zero characters changed (`collector.changedRoomIds.size === 0 && collector.changedCharacterIds.size === 0`) so it does not bump `state.version`, call `buildSnapshot()` (`structuredClone`), or broadcast to SSE subscribers.
- [x] Skip `JSON.stringify(emission)` in `OperatorWorkspaceRegistry` and `createGuildCompanionServer` whenever `sseClients.size === 0`, and skip starting the redundant unauthenticated 15s `pollTimer` in `main.ts` when `requireAuth: true`.
- [x] Cap `char.messages` to the most recent `60` messages (`MAX_IN_MEMORY_SESSION_MESSAGES = 60`) in `handleSessionUpserted` and `handleMessageUserPrompt`, and replace shifting reverse-index fallback IDs (`${orderedMessages.length - mIdx}`) in `hydrateSessionMessages` with deterministic message IDs so re-hydration never creates duplicate message rows.

## Answer

Short-circuited no-op `timer.tick` dispatches in `src/state/world-reducer.ts`, guarded SSE serialization when `sseClients.size === 0` in `src/server/operator-registry.ts` and `src/server/main.ts`, removed the duplicate unauthenticated 15s daemon sweep in `src/server/main.ts`, assigned deterministic timestamp-backed fallback message IDs in `src/ingress/daemon-message-hydration.ts`, and capped in-memory `char.messages` to 60 turns in `src/state/session-handlers.ts` and `src/state/tool-and-gate-handlers.ts`.
