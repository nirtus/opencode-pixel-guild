# 01: Delta-Only Activity Ticker Log & Lazy Character Sheet Markdown Reconciliation

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: none

**What to build:** Eliminate full-snapshot retention and 80x per-frame `JSON.stringify` stalls in the **Spectator Drawer** Activity Ticker, deduplicate `buildScopedActivityTicker()` across `syncSpectatorDrawerChrome()` and `reconcileTicker()`, and memoize `buildAdventurerDispatchLogViewModel()` (both whole-log and per-turn `formatChatMarkdownHtml()`) so that SSE updates never stringify full world snapshots or re-parse 60 turns of Markdown when unchanged or when viewing other subtabs.

## Acceptance Criteria

- [x] Keep all files under `src/` strictly `<= 400` lines (`tests/00-architecture-invariants.test.ts`).
- [x] In `src/web/app-main.ts`, push delta-only records (`{ delta: emission.delta }`) into `clientState.tickerLog` instead of full `emission` objects containing `emission.snapshot`, so `clientState.tickerLog` never retains historical `GuildSnapshot` copies in memory.
- [x] In `src/hud/activity-ticker-and-tui-vm.ts` (`buildActivityTickerViewModel`), replace `const dedupeKey = JSON.stringify(item)` with a fast O(1) structural key derived from delta/entry metadata (`version`, `kind`, `timestampMs`, `sessionId`, `roomId`, `description` / `summary`), and memoize `buildScopedActivityTicker()` in `src/web/ledger-panel-reconciler.ts` so `syncSpectatorDrawerChrome()` and `reconcileTicker()` share a single computed `ActivityTickerViewModel` per HUD sync frame.
- [x] In `src/hud/chat-markdown-formatter.ts`, memoize `buildAdventurerDispatchLogViewModel()` per session message digest and cache per-turn `formatChatMarkdownHtml()` output by `(messageId, cleanText.length)` so unchanged turns reuse their pre-rendered HTML strings in O(1) time during live assistant token streaming and across non-chat SSE frames.
- [x] Add unit and integration tests at the Spectator Drawer View-Model & Reconciler seam verifying delta-only `tickerLog` retention, O(1) ticker deduplication, single-pass ticker evaluation per HUD sync, and O(1) memoized dispatch log Markdown formatting across streaming and non-streaming SSE frames.

## Answer

- Extracted `recordSseTickerEmission()` and `getScopedActivityTicker()` into `src/web/activity-ticker-cache.ts` and wired `src/web/app-main.ts` so `clientState.tickerLog` stores only `{ delta }` records (capped at 40, never holding `GuildSnapshot` objects) and `syncSpectatorDrawerChrome()` + `reconcileTicker()` (`src/web/ledger-panel-reconciler.ts`) share a single memoized ticker computation per HUD sync frame.
- Replaced `JSON.stringify(item)` in `src/hud/activity-ticker-and-tui-vm.ts` with an O(1) structural `computeTickerItemDedupeKey()` derived from delta/entry metadata.
- Extracted `buildAdventurerDispatchLogViewModel()` into `src/hud/dispatch-log-cache.ts` with exact-text-verified whole-log, `turns`-array, sanitization, and per-turn HTML LRU caches (with per-formatter `WeakMap` isolation so custom formatters never poison the shared default cache), and added `{ includeDispatchLog }` on `buildCharacterSheetViewModel()` (`src/hud/character-sheet-vm.ts`) gated in `src/web/side-panel-reconciler.ts` on `mobileActiveTab === "character" && isSheetVisible && activeSubtab === "chat"`.
- Verified with `tests/52-visualizer-runtime-performance.test.ts` (Ticket 01 Slices 1–4c), full `npm test`, and live deployment on `opencode-pixel-guild-visualizer` (`port 4310`).
