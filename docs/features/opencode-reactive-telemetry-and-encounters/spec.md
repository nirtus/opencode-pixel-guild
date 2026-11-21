# Feature Specification: Reactive OpenCode Telemetry, Dynamic Goal Assembly & Autonomous Wilds Encounters

Status: ready-for-agent
Label: ready-for-agent

---

## Problem Statement

The OpenCode Pixel Guild Visualizer recently overhauled its visual aesthetics to feature an immersive, dual-chamber high-definition world: a unified workshop room combining approved guild hall stations with a central construction platform, and an outdoor bug-hunting wilderness populated with CraftPix monsters and vegetation shrouded in Fog of War.

However, this visual world was operating as a disconnected prototype:
1. **Manual Debug Controls**: The central Feature Object Assembly was hardcoded to a static 5-part count controlled by an HTML range slider (`#assembly-slider`), rather than reacting to actual project issues, milestones, or tool progress.
2. **Disconnected Wilderness**: The wilderness biome, monster lineage set, and severity tier were manually toggled via dropdown menus (`#biome-select`, `#tier-select`, `#set-select`) and debug buttons (`#btn-mutate`, `#btn-slay`), completely detached from real OpenCode daemon errors, test failures, or quest gates.
3. **Manual Flares**: Fog of War had to be manually cleared by clicking buttons (`#btn-flare`) or clicking canvas pixels, instead of igniting autonomously when agents run diagnostic tools like `grep`, `glob`, or `read`.
4. **Static Hero Placement**: Characters were placed into static coordinate slots or rendered as fallback dummy heroes rather than dynamically occupying the specific wall station matching their active capability and tool execution.
5. **False Regression**: An attempt to reconnect the backend modular canvas inadvertently regressed the spectator companion to an ancient, discarded 2024 drafting table layout, wiping out the approved high-definition visual engine.

Spectators need the high-definition visual world from `c1dc073:src/web/app.html` restored as the definitive foundation, with all manual debug sliders and dropdowns replaced by an autonomous, end-to-end reactive telemetry bridge that mirrors actual OpenCode V2 operations.

---

## Solution

Restore the high-definition unified workshop and wilderness visual engine from `c1dc073:src/web/app.html` as the core client foundation, and wire it directly to live OpenCode telemetry:

1. **Clean Spectator UI**: Permanently remove the manual simulation control strip (`.sim-controls`, `#assembly-slider`, `#biome-select`, `#tier-select`, `#set-select`, `#btn-flare`, `#btn-mutate`, `#btn-slay`) and legacy header links (`🧙 Hero Rigs`, `🎨 Sketches`).
2. **Dynamic Goal Assembly Site**: Central feature platform component count dynamically scales to the active project's issue tracker tasks plus completion steps (`totalTasks = issuesCount + verificationSteps`). Platform sockets auto-calculate responsive grid layouts (`cols × rows`), rendering pending tasks as bleak, dim wireframes and completed tasks as vibrant, animated mechanical components across 3 milestone tiers (Scaffold → Clockwork Engine → Airship Monument). Sockets display issue metadata and completion status on hover.
3. **Deterministic Project World Visual Seeding**: Each Project World is assigned a unique, persistent visual identity hashed from its canonical directory path:
   - **Biome**: Dark Forest Wilderness, Blighted Dungeon Wilds, or Scorched Dryland Badlands.
   - **Monster Lineage Set**: One of 10 reference sets (Sets 01–10).
   - **Environmental Palette**: Tailored ground base/alt colors, path tones, and fog tints.
   - Visual attributes persist deterministically across page reloads and polling sweeps for that project.
4. **Autonomous Bug Monster Encounters**: Antagonistic Dungeon Wilds creatures spawn, target warrior sessions, and mutate exclusively from verified OpenCode diagnostic telemetry:
   - Minor warnings or tool retries $\rightarrow$ Tier 1 Slime.
   - Unit test failure (`npm test` non-zero exit) $\rightarrow$ Tier 2 Goblin.
   - Multiple test suite failures / repeated retries $\rightarrow$ Tier 3 Cyclops.
   - Blocked quest gates (unresolved permissions or questions) / crash loops $\rightarrow$ Tier 4 Troll Boss.
   - When tests pass and errors clear, trigger a finishing blade strike and celebratory burst of sparkling victory loot crystals.
