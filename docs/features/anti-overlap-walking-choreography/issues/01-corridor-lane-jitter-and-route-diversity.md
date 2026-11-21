# 01: De-Synchronized Corridor Lanes, Route Diversity & Individual Stride Variance

Type: task
Label: wayfinder:task
Status: resolved
Blocked by: None

## Question

How should we eliminate robotic single-file lockstep walking when multiple characters travel along the ring corridor or through the wilderness portal on the same tick?

## Specification

Confirmed in Grilling Round 1 (`Q1`, `Q2`) and [Feature Specification](./../spec.md):
- **Session-Seeded Corridor Lane Offsets & Route Diversity (`src/encounter/toil-queue.ts`, exported via `src/encounter/index.ts`)**:
  - Extend `computeRingCorridorWaypoints(fromX: number, fromY: number, toX: number, toY: number, routeSeed?: string | number): ReadonlyArray<{ x: number; y: number }>` and `CompileToilQueueInput` (`routeSeed?: string | number`):
    - When `routeSeed` is omitted, preserve exact legacy behavior so all existing unit tests pass unchanged.
    - When `routeSeed` is provided:
      1. Compute a deterministic 32-bit hash from `String(routeSeed)`.
      2. **Clockwise vs Counter-Clockwise Route Diversity**: In `computeIndoorCorridorLeg`, when the direct segment intersects `GOAL_ASSEMBLY_OBSTACLE_BOX`, find both the shortest valid corner-graph path and the best alternate valid path that visits the opposite side of `GOAL_ASSEMBLY_OBSTACLE_BOX` (e.g., top vs bottom or left vs right). If the alternate path's total length is within `22%` (`<= 1.22 * shortestDist`) of the shortest path, choose between them using a bit from the hash so characters split around opposite sides of the **Goal Assembly Site**.
      3. **Corridor Lane Jitter (`±12..22px`)**: Apply a deterministic per-seed lateral/radial lane offset (`±12..22px`) to each intermediate ring-corridor corner waypoint and a vertical offset (`±20px` within `y: 332..372`, `x: 766..782`) to `EAST_WILDERNESS_PORTAL` waypoints, clamping all points outside `GOAL_ASSEMBLY_OBSTACLE_BOX` (by `>= 10px`) and within walkable room bounds (`x: 56..752, y: 68..696`).
- **Individual Stride Speed Variance & Departure Stagger (`src/web/walker-separation.ts` or `src/encounter/toil-queue.ts`)**:
  - Export `resolveCharacterWalkSpeed(baseSpeedPxPerSec: number, sessionId: string, legSeed?: number): number` returning a deterministic speed within `[0.88 * baseSpeedPxPerSec, 1.12 * baseSpeedPxPerSec]` (`±12%`).
  - Export `resolveDepartureStaggerMs(sessionId: string, simultaneousTransitionIndex: number): number` returning `0` when `simultaneousTransitionIndex <= 0` and a deterministic `35..180ms` stagger when multiple characters transition on the same tick.

## Answer

Extended `computeRingCorridorWaypoints` and `compileCharacterToilQueue` in `src/encounter/toil-queue.ts` with `routeSeed` support, deterministic 32-bit FNV-1a hashing (`hashRouteSeed`), corridor corner and wilderness portal lane jitter (`±12..22px`), clockwise/counter-clockwise route diversity around `GOAL_ASSEMBLY_OBSTACLE_BOX` when alternate routes are within `22%` length, `resolveCharacterWalkSpeed` (`±12%` per-character stride speed variance), and `resolveDepartureStaggerMs` (`35..180ms` simultaneous transition stagger). Verified with unit tests in `tests/29-anti-overlap-walking-choreography.test.ts`.

## Acceptance Criteria

- [x] `computeRingCorridorWaypoints(fromX, fromY, toX, toY, routeSeed)` produces distinct lane-offset intermediate waypoints for different `routeSeed` values and routes near-tie cross-room journeys around both sides of `GOAL_ASSEMBLY_OBSTACLE_BOX`.
- [x] `computeRingCorridorWaypoints(fromX, fromY, toX, toY)` without `routeSeed` remains 100% backward-compatible with existing tests.
- [x] `resolveCharacterWalkSpeed` varies walk speed deterministically by `±12%` per character/leg, and `resolveDepartureStaggerMs` staggers simultaneous departures by `35..180ms`.
- [x] Every file in `src/` remains `<= 400` lines.
