# Specification: Desktop Space Anchoring, Bottom-Docked Inputs, Zero Artificial Pagination, Cinema Mode Removal & Spectator Drawer Deepening

## Problem Statement

A visual audit of all desktop views (`1600×1000`, `60%` **Project World** : `40%` **Spectator Drawer**) surfaced five structural failures that leave 50–75% of the **Spectator Drawer** unused while clipping or artificially paginating content:

1. **`Details > Hero` (`Character Sheet`) Lacks a Desktop Flex Column & Floats Inputs Mid-Panel**:
   - In `src/web/styles.css` (`lines 273–281`), `.character-sheet` is a plain block (`overflow: hidden; height: 100%`); the `display: flex; flex-direction: column` and `order: 1 | 2 | 3` rules on `#sheet-header-slot`, `#sheet-static-slot`, and `#sheet-interactive-slot` only exist inside `@media (max-width: 960px)` (`src/web/styles-responsive.css:257–281`).
   - Worse, `src/web/side-panel-reconciler.ts` (`lines 197–233`) injects `#latest-assistant-response-card` (`💬 Adventurer Dispatch Log`) inside `#sheet-header-slot` while `renderHeroSubtabStaticHtml(..., "chat")` (`src/web/hero-subtabs-reconciler.ts:47–49`) returns `""` for `#sheet-static-slot`.
   - As a result, in `Hero > Chat`, the assistant reply is squeezed into a ~220px header card (and hard-sliced at `600` characters in `src/ingress/daemon-message-hydration.ts:233` and `src/ingress/daemon-sse-mapper.ts:78,185,199`), the **Command Scroll** composer (`#sheet-interactive-slot`) floats in the middle of the panel (`y ≈ 430–540px`), and the bottom ~460px (~50% of the screen height) is empty void.
   - In `Hero > Details`, `.kill-section-wrap` (`☠ Kill Character`) floats at `y ≈ 415px` above 565px of blank space (and is duplicated in both `hero-subtabs-reconciler.ts:239–253` and `side-panel-reconciler.ts:241–251`). In `Hero > Tool Log`, `pageSize = 4` (`hero-subtabs-reconciler.ts:145`) forces a pagination bar after 4 compact rows (~180px) while >65% of the drawer is empty. In `Hero > Scrolls & Gear`, `beltEntries.slice(0, 8)` truncates the tool belt and the inventory card does not expand to fill remaining space.

2. **`Details > Ticker` Paginates at 6 Rows While >70% of the Drawer Is Empty**:
   - When the `⚡ Ticker` tab is active (`data-drawer-tab="ticker"`), `.ticker-panel` spans the full height of the **Spectator Drawer** (`grid-row: 2 / 4; height: 100%` in `src/web/styles.css:271`, ~920px on a 1000px screen).
   - However, `reconcileTicker()` (`src/web/ledger-panel-reconciler.ts:311–339`) hardcodes `const pageSize = 6;` and `.ticker-entries` (`src/web/styles.css:336`) sets `overflow: hidden` without `flex: 1`, rendering 6 tiny rows (~165px) and a `◀ Prev · Page 1 / 4 · Next ▶` bar above >700px (~75%) of unused space.

3. **`Cinema [⛶]` Mode Provides Zero Value & Leaks Across 6 Modules**:
   - `clientState.isCinemaMode` (`src/web/client-state.ts:137`), `#cinema-toggle-btn` (`src/web/ledger-panel-reconciler.ts:185`), `#btn-exit-cinema-floating` (`src/web/app.html:100`), `data-details-hidden` (`src/web/styles.css:157–163`), and `.exit-cinema-floating` (`src/web/styles-components.css:5–6`) clutter the **Guild Master Ledger** header and overlap top-bar controls while failing the deletion test.

