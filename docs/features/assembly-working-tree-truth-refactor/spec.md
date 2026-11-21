# Feature Specification: Goal Assembly Site & Working-Tree Truth Refactor

Label: ready-for-agent

## Problem Statement

When a **Guild Operator** opens a project that is completely up to date (`0` commits waiting ahead/behind, `0` uncommitted working-tree file changes), the **Goal Assembly Site** (on the 2D **Guild Floorplan** canvas) and the **Guild Results Showcase** (in the **Guild Master Ledger** `Overview` and `Assembly & Commit` subtabs) still display working packages, tasks, or deliverables.

Four architectural defects cause this behavior:

1. **Committed Historical `docs/features/<slug>` Leakage (`src/ingress/issue-tracker-scanner.ts`, `src/server/git-router.ts`)**:
   - `scanProjectIssueTracker` (`src/ingress/issue-tracker-scanner.ts:168–263`), `deriveRoomTaskProgressForGitState` (`lines 139–166`), `computeProjectTaskProgress` (`lines 285–307`), and `syncRoomTaskProgress` (`src/server/git-router.ts:101–139`) only check `isCompletedFeatureCommittedInGit` when `resolvedTasks >= totalTasks`.
   - If any committed historical `docs/features/<slug>/issues/*.md` file on disk has `Status: open`, `claimed`, `ready-for-agent`, or no status header (`resolvedTasks < totalTasks`), the scanner unconditionally returns `source: "docs/features"` even when `git status` has `0` uncommitted file changes and `0` commits waiting.

2. **Subagent Task Fabrication & 10-Minute OpenCode V2 Busy Window (`src/ingress/issue-tracker-scanner.ts`, `src/ingress/daemon-location-state.ts`, `src/ingress/opencode-client-adapter.ts`)**:
   - When `docs/features/` and `git status` are empty, `computeProjectTaskProgress` (`src/ingress/issue-tracker-scanner.ts:316–345`) fabricates `source: "subagents"` tasks from `fallbackSessions`.
   - On the live OpenCode V2 daemon (`session_v2`), `time.idle` is `null` (`0`) while `time.busy` is a timestamp. In `fetchDaemonLocationState` (`src/ingress/daemon-location-state.ts:182–197`), `busyTs > idleTs && cacheNowMs - Math.max(busyTs, updatedTs) < TEN_MINUTES_MS` stays `true` for 10 full minutes after a session or subagent finishes, keeping finished subagents in `activeSessionIds` and causing clean repositories to display `📜 Subagent Tasks (X/Y)`.

3. **Synthetic `"session-results"` (`characterDeliverables`) & Legacy 5-Part Fallbacks (`src/encounter/assembly-results.ts`, `src/encounter/project-mini-assemblies.ts`, `src/scene/frame-encounters.ts`)**:
   - Even when `room.taskProgress` is `0/0 Blueprint Ready`, `deriveGuildAssemblyShowcase` (`src/encounter/assembly-results.ts:153–343`) and `deriveProjectMiniAssemblies` (`src/encounter/project-mini-assemblies.ts:157–182`) fall back to `characterDeliverables` whenever any character has `lastActivityAtMs > cutoffMs`, turning root chat sessions (`quest`), read-only subagents (`subagent`), title-matched sessions (`issue-fixed`), and already-committed `recentTools` edits (`file-change`) into **Assembly Parts**.
   - Furthermore, `completedQuestsCount`, `activeQuestsCount`, `subagentReportsCount`, and `issuesFixedCount` are incremented outside the cutoff check, and `buildFrameEncounters` (`src/scene/frame-encounters.ts:104–114`) still contains a legacy 5-part `createInitialGoalAssembly(5)` fallback when `taskProgress` is undefined.

