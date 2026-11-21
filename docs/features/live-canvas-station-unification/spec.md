# Specification: Live Canvas Station Unification & Ghost Station Removal

Label: ready-for-agent
Status: resolved

## Problem Statement

The visualizer currently maintains three competing, overlapping generations of station definitions across the domain catalog, capability classifier, world state reducer, spatial layout, and spectator HUD:

1. **Generation 1 ("Core Workstations" & Legacy Room Fixtures)**: `Drafting Table`, `Archive Radar`, `Anvil Forge`, `Reactor Console`, `Comms Dish`, `Altar of Compaction`, `Arcane Lectern`, `Plugin Alcove`, `Resource Stockpile`, `Break Lounge`, and `Demolition Bomb`.
2. **Generation 2 ("Wall Preparation Stations")**: `Library Bookshelf`, `Smithy Forge`, `Tinker Workbench`, `Enchanter Rune Circle`, `Alchemy Condenser`, `Break Lounge`, and `Wilderness Portal Gate`.
3. **Generation 3 ("Canonical Preparation Stations" / Live Web Canvas Stations)**: `Library Study Bookshelf`, `Observatory Spyglass`, `Anvil Forge`, `Crafting Workbench`, `Armory Wardrobe`, `Arcane Lectern`, `Alchemy Lab`, `Resource Stockpile`, `Goal Assembly Site`, `Break Lounge`, `Demolition Bomb`, and `Dungeon Wilds`.

Because the backend capability classifier and world state reducer still assign Generation 1 ghost stations (`Drafting Table`, `Archive Radar`, `Comms Dish`, `Reactor Console`, `Altar of Compaction`, `Plugin Alcove`) as a character's primary workstation before a secondary translation layer maps them to the live canvas **Preparation Stations**, several user-visible defects and architectural leaks occur:

- **Ghost Station Names Leak into Live HUD Surfaces**: The activity ticker announces that a **Guild Adventurer** is `"working at Drafting Table"`, `"working at Archive Radar"`, `"working at Comms Dish"`, or `"working at Reactor Console"`, and hovering **Equipment Loadout** tool-belt pills displays those non-existent station names even though none of those fixtures exist in the **Workshop Room**.
- **Domain Glossary Violations**: `GLOSSARY.md` explicitly forbids `Altar of Compaction` (replaced by in-place **Compaction Exhalation**) and `Plugin Alcove` (replaced by the **Resource Stockpile**), and forbids equipping **Skill Grimoires** at the **Arcane Lectern** (skills must be equipped at the **Armory Wardrobe** while the **Arcane Lectern** is reserved for `subagent` / `task` **Summoning Rituals**).
- **Broken Station Hover Tooltips on the Live Canvas**:
  - Hovering **`Library Study Bookshelf`** and **`Crafting Workbench`** both match characters whose backend workstation is `"Drafting Table"`, causing a character reading a file at the library to falsely appear as an active occupant of the workbench (and vice versa).
  - Hovering **`Observatory Spyglass`** only matches `"Archive Radar"` via a workaround lookup table, completely missing characters running `webfetch` or `websearch` (whose backend workstation is `"Comms Dish"`).
  - Hovering **`Armory Wardrobe`** never shows active occupants because skill activation sets the backend workstation to `"Arcane Lectern"` and no bridge mapping exists for `"Armory Wardrobe"`.
  - Hovering **`Resource Stockpile`** and **`Break Lounge`** on the live canvas dispatches generic workstation hitboxes instead of opening their dedicated crate/plugin and lounge tooltips.
- **Dead Transitional Types**: The 6 `WALL_PREPARATION_STATIONS` (`Library Bookshelf`, `Smithy Forge`, `Tinker Workbench`, `Enchanter Rune Circle`, `Alchemy Condenser`, `Wilderness Portal Gate`) and the `EXTENDED_STATION_CATALOG` bridge table exist solely to patch over the split between Generation 1 and Generation 3.

## Solution

