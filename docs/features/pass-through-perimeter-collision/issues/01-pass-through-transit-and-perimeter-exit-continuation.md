# 01: Pass-Through Transit & Personal Perimeter Non-Stop Exit Continuation

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: None

## Question

How should moving characters pass through each other on collision without stopping inside each other's **Personal Perimeter**, while keeping all `src/web/` modules under the 400-line ceiling?

## Specification

1. Create `src/web/perimeter-pass-through.ts` (< 250 lines) containing:
   - `clampToWalkableChamberPoint(x, y, isWilds, box)` for obstacle-safe chamber coordinate clamping.
   - `evaluatePointPairPerimeter(candX, candY, walker, other, chamberCtx)` and `isPointInsideAnyPersonalPerimeter(sessionId, candX, candY, walker, allWalkers, chamberCtx, forStopCheck)` enforcing `COLLISION_WALKER_SEPARATION_PX = 36` radial and `ELLIPSE_CLEARANCE_X_PX = 46`, `ELLIPSE_CLEARANCE_Y_PX = 34` elliptical clearance (or `MIN_WALKER_SEPARATION_PX = 24` for co-workers near distinct station slots).
   - `resolveSmoothPerimeterExitTarget(sessionId, walker, allWalkers, nowMs, chamberCtx)` so any walking character reaching its target while inside another character's **Personal Perimeter** smoothly extends its walk along its heading (or to an unoccupied station perimeter slot) and keeps `walker.isWalking = true` until completely outside all other characters' perimeters.
2. Update `enforceWalkerPersonalSpace` in `src/web/walker-separation.ts` to skip pairs where either walker is actively walking (`a.walker.isWalking || b.walker.isWalking`), enforcing positional separation only between stationary characters (`!a.walker.isWalking && !b.walker.isWalking`).

## Answer

Implemented `src/web/perimeter-pass-through.ts` (`234` lines) and updated `src/web/walker-separation.ts` (`320` lines) so moving characters pass smoothly through each other and through stationary characters without mid-walk repulsion, detour spikes, or lateral shoving, while `resolveSmoothPerimeterExitTarget` guarantees that no character transitions to `isWalking = false` inside another character's **Personal Perimeter** (`36px` radial / `46×34px` elliptical footprint, `24px` at adjacent station slots). Verified with `tests/36-pass-through-perimeter-collision-and-grace-period.test.ts` and `tests/00-architecture-invariants.test.ts`.

## Acceptance Criteria

- [x] Moving characters pass smoothly through other moving and stationary characters without mid-walk repulsion or backward push.
- [x] A walking character never transitions to `isWalking = false` while inside another character's **Personal Perimeter** (`36px` radial / `46×34px` ellipse).
- [x] Stationary characters remain separated outside each other's **Personal Perimeter**.
- [x] `src/web/perimeter-pass-through.ts` and `src/web/walker-separation.ts` are both `<= 400` lines.
