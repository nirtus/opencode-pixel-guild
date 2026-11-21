# Clean Cartoon & Pixel Guild Graphic Overhaul (`ready-for-agent`)

Type: spec
Label: ready-for-agent
Status: resolved
Blocked by: 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11

## Problem Statement

From the spectator's and maintainer's perspective, the **OpenCode Pixel Guild Visualizer** suffers from severe visual flatness and a split rendering architecture that prevents a rich top-down graphical overhaul:

1. **Flat, Boxy Wireframe Rooms**: Each `Workshop Room` is rendered as a flat dark rectangle (`#111827`) with `1px` debug grid lines and zero architectural depth. Rooms lack 3/4 cutaway perimeter walls, inset windows casting warm daylight shafts, interior partition walls dividing functional zones, distinct zone flooring (warm hardwood planks, checkerboard stone forge tiles, woven lounge rugs, and outdoor courtyard grass/trees surrounding the building), and directional drop shadows.
2. **Primitive Unshaded Rectangle Props & Characters**: Every `Workstation` (`Drafting Table`, `Archive Radar`, `Arcane Lectern`, `Anvil Forge`, `Reactor Console`, `Comms Dish`, `Altar of Compaction`), `Break Lounge` fixture, and `Guild Adventurer` / `Squad Subagent` sprite is drawn as 5–10 unshaded axis-aligned rectangles (`fillRect`). This prevents the clean cartoonish top-down aesthetic (crisp dark ink outlines, cel-shaded cushions and tables, tall bookshelves with ladders, armor/weapon racks, practice dummies, potted corner plants, and expressive 3/4 characters) as well as optional pixel-art sprite-sheet packs (such as CraftPix Guild Hall tilesets).
3. **Disconnected Spatial & Sprite Pipeline**: The TypeScript spatial layout and sprite composition modules (over 3,300 lines) are never executed by the companion server or the live browser canvas. Instead, the browser HTML file re-implements its own room math, cardinal BFS pathfinder, and raw rectangle renderer inline, while the TypeScript sprite module exposes 25+ leaky 16×16 ASCII string-matrix structs only used by unit tests. Any graphic overhaul currently requires editing 2 to 4 places in lockstep and fighting palette/coordinate drift.
4. **Distorted Room Proportions & Visual Clutter**: Unfiltered internal `opencode.*` built-in plugins double every `Workshop Room` from 16×12 to 32×12 tiles with empty `ONC` and `MUX +85` bays, a static `Summoning Pad` permanently blocks central floor space even when no `Squad Subagent` exists, and equipped `Skill Grimoire`s are drawn twice on every character (both as orbiting body sparks and as colored dots above the head).
5. **Bypassed Roster & HUD Modules**: The standalone roster choreography and spectator HUD view-model modules (over 2,200 lines combined) are completely bypassed in production by inline HTML string builders in the browser, failing the deletion test and allowing `Workstation` colors and tooltip descriptions to drift between tests and the live UI.

## Solution

Deliver a comprehensive **Clean Cartoon & Pixel Guild Graphic Overhaul** backed by a unified scene and HUD architecture across all five deepening candidates:

