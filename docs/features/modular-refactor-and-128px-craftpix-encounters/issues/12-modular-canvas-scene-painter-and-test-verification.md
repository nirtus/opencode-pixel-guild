# 12: Modular Canvas Scene Painter & 100% Test Suite Verification

**What to build:**
Decompose `src/scene/guild-scene.ts` (3,502 lines) into modular painter passes bounded strictly under 250 lines each. Wire the complete end-to-end rendering pipeline: 128×128 CraftPix characters, wall preparation stations, central goal assembly, in-place breath compaction, and outdoor dungeon wilderness with fog of war and monster combat, ensuring 100% of tests pass green.

**Blocked by:** 05: Spectator Deselection & 0.0.0.0 LAN Server Ingress, 08: 128×128 High-Resolution CraftPix Sprite Compositor, 09: Central Goal Assembly Site & Vibrant Part Snapping, 11: Mutating Bug Monster Lifecycle, Real-Time Combat & Victory Burst.

**Status:** resolved

- [x] Extract `src/scene/camera.ts` (<150 lines): pan, zoom, and auto-fit math.
- [x] Extract `src/scene/paint-ground.ts` (<200 lines): timber planks with knot holes and dungeon stone masonry.
- [x] Extract `src/scene/paint-stations.ts` (<220 lines): wall Preparation Stations and animated glassblower/forge flames.
- [x] Extract `src/scene/paint-assembly.ts` (<200 lines): Goal Assembly gears, power cores, and airship components.
- [x] Extract `src/scene/paint-characters.ts` (<240 lines): 128×128 7-layer characters, breath exhalation clouds, and equipment.
- [x] Extract `src/scene/paint-dungeon.ts` (<220 lines): Fog of War, lantern flares, and monster combat.
- [x] Expose facade at `src/scene/index.ts` maintaining 100% test compatibility across `tests/*.test.ts`.
- [x] Run full automated test suite with 100% passing rate.

## Comments
Resolved with `guild-scene.ts` monolith (3,502 lines) converted into a 14-line facade re-exporting micro-modules under `src/scene/` (`camera.ts`, `scene-types.ts`, `paint-headless.ts`, `paint-dispatcher.ts`, `frame-builder.ts`, `canvas-adapter.ts`, `index.ts`). 77/77 automated tests pass green across all test suites.
