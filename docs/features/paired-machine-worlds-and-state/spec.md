# Specification: Active Paired Machine Workspace Folder Discovery, Per-Machine World Isolation & Remote Game Master State

Label: ready-for-agent
Status: resolved

## Problem Statement

1. **`World Folder Registration` Scans the Visualizer Host's Local Disk Instead of the Active `OpenCode Machine Pairing` (`src/server/workspace-folder-routes.ts`)**:
   - In `handleGetWorkspaceFoldersRoute`, `inferHostWorkspaceParentPrefix(ctx)` queries `ctx.daemonClient.getProjects()` and `getLocations()`, **but then** `readdirSync(scanRoot)` scans `/workspaces` or `dirname(process.cwd())` on the **Visualizer Host**'s local disk and merely prepends the inferred prefix to the local folder names.
   - When a **Guild Operator** is actively paired to a remote machine (e.g. an `*.opentunnel.xyz` tunnel or remote LAN daemon), clicking `+` in the top-bar `Worlds:` row lists the **Visualizer Host**'s local directories instead of the directories on the active paired machine.
   - Furthermore, `isAllowedWorkspaceParent` rejects any `?parent=` directory outside the Visualizer Host's local `/workspaces` or `process.cwd()`, and `resolveRequestedWorldDirectory` falls back to `/workspaces` on the Visualizer Host when `inferHostWorkspaceParentPrefix` returns `null` (such as when the remote machine has `0` open projects yet).

2. **Cross-Machine Leakage of `Workshop Rooms`, `Guild Characters`, `Lifetime Tribute` & Local `/workspaces` Paths (`src/server/operator-registry.ts`, `src/server/chronicle-sqlite-store.ts`, `src/state/location-normalization.ts`)**:
   - In `OperatorWorkspaceRuntime.pairDaemon` (`src/server/operator-registry.ts`), switching to a different machine merges `prevSnap.tributeLedger` from the previous machine into the new machine's snapshot (`tributeLedger: { ...(prevSnap.tributeLedger ?? {}), ... }`), leaking token/cost totals and room references across machines.
   - When switching to a machine that currently has `0` rooms (`Object.keys(finalSnap.rooms).length === 0`), `pairDaemon` skips `chronicleStore.saveSnapshot(operatorId, finalSnap)`. If the server restarts or reloads, `chronicleStore.loadSnapshot(operatorId)` hydrates the previous machine's rooms while `profile.daemonUrl` points at the new machine (`isDifferentMachine === false`), causing the previous machine's rooms and sessions to appear on the new machine.
   - Because `world_snapshots` and `session_tribute_ledger` in `src/server/chronicle-sqlite-store.ts` are keyed only by `operator_id` rather than scoping per paired machine, `0`-session registered worlds, tombstones (`deletedRoomIds`), and tribute totals from Machine A overwrite or bleed into Machine B.
   - In `src/state/location-normalization.ts`, `resolveLocalProjectDir` falls back to `/workspaces/<basename>` and `process.cwd()` on the Visualizer Host without checking whether the active daemon is local (`isLocalDaemonEndpoint(daemonUrl)`), causing remote machine paths to resolve against same-named folders on the Visualizer Host.

3. **Game Master Objects (`Goal Assembly Site`, `Project Mini-Assemblies`, `Guild Results Showcase`, `Assembly Commit Ledger`) Fail or Read Local Disk When Paired to a Remote Machine (`src/ingress/git-status-scanner.ts`, `src/ingress/git-working-tree.ts`, `src/ingress/issue-tracker-scanner.ts`, `src/server/git-router.ts`)**:
   - `scanGitStatusAsync`, `scanGitStatusSync`, `createLiveGitWorkingTreeAdapter`, and `deriveProjectTaskProgress` rely exclusively on `resolveLocalProjectDir` + local `execFile("git", ...)` and local `fs.readdirSync`.
   - When paired to a remote machine (`!isLocalDaemonEndpoint(daemonUrl)`), any repository that does not exist on the Visualizer Host returns `isGitRepo: false` and `"Project directory not found on host"` in the **Guild Master Ledger** (`Overview` and `Assembly & Commit`), while any repository whose folder name happens to match a folder in `/workspaces/` on the Visualizer Host displays the Visualizer Host's Git status and feature tasks instead of the paired machine's.

---

## Core Design Decisions (Confirmed in Grilling Rounds 1 & 2)

### Decision 1: Paired-Machine Workspace Folder Discovery & World Registration (`src/server/workspace-folder-routes.ts`, `src/ingress/daemon-http-client.ts`, `src/ingress/daemon-types.ts`)

