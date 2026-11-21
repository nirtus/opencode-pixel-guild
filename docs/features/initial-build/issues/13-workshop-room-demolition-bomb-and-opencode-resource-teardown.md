# In-Room Demolition Bomb and OpenCode V2 Workshop Room Resource Teardown (`DELETE /api/guild/room`)

Type: spec
Label: ready-for-agent
Status: resolved
Blocked by: 01, 03, 05

## Problem Statement

When working across multiple projects and git worktrees in OpenCode V2, abandoned worktrees and historical locations (such as the ghost room `gentle-forest`) remain permanently visible as `Workshop Room`s on the `Guild Floorplan` even after nobody is working in them and never will. A ghost `Workshop Room` stays alive because multiple OpenCode V2 resources continue to reference its `Location`: persisted sessions in `/api/session`, location-scoped PTYs (`/api/pty`) or shells (`/api/shell`), registered git worktrees in `/api/worktree`, and cached location instances in `/api/debug/location` (or zero-session project entries swept every 2.5 seconds). Users currently have no way inside the `Workshop Room` to demolish the room and tear down all of the OpenCode V2 resources that created and sustain it.

## Solution

Place an interactive **`Demolition Bomb`** fixture inside every `Workshop Room` (at tile `{ x: 14, y: 10 }`) on the `Guild Floorplan`. Hovering over the `Demolition Bomb` displays a scene tooltip summarizing the room's `locationDirectory`, session count, worktree status, and the exact OpenCode V2 teardown operations that will run. Clicking the `Demolition Bomb` prompts the user for confirmation before executing a complete 5-step OpenCode V2 teardown (`DELETE /api/guild/room`): interrupting and deleting all sessions in that location (`POST /api/session/{sessionID}/interrupt` + `DELETE /api/session/{sessionID}`), removing any location-scoped PTYs (`DELETE /api/pty/{ptyID}`) and running shells (`DELETE /api/shell/{id}`), removing the OpenCode git worktree (`DELETE /api/worktree` with `force: true` + `POST /api/worktree/refresh`) when the room is a worktree, evicting the cached location from the daemon (`DELETE /api/debug/location`), and dispatching `room.deleted` with ghost-room suppression so demolished or 0-session rooms do not resurrect on subsequent polls.

## User Stories

1. As an OpenCode user viewing a `Workshop Room` on the `Guild Floorplan`, I want to see a physical **`Demolition Bomb`** fixture inside the room (at southeast tile `{ x: 14, y: 10 }`) with an animated sputtering fuse spark, so that I have an intuitive, in-world RPG tool for demolishing ghost rooms such as `gentle-forest`.
2. As a spectator hovering over the in-room `Demolition Bomb`, I want a cursor-following scene tooltip displaying the room's title, `locationDirectory`, total sessions, active `Guild Adventurer` / `Squad Subagent` count, worktree status, and the exact OpenCode V2 teardown endpoints (`DELETE /api/session/{sessionID}`, `DELETE /api/pty/{ptyID}`, `DELETE /api/shell/{id}`, `DELETE /api/worktree`, `DELETE /api/debug/location`), so that I can inspect what OpenCode resources will be destroyed before clicking.
3. As an OpenCode user clicking the `Demolition Bomb` inside a `Workshop Room`, I want a confirmation modal listing the room name, `locationDirectory`, number of sessions to be terminated (with an explicit warning if any sessions are currently active), and whether the git worktree checkout will be permanently deleted (`force: true`), so that I never demolish a room by accident.
4. As an OpenCode user canceling the `Demolition Bomb` confirmation dialog, I want the dialog to close without calling the daemon or mutating any room or session state, so that I can safely back out of room deletion.
5. As an OpenCode user confirming `Workshop Room` demolition on a git worktree room (`isWorktree: true`, such as `gentle-forest [wt]`), I want the companion server to interrupt any active sessions (`POST /api/session/{sessionID}/interrupt`) and delete every session (`DELETE /api/session/{sessionID}`) in that room's `locationDirectory`, so that orphaned sessions no longer cause `getLocations()` to rediscover the room.
6. As an OpenCode user confirming `Workshop Room` demolition, I want the companion server to list and delete all location-scoped PTY sessions (`GET /api/pty` $\rightarrow$ `DELETE /api/pty/{ptyID}`) and running shell commands (`GET /api/shell` $\rightarrow$ `DELETE /api/shell/{id}`) for that room's `locationDirectory`, so that no background terminal processes hold the location open.
7. As an OpenCode user confirming `Workshop Room` demolition on a git worktree room (`isWorktree: true`), I want the companion server to call `DELETE /api/worktree` with `{ projectID, directory, force: true }` followed by `POST /api/worktree/refresh` (`{ projectID }`), so that the OpenCode git worktree registration and sandbox checkout directory are completely removed.
8. As an OpenCode user confirming `Workshop Room` demolition on a primary project room (`isWorktree: false`), I want the companion server to delete all OpenCode sessions, PTYs, and shells for that location and evict `/api/debug/location` while **never** calling `DELETE /api/worktree` or deleting my source repository files on disk, so that primary project directories are never harmed.
9. As an OpenCode user confirming `Workshop Room` demolition on any `Workshop Room`, I want the companion server to call `DELETE /api/debug/location?location[directory]=...` after cleaning up sessions and worktrees, so that the OpenCode V2 daemon evicts the location from its in-memory location cache.
10. As a spectator watching a `Workshop Room` get demolished, I want the room to play a brief canvas explosion / shockwave animation, immediately vanish from the `Guild Floorplan` and `Workshop Rooms` filter bar via a `room.deleted` state emission, and auto-switch the camera to **All Rooms** if I was zoomed into the demolished room.
11. As an OpenCode user who has demolished a `Workshop Room` (or has a project in `/api/project` with 0 sessions and no active work), I want subsequent 2.5-second `sweepAllLocations()` polls to suppress re-discovering that demolished or empty room until a new session is actually created in that location, so that ghost rooms stay gone.

