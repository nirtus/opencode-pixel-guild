# Feature Specification: Per-Bug Monster Ownership, Deduplication & Lair-Specific Combat Targeting

Label: ready-for-agent

## Problem Statement

When one or more **Guild Characters** (**Guild Adventurers** or **Squad Subagents**) are fixing bugs in the **Dungeon Wilds** (`workflowIntent === "debugging-hunt"` and `station === "Combat"`), spectators observe two compounding defects:

1. **All fighting characters always walk to and fight the same Bug Monster in the middle (`LAIR_POSITIONS[0]` at `(515, 380)` / world `(1315, 380)`)**: Even when there are 2, 3, or 4 **Bug Monsters** spawned across the **Dungeon Wilds** (`LAIR_POSITIONS[0..3]`), every character in `station === "Combat"` crowds around the middle monster at `(1315, 380)` instead of walking to the **Bug Monster** they are actually solving.
2. **Duplicate phantom middle monster for a single debugging session**: When a debugging character has an active tool error or failing test, `deriveBugMonsterEncounter()` spawns a monster at `LAIR_POSITIONS[0]` (the middle lair) titled via `deriveBugMonsterTitle()` (e.g. `"[TAG] TestFail Goblin"`), and then the second loop in `deriveProjectBugMonsters()` fails to deduplicate it against `ch.title` (e.g. `"[TAG] Fix login bug"`) and spawns a *second* monster (`id: "debug-bug:${ch.sessionId}"`) at `LAIR_POSITIONS[1]`. The character then fights the generic middle monster at `LAIR_POSITIONS[0]` while their own named monster sits unengaged at `LAIR_POSITIONS[1]` (yet still shakes with `inCombat = true` because `inCombat` is set globally via `debugChars.length > 0`).

## Root-Cause Diagnosis (`@diagnosing-bugs`)

### 1. Hardcoded Single-Lair Combat Geometry (`src/web/station-geometry-catalog.ts` & `src/web/station-and-workflow-routing.ts`)
- In `src/web/canvas-wilds-painter.ts` (lines 71–73), up to 4 **Bug Monsters** are placed at distinct wilderness lairs (translated by `ox = 800` in world coordinates):
  - Lair `0` (Middle): `(515, 380)` → world `(1315, 380)`
  - Lair `1` (Upper-Right): `(645, 270)` → world `(1445, 270)`
  - Lair `2` (Lower-Right): `(635, 495)` → world `(1435, 495)`
  - Lair `3` (Upper-Left): `(415, 235)` → world `(1215, 235)`
- However, in `src/web/station-geometry-catalog.ts` (lines 222–233), `PREPARATION_STATION_GEOMETRY_CATALOG.Combat` defines a single static station with `focalCenter: { x: 1315, y: 380 }` and all 6 `perimeterSlots` clustered around `(1315, 380)` (`LAIR_POSITIONS[0]`, the middle monster).
- Both `resolveCharacterTargetSlot` (`src/web/station-and-workflow-routing.ts` line 336) and `resolveToolRecordTargetSlot` (`src/web/station-and-workflow-routing.ts` line 98) allocate `"Combat"` slots from `PREPARATION_STATION_GEOMETRY_CATALOG.Combat` without consulting which `NamedWildernessBug` the character is solving.
- Furthermore, `resolveInwardStationFacing("Combat", slotX, slotY)` (`src/web/station-geometry-catalog.ts` line 250) computes facing relative to `spec.focalCenter` (`(1315, 380)`), which would orient characters at Lairs `1..3` toward the middle monster instead of their own monster.

