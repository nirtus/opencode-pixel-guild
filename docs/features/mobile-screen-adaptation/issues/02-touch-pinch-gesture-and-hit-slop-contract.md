# 02: Multi-Pointer Touch/Pinch Gesture State Machine & Coarse Hit-Slop Contract

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01: Chamber Focus Mode Interface & Auto-Pan Trigger Contract (`src/scene/camera.ts`)

## Question

What is the exact gesture state machine and hit-testing contract for unified mouse and touch interaction on the **Guild Floorplan** (`src/web/canvas-gesture-controller.ts` and `src/scene/frame-hit-test.ts`)?

## Answer

Locked in `docs/features/mobile-screen-adaptation/spec.md`:
- `hitTestSceneFrame(frame, worldX, worldY, options?: { hitSlopWorldPx?: number })` expands hitboxes by `hitSlopWorldPx` (`14 / cameraZoom` on coarse/touch pointers), ranks candidates by descending `priority`, and breaks ties within the same `priority` tier by shortest Euclidean distance to the hitbox center.
- `src/web/canvas-gesture-controller.ts` implements a pure multi-pointer gesture state machine supporting 1-finger / mouse drag-pan with `8px` hysteresis, 2-finger pinch focal zoom + midpoint pan, double-tap on empty floor to reset chamber fit, and tap-to-inspect for all fixtures (`character`, `demolition-bomb`, `workstation`, `goal-assembly-socket`, `bug-monster`, `alcove`, `break-lounge`).
- [x] Extend `hitTestSceneFrame` in `src/scene/frame-hit-test.ts` with `hitSlopWorldPx` and center-distance tie-breaking.
- [x] Implement `src/web/canvas-gesture-controller.ts` and wire into `src/web/pointer-and-camera.ts`.
- [x] Verify with unit tests in `tests/12-mobile-screen-adaptation.test.ts`.
