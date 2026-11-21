# Specification: Smooth, Rounded Turn Trajectories, Continuous Arc-Length Stepping & Hysteresis-Stabilized Directional Turnaround

## 1. Overview & Architectural Purpose

Previously, **Guild Character** locomotion across the **Workshop Room** (`800×720`) and **Dungeon Wilds** (`800..1600×720`) exhibited sharp, angular turns and micro-stutters at waypoints due to seven shallow seams across `src/encounter/`, `src/web/`, and `src/sprites/`:

1. **Coarse Piecewise-Linear Corner & Dogleg Vertices (`src/encounter/corridor-router.ts`)**: `computeRingCorridorWaypoints` emitted unrounded rectangular ring corners (`(240, 210)`, `(540, 210)`, `(540, 470)`, `(240, 470)` plus seed offsets) around the **Goal Assembly Site**, sharp 2-point axis-aligned or trapezoid doglegs (`p1, p2`) on unobstructed transits (`computeUnobstructedSeededLeg`), and an angular kink at the East Wilderness Portal (`(722, y) → (774, y)`).
2. **Snap-and-Stop Stepper Discarding Movement Budget (`src/encounter/toil-queue.ts`)**: `stepCharacterToilQueue` snapped a moving character directly onto `waypoints[0]` whenever `dist <= Math.max(3, maxStep)`, discarded the remaining movement budget `(maxStep - dist)` for that frame (causing a micro-stutter at every turn), and instantaneously pivoted the velocity vector toward `waypoints[1]` on the next tick.
3. **1-Waypoint Stop-and-Pivot `Thinking` Roam Circuits (`src/web/thinking-roam-circuits.ts` & `src/web/client-choreography.ts`)**: `stepClientChoreography` fed `Thinking` plaza circuits one vertex at a time (`walker.waypoints = [{ x: nextPt.x, y: nextPt.y }]`), forcing each contemplative character to decelerate to a complete stop (`dist <= 3`) at every polygon vertex before pivoting onto the next straight edge.
4. **Single-Point Triangular Detour Spikes (`src/web/walker-separation.ts`)**: `resolveDynamicDetourWaypoints` prepended a single perpendicular point (`52px` out), turning a straight walk into a sharp triangular spike (`current → chosen → wp`) or abruptly shifting `waypoints[0]` off the array when another character stood nearby.
5. **45° `Directional Turnaround` Chatter (`src/sprites/hero-vector-rig.ts` & `src/web/client-choreography.ts`)**: `deriveFacingDirectionFromDelta(dx, dy)` performed a zero-hysteresis `Math.abs(dx) >= Math.abs(dy)` check on raw single-frame displacement after lateral steering avoidance (`steerX, steerY`), causing the sprite's 4-way **Directional Turnaround** (`north` / `south` / `east` / `west`) to snap or flicker along diagonal legs and rounded turns.
6. **400-Line Ceiling Pressure**: `src/web/client-choreography.ts` (`397/400` lines) and `src/web/walker-separation.ts` (`396/400` lines) were right against the repository's strict 400-line ceiling (`tests/00-architecture-invariants.test.ts`).

This specification deepens the path-planning, stepping, circuit-roaming, detour-avoidance, and turnaround modules behind their existing interfaces so every **Guild Character** glides around rounded, obstacle-safe turns with continuous **Stride Cadence** and stable **Directional Turnaround** (while keeping projected floor path lines suppressed on the canvas).

---

## 2. Locked Architectural Decisions (`Q1–Q5`)

### Decision 1 (`Q1`): Module Decomposition & 400-Line Ceiling Headroom
- Introduce a dedicated, pure spatial curve module `src/encounter/path-curve-fillet.ts` (`<= 240` lines) exported through `src/encounter/index.ts`.
- Extract detour chicane arc construction and continuous `Thinking` roam lookahead handoff helpers so every file in `src/encounter/`, `src/web/`, `src/sprites/`, and `src/scene/` remains strictly `<= 400` lines (bringing `src/web/client-choreography.ts` and `src/web/walker-separation.ts` safely below `380` lines).