Unify the entire application around a single authoritative set of stations—**strictly the stations painted on the live web canvas**—and delete all ghost stations (`Drafting Table`, `Archive Radar`, `Comms Dish`, `Reactor Console`, `Altar of Compaction`, `Plugin Alcove`, `WALL_PREPARATION_STATIONS`, and `EXTENDED_STATION_CATALOG`), transferring their tool bindings, **Resource Cargo** mappings, **Equipment Loadout** main-hand implements, and tooltip behaviors directly to the live canvas **Preparation Stations**:

1. **`Drafting Table` $\rightarrow$ Split & Transfer to `Library Study Bookshelf` and `Crafting Workbench`**:
   - File reading and listing (`read`, `list`, `ls`) transfer to **`Library Study Bookshelf`** with `stone-block` (*Stone Block*) **Resource Cargo** and `"Scholar's Magnifying Loupe"` main-hand implement.
   - Code authoring and patching (`write`, `edit`, `multiedit`, `apply_patch`, `notebookedit`, and edit/write verb inference) transfer to **`Crafting Workbench`** with `timber-planks` (*Timber Planks*) **Resource Cargo** and `"Architect's Golden Quill"` main-hand implement.
2. **`Archive Radar` $\rightarrow$ Transfer to `Library Study Bookshelf`**:
   - Codebase search and symbol inspection (`grep`, `glob`, `lsp`, `codesearch`, and search/find/query/scan/inspect/symbol verb inference) transfer directly to **`Library Study Bookshelf`** (`Library`) with `stone-block` (*Stone Block*) **Resource Cargo** (while preserving `Observatory Spyglass` routing when an exploration-class agent or `Debugging Hunt` workflow performs reconnaissance).
3. **`Comms Dish` $\rightarrow$ Transfer to `Observatory Spyglass`**:
   - External web queries (`webfetch`, `websearch`, `fetch`, and `http|fetch|crawl|scrape|webhook|download|request` verb inference) transfer to **`Observatory Spyglass`** (`Spyglass`) with `scroll-bundle` (*Scroll Bundle*) **Resource Cargo** and `"Seeker's Brass Spyglass"` main-hand implement.
4. **`Reactor Console` $\rightarrow$ Split & Transfer to `Alchemy Lab` and `Arcane Lectern`**:
   - Multi-namespace Code Mode `execute` scripts and fallback Tier-3 tool invocations transfer to **`Alchemy Lab`** (`Alchemy`) with `arcane-crystal` (*Arcane Crystal*) **Resource Cargo** and `"Alchemist's Distillation Scepter"` main-hand implement.
   - Orchestration and task tools (`subagent`, `task`, `batch`, `todowrite`, `todoread`, and `agent` classification) transfer to **`Arcane Lectern`** (`Enchanter`) with `scroll-bundle` (*Scroll Bundle*) **Resource Cargo** and `"Runed Archmage Staff"` main-hand implement.
5. **`Plugin Alcove` $\rightarrow$ Transfer to `Resource Stockpile`**:
   - External MCP and plugin invocations (`mcp:*`, `plugin:*`, single-namespace `execute(tools.<ns>)`, and catalog/prefixed plugin tools) target **`Resource Stockpile`** (`Stockpile`) directly with `arcane-crystal` (*Arcane Crystal*) **Resource Cargo** and `"Conduit Astral Scepter (<ns>)"` main-hand implement, while preserving per-namespace plugin metadata for the **Resource Stockpile** tooltip and **Character Sheet**.
