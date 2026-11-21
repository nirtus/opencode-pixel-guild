# 01: Paired-Machine Workspace Folder Discovery & World Registration via OpenCode Daemon

Type: task
Label: wayfinder:task
Status: resolved
Blocked by: None

## Question

How should `GET /api/guild/workspace-folders`, `POST /api/guild/room`, and `OpenCodeDaemonClientPort` discover, browse, validate, and register workspace folders on the operator's currently active **OpenCode Machine Pairing** instead of scanning the Visualizer Host's local `/workspaces` filesystem?

## Specification

Confirmed in Grilling Round 1 (`Q1`) & Round 2 (`Q1`) and [Feature Specification](./../spec.md):

1. **Daemon Directory Discovery & Inspection on `OpenCodeDaemonClientPort` (`src/ingress/daemon-types.ts`, `src/ingress/daemon-http-client.ts`, or a dedicated helper module `<= 400` lines)**:
   - Add remote-capable workspace directory discovery on `OpenCodeDaemonClientPort` (e.g. `listWorkspaceDirectories?(parentDir?: string)` and `probeDirectory?(dir: string)`):
     - Query the active daemon's known projects (`getProjects()`), locations (`getLocations()`, including `GET /api/location` and `s.directory` on `/api/session` items), or run a lightweight non-interactive shell/fs probe on the daemon to determine the paired machine's default parent workspace directory (for example, the parent directory of existing projects, or `~/projects` / `~/Development` / `$HOME` when `0` projects exist on the paired machine).
     - List immediate child directories of the target parent directory directly on the paired machine (excluding hidden `.` directories, `node_modules`, and `.worktrees`), returning each child directory's `name`, native `hostPath` on the paired machine, and `isGitRepo` (whether `<child>/.git` exists on the paired machine).
2. **Remote-First `GET /api/guild/workspace-folders` (`src/server/workspace-folder-routes.ts`)**:
   - When the active daemon is a remote endpoint (`!isLocalDaemonEndpoint(ctx.daemonUrl)`):
     - Never scan the Visualizer Host's `/workspaces` or `dirname(process.cwd())`.
     - Allow `?parent=` to specify any valid directory path on the paired machine (including `~` paths, while rejecting `..` traversal and system root paths `/etc`, `/proc`, `/sys`, `/dev`).
     - Return `{ ok: true, workspaceRoot, folders }` directly from the paired machine's daemon, marking `alreadyAdded: Boolean(snapshot.rooms[normalizedPath])`.
   - When the active daemon is local (`isLocalDaemonEndpoint(ctx.daemonUrl)`), preserve local workspace discovery and `/workspaces` ↔ host-prefix path translation.
3. **Remote-Safe `POST /api/guild/room` & `adventurer.summon` (`src/server/workspace-folder-routes.ts`, `src/server/command-router.ts`)**:
   - In `resolveRequestedWorldDirectory`, when `!isLocalDaemonEndpoint(ctx.daemonUrl)`, never fall back to `/workspaces` or `dirname(process.cwd())` on the Visualizer Host; resolve bare folder names or `~/...` paths against the paired machine's discovered `workspaceRoot` / `$HOME`.
   - Verify that the target directory exists on the paired machine via the daemon before registering, then dispatch `location.discovered` (`explicit: true`), hydrate `catalog.hydrated` (`getLocationState(rawDirectory)`), and hydrate `tasks.hydrated`.

## Acceptance Criteria

- [x] When paired to a remote machine (`!isLocalDaemonEndpoint(daemonUrl)`), `GET /api/guild/workspace-folders` returns the remote machine's folders via `ctx.daemonClient` and never lists the Visualizer Host's `/workspaces` directories (even when the remote machine has `0` open projects).
- [x] `?parent=` navigation works for directories on the remote paired machine without failing `isAllowedWorkspaceParent` against the Visualizer Host's local root.
- [x] `POST /api/guild/room` resolves and validates the folder on the active paired machine, registers the room, and hydrates its **OpenCode Agent Modes**, skills, plugins, and models from the paired machine's daemon.
- [x] Every file under `src/` stays `<= 400` lines (`tests/00-architecture-invariants.test.ts`).

## Answer

Implemented in:
- `src/ingress/daemon-workspace-ops.ts`, `src/ingress/daemon-types.ts`, `src/ingress/daemon-http-client.ts`, `src/ingress/index.ts`: Added `listDaemonWorkspaceDirectories`, `probeDaemonDirectory`, and `resolveDaemonDefaultWorkspaceRoot` using OpenCode V2's `/api/fs/list` and `/api/location` endpoints to list child folders and detect `.git` repositories on the active paired machine without polluting `/api/debug/location`.
- `src/server/workspace-folder-routes.ts`: Updated `inferHostWorkspaceParentPrefix` to prefer leaf project directories on the active daemon, updated `handleGetWorkspaceFoldersRoute` and `isAllowedWorkspaceParent` to query `fullDaemon.listWorkspaceDirectories` for remote daemons without reading the Visualizer Host's `/workspaces`, and updated `handleAddRoomRoute` to validate remote directory existence via `fullDaemon.probeDirectory`.
- Verified in `tests/48-paired-machine-worlds-and-state.test.ts` and deployed on `opencode-pixel-guild-visualizer` (`docs/images/paired-machine-worlds-and-state.png`).
