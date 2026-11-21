# 02: Split World 65/35 Workshop Room & Dungeon Wilds Width Ratio

Type: task
Label: wayfinder:task
Status: resolved
Blocked by: None

## Question

How should the width ratio of the **Workshop Room** and **Dungeon Wilds** be changed from `50 / 50` to `65 / 35` when both chambers are displayed simultaneously (`Split` mode and `Auto` mode with active Bug Monsters)?

## Specification

Confirmed in Grilling Round 1 (`Q1`, `Q2`) and [Feature Specification](./../spec.md):
- **Split Chamber Ratio Constants & Dimensions (`src/scene/camera.ts`)**:
  - Export `SPLIT_ROOM_WIDTH_RATIO = 0.65` and `SPLIT_WILDS_WIDTH_RATIO = 0.35`.
  - In `computeProportionalWorldDimensions(availW, availH, chamber)`, compute `roomWidth` and `wildsWidth`:
    - When `chamber === "split"`: `roomWidth = Math.round(worldWidth * SPLIT_ROOM_WIDTH_RATIO)` (`65%`, e.g., `1040px` at `1600px` total width), `wildsWidth = worldWidth - roomWidth` (`35%`, e.g., `560px` at `1600px` total width), and `chamberWidth = roomWidth`.
    - When `chamber !== "split"`: `roomWidth = worldWidth`, `wildsWidth = worldWidth`, and `chamberWidth = worldWidth`.
- **Coordinate Projection & Unprojection (`src/scene/camera.ts`)**:
  - Update `anchorChamberPoint` and `unanchorChamberPoint` so chambers narrower than `WORLD_CHAMBER_WIDTH_PX` (`800px`, such as `wildsWidth = 560px` in split mode) scale `x` proportionally (`x * (chamberW / 800)` and inverse `ax * (800 / chamberW)`), while chambers `>= 800px` (`roomWidth = 1040px`) continue using perimeter-locked interior expansion.
  - Update `anchorWorldPoint(worldX, worldY, chamberW, chamberH, wildsW)` and `unanchorWorldPoint(anchoredX, anchoredY, chamberW, chamberH, wildsW)` so Room coordinates (`worldX < 800`) map to `0..chamberW` (`65%`) and Wilds coordinates (`worldX >= 800`) map to `chamberW .. (chamberW + wildsW)` (`35%`).
  - Update `computeChamberCameraFit` and `clampCameraToChamberWalls` so `split` mode uses `chamberW + wildsW` as the total world width.
- **Canvas Painting & Pointer Mapping (`src/web/client-state.ts`, `src/web/pointer-and-camera.ts`, `src/web/app-main.ts`)**:
  - Store `clientState.wildsWidth` alongside `clientState.chamberWidth`.
  - Render `renderWorkshopRoom(ctx, cw, ch, t)` at `65%` width and `renderOutdoorWilderness(ctx, cw, wildsW, ch, t, timestampMs)` at `35%` width when `effective === "split"`, and pass `clientState.wildsWidth` to `anchorWorldPoint` / `unanchorWorldPoint`.

## Answer

Updated `src/scene/camera.ts`, `src/web/pointer-and-camera.ts`, `src/web/client-state.ts`, and `src/web/app-main.ts` with `SPLIT_ROOM_WIDTH_RATIO = 0.65` and `SPLIT_WILDS_WIDTH_RATIO = 0.35`, bidirectional `roomWidth` / `wildsWidth` coordinate anchoring in `anchorWorldPoint` and `unanchorWorldPoint`, and 65/35 split canvas rendering. Verified in `tests/28-gamemaster-toggle-and-pacing-tuning.test.ts` and on the live `opencode-pixel-guild-visualizer` container.

## Acceptance Criteria

- [x] `computeProportionalWorldDimensions(1600, 720, "split")` returns `roomWidth: 1040` (`65%`) and `wildsWidth: 560` (`35%`).
- [x] `anchorWorldPoint` and `unanchorWorldPoint` round-trip coordinates in both the `65%` **Workshop Room** (`0..800`) and the `35%` **Dungeon Wilds** (`800..1600`) without clipping or hitbox drift.
- [x] In `Split` mode (`🗺️ Both` or `✨ Auto` with active bugs), the canvas renders **Workshop Room** across the left `65%` and **Dungeon Wilds** across the right `35%`.
