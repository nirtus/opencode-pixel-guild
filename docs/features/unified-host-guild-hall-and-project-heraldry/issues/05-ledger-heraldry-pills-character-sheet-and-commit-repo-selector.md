# 05: Guild Master Ledger Heraldry Pills, Character Sheet Badge & Commit Repository Selector

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01: Unified Host Workshop Room Co-Habitation & Non-Isolating Project Legend, 02: Project-Seeded Guild Order Uniforms & Collision-Free Project Heraldry

**What to build:** Display colored **Project Heraldry** pills on every character row in the **Guild Master Ledger** and in the **Character Sheet** header, badge project directories in the Summon Adventurer modal, and add a compact project repository selector pill bar to the `Assembly & Commit` subtab so **Goal Assembly Site** tasks and **Assembly Commit Ledger** Git operations scope cleanly to a selected project repository.

**Blocked by:** 01: Unified Host Workshop Room Co-Habitation & Non-Isolating Project Legend, 02: Project-Seeded Guild Order Uniforms & Collision-Free Project Heraldry

**Status:** resolved

- [x] Every character row in the **Guild Master Ledger** (`Overview` Quest Gate alerts, `Overview` quick-jump roster, and `Roster` subtab) renders a colored **Project Heraldry** pill (`[Crest Short-Tag]`) beside the character's title.
- [x] Selecting any character on the canvas or in the roster opens their **Character Sheet** (`Hero` tab) with their **Project Heraldry** badge (`Crest Project Name · Directory`) in the sheet header and automatically syncs the active repository focus target to that character's project.
- [x] Opening the `Assembly & Commit` subtab in the **Guild Master Ledger** displays a compact project repository selector pill bar whenever multiple projects are open on the host, scoping the **Goal Assembly Site** task checklist and **Assembly Commit Ledger** Git status, diffs, staging, and commits to the selected repository.
- [x] Opening the Summon Adventurer modal lists all open project directories on the host with their **Project Heraldry** crests so a newly summoned **Guild Adventurer** spawns into the shared **Workshop Room** wearing the chosen project's colors.
- [x] End-to-end tests verify **Guild Master Ledger** project pills, **Character Sheet** project badges, Summon modal project options, and per-repository switching in the **Assembly Commit Ledger**.

## Answer

Exposed `projectHeraldry` on `CharacterSheetViewModel` (`src/hud/character-sheet-vm.ts`), rendered `Project Heraldry` pills on all roster rows and the `data-select-commit-project` repository selector bar in `renderGuildMasterLedgerPanel` (`src/web/ledger-panel-reconciler.ts`), rendered the `inv-pill-project` badge in `reconcileSidePanel` (`src/web/side-panel-reconciler.ts`), synced `selectedProjectId` on character selection in `reconcileMobileDrawerSelection` (`src/web/client-state.ts`), and listed all host project directories with their heraldry crests in `syncSummonModalDom` (`src/web/summon-adventurer-controller.ts`).
