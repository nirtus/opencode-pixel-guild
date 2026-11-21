# 03: Rebuild Docker Container & Verify Live Bug Monster Melee Combat Visually

Type: task
Label: wayfinder:task
Status: resolved
Blocked by: 01, 02

**What to build:** Rebuild and restart the `opencode-pixel-guild-visualizer` Docker container on port `4310` after [01: Route Debugging Characters Directly to `"Combat"` When a Bug Monster Is Active & Stop Wandering](./01-route-debugging-characters-to-active-bug-monster-melee-combat.md) and [02: Lock Melee Positioning to Target Bug Monster Lair, Orient Hero Facing & Enhance Combat Strikes](./02-melee-combat-lair-positioning-facing-and-impact-fx.md), run the full test suite (`npm test`), and capture + visually inspect `docs/images/active-bug-monster-melee-combat.png` confirming the debugging character is actively fighting the **Bug Monster** in melee range.

**Blocked by:** [01: Route Debugging Characters Directly to `"Combat"` When a Bug Monster Is Active & Stop Wandering](./01-route-debugging-characters-to-active-bug-monster-melee-combat.md), [02: Lock Melee Positioning to Target Bug Monster Lair, Orient Hero Facing & Enhance Combat Strikes](./02-melee-combat-lair-positioning-facing-and-impact-fx.md)

**Status:** resolved

- [x] `docker compose up --build -d` updates the running container on port `4310`.
- [x] All automated tests (`npm test`) pass with 0 failures and all files in `src/` remain `<= 400` lines.
- [x] Headless Chrome screenshot `docs/images/active-bug-monster-melee-combat.png` is captured from `http://127.0.0.1:4310/` and visually inspected via `read`, confirming the character is standing right in front of the **Bug Monster** fighting it with `"Fighting Bug"`.

## Answer

Rebuilt and restarted `opencode-pixel-guild-visualizer:latest` on port `4310` via `docker compose up --build -d`, verified `116/116` passing tests in `npm test`, and captured + visually inspected `docs/images/active-bug-monster-melee-combat.png` confirming the debugging character stands at melee range `(1267, 384)` directly in front of the **Bug Monster** with the red `"Fighting Bug"` overhead pill, sword lunges, and matching `"Fighting Bug"` status in the **Guild Master Ledger**.
