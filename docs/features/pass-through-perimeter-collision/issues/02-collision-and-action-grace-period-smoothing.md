# 02: Collision & Action Grace Period Smoothing in Client Choreography

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01

## Question

How should the collision and action grace time periods be wired into `WalkerState` and `stepClientChoreography` so pass-through overlaps, slot transitions, and station actions look smooth and never jitter?

## Specification

1. Add `overlapGraceUntilMs?: number`, `routeGraceUntilMs?: number`, and `isClearingPerimeter?: boolean` to `WalkerState` in `src/web/client-state.ts`.
2. Export `PASS_THROUGH_OVERLAP_GRACE_MS = 450`, `ROUTE_RETARGET_GRACE_MS = 500`, and `STATION_ACTION_DWELL_GRACE_MS = 750` from `src/web/perimeter-pass-through.ts` (and re-export from `src/web/walker-separation.ts`).
3. In `stepClientChoreography` (`src/web/client-choreography.ts`):
   - Remove mid-walk `resolveDynamicDetourWaypoints` and `applyInTransitSteeringAvoidance` calls so characters walk straight along their filleted trajectories through other characters.
   - Call `updatePassThroughOverlapGrace` during walking steps to refresh `overlapGraceUntilMs` (`450ms`) whenever characters pass through each other's perimeters.
   - Lock route/slot re-evaluation during `routeGraceUntilMs` (`500ms`) and `overlapGraceUntilMs` (`450ms`) via `canReevaluateWalkerRoute`.
   - Call `resolveSmoothPerimeterExitTarget` when a walker reaches the end of its waypoints or `dist <= 3` so it continues walking smoothly if still inside another character's **Personal Perimeter**, and apply `STATION_ACTION_DWELL_GRACE_MS = 750` once it settles outside all perimeters.

## Answer

Added `overlapGraceUntilMs`, `routeGraceUntilMs`, and `isClearingPerimeter` to `WalkerState` in `src/web/client-state.ts` and wired `PASS_THROUGH_OVERLAP_GRACE_MS = 450`, `ROUTE_RETARGET_GRACE_MS = 500`, `STATION_ACTION_DWELL_GRACE_MS = 750`, `canReevaluateWalkerRoute`, `updatePassThroughOverlapGrace`, and `resolveSmoothPerimeterExitTarget` into `stepClientChoreography` (`src/web/client-choreography.ts`, `377` lines). Verified in `tests/36-pass-through-perimeter-collision-and-grace-period.test.ts`.

## Acceptance Criteria

- [x] `PASS_THROUGH_OVERLAP_GRACE_MS` (`450ms`) prevents mid-overlap slot re-claiming or route resets.
- [x] `ROUTE_RETARGET_GRACE_MS` (`500ms`) and `STATION_ACTION_DWELL_GRACE_MS` (`750ms`) prevent rapid action/target jitter.
- [x] `src/web/client-choreography.ts` and `src/web/client-state.ts` remain `<= 400` lines.
