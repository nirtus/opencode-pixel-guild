# 04: Fix Same-Station & Same-Monster Collision Thrashing, Detour Orbiting & CPU Spike

Type: task
Label: wayfinder:task
Status: resolved
Blocked by: 01, 02, 03

## Question

Why do characters working at the same Preparation Station or fighting the same Bug Monster push each other, get stuck recalculating dynamic detours, and cause a dramatic CPU usage spike, and how should we fix it permanently?

## Root-Cause Diagnosis (`@diagnosing-bugs`)

Tracing `src/web/client-choreography.ts` (lines 318–395), `src/web/walker-separation.ts` (lines 103–326), `src/web/station-geometry-catalog.ts`, and `src/web/canvas-hero-painter.ts` reveals four interacting mechanisms that create a 60 FPS oscillation and SVG re-rasterization storm whenever two or more characters occupy or approach the same station or monster lair:

1. **Root Cause 1 — Post-Arrival Personal-Space Push (`> 3px`) Re-Triggers `isWalking = true` Every Frame (`src/web/client-choreography.ts:318, 365, 391` & `src/web/walker-separation.ts:285-322`)**:
   - In `stepClientChoreography`, when a walker reaches its target slot (`dist <= 3`), line 365 sets `walker.isWalking = false; walker.currentX = walker.targetX; walker.currentY = walker.targetY;`.
   - However, at the end of the very same frame (line 391), `enforceWalkerPersonalSpace` runs with `COLLISION_WALKER_SEPARATION_PX = 36` and `ELLIPSE_CLEARANCE_X_PX = 46`.
   - Because sibling perimeter slots at stations (`Library`: `28.6px`, `Spyglass`: `30.6px`, `Forge`: `34.9px`) and monster lairs (`Combat`: `32.4..36.3px`, or `25px` rendered in `Split` mode) are closer than `36..46px`, `enforceWalkerPersonalSpace` pushes settled characters (`weightA = 0.15` or `0.50`) **`4..12px` away from `(walker.targetX, walker.targetY)`**.
   - On the very next frame, `Math.hypot(walker.targetX - walker.currentX, walker.targetY - walker.currentY) > 3` is `true` again! The settled character flips back to `walker.isWalking = true`, walks back toward `targetX, targetY`, snaps at `dist <= 3`, and gets pushed out again at the end of the frame—oscillating forever at 60 FPS.

2. **Root Cause 2 — `resolveDynamicDetourWaypoints` Treats Same-Station / Same-Monster Occupants as Corridor Blockers (`src/web/walker-separation.ts:103-200`)**:
   - When Character B approaches its assigned slot at a station or monster lair where Character A is already working (`28..42px` away), `resolveDynamicDetourWaypoints` sees Character A within `Math.abs(latOffset) < 44` of the final approach vector.
   - Even worse, on lines 194–196 (`if (walker.hasActiveDetour && walker.waypoints.length > 1)`), `resolveDynamicDetourWaypoints` **recomputes `chosen` from the walker's moving `(currentX, currentY)` on every single frame** (`chosen = walker.currentX + ...`). Because `chosen` moves as `walker.currentX` moves, the detour waypoint runs away from the walker every frame, trapping the character in a continuous orbiting loop around the station or monster.

3. **Root Cause 3 — `applyInTransitSteeringAvoidance` Deflects Walkers Sideways During Final Slot Landing (`src/web/walker-separation.ts:202-252`)**:
   - When a walker is within the final approach radius (`< 48px` from `(walker.targetX, walker.targetY)`) of its assigned station or combat slot, `applyInTransitSteeringAvoidance` applies tangential repulsion (`STEERING_AVOIDANCE_RADIUS_PX = 38`) from neighbors already seated at adjacent slots of the same station/monster, pushing the arriving walker sideways past its `dist <= 3` landing threshold.

4. **Root Cause 4 — Why CPU Usage Spikes Dramatically (`src/web/canvas-hero-painter.ts:137-163`)**:
   - Because characters at the same station or monster oscillate between `isWalking = true` (`poseMode = "walk"`, 12 animation buckets, rapidly flipping `facingDirection` between `north`/`south`/`east`/`west` on every push) and `isWalking = false` (`poseMode = "combat"` / `"library"` / `"forge"`, 6 animation buckets), `drawCharacterHero` misses cache keys, thrashes the LRU map, and executes `buildArticulatedHeroSvg` + `encodeURIComponent` + `new Image()` SVG rasterization alongside 12-pass O(N²) coordinate projections 60 times per second.