4. **`Details > General` (`Guild Master Ledger`) Wastes Vertical & Horizontal Space & Bypasses View-Models**:
   - `General > Overview` uses only the top ~35% of the drawer height, leaving ~600px empty at the bottom.
   - `General > Assembly & Commit` hardcodes `pageSize = 4` on uncommitted Git files (`src/web/commit-ledger-controller.ts:70`), caps tasks at `.slice(0, 5)` (`src/web/ledger-panel-reconciler.ts:81`), truncates diff previews to a single 220-character `nowrap` line, and leaves the Commit Message + `🚀 Seal & Commit` inputs floating mid-panel instead of anchored to the bottom.
   - `General > Roster` hardcodes `pageSize = 5` (`src/web/ledger-panel-reconciler.ts:108`) and `.roster-row-title { max-width: 165px }` (`src/web/styles-components.css:219`), truncating session titles on the left while leaving ~260px of horizontal dead space inside every 616px button.
   - Reconcilers in `src/web/` bypass `buildCharacterSheetViewModel` and `buildGuildMasterLedgerViewModel` by passing `rawChar: CharacterState` to re-derive display badges and `outputPreview`, and duplicate `escapeHtml` 5 times across `src/web/`.

5. **Desktop Operator Profile & Machines Modal (`#operator-pairing-modal`) Crushes into a Single 460px Column**:
   - On desktop (`> 960px`), `.modal-dialog` is constrained to `max-width: 460px`, forcing a tall vertical scrollbar when viewing Profile Settings alongside Paired OpenCode Machines & QR Pairing.

---

## Core Design Decisions (Confirmed in Grilling Round 1, Q1–Q5)

### Decision 1: Universal 3-Slot Flex Column in the Spectator Drawer (Desktop & Mobile)

- `.character-sheet` (`#character-sheet`) is a full-height flex column (`display: flex; flex-direction: column; height: 100%; min-height: 0; overflow: hidden;`) on **all** viewports (desktop and mobile).
- Every view rendered inside `#character-sheet` (**Character Sheet** and **Guild Master Ledger**) adheres to a persistent 3-slot flex structure:
  1. **`#sheet-header-slot`** (`order: 1; flex-shrink: 0`): Identity header bar + **Category Subtab Deck** bar only.
  2. **`#sheet-static-slot`** (`order: 2; flex: 1 1 0; min-height: 0; display: flex; flex-direction: column; overflow-y: auto`): The active subtab's content body, anchored to `100%` of the available vertical and horizontal space between the header and the bottom dock. The vertical scrollbar remains inactive when content fits and activates automatically only when content overflows.
  3. **`#sheet-interactive-slot`** (`order: 3; flex-shrink: 0; margin-top: auto`): The bottom-anchored interactive/action dock:
     - In `Hero > Chat` (and any `Hero` subtab when a **Quest Gate** is open): houses the **Quest Gate** resolution card and the **Command Scroll** composer fixed at the bottom.
     - In `Hero > Details`: houses the `.kill-section-wrap` (`☠ Kill Character (Delete Session)`) confirmation dock at the bottom.
     - In `General > Assembly & Commit`: houses the Commit Message Title, Commit Description, and `🚀 Seal & Commit` action form docked at the bottom.

### Decision 2: Full-Height `Hero > Chat` Transcript & Unclipped Message Hydration

- Move `#latest-assistant-response-card` (`💬 Adventurer Dispatch Log`) out of `#sheet-header-slot` (`src/web/side-panel-reconciler.ts`) and render it inside `#sheet-static-slot` via `renderHeroSubtabStaticHtml(..., "chat")`.
- Give `.dispatch-log-card` `flex: 1 1 0; min-height: 0; display: flex; flex-direction: column; margin-bottom: 0;` and make its message transcript container `flex: 1 1 0; min-height: 0; overflow-y: auto;` so the conversation fills `100%` of the space above the bottom-docked **Command Scroll** composer.
- Raise the assistant and user message hydration limits in `src/ingress/daemon-message-hydration.ts`, `src/ingress/daemon-sse-mapper.ts`, and `src/state/tool-and-gate-handlers.ts` from `400` / `600` characters to `4000` characters (and increase `recentTools` retention from `12` to `30`) so assistant responses are never clipped mid-sentence while space is available.

