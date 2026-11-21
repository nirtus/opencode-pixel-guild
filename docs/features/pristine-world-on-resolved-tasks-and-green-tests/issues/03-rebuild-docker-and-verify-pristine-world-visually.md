# 03: Rebuild Docker Container & Verify Pristine World Visually on Port 4310

Type: task
Label: wayfinder:task
Status: resolved
Blocked by: 01, 02

**What to build:** Rebuild and restart the `opencode-pixel-guild-visualizer` Docker container on port `4310` after [01: Vanquish Bug Monsters When Newer Test Runs Pass or Feature Tasks Complete](./01-vanquish-bug-monsters-on-newer-passing-tests-and-resolved-tasks.md) and [02: Remove Synthetic Title/Skill Bug Monster Spawner in `canvas-wilds-painter.ts`](./02-remove-synthetic-title-and-skill-bug-monster-spawner.md), verify `npm test` passes 100%, and capture + visually inspect `docs/images/pristine-world-verified.png` confirming that once all tasks are resolved and tests pass, the **Dungeon Wilds** is pristine (`0` **Bug Monster**s) and characters remain indoors.

**Blocked by:** [01: Vanquish Bug Monsters When Newer Test Runs Pass or Feature Tasks Complete](./01-vanquish-bug-monsters-on-newer-passing-tests-and-resolved-tasks.md), [02: Remove Synthetic Title/Skill Bug Monster Spawner in `canvas-wilds-painter.ts`](./02-remove-synthetic-title-and-skill-bug-monster-spawner.md)

**Status:** resolved

- [x] `docker compose up --build -d` updates the running container on port `4310`.
- [x] All automated tests (`npm test`) pass with `0` failures and all files in `src/` remain `<= 400` lines.
- [x] Headless Chrome screenshot `docs/images/pristine-world-verified.png` is captured from `http://127.0.0.1:4310/?project=opencode-game-visualizer` and visually inspected via `read`, confirming `0` **Bug Monster**s in the **Dungeon Wilds** (`SHROUDED`) and `3/3 (100%)` on the **Goal Assembly Site**.

## Answer

Rebuilt and restarted `opencode-pixel-guild-visualizer:latest` on port `4310` via `docker compose up --build -d`, verified `117/117` passing tests (`0` failures), and captured + visually inspected `docs/images/pristine-world-verified.png` confirming `0` **Bug Monster**s in the **Dungeon Wilds** (`SHROUDED`) and `3/3 (100%)` on the **Goal Assembly Site**.