---

## Specification of the Fix

1. **Settled Station & Combat Characters Are 100% Immovable (`weight = 0`) & Never Pushed Off `(targetX, targetY)` (`src/web/walker-separation.ts`)**:
   - Any character that has arrived at its target slot (`!walker.isWalking` or `Math.hypot(walker.targetX - walker.currentX, walker.targetY - walker.currentY) <= 3`) is **completely pinned (`weight = 0`)** in `enforceWalkerPersonalSpace`. Settled characters at a station, Lounge, or Combat lair must **never** be moved by `enforceWalkerPersonalSpace`, guaranteeing they never get pushed past the `dist > 3` threshold back into `isWalking = true`.
   - Furthermore, two characters that are both assigned to distinct perimeter slots of the same station/monster (or within `48px` of their final target slot) must not push each other at all once within their final landing zone (`distToTarget <= 36px`).

2. **Disable Detour & Steering Avoidance Inside the Final Station/Monster Approach Zone & Fix Moving-Target Detour Recomputation (`src/web/walker-separation.ts`)**:
   - **Final Approach Exemption**: In both `resolveDynamicDetourWaypoints` and `applyInTransitSteeringAvoidance`, if the walker is within `60px` of its final destination `(walker.targetX, walker.targetY)`:
     - Clear any active detour (`if (walker.hasActiveDetour && walker.waypoints.length > 1) { walker.waypoints = [{ x: walker.targetX, y: walker.targetY }]; walker.hasActiveDetour = false; }`) and return immediately so the walker lands smoothly and directly into its assigned perimeter slot without being deflected by station/monster neighbors.
   - **Exclude Same-Destination Neighbors as Blockers**: In `resolveDynamicDetourWaypoints`, ignore any `other` character that is stationary at a station/monster or whose position is within `56px` of `walker`'s final destination `(walker.targetX, walker.targetY)`.
   - **Compute Detour Waypoint Once Per Obstacle (Never Recompute a Moving Detour Every Frame)**:
     - If `walker.hasActiveDetour` is already `true`, do **not** recompute `chosen` every frame from `walker.currentX`! Let `stepCharacterToilQueue` walk to the fixed detour point and consume it (resetting `walker.hasActiveDetour = false` once `walker.waypoints.length <= 1`), with a 15-frame (`750ms`) cooldown between detour insertions so `resolveDynamicDetourWaypoints` can never loop or oscillate.

3. **De-Collide Queued `recentTools` Combat Slots (`src/web/station-and-workflow-routing.ts`)**:
   - In `resolveToolRecordTargetSlot`, when `station === "Combat"`, delegate to `allocateCombatMonsterPerimeterSlot` (just like `resolveCharacterTargetSlot`) so queued combat tool records target the character's actual assigned monster lair slot instead of defaulting to `PREPARATION_STATION_GEOMETRY_CATALOG.Combat`.

## Answer

Pinned settled station and combat characters (`weight = 0`, `bothNearDistinctSlots` exemption when `targetSep >= 22`) in `enforceWalkerPersonalSpace`, exempted final station/monster approach (`<= 62px` / `<= 52px`) and destination neighbors (`<= 56px`) from `resolveDynamicDetourWaypoints` and `applyInTransitSteeringAvoidance`, made `resolveDynamicDetourWaypoints` compute a one-shot fixed detour waypoint (`if (walker.hasActiveDetour) return`) verified against obstacle box intersection, and delegated `Combat` slots in `resolveToolRecordTargetSlot` to `allocateCombatMonsterPerimeterSlot`. Verified with `tests/30-diverse-2d-paths-and-proportional-choreography.test.ts` (`Ticket 04`) and live Docker visual proof in `docs/images/same-station-and-monster-collision-fix.png`.

## Acceptance Criteria

- [x] Multiple characters working at the same `Preparation Station` (e.g., 3–4 characters at `Library` or `Forge`) or fighting the same **Bug Monster** (`Combat`, including in `65% / 35%` Split mode) walk smoothly into their assigned perimeter slots, settle to `isWalking === false`, and exhibit **0.0px position drift and 0 detour recalculations** across subsequent frames.
- [x] `resolveDynamicDetourWaypoints` never recomputes a moving detour waypoint every frame and never triggers when within `60px` of the final destination or against characters near the destination.
- [x] All unit and architecture invariant tests pass (`npm test`, all `src/` files `<= 400` lines), and live container visual proof is verified on `opencode-pixel-guild-visualizer`.
