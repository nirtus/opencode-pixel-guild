# 02: Migrate World State Reducer, Equipment Loadout & Workflow Routing to Live Stations

**What to build:** Migrate the world state reducer, **Equipment Loadout** derivation, workflow classifier, and live client routing so that every character's active station, **Main-Hand** RPG implement, **Tool Belt**, `recentTools` log, and activity `Ticker` emission reference only the live web canvas **Preparation Stations**, and skill activations position the character at the **Armory Wardrobe**.

**Blocked by:** 01: Expand Station Catalog & Transfer Capability Classifier to Live Canvas Stations

**Type:** task
**Label:** ready-for-agent
**Status:** resolved

- [x] `WORKSTATION_WEAPON_META` defines main-hand RPG implements for all live canvas stations (`Scholar's Magnifying Loupe` for `Library Study Bookshelf`, `Seeker's Brass Spyglass` for `Observatory Spyglass`, `Blacksmith's Forge Hammer` for `Anvil Forge`, `Architect's Golden Quill` for `Crafting Workbench`, `Quartermaster's Grimoire Staff` for `Armory Wardrobe`, `Runed Archmage Staff` for `Arcane Lectern`, `Alchemist's Distillation Scepter` for `Alchemy Lab`, and `Conduit Astral Scepter` for `Resource Stockpile`).
- [x] `handleSkillActivated` and `handleMessageUserPrompt` (when `@skill` attachments are present) position the character at `"Armory Wardrobe"` (`equippingAtArmory = true`) instead of `"Arcane Lectern"`.
- [x] `handleToolStarted` emits activity `Ticker` delta descriptions using the live canvas station name (never `"Drafting Table"`, `"Archive Radar"`, `"Comms Dish"`, `"Reactor Console"`, `"Altar of Compaction"`, or `"Plugin Alcove"`).
- [x] `handleSessionCompacted` performs in-place **Compaction Exhalation** (`DistillingContextMana`) while preserving the character's current live canvas station without referencing `"Altar of Compaction"`.
- [x] `isCharacterExploringOrGatheringInfo`, `isCharacterActivelyFixingBug`, and `resolveCharacterTargetSlot` check `"Crafting Workbench"` and `"Anvil Forge"` (and never `"Drafting Table"` or `"Plugin Alcove"`).

## Answer

Migrated `WORKSTATION_WEAPON_META` (`src/state/equipment-loadout.ts`), `resolveToolCategory` (`src/state/armory-and-workflow.ts`), `positionAtArmoryWardrobe` (`src/state/tool-and-gate-handlers.ts`), and `resolveCharacterTargetSlot` (`src/web/station-and-workflow-routing.ts`) to use live canvas station names exclusively.