6. **`Altar of Compaction` $\rightarrow$ Transfer to In-Place `Compaction Exhalation` & `Alchemy Lab`**:
   - `session.compacted` continues to trigger in-place **Compaction Exhalation** (`DistillingContextMana` at the character's current station), while explicit `compact`, `compaction`, and `summarize` tool calls transfer to **`Alchemy Lab`**.
7. **`skill` Tool & `@skill` Prompt Attachments $\rightarrow$ Transfer from `Arcane Lectern` to `Armory Wardrobe`**:
   - Activating a **Skill Grimoire** via the `skill` tool, `skill.activated`, `message.skill.item`, or `@skill` prompt attachment targets **`Armory Wardrobe`** (`Armory`) with `scroll-bundle` (*Scroll Bundle*) **Resource Cargo** and `"Quartermaster's Grimoire Staff"` main-hand implement, keeping **`Arcane Lectern`** dedicated to **Summoning Rituals**.
8. **`WALL_PREPARATION_STATIONS` & `EXTENDED_STATION_CATALOG` $\rightarrow$ Delete Outright**:
   - Remove the unused Generation 2 wall station catalog and the Generation 1-to-3 bridge catalog, and route live canvas hover hitboxes for **`Resource Stockpile`** and **`Break Lounge`** to their rich tooltip view-models.

## User Stories

1. As a **Guild Operator**, I want every station name shown in the **Character Sheet**, **Guild Master Ledger**, activity `Ticker`, and canvas hover tooltips to match a fixture actually painted inside the **Workshop Room** or **Dungeon Wilds**, so that I never see references to non-existent ghost stations like `Drafting Table`, `Archive Radar`, `Comms Dish`, `Reactor Console`, `Altar of Compaction`, or `Plugin Alcove`.
2. As a **Guild Operator**, I want `read`, `list`, `ls`, `grep`, `glob`, `lsp`, and `codesearch` tool calls (transferred from `Drafting Table` and `Archive Radar`) to classify and record **`Library Study Bookshelf`** as their target station with *Stone Block* **Resource Cargo**, so that codebase reading and searching are unified at the library archive per `GLOSSARY.md`.
3. As a **Guild Operator**, I want `write`, `edit`, `multiedit`, `apply_patch`, and `notebookedit` tool calls (transferred from `Drafting Table`) to classify and record **`Crafting Workbench`** as their target station with *Timber Planks* **Resource Cargo** and the *Architect's Golden Quill* main-hand implement, so that code authoring is cleanly separated from file reading.
4. As a **Guild Operator**, I want `webfetch`, `websearch`, and `fetch` tool calls (transferred from `Comms Dish`) to classify and record **`Observatory Spyglass`** as their target station with *Scroll Bundle* **Resource Cargo** and the *Seeker's Brass Spyglass* main-hand implement, so that external web reconnaissance happens at the north-window spyglass.
5. As a **Guild Operator**, I want Code Mode `execute` scripts and explicit `compact` / `summarize` distillation calls (transferred from `Reactor Console` and `Altar of Compaction`) to classify and record **`Alchemy Lab`** as their target station with *Arcane Crystal* **Resource Cargo** and the *Alchemist's Distillation Scepter* main-hand implement, so that script execution and distillation occur at the cauldron and condenser rack.
6. As a **Guild Operator**, I want `subagent`, `task`, `batch`, `todowrite`, and `todoread` calls (transferred from `Reactor Console`) to classify and record **`Arcane Lectern`** as their target station with *Scroll Bundle* **Resource Cargo** and the *Runed Archmage Staff* main-hand implement, so that **Squad Subagent** orchestration and **Summoning Rituals** are centered at the pentagram lectern.
7. As a **Guild Operator**, I want `skill` tool calls and `@skill` prompt attachments (transferred from `Arcane Lectern`) to classify and record **`Armory Wardrobe`** as their target station with *Scroll Bundle* **Resource Cargo** and the *Quartermaster's Grimoire Staff* main-hand implement, so that equipping **Skill Grimoires** happens at the armory rather than the summoning circle.
8. As a **Guild Operator**, I want external MCP and plugin tool calls (`mcp:*`, `plugin:*`, and single-namespace `execute(tools.<ns>)`, transferred from `Plugin Alcove`) to classify and record **`Resource Stockpile`** as their target station with *Arcane Crystal* **Resource Cargo** and the *Conduit Astral Scepter* main-hand implement, so that external integrations flow through the in-room supply depot without any `Plugin Alcove` wing.
9. As a **Guild Operator**, I want `session.compacted` events to perform an in-place **Compaction Exhalation** at the character's current station without referencing an `Altar of Compaction`, so that context distillation matches `GLOSSARY.md`.
10. As a **Guild Operator**, I want hovering **`Library Study Bookshelf`** on the canvas to list only characters and recent tool calls that actually targeted **`Library Study Bookshelf`**, and hovering **`Crafting Workbench`** to list only characters and tool calls that targeted **`Crafting Workbench`**, so that reading and editing occupants never bleed into each other's station tooltips.
11. As a **Guild Operator**, I want hovering **`Observatory Spyglass`** on the canvas to list characters executing `webfetch` and `websearch` as well as reconnaissance searches, so that web-querying occupants are never missing from the spyglass tooltip.
12. As a **Guild Operator**, I want hovering **`Armory Wardrobe`** on the canvas to list characters currently equipping **Skill Grimoires** or swapping gear at the armory, so that its occupant count and recent calls are accurate.
13. As a **Guild Operator**, I want hovering or tapping **`Resource Stockpile`** on the canvas to display the dedicated **Resource Stockpile** tooltip showing stocked material crates (*Timber Planks*, *Stone Block*, *Iron Bar*, *Arcane Crystal*, *Scroll Bundle*), configured MCP/plugin statuses, and active **Resource Cargo** pickups.
14. As a **Guild Operator**, I want hovering or tapping **`Break Lounge`** on the canvas to display the dedicated **Break Lounge & Hearth** tooltip summarizing resting **Guild Adventurers** and retired sessions.
15. As a **Guild Operator**, I want hovering a tool pill in `Hero > Scrolls & Gear` (**Tool Belt**) or inspecting an entry in `Hero > Tool Log` to display the live canvas **Preparation Station** name (such as `Library Study Bookshelf`, `Crafting Workbench`, `Observatory Spyglass`, `Anvil Forge`, `Armory Wardrobe`, `Arcane Lectern`, `Alchemy Lab`, or `Resource Stockpile`), so that all HUD subtabs use one consistent station vocabulary.

## Implementation Decisions

1. **Single Authoritative Station Vocabulary**:
   - Replace the legacy Generation 1 `CORE_WORKSTATION_KINDS` / `WORKSTATION_KINDS` / `ROOM_FIXTURE_KINDS` and Generation 2 `WALL_PREPARATION_STATION_KINDS` with the unified set of stations painted on the live web canvas:
     ```ts
     export const CORE_WORKSTATION_KINDS = [
       "Library Study Bookshelf",
       "Observatory Spyglass",
       "Anvil Forge",
       "Crafting Workbench",
       "Armory Wardrobe",
       "Arcane Lectern",
       "Alchemy Lab",
     ] as const;

     export const WORKSTATION_KINDS = [
       ...CORE_WORKSTATION_KINDS,
       "Resource Stockpile",
       "Goal Assembly Site",
       "Dungeon Wilds",
     ] as const;

     export const ROOM_FIXTURE_KINDS = [
       ...WORKSTATION_KINDS,
       "Break Lounge",
       "Demolition Bomb",
     ] as const;
     ```
   - Delete `"Drafting Table"`, `"Archive Radar"`, `"Comms Dish"`, `"Reactor Console"`, `"Altar of Compaction"`, `"Plugin Alcove"`, `WALL_PREPARATION_STATION_KINDS`, `WALL_PREPARATION_STATIONS`, and `EXTENDED_STATION_CATALOG`.
   - Keep `CANONICAL_PREPARATION_STATION_IDS` (`Library`, `Spyglass`, `Forge`, `Tinker`, `Armory`, `Enchanter`, `Alchemy`, `Stockpile`, `Assembly`, `Lounge`, `WildsSearch`, `Combat`) and `PREPARATION_STATION_DISPLAY_NAMES` as the 1:1 short-ID-to-display-name mapping over the unified station catalog.

2. **Direct Capability Classification to Live Canvas Stations**:
   - Update `classifyCapability` so `targetWorkstation` directly returns the live canvas station:
     - `read`, `list`, `ls`, `grep`, `glob`, `lsp`, `codesearch` (and search/find/query/scan/inspect/list/index/symbol verb inference) $\rightarrow$ `"Library Study Bookshelf"`.
     - `write`, `edit`, `multiedit`, `apply_patch`, `notebookedit` (and write/edit/patch/create_file/update_file/replace verb inference) $\rightarrow$ `"Crafting Workbench"`.
     - `bash`, `shell`, `terminal`, `test` (and run/exec/build/compile/test/lint/shell/cmd verb inference) $\rightarrow$ `"Anvil Forge"`.
     - `webfetch`, `websearch`, `fetch` (and http/fetch/crawl/scrape/webhook/download/request verb inference) $\rightarrow$ `"Observatory Spyglass"`.
     - `skill` (and catalog skill lookups) $\rightarrow$ `"Armory Wardrobe"`.
     - `subagent`, `task`, `batch`, `todowrite`, `todoread`, and `request.kind === "agent"` $\rightarrow$ `"Arcane Lectern"`.
     - `execute` (multi-namespace or built-in Code Mode), `compact`, `compaction`, `summarize` (and compact/distill/summarize/prune verb inference), and Tier-3 fallback tools $\rightarrow$ `"Alchemy Lab"`.
     - Single-namespace non-builtin Code Mode `execute (ns)`, catalog plugin tools, and `ns__tool` / `ns_tool` plugin invocations $\rightarrow$ `"Resource Stockpile"` (retaining `pluginNamespace: ns`).

3. **Resource Cargo & Stockpile Crate Transfer**:
   - Update `resolveResourceCargo` and `STOCKPILE_CRATE_CATALOG` so each **Resource Cargo** kind maps to its live canvas **Preparation Station**:
     - `timber-planks` (*Timber Planks*): mapped to `"Crafting Workbench"` (`write`, `edit`, `multiedit`, `apply_patch`, `notebookedit`).
     - `stone-block` (*Stone Block*): mapped to `"Library Study Bookshelf"` and `"Observatory Spyglass"` (`read`, `glob`, `grep`, `lsp`, `list`, `ls`, `codesearch`).
     - `iron-bar` (*Iron Bar*): mapped to `"Anvil Forge"` (`shell`, `bash`, `terminal`, `test`).
     - `arcane-crystal` (*Arcane Crystal*): mapped to `"Alchemy Lab"` and `"Resource Stockpile"` (`execute`, `mcp:*`, `plugin:*`, `compact`, `compaction`, `summarize`).
     - `scroll-bundle` (*Scroll Bundle*): mapped to `"Armory Wardrobe"`, `"Arcane Lectern"`, and `"Observatory Spyglass"` (`skill`, `subagent`, `task`, `webfetch`, `websearch`, `fetch`).

4. **Equipment Loadout Main-Hand Implement Transfer**:
   - Update `WORKSTATION_WEAPON_META` to define RPG main-hand implements for every live canvas station:
     - `"Library Study Bookshelf"`: `"Scholar's Magnifying Loupe"` (`iconKey: "spyglass"`, `#93c5fd`).
     - `"Observatory Spyglass"`: `"Seeker's Brass Spyglass"` (`iconKey: "spyglass"`, `#38bdf8`).
     - `"Anvil Forge"`: `"Blacksmith's Forge Hammer"` (`iconKey: "hammer"`, `#f97316`).
     - `"Crafting Workbench"`: `"Architect's Golden Quill"` (`iconKey: "quill"`, `#fcd34d`).
     - `"Armory Wardrobe"`: `"Quartermaster's Grimoire Staff"` (`iconKey: "staff"`, `#fde047`).
     - `"Arcane Lectern"`: `"Runed Archmage Staff"` (`iconKey: "staff"`, `#a855f7`).
     - `"Alchemy Lab"`: `"Alchemist's Distillation Scepter"` (`iconKey: "scepter"`, `#6ee7b7`).
     - `"Resource Stockpile"`: `"Conduit Astral Scepter"` (`iconKey: "scepter"`, `#d97706`, with `(${activePluginNs})` suffix when a plugin namespace is active).
     - `"Goal Assembly Site"` / `"Dungeon Wilds"`: class/combat implement fallback.

5. **World State Reducer, Workflow Classifier & Live Canvas Tooltip Unification**:
   - When `skill.activated`, `message.skill.item`, or `@skill` prompt attachment fires, position the character at `"Armory Wardrobe"` (`equippingAtArmory = true`) rather than `"Arcane Lectern"`.
   - Simplify `resolveCanonicalPreparationStation` so that:
     - `grep`, `glob`, `lsp`, `codesearch` route to `Spyglass` (`Observatory Spyglass`) when `isExplorationAgentClass(agentClass)` or `workflowIntent === "debugging-hunt"`, and to `Library` (`Library Study Bookshelf`) otherwise (including direct `Archive Radar` transfer).
     - `webfetch`, `websearch`, `fetch` always route to `Spyglass` (`Observatory Spyglass`).
     - Workstation switch cases match the unified live station names directly.
   - Update `buildWorkstationTooltip` so station occupants and recent calls match `c.activePreparationStation === target.workstation || c.activeWorkstation === target.workstation` and `r.preparationStation === target.workstation || r.workstation === target.workstation` directly without `EXTENDED_STATION_CATALOG`.
   - Update `populateDualChamberSceneHitboxes` so the **`Resource Stockpile`** hitbox emits `{ kind: "resource-stockpile", roomId }` and the **`Break Lounge`** hitbox emits `{ kind: "break-lounge", roomId }`, activating `buildResourceStockpileTooltip` and `buildBreakLoungeTooltip` on the live canvas.
   - Remove `buildPreparationStationTooltip` and the `{ kind: "preparation-station" }` hover target variant.

## Testing Decisions

- **Primary Testing Seams**:
  1. **Capability & World State Reducer Seam (`classifyCapability`, `createWorldStateReducer`)**: Test that every OpenCode tool (`read`, `grep`, `glob`, `edit`, `write`, `bash`, `test`, `webfetch`, `websearch`, `skill`, `subagent`, `execute`, `compact`, `mcp:*`) and lifecycle event (`skill.activated`, `message.user.prompt` with `@skill`, `session.compacted`) produces a live canvas station on `activeWorkstation`, `activePreparationStation`, `recentTools[0].workstation`, `equipmentLoadout.mainHand`, `activeResourceCargo`, and `delta.description`, with zero ghost station strings.
  2. **Encounter & Station Routing Seam (`resolveCanonicalPreparationStation`, `resolveCharacterTargetSlot`, `populateDualChamberSceneHitboxes`)**: Test that character slot coordinates, overhead labels, and canvas hitboxes map 1:1 to the live canvas stations (`Library` for `read`/`grep`/`glob` transfer, `Spyglass` for `webfetch`/`websearch` and recon, `Tinker` for `edit`/`write`, `Forge` for `bash`/`test`, `Armory` for `skill`, `Enchanter` for `subagent`, `Alchemy` for `execute`/`compact`, `Stockpile` for `mcp`/`plugin`).
  3. **Spectator HUD & Tooltip View-Model Seam (`buildSceneObjectTooltip`, `buildCharacterSheetViewModel`, `formatActivityTickerEntry`)**: Test that hovering each live canvas station returns only that station's true occupants and tool calls (e.g. `Library Study Bookshelf` vs `Crafting Workbench`, `Observatory Spyglass` with `webfetch`, `Armory Wardrobe` with `skill`, `Resource Stockpile` crate/plugin tooltip, `Break Lounge` resting tooltip).
- **Prior Art in `tests/`**:
  - `tests/01-capability-and-world-reducer.test.ts`
  - `tests/03-floorplan-layout.test.ts`
  - `tests/05-spectator-hud-and-simulator.test.ts`
  - `tests/06-guild-scene-and-painter.test.ts`
  - `tests/08-task-telemetry-and-encounter-engine.test.ts`

## Out of Scope

- Adding new physical stations to the `800×720` **Workshop Room** or changing the pixel coordinates of existing painted stations in `src/web/canvas-station-painter.ts`.
- Changing **Dungeon Wilds** **Bug Monster** spawning thresholds or **Goal Assembly Site** Git commit mechanics.

## Further Notes

- Because `WorkstationKind` is imported across `src/types/`, `src/capability/`, `src/encounter/`, `src/state/`, `src/spatial/`, `src/scene/`, `src/sprites/`, `src/hud/`, `src/simulator/`, `src/web/`, and `tests/`, implementation tickets are structured using the **Expand–Contract** pattern so every intermediate step compiles and keeps the test suite green before contracting and deleting the ghost station types.
