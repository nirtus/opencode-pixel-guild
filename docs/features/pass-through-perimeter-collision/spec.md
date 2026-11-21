# Specification: Pass-Through Character Transit, Personal Perimeter Non-Stop Invariant & Action Grace Period

## 1. Problem Statement & Root Causes

1. **Hard In-Transit Collision Avoidance Causes Swerving, Shoving & Mid-Walk Stutter (`src/web/walker-separation.ts`, `src/web/client-choreography.ts`)**:
   - During `stepClientChoreography`, walking characters previously executed three competing in-transit avoidance layers on every frame:
     1. `resolveDynamicDetourWaypoints` injected 3-point lateral detour chicanes (`52px` offset) whenever another character stood ahead on a corridor segment.
     2. `applyInTransitSteeringAvoidance` applied lateral repulsion (`STEERING_AVOIDANCE_RADIUS_PX = 38px`) while walking.
     3. `enforceWalkerPersonalSpace` ran 8 relaxation passes pushing walking characters apart (`COLLISION_WALKER_SEPARATION_PX = 36px`, `ELLIPSE_CLEARANCE_X_PX = 46px`, `ELLIPSE_CLEARANCE_Y_PX = 34px`).
   - Instead of passing smoothly through one another on collision, moving characters swerved off their trajectories, shoved each other laterally, or prematurely snapped to `isWalking = false` via `reanchorDisplacedStationWalker` when `distToTgt <= 36`.

2. **Characters Could Stop Inside Another Character's Perimeter (`src/web/walker-separation.ts`, `src/web/client-choreography.ts`)**:
   - When a character reached `dist <= 3` from `(walker.targetX, walker.targetY)` while overlapping another moving or stationary character's perimeter (or when `reanchorDisplacedStationWalker` forced `walker.isWalking = false` at `distToTgt <= 36`), the character stopped inside the other character's perimeter and relied on post-step single-frame coordinate pushes to separate.

3. **Lack of Collision & Action Grace Periods Causes Jitter (`src/web/client-choreography.ts`)**:
   - Every frame re-evaluated `ensureAvailableStationSlot` and target slots without a grace lock, so passing through another character or receiving rapid state ticks caused repeated route recalculations, target-slot hopping, and facing chatter.

---

## 2. Core Architectural Decisions

### 2.1 Unimpeded Pass-Through In Transit ("Walk Through Each Other Smoothly")
- While a character is actively walking (`walker.isWalking === true`), it passes smoothly through other characters (both walking and stationary) along its filleted **Toil Queue** trajectory without detour spikes, lateral steering repulsion, or mid-walk `enforceWalkerPersonalSpace` position pushes.
- `enforceWalkerPersonalSpace` skips pairs where either character is actively walking (`a.walker.isWalking || b.walker.isWalking`), enforcing positional perimeter separation only when both characters are stationary (`!a.walker.isWalking && !b.walker.isWalking`).

### 2.2 Personal Perimeter Non-Stop Invariant ("Maintain Own Perimeter & Don't Stop Till Outside Each Other's Perimeter")
- Every character maintains its **Personal Perimeter** (`COLLISION_WALKER_SEPARATION_PX = 36px` radial and `ELLIPSE_CLEARANCE_X_PX = 46px` by `ELLIPSE_CLEARANCE_Y_PX = 34px` elliptical clearance in rendered chamber pixels, or `MIN_WALKER_SEPARATION_PX = 24px` between adjacent distinct co-worker slots at the same station).
- **Non-Stop-While-Overlapping Rule (`resolveSmoothPerimeterExitTarget` in `src/web/perimeter-pass-through.ts`)**:
  - A walking character **never transitions to `isWalking = false` while inside another character's Personal Perimeter** (`isPointInsideAnyPersonalPerimeter`).
  - When a walking character reaches `dist <= 3` of its target (or finishes its final waypoint) while inside another character's Personal Perimeter:
    1. If acting at a **Preparation Station** or **Bug Monster** lair, it first checks `ensureAvailableStationSlot` for the nearest unoccupied station perimeter slot that is outside all active walkers' perimeters.
    2. Otherwise, it computes a smooth continuation exit point `(exitX, exitY)` along its current movement heading `(smoothVx, smoothVy)` (or radially outward from the overlapping neighbor) at `>= 40px` / outside all neighbors' `36px` radial and `46×34px` elliptical perimeters, clamped to walkable chamber bounds.
    3. It updates `walker.targetX`, `walker.targetY`, `walker.waypoints = [{ x: exitX, y: exitY }]`, sets `walker.isClearingPerimeter = true`, and continues walking smoothly in the same frame (`walker.isWalking = true`) until it is completely outside every other character's **Personal Perimeter**.

