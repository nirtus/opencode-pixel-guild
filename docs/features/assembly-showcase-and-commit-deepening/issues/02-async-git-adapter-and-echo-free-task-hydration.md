# 02: Async GitWorkingTreePort Adapter, Normalized Cache Keys & Echo-Free Task Hydration

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01

**What to build:** Deepen `createLiveGitWorkingTreeAdapter` (`src/ingress/git-working-tree.ts`), `git-status-scanner.ts`, `issue-tracker-scanner.ts`, and `tryHandleGuildGitRoute` (`src/server/git-router.ts`) so that all Git operations run asynchronously without blocking the Node.js event loop, commit draft updates run in memory with zero `git` spawns, `GET /api/guild/git` never retires open/in-progress `docs/features` blueprints, and 15-second background sweeps use normalized cache keys so stale progress never overwrites live state.

## Acceptance Criteria

- [x] Keep all files under `src/` strictly `<= 400` lines (`tests/00-architecture-invariants.test.ts`).
- [x] In `src/ingress/git-working-tree.ts` and `src/ingress/git-status-scanner.ts`:
  - Convert `createLiveGitWorkingTreeAdapter` (`getStatus`, `getFileDiff`, `stageFiles`, `unstageFiles`, `discardFiles`, `createCommit`) to use non-blocking async `runGitAsync` and `scanGitStatusAsync`.
  - In `scanGitStatusAsync` (`computeGitStatusAsync`), run `git log -1` and `git diff --numstat` / `git diff --cached --numstat` concurrently via `Promise.all` after `git status --porcelain=v1 -b -u`.
  - Batch file paths in `discardFiles` (`git reset -q HEAD -- <paths...>` and `git checkout -- <paths...>`) instead of spawning per-file synchronous processes.
  - Make `updateDraft` (`git.draft.update` / `git.draft.clear`) update `draftsByRoom` in memory and return the cached status state (calling `scanGitStatusAsync` without cache invalidation only if no cached status exists yet) so typing a commit message spawns `0` `git` processes.
- [x] In `src/ingress/issue-tracker-scanner.ts`:
  - Normalize `taskProgressCache` keys using `normalizeLocationDirectory(projectDir)` so `invalidateTaskProgressCache` and `deriveProjectTaskProgress` always match across raw Windows/WSL paths and normalized room paths.
  - In `scanProjectIssueTracker`, only select a `docs/features/<slug>` candidate when it has unresolved tasks (`resolvedTasks < totalTasks`) or uncommitted files inside `docs/features/<slug>/`, skipping historical already-committed features.
- [x] In `src/server/git-router.ts`:
  - In `syncRoomTaskProgress`, do **not** call `retireCompletedFeatureSlug` or overwrite an open/in-progress `docs/features` tracker (`resolvedTasks < totalTasks`) with `BLUEPRINT_READY_TASK_PROGRESS` when `GET /api/guild/git` or `git.status` sees `state.isClean === true`; only retire a feature slug on `git.commit` completion (or when `resolvedTasks >= totalTasks` and committed).
  - When `GET /api/guild/git` is called with `?file=...` to preview a diff, avoid invalidating and re-scanning full Git status if a fresh cached status already exists.
- [x] Add unit and integration tests in `tests/26-assembly-commit-ledger-deepening.test.ts` verifying that `GET /api/guild/git` preserves open `docs/features` blueprints on a clean working tree, `git.draft.update` does not trigger status re-scans, and async `createLiveGitWorkingTreeAdapter` stages, diffs, discards, and commits cleanly.

## Answer

- Converted `createLiveGitWorkingTreeAdapter` (`src/ingress/git-working-tree.ts`) to use non-blocking async `runGitAsync` and `scanGitStatusAsync`, batched `discardFiles` paths, and made `updateDraft` read `getCachedGitStatus(roomDir)` without invalidating the status cache or spawning `git`.
- Parallelized `git log -1` and `git diff --numstat` / `git diff --cached --numstat` via `Promise.all` inside `computeGitStatusAsync` (`src/ingress/git-status-scanner.ts`) and normalized `gitStatusCache` keys via `normalizeLocationDirectory`.
- Normalized `taskProgressCache` keys in `src/ingress/issue-tracker-scanner.ts` via `normalizeLocationDirectory` and updated `scanProjectIssueTracker` to only pick `docs/features/<slug>` candidates that have unresolved tasks (`resolvedTasks < totalTasks`) or uncommitted files in `docs/features/<slug>/`.
- Updated `syncRoomTaskProgress` (`src/server/git-router.ts`) so open/in-progress `docs/features` blueprints (`resolvedTasks < totalTasks`) are never retired on read-only `GET /api/guild/git` or `git.status`, while stale already-committed completed blueprints (`resolvedTasks >= totalTasks`) transition cleanly to `Working Tree Changes` on `git.status` / `git.sync` even when retroactive wording edits occur under `docs/features/<slug>/`, and fast-pathed `?file=...` diff previews using cached status.
- Added `-c core.checkStat=minimal` across Git status/diff commands in `src/ingress/git-status-scanner.ts` and `src/ingress/git-working-tree.ts`, parsed `upstream`, `ahead`, and `behind` from porcelain branch headers, implemented `syncRepository` (`git.sync`) with remote upstream `fetch` / `pull --rebase --autostash` / `push` and host daemon `/api/shell` fallback, and verified in `docs/images/sync-git-fix.png`.
