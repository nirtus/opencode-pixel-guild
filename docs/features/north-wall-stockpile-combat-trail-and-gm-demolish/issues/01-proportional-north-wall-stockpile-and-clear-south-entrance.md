# Issue 01: Proportional North-Wall Stockpile & Unobstructed South Entrance

Type: task
Label: ready-for-agent
Status: resolved

## Goal

Move the **Resource Stockpile** from `(368, 628)` (where it blocks the **South Swinging Guild Door**) to the north wall between **Observatory Spyglass** and **Anvil Forge**, and shift **Observatory Spyglass** left so all four north-wall stations (`Library`, `Spyglass`, `Stockpile`, `Forge`) are proportionally placed across the top wall.

## Acceptance Criteria

1. **`PREPARATION_STATION_GEOMETRY_CATALOG` & `STATION_BASE_ANCHORS` (`src/web/station-geometry-catalog.ts`)**:
   - **Library (`Library Study Bookshelf`)**: `painterOrigin: { x: 116, y: 84 }`, `focalCenter: { x: 136, y: 88 }`, `hitbox: { x: 52, y: 42, w: 148, h: 98 }`, `STATION_BASE_ANCHORS.Library = { x: 158, y: 135 }`, and inward-facing perimeter slots around `(116, 84)`.
   - **Spyglass (`Observatory Spyglass`)**: `painterOrigin: { x: 284, y: 82 }`, `focalCenter: { x: 284, y: 78 }`, `hitbox: { x: 222, y: 42, w: 132, h: 92 }`, `STATION_BASE_ANCHORS.Spyglass = { x: 284, y: 112 }`, and inward-facing perimeter slots around `(284, 82)`.
   - **Stockpile (`Resource Stockpile`)**: `painterOrigin: { x: 452, y: 84 }`, `focalCenter: { x: 452, y: 84 }`, `hitbox: { x: 388, y: 42, w: 132, h: 96 }`, `STATION_BASE_ANCHORS.Stockpile = { x: 452, y: 138 }`, and inward-facing perimeter slots around `(452, 84)` (`{ x: 452, y: 138, facingDirection: "north" }`, `{ x: 382, y: 88, facingDirection: "east" }`, `{ x: 522, y: 88, facingDirection: "west" }`, `{ x: 418, y: 136, facingDirection: "north" }`, `{ x: 486, y: 136, facingDirection: "north" }`, `{ x: 388, y: 116, facingDirection: "east" }`).
   - **Forge (`Anvil Forge`)**: `painterOrigin: { x: 662, y: 86 }`, `focalCenter: { x: 645, y: 102 }`, `hitbox: { x: 560, y: 42, w: 176, h: 112 }`, `STATION_BASE_ANCHORS.Forge = { x: 600, y: 155 }`.
   - Update `SOUTH_DOOR_FOYER_WAYPOINT` to `{ x: 400, y: 560, facingDirection: "north" as const }` since the south doorway entrance is now unobstructed.
2. **Station Painters & Room Lighting/Windows (`src/web/canvas-station-painter.ts`, `src/web/canvas-room-painter.ts`, `src/sprites/hero-vector-rig.ts`, `src/encounter/toil-queue.ts`)**:
   - Update `paintCompactLibraryStudyStation` (`(116, 84)`), `paintCompactObservatoryStation` (`(284, 82)`), and `paintCompactResourceStockpileStation` (`(452, 84)`).
   - Update north windows (`[88, 64]`, `[252, 72]`, `[420, 72]`) and radial ambient lighting pools in `src/web/canvas-room-painter.ts`.
   - Update `STOCKPILE_ANCHOR` in `src/encounter/toil-queue.ts` to `{ x: 452, y: 138 }` and remove the south-door Stockpile bypass in `computeRingCorridorWaypoints` so characters entering at `(400, 692)` can walk straight into the hall.
   - Update `STATION_FOCAL_CENTERS` in `src/sprites/hero-vector-rig.ts` (`Library: { x: 136, y: 88 }`, `Spyglass: { x: 284, y: 78 }`, `Stockpile: { x: 452, y: 84 }`).
3. **Tests**:
   - Update and add unit tests verifying the proportional north-wall station positions (`Library.x < Spyglass.x < Stockpile.x < Forge.x`, all with `y < 165`) and unobstructed South Door entry.
