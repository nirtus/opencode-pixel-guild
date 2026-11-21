# 01: Per-Project Mini-Assembly Derivation & Multi-Project Platform Layout

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: none

**What to build:** Deepen the **Goal Assembly Site** encounter derivation and spatial layout seam (`src/encounter/project-mini-assemblies.ts`, `src/encounter/assembly-results.ts`, `src/encounter/goal-assembly.ts`, and `src/types/goal-assembly-catalog.ts`) so that `deriveGuildAssemblyShowcase` produces a `1:1` per-project array of `ProjectMiniAssemblyState` entries for every canonical project on the host alongside the host-wide rollup, and `computeMultiProjectAssemblyPlatformLayout` computes non-overlapping mini-assembly bay coordinates on the central platform.

## Acceptance Criteria

- [x] Keep all files under `src/` strictly `<= 400` lines (`tests/00-architecture-invariants.test.ts`) by creating `src/encounter/project-mini-assemblies.ts` (`< 280` lines) and re-exporting its types and helpers through `src/encounter/index.ts` and `src/types/domain.ts`.
- [x] Define `ProjectMiniAssemblyStatus` (`"complete" | "in-progress" | "open" | "blueprint-ready"`), `ProjectMiniAssemblyState`, `ProjectMiniAssemblyBaySpec`, and `MultiProjectAssemblyPlatformLayout` in `src/types/goal-assembly-catalog.ts` / `src/encounter/project-mini-assemblies.ts`:
  - `"complete"`: `totalParts > 0 && fittedCount >= totalParts` (`statusLabel: "★ COMPLETE"`)
  - `"in-progress"`: `totalParts > 0 && fittedCount > 0 && fittedCount < totalParts` (`statusLabel: "⚙️ IN PROGRESS"`)
  - `"open"`: `totalParts > 0 && fittedCount === 0` (`statusLabel: "📐 OPEN"`)
  - `"blueprint-ready"`: `totalParts === 0` (`statusLabel: "✨ READY"`)
- [x] In `deriveGuildAssemblyShowcase` (`src/encounter/assembly-results.ts`) and `deriveProjectMiniAssemblies` (`src/encounter/project-mini-assemblies.ts`):
  - Resolve canonical host projects via `listHostProjectHeraldries(snapshot)` / `resolveRoomCanonicalProjectRoot`, rolling up any child Git `.worktrees` into their parent canonical project so `projectAssemblies` matches the top-bar `Worlds:` project tabs `1:1`.
  - Fix the `0/0 Blueprint Ready` omission bug: ensure canonical projects with `0/0 Blueprint Ready` (clean working tree or post-commit) are retained in `showcase.projectAssemblies` with `status: "blueprint-ready"` rather than disappearing when sibling projects have active tasks.
  - For each canonical project, preserve its **Project Heraldry** (`projectId`, `roomId`, `projectName`, `shortTag`, `crestIcon`, `partyKey`, `primaryHex`, `secondaryHex`, `accentHex`), `featureSlug`, `source`, `status`, `statusLabel`, `fittedCount`, `totalParts`, `completionRatio`, `percentComplete`, `isComplete`, `milestone` (`resolveGoalAssemblyMilestone`), and `parts` (`readonly GoalAssemblyPartState[]`).
  - Expose `projectAssemblies: readonly ProjectMiniAssemblyState[]` and `isMultiProjectScope: boolean` on `GuildAssemblyShowcaseState`.
- [x] Implement `computeMultiProjectAssemblyPlatformLayout(projectAssemblies, boundsPx)` in `src/encounter/project-mini-assemblies.ts` to partition the central platform deck (`boundsPx`) into a clean, non-overlapping responsive grid of `ProjectMiniAssemblyBaySpec` bays (`1×1`, `1×2`, `1×3`, `2×2`, `2×3`, `2×4`).
- [x] Add unit tests in `tests/33-assembly-results-showcase.test.ts` verifying per-project status preservation (`complete`, `in-progress`, `open`, `blueprint-ready`), worktree-to-canonical-project rollup, and non-overlapping multi-project bay layout geometry.

## Answer

Created `src/encounter/project-mini-assemblies.ts` and deepened `deriveGuildAssemblyShowcase` (`src/encounter/assembly-results.ts`) so `isMultiProjectScope` (`🌐 All`) preserves a `1:1` `projectAssemblies` array across all canonical host projects (`complete`, `in-progress`, `open`, and `blueprint-ready`) and computes non-overlapping mini-assembly bay coordinates via `computeMultiProjectAssemblyPlatformLayout`.
