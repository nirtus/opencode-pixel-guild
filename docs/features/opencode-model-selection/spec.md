# Feature Specification: Live OpenCode Model & Variant Selection in Command Scroll

## 1. Overview & Motivation

In OpenCode V2, each project location exposes its own catalog of enabled models (`GET /api/model?location[directory]=...`), configured default model (`GET /api/model/default?location[directory]=...`), and provider metadata (`GET /api/provider?location[directory]=...`). Sessions track an active `Model.Ref` (`{ providerID, id, variant? }`) that can be switched live via `POST /api/session/{sessionID}/model`, emitting `session.model.selected` over `/api/event` and appending `Session.Message.ModelSelected` (`type: "model-switched"`) to the session transcript.

Previously in `opencode-pixel-guild`:
1. **Model Catalog Was Trapped & Fragmented**:
   - `fetchDaemonLocationState` (`src/ingress/daemon-location-state.ts`) called `GET /api/model`, but `normalizeDaemonModels` (`src/ingress/daemon-mcp-normalizer.ts`) dropped `type`, `disabled`, and `variants`, and `handleCatalogHydrated` (`src/state/batch-reconciler.ts`) stored models only in private `state.catalog.models`—never projecting `availableModels` or `defaultModelId` onto `WorkshopRoomState` or `GuildSnapshot`.
   - Model ID parsing was duplicated across three divergent helpers (`daemon-sse-mapper.ts`, `daemon-location-state.ts`, `daemon-message-hydration.ts`), `variant` was typed once and discarded everywhere, and `Context Mana` limits were computed by two divergent heuristics (`daemon-mcp-normalizer.ts` vs. `src/state/context-mana.ts`).
   - `resolveDefaultSummonModelId` (`src/server/command-router.ts`) never consulted `GET /api/model/default` and fell back to a hardcoded `"google/gemini-4-argon"` while hardcoding an exclusion for `"opencode/flint-40b-free"`.
2. **No Live Model Switching & Leaky Pre-Prompt Dispatch**:
   - `GuildCommandRequest` (`src/types/command-types.ts`) had no `model.switch` command, and its optional `scroll.send.modelId` field was silently ignored by `command-router.ts` and `daemon-command-ops.ts`.
   - Every `scroll.send` fired a redundant `POST /api/session/{sessionID}/agent` even when unchanged and swallowed errors via `.catch(() => null)`.
   - `buildHydratedSessionEvents` (`src/ingress/daemon-message-hydration.ts`) dropped `latestModelId` and `latestAgentClass`, preventing on-demand and post-idle hydration from reflecting model switches.
3. **Cache Leakage, Cold-Start Drops & Missing Simulator Parity**:
   - Module-global `staticCatalogCache` (`src/ingress/daemon-location-state.ts`) bypassed `daemonClient.clearCaches()`, leaked a `rootUrl` fallback across rooms, and ignored SSE `model.updated` / `provider.updated` / `models-dev.refreshed` events.
   - `Guild Chronicle Store` dropped model catalogs across restarts, and `Demo Guild Simulator` hydrated zero models.
4. **UI Control Duplication Risk & 400-Line Ceiling Pressure**:
   - Almost every touched source file sits within 2–16 lines of the `400`-line invariant (`tests/00-architecture-invariants.test.ts`), and `src/web/app.html` sits at `141/150` lines.
   - `reconcileInteractiveCommandSlot` (`src/web/command-scroll-controller.ts`) returned early on its fast path without updating `<select>` options when late `catalog.hydrated` arrived, and `agent.switch` did not roll back or display `#scroll-feedback-msg` on daemon rejection.

---

## 2. Locked Design Decisions (`Option A` & `Q1`–`Q11`)

1. **Single Canonical UI Home (`Option A` / [ADR-0001](../../adr/0001-single-home-command-scroll-model-selection.md))**:
   - Live **OpenCode Model** (and conditional `#variant`) selection lives **exclusively** inside the **`Command Scroll`** composer bar alongside **`OpenCode Agent Mode`** and `📜 Send Scroll ↵` for root **`Guild Adventurer`**s (`role === "Guild Adventurer" && parentId === null`).
   - Child **`Squad Subagent`**s never show interactive model/variant controls.
   - **No** interactive model switcher is added to the **`Character Sheet`** header, the `Details` subtab (which stays read-only telemetry, showing `modelId` + `#variant` when present), or the `Summon New Guild Adventurer` modal (`src/web/app.html` stays unchanged).