5. **Autonomous Diagnostic Lantern Flares**: Whenever an active session invokes diagnostic capabilities (`read`, `grep`, `glob`, `diagnose`, `diagnosing-bugs`), an expanding Lantern Flare automatically ignites at the character's coordinates, burning away the 2D Fog of War byte grid in the outdoor wilderness to reveal monster tracks, broken runes, and creature lairs.
6. **Live Character Choreography at Stations**: Sessions from `GuildSnapshot.characters` dynamically walk to and occupy the specific wall station matching their active capability:
   - File inspection (`read`, `glob`, `grep`) $\rightarrow$ NW Grand Library.
   - Terminal commands, builds, test runs (`bash`) $\rightarrow$ NE Smithy Forge.
   - Code editing and authoring (`edit`, `write`) $\rightarrow$ West Artificer Tinker Bench.
   - Skill loading and subagent summoning (`skill`, `subagent`) $\rightarrow$ SW Enchanter Rune Circle.
   - Code Mode scripts (`execute`) $\rightarrow$ East Alchemy Lab.
   - Error diagnosis and test debugging $\rightarrow$ Outdoor Dungeon Wilds via East Portal Archway.
   - Idle sessions (`RestingInLounge`) $\rightarrow$ SE Break Lounge near the sleeping cat.
   - Compacting sessions (`DistillingContextMana`) $\rightarrow$ In-place breath exhalation with rising foggy vapor mist clouds.

---

## User Stories

