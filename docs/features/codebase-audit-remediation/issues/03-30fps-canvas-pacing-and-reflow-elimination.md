# 03: 30 FPS Canvas Frame-Pacing Cap, Camera Gesture Bypass & 60Hz Layout Reflow Elimination

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: None (can start immediately)

**What to build:** Cap the live **Guild Floorplan** canvas render and choreography loop at **30 FPS** (`~33.3ms` interval) to cut redundant 60–144Hz sprite bucket redraws by 50–75% while immediately bypassing the throttle during active user camera pan, pinch, or wheel-zoom gestures, eliminate per-frame synchronous DOM layout reflows in the viewport camera synchronizer, memoize **Goal Assembly Site** layout derivation, and stop idle **Break Lounge** characters from re-triggering slot transitions on every frame.

**Blocked by:** None (can start immediately)

**Status:** resolved

## Acceptance Criteria

- [x] Every modified or created source module remains strictly `<= 400` lines.
- [x] The browser `requestAnimationFrame` loop gates normal canvas choreography and painting to **30 FPS** (`~33.3ms` frame budget, skipping work when `< 31ms` has elapsed since the previous rendered frame) while preserving delta-time walking speed, **Stride Cadence**, and the 8-frame headless Chrome screenshot fast-forward.
- [x] Active user camera pan, pinch, and wheel-zoom gestures set an active gesture flag that bypasses the 30 FPS gate so interactive camera movement renders immediately at pointer rate, and re-initializing backend connections never spawns duplicate concurrent `requestAnimationFrame` loops.
- [x] The viewport camera synchronizer moves all DOM button text, class, and attribute mutations after the signature early-return check and caches container layout measurements across frames until invalidated by window resize, split-resizer drag, or explicit force refresh.
- [x] Settled characters resting in the **Break Lounge** only invoke a slot transition when their target station, overhead label, or target coordinates (`> 3px`) actually change, reducing idle Lounge transition churn to zero.
- [x] Active **Goal Assembly Site** layout derivation and URL viewport query parsing are memoized per state version rather than recomputed multiple times per frame.
- [x] Automated tests verify the 30 FPS frame-pacing gate, instant camera-gesture bypass, zero DOM writes on unchanged camera signatures, and zero idle **Break Lounge** slot transitions, verified on the `opencode-pixel-guild-visualizer` Docker container.

## Answer

1. **30 FPS Canvas Frame-Pacing Cap & Active Camera-Gesture Bypass (`src/web/app-main.ts`, `src/web/client-state.ts`, `src/web/pointer-and-camera.ts`)**:
   - Added `cameraGestureActive: false` to `clientState` and exported `TARGET_CANVAS_FPS = 30`, `TARGET_FRAME_INTERVAL_MS = 1000 / 30`, `MIN_FRAME_DELTA_MS = 31`, and `shouldRenderCanvasFrameAtTimestamp(...)`.
   - Gated `renderCanvasFrame` in `src/web/app-main.ts` behind `shouldRenderCanvasFrameAtTimestamp` with single-loop `scheduleNextCanvasFrame()` tracking (`activeRafId`), and wired `initPointerAndCameraControls` to toggle `clientState.cameraGestureActive` during pointer pan/pinch and wheel-zoom gestures.
2. **Per-Frame Layout Reflow Elimination (`src/web/pointer-and-camera.ts`)**:
   - Moved all DOM button class, text, and `data-chamber-view` attribute mutations in `syncViewportCameraFit` after the `sig === lastAutoCameraSignature` early return, and cached `getBoundingClientRect()` layout measurements keyed by `${vw}x${vh}:${isGamemasterCollapsed}:${worldRatio}`.
3. **Break Lounge Idle Stability & Goal Assembly Memoization (`src/web/client-choreography.ts`, `src/web/character-action-queue.ts`, `src/web/canvas-assembly-painter.ts`)**:
   - Guarded `currentlyRestingAtLounge` slot transitions in `stepClientChoreography` with `hasRestingLoungeSlotChanged` and avoided stamping sequence numbers on discarded same-job idle candidates in `enqueueCharacterActions`.
   - Memoized `resolveActiveGoalAssemblyAndLayout()` and URL `?vw=` query parsing (`getCachedQueryViewportWidth()`).
   - Verified on the live Docker container (`docs/images/audit-remediation-t03-30fps-pacing-and-reflow.png`).
