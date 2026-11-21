# 02: Remove Synthetic Title/Skill Bug Monster Spawner in `canvas-wilds-painter.ts`

Type: task
Label: wayfinder:task
Status: resolved
Blocked by: 01

**What to build:** Remove the secondary `for (const ch of debugChars)` synthetic `debug-bug:${ch.sessionId}` monster-spawning loop in `deriveProjectBugMonsters` (`src/web/canvas-wilds-painter.ts`) so **Bug Monster**s only appear when `deriveBugMonsterEncounter` detects a real, un-vanquished failure or obstacle, building on [01: Vanquish Bug Monsters When Newer Test Runs Pass or Feature Tasks Complete](./01-vanquish-bug-monsters-on-newer-passing-tests-and-resolved-tasks.md).

**Blocked by:** [01: Vanquish Bug Monsters When Newer Test Runs Pass or Feature Tasks Complete](./01-vanquish-bug-monsters-on-newer-passing-tests-and-resolved-tasks.md)

**Status:** resolved

- [x] `deriveProjectBugMonsters` in `src/web/canvas-wilds-painter.ts` derives monsters strictly from `deriveBugMonsterEncounter` without fabricating extra `debug-bug:${ch.sessionId}` monsters from session titles or loaded skills.
- [x] When `deriveBugMonsterEncounter` returns no active encounters, `deriveProjectBugMonsters` returns `[]` and the **Dungeon Wilds** banner displays `🌫️ DUNGEON WILDS SHROUDED IN FOG OF WAR · AWAITING DEBUG HUNT`.
- [x] Automated unit tests verify that a character with `"bug"` or `"fix"` in its title or `diagnosing-bugs` in its `skillGrimoires` does not spawn a phantom **Bug Monster** when its latest tests are green.

## Answer

Updated `deriveProjectBugMonsters` in `src/web/canvas-wilds-painter.ts` to return `[]` immediately when a room's `taskProgress` is 100% resolved (`resolvedTasks >= totalTasks`) and `encounters.length === 0`, and excluded any character with a passing recent shell run (`evaluateRecentToolHealth(c.recentTools).hasPassingShellRun`) from `debugChars`.
