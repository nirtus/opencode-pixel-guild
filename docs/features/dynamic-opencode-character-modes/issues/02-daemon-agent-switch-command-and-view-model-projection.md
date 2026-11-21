# 02: Daemon Agent-Switch Command, Server Route & HUD View-Model Projection

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01
Depends on: [01: Dynamic Per-Room OpenCode Agent Mode Hydration & Tier-1 Role Archetype Precedence](./01-dynamic-room-agent-mode-hydration-and-archetype-precedence.md)
Unblocks: [03: Dynamic Summon Modal & Interactive Character Sheet / Command Scroll Mode Switcher](./03-dynamic-summon-modal-and-interactive-character-mode-switcher.md)

## Answer

Added `agent.switch` to `GuildCommandRequest` (`src/types/command-types.ts`), implemented `POST /api/session/{sessionID}/agent` in `executeDaemonCommand` (`src/ingress/daemon-command-ops.ts`), updated `handleGuildCommandRoute` (`src/server/command-router.ts`) to reconcile `agentClass` immediately in the reducer on both `agent.switch` and `scroll.send`, and projected `canSwitchAgentMode`, `selectedAgentClass`, and `availableAgentModes` onto `CharacterSheetViewModel` and `CharacterCommandScrollViewModel` (`src/hud/hud-character-types.ts`, `src/hud/character-sheet-vm.ts`).

## Question / Objective

How do we expose a standalone `agent.switch` command across the server command router and OpenCode V2 daemon client (`POST /api/session/{sessionID}/agent`), immediately reconcile `agentClass`, `roleArchetype`, `visualTraits`, and `equipmentLoadout` in the world reducer, and project the room's dynamically discovered primary-capable **OpenCode Agent Mode**s into `CharacterSheetViewModel` and `CharacterCommandScrollViewModel` with zero hardcoded fallback?

## Deliverables

1. **Command Contract & Daemon Execution (`src/types/command-types.ts`, `src/ingress/daemon-command-ops.ts`)**:
   - Add `{ readonly command: "agent.switch"; readonly sessionId: string; readonly directory?: string; readonly agentClass: string }` to `GuildCommandRequest`.
   - Handle `cmd.command === "agent.switch"` in `executeDaemonCommand` (`src/ingress/daemon-command-ops.ts`) by calling `POST /api/session/${encodeURIComponent(cmd.sessionId)}/agent${query}` with `{ agent: cmd.agentClass.trim() }`.
2. **Server Command Route & Immediate Reducer Reconciliation (`src/server/command-router.ts`)**:
   - Accept and validate `command === "agent.switch"` (requiring non-empty `sessionId` and `agentClass`).
   - Dispatch `session.upserted` with `agentClass: cmd.agentClass.trim()` and `preserveActivityTimestamp: true` so the character's `agentClass`, `roleArchetype`, `visualTraits`, and `equipmentLoadout.headgear` update immediately in the returned `snapshot` and SSE stream.
   - Also ensure that when `command === "scroll.send"` includes a non-empty `agentClass`, `handleGuildCommandRoute` updates the character's `agentClass` via `session.upserted` alongside `message.user.prompt`.
3. **Character Sheet & Command Scroll View-Model Projection (`src/hud/hud-character-types.ts`, `src/hud/character-sheet-vm.ts`)**:
   - Define `CharacterAgentModeOptionViewModel` (`{ id, displayName, description, colorHex, roleArchetype, isCurrent }`).
   - Add `canSwitchAgentMode: boolean` (`character.role === "Guild Adventurer" && character.parentId === null`) and `availableAgentModes: readonly CharacterAgentModeOptionViewModel[]` to `CharacterSheetViewModel` and `CharacterCommandScrollViewModel`.
   - Populate `availableAgentModes` strictly from `room?.availableAgents` filtered by `isSelectablePrimaryAgentMode`—with **zero hardcoded fallback list** when `room?.availableAgents` is empty or undefined.
4. **Tests**:
   - Add unit and HTTP route tests verifying `POST /api/guild/command` with `command: "agent.switch"`, daemon `POST /api/session/{sessionID}/agent` invocation, immediate reducer/headgear/archetype update, and `CharacterSheetViewModel.availableAgentModes` projection (both with hydrated room modes and with `0` modes when unhydrated, plus `canSwitchAgentMode === false` for **Squad Subagents**).
   - Keep all files under `src/` `<= 400` lines.
