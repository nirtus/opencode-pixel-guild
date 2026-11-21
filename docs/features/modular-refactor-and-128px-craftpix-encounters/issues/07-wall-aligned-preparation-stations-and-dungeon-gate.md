# 07: Wall-Aligned Preparation Stations & Dungeon Iron Gate Layout

**What to build:**
Reorganize the Workshop Room interior with wall-aligned Preparation Stations reflecting real OpenCode tasks: Library Bookshelf along north wall (`read`), Anvil Forge along east wall (`bash`), Window Observatory Spyglass beside daylight windows (`websearch`), Crafting Bench along west wall (`edit`/`write`), Arcane Lectern in southwest corner (`skill`), and a reinforced Iron Dungeon Gate on the north wall leading outdoors to the Dungeon Wilds.

**Blocked by:** 06: Project World Top Bar Switcher & Widescreen Spatial Packing.

**Status:** resolved

- [x] Place `Library Study Bookshelf` along north wall at `{x: 2..5, y: 1}`.
- [x] Place `Anvil Forge` along east wall at `{x: 14, y: 3..5}`.
- [x] Place `Observatory Spyglass` beside perimeter window at `{x: 10, y: 1}`.
- [x] Place `Crafting Bench` along west wall at `{x: 1, y: 4..6}`.
- [x] Place `Arcane Lectern` in southwest study corner at `{x: 2, y: 9}`.
- [x] Place reinforced Iron Dungeon Gate on north wall at `{x: 8..9, y: 1}` with outdoor portal pathing.
- [x] Reserve central platform `{x: 6..9, y: 5..7}` for the Goal Assembly Site.

## Comments
Resolved with wall preparation stations mapped to discrete OpenCode actions, central Goal Assembly Platform bounds at `{x: 6..9, y: 5..7}`, and Wilderness Portal Gate at `{x: 15, y: 5}`. All 72 automated tests pass green.
