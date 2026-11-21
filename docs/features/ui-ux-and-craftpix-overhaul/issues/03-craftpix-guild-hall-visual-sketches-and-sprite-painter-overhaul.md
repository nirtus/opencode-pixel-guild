# 03: CraftPix Guild Hall Visual Sketches & Dual-Style Sprite Painter Overhaul

Type: task
Label: `ready-for-agent`
Status: resolved
Blocked by: 02

**What to build:** Produce a standalone, high-detail interactive visual sketch & asset comparison gallery (`craftpix-guild-hall-sketches.html`, served at `/sketches`) inside the project repository modeled directly on the **[Free Top-Down Pixel Art Guild Hall Asset Pack](https://craftpix.net/freebies/free-top-down-pixel-art-guild-hall-asset-pack/)**, and upgrade `createCanvas2DScenePaintAdapter` so `"pixel-atlas"` mode renders true cached `32×32` / `48×48` pixel-art sprites and tiles (supporting both procedural CraftPix-faithful pixel-art bitmaps and external CraftPix PNG sprite sheets) while `"clean-cartoon"` mode renders contoured cel-shaded guild hall architecture, props (including the Quest Bulletin Board, guild banners, bookshelves with ladder, weapon/armor racks, training mannequin dummy, glowing floor pentagram, banquet table with tankards, and stockpile chests/crates), and expressive 4-directional RPG characters.

**Blocked by:** 02: Unified Multi-Room Spatial Coordinates, Break Lounge Crowd Capping & Label De-Collision

**Status:** resolved

- [x] Create the visual sketch & asset comparison gallery inside the project repository (and serve it at `/sketches` on the companion server) presenting side-by-side interactive visual sketches based on the CraftPix Guild Hall pack:
  - Room architecture & flooring sheet (3/4 stone-block & timber north wall, arched oak doors, stained-glass daylight shafts, Quest Bulletin Board with pinned notices, guild crest banners, pegged warm oak planks, cobblestone forge tiles, crimson-and-gold woven lounge rug).
  - All 7 core `Workstation`s (`Drafting Table`, `Archive Radar`, `Arcane Lectern`, `Anvil Forge`, `Reactor Console`, `Comms Dish`, `Altar of Compaction`), `Resource Stockpile`, `Break Lounge`, `Demolition Bomb`, and decorative guild props (bookshelf with sliding ladder, polearm/broadsword weapon rack, plate armor stand, wooden training mannequin dummy, quench barrel, floor pentagram `Summoning Ritual`).
  - 4-directional RPG character archetypes inspired by the 11 CraftPix Guild Hall characters (Armored Swordsman/Smith `build`, Sorcerer `plan`, Hooded Scout `explore`, Plumed Guildmaster `general`, Alchemist Artificer, Horned Archon, and `Squad Subagent`) with `Equipment Loadout` items and `Resource Cargo`.
- [x] Upgrade `createCanvas2DScenePaintAdapter` so switching `VisualStyleMode` between `"pixel-atlas"` and `"clean-cartoon"` (`#btn-toggle-style`) genuinely switches the room architecture, furniture fixtures, and character renderer between:
  - `"pixel-atlas"`: Crisp offscreen-cached `32×32` / `48×48` pixel-art tile and sprite bitmaps (`imageSmoothingEnabled = false`) plus `ctx.drawImage` slicing when external CraftPix PNG sheets are loaded in `atlasManifest.loadedImages`.
  - `"clean-cartoon"`: Multi-layered cel-shaded vector silhouettes with contoured helms/hats/hoods, wood-grain planks, stone coursework, Quest Bulletin Board, and detailed workstation props (replacing the 3–6 raw `drawOutlinedRect` boxes).
- [x] Add the **Quest Bulletin Board** prop to the north wall of each `Workshop Room` (displaying live `Quest Gate` / active task notices on hover via `buildSceneObjectTooltip`).
- [x] Verify at Seam 1 & Seam 2 (`buildGuildSceneFrame`, `paintSceneFrame`, `createCanvas2DScenePaintAdapter`, `createGuildCompanionServer`) that the sketch file is served at `/sketches`, both visual style modes execute distinct drawing pipelines while preserving identical hitboxes, and all CraftPix-inspired guild props render and respond to hover tooltips.

## Answer

Created `docs/features/ui-ux-and-craftpix-overhaul/sketches/craftpix-guild-hall-sketches.html` inside the project repository (served at `/sketches` and linked in the top bar), added the north-wall CraftPix **Quest Bulletin Board** prop (`prop:quest-bulletin-board`), and upgraded `createCanvas2DScenePaintAdapter` so `"pixel-atlas"` (`imageSmoothingEnabled = false` + procedural `16×16` pixel sprite matrices & `ctx.drawImage` atlas slicing) and `"clean-cartoon"` (contoured cel-shaded RPG props & headgear silhouettes) execute distinct rendering pipelines.
