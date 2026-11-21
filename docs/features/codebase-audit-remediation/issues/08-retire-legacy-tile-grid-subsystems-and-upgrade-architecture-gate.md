# 08: Legacy 16x12 Tile-Grid Subsystem Retirement & Symbol-Level Architecture Reachability Gate

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 07

**What to build:** Retire the ~4,700 lines of disconnected 16×12 tile-grid scene, painter, spatial, encounter, station-sprite, and unused ingress adapter modules that are completely bypassed by the live dual-chamber `800×720` + `800×720` application, clean up the legacy test suites that only tested those retired modules, and upgrade the automated architecture invariant test to enforce symbol-level production reachability from the server and web entrypoints plus `tsc --noEmit` typechecking.

**Blocked by:** 07: In-Module Dead Code Removal, CSS Party Selector Completion & Strict TypeScript Contract Alignment

**Status:** resolved

## Acceptance Criteria

- [x] Every remaining source module under `src/` is strictly `<= 400` lines.
- [x] Disconnected 16×12 tile-grid scene builders, painters, and walker steppers are removed from `src/scene/`, retaining only the live camera and scene hit-testing functions and contracts.
- [x] Disconnected 16×12 tile-grid hauling routes, telemetry beams, station slot calculators, fog-of-war grids, station pixel sprite matrices, and unused ingress adapters (`plugin-adapter`, `demo-simulator-adapter`, `ingress-hub`) are removed from `src/`, and test-only Git fakes are moved out of production barrels.
- [x] The automated architecture invariant suite traces symbol-level reachability from the companion server and live web entrypoints (so unused modules hidden behind `export *` barrels fail the gate), enforces `tsc --noEmit` typechecking, and removes side-effectful `rmSync` calls from the repository hygiene check.
- [x] Obsolete test slices that only exercised deleted 16×12 tile-grid modules or brittle raw source substrings are pruned or migrated to behavioral seams, and cross-test `clientState` coupling is eliminated.
- [x] Project documentation (`README.md`, `GLOSSARY.md`, `docs/adr/`, and `docs/graphify-out/`) is updated, `npm test` passes 100%, and the final container build is visually verified on `opencode-pixel-guild-visualizer` (`npm run docker:up` on port `4310`) with screenshot proof in `docs/images/codebase-audit-remediation.png`.

## Answer

- **Retired Disconnected 16×12 Tile-Grid & Unused Ingress Modules**:
  - Removed 13 legacy tile-grid scene modules from `src/scene/` (`paint-headless.ts`, `paint-dispatcher.ts`, `walker-stepper.ts`, `frame-characters.ts`, `frame-fixtures.ts`, `frame-encounters.ts`, `canvas-adapter.ts`, `canvas-paint-grounds.ts`, `canvas-paint-props.ts`, `canvas-paint-stations.ts`, `canvas-paint-encounters.ts`, `canvas-paint-characters.ts`, `scene-atlas-tables.ts`), retaining only the live `camera.ts`, `frame-hit-test.ts`, and `scene-contracts.ts` exports.
  - Removed 3 legacy tile-grid spatial modules from `src/spatial/` (`hauling-routes.ts`, `telemetry-beams.ts`, `station-slots.ts`) and pruned dead exports (`computeSummoningRitualChoreography`, `computeReportScrollRoute`, `findTilePath`) while keeping `computeAdjacentSummonTile` and `resolveToWalkableTile`.
  - Removed `src/encounter/fog-of-war.ts` and pruned unused encounter/sprite/HUD exports (`createLanternFlare`, `updateLanternFlares`, `mutateBugMonster`, `applyCombatDamage`, `updateBugMonster`, `createGoalAssemblyHaulRoute`, `fitGoalAssemblyPart`, `composePluginAlcoveSprite`, `composeWorkstationSprite`, `buildTuiPluginSurface`, `buildTuiGuildSurfaceViewModel`, `buildPluginAlcoveTooltipViewModel`, `buildWorkshopRoomHeaderViewModel`, `buildRoomHeaderViewModel`).
  - Removed 3 unused ingress adapters (`plugin-adapter.ts`, `demo-simulator-adapter.ts`, `ingress-hub.ts`) and relocated test-only `in-memory-git-working-tree.ts` to `tests/in-memory-git-working-tree.ts`.
- **Upgraded Architecture Invariant Gate & Self-Contained Test Suites**:
  - Upgraded `tests/00-architecture-invariants.test.ts` to verify symbol-level production reachability across barrel-exported modules and forbid all retired files and dead exports.
  - Removed side-effectful `rmSync` calls from `verifyRepositoryPublicHygiene` in `tests/test-sandbox.ts`, made `tests/09-choreography-and-project-isolation.test.ts` self-contained without cross-test `clientState` coupling, and updated affected legacy test suites (`tests/01-*`, `tests/03-*`, `tests/04-*`, `tests/05-*`, `tests/06-*`, `tests/07-*`, `tests/08-*`, `tests/15-*`, `tests/26-*`, `tests/27-*`, `tests/31-*`, `tests/33-*`, `tests/45-*`).
