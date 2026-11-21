# 02: Session Delete & Demolition Bomb Lifecycle (Persistent Spinners, Strict Tombstones & Parallel Teardown)

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01: Keyed Spectator Drawer Reconciler, Hover Stability & Monotonic Snapshot Gate

**What to build:** Deliver render-persistent `⏳ Deleting...` and `⏳ Demolishing...` button spinners, fast parallelized server teardown, and permanent non-resurrection for deleted **Guild Characters** (`DELETE /api/guild/session/:id`) and demolished **Workshop Rooms** (`DELETE /api/guild/room` via the **Demolition Bomb**) so deleted sessions and demolished worlds never reappear in the **Active Room Roster**, **Character Sheet**, top-bar `Worlds:` strip, or **Guild Floorplan**.

**Blocked by:** `01: Keyed Spectator Drawer Reconciler, Hover Stability & Monotonic Snapshot Gate`

**Status:** resolved

## Acceptance Criteria

- [x] Every source file remains strictly `<= 400` lines (`tests/00-architecture-invariants.test.ts`).
- [x] **Render-Persistent Spinners on Kill Character & Demolition Bomb**:
  - Clicking `#btn-confirm-kill-character` records the session in `killingSessionIds`, immediately renders the button `disabled` with `"⏳ Deleting..."` across any SSE frames while in flight, records the deleted session tombstone in `applyAuthoritativeSnapshot` upon completion, and clears `pendingKillSessionId`.
  - Clicking `#btn-confirm-demolish-room` (and `#btn-demolish-active-room`) records the room in `demolishingRoomIds`, immediately renders `"⏳ Demolishing..."` + `disabled` across SSE frames while in flight, and records the demolished room tombstone upon completion.
- [x] **Permanent Non-Resurrection of Deleted Guild Characters (`deletedSessionIds`)**:
  - Ensure `POST /api/guild/command` (`session.view` and all other commands) returns the latest post-await `activeReducer.getSnapshot()` rather than a stale pre-await `preDispatchedViewEmission.snapshot`.
  - In `runSweepAllLocations`, re-verify `deletedSessionIds` after all async `await` boundaries inside the location loop before emitting `stream.reconnected` or `tool.started`.
  - In `hydrateFromSnapshot`, filter `persisted.deletedSessionIds` out of every room's `characterIds` and `activeSessionIds` in addition to `state.characters`.
  - Prune client-tombstoned `clientDeletedSessionIds` inside `applyAuthoritativeSnapshot` so out-of-order HTTP responses cannot resurrect a deleted character.
- [x] **Permanent Non-Resurrection of Demolished Workshop Rooms (`deletedRoomIds`) & Tombstone-First Parallel Teardown**:
  - Mark `session.updated` and `message.updated` SSE events (when not `session.created`) with `preserveActivityTimestamp: true`, and forbid both the client adapter (`deletedRoomDirs`) and reducer (`state.deletedRoomIds`) from clearing a room tombstone on passive `session.updated` or `message.updated` events (only explicit `POST /api/guild/room`, `adventurer.summon`, or brand-new root `session.created` may un-tombstone a room).
  - In `deleteRoom` on the client adapter, add the normalized directory to `deletedRoomDirs` and dispatch `room.deleted` to the reducer **immediately before** running `executeDeleteRoomResources`.
  - In `executeDeleteRoomResources`, query `/api/session?limit=200` and `/api/session?parentID=null&limit=100`, and parallelize session interrupt/delete, PTY deletion, and shell deletion via `Promise.allSettled` instead of sequential `for (... await ...)` loops.
- [x] Add automated integration tests verifying that `⏳ Deleting...` and `⏳ Demolishing...` persist across SSE frames, that out-of-order `session.view` responses and mid-loop sweeps never resurrect deleted sessions, and that trailing `session.updated` / `message.updated` SSE frames during parallel room teardown never resurrect a demolished **Workshop Room**.

## Answer

- Updated `src/server/command-router.ts` so `session.view` returns the post-await `activeReducer.getSnapshot()` instead of the stale pre-await `preDispatchedViewEmission.snapshot`.
- Updated `src/ingress/daemon-sse-mapper.ts` to set `preserveActivityTimestamp: true` on `session.updated` and assistant `message.updated`/`message.created` frames so trailing SSE events never erase `deletedRoomDirs` / `state.deletedRoomIds`.
- Updated `src/ingress/opencode-client-adapter.ts` to dispatch `room.deleted` immediately before `deleteRoomResources`, re-check `deletedRoomDirs` and `deletedSessionIds` after async awaits in `runSweepAllLocations`, and updated `src/state/world-reducer.ts` (`hydrateFromSnapshot`) to filter `deletedSessionIds` from `room.characterIds` and `room.activeSessionIds`.
- Parallelized session interrupt/delete, PTY deletion, and shell deletion in `src/ingress/daemon-session-ops.ts` (`Promise.allSettled`) with `limit=200` + `parentID=null&limit=100`, and rendered persistent `⏳ Deleting...` / `⏳ Demolishing...` spinners in `src/web/hero-subtabs-reconciler.ts`, `src/web/ledger-panel-reconciler.ts`, and `src/web/demolition-modal-controller.ts`.
