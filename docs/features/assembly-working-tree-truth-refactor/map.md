# Feature Map: Goal Assembly Site & Working-Tree Truth Refactor

Label: wayfinder:map

## Destination

Deliver the **Goal Assembly Site & Working-Tree Truth Refactor** (`docs/features/assembly-working-tree-truth-refactor/spec.md`, `docs/architecture-review/architecture-review-20261110-assembly-working-tree-truth-refactor.html`, and `docs/adr/0002-uncommitted-working-tree-assembly-truth.md`) across three focused implementation tickets:
1. Gate `deriveProjectTaskProgress`, `deriveRoomTaskProgressForGitState`, and `scanProjectIssueTracker` strictly on uncommitted Git working-tree truth (ignoring committed historical `docs/features/<slug>` folders even when their issues have `open` or `ready-for-agent` status, deleting `source: "subagents"` task fabrication, tightening the OpenCode V2 `time.idle === null` busy window in `fetchDaemonLocationState`, and allowing unconditional `0/0` resets in `handleTasksHydrated`).
2. Delete the `characterDeliverables` (`source: "session-results"`) fallback and `hydratedAtMs` heuristics from `deriveGuildAssemblyShowcase` and `deriveProjectMiniAssemblies`, delete the legacy 5-part `createInitialGoalAssembly(5)` fallback from `buildFrameEncounters`, and scope `GuildResultsMetrics` strictly to active uncommitted assembly work (`0` when `0/0 Blueprint Ready`).
3. Unify `syncRoomTaskProgress` in `git-router.ts` and eager client Git/task synchronization across `Overview`, `Assembly & Commit`, and the 2D **Goal Assembly Site** canvas so opening or switching to a clean project always displays `0/0 ✨ Blueprint Ready`.

## Notes

- **Domain**: `Goal Assembly Site`, `Project Mini-Assembly`, `Assembly Part`, `Guild Results Showcase`, `Assembly Commit Ledger`, `Guild Master Ledger`, and `Authoritative Live State` (`GLOSSARY.md`, `ADR-0001`, & `ADR-0002`).
- **Architecture Review**: `docs/architecture-review/architecture-review-20261110-assembly-working-tree-truth-refactor.html`.
- **Rules**:
  - Work strictly inside the project root directory (`./`); never create git worktrees or use `/tmp/opencode`.
  - Keep every source file strictly `<= 400` lines (`tests/00-architecture-invariants.test.ts`).
  - Update project documentation (`README.md`, `GLOSSARY.md`, `docs/adr/`), deploy to the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`), run `npm test`, and capture visual proof in `docs/images/assembly-working-tree-truth-refactor.png`.
- **Skills to consult**: `codebase-design`, `domain-modeling`, `tdd`.

## Decisions so far

<!-- the index: one line per closed ticket, enough to judge relevance, then zoom the link for the detail the ticket holds -->

- **01 (`./issues/01-clean-repo-task-progress-and-daemon-activity-gate.md` — resolved)**: Gated `deriveProjectTaskProgress`, `deriveRoomTaskProgressForGitState`, and `scanProjectIssueTracker` strictly on uncommitted Git working-tree truth (`0` dirty files => `0/0 Blueprint Ready`), required dirty `docs/features/<slug>/` files in `git status` to activate a feature blueprint in a Git repo, deleted `source: "subagents"` task fabrication, and tightened the OpenCode V2 `time.idle === null` busy window in `fetchDaemonLocationState` to `20_000ms`.
- **02 (`./issues/02-delete-session-results-and-legacy-scene-fallbacks.md` — resolved)**: Deleted the `characterDeliverables` (`source: "session-results"`) synthesis loop and `hydratedAtMs` cutoff heuristics from `deriveGuildAssemblyShowcase` and `deriveProjectMiniAssemblies`, removed the legacy 5-part `createInitialGoalAssembly(5)` fallback in `buildFrameEncounters`, and scoped showcase metrics strictly to uncommitted repository items (`0` when `0/0 Blueprint Ready`).
- **03 (`./issues/03-unified-git-and-assembly-state-synchronization.md` — resolved)**: Updated `syncRoomTaskProgress` in `git-router.ts` to reset `room.taskProgress` to `0/0 Blueprint Ready` whenever `state.isClean === true`, enabled eager `refreshRoomGitState` on boot and project switch across all subtabs (`Overview` and `Assembly & Commit`), updated `README.md`, `GLOSSARY.md`, and `ADR-0002`, and verified on the `opencode-pixel-guild-visualizer` Docker container (`4310:4310`).

## Not yet specified

<!-- in-scope fog you can't ticket yet; graduates as the frontier advances -->

## Out of scope

- Changing 2D canvas `Preparation Station` perimeter slots or `Dungeon Wilds` monster combat choreography.
