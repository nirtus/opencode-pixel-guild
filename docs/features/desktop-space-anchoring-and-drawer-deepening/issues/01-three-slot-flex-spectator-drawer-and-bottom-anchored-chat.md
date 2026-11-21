# 01: Three-Slot Flex Spectator Drawer & Bottom-Anchored Hero Chat

Type: grilling
Label: wayfinder:grilling
Status: resolved
Blocked by: None

## Question

How should the **Spectator Drawer** (`#character-sheet`) structure its DOM slots and flex rules across desktop and mobile so that `Details > Hero` (`Chat`, `Details`, `Scrolls & Gear`, `Tool Log`) anchors to `100%` of available vertical and horizontal space, keeps interactive inputs (**Command Scroll** composer, **Quest Gate** controls, and session termination action) fixed at the bottom, and enables a scrollbar only when content overflows?

## Answer

Confirmed in Grilling Round 1 (`Q1`):
- Make `.character-sheet` a universal flex column (`display: flex; flex-direction: column; height: 100%; min-height: 0; overflow: hidden;`) on both desktop (`> 960px`) and mobile (`<= 960px`) in `src/web/styles.css`:
  1. `#sheet-header-slot` (`order: 1; flex-shrink: 0`) renders only the hero identity header and **Category Subtab Deck** bar.
  2. `#sheet-static-slot` (`order: 2; flex: 1 1 0; min-height: 0; display: flex; flex-direction: column; overflow-y: auto`) stretches to `100%` of the available height between the subtab bar and the bottom dock, enabling a scrollbar only when content exceeds that space.
  3. `#sheet-interactive-slot` (`order: 3; flex-shrink: 0; margin-top: auto`) remains pinned at the bottom of the drawer for the **Quest Gate** card and **Command Scroll** composer.
- Move `#latest-assistant-response-card` (`💬 Adventurer Dispatch Log`) out of `#sheet-header-slot` (`src/web/side-panel-reconciler.ts`) and into `#sheet-static-slot` (`renderHeroSubtabStaticHtml` in `src/web/hero-subtabs-reconciler.ts`) with `flex: 1 1 0; min-height: 0; display: flex; flex-direction: column` and an internal scrollable transcript (`flex: 1 1 0; min-height: 0; overflow-y: auto`).
- Anchor `.kill-section-wrap` (`☠ Kill Character (Delete Session)`) to the bottom of `Hero > Details` (`margin-top: auto; flex-shrink: 0`) and remove the duplicate `.kill-section-wrap` injection in `src/web/side-panel-reconciler.ts`.

## Acceptance Criteria

- [x] `.character-sheet` is `display: flex; flex-direction: column; height: 100%; min-height: 0; overflow: hidden;` on desktop and mobile with `#sheet-header-slot` (`order: 1`), `#sheet-static-slot` (`order: 2; flex: 1 1 0; min-height: 0; overflow-y: auto`), and `#sheet-interactive-slot` (`order: 3; margin-top: auto; flex-shrink: 0`).
- [x] In `Details > Hero > Chat`, `#latest-assistant-response-card` renders inside `#sheet-static-slot` and stretches to `100%` of available vertical space above the bottom-fixed **Command Scroll** composer, scrolling only when content overflows.
- [x] In `Details > Hero > Details`, `.kill-section-wrap` is anchored at the bottom of the drawer (`margin-top: auto`) and the duplicate `.kill-section-wrap` block in `src/web/side-panel-reconciler.ts` is deleted.
