# Feature Map: Full-Floor 2D Roaming Circuits, Multi-Directional Transit Paths, Dynamic Detour Bypass & Screen-Size Proportional Choreography

Label: wayfinder:map

## Destination

Deliver the complete architectural deepening and spatial choreography specification in [Specification: Full-Floor 2D Roaming Circuits, Multi-Directional Transit Paths, Dynamic Detour Bypass & Screen-Size Proportional Choreography](./spec.md) through three vertical-slice implementation tickets:
1. **[01: Screen-Size Proportional Chamber Geometry & Full-Floor 2D Thinking Roaming Circuits](./issues/01-proportional-chamber-geometry-and-2d-thinking-roam.md)** (`Blocked by: None`)
2. **[02: Multi-Directional (Diagonal / Dogleg / Arc) Station Transits & Multi-Lair Wilderness Routing](./issues/02-multi-directional-transit-paths-and-wilds-lair-routing.md)** (`Blocked by: 01`)
3. **[03: Dynamic Detour Walk-Around Bypass, Elliptical Clearance & Container Visual Verification](./issues/03-dynamic-detour-walk-around-and-elliptical-clearance.md)** (`Blocked by: 01, 02`)
4. **[04: Fix Same-Station & Same-Monster Collision Thrashing, Detour Orbiting & CPU Spike](./issues/04-fix-station-and-monster-collision-thrashing-and-cpu-spike.md)** (`Blocked by: 01, 02, 03`)

## Notes

- **Mode**: Wayfinder charting & specification complete (`map.md`, `spec.md`, and tickets `01..03` created; `GLOSSARY.md` updated).
- **Architecture Review Reference**: [Architecture Review — Walkable Floor Space, 2D Path Variety & Non-Occlusion](../../architecture-review/architecture-review-walkable-space-choreography.html).
- **Domain**: **Guild Floorplan**, **Workshop Room**, **Dungeon Wilds**, **Toil Queue**, **Goal Assembly Site**, **Preparation Station**, **Bug Monster**.
- **Specification**: [Feature Specification](./spec.md).
- **Skills to consult**: `codebase-design`, `domain-modeling`, `tdd`, `code-review`.
- **Standing Rules**: Work strictly inside the project root directory (`./`). Never create git worktrees or write files to `/tmp` or `/tmp/opencode`. Every source file in `src/` must remain `<= 400` lines. Deploy and verify on the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`) with visual proof in `docs/images/`.

## Decisions so far

- [Specification: Full-Floor 2D Roaming Circuits, Multi-Directional Transit Paths, Dynamic Detour Bypass & Screen-Size Proportional Choreography](./spec.md): Locked all five Grilling Round 1 decisions (`Q1–Q5`) and updated `GLOSSARY.md` (`Guild Floorplan` and `Toil Queue`):
  1. Deepen `Thinking` roaming into 4-to-6 waypoint 2D circuits mixing horizontal, vertical, and diagonal legs across all four open floor plazas (**North Esplanade**, **East Grand Plaza**, **West Promenade**, and **South Commons**) with session-seeded 2D coordinate offsets so no two characters share a 1D line.
  2. Deepen `computeRingCorridorWaypoints` and `compileCharacterToilQueue` so seeded unobstructed walks (`> 85px`) generate distinct 2-to-3 waypoint diagonal, dogleg, or curved-arc floor routes, fan out Armory/Stockpile stops across perimeter slots, and expand `Dungeon Wilds` into 10-waypoint 2D scouting loops and multi-lair `Combat` slots.
  3. Adapt obstacle bounds, roaming plazas, and elliptical personal-space separation (`48×36 px` rendered clearance) proportionally to `(chamberWidth, chamberHeight, wildsWidth)` across all screen sizes and chamber focus modes.
  4. Replace backward radial collision push-back with **Dynamic Detour Waypoint Injection** (`resolveDynamicDetourWaypoints`) and tangential separation so colliding characters smoothly walk around each other without ever negating each other's forward walking progress.
- [01: Screen-Size Proportional Chamber Geometry & Full-Floor 2D Thinking Roaming Circuits](./issues/01-proportional-chamber-geometry-and-2d-thinking-roam.md): Created `src/web/thinking-roam-circuits.ts` with `ChamberProportionalContext`, `resolveProportionalAssemblyObstacleBox`, `resolveThinkingRoamCircuit`, `assignThinkingRoamTarget`, and `advanceThinkingRoamLeg`, generating 5-waypoint 2D roaming circuits (horizontal, vertical, and diagonal legs) across all four open floor plazas.
- [02: Multi-Directional (Diagonal / Dogleg / Arc) Station Transits & Multi-Lair Wilderness Routing](./issues/02-multi-directional-transit-paths-and-wilds-lair-routing.md): Extracted `src/encounter/corridor-router.ts` with `computeUnobstructedSeededLeg` generating 2-to-3 waypoint diagonal, dogleg, and arc routes on seeded unobstructed walks (`> 85px`), fanned out `Armory` and `Stockpile` stops across their 6 perimeter slots in `compileCharacterToilQueue`, and expanded `WILDS_SEARCH_WAYPOINTS` to 10 waypoints across the Dungeon Wilds.
- [03: Dynamic Detour Walk-Around Bypass, Elliptical Clearance & Container Visual Verification](./issues/03-dynamic-detour-walk-around-and-elliptical-clearance.md): Implemented `resolveDynamicDetourWaypoints` (`52px` right-hand bypass in rendered chamber pixels), `stripBackwardPush`, and proportional elliptical clearance (`46×34px` / `36px` collision separation) in `src/web/walker-separation.ts`, added `tests/30-diverse-2d-paths-and-proportional-choreography.test.ts`, and verified on the `opencode-pixel-guild-visualizer` Docker container (`docs/images/diverse-2d-paths-and-proportional-choreography.png`).
- [04: Fix Same-Station & Same-Monster Collision Thrashing, Detour Orbiting & CPU Spike](./issues/04-fix-station-and-monster-collision-thrashing-and-cpu-spike.md): Pinned settled station/combat characters (`weight = 0`, `bothNearDistinctSlots` exemption when `targetSep >= 22`), exempted final slot approach (`<= 62px`) and destination neighbors from detour/steering deflection, replaced per-frame moving detour recomputation with a one-shot fixed detour waypoint, and verified zero position drift and zero walking thrash in `tests/30-diverse-2d-paths-and-proportional-choreography.test.ts` and on the live Docker container (`docs/images/same-station-and-monster-collision-fix.png`).

## Not yet specified

<!-- All wayfinder fog has graduated into spec.md and tickets 01..03 -->

## Out of scope

- Changing character sprite dimensions (`72×85` base, `0.70x` subagent scale) or base walk speeds (`155 px/s` transit, `77.5 px/s` thinking-pacing).
- Modifying non-canvas HUD drawer tabs (`General`, `Hero`, `Ticker`).