1. **Unified `Guild Floorplan` Scene Seam with Two Adapters**: Collapse spatial room layout, obstacle-avoiding BFS pathfinding, walker choreography, and scene rendering into one deep **Guild Floorplan Scene Module** shared by both the live browser canvas (via a compiled browser module served by the companion server) and the automated test suite (via a headless frame inspection adapter). Delete the duplicated inline layout, pathfinding, and primitive drawing code from the web page.
2. **Multi-Zone Cutaway `Workshop Room` Architecture & Lighting**: Deepen the `Workshop Room` spatial module to generate a rich top-down / 3/4 cutaway architectural plan for every `16 × 12` room:
   - **Thick Cutaway Perimeter Walls & Windows**: Dark-outlined 3/4 structural walls with top molding, masonry/timber north wall faces, and inset glass windows along the perimeter that cast soft angled warm sunlight shafts across the floor.
   - **Interior Partition Walls & Functional Flooring Zones**: Internal dividing walls with open archways separating four visually distinct floor zones:
     1. **Study & Planning Zone (`Drafting Table` & `Arcane Lectern`)**: Warm staggered hardwood floor planks, tall mahogany bookshelves with sliding library ladders, scroll racks, and study tables with open grimoires.
     2. **Forge & Engineering Zone (`Anvil Forge`, `Reactor Console`, `Archive Radar`, `Comms Dish`, `Altar of Compaction`)**: Checkerboard and industrial stone floor tiles, weapon and armor display racks, wooden training dummies, quench barrels, and glowing arcane conduits.
     3. **Cozy `Break Lounge` Zone**: Warm woven area rug over hardwood flooring, plush L-shaped cartoon sofas with throw pillows, coffee table with steaming mugs, stone hearth fireplace, and potted leafy corner plants.
     4. **`Resource Stockpile` Zone**: Dedicated supply depot near the workshop entrance stacked with outlined Timber Planks, Cut Stone Blocks, Iron Ingot Bars, Arcane Crystals, and Scroll Bundles.
   - **Outdoor Courtyard Surround & Multi-Room Compounds**: Render the surrounding `Guild Floorplan` grounds with lush grass textures, clustered treetops, stone footpaths connecting `Workshop Room` doors and worktree annexes, and ambient wall/furniture drop shadows.
3. **Narrow Visual Style Seam (Clean Cartoon Vector Adapter + Pixel Sprite Atlas Adapter)**: Replace the leaky 16×16 ASCII pixel-matrix structs with a narrow painter interface (`paintRoomArchitecture`, `paintFixture`, `paintCharacter`, `paintLightingAndShadows`) supporting two interchangeable style adapters:
   - **Clean Cartoon Vector Adapter (Default Zero-Asset Mode)**: Renders every furniture prop, wall, plant, rug, and 3/4 character with crisp dark ink outlines, smooth cel-shaded volume gradients, specular highlights, and soft elliptical/directional drop shadows—matching the clean cartoonish architectural style.
   - **Guild Sprite Atlas Adapter (Optional Sprite-Sheet Mode)**: Slices 32×32 / 48×48 tile and character regions from loaded PNG sprite sheets (such as the CraftPix Guild Hall asset pack) using the exact same spatial coordinates, anchor slots, and hitbox geometry.
   - **Deduplicated `Skill Grimoire` Cues**: Remove both the orbiting body spark dots and the overhead head dots (`grimoireEmblemRow`). Represent equipped `Skill Grimoire`s cleanly via the character's off-hand Grimoire Tome and HUD inspection panels, leaving the overhead space exclusively for the `Context Mana` bar and `!`/`?` `Quest Gate` markers.
4. **Compact Room Proportions, In-Room `Resource Stockpile` & Floor Pentagram `Summoning Ritual`**: Filter out internal `opencode.*` built-in plugins at the ingress/reducer seam, remove the 16-tile eastern alcove wing so every room maintains a balanced `16 × 12` architectural footprint, represent external MCP/plugin and tool inputs at the in-room `Resource Stockpile` (where characters pick up and visibly haul `Resource Cargo` to their target `Workstation`), and replace the static `Summoning Pad` with an on-demand glowing floor pentagram & fire spell circle (`Summoning Ritual`) conjured beneath the parent `Guild Adventurer` when spawning a `Squad Subagent` on an adjacent tile.
5. **Consolidated Roster State & Live `Character Sheet` / Tooltip HUD Seam**: Retire the dead parallel state store in the standalone roster module (keeping squad lineage color derivation in the world-state reducer) and wire the spectator HUD module (`buildCharacterSheetViewModel`, `buildSceneObjectTooltip`, header and ticker formatters) directly into the live browser UI so tests and the browser exercise the exact same HUD seam.

## User Stories

