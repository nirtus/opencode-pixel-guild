# 03: Dynamic In-Transit Steering, Personal-Space Separation & Container Visual Verification

Type: task
Label: wayfinder:task
Status: resolved
Blocked by: 01, 02

## Question

How should we guarantee that two characters never cover each other (`>= 24px` center-to-center separation) while walking in transit, crossing paths, pacing, or standing at stations, while keeping all source files `<= 400` lines?

## Specification

Confirmed in Grilling Round 1 (`Q2`, `Q3`, `Q4`) and [Feature Specification](./../spec.md):
- **Dedicated Single-Responsibility Separation & Lane Helper Module (`src/web/walker-separation.ts`)**:
  - Extract walker speed/stagger resolution, thinking-pacing segment resolution, in-transit lateral steering avoidance, and post-step personal-space separation into `src/web/walker-separation.ts` so both `src/web/client-choreography.ts` and `src/web/station-and-workflow-routing.ts` stay cleanly under the 400-line architectural limit.
- **Wire Route Seeds, Speed Variance & Departure Stagger in `stepClientChoreography` (`src/web/client-choreography.ts`)**:
  - Track a per-walker `routeLegCounter` and `departureUntilMs`.
  - When `startSlotTransition` is called, increment `routeLegCounter`, pass `routeSeed = "${c.sessionId}:${walker.routeLegCounter}"` into `computeRingCorridorWaypoints`, compute `walker.walkSpeedPxPerSec = resolveCharacterWalkSpeed(baseSpeed, c.sessionId, walker.routeLegCounter)`, and apply `resolveDepartureStaggerMs` when multiple walkers transition in the same frame.
- **In-Transit Steering Avoidance & Post-Step Personal-Space Clamp (`src/web/walker-separation.ts`)**:
  - Export `MIN_WALKER_SEPARATION_PX = 24` and `STEERING_AVOIDANCE_RADIUS_PX = 28`.
  - During walking steps, apply smooth lateral steering repulsion when another visible walker in the same chamber is within `28px`.
  - At the end of `stepClientChoreography` (before `populateDualChamberSceneHitboxes()`), call `enforceWalkerPersonalSpace(chars, clientState.characterWalkers)` which iteratively resolves any pairwise distance `< MIN_WALKER_SEPARATION_PX` (`24px`) between active visible walkers (anchoring stationary acting station workers first and nudging walking or newly-arriving characters along walkable coordinates outside `GOAL_ASSEMBLY_OBSTACLE_BOX` and inside chamber bounds).
- **Automated Regression Tests & Live Docker Visual Verification**:
  - Add `tests/29-anti-overlap-walking-choreography.test.ts` verifying:
    1. Corridor lane jitter and clockwise/counter-clockwise route diversity around `GOAL_ASSEMBLY_OBSTACLE_BOX`.
    2. Per-character stride speed variance (`±12%`) and departure stagger when multiple characters transition simultaneously.
    3. Inner thinking-pacing track separation and multi-occupant sub-segments.
    4. Strict pairwise non-occlusion (`dist >= 24px`) across every frame when 4–8 characters walk simultaneously between the same stations, cross paths, report scrolls, or pace while thinking.
  - Deploy and verify on `opencode-pixel-guild-visualizer` (`npm run docker:up` on port `4310`), run `npm test`, and capture visual proof in `docs/images/anti-overlap-walking-choreography.png`.

## Answer

Created `src/web/walker-separation.ts` with `MIN_WALKER_SEPARATION_PX = 24`, `STEERING_AVOIDANCE_RADIUS_PX = 28`, `applyInTransitSteeringAvoidance`, `enforceWalkerPersonalSpace`, `resolveThinkingPacingSegment`, `resolveThinkingPacingSlot`, and `resolveReportingScrollSlotOffset`, and wired route seeds, per-character stride speed variance (`±12%`), departure stagger (`35..180ms`), in-transit lateral steering, and post-step personal-space separation into `stepClientChoreography` (`src/web/client-choreography.ts`). Verified with `tests/29-anti-overlap-walking-choreography.test.ts`, `tests/00-architecture-invariants.test.ts` (all `src/` files `<= 400` lines), and live Docker container visual proof in `docs/images/anti-overlap-walking-choreography.png`.

## Acceptance Criteria

- [x] No two visible active characters ever come closer than `24px` center-to-center during simultaneous transit walks, path crossings, thinking-pacing, scroll reporting, or station dwelling.
- [x] All unit and architecture invariant tests pass (`npm test`, all `src/` files `<= 400` lines).
- [x] Live Docker container (`opencode-pixel-guild-visualizer` on port `4310`) is deployed, verified healthy, and visually inspected via `docs/images/anti-overlap-walking-choreography.png`.