2. **Conditional Reasoning / Effort Variants (`Q1`)**:
   - Preserve `variant` end-to-end (`CharacterState.modelVariant`, `ModelCatalogEntry.variants`, SSE `session.model.selected`, `model-switched` message hydration, `model.switch`, and `scroll.send`).
   - Render a compact `#command-scroll-variant-select` inside **`Command Scroll`** **only** when the currently selected model advertises one or more `variants` (hidden when empty).
3. **Native Provider-Grouped `<select>` (`Q2`)**:
   - Render `#command-scroll-model-select` as a native `<select>` grouped by provider (`<optgroup label="...">`) for keyboard/mobile-native behavior, zero overflow clipping inside **`Spectator Drawer`**, and flicker-free SSE reconciliation.
4. **Enabled Chat Models Only & Zero Hardcoded Summon Fallback (`Q3`)**:
   - Filter selectable models per **`Workshop Room`** strictly to enabled chat models: `Boolean(m.id) && (!m.type || m.type === "chat") && !m.disabled`.
   - Fetch `GET /api/model/default?location[directory]=...` per location and store `room.defaultModelId`.
   - For `adventurer.summon`, use an explicit `cmd.modelId` if provided, else `room.defaultModelId` if hydrated, else omit `model` on `POST /api/session` so OpenCode applies its own configured default—deleting the hardcoded `"google/gemini-4-argon"` fallback and `"opencode/flint-40b-free"` filter in `src/server/command-router.ts`.
5. **Immediate `model.switch`, Error Rollback & Delta-Only `scroll.send` (`Q4`)**:
   - Changing `#command-scroll-model-select` or `#command-scroll-variant-select` immediately dispatches `{ command: "model.switch", sessionId, directory, modelId, modelVariant }`.
   - `command-router.ts` gates optimistic reducer updates (`modelId`, `modelVariant`, and immediate `Context Mana` rescaling) strictly on daemon success (`res.ok`).
   - On failure (`!res.ok`), the client reverts the `<select>` to its previous value and surfaces the daemon failure reason in `#scroll-feedback-msg` (fixing the same missing rollback on `agent.switch`).
   - On `scroll.send`, the server/daemon switch module compares requested `agentClass` / `modelId` / `modelVariant` against the character's current state and only calls `POST /api/session/:id/agent` or `POST /api/session/:id/model` when they actually differ—surfacing real daemon errors instead of swallowing them.
6. **Daemon-Scoped Catalog Cache, Cold-Boot SQLite Hydration & Simulator Parity (`Q5`)**:
   - Bind catalog caching to the daemon client instance (`createHttpOpenCodeDaemonClient`) so `clearCaches()` purges it on machine switch/refresh, remove cross-room `rootUrl` cache leakage, and invalidate the cache on SSE `model.updated`, `provider.updated`, `models-dev.refreshed`, `agent.updated`, and `config.updated`.
   - Persist `room.availableModels` and `room.defaultModelId` inside the existing `rooms_json` column in **`Guild Chronicle Store`** (zero schema migration) and backfill `state.catalog.models` on boot in `world-reducer.ts`.
   - Hydrate realistic multi-provider chat models (with and without variants) and `defaultModelId` in **`Demo Guild Simulator`** so both adapters satisfy the exact same seam.
7. **`Command Scroll` Two-Row Compose Layout (`Q6`)**:
   - Stack `.command-scroll-compose-row` vertically: full-width `#command-scroll-input` textarea on top, and `.command-scroll-send-actions` directly below containing `[#command-scroll-agent-select] [#command-scroll-model-select (flex: 1 1 0; min-width: 0)] [#command-scroll-variant-select (conditional)] [#btn-send-command-scroll]`, wrapping cleanly with `>= 44px` touch targets on mobile viewports.
