# 05: On-Demand Command Scroll Composer & Situational HUD Cards

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 04

**What to build:** Turn the **Command Scroll** composer into an on-demand collapsible bar (and hide it completely while a **Quest Gate** form is open), and render situational HUD cards in the **Spectator Drawer** only when active data exists.

**Blocked by:** 04

**Status:** resolved

- [x] **On-Demand Collapsible `Command Scroll` Composer (`src/web/client-state.ts`, `src/web/command-scroll-controller.ts`, `src/web/styles-components.css`)**:
  - Add `isCommandScrollExpanded: boolean` (default `false`) to `clientState`.
  - When `sheet.pendingQuestGate` is non-null, render **only** `renderQuestGateCardHtml(sheet, rawChar)` in `#sheet-interactive-slot` and hide the **Command Scroll** composer completely so they never double-stack.
  - When `sheet.pendingQuestGate` is null on `Hero -> Chat` and `isCommandScrollExpanded === false`, render a sleek 36px trigger bar (`📜 Compose Command Scroll... [Click or press /]`).
  - Clicking the trigger bar (or pressing `/` when no input is focused) sets `isCommandScrollExpanded = true`, revealing the full composer (textarea, `@skill` chips, `Steer`/`Queue`/`Stop` controls) and focusing `#command-scroll-input`.
  - Clicking `Collapse ▾`, pressing `Esc`, or successfully sending a **Command Scroll** collapses the bar back (`isCommandScrollExpanded = false`).
- [x] **Situational Information Objects Audit Enforcement (`src/web/ledger-panel-reconciler.ts`, `src/web/hero-subtabs-reconciler.ts`, `src/web/commit-ledger-controller.ts`)**:
  - In `General -> Overview`: Render the **Dungeon Wilds** threat card **only** when `bugs.length > 0`; render the **Goal Assembly Site** summary card **only** when `totalTasks > 0`.
  - In `General -> Assembly & Commit`: Hide the Commit Form dock when `gitState.files.length === 0`; when modified files exist, render a compact `🚀 Prepare Commit (N files)...` trigger bar that expands the commit title/description form on click.
  - In `Hero -> Details`: Render the **Squad Subagent** lineage card **only** when `sheet.childSubagents.length > 0`.
- [x] **Unit & Integration Tests**: Verify that the **Command Scroll** composer is collapsed by default, expands on click/`/`, collapses on send/`Esc`, is hidden when a **Quest Gate** is active, and empty situational cards (`0` bugs, `0` tasks, `0` modified files, `0` subagents) are omitted from the DOM.

## Answer

Implemented and verified with unit/integration tests in `tests/24-gamemaster-drawer-and-world-focus.test.ts` and live 1600x1000 headless Chrome screenshots in `docs/images/`.
