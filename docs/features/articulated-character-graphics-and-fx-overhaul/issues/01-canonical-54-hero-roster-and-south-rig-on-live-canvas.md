# 01: 1:1 Canonical 54-Hero Roster & South-Facing Articulated Rig on Live Canvas

Type: task
Label: ready-for-agent
Status: resolved

**What to build:** Replace the dumbed-down pill character painter on the live 2D canvas with an end-to-end vertical tracer bullet that resolves every **Guild Adventurer** and **Squad Subagent** to the canonical 54-hero roster (9 guild parties × 6 **Guild Role Archetype**s) and renders their exact 1:1 `220×260` front-facing (`south`) character rig—including authentic hair, ears, rosy blushes, colored iris + pupil + dual-catchlight eyes, facial expressions, beards, headgear, role outfits, back-gear (cape, arrow-packed quiver, wooden alchemist backpack & vials, sacred halo, dynamite bundle), hand-gripped Loadout A / Loadout B weapons, walking stride, and offscreen frame-bucket bitmap caching.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] All 9 canonical guild parties (`Emberfall Vanguard` through `Stormcrest Legion`) and their 54 named heroes (`WARRIOR`, `MAGE`, `SCOUT`, `ALCHEMIST`, `CLERIC`, `SAPPER`) are defined and deterministically resolved per session and role.
- [x] Every character on the live 2D canvas renders with the exact 1:1 `docs/examples/characters/` anatomy (omitting the portrait card backdrop circle on the floor while keeping the elliptical ground shadow and Cleric sacred halo).
- [x] Every held weapon or relic in `idle` and `walk` (`Loadout A` and `Loadout B`) has its handle anchored through the hand center (`(80, 186)` left / `(140, 186)` right) with the hand `<circle>` drawn on top of the handle so nothing levitates.
- [x] Animated rig frames are cached in a bounded LRU offscreen bitmap cache (`8` phase buckets per animation cycle) and blitted via `drawImage` at 60 FPS alongside selection glow, overhead `?`/`!` **Quest Gate** badges, 1–3 word **Overhead Action Label** pills, and name plates.
- [x] Automated tests verify deterministic 54-hero trait resolution, 1:1 rig generation across all 6 roles, and `<= 400` lines per source file.

## Answer

Implemented `CANONICAL_PARTY_ROSTERS` (9 guild parties × 6 roles = 54 named heroes) and `resolveCanonicalHeroTraits(sessionId, role, partyKey)` in `src/sprites/hero-party-catalog.ts`, `buildSouthAnatomyLayers` in `src/sprites/hero-rig-anatomy.ts`, `buildHandGrippedArmsAndCargo` in `src/sprites/hero-rig-arms-and-tools.ts`, and `buildArticulatedHeroSvg` in `src/sprites/hero-vector-rig.ts`. Wired bounded LRU image caching and fallback-free phase-bucket blitting into `src/web/canvas-hero-painter.ts`.
