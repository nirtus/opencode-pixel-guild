# Procedural Pixel Character Sprites, Skill Grimoires, Plugin Alcove Fixtures, and Visual Cues Prototype

Type: prototype
Status: closed
Blocked by: 02, 03

## Architectural Decisions Settled

- **4-Pass Procedural Sprite Compositor (`Q1: A`, `Q2: A`, `Q6: A`, `Q11: A`)**:
  1. *Class Silhouette & Palette*: Iconic pixel outfits for `build`, `plan`, `explore`, `general`, plus deterministic headgear and palette derived from `Agent.Info.color` (via `GET /api/agent`) or hashed `agent.id` for custom agent classes.
  2. *`Skill Grimoire` Tome & Orbiting Runes*: Floating pixel tome + colored rune aura matching the primary equipped `Skill Grimoire`, plus up to 3 orbiting pixel sparks for stacked `Skill Grimoire`s.
  3. *Squad Lineage Tether*: Parent squad trim color and subtle floor rune ring on `Squad Subagent`s.
  4. *Overhead Telemetry*: Compact `Context Mana` bar and `Quest Gate` marker (`!` permission lock / `?` question scroll).
- **Archetype-Styled `Plugin Alcove` & `Arcane Lectern` Fixtures (`Q7: A`, `Q11: A`)**:
  - `Arcane Lectern` renders with animated page-flips and rising rune glyphs during the minimum skill-study dwell.
  - Each `Plugin Alcove` renders using a deterministic pixel archetype (*Portal Mirror* for web/browser plugins, *Crystal Vault* for data/storage plugins, *War Table* for issue-tracker/GitHub/Linear plugins, *Arcane Conduit* for code/exec plugins) topped with a 3-letter pixel monogram and connection status crystal (`connected` = lit emerald, `needs_auth` = pulsing amber lock, `failed` = red smoke, `disabled` = unlit stone).

## Remaining Questions

Building on [Session and Subagent Persistence, Skill Grimoire Lineage, and Squad Choreography](./02-session-and-subagent-persistence-and-roster-choreography.md) and [Adaptive Workshop Room Floorplan, Arcane Lectern, Plugin Alcoves, and Spatial Pathfinding Prototype](./03-workstation-taxonomy-and-multi-room-floorplan-layout.md), how should the 4-pass sprite compositor, `Arcane Lectern`, `Plugin Alcove` archetypes, `Context Mana` bars, and `Quest Gate` alerts be rendered in 2D pixel art at 60fps so session and capability state is immediately legible from across the room?

Specifically:
1. What are the exact pixel matrices, palettes, and frame sequences for the 4 built-in agent classes, custom agent headgear variants, and the orbiting `Skill Grimoire` tome/sparks?
2. How are active states animated at 60fps (`Thinking` aura, `WorkingAtStation` tool sparks/page flips/radar sweeps/`Arcane Lectern` rune study/`Reactor Console`-to-`Plugin Alcove` telemetry beams, `DistillingContextMana` crystal effect, `Report Scroll` delivery, `Error` / `Retry` smoke)?
3. How do `Quest Gate` markers (`!` Permission lock vs. `?` Question/Form scroll), `Skill Grimoire` emblems, and `Context Mana` bars render above characters without visual clutter when zoomed out?

## Resolution

Implemented in [`src/sprites/pixel-compositor.ts`](../src/sprites/pixel-compositor.ts) and verified via [`tests/04-pixel-compositor.test.ts`](../tests/04-pixel-compositor.test.ts):

