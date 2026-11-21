# Specification: Hidable Gamemaster Spectator Drawer, 65/35 Split Room/Wilds Ratio & 50% Thinking Pacing Slowdown

## Problem Statement

1. **Gamemaster Panel (`Spectator Drawer`) Cannot Be Hidden on Desktop**:
   - While `.world-section` has `#btn-hide-world` (`Hide World ◀`) allowing operators to collapse the World section so the **Spectator Drawer** expands to `100%` width, there is no reciprocal toggle to collapse the Gamemaster panel (**Spectator Drawer**) so the **Guild Floorplan** (`Workshop Room` and `Dungeon Wilds`) can expand to `100%` of `.main-stage` width.
   - Operators need a compact icon toggle button placed immediately to the right of the `⚡ Ticker` button (`#drawer-tab-ticker`) in the Gamemaster top menu (`.drawer-tabs` **Category Subtab Deck**), and a matching restore icon toggle when collapsed.

2. **Split World Chambers (`Workshop Room` & `Dungeon Wilds`) Use a 50/50 Width Ratio**:
   - In `src/scene/camera.ts` (`computeProportionalWorldDimensions`, `anchorChamberPoint`, `unanchorChamberPoint`, `anchorWorldPoint`, `unanchorWorldPoint`, `computeChamberCameraFit`, `clampCameraToChamberWalls`) and `src/web/app-main.ts`, when both the **Workshop Room** and **Dungeon Wilds** are displayed side-by-side (`Split` mode or `Auto` mode with active **Bug Monsters**), the canvas width is divided `50% / 50%` (`800px` Room : `800px` Wilds).
   - Because the **Workshop Room** houses 10 interactive stations, the central **Goal Assembly Site**, and the majority of **Guild Characters**, while the **Dungeon Wilds** is a secondary outdoor combat and diagnostic arena, the split chamber width ratio must be `65%` **Workshop Room** and `35%` **Dungeon Wilds**.

3. **Thinking Pacing Around the `Goal Assembly Site` Moves at Full Transit Speed (`155 px/s`)**:
   - In `src/web/client-choreography.ts` and `src/web/station-and-workflow-routing.ts`, when a character is in `lifecycleState === "Thinking"` and pacing back and forth along `ASSEMBLY_PACING_SIDES` around the central **Goal Assembly Site** (`station === "Assembly" && !activeSlot.isActing`), `stepClientChoreography` steps them at the full station-to-station sprint speed (`speedPxPerSec: 155`, `walkCycle += dtMs * 0.012`, and `2000ms` leg period).
   - Characters pacing while thinking appear frantic rather than contemplative; their pacing speed and stride cadence while thinking must be slowed down by `50%`.

---

## Core Design Decisions (Confirmed in Grilling Round 1, Q1–Q4)

### Decision 1: Hidable Gamemaster Panel (`Spectator Drawer`) with Icon Toggle Next to `Ticker`

- **DOM & Placement**:
  - In `src/web/app.html`, inside `.spectator-sidebar > .drawer-chrome > .drawer-tabs`, add a compact icon toggle button immediately to the right of `#drawer-tab-ticker`:
    ```html
    <button type="button" class="btn btn-icon-compact" id="btn-toggle-gamemaster" aria-label="Hide Gamemaster Panel" title="Hide Gamemaster Panel">⇥</button>
    ```
  - In `.world-toolbar > .camera-zoom-group` (immediately to the right of `#btn-hide-world`), add the matching restore icon button (hidden unless `isGamemasterCollapsed === true`):
    ```html
    <button type="button" class="btn btn-icon-compact is-hidden" id="btn-restore-gamemaster" aria-label="Show Gamemaster Panel" title="Show Gamemaster Panel">⇤</button>
    ```
- **State & Persistence (`isGamemasterCollapsed`)**:
  - Add `isGamemasterCollapsed: boolean` (default `false`) to `clientState` (`src/web/client-state.ts`), `ClientOperatorPreferences` (`src/types/operator-types.ts`), `src/server/operator-store.ts`, and `src/web/world-persistence.ts`.
  - **Mutual Exclusion with `isWorldCollapsed`**:
    - Setting `isGamemasterCollapsed = true` automatically sets `isWorldCollapsed = false` so both panels are never hidden simultaneously.
    - Setting `isWorldCollapsed = true` (via `#btn-hide-world`) automatically sets `isGamemasterCollapsed = false`.