8. **Enabled While Busy (`Q7`)**:
   - Keep `#command-scroll-model-select` and `#command-scroll-variant-select` enabled while a **`Guild Adventurer`** is `Thinking` or `WorkingAtStation`, matching `#command-scroll-agent-select` and OpenCode's own `/models` behavior.
9. **Out-of-Catalog Active Model Preservation (`Q8`)**:
   - If a session's active `char.modelId` is not present in `room.availableModels` (e.g., pre-hydration, custom alias, or offline local provider), include a visible selected fallback `<option>` for the current model without firing `model.switch`.
10. **Three Deep Modules for the 400-Line Invariant (`Q9`)**:
    - Isolate new behavior into three deep, single-responsibility modules:
      1. `src/types/model-catalog.ts`
      2. `src/ingress/daemon-session-switches.ts`
      3. `src/web/command-scroll-target-controls.ts`
    - Every file under `src/**/*` remains strictly `<= 400` lines and `src/web/app.html` remains `<= 150` lines (`tests/00-architecture-invariants.test.ts`).

---

## 3. Architecture & Module Seams

### 3.1 Deep Model Catalog & Reference Module (`src/types/model-catalog.ts`)
- Exported via `src/types/domain.ts`.
- **Canonical Reference Rules (matching OpenCode V2)**:
  - Provider ends at the first `/`; model ID may contain additional `/` segments (e.g., `openrouter/anthropic/claude-sonnet-5.5`); optional variant follows `#` (`openai/gpt-6.1-sol#high`).
  - `parseModelRef(raw)`: accepts `{ providerID?, id?, model?, modelID?, variant? }` or string `"provider/id#variant"`, returning `{ providerId?, id, modelId, variant?, fullSpec }` (where `modelId` is `"provider/id"` when `providerId` is known, and `fullSpec` appends `#variant` when present).
  - `toDaemonModelRef(modelId, variant?)`: converts into OpenCode V2's `{ providerID, id, ...(variant ? { variant } : {}) }` payload for `POST /api/session/{sessionID}/model` and `POST /api/session`.
  - `isSelectableChatModel(model)`: `Boolean(model?.id) && (!model.type || model.type === "chat") && !model.disabled`.
  - `normalizeDaemonModels(rawModels, providerNameById?)`: produces normalized `ModelCatalogEntry[]` (`id`, `providerId`, `providerName?`, `name`, `type?`, `disabled?`, `variants?`, `limitContext`, `limitOutput?`) and lookup map.
  - `resolveModelContextLimit(modelId, catalogModels)`: single context-limit resolver replacing duplicate heuristics in `src/state/context-mana.ts` and `src/ingress/daemon-mcp-normalizer.ts` (indexing `fullId`, `shortId`, and `${providerId}/${shortId}` case-insensitively).
  - `resolveRoomSelectableModels(snapshot, roomIdOrDir, currentModelId?)`: returns room-scoped selectable chat models (`room.availableModels` → `snapshot.availableModels`), grouped by provider via `groupModelsByProvider`, preserving an out-of-catalog `currentModelId` as a fallback entry (`isFallbackCurrent: true`).
- **Domain Type Additions (`src/types/core-types.ts`, `src/types/command-types.ts`)**:
  - `CharacterState.modelVariant?: string`
  - `WorkshopRoomState.availableModels?: ModelCatalogEntry[]` and `defaultModelId?: string`
  - `GuildSnapshot.availableModels?: ModelCatalogEntry[]`
  - `TelemetryEvent` `"catalog.hydrated"`: adds `defaultModelId?: string` and enriched `models` fields (`type?`, `disabled?`, `variants?`, `providerName?`).
  - `TelemetryEvent` `"session.upserted"`: adds `modelVariant?: string | null` (using `null` to clear a variant when switching to a variantless model).
  - `GuildCommandRequest`: adds `"model.switch"` (`{ command: "model.switch", sessionId, directory?, modelId, modelVariant? }`) and optional `modelVariant?: string` on `"scroll.send"` and `"adventurer.summon"`.

