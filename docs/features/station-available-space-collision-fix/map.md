# Feature Map: Station Available-Space Claiming & Near-Station Collision Fix

Label: wayfinder:map

## Destination

Deliver the complete station available-space claiming and near-station collision fix in [Specification: Station Available-Space Claiming & Near-Station Collision Fix](./spec.md) through three implementation tickets:
1. **[01: Collision-Free Station Perimeter Slots & Live Walker Occupancy Reservation](./issues/01-collision-free-station-perimeter-slots-and-live-occupancy.md)** (`Blocked by: None`)
2. **[02: Dynamic Toil Queue Available-Space Claiming & Near-Station Arrival Settlement](./issues/02-dynamic-toil-queue-slot-claiming-and-arrival-settlement.md)** (`Blocked by: 01`)
3. **[03: Station Collision Regression Suite & Live Container Visual Verification](./issues/03-station-collision-regression-tests-and-container-verification.md)** (`Blocked by: 01, 02`)

## Notes

- **Mode**: Wayfinder charting & specification complete (`map.md`, `spec.md`, and tickets `01..03` created; `GLOSSARY.md` updated).
- **Domain**: **Preparation Station**, **Guild Character**, **Guild Adventurer**, **Squad Subagent**, **Toil Queue**, **Directional Turnaround**, **Resource Stockpile**, **Armory Wardrobe**, **Break Lounge**, **Bug Monster**.
- **Specification**: [Feature Specification](./spec.md).
- **Skills to consult**: `codebase-design`, `domain-modeling`, `tdd`, `code-review`.
- **Standing Rules**: Work strictly inside the project root directory (`./`). Never create git worktrees or write files to `/tmp` or `/tmp/opencode`. Every source file in `src/` must remain `<= 400` lines (`src/web/client-choreography.ts` is 397 lines, `src/web/station-geometry-catalog.ts` is 392 lines, `src/web/walker-separation.ts` is 386 lines, and `src/web/station-and-workflow-routing.ts` is 373 lines). Deploy and verify on the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`) with visual proof in `docs/images/station-available-space-collision-fix.png`.

## Decisions so far

- [Specification: Station Available-Space Claiming & Near-Station Collision Fix](./spec.md): Locked all four Grilling Round 1 decisions (`Q1–Q4`) and updated `GLOSSARY.md` (`Preparation Station`, `Toil Queue`):
  1. Space all **Preparation Station** perimeter slots (and **Dungeon Wilds** combat lair slots) at least `>= 38px` apart (with `40px` overflow ring steps) so characters in distinct slots never trigger `COLLISION_WALKER_SEPARATION_PX = 36px` repulsion while keeping `STATION_BASE_ANCHORS` and inward **Directional Turnaround** intact.
  2. Reserve station perimeter slots based on live physical and in-transit walker targets (`allWalkers` coordinate & slot checks), retain `walker.assignedStation` / `walker.assignedSlotIdx` while a walker is still executing a station walk/queue even if the session state enters `Thinking` or `RestingInLounge`, and route `resolveToolRecordTargetSlot` through `allocateStationPerimeterSlot`.
  3. Dynamically re-allocate queued/in-transit station targets to the nearest unoccupied perimeter slot if another walker already occupies the target space, widen `bothNearDistinctSlots` approach clearance in `enforceWalkerPersonalSpace`, and re-anchor displaced near-station walker targets (`targetX, targetY`) to available space so characters always reach `dist <= 3` (`isWalking = false`) and act at the station.
- [01: Collision-Free Station Perimeter Slots & Live Walker Occupancy Reservation](./issues/01-collision-free-station-perimeter-slots-and-live-occupancy.md): Enforced `>= 38px` pairwise spacing across all station perimeter slots and combat lair slots (`40px` overflow ring steps), extracted `src/web/station-slot-allocator.ts`, updated `allocateStationPerimeterSlot` to reserve slots occupied or targeted by active/in-transit walkers, and routed `resolveToolRecordTargetSlot` through `allocateStationPerimeterSlot`.
- [02: Dynamic Toil Queue Available-Space Claiming & Near-Station Arrival Settlement](./issues/02-dynamic-toil-queue-slot-claiming-and-arrival-settlement.md): Added `ensureAvailableStationSlot` for dynamic available-space re-allocation during station transitions and in-transit conflicts, and updated `walker-separation.ts` to allow walkers to pass settled station co-workers and re-anchor conflicting near-station targets (`targetSep < 26`) so characters settle (`isWalking = false`) at the station.
- [03: Station Collision Regression Suite & Live Container Visual Verification](./issues/03-station-collision-regression-tests-and-container-verification.md): Added `Ticket 04 (Slice 1 & Slice 2)` regression tests in `tests/29-anti-overlap-walking-choreography.test.ts`, verified all 243 tests pass (`npm test`), and deployed and visually verified on the `opencode-pixel-guild-visualizer` Docker container (`docs/images/station-available-space-collision-fix.png`).

## Not yet specified

<!-- All wayfinder fog has graduated into spec.md and tickets 01..03 -->

## Out of scope

- Changing the base transit speed (`155 px/s`) or thinking-pacing speed (`46.5 px/s`).
- Moving the painted origins (`painterOrigin`) of the **Preparation Stations** inside the **Workshop Room**.