## Implementation Decisions

- **Domain Model (`GLOSSARY.md`)**:
  - **`Demolition Bomb`**: An interactive bomb fixture placed inside a `Workshop Room` that, when clicked and confirmed by the user, demolishes the room and tears down all OpenCode V2 resources sustaining its `Location` (sessions, PTYs, running shells, git worktrees, and cached daemon locations).
- **Spatial Fixture Layout**:
  - Extend `WorkshopRoomLayout` with a `demolitionBomb` fixture descriptor at `fixtureTile: { x: 14, y: 10 }`, `anchorTile: { x: 13, y: 10 }` inside the `16 × 12` core hall, marking `{ x: 14, y: 10 }` as a non-walkable fixture tile (`fixtureId: "Demolition Bomb"`).
- **Universal Scene Object Tooltip (`demolition-bomb`)**:
  - Extend `SceneTooltipTarget` and `SceneObjectTooltipViewModel` in the spectator HUD module with `{ kind: "demolition-bomb", roomId: string }`, returning the room's title, `locationDirectory`, session count, active adventurer/subagent count, worktree status, and the OpenCode V2 teardown endpoint binding string.
- **World-State Reducer (`room.deleted`)**:
  ```ts
  export interface RoomDeletedTelemetryEvent extends TelemetryEventBase {
    type: "room.deleted";
    roomId: string;
    locationDirectory?: string;
  }
  ```
  - When `room.deleted` is dispatched, the reducer:
    1. Resolves `roomId = normalizeLocationDirectory(event.locationDirectory ?? event.roomId)`.
    2. Removes all `CharacterState`s in that room (and any child `Squad Subagent`s) and deletes any `QuestGateState`s belonging to that room.
    3. Removes `roomId` from `rooms`, `roomAllPlugins`, and `roomOrder`.
    4. Records `roomId` in a dismissed/deleted room set; if `location.discovered`, `catalog.hydrated`, or `stream.reconnected` arrives for a deleted `roomId` with `0` sessions, the reducer skips re-creating the room until a location sweep or `session.upserted` arrives with at least one session in that location.
