# Specification: Anti-Overlap Walking Choreography, Corridor Lane Diversity & Personal-Space Separation

## Problem Statement

1. **Identical 1px Ring-Corridor Waypoints Cause Single-File Lockstep Walking**:
   - In `src/encounter/toil-queue.ts`, `computeRingCorridorWaypoints` routes every character through the exact same four `RING_CORRIDOR_CORNERS` (`(240, 210)`, `(540, 210)`, `(540, 470)`, `(240, 470)`) and the single `EAST_WILDERNESS_PORTAL` (`(774, 352)`), always picking the single deterministic shortest path around `GOAL_ASSEMBLY_OBSTACLE_BOX`.
   - When multiple characters travel between the same or nearby stations, their paths collapse onto an identical 1-pixel geometric line segment.

2. **Identical Walking Speeds & Zero Departure Stagger Make One Character Disappear Behind Another**:
   - In `src/web/client-choreography.ts`, every walker steps at the exact same constant `TRANSIT_WALK_SPEED_PX_PER_SEC = 155` (and `THINKING_PACING_SPEED_PX_PER_SEC = 77.5`).
   - When an OpenCode snapshot updates multiple sessions or subagents on the same frame, they depart at the exact same millisecond at the exact same speed along the exact same waypoint line—moving in robotic lockstep with `100%` sprite occlusion so one character appears to vanish.

3. **Thinking-Pacing Shares Coordinates with Transit Walkers & Collides Same-Side Pacers**:
   - In `src/web/station-geometry-catalog.ts`, `ASSEMBLY_PACING_SIDES` (`top: y=210`, `left: x=240`, `right: x=540`, `bottom: y=470`) sits on the exact same coordinates as `RING_CORRIDOR_CORNERS`.
   - Furthermore, when multiple `Thinking` characters occupy the same pacing side, they pace between the exact same `start` and `end` points on a shared line with a shared `4000ms` global clock divisor (`Math.floor(timestampMs / 4000)`).

4. **Target Slot Collisions (`recentTools`, `ReportingScroll`, and Simultaneous Arrivals)**:
   - In `src/web/client-choreography.ts` (line 220), queued tool records call `resolveToolRecordTargetSlot(c, rec, new Map(), hasActiveRoomBug)` with a fresh empty occupant map, assigning every queued tool walk to `perimeterSlots[0]` (`occIdx = 0`).
   - In `src/web/station-and-workflow-routing.ts`, every `Squad Subagent` in `ReportingScroll` state targets the identical `(parentBase.x + 28, parentBase.y + 12)` coordinate.
   - Neither in transit nor at rest is there a dynamic personal-space separation pass to prevent two characters from covering each other.

---

## Core Design Decisions (Confirmed in Grilling Round 1, Q1–Q4)

### Decision 1: De-Synchronized Corridor Lanes, Route Diversity & Individual Stride Variance

- **Session-Seeded Corridor Lane Offsets & Route Diversity (`src/encounter/toil-queue.ts`)**:
  - Extend `computeRingCorridorWaypoints(fromX, fromY, toX, toY, routeSeed?)` (preserving backward compatibility when `routeSeed` is omitted):
    - Derive a deterministic 32-bit hash from `routeSeed` (e.g., `${sessionId}:${legCounter}`).
    - **Clockwise vs Counter-Clockwise Route Diversity**: When a walk leg intersects `GOAL_ASSEMBLY_OBSTACLE_BOX` (`minX: 280, maxX: 500, minY: 250, maxY: 430`), evaluate both candidate routes around the obstacle (top-/left-going vs bottom-/right-going). Whenever the alternate valid route is within `22%` of the shortest route's total Euclidean length, select between the primary and alternate routes using the deterministic seed so characters naturally split around opposite sides of the **Goal Assembly Site**.
    - **Corridor Waypoint & Portal Lane Jitter (`±12..22px`)**: When `routeSeed` is provided, offset each intermediate ring-corridor corner waypoint (`(240, 210)`, `(540, 210)`, `(540, 470)`, `(240, 470)`) outward/laterally within a `±12..22px` corridor lane band (clamped outside `GOAL_ASSEMBLY_OBSTACLE_BOX` with a `12px` margin and inside walkable room bounds `x: 56..752, y: 68..696`), and offset `EAST_WILDERNESS_PORTAL` vertically within `y: 332..372` (`x: 766..782`).
- **Individual Stride Speed Variance & Departure Reaction Stagger**:
  - Export `resolveCharacterWalkSpeed(baseSpeedPxPerSec: number, sessionId: string, legSeed = 0): number`:
    - Applies a deterministic per-character, per-leg multiplier in `[0.88, 1.12]` (`±12%` around `155 px/s` for transit or `77.5 px/s` for thinking-pacing) so two characters never walk at identical speeds.
  - Export `resolveDepartureStaggerMs(sessionId: string, simultaneousTransitionIndex: number): number`:
    - When multiple characters start a slot transition on the same choreography tick (`simultaneousTransitionIndex > 0`), assign a deterministic `35..180ms` reaction stagger (`departureUntilMs = nowMs + staggerMs`) before stepping their new walk leg so co-located characters never launch on the exact same frame.

### Decision 2: Dedicated Inner Thinking-Pacing Track & Target Slot De-Collision

