# Feature Map: Dynamic OpenCode Character Modes & Live Agent Mode Switching

Label: wayfinder:map

## Destination

Deliver the complete specification in [Feature Specification: Dynamic OpenCode Character Modes & Live Agent Mode Switching](./spec.md) through three vertical-slice tickets so that every **Workshop Room** dynamically hydrates its actual **OpenCode Agent Mode**s (`plan`, `build`, `document`, and custom primary agents) from OpenCode (`GET /api/agent?location[directory]=...`) with zero hardcoded fallback list, and operators can set or switch a **Guild Adventurer**'s mode both when summoning and live from the **Character Sheet** header and **Command Scroll** bar (`POST /api/session/{sessionID}/agent`):

1. **[01: Dynamic Per-Room OpenCode Agent Mode Hydration & Tier-1 Role Archetype Precedence](./issues/01-dynamic-room-agent-mode-hydration-and-archetype-precedence.md)** (`Blocked by: None`)
2. **[02: Daemon Agent-Switch Command, Server Route & HUD View-Model Projection](./issues/02-daemon-agent-switch-command-and-view-model-projection.md)** (`Blocked by: 01`)
3. **[03: Dynamic Summon Modal & Interactive Character Sheet / Command Scroll Mode Switcher](./issues/03-dynamic-summon-modal-and-interactive-character-mode-switcher.md)** (`Blocked by: 01, 02`)

## Notes

- **Domain**: **OpenCode Agent Mode**, **Guild Adventurer**, **Squad Subagent**, **Guild Role Archetype**, **Equipment Loadout**, **Character Sheet**, **Command Scroll**, **Workshop Room**.
- **Specification**: [Feature Specification: Dynamic OpenCode Character Modes & Live Agent Mode Switching](./spec.md).
- **Skills to consult**: `opencode`, `codebase-design`, `domain-modeling`, `tdd`, `code-review`.
- **Standing Rules**:
  - Work strictly inside the project root directory (`./`). Never create git worktrees or write files to `/tmp` or `/tmp/opencode`.
  - Keep every source file under `src/` `<= 400` lines (`tests/00-architecture-invariants.test.ts`).
  - Zero hardcoded fallback mode list (`Q5`): selectable modes must come strictly from the room's hydrated `GET /api/agent` catalog.
  - Deploy and verify on the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`) and inspect a live screenshot in `docs/images/dynamic-opencode-character-modes.png`.

## Decisions so far

- [Grilling & Domain Modeling Alignment (Q1–Q5)](./spec.md): Locked end-to-end dynamic `GET /api/agent` hydration per **Workshop Room** (`Q1`), primary-capable mode filtering (`(mode === "primary" || mode === "all" || !mode) && !hidden && !disabled`) for root **Guild Adventurers** with read-only badges for child **Squad Subagents** (`Q2`), instant `agent.switch` (`POST /api/session/{sessionID}/agent`) controls in the **Character Sheet** header and **Command Scroll** bar (`Q3`), Tier-1 **Guild Role Archetype** precedence for explicit `agentClass` including `build` → `WARRIOR` (`Q4`), and strict per-room dynamic mode hydration with zero hardcoded fallback list (`Q5`). Updated `GLOSSARY.md` accordingly.
- [Tickets 01–03 Resolved (TDD Red-Green Verified)](./issues/03-dynamic-summon-modal-and-interactive-character-mode-switcher.md): Implemented `isSelectablePrimaryAgentMode`, per-room `availableAgents` hydration, `agent.switch` and `scroll.send` mode reconciliation, `#command-scroll-agent-select` alongside `#btn-send-command-scroll`, and `#summon-action-agent-select` alongside `#btn-confirm-summon-adventurer` (`tests/39-opencode-mode-selection-send-and-summon.test.ts`).

## Not yet specified

<!-- All wayfinder fog has graduated into spec.md and tickets 01..03 -->

## Out of scope

- Allowing child **Squad Subagents** (`parentID != null`) to switch primary session modes (child subagents execute a single spawned subagent task).
- Modifying indoor **Preparation Station** coordinates or **Dungeon Wilds** combat mechanics.