- **Layout & Camera Re-fit**:
  - Sync `data-gamemaster-hidden="true" | "false"` on `#main-stage` in `syncSpectatorDrawerChrome()` (`src/web/ledger-panel-reconciler.ts`) (never using legacy `data-details-hidden`).
  - In `src/web/styles.css`, `.main-stage[data-gamemaster-hidden="true"]` sets `grid-template-columns: minmax(0, 1fr)` and `.main-stage[data-gamemaster-hidden="true"] .spectator-sidebar { display: none !important; }`.
  - When `isGamemasterCollapsed` toggles, `#btn-restore-gamemaster` toggles visibility (`.is-hidden`), `syncViewportCameraFit(canvas, true)` recalculates `availW` using `100%` of viewport width when `isGamemasterCollapsed` is `true`, and `window.dispatchEvent(new Event("resize"))` runs on next animation frame.

### Decision 2: `65% / 35%` Width Ratio for `Workshop Room` vs `Dungeon Wilds` in Split World View

- **Split Chamber Constants & Proportional Dimensions (`src/scene/camera.ts`)**:
  - Define `export const SPLIT_ROOM_WIDTH_RATIO = 0.65;` and `export const SPLIT_WILDS_WIDTH_RATIO = 0.35;`.
  - Extend `ProportionalWorldDimensions` with `roomWidth: number` and `wildsWidth: number`:
    - When `chamber === "split"`, `roomWidth = Math.round(worldWidth * SPLIT_ROOM_WIDTH_RATIO)` (`65%` of `worldWidth`, e.g., `1040px` at `1600px` total width) and `wildsWidth = worldWidth - roomWidth` (`35%` of `worldWidth`, e.g., `560px` at `1600px` total width), with `chamberWidth = roomWidth`.
    - When `chamber !== "split"` (`"workshop"` or `"wilds"`), `roomWidth = worldWidth`, `wildsWidth = worldWidth`, and `chamberWidth = worldWidth`.
- **Bidirectional Chamber Coordinate Anchoring (`anchorChamberPoint` / `unanchorChamberPoint` / `anchorWorldPoint` / `unanchorWorldPoint`)**:
  - Update `anchorChamberPoint(x, y, chamberW, chamberH)` and `unanchorChamberPoint(ax, ay, chamberW, chamberH)`:
    - When `chamberW >= WORLD_CHAMBER_WIDTH_PX` (`800`), preserve existing perimeter-anchored expansion (`dx = chamberW - 800`, expanding interior `160..590`).
    - When `chamberW < WORLD_CHAMBER_WIDTH_PX` (such as the `35%` **Dungeon Wilds** chamber in `split` mode where `wildsWidth = 560`), scale `x` proportionally (`ax = x * (chamberW / WORLD_CHAMBER_WIDTH_PX)` and inverse `x = ax * (WORLD_CHAMBER_WIDTH_PX / chamberW)`) so all wilderness trails, vegetation, lair positions (`415..645`), bug monsters, and lantern flares fit cleanly inside the `35%` Wilds chamber without clipping.
  - Update `anchorWorldPoint(worldX, worldY, chamberW, chamberH, wildsW)` and `unanchorWorldPoint(anchoredX, anchoredY, chamberW, chamberH, wildsW)`:
    - For `worldX < WORLD_CHAMBER_WIDTH_PX` (`800`), anchor within `0 .. chamberW` (`roomWidth`).
    - For `worldX >= WORLD_CHAMBER_WIDTH_PX` (`800`), anchor `worldX - 800` within `wildsW` (defaulting to `WORLD_TOTAL_WIDTH_PX - chamberW` when `chamberW > WORLD_CHAMBER_WIDTH_PX` and `chamberW < WORLD_TOTAL_WIDTH_PX`, or explicit `wildsW`) and offset by `+ chamberW`.
- **Canvas Painting & Hit-Testing (`src/web/app-main.ts`, `src/web/pointer-and-camera.ts`, `src/web/client-state.ts`)**:
  - Track `clientState.wildsWidth` alongside `clientState.chamberWidth`.
  - In `renderCanvasFrame` (`src/web/app-main.ts`), paint `renderWorkshopRoom(ctx, cw, ch, t)` at `0..cw` (`65%` width in split mode) and `renderOutdoorWilderness(ctx, effective === "split" ? cw : 0, wildsW, ch, t, timestampMs)` (or at `ox = cw` with width `wildsW = clientState.wildsWidth` in split mode), and pass `wildsW` to `anchorWorldPoint` and `unanchorWorldPoint`.

