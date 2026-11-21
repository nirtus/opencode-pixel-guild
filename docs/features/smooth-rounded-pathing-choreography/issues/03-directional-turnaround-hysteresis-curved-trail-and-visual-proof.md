# 03: Smoothed Directional Turnaround Hysteresis, Regression Suite & Container Visual Proof

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01, 02

## Specification

Implement **Decision 5 (`Q5` — Smoothed Directional Turnaround Hysteresis)** from [Specification: Smooth, Rounded Turn Trajectories, Continuous Arc-Length Stepping & Hysteresis-Stabilized Directional Turnaround](../spec.md):

1. **Diagonal Deadband Hysteresis & Smoothed Velocity Tangent for `Directional Turnaround` (`src/sprites/hero-vector-rig.ts`, `src/web/walker-separation.ts`, `src/web/client-choreography.ts`, `src/web/client-state.ts`)**:
   - Update `deriveFacingDirectionFromDelta(dx: number, dy: number, currentFacing?: DirectionalTurnaround): DirectionalTurnaround` in `src/sprites/hero-vector-rig.ts`:
     - When `currentFacing` is omitted, preserve exact `Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? "east" : "west") : (dy >= 0 ? "south" : "north")` behavior.
     - When `currentFacing` is provided, apply a diagonal hysteresis ratio (`DIAGONAL_FACING_HYSTERESIS = 1.18`):
       - If `currentFacing` is horizontal (`"east"` or `"west"`), switch to vertical (`"north"` or `"south"`) only when `Math.abs(dy) > Math.abs(dx) * 1.18`; otherwise update horizontal direction if `Math.abs(dx) > 0.01`.
       - If `currentFacing` is vertical (`"north"` or `"south"`), switch to horizontal (`"east"` or `"west"`) only when `Math.abs(dx) > Math.abs(dy) * 1.18`; otherwise update vertical direction if `Math.abs(dy) > 0.01`.
   - Add optional `smoothVx?: number` and `smoothVy?: number` fields to `WalkerState` in `src/web/client-state.ts`, and update walker facing in `stepClientChoreography` using a smoothed velocity vector (`smoothVx = (walker.smoothVx ?? stepDx) * 0.65 + stepDx * 0.35`, `smoothVy = (walker.smoothVy ?? stepDy) * 0.65 + stepDy * 0.35`) passed into `deriveFacingDirectionFromDelta(smoothVx, smoothVy, walker.facingDirection)`.
   - Keep projected floor path lines suppressed in `src/web/app-main.ts` and `src/scene/canvas-paint-encounters.ts`.

2. **Comprehensive Regression Suite (`tests/32-smooth-rounded-pathing-choreography.test.ts`) & Container Visual Verification**:
   - Add `tests/32-smooth-rounded-pathing-choreography.test.ts` testing:
     1. Obstacle-safe quadratic Bezier corner filleting in `computeRingCorridorWaypoints` (turn-angle reduction on 90° and dogleg turns, obstacle clearance against `GOAL_ASSEMBLY_OBSTACLE_BOX` and `RESOURCE_STOCKPILE_OBSTACLE_BOX`, and unseeded backward compatibility).
     2. Continuous arc-length budget carry-over in `stepCharacterToilQueue` across multi-waypoint turns (zero distance loss at intermediate vertices).
     3. Continuous rounded `Thinking` plaza circuits (zero vertex stops across leg handoffs) and 3-point smooth chicane crowd detours in `resolveDynamicDetourWaypoints`.
     4. Diagonal hysteresis stability in `deriveFacingDirectionFromDelta(dx, dy, currentFacing)` and smoothed velocity turnaround during curved walks.
   - Verify `tests/00-architecture-invariants.test.ts` (`<= 400` lines per file in `src/`).
   - Deploy and verify on the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`), capture `docs/images/smooth-rounded-pathing-choreography.png` via headless Chrome, and inspect the live rendered output.

## Answer

- Updated `deriveFacingDirectionFromDelta(dx, dy, currentFacing?)` in `src/sprites/hero-vector-rig.ts` with `DIAGONAL_FACING_HYSTERESIS = 1.18` so 4-way **Directional Turnaround** holds steady through ~45° diagonal bends and switches cleanly once the new cardinal axis dominates.
- Added `smoothVx` and `smoothVy` velocity tangent smoothing on `WalkerState` (`src/web/client-state.ts`) and wired it in `stepClientChoreography` (`src/web/client-choreography.ts`).
- Added `tests/32-smooth-rounded-pathing-choreography.test.ts`, verified all `243/243` tests pass (`npm test`), and deployed/verified on the `opencode-pixel-guild-visualizer` Docker container (`docs/images/smooth-rounded-pathing-choreography.png`).