1. As a spectator opening the visualizer, I want each `Workshop Room` rendered with thick dark-outlined cutaway walls, a visible 3/4 north masonry/timber wall face, and inset perimeter windows, so that the room looks like an illustrated architectural floorplan rather than a flat debug rectangle.
2. As a spectator, I want perimeter windows and wall torches/hearths to cast soft warm light pools and directional drop shadows across the floor and under furniture, so that the `Workshop Room` has warmth, depth, and readability.
3. As a spectator, I want the interior of each `16 × 12` `Workshop Room` subdivided by partial interior partition walls into distinct functional zones (Study & Planning, Forge & Engineering, `Break Lounge`, and `Resource Stockpile`), so that the room reads like a real guild hall interior.
4. As a spectator, I want each functional zone to render its own floor material—staggered warm hardwood planks in the main hall and study, checkerboard stone tiles in the `Anvil Forge` and `Reactor Console` wing, and a patterned woven rug beneath the `Break Lounge`—so that tool categories are spatially anchored by floor texture.
5. As a spectator viewing multiple `Workshop Room`s on the `Guild Floorplan`, I want the exterior grounds around and between rooms rendered as an outdoor compound with grass, clustered trees, and stone walkways linking room doorways and worktree annexes, so that multi-room navigation feels like a cohesive RPG world map.
6. As a spectator, I want the `Break Lounge` furnished in a clean cartoonish style with plush L-shaped sectional sofas, accent pillows, a wooden coffee table with steaming mugs, a stone hearth fireplace, and potted corner plants, so that idle `Guild Adventurer`s and completed `Squad Subagent`s rest in an inviting lounge.
7. As a spectator, I want the Study & Planning zone around the `Drafting Table` and `Arcane Lectern` furnished with tall wooden bookshelves with a sliding ladder, open spellbooks, parchment blueprints, and study chairs, so that reading, planning, and `Skill Grimoire` activation look unmistakably scholarly.
8. As a spectator, I want the Forge & Engineering zone around the `Anvil Forge` and `Reactor Console` furnished with a glowing stone forge hearth, iron anvil, quench barrel, weapon Rack (halberds, broadswords), armor stand (helms, breastplates), and wooden training dummies, so that `shell`, build, test, and `execute` runs look like active guild combat/crafting training.
9. As a spectator, I want all furniture props, walls, and characters rendered with crisp dark outlines, rounded cel-shaded volumes, and soft ground shadows by default, so that the visualizer achieves the clean cartoonish aesthetic with zero external paid asset dependencies.
10. As a user who drops a PNG tile/sprite atlas (such as the CraftPix Top-Down Pixel Art Guild Hall pack) into the asset configuration, I want the scene painter to slice and draw those sprite-sheet tiles at the exact same room coordinates and hitboxes, so that both clean cartoon vector rendering and pixel-art sprite packs work across the same seam.
11. As a spectator watching a `Guild Adventurer` or `Squad Subagent`, I want the character drawn as an expressive 3/4 top-down cartoon/pixel adventurer with directional eyes, animated stride boots, tiered robes/cape, class headgear (`visored-helm`, `arcane-circlet`, `hood`, `plumed-cap`, `alchemist-goggles`, `horned-crown`), swinging main-hand tool/weapon, and off-hand `Skill Grimoire` tome or lantern, so that every OpenCode `Equipment Loadout` slot is visually distinct.
12. As a spectator watching a character start a tool job, I want to see them walk to the in-room `Resource Stockpile`, pick up an outlined `Resource Cargo` bundle (**Iron Bar**, **Timber Planks**, **Stone Block**, **Arcane Crystal**, or **Scroll Bundle**), and visibly carry it in their arms along the corridor pathline to the target `Workstation`, so that tool inputs feel like physical workshop materials.
13. As a spectator watching a parent `Guild Adventurer` invoke the `subagent` tool, I want the static `Summoning Pad` gone and replaced by an on-demand glowing pentagram spell circle with fire/arcane FX (`Summoning Ritual`) cast directly on the floor beside the parent, materializing the `Squad Subagent` on an adjacent tile, so that summoning looks like the mage circle in the reference guild hall art.
14. As a spectator, I want internal `opencode.*` built-in plugins filtered out and the 16-tile eastern `Plugin Alcove` wing removed, so that every `Workshop Room` keeps compact, harmonious `16 × 12` architectural proportions without empty `ONC` and `MUX +85` boxes.
15. As a spectator looking at a character's overhead area, I want to see only the `Context Mana` bar and any active `!`/`?` `Quest Gate` badge—with zero duplicate overhead skill dots and zero orbiting body spark dots—so that character silhouettes stay crisp and uncluttered.
16. As a spectator hovering over any character, `Workstation`, `Resource Stockpile`, decorative guild prop, or `Break Lounge` sofa/hearth, I want a cursor-following tooltip built by the shared spectator HUD module that displays the exact OpenCode V2 `sessionId`, `agent`, `modelId`, mapped tools, active command arguments, file paths, or MCP statuses, so that rich visuals never sacrifice OpenCode telemetry transparency.
17. As a spectator clicking a character to open the `Character Sheet`, I want the panel rendered by the shared spectator HUD module (including the `Equipment Loadout` cards, `Skill Grimoire` badges, token/USD telemetry, and the `☠ Kill Character (Delete Session)` action), so that the browser UI and HUD unit tests never diverge.
18. As a developer maintaining the visualizer, I want the live browser `<canvas>` and the Node test suite to import and execute the exact same TypeScript spatial layout, BFS walker choreography, scene painter, and HUD modules, so that changing a room zone, station coordinate, color palette, or sprite layer updates the browser and tests in a single edit.
19. As a developer running the test suite, I want the dead parallel state store in the standalone roster module retired and consolidated into the world-state reducer, so that there is only one canonical representation of `Workshop Room`s, `Guild Adventurer`s, and `Squad Subagent`s across the entire codebase.

