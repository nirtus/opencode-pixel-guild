# Ticket 03: Implement Seamless Open-Plan Guildhall & 1:1 Compact (0.40×) Station Painters Without Static Titles

Type: `task`
Label: `ready-for-agent`
Status: resolved
Blocked by: 01, 02

## Description

1. Extract 1:1 reference station painting helpers into `src/web/canvas-station-painter.ts` (keeping both `canvas-room-painter.ts` and `canvas-station-painter.ts` well under the 400-line ceiling).
2. Paint the **Seamless Open-Plan Guildhall (`Variant 1A`)** in `src/web/canvas-room-painter.ts`:
   - Continuous staggered oak-plank floor (`#96653f` / `#8b5c38` / `#9e6c45`), coursed brick perimeter walls, 3 paned north windows casting angled warm daylight shafts, rounded chiseled-stone hearth pad under the NE Smithy Forge, soft radial ambient light pools, East Wilderness iron archway gate, and South swinging guild door with dashed swing arc.
   - Paint all 8 compact perimeter stations (`Library Study Bookshelf` from `01`, `Observatory Spyglass` from `05`, `Anvil Forge` from `02`, `Crafting Workbench` from `10`, `Arcane Lectern` from `06`, `Resource Stockpile` from `04/05/07`, `Alchemy Lab` from `04`, and `Demolition Bomb`) at **60% smaller (`0.40×`) footprints** along the perimeter walls, plus `Armory Wardrobe` (`07`) and `Break Lounge` (`09` hearth, round quest-map table & `01` sleeping orange cat).
3. Remove all permanent static station title labels (`drawStationLabel`) from the stations on the Workshop Room canvas.
