# Specification: Station Available-Space Claiming & Near-Station Collision Fix

## Problem Statement

1. **Physical Station Occupancy Is Lost During State Transitions & Tool Queueing**:
   - In `src/web/station-and-workflow-routing.ts` and `src/web/thinking-roam-circuits.ts`, as soon as a session's authoritative state transitions to `Thinking` or `RestingInLounge`, `resolveCharacterTargetSlot` and `assignThinkingRoamTarget` immediately clear `walker.assignedStation` and `walker.assignedSlotIdx`—even while the character's walker in `src/web/client-choreography.ts` is still locked in a station job (`isLockedInStationJob`, walking to or dwelling at a **Preparation Station** from `walker.slotQueue`).
   - In `src/web/station-and-workflow-routing.ts`, `resolveToolRecordTargetSlot` bypasses `allocateStationPerimeterSlot` and assigns `spec.perimeterSlots[occIdx % spec.perimeterSlots.length]` without checking or recording `SlotClaim` or inspecting active walkers (`allWalkers`), baking static `(x, y)` coordinates into `walker.slotQueue` at tool-ingestion time.
   - Consequently, multiple **Guild Characters** simultaneously walking to or working at the same **Preparation Station** are assigned the exact same perimeter coordinate (typically Slot `#0`).

2. **Personal-Space Pushback Deadlocks Arriving Characters Outside Stations (`dist <= 3` Is Never Reached)**:
   - In `src/web/client-choreography.ts`, a character only finishes walking and enters its station acting state when `Math.hypot(walker.targetX - walker.currentX, walker.targetY - walker.currentY) <= 3`.
   - In `src/web/walker-separation.ts`, `enforceWalkerPersonalSpace` pushes overlapping walkers apart (`COLLISION_WALKER_SEPARATION_PX = 36`, `MIN_WALKER_SEPARATION_PX = 24`), but lines 374–381 only re-anchor `walker.targetX, walker.targetY` when `!walker.isWalking`.
   - When two walkers share a station slot (or target slots closer than `36px`), `enforceWalkerPersonalSpace` pushes the arriving walker(s) `18–36px` away from `targetX, targetY` at the end of every frame. Because `dist > 3`, `walker.isWalking` remains `true` forever—trapping the characters in an infinite walk-and-repel deadlock right next to the station so they never settle or act.

3. **Sub-36px Perimeter Slot Pairs in `PREPARATION_STATION_GEOMETRY_CATALOG`**:
   - In `src/web/station-geometry-catalog.ts`, several perimeter slot pairs on the same **Preparation Station** sit closer than `COLLISION_WALKER_SEPARATION_PX = 36px`:
     - `Library`: Slot `#0` `(195, 135)` and Slot `#5` `(196, 122)` are `13.0px` apart (`< 22px`, triggering same-slot collision logic); Slot `#1` `(64, 92)` and Slot `#4` `(76, 118)` are `28.6px` apart.
     - `Spyglass`: Slot `#1` `(218, 86)` and Slot `#5` `(224, 114)` are `28.6px` apart; Slot `#3` `(252, 134)` and Slot `#5` `(224, 114)` are `34.4px` apart.
     - `Forge`: Slot `#1` `(552, 104)` and Slot `#5` `(566, 136)` are `34.9px` apart.
     - `Stockpile`: Slot `#0` `(452, 138)` and Slots `#3`/`#4` (`(418, 136)` / `(486, 136)`) are `34.1px` apart; Slot `#1` `(382, 88)` and Slot `#5` `(388, 116)` are `28.6px` apart.
     - `Combat`: `COMBAT_LAIR_SLOT_OFFSETS` Slot `#0` `(-48, 4)` and Slot `#2` `(-43, 36)` are `32.4px` apart, and Slot `#0` and Slot `#1` `(-43, -32)` are `36.3px` apart.
     - Overflow ring expansion in `allocateStationPerimeterSlot` steps outward by only `26px` per ring layer (`< 36px`).

---

## Core Design Decisions (Confirmed in Grilling Round 1, Q1–Q4)

### Decision 1: Collision-Free Perimeter Slot Geometry (`>= 38px` Pairwise Clearance)

- **Minimum `38px` Pairwise Separation Across All Station Perimeter Slots (`src/web/station-geometry-catalog.ts`)**:
  - Refine the closely-packed perimeter slots in `PREPARATION_STATION_GEOMETRY_CATALOG` (`Library`, `Spyglass`, `Forge`, `Stockpile`) and `COMBAT_LAIR_SLOT_OFFSETS` (`Combat`) so every pair of slots on the same station has Euclidean distance `>= 38px` (exceeding `COLLISION_WALKER_SEPARATION_PX = 36px`), while preserving:
    - All `STATION_BASE_ANCHORS` (Slot `#0` coordinates for every station) and `Forge` Slot `#1` `(552, 104)`.
    - Walkable **Workshop Room** bounds (`x: 50..750, y: 65..700`).
    - Exact inward **Directional Turnaround** (`slot.facingDirection === deriveFacingDirectionFromDelta(spec.focalCenter.x - slot.x, spec.focalCenter.y - slot.y)`).
    - Multi-Y (`uniqueY >= 2`) and multi-facing (`uniqueFacings >= 2`) wrap around every station.
  - Increase overflow ring expansion radial spacing in `allocateStationPerimeterSlot` from `26px` to `40px` per ring layer so overflow crowds also maintain `>= 38px` separation.
  - Ensure `REPORT_SCROLL_PERIMETER_OFFSETS` in `src/web/thinking-roam-circuits.ts` maintains `>= 36px` pairwise clearance between returning **Squad Subagents** around their parent **Guild Adventurer** while preserving Slot `#0` `(+28, +12)`.