### 3.2 Ingress, Daemon Switches, Cache Lifecycle & Reducer (`src/ingress/`, `src/state/`, `src/server/`, `src/simulator/`)
- **Daemon Location Poller & Cache (`src/ingress/daemon-location-state.ts`, `src/ingress/daemon-http-client.ts`, `src/ingress/opencode-client-adapter.ts`)**:
  - Fetch `GET /api/model`, `GET /api/model/default`, and `GET /api/provider` in parallel with existing static catalog endpoints (`?location[directory]=<dir>` + ASCII-safe `x-opencode-directory`).
  - Pass a daemon-client-owned `Map<string, CachedStaticCatalog>` into `fetchDaemonLocationState`; clear it in `daemonClient.clearCaches()`; drop the cross-room `rootUrl` cache fallback.
  - On SSE `model.updated`, `provider.updated`, `models-dev.refreshed`, `agent.updated`, or `config.updated`, invalidate the daemon catalog cache and trigger a location sweep.
  - Include `defaultModelId` and model `variants`/`type`/`disabled` in `computeCatalogHydrationDigest` (`src/ingress/adapter-sweep-digests.ts`).
- **SSE & Message Hydration (`src/ingress/daemon-sse-mapper.ts`, `src/ingress/daemon-message-hydration.ts`)**:
  - Replace all three local model parsers with `parseModelRef()` so `modelId` and `modelVariant` stay consistent across polling, SSE (`session.model.selected`, `session.step.started`, `session.created`/`upserted`), and message hydration (`type: "model-switched"`, `role: "assistant"`).
  - Emit `latestModelId`, `latestModelVariant`, and `latestAgentClass` in `buildHydratedSessionEvents()`.
- **Daemon Session Switch Module (`src/ingress/daemon-session-switches.ts`, `src/ingress/daemon-command-ops.ts`, `src/server/command-router.ts`)**:
  - Handle `command === "model.switch"` by posting `POST /api/session/${encodeURIComponent(sessionId)}/model${query}` with `toDaemonModelRef(cmd.modelId, cmd.modelVariant)`.
  - On `scroll.send`, pass the character's current `(agentClass, modelId, modelVariant)` context so `applyPrePromptSwitches()` only invokes `/agent` or `/model` when the requested value actually differs, returning an error if a required switch fails instead of swallowing it.
  - On `command-router.ts`:
    - Validate `model.switch` (`sessionId` and `modelId` required); gate `session.upserted` (`modelId`, `modelVariant: cmd.modelVariant ?? null`, `preserveActivityTimestamp: true`) on daemon success (and execute directly against the reducer in `demo-simulator` mode).
    - Update `adventurer.summon` to pass `cmd.modelId ?? room?.defaultModelId` (omitting `model` when undefined instead of falling back to `"google/gemini-4-argon"`).
- **World Reducer, Chronicle Store & Simulator (`src/state/batch-reconciler.ts`, `src/state/session-handlers.ts`, `src/state/snapshot-builder.ts`, `src/state/world-reducer.ts`, `src/simulator/scenario-presets.ts`)**:
  - `handleCatalogHydrated`: store filtered room `availableModels` and `defaultModelId` on `WorkshopRoomState` alongside `state.catalog.models`; rescale `Context Mana` for existing characters.
  - `handleSessionUpserted`: update `char.modelId` and `char.modelVariant` (clearing `modelVariant` when `event.modelVariant === null`) and immediately recompute `Context Mana` and `equipmentLoadout`.
  - `buildSnapshot`: project deduplicated `availableModels` onto `GuildSnapshot` and preserve per-room `availableModels` / `defaultModelId`.
  - `world-reducer.ts` boot hydration: backfill `state.catalog.models` from persisted `rooms[].availableModels` (automatically persisted inside `rooms_json` in `chronicle-sqlite-store.ts`).
  - `Demo Guild Simulator`: emit `catalog.hydrated` with multi-provider chat models (including models with and without `variants`) and `defaultModelId`.

### 3.3 HUD View-Model & Command Scroll Target Controls (`src/hud/`, `src/web/`)
- **HUD View-Model (`src/hud/hud-character-types.ts`, `src/hud/character-sheet-vm.ts`)**:
  - Extend `CharacterCommandScrollViewModel` with:
    - `canSwitchModel: boolean` (`role === "Guild Adventurer" && parentId === null`)
    - `selectedModelId: string`
    - `selectedModelVariant: string | null`
    - `availableModelGroups: readonly CharacterModelProviderGroupViewModel[]`
    - `availableVariants: readonly string[]`
  - Expose `modelVariant?: string` on `CharacterSheetViewModel` so read-only `Details` displays `provider/model#variant` when a variant is active.
