# 02: Dedicated Inner Thinking-Pacing Track & Target Slot De-Collision

Type: task
Label: wayfinder:task
Status: resolved
Blocked by: 01

## Question

How should we separate `Thinking` characters pacing around the **Goal Assembly Site** from transit walkers and prevent multiple characters from targeting identical station, pacing, or scroll-reporting coordinates?

## Specification

Confirmed in Grilling Round 1 (`Q3`, `Q4`) and [Feature Specification](./../spec.md):
- **Dedicated Inner Thinking-Pacing Ring (`src/web/station-geometry-catalog.ts` & `src/web/station-and-workflow-routing.ts`)**:
  - Update `ASSEMBLY_PACING_SIDES` in `src/web/station-geometry-catalog.ts` so `Thinking` pacers walk on a dedicated inner ring closer to the **Goal Assembly Site** (`top: y=228`, `bottom: y=452`, `left: x=258`, `right: x=522`), clear of both `GOAL_ASSEMBLY_OBSTACLE_BOX` (`280..500`, `250..430`) and the outer transit ring-corridor corners (`240, 210, 540, 470`).
  - Implement multi-occupant pacing sub-segments (`resolveThinkingPacingTrackSegment` in `src/web/walker-separation.ts` or `src/web/station-geometry-catalog.ts`):
    - When `sideOcc === 0`, use the full inner side segment with a session-seeded leg period (`3600..4400ms`).
    - When `sideOcc >= 1` (multiple `Thinking` characters sharing the same side), divide the side into non-overlapping half-segments and offset the track radially by `(sideOcc % 2 === 1 ? -14 : +10)px` (clamped outside `GOAL_ASSEMBLY_OBSTACLE_BOX`) so pacers on the same side never walk over each other.
- **Target Slot De-Collision (`src/web/client-choreography.ts` & `src/web/station-and-workflow-routing.ts`)**:
  - In `src/web/client-choreography.ts`, pass the live `stationOccupantCounts` map (and increment the station count) when calling `resolveToolRecordTargetSlot(c, rec, stationOccupantCounts, hasActiveRoomBug)` instead of passing `new Map()`, ensuring queued `recentTools` jobs distribute across `perimeterSlots[0..N]`.
  - In `resolveCharacterTargetSlot` (`src/web/station-and-workflow-routing.ts`), when `c.lifecycleState === "ReportingScroll"`, track `stationOccupantCounts` for `ReportScroll:${parentId}` and fan out returning `Squad Subagent`s across distinct perimeter offsets around `parentBase`: `[(+28, +12), (-28, +12), (+26, -18), (-26, -18), (+36, -2), (-36, -2)]`.

## Answer

Moved `ASSEMBLY_PACING_SIDES` in `src/web/station-geometry-catalog.ts` onto the dedicated inner pacing ring (`y=228`, `y=452`, `x=258`, `x=522`), implemented multi-occupant non-overlapping pacing sub-segments (`resolveThinkingPacingSegment`) and `ReportingScroll` perimeter fan-out (`resolveReportingScrollSlotOffset`) in `src/web/walker-separation.ts`, and incremented `stationOccupantCounts` in `resolveToolRecordTargetSlot` (`src/web/station-and-workflow-routing.ts`). Verified in `tests/29-anti-overlap-walking-choreography.test.ts` and `tests/28-gamemaster-toggle-and-pacing-tuning.test.ts`.

## Acceptance Criteria

- [x] `ASSEMBLY_PACING_SIDES` coordinates sit on the dedicated inner pacing ring (`y=228, y=452, x=258, x=522`), separated from `RING_CORRIDOR_CORNERS` (`240, 210, 540, 470`).
- [x] Multiple `Thinking` characters assigned to the same pacing side receive non-overlapping pacing endpoints and staggered leg timing.
- [x] `resolveToolRecordTargetSlot` uses the shared `stationOccupantCounts` map so multiple queued tool records do not all collapse onto `perimeterSlots[0]`.
- [x] Multiple `Squad Subagent`s in `ReportingScroll` state target distinct perimeter offsets around their parent adventurer.
- [x] Every file in `src/` remains `<= 400` lines.
