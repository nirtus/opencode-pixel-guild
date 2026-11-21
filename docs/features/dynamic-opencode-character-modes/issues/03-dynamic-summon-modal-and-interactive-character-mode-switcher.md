# 03: Dynamic Summon Modal & Interactive Character Sheet / Command Scroll Mode Switcher

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01, 02
Depends on: [01: Dynamic Per-Room OpenCode Agent Mode Hydration & Tier-1 Role Archetype Precedence](./01-dynamic-room-agent-mode-hydration-and-archetype-precedence.md), [02: Daemon Agent-Switch Command, Server Route & HUD View-Model Projection](./02-daemon-agent-switch-command-and-view-model-projection.md)

## Answer

Mounted `#command-scroll-agent-select` directly alongside `#btn-send-command-scroll` in `.command-scroll-compose-row` (`src/web/command-scroll-controller.ts`, dispatching `agent.switch` on change and `agentClass` on `scroll.send`) and `#summon-action-agent-select` directly alongside `#btn-confirm-summon-adventurer` (`src/web/app.html`, `src/web/summon-adventurer-controller.ts`, synced with `#summon-agent-class` and room-scoped `availableAgents`). Verified with `tests/39-opencode-mode-selection-send-and-summon.test.ts` and live Docker container deployment (`docs/images/opencode-mode-selection-send-and-summon.png`).

## Question / Objective

How do we replace the hardcoded 4-option `<select>` in the **Summon New Guild Adventurer** modal with the selected **Workshop Room**'s actual OpenCode modes, and render an interactive **OpenCode Agent Mode** switcher in the **Character Sheet** header and **Command Scroll** composer bar for root **Guild Adventurers**?

## Deliverables

1. **Dynamic Summon Modal (`src/web/app.html`, `src/web/summon-adventurer-controller.ts`)**:
   - Remove the hardcoded `build`, `plan`, `explore`, `general` `<option>` tags from `#summon-agent-class` in `src/web/app.html`.
   - In `syncSummonModalDom()` (`src/web/summon-adventurer-controller.ts`), look up the target **Workshop Room** from `#summon-directory-select` (`clientState.currentSnapshot.rooms`), filter `room.availableAgents` via `isSelectablePrimaryAgentMode`, and render `<option>` elements strictly from those actual room modes.
   - Re-sync `#summon-agent-class` whenever `#summon-directory-select` changes.
   - When a room has `0` hydrated primary modes, render `<option value="" disabled selected>Syncing modes from OpenCode...</option>` and disable `#btn-confirm-summon-adventurer` until actual modes are hydrated.
2. **Interactive Character Sheet Header Mode Switcher (`src/web/side-panel-reconciler.ts`, `src/web/styles-components.css`)**:
   - For root **Guild Adventurers** (`sheet.canSwitchAgentMode && sheet.availableAgentModes.length > 0`), render an interactive `<select id="sheet-agent-mode-select" class="sheet-agent-mode-select" aria-label="OpenCode Agent Mode">` in `.sheet-hero-sub` showing the room's dynamic modes (`⚔️ build`, `📐 plan`, `📜 document`, or custom primary agents), with the character's current `agentClass` selected.
   - For child **Squad Subagents** (`!sheet.canSwitchAgentMode`) or when `sheet.availableAgentModes.length === 0`, render the read-only `.val-gold` agent badge.
   - Include `agentClass: sheet.agentBadge.agentId` and `modes: sheet.availableAgentModes.map((m) => m.id)` in `lastSidePanelSignature` so mode updates immediately re-render the header and subtabs.
   - On `change` of `#sheet-agent-mode-select`, dispatch `{ command: "agent.switch", sessionId: sheet.sessionId, directory: rawChar.locationDirectory, agentClass: selectEl.value }` via `dispatchGuildCommandFromWeb`.
3. **Synced Command Scroll Mode Selector (`src/web/command-scroll-controller.ts`)**:
   - In `reconcileInteractiveCommandSlot`, include `sheet.agentBadge.agentId` and `sheet.commandScroll.availableAgentModes.map((m) => m.id).join(",")` in `interactiveKey`.
   - When `sheet.commandScroll.canSwitchAgentMode && sheet.commandScroll.availableAgentModes.length > 0`, render a compact mode pill row (`.scroll-agent-mode-row`) with buttons `[data-scroll-agent-mode="<id>"]` inside `.command-scroll-body` so operators can switch the character's mode (`agent.switch`) with a single click while composing a **Command Scroll**.
4. **Tests & Container Verification (`npm run docker:up` on port `4310`)**:
   - Add DOM/controller tests verifying dynamic Summon Modal option rendering (including zero-fallback empty state when `availableAgents` is empty) and live mode switching from `#sheet-agent-mode-select` and `[data-scroll-agent-mode]`.
   - Deploy to the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`), run `npm test`, capture a live screenshot at `docs/images/dynamic-opencode-character-modes.png`, and visually verify the rendered result.
