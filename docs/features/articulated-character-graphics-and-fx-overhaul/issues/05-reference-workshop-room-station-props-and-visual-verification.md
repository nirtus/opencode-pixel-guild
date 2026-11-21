# 05: 1:1 Reference Workshop Room Station Props & Full World Visual Verification

Type: task
Label: ready-for-agent
Status: resolved

**What to build:** Upgrade the **Workshop Room** perimeter **Preparation Station** fixtures on the live 2D canvas to match the `docs/examples/rooms/01..10` reference props, enforce all architecture and compile-time invariants (`<= 400` lines per file, 100% module reachability, clean `tsc --noEmit`), and capture live visual proof from port `4310`.

**Blocked by:** 04: Weapon-Specific Combat Attacks (`SWORD`, `STAFF`, `BOW`, `DAGGER`, `PICKAXE`) & 6-Layer Spectacular Spellcasting

**Status:** resolved

- [x] **Workshop Room** perimeter **Preparation Station**s render the approved reference room props: rolling wooden library ladder & open ruled manuscript at **Library Study Bookshelf**, accordion bellows & brick furnace & horned anvil with red-hot billet & quench barrel at **Anvil Forge**, clockwork owl & cobalt blueprint schematic table at **Crafting Workbench**, mounted shield wall & armor stands at **Armory Wardrobe**, rotating cyan pentagram rune circle & crystal ball pedestal & levitating tomes at **Arcane Lectern**, bubbling neon-emerald cauldron & coiled condenser at **Alchemy Lab**, and green armchair with sleeping orange cat & cartographer's globe in **Break Lounge**.
- [x] Every source file under `src/` is `<= 400` lines, 100% reachable from the server and web entrypoints, and passes `tsc --noEmit` and `npm test` with zero errors.
- [x] Live companion server / Docker container on port `4310` is verified with a headless Chrome screenshot saved to `docs/images/articulated-character-graphics-overhaul-live.png` and visually inspected via `read`.

## Answer

Upgraded `src/web/canvas-room-painter.ts` with reference station props (rolling library ladder, forge accordion bellows and glowing billet, clockwork owl with cyan lenses, and 5-pointed pentagram rune circle at the Arcane Lectern), verified all 122 tests and `<= 400` line ceiling across `src/`, and captured live visual proof in `docs/images/articulated-character-graphics-overhaul-live.png`.
