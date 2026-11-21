# Feature Map: Goal Assembly Site & Guild Results Showcase Refactoring

Label: wayfinder:map

## Destination

Deliver the complete refactoring specified in [Specification: Goal Assembly Site & Guild Results Showcase Refactoring](./spec.md) so the central **Goal Assembly Site** on the 2D canvas and the **Guild Master Ledger** (`Overview` and `Assembly & Commit` subtabs) synthesize and display live **Assembly Parts** and **Guild Results** (completed quests, subagent reports, modified files, fixed issues, feature tasks, and Git commits) across both `🌐 All` and single-project views.

## Notes

- **Domain**: **Goal Assembly Site**, **Assembly Part**, **Guild Results Showcase**, **Guild Master Ledger**, **Assembly Commit Ledger**, **Project Heraldry**.
- **Standing Rules**: Work strictly inside `./`. Never create git worktrees or use `/tmp/opencode`. Keep every file in `src/` `<= 400` lines. Deploy and verify on `opencode-pixel-guild-visualizer` Docker container on port `4310` with visual proof in `docs/images/`.
- **Skills to consult**: `tdd`, `codebase-design`, `domain-modeling`, `code-review`.

## Decisions so far

- [Specification: Goal Assembly Site & Guild Results Showcase Refactoring](./spec.md): Defined the multi-signal **Guild Results Showcase** and **Goal Assembly Site** architecture across `src/encounter/assembly-results.ts`, `src/hud/guild-ledger-vm.ts`, `src/web/canvas-assembly-painter.ts`, and `src/web/ledger-panel-reconciler.ts`.
- [01: Multi-Signal Assembly & Guild Results Engine (`src/encounter/assembly-results.ts`)](./issues/01-multi-signal-assembly-results-engine.md): Created `deriveGuildAssemblyShowcase` synthesizing explicit feature/working-tree tasks and live character deliverables (modified files, fixed issues, subagent reports, and completed/active quests) with **Project Heraldry**.
- [02: `🌐 All` Worlds & 2D Canvas Goal Assembly Platform Showcase](./issues/02-all-worlds-and-canvas-assembly-platform-showcase.md): Connected `resolveActiveGoalAssemblyAndLayout()` and `stepClientChoreography()` to `deriveGuildAssemblyShowcase` across both `🌐 All` and single-project views.
- [03: HUD `Overview` & `Assembly & Commit` Guild Results Showcase Display](./issues/03-hud-overview-and-assembly-results-ledger-display.md): Upgraded `buildGuildMasterLedgerViewModel` and `renderGuildMasterLedgerPanel` to render the **Guild Results Showcase** metrics ribbon and deliverables list in `Overview` and `Assembly & Commit`.
- [04: Docker Container Deployment, Full Test Suite & Visual Proof on Port 4310](./issues/04-docker-verification-and-visual-proof.md): Deployed to `opencode-pixel-guild-visualizer` on port `4310`, verified `246/246` passing tests, and captured `docs/images/assembly-results-showcase-verified.png` and `docs/images/assembly-overview-showcase-verified.png`.

## Not yet specified

<!-- All wayfinder fog has graduated into spec.md and tickets 01..04 -->

## Out of scope

- Remote `git push` / `git pull` network operations.
- Modifying unrelated outdoor **Dungeon Wilds** combat mechanics.