### Decision 3: `50%` Slowdown for Characters Pacing While `Thinking`

- **Pacing Speed & Stride Cadence (`src/web/client-choreography.ts` & `src/web/station-and-workflow-routing.ts`)**:
  - Define `export const TRANSIT_WALK_SPEED_PX_PER_SEC = 155;` and `export const THINKING_PACING_SPEED_PX_PER_SEC = 77.5;` (`50%` of `155 px/s`).
  - When a character walker is actively pacing at the **Goal Assembly Site** during `Thinking` (`activeSlot.station === "Assembly" && !activeSlot.isActing && walker.hasReachedAssemblyPacing && c.lifecycleState === "Thinking"`):
    - Step `compileCharacterToilQueue` and `stepCharacterToilQueue` with `speedPxPerSec: THINKING_PACING_SPEED_PX_PER_SEC` (`77.5 px/s`, `50%` slower than transit walking).
    - Advance `walker.walkCycle` at `50%` rate (`dtMs * 0.006` instead of `dtMs * 0.012`).
    - In `drawCharacterHero` (`src/web/canvas-hero-painter.ts`), when a character is walking during Assembly thinking-pacing (`isWalking && slot.station === "Assembly" && !slot.isActing`), slow the vertical walk bobbing and sprite animation bucket cadence by `50%` (`t * 0.5`).
  - In `resolveCharacterTargetSlot` (`src/web/station-and-workflow-routing.ts`), double the initial pacing leg period from `2000ms` to `4000ms` (`Math.floor(timestampMs / 4000)`) to match the `50%` slower pacing speed.
  - Normal station-to-station walking transit (including walking from a station to the **Goal Assembly Site** before `hasReachedAssemblyPacing` is true, or walking from the **Goal Assembly Site** to a station) remains at `155 px/s`.

---

## Verification & Acceptance Criteria

1. **Hidable Gamemaster Panel & Icon Toggle**:
   - `#btn-toggle-gamemaster` (`.btn-icon-compact`) renders immediately to the right of `#drawer-tab-ticker` (`⚡ Ticker`) in `.drawer-tabs`.
   - Clicking `#btn-toggle-gamemaster` sets `clientState.isGamemasterCollapsed = true` (and `isWorldCollapsed = false`), sets `data-gamemaster-hidden="true"` on `#main-stage`, hides `.spectator-sidebar`, expands `.world-section` to `100%` width, re-fits the canvas camera, and reveals `#btn-restore-gamemaster` in `.camera-zoom-group`.
   - Clicking `#btn-restore-gamemaster` restores the Gamemaster panel (`isGamemasterCollapsed = false`) and hides `#btn-restore-gamemaster`.
   - `isGamemasterCollapsed` persists across `world-persistence.ts` and `operator-store.ts`.

2. **`65% / 35%` Room vs Wilds Width Ratio**:
   - `computeProportionalWorldDimensions(availW, availH, "split")` returns `roomWidth = Math.round(worldWidth * 0.65)` and `wildsWidth = worldWidth - roomWidth` (e.g., `1040px` Room and `560px` Wilds at `1600px` world width).
   - `anchorWorldPoint` and `unanchorWorldPoint` accurately project and invert coordinates in both the `65%` **Workshop Room** (`0..800` -> `0..roomWidth`) and the `35%` **Dungeon Wilds** (`800..1600` -> `roomWidth..worldWidth`) so clicking Bug Monsters or stations in split view hits their exact coordinates.
   - Single-chamber modes (`🏰 Room` and `🌫️ Wilds`) continue to use `100%` of the canvas width.

3. **`50%` Thinking Pacing Slowdown**:
   - A character in `Thinking` state who has reached the **Goal Assembly Site** (`hasReachedAssemblyPacing === true`) paces along `ASSEMBLY_PACING_SIDES` at `77.5 px/s` (`50%` of the `155 px/s` transit speed) with `50%` slower `walkCycle` and `4000ms` leg period.
   - A character walking between stations (or walking to the **Goal Assembly Site** before reaching it) continues to move at `155 px/s`.

4. **Architecture & Live Container Verification**:
   - Every file under `src/` remains `<= 400` lines (`tests/00-architecture-invariants.test.ts`).
   - Deployed and verified on `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`) with headless Chrome visual proof in `docs/images/`.
