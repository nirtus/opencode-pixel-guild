# 01: Chamber Focus Mode Interface & Auto-Pan Trigger Contract (`src/scene/camera.ts`)

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: None

## Question

What is the exact interface and behavioral contract of the deepened `src/scene/camera.ts` module for **Chamber Focus Mode** (`"auto" | "workshop" | "wilds" | "split"`), focal-point zoom, clamped camera panning, and screen-to-world coordinate projection?

## Answer

Locked in `docs/features/mobile-screen-adaptation/spec.md`:
- `ChamberFocusMode = "auto" | "workshop" | "wilds" | "split"`.
- `resolveEffectiveChamberFocus(focusMode, viewportW, viewportH, hasActiveBug)` returns `"split"` when `viewportW > 960` or (`viewportH <= 540 && viewportW > viewportH`), and on portrait (`<= 960px`) returns `"wilds"` when `hasActiveBug` is true and `"workshop"` otherwise.
- `computeChamberCameraFit(viewportW, viewportH, chamber)` frames `0..800×720` (`"workshop"`), `800..1600×720` (`"wilds"`), or `0..1600×720` (`"split"`).
- `clampCameraPan` clamps zoom to `[0.35, 2.5]` and ensures at least 50% of the viewport overlaps the `1600×720` world.
- `zoomCameraAtFocalPoint` preserves the world point under `(focalScreenX, focalScreenY)`.
- `screenToWorldCoords` projects client pointer coordinates accurately across letterboxed or dynamically sized viewports.
- [x] Implement `resolveEffectiveChamberFocus`, `computeChamberCameraFit`, `clampCameraPan`, `zoomCameraAtFocalPoint`, and `screenToWorldCoords` in `src/scene/camera.ts` and export from `src/scene/guild-scene.ts`.
- [x] Verify with unit tests in `tests/12-mobile-screen-adaptation.test.ts`.
