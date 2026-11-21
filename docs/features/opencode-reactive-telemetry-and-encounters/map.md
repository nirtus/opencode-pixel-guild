# Feature Map: OpenCode Reactive Telemetry, Dynamic Goal Assembly & Autonomous Wilds Encounters

## Destination

Transform the OpenCode Pixel Guild Visualizer into an autonomous, telemetry-driven spectator companion where the central Feature Object Assembly parts scale dynamically to active project issues and milestone steps, outdoor Bug Monsters spawn and mutate from verified test and command failures, diagnostic tools cast autonomous Lantern Flares to clear the Fog of War, every Project World is uniquely visually seeded, and the app runs purely on the modular CraftPix scene engine without manual debug sliders or static prototypes.

## Notes

- **Domain**: OpenCode V2 daemon telemetry, 2D CraftPix pixel art, spatial tile-grid pathfinding, state reduction.
- **Rules**: Strictly use the project root directory (`./`). Never create external worktrees or use `/tmp/opencode`.
- **Preservation Rule**: Do not delete anything from the `docs/` folder.
- **Skills to consult**: `codebase-design`, `domain-modeling`, `tdd`.

## Decisions so far

<!-- index of resolved tickets: one line per closed ticket -->

- [01: Project Issue Tracker & Task Telemetry Ingress](./issues/01-project-issue-tracker-and-task-telemetry-ingress.md): Discovers active feature issues from `docs/features/*/issues/*.md` (or subagent sessions fallback) and emits `tasks.hydrated` telemetry into room state.
- [02: Dynamic Goal Assembly State & Responsive Platform Grid](./issues/02-dynamic-goal-assembly-state-and-responsive-platform-grid.md): Dynamically builds Goal Assembly sockets for arbitrary issue counts, scales milestone tiers by percentage ratio, and renders responsive platform grid slots.
- [03: Deterministic Project World Visual Seeding](./issues/03-deterministic-project-world-visual-seeding.md): Seeds biomes, monster sets, and environmental palettes from canonical project path hashes, ensuring distinct and persistent visual themes per Project World.
- [04: Live Bug Monster Spawning & Victory Burst from Real Failures](./issues/04-live-bug-monster-spawning-and-victory-burst-from-real-failures.md): Derives 4-tier Bug Monsters from test failures, command errors, and blocked quest gates using seeded lineage sets, triggering victory loot crystal bursts upon resolution.
- [05: Dynamic Diagnostic Lantern Flares & Fog of War Parting](./issues/05-dynamic-diagnostic-lantern-flares-and-fog-of-war-parting.md): Automatically ignites expanding Lantern Flares from diagnostic tool executions (grep, glob, read), parting the 2D Fog of War byte grid.
- [06: Prune Legacy Prototypes & Restore Modular CraftPix Canvas](./issues/06-prune-legacy-prototypes-and-restore-modular-craftpix-canvas.md): Pruned manual simulation controls and legacy header links from app.html, wiring the high-definition dual-chamber visual engine (renderUnifiedGenericRoom & renderOutdoorWilderness) directly to live task progress, deterministic project seeding, real test failures, and autonomous diagnostic lantern flares.

## Not yet specified

- **Multi-Feature Epic Carousel**: Scrolling through historical feature assemblies on the central platform when multiple features exist in `docs/features/`.
- **Multiplayer Spectator Cursors**: Showing cursor positions of multiple humans connected to the companion server over LAN.

## Out of scope

- Deleting existing design sketches, visual assets, or specifications in `docs/`.
- Synthetic or simulated fallback modes when running in production live companion mode.
- Interactive controls for manually mutating monsters or sliding parts in production spectator UI.