## Implementation Decisions

### 1. Unified `Guild Floorplan` Scene Module & Browser Module Serving (Candidate 1)
- **Single Shared Scene Pipeline**: Consolidate room layout, obstacle-avoiding cardinal BFS pathfinding, per-character walker interpolation (`jobQueue`, two-leg `Resource Cargo` pickup and delivery, 4-direction facing, footstep trails), hit-testing (`sceneHitboxes`), and frame rendering into a single deep **Guild Floorplan Scene Module**.
- **Two Adapters at the Rendering Seam**:
  ```ts
  export type VisualStyleMode = "clean-cartoon" | "pixel-atlas";

  export interface ScenePaintAdapter {
    beginFrame(widthPx: number, heightPx: number, camera: CameraTransform, style: VisualStyleMode): void;
    paintOutdoorGrounds(grounds: OutdoorCompoundPlan, timestampMs: number): void;
    paintWorkshopRoomArchitecture(roomPlan: WorkshopRoomArchitecturalPlan, timestampMs: number): void;
    paintRoomFixture(fixture: RoomFixtureRenderSpec, timestampMs: number): void;
    paintSummoningRitual(ritual: ActiveSummoningRitualSpec, timestampMs: number): void;
    paintCharacterPathline(pathline: CharacterPathlineSpec): void;
    paintCharacter(character: CharacterRenderSpec, timestampMs: number): void;
    paintLightingOverlay(lighting: RoomLightingPlan, timestampMs: number): void;
    endFrame(): void;
  }
  ```
  - **Adapter 1 — Live Browser Canvas 2D Adapter**: Consumed directly by the browser client script (served by the companion HTTP server as an ES module bundle so the browser runs the compiled TypeScript modules with zero inline duplication).
  - **Adapter 2 — Headless Frame Inspection Adapter**: Used by automated tests to record drawn room zones, partition walls, fixture bounds, carried `Resource Cargo`, active `Summoning Ritual` circles, character layers, overhead HUD cues, and hitbox priorities without requiring a headless browser.

