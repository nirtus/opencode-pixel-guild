# 01: Deep Model Catalog, Reference Module, Per-Room Hydration & Daemon Cache Scoping

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: None

## Specification

Implement the foundational model catalog and reference seam specified in [spec.md](../spec.md) (§3.1 & §3.2):

1. **Create Deep Module `src/types/model-catalog.ts` (re-exported via `src/types/domain.ts`)**:
   - Define `ModelCatalogEntry` fields (`id`, `providerId?`, `providerName?`, `name`, `type?`, `disabled?`, `variants?`, `limitContext`, `limitOutput?`) and `ParsedModelRef`.
   - Implement `parseModelRef(raw)` handling both OpenCode V2 objects (`{ providerID, id | model | modelID, variant? }`) and `"provider/id#variant"` strings (supporting multi-slash model IDs like `"openrouter/anthropic/claude-sonnet-5.5#high"`).
   - Implement `toDaemonModelRef(modelId, variant?)`, `formatModelDisplaySpec(modelId, variant?)`, `isSelectableChatModel(model)` (`(!type || type === "chat") && !disabled`), `normalizeDaemonModels(rawModels, providerNames?)`, `groupSelectableModelsByProvider(models)`, `resolveModelContextLimit(modelId, catalogModels)` (single canonical context-limit resolver), and `resolveRoomSelectableModels(snapshot, roomIdOrDir, currentModelId?)` (preserving out-of-catalog `currentModelId` as a visible fallback entry).
2. **Replace Duplicated Parsers & Heuristics**:
   - Update `src/ingress/daemon-sse-mapper.ts`, `src/ingress/daemon-location-state.ts`, `src/ingress/daemon-message-hydration.ts`, `src/ingress/daemon-mcp-normalizer.ts`, and `src/state/context-mana.ts` to delegate to `src/types/model-catalog.ts`.
   - Preserve `modelVariant` through `CharacterState.modelVariant`, SSE `session.model.selected` / `session.step.started`, polling, and `buildHydratedSessionEvents()` (also fixing dropped `latestModelId` / `latestAgentClass` in `daemon-message-hydration.ts`).
3. **Per-Room Hydration, Daemon-Scoped Cache & Boot Persistence**:
   - Extend `fetchDaemonLocationState` (`src/ingress/daemon-location-state.ts`) to query `GET /api/model`, `GET /api/model/default`, and `GET /api/provider` in parallel (using ASCII-safe `x-opencode-directory`).
   - Move `staticCatalogCache` from module scope into `createHttpOpenCodeDaemonClient` (`src/ingress/daemon-http-client.ts`), clear it on `daemonClient.clearCaches()`, drop cross-room `rootUrl` fallback caching, and invalidate on SSE `model.updated`, `provider.updated`, `models-dev.refreshed`, `agent.updated`, and `config.updated` (`src/ingress/opencode-client-adapter.ts`).
   - Update `computeCatalogHydrationDigest` (`src/ingress/adapter-sweep-digests.ts`) to include `defaultModelId` and model `variants`/`type`/`disabled`.
   - Store `availableModels` and `defaultModelId` on `WorkshopRoomState` (`src/state/batch-reconciler.ts`), project deduplicated `availableModels` on `GuildSnapshot` (`src/state/snapshot-builder.ts`), and backfill `state.catalog.models` from persisted `rooms[].availableModels` on boot (`src/state/world-reducer.ts`, leveraging existing `rooms_json` in `chronicle-sqlite-store.ts`).

## Acceptance Criteria

- [x] `src/types/model-catalog.ts` is the sole parser for `provider/id#variant` and sole `Context Mana` limit resolver across `src/ingress/` and `src/state/`.
- [x] `WorkshopRoomState` and `GuildSnapshot` expose room-scoped enabled chat `availableModels` (including `variants` and `providerName`) and `defaultModelId`.
- [x] `daemonClient.clearCaches()` and SSE `model.updated` / `provider.updated` / `models-dev.refreshed` invalidate cached model catalogs with zero cross-room or cross-machine leakage.
- [x] `buildHydratedSessionEvents` propagates `latestModelId`, `latestModelVariant`, and `latestAgentClass`.
- [x] Every modified/added file under `src/` stays strictly `<= 400` lines (`tests/00-architecture-invariants.test.ts` passes).
- [x] Seam 1 unit/integration tests pass in `tests/60-opencode-model-selection.test.ts` and all existing tests remain green.

## Answer

Implemented `src/types/model-catalog.ts` (re-exported via `src/types/domain.ts`) as the canonical `provider/id#variant` parser, enabled-chat-model filter, provider grouper, and unified `Context Mana` limit resolver (`resolveModelContextLimit` delegated from `src/state/context-mana.ts` and `src/ingress/daemon-mcp-normalizer.ts`). Extended `fetchDaemonLocationState` to fetch `/api/model`, `/api/model/default` (preserving `#variant`), and `/api/provider` in parallel with a daemon-client-owned `staticCatalogCache` purged by `daemonClient.clearCaches()` and invalidated on SSE `model.updated` / `provider.updated` / `models-dev.refreshed` / `agent.updated` / `config.updated`. Wired `availableModels` and `defaultModelId` through `WorkshopRoomState`, `GuildSnapshot`, and `world-reducer.ts` SQLite boot backfill, and propagated `latestModelId`, `latestModelVariant`, and `latestAgentClass` in `buildHydratedSessionEvents`. Verified via Seam 1 tests in `tests/60-opencode-model-selection.test.ts` and live Docker container deployment on port `4310`.
