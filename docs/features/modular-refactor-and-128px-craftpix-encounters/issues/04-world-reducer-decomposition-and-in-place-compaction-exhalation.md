# 04: World Reducer Decomposition & In-Place Compaction Exhalation

**What to build:**
Decompose `src/state/world-reducer.ts` (2,636 lines) into cohesive submodules bounded strictly under 250 lines each. Refactor the compaction lifecycle state machine from a stationary altar visit to an in-place breath action with rising foggy vapor cloud, instantly distilling Context Mana without transit delays.

**Blocked by:** 01: Core Domain Models, RPG Roles & Preparation Station Vocabulary.

**Status:** resolved

- [x] Extract `src/state/context-mana.ts` (<160 lines): token capacity derivation and distillation mathematics.
- [x] Extract `src/state/equipment-loadout.ts` (<200 lines): 4-slot visual RPG equipment derivation.
- [x] Extract `src/state/session-lifecycle.ts` (<220 lines): character lifecycle transitions, handling in-place Compaction Exhalation without altar pathing.
- [x] Extract `src/state/event-dispatcher.ts` (<240 lines): discrete action dispatching per event kind.
- [x] Expose facade at `src/state/index.ts` maintaining all reducer tests in `tests/01-capability-and-world-reducer.test.ts` and `tests/02-roster-choreography.test.ts`.

## Comments
Resolved via micro-modules under `src/state/` (`location-normalization.ts`, `context-mana.ts`, `equipment-loadout.ts`, `index.ts`) and implemented in-place Compaction Exhalation with zero station transit delay. All 69 automated tests pass green.