1. As a spectator, I want the visualizer to use the high-definition unified workshop and wilderness visual engine, so that the presentation is rich and immersive without blocky old drafting tables.
2. As a spectator, I want the manual simulation control bar (`.sim-controls`) removed, so that the screen is not cluttered with synthetic debug sliders.
3. As a spectator, I want the legacy "Hero Rigs" and "Sketches" buttons removed from the top bar header, so that only clean production companion controls remain.
4. As a spectator, I want the central Feature Object Assembly platform to scale dynamically to the active project's issue count and completion steps, so that the monument reflects real progress rather than a hardcoded 5-part limit.
5. As a spectator, I want pending project tasks to render as bleak, dim wireframes with dashed outlines on the central platform, so that unbuilt work is immediately identifiable.
6. As a spectator, I want resolved project tasks to snap into the central platform as vibrant, gleaming, animated components with spinning gears and glowing lenses, so that completed milestones feel rewarding.
7. As a spectator, I want the central platform header banner to display the exact live count and percentage of built parts (e.g. `FEATURE OBJECT ASSEMBLY (4 / 12 PARTS BUILT) (33%)`), so that progress is quantified at a glance.
8. As a spectator, I want hovering over any part socket on the platform to display the corresponding issue ticket number, slug, and resolution status in a tooltip, so that I can inspect which specific task the part represents.
9. As a spectator, I want the physical structure foundation to escalate across tiers (Wooden Scaffold $\rightarrow$ Clockwork Engine $\rightarrow$ Guild Airship Monument) as completion percentage milestones are crossed, so that the project visibly evolves.
10. As a spectator, I want each Project World to have its wilderness biome (Forest, Dungeon, Dryland) and monster lineage set (Sets 01–10) deterministically seeded from its canonical project path, so that different projects look visually distinct.
11. As a spectator, I want a Project World's seeded visual theme to remain consistent across page reloads and tab switches, so that the environment does not randomly change themes.
12. As a spectator, I want Bug Monsters in the outdoor Dungeon Wilds to spawn exclusively when real OpenCode errors or test failures occur, so that combat represents genuine debugging obstacles.
13. As a spectator, I want minor tool retries or error outputs to spawn a Tier 1 Slime, so that minor hiccups are reflected without alarm.
14. As a spectator, I want a failing unit test run (`npm test` / `node --test` non-zero exit) to spawn a Tier 2 Goblin, so that test breakage is clearly manifested as an enemy creature.
15. As a spectator, I want multiple test suite failures or repeated command retries to mutate the monster into a Tier 3 Cyclops, so that entrenched test failures feel formidable.
16. As a spectator, I want open Quest Gates (pending permission requests or user questions) or crash loops to spawn a Tier 4 Troll Boss, so that human intervention bottlenecks are visibly dramatized.
17. As a spectator, I want the active Warrior session running tests or bash commands to face and engage the Bug Monster across the Wilderness Gate portal, so that diagnostic work looks like active combat.
18. As a spectator, I want passing test runs and resolved errors to trigger a victory blade strike that defeats the monster and bursts into sparkling purple and emerald loot crystals, so that going green is celebratory.
19. As a spectator, I want the wilderness to remain peaceful with no active monsters when all test suites pass and no quest gates exist, so that a clean project feels calm.
20. As a spectator, I want diagnostic tool executions (`read`, `grep`, `glob`, `diagnose`, `diagnosing-bugs`) to automatically ignite expanding Lantern Flares in the outdoor wilderness, so that reconnaissance work visually clears the Fog of War.
21. As a spectator, I want Lantern Flares to clear circular patches of the dynamic 2D Fog of War byte grid, uncovering glowing creature tracks and clue lairs without manual button clicks.
22. As a spectator, I want Lantern Flares to expand smoothly and fade away naturally when tool execution completes, so that lighting effects do not linger indefinitely.
23. As a spectator, I want sessions executing file inspections (`read`, `glob`, `grep`) to stand at the NW Grand Library station with rolling ladder and manuscript desk, so that file reading is physically grounded.
24. As a spectator, I want sessions executing bash commands, compiler runs, and test suites to stand at the NE Smithy Forge with furnace and anvil, so that terminal actions have a dedicated forge identity.
25. As a spectator, I want sessions editing or writing code (`edit`, `write`) to stand at the West Artificer Tinker Bench, so that code modifications look like crafting at a schematic workbench.
26. As a spectator, I want sessions loading skills or summoning subagents (`skill`, `subagent`) to stand at the SW Enchanter Rune Circle with rotating cyan pentagram, so that skill activations feel arcane.
27. As a spectator, I want sessions executing Code Mode scripts (`execute`) to stand at the East Alchemy Lab with condenser table and bubbling cauldron, so that multi-tool execution looks like alchemical brewing.
28. As a spectator, I want idle sessions to rest in the SE Break Lounge near the armchair and sleeping cat, so that non-working agents relax naturally.
29. As a spectator, I want sessions undergoing context compaction to exhale a rising foggy vapor mist cloud in-place (`DistillingContextMana`), so that memory distillation is visible without altar transit.
30. As a spectator, I want clicking any hero on the canvas to select them and display their live Character Sheet (Context Mana, token telemetry, equipped tools, Grimoire stack), so that I can inspect individual agents.
31. As a spectator, I want clicking empty ground or pressing Escape to deselect the active character and restore the Guild Master Ledger overview, so that I can return to the guild-wide summary at will.
32. As a developer, I want all reference design sketches, visual assets, and specifications in `docs/` preserved without deletion, so that project documentation and design history remain intact.

---

## Implementation Decisions

### 1. Client Visual Foundation (`c1dc073:src/web/app.html`)
- Restore the high-definition dual-chamber canvas from `c1dc073:src/web/app.html` as the visual foundation.
- Retain the vector-illustrated room architecture: oak floorboards, NW rolling-ladder Grand Library, NE Smithy hearth and anvil, West Artificer tinker bench, SW cyan rune pentagram, East Alchemy lab, SE Break Lounge with sleeping cat, and central assembly platform.
- Retain the outdoor wilderness rendering: East archway gateway, 30 botanical/rock props from `docs/examples/outside/`, 40 CraftPix monster assets from `docs/examples/monsters/`, and radial Fog of War lighting.
- Retain the vector hero rigs with role accessories, pauldrons, breastplates, flowing capes, and eye catchlights.

### 2. Header and Layout Cleanup
- Remove the `.sim-controls` DOM element and its associated CSS from `src/web/app.html`.
- Remove the `🧙 Hero Rigs` and `🎨 Sketches` button elements from `<header class="top-bar">`.
- Adjust grid rows in CSS to eliminate the blank simulation bar gap:
  ```css
  body {
    grid-template-rows: auto auto 1fr auto;
  }
  ```

