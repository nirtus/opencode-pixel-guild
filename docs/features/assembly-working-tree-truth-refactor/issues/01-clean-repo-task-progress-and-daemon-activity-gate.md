# 01: Clean-Repo Task Scanner Gate & Tight Daemon Activity Window

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: none

**What to build:** Deepen `src/ingress/issue-tracker-scanner.ts`, `src/ingress/daemon-location-state.ts`, `src/ingress/opencode-client-adapter.ts`, and `src/state/batch-reconciler.ts` so that a Git repository with `0` uncommitted working-tree file changes deterministically returns `0/0 Blueprint Ready` (`BLUEPRINT_READY_TASK_PROGRESS`)—never projecting committed historical `docs/features/<slug>` folders (even those with `open` or `ready-for-agent` issues) or fabricating `source: "subagents"` tasks—and replace the 10-minute `time.idle === null` busy window in `fetchDaemonLocationState`.

## Acceptance Criteria

- [x] Keep all files under `src/` strictly `<= 400` lines (`tests/00-architecture-invariants.test.ts`).
- [x] In `src/ingress/issue-tracker-scanner.ts`:
  - When `gitStatus.isGitRepo` is `true` and `relevantGitFiles.length === 0` (`0` uncommitted non-screenshot working-tree files), `computeProjectTaskProgress`, `deriveRoomTaskProgressForGitState`, and `scanProjectIssueTracker` must return `BLUEPRINT_READY_TASK_PROGRESS` (`0/0 Blueprint Ready`)—even if `docs/features/<slug>/issues/*.md` files on disk have `Status: open`, `Status: claimed`, or `Status: ready-for-agent`.
  - When `gitStatus.isGitRepo` is `true` and `relevantGitFiles.length > 0`, `scanProjectIssueTracker` must only select a `docs/features/<slug>` candidate if that specific `docs/features/<slug>/` directory has dirty/untracked files in `gitStatus.files` (and is not retired); otherwise `computeProjectTaskProgress` / `deriveRoomTaskProgressForGitState` must return `deriveWorkingTreeTaskProgressFromGitState(gitStatus)` (`Working Tree Changes`).
  - When `gitStatus.isGitRepo` is `false` (non-git test sandbox directories), preserve `scanProjectIssueTracker` scanning of `docs/features/<slug>` when not retired.
  - Delete the `childSubagents` / `source: "subagents"` fabrication block from `computeProjectTaskProgress` (`lines 316–345`), and key `taskProgressCache` strictly by `normalizeLocationDirectory(projectDir)`.
- [x] In `src/ingress/daemon-location-state.ts` (`lines 182–205`):
  - Replace the 10-minute (`TEN_MINUTES_MS`) fallback when `s.time?.idle` is `null` (`0`) with a tight `<= 20_000ms` window (or explicit `idleTs > 0 && busyTs > idleTs`), and ensure child subagents are only marked active if their parent session is also active.
- [x] In `src/state/batch-reconciler.ts` (`handleTasksHydrated`, `line 89`):
  - Ensure `0/0` resets clear stale `subagents` progress cleanly while preserving virtual/remote working-tree changes across sweeps.
- [x] Update and add unit tests in `tests/08-task-telemetry-and-encounter-engine.test.ts` and `tests/26-assembly-commit-ledger-deepening.test.ts` verifying that committed `docs/features/<slug>` folders with `open` or `ready-for-agent` issues return `0/0 Blueprint Ready` when the Git working tree is clean, and only activate when `docs/features/<slug>/` itself has uncommitted changes.

## Answer

- Deepened `src/ingress/issue-tracker-scanner.ts` (`hasDirtyFeatureFiles`, `scanProjectIssueTracker`, `deriveRoomTaskProgressForGitState`, `deriveProjectTaskProgress`, `computeProjectTaskProgress`) to enforce a hard clean-repository gate (`0` uncommitted working-tree files => `0/0 Blueprint Ready`), require dirty/untracked `docs/features/<slug>/` files in `git status` before activating a feature blueprint in a Git repo, prioritize open/in-progress dirty features over completed ones, delete `source: "subagents"` task fabrication, and unify `taskProgressCache` keys by normalized directory.
- Replaced the 10-minute `TEN_MINUTES_MS` fallback in `src/ingress/daemon-location-state.ts` with `RECENT_BUSY_HEARTBEAT_MS = 20_000` so finished OpenCode V2 sessions/subagents with `time.idle === null` do not stay marked active for 10 minutes.
- Verified with unit and integration tests in `tests/08-task-telemetry-and-encounter-engine.test.ts` and `tests/26-assembly-commit-ledger-deepening.test.ts`.
