# 06: Prune Legacy Prototypes & Restore Modular CraftPix Canvas

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 02, 03, 04, 05

## Question

How can we cleanly strip out the manual prototype controls and hardcoded vector hero rigs from `src/web/app.html` and legacy preview routes in `src/server/main.ts`, restoring the production modular `buildGuildSceneFrame()` / `paintSceneFrame()` canvas pipeline while preserving all existing files in `docs/`?

## Specification

- In `src/server/main.ts`:
  - Prune legacy static sketch endpoints (`/sketches`, `/preview`, `/heroes`, `/rooms`).
  - **Constraint:** Do NOT delete or modify any existing design or reference files in `docs/`.
- In `src/web/app.html`:
  - Remove manual prototype controls: `#assembly-slider`, `#tier-select`, `#biome-select`, `#set-select`, `#btn-flare`, `#btn-mutate`, `#btn-slay`.
  - Remove hardcoded vector hero rig functions (`drawVectorHero`, static `stationSlots`).
  - Re-wire the primary `renderCanvasFrame()` loop to call `buildGuildSceneFrame()` and `paintSceneFrame()`.
  - Ensure dynamic tile pathfinding, hauling routes to the central platform, multi-room tabs, camera auto-fitting, soul banish animations, and the live Character Sheet / Guild Master Ledger work cohesively.
- Verify end-to-end with unit tests and live companion server startup.

## Answer

Pruned manual simulation controls (`.sim-controls`, `#assembly-slider`, `#biome-select`, `#tier-select`, `#set-select`, `#btn-flare`, `#btn-mutate`, `#btn-slay`) and legacy header links (`Hero Rigs`, `Sketches`) from `src/web/app.html`, preserving the high-definition dual-chamber visual foundation (`renderUnifiedGenericRoom` and `renderOutdoorWilderness`). Wired the central Feature Object Assembly dynamically to live project task progress (`room.taskProgress`), connected wilderness biomes and monster sets to deterministic project seeding (`seedProjectWorldVisuals`), derived Bug Monster encounters from real test failures and quest gates (`deriveBugMonsterEncounter`), and ignited autonomous Lantern Flares during diagnostic tool execution (`isDiagnosticTool`). All 86 automated test suites pass 100% green.
