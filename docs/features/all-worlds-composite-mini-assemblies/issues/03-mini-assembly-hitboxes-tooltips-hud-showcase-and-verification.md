# 03: Mini-Assembly Hitboxes, Hover Tooltips, HUD Showcase Sync & Live Container Verification

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01, 02

**What to build:** Connect canvas hitboxes, hover tooltips, click-to-focus interaction, the headless scene frame builder, and the **Guild Master Ledger** (`Overview` and `Assembly & Commit` subtabs) to the deepened `projectAssemblies` contract, update project documentation, and verify the rendered visuals on the live `opencode-pixel-guild-visualizer` Docker container (`:4310`).

## Acceptance Criteria

- [x] **Canvas Hitboxes & Click-to-Focus (`src/web/client-choreography.ts` & `src/web/canvas-input-controller.ts`)**:
  - When `🌐 All` is active (`isMultiProjectScope`), register scene hitboxes in `populateDualChamberSceneHitboxes` for each **Project Mini-Assembly** bay (carrying `roomId`, `projectId`, `shortTag`, `crestIcon`, `partyKey`, `status`, `statusLabel`, `fittedCount`, `totalParts`, `featureSlug`, and `milestoneName`).
  - When clicking a **Project Mini-Assembly** bay on the canvas in `🌐 All` mode, focus that project (`selectCommitRepository(projectId)`) or open the **Guild Master Ledger** `Assembly & Commit` subtab scoped to that project.
- [x] **Hover Tooltips (`src/hud/tooltip-encounters-vm.ts` & `src/hud/hud-tooltip-types.ts`)**:
  - Enrich `buildGoalAssemblySocketTooltip` so hovering a **Project Mini-Assembly** bay (or socket with project heraldry) displays `[CREST SHORT-TAG] ProjectName`, its status (`★ COMPLETE`, `⚙️ IN PROGRESS`, `📐 OPEN`, `✨ READY`), part progress (`X/Y · P%`), feature/source title, and milestone tier.
- [x] **HUD `Guild Results Showcase` Sync (`src/hud/guild-ledger-vm.ts` & `src/web/commit-ledger-view.ts`)**:
  - Expose `projectAssemblies` on `GuildMasterLedgerViewModel["activeGoalAssembly"]`.
  - In `renderOverviewAssemblyShowcaseCardHtml` and `renderAssemblyShowcaseCardHtml`, when multiple projects exist (or `🌐 All` is active), render a compact **Project Mini-Assemblies** strip (`data-select-commit-project="<projectId>"`) displaying each project's `[CREST SHORT-TAG]`, distinct status badge (`★ DONE 4/4`, `⚙️ 2/5`, `📐 0/3`, `✨ READY 0/0`), and completion styling so the HUD mirrors the canvas **Goal Assembly Site**.
- [x] **Headless Scene Unification (`src/scene/frame-encounters.ts`)**:
  - Delegate `buildFrameEncounters` Goal Assembly state construction to `deriveGuildAssemblyShowcase` and remove the legacy `equippedGrimoires` fake part synthesis.
- [x] **Documentation & Live Docker Visual Verification**:
  - Update `README.md`, `GLOSSARY.md`, and `docs/adr/0001-unified-host-workshop-room-and-project-heraldry.md` to reflect **Project Mini-Assemblies** on the `🌐 All` **Goal Assembly Site**.
  - Deploy to the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`), run `npm test` (confirming all tests and the 400-line invariant pass), capture `docs/images/all-worlds-composite-mini-assemblies.png` via headless Chrome, and visually inspect the screenshot via `read`.

## Answer

Connected `appendGoalAssemblySceneHitboxes`, `buildGoalAssemblySocketTooltip`, `buildGuildMasterLedgerViewModel`, `renderProjectMiniAssembliesStripHtml`, and `buildFrameEncounters` to `showcase.projectAssemblies`. Also optimized `scanGitStatusSync` (`--no-optional-locks` + `-c core.filemode=false`) on Docker bind mounts, updated `README.md`, `GLOSSARY.md`, and `ADR-0001`, deployed to `opencode-pixel-guild-visualizer` on `:4310`, and verified the live composite 6-project mini-assembly grid (`★ DONE 3/3` on `GAME-VIZ` + 5 `✨ READY 0/0` project bays) in `docs/images/all-worlds-composite-mini-assemblies.png`.
