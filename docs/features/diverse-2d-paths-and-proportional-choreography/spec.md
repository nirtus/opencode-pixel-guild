# Specification: Full-Floor 2D Roaming Circuits, Multi-Directional Transit Paths, Dynamic Detour Bypass & Screen-Size Proportional Choreography

## Problem Statement

1. **`Thinking` Characters Ping-Pong on 4 Collinear 1D Rails (`dy = 0` or `dx = 0`)**:
   - Over `45%` of the `800×720` **Workshop Room** is wide-open oak floor across four large plazas:
     - **Zone A — North Esplanade** (`x: 172..540, y: 142..238`)
     - **Zone B — East-Central Grand Plaza** (`x: 508..750, y: 162..388` + `x: 508..590, y: 388..525`)
     - **Zone C — West Artisan Promenade** (`x: 172..272, y: 198..516`)
     - **Zone D — South-Central Commons** (`x: 172..448, y: 438..566`)
   - Yet `ASSEMBLY_PACING_SIDES` and `resolveThinkingPacingSegment` confine every `Thinking` character to 4 axis-aligned 1D segments (`y=228`, `y=452`, `x=258`, `x=522`) where `pacingLeg % 2` ping-pongs between two endpoints on the same line forever.

2. **Unobstructed Station-to-Station Walks Collapse onto a Single Shared Line**:
   - In `src/encounter/toil-queue.ts`, `computeIndoorCorridorLeg` checks `if (!segmentIntersectsBox(ax, ay, bx, by, GOAL_ASSEMBLY_OBSTACLE_BOX)) return [{ x: bx, y: by }]`, completely ignoring `routeSeed` for the ~70% of station-to-station transitions that travel along the North, West, South, or East open bands without intersecting the center box.
   - In addition, `compileCharacterToilQueue` routes all `Armory` and `Stockpile` visits to a single hardcoded coordinate (`(118, 445)` and `(355, 575)`), and `Dungeon Wilds` `WildsSearch` / `Combat` use only 5 static points and a single monster lair `(1315, 380)`.

3. **Radial Repulsion Negates Walking Progress When Characters Collide**:
   - In `src/web/walker-separation.ts`, `applyInTransitSteeringAvoidance` and `enforceWalkerPersonalSpace` push close walkers apart along the radial vector `(dx/dist, dy/dist)`. When two characters meet head-on or one walks behind/into another along the same vector, the radial push points directly backward against their forward step toward `waypoints[0]`, cancelling out each frame's movement and causing walkers to stutter or deadlock in place.
   - Furthermore, `MIN_WALKER_SEPARATION_PX = 24` is smaller than a character's `72×85` sprite and `~105px` nameplate, still allowing 65% visual overlap.

4. **Hardcoded Canonical Bounds Do Not Adapt Proportionally When Screen / Chamber Size Changes**:
   - In `src/scene/camera.ts`, `anchorChamberPoint` stretches interior coordinates (`160..590 × 160..520`) as `chamberWidth × chamberHeight` changes and scales `Dungeon Wilds` to `35%` width in `Split` mode (`wildsWidth = 560`), while `src/web/canvas-assembly-painter.ts` translates the fixed-size **Goal Assembly Site** to `(w - 800)/2 + 390, (h - 720)/2 + 345`.
   - Because obstacle avoidance and personal-space separation run in unscaled canonical pixels, separation shrinks on compressed chambers (`35%` Split Wilds or mobile portrait) and fails to adapt to expanded chamber dimensions on widescreen or Gamemaster-collapsed viewports.

---

## Core Design Decisions (Confirmed in Grilling Round 1, Q1–Q5)

### Decision 1: Deep 2D Contemplative Roaming Circuits Across All Four Open Floor Plazas (`src/web/walker-separation.ts`)

