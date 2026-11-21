# OpenCode Pixel Guild Visualizer — Specification (`ready-for-agent`)

Label: `ready-for-agent`

## Problem Statement

When spectating live OpenCode V2 activity across local projects and git worktrees, the current visualizer suffers from seven concrete architectural, spatial, and visual friction points:

1. **Flat Wireframe Rooms Without Architectural Depth**: Each `Workshop Room` renders as a flat dark rectangle (`#111827`) with `1px` wireframe grid lines. Rooms lack thick 3/4 cutaway perimeter walls, inset windows casting warm daylight shafts, interior partition walls separating functional work zones, distinct floor materials (warm staggered wood planks, checkerboard stone forge tiles, woven lounge rugs, and outdoor courtyard grass/trees surrounding the building), and directional drop shadows.
2. **Primitive Unshaded Rectangle Props & Characters**: Every `Workstation` (`Drafting Table`, `Archive Radar`, `Arcane Lectern`, `Anvil Forge`, `Reactor Console`, `Comms Dish`, `Altar of Compaction`), `Break Lounge`, and character sprite is drawn as 5–10 unshaded axis-aligned `fillRect` blocks, preventing a clean cartoonish top-down aesthetic (crisp dark ink outlines, cel-shaded cushions/sofas/tables, bookshelves with ladders, weapon/armor racks, practice dummies, potted plants, and expressive 3/4 characters) or optional pixel-art sprite-sheet packs (such as CraftPix Guild Hall tilesets).
3. **Disconnected TypeScript Spatial/Sprite Modules vs. Inline Browser Renderer**: Over 3,300 lines of TypeScript spatial layout and sprite composition code are never imported by the companion server or executed in the browser; instead, the browser HTML file re-implements its own room math, cardinal BFS pathfinder, and raw rectangle renderer inline across 2,000 lines, while the TypeScript sprite module exposes 25+ leaky 16×16 ASCII-matrix structs only used by unit tests.
4. **Unused Plugin Alcove Bloat & Abstracted Task Inputs**: OpenCode V2's `/api/plugin` endpoint returns 85+ internal built-in plugins (`opencode.*`), causing the floorplan to annex a 16-tile-wide eastern wing filled with empty `ONC` and `MUX +85 plugins` boxes that double every `Workshop Room`'s width, while external MCP tools, plugins, and workspace inputs sit as static boxes rather than physical workshop materials (`Resource Cargo`) that characters pick up and haul to their target `Workstation`.
5. **Disconnected Static `Summoning Pad` & Duplicate `Skill Grimoire` Clutter**: A permanent `Summoning Pad` fixture blocks central floor tiles even when no child sessions exist and spawns `Squad Subagent`s far away from their parent `Guild Adventurer`, while equipped `Skill Grimoire`s are drawn twice on every character (both as circling body sparks and as colored dots above the character's head).
6. **Bypassed Roster & Spectator HUD Modules**: Over 2,200 lines in the standalone roster choreography and spectator HUD view-model modules are unimported in production, failing the deletion test while the browser duplicates `Character Sheet` and tooltip HTML builders inline with drifting `Workstation` colors.
7. **No Way to Kill / Clean Up Sessions or Demolish Ghost `Workshop Room`s**: With dozens of accumulated sessions and abandoned git worktrees (such as ghost rooms like `gentle-forest`) on the local OpenCode V2 daemon, users cannot terminate (`DELETE /api/session/{sessionID}`) a stuck session from the `Character Sheet`, nor can they demolish a ghost `Workshop Room` via an in-room **`Demolition Bomb`** to tear down all OpenCode V2 resources sustaining that room (`DELETE /api/session/{sessionID}`, `DELETE /api/pty/{ptyID}`, `DELETE /api/shell/{id}`, `DELETE /api/worktree`, and `DELETE /api/debug/location`).

## Solution

Unify and overhaul the **OpenCode Pixel Guild Visualizer** around a single shared **Guild Floorplan Scene & HUD Seam** rendering compact, multi-zone `16 × 12` cutaway `Workshop Room`s in a **Clean Cartoon & Pixel Guild** style:

1. **Unified `Guild Floorplan` Scene Module Shared by Browser & Tests**: Collapse spatial layout, obstacle-avoiding BFS pathfinding, walker job-queue choreography, hit-testing, and frame rendering into one deep **Guild Floorplan Scene Module** served as a compiled browser ES module and tested through a headless frame inspection adapter—deleting ~1,500 lines of duplicated inline browser code.
2. **Multi-Zone Cutaway `Workshop Room` Architecture, Flooring & Lighting**: Deepen the spatial layout module so every `16 × 12` `Workshop Room` renders with:
   - **Thick 3/4 Cutaway Perimeter Walls & Inset Windows**: Dark-outlined structural walls with a visible north masonry/timber face and perimeter windows casting warm angled daylight shafts across the floor.
   - **Interior Partition Walls & Four Functional Flooring Zones**:
     1. **Study & Planning Zone (`Drafting Table` & `Arcane Lectern`)**: Warm staggered hardwood planks, tall bookshelves with a sliding ladder, scroll racks, and blueprint tables.
     2. **Forge & Engineering Zone (`Anvil Forge`, `Reactor Console`, `Archive Radar`, `Comms Dish`, `Altar of Compaction`)**: Checkerboard stone workshop tiles, weapon racks (polearms, broadswords), armor stands (helms, breastplates), wooden practice dummies, and a forge quench barrel.
     3. **Cozy `Break Lounge` Zone**: Patterned woven area rug over wood planks, plush L-shaped sectional sofas with pillows, coffee table with steaming mugs, stone hearth fireplace, and potted leafy corner plants.
     4. **`Resource Stockpile` Zone**: Flagstone supply depot stacked with outlined crates of **Iron Bar**, **Timber Planks**, **Stone Block**, **Arcane Crystal**, and **Scroll Bundle** materials.
   - **Outdoor Compound Surround & Directional Lighting/Shadows**: Grass grounds, clustered trees, and cobbled footpaths framing the multi-room floorplan, plus soft ambient drop shadows under every wall, furniture prop, and character, and warm radial light pools from windows, torches, hearth, forge, and active spell circles.
3. **Narrow Painter Seam (Clean Cartoon Vector Adapter + Pixel Sprite Atlas Adapter) & Deduplicated Cues**: Replace the 25+ raw 16×16 ASCII pixel-matrix structs with a narrow painter interface supporting both the zero-dependency **Clean Cartoon Vector Adapter** (crisp dark ink outlines, cel-shaded rounded volumes, specular highlights, 3/4 expressive characters) and an optional **Pixel Sprite Atlas Adapter** (for PNG tilesets such as the CraftPix Guild Hall pack). Remove both the orbiting body spark dots and the overhead head dots (`grimoireEmblemRow`), representing equipped `Skill Grimoire`s solely through the off-hand Grimoire Tome and HUD inspection panels.
4. **In-Room `Resource Stockpile` & Two-Leg `Resource Cargo` Hauling**: Filter out internal `source.type === "builtin"` (`opencode.*`) server plugins and remove the 16-tile eastern `Plugin Alcove` wing. When a character begins a tool job, they walk to the in-room `Resource Stockpile`, pick up the corresponding **`Resource Cargo`** (**Iron Bar**, **Timber Planks**, **Stone Block**, **Arcane Crystal**, or **Scroll Bundle**), and visibly carry it in their arms along the corridor pathline to the target `Workstation`.
5. **In-Place Floor Pentagram `Summoning Ritual` Next to the Parent `Guild Adventurer`**: Remove the static `Summoning Pad` fixture. When a `Guild Adventurer` invokes the `subagent` tool, they cast an in-place **`Summoning Ritual`** (an etched glowing floor pentagram with golden fire FX, matching the guild hall reference art) and materialize the `Squad Subagent` on the nearest walkable adjacent tile (`parentTile ± 1`). Upon completion, the `Squad Subagent` walks directly to its parent's current tile to deliver its `Report Scroll`.
6. **Consolidated Roster State & Shared Spectator HUD Seam**: Retire the dead parallel state store in the standalone roster module (keeping squad lineage color derivation in the world-state reducer) and wire the spectator HUD module (`buildCharacterSheetViewModel`, `buildSceneObjectTooltip`, header and ticker formatters) directly into the live browser UI with a single canonical `Workstation` color and tool catalog.
7. **Character Kill (`DELETE /api/session/{sessionID}`) & In-Room `Demolition Bomb` (`Workshop Room` Resource Teardown)**:
   - Add a **`☠ Kill Character (Delete Session)`** action in the `Character Sheet` (with confirmation) that calls `DELETE /api/session/{sessionID}` on the live OpenCode V2 daemon, plays a soul-banish / tombstone dissolve animation on the canvas, and cascades removal to any child `Squad Subagent`s.
   - Place an interactive **`Demolition Bomb`** fixture inside every `Workshop Room` (at tile `{ x: 14, y: 10 }`) that, when clicked and confirmed by the user, executes a full 5-step OpenCode V2 resource teardown for that room's `Location` (interrupting and deleting all sessions in that location via `POST /api/session/{sessionID}/interrupt` + `DELETE /api/session/{sessionID}`, removing location-scoped PTYs via `DELETE /api/pty/{ptyID}` and running shells via `DELETE /api/shell/{id}`, removing OpenCode git worktrees via `DELETE /api/worktree` with `force: true` + `POST /api/worktree/refresh`, evicting the cached location via `DELETE /api/debug/location`, and dispatching `room.deleted` with empty/deleted ghost-room suppression on subsequent sweeps).

## User Stories

1. As a spectator opening the visualizer, I want each `Workshop Room` rendered with thick dark-outlined cutaway walls, a visible 3/4 north masonry/timber wall face, and inset perimeter windows, so that the room looks like an illustrated architectural floorplan rather than a flat debug rectangle.
2. As a spectator, I want perimeter windows and wall torches/hearths to cast soft warm light pools and directional drop shadows across the floor and under furniture, so that the `Workshop Room` has warmth, depth, and readability.
3. As a spectator, I want the interior of each `16 × 12` `Workshop Room` subdivided by partial interior partition walls into distinct functional zones (Study & Planning, Forge & Engineering, `Break Lounge`, and `Resource Stockpile`), so that the room reads like a real guild hall interior.
4. As a spectator, I want each functional zone to render its own floor material—staggered warm hardwood planks in the main hall and study, checkerboard stone tiles in the `Anvil Forge` and `Reactor Console` wing, and a patterned woven rug beneath the `Break Lounge`—so that tool categories are spatially anchored by floor texture.
5. As a spectator viewing multiple `Workshop Room`s on the `Guild Floorplan`, I want the exterior grounds around and between rooms rendered as an outdoor compound with grass, clustered trees, and stone walkways linking room doorways and worktree annexes, so that multi-room navigation feels like a cohesive RPG world map.
6. As a spectator, I want the `Break Lounge` furnished in a clean cartoonish style with plush L-shaped sectional sofas, accent pillows, a wooden coffee table with steaming mugs, a stone hearth fireplace, and potted corner plants, so that idle `Guild Adventurer`s and completed `Squad Subagent`s rest in an inviting lounge.
7. As a spectator, I want the Study & Planning zone around the `Drafting Table` and `Arcane Lectern` furnished with tall wooden bookshelves with a sliding ladder, open spellbooks, parchment blueprints, and study chairs, so that reading, planning, and `Skill Grimoire` activation look unmistakably scholarly.
8. As a spectator, I want the Forge & Engineering zone around the `Anvil Forge` and `Reactor Console` furnished with a glowing stone forge hearth, iron anvil, quench barrel, weapon rack (halberds, broadswords), armor stand (helms, breastplates), and wooden training dummies, so that `shell`, build, test, and `execute` runs look like active guild combat and crafting.
9. As a spectator, I want all furniture props, walls, and characters rendered with crisp dark outlines, rounded cel-shaded volumes, and soft ground shadows by default, so that the visualizer achieves the clean cartoonish aesthetic with zero external paid asset dependencies.
10. As a user who configures a PNG tile/sprite atlas (such as the CraftPix Top-Down Pixel Art Guild Hall pack), I want the scene painter to slice and draw those sprite-sheet tiles at the exact same room coordinates and hitboxes, so that both clean cartoon vector rendering and pixel-art sprite packs work across the same seam.
11. As a spectator watching a `Guild Adventurer` or `Squad Subagent`, I want the character drawn as an expressive 3/4 top-down cartoon/pixel adventurer with directional eyes, animated stride boots, tiered robes/cape, class headgear (`visored-helm`, `arcane-circlet`, `hood`, `plumed-cap`, `alchemist-goggles`, `horned-crown`), swinging main-hand tool/weapon, and off-hand `Skill Grimoire` tome or lantern, so that every OpenCode `Equipment Loadout` slot is visually distinct.
12. As an OpenCode developer, I want internal built-in `opencode.*` plugins filtered out of room fixtures and the 16-tile eastern `Plugin Alcove` wing removed, so that my `Workshop Room` stays a compact, well-proportioned `16 × 12` guild hall without 85+ unused `ONC` and `MUX` boxes.
13. As a spectator, I want to see a `Guild Adventurer` or `Squad Subagent` walk to the in-room `Resource Stockpile` and pick up an outlined **Iron Bar** (`shell` / build / mutation), **Timber Planks** (`write` / `edit` / drafting), **Stone Block** (`read` / `glob` / `grep` / mining), **Arcane Crystal** (`execute` / MCP / plugin), or **Scroll Bundle** (`skill` / `webfetch`) before walking to the target `Workstation`, so that task inputs look like tangible workshop materials being transported to a worksite.
14. As a spectator, I want characters carrying `Resource Cargo` from the `Resource Stockpile` to a `Workstation` to visibly hold the material bundle in their arms while walking along the dim pathline to the worksite, so that I can tell at a glance what resource they are hauling and where they are taking it.
15. As a spectator hovering over the `Resource Stockpile`, I want a tooltip listing the configured external MCP servers (and their `connected`, `needs_auth`, `failed`, or `disabled` statuses), external plugins, and recent `Resource Cargo` pickups with their exact OpenCode V2 identifiers, so that I can inspect project integrations without dedicating a whole room wing to them.
16. As a spectator, I want the static `Summoning Pad` removed from the floorplan and replaced by an on-demand glowing floor pentagram & fire spell circle (`Summoning Ritual`) beneath a parent `Guild Adventurer` when invoking the `subagent` tool, materializing the `Squad Subagent` on the walkable tile immediately beside them, so that summoning matches the guild hall mage-circle aesthetic and clearly links summoner to companion.
17. As a spectator, I want a completing `Squad Subagent` to walk directly to its parent `Guild Adventurer`'s current tile to deliver its `Report Scroll`, so that completion handoffs happen organically wherever the parent is currently working or resting.
18. As a spectator, I want equipped `Skill Grimoire`s represented without duplicate circling spark dots around the body and without duplicate colored dots over the character's head, so that character sprites and overhead `Context Mana` / `Quest Gate` bars remain clean and uncluttered.
19. As a spectator viewing **All Rooms**, I want a clean, compact multi-room compound overview on the `Guild Floorplan`, and when selecting a **Specific Room**, I want the room to auto-fit the available screen space with full furniture, equipment, lighting, and OpenCode tool sub-labels.
20. As a spectator hovering over any character, core `Workstation`, `Resource Stockpile`, decorative guild prop, or `Break Lounge`, I want a cursor-following tooltip built by the shared spectator HUD module that pairs RPG names with the exact OpenCode V2 `sessionId`, `agent`, `modelId`, `tool` command, file path, shell command, or `SKILL.md` ID, so that I always understand the real OpenCode operation taking place.
21. As an OpenCode user inspecting a character in the `Character Sheet`, I want a **`☠ Kill Character (Delete Session)`** button with a confirmation prompt that calls `DELETE /api/session/{sessionID}` on the live OpenCode V2 daemon, cascades deletion to any child `Squad Subagent` sessions, and plays a soul-banish / tombstone dissolve animation on the floorplan, so that I can clean up stuck or unwanted sessions directly from the visualizer.
22. As a developer maintaining the visualizer, I want the browser `<canvas>`, the browser HUD panels, and the automated test suite to import and execute the exact same TypeScript spatial layout, BFS walker choreography, scene painter, and spectator HUD modules (with the dead parallel roster store retired), so that there is one source of truth across production and tests.
23. As an OpenCode user viewing a `Workshop Room` on the `Guild Floorplan`, I want to see a physical **`Demolition Bomb`** fixture inside the room (at `{ x: 14, y: 10 }`) with an animated sputtering fuse spark, so that I have an intuitive, in-world RPG tool for demolishing ghost rooms (such as abandoned git worktrees like `gentle-forest`).
24. As a spectator hovering over the in-room `Demolition Bomb`, I want a tooltip displaying the room's `locationDirectory`, session count, active adventurer count, worktree status, and the exact OpenCode V2 teardown endpoints (`DELETE /api/session/{sessionID}`, `DELETE /api/pty/{ptyID}`, `DELETE /api/shell/{id}`, `DELETE /api/worktree`, `DELETE /api/debug/location`), so that I know every OpenCode resource that will be cleaned up before clicking.
25. As an OpenCode user clicking the `Demolition Bomb` inside a `Workshop Room`, I want a confirmation prompt detailing the room name, directory path, sessions to be deleted, active-session warning, and whether the git worktree sandbox will be removed with `force: true`, so that I never accidentally destroy a room without explicit confirmation.
26. As an OpenCode user confirming `Workshop Room` demolition on a git worktree room (such as `gentle-forest [wt]`), I want the visualizer to interrupt and delete all sessions in that location, remove all location PTYs and running shells, delete the OpenCode worktree (`DELETE /api/worktree` with `force: true` + `POST /api/worktree/refresh`), evict the daemon location cache (`DELETE /api/debug/location`), play a room explosion animation, and remove the room from the `Guild Floorplan`, so that all OpenCode resources that created and sustained the ghost room are permanently removed.
27. As an OpenCode user confirming `Workshop Room` demolition on a primary project room (`isWorktree: false`), I want the visualizer to delete all OpenCode sessions, PTYs, and shells for that location, evict `/api/debug/location`, and suppress the empty room from re-appearing on subsequent sweeps while never deleting my non-worktree source repository files on disk, so that primary rooms can be cleared safely.

## Implementation Decisions

### 1. Unified `Guild Floorplan` Scene Module & Browser ES Module Serving
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
  - **Adapter 1 — Live Browser Canvas 2D Adapter**: Served to the browser by the companion HTTP server as a compiled JavaScript module bundle so the browser executes the TypeScript spatial, walker, painter, and HUD modules directly with zero inline duplication.
  - **Adapter 2 — Headless Frame Inspection Adapter**: Used by automated tests to inspect drawn room zones, partition walls, fixture bounds, carried `Resource Cargo`, active `Summoning Ritual` circles, character layers, overhead HUD cues, and hitbox priorities deterministically.

### 2. Multi-Zone Cutaway `Workshop Room` Architecture, Flooring & Lighting
- **Fixed `16 × 12` Cutaway Room Footprint**: Every `Workshop Room` maintains a compact `16 × 12` tile footprint (`CORE_HALL_WIDTH = 16`, `CORE_HALL_HEIGHT = 12`, `TILE_PX = 32` base logical scale) framed by thick dark-outlined cutaway exterior walls, a 3/4 north wall elevation with masonry/timber paneling, and inset perimeter windows.
- **Four Interior Zones & Partition Walls**:
  - `layoutWorkshopRoom` divides the `16 × 12` interior into four semantic zones separated by internal partition wall segments (`kind: "partition-wall"`) with walkable archways (`width >= 2` tiles) respected by `findTilePath`:
    1. **`"study-wood"` Zone (North-West / North-Center — `Drafting Table` & `Arcane Lectern`)**: Warm staggered hardwood plank floor (`#e5c188` / `#d4a373`), furnished with tall bookshelves with a sliding library ladder, scroll racks, and study chairs.
    2. **`"forge-tile"` Zone (North-East / Center-East — `Anvil Forge`, `Reactor Console`, `Archive Radar`, `Comms Dish`, `Altar of Compaction`)**: Two-tone checkerboard stone workshop tiles (`#cbd5e1` / `#94a3b8`), furnished with weapon racks (halberds, broadswords), armor stands (helms, breastplates), a wooden practice dummy, and a forge quench barrel.
    3. **`"lounge-rug"` Zone (South-West — `Break Lounge`, `x: 1..6, y: 8..10`)**: Patterned crimson-and-gold woven rug over wood planks, furnished with a plush L-shaped sectional sofa, coffee table with steaming mugs, potted corner plants, and a stone hearth fireplace.
    4. **`"stockpile-stone"` Zone (South-East — `Resource Stockpile`, `x: 13..14, y: 8..9`)**: Flagstone depot floor stacked with outlined crates of Timber Planks, Cut Stone Blocks, Iron Ingot Bars, Arcane Crystals, and Scroll Bundles.
- **Outdoor Compound & Multi-Room Grounds**:
  - `layoutGuildFloorplan` emits an `OutdoorCompoundPlan` surrounding all rooms with verdant grass tiles, perimeter tree clusters, and cobbled stone walkways connecting `Workshop Room` doorways (`doorTile: { x: 8, y: 0 }`) and worktree annexes.
- **Directional Drop Shadows & Warm Lighting Pass**:
  - Every cutaway wall, partition wall, furniture fixture, and character renders a soft ambient drop shadow (`rgba(15, 23, 42, 0.22)`).
  - Perimeter windows cast angled warm daylight shafts across the floor, while wall torches, the `Anvil Forge`, the `Break Lounge` hearth, and active `Summoning Ritual` pentagrams emit radial warm light gradients in `paintLightingOverlay`.

### 3. Narrow Painter Seam: Clean Cartoon Style vs. Pixel Sprite Atlas & Deduplicated Cues
- **Retire Raw 16×16 ASCII Matrix Structs**: Replace the 25+ shallow `Pass1..Pass4` 16×16 pixel-matrix return types with semantic render specs (`RoomFixtureRenderSpec`, `CharacterRenderSpec`, `OverheadHudCueSpec`) consumed by `ScenePaintAdapter`.
- **Clean Cartoon Vector Style (Default)**:
  - Renders all room architecture, `Workstation` furniture, decorative guild props, and `Guild Adventurer` / `Squad Subagent` characters using crisp `#1e293b` dark ink outlines (`1.5px–2.5px`), rounded cel-shaded fills, warm highlight rims, and soft drop shadows.
  - Characters render on a `32 × 32` logical footprint with 7 clean cartoon/pixel layers: (1) elliptical ground shadow + optional `Squad Subagent` lineage ring, (2) tiered cape, (3) 4-direction animated stride boots, (4) cel-shaded tunic/robes with belt and readiness pauldrons, (5) head with directional eyes and hair/face shading, (6) class headgear, and (7) swinging main-hand implement (`hammer`, `spyglass`, `quill`, `scepter`, `wand`, `staff`), off-hand relic (`grimoire` tome, `banner`, `lantern`), or two-handed `Resource Cargo` bundle when hauling from the `Resource Stockpile`.
- **Pixel Atlas Mode (Optional Sprite-Sheet Adapter)**:
  - Accepts a declarative sprite-sheet manifest mapping `RoomFixtureKind`, decorative prop keys, floor/wall autotile bitmasks, and character animation frames to `[x, y, w, h]` atlas regions so external top-down RPG asset packs (such as CraftPix Guild Hall PNG sheets) can be toggled on without changing layout or hitbox logic.
- **Deduplicate `Skill Grimoire` Visuals**:
  - Remove the 3 orbiting body spark dots in Pass 2 and remove `grimoireEmblemRow` (the colored skill dots above the character's head) in Pass 4 (`computeOverheadHudCue`). Equipped `Skill Grimoire`s are represented on the character sprite solely via the off-hand Grimoire Tome (with a single count/tier indicator) and inspected in full detail in the hover tooltip and `Character Sheet`. The overhead HUD area above a character's head renders only the `Context Mana` bar and any active `!`/`?` `Quest Gate` marker.

### 4. In-Room `Resource Stockpile` & Two-Leg `Resource Cargo` Hauling
- **Built-In Plugin Filtering**: During daemon hydration and catalog reduction, ignore internal built-in OpenCode server plugins where `source.type === "builtin"` or the namespace starts with `"opencode."`. Only external MCP servers (`/api/mcp`), user/project plugins (`source.type !== "builtin"`), and active tool inputs populate the room's `Resource Stockpile`.
- **Removal of the External `Plugin Alcove` Wing**: The eastern `Plugin Alcove` expansion wing (`wing-1`..`wing-4+1` and `MUX` overflow bays) is removed so every room retains its compact `16 × 12` footprint.
- **`Resource Stockpile` Placement & Deterministic `Resource Cargo` Mapping**:
  - Place the `Resource Stockpile` inside the `16 × 12` room at `bounds: { x: 13, y: 8, width: 2, height: 2 }` (`anchorTile: { x: 12, y: 8 }`):
    - `Anvil Forge` (`shell`, `bash`, `test`) $\rightarrow$ **`Iron Bar`** (`"iron-bar"`, `#94a3b8`)
    - `Drafting Table` (`edit`, `write`, `multiedit`, `apply_patch`) $\rightarrow$ **`Timber Planks`** (`"timber-planks"`, `#d97706`)
    - `Archive Radar` (`read`, `glob`, `grep`, `lsp`, `list`) $\rightarrow$ **`Stone Block`** (`"stone-block"`, `#a8a29e`)
    - `Reactor Console` (`execute`, MCP/plugin tools) $\rightarrow$ **`Arcane Crystal`** (`"arcane-crystal"`, `#38bdf8`)
    - `Arcane Lectern` / `Comms Dish` (`skill`, `webfetch`, `websearch`) $\rightarrow$ **`Scroll Bundle`** (`"scroll-bundle"`, `#fde68a`)
- **Two-Leg Worksite Hauling Route**:
  1. **Leg 1 (`Pickup` — `currentTile → Resource Stockpile anchor { x: 12, y: 8 }`)**: Character walks empty-handed to the `Resource Stockpile` and dwells briefly (`~350ms`) to hoist the `Resource Cargo`.
  2. **Leg 2 (`Haul to Worksite` — `Resource Stockpile anchor → target Workstation slot`)**: Character walks along the corridor carrying the outlined `Resource Cargo` sprite in their arms, with a dim dotted pathline connecting `currentTile → Resource Stockpile → target Workstation`.

### 5. In-Place Floor Pentagram `Summoning Ritual` & Removal of `Summoning Pad`
- **Delete `Summoning Pad` Fixture**: Remove `summoningPad` from the `Workshop Room` fixture layout, reclaiming tile `{ x: 7, y: 8 }` as walkable guild hall floor space.
- **In-Place `Summoning Ritual` State & Adjacent Tile Materialization**:
  - When a parent `Guild Adventurer` spawns a `Squad Subagent` (`subagent` tool call or child session hydration), the parent enters a `SummoningRitual` animation state (`~900ms`) at their current tile (`parentTile`), rendering a temporary glowing pentagram spell circle with golden fire FX beneath the parent and an arcane arc to the nearest walkable adjacent tile (`computeAdjacentSummonTile(room, parentTile, occupantIndex)`).
  - The `Squad Subagent` materializes directly on that adjacent tile beside the parent, inherits the parent's `Skill Grimoire` stack, and begins its own hauling/work route.
- **Direct Parent `Report Scroll` Handoff**:
  - When a `Squad Subagent` transitions to `ReportingScroll`, its target destination tile is the parent `Guild Adventurer`'s current tile (`parentTile`).

### 6. Consolidated Roster State & Live Spectator HUD Seam
- **Retire Dead Parallel Roster Store**: Move `deriveSquadColor` into the world-state reducer / domain module and retire the unused parallel state store in the standalone roster module, leaving the world-state reducer (`GuildSnapshot`) as the single state store across the codebase.
- **Wire Spectator HUD Module Directly into the Browser**: Export a single canonical `WORKSTATION_CATALOG` and invoke `buildCharacterSheetViewModel`, `buildSceneObjectTooltip`, `buildRoomHeaderStripViewModel`, and `buildActivityTickerViewModel` directly from the browser UI script.

### 7. Character Kill / Session Termination Seam (`DELETE /api/session/{sessionID}`)
- **Daemon Client Port Extension**:
  - Add `deleteSession(sessionId: string, directory?: string): Promise<boolean>` to `OpenCodeDaemonClientPort`, calling `DELETE /api/session/${encodeURIComponent(sessionId)}?location[directory]=${encodeURIComponent(directory)}` with the discovered Basic auth headers.
- **Reducer Event (`session.deleted`)**:
  ```ts
  export interface SessionDeletedTelemetryEvent extends TelemetryEventBase {
    type: "session.deleted";
    sessionId: string;
    locationDirectory?: string;
  }
  ```
  - When `session.deleted` is dispatched, the reducer removes the target `CharacterState`, cascades removal to all child `Squad Subagent`s where `parentSessionId === sessionId`, removes their IDs from the room's `characterIds` and `activeSessionIds`, and emits a `session.deleted` delta.
- **Companion Server Route & UI Action**:
  - Expose `DELETE /api/guild/session/:sessionId` on the companion server (`createGuildCompanionServer`), which looks up the character's `locationDirectory`, invokes `daemonClient.deleteSession(sessionId, locationDirectory)`, dispatches `session.deleted` to the reducer, and broadcasts the resulting emission to all connected SSE clients.
  - In the `Character Sheet` UI, provide a **`☠ Kill Character (Delete Session)`** button with a confirmation step; when confirmed, play a `900ms` soul-banish / gravestone dissolve effect on the canvas and invoke `DELETE /api/guild/session/:sessionId`.

### 8. In-Room `Demolition Bomb` Fixture & OpenCode V2 `Workshop Room` Resource Teardown
- **In-Room `Demolition Bomb` Spatial Layout & Scene Tooltip**:
  - `layoutWorkshopRoom` places a `Demolition Bomb` fixture inside every `16 × 12` `Workshop Room` atsoutheast tile `{ x: 14, y: 10 }` (`anchorTile: { x: 13, y: 10 }`), clear of all 7 core `Workstation`s, the `Break Lounge`, and the `Resource Stockpile`.
  - The canvas renders the `Demolition Bomb` as an outlined dark-iron bomb sphere with a fuse cord, animated sputtering spark particles, and `DEMOLISH ROOM` sub-label at high detail, registering a clickable scene hitbox (`{ kind: "demolition-bomb", roomId }`).
  - `buildSceneObjectTooltip(snapshot, { kind: "demolition-bomb", roomId })` returns the room's title, `locationDirectory`, session/character counts, active adventurer warning, worktree flag, and explicit OpenCode V2 teardown bindings (`DELETE /api/session/{sessionID}`, `DELETE /api/pty/{ptyID}`, `DELETE /api/shell/{id}`, `DELETE /api/worktree`, `DELETE /api/debug/location`).
- **5-Step OpenCode V2 Location Resource Teardown (`deleteRoomResources`)**:
  - Extend `OpenCodeDaemonClientPort` with `deleteRoomResources(input: { directory: string; projectId?: string; isWorktree?: boolean }): Promise<RoomTeardownResult>`:
    1. **Sessions (`GET /api/session` $\rightarrow$ `POST /api/session/{sessionID}/interrupt` $\rightarrow$ `DELETE /api/session/{sessionID}`)**: Find all sessions matching the normalized `locationDirectory` (both from location state and `/api/session?limit=100`), interrupt any active sessions, and delete each session.
    2. **PTYs & Running Shells (`GET /api/pty` $\rightarrow$ `DELETE /api/pty/{ptyID}`, `GET /api/shell` $\rightarrow$ `DELETE /api/shell/{id}`)**: List all location-scoped PTYs and running shell commands for `?location[directory]=...` and delete each one.
    3. **Git Worktree Removal (`DELETE /api/worktree` + `POST /api/worktree/refresh`)**: When `isWorktree` is true (or the directory appears in `GET /api/worktree?projectID=...` as a non-canonical worktree checkout), call `DELETE /api/worktree` with JSON body `{ projectID, directory, force: true }` followed by `POST /api/worktree/refresh` with `{ projectID }`. Never call `DELETE /api/worktree` on a primary canonical project root directory (`isWorktree: false`).
    4. **Daemon Location Eviction (`DELETE /api/debug/location`)**: Call `DELETE /api/debug/location?location[directory]=${encodeURIComponent(daemonDir)}` to evict the cached location instance from the OpenCode V2 server.
    5. **World-State Reducer (`room.deleted`) & Ghost-Room Suppression**:
       ```ts
       export interface RoomDeletedTelemetryEvent extends TelemetryEventBase {
         type: "room.deleted";
         roomId: string;
         locationDirectory: string;
       }
       ```
       Dispatching `room.deleted` removes the `Workshop Room` from `rooms` and `roomOrder`, deletes all `CharacterState`s and `QuestGateState`s in that room, and records the normalized directory in a dismissed/deleted room set on the reducer and client adapter so subsequent `sweepAllLocations()` polls do not re-create 0-session ghost rooms until a new session is actually created in that location.
- **Companion Server Endpoint & Confirmation Flow**:
  - Expose `DELETE /api/guild/room` on `createGuildCompanionServer` (accepting `?roomId=...` or JSON body `{ roomId }`), which resolves the room's metadata (`locationDirectory`, `projectId`, `isWorktree`), invokes `deleteRoomResources` on the daemon client adapter, dispatches `room.deleted`, and broadcasts the updated `GuildSnapshot` over SSE.
  - Clicking the `Demolition Bomb` on the canvas opens a confirmation modal listing the room name, `locationDirectory`, session count, active-session warning, and whether the git worktree checkout will be removed with `force: true`. Confirming plays a canvas explosion animation and calls `DELETE /api/guild/room`.

## Testing Decisions

- **Philosophy**: Tests verify observable behavior at public module interfaces using independent expected values—never testing private helpers or internal renderer state.
- **Confirmed High-Level Seams Under Test**:
  1. **Seam 1 — World-State Reducer & Multi-Zone Spatial Layout Seam (`createWorldStateReducer`, `layoutWorkshopRoom`, `layoutGuildFloorplan`, `computeCharacterHaulingRoute`, `computeAdjacentSummonTile`)**:
     - Verifies that `opencode.*` built-in plugins are filtered out and `layoutWorkshopRoom` produces a fixed `16 × 12` cutaway room partitioned into four interior zones (`"study-wood"`, `"forge-tile"`, `"lounge-rug"`, `"stockpile-stone"`) with internal partition walls, walkable archways, inset perimeter windows, the `Resource Stockpile` (`{ x: 13, y: 8, width: 2, height: 2 }`), decorative guild props (bookshelves with ladder, weapon/armor racks, practice dummy, lounge L-sofa, potted plants, hearth fireplace), and an outdoor grass/tree/footpath compound plan, with zero external `Plugin Alcove` wing and zero fixed `Summoning Pad`.
     - Verifies that starting a tool job computes a two-leg hauling route (`currentTile → Resource Stockpile → target Workstation`) with the matching `Resource Cargo` (`Iron Bar`, `Timber Planks`, `Stone Block`, `Arcane Crystal`, `Scroll Bundle`).
     - Verifies that spawning a `Squad Subagent` triggers the parent's floor pentagram `Summoning Ritual` and places the child on a walkable tile immediately adjacent to the parent (`|dx| + |dy| === 1`), and that `ReportingScroll` targets the parent's current tile.
     - Verifies that dispatching `session.deleted` removes the target session and cascades removal to all of its child `Squad Subagent`s, and dispatching `room.deleted` removes the `Workshop Room`, all characters and `Quest Gate`s inside it, and suppresses 0-session ghost-room resurrection on subsequent location sweeps until a new session appears.
  2. **Seam 2 — Unified Scene Frame, Clean Cartoon / Pixel Atlas Painter, Companion Server & HUD Seam (`buildGuildSceneFrame`, `paintSceneFrame`, `createGuildCompanionServer`, `computeOverheadHudCue`, `buildSceneObjectTooltip`, `buildCharacterSheetViewModel`)**:
     - Verifies that feeding a `GuildSnapshot` into `buildGuildSceneFrame` and `paintSceneFrame` (via the Headless Frame Inspection Adapter) renders cutaway walls, zone flooring, directional drop shadows, window/torch light overlays, clean-cartoon outlined `Workstation` furniture, the in-room `Demolition Bomb` fixture (`{ x: 14, y: 10 }`), active floor pentagram `Summoning Ritual` fire FX, and 7-layer characters (including carried `Resource Cargo` during Leg 2 hauling), and preserves identical coordinates and hitbox priorities across `"clean-cartoon"` and `"pixel-atlas"` modes.
     - Verifies that `computeOverheadHudCue` returns `Context Mana` and `Quest Gate` cues without duplicate overhead skill dots (`grimoireEmblemRow` omitted/empty), and that character composition renders the held off-hand Grimoire Tome without circling spark clutter.
     - Verifies that the companion server serves the compiled browser scene & HUD module bundle, that `DELETE /api/guild/session/:sessionId` calls `deleteSession` on the daemon client port (`DELETE /api/session/{sessionID}`), and that `DELETE /api/guild/room` executes the 5-step OpenCode V2 room teardown (`POST /api/session/{id}/interrupt` + `DELETE /api/session/{id}`, `DELETE /api/pty/{id}`, `DELETE /api/shell/{id}`, `DELETE /api/worktree` + `POST /api/worktree/refresh` for worktree rooms only, and `DELETE /api/debug/location`), dispatches `room.deleted`, and prevents ghost-room resurrection on subsequent `sweepAllLocations()` polls.
     - Verifies that `buildSceneObjectTooltip` and `buildCharacterSheetViewModel` format consistent colors and OpenCode V2 metadata across characters hauling `Resource Cargo`, all 7 core `Workstation`s, the `Resource Stockpile`, the `Break Lounge`, and the `Demolition Bomb`.
- **Prior Art**: Follows the vertical red-green TDD slice structure in the existing test suite using Node's built-in test runner (`node --experimental-strip-types --test`).

## Out of Scope

- Sending chat prompts, approving permissions, or submitting form answers from the web UI (those remain in the OpenCode TUI; only `DELETE /api/session/{sessionID}` session termination is enabled).
- Bundling proprietary or paid third-party sprite packs into the repository (the default `"clean-cartoon"` vector/canvas adapter requires zero external assets, while `"pixel-atlas"` mode loads user-supplied CC0/free PNG sprite sheets such as the CraftPix freebie Guild Hall pack).
- Modifying OpenCode V2 core server binaries.

## Further Notes

- **Visual Reference Alignment**:
  - **CraftPix Guild Hall Reference**: 3/4 north wall elevation, staggered wood-plank flooring, library bookshelf with ladder (`Arcane Lectern` / `Drafting Table` study), weapon & armor racks + practice dummy (`Anvil Forge`), and glowing floor pentagram with fire FX (`Summoning Ritual`).
  - **Clean Cartoonish Top-Down Room Reference**: Crisp dark ink outlines, thick cutaway perimeter walls with inset windows casting warm light shafts, interior partition walls, plush L-shaped sofas and coffee table on a warm rug (`Break Lounge`), potted corner plants, and soft furniture drop shadows.
  - **Multi-Room Compound Reference**: Distinct flooring textures per functional zone (wood planks, checkerboard stone tiles, woven rugs) and outdoor grass, tree clusters, and stone footpaths framing the multi-room `Guild Floorplan`.
