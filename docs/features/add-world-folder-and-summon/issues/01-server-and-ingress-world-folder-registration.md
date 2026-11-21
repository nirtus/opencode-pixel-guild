# 01: Server & Ingress World-Folder Registration, Workspace Browsing & Host Path Translation

Type: task
Label: wayfinder:task
Status: resolved
Blocked by: None

## Question

How should the Companion Server, `OpenCodeClientAdapter`, and `WorldStateReducer` support browsing workspace folders, registering a `0`-session folder as a durable project world (`World Folder Registration`), and translating container `/workspaces/<folder>` paths to the host OpenCode daemon's native directory format when summoning a **Guild Adventurer**?

## Specification

Confirmed in Grilling Round 1 (`Q2`, `Q4`, `Q5`) and [Feature Specification](./../spec.md):
- **Workspace Folder Discovery & Room Registration Module (`src/server/workspace-folder-routes.ts` wired into `src/server/api-router.ts`)**:
  - Keep `src/server/api-router.ts` (`387 lines`) under the 400-line ceiling by placing the new route handlers in `src/server/workspace-folder-routes.ts`.
  - **`GET /api/guild/workspace-folders`**:
    - Infer the host workspace parent prefix from existing daemon projects/locations or `snapshot.rooms` (e.g., if `opencode-game-visualizer` is known on the daemon at `/mnt/c/Users/.../Development/opencode-game-visualizer` or `C:/Users/.../Development/opencode-game-visualizer`, the host parent prefix is `/mnt/c/Users/.../Development` or `C:/Users/.../Development`).
    - List subdirectories of the workspace root (`/workspaces` when present in Docker, or `path.dirname(process.cwd())` on host, or an optional `?parent=` directory), excluding `.git`, `node_modules`, and `.worktrees`.
    - Return `{ ok: true, workspaceRoot, folders: Array<{ name, hostPath, normalizedPath, isGitRepo, alreadyAdded }> }`.
  - **`POST /api/guild/room`**:
    - Accept `{ directory: string, projectName?: string }`.
    - Translate `/workspaces/<name>` (or a relative folder name) to its host-native path using the inferred host workspace parent prefix, and validate directory existence via `resolveLocalProjectDir` when paired to a local daemon.
    - Call `ctx.clientAdapter?.registerLocation?.(rawDirectory, { projectName })` (or dispatch `location.discovered` + clear tombstones) so:
      1. `deletedRoomDirs` in `OpenCodeClientAdapter` and `state.deletedRoomIds` in `WorldStateReducer` are cleared for `normalizeLocationDirectory(rawDirectory)`.
      2. `knownRoomMeta` in `OpenCodeClientAdapter` and `rawDirByNormDir` in `daemon-http-client.ts` record the mapping between `normDir` and `rawDirectory`, ensuring `sweepAllLocations` retains the `0`-session room across subsequent sweeps.
      3. `location.discovered`, `tasks.hydrated`, and `catalog.hydrated` (including primary **OpenCode Agent Modes** from `GET /api/agent?location[directory]=...`) are dispatched to `activeReducer`.
    - Return `{ ok: true, roomId: normDir, locationDirectory: normDir, rawDirectory, snapshot: activeReducer.getSnapshot() }`.
- **Accurate `0`-Session World Counts & Non-Phantom Summons (`src/spatial/project-world.ts`, `src/server/command-router.ts`, `src/server/operator-registry.ts`)**:
  - In `src/spatial/project-world.ts` (`layoutProjectWorld`), replace `fallbackRoomCount` (`1`) with `0` when `hasCharacters` is `false` so a `0`-session world always reports `sessionCount: 0`.
  - In `src/server/operator-registry.ts` (`pairDaemon`), hydrate `stagingReducer` from `prevSnap` when `Object.keys(prevSnap.rooms).length > 0` as well as when characters exist.
  - In `src/server/command-router.ts` (`handleGuildCommandRoute`), if `cmd.command === "adventurer.summon"` and `daemonRes && !daemonRes.ok`, return `{ ok: false, command: cmd.command, adapter: activeAdapter, sessionId: null, error: daemonRes.error, delta: ..., snapshot: snapshotBefore }` without dispatching a fake `ses_summon_*` character.
- **Primary `OpenCode Agent Mode` Normalization (`src/ingress/daemon-location-state.ts`, `src/state/batch-reconciler.ts`, `src/types/core-types.ts`)**:
  - Normalize `/api/agent` entries with `id = (a.id || a.name || "").trim()` and preserve `mode`, `hidden`, `disabled`, and `description`, filtering out `hidden: true`, `disabled: true`, and `mode === "subagent"` entries from primary agent mode options.

## Acceptance Criteria

- [x] `GET /api/guild/workspace-folders` returns available sibling/child project directories with host-translated paths, `isGitRepo`, and `alreadyAdded` flags.
- [x] `POST /api/guild/room` registers a `0`-session folder world, clears any prior `deletedRoomIds` / `deletedRoomDirs` tombstone, records its host daemon path, and persists the room in `snapshot.rooms` and `GuildChronicleStore` across `sweepAllLocations`.
- [x] `layoutProjectWorld` reports `sessionCount: 0` for a `0`-session world even when `snapshot.characters` is globally empty.
- [x] Failed `adventurer.summon` daemon calls return `ok: false` without creating a phantom `ses_summon_*` character.
- [x] All source files under `src/` remain `<= 400` lines.

## Answer

Implemented in:
- `src/server/workspace-folder-routes.ts` & `src/server/api-router.ts`: Added `inferHostWorkspaceParentPrefix`, `resolveRequestedWorldDirectory`, `GET /api/guild/workspace-folders`, and `POST /api/guild/room` for workspace folder discovery, container `/workspaces/<folder>` ↔ host daemon path translation, tombstone clearing (`explicit: true`), task progress hydration, and location catalog hydration.
- `src/ingress/daemon-types.ts`, `src/ingress/daemon-http-client.ts`, `src/ingress/opencode-client-adapter.ts`, `src/ingress/daemon-location-state.ts`: Added `registerLocation` and `recordDirectory`, retained registered `0`-session folders across `sweepAllLocations`, and normalized `/api/agent` entries with `id`, `mode`, `hidden`, `disabled`, and `description`.
- `src/state/batch-reconciler.ts`, `src/state/snapshot-builder.ts`, `src/state/world-reducer.ts`, `src/types/core-types.ts`: Un-tombstoned `state.deletedRoomIds` on `explicit: true` `location.discovered` events and exposed filtered primary-capable `availableAgentModes` on `GuildSnapshot`.
- `src/spatial/project-world.ts`, `src/server/operator-registry.ts`, `src/server/command-router.ts`: Fixed `0`-session `sessionCount: 0` in `layoutProjectWorld`, preserved `0`-session rooms on `pairDaemon`, translated `/workspaces/<folder>` on `adventurer.summon`, and prevented phantom `ses_summon_*` characters when `daemonRes.ok` is `false`.
- `tests/36-add-world-folder-and-summon.test.ts`: Added TDD regression tests covering all 4 requirements.
