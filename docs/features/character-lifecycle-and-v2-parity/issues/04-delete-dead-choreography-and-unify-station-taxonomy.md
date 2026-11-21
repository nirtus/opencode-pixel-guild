# 04: Delete Dead Choreography Modules & Unify Canonical Preparation Station Taxonomy

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: None

**What to build:** Delete the dead `src/roster/*` choreography slice and unify the reducer, capability classifier, **Equipment Loadout**, **Character Sheet**, and canvas on the single canonical **Preparation Station** taxonomy defined in `GLOSSARY.md`, ensuring `skill` and `@skill` equipping always routes to the **Armory Wardrobe** and `subagent` summoning routes to the **Arcane Lectern**.

- [x] Delete the unused `src/roster/*` directory (5 files, 1,181 lines) and remove dead re-exports in `src/hud/spectator-hud.ts`.
- [x] Replace legacy sci-fi `WORKSTATION_CATALOG` names (`"Drafting Table"`, `"Archive Radar"`, `"Reactor Console"`, `"Comms Dish"`, `"Altar of Compaction"`, `"Plugin Alcove"`) with canonical **Preparation Station** names (`Armory Wardrobe`, `Library Study Bookshelf`, `Anvil Forge`, `Crafting Workbench`, `Observatory Spyglass`, `Arcane Lectern`, `Alchemy Lab`, `Resource Stockpile`, `Goal Assembly Site`, `Break Lounge`, `Dungeon Wilds`) across `src/types/`, `src/capability/`, `src/state/`, `src/hud/`, and `src/web/`.
- [x] Update `handleSkillActivated` and `@skill` prompt attachment handling in `src/state/tool-and-gate-handlers.ts` to position the character at `Armory Wardrobe` (with `equippingAtArmory: true`) instead of `Arcane Lectern`, reserving `Arcane Lectern` for `subagent` / `task` **Summoning Rituals**.
- [x] Verify that a character's **Character Sheet** station label and **Equipment Loadout** main-hand **Station Work Implement** always match their rendered **Preparation Station** on the **Guild Floorplan**, and update `tests/00-architecture-invariants.test.ts` to guard against dead `src/roster/*` files.

## Answer

Deleted `src/roster/*` (5 dead files, 1,181 lines), added `PREPARATION_STATION_DISPLAY_NAMES` and `resolvePreparationStationDisplayName` in `src/encounter/workflow-classifier.ts`, populated `activePreparationStation` on `CharacterState`, `preparationStation` on `ToolExecutionRecord` and `ActiveTargetViewModel`, routed `skill` equipping to `Armory Wardrobe` (`equippingAtArmory: true`), and updated `hero-subtabs-reconciler.ts` and `tests/02-roster-choreography.test.ts`.
