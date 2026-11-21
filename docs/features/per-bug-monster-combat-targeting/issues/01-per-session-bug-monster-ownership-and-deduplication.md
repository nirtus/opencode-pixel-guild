# 01: Per-Session Bug Monster Ownership, Error Enrichment & Phantom Monster Deduplication

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: none

**What to build:** Extract wilderness bug derivation and targeting into a single-responsibility module `src/web/wilds-bug-targeting.ts` (re-exported by `src/web/canvas-wilds-painter.ts` to keep all files well under 400 lines) and bind each `NamedWildernessBug` to its owning `sessionId`, `assignedSessionIds`, `projectId`, and `lairIndex` so that each bug-hunting session spawns and enriches its own monster without creating a duplicate phantom monster at `LAIR_POSITIONS[0]`.

## Acceptance Criteria

- [x] Create `src/web/wilds-bug-targeting.ts` (<250 lines) and re-export `LAIR_POSITIONS`, `NamedWildernessBug`, `deriveProjectBugMonsters`, `resolveTargetBugMonsterForCharacter`, `buildCombatLairPerimeterSlots`, and `allocateCombatMonsterPerimeterSlot` from `src/web/canvas-wilds-painter.ts` so `canvas-wilds-painter.ts` drops below 270 lines and all existing imports continue to work seamlessly.
- [x] Extend `NamedWildernessBug` with `ownerSessionId: string | null`, `assignedSessionIds: ReadonlyArray<string>`, `projectId: string`, and `lairIndex: number`.
- [x] Fix `deriveProjectBugMonsters()` so that:
  - A single debugging session (`debugChars`) with a tool error or failing test (`deriveBugMonsterEncounter` / `evaluateRecentToolHealth`) produces **1** `NamedWildernessBug` (enriching that session's monster tier/species/title) rather than spawning an unlinked monster at `LAIR_POSITIONS[0]` plus a second `debug-bug:${sessionId}` monster at `LAIR_POSITIONS[1]`.
  - Multiple independent debugging sessions (`ses_1`, `ses_2`, `ses_3`, `ses_4`) each spawn their own `NamedWildernessBug` at `LAIR_POSITIONS[0..3]` with `ownerSessionId === ch.sessionId`.
  - A child **Squad Subagent** (`c.parentId` / `c.parentSessionId`) whose parent session already owns an active `NamedWildernessBug` (and shares the parent's debugging context or when the 4 lairs are full) attaches to the parent monster's `assignedSessionIds` instead of spawning a redundant monster; if the parent is not in `debugChars` (e.g., an orchestrator summoning two subagents for two distinct bugs), each subagent owns its own `NamedWildernessBug`.
  - Each `NamedWildernessBug`'s `inCombat` flag is `true` only when at least one character assigned to that specific monster is actively fighting it in `"Combat"`.
  - Update `src/web/ledger-panel-reconciler.ts` so the `👾 Dungeon Wilds Threat` card summarizes all active `bugs` rather than only `bugs[0]`.

## Answer

Created `src/web/wilds-bug-targeting.ts` (243 lines) and re-exported its symbols from `src/web/canvas-wilds-painter.ts` (264 lines). Bound each `NamedWildernessBug` to `ownerSessionId`, `assignedSessionIds`, `projectId`, and `lairIndex`, merged tool-error/test-failure severity directly into the owning session's monster to eliminate duplicate middle monsters, attached helping child **Squad Subagents** to their parent monster's `assignedSessionIds`, and scoped `inCombat` per monster.
