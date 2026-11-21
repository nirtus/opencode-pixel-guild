# 03: Deterministic Project World Visual Seeding

Type: task
Label: ready-for-agent
Status: resolved

## Question

How can each Project World be assigned a unique visual identity (biome, monster set, severity) that loads dynamically on first load and stays consistent across refreshes and tab switches?

## Specification

- In `src/spatial/` and `src/scene/frame-builder.ts`:
  - Implement deterministic hashing of the project's canonical directory / ID to seed visual attributes:
    - **Wilderness Biome**: Forest (`forest`), Blighted Dungeon (`dungeon`), or Scorched Dryland (`dryland`).
    - **Monster Lineage Set**: Lineage set `01` through `10` from `MONSTER_LINEAGE_SETS`.
    - **Ambient Wilds Palette**: Ground colors, vegetation density, and fog tint matching the seeded biome.
- Ensure the seed is stored or computed deterministically so Project A consistently renders with its unique theme across sweeps and refreshes, while Project B renders with its distinct theme.
- Expose the seeded theme in `GuildSnapshot.rooms[roomId]` or room layout metadata.
- Verify through unit tests with multiple distinct project paths.

## Answer

Implemented `seedProjectWorldVisuals` in `src/spatial/project-world.ts` to deterministically hash canonical project paths into WildernessBiomeKind (`forest`, `dungeon`, `dryland`), monster lineage set key (`01` through `10`), ground palettes, and fog tints. Attached `visualSeed` to `ProjectWorldLayout` and `GuildSceneFrame`, ensuring Project Worlds display unique and persistent visual identities across tab switches and page reloads. Automated tests verify variety and persistence (82/82 pass).
