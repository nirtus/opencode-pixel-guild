# Feature Map: Desktop Space Anchoring, Bottom-Docked Inputs, Zero Artificial Pagination, Cinema Mode Removal & Spectator Drawer Deepening

Label: wayfinder:map

## Destination

Deliver the complete desktop space-utilization and architectural deepening specification in [Specification: Desktop Space Anchoring, Bottom-Docked Inputs, Zero Artificial Pagination, Cinema Mode Removal & Spectator Drawer Deepening](./spec.md) through four vertical-slice tickets:
1. **[01: Three-Slot Flex Spectator Drawer & Bottom-Anchored Hero Chat](./issues/01-three-slot-flex-spectator-drawer-and-bottom-anchored-chat.md)** (`Blocked by: None`)
2. **[02: Full-Height Ticker Stream & Zero Artificial Pagination Across Hero Subtabs](./issues/02-full-height-ticker-stream-and-zero-artificial-pagination.md)** (`Blocked by: 01`)
3. **[03: Remove Cinema Mode Completely & Anchor Guild Master Ledger Space (`Overview`, `Assembly & Commit`, `Roster`)](./issues/03-remove-cinema-mode-and-anchor-ledger-overview-assembly-roster.md)** (`Blocked by: 01`)
4. **[04: Deepen Character Sheet View-Model Seam & Unclip Message Hydration](./issues/04-deepen-character-sheet-view-model-and-message-hydration-seam.md)** (`Blocked by: 01`)

## Notes

- **Mode**: Wayfinder charting & design phase complete (`map.md`, `spec.md`, and tickets `01..04` resolved; `GLOSSARY.md` updated; no production code in `src/**` or `tests/**` modified).
- **Domain**: **Spectator Drawer**, **Category Subtab Deck**, **Character Sheet**, **Guild Master Ledger**, **Command Scroll**, **Quest Gate**, **Assembly Commit Ledger**, **Chamber Focus Mode**, **Workshop Room**, **Dungeon Wilds**.
- **Architecture & Desktop Space Review**: [Desktop Space & Architecture Review Report (2026-10-27)](../../architecture-review/architecture-review-20261027-desktop-space.html) (`docs/images/architecture-review-desktop-space-20261027.png`) + live desktop page captures (`docs/images/desktop-page-01-ledger-overview.png` .. `docs/images/desktop-page-12-machines-modal.png`).
- **Specification**: [Feature Specification](./spec.md).
- **Skills to consult**: `codebase-design`, `domain-modeling`, `grilling`, `tdd`, `code-review`.
- **Standing Rules**: Work strictly inside the project root directory (`./`). Never create git worktrees or write files to `/tmp` or `/tmp/opencode`. Every source file in `src/` must remain `<= 400` lines.

## Decisions so far

- [Desktop Space & Architecture Review (2026-10-27)](../../architecture-review/architecture-review-20261027-desktop-space.html): Audited all 12 desktop views (`1600×1000`), selected all 3 architectural deepening candidates, and updated `GLOSSARY.md` definitions for **Guild Master Ledger**, **Character Sheet**, **Command Scroll**, **Chamber Focus Mode**, **Spectator Drawer**, and **Category Subtab Deck**.
- [01: Three-Slot Flex Spectator Drawer & Bottom-Anchored Hero Chat](./issues/01-three-slot-flex-spectator-drawer-and-bottom-anchored-chat.md): Establish a universal 3-slot flex column (`#sheet-header-slot` fixed top, `#sheet-static-slot` flexing to 100% height with scroll-only-on-overflow, and `#sheet-interactive-slot` fixed at the bottom), move `#latest-assistant-response-card` into `#sheet-static-slot`, and anchor `☠ Kill Character` at the bottom of `Hero > Details`.
- [02: Full-Height Ticker Stream & Zero Artificial Pagination Across Hero Subtabs](./issues/02-full-height-ticker-stream-and-zero-artificial-pagination.md): Delete the artificial `pageSize = 6` Ticker pager, `pageSize = 4` Tool Log pager, and `.slice(0, 8)` / `.slice(0, 4)` caps so all items fill 100% of available drawer space and scroll only on overflow.
- [03: Remove Cinema Mode Completely & Anchor Guild Master Ledger Space (`Overview`, `Assembly & Commit`, `Roster`)](./issues/03-remove-cinema-mode-and-anchor-ledger-overview-assembly-roster.md): Delete `Cinema` mode completely across all modules, anchor Commit inputs at the bottom of `Assembly & Commit` while removing `pageSize = 4` file pagination, remove `pageSize = 5` and `max-width: 165px` truncation in `Roster`, fill `Overview`'s bottom space with an active room roster, and widen the desktop Profile/Machines modal to a 2-column `max-width: 760px` layout.
- [04: Deepen Character Sheet View-Model Seam & Unclip Message Hydration](./issues/04-deepen-character-sheet-view-model-and-message-hydration-seam.md): Raise prompt/assistant hydration caps from `400`/`600` chars to `4000` chars (and `recentTools` to `30`), include `outputPreview` on `CharacterSheetViewModel` so `renderHeroSubtabStaticHtml` stops requiring `rawChar`, and deduplicate the 5 copies of `escapeHtml`.

## Not yet specified

<!-- All wayfinder fog has graduated into spec.md and resolved tickets 01..04 -->

## Out of scope

- Changing indoor **Workshop Room** station coordinates or **Dungeon Wilds** combat mechanics.
- Remote `git push` / `git pull` / merge conflict resolution UI.