- **OpenCode V2 Daemon Client Teardown (`deleteRoomResources`)**:
  - Extend `OpenCodeDaemonClientPort` and `createHttpOpenCodeDaemonClient` with:
    ```ts
    export interface DeleteRoomResourcesInput {
      directory: string;
      projectId?: string;
      isWorktree?: boolean;
    }

    export interface DeleteRoomResourcesResult {
      deletedSessionIds: string[];
      deletedPtyIds: string[];
      deletedShellIds: string[];
      worktreeRemoved: boolean;
      locationEvicted: boolean;
    }
    ```
  - `deleteRoomResources` executes the 5-step OpenCode V2 teardown against the live daemon:
    1. **Sessions**: Queries `/api/session` (both location-scoped and global `?limit=100`) for all sessions whose normalized `location.directory` matches `normalizeLocationDirectory(directory)`. For each session, calls `POST /api/session/{sessionID}/interrupt` (ignoring 404/idle errors) and `DELETE /api/session/{sessionID}`.
    2. **PTYs & Running Shells**: Queries `GET /api/pty?location[directory]=...` and calls `DELETE /api/pty/{ptyID}?location[directory]=...` for each PTY; queries `GET /api/shell?location[directory]=...` and calls `DELETE /api/shell/{id}?location[directory]=...` for each running shell.
    3. **Worktree**: If `isWorktree` is true (or `GET /api/worktree?projectID=...` lists the directory with a worktree strategy / non-canonical path), calls `DELETE /api/worktree` with `{ projectID, directory: daemonDir, force: true }` and `POST /api/worktree/refresh` with `{ projectID }`. Never calls `DELETE /api/worktree` for a primary project's canonical root directory (`isWorktree: false`).
    4. **Location Cache Eviction**: Calls `DELETE /api/debug/location?location[directory]=${encodeURIComponent(daemonDir)}`.
- **Client Adapter Worktree Discovery & Ghost-Room Filtering**:
  - In `createHttpOpenCodeDaemonClient.getProjects()`, also query `GET /api/worktree?projectID=${encodeURIComponent(proj.id)}` so saved project worktrees (like `gentle-forest` and `brave-sailor`) are accurately tagged with `isWorktree: true`, `projectId: proj.id`, and `parentProjectDirectory: proj.directory`.
  - In `createOpenCodeClientAdapter`, expose `deleteRoom(roomId: string): Promise<DeleteRoomResourcesResult>` and track deleted room directories so 0-session locations that were demolished (or have 0 sessions and are not active) are skipped during `sweepAllLocations()`.
- **Companion Server Route (`DELETE /api/guild/room`) & Browser UI**:
  - Add `DELETE /api/guild/room` to `createGuildCompanionServer`, accepting `?roomId=...` or JSON `{ roomId }`, calling `clientAdapter.deleteRoom(roomId)` (or `daemonClient.deleteRoomResources`), dispatching `room.deleted` to `activeReducer`, and returning `{ deleted: result, snapshot }`.
  - In the browser canvas UI, render the `Demolition Bomb` inside each `Workshop Room` at tile `{ x: 14, y: 10 }`, wire hover tooltips and click handling to open a confirmation modal, trigger an expanding fiery shockwave animation on confirmation, and call `DELETE /api/guild/room`.

## Testing Decisions

- **What Makes a Good Test**: Tests assert observable behavior and state transitions at public seams (`createGuildCompanionServer`, `createOpenCodeClientAdapter`, `createWorldStateReducer`, `layoutWorkshopRoom`, `buildSceneObjectTooltip`), never inspecting internal private variables.
- **Single High-Level Seam Under Test**:
  1. **Companion Server + Client Adapter + Reducer Room Demolition Seam (`tests/05-spectator-hud-and-simulator.test.ts` & `tests/01-capability-and-world-reducer.test.ts`)**:
     - Verifies that `DELETE /api/guild/room` on a **Worktree `Workshop Room`** (`gentle-forest`) invokes the daemon client to interrupt and delete all room sessions (`DELETE /api/session/{id}`), remove location PTYs (`DELETE /api/pty/{id}`) and shells (`DELETE /api/shell/{id}`), remove the worktree (`DELETE /api/worktree` with `{ projectID, directory, force: true }` + `POST /api/worktree/refresh`), evict `/api/debug/location`, remove the room and its characters/quest gates from `GuildSnapshot`, and prevent resurrection on subsequent `sweepAllLocations()` calls.
     - Verifies that `DELETE /api/guild/room` on a **Primary Project `Workshop Room`** (`isWorktree: false`) deletes sessions, PTYs, and shells, evicts `/api/debug/location`, and suppresses the empty room on subsequent sweeps, while **never** invoking `DELETE /api/worktree`.
  2. **Spatial & HUD Tooltip Seam (`tests/03-floorplan-layout.test.ts` & `tests/05-spectator-hud-and-simulator.test.ts`)**:
     - Verifies that `layoutWorkshopRoom` places `demolitionBomb` at `{ x: 14, y: 10 }` (`anchorTile: { x: 13, y: 10 }`) without colliding with workstations or the `Break Lounge`.
     - Verifies that `buildSceneObjectTooltip(snapshot, { kind: "demolition-bomb", roomId })` includes the room's session count, active adventurer count, worktree status, and OpenCode V2 teardown endpoint bindings.
