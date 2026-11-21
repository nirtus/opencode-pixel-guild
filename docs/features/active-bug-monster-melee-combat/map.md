# Feature Map: Active Bug Monster Melee Combat & Elimination of Wilderness Wandering

Label: wayfinder:map

## Destination

Deliver active, locked-on melee combat in the `Dungeon Wilds` (`docs/features/active-bug-monster-melee-combat/spec.md`) so that whenever a character in a `Debugging Hunt` turn has an active `Bug Monster` on the field, they walk directly to melee range in front of that monster's lair (`bugWorldX - 48, bugWorldY + 4`), face the monster, and continuously fight it (`station = "Combat"`, `bug.inCombat = true`, `"Fighting Bug"` overhead pill across canvas and HUD, weapon lunge strikes, slash arcs, and impact sparks) instead of wandering around `WildsSearch` waypoints.

## Notes

- **Domain**: `Dungeon Wilds` encounter choreography, `Bug Monster` melee positioning, `Overhead Action Label` parity, and 2D Canvas combat animations.
- **Rules**: Strictly use the project root directory (`./`). Never create external worktrees or use `/tmp/opencode`. Always chart a Wayfinder map (`docs/features/<feature-slug>/map.md`). Keep every source file under 400 lines. Verify in the running Docker container on port `4310` with a headless Chrome screenshot saved to `docs/images/<task-name>.png` and inspected via `read`.
- **Skills to consult**: `codebase-design`, `domain-modeling`, `tdd`.

## Decisions so far

<!-- the index: one line per closed ticket, enough to judge relevance, then zoom the link for the detail the ticket holds -->

- [01: Route Debugging Characters Directly to `"Combat"` When a Bug Monster Is Active & Stop Wandering](./issues/01-route-debugging-characters-to-active-bug-monster-melee-combat.md): Routed `debugging-hunt` characters to `station = "Combat"` whenever `hasActiveRoomBug` is true, removed the 4.5s `WildsSearch` wandering loop, set `inCombat = true` on active **Bug Monster**s, and returned `"Fighting Bug"` whenever `station === "Combat"`.
- [02: Lock Melee Positioning to Target Bug Monster Lair, Orient Hero Facing & Enhance Combat Strikes](./issues/02-melee-combat-lair-positioning-facing-and-impact-fx.md): Positioned `"Combat"` characters at melee range (`800 + lair.x - 48, lair.y + 4`) directly in front of their target **Bug Monster**, oriented `facingLeft = false`, and added melee body lunges and slash arcs.
- [03: Rebuild Docker Container & Verify Live Bug Monster Melee Combat Visually](./issues/03-live-docker-rebuild-and-combat-visual-proof.md): Rebuilt the Docker container stack on port `4310`, verified `116/116` tests pass, and captured `docs/images/active-bug-monster-melee-combat.png`.

## Not yet specified

<!-- in-scope fog you can't ticket yet; graduates as the frontier advances -->

## Out of scope

- Turn-based RPG menus or manual player-controlled combat attacks.
- Changing indoor `Preparation Station` choreography for `Feature Build` or `Information Gathering` turns.
