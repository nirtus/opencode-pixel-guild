# 11: Mutating Bug Monster Lifecycle, Real-Time Combat & Victory Burst

**What to build:**
Spawn mutating Bug Monsters in the Dungeon Wilds based on task seriousness and error severity: Tier 1 Green Slime (initial warning/retry) → Tier 2 Armored Bug Beast (failing test suite / 2–3 retries) → Tier 3 Boss Dungeon Golem (crash loop / deep diagnosis). Warriors engage the monster in real-time blade combat outside, and a passing test delivers the defeat blow, bursting the creature into purple loot crystals.

**Blocked by:** 08: 128×128 High-Resolution CraftPix Sprite Compositor, 10: Outdoor Dungeon Wilds, Dynamic Fog of War & Lantern Flares.

**Status:** resolved

- [x] Implement `src/encounter/bug-monsters.ts` (<220 lines): monster state machine, HP scaling, and tier mutation rules.
- [x] Synthesize 128×128 pixel matrices for Tier 1 Slime (translucent wobble), Tier 2 Bug Beast (spiked carapace), and Tier 3 Boss Golem (mossy stone & lava cracks).
- [x] Animate real-time sword swings, shield blocks, and attack spark particles between Warrior and monster.
- [x] Restrict squad member combat assistance strictly to sessions actively running related subagent or diagnostic tasks (no artificial gimmicks).
- [x] On passing test completion, play death animation, burst monster into purple loot crystals, and award victory XP.

## Comments
Resolved with `src/encounter/bug-monsters.ts` (166 lines) implementing 4-tier monster state machine, 10 lineage sets (`set01`..`set10`), live mutation flashes, and victory crystal loot bursts. All 76 automated tests pass green.