- **Prior Art**: Existing tests in `tests/01-capability-and-world-reducer.test.ts`, `tests/03-floorplan-layout.test.ts`, and `tests/05-spectator-hud-and-simulator.test.ts`.

## Out of Scope

- Deleting a user's primary git repository or non-worktree source files on disk (`DELETE /api/worktree` is strictly limited to OpenCode worktree rooms).
- Modifying OpenCode V2 core server internals.

## Further Notes

- Investigated against the live local OpenCode V2 daemon (`v2.1.2`): ghost worktree rooms like `gentle-forest` (`/home/guildmaster/.local/share/opencode/worktree/d9e00e/gentle-forest`) remain visible because they are simultaneously referenced by an old session in `/api/session`, a saved git worktree in `/api/worktree?projectID=d9e00e...`, and a cached location in `/api/debug/location`. Tearing down all three (plus any PTYs/shells) and evicting the location cleanly removes the room from OpenCode V2.

## Answer

- **Spatial & Scene `Demolition Bomb` Fixture (`src/types/domain.ts`, `src/spatial/floorplan-layout.ts`, `src/scene/guild-scene.ts`)**:
  - Added `"Demolition Bomb"` to `ROOM_FIXTURE_KINDS` and `WORKSTATION_CATALOG` (`fixtureTile: { x: 14, y: 10 }`, `anchorTile: { x: 13, y: 10 }`) and extended `WorkshopRoomLayout` with `demolitionBomb` (`DemolitionBombFixtureLayout`), marking `{ x: 14, y: 10 }` as a non-walkable fixture tile (`fixtureId: "Demolition Bomb"`).
  - Emitted and painted the `"Demolition Bomb"` fixture (cast-iron bomb sphere with animated sputtering fuse spark) in `buildGuildSceneFrame` and `createCanvas2DScenePaintAdapter`, and registered the `{ priority: 2, target: { kind: "demolition-bomb", roomId: room.roomId, room } }` hitbox.
- **Spectator HUD Tooltip (`src/hud/spectator-hud.ts`)**:
  - Extended `SceneTooltipTarget` (`SceneHoverTarget`) and `buildSceneObjectTooltip` with `{ kind: "demolition-bomb", roomId }`, returning the room's title, `locationDirectory`, session count, active adventurer/subagent counts, worktree status, and the 5-step OpenCode V2 teardown endpoint bindings (`DELETE /api/session/{sessionID}`, `DELETE /api/pty/{ptyID}`, `DELETE /api/shell/{id}`, `DELETE /api/worktree`, `DELETE /api/debug/location`).
- **World-State Reducer & Ghost-Room Suppression (`src/types/domain.ts`, `src/state/world-reducer.ts`)**:
  - Added `RoomDeletedTelemetryEvent` (`type: "room.deleted"`) to `TelemetryEvent`. When dispatched, the reducer normalizes `roomId`, removes all `CharacterState`s in that room (and child `Squad Subagent`s), deletes open `QuestGateState`s for that room, removes `roomId` from `rooms`, `roomAllPlugins`, and `roomOrder`, and records `roomId` in `deletedRoomIds` so `location.discovered`, `catalog.hydrated`, and `stream.reconnected` skip re-creating a demolished 0-session room until a session arrives in that location.
- **OpenCode V2 5-Step Daemon Teardown & Companion Route (`src/ingress/adapters.ts`, `src/server/main.ts`, `src/web/app.html`)**:
  - Added `DeleteRoomResourcesInput`, `DeleteRoomResourcesResult`, and `deleteRoomResources(input)` to `OpenCodeDaemonClientPort` and `createHttpOpenCodeDaemonClient`, executing the 5-step teardown (`POST /api/session/{id}/interrupt` + `DELETE /api/session/{id}`, `DELETE /api/pty/{id}`, `DELETE /api/shell/{id}`, `DELETE /api/worktree` + `POST /api/worktree/refresh` strictly when `isWorktree === true`, and `DELETE /api/debug/location`).
  - Extended `getProjects()` to query `GET /api/worktree?projectID=...` for saved project worktrees, added `deleteRoom(roomId)` on `OpenCodeClientAdapter` with ghost-room suppression across subsequent `sweepAllLocations()` calls, exposed `DELETE /api/guild/room` on `createGuildCompanionServer`, and wired the confirmation modal and fiery shockwave animation in `src/web/app.html`.
