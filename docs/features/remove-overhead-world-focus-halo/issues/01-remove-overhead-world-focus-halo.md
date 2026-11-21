# 01: Show Underfoot World Focus Circle Only on Selected Project Characters

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: None

## Question / Task

Gate the underfoot ground circle (`y = 16`, `ry = 7` and `ry = 9`) in `drawCharacterHero()` (`src/web/canvas-hero-painter.ts`) strictly inside `if (worldFocus.isFocusedMember)` (while keeping the overhead `auraY` halo circle removed), so that:
- When `🌐 All` worlds is selected (`isAllWorldsFocused === true` or `selectedProjectId === null`), **no** character has an underfoot circle.
- When a specific project world is selected, **only** characters belonging to that selected project (`worldFocus.isFocusedMember === true`) have the underfoot circle, and characters from unselected projects (`worldFocus.isFocusedMember === false`) have **no** underfoot circle.

## Checklist

- [x] In `src/web/canvas-hero-painter.ts` (`drawCharacterHero`, lines 271–288), wrap the entire underfoot circle drawing block (`c.ellipse(0, 16, 22, 7, ...)` and outer dashed `c.ellipse(0, 16, 26 + ..., 9, ...)`) inside `if (worldFocus.isFocusedMember) { ... }`.
- [x] In `src/web/world-persistence.ts` (`applyPreferencesToStateTarget`), set `targetState.isAllWorldsFocused = true` when `prefs.selectedProjectId` is `null` (and `false` when a project is explicitly selected) so `🌐 All` stays active across page reloads instead of auto-snapping to `projTabs[0]`.
- [x] In `tests/23-unified-host-guild-hall-and-project-heraldry.test.ts`, update the Ticket 03 test to verify that `ellipseCount === 0` when no project is focused (`All` worlds) and `ellipseCount >= 1` when the character's project is focused.
- [x] In `tests/24-gamemaster-drawer-and-world-focus.test.ts`, update the Ticket 03 test to verify that:
  - Focused project character (`ses_viz`) renders the underfoot circle (`ellipseRadiiY.includes(7)` and `ellipseRadiiY.includes(9)`) and no overhead halo (`!ellipseRadiiY.includes(4.2)`).
  - Unselected project character (`ses_api`) renders zero underfoot circles (`ellipseRadiiY.length === 0`) and is dimmed at `0.45` alpha.
  - When `isAllWorldsFocused = true` (`All` worlds), `drawCharacterHero` renders zero underfoot circles (`ellipseRadiiY.length === 0`).
- [x] Deploy to the Docker container (`npm run docker:up`), run `npm test`, capture a live screenshot at `docs/images/remove-overhead-world-focus-halo.png`, and visually verify the container output.

## Answer

Gated the entire underfoot ground circle (`y = 16`, `ry = 7` and `ry = 9`) inside `if (worldFocus.isFocusedMember)` in `src/web/canvas-hero-painter.ts` and synchronized `isAllWorldsFocused` in `applyPreferencesToStateTarget` (`src/web/world-persistence.ts`) when `selectedProjectId` is `null`. Updated `tests/23-unified-host-guild-hall-and-project-heraldry.test.ts` and `tests/24-gamemaster-drawer-and-world-focus.test.ts` (all 224 tests passing), deployed to the `opencode-pixel-guild-visualizer` Docker container on port `4310`, and verified via live screenshot (`docs/images/remove-overhead-world-focus-halo.png`) that when `🌐 All` is active (or on unselected projects) no underfoot circle is drawn, and when a specific project is selected only that project's characters display the underfoot circle (with no overhead halo circle above the head).