- **Dedicated Inner Thinking-Pacing Ring (`src/web/station-geometry-catalog.ts` & `src/web/station-and-workflow-routing.ts`)**:
  - Move `ASSEMBLY_PACING_SIDES` inward to a dedicated inner pacing track around the **Goal Assembly Site** (`top: y = 228`, `bottom: y = 452`, `left: x = 258`, `right: x = 522`), separating `Thinking` pacers by `>= 18–30px` from the outer transit ring-corridor lanes (`y ≈ 190..210`, `x ≈ 218..240`, `x ≈ 540..562`, `y ≈ 470..490`).
  - **Multi-Occupant Pacing Sub-Segments & Staggered Phase**:
    - Export `resolveThinkingPacingSlot(pacingSide: AssemblyPacingSide, sideOccupantIndex: number, sessionId: string, timestampMs: number, currentLeg?: number)`:
      - When `sideOccupantIndex === 0`, the character paces along the primary inner track segment (`start` ↔ `end`).
      - When `sideOccupantIndex >= 1` (multiple characters sharing a pacing side), split the side into non-overlapping longitudinal sub-segments and apply a small radial track offset (`±14px` perpendicular to the side, staying outside `GOAL_ASSEMBLY_OBSTACLE_BOX`) plus a session-seeded leg period (`3600ms..4400ms`) so two `Thinking` characters on the same side never cross or overlap.
- **Target Slot De-Collision (`recentTools` & `ReportingScroll`)**:
  - In `src/web/client-choreography.ts`, pass the live `stationOccupantCounts` map (rather than `new Map()`) to `resolveToolRecordTargetSlot(c, rec, stationOccupantCounts, hasActiveRoomBug)` so queued tool steps claim distinct station perimeter slots (`0, 1, 2...`).
  - In `resolveCharacterTargetSlot` (`src/web/station-and-workflow-routing.ts`), when `c.lifecycleState === "ReportingScroll"`, allocate distinct perimeter offsets around `parentBase` using `stationOccupantCounts` (`ReportScroll:${parentId}`): `[(+28, +12), (-28, +12), (+26, -18), (-26, -18), (0, +30), (0, -30)]` so multiple returning `Squad Subagent`s fan out around their parent `Guild Adventurer` instead of stacking at `(+28, +12)`.

### Decision 3: Dynamic In-Transit Steering Avoidance & Post-Step Personal-Space Separation (`src/web/walker-separation.ts`)

- **Dedicated Single-Responsibility Module (`src/web/walker-separation.ts`, `<= 400` lines)**:
  - Keep `src/web/client-choreography.ts` and `src/web/station-and-workflow-routing.ts` well below the strict 400-line ceiling by extracting walker lane, speed, and dynamic separation logic into `src/web/walker-separation.ts`.
- **In-Transit Lateral Steering Avoidance (`< 28px` threshold)**:
  - While stepping walking characters in `stepClientChoreography`, compute pairwise proximity against other visible walkers in the same chamber. When two walkers come within `STEERING_AVOIDANCE_RADIUS_PX = 28`, apply a smooth lateral/repulsive steering velocity nudge (ordered deterministically by `sessionId` and clamped outside `GOAL_ASSEMBLY_OBSTACLE_BOX` and within chamber walls) so characters pass shoulder-to-shoulder without covering each other.
- **Post-Step Personal-Space Separation Pass (`MIN_WALKER_SEPARATION_PX = 24`)**:
  - At the end of `stepClientChoreography` (before `populateDualChamberSceneHitboxes()`), run `enforceWalkerPersonalSpace(chars, clientState.characterWalkers)`:
    - Enforces a minimum center-to-center distance of `MIN_WALKER_SEPARATION_PX = 24` between any two visible active walkers (excluding subagents actively inside the pentagram portal clip hole at `portalProgress < 0.5`).
    - If two walkers are closer than `24px` (even `0px` identical coordinates), deterministically push them apart along a session-hashed angle (keeping stationary station workers anchored while nudging the newer/arriving or walking character along the station perimeter or corridor) so no two visible characters ever occlude each other.

---

## Verification & Acceptance Criteria

1. **Corridor Lane Offsets & Route Diversity**:
   - `computeRingCorridorWaypoints(fromX, fromY, toX, toY, routeSeed)` produces distinct intermediate waypoints across different `routeSeed` values (`>= 10px` separation on shared corners/portals) and selects both clockwise and counter-clockwise paths around `GOAL_ASSEMBLY_OBSTACLE_BOX` when path lengths are within `22%`.
   - Omitting `routeSeed` preserves backward compatibility for existing unit tests.

2. **Individual Stride Speed Variance & Departure Stagger**:
   - `resolveCharacterWalkSpeed(155, sessionId, legIdx)` returns deterministic speeds spread across `[136.4, 173.6]` (`±12%`), and simultaneous slot transitions stagger departures so co-located characters never walk in lockstep.

3. **Dedicated Inner Thinking-Pacing Track & Target De-Collision**:
   - `ASSEMBLY_PACING_SIDES` is separated from `RING_CORRIDOR_CORNERS` (`>= 18px` clearance), and multiple `Thinking` characters on the same side occupy non-overlapping sub-segments/lanes.
   - Queued `recentTools` steps and multiple `ReportingScroll` subagents resolve to distinct non-overlapping coordinates (`>= 24px` apart).

4. **Strict Non-Occlusion Invariant (`>= 24px` Personal Space)**:
   - Across any multi-character simulation frame (simultaneous walks from the same origin to the same station, crossing paths, pacing while thinking, or dwelling at stations), no two visible characters ever share coordinates or come closer than `24px` center-to-center.

5. **Architecture & Live Container Verification**:
   - Every file under `src/` remains `<= 400` lines (`tests/00-architecture-invariants.test.ts`).
   - Deployed and verified on `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`) with headless Chrome visual proof saved in `docs/images/anti-overlap-walking-choreography.png`.
