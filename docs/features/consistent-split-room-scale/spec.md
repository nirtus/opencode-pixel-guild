# Feature Specification: Consistent Workshop Room Scale & Object Spacing in Split View (`consistent-split-room-scale`)

## 1. Problem Diagnosis

When switching **Chamber Focus Mode** from **Workshop Room** (`"workshop"`) to **Both** (`"split"` showing both **Workshop Room** and **Dungeon Wilds**):
1. **Horizontal Room Inflation (`800px` → `1040px+`)**:
   - All **Preparation Stations**, the central **Goal Assembly Site**, and **Guild Characters** are calibrated for a canonical `800 × 720` **Workshop Room**.
   - In `src/scene/camera.ts`, `computeProportionalWorldDimensions(availW, availH, "split")` previously started from `WORLD_TOTAL_WIDTH_PX = 1600` and set `roomWidth = Math.round(worldWidth * 0.65) = 1040` (and up to `1924px` on wide viewports).
   - Because station and character sprites are drawn at unscaled bitmap pixel sizes while `anchorChamberPoint` pushes the walls and interior coordinates apart across `1040px+`, `240px+` of extra horizontal floor space opened between stations and shrunk every object relative to the room.
2. **Vertical Room Stretching (`720px` → up to `1620px`)**:
   - Whenever the World pane's aspect ratio was narrower than `worldWidth / 720` (such as the `50%` desktop World column alongside the **Spectator Drawer**), `computeProportionalWorldDimensions` stretched `worldHeight` up to `720 * 2.25 = 1620px`.
   - This inflated the **Workshop Room**'s internal coordinate box to `1040 × 1620` (`+900px` of vertical oak floorboards between the north wall, central **Goal Assembly Site**, and south wall) and forced CSS `object-fit: contain` to scale the `1600 × 1620` canvas bitmap down by `~0.5×`.

## 2. Target Architecture & Decisions

1. **Invariant Canonical Workshop Room Geometry (`800 × 720`)**:
   - In `computeProportionalWorldDimensions(availW, availH, chamber)` (`src/scene/camera.ts`), keep `roomWidth = WORLD_CHAMBER_WIDTH_PX` (`800`), `chamberWidth = WORLD_CHAMBER_WIDTH_PX` (`800`), `chamberHeight = WORLD_TOTAL_HEIGHT_PX` (`720`), and `worldHeight = WORLD_TOTAL_HEIGHT_PX` (`720`) across **all** **Chamber Focus Mode** views (`"workshop"`, `"wilds"`, and `"split"`).
   - Never stretch `chamberHeight` or `roomWidth` to fill viewport aspect-ratio mismatches; the camera and canvas stage fit the fixed-aspect world cleanly inside the viewport.
   - As a result, inside the **Workshop Room** (`0..800 × 0..720`), `anchorChamberPoint` and `anchorWorldPoint` are `1:1` identity transforms in both `Room`-only and `Both` (`Split`) modes, guaranteeing **zero** extra floor space between stations and **identical** object-to-room proportions.
2. **Split Mode `65% / 35%` World Width (`800px` Room + `432px` Wilds = `1232px` Total)**:
   - Export `SPLIT_WILDS_WIDTH_PX = 432` (`Math.ceil((WORLD_CHAMBER_WIDTH_PX * SPLIT_WILDS_WIDTH_RATIO) / SPLIT_ROOM_WIDTH_RATIO / 2) * 2`) and `SPLIT_WORLD_WIDTH_PX = WORLD_CHAMBER_WIDTH_PX + SPLIT_WILDS_WIDTH_PX` (`1232`).
   - In `"split"` mode, `computeProportionalWorldDimensions` returns:
     - `roomWidth: 800`, `chamberWidth: 800` (`65%` of `1232px`)
     - `wildsWidth: 432` (`35%` of `1232px`)
     - `worldWidth: 1232`, `worldHeight: 720`, `chamberHeight: 720`
   - In `"workshop"` and `"wilds"` single-chamber modes, `computeProportionalWorldDimensions` returns:
     - `roomWidth: 800`, `chamberWidth: 800`, `wildsWidth: 800`, `worldWidth: 800`, `worldHeight: 720`, `chamberHeight: 720`.
3. **Wilderness Coordinate Projection & Compact Banner Fit in `432px` Split Wilds**:
   - `anchorWorldPoint(worldX, worldY, chamberW, chamberH, wildsW)` and `unanchorWorldPoint` project canonical **Dungeon Wilds** coordinates (`worldX >= 800`) into `chamberW .. (chamberW + wildsW)` (`800..1232` in `Split` mode, `800..1600` in `Wilds`-only mode).
   - In `src/web/canvas-wilds-painter.ts`, clamp bug monster nameplate horizontal centers and use a concise status banner when `w < 520` so HUD pills never clip against the `432px` split wilderness border.

## 3. Verification Criteria

- Toggling between `🏰 Room` (`"workshop"`) and `⚔️ Both` (`"split"`) preserves identical `800 × 720` **Workshop Room** internal coordinates (`roomWidth = 800`, `chamberHeight = 720`), with zero change in inter-station floor spacing or station/character size relative to the room walls.
- `computeProportionalWorldDimensions(availW, availH, "split")` returns `{ roomWidth: 800, chamberWidth: 800, wildsWidth: 432, worldWidth: 1232, chamberHeight: 720, worldHeight: 720 }` across all viewport aspect ratios.
- All unit and architecture invariant tests pass (`npm test`), and visual proof on the `opencode-pixel-guild-visualizer` Docker container (`port 4310`) confirms consistent room proportions across `Room` and `Both` views.
