# 02: Lock Melee Positioning to Target Bug Monster Lair, Orient Hero Facing & Enhance Combat Strikes

Type: task
Label: wayfinder:task
Status: resolved
Blocked by: 01

**What to build:** Position each fighting character at melee range directly in front of their target **Bug Monster**'s lair (`800 + bug.x - 48, bug.y + 4`, staggered vertically for multiple attackers), orient the character to face the monster (`facingLeft = false` at melee range), and render continuous melee body lunges, weapon swings, and impact sparks between the hero and the monster, building on [01: Route Debugging Characters Directly to `"Combat"` When a Bug Monster Is Active & Stop Wandering](./01-route-debugging-characters-to-active-bug-monster-melee-combat.md).

**Blocked by:** [01: Route Debugging Characters Directly to `"Combat"` When a Bug Monster Is Active & Stop Wandering](./01-route-debugging-characters-to-active-bug-monster-melee-combat.md)

**Status:** resolved

- [x] Characters in `station = "Combat"` position at melee range (`800 + lair.x - 48, lair.y + 4`) directly in front of the active **Bug Monster**'s lair.
- [x] When standing at melee range in `"Combat"`, the character faces right toward the **Bug Monster** (`facingLeft = false`) and animates continuous body lunges, weapon strikes, and impact sparks.
- [x] Automated unit tests verify lair-locked melee coordinates and facing orientation.

## Answer

Locked `"Combat"` target anchors (`COMBAT_LAIR_WORLD_ANCHORS` in `src/web/station-and-workflow-routing.ts`) to melee range (`800 + lair.x - 48, lair.y + 4`) directly in front of each **Bug Monster** lair with vertical staggering (`±28px`) for multiple attackers, oriented `walker.facingLeft = false` at melee range in `src/web/client-choreography.ts`, and added melee body lunge (`combatLungeX`) + golden slash arcs in `src/web/canvas-hero-painter.ts`.
