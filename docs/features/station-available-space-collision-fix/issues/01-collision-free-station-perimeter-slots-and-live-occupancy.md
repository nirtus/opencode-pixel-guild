# 01: Collision-Free Station Perimeter Slots & Live Walker Occupancy Reservation

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: None

## Question

How do we ensure that **Preparation Station** perimeter slots never sit inside each other's `36px` collision radius and that slot allocation recognizes any slot physically occupied or targeted by an in-transit walker?

## Specification

Confirmed in Grilling Round 1 (`Q1–Q4`) and [Feature Specification](./../spec.md):
- **Enforce `>= 38px` Pairwise Separation Across Station Perimeter Slots (`src/web/station-geometry-catalog.ts`)**:
  - Update the sub-38px perimeter slot coordinates in `PREPARATION_STATION_GEOMETRY_CATALOG` while preserving `STATION_BASE_ANCHORS` (Slot `#0` for every station), `Forge` Slot `#1` `(552, 104)`, walkable room bounds (`x: 50..750, y: 65..700`), and exact inward `facingDirection` (`deriveFacingDirectionFromDelta(focalCenter.x - slot.x, focalCenter.y - slot.y)`):
    - `Library` (`focalCenter: (150, 88)`): keep Slots `#0..#3` (`(195, 135)`, `(64, 92)`, `(204, 92)`, `(136, 140)`); move Slot `#4` to `{ x: 78, y: 132, facingDirection: "east", side: "southwest" }` and Slot `#5` to `{ x: 212, y: 54, facingDirection: "west", side: "northeast" }` (or `{ x: 152, y: 178, facingDirection: "north", side: "south" }`) so all 6 slots are `>= 38px` apart.
    - `Spyglass` (`focalCenter: (284, 78)`): keep Slots `#0..#2` (`(284, 112)`, `(218, 86)`, `(354, 86)`); adjust Slot `#3` to `{ x: 244, y: 136, facingDirection: "north", side: "southwest" }`, Slot `#4` to `{ x: 324, y: 136, facingDirection: "north", side: "southeast" }`, and Slot `#5` to `{ x: 284, y: 154, facingDirection: "north", side: "south" }` so all 6 slots are `>= 42px` apart.
    - `Forge` (`focalCenter: (645, 102)`): keep Slots `#0..#4` (`(600, 155)`, `(552, 104)`, `(686, 155)`, `(740, 112)`, `(644, 162)`); adjust Slot `#5` from `(566, 136)` to `{ x: 556, y: 146, facingDirection: "east", side: "southwest" }` so all 6 slots are `>= 42px` apart.
    - `Stockpile` (`focalCenter: (452, 84)`): keep Slots `#0..#2` (`(452, 138)`, `(382, 88)`, `(522, 88)`); adjust Slot `#3` to `{ x: 410, y: 142, facingDirection: "north", side: "southwest" }`, Slot `#4` to `{ x: 494, y: 142, facingDirection: "north", side: "southeast" }`, and Slot `#5` to `{ x: 452, y: 178, facingDirection: "north", side: "south" }` so all 6 slots are `>= 40px` apart.
    - `Combat` (`COMBAT_LAIR_SLOT_OFFSETS`): adjust `(-43, -32)` to `(-43, -36)` and `(-43, 36)` to `(-43, 44)` so all 6 combat lair perimeter slots are `>= 40px` apart.
  - Increase overflow ring expansion radial spacing in `allocateStationPerimeterSlot` from `26 * ringLayer` to `40 * ringLayer`.
- **Coordinate- & Walker-Aware Slot Reservation (`src/web/station-geometry-catalog.ts`, `src/web/station-and-workflow-routing.ts`, `src/web/thinking-roam-circuits.ts`)**:
  - In `allocateStationPerimeterSlot`, treat a candidate slot `slots[i]` as reserved by `allWalkers` whenever another active (non-despawned) walker `otherW`:
    1. Has `otherW.assignedStation === stationKey && otherW.assignedSlotIdx === i`, **or**
    2. Is currently targeting or standing at `slots[i]` (`Math.hypot((otherW.targetX ?? otherW.currentX) - slots[i].x, (otherW.targetY ?? otherW.currentY) - slots[i].y) < 32` or `(!otherW.isWalking && Math.hypot(otherW.currentX - slots[i].x, otherW.currentY - slots[i].y) < 32)`).
  - In `resolveCharacterTargetSlot` (`src/web/station-and-workflow-routing.ts`) and `assignThinkingRoamTarget` (`src/web/thinking-roam-circuits.ts`), only clear `walker.assignedStation` and `walker.assignedSlotIdx` when the walker is **not** locked in an active station walk/queue (`!walker.isWalking && !(walker.slotQueue && walker.slotQueue.length > 0)`).
  - In `resolveToolRecordTargetSlot` (`src/web/station-and-workflow-routing.ts`), call `allocateStationPerimeterSlot` instead of `spec.perimeterSlots[occIdx % spec.perimeterSlots.length]`.

## Answer

Updated `PREPARATION_STATION_GEOMETRY_CATALOG` and `COMBAT_LAIR_SLOT_OFFSETS` in `src/web/station-geometry-catalog.ts` so every station perimeter slot pair has `>= 38px` Euclidean distance with exact inward **Directional Turnaround**, extracted `src/web/station-slot-allocator.ts` to keep all files well under 400 lines, increased overflow ring spacing to `40px` per ring layer, updated `allocateStationPerimeterSlot` to reserve slots occupied or targeted (`< 32px`) by active/in-transit walkers, preserved `walker.assignedStation` / `walker.assignedSlotIdx` while a walker is still executing a station walk/queue in `resolveCharacterTargetSlot` and `assignThinkingRoamTarget`, and routed `resolveToolRecordTargetSlot` through `allocateStationPerimeterSlot`. Verified in `tests/29-anti-overlap-walking-choreography.test.ts` and deployed to `opencode-pixel-guild-visualizer` on port `4310`.

## Acceptance Criteria

- [x] Every station in `PREPARATION_STATION_GEOMETRY_CATALOG` (`Library`, `Spyglass`, `Forge`, `Tinker`, `Armory`, `Enchanter`, `Stockpile`, `Alchemy`, `Assembly`) and `COMBAT_LAIR_SLOT_OFFSETS` has pairwise slot distance `>= 38px` and valid inward `facingDirection`.
- [x] `allocateStationPerimeterSlot` recognizes slots occupied by walkers currently targeting or standing within `32px` of a slot even if the walker's session state already moved to `Thinking` or `RestingInLounge`.
- [x] `resolveToolRecordTargetSlot` delegates to `allocateStationPerimeterSlot` so queued tool jobs claim unoccupied perimeter slots.
- [x] All source files under `src/` remain `<= 400` lines.
