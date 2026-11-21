# Step 3 Specification: Unified Generic Workshop Room, Outdoor Wilderness & Mutating Bug Monsters

**Reference Standards:**
- Approved Room Elements: `docs/examples/rooms/` (`01 Grand Library`, `02 Smithy Forge`, `04 Alchemy Lab`, `06 Enchanter's Study`, `10 Artificer's Workshop`)
- Outdoor Vegetation: `docs/examples/outside/{forest,dungeon,dryland}/` (30 high-resolution botanical & dungeon props)
- Bug Monsters: `docs/examples/monsters/set01..set10-*.png` (10 sets × 4 severity tiers = 40 monsters)

**Live Interactive Preview:** `./docs/features/modular-refactor-and-128px-craftpix-encounters/sketches/world-and-wilds-preview.html`

---

## 1. The Unified Generic Guild Workshop Room (Left Zone)

Every project/worktree room uses a **single Unified Generic Workshop Room** that combines the approved workstations from `01`, `02`, `04`, `06`, and `10` along the perimeter walls, leaving the center of the room dedicated to the **Feature Object Assembly Platform**:

### A. Perimeter Wall Workstations (Where Agents Move & Prepare Tasks)
1. **North-West Wall — Grand Library Station (`01 Grand Library`)**:
   - **Props**: Wall-mounted bookcases with colorful book spines, rolling wooden ladder, and Reading Desk with open manuscript, stacked books, brass candle, and feather quill.
   - **OpenCode Tasks**: `read`, `glob`, `grep`, `webfetch`, documentation & spec inspection.
2. **North-East Wall — Smithy Forge & Anvil (`02 Smithy Forge`)**:
   - **Props**: Stone flagstone hearth apron, red-brick blacksmith furnace with blazing ember circles & forge tongs, accordion leather bellows, tree-stump & horned steel anvil with glowing red-hot blade billet, and water quench barrel.
   - **OpenCode Tasks**: `bash` command execution, compilation, build scripts, and CLI tooling.
3. **West Wall — Artificer's Tinker Bench & Blueprint Table (`10 Artificer's Workshop`)**:
   - **Props**: Tinkerer's workbench with **Clockwork Owl**, bench vise, magnifier lamp & hand tools, plus the Blue Engineering Schematic Table below.
   - **OpenCode Tasks**: `edit`, `write`, refactoring, and preparing feature assembly schematics.
4. **South-West Corner — Enchanter's Rune Study (`06 Enchanter's Study`)**:
   - **Props**: Rotating luminous cyan arcane pentagram & rune circle around the octagonal Crystal Ball pedestal, plus levitating open spellbooks.
   - **OpenCode Tasks**: `skill` activation (equipping Skill Grimoires) and `subagent` in-place Summoning Rituals.
5. **East Wall (South of Gate) — Alchemy Distillation & Cauldron (`04 Alchemy Lab`)**:
   - **Props**: Coiled copper Graham condenser table with violet & green reagent flasks, plus the bubbling neon-green Cast-Iron Cauldron.
   - **OpenCode Tasks**: `execute` (Code Mode multi-tool scripts), MCP/plugin pipelines, and data synthesis.
6. **South-East Corner — Break Lounge (`01 Grand Library`)**:
   - **Props**: Upholstered green armchair with the **sleeping orange cat**, side stool, and cartographer's terrestrial globe.
   - **OpenCode Tasks**: Idle session resting bench.
7. **East Center Archway — Wilderness Portal Gate**:
   - Stone-and-iron doorway leading directly out into the adjacent **Outdoor Bug-Hunting Wilderness**.

### B. Center of the Room — The "Feature Object" Assembly Platform
- Positioned in the middle of the room (`x: 248..512, y: 240..460`) on a riveted steel deck over the crimson fringed guild carpet.
- Consists of **5 modular Feature Object Sub-Assemblies** (derived from `10 Artificer's Workshop`, `06 Enchanter's Study`, and `04 Alchemy Lab`):
  1. **Part 1 — Pressurized Copper Steam Pipeline & Bourdon Gauge**
  2. **Part 2 — 3-Gear Interlocking Brass & Copper Drive Train**
  3. **Part 3 — Brass Clockwork Automaton Chassis & Cyan Ocular Head**
  4. **Part 4 — Arcane Emerald Elixir Power Core**
  5. **Part 5 — Digital Green-Screen Control Console & Crackling Tesla Coil**
