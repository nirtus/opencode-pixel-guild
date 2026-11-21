# 04: Long-Session Memory Bounding, Archived Payload Trimming & Live Docker Verification

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 02, 03

**What to build:** Bound long-running client and server memory collections by capping `walker.seenToolCallIds`, pruning orphaned per-session client UI Maps/Sets when sessions leave `snapshot.characters`, and compacting heavy in-memory transcript and tool output payloads on `Archived` sessions after SQLite persistence, then update repository documentation (`README.md`, `GLOSSARY.md`, `docs/adr/`) and deploy/verify on the live `opencode-pixel-guild-visualizer` Docker container (`port 4310`).

## Acceptance Criteria

- [x] Keep all files under `src/` strictly `<= 400` lines (`tests/00-architecture-invariants.test.ts`).
- [x] In `src/web/character-action-queue.ts` and `src/web/client-choreography.ts`, cap `walker.seenToolCallIds` at `<= 120` entries (retaining all call IDs currently in `c.recentTools` while evicting the oldest historical call IDs) so long-running sessions with hundreds of tool executions never grow `seenToolCallIds` unboundedly.
- [x] Prune deleted session IDs from client UI Maps and Sets (`expandedChatMessageIds`, `resolvedClientPromptsBySession`, `draftPromptsBySession`, `draftDeliveryBySession`, `draftGateAnswersByGateId`, `collapsedGateIds`, `draftAgentModeBySession`, `skillOffsetByScope`, `skillFilterByScope`) whenever sessions are pruned from `clientState.characterWalkers` / `snapshot.characters`.
- [x] In `src/state/reducer-helpers.ts` / `src/state/session-handlers.ts`, when a character transitions to `Archived` (and after its messages are saved in the **Guild Chronicle Store**), compact its in-memory payload (`recentTools[].outputPreview` trimmed to `<= 240` chars on completed non-error tools, and `char.messages` capped to the latest `6` turns in memory while full 60-turn history remains in SQLite `session_messages` and re-hydrates on demand if selected in `Full Lineage` mode), keeping `buildSnapshot()` `structuredClone` and SSE JSON sizes compact over multi-day runs.
- [x] Update `README.md`, `GLOSSARY.md`, and `docs/adr/` to document the runtime performance and memory-bounding invariants, refresh `docs/graphify-out/`, deploy to the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up`), run the full `npm test` suite, and capture/inspect visual proof at `docs/images/visualizer-runtime-performance-and-stutter-fix.png`.

## Answer

- Bounded `walker.seenToolCallIds` at `MAX_WALKER_SEEN_TOOL_CALL_IDS = 120` via `pruneWalkerSeenToolCallIds()` / `createBoundedSeenToolCallIds()` (`src/web/action-queue-sync-key.ts`, wired into `src/web/character-action-queue.ts` and `src/web/client-choreography.ts`), always protecting current `c.recentTools` call IDs.
- Created `src/web/session-cache-pruner.ts` (`pruneDeletedSessionClientCaches`, guarded against pre-hydration `version === 0` empty boots and snapshot-version fast-pathed) wired into `src/web/client-choreography.ts` and `src/web/side-panel-reconciler.ts`, pruning `expandedChatMessageIds`, `resolvedClientGateIds` (capped at 256), `resolvedClientPromptsBySession`, draft/viewed/skill-browser maps, hydration guards, and dispatch log caches.
- Created `src/state/archived-payload-compactor.ts` (`compactArchivedCharacterPayload`) and added `onBeforeArchiveCharacter` on `WorldStateReducer` (`src/state/reducer-types.ts`, `src/state/world-reducer.ts`, `src/state/reducer-helpers.ts`, `src/state/batch-reconciler.ts`), wired in `src/server/operator-registry.ts` to flush full `char.messages` to SQLite `session_messages` immediately before compacting in-memory `Archived` characters to 6 turns and `<= 240`-char completed non-error tool previews (re-compacting across 15s sweeps and falling back to SQLite `getStoredSessionMessages` in `GET /api/guild/session/:id/messages`).
- Updated `README.md`, `GLOSSARY.md`, `docs/adr/0004-runtime-performance-sse-coalescing-and-memory-bounds.md`, and refreshed `docs/graphify-out/`.
- Deployed via `npm run docker:up` on `opencode-pixel-guild-visualizer` (`0.0.0.0:4310->4310/tcp`, healthy, `HTTP 200`, verified live container snapshot holds `31` `Archived` characters capped at `maxArchivedMessagesInMemory: 6`), passed `npm test` (401/401 tests, 0 failures), and visually verified live output in `docs/images/visualizer-runtime-performance-and-stutter-fix.png`.
