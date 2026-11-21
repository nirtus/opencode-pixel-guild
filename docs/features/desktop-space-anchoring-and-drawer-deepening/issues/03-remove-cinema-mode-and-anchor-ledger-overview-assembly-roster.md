# 03: Remove Cinema Mode Completely & Anchor Guild Master Ledger Space (`Overview`, `Assembly & Commit`, `Roster`)

Type: grilling
Label: wayfinder:grilling
Status: resolved
Blocked by: 01

## Question

How should we remove `Cinema [⛶]` mode across the codebase, widen the desktop operator Profile/Machines modal, and restructure the three **Guild Master Ledger** (`Details > General`) subtabs (`Overview`, `Assembly & Commit`, and `Roster`) so they anchor to `100%` of available vertical and horizontal space with commit inputs docked at the bottom?

## Answer

Confirmed in Grilling Round 1 (`Q3` & `Q5`):
- Delete `isCinemaMode` (`src/web/client-state.ts`), `#cinema-toggle-btn` and `data-details-hidden` synchronization (`src/web/ledger-panel-reconciler.ts`, `src/web/side-panel-reconciler.ts`), `#btn-exit-cinema-floating` (`src/web/app.html`), `.main-stage[data-details-hidden="true"]` (`src/web/styles.css`), and `.exit-cinema-floating` (`src/web/styles-components.css`), and update `tests/14-mobile-ux-best-practices.test.ts`.
- Render the **Guild Master Ledger** (`renderGuildMasterLedgerPanel` in `src/web/ledger-panel-reconciler.ts`) as a full-height flex column where:
  - **`General > Overview`**: Renders a flex-filling **Active Room Roster & Quick Jump** card (`flex: 1 1 0; min-height: 0; overflow-y: auto`) below the telemetry summary cards so the bottom 65% of the drawer is anchored.
  - **`General > Assembly & Commit`**: Removes `pageSize = 4` (`clientState.commitFilesPage`) on uncommitted Git files (`src/web/commit-ledger-controller.ts`) and `tasks.slice(0, 5)` (`src/web/ledger-panel-reconciler.ts`), lets the task + uncommitted files list and multi-line diff preview flex to fill available height (`flex: 1 1 0; min-height: 0; overflow-y: auto`), and anchors the Commit Message Title, Commit Description, and `🚀 Seal & Commit` form at the bottom (`margin-top: auto; flex-shrink: 0`).
  - **`General > Roster`**: Removes `pageSize = 5` (`clientState.rosterPage`) pagination and replaces `.roster-row-title { max-width: 165px }`, `.roster-row-title-bold { max-width: 155px }`, and `.roster-row-reason { max-width: 120px }` (`src/web/styles-components.css`) with `flex: 1 1 auto; min-width: 0` so character titles span the full horizontal width of the desktop drawer.
- On desktop (`> 960px`), widen `#operator-pairing-modal .modal-dialog` to `max-width: min(760px, calc(100vw - 32px))` with a 2-column layout for the Profile + Paired Machines view so it fits without vertical scrolling.

## Acceptance Criteria

- [x] `Cinema` mode (`isCinemaMode`, `#cinema-toggle-btn`, `#btn-exit-cinema-floating`, `data-details-hidden`, `.exit-cinema-floating`) is completely removed from the codebase and tests.
- [x] `General > Overview` anchors `100%` of the drawer height by filling the space below the summary cards with an active room roster / quick-jump list.
- [x] `General > Assembly & Commit` removes `pageSize = 4` file pagination and `tasks.slice(0, 5)`, stretches the task and changed-files list (with multi-line diff preview) to fill available space, and docks the Commit Title, Commit Description, and `🚀 Seal & Commit` controls at the bottom.
- [x] `General > Roster` removes `pageSize = 5` pagination and removes the `165px` / `155px` / `120px` `max-width` truncation on `.roster-row-title*` so rows use the full horizontal width of the drawer.
- [x] On desktop (`> 960px`), `#operator-pairing-modal .modal-dialog` expands to a 2-column `max-width: 760px` layout when viewing Profile & Machines.
