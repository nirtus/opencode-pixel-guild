# Universal Scene Hover Tooltips with Actual OpenCode V2 Object Bindings

Type: prototype
Status: closed
Blocked by: 05, 06, 07

## Architectural Decisions Settled

- **Unified `buildSceneObjectTooltip` Seam in `src/hud/spectator-hud.ts` (`Q4: A`)**:
  - Expose a single tooltip builder covering all interactive floorplan entities (`character`, `workstation`, `alcove`, `summoning-pad`, and `break-lounge`) and register canvas hitboxes for every object in every `Workshop Room`.
- **Mandatory OpenCode V2 Object Transparency (`Q4: A`)**:
  - Every hover tooltip and `Character Sheet` section must pair its Guild RPG metaphor with the **actual OpenCode V2 identifiers, tool command names, skill IDs, file paths, or shell commands** so the user immediately understands what is happening in OpenCode:
    1. **Character Hover (`kind: "character"`)**:
       - Session title, exact OpenCode `sessionId`, `agent` class, and `modelId`.
       - **Current OpenCode Activity**: Exact status (`Walking to Anvil Forge -> shell` or `Executing read at Archive Radar`) + live tool command and argument preview (e.g., `shell: git status`, `read: src/server/main.ts`, `skill: codebase-design`).
       - **Equipped Loadout (`equipmentLoadout`)**: Headgear (`[agent: ...]`), Robes (`[skills: ... · N calls]`), Main-Hand Weapon (`[tool: ...]`), Off-Hand Relic (`[skill / subagent: ...]`), active `SKILL.md` IDs, and Tool Belt execution counts (`read ×12 · shell ×8 · edit ×5`).
       - Telemetry footer: `Context Mana` % (`usedTokens / limitTokens`) and `$USD` session cost.
    2. **Core `Workstation` Hover (`kind: "workstation"`)**:
       - Station name (`Drafting Table`, `Archive Radar`, `Arcane Lectern`, `Anvil Forge`, `Reactor Console`, `Comms Dish`, `Altar of Compaction`), exact OpenCode V2 tools mapped to that station (e.g., `Anvil Forge -> bash, shell, terminal, test`), what those tools do in OpenCode, active/walking occupants with their current tool arguments, and recent room tool calls at that station.
    3. **`Plugin Alcove` (`kind: "alcove"`, including `[MUX]` overflow), `Summoning Pad` (`kind: "summoning-pad"`), and `Break Lounge` (`kind: "break-lounge"`) Hover**:
       - `Plugin Alcove`: OpenCode plugin/MCP namespace, connection status (`connected`, `needs_auth`, `failed`, `disabled`), error details, and active tool calls.
       - `Summoning Pad`: OpenCode `subagent` tool binding, active child `Squad Subagent` sessions in the room, and completed subagent lineage count.
       - `Break Lounge`: OpenCode `session.idle` state binding, `recentlyIdle` Hearth Table sessions vs. `historical` Session Bench sessions, and Squad Bench trophy count.