1. **16×16 Pixel Matrices, Built-In Class Palettes, Custom Agent Headgear, and `Skill Grimoire` Tome/Orbiting Sparks (`composeCharacterSprite`, `composePluginAlcoveSprite`)**:
   - **Pass 1 — Class Silhouette & Palette (`pass1ClassSilhouette`)**:
     - Every character is composited onto a `16 × 16` pixel matrix (`SPRITE_GRID_SIZE = 16`) combining a 4-row headgear template (`y: 1..4`) and a 10-row outfit body template (`y: 5..14`) with shared `#0f172a` outlines, `#fcd5b5` skin tone, `#94a3b8` steel accents, and `#451a03` boots:
       - `build`: `outfitArchetype: "master-smith"`, `headgear: "visored-helm"`, cobalt smith palette (`primaryHex: "#3b82f6"`, `secondaryHex: "#1d4ed8"`, `trimHex: "#93c5fd"`, `auraHex: "#60a5fa"`).
       - `plan`: `outfitArchetype: "strategist-scholar"`, `headgear: "arcane-circlet"`, amber scholar palette (`primaryHex: "#f59e0b"`, `secondaryHex: "#b45309"`, `trimHex: "#fcd34d"`, `auraHex: "#fbbf24"`).
       - `explore`: `outfitArchetype: "pathfinder-scout"`, `headgear: "hood"`, emerald ranger palette (`primaryHex: "#10b981"`, `secondaryHex: "#047857"`, `trimHex: "#6ee7b7"`, `auraHex: "#34d399"`).
       - `general`: `outfitArchetype: "guild-warden"`, `headgear: "plumed-cap"`, royal violet warden palette (`primaryHex: "#8b5cf6"`, `secondaryHex: "#5b21b6"`, `trimHex: "#c4b5fd"`, `auraHex: "#a78bfa"`).
       - **Custom Agent Classes**: Use `outfitArchetype: "custom-specialist"` with `Agent.Info.color` (`agentColor`) overriding `primaryHex` when present, or a deterministic FNV-1a hash-seeded swatch and headgear silhouette from `HEADGEAR_SILHOUETTES` (`"hood"`, `"visored-helm"`, `"arcane-circlet"`, `"plumed-cap"`, `"alchemist-goggles"`, `"horned-crown"`).
   - **Pass 2 — `Skill Grimoire` Tome, Rune Aura, and Orbiting Sparks (`pass2SkillGrimoire`)**:
     - When `auraVisibility === "full"` (active sessions and `recentlyIdle` hearth-table sessions), renders an open `3 × 3` floating pixel tome at `{ x: 13..15, y: 5..7 }` with `#fef3c7` pages and primary `emblemHex` cover, a 4-point primary `runeAura`, and up to `MAX_ORBITING_GRIMOIRE_SPARKS = 3` orbiting pixel sparks (`orbitingSparks`) colored per stacked `Skill Grimoire` (with `overflowSparkCount` tracking 4+ stacked skills).
     - When `auraVisibility === "dormant-emblem"` (historical session bench or `Archived`), collapses the aura and orbiting sparks into a closed `2 × 3` dormant hip tome (`dormant: true`, `orbitingSparks: []`, `runeAura.visible: false`).
   - **Pass 3 — `Squad Subagent` Lineage Tether (`pass3SquadLineage`)**:
     - When `role === "Squad Subagent"` or `parentId !== null`, recolors the subagent's collar/shoulder trim tokens (`"T"` / `"t"`) to its parent's `squadTrimHex` and stamps an 8-pixel floor tether rune ring across `y: 14..15` (`x: 3..12`).
   - **Archetype `Plugin Alcove` Fixtures (`composePluginAlcoveSprite`)**:
     - Composites a `16 × 16` fixture with a top signboard (`x: 0..12, y: 0..5`) stamped with three `3 × 5` bitmap monogram glyphs (`MONOGRAM_FONT_3X5`), an upper-right status crystal (`x: 13..15, y: 1..4`: `connected` = `#10b981` `"lit-emerald"`, `needs_auth` = `#f59e0b` `"pulsing-amber-lock"` with `#fef08a` lock core, `failed` = `#ef4444` `"red-smoke"` with rising `smokeParticles`, `disabled` = `#6b7280` `"unlit-stone"`), and distinct 10-row lower fixture templates (`y: 6..15`) for `Portal Mirror`, `Crystal Vault`, `War Table`, and `Arcane Conduit`.

