# 01: Vanquish Bug Monsters When Newer Test Runs Pass or Feature Tasks Complete

Type: task
Label: wayfinder:task
Status: resolved

**What to build:** Update `deriveBugMonsterEncounter` (`src/encounter/bug-monsters.ts`) and `classifyCharacterWorkflowIntent` (`src/encounter/workflow-classifier.ts`) to evaluate `recentTools` newest-first so a passing `bash`/`shell` run clears older historical failures, ignore `# fail 0` / `0 errors` summary lines and non-shell prose, and return `0` active **Bug Monster**s when a room's feature is 100% resolved with no active errors.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] A newer completed `bash`/`shell`/`terminal` run without failure markers supersedes older historical `recentTools` failures so `deriveBugMonsterEncounter` spawns `0` active monsters.
- [x] Benign summary strings (`# fail 0`, `0 failed`, `0 errors`, `fail: 0`) and prose outputs on `read`/`grep`/`subagent` tools do not count as tool/test failures.
- [x] When a room's `taskProgress` is 100% resolved (`totalTasks > 0 && resolvedTasks >= totalTasks`) and no tool is in `status === "error"` or blocked at a permission gate, `deriveBugMonsterEncounter` returns `0` active monsters.
- [x] Automated unit tests verify that passing a newer test run after an older failure clears `debugging-hunt` and vanquishes the **Bug Monster**.

## Answer

Added `isShellFailureOutput` and `seenPassingShellRun` newest-first evaluation in `src/encounter/bug-monsters.ts` and `evaluateRecentToolHealth` in `src/encounter/workflow-classifier.ts` so a newer passing `bash`/`shell` run supersedes older `recentTools` failures, strips `# fail 0` / `0 errors` summary text, and ignores non-shell prose on `read`/`subagent` tools.
