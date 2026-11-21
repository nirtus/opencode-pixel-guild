# 01: Expand Station Catalog & Transfer Capability Classifier to Live Canvas Stations

**What to build:** Expand the station catalog so all stations painted on the live web canvas (`Library Study Bookshelf`, `Observatory Spyglass`, `Anvil Forge`, `Crafting Workbench`, `Armory Wardrobe`, `Arcane Lectern`, `Alchemy Lab`, `Resource Stockpile`, `Goal Assembly Site`, `Break Lounge`, `Demolition Bomb`, and `Dungeon Wilds`) are first-class entries with mapped OpenCode tools, colors, descriptions, and **Resource Cargo** bindings, and transfer capability classification and **Preparation Station** resolution from the ghost stations to the live canvas stations.

**Blocked by:** None (can start immediately)

**Type:** task
**Label:** ready-for-agent
**Status:** resolved

- [x] `WORKSTATION_CATALOG` defines first-class catalog entries for `Library Study Bookshelf`, `Observatory Spyglass`, `Anvil Forge`, `Crafting Workbench`, `Armory Wardrobe`, `Arcane Lectern`, `Alchemy Lab`, `Resource Stockpile`, `Goal Assembly Site`, `Break Lounge`, `Demolition Bomb`, and `Dungeon Wilds`.
- [x] `classifyCapability` maps `read`, `list`, `ls`, `grep`, `glob`, `lsp`, and `codesearch` (plus search/inspect/query/symbol verb inference transferred from `Archive Radar`) to `"Library Study Bookshelf"`.
- [x] `classifyCapability` maps `write`, `edit`, `multiedit`, `apply_patch`, and `notebookedit` (plus edit/write/patch verb inference transferred from `Drafting Table`) to `"Crafting Workbench"`.
- [x] `classifyCapability` maps `webfetch`, `websearch`, and `fetch` (plus HTTP/fetch verb inference transferred from `Comms Dish`) to `"Observatory Spyglass"`.
- [x] `classifyCapability` maps `skill` and catalog skill activations to `"Armory Wardrobe"`, and maps `subagent`, `task`, `batch`, `todowrite`, `todoread`, and `agent` classification to `"Arcane Lectern"`.
- [x] `classifyCapability` maps multi-namespace Code Mode `execute`, explicit `compact` / `compaction` / `summarize` tools, and Tier-3 fallback tools to `"Alchemy Lab"`, and maps single-namespace `execute(tools.<ns>)` and `mcp:*` / `plugin:*` tools to `"Resource Stockpile"` (retaining `pluginNamespace`).
- [x] `resolveResourceCargo` maps `Crafting Workbench` to *Timber Planks* (`timber-planks`), `Library Study Bookshelf` to *Stone Block* (`stone-block`), `Anvil Forge` to *Iron Bar* (`iron-bar`), `Alchemy Lab` and `Resource Stockpile` to *Arcane Crystal* (`arcane-crystal`), and `Armory Wardrobe`, `Arcane Lectern`, and `Observatory Spyglass` (`webfetch`/`websearch`) to *Scroll Bundle* (`scroll-bundle`).
- [x] `resolveCanonicalPreparationStation` routes `grep`, `glob`, `lsp`, and `codesearch` to `Library` (`Library Study Bookshelf`) by default and to `Spyglass` (`Observatory Spyglass`) when an exploration-class agent or `Debugging Hunt` workflow performs reconnaissance.

## Answer

Expanded `WORKSTATION_CATALOG` in `src/types/station-catalog.ts` around the 12 live web canvas stations and transferred capability classification (`src/capability/classifier.ts`), resource cargo (`src/capability/code-mode-parser.ts`), and canonical preparation station resolution (`src/encounter/workflow-classifier.ts`) from the ghost stations to the live canvas stations.