### Decision 3: Eliminate Artificial Small-Page Pagination Across `Ticker`, `Hero`, and `General`

- **`Details > Ticker`**:
  - Delete `const pageSize = 6;`, `clientState.tickerPage`, and the `.deck-pagination-bar` from `reconcileTicker()` (`src/web/ledger-panel-reconciler.ts`).
  - Pass all `40` retained emissions to `buildActivityTickerViewModel(clientState.tickerLog, 40)` and style `.ticker-entries` with `flex: 1 1 0; min-height: 0; overflow-y: auto;` so the live activity stream fills `100%` of the **Spectator Drawer** height and scrolls only on overflow.
- **`Hero > Tool Log` & `Hero > Scrolls & Gear` & `Hero > Details`**:
  - Remove `const pageSize = 4;` and `clientState.toolsPage` pagination from `Hero > Tool Log`; render all recorded `sheet.recentTools` inside a flex-filling `.sheet-card` (`flex: 1 1 0; min-height: 0; overflow-y: auto`) with expandable multi-line input/output previews.
  - Remove `beltEntries.slice(0, 8)` in `Hero > Scrolls & Gear` and `sheet.childSubagents.slice(0, 4)` in `Hero > Details`, letting the bottom card in each subtab flex to fill the remaining vertical space.
- **`General > Roster`, `General > Assembly & Commit`, & `General > Overview`**:
  - Remove `const pageSize = 5;` (`clientState.rosterPage`) from `General > Roster` and `const pageSize = 4;` (`clientState.commitFilesPage`) + `tasks.slice(0, 5)` from `General > Assembly & Commit`.
  - Remove `max-width: 165px` / `155px` / `120px` from `.roster-row-title`, `.roster-row-title-bold`, and `.roster-row-reason` on desktop (`flex: 1 1 auto; min-width: 0`) so roster rows use the full horizontal width of the drawer.
  - In `General > Overview`, fill the remaining vertical space below the telemetry summary cards with a flex-filling **Active Room Roster & Quick Jump** card (`flex: 1 1 0; min-height: 0; overflow-y: auto`) so the default desktop view anchors `100%` of its height.

### Decision 4: Complete Removal of `Cinema` Mode & Desktop 2-Column Operator Modal

- Delete `isCinemaMode` from `src/web/client-state.ts`.
- Delete `#btn-exit-cinema-floating` and `data-details-hidden` from `src/web/app.html`.
- Delete `#cinema-toggle-btn`, `nextDetailsHidden`, and `exitCinemaBtn` wiring from `src/web/ledger-panel-reconciler.ts`, and remove `cinema: clientState.isCinemaMode` from `src/web/side-panel-reconciler.ts`.
- Delete `.main-stage[data-details-hidden="true"]` from `src/web/styles.css` and `.exit-cinema-floating` from `src/web/styles-components.css`.
- On desktop (`> 960px`), widen `#operator-pairing-modal .modal-dialog` to `max-width: min(760px, calc(100vw - 32px))` with a 2-column layout for the Profile + Paired Machines view so it fits without vertical scrolling.

### Decision 5: Deepen the View-Model Seam & Deduplicate Reconciler Helpers

- Extend `CharacterSheetViewModel` (`src/hud/character-sheet-vm.ts`) so `recentTools` includes `outputPreview` and display-badge fields (`workflowShortLabel`, `overheadVerb`), eliminating the need to pass `rawChar: CharacterState` into `renderHeroSubtabStaticHtml`.
- Consolidate the 5 duplicated `escapeHtml` / `esc` functions into a single shared helper and delete the duplicate `.kill-section-wrap` injection from `src/web/side-panel-reconciler.ts`.