- **Bleak Unbuilt vs. Vibrant Assembled**:
  - Unbuilt tasks render at `28%` opacity in desaturated slate-grey wireframe (`#6c757d`).
  - As agents complete work at the wall stations, they walk to the center platform and fit each part, snapping it into **100% vibrant color** with spinning gears, glowing cyan optics, and crackling white Tesla lightning!

---

## 2. Outdoor Bug-Hunting Wilderness & Vegetation (`docs/examples/outside/`)

Directly outside the room's East Portal Gate lies the **Bug-Hunting Wilderness**, populated with the 30 authentic top-down botanical and dungeon assets from `docs/examples/outside/`:

1. **Three Selectable / Project-Seeded Biomes**:
   - **Forest Biome (`docs/examples/outside/forest/f01..f10`)**: `Hangman's Oak`, `Thornwall`, `Weeping Ash`, `Lantern Log` (with glowing green slime orbs), `Strangler`, `Ashen Birch`, `Bloodcaps` (crimson spotted mushrooms with spore cloud), `Widow Ferns` (with hidden skull & bone), `Rootfall`, `Mourning Willow`.
   - **Dungeon Biome (`docs/examples/outside/dungeon/d01..d10`)**: `Leech Moss`, `Bone Root` (twisted roots around a skeleton ribcage & skull), `Ghostcaps` (bioluminescent cyan mushrooms), `Rot Creeper`, `Chainweed` (rusted chains radiating from mud), `Tomb Lilies`, `Mold Veils`, `Eyestalks` (tentacles tipped with glossy eyeballs), `Drainroot`, `Hollow Pods`.
   - **Dryland Biome (`docs/examples/outside/dryland/y01..y10`)**: `Skeleton Tree`, `Razor Grass`, `Gallows Cactus`, `Tumble Thorns`, `Bitterroot`, `Dust Blossoms`, `Vulture Shrub`, `Salt Reeds`, `Scorched Agave`, `Ironwood Stumps`.
2. **Dynamic Fog of War & Lantern Flares**:
   - The outdoor wilderness is cloaked in a dense **Fog of War** canvas layer (`destination-out` radial light compositing).
   - As Scouts and Warriors run diagnostic tools (`grep`, `glob`, `read`, `diagnose`, `bash` tests), they emit **Lantern Flares** that burn away circular clearings in the fog, uncovering glowing green monster footprints along the dirt trail leading to the creature's lair.

---

## 3. Mutating Bug Monsters & Severity Scaling (`docs/examples/monsters/`)

Bug monsters use the **40 high-resolution sprites across 10 Sets (`set01`–`set10`)** in `docs/examples/monsters/`, scaling in size, animation intensity, and visual effects as bug severity and diagnostic findings escalate:

| Severity Tier | Monster Class | Trigger / Diagnostic Findings | Scale & Visual Effects |
|---|---|---|---|
| **Tier 1 (Minor)** | **SLIME** (`set01..10-slime-*`, e.g. *Gloop, Dripsy, Lil Imp, Trioculus*) | Single warning, lint error, or initial test check. | **Scale `0.85x`**: Gelatinous squash-and-stretch wobble, bouncing slime droplets, soft emerald/violet radial glow. |
| **Tier 2 (Moderate)** | **GOBLIN** (`set01..10-goblin-*`, e.g. *Snik, Ratchet, Skrank, Grizzle*) | Failing unit test or single-file bug reproduction. | **Scale `1.08x`**: Agile skittering hop, dagger/spiked-club slashes, amber threat aura. |
| **Tier 3 (Serious)** | **CYCLOPS** (`set01..10-cyclops-*`, e.g. *Polybrute, Brontes, Steropes, Ironbrow*) | Multi-file test suite failure or 2–3 failed retries. | **Scale `1.42x`**: Heavy stomp, club/warhammer ground-slam shockwave rings, fiery orange aura. |
| **Tier 4 (Critical Boss)** | **TROLL BOSS** (`set01..10-troll-*`, e.g. *Grumbold, Thudd, Stonehide, Bogwarden*) | Critical crash loop, deep stack trace, or hard architectural bug. | **Scale `1.82x`**: Colossal boss presence, seismic roar rings, pulsing crimson boss aura. |

- **Live Mid-Hunt Mutation**: When an agent uncovers deeper errors during diagnosis, a violet lightning-and-smoke mutation ring flashes and the monster evolves upward in tier (`Slime → Goblin → Cyclops → Troll Boss`).
- **Victory Burst**: When the fix succeeds and tests pass, the Warrior delivers a final blade slash and the monster explodes into glowing purple and emerald loot crystals.