4. **Split-Brain State Between Goal Assembly Site & Assembly Commit Ledger (`src/server/git-router.ts`, `src/state/batch-reconciler.ts`, `src/web/commit-ledger-controller.ts`, `src/web/top-bar-reconciler.ts`, `src/web/app-main.ts`)**:
   - `handleTasksHydrated` (`src/state/batch-reconciler.ts:89`) drops `0/0` reset events when `roomId` is omitted.
   - `syncRoomTaskProgress` (`src/server/git-router.ts:105–118`) refuses to reset an open `docs/features` progress even when `state.isClean` is `true`.
   - `refreshRoomGitState` (`GET /api/guild/git`) is only called when `clientState.ledgerSubtab === "assembly"`, leaving `Overview` and the 2D Canvas out of sync with live Git cleanliness when opening or switching projects.

## Architectural Solution (`@improve-codebase-architecture`)

See `docs/architecture-review/architecture-review-20261110-assembly-working-tree-truth-refactor.html` and `docs/adr/0002-uncommitted-working-tree-assembly-truth.md`.

### 1. Clean-Repo Task Scanner Gate & Tight Daemon Activity Window (`src/ingress/issue-tracker-scanner.ts`, `src/ingress/daemon-location-state.ts`, `src/ingress/opencode-client-adapter.ts`, `src/state/batch-reconciler.ts`)
- **Hard Clean-Repo Gate**: In `computeProjectTaskProgress`, `deriveRoomTaskProgressForGitState`, and `scanProjectIssueTracker` (`src/ingress/issue-tracker-scanner.ts`):
  - When `gitStatus.isGitRepo` is `true` and there are `0` relevant uncommitted working-tree files (`relevantGitFiles.length === 0`), immediately return `BLUEPRINT_READY_TASK_PROGRESS` (`0/0 Blueprint Ready`).
  - When `gitStatus.isGitRepo` is `true` and `relevantGitFiles.length > 0`, only return a `docs/features/<slug>` blueprint if that specific `docs/features/<slug>/` folder itself has uncommitted or untracked files in `gitStatus.files` (and is not retired); otherwise return `deriveWorkingTreeTaskProgressFromGitState(gitStatus)` (`Working Tree Changes`).
  - (When `gitStatus.isGitRepo` is `false`, e.g. in non-git unit-test sandboxes that explicitly write `docs/features/<slug>/issues/*.md`, preserve `scanProjectIssueTracker` scanning of `docs/features/<slug>` if `resolvedTasks < totalTasks` and not retired.)
- **Delete Subagent Task Fabrication**: Remove the `fallbackSessions` / `source: "subagents"` task-progress fabrication block from `computeProjectTaskProgress` (`src/ingress/issue-tracker-scanner.ts:316–345`), and key `taskProgressCache` strictly by `normalizeLocationDirectory(projectDir)`.
- **Tight Daemon Activity Window**: In `fetchDaemonLocationState` (`src/ingress/daemon-location-state.ts:182–205`), replace the 10-minute `TEN_MINUTES_MS` fallback when `s.time?.idle` is `null` (`0`) with a tight `<= 20_000ms` window (or explicit `s.time?.idle > 0 && busyTs > idleTs`) and require a child subagent's parent session to be genuinely active before adding the subagent to `activeSessionIds`.
- **Unconditional `0/0` Reset in `handleTasksHydrated`**: Remove the guard in `src/state/batch-reconciler.ts:89` that drops `0/0` `tasks.hydrated` resets when `event.roomId` is omitted.

### 2. Delete Synthetic `"session-results"` (`characterDeliverables`) & Legacy 5-Part Scene Fallbacks (`src/encounter/assembly-results.ts`, `src/encounter/project-mini-assemblies.ts`, `src/scene/frame-encounters.ts`)
- In `deriveGuildAssemblyShowcase` (`src/encounter/assembly-results.ts`) and `deriveProjectMiniAssemblies` (`src/encounter/project-mini-assemblies.ts`):
  - Delete the `characterDeliverables` (`source: "session-results"`) fallback and `roomCutoffMsByRoom` / `hydratedAtMs` cutoff heuristics.
  - Derive `assembly`, `projectAssemblies`, `deliverables`, `modifiedFiles`, and `metrics` strictly from explicit uncommitted repository work (`room.taskProgress` with `totalTasks > 0` from uncommitted `docs/features/<slug>` blueprints or uncommitted `Working Tree Changes`).
  - When `totalParts === 0` (`0/0 Blueprint Ready`), `deliverables` is `[]`, `modifiedFiles` is `[]`, and `metrics` (`completedQuestsCount`, `activeQuestsCount`, `subagentReportsCount`, `filesModifiedCount`, `issuesFixedCount`, `toolExecutionsCount`) are all `0`.
  - When `totalParts > 0`, compute `metrics` directly from the explicit repository deliverables (`completedQuestsCount: fittedCount`, `activeQuestsCount: totalParts - fittedCount`, `filesModifiedCount: modifiedFiles.length`, `issuesFixedCount: 0`, `subagentReportsCount: 0`, `toolExecutionsCount: 0`).