### 2. Missing Session Ownership & Broken Deduplication in `deriveProjectBugMonsters` (`src/web/canvas-wilds-painter.ts`)
- In `src/web/canvas-wilds-painter.ts` (lines 132–147), Loop 1 iterates over `encounters` from `deriveBugMonsterEncounter()`. Line 134 reads `(enc.sessionId ? snap.characters?.[enc.sessionId] : undefined)`, but `BugMonsterState` (`src/encounter/bug-monsters.ts`) has `combatTargetSessionId`, not `sessionId`. Thus `enc.sessionId` is always `undefined`.
- Loop 1 formats `bugName` from `enc.bugTitle` (`deriveBugMonsterTitle(tier, bugSourceHint)`, which outputs PascalCase + Species like `"[GAME-VIZ] AssertionError Slime"`), and pushes it at `LAIR_POSITIONS[0]` without recording `ownerSessionId`.
- Loop 2 (`for (const ch of debugChars)`, lines 150–171) formats `bugLabel` from `ch.title` (e.g. `"[GAME-VIZ] Fix Canvas Flicker …"`) and attempts to deduplicate via `b.bugName.toLowerCase() === bugLabel.toLowerCase() || b.bugName.toLowerCase().includes(rawLabel.toLowerCase())`. Because `enc.bugTitle` and `ch.title` have different formats, deduplication fails, spawning a duplicate monster at `LAIR_POSITIONS[1]` for the same character.
- Finally, Loop 1 sets `inCombat: enc.phase === "in-combat" || debugChars.length > 0` and Loop 2 hardcodes `const inCombat = true;`, causing every monster on the map to shake and render combat slash arcs even when no character is fighting that specific monster.

## Solution

1. **Extract Single-Responsibility Wilderness Bug Targeting Module (`src/web/wilds-bug-targeting.ts`)**:
   - Keep every file under the strict 400-line ceiling by extracting `LAIR_POSITIONS`, `NamedWildernessBug`, `deriveProjectBugMonsters`, `resolveTargetBugMonsterForCharacter`, `buildCombatLairPerimeterSlots`, and `allocateCombatMonsterPerimeterSlot` into `src/web/wilds-bug-targeting.ts` (and re-exporting `LAIR_POSITIONS`, `NamedWildernessBug`, and `deriveProjectBugMonsters` from `src/web/canvas-wilds-painter.ts`).
2. **Explicit Per-Session Bug Ownership & Deduplication (`NamedWildernessBug`)**:
   - Extend `NamedWildernessBug` with:
     - `ownerSessionId: string | null`
     - `assignedSessionIds: ReadonlyArray<string>`
     - `projectId: string`
     - `lairIndex: number` (`0..3`)
   - In `deriveProjectBugMonsters()`:
     - Group active debugging sessions (`debugChars`) and any non-question QuestGate / tool-error sessions by their bug-solving unit:
       - Each root **Guild Adventurer** (or independent **Squad Subagent** whose parent is not already represented in `bugs` or that has a distinct bug quest title while under the 4-lair cap) owns its own `NamedWildernessBug` at `LAIR_POSITIONS[lairIndex]`.
       - Any child **Squad Subagent** (`parentId` / `parentSessionId`) helping its parent session solve the same bug (or when all 4 lairs are occupied) joins its parent monster's `assignedSessionIds` rather than spawning a duplicate monster.
       - Tool failure / error severity from `evaluateRecentToolHealth` and `deriveBugMonsterEncounter` enriches the owning session's monster (`tier`, `monsterName`, `role`, `file`, `scale`) instead of spawning an unlinked phantom monster in the middle (`LAIR_POSITIONS[0]`).
     - Compute `inCombat` per monster: `inCombat` is `true` on a `NamedWildernessBug` if and only if at least one character in `assignedSessionIds` (or matching that bug) is actively in `station === "Combat"` (fixing/testing the bug).
