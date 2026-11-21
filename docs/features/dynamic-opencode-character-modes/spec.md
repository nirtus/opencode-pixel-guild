# Feature Specification: Dynamic OpenCode Character Modes & Live Agent Mode Switching

## 1. Overview & Motivation

In OpenCode V2, root sessions operate in a selectable **OpenCode Agent Mode** (`GET /api/agent?location[directory]=...`, such as `build`, `plan`, `document`, or custom project/global agents defined in `opencode.jsonc` or `.opencode/agents/*.md`), and operators can switch a session's active mode at any time via `POST /api/session/{sessionID}/agent` (`{ agent: "<agentId>" }`).

Previously in `opencode-game-visualizer`:
1. **Dynamic Agent Metadata Was Stripped & Dropped Before Reaching the Browser**:
   - `fetchDaemonLocationState` (`src/ingress/daemon-location-state.ts`) queried `GET /api/agent?location[directory]=...` but typed the response only as `{ id, name, color }`, discarding `mode` (`"primary" | "subagent" | "all"`), `hidden`, `disabled`, and `description`.
   - `handleCatalogHydrated` (`src/state/batch-reconciler.ts`) stored agents only in internal `state.catalog.agents` without attaching them to the **Workshop Room** (`WorkshopRoomState.availableAgents`), and `buildSnapshot` (`src/state/snapshot-builder.ts`) omitted `catalog.agents` from `GuildSnapshot`.
2. **Hardcoded Summon Modal with Subagent-Only Options**:
   - `src/web/app.html` and `src/web/summon-adventurer-controller.ts` hardcoded 4 `<option>` tags (`build`, `plan`, `explore`, `general`), missing `document` and custom primary agents while offering `explore` and `general` (which have `mode: "subagent"` in OpenCode V2).
3. **No Live Mode Switcher on Existing Characters**:
   - Neither the **Character Sheet** (`src/web/side-panel-reconciler.ts`) nor the **Command Scroll** (`src/web/command-scroll-controller.ts`) provided a control to switch an existing **Guild Adventurer**'s mode (`POST /api/session/{sessionID}/agent`), nor did `GuildCommandRequest` (`src/types/command-types.ts`) support a standalone `agent.switch` command.
4. **Tier-1 Role Archetype Precedence Skipped `build`**:
   - `resolveGuildRoleArchetype` (`src/types/role-archetypes.ts`) skipped `"build"` at Tier 1 (`if (agent && agent !== "build" && agent !== "general")`), so a character that previously equipped `@wayfinder`/`@grilling` or had `"plan"`/`"spec"` in its session title remained stuck as `MAGE` or `CLERIC` even after switching its mode to `build`.

---

## 2. Locked Design Decisions (`Q1`–`Q5`)

1. **End-to-End Dynamic Mode Discovery & Live Switching (`Q1`)**:
   - Hydrate full OpenCode `Agent.Info` definitions (`id`, `name`, `description`, `mode`, `hidden`, `disabled`, `color`) from `GET /api/agent?location[directory]=...` into each **Workshop Room** (`room.availableAgents`) in `GuildSnapshot`.
   - Populate the **Summon New Guild Adventurer** modal and the **Character Sheet** / **Command Scroll** mode switchers strictly from the room's dynamically discovered **OpenCode Agent Mode**s.
   - Switching a character's mode calls `POST /api/session/{sessionID}/agent` and immediately updates `char.agentClass`, `char.roleArchetype`, `char.visualTraits`, `char.equipmentLoadout.headgear`, and HUD badges.
2. **Filtering Selectable Session Modes (`Q2`)**:
   - Root **Guild Adventurers** (`parentID: null`) filter selectable modes strictly to visible primary-capable agents:
     ```ts
     (agent.mode === "primary" || agent.mode === "all" || !agent.mode) &&
       !agent.hidden &&
       !agent.disabled
     ```
   - This includes `build`, `plan`, `document`, and any custom primary/all agents while excluding subagent-only agents (`mode === "subagent"`, such as `explore` and `general`) and internal maintenance agents (`hidden: true`, such as `compaction`, `title`, `summary`).
   - Child **Squad Subagents** (`parentID != null`) display their spawned subagent class as a read-only badge and do not expose a primary mode switcher.