- In `buildFrameEncounters` (`src/scene/frame-encounters.ts:97–114`):
  - Delete the legacy `else` branch that called `createInitialGoalAssembly(5)` and fitted `2/5..5/5` fake parts from `equippedGrimoires`; use `showcase.assembly` directly (`0/0` when clean).

### 3. Unified Git & Assembly State Synchronization (`src/server/git-router.ts`, `src/web/commit-ledger-controller.ts`, `src/web/top-bar-reconciler.ts`, `src/web/app-main.ts`, `src/web/canvas-assembly-painter.ts`, `src/web/ledger-panel-reconciler.ts`)
- In `syncRoomTaskProgress` (`src/server/git-router.ts:74–151`):
  - Always compute `nextProg = state.isClean ? BLUEPRINT_READY_TASK_PROGRESS : deriveRoomTaskProgressForGitState(directory, state)` and dispatch `tasks.hydrated` whenever `formatTaskProgressSig(prevProg) !== formatTaskProgressSig(nextProg)` (never preserving a stale `docs/features` progress when `state.isClean` is `true`).
- In `src/web/top-bar-reconciler.ts`, `src/web/app-main.ts`, and `src/web/commit-ledger-controller.ts`:
  - Trigger `refreshRoomGitState(room.roomId)` whenever a project room is focused on boot or project-pill click regardless of whether `clientState.ledgerSubtab` is `"overview"` or `"assembly"`, so the server immediately reconciles Git status and `room.taskProgress`.
  - When `getCachedGitState(room.roomId)?.isClean === true` on the client, ensure the room's effective assembly state renders `0/0 Blueprint Ready` immediately without waiting for a secondary round-trip.

## Testing & Verification Decisions

1. **Architecture Invariants (`tests/00-architecture-invariants.test.ts`)**:
   - Every file under `src/` must remain strictly `<= 400` lines.
2. **Unit & Integration Tests (`tests/08-task-telemetry-and-encounter-engine.test.ts`, `tests/26-assembly-commit-ledger-deepening.test.ts`, `tests/33-assembly-results-showcase.test.ts`)**:
   - Verify that a clean Git repository (`0` uncommitted files, `0` commits ahead/behind) with committed `docs/features/<slug>/issues/*.md` files marked `Status: open` or `Status: ready-for-agent`, active/recent chat sessions, completed tool calls in `recentTools`, and child subagents produces `0/0 Blueprint Ready` (`totalParts: 0, fittedCount: 0, deliverables: [], metrics: all 0`) across `deriveProjectTaskProgress`, `deriveGuildAssemblyShowcase`, `deriveProjectMiniAssemblies`, `buildFrameEncounters`, and `renderGoalAssemblySite`.
   - Verify that editing a code file outside `docs/features/` in a repo with committed `docs/features/` folders projects `Working Tree Changes` rather than resurrecting historical features.
   - Verify that modifying or adding files inside `docs/features/<slug>/` activates `source: "docs/features"` for that dirty feature blueprint.
   - Verify that switching projects in the top bar while on `Overview` triggers `refreshRoomGitState` and reconciles `room.taskProgress` to `0/0 Blueprint Ready` when clean.
3. **Docker Container Deployment & Visual Proof (`opencode-pixel-guild-visualizer` on port `4310`)**:
   - Deploy via `npm run docker:up`, run `npm test`, capture `docs/images/assembly-working-tree-truth-refactor.png` via headless Chrome, and visually verify via `read`.