### 2. Multi-Zone Cutaway `Workshop Room` Architecture, Flooring & Lighting (Candidate 2)
- **Fixed `16 × 12` Cutaway Room Footprint**: Each `Workshop Room` occupies a `16 × 12` tile footprint (`TILE_PX = 32` base logical scale for crisp cartoon/pixel detail) framed by thick dark-outlined cutaway exterior walls (`wallThicknessPx`), a 3/4 north wall elevation showing masonry/wood paneling, and inset window spans along the north/west/east walls.
- **Four Interior Zones & Partition Walls**:
  - `layoutWorkshopRoom` partitions the `16 × 12` interior into four semantic zones with distinct floor materials and internal partition wall segments (`kind: "partition-wall"`) that leave wide walkable archways (`width >= 2` tiles) and are respected by `findTilePath`:
    1. **`"study-wood"` Zone (North-West / North-Center — `Drafting Table` & `Arcane Lectern`)**: Warm staggered hardwood plank floor (`#e5c188` / `#d4a373`), bordered by north-wall bookshelves with a sliding library ladder and blueprint scroll racks.
    2. **`"forge-tile"` Zone (North-East / Center-East — `Anvil Forge`, `Reactor Console`, `Archive Radar`, `Comms Dish`, `Altar of Compaction`)**: Two-tone checkerboard / slate workshop tiles (`#cbd5e1` / `#94a3b8`), accented with weapon racks, armor stands, a forge quench barrel, and a practice dummy.
    3. **`"lounge-rug"` Zone (South-West — `Break Lounge`, `x: 1..6, y: 8..10`)**: Crimson-and-gold woven carpet over hardwood planks, furnished with a teal clean-cartoon L-shaped sectional sofa, warm wood coffee table with steaming mugs, potted corner plants, and a stone hearth fireplace.
    4. **`"stockpile-stone"` Zone (South-East — `Resource Stockpile`, `x: 13..14, y: 8..9`)**: Flagstone depot floor stacked with outlined crates of Timber Planks, Cut Stone Blocks, Iron Bars, Arcane Crystals, and Scroll Bundles.
- **Outdoor Compound & Multi-Room Grounds**:
  - `layoutGuildFloorplan` generates an `OutdoorCompoundPlan` surrounding all rooms with verdant grass tiles, decorative perimeter tree clusters, and cobbled stone walkways linking each `Workshop Room`'s doorway (`doorTile: { x: 8, y: 0 }`) and connecting parent project halls to worktree annexes.
- **Directional Drop Shadows & Warm Lighting Pass**:
  - Every perimeter wall, partition wall, furniture fixture, and character emits a soft ambient occlusion / drop shadow (`rgba(15, 23, 42, 0.22)`).
  - Perimeter windows cast angled warm daylight trapezoids onto the floor, while wall torches, the `Anvil Forge`, the `Break Lounge` hearth, and active `Summoning Ritual` pentagrams emit radial warm light gradients in `paintLightingOverlay`.

### 3. Narrow Painter Seam: Clean Cartoon Style vs. Pixel Sprite Atlas & Deduplicated Cues (Candidate 3)
- **Retire Raw 16×16 ASCII Matrix Structs**: Replace the 25+ shallow `Pass1..Pass4` 16×16 pixel-matrix return types with semantic render specs (`RoomFixtureRenderSpec`, `CharacterRenderSpec`, `OverheadHudCueSpec`) consumed by `ScenePaintAdapter`.
- **Clean Cartoon Vector Style (Default)**:
  - Draws all room architecture, `Workstation` furniture, decorative guild props, and `Guild Adventurer` / `Squad Subagent` characters using crisp `#1e293b` dark ink outlines (`1.5px–2.5px`), rounded cel-shaded fills, warm highlight rims, and soft drop shadows.
  - Characters render on a `32 × 32` logical footprint with 7 clean cartoon/pixel layers: (1) elliptical ground shadow + optional `Squad Subagent` lineage ring, (2) tiered cape, (3) 4-direction animated stride boots, (4) cel-shaded tunic/robes with belt and readiness pauldrons, (5) head with directional eyes and hair/face shading, (6) class headgear, and (7) swinging main-hand implement (`hammer`, `spyglass`, `quill`, `scepter`, `wand`, `staff`), off-hand relic (`grimoire` tome, `banner`, `lantern`), or two-handed `Resource Cargo` bundle when hauling from the `Resource Stockpile`.
