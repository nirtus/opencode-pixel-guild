# 02: Per-Lair Combat Perimeter Slot Routing & Inward Monster Facing

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01

**What to build:** Route every character in `station === "Combat"` (`resolveCharacterTargetSlot` and `resolveToolRecordTargetSlot` in `src/web/station-and-workflow-routing.ts`) to the perimeter slots surrounding the specific `NamedWildernessBug` they are solving (`LAIR_POSITIONS[0..3]`), and orient their facing direction toward their target monster's lair center.

**Blocked by:** [01: Per-Session Bug Monster Ownership, Error Enrichment & Phantom Monster Deduplication](./01-per-session-bug-monster-ownership-and-deduplication.md)

## Acceptance Criteria

- [x] Implement `buildCombatLairPerimeterSlots(lairX: number, lairY: number)` and `allocateCombatMonsterPerimeterSlot(...)` in `src/web/wilds-bug-targeting.ts` so each of the 4 wilderness lairs (`LAIR_POSITIONS[0..3]`) has its own 6-slot combat perimeter centered on `(800 + lairX, lairY)`:
  - Slot 0 (primary melee west of monster): `{ x: 800 + lairX - 48, y: lairY + 4, facingDirection: "east", side: "west" }`
  - Slots 1–5 (flanking positions around `(800 + lairX, lairY)` for multiple characters fighting the same monster, with inward `facingDirection`).
- [x] In `src/web/station-and-workflow-routing.ts`, update both `resolveCharacterTargetSlot` and `resolveToolRecordTargetSlot` so that when `station === "Combat"`, the character resolves their target monster via `resolveTargetBugMonsterForCharacter(c, deriveProjectBugMonsters())` and allocates their combat slot around **that monster's lair** (`SlotClaim:Combat:${targetBug.id}:`), rather than `PREPARATION_STATION_GEOMETRY_CATALOG.Combat` (`(1315, 380)`).
- [x] When Character A is solving Bug 0 (`LAIR_POSITIONS[0]`) and Character B is solving Bug 1 (`LAIR_POSITIONS[1]`), Character A stands at Slot 0 of Lair 0 `(800 + 515 - 48 = 1267, 380 + 4 = 384)` and Character B stands at Slot 0 of Lair 1 `(800 + 645 - 48 = 1397, 270 + 4 = 274)`—each directly in front of their own monster.
- [x] When two characters (such as a parent **Guild Adventurer** and its child **Squad Subagent**) are fighting the *same* monster at Lair `k`, the first takes Slot 0 and the second takes Slot 1 of Lair `k`.
- [x] Update `resolveInwardStationFacing` in `src/web/station-geometry-catalog.ts` so that when `station === "Combat"`, it resolves facing against the nearest lair center `(800 + lair.x, lair.y)` in `LAIR_POSITIONS` rather than always `(1315, 380)`.
- [x] In `src/web/canvas-hero-painter.ts`, ensure `combatLungeX` lunges toward the monster (`-7px` if `facingDirection === "west"` on an east-flank slot, `+7px` otherwise).

## Answer

Added `LAIR_POSITIONS` and `buildCombatLairPerimeterSlots` to `src/web/station-geometry-catalog.ts`, parameterized `allocateStationPerimeterSlot` with `customSlots`, `customFocalCenter`, and `customStationKey` (`Combat:${targetBug.id}`), and wired `allocateCombatMonsterPerimeterSlot` into `resolveCharacterTargetSlot` and `resolveToolRecordTargetSlot` in `src/web/station-and-workflow-routing.ts`. Updated `resolveInwardStationFacing("Combat")` to orient toward the nearest lair in `LAIR_POSITIONS` and made `combatLungeX` direction-aware in `src/web/canvas-hero-painter.ts`.