- **Multi-Zone 2D Roaming Circuits (Horizontal, Vertical & Diagonal Waypoint Loops)**:
  - Deepen `src/web/walker-separation.ts` to own the `Thinking` roaming state machine behind `resolveThinkingRoamTarget` and `advanceThinkingRoamWaypoint`, removing low-level `pacingSide` / `pacingLeg % 2` manipulation from `src/web/station-and-workflow-routing.ts` and `src/web/client-choreography.ts`.
  - Define 2D multi-waypoint roaming circuits across the four open floor plazas (**North Esplanade**, **East Grand Plaza**, **West Artisan Promenade**, **South Commons**) where each circuit has `4..6` non-collinear waypoints combining **horizontal, vertical, and diagonal** segments.
  - Apply deterministic per-session, per-occupant 2D waypoint offsets (`dx, dy` seeded by `sessionId` and `occupantIndex`) and cycle through the circuit's `0..N-1` waypoints (`pacingLeg = (pacingLeg + 1) % circuit.length`) so:
    1. Every `Thinking` character walks a visibly varied 2D path (horizontal, vertical, and diagonal legs) across open floor space.
    2. No two `Thinking` characters ever walk on the same line, even when entering `Thinking` from the same station.
    3. `ASSEMBLY_PACING_SIDES`, `resolveThinkingPacingSegment`, and `resolveThinkingPacingSlot` remain exported and backward-compatible for existing unit tests (`tests/28-*` and `tests/29-*`).

### Decision 2: Multi-Directional (Diagonal / Dogleg / Angled) Transit Paths & `Dungeon Wilds` Lair/Search Diversity

- **Seeded Unobstructed Indoor Transits (`src/encounter/toil-queue.ts`)**:
  - In `computeIndoorCorridorLeg(ax, ay, bx, by, routeSeed)`:
    - When `routeSeed === undefined`, preserve exact legacy behavior (`[{ x: bx, y: by }]` when unobstructed) so unseeded invariant tests pass unchanged.
    - When `routeSeed !== undefined` and `Math.hypot(bx - ax, by - ay) > 85` (even when `!segmentIntersectsBox(...)`), generate **1 or 2 intermediate open-floor waypoints** selected from 3 distinct route styles seeded by `hashRouteSeed(routeSeed)`:
      1. **Diagonal-then-Axis Dogleg** (45°/diagonal cut into an open floor plaza followed by a horizontal or vertical approach).
      2. **Axis-then-Diagonal Dogleg** (corridor run followed by a diagonal approach to the target slot).
      3. **Wide Lateral Arc** (two intermediate waypoints bowed `±22..44px` perpendicular to the chord into the nearest open floor plaza, clamped outside `GOAL_ASSEMBLY_OBSTACLE_BOX` and station hitboxes).
  - In `compileCharacterToilQueue`, when `routeSeed` is provided, vary the `Armory` and `Stockpile` anchor coordinates across their perimeter slot offsets rather than routing every character to `(118, 445)` and `(355, 575)`.
- **`Dungeon Wilds` 2D Search Loops & Multi-Lair `Combat` (`src/web/station-geometry-catalog.ts` & `src/web/station-and-workflow-routing.ts`)**:
  - Expand `WILDS_SEARCH_WAYPOINTS` to a 10-waypoint 2D wilderness reconnaissance circuit spanning `x: 865..1495, y: 135..605` with horizontal, vertical, and diagonal legs and facing derived from movement delta.
  - When allocating `Combat` slots in `Dungeon Wilds` (`allocateStationPerimeterSlot` / `resolveCharacterTargetSlot`), distribute warriors across the active **Bug Monster** lair coordinates (`(1315, 380)`, `(1445, 270)`, `(1435, 495)`, `(1215, 235)`) with 6 perimeter slots around each active lair.

### Decision 3: Screen-Size Proportional Coordinate, Obstacle & Separation Adaptation

- **Proportional Chamber Context (`ChamberProportionalContext`)**:
  - Define `ChamberProportionalContext { chamberWidth: number; chamberHeight: number; wildsWidth: number }` (defaulting to `800, 720, 800` when omitted, and read from `clientState.chamberWidth`, `clientState.chamberHeight`, `clientState.wildsWidth` during live choreography).
  - Export `resolveProportionalAssemblyObstacleBox(chamberW, chamberH)` (`src/encounter/toil-queue.ts` or `src/web/walker-separation.ts`):
    - Computes the canonical obstacle bounds corresponding to the rendered **Goal Assembly Site** (`center = (w - 800)/2 + 390, (h - 720)/2 + 345`, `halfW = 114, halfH = 94`) projected back via `unanchorChamberPoint`, so waypoints never clip the rendered platform at any aspect ratio while utilizing the expanded open floor on wide/tall screens.
  - Scale personal-space separation distances in **rendered chamber pixels** (`anchorWorldPoint(x, y, chamberWidth, chamberHeight, wildsWidth)`) so that even when `wildsWidth = 560` (`35%` Split mode) or on mobile portrait viewports, characters maintain full visual clearance on screen.

