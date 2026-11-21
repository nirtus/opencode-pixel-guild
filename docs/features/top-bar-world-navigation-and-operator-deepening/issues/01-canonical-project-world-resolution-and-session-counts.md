# 01: Canonical Project World Resolution & Roster-Aware Session Counting Seam

**What to build:** Unify **Project World** directory matching, persisted project selection resolution, active room filtering, and roster-aware tab session counting behind the canonical **Project World** spatial seam so that top-bar **Project World** buttons (`🏰 <projectName> (<sessionCount>)`) and the **Guild Floorplan** always agree across both `Active Squads` and `Full Lineage` roster modes without duplicated path-matching logic or dead room-button builders.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] The canonical **Project World** layout seam accepts the current roster mode (`active-squads` vs `full-lineage`) and computes accurate session counts on each **Project World** tab (`Active Squads` counts actively open sessions in that project with a floor of `1` when sessions exist; `Full Lineage` counts all sessions across the project root and its worktrees).
- [x] Canonical project root matching, candidate/persisted `selectedProjectId` resolution, and active project room filtering are exposed from the **Project World** spatial seam and used by client state, persistence, and the top-bar reconciler, eliminating duplicated path-matching loops.
- [x] Unused per-room filter button generation in the HUD header strip view-model is retired.
- [x] Automated tests verify canonical **Project World** matching, worktree consolidation, and roster-aware tab session counts in both `active-squads` and `full-lineage` modes, with all source files `<= 400` lines.