- **Pixel Atlas Mode (Optional Sprite-Sheet Adapter)**:
  - Accepts a declarative sprite-sheet manifest mapping `RoomFixtureKind`, decorative prop keys, floor/wall autotile bitmasks, and character animation frames to `[x, y, w, h]` atlas regions so external top-down RPG asset packs (such as CraftPix Guild Hall PNG sheets) can be toggled on without changing layout or hitbox logic.
- **Single Clean `Skill Grimoire` Indicator**:
  - Remove the 3 orbiting body sparks in Pass 2 and remove `grimoireEmblemRow` (overhead colored skill dots) in Pass 4. Equipped `Skill Grimoire`s are shown on the character sprite solely via the held off-hand Grimoire Tome (with a compact badge count when multiple skills are equipped) and in the `Character Sheet` / hover tooltip.

### 4. Compact `16 × 12` Room Proportions, `Resource Stockpile` & Floor Pentagram `Summoning Ritual` (Candidate 4)
- **Built-In Plugin Filtering at the Ingress Seam**: Ignore internal OpenCode plugins where `source.type === "builtin"` or namespace starts with `"opencode."`.
- **Replace External Alcove Wing with In-Room `Resource Stockpile`**: Keep every `Workshop Room` at a fixed `16 × 12` footprint (`wingWidth = 0`), placing the `Resource Stockpile` at `{ x: 13, y: 8, width: 2, height: 2 }` (`anchorTile: { x: 12, y: 8 }`) where characters pick up `Resource Cargo` (**Iron Bar**, **Timber Planks**, **Stone Block**, **Arcane Crystal**, **Scroll Bundle**) on Leg 1 before hauling it to the target `Workstation` on Leg 2.
- **In-Place Floor Pentagram `Summoning Ritual`**: Remove the static `Summoning Pad` fixture. When a `Guild Adventurer` spawns a `Squad Subagent`, `paintSummoningRitual` renders an etched glowing pentagram rune circle with animated golden fire FX (matching the guild hall reference art) beneath the parent and materializes the `Squad Subagent` on the nearest walkable adjacent tile (`computeAdjacentSummonTile`).

### 5. Consolidated Roster State & Live Spectator HUD Seam (Candidate 5)
- **Retire Dead Parallel Roster Store**: Move `deriveSquadColor` into the world-state reducer / domain module and retire the unused parallel state store (`RosterState`, `GuildAdventurerRecord`, `SquadSubagentRecord`), leaving `WorldStateReducer` (`GuildSnapshot`) as the single state store for session lifecycles, `Break Lounge` tiers (`hearth-table` vs. `session-bench`), `Skill Grimoire` inheritance, `Report Scroll` delivery, and `session.deleted` termination.
- **Wire Spectator HUD Module Directly into the Browser**: Export a single canonical `WORKSTATION_CATALOG` (fixing the amber vs. cyan and emerald vs. cyan color drift across modules) and call `buildCharacterSheetViewModel`, `buildSceneObjectTooltip`, `buildRoomHeaderStripViewModel`, and `buildActivityTickerViewModel` directly from the browser UI script.

## Testing Decisions

