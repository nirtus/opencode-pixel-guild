# Feature Specification: Unified Generic Workshop, High-Detail Hero Rigs, Outdoor Wilderness & Mutating Bug Monsters

**Status:** ready-for-agent  
**Label:** ready-for-agent  

---

## Problem Statement

The OpenCode Pixel Guild Visualizer suffered from three fundamental issues:
1. **Monolithic Bloat**: The codebase was dominated by 6 oversized source files (1,500 to 3,502 lines each), entangling rendering shaders, spatial pathfinding, event reduction, and HTTP daemon polling into shallow monoliths that resist clean maintenance and testing.
2. **Artificial Bottlenecks & Wasted Space**: Compacting context required characters to hike across the room to a static altar fixture (`Altar of Compaction`), introducing unnatural delay. Rooms were stacked in an endless single vertical column, leaving over 65% of widescreen displays unused. Once selected, a character could never be deselected, and the server listened strictly on `127.0.0.1`.
3. **Primitive Graphics & Static Debugging**: Visuals relied on primitive procedural shapes. Complex diagnostic turns showed only a static thinking aura without visualizing the real nature of bug hunting, and feature creation lacked physical construction embodiment.

## Solution

A ground-up modular refactoring that decomposes the monoliths into focused micro-modules bounded under 250–300 lines each, while elevating the spectator simulator into an immersive, high-definition animated world matching the approved reference examples:
1. **High-Detail Vector Hero Rigs (`docs/examples/characters/`)**: Authentic chibi-heroic proportions (`220×260` rig) with uniform ink outlines (`#2b211d`), expressive faces with dual specular eye catchlights, 6 canonical classes (Warrior, Mage, Scout, Alchemist, Cleric, Sapper), 2 interchangeable loadout variants, and 9 party palettes.
2. **Unified Generic Guild Workshop Room (`docs/examples/rooms/`)**: A single cohesive generic room combining approved elements from *01 Grand Library* (NW bookcases, rolling ladder, manuscript desk), *02 Smithy Forge* (NE hearth furnace, anvil, red-hot billet), *10 Artificer's Workshop* (West tinker bench with Clockwork Owl, blueprint table), *06 Enchanter's Study* (SW rotating cyan rune pentagram), and *04 Alchemy Lab* (East condenser table & bubbling cauldron) with a SE Break Lounge (armchair with sleeping orange cat).
3. **Center Feature Object Assembly Platform**: Positioned in the middle of the room, characters physically assemble a 5-part Feature Object (Steam Pipeline & Gauge, 3-Gear Drive Train, Clockwork Automaton, Emerald Elixir Core, Control Console & Tesla Coil), transitioning from bleak dim wireframe (`28%` opacity) to vibrant animated completion.
4. **In-Place Compaction Exhalation**: Context compaction triggers an in-place breath action with a rising foggy vapor mist cloud, distilling Context Mana instantly without altar transit.
5. **Spectator Deselection & 0.0.0.0 LAN Ingress**: Clicking empty ground or pressing Escape deselects the character to reveal the Guild Master Ledger (or toggle cinema mode), and the server listens on `0.0.0.0` for multi-machine viewing.
6. **Outdoor Bug-Hunting Wilderness (`docs/examples/outside/`) & Dynamic Fog of War**: The room's east archway opens to the outdoor wilderness (Forest, Dungeon, Dryland biomes with 30 authentic botanical/dungeon assets). Diagnostic tools (`grep`, `glob`, `read`, `diagnose`) cast Lantern Flares that burn away circular patches of Fog of War to uncover glowing monster footprints.
7. **Mutating Bug Monsters (`docs/examples/monsters/`)**: 40 authentic monster sprites across 10 Sets (`set01`–`set10`) scaling in size and intensity across 4 severity tiers: Tier 1 Slime (`0.85x`) → Tier 2 Goblin (`1.08x`) → Tier 3 Cyclops (`1.42x`) → Tier 4 Troll Boss (`1.82x`), mutating live upon deeper diagnostic findings and exploding into purple/emerald loot crystals upon test pass.

---

## User Stories

