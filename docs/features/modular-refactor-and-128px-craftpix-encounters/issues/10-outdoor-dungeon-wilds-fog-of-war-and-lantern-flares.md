# 10: Outdoor Dungeon Wilds, Dynamic Fog of War & Lantern Flares

**What to build:**
Generate the outdoor Dungeon Wilds terrain beyond the workshop room's north iron gate, shrouded in a dense Fog of War. When diagnostic and exploratory tools run (`grep`, `glob`, `read`, `diagnose`), emit expanding Lantern Flares with particle effects that burn away circular patches of fog, uncovering footprints and monster tracks leading to creature lairs.

**Blocked by:** 07: Wall-Aligned Preparation Stations & Dungeon Iron Gate Layout.

**Status:** resolved

- [x] Implement `src/encounter/fog-of-war.ts` (<180 lines): 2D byte grid covering the Dungeon Wilds (`0 = hidden`, `1 = explored`, `2 = visible`).
- [x] Implement `src/encounter/lantern-flares.ts` (<190 lines): radial light pulses cast by diagnostic tool calls, clearing fog tiles.
- [x] Uncover physical clue sprites (slime footprints, broken code runes, claw marks) in cleared fog clearings.
- [x] Connect smooth cardinal pathing through the north Iron Dungeon Gate between indoor workshop and outdoor wilderness.

## Comments
Resolved with `src/encounter/fog-of-war.ts` (87 lines) providing 2D visibility matrix and `src/encounter/lantern-flares.ts` (107 lines) casting diagnostic tool light pulses with lair track discovery. All 75 automated tests pass green.
