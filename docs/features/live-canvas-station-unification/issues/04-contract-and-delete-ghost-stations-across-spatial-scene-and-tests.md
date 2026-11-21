# 04: Contract & Delete Ghost Stations Across Spatial, Scene, Simulator & Tests

**What to build:** Complete the expand–contract migration by deleting all ghost station literals and dead catalogs (`Drafting Table`, `Archive Radar`, `Comms Dish`, `Reactor Console`, `Altar of Compaction`, `Plugin Alcove`, `WALL_PREPARATION_STATION_KINDS`, `WALL_PREPARATION_STATIONS`, `EXTENDED_STATION_CATALOG`, and `buildPreparationStationTooltip`) across domain types, spatial/scene helpers, simulator presets, and tests, then deploy and verify on the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`).

**Blocked by:** 01: Expand Station Catalog & Transfer Capability Classifier to Live Canvas Stations, 02: Migrate World State Reducer, Equipment Loadout & Workflow Routing to Live Stations, 03: Unify Canvas Station Hitboxes & Spectator HUD Tooltips

**Type:** task
**Label:** ready-for-agent
**Status:** resolved

- [x] `CORE_WORKSTATION_KINDS`, `WORKSTATION_KINDS`, and `ROOM_FIXTURE_KINDS` in `src/types/station-catalog.ts` contain only the live web canvas stations; `Drafting Table`, `Archive Radar`, `Comms Dish`, `Reactor Console`, `Altar of Compaction`, and `Plugin Alcove` are completely removed.
- [x] `WALL_PREPARATION_STATION_KINDS`, `WallPreparationStationKind`, `WALL_PREPARATION_STATIONS`, `EXTENDED_STATION_CATALOG`, and `buildPreparationStationTooltip` are deleted.
- [x] Spatial, scene, sprite matrix, and **Demo Guild Simulator** preset modules reference only the unified live canvas stations, and every file under `src/` remains `<= 400` lines (`tests/00-architecture-invariants.test.ts`).
- [x] All unit and integration tests in `tests/` are updated and pass (`npm test`).
- [x] Changes are deployed to the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`), verified healthy, and visually inspected via headless Chrome screenshot in `docs/images/live-canvas-station-unification.png`.

## Answer

Deleted all ghost station literals (`Drafting Table`, `Archive Radar`, `Comms Dish`, `Reactor Console`, `Altar of Compaction`, `Plugin Alcove`), `WALL_PREPARATION_STATION_KINDS`, `WALL_PREPARATION_STATIONS`, `EXTENDED_STATION_CATALOG`, and `buildPreparationStationTooltip` across `src/` and `tests/`. Deployed to the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`), verified all 215 tests pass (`npm test`), and visually inspected `docs/images/live-canvas-station-unification.png`.