### 3. Task Telemetry Ingress & Responsive Platform Sockets
- The server/client scanner in `src/ingress/issue-tracker-scanner.ts` reads `docs/features/*/issues/*.md` in the project root to extract:
  - `totalTasks`: count of markdown issue files.
  - `resolvedTasks`: count of issue files with `Status: resolved`.
  - Task item descriptors (`id`, `slug`, `title`, `status`).
  - Fall back to child subagents (`parentID != null`, checking `succeeded` vs `running`) if no `docs/features/` folder exists.
- In `src/types/domain.ts` and `src/state/world-reducer.ts`:
  - Dispatch `tasks.hydrated` / `goal.progress` telemetry events into `WorldStateReducer`.
  - Expose `room.taskProgress` in `GuildSnapshot.rooms[roomId]`.
- On the canvas platform (`renderUnifiedGenericRoom`):
  - When $N = 5$: map the 5 classic parts (Steam Pipeline, 3-Gear Train, Automaton, Elixir Core, Tesla Coil) to the first 5 tasks, drawing them as wireframe or vibrant components.
  - When $N \neq 5$: compute a responsive `cols × rows` socket grid within the platform platform box (`x: 248, y: 240, w: 264, h: 220`), rendering each socket as a bleak wireframe or vibrant animated component.
  - Register hitboxes for each socket so hovering displays issue title, slug, and status.
  - Update banner text to `FEATURE OBJECT ASSEMBLY (${resolvedTasks} / ${totalTasks} PARTS BUILT) (${percent}%)`.

### 4. Deterministic Project World Visual Seeding
- In `src/spatial/project-world.ts`:
  - `seedProjectWorldVisuals(projectPath)` hashes the canonical project directory path.
  - Deterministically assigns:
    - `biome`: `"forest" | "dungeon" | "dryland"`.
    - `monsterSetKey`: `"01"` through `"10"` matching `MONSTER_LINEAGE_SETS`.
    - `ambientSeverity`: `"peaceful" | "contested" | "infested"`.
    - `groundBaseHex`, `groundAltHex`, `pathColorHex`, `fogTintRgba`.
- In `src/web/app.html`:
  - When selecting a Project World tab (or on initial snapshot load), apply the project's seeded visual attributes to `activeBiomeKey`, `activeMonsterSet`, and environmental ground colors.

### 5. Autonomous Bug Monster Encounter State Machine
- In `src/encounter/bug-monsters.ts`:
  - `deriveBugMonsterEncounter(snapshot, monsterSetKey)` inspects live telemetry:
    - Count test failures (`toolName === "bash"` with failure patterns or exit code $> 0$).
    - Count tool errors (`tool.status === "error"`).
    - Count open Quest Gates (`Object.keys(snapshot.questGates).length`).
  - Severity Tier mapping:
    - `openQuestCount > 0` $\rightarrow$ Tier 4 Troll Boss.
    - `testFailures >= 2` $\rightarrow$ Tier 3 Cyclops.
    - `testFailures === 1` $\rightarrow$ Tier 2 Goblin.
    - `toolErrors > 0` $\rightarrow$ Tier 1 Slime.
    - `0` failures & `0` quest gates $\rightarrow$ No monster (peaceful).
  - Target: Assign `combatTargetSessionId` to the active Warrior session (`agentClass === "build"` or active tool `bash`).
  - Slay/Victory: When failures transition to zero while a monster was previously engaged, trigger `slayVictoryTimer = 1.0` and animate exploding victory loot crystals.

### 6. Autonomous Diagnostic Lantern Flares
- In `src/web/app.html` / `src/encounter/lantern-flares.ts`:
  - In the animation loop, inspect active sessions:
    - If a session is actively executing a diagnostic capability (`read`, `grep`, `glob`, `diagnose`, `diagnosing-bugs`):
      - Deploy an expanding `LanternFlare` at the character's coordinates.
  - Flares expand smoothly with cubic ease-out, clearing Fog of War within their radius.
  - Flares decay and expire automatically once their active duration elapses.

