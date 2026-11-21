# 02: Delete Synthetic Session-Results & Legacy 5-Part Scene Fallbacks

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01

**What to build:** Refactor `deriveGuildAssemblyShowcase` (`src/encounter/assembly-results.ts`), `deriveProjectMiniAssemblies` (`src/encounter/project-mini-assemblies.ts`), and `buildFrameEncounters` (`src/scene/frame-encounters.ts`) so that **Assembly Parts**, **Project Mini-Assemblies**, **Guild Results Showcase** deliverables, and showcase metrics derive strictly from uncommitted repository work (`room.taskProgress` with `totalTasks > 0`), deleting the `characterDeliverables` (`source: "session-results"`) synthesis loop, `hydratedAtMs` cutoff heuristics, and the legacy 5-part `createInitialGoalAssembly(5)` scene fallback.

## Acceptance Criteria

- [x] Keep all files under `src/` strictly `<= 400` lines (`tests/00-architecture-invariants.test.ts`).
- [x] In `src/encounter/assembly-results.ts` and `src/encounter/project-mini-assemblies.ts`:
  - Delete `characterDeliverables` synthesis (`quest`, `subagent`, `issue-fixed`, and `recentTools` `file-change` fabrication) and `roomCutoffMsByRoom` / `hydratedAtMs` cutoff heuristics.
  - Derive single-project and multi-project (`🌐 All`) **Goal Assembly Site** parts, **Project Mini-Assembly** statuses, `deliverables`, `modifiedFiles`, and `metrics` strictly from `explicitDeliverablesByRoom` (`room.taskProgress` where `totalTasks > 0`).
  - When a project has `0` explicit repository tasks (`totalTasks === 0`), its **Project Mini-Assembly** is `0/0 ✨ READY` (`status: "blueprint-ready"`), and its showcase has `totalParts: 0`, `fittedCount: 0`, `deliverables: []`, `modifiedFiles: []`, and all `metrics` equal to `0`.
  - When `totalParts > 0`, compute `metrics` from the uncommitted assembly items (`completedQuestsCount: fittedCount`, `activeQuestsCount: totalParts - fittedCount`, `filesModifiedCount: modifiedFiles.length`, `issuesFixedCount: 0`, `subagentReportsCount: 0`, `toolExecutionsCount: 0`).
- [x] In `src/scene/frame-encounters.ts` (`lines 97–114`):
  - Delete the legacy `else` fallback that called `createInitialGoalAssembly(5)` and fitted `2/5..5/5` parts based on `equippedGrimoires`; use `showcase.assembly` directly (`0/0` when clean).
- [x] Update `tests/33-assembly-results-showcase.test.ts` to verify that sessions with chat quests, subagents, passing tests, and `recentTools` file edits never fabricate **Assembly Parts** when `room.taskProgress` is `0/0 Blueprint Ready` (or unset), while dirty `Working Tree Changes` and uncommitted `docs/features/<slug>` blueprints populate **Assembly Parts** and **Project Mini-Assemblies** accurately in both single-project and `🌐 All` modes.

## Answer

- Deleted the `characterDeliverables` (`source: "session-results"`) synthesis loop, `cleanFilePathFromPreview`, `isPassingVerificationOutput`, and `roomCutoffMsByRoom` / `hydratedAtMs` cutoff heuristics from `src/encounter/assembly-results.ts` and `src/encounter/project-mini-assemblies.ts`.
- Grounded `deriveGuildAssemblyShowcase` and `deriveProjectMiniAssemblies` strictly in uncommitted repository work (`explicitDeliverablesByRoom`), ensuring `totalParts: 0, fittedCount: 0, deliverables: [], modifiedFiles: [], metrics: all 0` whenever a project has `0` uncommitted repository tasks.
- Removed the legacy 5-part `createInitialGoalAssembly(5)` fallback in `src/scene/frame-encounters.ts` and updated `tests/33-assembly-results-showcase.test.ts`.
