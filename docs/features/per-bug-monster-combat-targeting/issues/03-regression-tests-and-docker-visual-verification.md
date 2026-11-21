# 03: Multi-Monster Combat Regression Tests & Live Docker Visual Verification

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01, 02

**What to build:** Lock down per-bug monster targeting with automated unit/integration regression tests and verify the fix on the live `opencode-pixel-guild-visualizer` Docker container on port `4310` with headless Chrome visual proof.

**Blocked by:** [01: Per-Session Bug Monster Ownership, Error Enrichment & Phantom Monster Deduplication](./01-per-session-bug-monster-ownership-and-deduplication.md), [02: Per-Lair Combat Perimeter Slot Routing & Inward Monster Facing](./02-per-lair-combat-slot-routing-and-inward-facing.md)

## Acceptance Criteria

- [x] Add regression tests in `tests/09-choreography-and-project-isolation.test.ts` and `tests/23-unified-host-guild-hall-and-project-heraldry.test.ts` verifying:
  1. **Single debugging character with tool/test failure**: `deriveProjectBugMonsters()` returns 1 monster (no phantom duplicate monster), and the character stands at `(1267, 384)` fighting it.
  2. **Multiple characters solving different bugs (same project or multi-project)**: `deriveProjectBugMonsters()` places each character's bug at its own lair (`LAIR_POSITIONS[0]`, `LAIR_POSITIONS[1]`, `LAIR_POSITIONS[2]`, `LAIR_POSITIONS[3]`), and `resolveCharacterTargetSlot` / `resolveToolRecordTargetSlot` / `stepClientChoreography` route Character 1 to Lair 0 `(1267, 384)`, Character 2 to Lair 1 `(1397, 274)`, Character 3 to Lair 2 `(1387, 499)`, and Character 4 to Lair 3 `(1167, 239)`—never crowding Lair 0 in the middle.
  3. **Parent Guild Adventurer + Child Squad Subagent solving the same bug**: Both target the same `NamedWildernessBug` lair and occupy distinct perimeter slots around that monster.
  4. **Per-monster `inCombat` isolation**: A monster whose owner is only gathering info at `Spyglass` has `inCombat === false` even while another character is fighting a different monster (`inCombat === true`) at another lair.
- [x] Verify all files under `src/` remain `<= 400` lines (`tests/00-architecture-invariants.test.ts`) and `npm test` passes 100%.
- [x] Deploy to the Docker container (`npm run docker:up` on port `4310`), capture `docs/images/per-bug-monster-combat-targeting.png` via headless Chrome, and visually inspect via `read`.

## Answer

Added comprehensive regression tests in `tests/09-choreography-and-project-isolation.test.ts` and `tests/23-unified-host-guild-hall-and-project-heraldry.test.ts`, verified all files under `src/` remain `<= 400` lines (`wilds-bug-targeting.ts`: 243 lines, `canvas-wilds-painter.ts`: 264 lines, `station-and-workflow-routing.ts`: 360 lines, `station-geometry-catalog.ts`: 384 lines), rebuilt and deployed the `opencode-pixel-guild-visualizer` Docker container on port `4310`, and captured and inspected `docs/images/per-bug-monster-combat-targeting.png`.

![Per-Bug Monster Combat Targeting — Live Container Screenshot](../../../images/per-bug-monster-combat-targeting.png)