3. **Instant Mode Switcher in Character Sheet Header & Command Scroll Bar (`Q3`)**:
   - Render an interactive **OpenCode Agent Mode** switcher in the **Character Sheet** header (`src/web/side-panel-reconciler.ts`) and a synced mode selector in the **Command Scroll** composer (`src/web/command-scroll-controller.ts`) for root **Guild Adventurers**.
   - Selecting a mode in the **Character Sheet** header (or changing the selector in the **Command Scroll** bar) dispatches `{ command: "agent.switch", sessionId, directory, agentClass }`, which invokes `POST /api/session/{sessionID}/agent?location[directory]=...` with `{ agent: agentClass }` and immediately updates the reducer and snapshot—even when the character is idle.
   - `scroll.send` also continues to accept an optional `agentClass` override and updates `char.agentClass` in the reducer when provided.
4. **Primary Mode Precedence for Guild Role Archetype (`Q4`)**:
   - In `resolveGuildRoleArchetype` (`src/types/role-archetypes.ts`), an explicit primary mode (`build`, `plan`, `document`, or any specialized agent other than `general`) takes **Tier-1 precedence** over equipped **Skill Grimoires** (Tier 2) and session title / tool heuristics (Tier 3).
   - Specifically, when `agent === "build"`, Tier 1 immediately resolves to `"WARRIOR"` (unless `subagentType` is explicitly a specialized subagent), ensuring that switching a character from `plan` (`SCOUT`) or `document` (`MAGE`) to `build` (`WARRIOR`) always transforms its **Guild Role Archetype** outfit and headgear immediately.
5. **Strict Per-Room Dynamic Mode Hydration with Zero Hardcoded Fallback (`Q5`)**:
   - Each **Workshop Room** (`WorkshopRoomState`) stores `availableAgents?: readonly CapabilityCatalogEntry[]` populated strictly from OpenCode's `GET /api/agent?location[directory]=...` for that room (`catalog.hydrated`).
   - **No hardcoded fallback mode list** (`["build", "plan", ...]`): the UI never fabricates modes not returned by the room's hydrated catalog. If a room has not yet received any primary-capable agents from the daemon, the mode selector renders an explicit empty/syncing state (`"Syncing modes from OpenCode..."`) until `catalog.hydrated` delivers the room's actual modes.
   - When OpenCode emits `agent.updated` or `config.updated` over `/api/event`, the ingress layer evicts `staticCatalogCache` and triggers a location sweep so newly added or modified modes appear automatically.

---

## 3. Architecture & Module Seams

### 3.1 Domain Contracts & Role Archetype Precedence (`src/types/core-types.ts`, `src/types/command-types.ts`, `src/types/role-archetypes.ts`)
- **`CapabilityCatalogEntry` & `TelemetryEvent` (`src/types/core-types.ts`)**:
  - Extend `CapabilityCatalogEntry` (and the `agents` array in `Extract<TelemetryEvent, { type: "catalog.hydrated" }>`) with:
    - `mode?: "primary" | "subagent" | "all"`
    - `hidden?: boolean`
    - `disabled?: boolean`
    - `description?: string`
  - Add `availableAgents?: CapabilityCatalogEntry[]` to `WorkshopRoomState` so every room in `GuildSnapshot` carries its own hydrated agent definitions.
  - Export a pure helper `isSelectablePrimaryAgentMode(agent: Pick<CapabilityCatalogEntry, "id" | "mode" | "hidden" | "disabled">): boolean` that returns `true` iff `Boolean(agent?.id) && (agent.mode === "primary" || agent.mode === "all" || !agent.mode) && !agent.hidden && !agent.disabled`.
- **`GuildCommandRequest` (`src/types/command-types.ts`)**:
  - Add the `"agent.switch"` variant:
    ```ts
    | {
        readonly command: "agent.switch";
        readonly sessionId: string;
        readonly directory?: string;
        readonly agentClass: string;
      }
    ```
