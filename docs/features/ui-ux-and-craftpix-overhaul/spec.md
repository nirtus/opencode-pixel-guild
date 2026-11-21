# UI/UX Usability Fixes, Model-Aware Context Mana, CraftPix Guild Hall Sketch-First Graphics Overhaul, and Room Demolition (`ready-for-agent`)

Type: spec
Label: `ready-for-agent`
Status: resolved

## Problem Statement

From the spectator's and OpenCode user's perspective, a live visual and architectural inspection of the **OpenCode Pixel Guild Visualizer** against an active multi-project OpenCode V2 daemon reveals five critical usability, telemetry, spatial, and visual quality failures:

1. **Broken `Character Sheet` Sidebar & Frozen Activity Ticker (`TypeError` Crash on Selection)**: Selecting or hovering any character crashes the live browser HUD (`Cannot read properties of undefined (reading 'toLocaleString')`) because the browser UI template and the shared spectator HUD view-model module disagree on four property names (`limitTokens` vs. `maxTokens`, missing `cacheReadTokens`, `formattedCost` vs. `totalUsdFormatted`, and `detail` vs. `prompt` on `Quest Gate` banners). Because this uncaught exception occurs inside the main HUD synchronization loop before the activity ticker renders, the `Character Sheet` remains stuck on `"Waiting for live OpenCode V2 sessions..."` and the live activity ticker stops updating. Additionally, the `Sessions in Room` selector dumps 40+ sessions in raw insertion order rather than pinning active `Guild Adventurer`s and `Squad Subagent`s to the top.
2. **Hardcoded `200,000` `Context Mana` Limit & Cumulative Token Mismatch**: The telemetry ingress and world-state reducer hardcode `limitTokens = 200_000` everywhere and never query OpenCode V2's model catalog (`GET /api/model`). When a session runs on a 1M-context model such as `google/gemini-4-argon` (`limit.context = 1,048,576`) or `opencode/flint-40b-free` (`limit.context = 262,144`), a session with `249,000` tokens is falsely displayed as `249,925 / 200,000 tok (100% CRITICAL)` in crimson red instead of `249,925 / 1,048,576 tok (24% NORMAL)` in cyan. Furthermore, session-level `tokens` on `/api/session` accumulate across all turns (reaching millions of cached read tokens on long sessions), whereas true context-window utilization is defined by the latest assistant message's context footprint (`input + cache.read + cache.write + output + reasoning`).
3. **Split-Brain Multi-Room Coordinates, `Break Lounge` Crowd Pile-Ups, and Overlapping Labels**:
   - The spatial floorplan module lays out `Workshop Room`s in a 1-column vertical stack (`y = 0, 18, 36, 54...`) and generates the `OutdoorCompoundPlan` (grass bounds `width: 24`, perimeter tree clusters, and `courtyard-spine` stone footpaths) for that 1-column geometry, while the scene frame builder discards `placed.worldOffset` and places rooms in a 2-column grid (`x = 0, 20; y = 0, 16, 32...`). As a result, every second-column `Workshop Room` hangs off the grass in black void, outdoor trees and stone footpaths cut straight through the middle of room interiors, and selecting a single room still draws the entire 6-room outdoor compound stretching thousands of pixels downward.
   - In rooms with dozens of historical sessions (such as `42` sessions in one project), all `39` idle `Guild Adventurer`s in `RestingInLounge` are rendered simultaneously inside a `Break Lounge` that only has `12` seats—spilling sleeping characters and `39` overlapping overhead `Context Mana` bars across the sofa, banquet table, fireplace, and forge floor.
   - `Workstation` title banners (`DRAFTING TABLE`, `ARCANE LECTERN`) are drawn at `sy - 10`, colliding directly with the north-wall bookshelves (`y = 1`), while bottom tool sub-labels (`sy + 46`) collide with the standing character sprite (`anchorTile`) and the character's `activeToolPill`.
