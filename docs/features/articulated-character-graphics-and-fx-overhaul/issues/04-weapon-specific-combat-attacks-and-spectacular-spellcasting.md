# 04: Weapon-Specific Combat Attacks (`SWORD`, `STAFF`, `BOW`, `DAGGER`, `PICKAXE`) & 6-Layer Spectacular Spellcasting

Type: task
Label: ready-for-agent
Status: resolved

**What to build:** Deliver the 5 unique **Combat Weapon Archetype** attack animations during **Debugging Hunt** combat in the **Dungeon Wilds** (`WARRIOR` broadsword cleave, `MAGE` crystal staff laser & homing bolts, `SCOUT` longbow riser grip & feathered arrow volley, `SAPPER` overhead pickaxe slam & ground shatter, and `ALCHEMIST` / `CLERIC` horizontal steel dagger viper thrust) plus the 6-layer `06 Enchanter's Study` spellcasting spectacle at the **Arcane Lectern** and **Summoning Ritual** across all 4 directions (`south`, `east`, `west`, `north`).

**Blocked by:** 03: Hand-Gripped Station Work Implements, Pure Vertical Up-Down Actions & Continuous Sparks

**Status:** resolved

- [x] **`WARRIOR` (`SWORD`)**: Right hand grips the Broadsword hilt at `(140, 186)` while left arm braces the Heater Shield, executing a vertical overhead-to-downward cleave (`translateY(-34px) rotate(-24deg)` to `translateY(8px) rotate(12deg)`) on the outside right with a multi-layer crimson/gold/white crescent slash wave and critical impact starburst.
- [x] **`MAGE` (`STAFF`)**: Right hand grips the Crystal Staff shaft at `(144, 184)`, channeling vertically while firing a **Focused Arcane Laser Beam & 3 Homing Astral Bolts** directly from the staff's top diamond crystal `(150, 48)` with a muzzle starburst.
- [x] **`SCOUT` (`BOW`)**: Right hand grips the curved wooden Longbow riser on the outside right `(141, 186)`, shooting a streaking feathered arrow through concentric emerald and gold sonic wind-vortex rings and speed wake lines.
- [x] **`ALCHEMIST` & `CLERIC` (`DAGGER`)**: Right hand grips a horizontal **Razor Steel Combat Dagger** at `(140, 186)` / `(144, 184)` pointing outward-right, executing a rapid **Horizontal Forward-Right Linear Viper Stab** (`translateX(-6px)` to `translateX(16px)`) into twin silver and gold piercing thrust cones and a critical cross-flash.
- [x] **`SAPPER` (`PICKAXE`)**: Right hand grips the Miner's Pickaxe extending outward-right to `(179, 186)` and executes a vertical overhead armor-cracker slam onto `(178, 212)` with seismic ground-shatter cracks and flying rock shards.
- [x] **6-Layer Spectacular Spellcasting (`spellcast`)**: Renders (1) Rising Arcane Mana Pillar, (2) 32-tick rotating Celestial Pentagram Mandala + counter-rotating inner sacred hexagram, (3) Perspective Ground Summoning Pentagram beneath the feet, (4) Twin swirling helical mana ribbons + awakened luminous caster eyes, (5) Levitating open **Skill Grimoire** with glowing script lines and rising sigils, and (6) 8-point radiant staff supernova burst + 3 crackling jagged arcane lightning arcs across `south`, `east`, `west`, and `north`.
- [x] Automated tests verify all 5 **Combat Weapon Archetype** bindings and the 6-layer `spellcast` geometry across all 4 directions.

## Answer

Implemented `resolveCombatWeaponArchetype` in `src/sprites/hero-party-catalog.ts` (`WARRIOR -> sword`, `MAGE -> staff`, `SCOUT -> bow`, `SAPPER -> pickaxe`, `ALCHEMIST & CLERIC -> dagger`), role-specific combat weapon grips in `src/sprites/hero-rig-arms-and-tools.ts`, and `buildSpellcastBackMandala` + `buildActionAndCombatFxOverlay` in `src/sprites/hero-rig-fx-and-combat.ts`.