- **Extend `OpenCodeDaemonClientPort` with Paired-Machine Directory Discovery & Inspection**:
  - Add `listWorkspaceDirectories?(parentDirectory?: string): Promise<{ workspaceRoot: string | null; folders: Array<{ name: string; hostPath: string; isGitRepo: boolean }> }>` (and/or helper methods backed by the daemon's `/api/location`, `/api/project`, `/api/fs/list`, and `runShellCommand`) on `OpenCodeDaemonClientPort`.
  - **Determining the Default `workspaceRoot` on the Active Paired Machine**:
    1. Query `inferHostWorkspaceParentPrefix(ctx)` from the active daemon's `getProjects()`, `getLocations()`, and active `snapshot.rooms` (ignoring Visualizer Host `/workspaces` paths when `!isLocalDaemonEndpoint(ctx.daemonUrl)`).
    2. If the paired machine has `0` projects/rooms yet, query the daemon (`GET /api/location` or `runShellCommand(".", ...)` / home & workspace directory probe) to resolve the paired machine's default workspace parent directory (e.g. `~/projects`, `~/Development`, or the parent of the daemon's working directory / home directory) directly on the paired machine.
  - **Listing Candidate Folders on the Active Paired Machine (`GET /api/guild/workspace-folders`)**:
    1. When `ctx.daemonClient` is connected to a remote machine (`!isLocalDaemonEndpoint(ctx.daemonUrl)`), **never** scan the Visualizer Host's local `/workspaces` or `process.cwd()`. Instead, list subdirectories of the target `workspaceRoot` (or requested `?parent=`) directly on the paired machine via `ctx.daemonClient` (using `/api/fs/list` and/or `runShellCommand` to list non-hidden child directories and detect `.git` inside each child directory).
    2. When `ctx.daemonClient` is a local daemon (`isLocalDaemonEndpoint(ctx.daemonUrl)`), prefer the daemon's directory listing when available and only use the local `/workspaces` ↔ host-prefix translation when the local directory exists on the shared host mount.
    3. Relax `isAllowedWorkspaceParent` for remote daemons so valid absolute or `~` paths on the paired machine (rejecting `..` traversal and system roots like `/etc`, `/proc`, `/sys`, `/dev`) can be browsed via `?parent=`.
  - **Validating & Registering a World on the Active Paired Machine (`POST /api/guild/room` & `adventurer.summon`)**:
    1. Support `~` / `~/...` expansion and bare folder names resolved against the paired machine's `workspaceRoot`.
    2. When `!isLocalDaemonEndpoint(ctx.daemonUrl)`, never fall back to `/workspaces` on the Visualizer Host in `resolveRequestedWorldDirectory`, and verify directory existence on the paired machine via the daemon before registering.
    3. Immediately hydrate `catalog.hydrated` (`getLocationState(rawDirectory)` for skills, plugins, agents, models, sessions, and Quest Gates) and `tasks.hydrated` (via the remote-capable Git/task scanner) from the active paired machine.

### Decision 2: Per-Machine Isolation of Worlds, Sessions, Agents, Catalogs & Lifetime Tribute (`src/server/operator-registry.ts`, `src/server/chronicle-sqlite-store.ts`, `src/server/chronicle-tribute-ledger.ts`, `src/state/location-normalization.ts`)

- **Disable Visualizer Host Local Path Fallbacks for Remote Daemons (`src/state/location-normalization.ts`)**:
  - Guard `resolveLocalProjectDir` (or callers passing `daemonUrl`) so that when `daemonUrl` is a remote endpoint (`!isLocalDaemonEndpoint(daemonUrl)`), `resolveLocalProjectDir` returns `null` instead of mapping paths to `/workspaces/<basename>`, `process.cwd()`, or local host directories that happen to share a path name on the Visualizer Host.
  - In `daemon-http-client.ts`, ensure `getLocations()` also inspects `(s as { directory?: string }).directory` on `/api/session` items and `/api/location` so all active sessions and locations on the paired machine are discovered even when `/api/project` or `/api/debug/location` is empty.