- **What Makes a Good Test**: Tests exercise public module interfaces at the highest seam (`createWorldStateReducer`, `buildGuildSceneFrame`, `paintSceneFrame` with the Headless Frame Inspection Adapter, `buildCharacterSheetViewModel`, `buildSceneObjectTooltip`, and `createGuildCompanionServer`) and assert observable outputs—never internal helper functions, private pixel arrays, or hardcoded CSS strings.
- **Modules Under Test (Single Unified Scene & HUD Seam)**:
  1. **World-State Reducer & Spatial Architectural Plan Seam (`createWorldStateReducer`, `layoutWorkshopRoom`, `layoutGuildFloorplan`, `findTilePath`)**:
     - Verifies that `opencode.*` built-in plugins are filtered out and every `Workshop Room` has a compact `16 × 12` footprint with four distinct interior floor zones (`"study-wood"`, `"forge-tile"`, `"lounge-rug"`, `"stockpile-stone"`), cutaway perimeter walls with window light shafts, interior partition walls with walkable archways, decorative guild props (bookshelves with ladder, weapon/armor racks, practice dummy, lounge L-sofa, potted plants, hearth fireplace), and an outdoor grass/tree/footpath compound plan.
     - Verifies two-leg `Resource Cargo` hauling routes (`currentTile → Resource Stockpile → target Workstation`), in-place `Summoning Ritual` adjacent tile spawning, direct parent `Report Scroll` handoffs, and cascading `session.deleted` termination.
  2. **Unified Scene Frame & Painter Seam (`buildGuildSceneFrame`, `paintSceneFrame`, Headless Frame Inspection Adapter)**:
     - Verifies that feeding a `GuildSnapshot` into `buildGuildSceneFrame` and `paintSceneFrame` renders cutaway walls, zone flooring, directional drop shadows, window/torch light overlays, clean-cartoon outlined `Workstation` furniture, active floor pentagram `Summoning Ritual` fire FX, and 7-layer characters (including carried `Resource Cargo` during Leg 2 hauling).
     - Verifies that character overhead HUD cues contain `Context Mana` and `Quest Gate` markers with zero duplicate `Skill Grimoire` head dots or orbiting body sparks.
     - Verifies that switching `VisualStyleMode` between `"clean-cartoon"` and `"pixel-atlas"` preserves identical tile coordinates, anchor slots, and `sceneHitboxes` priorities.
  3. **Live Browser Bundle & Spectator HUD Seam (`createGuildCompanionServer`, `buildCharacterSheetViewModel`, `buildSceneObjectTooltip`)**:
     - Verifies that the companion server serves the compiled scene & HUD browser module (eliminating inline duplicate layout/renderer code in the HTML page) and that `buildSceneObjectTooltip` and `buildCharacterSheetViewModel` produce consistent colors and OpenCode V2 metadata across characters, all 7 core `Workstation`s, the `Resource Stockpile`, and the `Break Lounge`.
- **Prior Art**: Builds directly on the vertical red-green TDD test suites in `tests/` run via Node's built-in TypeScript test runner (`node --experimental-strip-types --test`).

## Out of Scope

- Paid or proprietary third-party asset packs bundled into the repository (the default `"clean-cartoon"` vector/canvas style requires zero external image files, while `"pixel-atlas"` mode loads user-supplied CC0/free PNG sprite sheets such as the CraftPix freebie Guild Hall pack).
- 3D WebGL/Three.js engines or heavy physics engines.
- Sending chat prompts, approving permissions, or answering form questions from the web visualizer (only `DELETE /api/session/{sessionID}` session termination is supported).

## Further Notes

- **Visual Reference Alignment**:
  - **CraftPix Guild Hall Reference (Image 1)**: Inspires the 3/4 north wall elevation, staggered wood-plank flooring, library bookshelf with ladder (`Arcane Lectern` / `Drafting Table` study), weapon & armor racks + practice dummy (`Anvil Forge`), and the glowing floor pentagram with fire FX (`Summoning Ritual`).
  - **Clean Cartoonish Top-Down Room Reference (Image 2)**: Inspires the crisp dark ink outlines, thick cutaway perimeter walls with inset windows casting warm light shafts, interior partition walls, plush L-shaped sofas and coffee table on a warm rug (`Break Lounge`), potted corner plants, and soft furniture drop shadows.
  - **Multi-Room Compound Reference (Image 3)**: Inspires the distinct flooring textures per functional zone (wood planks, checkerboard stone tiles, woven rugs) and the outdoor grass, tree clusters, and stone paths framing the multi-room `Guild Floorplan`.

## Answer

