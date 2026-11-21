# 02: Dynamic Toil Queue Available-Space Claiming & Near-Station Arrival Settlement

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01

## Question

How do we prevent characters executing queued station jobs or approaching occupied stations from fighting another character for the same coordinate or getting trapped in a walk-and-repel deadlock outside the station?

## Specification

Confirmed in Grilling Round 1 (`Q2`, `Q3`) and [Feature Specification](./../spec.md):
- **Dynamic Available-Space Re-Allocation During Station Transitions (`src/web/client-choreography.ts` & `src/web/station-geometry-catalog.ts`)**:
  - Export a helper in `src/web/station-geometry-catalog.ts` (e.g., `claimNearestAvailableStationSpace`) that, given a `sessionId`, `walker`, `slot` (`ResolvedCharacterSlot`), and `allWalkers`, checks if any other active walker is already settled at (`!other.isWalking && dist < 32`) or closer to (`otherDistToTarget + 4 < selfDistToTarget && targetDiff < 32`) the slot's `(x, y)`.
  - When a conflict is detected (either inside `startSlotTransition(nextSlot)` when popping from `walker.slotQueue`, or while `walker.isWalking` toward an acting station slot), dynamically re-allocate `slot.x, slot.y, slot.facingDirection` to the nearest unoccupied perimeter slot of that station (or outer ring if all 6 primary slots are full) and update `walker.targetX`, `walker.targetY`, `walker.resolvedSlot`, and `walker.waypoints` so the walker steers directly into available space.
- **Near-Station Approach Exemption & Displaced Target Re-Anchoring (`src/web/walker-separation.ts`)**:
  - In `enforceWalkerPersonalSpace`:
    - Widen `bothNearDistinctSlots` approach radius from `44px` to `64px` (with `targetSep >= 26`) so walkers approaching or settled at distinct perimeter slots of the same station never repel each other.
    - Whenever a walker is within `<= 56px` of its target (`Math.hypot(walker.targetX - walker.currentX, walker.targetY - walker.currentY) <= 56`) and is pushed by `enforceWalkerPersonalSpace` (either because `targetSep < 26` or because the other walker `isSettledSlot`), immediately re-anchor the displaced walker's `targetX = next.x` and `targetY = next.y` (and `walker.resolvedSlot.x = next.x; walker.resolvedSlot.y = next.y`, clearing `walker.waypoints = []` when within `<= 36px`) even if `walker.isWalking` was `true`.
    - This eliminates the walk-and-repel deadlock where `walker.isWalking` stayed `true` at `dist ≈ 18..36px` forever, allowing the character to immediately settle into the available space (`dist <= 3`, `isWalking = false`) and perform its station gesture.

## Answer

Implemented `ensureAvailableStationSlot` in `src/web/station-slot-allocator.ts` and wired it into `startSlotTransition` and the active station walk check in `src/web/client-choreography.ts` so walkers dynamically re-allocate to the nearest unoccupied perimeter space when a station slot is already occupied or contested. Updated `resolveDynamicDetourWaypoints`, `applyInTransitSteeringAvoidance`, and `enforceWalkerPersonalSpace` in `src/web/walker-separation.ts` so walkers approaching distinct station slots pass settled co-workers cleanly (`>= 24px` personal space) and conflicting near-station targets (`targetSep < 26`) re-anchor `targetX, targetY` to available space instead of deadlocking at `dist > 3`.

## Acceptance Criteria

- [x] Walkers starting or executing a station transition from `walker.slotQueue` dynamically claim an unoccupied perimeter slot if their previously queued `(x, y)` is now taken by another walker.
- [x] Walkers approaching distinct perimeter slots (`targetSep >= 26`) within `64px` of a station do not push each other off course.
- [x] If two walkers converge on the same or overlapping target near a station, `enforceWalkerPersonalSpace` re-anchors the displaced walker's `targetX, targetY` to the separated available space so both walkers reach `dist <= 3` (`isWalking === false`) and act at the station.
- [x] All source files under `src/` remain `<= 400` lines.