### 2.3 Three-Part Grace Time Period (`src/web/perimeter-pass-through.ts` & `src/web/client-choreography.ts`)
1. **Pass-Through Overlap Grace Period (`PASS_THROUGH_OVERLAP_GRACE_MS = 450`)**:
   - Whenever a walking character overlaps another character's **Personal Perimeter** in transit, `updatePassThroughOverlapGrace` sets `walker.overlapGraceUntilMs = Math.max(walker.overlapGraceUntilMs ?? 0, nowMs + 450)` on the colliding walker(s).
   - While `nowMs < walker.overlapGraceUntilMs` and the walker is still in transit (`dist > 36` from its target), mid-flight slot re-claiming and route resets are suppressed so colliding characters glide past each other without stutter.
2. **Route & Target Re-Evaluation Grace Period (`ROUTE_RETARGET_GRACE_MS = 500`)**:
   - Whenever a character begins a slot transition (`startSlotTransition`), re-claims an available station slot (`ensureAvailableStationSlot`), or extends its walk to exit a neighbor's perimeter (`resolveSmoothPerimeterExitTarget`), `walker.routeGraceUntilMs = nowMs + 500` locks the active route against non-urgent mid-stride re-routing.
3. **Station Action Dwell Grace Period (`STATION_ACTION_DWELL_GRACE_MS = 750`)**:
   - When a character arrives and settles outside all other characters' perimeters at an acting station, `walker.dwellUntilMs = nowMs + 750` ensures a smooth, readable station action before transitioning to the next queued tool or state.

### 2.4 Module Decomposition & 400-Line Ceiling
- Extract pass-through overlap detection, **Personal Perimeter** geometry checks, smooth perimeter-exit target continuation, and grace-period helpers into `src/web/perimeter-pass-through.ts` (< 250 lines).
- Keep `src/web/walker-separation.ts`, `src/web/client-choreography.ts`, `src/web/client-state.ts`, and `src/web/station-slot-allocator.ts` all strictly `<= 400` lines (`tests/00-architecture-invariants.test.ts`).

---

## 3. Verification & Acceptance Criteria
- [x] Moving characters pass smoothly through each other and through stationary characters without detour spikes, lateral shoving, backward push, or mid-walk repulsion.
- [x] Characters never stop (`isWalking === false`) while inside another character's **Personal Perimeter** (`36px` radial / `46×34px` elliptical footprint, `24px` at adjacent co-worker station slots); they continue walking smoothly until outside each other's perimeter.
- [x] `PASS_THROUGH_OVERLAP_GRACE_MS` (`450ms`), `ROUTE_RETARGET_GRACE_MS` (`500ms`), and `STATION_ACTION_DWELL_GRACE_MS` (`750ms`) eliminate route-retargeting and collision jitter.
- [x] Every file under `src/` is `<= 400` lines (`tests/00-architecture-invariants.test.ts`).
- [x] `GLOSSARY.md` and `README.md` are updated with **Personal Perimeter**, pass-through transit, and grace period semantics.
- [x] Deployed and visually verified on the `opencode-pixel-guild-visualizer` Docker container on port `4310` (`docs/images/pass-through-perimeter-collision.png`).
