# Replace Unused Plugin Alcove Wing with In-Room Resource Stockpile and Worksite Material Hauling

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01, 03

## Description

1. Filter out internal built-in OpenCode server plugins (`source.type === "builtin"` and `opencode.*` namespaces) during `/api/plugin` hydration and catalog reduction so rooms are never bloated with unused `ONC` and `MUX +85 plugins` boxes.
2. Remove the external eastern `Plugin Alcove` wing from `Workshop Room` layout so every room remains a compact `16 × 12` RPG guild hall.
3. Add an in-room **`Resource Stockpile`** zone at `{ x: 13, y: 8, width: 2, height: 2 }` (anchor `{ x: 12, y: 8 }`) stocked with Timber Planks, Stone Blocks, Iron Bars, Arcane Crystals, and Scroll Bundles representing external MCP servers, plugins, and workspace inputs.
4. Implement two-leg **`Resource Cargo`** worksite hauling (`currentTile → Resource Stockpile → target Workstation`) so characters pick up and visibly carry stones, iron bars, timber planks, arcane crystals, or scroll bundles to their active `Workstation` worksite.
5. Expose `{ kind: "resource-stockpile", roomId }` in `buildSceneObjectTooltip` showing configured external MCPs/plugins (and their health statuses) and active `Resource Cargo` pickups with exact OpenCode V2 identifiers.

## Answer

- Added `isBuiltinOpenCodePlugin` (`src/capability/classifier.ts`) and wired it across `/api/plugin` + `/api/mcp` daemon hydration (`src/ingress/adapters.ts`), `catalog.hydrated` and `plugin.status.updated` reduction (`src/state/world-reducer.ts`), and spatial room layout (`src/spatial/floorplan-layout.ts`) to filter out `source.type === "builtin"` and `opencode.*` internal server plugins.
- Removed the external eastern `Plugin Alcove` wing so every `Workshop Room` remains a compact `16 × 12` RPG guild hall (`width: 16`, `height: 12`, `wingBounds: null`) with an in-room `Resource Stockpile` zone at `{ x: 13, y: 8, width: 2, height: 2 }` (`anchorTile: { x: 12, y: 8 }`) stocked with Timber Planks, Stone Blocks, Iron Bars, Arcane Crystals, and Scroll Bundles.
- Implemented `resolveResourceCargo` and two-leg `computeCharacterHaulingRoute` (`currentTile → Resource Stockpile { x: 12, y: 8 } → target Workstation` with `350ms` pickup dwell and `activeResourceCargo` tracking on `CharacterState` and `ToolExecutionRecord`), plus canvas walker two-leg hauling in `src/web/app.html`.
- Exposed `{ kind: "resource-stockpile", roomId }` in `buildSceneObjectTooltip` (`src/hud/spectator-hud.ts`) and `src/web/app.html` displaying stocked material crates, configured external MCPs/plugins with health statuses (`connected`, `needs_auth`, `failed`, `disabled`), and active/recent `Resource Cargo` pickups with exact OpenCode V2 session and tool identifiers.