### 7. Dynamic Station Slot Mapping for Live Sessions
- In `src/web/app.html`:
  - Replace static index modulo assignment (`stationSlots[idx % 8]`) with capability-based workstation target mapping:
    - Library: `x: 218, y: 175` (for `read`, `glob`, `grep`).
    - Forge: `x: 615, y: 210` (for `bash`, tests, builds).
    - Tinker: `x: 135, y: 335` (for `edit`, `write`).
    - Enchanter: `x: 240, y: 565` (for `skill`, `subagent`).
    - Alchemy: `x: 670, y: 535` (for `execute`).
    - Wilds: `x: 1045, y: 350` and `x: 1220, y: 385` (for debugging/warriors).
    - Break Lounge: `x: 500, y: 620` (for idle/resting sessions).
  - Support multiple co-occupants at the same station using angular offsets so characters do not overlap.
  - In-place context compaction exhalation renders misty breath vapor clouds above the character.

### 8. Preservation of Reference Documentation
- **Strict Rule**: Do NOT delete or modify any existing design sketches, asset galleries, or reference documentation in `docs/` (`docs/examples/`, `docs/features/*/sketches/`, etc.).

---

## Testing Decisions

### What Makes a Good Test
- Tests verify behavior at public seams, asserting on user-visible domain states, telemetry emissions, and DOM/canvas bindings rather than private implementation details.
- Avoid mocking internal collaborators; test real event dispatching through `WorldStateReducer` and actual task parsing from real markdown fixtures.

### Tested Seams & Modules
1. **Task Ingress Seam** (`src/ingress/issue-tracker-scanner.ts`):
   - Verifies scanning of `docs/features/*/issues/*.md` extracts total tasks, resolved tasks, slugs, and titles.
   - Verifies graceful fallback to child subagents when `docs/features/` is absent.
2. **State Reducer Seam** (`src/state/world-reducer.ts`):
   - Verifies `tasks.hydrated` and `goal.progress` update `WorkshopRoomState.taskProgress`.
3. **Encounter State Machine Seam** (`src/encounter/bug-monsters.ts`):
   - Verifies `deriveBugMonsterEncounter` correctly resolves Tier 1 Slime (minor warning), Tier 2 Goblin (unit test failure), Tier 3 Cyclops (suite failure), and Tier 4 Troll Boss (blocked quest gate).
   - Verifies defeat state and victory loot crystal generation when errors clear.
4. **Deterministic Visual Seeding Seam** (`src/spatial/project-world.ts`):
   - Verifies `seedProjectWorldVisuals` produces deterministic biomes, monster sets, and environmental palettes across repeated calls for the same project path.
   - Verifies diverse visual themes across distinct project paths.
5. **Dynamic Goal Assembly Seam** (`src/encounter/goal-assembly.ts`):
   - Verifies `createGoalAssemblyFromTaskProgress` scales to arbitrary task counts (e.g. 8, 12, 20).
   - Verifies `computeGoalAssemblyPlatformLayout` generates responsive socket grids within platform bounding box.
   - Verifies `resolveGoalAssemblyMilestone` scales structure tiers by completion ratio.
6. **Spectator UI Seam** (`src/web/app.html`):
   - Verifies removal of `#assembly-slider`, `#tier-select`, `#biome-select`, `#btn-flare`, `#btn-mutate`, `#btn-slay`.
   - Verifies removal of `Hero Rigs` and `Sketches` links.
   - Verifies presence of `renderUnifiedGenericRoom` and `renderOutdoorWilderness` canvas rendering routines.

### Prior Art
- `tests/01-capability-and-world-reducer.test.ts`
- `tests/06-guild-scene-and-painter.test.ts`
- `tests/07-core-domain-and-roles.test.ts`
- `tests/08-task-telemetry-and-encounter-engine.test.ts`

---

## Out of Scope

- Deleting or altering historical design files, HTML visual sketches, or reference images in `docs/`.
- Synthetic or simulated fallback modes when running in live production daemon mode.
- Interactive human controls for manually triggering monster mutations or sliding task parts in the production spectator UI.
- Rewriting the CraftPix 128px character compositor or changing the 6 canonical RPG hero classes.

---

## Further Notes

- The companion server runs on port `4310` (`node --experimental-strip-types src/server/main.ts`).
- When a live OpenCode daemon is detected at `~/.local/state/opencode/service.json`, the companion server sweeps live projects, locations, sessions, tool calls, and quest gates every 2500ms and streams updates over SSE (`/api/guild/events`).