- **Candidate 1 — Unified `Guild Floorplan` Scene Module & Browser ES Module Serving (`src/scene/guild-scene.ts`, `src/server/main.ts`, `src/web/app.html`)**:
  - Implemented `VisualStyleMode = "clean-cartoon" | "pixel-atlas"`, `ScenePaintAdapter`, `buildGuildSceneFrame`, `paintSceneFrame`, `createHeadlessFrameInspectionAdapter`, and `createCanvas2DScenePaintAdapter` (`createCanvas2dScenePaintAdapter`).
  - Added ES module serving (`/src/...` via `module.stripTypeScriptTypes` and `/assets/guild-bundle.js`) in `createGuildCompanionServer` and refactored `src/web/app.html` to import and execute the shared scene, painter, and spectator HUD modules directly—deleting the duplicated inline room layout, BFS pathfinder (`findCardinalTilePath`), walker choreography, and primitive rectangle renderer.
- **Candidate 2 — Multi-Zone Cutaway `Workshop Room` Architecture, Flooring & Lighting (`src/spatial/floorplan-layout.ts`, `src/scene/guild-scene.ts`)**:
  - Extended `layoutWorkshopRoom` to emit thick dark-outlined 3/4 cutaway perimeter walls (`wallThicknessPx`), a 3/4 north masonry/timber wall face (`northWallFace`), inset perimeter windows (`perimeterWindows`) casting warm angled daylight shafts, 4 interior zones (`"study-wood"`, `"forge-tile"`, `"lounge-rug"`, `"stockpile-stone"`), internal partition wall segments (`kind: "partition-wall"`) with walkable archways (`archwayWidthTiles >= 2`) respected by `findTilePath`, directional drop shadows (`rgba(15, 23, 42, 0.22)`), and `RoomLightingPlan` (window daylight shafts + radial light pools for torches, forge, hearth, and active `Summoning Ritual` pentagrams).
  - Extended `layoutGuildFloorplan` to emit `outdoorCompound` (`OutdoorCompoundPlan`) with grass grounds, perimeter tree clusters, and cobbled stone footpaths connecting room doorways (`doorTile: { x: 8, y: 0 }`) and worktree annexes.
- **Candidate 3 — Narrow Painter Seam (Clean Cartoon Vector Style + Pixel Sprite Atlas Adapter)**:
  - Implemented semantic render specs (`RoomFixtureRenderSpec`, 7-layer `CharacterRenderSpec` including carried `Resource Cargo` during Leg 2 hauling, `OverheadHudCueSpec` with zero duplicate overhead skill dots or orbiting body sparks, and `ActiveSummoningRitualSpec`) with identical coordinates, anchor slots, and `sceneHitboxes` priorities across `"clean-cartoon"` and `"pixel-atlas"` modes, plus a UI style toggle (`#btn-toggle-style`) in `src/web/app.html`.
- **Candidate 4 — Parent `Guild Adventurer` Active Visibility When Child `Squad Subagent` Is Working (`src/state/world-reducer.ts`, `src/ingress/adapters.ts`)**:
  - Kept parent `Guild Adventurer`s active (`Thinking` / `WorkingAtStation` on the workshop floor rather than transitioning to `RestingInLounge`) whenever any child `Squad Subagent` (`char.childSessionIds`) is in `activeSessionIds`, and included root `Guild Adventurer` sessions and parents of active subagents in `topRecentIds` message hydration.
- **Candidate 5 — Consolidated Roster State & Live Spectator HUD Seam (`src/types/domain.ts`, `src/state/world-reducer.ts`, `src/hud/spectator-hud.ts`, `src/sprites/pixel-compositor.ts`)**:
  - Exported `deriveSquadColor` from the world-reducer seam, exported a single canonical `WORKSTATION_CATALOG` eliminating color drift across modules, added `"prop"` tooltip support to `buildSceneObjectTooltip`, and wired `buildCharacterSheetViewModel`, `buildSceneObjectTooltip`, `buildRoomHeaderStripViewModel`, and `buildActivityTickerViewModel` directly into the browser UI.
