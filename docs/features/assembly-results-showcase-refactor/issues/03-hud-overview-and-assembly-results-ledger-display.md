# 03: HUD `Overview` & `Assembly & Commit` Guild Results Showcase Display

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01, 02

## Description

Upgrade `buildGuildMasterLedgerViewModel()` (`src/hud/guild-ledger-vm.ts`) and `renderGuildMasterLedgerPanel()` (`src/web/ledger-panel-reconciler.ts`) so:
1. The subtab bar `⚙️ Assembly & Commit (X/Y)` always reflects the active project's or `🌐 All` aggregated fitted/total **Assembly Parts**.
2. The `Overview` subtab displays the **Guild Results & Assembly Showcase** card summarizing fitted parts, milestone tier, completed quests, subagent reports, modified files, and fixed issues.
3. The `Assembly & Commit` subtab displays the full **Goal Assembly Site & Guild Results Showcase** card (metrics ribbon + categorized deliverables rows with **Project Heraldry** pills and clickable session jump links) in both `🌐 All` and single-project modes alongside the **Assembly Commit Ledger** Git CRUD controls.

## Answer

Updated `buildGuildMasterLedgerViewModel` (`src/hud/guild-ledger-vm.ts`), `renderOverviewAssemblyShowcaseCardHtml` & `renderAssemblyShowcaseCardHtml` (`src/web/commit-ledger-view.ts`), and `renderGuildMasterLedgerPanel` (`src/web/ledger-panel-reconciler.ts`). Verified with `tests/33-assembly-results-showcase.test.ts` (Slice 3).