- **Command Scroll Target Controls Module (`src/web/command-scroll-target-controls.ts`, `src/web/command-scroll-controller.ts`, `src/web/styles-components.css`)**:
  - Render `#command-scroll-agent-select`, `#command-scroll-model-select` (with `<optgroup>` per provider and fallback current-model `<option>` if out-of-catalog), and conditional `#command-scroll-variant-select` inside `.command-scroll-send-actions` directly beneath the full-width `#command-scroll-input` textarea.
  - Include a target-controls digest (`data-targets-sig` covering available agent modes, available model groups, selected model/variant, and available variants) so `reconcileInteractiveCommandSlot`'s fast path refreshes options cleanly when late `catalog.hydrated` arrives without wiping user draft text or losing textarea focus.
  - On `#command-scroll-model-select` change: pick the model's matching variant (preserving current variant if supported by the new model, else default/unset), dispatch `model.switch`, update `#command-scroll-variant-select`, and on `!res.ok` revert the `<select>` and display the error in `#scroll-feedback-msg`.
  - On `#command-scroll-variant-select` change: dispatch `model.switch` with the current `modelId` + selected `modelVariant` (or `undefined` for default), reverting and showing `#scroll-feedback-msg` on failure.
  - Apply the same error rollback + `#scroll-feedback-msg` surfacing to `#command-scroll-agent-select`.
  - On `#btn-send-command-scroll` click: attach selected `agentClass`, `modelId`, and `modelVariant` to `scroll.send` (preserving `tests/39` compatibility while the server performs delta-only daemon switching).

---

## 4. Verification & Container Deployment Criteria

1. **Automated 3-Seam Test Suite (`tests/60-opencode-model-selection.test.ts`) + Full Regression (`npm test`)**:
   - **Seam 1 (Catalog, Reducer & HUD VM)**: `parseModelRef` (including multi-slash IDs like `openrouter/anthropic/claude-sonnet-5.5#high`), `isSelectableChatModel`, unified `Context Mana` limits, `catalog.hydrated` → `room.availableModels` + `defaultModelId`, SQLite boot backfill, SSE `session.model.selected` + `model-switched` hydration (with `variant`), `CharacterSheetViewModel` (`Guild Adventurer` vs. `Squad Subagent`, out-of-catalog fallback), and `Demo Guild Simulator` parity.
   - **Seam 2 (Server & Daemon HTTP Command)**: `POST /api/guild/command` with `model.switch` (verifying `POST /api/session/:id/model`, `variant`, immediate `Context Mana` rescaling, and rejection without reducer mutation on daemon error), delta-only `scroll.send` (zero `/agent` or `/model` POSTs when unchanged), `adventurer.summon` using `/api/model/default` with zero hardcoded `"google/gemini-4-argon"`, and daemon-scoped `clearCaches()` + SSE `model.updated` / `provider.updated` invalidation.
   - **Seam 3 (`Command Scroll` Web Controller)**: Provider `<optgroup>` rendering, conditional `#command-scroll-variant-select`, immediate `model.switch` + error rollback & `#scroll-feedback-msg` on failure, late `catalog.hydrated` option refresh without resetting draft prompt, two-row compose layout, and `tests/00-architecture-invariants.test.ts` (`<= 400` lines across `src/**/*`, `app.html <= 150` lines, 100% reachability).
2. **Documentation & Live Docker Container Visual Verification**:
   - Update `README.md` (and verify `GLOSSARY.md` and `docs/adr/0001-single-home-command-scroll-model-selection.md`).
   - Deploy via `npm run docker:up`, verify `opencode-pixel-guild-visualizer` is healthy on port `4310`, capture headless Chrome visual proof showing the `Command Scroll` two-row compose bar with Agent + provider-grouped Model (+ Variant) controls, inspect the PNG with `read`, and resolve tickets `01`–`03` + `map.md`.