- **Machine-Scoped Snapshot & Tribute Persistence (`src/server/operator-registry.ts`, `src/server/chronicle-sqlite-store.ts`, `src/server/chronicle-tribute-ledger.ts`)**:
  - Scope persisted snapshots and tribute ledger records by a composite machine key (`buildOperatorMachineStorageKey(operatorId, daemonUrl)` or `machine_scope` column/key) so each paired machine (`daemonUrl`) owns its own persisted `rooms`, `roomOrder`, `characters`, `questGates`, `deletedSessionIds`, `deletedRoomIds`, and `tributeLedger`.
  - In `pairDaemon` (`src/server/operator-registry.ts`):
    1. When switching to a different machine (`isDifferentMachine`), do **not** merge `prevSnap.tributeLedger` from the previous machine into the new machine's reducer. Instead, load the target machine's own persisted snapshot (including its `0`-session registered worlds, tombstones, and tribute ledger) before sweeping the target daemon.
    2. Always persist the resulting snapshot to `chronicleStore` after `pairDaemon` completes—even when `Object.keys(finalSnap.rooms).length === 0`—so an empty or newly paired machine never falls back to a previous machine's snapshot on server restart.

### Decision 3: Remote Daemon Git Working-Tree & Task Progress Adapter (`src/ingress/git-status-scanner.ts`, `src/ingress/git-working-tree.ts`, `src/ingress/issue-tracker-scanner.ts`, `src/server/git-router.ts`, `src/ingress/opencode-client-adapter.ts`)

- **Remote-Capable Git Status, Diff, Stage, Unstage, Discard, Commit & Sync**:
  - When a project directory resolves locally on a local daemon (`isLocalDaemonEndpoint(daemonUrl)` and `resolveLocalProjectDir(dir) !== null`), continue using fast local `runGitAsync` subprocesses.
  - When paired to a remote machine (`!isLocalDaemonEndpoint(daemonUrl)` or when `resolveLocalProjectDir` is `null` and `daemonClient.runShellCommand` is available):
    1. Execute Git status (`git status --porcelain=v1 -b`, `git log -1`, `git diff --numstat`), file diff (`git diff`), stage (`git add`), unstage (`git reset HEAD`), discard (`git checkout` / `rm`), commit (`git commit`), and sync (`fetch` / `pull --rebase --autostash` / `push`) on the active paired machine via `daemonClient.runShellCommand(directory, command)`.
    2. Populate the shared epoch-guarded Git status cache (`storeCachedGitStatus`) so `deriveProjectTaskProgress`, `deriveRoomTaskProgressForGitState`, `deriveGuildAssemblyShowcase`, `deriveProjectMiniAssemblies`, and the **Assembly Commit Ledger** work seamlessly for remote paired machines.
    3. For dirty `docs/features/<slug>/issues/*.md` files detected in a remote repository's `git status`, read their issue titles and `Status:` lines via the daemon (`runShellCommand` or `/api/fs/read`) so uncommitted feature blueprints on the paired machine render accurate **Assembly Parts** on the **Goal Assembly Site**.

---

## Verification & Acceptance Criteria

1. **Paired-Machine Workspace Folder Discovery & World Registration**:
   - When paired to a remote machine, `GET /api/guild/workspace-folders` queries the remote daemon and returns only the remote machine's folders (never the Visualizer Host's `/workspaces` folders), even when the remote machine has `0` existing projects.
   - Browsing `?parent=<remoteDir>` and submitting `POST /api/guild/room` registers the folder on the remote machine, hydrates its **OpenCode Agent Modes**, skills, plugins, models, and Git/task progress from the remote daemon, and focuses the new world in the top-bar `Worlds:` strip.
2. **Strict Per-Machine World, Session, Agent & Tribute Isolation**:
   - Switching from Machine A to Machine B (including when Machine B has `0` rooms) immediately clears Machine A's rooms, characters, Quest Gates, and **Lifetime Tribute** totals, displays Machine B's own rooms/sessions/agents/tribute, and persists Machine B's state across server restarts without resurrecting Machine A's rooms.
   - Remote projects whose folder names match a `/workspaces/<name>` folder on the Visualizer Host never read the Visualizer Host's local disk.
3. **Remote Game Master Objects (`Goal Assembly Site`, `Guild Results Showcase`, `Assembly Commit Ledger`)**:
   - Selecting a project world on a remote paired machine displays its true Git branch, `↑ahead`/`↓behind` counts, uncommitted files, diffs, **Project Mini-Assemblies**, and **Goal Assembly Site** state, and supports Stage, Unstage, Discard, Commit, and Sync Git via the remote daemon.
4. **400-Line Ceiling & Live Docker Container Visual Proof**:
   - Every source file under `src/` remains `<= 400` lines (`tests/00-architecture-invariants.test.ts`).
   - Deployed and verified on `opencode-pixel-guild-visualizer` (`npm run docker:up` on port `4310`) with headless Chrome visual proof in `docs/images/`.
