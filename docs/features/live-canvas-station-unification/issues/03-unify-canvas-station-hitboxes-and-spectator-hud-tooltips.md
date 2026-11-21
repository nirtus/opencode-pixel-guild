# 03: Unify Canvas Station Hitboxes & Spectator HUD Tooltips

**What to build:** Update live canvas hitbox generation and **Spectator Drawer** / canvas tooltip view-models so hovering or tapping any station in the **Workshop Room** displays accurate occupants, recent tool calls, and station-specific telemetry (`Resource Stockpile` crates/plugins and `Break Lounge` resting roster) without ghost station names or cross-station occupant bleed.

**Blocked by:** 02: Migrate World State Reducer, Equipment Loadout & Workflow Routing to Live Stations

**Type:** task
**Label:** ready-for-agent
**Status:** resolved

- [x] Hovering `Library Study Bookshelf` on the canvas lists only occupants and recent tool calls that targeted `Library Study Bookshelf` (never `Crafting Workbench` edit calls).
- [x] Hovering `Crafting Workbench` on the canvas lists only occupants and recent tool calls that targeted `Crafting Workbench` (never `Library Study Bookshelf` read/search calls).
- [x] Hovering `Observatory Spyglass` on the canvas lists occupants and recent tool calls for `webfetch`, `websearch`, `fetch`, and spyglass reconnaissance.
- [x] Hovering `Armory Wardrobe` on the canvas lists characters currently equipping **Skill Grimoires** or swapping gear at the armory.
- [x] Hovering or tapping `Resource Stockpile` on the live canvas dispatches `{ kind: "resource-stockpile" }` and renders `buildResourceStockpileTooltip` with stocked crates (*Timber Planks*, *Stone Block*, *Iron Bar*, *Arcane Crystal*, *Scroll Bundle*), configured MCP/plugin statuses, and active **Resource Cargo** pickups mapped to live canvas stations.
- [x] Hovering or tapping `Break Lounge` on the live canvas dispatches `{ kind: "break-lounge" }` and renders `buildBreakLoungeTooltip`.
- [x] `Hero > Scrolls & Gear` (**Tool Belt** pill hover titles) and `Hero > Tool Log` display live canvas station names exclusively.

## Answer

Updated `buildWorkstationTooltip` (`src/hud/tooltip-fixtures-vm.ts`), `STOCKPILE_CRATE_CATALOG` (`src/hud/hud-formatters.ts`), `populateDualChamberSceneHitboxes` (`src/web/client-choreography.ts`), and `renderHeroSubtabStaticHtml` (`src/web/hero-subtabs-reconciler.ts`) to match occupants and recent calls directly against live canvas stations and route `Resource Stockpile` and `Break Lounge` hitboxes to their dedicated tooltip view-models.