2. **60fps Choreographic State & Workstation Animations (`computeAnimationFrameState`, `composeWorkstationSprite`)**:
   - Driven by a pure 60fps clock (`TARGET_FPS = 60`, `FRAME_DURATION_MS = 16.6667ms`, `frame60Index = Math.round(timestampMs / FRAME_DURATION_MS)`, 4-phase `spriteSheetFrame`):
     - `Thinking`: Sinusoidal pulsing `thinkingAura` (`ringRadiusPx` oscillating `5.0..8.0px`, `alpha: 0.70..0.95`) with floating `thoughtRunes`.
     - `WorkingAtStation`:
       - `Anvil Forge` (`"forge-sparks"`): Parabolic orange/yellow `toolSparks` (`#fde047`, `#f97316`, `#fef08a`).
       - `Drafting Table` (`"page-flips"`): 4-frame parchment `pageFlipFrame` cycle (`0..3`).
       - `Archive Radar` (`"radar-sweep"`): Continuous 60fps `radarSweepAngleDeg` (`(timestampMs * 0.24) % 360`).
       - `Arcane Lectern` (`"lectern-rune-study"`): Tracks `dwellProgress` (`0..1`) across `ARCANE_LECTERN_MIN_DWELL_MS = 1500ms`, shifts `illuminatedPageCoords` across open tome pages (`pageFlipFrame: 0..3`), and floats 3 `risingRuneGlyphs` (`*`, `+`, `^`) in the skill's `emblemHex`.
       - `Reactor Console` (`"reactor-telemetry-beams"`): Computes phase-staggered `telemetryBeamPulses` with traveling `packetTile` coordinates interpolated along each `Reactor Console`-to-`Plugin Alcove` beam vector.
     - `DistillingContextMana`: Computes `progress` (`0..1` over `1200ms`), `crystalRotationDeg`, and rising cyan/magenta mana crystal shards (`risingShards`).
     - `ReportingScroll`: Animates `scrollBobOffsetY`, `ribbonFlutterFrame` (`0..3`), `sealGlowAlpha`, and golden/emerald `handoffSparkles`.
     - `Error` / `Retry` Smoke (`errorSmokeEffect`): Emits rising red/slate smoke puffs (`mode: "error-smoke"`) when `retryCount === 0`, or pulsing amber retry sparks (`mode: "retry-amber-sparks"`) when `retryCount > 0`.

3. **Zoom-Adaptive Overhead `Quest Gate` Markers, `Skill Grimoire` Emblems, and `Context Mana` Bars (`computeOverheadHudCue`, `pass4OverheadCue`)**:
   - **`Quest Gate` Visual Distinction**:
     - `Permission.Request` (`kind: "permission"`, `marker: "!"`): Renders a `9 × 9` `"padlock-shield"` pixel badge in amber/gold (`primaryHex: "#f59e0b"`, `accentHex: "#fef08a"`).
     - `Question` / `Form` (`kind: "question"`, `marker: "?"`): Renders a `9 × 9` `"unfurled-scroll"` pixel badge in sky/cyan (`primaryHex: "#38bdf8"`, `accentHex: "#e0f2fe"`).
   - **Three Zoom Level-of-Detail (LOD) Tiers (`lodTier`)**:
     - `"full"` (`zoom >= 0.85`): Displays the full `12 × 3` pixel `Context Mana` bar (`8` interior segments colored `#38bdf8` normal `< 0.60`, `#f59e0b` elevated `0.60..0.84`, `#ef4444` critical `>= 0.85`, or `#22d3ee` distilling), up to `3` `Skill Grimoire` emblem pips (`+overflowCount`), and the animated `9 × 9` `Quest Gate` badge.
     - `"compact"` (`0.50 <= zoom < 0.85`): Collapses the `Context Mana` bar to a slim `8 × 2` pixel strip (`6` segments) and collapses `Skill Grimoire` pips to the single primary emblem (`maxVisibleEmblems: 1`) while keeping the `Quest Gate` badge visible.
     - `"minimal"` (`zoom < 0.50`, zoomed out across the `Guild Floorplan`): Hides routine `Context Mana` bars (`contextManaBar.visible: false`) and `Skill Grimoire` emblem rows (`grimoireEmblemRow.visible: false`) to eliminate visual clutter, while keeping active `Quest Gate` `!`/`?` markers visible in high-contrast beacon mode (`questGateBadge.visible: true`, `beaconMode: true`).