- **Tier-1 Primary Mode Precedence (`src/types/role-archetypes.ts`)**:
  - Update `resolveGuildRoleArchetype`:
    - When `subagentType` is present, resolve `subagentType` at Tier 1 first.
    - When `agent` (`input.agentClass`) is `"build"`, resolve directly to `"WARRIOR"` at Tier 1 so historical skills or session titles in Tiers 2–3 cannot block a mode switch to `build`.
    - When `agent && agent !== "general"`, resolve via `ROLE_ARCHETYPE_ALIASES[agent.toUpperCase()] ?? matchSpecializedAgentOrSkill(agent)` at Tier 1 (`plan` → `SCOUT`, `document` → `MAGE`, `explore` → `SCOUT`, `review`/`cleric` → `CLERIC`, `prototype`/`alchemist` → `ALCHEMIST`, `demolition`/`sapper` → `SAPPER`).

### 3.2 Ingress & World Reducer Hydration (`src/ingress/daemon-location-state.ts`, `src/ingress/daemon-sse-mapper.ts`, `src/ingress/opencode-client-adapter.ts`, `src/state/batch-reconciler.ts`)
- **`fetchDaemonLocationState` (`src/ingress/daemon-location-state.ts`)**:
  - Preserve `id` (`raw.id ?? raw.name`), `name`, `description`, `mode`, `hidden`, `disabled`, and `color` from `GET /api/agent?location[directory]=...`.
  - Export `evictStaticCatalogCache(directory?: string): void` so SSE `agent.updated` / `config.updated` events or manual refreshes force a fresh `/api/agent` fetch.
- **SSE Cache Invalidation (`src/ingress/opencode-client-adapter.ts`)**:
  - When `/api/event` emits `agent.updated` or `config.updated` (or on `sweepAllLocations(true)`), evict the static catalog cache and re-sweep locations so updated modes propagate live.
- **`handleCatalogHydrated` (`src/state/batch-reconciler.ts`)**:
  - Store full `CapabilityCatalogEntry` metadata (`id`, `name`, `description`, `mode`, `hidden`, `disabled`, `color`, `kind: "agent"`) in `state.catalog.agents[a.id]`.
  - When `event.locationDirectory` is provided and `Array.isArray(event.agents)` is present (and non-empty, so worktrees without independent agent payloads don't wipe a canonical room's hydrated agents), store the normalized `CapabilityCatalogEntry[]` on `room.availableAgents` and mark `collector.changedRoomIds.add(room.roomId)`.
- **Demo Simulator Parity (`src/simulator/scenario-events.ts`, `src/simulator/scenario-presets.ts`)**:
  - Ensure `Demo Guild Simulator` `catalog.hydrated` events include realistic `Agent.Info` entries (`build`, `plan`, `document` with `mode: "primary"`, plus `explore`, `general` with `mode: "subagent"`) so demo presets exercise the exact same `catalog.hydrated` → `room.availableAgents` pipeline without any UI fallback.

### 3.3 Daemon Command Execution, Server Route & HUD View-Model (`src/ingress/daemon-command-ops.ts`, `src/server/command-router.ts`, `src/hud/hud-character-types.ts`, `src/hud/character-sheet-vm.ts`)
- **`executeDaemonCommand` (`src/ingress/daemon-command-ops.ts`)**:
  - Handle `cmd.command === "agent.switch"` by posting `POST /api/session/${encodeURIComponent(cmd.sessionId)}/agent${query}` with `{ agent: cmd.agentClass.trim() }`.
- **`handleGuildCommandRoute` (`src/server/command-router.ts`)**:
  - Validate `command === "agent.switch"` (requiring non-empty `sessionId` and `agentClass`).
  - Dispatch `session.upserted` with `agentClass: cmd.agentClass.trim()` and `preserveActivityTimestamp: true` so the character's `agentClass`, `roleArchetype`, `visualTraits`, and `equipmentLoadout` update immediately in the returned `snapshot` and SSE broadcast.
  - On `command === "scroll.send"`, if `cmd.agentClass?.trim()` is provided and differs from `charBefore?.agentClass`, also update `agentClass` on the character before dispatching `message.user.prompt`.
