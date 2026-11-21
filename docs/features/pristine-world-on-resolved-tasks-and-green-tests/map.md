# Feature Map: Pristine World on Resolved Features & Passing Test Suites

Label: wayfinder:map

## Destination

Ensure that when a project's active feature tasks are 100% resolved (`resolvedTasks >= totalTasks`) or when a newer `bash`/`shell` test/build execution has passed after an earlier failure (`# fail 0` / `0 errors`), the `Project World` and `Dungeon Wilds` return to a pristine, peaceful state (`0` `Bug Monster`s, no phantom `debug-bug:` spawns from session titles or loaded `diagnosing-bugs` skills, and characters working indoors at their `Preparation Station`s or resting in the `Break Lounge`).

## Notes

- **Domain**: `Bug Monster` encounter derivation (`src/encounter/bug-monsters.ts`), `Workflow Intent` classification (`src/encounter/workflow-classifier.ts`), and `Dungeon Wilds` rendering (`src/web/canvas-wilds-painter.ts`).
- **Rules**: Strictly use the project root directory (`./`). Never create external worktrees or use `/tmp/opencode`. Always chart a Wayfinder map (`docs/features/<feature-slug>/map.md`). Keep every source file under 400 lines. Verify in the running Docker container on port `4310` with a headless Chrome screenshot saved to `docs/images/<task-name>.png` and inspected via `read`.
- **Skills to consult**: `codebase-design`, `domain-modeling`, `diagnosing-bugs`, `tdd`.

## Decisions so far

<!-- the index: one line per closed ticket, enough to judge relevance, then zoom the link for the detail the ticket holds -->

- [01: Vanquish Bug Monsters When Newer Test Runs Pass or Feature Tasks Complete](./issues/01-vanquish-bug-monsters-on-newer-passing-tests-and-resolved-tasks.md): Evaluated `recentTools` newest-first in `src/encounter/bug-monsters.ts` and `src/encounter/workflow-classifier.ts` so a newer passing `bash`/`shell` run clears older failures, strips `# fail 0` / `0 errors`, and ignores non-shell prose.
- [02: Remove Synthetic Title/Skill Bug Monster Spawner in `canvas-wilds-painter.ts`](./issues/02-remove-synthetic-title-and-skill-bug-monster-spawner.md): Returned `[]` in `deriveProjectBugMonsters` (`src/web/canvas-wilds-painter.ts`) when `taskProgress` is 100% resolved with `0` encounters and excluded characters with passing recent shell runs from `debugChars`.
- [03: Rebuild Docker Container & Verify Pristine World Visually on Port 4310](./issues/03-rebuild-docker-and-verify-pristine-world-visually.md): Rebuilt `opencode-pixel-guild-visualizer` on port `4310`, verified `117/117` passing tests, and captured `docs/images/pristine-world-verified.png`.

## Not yet specified

<!-- in-scope fog you can't ticket yet; graduates as the frontier advances -->

## Out of scope

- Deleting historical `recentTools` entries from the `Character Sheet` tool log.
- Changing how active, un-vanquished test failures or blocked permission `Quest Gate`s spawn `Bug Monster`s when a bug is genuinely present.
