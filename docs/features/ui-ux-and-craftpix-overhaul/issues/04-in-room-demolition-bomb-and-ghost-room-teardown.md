# 04: In-Room Demolition Bomb & 5-Step OpenCode V2 Ghost Room Teardown (`DELETE /api/guild/room`)

Type: task
Label: `ready-for-agent`
Status: resolved
Blocked by: 02

**What to build:** Place an interactive **`Demolition Bomb`** fixture at southeast tile `{ x: 14, y: 10 }` (`anchorTile: { x: 13, y: 10 }`) inside every `Workshop Room`, accurately tag OpenCode git worktrees (`isWorktree: true`) by querying `GET /api/worktree?projectID=...`, suppress 0-session ghost rooms (`pixel-guild-cloud`) during location sweeps, and wire `DELETE /api/guild/room` + a confirmation modal + fiery canvas shockwave animation to execute the complete 5-step OpenCode V2 resource teardown (`POST /api/session/{id}/interrupt` + `DELETE /api/session/{id}`, `DELETE /api/pty/{id}`, `DELETE /api/shell/{id}`, `DELETE /api/worktree` + `POST /api/worktree/refresh` for worktree rooms only, `DELETE /api/debug/location`, and `room.deleted` state reduction with resurrection suppression).

**Blocked by:** 02: Unified Multi-Room Spatial Coordinates, Break Lounge Crowd Capping & Label De-Collision

**Status:** resolved

- [x] Extend `layoutWorkshopRoom` and `buildGuildSceneFrame` to place a non-walkable `Demolition Bomb` fixture at `{ x: 14, y: 10 }` (`anchorTile: { x: 13, y: 10 }`) with a priority `3` scene hitbox (`{ kind: "demolition-bomb", roomId }`) and animated sputtering fuse spark.
- [x] Extend `buildSceneObjectTooltip` with `{ kind: "demolition-bomb", roomId }` displaying the room's title, `locationDirectory`, session count, active adventurer/subagent count, worktree status, and the 5 OpenCode V2 teardown endpoint bindings.
- [x] In `createHttpOpenCodeDaemonClient.getProjects()`, query `GET /api/worktree?projectID=...` so saved project worktrees (such as `gentle-forest`) are tagged with `isWorktree: true`, `projectId`, and `parentProjectDirectory`, and suppress 0-session ghost locations during `sweepAllLocations()` unless a session exists in that location.
- [x] Implement `deleteRoomResources` on `OpenCodeDaemonClientPort` and `DELETE /api/guild/room` on `createGuildCompanionServer` to run the 5-step OpenCode V2 teardown: (1) interrupt and delete all sessions in the room's `locationDirectory`, (2) delete all location PTYs (`DELETE /api/pty/{ptyID}`) and shells (`DELETE /api/shell/{id}`), (3) delete the OpenCode git worktree (`DELETE /api/worktree` with `force: true` + `POST /api/worktree/refresh`) when `isWorktree: true` while **never** calling `DELETE /api/worktree` on a primary canonical project root (`isWorktree: false`), (4) evict `DELETE /api/debug/location`, and (5) dispatch `room.deleted` to the world-state reducer and suppress 0-session resurrection on subsequent sweeps.
- [x] Wire clicking the `Demolition Bomb` in the browser canvas to open a confirmation dialog, trigger a fiery shockwave explosion animation on confirmation, call `DELETE /api/guild/room`, and auto-switch the camera to **All Rooms** if the demolished room was selected.
- [x] Verify at Seam 1 & Seam 2 with automated tests covering both a worktree room teardown (`isWorktree: true`, asserting all 5 teardown steps including `DELETE /api/worktree`) and a primary project room teardown (`isWorktree: false`, asserting sessions/PTYs/shells/location eviction while `DELETE /api/worktree` is never called) plus ghost-room resurrection suppression.

## Answer

Implemented the in-room `Demolition Bomb` fixture (`{ x: 14, y: 10 }`, `anchorTile: { x: 13, y: 10 }`), `demolition-bomb` scene hover tooltip, `GET /api/worktree?projectID=...` worktree sandbox tagging, 5-step OpenCode V2 `deleteRoomResources` teardown (`DELETE /api/guild/room`), `room.deleted` state reduction with 0-session resurrection suppression, and browser confirmation modal with fiery shockwave animation.
