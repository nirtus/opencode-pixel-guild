# Feature Map: Per-Bug Monster Ownership, Deduplication & Lair-Specific Combat Targeting

Label: wayfinder:map

## Destination

Fix **Dungeon Wilds** multi-monster combat targeting (`docs/features/per-bug-monster-combat-targeting/spec.md`) so that:
1. Every **Bug Monster** in `deriveProjectBugMonsters()` is explicitly bound to the `sessionId` (and any helping child **Squad Subagents**) solving that defect—eliminating phantom duplicate middle monsters when a session has both a tool/test error and a debugging title.
2. Every **Guild Character** in `station === "Combat"` (`resolveCharacterTargetSlot`, `resolveToolRecordTargetSlot`, and `stepClientChoreography`) walks to and fights the specific **Bug Monster** they are solving at that monster's own lair (`LAIR_POSITIONS[0..3]`) rather than all characters fighting the middle monster at `LAIR_POSITIONS[0]`.

## Notes

- **Domain**: `Dungeon Wilds` encounter derivation (`NamedWildernessBug`), per-lair combat perimeter geometry (`LAIR_POSITIONS`), and character-to-monster combat slot routing.
- **Rules**: Strictly work inside the project root directory (`./`). Never create git worktrees or use `/tmp/opencode`. Keep every source file `<= 400` lines (`tests/00-architecture-invariants.test.ts`). Deploy and verify on the `opencode-pixel-guild-visualizer` Docker container on port `4310` and capture visual proof in `docs/images/per-bug-monster-combat-targeting.png`.
- **Skills to consult**: `diagnosing-bugs`, `codebase-design`, `tdd`.

## Decisions so far

<!-- the index: one line per closed ticket, enough to judge relevance, then zoom the link for the detail the ticket holds -->

- [01: Per-Session Bug Monster Ownership, Error Enrichment & Phantom Monster Deduplication](./issues/01-per-session-bug-monster-ownership-and-deduplication.md): Extracted `src/web/wilds-bug-targeting.ts` (243 lines), bound each `NamedWildernessBug` to `ownerSessionId`, `assignedSessionIds`, `projectId`, and `lairIndex`, merged tool-error/test-failure severity into the owning session's monster to eliminate duplicate middle monsters, and scoped `inCombat` per monster.
- [02: Per-Lair Combat Perimeter Slot Routing & Inward Monster Facing](./issues/02-per-lair-combat-slot-routing-and-inward-facing.md): Added `buildCombatLairPerimeterSlots(lairX, lairY)` and `allocateCombatMonsterPerimeterSlot` so each character in `station === "Combat"` routes to the perimeter slots around the specific `NamedWildernessBug` they (or their parent session) are solving (`SlotClaim:Combat:${targetBug.id}:`) and faces inward toward that monster's lair.
- [03: Multi-Monster Combat Regression Tests & Live Docker Visual Verification](./issues/03-regression-tests-and-docker-visual-verification.md): Locked down single-session deduplication, 4-lair multi-monster routing (`(1267, 384)`, `(1397, 274)`, `(1387, 499)`, `(1167, 239)`), parent+subagent shared-monster flanking, and per-monster `inCombat` isolation in `tests/09` and `tests/23`, and verified on the live `opencode-pixel-guild-visualizer` Docker container on port `4310`.

## Not yet specified

<!-- in-scope fog you can't ticket yet; graduates as the frontier advances -->

## Out of scope

- Changing indoor `Preparation Station` perimeter slots or non-debugging workflows.
