# Feature Specification: Pristine World on Resolved Features & Passing Test Suites

Label: ready-for-agent

## Problem Statement

Even when a project's feature tickets are 100% resolved (`resolvedTasks >= totalTasks`) and the latest `npm test` / shell run has passed with zero errors (`# fail 0`), the visualizer continues to spawn named **Bug Monster**s and keep characters in a **Debugging Hunt** state in the **Dungeon Wilds** for three reasons:
1. `deriveBugMonsterEncounter` (`src/encounter/bug-monsters.ts`) and `classifyCharacterWorkflowIntent` (`src/encounter/workflow-classifier.ts`) scan all 12 historical items in `char.recentTools` without stopping when a newer `bash`/`shell` run (`recentTools[0]`) has already passed, and without checking if the room's feature is 100% resolved.
2. `deriveProjectBugMonsters` (`src/web/canvas-wilds-painter.ts`) contains a secondary loop that fabricates a synthetic `debug-bug:${ch.sessionId}` **Bug Monster** whenever a session's title contains words like `"bug"`/`"fix"`/`"issue"` or has `diagnosing-bugs` in `skillGrimoires`, even when `deriveBugMonsterEncounter` returned `0` real errors.
3. `ERROR_OUTPUT_REGEX` matches the bare word `"error"` on non-shell tools (`read`, `grep`, `subagent` prose) and on green summary lines (`# fail 0`, `0 errors`).

## Solution

1. **Clear Prior Shell Failures Once a Newer Shell/Test Command Passes & Respect Completed Features (`src/encounter/bug-monsters.ts`)**:
   - Inspect `char.recentTools` in newest-first order (`recentTools[0]` first): once a completed `bash`/`shell`/`terminal` execution has passed cleanly without test failure markers, stop counting older `bash`/`shell`/`terminal` failures from earlier in the 12-item history.
   - Ignore benign zero-failure summary phrases (`# fail 0`, `0 failed`, `0 errors`, `fail: 0`) when matching failure output.
   - When a room's active feature is 100% resolved (`taskProgress.totalTasks > 0 && taskProgress.resolvedTasks >= taskProgress.totalTasks`) and no character has an active tool in `status === "error"` or an open permission **Quest Gate**, return `0` active **Bug Monster**s so the **Dungeon Wilds** is pristine.
2. **Eliminate Synthetic Title/Skill Bug Monsters & False-Positive Workflow Intent (`src/web/canvas-wilds-painter.ts` & `src/encounter/workflow-classifier.ts`)**:
   - Remove the secondary `for (const ch of debugChars)` synthetic monster-spawning loop in `deriveProjectBugMonsters` (`src/web/canvas-wilds-painter.ts`) so **Bug Monster**s only appear when `deriveBugMonsterEncounter` detects a real, un-vanquished failure/obstacle.
   - In `classifyCharacterWorkflowIntent` (`src/encounter/workflow-classifier.ts`), only count `recentTools` errors that have not been superseded by a newer passing `bash`/`shell` run, restrict output-preview error regexes to `status === "error"` or `bash`/`shell`/`test` tools (ignoring `# fail 0` / `0 errors`), and only apply `DEBUG_SKILL_PATTERNS` / `DEBUG_TITLE_REGEX` when the room does not have a 100%-resolved feature with a clean latest test run.

## User Stories

1. As a spectator, I want the **Dungeon Wilds** to be completely pristine (`0` **Bug Monster**s) once a newer `bash`/`shell` test run passes after an earlier test failure, so that fixing a bug and passing tests visibly vanquishes the monster as promised by the domain model.
2. As a spectator, I want a **Project World** whose active feature tasks are 100% resolved (`resolvedTasks >= totalTasks`) and has no active tool errors or blocked permission gates to have `0` **Bug Monster**s, so that a completed feature leaves the world clean and peaceful.
3. As a spectator, I want reading a file or receiving a `subagent` report that mentions the word `"error"` or `"# fail 0"` to never spawn a false-positive **Bug Monster** or flip a `Feature Build` turn into `Debugging Hunt`.
4. As a spectator, I want characters who have finished fixing a bug and passed their tests to return indoors to their **Preparation Station**s (or rest in the **Break Lounge** when idle) instead of remaining outside in the **Dungeon Wilds** fighting phantom monsters.

## Implementation Decisions

1. **Newest-First Unresolved Failure Evaluation**:
   - A helper `hasUnresolvedTestOrToolFailure(recentTools)` iterates `recentTools` from index `0` (newest) to oldest:
     - If a `bash`/`shell`/`terminal` tool is `status === "completed"` and its `outputPreview` does not match real failure markers (after stripping `# fail 0`, `0 errors`, `0 failed`), any older `bash`/`shell`/`terminal` failures at higher indices are considered resolved/vanquished.
     - Only `status === "error"` tools (not superseded by a newer passing run of the same tool/shell) or unresolved `bash`/`shell`/`terminal` failure outputs count as active failures.
2. **Single Source of Bug Monsters (`deriveBugMonsterEncounter`)**:
   - `deriveProjectBugMonsters` in `src/web/canvas-wilds-painter.ts` maps strictly from `deriveBugMonsterEncounter` without appending synthetic `debug-bug:${ch.sessionId}` monsters based on session titles or loaded skills.

## Testing Decisions

1. **Encounter & Classifier Regression Seam**:
   - Verify that when `recentTools[1]` is a failed test (`"not ok 1 - test failed"`) and `recentTools[0]` is a newer passing test (`"# tests 116\n# pass 116\n# fail 0"`), `deriveBugMonsterEncounter` returns `[]` (or `"defeated"` when `previousMonsters` is passed) and `classifyCharacterWorkflowIntent` returns `"feature-build"`.
   - Verify that `subagent` or `read` outputs containing prose with `"error"` or `"# fail 0"` do not spawn **Bug Monster**s.
2. **Live Docker Container Verification**:
   - Rebuild the container on port `4310`, capture `docs/images/pristine-world-verified.png` via headless Chrome, and visually confirm with `read` that the completed feature leaves the **Dungeon Wilds** pristine (`0` **Bug Monster**s) and the character indoors.

## Out of Scope

- Removing historical tool entries from the **Character Sheet** log.