### Decision 2 (`Q2`): Obstacle-Safe Quadratic Bezier Corner Filleting Behind `computeRingCorridorWaypoints`
- In `src/encounter/path-curve-fillet.ts`, provide `filletWaypointPolyline(start, waypoints, options)`:
  - Given an ordered polyline `[P_0, P_1, ..., P_k]` (where `P_0 = { x: fromX, y: fromY }` and `P_1..P_k` are the raw route waypoints), inspect each interior corner vertex `P_i` (`1 <= i < k`) with incoming segment `u = P_{i-1} → P_i` (length `L_in`) and outgoing segment `v = P_i → P_{i+1}` (length `L_out`).
  - If the turn angle between `u` and `v` is `>= 8°` and both `L_in >= 18` and `L_out >= 18`, compute a dynamic fillet trim distance:
    $$r = \min\left(r_{\max},\; 0.38 \cdot L_{\text{in}},\; 0.38 \cdot L_{\text{out}}\right)$$
    where default $r_{\max} = 44\text{ px}$.
  - Define the entry tangent point $A = P_i - \hat{u} \cdot r$, control vertex $B = P_i$, and exit tangent point $C = P_i + \hat{v} \cdot r$, and sample $N = 4$ points along the quadratic Bezier curve:
    $$Q(t) = (1 - t)^2 A + 2(1 - t)t B + t^2 C \quad \text{for } t \in \left\{\tfrac{1}{5}, \tfrac{2}{5}, \tfrac{3}{5}, \tfrac{4}{5}, 1\right\} \text{ (or } t \in \{0.15, 0.4, 0.65, 0.9\}\text{)}$$
  - **Obstacle Clearance Verification**: Test all resulting sub-segments against `GOAL_ASSEMBLY_OBSTACLE_BOX` and `RESOURCE_STOCKPILE_OBSTACLE_BOX` (when indoors, `x < 760`). If a wide fillet clips an obstacle corner, try $r' = 0.5 \cdot r$ and $r'' = 0.25 \cdot r$; if all clip, retain the clearance-safe corner vertex $P_i$.
  - **Backward Compatibility Invariant**:
    - When `computeRingCorridorWaypoints(fromX, fromY, toX, toY)` is called *without* `routeSeed` (`routeSeed === undefined`) on an unobstructed indoor pair, it continues to return the 1-point direct target `[{ x: toX, y: toY }]`.
    - When crossing the East Wilderness Portal (`fromX < 760 && toX > 760` or `fromX > 760 && toX < 760`) without `routeSeed`, the exact `{ x: 774, y: 352 }` (`EAST_WILDERNESS_PORTAL`) waypoint remains present in the returned array while interior approach bends are smoothly rounded when `routeSeed` is provided.

### Decision 3 (`Q3`): Continuous Arc-Length Budget Carry-Over in `stepCharacterToilQueue` & Curved Floor Trail
- Deepen `stepCharacterToilQueue(state, dtMs)` in `src/encounter/toil-queue.ts`:
  - Replace the single-waypoint snap-and-discard check with a continuous arc-length loop:
    1. Compute `let remainingBudget = current.speedPxPerSec * (dtMs / 1000)`, `let curX = state.x`, `let curY = state.y`, and `let wps = [...current.waypoints]`.
    2. While `wps.length > 0 && remainingBudget > 0`:
       - Let `wp = wps[0]` and `dist = Math.hypot(wp.x - curX, wp.y - curY)`.
       - If `wps.length === 1` (final destination of the walk toil) and `dist <= Math.max(3, remainingBudget)`:
         - Snap `(curX, curY) = (wp.x, wp.y)`, empty `wps`, and complete the `walk-corridor` toil.
       - Else if `wps.length > 1` and `dist <= remainingBudget`:
         - Advance `(curX, curY) = (wp.x, wp.y)`, subtract `remainingBudget -= dist`, and `wps.shift()` to immediately continue along the next curve segment within the same frame without losing a single pixel of movement budget.
       - Else (`dist > remainingBudget`):
         - Advance `curX += ((wp.x - curX) / dist) * remainingBudget`, `curY += ((wp.y - curY) / dist) * remainingBudget`, set `remainingBudget = 0`, and break.
  - This guarantees that straight-line and curved walks advance by the exact distance `speedPxPerSec * (dtMs / 1000)` per frame, eliminating corner micro-stutters and keeping **Stride Cadence** (`walkCycle`) phase-locked to true ground speed.
- Keep projected floor path lines suppressed in `src/web/app-main.ts` and `src/scene/canvas-paint-encounters.ts` so smooth character locomotion is conveyed directly through the character's curved movement trajectory and turnaround orientation.

### Decision 4 (`Q4`): Continuous Rounded `Thinking` Plaza Circuits & 3-Point Chicane Detour Arcs
- **Continuous Rounded `Thinking` Plaza Circuits (`src/web/thinking-roam-circuits.ts` & `src/web/client-choreography.ts`)**:
  - Preserve the 5 primary plaza anchor waypoints in `resolveThinkingRoamCircuit` (including distinct horizontal, vertical, and diagonal segments outside `GOAL_ASSEMBLY_OBSTACLE_BOX`).
  - Provide `advanceThinkingRoamLeg(walker, pacingSide, sessionId, chamberCtx)` returning both the target anchor `{ x, y, facingDirection }` and a rounded multi-waypoint curve leg (`waypoints: ReadonlyArray<{ x: number; y: number }>`) that fillets the corner transition from the character's current leg into the next plaza leg.
  - In `stepClientChoreography`, when a `Thinking` character is roaming on an Assembly plaza (`walker.hasReachedAssemblyPacing`) and approaches within `dist <= 18px` (or `<= 1` frame step) of the end of their current roam leg, seamlessly append the next rounded roam leg into `walker.waypoints` and update `walker.targetX / walker.targetY` *before* `stepCharacterToilQueue` runs—so the character never drops to `isWalking = false` or stops at a polygon vertex.
