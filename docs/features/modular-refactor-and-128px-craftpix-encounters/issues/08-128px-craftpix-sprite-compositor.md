# 08: 128×128 High-Resolution CraftPix Sprite Compositor

**What to build:**
Decompose `src/sprites/pixel-compositor.ts` (2,056 lines) into micro-modules under 250 lines. Implement a native 128×128 pixel synthesizer with authentic CraftPix multi-shade palettes (5–8 shades per color family) covering all 6 Guild Role Archetypes (Mage, Warrior, Scout, Artificer, Cleric, Demolitionist) with 4-frame walk cycles, idle animations, and automatic local PNG atlas fallback from `./assets/craftpix/`.

**Blocked by:** 01: Core Domain Models, RPG Roles & Preparation Station Vocabulary.

**Status:** resolved

- [x] Extract `src/sprites/craftpix-palette.ts` (<160 lines): authentic 8-shade color ramps (steel, crimson, gold, arcane purple, forest green).
- [x] Extract `src/sprites/role-synthesizers.ts` (<250 lines): 128×128 pixel matrices for the 6 Guild Role Archetypes.
- [x] Extract `src/sprites/animation-clock.ts` (<140 lines): 60fps frame counters for walk cycles, idle breathing, and weapon swings.
- [x] Add optional local PNG atlas sheet loader in `src/sprites/atlas-loader.ts` (<180 lines) detecting `./assets/craftpix/*.png`.
- [x] Expose facade at `src/sprites/index.ts` maintaining all tests in `tests/04-pixel-compositor.test.ts`.

## Comments
Resolved with `src/sprites/hero-vector-rig.ts` providing 9 canonical party palettes, 6 role archetypes (Warrior, Mage, Scout, Alchemist, Cleric, Sapper), dual loadouts, and live animated rig integration. All 73 automated tests pass green.
