# Specification: Show Underfoot World Focus Circle Only on Selected Project Characters (No Overhead Halo, No Unselected Underfoot Circle)

## Summary

1. Remove the overhead halo circle above the heads of characters belonging to a selected project (`worldFocus.isFocusedMember`).
2. Render the underfoot ground circle (`y = 16`) **only** when a specific project (world) is selected in the top-bar `Worlds:` strip AND the character belongs to that selected project (`worldFocus.isFocusedMember === true`). When `🌐 All` is active (`worldFocus.isWorldFocused === false`) or when a character belongs to an unselected project (`worldFocus.isFocusedMember === false`), draw **no** underfoot circle at all.

## Background & Problem Statement

Previously, `drawCharacterHero()` in `src/web/canvas-hero-painter.ts` drew:
1. An unconditional underfoot pedestal ellipse (`c.ellipse(0, 16, 22, 7, ...)`) on **every** character at all times—even when `🌐 All` worlds was selected or when a character belonged to an unselected project.
2. When a project was selected (`worldFocus.isFocusedMember === true`), both a second outer dashed underfoot ellipse (`rx = 26 ± 1.5, ry = 9`) AND an overhead halo circle above the head (`auraY`).

Each character already displays its project identity via its Guild Order uniform palette and its two-segment `[CREST SHORT-TAG] Title` nameplate directly under its feet. Showing an underfoot circle on every character when `All` is selected (or on unselected projects) makes the circle meaningless as a project-selection highlight.

## Requirements

1. **Underfoot Circle Only When Project World Is Selected (`src/web/canvas-hero-painter.ts` & `src/web/world-persistence.ts`)**:
   - Gate the entire underfoot ground circle block (`y = 16`, `c.ellipse(0, 16, 22, 7, ...)` and outer dashed `c.ellipse(0, 16, 26 + ..., 9, ...)`) inside `if (worldFocus.isFocusedMember)`.
   - In `applyPreferencesToStateTarget` (`src/web/world-persistence.ts`), set `targetState.isAllWorldsFocused = true` when `prefs.selectedProjectId` is `null` (and `false` when a project is explicitly selected) so `🌐 All` stays active across page reloads.
   - When `🌐 All` is selected (`selectedProjectId === null` or `isAllWorldsFocused === true`), `worldFocus.isFocusedMember` is `false` for all characters, so **no** character renders an underfoot circle.
   - When a specific project is selected in `Worlds:`, **only** characters belonging to that project (`worldFocus.isFocusedMember === true`) render the underfoot circle; characters from unselected projects (`worldFocus.isFocusedMember === false`, dimmed to `0.45` alpha) render **no** underfoot circle.
2. **No Overhead Circle Above Head (`src/web/canvas-hero-painter.ts`)**:
   - Keep the overhead `auraY` halo ellipse block removed so selected-project characters never have a second circle above their heads.
3. **Update Automated Tests (`tests/23-unified-host-guild-hall-and-project-heraldry.test.ts` & `tests/24-gamemaster-drawer-and-world-focus.test.ts`)**:
   - In `tests/23-unified-host-guild-hall-and-project-heraldry.test.ts`, verify that when no project is focused (`All` worlds), `drawCharacterHero()` renders `0` underfoot ellipses (`ellipseCount === 0`), and when the character's project is focused (`selectedProjectId = "/work/opencode-game-visualizer"`), it renders the underfoot **World Focus Aura** circle (`ellipseCount >= 1`).
   - In `tests/24-gamemaster-drawer-and-world-focus.test.ts`, verify that when a project is selected:
     - Focused project character (`ses_viz`) renders the underfoot circle (`ellipseRadiiY.includes(7)` and `ellipseRadiiY.includes(9)`) and **no** overhead halo (`!ellipseRadiiY.includes(4.2)`).
     - Unselected project character (`ses_api`) renders **zero** underfoot ellipses (`ellipseRadiiY.length === 0`) and is dimmed to `0.45` alpha.
     - When `isAllWorldsFocused = true` (`All` worlds), `drawCharacterHero()` renders **zero** underfoot ellipses (`ellipseRadiiY.length === 0`).
4. **Deploy & Verify on Docker Container (`opencode-pixel-guild-visualizer:4310`)**:
   - Rebuild and start the Docker container (`npm run docker:up`), run `npm test`, and capture live headless Chrome screenshots confirming:
     - When a project is selected, only that project's characters have the underfoot circle (and no circle above their heads).
     - When `All` is selected (or on unselected project characters), no underfoot circle is drawn.
