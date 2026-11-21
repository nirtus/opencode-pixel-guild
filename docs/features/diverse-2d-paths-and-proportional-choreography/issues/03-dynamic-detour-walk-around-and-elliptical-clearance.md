# 03: Dynamic Detour Walk-Around Bypass, Elliptical Clearance & Container Visual Verification

Type: task
Label: wayfinder:task
Status: resolved
Blocked by: 01, 02

## Question

How should colliding characters dynamically walk around each other without negating each other's forward walking progress, while enforcing proportional elliptical sprite/nameplate clearance across all screen sizes?

## Specification

Confirmed in Grilling Round 1 (`Q2`, `Q4`, `Q5`) and [Feature Specification](./../spec.md):
- **Dynamic Detour Waypoint Bypass ("Walk Around Each Other", `src/web/walker-separation.ts` & `src/web/client-choreography.ts`)**:
  - Implement `resolveDynamicDetourWaypoints(sessionId, walker, allWalkers, chamberCtx)`:
    - Before stepping `walker` along `walker.waypoints`, check if any other visible character in the same chamber lies inside the upcoming path corridor toward `waypoints[0]` (`0 < forwardProj < Math.min(segLen, 115)` and `Math.abs(lateralOffset) < 44` in rendered chamber pixels).
    - When a blocker is detected ahead, compute a **lateral detour waypoint** offset `52px` perpendicular to the travel direction (using the right-hand traffic rule `(-fy, fx)` relative to `(fx, fy)` so two head-on walkers always sidestep to opposite sides of the corridor, or flipping to `(fy, -fx)` if the right-hand point is blocked by a wall or `GOAL_ASSEMBLY_OBSTACLE_BOX`).
    - Insert/update the detour waypoint at the front of `walker.waypoints` (and skip any intermediate non-final waypoint that is already occupied within `44px` by another character) so the walker smoothly **walks around** the blocker at full speed without stalling or reversing.
- **Non-Negating Tangential Steering & Proportional Elliptical Clearance (`48×36 px` Rendered)**:
  - Update `applyInTransitSteeringAvoidance` so any steering vector has **zero backward component** (`dot(steer, forwardDir) >= 0`), steering purely along the tangential/lateral vector `(-fy, fx)` when passing another walker.
  - Update `enforceWalkerPersonalSpace(chars, walkerMap, chamberCtx)` to evaluate clearance in **rendered chamber pixels** (`anchorWorldPoint` scale for `(chamberWidth, chamberHeight, wildsWidth)`) using an elliptical sprite + nameplate clearance (`RAD_X = 46px`, `RAD_Y = 34px`), and restrict separation adjustments on walking characters to tangential/lateral directions so forward walking steps are never negated.
- **Automated Regression Suite & Live Docker Container Visual Verification**:
  - Add `tests/30-diverse-2d-paths-and-proportional-choreography.test.ts` testing:
    1. Full-floor 2D `Thinking` roaming circuits with horizontal, vertical, and diagonal legs across all 4 open plazas.
    2. Seeded unobstructed station-to-station transits generating distinct diagonal/dogleg/arc paths.
    3. Head-on and multi-character collision scenarios verifying **dynamic detour walk-around** (`positive forward progress on every frame`, zero walking negation/deadlock, and `>= 36px` separation).
    4. Screen-size proportional adaptation across `800×720`, `1480×720` widescreen, and `1040+560×720` (`65% / 35%` Split) chamber dimensions.
  - Deploy and verify on `opencode-pixel-guild-visualizer` (`npm run docker:up` on port `4310`), run `npm test`, and capture visual proof in `docs/images/diverse-2d-paths-and-proportional-choreography.png`.

## Answer

Implemented `resolveDynamicDetourWaypoints` in `src/web/walker-separation.ts` (measuring corridor obstruction in rendered chamber pixels with a `44px` lateral/skip threshold and `52px` right-hand detour offset, replacing active detours in place), updated `applyInTransitSteeringAvoidance` and `enforceWalkerPersonalSpace` (`stripBackwardPush`, `ELLIPSE_CLEARANCE_X_PX = 46`, `ELLIPSE_CLEARANCE_Y_PX = 34`, `COLLISION_WALKER_SEPARATION_PX = 36`) so colliding walkers never push each other backward or negate walking progress, added `tests/30-diverse-2d-paths-and-proportional-choreography.test.ts`, and verified on the `opencode-pixel-guild-visualizer` Docker container (`docs/images/diverse-2d-paths-and-proportional-choreography.png`).

## Acceptance Criteria

- [x] Colliding or head-on walkers dynamically insert lateral detour waypoints to walk around each other and maintain positive forward progress toward their destination without negating each other's movement.
- [x] Visible characters maintain proportional elliptical clearance across standard, widescreen, and `65% / 35%` split chamber dimensions.
- [x] All unit and architecture invariant tests pass (`npm test`, all `src/` files `<= 400` lines), and live container visual proof is verified in `docs/images/diverse-2d-paths-and-proportional-choreography.png`.