### Decision 4: Dynamic Detour Waypoint Bypass ("Walk Around Each Other") & Elliptical Clearance (Q5)

- **Dynamic Detour Waypoint Injection (`resolveDynamicDetourWaypoints` in `src/web/walker-separation.ts`)**:
  - Before stepping a walking character toward `waypoints[0]`, scan for any other visible character whose rendered position lies within the upcoming path corridor (within `forwardDist < Math.min(distToWp, 115)` ahead and `lateralDist < 44px` of the segment `current -> waypoints[0]`).
  - When a blocker (or colliding walker) is detected in the path ahead:
    - Never push the walker backward! Instead, compute a **dynamic lateral detour waypoint** `(detourX, detourY)` offset `52px` perpendicular to the segment (choosing the right-hand side `( -fy, fx )` by default so two head-on walkers always pass on opposite sides of each other, or flipping to the left-hand side if the right-hand point would hit a wall or `GOAL_ASSEMBLY_OBSTACLE_BOX`).
    - Prepend `(detourX, detourY)` to `walker.waypoints` (or replace an existing active detour waypoint, and skip any intermediate waypoint that is already within `44px` of a blocker) so the character smoothly **walks around** the other character along a diagonal bypass trajectory without ever slowing down or negating forward movement.
- **Elliptical Sprite & Nameplate Clearance (`48×36 px` Rendered Clearance Without Backward Push)**:
  - Enforce an elliptical personal-space clearance (`RAD_X = 46px` horizontal, `RAD_Y = 34px` vertical in rendered chamber space, with `MIN_WALKER_SEPARATION_PX = 36` minimum Euclidean floor) between visible characters.
  - When `enforceWalkerPersonalSpace` resolves residual overlap on a walking character, project the separation adjustment **perpendicular** to the walker's forward velocity vector (zero negative dot-product against `(targetX - currentX, targetY - currentY)`) so separation never negates walking progress.

---

## Verification & Acceptance Criteria

1. **Full-Floor 2D `Thinking` Roaming (Horizontal, Vertical & Diagonal)**:
   - Characters in `Thinking` state roam across 4-to-6 waypoint 2D circuits spanning Zones A, B, C, and D with horizontal, vertical, and diagonal segments (`dx !== 0 && dy !== 0` on diagonal legs), and no two `Thinking` characters share a collinear line segment.

2. **Multi-Directional Station Transit & `Dungeon Wilds` Lair Diversity**:
   - Seeded calls to `computeRingCorridorWaypoints(ax, ay, bx, by, routeSeed)` for unobstructed walks (`> 85px`) produce distinct 2-to-3 waypoint diagonal/dogleg/arc paths across different seeds.
   - `Dungeon Wilds` `WildsSearch` traverses the expanded 2D waypoint loop and `Combat` distributes warriors across multiple active **Bug Monster** lairs.

3. **Dynamic Detour Walk-Around (Zero Walking Negation) & Elliptical Non-Occlusion**:
   - When 2–6 characters walk head-on or cross through the same corridor or station approach, they insert dynamic lateral detour waypoints and walk around each other while maintaining positive forward progress toward their destinations (`0` deadlocked frames) and full elliptical clearance.

4. **Screen-Size Proportional Adaptation**:
   - Across `800×720` standard, `1480×720` widescreen, `1040+560×720` (`65% / 35%` Split), and `800×1280` mobile portrait dimensions, paths and personal-space separation scale proportionally without clipping the rendered **Goal Assembly Site** or overlapping in compressed chambers.

5. **Architecture & Live Container Verification**:
   - Every file under `src/` remains `<= 400` lines (`tests/00-architecture-invariants.test.ts`).
   - Deployed and verified on `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`) with visual proof in `docs/images/diverse-2d-paths-and-proportional-choreography.png`.
