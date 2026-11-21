# Feature Map: Hidable Gamemaster Spectator Drawer, 65/35 Split Room/Wilds Ratio & 50% Thinking Pacing Slowdown

Label: wayfinder:map

## Destination

Deliver the complete UI, spatial ratio, and choreography specification in [Specification: Hidable Gamemaster Spectator Drawer, 65/35 Split Room/Wilds Ratio & 50% Thinking Pacing Slowdown](./spec.md) through three vertical-slice implementation tickets:
1. **[01: Hidable Gamemaster Spectator Drawer & Icon Toggle Button](./issues/01-hidable-gamemaster-drawer-and-icon-toggle.md)** (`Blocked by: None`)
2. **[02: Split World 65/35 Workshop Room & Dungeon Wilds Width Ratio](./issues/02-split-world-65-35-room-wilds-width-ratio.md)** (`Blocked by: None`)
3. **[03: Thinking Pacing 50% Slowdown & Container Visual Verification](./issues/03-thinking-pacing-50-percent-slowdown-and-visual-proof.md)** (`Blocked by: 01, 02`)

## Notes

- **Mode**: Wayfinder charting & specification complete (`map.md`, `spec.md`, and tickets `01..03` created; `GLOSSARY.md` updated).
- **Domain**: **Spectator Drawer**, **Category Subtab Deck**, **Chamber Focus Mode**, **Workshop Room**, **Dungeon Wilds**, **Goal Assembly Site**, **Toil Queue**.
- **Specification**: [Feature Specification](./spec.md).
- **Skills to consult**: `codebase-design`, `domain-modeling`, `tdd`, `code-review`.
- **Standing Rules**: Work strictly inside the project root directory (`./`). Never create git worktrees or write files to `/tmp` or `/tmp/opencode`. Every source file in `src/` must remain `<= 400` lines. Deploy and verify on the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`) with visual proof in `docs/images/`.

## Decisions so far

- [Specification: Hidable Gamemaster Spectator Drawer, 65/35 Split Room/Wilds Ratio & 50% Thinking Pacing Slowdown](./spec.md): Locked all four Grilling Round 1 decisions (`Q1–Q4`) and updated `GLOSSARY.md` definitions for **Toil Queue**, **Chamber Focus Mode**, **Spectator Drawer**, and **Category Subtab Deck**:
  1. Place a compact icon toggle button (`#btn-toggle-gamemaster`) immediately to the right of `⚡ Ticker` in `.drawer-tabs` to hide the Gamemaster panel (**Spectator Drawer**), expanding `.world-section` to `100%` width and surfacing `#btn-restore-gamemaster` in the World toolbar, with `isGamemasterCollapsed` persisted and mutually exclusive with `isWorldCollapsed`.
  2. Change the split world chamber width ratio from `50 / 50` to `65%` **Workshop Room** and `35%` **Dungeon Wilds** (`SPLIT_ROOM_WIDTH_RATIO = 0.65`, `SPLIT_WILDS_WIDTH_RATIO = 0.35`) with bidirectional coordinate projection in `src/scene/camera.ts`.
  3. Slow down characters pacing around the **Goal Assembly Site** while `Thinking` by `50%` (`77.5 px/s` movement speed, `dtMs * 0.006` walk cycle rate, and `4000ms` leg period) while preserving `155 px/s` for normal station-to-station transit.
- [01: Hidable Gamemaster Spectator Drawer & Icon Toggle Button](./issues/01-hidable-gamemaster-drawer-and-icon-toggle.md): Added `#btn-toggle-gamemaster` (`⇥`) to the right of `⚡ Ticker`, `#btn-restore-gamemaster` (`⇤`) in the World toolbar when collapsed, `data-gamemaster-hidden` layout rules, and persisted `isGamemasterCollapsed` with `isWorldCollapsed` mutual exclusion.
- [02: Split World 65/35 Workshop Room & Dungeon Wilds Width Ratio](./issues/02-split-world-65-35-room-wilds-width-ratio.md): Changed split world chamber width ratio to `65%` **Workshop Room** and `35%` **Dungeon Wilds** (`SPLIT_ROOM_WIDTH_RATIO = 0.65`, `SPLIT_WILDS_WIDTH_RATIO = 0.35`) with bidirectional coordinate projection in `src/scene/camera.ts`.
- [03: Thinking Pacing 50% Slowdown & Container Visual Verification](./issues/03-thinking-pacing-50-percent-slowdown-and-visual-proof.md): Reduced `Thinking` pacing speed around the **Goal Assembly Site** by `50%` (`77.5 px/s`, `dtMs * 0.006` walk cycle, `0.5x` bob/frame cadence, `4000ms` leg period), added `tests/28-gamemaster-toggle-and-pacing-tuning.test.ts`, and verified on the `opencode-pixel-guild-visualizer` Docker container.

## Not yet specified

<!-- All wayfinder fog has graduated into spec.md and tickets 01..03 -->

## Out of scope

- Changing the desktop column ratio between the World section and the expanded Gamemaster **Spectator Drawer** (remains `50% : 50%` when both are open).
- Changing station-to-station transit speed (`155 px/s`) when walking to or from Preparation Stations.