4. **Primitive Rectangle Graphics Instead of CraftPix Guild Hall Quality & Fake `Pixel Atlas` Toggle**: Despite the previous graphic overhaul spec, the canvas painter still renders every `Guild Adventurer`, `Squad Subagent`, `Workstation`, sofa, table, and bookshelf using 3 to 6 axis-aligned `fillRect`/`strokeRect` boxes (`16×9` rectangle heads, `18×5` rectangle hats, `40×22` rectangle tables) that fall far short of the **[Free Top-Down Pixel Art Guild Hall Asset Pack](https://craftpix.net/freebies/free-top-down-pixel-art-guild-hall-asset-pack/)** reference. Clicking the `Style: Clean Cartoon` / `Style: Pixel Atlas` button only darkens the outdoor grass hex without changing a single room, furniture prop, or character sprite. Crucially, no visual sketches based on the CraftPix Guild Hall reference were produced prior to implementation.
5. **Unremovable Ghost `Workshop Room`s (`gentle-forest`, `pixel-guild-cloud`)**: Abandoned git worktrees (`gentle-forest`) and 0-session project directories (`pixel-guild-cloud`) remain permanently visible on the `Guild Floorplan` because project discovery does not query `/api/worktree?projectID=...` to tag worktrees with `isWorktree: true`, 0-session ghost rooms are not suppressed during location sweeps, and the in-room **`Demolition Bomb`** fixture (`DELETE /api/guild/room` 5-step OpenCode V2 resource teardown) is not yet implemented.

## Solution

Deliver a cohesive **UI/UX, Model-Aware `Context Mana`, Sketch-First CraftPix Guild Hall Graphics, and Room Demolition Overhaul** across four vertical slices:

1. **Model-Aware `Context Mana` & Aligned `Character Sheet` HUD Seam**:
   - Extend the OpenCode V2 daemon client and capability catalog to fetch `GET /api/model`, indexing each model's `limit.context` and `limit.output` by both `<providerID>/<modelID>` and `<modelID>`.
   - Compute each character's `Context Mana` `usedTokens` from the latest completed assistant turn's context footprint (`input + cache.read + cache.write + output + reasoning` hydrated from `/api/session/{id}/message`, falling back to session token telemetry) and `limitTokens` from the active model's catalog `limit.context` (e.g. `1,048,576` for `google/gemini-4-argon`), while preserving cumulative session input/output/cache-read/cost totals for the `Character Sheet` cost telemetry.
   - Align the `Character Sheet` view-model contract (`maxTokens` + `limitTokens`, `cacheReadTokens`, `cacheWriteTokens`, `totalUsdFormatted` + `formattedCost`, and `PendingQuestGateViewModel.prompt` + `detail`) so the live browser `Character Sheet` and Activity Ticker render without runtime exceptions, and sort the `Sessions in Room` list so active `Guild Adventurer`s and `Squad Subagent`s always appear at the top above idle/archived sessions.
2. **Unified Multi-Room Spatial Coordinates, `Break Lounge` Crowd Capping & Label De-Collision**:
   - Unify the floorplan layout module and the scene frame builder so the floorplan layout computes the canonical 2-column world coordinates (`placed.worldOffset`, `placed.worldBounds`, `placed.worldDoorTile`) and the scene frame builder consumes `placed.worldOffset` directly—ensuring outdoor grass bounds, perimeter tree clusters, and cobbled stone footpaths wrap every `Workshop Room` accurately without cutting through room interiors. When a single room is selected (`selectedRoomId !== null`), scope the outdoor compound to that single room's perimeter.
   - Update camera auto-fitting in `"All Rooms"` mode to compute zoom and pan from the bounding box of all visible `Workshop Room`s.
   - Cap visible resting characters in the `Break Lounge` to at most `6` seated characters (`4` at the Hearth Table + `2` on the Session Bench) plus a clean in-lounge `+N resting` overflow pill, and hide overhead `Context Mana` bars on idle (`RestingInLounge` / `Archived`) characters unless hovered or selected.
   - Reposition `Workstation` title pills and tool sub-labels (and suppress static tool sub-labels when an `activeCommandBadge` or working character is occupying the station) so text never overlaps north-wall bookshelves or character sprites.
3. **Sketch-First CraftPix Guild Hall Visual Overhaul & True Dual-Style Painter Seam**:
   - **Mandatory Phase 1 — Interactive CraftPix Visual Sketches**: Produce a standalone visual sketch & comparison gallery inside the project repository (served at `/sketches` by the companion server) faithfully modeled on the **[Free Top-Down Pixel Art Guild Hall Asset Pack](https://craftpix.net/freebies/free-top-down-pixel-art-guild-hall-asset-pack/)**, showcasing:
     - **Architecture & Zones**: 3/4 medieval cut-stone and timber north walls with recessed alcoves, arched double-doors, guild banners, a pinned **Quest Bulletin Board**, warm pegged oak plank floors with wood-grain joints, checkerboard stone forge tiles, and crimson-and-gold woven lounge tapestries.
     - **Workstations & Guild Hall Props**: Detailed pixel-art and cel-shaded vector designs for all 7 core `Workstation`s (`Drafting Table` with unrolled blueprint scroll, compass, and feather quill; `Archive Radar` with brass astrolabe rings and crystal lens; `Arcane Lectern` with carved pedestal and open runed grimoire; `Anvil Forge` with horned blacksmith anvil, stone chimney hood, glowing coal bed, and bellows; `Reactor Console` with brass arcane coils and glowing crystal tubes; `Comms Dish` with astral dish and signal runes; `Altar of Compaction` with stepped obsidian dais and floating distillation chalice), `Resource Stockpile` (wooden chests, iron-bound barrels, timber stacks, cut stone blocks, iron ingots, arcane crystals, scroll bundles), `Break Lounge` (long timber guild banquet table with frothy tankards, stone hearth fireplace with crackling logs, plush L-sofa, potted ferns), tall mahogany bookshelves with sliding brass ladder, halberd/broadsword weapon rack, plate armor stand, wooden training mannequin dummy, ornate floor pentagram `Summoning Ritual`, and the `Demolition Bomb`.
     - **11-Inspired RPG Character Archetypes & Loadouts**: Detailed 4-directional top-down RPG character sprites (Armored Swordsman/Smith for `build`, Pointed-Hat Sorcerer/Scholar for `plan`, Hooded Ranger/Scout for `explore`, Plumed Guildmaster/Warden for `general`, Alchemist Artificer, Horned Archon, and tethered `Squad Subagent`s) with distinct hair/helm silhouettes, layered cloaks, boots, swinging weapons/tools, off-hand `Skill Grimoire` tomes, and two-handed `Resource Cargo`.
   - **Phase 2 — Deep Scene Painter Implementation**: Upgrade the Canvas 2D scene paint adapter to render the approved CraftPix-style multi-layered pixel/vector sprites via cached offscreen sprite canvases:
     - **`"pixel-atlas"` Mode**: Renders crisp `32×32` / `48×48` pixel-art tile and sprite sheets (and slices external CraftPix PNG sprite sheets via `ctx.drawImage` when loaded, with built-in procedural CraftPix-faithful pixel-art bitmaps when running zero-asset).
     - **`"clean-cartoon"` Mode**: Renders high-detail cel-shaded architectural silhouettes with dark ink outlines, wood grain, stone coursework, contoured furniture, and expressive 3/4 characters—making the style toggle button a genuine, dramatic visual switch between **CraftPix Pixel Art** and **Clean Cartoon Vector** styles.
4. **In-Room `Demolition Bomb` & 5-Step OpenCode V2 Ghost Room Teardown (`DELETE /api/guild/room`)**:
   - Enhance daemon project/location discovery to query `GET /api/worktree?projectID=...` so worktree rooms (such as `gentle-forest`) are accurately marked `isWorktree: true`, and suppress 0-session ghost rooms (`pixel-guild-cloud`) during location sweeps unless they have active work or sessions.
   - Add the interactive **`Demolition Bomb`** fixture at southeast tile `{ x: 14, y: 10 }` (`anchorTile: { x: 13, y: 10 }`) inside every `Workshop Room`, complete with an animated sputtering fuse spark, universal scene hover tooltip (`kind: "demolition-bomb"`), click confirmation modal, fiery canvas shockwave animation, and `DELETE /api/guild/room` executing the 5-step OpenCode V2 teardown (`POST /api/session/{id}/interrupt` + `DELETE /api/session/{id}`, `DELETE /api/pty/{id}`, `DELETE /api/shell/{id}`, `DELETE /api/worktree` with `force: true` + `POST /api/worktree/refresh` for worktree rooms only, `DELETE /api/debug/location`, and `room.deleted` state reduction with resurrection suppression).

## User Stories

1. As a spectator clicking or hovering any `Guild Adventurer` or `Squad Subagent` on the `Guild Floorplan`, I want the `Character Sheet` sidebar to render immediately without throwing a `TypeError` on token limits or cache-read counters, so that I can inspect every session's RPG loadout, skills, and telemetry.
2. As a spectator watching live OpenCode activity, I want the Live Guild Activity Ticker to continue updating smoothly even when a character is selected in the `Character Sheet`, so that runtime HUD errors never freeze the event feed.
3. As a spectator inspecting a session running on a 1M-context model such as `google/gemini-4-argon` (`1,048,576` max context tokens) or `opencode/flint-40b-free` (`262,144` max context tokens), I want the character's `Context Mana` bar and `Character Sheet` to use the model's actual `limit.context` from OpenCode V2's `/api/model` endpoint instead of a hardcoded `200,000`, so that a `250k`-token session is accurately shown at `~24% NORMAL` rather than `100% CRITICAL`.
4. As a spectator inspecting `Context Mana`, I want `usedTokens` to reflect the session's current context-window occupancy from the latest assistant turn (`input + cache.read + cache.write + output + reasoning`) rather than multi-turn cumulative billing sums, while still seeing cumulative input, output, cache-read, and USD cost totals in the `Character Sheet` cost breakdown.
5. As a spectator viewing a `Character Sheet` for a character blocked at a `Quest Gate`, I want the pending permission or question prompt text to display properly (supporting both `prompt` and `detail`), so that I never see `"undefined"` in the warning banner.
6. As a spectator viewing the `Sessions in Room` list inside the `Character Sheet` for a room with 40+ sessions, I want active sessions (`WorkingAtStation`, `Thinking`, `BlockedAtQuestGate`, `DistillingContextMana`, `ReportingScroll`) sorted to the top with a clear badge and idle/archived sessions grouped below, so that I can immediately find and click live agents.
7. As a spectator viewing multiple `Workshop Room`s in **All Rooms** mode, I want the `OutdoorCompoundPlan` grass grounds, perimeter tree clusters, and cobbled stone footpaths to use the exact same 2-column world coordinates as the scene frame builder, so that second-column rooms never hang in black void and trees or stone paths never cut through room interiors.
8. As a spectator clicking **All Rooms** or pressing **Center**, I want the camera to automatically calculate zoom and pan from the world bounding box of all visible `Workshop Room`s, so that all rooms fit comfortably in the viewport without manual dragging.
9. As a spectator selecting a single `Workshop Room` from the room filter bar, I want the outdoor grass border, doorway apron, and perimeter trees scoped cleanly to that single room at `{ x: 0, y: 0 }`, rather than rendering orphan trees and stone paths for hidden rooms across the canvas.
10. As a spectator viewing a `Workshop Room` that has 30–50 historical idle sessions in `RestingInLounge`, I want at most `6` resting characters visibly seated in the `Break Lounge` (`4` around the Hearth Banquet Table and `2` on the Session Bench) alongside a compact `+N resting in lounge` badge, so that dozens of sleeping characters never spill into the workshop or bury the room under 40 overlapping health bars.
11. As a spectator looking at idle characters resting in the `Break Lounge`, I want their overhead `Context Mana` bars hidden unless I hover or select them, so that the lounge remains visually calm and readable.
12. As a spectator zoomed into a `Workshop Room`, I want `Workstation` title labels (`DRAFTING TABLE`, `ARCANE LECTERN`, etc.) and tool sub-labels positioned so they never overlap the north-wall bookshelves or the standing character sprite and their `activeToolPill`.
13. As a product owner reviewing the graphics overhaul, I want a standalone interactive visual sketch gallery (`/sketches`) inside the project repository based directly on the **CraftPix Free Top-Down Pixel Art Guild Hall Asset Pack**, so that I can inspect and compare the wall masonry, flooring, `Workstation` sprites, guild props, and 4-directional RPG character archetypes side by side.
14. As a spectator viewing a `Workshop Room`, I want the north wall rendered as a 3/4 medieval stone-and-timber elevation featuring recessed masonry courses, oak wainscoting, guild banners, arched windows, and a **Quest Bulletin Board** with pinned parchment notices (inspired by the CraftPix Guild Hall pack), so that the room looks like an authentic fantasy guild hall.
15. As a spectator viewing the `Study & Planning Zone`, I want warm pegged oak floorboards with wood-grain joints, tall bookshelves filled with pixel-art tomes and a sliding brass ladder, an `Arcane Lectern` shaped as a carved wooden lectern with an open glowing grimoire, and a `Drafting Table` with unrolled parchment blueprints, inkwell, and quill.
16. As a spectator viewing the `Forge & Engineering Zone`, I want bevelled stone workshop tiles, an `Anvil Forge` with a stone chimney hearth, glowing coal bed, bellows, and horned blacksmith anvil, flanked by a halberd/broadsword weapon rack, a visored plate armor stand, a wooden combat training mannequin dummy, a water quench barrel, a `Reactor Console` with glowing arcane crystal conduits, a `Comms Dish` with a brass aether dish, and an `Altar of Compaction` with a stepped rune dais and floating chalice.
17. As a spectator viewing the `Break Lounge`, I want a crimson-and-gold woven tapestry rug, a stone hearth fireplace with crackling logs and mantle, a long timber guild banquet/coffee table with frothy tankards/mugs, a plush L-shaped sofa with cushions, and potted leafy tavern plants.
18. As a spectator viewing the `Resource Stockpile`, I want an iron-bound supply depot stacked with recognizable pixel/cartoon crates of **Timber Planks**, **Cut Stone Blocks**, **Iron Ingots**, **Arcane Crystals**, and **Scroll Bundles**, plus treasure chests and barrels matching the CraftPix Guild Hall storage props.
19. As a spectator watching `Guild Adventurer`s and `Squad Subagent`s, I want each character rendered as a detailed `32×32` top-down RPG character sprite (modeled on the CraftPix Guild Hall sorcerers, armored swordsmen, hooded scouts, and guildmasters) with recognizable headgear (`visored-helm`, `arcane-circlet` / wizard hat, `hood`, `plumed-cap`, `alchemist-goggles`, `horned-crown`), layered cloak/robes, directional face/hair, animated boots, distinct main-hand weapons/implements, off-hand `Skill Grimoire`, and carried `Resource Cargo`.
20. As a spectator clicking the `Style: Pixel Atlas` / `Style: Clean Cartoon` toggle button in the top bar, I want the canvas to genuinely switch between crisp `32×32` pixel-art sprites/tiles (using loaded CraftPix PNG sprite sheets or the built-in CraftPix-faithful pixel-art bitmap atlas) and smooth cel-shaded vector cartoon art, rather than only changing the grass color.
21. As an OpenCode user with abandoned git worktrees (such as `gentle-forest`) or empty 0-session project entries (`pixel-guild-cloud`), I want project and location discovery to query `/api/worktree?projectID=...` so worktrees are accurately tagged `isWorktree: true`, and I want 0-session ghost rooms suppressed unless they have active work or sessions.
22. As an OpenCode user viewing a `Workshop Room`, I want to see a physical **`Demolition Bomb`** fixture at southeast tile `{ x: 14, y: 10 }` with an animated sputtering fuse spark, so that I can demolish unwanted or ghost rooms directly from the floorplan.
23. As a spectator hovering over the `Demolition Bomb`, I want a scene tooltip showing the room's title, `locationDirectory`, session count, active adventurer count, worktree status, and the exact OpenCode V2 teardown endpoints (`DELETE /api/session/{sessionID}`, `DELETE /api/pty/{ptyID}`, `DELETE /api/shell/{id}`, `DELETE /api/worktree`, `DELETE /api/debug/location`).
24. As an OpenCode user clicking the `Demolition Bomb` and confirming in the modal dialog, I want the companion server (`DELETE /api/guild/room`) to execute the 5-step OpenCode V2 teardown (interrupting and deleting all room sessions, deleting room PTYs and shells, deleting the OpenCode git worktree with `force: true` + `POST /api/worktree/refresh` when `isWorktree: true` while never deleting primary repo files on disk, evicting `DELETE /api/debug/location`, and dispatching `room.deleted` with ghost-room suppression) while playing a fiery shockwave animation on the canvas.

## Implementation Decisions

### 1. Model-Aware `Context Mana` & Turn Context Occupancy Seam
- **Daemon Model Catalog Hydration (`GET /api/model`)**:
  - Extend the OpenCode V2 daemon client port (`getLocationState` / `getModels`) to fetch `GET /api/model` and extract each model's identifier (`id`, `modelID`, `providerID`) and `limit: { context: number, output?: number }`.
  - Extend `CapabilityCatalog` and `catalog.hydrated` telemetry events with an optional `models` list (`Array<{ id: string; providerId?: string; name?: string; limitContext: number; limitOutput?: number }>`) indexed by both `<providerID>/<id>` and `<id>`.
- **Accurate `usedTokens` & `limitTokens` Derivation**:
  - During message hydration (`/api/session/{sessionID}/message?limit=15&order=desc`), inspect the newest assistant message that carries a `tokens` object (`{ input, output, reasoning, cache: { read, write } }`). Compute current context-window occupancy as:
    ```ts
    const latestTurnContextTokens =
      (msgTokens.input ?? 0) +
      (msgTokens.cache?.read ?? 0) +
      (msgTokens.cache?.write ?? 0) +
      (msgTokens.output ?? 0) +
      (msgTokens.reasoning ?? 0);
    ```
  - Resolve `limitTokens` from:
    1. Explicit `s.tokens.limitTokens` if provided and `> 0`,
    2. The hydrated `/api/model` catalog entry matching the session's `modelId` (e.g. `1,048,576` for `google/gemini-4-argon`, `262,144` for `opencode/flint-40b-free`),
    3. Built-in model family heuristics (`gemini-*` $\rightarrow$ `1,048,576`, `gpt-5*` / `codex*` $\rightarrow$ `400,000`, `claude-*` $\rightarrow$ `200,000`) when offline,
    4. Fallback `200,000` only when model is unknown.
  - Store both `usedTokens` (current context window occupancy) and `limitTokens` (model context limit) on `ContextManaState`, while preserving cumulative session `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, and `totalCostUsd` for cost reporting.
- **Aligned `Character Sheet` View-Model Contract**:
  - Update `ContextManaViewModel`, `CharacterCostViewModel`, and `PendingQuestGateViewModel` so they expose both canonical and browser-expected aliases:
    ```ts
    export interface ContextManaViewModel {
      readonly percent: number;
      readonly usedTokens: number;
      readonly maxTokens: number;
      readonly limitTokens: number;
      readonly status: ContextManaHudStatus;
      readonly compactionCount: number;
    }

    export interface CharacterCostViewModel {
      readonly inputTokens: number;
      readonly outputTokens: number;
      readonly cacheReadTokens: number;
      readonly cacheWriteTokens: number;
      readonly totalUsdFormatted: string;
      readonly formattedCost: string;
      readonly totalCostUsd: number;
    }

    export interface PendingQuestGateViewModel {
      readonly gateId: string;
      readonly kind: QuestGateKind;
      readonly title: string;
      readonly prompt: string;
      readonly detail: string;
      readonly badgeSymbol: "!" | "?";
    }
    ```
  - Sort the `Sessions in Room` peer list in the `Character Sheet` so active sessions (`lifecycleState !== "RestingInLounge" && lifecycleState !== "Archived"`) appear first, followed by recently active `RestingInLounge` sessions, and finally `Archived` sessions.

### 2. Unified Multi-Room Spatial Grid, `Break Lounge` Crowd Capping & Label De-Collision
- **Single Canonical World Coordinate Grid**:
  - Update the floorplan layout module and the scene frame builder so both use the exact same room placement coordinates (`placed.worldOffset`, `placed.worldBounds`, `placed.worldDoorTile`).
  - Place multi-room floorplans in a balanced 2-column compound grid (`colPitchTiles = 22`, `rowPitchTiles = 16`, with worktree annexes placed adjacent to their parent project or in the next slot) and build `OutdoorCompoundPlan` (`bounds`, `treeClusters`, `stoneFootpaths`) directly from those placed room coordinates so footpaths connect doorways around room perimeters (`y = placed.worldBounds.y - 2`) and **never** pass through any room's interior tile bounds.
  - When `selectedRoomId` is active (single-room detail view), the scene frame builder generates a single-room `OutdoorCompoundPlan` tightly framing `{ x: -3, y: -3, width: 22, height: 18 }` around the selected room at `{ x: 0, y: 0 }`.
  - Update camera auto-fitting in `"All Rooms"` mode so it computes `cameraZoom`, `cameraPanX`, and `cameraPanY` from the actual pixel bounding box of all visible `Workshop Room`s.
- **`Break Lounge` Visual Capacity Cap & Sleeping Bar Suppression**:
  - Introduce `MAX_VISIBLE_LOUNGE_CHARACTERS = 6` in the scene frame builder:
    - All active characters (`Entering`, `Thinking`, `WorkingAtStation`, `BlockedAtQuestGate`, `DistillingContextMana`, `ReportingScroll`) and the currently `selectedSessionId` are always rendered on the floorplan.
    - Among idle/historical characters (`RestingInLounge` / `Archived`), render at most the `6` most recently active characters in the `Break Lounge` (`4` at the Hearth Banquet Table slots `{ x: 2..4, y: 8..9 }` and `2` on the L-Sofa / Session Bench slots `{ x: 2..5, y: 10 }`), passing `existingOccupiedTiles` into `computeStationSlot` so two resting characters never share the same tile.
    - Record `hiddenRestingCount = totalRestingInRoom - visibleRestingInRoom` on the `Break Lounge` fixture metadata and paint a clean `+N resting` badge on the `Break Lounge` banner when `hiddenRestingCount > 0`.
    - For characters in `RestingInLounge` or `Archived`, set `overheadCue.contextManaBar.visible = isHighlighted` so sleeping characters do not clutter the lounge with dozens of static mana bars unless hovered or selected.
- **Workstation & Bookshelf Label De-Collision**:
  - Move north-row `Workstation` title pills (`Drafting Table`, `Archive Radar`, `Arcane Lectern` at `y = 2`) to render as compact dark-outlined nameplates tucked at the front edge of the station platform (`sy + 24`) or immediately above the station (`sy - 4`) below the `y = 1` bookshelf bottom edge (`y = 60px`), and hide the static `toolsLabel` whenever an `activeCommandBadge` or working character is occupying the station.

### 3. Sketch-First CraftPix Guild Hall Visual Overhaul & Dual-Style Painter Seam
- **Deliverable 1 — Standalone CraftPix Guild Hall Visual Sketches (`craftpix-guild-hall-sketches.html`)**:
  - Create a self-contained HTML/Canvas/SVG visual sketch sheet inside the feature directory (and served at `/sketches` by the companion server) that renders high-zoom interactive previews of every architectural tile, `Workstation`, decorative guild prop (including the CraftPix **Quest Bulletin Board**, **Dragon/Guild Crest Banner**, **Bookshelf with Sliding Ladder**, **Weapon & Polearm Rack**, **Plate Armor Stand**, **Training Mannequin Dummy**, **Floor Pentagram Summoning Circle**, **Banquet Table with Tankards**, **Resource Stockpile Crates/Chests**, and **Demolition Bomb**), and all character classes in both **CraftPix Pixel-Art Atlas Mode (`32×32` / `48×48` pixel grid)** and **Clean Cartoon Vector Mode**.
- **Deliverable 2 — Deepened Canvas 2D Scene Paint Adapter with Offscreen Pixel Sprite Atlas & Vector Modes**:
  - Replace the primitive 3–6 `drawOutlinedRect` boxes in the Canvas 2D scene paint adapter with two distinct, high-craft rendering pipelines behind `ScenePaintAdapter`:
    1. **`"pixel-atlas"` Mode (CraftPix Pixel Art)**:
       - Generates and caches a crisp `16×16` / `32×32` / `48×48` offscreen pixel-art sprite atlas (`imageSmoothingEnabled = false`) modeled on the CraftPix Guild Hall Asset Pack (plus supports loading external PNG sheets when present).
       - Renders pixel-art masonry walls, timber beams, pegged oak floor tiles, pixel-art `Workstation`s, the **Quest Bulletin Board** on the north wall, pixel-art bookshelves/racks/mannequins, and 4-directional pixel-art RPG characters (Sorcerer, Armored Swordsman, Hooded Ranger, Guildmaster).
    2. **`"clean-cartoon"` Mode (Illustrated Top-Down Cartoon)**:
       - Renders contoured, cel-shaded furniture, rounded cushions, wood-grain planks, bevelled stone tiles, arched windows with mullions, flickering hearth/forge flames, and contoured 3/4 cartoon characters with distinct helms, wizard hats, hoods, cloaks, and recognizable tools/tomes.

### 4. In-Room `Demolition Bomb` & 5-Step OpenCode V2 Ghost Room Teardown (`DELETE /api/guild/room`)
- **Worktree Tagging & 0-Session Ghost Room Suppression**:
  - During daemon project discovery (`getProjects()`), query `GET /api/worktree?projectID=${encodeURIComponent(proj.id)}` so registered worktrees (such as `gentle-forest`) are included in `proj.sandboxes` and tagged with `isWorktree: true`, `projectId: proj.id`, and `parentProjectDirectory: proj.directory`.
  - In location sweeps (`sweepAllLocations()`) and the world-state reducer, skip creating or re-creating a `Workshop Room` when a location has `0` sessions and `0` active sessions (or was explicitly demolished via `room.deleted`), until a location sweep or `session.upserted` event arrives with at least one session in that directory.
- **Spatial & HUD `Demolition Bomb` Fixture (`{ x: 14, y: 10 }`)**:
  - Extend `WorkshopRoomLayout` with `demolitionBomb: { stationId: "fixture:Demolition Bomb", kind: "Demolition Bomb", fixtureTile: { x: 14, y: 10 }, anchorTile: { x: 13, y: 10 } }`, marking `{ x: 14, y: 10 }` as a non-walkable fixture tile.
  - Render the `Demolition Bomb` in the scene frame builder and painter (priority `3` hitbox `{ kind: "demolition-bomb", roomId }`) as a dark-iron sphere bomb with a brass fuse collar, braided fuse cord, and animated sputtering spark particles.
  - Extend `buildSceneObjectTooltip` with `{ kind: "demolition-bomb", roomId }` returning the room's title, `locationDirectory`, session count, active adventurer/subagent count, worktree status, and the 5 OpenCode V2 teardown endpoint bindings.
- **5-Step OpenCode V2 Teardown (`deleteRoomResources` & `DELETE /api/guild/room`)**:
  - Implement `deleteRoomResources({ directory, projectId, isWorktree })` on `OpenCodeDaemonClientPort`:
    1. **Interrupt & Delete Sessions**: Query `/api/session` (location-scoped and global `?limit=100`) for all sessions matching `normalizeLocationDirectory(directory)`; call `POST /api/session/{sessionID}/interrupt` and `DELETE /api/session/{sessionID}`.
    2. **Delete PTYs & Running Shells**: Query `GET /api/pty?location[directory]=...` $\rightarrow$ `DELETE /api/pty/{ptyID}` and `GET /api/shell?location[directory]=...` $\rightarrow$ `DELETE /api/shell/{id}`.
    3. **Remove Git Worktree (Worktree Rooms Only)**: When `isWorktree` is true (or `/api/worktree?projectID=...` lists the directory as a non-canonical worktree), call `DELETE /api/worktree` with `{ projectID, directory: daemonDir, force: true }` and `POST /api/worktree/refresh` with `{ projectID }`. Never call `DELETE /api/worktree` on a primary canonical project root (`isWorktree: false`).
    4. **Evict Cached Daemon Location**: Call `DELETE /api/debug/location?location[directory]=${encodeURIComponent(daemonDir)}`.
    5. **Dispatch `room.deleted`**: Remove the room, its characters, and its `Quest Gate`s from `GuildSnapshot`, record the normalized directory in the reducer's and adapter's dismissed-room set, play an expanding fiery shockwave animation on the canvas, and auto-reset `selectedRoomId` to `null` (`All Rooms`) if the user was viewing the demolished room.

## Testing Decisions

- **What Makes a Good Test**: Tests exercise only public module interfaces at the two approved high-level seams and assert observable outputs (`GuildSnapshot`, `GuildSceneFrame`, `HeadlessFrameInspectionAdapter` recordings, HUD view-models, and HTTP/SSE responses)—never private helpers or internal canvas state.
- **Approved High-Level Seams Under Test**:
  1. **Seam 1 — Telemetry Ingress, World-State Reducer & Spatial/Scene Frame Seam (`createOpenCodeClientAdapter`, `createWorldStateReducer`, `layoutWorkshopRoom`, `layoutGuildFloorplan`, `buildGuildSceneFrame`, `paintSceneFrame`)**:
     - Verifies that `GET /api/model` hydrates model context limits (`1,048,576` for `google/gemini-4-argon`, `262,144` for `opencode/flint-40b-free`) into the catalog and computes `Context Mana` from latest-turn context occupancy (`input + cache.read + cache.write + output + reasoning`) against the model's real `limit.context` instead of a hardcoded `200,000`.
     - Verifies that `layoutGuildFloorplan` and `buildGuildSceneFrame` share identical 2-column `worldOffset` room coordinates, that `outdoorCompound` grass bounds encompass all rooms without stone footpaths or trees intersecting room interiors, and that selecting a single room scopes the outdoor compound to that room.
     - Verifies that rooms with `40+` idle `RestingInLounge` sessions cap visible `Break Lounge` characters to `MAX_VISIBLE_LOUNGE_CHARACTERS` (`6`) with a `+N resting` overflow count, hide overhead `Context Mana` bars on un-highlighted sleeping characters, and de-collide `Workstation` labels from north-wall bookshelves.
     - Verifies that `paintSceneFrame` renders distinct CraftPix-style pixel-art atlas sprites vs. clean-cartoon vector primitives when toggling `VisualStyleMode` between `"pixel-atlas"` and `"clean-cartoon"`, and that the visual sketch artifact exists in the project repository.
  2. **Seam 2 — Spectator HUD View-Models & Companion Server Seam (`buildCharacterSheetViewModel`, `buildSceneObjectTooltip`, `createGuildCompanionServer`)**:
     - Verifies that `buildCharacterSheetViewModel` exposes aligned properties (`maxTokens` & `limitTokens`, `cacheReadTokens`, `cacheWriteTokens`, `totalUsdFormatted` & `formattedCost`, `pendingQuestGate.prompt` & `detail`) matching the browser template.
     - Verifies that `layoutWorkshopRoom`, `buildGuildSceneFrame`, and `buildSceneObjectTooltip` place and describe the `Demolition Bomb` at `{ x: 14, y: 10 }` (`anchorTile: { x: 13, y: 10 }`).
     - Verifies that `DELETE /api/guild/room` executes the 5-step OpenCode V2 teardown (`POST /api/session/{id}/interrupt` + `DELETE /api/session/{id}`, `DELETE /api/pty/{id}`, `DELETE /api/shell/{id}`, `DELETE /api/worktree` + `POST /api/worktree/refresh` for worktrees only, `DELETE /api/debug/location`), dispatches `room.deleted`, and suppresses 0-session ghost-room resurrection on subsequent `sweepAllLocations()` polls.
- **Prior Art**: Builds on the existing Node test runner suites (`node --experimental-strip-types --test`) in the repository's `tests/` directory.

## Out of Scope

- Deleting a user's primary git repository or non-worktree source files on disk (`DELETE /api/worktree` is strictly limited to OpenCode worktree rooms where `isWorktree: true`).
- Sending chat prompts, approving permissions, or answering form questions from the web visualizer (kept in the OpenCode TUI).
- Modifying OpenCode V2 core daemon binaries.

## Further Notes

- **Critical Project Folder Rule (`AGENTS.md`)**: All specs, wayfinder maps, tickets, visual sketches, architecture reviews, and subagent work must remain strictly inside the project root directory (`./`). Never create git worktrees (`worktree_create`, `git worktree add`), never move sessions outside the project folder (`session_move`), and never write any files to `/tmp/opencode` or `/tmp`.
- **CraftPix Guild Hall Visual Reference**: All sketches and sprite compositions in Ticket 03 are anchored directly to the **[Free Top-Down Pixel Art Guild Hall Asset Pack](https://craftpix.net/freebies/free-top-down-pixel-art-guild-hall-asset-pack/)** (`https://craftpix.net/download/97724/`), specifically its 3/4 stone-and-timber walls, Quest Bulletin Board, bookshelves, weapon racks, training mannequin dummy, glowing floor pentagram, banquet tables, storage crates/chests, and 11 fantasy character archetypes.