3. **Per-Lair Combat Perimeter Slot Allocation & Inward Facing**:
   - For any character resolving to `station === "Combat"` in `resolveCharacterTargetSlot` or `resolveToolRecordTargetSlot`:
     - Resolve the character's target `NamedWildernessBug` via `resolveTargetBugMonsterForCharacter(c, activeBugs)` using strict priority:
       1. Direct session match (`bug.ownerSessionId === c.sessionId` or `bug.assignedSessionIds.includes(c.sessionId)` or `bug.id === "debug-bug:${c.sessionId}"`)
       2. Parent session lineage (`c.parentId` / `c.parentSessionId` matches `bug.ownerSessionId` or `bug.assignedSessionIds`)
       3. Child session lineage (`(c.childSessionIds ?? []).some(cid => bug.ownerSessionId === cid || bug.assignedSessionIds.includes(cid))`)
       4. Same project (`bug.projectId === characterProjectId`)
       5. Fallback to `activeBugs[0]` (or `LAIR_POSITIONS[0]` `(515, 380)` when `activeBugs` is empty).
     - Allocate the character's melee combat slot from `buildCombatLairPerimeterSlots(targetBug.x, targetBug.y)` scoped to that specific monster (`Combat:${targetBug.id}` / `SlotClaim:Combat:${targetBug.id}:`):
       - Primary attacker (Slot 0) stands at melee range directly in front of their monster: `(800 + targetBug.x - 48, targetBug.y + 4)` facing `"east"`.
       - Additional attackers on the *same* monster (e.g. a parent Adventurer + helping Squad Subagent) occupy the flanking perimeter slots around `(800 + targetBug.x, targetBug.y)` (`Slot 1: (-43, -32)`, `Slot 2: (-43, +36)`, `Slot 3: (0, -54)`, `Slot 4: (0, +56)`, `Slot 5: (+47, +4)`).
   - Update `resolveInwardStationFacing("Combat", slotX, slotY)` in `src/web/station-geometry-catalog.ts` to find the nearest lair center `(800 + lair.x, lair.y)` across `LAIR_POSITIONS` so characters at any of the 4 lairs always face inward toward the monster they are fighting.

## User Stories

1. As a spectator watching two or more **Guild Characters** fixing different bugs simultaneously, I want each character to walk to and fight the specific **Bug Monster** they are solving at its own lair (`LAIR_POSITIONS[0..3]`), rather than all characters crowding around the middle monster (`LAIR_POSITIONS[0]`).
2. As a spectator watching a single **Guild Character** fix a bug that triggered a test failure or tool error, I want only one **Bug Monster** spawned for that character's bug, rather than a duplicate phantom monster in the middle and an unengaged second monster on the side.
3. As a spectator watching a parent **Guild Adventurer** and its child **Squad Subagent** collaborate on the same bug fix, I want both characters to surround and fight their shared **Bug Monster** at the same lair without overlapping.
4. As a spectator, I want only **Bug Monsters** that are actively being fought by at least one character to display `inCombat` hit-shake and golden slash arcs, while monsters whose owners are still gathering clues at the `Observatory Spyglass` remain in their discovered idle state.

## Testing & Verification Decisions

1. **Unit & Integration Regression Tests (`tests/09-choreography-and-project-isolation.test.ts` & `tests/23-unified-host-guild-hall-and-project-heraldry.test.ts`)**:
   - Verify that when 2–4 characters are fixing different bugs (across the same project or multiple projects), `deriveProjectBugMonsters()` assigns each character's bug to a distinct lair (`LAIR_POSITIONS[0..3]`) with `ownerSessionId === c.sessionId`, and `resolveCharacterTargetSlot` / `resolveToolRecordTargetSlot` / `stepClientChoreography` route each character to `(800 + bug.x - 48, bug.y + 4)` at their own monster's lair (`facingDirection === "east"`, `facingLeft === false`).
   - Verify that a single debugging character with a failing shell/tool run spawns exactly 1 **Bug Monster** (no duplicate phantom middle monster).
   - Verify that a child **Squad Subagent** helping its parent **Guild Adventurer** on the same bug targets the parent's **Bug Monster** lair and takes the next flanking perimeter slot around that same monster.
2. **Docker Container Deployment & Visual Proof (`opencode-pixel-guild-visualizer` on port `4310`)**:
   - Deploy via `npm run docker:up`, run `npm test`, capture `docs/images/per-bug-monster-combat-targeting.png` via headless Chrome, and inspect via `read`.

## Visual Proof

![Per-Bug Monster Combat Targeting — Split Room & Dungeon Wilds](../../images/per-bug-monster-combat-targeting.png)

