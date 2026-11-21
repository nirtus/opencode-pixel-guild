# Specification: Mobile Screen Adaptation — Chamber Focus Camera, Touch/Pinch Gestures & Spectator Drawer

## 1. Objective & Problem Statement

Adapt the OpenCode Pixel Guild Visualizer web companion (`src/web/`, `src/scene/`) to mobile portrait (`<= 960px` width, e.g. `390×844`) and mobile landscape (`max-height: 540px and orientation: landscape`, e.g. `844×390`) screens while preserving 100% of desktop (`1600×1000`) layout and behavior:

1. **Deepen `src/scene/camera.ts` into a Chamber-Aware Viewport Camera Module**:
   - Introduce **Chamber Focus Mode** (`"auto" | "workshop" | "wilds" | "split"`):
     - `"workshop"` frames the indoor **Workshop Room** (`{ x: 0, y: 0, w: 800, h: 720 }`).
     - `"wilds"` frames the outdoor **Dungeon Wilds** (`{ x: 800, y: 0, w: 800, h: 720 }`).
     - `"split"` frames the full dual-chamber **Guild Floorplan** (`{ x: 0, y: 0, w: 1600, h: 720 }`).
     - `"auto"` resolves to `"workshop"` on narrow portrait viewports (`<= 960px` and not landscape `max-height: 540px`), automatically transitions to `"wilds"` when an active **Debugging Hunt** / **Bug Monster** is present in the active **Project World**, and resolves to `"split"` on desktop (`> 960px`) and mobile landscape (`max-height: 540px`).
   - Provide pure functions:
     - `resolveEffectiveChamberFocus(focusMode, viewportW, viewportH, hasActiveBug): "workshop" | "wilds" | "split"`
     - `computeChamberCameraFit(viewportW, viewportH, chamber): { zoom: number; panX: number; panY: number }`
     - `clampCameraPan(zoom, panX, panY, viewportW, viewportH): { zoom: number; panX: number; panY: number }` (clamping zoom to `[0.35, 2.5]` and ensuring at least 50% of the viewport overlaps the `1600×720` world).
     - `zoomCameraAtFocalPoint(camera, nextZoom, focalScreenX, focalScreenY, viewportW, viewportH)`
     - `screenToWorldCoords(camera, canvasRect, canvasWidth, canvasHeight, clientX, clientY)`
2. **Extract Unified Pointer/Pinch Gesture Controller & Coarse-Pointer Hit-Slop (`src/web/canvas-gesture-controller.ts`, `src/scene/frame-hit-test.ts`)**:
   - Extend `hitTestSceneFrame(frame, worldX, worldY, options?: { hitSlopWorldPx?: number })` in `src/scene/frame-hit-test.ts`:
     - When `hitSlopWorldPx > 0` (e.g. `14 / cameraZoom` on coarse/touch pointers), expand each hitbox by `hitSlopWorldPx` on all sides, sort matching candidates by descending `priority`, and break ties within the same `priority` tier by shortest Euclidean distance from `(worldX, worldY)` to the hitbox center `(hb.x + hb.w / 2, hb.y + hb.h / 2)`.
   - Create `src/web/canvas-gesture-controller.ts` with a pure, testable multi-pointer gesture state machine (`createCanvasGestureState`, `stepPointerDown`, `stepPointerMove`, `stepPointerUp`, `stepWheelZoom`):
     - **1-finger / left-mouse drag pan** with an `8px` movement hysteresis threshold so dragging never triggers an accidental tap selection/deselection.
     - **2-finger pinch-to-zoom + midpoint pan** around the two-finger midpoint.
     - **Double-tap on empty floor** within `300ms` and `24px` resets the camera to fit the current **Chamber Focus Mode**.
     - **Tap-to-inspect on all fixtures**: tapping a `character` selects it and opens the **Spectator Drawer** to the `character` tab (`peek` state on mobile); tapping a `demolition-bomb` opens the confirmation modal; tapping a `workstation`, `goal-assembly-socket`, `bug-monster`, `alcove`, or `break-lounge` pins `#alcove-tooltip` (docked at the top of `.canvas-container` on mobile `<= 960px`); tapping empty floor dismisses the pinned tooltip and collapses the mobile drawer.
3. **Deepen HUD Reconcilers into a 3-State Spectator Drawer & Compact Top Bar (`src/web/side-panel-reconciler.ts`, `src/web/ledger-panel-reconciler.ts`, `src/web/top-bar-reconciler.ts`, `src/web/station-and-workflow-routing.ts`)**:
   - Deduplicate character workflow/station badge resolution into `resolveCharacterDisplayBadge(char, hasActiveBug)` in `src/web/station-and-workflow-routing.ts`.
   - Add responsive HUD state in `src/web/client-state.ts`:
     - `cameraFocusMode: "auto" | "workshop" | "wilds" | "split"` (default `"auto"`)
     - `mobileDrawerState: "collapsed" | "peek" | "expanded"` (default `"collapsed"`)
     - `mobileActiveTab: "ledger" | "character" | "ticker"` (default `"ledger"`)
     - `pinnedTooltipTarget: SceneHitboxTarget | null`
   - Render the **Spectator Drawer** controls (`📜 Ledger` · `🧙‍♂️ Hero Sheet` · `⚡ Ticker` tabs + drag/tap handle) inside `.spectator-sidebar` and the **Chamber Focus Mode** pills (`✨ Auto` · `🏰 Workshop` · `🌫️ Wilds` · `🗺️ Split`) inside `.camera-overlay`.
4. **Partition Responsive Stylesheet (`src/web/styles.css` + `src/web/styles-responsive.css`)**:
   - Keep `src/web/styles.css` and `src/web/styles-responsive.css` each strictly `<= 400` lines.
   - Link `styles-responsive.css` in `src/web/app.html`.
   - Implement `100dvh`, `touch-action: none` on `#guild-canvas`, mobile portrait (`@media (max-width: 960px)`) 3-state bottom-sheet drawer (`52px` collapsed / `45dvh` peek / `82dvh` expanded) + compact `44px` `.top-bar` + `36px` horizontal-scroll `.scenario-bar` + top-docked `#alcove-tooltip`, and mobile landscape (`@media (max-height: 540px) and (orientation: landscape)`) `1600×720` split stage + collapsible right-side overlay drawer.
