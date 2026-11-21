# Feature Map: Codebase Modularization, 128×128 CraftPix Visuals & Dynamic Encounter System

## Destination

Transform the OpenCode Pixel Guild Visualizer into an ultra-clean modular architecture with files strictly under 300 lines, native 128×128 CraftPix visuals, per-project worlds, wall preparation stations, central goal assembly, in-place compaction exhalation, and outdoor dungeon wilderness monster battles shrouded in Fog of War.

## Visual Verification Gallery

High-fidelity visual representations (10x character detail and 20x room/wilderness detail) are authored and available for review at:
👉 `docs/features/modular-refactor-and-128px-craftpix-encounters/sketches/visual-representation.html`

## Atomic Vertical Tickets

1. `01-core-domain-models-rpg-roles-and-preparation-station-vocabulary.md` — **Resolved** (commit `2b1cadd`)
2. `02-spatial-layout-micro-modules-decomposition.md` — **Resolved** (commit `910c604`)
3. `03-telemetry-ingress-and-client-micro-modules-decomposition.md` — **Resolved** (commit `72a84fe`)
4. `04-world-reducer-decomposition-and-in-place-compaction-exhalation.md` — **Resolved** (commit `5045411`)
5. `05-spectator-deselect-and-lan-server-ingress.md` — **Resolved** (commit `a545338`)
6. `06-project-world-top-bar-switcher-and-widescreen-packing.md` — **Resolved** (commit `9416480`)
7. `07-wall-aligned-preparation-stations-and-dungeon-gate.md` — **Resolved** (commit `f397fba`)
8. `08-128px-craftpix-sprite-compositor.md` — **Resolved** (commit `a526e7b`)
9. `09-central-goal-assembly-site-and-vibrant-part-snapping.md` — **Resolved** (commit `d19cede`)
10. `10-outdoor-dungeon-wilds-fog-of-war-and-lantern-flares.md` — **Resolved** (commit `0c7408e`)
11. `11-mutating-bug-monsters-combat-and-victory-burst.md` — **Resolved** (commit `613a6e5`)
12. `12-modular-canvas-scene-painter-and-test-verification.md` — **Resolved** (commit `6e3a9be`)

## Decisions so far

- **Visual Quality Standard**: 10x character detail (layered pauldrons, breastplates, flowing capes, steel weapon sheen, facial features) and 20x environment detail (masonry mortar, timber grain with knots and nails, roaring forge furnaces, Persian rugs, dungeon stone cracks) matching official CraftPix packs.
- **Architecture**: Monolithic files (>1.5k–3.5k lines) decomposed into micro-modules bounded under 250 lines behind stable facade interfaces.
- **Compaction**: In-place breath exhalation with rising foggy vapor cloud (deleting the static altar fixture).
- **Spectator UI**: Character deselection restores the Guild Master Ledger; LAN broadcast binds `0.0.0.0`.
- **Space Utilization**: Each project has its own Project World switched via the top bar menu (no vertical stacking).
- **Room Layout**: Preparation Stations aligned along perimeter walls reflecting real OpenCode tasks; central Goal Assembly Site.
- **Goal Assembly**: Unbuilt tasks render as bleak dim wireframes; fitted parts snap in with vibrant gleaming colors across 3 physical tiers.
- **Graphics**: Native 128×128 CraftPix-style pixel matrices covering 6 Guild Role Archetypes (Mage, Warrior, Scout, Artificer, Cleric, Demolitionist).
- **Wilderness Encounters**: Bug hunting happens outdoors in the Dungeon Wilds; Fog of War is parted by diagnostic tool Lantern Flares; Bug Monsters mutate across 3 tiers (Slime → Beast → Boss Golem) for real-time combat.
- **Multi-Agent Collaboration**: Characters assist only if their session is actively executing related work—no artificial gimmicks.
