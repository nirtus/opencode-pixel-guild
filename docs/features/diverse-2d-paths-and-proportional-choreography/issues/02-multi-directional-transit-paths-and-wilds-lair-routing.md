# 02: Multi-Directional (Diagonal / Dogleg / Arc) Station Transits & Multi-Lair Wilderness Routing

Type: task
Label: wayfinder:task
Status: resolved
Blocked by: 01

## Question

How should we ensure station-to-station transits (including unobstructed walks that do not cross the center box) and `Dungeon Wilds` searches/combat follow diverse horizontal, vertical, and diagonal paths instead of collapsing onto a single line?

## Specification

Confirmed in Grilling Round 1 (`Q3`, `Q4`) and [Feature Specification](./../spec.md):
- **Multi-Directional Indoor Transit Routing (`src/encounter/toil-queue.ts`)**:
  - In `computeIndoorCorridorLeg(ax, ay, bx, by, routeSeed)`:
    - When `routeSeed === undefined`, preserve legacy straight-line behavior (`[{ x: bx, y: by }]` when unobstructed) for backward compatibility with unseeded unit tests.
    - When `routeSeed !== undefined` and `Math.hypot(bx - ax, by - ay) > 85` (even when `!segmentIntersectsBox(...)` is true):
      - Use `hashRouteSeed(routeSeed)` to generate **1–2 intermediate open-floor waypoints** selecting among:
        1. **Diagonal-to-Axis Dogleg**: steps diagonally (`dx !== 0 && dy !== 0`) into the adjacent open floor plaza before aligning with `(bx, by)`.
        2. **Axis-to-Diagonal Dogleg**: steps along the corridor axis first, then cuts diagonally to `(bx, by)`.
        3. **2-Point Lateral Arc**: bows `±20..42px` perpendicular to the chord `(A -> B)` through two intermediate floor points.
      - Verify that every generated intermediate point and segment stays inside walkable room bounds (`x: 56..748, y: 68..696`) and outside `GOAL_ASSEMBLY_OBSTACLE_BOX`.
  - In `compileCharacterToilQueue`, when `routeSeed` is provided, offset intermediate `Armory` and `Stockpile` waypoints across their station perimeter slots rather than routing every character to `(118, 445)` and `(355, 575)`.
- **`Dungeon Wilds` 2D Search Circuit & Multi-Lair `Combat` (`src/web/station-geometry-catalog.ts` & `src/web/station-and-workflow-routing.ts`)**:
  - Expand `WILDS_SEARCH_WAYPOINTS` to 10 waypoints spanning `x: 865..1495, y: 135..605` with diagonal, horizontal, and vertical transitions.
  - Update `allocateStationPerimeterSlot` / `resolveCharacterTargetSlot` for `Combat` so warriors distribute across active **Bug Monster** lair positions (`(1315, 380)`, `(1445, 270)`, `(1435, 495)`, `(1215, 235)`) when multiple bug monsters are active in the **Dungeon Wilds**.

## Answer

Extracted `src/encounter/corridor-router.ts` (re-exported via `src/encounter/toil-queue.ts`) with `computeUnobstructedSeededLeg` generating 2-to-3 waypoint diagonal, dogleg, and lateral-arc paths on seeded unobstructed walks (`> 85px`), distributed `Armory` and `Stockpile` stops across their 6 perimeter slots in `compileCharacterToilQueue`, and expanded `WILDS_SEARCH_WAYPOINTS` in `src/web/station-geometry-catalog.ts` to a 10-waypoint 2D circuit across `x: 925..1465, y: 165..565` with all four directional turnarounds. Verified in `tests/30-diverse-2d-paths-and-proportional-choreography.test.ts` and `tests/00-architecture-invariants.test.ts`.

## Acceptance Criteria

- [x] Seeded calls to `computeRingCorridorWaypoints(ax, ay, bx, by, routeSeed)` on unobstructed station-to-station walks (`> 85px`, such as `Library -> Forge`, `Tinker -> Enchanter`, or `Forge -> Lounge`) generate distinct multi-waypoint diagonal/dogleg/arc paths across different seeds.
- [x] `compileCharacterToilQueue` with `routeSeed` distributes `Armory` and `Stockpile` stops across distinct perimeter coordinates.
- [x] `WILDS_SEARCH_WAYPOINTS` spans `>= 8` 2D wilderness points, and `Combat` distributes warriors across multiple active **Bug Monster** lairs.
- [x] Every file in `src/` remains `<= 400` lines.
