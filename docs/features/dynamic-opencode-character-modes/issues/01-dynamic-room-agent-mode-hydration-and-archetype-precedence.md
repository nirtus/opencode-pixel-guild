# 01: Dynamic Per-Room OpenCode Agent Mode Hydration & Tier-1 Role Archetype Precedence

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: None
Unblocks: [02: Daemon Agent-Switch Command, Server Route & HUD View-Model Projection](./02-daemon-agent-switch-command-and-view-model-projection.md), [03: Dynamic Summon Modal & Interactive Character Sheet / Command Scroll Mode Switcher](./03-dynamic-summon-modal-and-interactive-character-mode-switcher.md)

## Answer

Exported `isSelectablePrimaryAgentMode` from `src/types/role-archetypes.ts` (re-exported via `src/types/domain.ts`), added `availableAgents?: CapabilityCatalogEntry[]` to `WorkshopRoomState` in `src/types/core-types.ts`, populated `room.availableAgents` during `catalog.hydrated` in `src/state/batch-reconciler.ts`, and ordered `syncCharacterWorkflow(char)` before `deriveEquipmentLoadout(char)` in `src/state/session-handlers.ts` so `roleArchetype` and `headgear` update immediately on mode changes.

## Question / Objective

How do we hydrate full OpenCode `Agent.Info` metadata (`id`, `name`, `description`, `mode`, `hidden`, `disabled`, `color`) from `GET /api/agent?location[directory]=...` into each **Workshop Room** (`room.availableAgents`) with zero hardcoded fallback list, invalidate the static catalog cache when `agent.updated` or `config.updated` arrives over SSE, and give a root **Guild Adventurer**'s explicit **OpenCode Agent Mode** (`agentClass`) Tier-1 precedence in `resolveGuildRoleArchetype` so switching to `build`, `plan`, `document`, or custom modes immediately updates the character's **Guild Role Archetype** outfit and headgear?

## Deliverables

1. **Domain Contracts (`src/types/core-types.ts`)**:
   - Extend `CapabilityCatalogEntry` and the `agents` array of `Extract<TelemetryEvent, { type: "catalog.hydrated" }>` with `mode?: "primary" | "subagent" | "all"`, `hidden?: boolean`, `disabled?: boolean`, and `description?: string`.
   - Add `availableAgents?: CapabilityCatalogEntry[]` to `WorkshopRoomState`.
   - Export `isSelectablePrimaryAgentMode(agent: Pick<CapabilityCatalogEntry, "id" | "mode" | "hidden" | "disabled">): boolean` returning `true` iff `Boolean(agent?.id) && (agent.mode === "primary" || agent.mode === "all" || !agent.mode) && !agent.hidden && !agent.disabled`.
2. **Tier-1 Primary Mode Precedence (`src/types/role-archetypes.ts`)**:
   - Update `resolveGuildRoleArchetype` so that:
     - Explicit `subagentType` is checked first at Tier 1.
     - Explicit `agentClass === "build"` resolves directly to `"WARRIOR"` at Tier 1 (preventing historical equipped **Skill Grimoires** or session title keywords in Tiers 2–3 from keeping a character stuck as `MAGE` or `CLERIC` when switched to `build`).
     - Any other explicit non-`general` `agentClass` (`plan` → `SCOUT`, `document` → `MAGE`, `review`/`cleric` → `CLERIC`, `prototype`/`alchemist` → `ALCHEMIST`, `demolition`/`sapper` → `SAPPER`) resolves at Tier 1.
3. **Ingress & Reducer Hydration (`src/ingress/daemon-location-state.ts`, `src/ingress/daemon-sse-mapper.ts`, `src/ingress/opencode-client-adapter.ts`, `src/state/batch-reconciler.ts`, `src/simulator/scenario-events.ts`, `src/simulator/scenario-presets.ts`)**:
   - Update `fetchDaemonLocationState` to preserve `id` (`a.id ?? a.name`), `name`, `description`, `mode`, `hidden`, `disabled`, and `color` from `GET /api/agent?location[directory]=...`, and export `evictStaticCatalogCache(directory?: string): void`.
   - When `agent.updated` or `config.updated` arrives on `/api/event`, evict `staticCatalogCache` and trigger a location sweep.
   - Update `handleCatalogHydrated` (`src/state/batch-reconciler.ts`) to store full agent metadata in `state.catalog.agents` and populate `room.availableAgents` on the target **Workshop Room** (without wiping existing room agents when a worktree emits an empty agent array), marking `collector.changedRoomIds.add(room.roomId)`.
   - Ensure `Demo Guild Simulator` `catalog.hydrated` events include realistic `agents` (`build`, `plan`, `document` with `mode: "primary"`, plus `explore`, `general` with `mode: "subagent"`).
4. **Tests**:
   - Add unit tests covering `isSelectablePrimaryAgentMode`, per-room `room.availableAgents` hydration, and Tier-1 `resolveGuildRoleArchetype` precedence when switching modes (`plan` ↔ `document` ↔ `build`) on characters with equipped skills or planning titles.
   - Keep all files under `src/` `<= 400` lines (`tests/00-architecture-invariants.test.ts`).
