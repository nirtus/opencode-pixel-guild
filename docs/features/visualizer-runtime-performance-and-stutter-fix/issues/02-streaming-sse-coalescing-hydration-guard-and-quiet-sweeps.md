# 02: High-Frequency Streaming SSE Coalescing, On-Demand Hydration Loop Prevention & Quiet 15s Sweeps

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01

**What to build:** Prevent high-frequency token streaming and on-demand message hydration from flooding the server and browser with redundant full-snapshot SSE broadcasts, and silence no-op 15-second background location sweeps so idle or streaming sessions never trigger self-amplifying HTTP → reducer → SSE feedback loops or periodic 15-second Git re-poll hitches.

## Acceptance Criteria

- [x] Keep all files under `src/` strictly `<= 400` lines (`tests/00-architecture-invariants.test.ts`).
- [x] In `src/web/side-panel-reconciler.ts`, only fire on-demand `GET /api/guild/session/:id/messages` when the **Character Sheet** is actively visible (`clientState.mobileActiveTab === "character"`), and gate/throttle the fetch so mid-turn tool/activity timestamp ticks do not repeatedly re-fetch `/messages` on every SSE frame while a turn is already streaming.
- [x] In `src/server/api-router.ts` (`GET /api/guild/session/:id/messages`), compare the hydrated message, tool, and Quest Gate digest against the character's current state in `activeReducer.getSnapshot()` and skip dispatching redundant `session.upserted` events when nothing changed, returning the current snapshot without bumping `snapshot.version` or broadcasting a redundant SSE frame.
- [x] In `src/server/operator-registry.ts` (and `src/server/main.ts`), broadcast lifecycle, tool, Quest Gate, room, and deletion emissions immediately (`0ms`), while coalescing rapid passive streaming `session.upserted` SSE broadcasts over a short trailing window (`~60–80ms`) when SSE clients are connected so burst token streams do not serialize and send dozens of multi-megabyte snapshots per second.
- [x] In `src/ingress/opencode-client-adapter.ts` (`runSweepAllLocations`), track per-location catalog and task progress digests and skip pushing redundant `catalog.hydrated` and `tasks.hydrated` events on routine 15s background sweeps (`isReconnect === false`) when unchanged; in `src/web/app-main.ts`, avoid triggering `refreshRoomGitState()` on routine `stream.reconnected` frames unless the selected room lacks cached Git state or its `taskProgress` changed.
- [x] Add tests at the WorldStateReducer / SSE / Adapter seam verifying no-op `/messages` hydration does not bump `snapshot.version`, routine 15s sweeps do not re-emit unchanged `catalog.hydrated` / `tasks.hydrated`, and `reconcileSidePanel` does not fetch `/messages` when viewing the **Guild Master Ledger**.

## Answer

- Created `src/web/session-message-hydration-guard.ts` and wired it into `src/web/side-panel-reconciler.ts` to gate `/api/guild/session/:id/messages` fetches on `mobileActiveTab === "character" && isSheetVisible`, throttle mid-turn streaming ticks (`4000ms` cooldown) while firing immediately on hero selection and turn boundaries, and roll back cache records on transient fetch errors.
- Created `src/server/session-hydration-diff.ts` (`dispatchHydratedSessionIfChanged`) wired into `src/server/api-router.ts` (with shared `isPendingQuestionCompletedByTools` parity against ADR-0003 and SQLite `getStoredSessionMessages` fallback) so unchanged or shorter stale `/messages` payloads do not bump `snapshot.version` or broadcast redundant SSE frames.
- Created `src/server/sse-broadcaster.ts` (`createSseBroadcaster`, `70ms` trailing coalesce window for passive streaming `session.upserted` bursts, `0ms` immediate delivery for lifecycle/tool/Quest Gate/room/deletion deltas) wired into `src/server/operator-registry.ts` and `src/server/main.ts`.
- Created `src/ingress/adapter-sweep-digests.ts` (per-location catalog digests keyed by `locMeta.directory` and reset-aware task progress digests) wired into `src/ingress/opencode-client-adapter.ts`, and `src/web/sse-git-refresh-guard.ts` (checking `!hasCachedGitState`, `taskProgress`, and `activeSessionIds` on `stream.reconnected`) wired into `src/web/app-main.ts`.
- Verified with `tests/52-visualizer-runtime-performance.test.ts` (Ticket 02 Slices 1–4), full `npm test`, and live deployment on `opencode-pixel-guild-visualizer` (`port 4310`).
