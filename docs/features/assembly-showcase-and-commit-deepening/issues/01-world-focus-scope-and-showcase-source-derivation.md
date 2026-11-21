# 01: Unified World Focus Scope & Guild Results Showcase Source Derivation

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: none

**What to build:** Unify project/room focus resolution behind `resolveWorldFocusScope` (`src/spatial/project-world.ts`) and deepen `deriveGuildAssemblyShowcase` (`src/encounter/assembly-results.ts`, `src/encounter/project-mini-assemblies.ts`, `src/hud/guild-ledger-vm.ts`, `src/web/commit-ledger-view.ts`) so that HUD cards replace the overloaded `Feature: ... · <milestoneName>` line with truthful source/scope metadata, keep steampunk `milestoneName` lore inside the 2D canvas and hover tooltips, and preserve active session deliverables on `0/0` rooms while still resetting cleanly to `0/0 Blueprint Ready` after a commit.

## Acceptance Criteria

- [x] Keep all files under `src/` strictly `<= 400` lines (`tests/00-architecture-invariants.test.ts`).
- [x] In `src/spatial/project-world.ts`, export a canonical `resolveWorldFocusScope(snapshot, options)` helper that resolves `{ isMultiProjectScope, selectedProjectRoom, scopedRooms, scopedCharacters }` (preserving strict `selectedProjectRoom: null` when `isAllWorldsFocused` is `true`), and delegate `resolveScopedRoomsAndCharacters` (`src/encounter/project-mini-assemblies.ts`) and `resolveScopedRoomIds` (`src/hud/guild-ledger-vm.ts`) to it.
- [x] In `deriveGuildAssemblyShowcase` (`src/encounter/assembly-results.ts`) and `GuildMasterLedgerViewModel["activeGoalAssembly"]` (`src/hud/guild-ledger-vm.ts` / `src/hud/hud-tooltip-types.ts`):
  - Expose `sourceLabel: string` (e.g. `"🌿 Working Tree (1/2 staged)"`, `"📐 Feature Blueprint: <slug> (2/5)"`, `"⚔️ Session Deliverables"`, `"🌐 Multi-Project Assembly (4 worlds)"`, or `"✨ Blueprint Ready"`).
  - Fix the `0/0 Blueprint Ready` suppression bug: when `room.taskProgress` has `totalTasks === 0`, only suppress character deliverables (`file-change`, `issue-fixed`, `subagent`, `quest`) whose activity timestamp is older than or equal to the room's explicit post-commit / clean-sync hydration cutoff, so new or active session deliverables are never wiped out on initial `0/0` boot while Slice 4 (`tests/33`) post-commit reset still clears pre-commit session deliverables to `0/0`.
- [x] In `renderOverviewAssemblyShowcaseCardHtml` and `renderAssemblyShowcaseCardHtml` (`src/web/commit-ledger-view.ts`):
  - Remove the `Feature: <strong>${featureSlug}</strong> · <span class="val-sky">${milestoneName}</span>` row from the HUD cards (keeping `milestoneName` inside 2D canvas tooltips and `GuildAssemblyShowcaseState.milestone`).
  - Render the structured `sourceLabel` in `renderAssemblyShowcaseCardHtml` and turn `renderOverviewAssemblyShowcaseCardHtml` into a compact interactive summary card with clickable **Project Mini-Assembly** pills (`data-select-commit-project`) without a redundant `Open Assembly & Commit` button.
- [x] Update and add unit tests in `tests/33-assembly-results-showcase.test.ts` verifying truthful HUD `sourceLabel` rendering, absence of `Feature: All Guild Worlds ... · Foundation & Steam Conduit` in HUD HTML, and preservation of post-commit `0/0` reset alongside active session deliverables.

## Answer

- Created `src/spatial/world-focus-scope.ts` (`resolveWorldFocusScope`) and re-exported it through `src/spatial/project-world.ts` and `src/spatial/index.ts`, delegating `resolveScopedRoomsAndCharacters`, `resolveScopedRoomIds`, and `getSelectedProjectRoom` to the single canonical focus resolver.
- Added `hydratedAtMs` to `ProjectTaskProgress` (`src/types/core-types.ts`, stamped in `handleTasksHydrated`) and replaced the boolean `roomsWithHydratedProgress` check with `roomCutoffMsByRoom` in `src/encounter/assembly-results.ts` and `src/encounter/project-mini-assemblies.ts`.
- Added structured `sourceLabel` to `GuildAssemblyShowcaseState` and `GuildMasterLedgerViewModel["activeGoalAssembly"]`, removed `Feature: ... · <milestoneName>` from `src/web/commit-ledger-view.ts` HUD cards, and reworked `renderOverviewAssemblyShowcaseCardHtml` into a compact interactive summary strip with clickable project pills (and removed the redundant `Open Assembly & Commit ▸` quick-jump button; verified in `docs/images/remove-open-assembly-commit-button.png`).
- Added Slice 8 in `tests/33-assembly-results-showcase.test.ts`.
