# 02: Spatial Layout Micro-Modules Decomposition (<250 Lines per File)

**What to build:**
Decompose `src/spatial/floorplan-layout.ts` (2,619 lines) into cohesive, single-responsibility submodules bounded strictly under 250 lines each behind a stable public facade (`src/spatial/index.ts`), keeping 100% of spatial tests passing.

**Blocked by:** 01: Core Domain Models, RPG Roles & Preparation Station Vocabulary.

**Status:** resolved

- [x] Extract `src/spatial/tile-grid.ts` (<150 lines): coordinate types, grid bounds, and cardinal offsets.
- [x] Extract `src/spatial/pathfinding-bfs.ts` (<180 lines): deterministic cardinal BFS pathfinding and walkable tile resolution.
- [x] Extract `src/spatial/station-slots.ts` (<200 lines): semicircle co-occupancy slot calculation.
- [x] Extract `src/spatial/furniture-descriptors.ts` (<220 lines): room lighting plans, wall torches, and partition walls.
- [x] Expose stable facade at `src/spatial/index.ts` preserving all existing external signatures without caller churn.
- [x] All spatial tests in `tests/03-floorplan-layout.test.ts` pass green.

## Comments
Resolved via decomposition into micro-modules under `src/spatial/` (`tile-grid.ts`, `pathfinding-bfs.ts`, `station-slots.ts`, `hauling-routes.ts`, `summoning-choreography.ts`, `telemetry-beams.ts`, `furniture-descriptors.ts`, `room-layout.ts`, `floorplan-aggregates.ts`, `floorplan-packing.ts`, `index.ts`). 69/69 automated tests pass green.
