# Feature Map: Deep Architecture Unification, Toil-Queue Choreography & OpenCode V2 Live Telemetry

Label: wayfinder:map

## Destination

Deliver the five-part architectural deepening (`docs/features/deep-architecture-and-v2-telemetry-unification/spec.md` and `docs/architecture-review/architecture-review-20261024.html`): unify `Workflow Intent`, `Preparation Station` taxonomy, and per-character FIFO `Toil Queue` choreography with perimeter ring-corridor pathing; collapse the split-brain `src/scene/` and `src/web/` pipelines into one `1600×720` dual-chamber `Scene Frame` seam shared by the live `Canvas2D` adapter and headless test adapter; deepen `src/ingress/` with live OpenCode V2 `GET /api/event` SSE streaming, `/v2/openapi.json` DTO alignment, single-batch sweep reconciliation, and unified single-room consolidation for all workspaces and Git `Worktree`s of a canonical project; cache static `Workshop Room`, `Dungeon Wilds`, and 16×16 pixel sprite layers onto `OffscreenCanvas` while driving HUD panels purely from `src/hud/` view-models; and enforce a compile-time TypeScript check (`tsc --noEmit`), zero dead modules, and <=400 lines per file in `tests/00-architecture-invariants.test.ts`.

## Notes

- **Domain**: Deep module architecture (`codebase-design`), 2D Canvas `Scene Frame` projection, deterministic `Toil Queue` choreography, OpenCode V2 `GET /api/event` SSE & `/v2/openapi.json` telemetry ingress, and `OffscreenCanvas` layer caching.
- **Rules**: Strictly use the project root directory (`./`). Never create external worktrees or use `/tmp/opencode`. Keep every source file under 400 lines. Do not delete anything from `docs/`. After every UI/visual task, capture a live headless Chrome screenshot on port `4310` to `docs/images/<task-name>.png` and inspect it with `read`.
- **Skills to consult**: `codebase-design`, `domain-modeling`, `opencode`, `tdd`.

## Decisions so far

<!-- the index: one line per closed ticket, enough to judge relevance, then zoom the link for the detail the ticket holds -->

- **01 — Unified Workflow Intent, Disambiguated Station Taxonomy & Ring-Corridor Toil Queue**: Consolidated `classifyCharacterWorkflowIntent`, `deriveOverheadActionLabel`, and `resolveCanonicalPreparationStation` in `src/encounter/workflow-classifier.ts`, added the FIFO `CharacterToil` queue and `computeRingCorridorWaypoints` obstacle avoidance around the central `Goal Assembly Site` (`x: 280..500, y: 250..430`) in `src/encounter/toil-queue.ts`, self-expired the `1.45s` `Armory Wardrobe` dwell, kept `Compaction Exhalation` in place, and wired `ReportingScroll` subagent handoffs to the parent `Guild Adventurer` (`docs/features/deep-architecture-and-v2-telemetry-unification/issues/01-unify-workflow-intent-station-taxonomy-and-toil-queue.md`).
- **02 — Pre-Render Choreography Step, Stateless Painters, Dynamic $N$-Socket Goal Assembly & Unified Scene Hit-Testing**: Extracted all particle, flare, walker, and timer mutations out of canvas painters into pre-render `stepClientChoreography` (`src/web/client-choreography.ts`), wired `createGoalAssemblyFromTaskProgress` + `computeGoalAssemblyPlatformLayout` into `src/web/canvas-assembly-painter.ts` for dynamic $N$-socket rendering beyond 5 tasks, drew the interactive `Demolition Bomb` fixture in `src/web/canvas-room-painter.ts`, and connected `hitTestSceneFrame` (`src/scene/`) + `buildSceneObjectTooltip` (`src/hud/`) to drive `#alcove-tooltip` and `#demolition-modal` in `src/web/pointer-and-camera.ts` (`docs/features/deep-architecture-and-v2-telemetry-unification/issues/02-collapse-split-brain-scene-and-canvas-pipeline.md`).
- **03 — Live OpenCode V2 `/api/event` SSE Ingress, Atomic `dispatchBatch` Sweeps, V2 Wire Schema Alignment & Unified Project Room**: Added `subscribeEvents` and `mapOpenCodeSseFrameToTelemetryEvents` in `src/ingress/daemon-http-client.ts`, implemented atomic `dispatchBatch` on `WorldStateReducer` (`src/state/world-reducer.ts`) so `sweepAllLocations` emits at most 1 snapshot per sweep, aligned DTO normalizers with OpenCode V2 (`Permission.Request` `action`/`resources`, `Form.Info` `fields`, `ToolState.Completed` `state.content` output previews for `Bug Monster` detection, `Session.Message.Compaction`, and `time.archived`), consolidated canonical project workspaces and Git `Worktree`s into a single unified `Workshop Room` (`canonicalByWorktreeMap`), and unified WSL/Windows path helpers in `src/state/location-normalization.ts` (`docs/features/deep-architecture-and-v2-telemetry-unification/issues/03-deepen-opencode-v2-ingress-sse-and-schema-alignment.md`).
- **04 — Three-Layer OffscreenCanvas Caching, Canonical Monster Catalog & HUD View-Model Unification**: Cached static `Workshop Room` architecture (`cachedRoomBuffer`), static `Dungeon Wilds` biome terrain (`cachedWildsTerrainBuffer`), and composed 16×16 pixel sprites (`pixelSpriteBitmapCache`), fixed `buildPixelAtlasComposeInput` to pass `visualTraits`, `timestampMs`, `skillGrimoires`, and valid `CharacterLifecycleState` values, derived `MONSTER_SETS` directly from `MONSTER_LINEAGE_SETS`, and eliminated hardcoded `"Library"` station overrides in `side-panel-reconciler.ts` and `ledger-panel-reconciler.ts` (`docs/features/deep-architecture-and-v2-telemetry-unification/issues/04-offscreen-layer-caching-unified-worktree-room-and-hud-vms.md`).
- **05 — Compile-Time TypeScript & ES Module Linking Gate, Zero Circularity & 100% Reachability**: Removed redundant type shims (`src/scene/scene-types.ts`, `src/hud/hud-types.ts`), eliminated the `src/sprites/pixel-compositor.ts <-> src/scene/guild-scene.ts` circular dependency, purged invalid `CharacterLifecycleState` string literals across `src/`, and enforced `<= 400` lines, 100% reachability from `src/server/main.ts` and `src/web/app-main.ts`, and clean TypeScript/ESM linking across all modules in `tests/00-architecture-invariants.test.ts` (`docs/features/deep-architecture-and-v2-telemetry-unification/issues/05-enforce-typescript-typecheck-and-prune-dead-modules.md`).

## Not yet specified

<!-- in-scope fog you can't ticket yet; graduates as the frontier advances -->

- **Multi-Character Label Collision Nudging at High Density**: 1D vertical pill offset stacking when 4+ characters congregate at the same `Preparation Station` or doorway simultaneously.
- **Floating RPG Combat Damage Numbers & Loot Crystal Physics Tuning**: Exact particle velocity, fade curve, and font styling for `-HP` strike popups and `VictoryLootCrystal` bursts in the `Dungeon Wilds`.

## Out of scope

- Deleting existing design sketches, visual assets, or specifications in `docs/`.
- Rendering separate annex rooms for Git `Worktree`s (all workspaces and worktrees of a canonical project share its single unified `Workshop Room`).
- 3D rendering engines or WebGL shaders.