### Decision 2: Live Physical & In-Transit Slot Reservation

- **Coordinate- & Walker-Aware Slot Reservation (`src/web/station-geometry-catalog.ts` & `src/web/station-and-workflow-routing.ts`)**:
  - Update `allocateStationPerimeterSlot` so a perimeter slot `i` (`slots[i]`) is treated as reserved/occupied if **any** other visible walker (`otherW` in `allWalkers`, excluding despawned walkers):
    1. Explicitly holds `otherW.assignedStation === stationKey && otherW.assignedSlotIdx === i`, **or**
    2. Is actively targeting or standing on `slots[i]` (`Math.hypot(otherW.targetX - slots[i].x, otherW.targetY - slots[i].y) < 32` or `(!otherW.isWalking && Math.hypot(otherW.currentX - slots[i].x, otherW.currentY - slots[i].y) < 32)`).
  - Do not release `walker.assignedStation` or `walker.assignedSlotIdx` when `resolveCharacterTargetSlot` or `assignThinkingRoamTarget` evaluates a `Thinking` or `RestingInLounge` state if the walker is still physically locked in a non-Lounge station job (`walker.isWalking` or `(walker.slotQueue?.length ?? 0) > 0` or `(walker.dwellUntilMs ?? 0) > timestampMs`).
  - Route `resolveToolRecordTargetSlot` through `allocateStationPerimeterSlot` (instead of raw modulo indexing `spec.perimeterSlots[occIdx % length]`) so tool-record slots participate in the unified slot-claiming and approach-aware selection logic.

### Decision 3: Dynamic Available-Space Claiming on Transition & Near-Station Arrival Settlement

- **Dynamic Re-Allocation to Available Space in `stepClientChoreography` (`src/web/client-choreography.ts`)**:
  - When `startSlotTransition(nextSlot)` begins a walk to an acting station (or while a walker is in transit toward an acting station `activeSlot` and `dist > 3`), check whether another walker is already settled at or closer to `(nextSlot.x, nextSlot.y)` within `< 32px`.
  - If the target coordinate is already taken by another walker, dynamically re-claim the nearest unoccupied perimeter slot for that station (via `allocateStationPerimeterSlot` / `allocateCombatMonsterPerimeterSlot` / `resolveLoungeSeatSlot`) and update `walker.targetX`, `walker.targetY`, `walker.resolvedSlot`, and `walker.waypoints` so the character immediately walks to available space instead of fighting for the occupied spot.
- **Near-Station Approach Exemption & Target Re-Anchoring (`src/web/walker-separation.ts`)**:
  - In `enforceWalkerPersonalSpace`:
    - Widen `bothNearDistinctSlots` approach radius from `44px` to `64px` (with `targetSep >= 26`) so characters approaching or settled at distinct perimeter slots of the same station never push each other off their arrival paths.
    - When two walkers have conflicting targets (`targetSep < 26`) or an arriving walker (`distToTarget <= 56`) is pushed away from a settled station occupant (`isSettledSlot`), immediately re-anchor the displaced walker's `targetX = next.x` and `targetY = next.y` (and `resolvedSlot.x = next.x, resolvedSlot.y = next.y`, clearing stale intermediate waypoints when within `<= 36px` of the station) regardless of whether `walker.isWalking` was `true`. This guarantees the displaced walker settles into the available adjacent space (`dist <= 3`, `isWalking = false`) and begins acting at the station instead of walking in place against the collision boundary.

---

## Verification & Acceptance Criteria

1. **Collision-Free Station Perimeter Catalog (`>= 38px` Pairwise Distance)**:
   - For all 8 core indoor **Preparation Stations** (`Library`, `Spyglass`, `Forge`, `Tinker`, `Armory`, `Enchanter`, `Stockpile`, `Alchemy`) and `Combat` lair perimeters, all 6 perimeter slots have pairwise Euclidean distance `>= 38px` and face inward toward `focalCenter`.
2. **Dynamic Available-Space Claiming Across Concurrent & Queued Station Visits**:
   - When 2 to 6 **Guild Characters** simultaneously or sequentially walk to the same **Preparation Station** (including via queued `recentTools` jobs or while earlier occupants transition to `Thinking` in snapshot state while still dwelling at the station), each character claims a distinct unoccupied perimeter slot and reaches `isWalking === false` (`dist <= 3`) at the station within bounded frames—never oscillating or fighting for the same coordinate.
3. **Zero Walk-and-Repel Deadlock Next to Stations**:
   - Even if two walkers are forcibly initialized with the exact same station target `(x, y)` and walk toward it simultaneously, they take available non-overlapping space at the station, update their targets, and both settle into `isWalking === false` (`isActing === true`) with `>= 24px` personal-space separation.
4. **Architecture & Live Container Verification**:
   - All files under `src/` remain `<= 400` lines (`tests/00-architecture-invariants.test.ts`).
   - Deployed and verified on `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`) with headless Chrome visual proof saved in `docs/images/station-available-space-collision-fix.png`.