- **`CharacterSheetViewModel` & `CharacterCommandScrollViewModel` (`src/hud/hud-character-types.ts`, `src/hud/character-sheet-vm.ts`)**:
  - Add `availableAgentModes: readonly CharacterAgentModeOptionViewModel[]` and `canSwitchAgentMode: boolean` (`character.role === "Guild Adventurer" && character.parentId === null`) to `CharacterSheetViewModel` and `CharacterCommandScrollViewModel`.
  - Populate `availableAgentModes` strictly from `room?.availableAgents` filtered by `isSelectablePrimaryAgentMode(a)` (with zero hardcoded fallback list). Each option includes `{ id, displayName, description, colorHex, roleArchetype, isCurrent }`.

### 3.4 Web Summon Modal, Character Sheet Header & Command Scroll Bar (`src/web/app.html`, `src/web/summon-adventurer-controller.ts`, `src/web/side-panel-reconciler.ts`, `src/web/command-scroll-controller.ts`)
- **Summon New Guild Adventurer Modal (`src/web/app.html`, `src/web/summon-adventurer-controller.ts`)**:
  - Remove the 4 hardcoded `<option>` elements (`build`, `plan`, `explore`, `general`) from `#summon-agent-class` in `src/web/app.html`.
  - In `syncSummonModalDom()`, resolve the selected room from `#summon-directory-select` (`clientState.currentSnapshot.rooms[selectedDir]`), filter `room.availableAgents` via `isSelectablePrimaryAgentMode`, and dynamically populate `#summon-agent-class`.
  - Re-sync `#summon-agent-class` whenever `#summon-directory-select` changes.
  - If the room has `0` hydrated primary modes, render `<option value="" disabled selected>Syncing modes from OpenCode...</option>` and disable `#btn-confirm-summon-adventurer` until modes are available.
- **Character Sheet Header Mode Switcher (`src/web/side-panel-reconciler.ts`)**:
  - For root **Guild Adventurers** (`sheet.canSwitchAgentMode`), render an interactive `<select id="sheet-agent-mode-select" class="sheet-agent-mode-select" aria-label="OpenCode Agent Mode">` in `.sheet-hero-sub` populated from `sheet.availableAgentModes` (or a read-only badge if `availableAgentModes.length === 0` or for child **Squad Subagents**).
  - Changing `#sheet-agent-mode-select` immediately dispatches `{ command: "agent.switch", sessionId: sheet.sessionId, directory: rawChar.locationDirectory, agentClass: nextMode }` via `dispatchGuildCommandFromWeb`.
- **Command Scroll Mode Selector (`src/web/command-scroll-controller.ts`)**:
  - In the **Command Scroll** body, render a compact mode pill/selector row (`[data-scroll-agent-mode]`) for root **Guild Adventurers** when `sheet.commandScroll.availableAgentModes.length > 0`, allowing one-click mode switching (`agent.switch`) right from the prompt composer bar.

---

## 4. Verification & Container Deployment Criteria

1. **Automated Unit & Integration Tests (`npm test`)**:
   - `tests/00-architecture-invariants.test.ts`: Every file under `src/` remains `<= 400` lines.
   - Unit and integration tests verifying:
     - `GET /api/agent` hydration of `mode`, `hidden`, `disabled`, `description`, and `color` into `room.availableAgents` and filtering via `isSelectablePrimaryAgentMode` (`build`, `plan`, `document`, custom primary agents included; `explore`, `general`, `compaction`, `title`, `summary` excluded; zero hardcoded fallback when `room.availableAgents` is empty).
     - `resolveGuildRoleArchetype` Tier-1 precedence when switching a character with equipped skills (`@wayfinder`, `@grilling`) or planning titles between `plan` (`SCOUT`), `document` (`MAGE`), and `build` (`WARRIOR`).
     - `POST /api/guild/command` with `command: "agent.switch"` calling `POST /api/session/{sessionID}/agent` on the daemon and immediately updating `char.agentClass`, `char.roleArchetype`, `char.equipmentLoadout.headgear`, and `CharacterSheetViewModel`.
     - Dynamic Summon Modal `<select id="summon-agent-class">` rendering from `room.availableAgents` and live Character Sheet / Command Scroll mode switching.
2. **Mandatory Docker Container Deployment & Visual Proof (`npm run docker:up` on port `4310`)**:
   - Deploy to `opencode-pixel-guild-visualizer` on port `4310`, verify health, capture a live headless Chrome screenshot in `docs/images/dynamic-opencode-character-modes.png`, and visually inspect the rendered UI.
