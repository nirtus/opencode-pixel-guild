# 02: Collapse Split-Brain Scene & Canvas Pipeline Behind One Scene Seam

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01

**What to build:** Unify the tested **Scene Frame** producer and the live browser renderer around a single canonical `1600×720` dual-chamber geometry (`800×720` **Workshop Room** + `800×720` **Dungeon Wilds**) shared by both the browser `Canvas2D` paint adapter and the automated `HeadlessInspector` test adapter, with pure pre-render choreography stepping, dynamic $N$-socket **Goal Assembly Site** layout, and interactive hit-testing for hover tooltips and the **Demolition Bomb** modal.

**Blocked by:** 01: Unify Workflow Intent, Preparation Station Taxonomy & Toil-Queue Choreography

**Status:** resolved

- [x] The `1600×720` dual-chamber layout (`800×720` **Workshop Room** + `800×720` **Dungeon Wilds**) is produced by a single pure `buildGuildSceneFrame` function consumed by both the live browser `Canvas2D` adapter and the `HeadlessInspector` test adapter.
- [x] All particle, flare, and timer state updates execute in a pre-render `stepChoreography` pass; canvas painters are 100% stateless consumers of `GuildSceneFrame`.
- [x] The central **Goal Assembly Site** dynamically computes and renders sockets for all tasks in the active feature (`totalTasks`, scaling cleanly beyond 5 **Assembly Part**s) and triggers a golden snap burst when a finished part is fitted.
- [x] Pointer hover and click events in the browser use `hitTestSceneFrame` to display **Scene Object Tooltip**s over **Preparation Station**s, **Bug Monster**s, **Assembly Part**s, and characters, and to open the **Demolition Bomb** confirmation modal when clicking the room's bomb fixture.
- [x] Automated headless scene tests and a live headless Chrome screenshot (`http://127.0.0.1:4310/`) verify the unified dual-chamber scene, dynamic assembly sockets, and interactive tooltips/modals.

## Answer

1. **Pre-Render Choreography Stepping & Stateless Painters (`src/web/client-choreography.ts`, `src/web/canvas-assembly-painter.ts`, `src/web/canvas-wilds-painter.ts`, `src/web/app-main.ts`)**:
   - Extracted all state/particle/flare/timer mutations out of `renderGoalAssemblySite`, `renderOutdoorWilderness`, and `renderCanvasFrame` into `stepClientChoreography(dtSec, nowMs)` in `src/web/client-choreography.ts`, called at the start of every frame prior to drawing.
   - `renderGoalAssemblySite` and `renderOutdoorWilderness` are now pure stateless painters that never mutate `lastResolvedTasksCount`, `mutationFlashTimer`, `slayVictoryTimer`, `lastActiveBugCount`, `snapParticles`, or `lanternFlares`.
2. **Dynamic $N$-Socket Goal Assembly Site Layout (`src/web/canvas-assembly-painter.ts`, `src/encounter/goal-assembly.ts`)**:
   - Connected `createGoalAssemblyFromTaskProgress` and `computeGoalAssemblyPlatformLayout` via `resolveActiveGoalAssemblyAndLayout()` in `src/web/canvas-assembly-painter.ts` so the central **Goal Assembly Site** dynamically computes and renders sockets for arbitrary task counts (`totalTasks`, including $>5$ tasks), drawing resolved tasks as vibrant fitted **Assembly Part**s and unresolved tasks as dashed blueprint wireframe sockets.
3. **Unified `hitTestSceneFrame` Bridge, Tooltips & Demolition Bomb Modal (`src/scene/frame-hit-test.ts`, `src/web/canvas-room-painter.ts`, `src/web/pointer-and-camera.ts`, `src/types/station-catalog.ts`, `src/hud/tooltip-fixtures-vm.ts`)**:
   - Added the interactive **Demolition Bomb** fixture (`💣 DEMOLISH`) at `(76, 610)` in `src/web/canvas-room-painter.ts`.
   - Connected `src/web/app-main.ts` and `src/web/pointer-and-camera.ts` to `hitTestSceneFrame` from `src/scene/index.ts` and `buildSceneObjectTooltip` from `src/hud/spectator-hud.ts`, populating priority-sorted `sceneHitboxes` for all 8 **Preparation Station**s, $N$ **Goal Assembly Site** sockets, **Bug Monster**s, characters, and the **Demolition Bomb** fixture, driving `#alcove-tooltip` on hover and `#demolition-modal` (`DELETE /api/guild/room?roomId=...`) on click.
4. **Verification**:
   - Verified with unit tests in `tests/09-choreography-and-project-isolation.test.ts` (all 107 tests across 49 suites passing, all `src/` files `<= 400` lines) and live headless Chrome screenshot `docs/images/ticket-02-unified-scene-and-dynamic-assembly.png`.