1. As a spectator, I want characters to be rendered as detailed vector-illustrated hero rigs matching `docs/examples/characters/`, so that each session looks expressive and high-fidelity with zero pixel blockiness.
2. As a spectator, I want 6 distinct Hero Classes (Warrior, Mage, Scout, Alchemist, Cleric, Sapper) with dual loadout variants, so that an agent's visual equipment directly reflects its active OpenCode tools and skills.
3. As a spectator, I want each project world to use one of the 9 curated Party Palettes, so that every room and squad has a cohesive color identity.
4. As a spectator, I want the workshop room to be a single unified generic chamber with workstations aligned along the perimeter walls, so that characters move naturally between tools and tasks.
5. As a spectator, I want file inspection tasks (`read`, `glob`, `grep`) to occur at the North-West Grand Library station (bookcases, rolling ladder, manuscript desk).
6. As a spectator, I want terminal and command tasks (`bash`, builds, compiler runs) to occur at the North-East Smithy Forge (red-brick furnace, anvil with red-hot billet, quench barrel).
7. As a spectator, I want code editing and authoring tasks (`edit`, `write`) to occur at the West Artificer's Tinker Bench (Clockwork Owl, tools, and blue schematic table).
8. As a spectator, I want skill loading and subagent summoning (`skill`, `subagent`) to occur at the South-West Enchanter's Rune circle (rotating cyan pentagram and levitating spellbooks).
9. As a spectator, I want Code Mode scripts (`execute`) to occur at the East Alchemy station (condenser table and bubbling green cauldron).
10. As a spectator, I want idle characters to rest in the South-East Break Lounge near the armchair with the sleeping orange cat and terrestrial globe.
11. As a spectator, I want a central Feature Object Assembly Platform in the middle of the room, so that I can see the feature being built part-by-part.
12. As a spectator, I want unbuilt tasks to appear as bleak, dim wireframes on the central platform, so that pending work is immediately obvious.
13. As a spectator, I want completed tasks to be carried as parts from the wall stations and snapped into the central platform as vibrant, animated components (spinning gears, glowing automaton eye, crackling Tesla coil).
14. As a spectator, I want characters executing context compaction to exhale a foggy vapor mist cloud in-place, distilling tokens instantly without walking to an altar.
15. As a spectator, I want to deselect the active character by pressing Escape or clicking empty ground, revealing the Guild Master Ledger with cinema mode toggle.
16. As a developer on a local network, I want the server to listen on `0.0.0.0` by default, so that I can view the companion visualizer from phones, tablets, and LAN PCs.
17. As a spectator, I want debugging and error diagnosis tasks to take place outdoors in the Wilderness through the room's east gateway, so that bug fixing feels like a dangerous hunting expedition.
18. As a spectator, I want the outdoor wilderness to support 3 distinct biomes (Forest, Dungeon, Dryland) with authentic vegetation and dungeon props from `docs/examples/outside/`.
19. As a spectator, I want the outdoor wilderness to be shrouded in Fog of War, so that hidden bugs remain mysterious until investigated.
20. As a spectator, I want diagnostic tool executions (`grep`, `glob`, `read`, `diagnose`) to cast expanding Lantern Flares that burn away Fog of War to reveal monster tracks.
21. As a spectator, I want bugs to spawn as authentic monsters from `docs/examples/monsters/set01..set10`, escalating across 4 severity tiers: Tier 1 Slime (minor warning) → Tier 2 Goblin (unit test failure) → Tier 3 Cyclops (suite failure/retries) → Tier 4 Troll Boss (crash loop).
22. As a spectator, I want monsters to mutate live during an investigation if deeper errors are uncovered, playing a flash-and-smoke mutation effect.
23. As a spectator, I want passing tests to deliver a finishing blade strike that explodes the monster into purple and emerald loot crystals.
24. As a developer maintaining the codebase, I want source files partitioned into focused micro-modules bounded under 250–300 lines each, so that code is clean, testable, and easily navigated.

---

## Implementation Decisions

### 1. Architectural Seams & Micro-Module Decomposition (<250 Lines per File)
- All monolithic files (`guild-scene.ts`, `world-reducer.ts`, `floorplan-layout.ts`, `pixel-compositor.ts`, `adapters.ts`, `spectator-hud.ts`) are decomposed into single-responsibility submodules strictly under 250–300 lines each.
- Public facades at `src/spatial/index.ts`, `src/state/index.ts`, `src/ingress/index.ts`, `src/sprites/index.ts`, `src/hud/index.ts`, and `src/scene/index.ts` preserve existing external interfaces so all tests pass green without caller churn.

### 2. Spatial Engine: Unified Generic Room & Outdoor Wilderness
- `src/spatial/` defines the `ProjectWorld` containing:
  - Unified Generic Workshop Room (`800×720` coordinate space) with 5 wall stations and central Feature Assembly.
  - Outdoor Wilderness Sector (`800×720` coordinate space) connected via the East Portal Gateway (`y: 315..391`).
  - Pathfinding BFS routes characters between wall stations, the central assembly platform, and through the gateway into the wilderness.

### 3. Dynamic Encounter Engine: Fog of War, Flares & Mutating Monsters
- `src/encounter/` manages:
  - `FogOfWarMatrix`: 2D visibility grid with radial `destination-out` light compositing.
  - `LanternFlares`: Expanding light pulses triggered by diagnostic tools.
  - `MonsterMutationEngine`: 4-tier state machine (Slime → Goblin → Cyclops → Troll Boss) scaling HP, scale (`0.85x` to `1.82x`), threat auras, and victory crystal bursts.
  - `GoalAssemblyEngine`: 5-part feature assembly state machine (0 to 5 parts built, bleak wireframe vs. vibrant animated components).

### 4. Sprite Engine: High-Detail Hero Rigs & Monster/Vegetation Compositor
- `src/sprites/` manages:
  - 6 Hero Classes matching `docs/examples/characters/` with 2 loadouts and 9 party palettes.
  - 40 Monster Sprites matching `docs/examples/monsters/`.
  - 30 Outdoor Vegetation Sprites matching `docs/examples/outside/`.
  - 60 FPS animation clocks for walk cycles, idle breathing, rotating gears, bubbling cauldrons, crackling Tesla coils, and in-place breath compaction clouds.

### 5. Spectator Ingress & Server Seam
- `src/server/main.ts` binds `0.0.0.0` by default and prints LAN URLs.
- `src/web/app.html` supports Escape/click ground deselection to display the `GuildMasterLedgerViewModel`.

---

## Testing Decisions

- Only external behavior and seams are tested, not private helper functions.
- Test suites:
  1. `spatial`: validates room bounds, wall station coordinates, portal gateway, and pathfinding.
  2. `state`: validates character lifecycle, in-place compaction exhalation (mana distilled, tile unchanged), and event dispatching.
  3. `encounter`: validates fog clearing, monster tier mutation, victory loot bursts, and goal assembly part transitions.
  4. `sprites`: validates hero trait derivation, palette assignment, and animation frame clocks.
  5. `hud`: validates spectator deselection, Guild Master Ledger view models, and project switching.
  6. `server`: validates `0.0.0.0` LAN binding and SSE broadcast.
