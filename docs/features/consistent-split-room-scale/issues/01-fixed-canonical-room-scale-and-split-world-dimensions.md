# Issue 01: Lock Canonical 800x720 Workshop Room Geometry and 1232x720 (800+432) Split World Scale

Type: `task`
Label: `ready-for-agent`
Status: `resolved`

## Question / Scope

Prevent **Preparation Stations**, the **Goal Assembly Site**, and **Guild Characters** from minimizing disproportionately and drifting apart when **Both** (`Split` mode) is shown:

1. In `src/scene/camera.ts`:
   - Export `SPLIT_WILDS_WIDTH_PX = 432` and `SPLIT_WORLD_WIDTH_PX = 1232` (`800px` **Workshop Room** at `65%` + `432px` **Dungeon Wilds** at `35%`).
   - Update `computeProportionalWorldDimensions(availW, availH, chamber)` so `roomWidth = 800`, `chamberWidth = 800`, `chamberHeight = 720`, and `worldHeight = 720` remain constant across all **Chamber Focus Mode** views and viewport aspect ratios, returning `wildsWidth = 432, worldWidth = 1232` for `"split"` and `wildsWidth = 800, worldWidth = 800` for `"workshop"` / `"wilds"`.
   - Update `resolveEffectiveWildsWidth` so default split wilds width resolves cleanly.
2. In `src/web/canvas-wilds-painter.ts`:
   - Clamp bug monster nameplate horizontal positions within `[lw / 2 + 6, w - lw / 2 - 6]` and render a concise wilderness status banner when `w < 520` so banners and labels never clip inside the `432px` split **Dungeon Wilds**.
3. Update unit tests in `tests/12-mobile-screen-adaptation.test.ts`, `tests/28-gamemaster-toggle-and-pacing-tuning.test.ts`, and `tests/30-diverse-2d-paths-and-proportional-choreography.test.ts` to verify invariant `800 × 720` room geometry and `1232 × 720` (`800 + 432`) split dimensions.

## Answer

Resolved and verified on the `opencode-pixel-guild-visualizer` Docker container (`port 4310`):

- **Invariant `800 × 720` Workshop Room Geometry (`src/scene/camera.ts`)**:
  - Added `SPLIT_WILDS_WIDTH_PX = 432` and `SPLIT_WORLD_WIDTH_PX = 1232` (`800px` **Workshop Room** at `65%` + `432px` **Dungeon Wilds** at `35%`).
  - Updated `computeProportionalWorldDimensions(availW, availH, chamber)` so `roomWidth = 800`, `chamberWidth = 800`, `chamberHeight = 720`, and `worldHeight = 720` remain constant across all **Chamber Focus Mode** views (`"workshop"`, `"wilds"`, `"split"`) and viewport aspect ratios.
  - Eliminated horizontal room inflation (`800px` → `1040px+`) and vertical floor stretching (`720px` → `1620px`) when switching to `Both` (`Split` mode), so stations, characters, and the central **Goal Assembly Site** maintain the exact same size ratio relative to the room and never drift apart with extra floor space.
- **Compact Split Wilderness Labels (`src/web/canvas-wilds-painter.ts`)**:
  - Clamped bug monster nameplate horizontal positions and shortened the `Fog of War` status banner when `w < 520` (`432px` split Wilds) so labels fit cleanly within the `35%` wilderness pane.
- **Verification**:
  - `npm test`: `237` tests passing (`0` failures), including `tests/00-architecture-invariants.test.ts`, `tests/12-mobile-screen-adaptation.test.ts`, `tests/28-gamemaster-toggle-and-pacing-tuning.test.ts`, and `tests/30-diverse-2d-paths-and-proportional-choreography.test.ts`.
  - Deployed to `opencode-pixel-guild-visualizer` via `npm run docker:up` (`healthy` on `4310:4310`, `/api/guild/snapshot` returning `200`).
  - Captured and visually inspected live screenshots (`docs/images/consistent-split-room-scale-room.png` and `docs/images/consistent-split-room-scale.png`), confirming identical `800 × 720` room proportions, station sizes, character sizes, and inter-station spacing between `Room` and `Both` views.

