# 01: Core Domain Models, RPG Roles & Preparation Station Vocabulary

**What to build:**
Establish the pure domain models, type definitions, and catalog entries for the 6 Guild Role Archetypes (Mage, Warrior, Scout, Artificer, Cleric, Demolitionist), perimeter Preparation Stations (Library Bookshelf, Anvil Forge, Observatory Spyglass, Crafting Bench, Arcane Lectern), in-place Compaction Exhalation, central Goal Assembly states, and 3-tier Bug Monsters. All domain files are strictly bounded under 200 lines each.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] Define the 6 Guild Role Archetypes in `types/domain.ts` mapped to OpenCode agent classes and active tools.
- [x] Define Wall Preparation Station descriptors and coordinates replacing generic Workstations.
- [x] Formalize `CompactionExhalation` lifecycle states, removing static altar transit dependencies.
- [x] Formalize `GoalAssemblyState` (unbuilt bleak parts vs. fitted vibrant parts across 3 tiers).
- [x] Formalize `BugMonsterState` across 3 seriousness tiers (Tier 1 Green Slime, Tier 2 Bug Beast, Tier 3 Boss Golem).

## Comments
Resolved via TDD in `tests/07-core-domain-and-roles.test.ts` and `src/types/domain.ts`. 69/69 automated tests pass.
