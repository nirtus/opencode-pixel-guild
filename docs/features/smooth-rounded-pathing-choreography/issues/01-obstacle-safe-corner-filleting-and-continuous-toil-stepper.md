# 01: Obstacle-Safe Quadratic Bezier Corner Filleting & Continuous Arc-Length Toil Stepper

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: None

## Specification

Implement **Decision 1 (`Q1`)**, **Decision 2 (`Q2`)**, and **Decision 3 (`Q3` — Toil Stepper)** from [Specification: Smooth, Rounded Turn Trajectories, Continuous Arc-Length Stepping & Hysteresis-Stabilized Directional Turnaround](../spec.md):

1. **Create `src/encounter/path-curve-fillet.ts` (`<= 240` lines) and export from `src/encounter/index.ts`**:
   - Implement `filletWaypointPolyline(start: { x: number; y: number }, waypoints: ReadonlyArray<{ x: number; y: number }>, options?: { maxRadiusPx?: number; samplesPerCorner?: number; obstacleBoxes?: ReadonlyArray<ObstacleBox> }): Array<{ x: number; y: number }>`:
     - For a polyline `[start, ...waypoints]`, if `waypoints.length <= 1`, return `[...waypoints]`.
     - For each interior vertex $P_i$ (`1 <= i < points.length - 1`) with incoming segment $u = P_{i-1} \to P_i$ (length $L_{\text{in}}$) and outgoing segment $v = P_i \to P_{i+1}$ (length $L_{\text{out}}$):
       - If the turn angle between $u$ and $v$ is $\ge 8^\circ$ and both $L_{\text{in}} \ge 18$ and $L_{\text{out}} \ge 18$, compute fillet trim distance $r = \min(r_{\max}, 0.38 \cdot L_{\text{in}}, 0.38 \cdot L_{\text{out}})$ (default $r_{\max} = 44\text{ px}$).
       - Construct entry tangent point $A = P_i - \hat{u} \cdot r$, control vertex $B = P_i$, and exit tangent point $C = P_i + \hat{v} \cdot r$, and sample $N = 4$ points along the quadratic Bezier curve $Q(t) = (1-t)^2 A + 2(1-t)t B + t^2 C$.
       - Validate that every sampled point and segment clears `GOAL_ASSEMBLY_OBSTACLE_BOX` and `RESOURCE_STOCKPILE_OBSTACLE_BOX` (when indoors, $x < 760$). If a wide fillet intersects an obstacle box, retry with $0.5 \cdot r$ and $0.25 \cdot r$, falling back to the unrounded vertex $P_i$ only if all radii intersect.
   - Implement `buildSmoothDetourChicaneArc(...)` in `src/encounter/path-curve-fillet.ts` so downstream web modules can reuse it without bloating their own line counts.

2. **Wire Obstacle-Safe Corner Filleting into `src/encounter/corridor-router.ts`**:
   - Apply `filletWaypointPolyline` inside `computeIndoorCorridorLeg` and `computeRingCorridorWaypoints` so multi-segment routes around `GOAL_ASSEMBLY_OBSTACLE_BOX`, unobstructed seeded doglegs (`computeUnobstructedSeededLeg`), and seeded East Wilderness Portal approaches produce smooth, rounded turn trajectories.
   - **Preserve Existing Contracts**:
     - Unseeded unobstructed calls `computeRingCorridorWaypoints(fromX, fromY, toX, toY)` (`routeSeed === undefined`) must still return `[{ x: toX, y: toY }]` (`length === 1`).
     - Unseeded East Wilderness Portal crossings must still include the exact `{ x: 774, y: 352 }` (`EAST_WILDERNESS_PORTAL`) coordinate, and seeded portal crossings must preserve a waypoint at `portal` while rounding interior approach bends.

3. **Deepen `stepCharacterToilQueue` in `src/encounter/toil-queue.ts` for Continuous Arc-Length Carry-Over**:
   - Replace the single-waypoint snap-and-stop check (`if (dist <= Math.max(3, maxStep))`) with a `while (wps.length > 0 && remainingBudget > 0)` loop:
     - When `wps.length > 1` and `dist <= remainingBudget`, advance `(curX, curY) = (wp.x, wp.y)`, subtract `remainingBudget -= dist`, `wps.shift()`, and continue moving along the next waypoint in the same frame.
     - Only snap and finish the `walk-corridor` toil when reaching the final waypoint (`wps.length === 1 && dist <= Math.max(3, remainingBudget)`).

## Verification

- Run `npm test` and verify all existing tests in `tests/09-choreography-and-project-isolation.test.ts`, `tests/29-anti-overlap-walking-choreography.test.ts`, `tests/30-diverse-2d-paths-and-proportional-choreography.test.ts`, and `tests/31-velocity-proportional-stride-animation.test.ts` pass alongside new unit assertions for `filletWaypointPolyline` and continuous budget carry-over in `stepCharacterToilQueue`.

## Answer

- Created `src/encounter/path-curve-fillet.ts` (`filletWaypointPolyline` and `buildSmoothDetourChicaneArc`) and exported it from `src/encounter/index.ts`.
- Wired `filletWaypointPolyline` into `computeRingCorridorWaypoints` in `src/encounter/corridor-router.ts`, rounding every interior bend (`A → B → C`) into obstacle-safe quadratic Bezier curves while preserving the 1-point unseeded direct-segment contract and exact East Wilderness Portal coordinates.
- Updated `stepCharacterToilQueue` in `src/encounter/toil-queue.ts` to use a continuous `while (remainingWps.length > 0 && remainingBudget > 0)` arc-length carry-over loop so moving characters pass through intermediate curve waypoints without losing frame movement budget.
- Verified with `npm test` (`243/243` tests passing) and live Docker container deployment (`opencode-pixel-guild-visualizer` on port `4310`, `docs/images/smooth-rounded-pathing-choreography.png`).