- **3-Point Smooth Chicane Bypass Arcs (`src/web/walker-separation.ts`)**:
  - In `resolveDynamicDetourWaypoints`, replace the 1-point perpendicular spike (`[chosen, ...walker.waypoints]`) with a 3-point rounded chicane bypass arc (`[entryArcPt, apexPt, exitArcPt, ...walker.waypoints]`) generated by `buildSmoothDetourChicaneArc(...)`:
    - `entryArcPt`: `0.45 * forwardMid` ahead with `0.55 * detourDist` lateral offset.
    - `apexPt`: `forwardMid` ahead with `1.0 * detourDist` lateral offset (`chosen`).
    - `exitArcPt`: `min(cLen * 0.9, forwardMid * 1.55)` ahead with `0.55 * detourDist` lateral offset merging smoothly back toward `wp`.
    - All three points are clamped and validated against obstacle boxes (`isDetourValid`); if only the apex clears tight quarters, it falls back gracefully to a filleted arc.
  - Remove the abrupt `walker.waypoints = [{ x: walker.targetX, y: walker.targetY }]` snap when `distToFinalTarget <= 62` so an active bypass curve finishes smoothly without a mid-stride heading snap.

### Decision 5 (`Q5`): Smoothed Velocity Tangent & Diagonal Hysteresis for `Directional Turnaround`
- In `src/sprites/hero-vector-rig.ts`, deepen `deriveFacingDirectionFromDelta(dx, dy, currentFacing?)`:
  - When `currentFacing` is omitted, preserve the exact legacy threshold `Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? "east" : "west") : (dy >= 0 ? "south" : "north")`.
  - When `currentFacing` is provided:
    - Apply a `1.18` diagonal hysteresis ratio (`DIAGONAL_FACING_HYSTERESIS = 1.18`):
      - If `currentFacing === "east"` or `"west"` (horizontal), stay horizontal unless `Math.abs(dy) > Math.abs(dx) * 1.18` (or if `dx` reverses sign strongly, switch `"east" ↔ "west"`).
      - If `currentFacing === "north"` or `"south"` (vertical), stay vertical unless `Math.abs(dx) > Math.abs(dy) * 1.18` (or if `dy` reverses sign strongly, switch `"north" ↔ "south"`).
- In `src/web/client-choreography.ts` (via a compact helper in `src/web/walker-separation.ts`), track smoothed velocity components (`smoothVx`, `smoothVy` on `WalkerState`, blended as `0.65 * prevSmooth + 0.35 * stepDelta`) and pass `(smoothVx, smoothVy, walker.facingDirection)` to `deriveFacingDirectionFromDelta` so banking around rounded curves or receiving gentle lateral steering nudges never causes 45° sprite orientation chatter.

---

## 3. Acceptance Criteria & Verification Matrix

1. **Corner Filleting & Obstacle Safety**:
   - Every seeded multi-segment route returned by `computeRingCorridorWaypoints(fromX, fromY, toX, toY, seed)` around `GOAL_ASSEMBLY_OBSTACLE_BOX` or across unobstructed doglegs has rounded interior corners with maximum consecutive segment turn angle significantly reduced compared to raw 90° corners, and zero segments intersecting `GOAL_ASSEMBLY_OBSTACLE_BOX` or `RESOURCE_STOCKPILE_OBSTACLE_BOX`.
   - Unseeded unobstructed calls `computeRingCorridorWaypoints(fromX, fromY, toX, toY)` still return `1` waypoint, and East Portal crossings still include `{ x: 774, y: 352 }`.
2. **Continuous Arc-Length Stepping**:
   - Stepping `stepCharacterToilQueue` across a multi-waypoint rounded turn advances the character by the full `speedPxPerSec * (dtMs / 1000)` arc length without snapping and stopping at intermediate curve vertices.
3. **Continuous `Thinking` Plaza Roaming & 3-Point Chicane Detours**:
   - A `Thinking` character roaming an Assembly plaza transitions continuously from leg to leg (`isWalking === true` across vertex handoffs) along rounded corners without stopping at polygon vertices.
   - `resolveDynamicDetourWaypoints` inserts a smooth multi-point chicane bypass arc on opposite sides for opposing walkers (`Math.sign(eastWalker.waypoints[0].y - 180) !== Math.sign(westWalker.waypoints[0].y - 180)`).
4. **Hysteresis-Stabilized `Directional Turnaround`**:
   - `deriveFacingDirectionFromDelta(dx, dy, currentFacing)` prevents 45° diagonal chatter while switching cleanly when a turn commits to a new cardinal axis, and projected floor path lines remain suppressed on the canvas.
5. **Architecture & Container Verification**:
   - Every file in `src/` is `<= 400` lines (`tests/00-architecture-invariants.test.ts`).
   - All unit and integration tests (`npm test`) pass, and the live containerized visualizer (`opencode-pixel-guild-visualizer` on port `4310`) is verified with visual proof in `docs/images/smooth-rounded-pathing-choreography.png`.
