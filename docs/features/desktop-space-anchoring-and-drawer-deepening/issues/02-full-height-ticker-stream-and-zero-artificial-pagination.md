# 02: Full-Height Ticker Stream & Zero Artificial Pagination Across Hero Subtabs

Type: grilling
Label: wayfinder:grilling
Status: resolved
Blocked by: 01

## Question

Should we eliminate the artificial fixed-row pagination bars (`pageSize = 6` in `Details > Ticker` and `pageSize = 4` in `Hero > Tool Log`) and `.slice()` caps (`beltEntries.slice(0, 8)` in `Hero > Scrolls & Gear`, `childSubagents.slice(0, 4)` in `Hero > Details`) so that all items render inside full-height flex containers that fill `100%` of the available drawer space and only scroll when entries exceed the viewport?

## Answer

Confirmed in Grilling Round 1 (`Q2`):
- Delete `const pageSize = 6;`, `clientState.tickerPage`, and `.deck-pagination-bar` from `reconcileTicker()` (`src/web/ledger-panel-reconciler.ts`). Render all retained activity entries (`buildActivityTickerViewModel(clientState.tickerLog, 40)`) inside `.ticker-entries` styled with `flex: 1 1 0; min-height: 0; overflow-y: auto;` (`src/web/styles.css`) so the activity stream fills `100%` of the **Spectator Drawer** height and scrolls only on overflow.
- Delete `const pageSize = 4;`, `clientState.toolsPage`, and `.deck-pagination-bar` from `Hero > Tool Log` (`src/web/hero-subtabs-reconciler.ts`); make the Tool Log card fill `100%` of `#sheet-static-slot` (`flex: 1 1 0; min-height: 0; overflow-y: auto`) with expandable multi-line input/output previews.
- Remove `beltEntries.slice(0, 8)` in `Hero > Scrolls & Gear` and `sheet.childSubagents.slice(0, 4)` in `Hero > Details`, letting the bottom card in each subtab flex to fill remaining vertical height.

## Acceptance Criteria

- [x] `Details > Ticker` has zero pagination controls (`data-ticker-page-dir` / `tickerPage` removed) and `.ticker-entries` uses `flex: 1 1 0; min-height: 0; overflow-y: auto` to fill `100%` of the drawer height.
- [x] `Hero > Tool Log` has zero pagination controls (`data-tools-page-dir` / `toolsPage` removed) and renders all recent tools inside a flex-filling scrollable card.
- [x] `Hero > Scrolls & Gear` and `Hero > Details` render all Tool Belt and child **Squad Subagent** pills without `.slice(0, 8)` or `.slice(0, 4)` truncation, anchoring the bottom card to the available vertical space.
