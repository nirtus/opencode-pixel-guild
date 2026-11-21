# 03: Remote Daemon Git Working-Tree & Task Progress Adapter for Game Master Objects

Type: task
Label: wayfinder:task
Status: resolved
Blocked by: 01, 02

## Question

How should the **Goal Assembly Site**, **Project Mini-Assemblies**, **Guild Results Showcase**, and **Assembly Commit Ledger** inspect and mutate Git working trees and `docs/features/<slug>/issues/` task progress when the active **OpenCode Machine Pairing** is a remote machine whose repositories do not exist on the Visualizer Host's local disk?

## Specification

Confirmed in Grilling Round 2 (`Q3`) and [Feature Specification](./../spec.md):

1. **Remote Daemon Git Status, Diff, Stage, Unstage, Discard, Commit & Sync (`src/ingress/git-status-scanner.ts`, `src/ingress/git-working-tree.ts`, `src/server/git-router.ts`, or a dedicated remote git helper module `<= 400` lines)**:
   - Allow `GitWorkingTreePort` methods (`getStatus`, `getFileDiff`, `stageFiles`, `unstageFiles`, `discardFiles`, `createCommit`, `syncRepository`) and `scanGitStatusAsync` to accept or use the active `daemonClient` (`runShellCommand` / daemon URL context) when `resolveLocalProjectDir` returns `null` (or when `!isLocalDaemonEndpoint(daemonUrl)`).
   - For remote directories, execute non-interactive Git commands on the paired machine via `daemonClient.runShellCommand(directory, command)`:
     - **Status**: Run `git status --porcelain=v1 -b -u`, `git log -1 --format=%h\t%s`, and `git diff --numstat` / `git diff --cached --numstat` in a single batched remote shell command, parse with `parsePorcelainStatus` + `accumulateNumstat`, and store the result in the epoch-guarded `gitStatusCache` (`storeCachedGitStatus`).
     - **Diff**: Run `git diff` / `git diff --cached` (or read untracked file preview) on the remote daemon and return the unified diff (capped at `4000` chars).
     - **Stage / Unstage / Discard / Commit / Sync**: Execute the corresponding `git add`, `git reset HEAD`, `git checkout --` / `rm -rf`, `git commit`, and `git fetch` / `pull --rebase --autostash` / `push` commands on the remote daemon, invalidate the directory's Git status cache epoch (`invalidateGitStatusCache(directory)`), and re-scan via the remote daemon.
2. **Remote Daemon Task Progress Hydration (`src/ingress/issue-tracker-scanner.ts`, `src/ingress/opencode-client-adapter.ts`, `src/server/workspace-folder-routes.ts`, `src/server/git-router.ts`)**:
   - When `scanGitStatusAsync` populates `gitStatusCache` for a remote directory:
     - If the remote repository has `0` uncommitted relevant files (`getRelevantGitFiles(gitState).length === 0`), `deriveProjectTaskProgress` / `deriveRoomTaskProgressForGitState` immediately returns `BLUEPRINT_READY_TASK_PROGRESS` (`0/0 Blueprint Ready`) per `ADR-0002`.
     - If the remote repository has dirty files under `docs/features/<slug>/issues/*.md`, read the issue headers and `Status:` lines from the remote daemon (or fall back to `deriveWorkingTreeTaskProgressFromGitState(gitState)`) so the **Goal Assembly Site**, **Project Mini-Assemblies**, and **Guild Results Showcase** display accurate **Assembly Parts** for the remote paired machine.

## Acceptance Criteria

- [x] During `sweepAllLocations`, `POST /api/guild/room`, and `/api/guild/git` on a remote paired machine, `scanGitStatusAsync` and `gitAdapter` query the remote daemon rather than returning `isGitRepo: false` or reading `/workspaces` on the Visualizer Host.
- [x] **Goal Assembly Site**, **Project Mini-Assemblies**, **Guild Results Showcase**, and **Assembly Commit Ledger** accurately display branch, `↑ahead`/`↓behind`, uncommitted files, diffs, and `0/0 Blueprint Ready` vs. active **Assembly Parts** for repositories on the selected paired machine.
- [x] Stage, Unstage, Discard, Commit, and Sync Git in the **Assembly Commit Ledger** work end-to-end against a remote paired machine via `daemonClient.runShellCommand`.
- [x] Every file under `src/` stays `<= 400` lines (`tests/00-architecture-invariants.test.ts`).

## Answer

Implemented in:
- `src/ingress/remote-git-ops.ts`, `src/ingress/daemon-session-ops.ts`, `src/ingress/daemon-http-client.ts`: Passed `cwd: daemonDir` in `POST /api/shell` (`executeDaemonShellCommand`), registered remote directory runners in `recordDaemonDirectory`, and implemented `computeRemoteGitStatusAsync`, `remoteGitGetFileDiff`, `remoteGitStageFiles`, `remoteGitUnstageFiles`, `remoteGitDiscardFiles`, and `remoteGitCreateCommit`.
- `src/ingress/git-status-scanner.ts`, `src/ingress/git-working-tree.ts`, `src/server/workspace-folder-routes.ts`: Routed `scanGitStatusAsync` and `createLiveGitWorkingTreeAdapter` (`getStatus`, `getFileDiff`, `stageFiles`, `unstageFiles`, `discardFiles`, `createCommit`, `syncRepository`) through the remote daemon runner when `resolveLocalProjectDir` returns `null`, populating `gitStatusCache` before `deriveProjectTaskProgress` runs.
- Verified in `tests/48-paired-machine-worlds-and-state.test.ts` and deployed on `opencode-pixel-guild-visualizer` (`docs/images/paired-machine-worlds-and-state.png`).
