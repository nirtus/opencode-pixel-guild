# Feature Map: Live Canvas Station Unification & Ghost Station Removal

Label: ready-for-agent

## Destination

Eliminate all ghost stations (`Drafting Table`, `Archive Radar`, `Comms Dish`, `Reactor Console`, `Altar of Compaction`, `Plugin Alcove`, `WALL_PREPARATION_STATIONS`, and `EXTENDED_STATION_CATALOG`) so that **only the stations painted on the live web canvas** (`Library Study Bookshelf`, `Observatory Spyglass`, `Anvil Forge`, `Crafting Workbench`, `Armory Wardrobe`, `Arcane Lectern`, `Alchemy Lab`, `Resource Stockpile`, `Goal Assembly Site`, `Break Lounge`, `Demolition Bomb`, and `Dungeon Wilds`) exist across capability classification, the world state reducer, **Resource Cargo**, **Equipment Loadout**, canvas hitboxes, and spectator HUD tooltips ([Specification](./spec.md)):

1. **[01: Expand Station Catalog & Transfer Capability Classifier to Live Canvas Stations](./issues/01-expand-station-catalog-and-transfer-capability-classifier.md)** (`Blocked by: None`)
2. **[02: Migrate World State Reducer, Equipment Loadout & Workflow Routing to Live Stations](./issues/02-migrate-world-reducer-equipment-loadout-and-workflow-routing.md)** (`Blocked by: 01`)
3. **[03: Unify Canvas Station Hitboxes & Spectator HUD Tooltips](./issues/03-unify-canvas-station-hitboxes-and-spectator-hud-tooltips.md)** (`Blocked by: 02`)
4. **[04: Contract & Delete Ghost Stations Across Spatial, Scene, Simulator & Tests](./issues/04-contract-and-delete-ghost-stations-across-spatial-scene-and-tests.md)** (`Blocked by: 01, 02, 03`)

## Notes

- **Domain terms (`GLOSSARY.md`)**: **Preparation Station**, **Armory Wardrobe**, **Arcane Lectern**, **Resource Stockpile**, **Resource Cargo**, **Goal Assembly Site**, **Break Lounge**, **Demolition Bomb**, **Dungeon Wilds**, **Compaction Exhalation**, **Equipment Loadout**, **Skill Grimoire**, **Summoning Ritual**.
- **Explicit User Transfer Rule**:
  - `Ghost 1 (Drafting Table)` $\rightarrow$ Split between **`Library Study Bookshelf`** (`read`, `list`, `ls`) and **`Crafting Workbench`** (`edit`, `write`, `multiedit`, `apply_patch`, `notebookedit`).
  - `Ghost 2 (Archive Radar)` $\rightarrow$ Transfer to **`Library Study Bookshelf`** (`grep`, `glob`, `lsp`, `codesearch`), with exploration-class / `Debugging Hunt` recon still routing to **`Observatory Spyglass`** / **`Dungeon Wilds`**.
  - `Ghost 3 (Comms Dish)` $\rightarrow$ Transfer to **`Observatory Spyglass`** (`webfetch`, `websearch`, `fetch`).
  - `Ghost 4 (Reactor Console)` $\rightarrow$ Split between **`Alchemy Lab`** (`execute` / Code Mode) and **`Arcane Lectern`** (`subagent`, `task`, `batch`, `todowrite`, `todoread`, `agent`).
  - `Ghost 5 (Plugin Alcove)` $\rightarrow$ Transfer to **`Resource Stockpile`** (`mcp:*`, `plugin:*`, single-namespace `execute(tools.<ns>)`).
  - `Ghost 6 (Altar of Compaction)` $\rightarrow$ In-place **`Compaction Exhalation`** on `session.compacted`; explicit `compact`/`summarize` tools transfer to **`Alchemy Lab`**.
  - `Ghost 7 (skill on Arcane Lectern)` $\rightarrow$ Transfer `skill` tool and `@skill` prompt attachment to **`Armory Wardrobe`**.
  - `Ghost 8 (WALL_PREPARATION_STATIONS & EXTENDED_STATION_CATALOG)` $\rightarrow$ Delete outright.
- **Container Deployment Rule**: Must be deployed and verified on `opencode-pixel-guild-visualizer` (`npm run docker:up` on port `4310`) with headless Chrome screenshot verification (`docs/agents/container-deployment.md`).

## Decisions so far

- [Specification: Live Canvas Station Unification & Ghost Station Removal](./spec.md): Unify `WorkstationKind` and `PreparationStationDisplayName` around the 12 live web canvas stations and sequence the removal via 4 expand–contract tickets (`01`..`04`).
- [01: Expand Station Catalog & Transfer Capability Classifier to Live Canvas Stations](./issues/01-expand-station-catalog-and-transfer-capability-classifier.md): Expanded `WORKSTATION_CATALOG` around the 12 live canvas stations and transferred `classifyCapability`, `resolveResourceCargo`, and `resolveCanonicalPreparationStation` (including `Archive Radar` $\rightarrow$ `Library Study Bookshelf`).
- [02: Migrate World State Reducer, Equipment Loadout & Workflow Routing to Live Stations](./issues/02-migrate-world-reducer-equipment-loadout-and-workflow-routing.md): Migrated `WORKSTATION_WEAPON_META`, `resolveToolCategory`, `positionAtArmoryWardrobe`, and `resolveCharacterTargetSlot` to live canvas stations.
- [03: Unify Canvas Station Hitboxes & Spectator HUD Tooltips](./issues/03-unify-canvas-station-hitboxes-and-spectator-hud-tooltips.md): Unified `buildWorkstationTooltip`, `STOCKPILE_CRATE_CATALOG`, and `populateDualChamberSceneHitboxes` so every station tooltip matches its true occupants and recent calls without ghost station names.
- [04: Contract & Delete Ghost Stations Across Spatial, Scene, Simulator & Tests](./issues/04-contract-and-delete-ghost-stations-across-spatial-scene-and-tests.md): Deleted all ghost station literals across `src/` and `tests/`, verified `npm test` (215/215 passing), and deployed/verified on `opencode-pixel-guild-visualizer` (`docs/images/live-canvas-station-unification.png`).

## Not yet specified

*(None — all station transfer mappings and testing seams are specified in `spec.md` and tickets `01..04`.)*

## Out of scope

- Altering painted station coordinates in `src/web/canvas-station-painter.ts` or changing **Dungeon Wilds** combat rules.
