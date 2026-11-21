# Specification: Unified Host Workshop Room & Multi-Project Heraldry

Label: ready-for-agent
Status: resolved

## Problem Statement

When a **Guild Operator** works across multiple repositories opened simultaneously in the same connected OpenCode host (**OpenCode Machine Pairing**), the visualizer currently isolates each repository into a separate room behind top-bar filter tabs. While the operator is viewing one project, every active **Guild Adventurer** and **Squad Subagent** working in sibling projects on the same host is hidden from the **Guild Floorplan** and **Spectator Drawer**. Blocking **Quest Gates** (`!` permission locks and `?` question prompts), **Summoning Rituals**, and **Debugging Hunt** encounters occurring in another open project go unnoticed unless the operator manually cycles through tabs.

Furthermore, because character party palettes were previously seeded per session rather than per project, two characters working on the same project wear mismatched uniforms while characters from different projects lack any visual or HUD indicator showing which project they belong to once placed inside the same **Workshop Room**. Room-shared fixtures—including the North Wall banner, **Dungeon Wilds** **Bug Monsters**, **Guild Master Ledger**, **Character Sheet**, and **Assembly Commit Ledger**—also assume single-project isolation rather than multi-project co-habitation.

## Solution

Combine all characters of the same connected OpenCode host into one unified **Workshop Room** and adjacent **Dungeon Wilds** on the **Guild Floorplan**, eliminating per-project room separation while introducing a five-layer **Project Heraldry** system so spectators can immediately distinguish which project each **Guild Character**, **Bug Monster**, and **Assembly Part** belongs to:

1. **Unified Host `Workshop Room` Co-Habitation**:
   - All active **Guild Adventurers** and **Squad Subagents** across every project and Git worktree opened on the active **OpenCode Machine Pairing** inhabit and work together inside the same **Workshop Room** and **Dungeon Wilds**.
   - In `Active Squads` **Roster Visibility Mode**, every actively executing, blocked, or recently active character across all open projects on the host appears together on the floorplan; when the entire host is idle, the most recent non-archived root **Guild Adventurer** from each open project rests in the **Break Lounge** so every open project remains visibly represented.
   - Top-bar project pills act as a non-isolating **Project Heraldry** legend and **Assembly Commit Ledger** repository selector rather than hiding characters from sibling projects.
2. **Five-Layer `Project Heraldry` Representation**:
   - **Project-Seeded Guild Order Uniforms**: Every project on the host is deterministically assigned a collision-free Guild Order palette (Crimson & Gold `🛡️`, Sapphire & Ice `❄️`, Emerald & Oak `🌿`, Amethyst & Dusk `🔮`, Radiant Gold `☀️`, Ocean Teal `⚓`, Forged Steel `⚒️`, Turquoise & Dune `🏜️`, Cobalt & Lightning `⚡`). All **Guild Adventurers** and child **Squad Subagents** belonging to the same project wear matching Guild Order uniform colors while preserving their individual **Guild Role Archetype** (`MAGE`, `WARRIOR`, `SCOUT`, `ALCHEMIST`, `CLERIC`, `SAPPER`) and facial identity.
   - **Underfoot Project Pedestal Ring**: Each character stands on a glowing ground ring in their project's heraldic colors—a solid ring for a root **Guild Adventurer** and a dashed ring in the same project color for a child **Squad Subagent**.
   - **Two-Segment Heraldic Nameplate**: Beneath each character on the canvas, a two-part nameplate renders a colored project crest and short tag (`[🛡️ GAME-VIZ]`, `[❄️ API-GW]`, plus a `🌿` indicator for Git worktrees) alongside the character's session title.
   - **North Wall Host Guild Hall Banner & Project Pennants**: The North Wall displays the connected OpenCode host's Guild Hall title flanked by colored heraldic pennants for each active project co-habiting the room.
   - **Project-Badged Wilds, Ledger, Character Sheet & Commit Repository Selector**: **Bug Monsters** in the **Dungeon Wilds** carry their source project prefix (`🐛 [API-GW] BUG: ...`); every character row in the **Guild Master Ledger** and the header of the **Character Sheet** displays the character's **Project Heraldry** pill; and the **Assembly Commit Ledger** (`Assembly & Commit` subtab) provides a compact project repository selector pill bar so Git diffs, staging, and commits remain scoped to a specific project repository.

## User Stories

1. As a **Guild Operator** with multiple projects opened in the same host OpenCode daemon, I want all active **Guild Adventurers** and **Squad Subagents** from every open project to appear and work together inside the same **Workshop Room**, so that I can monitor all of my host's active sessions in one place without switching room tabs.
2. As a **Guild Operator**, I want a **Guild Adventurer** blocked at a **Quest Gate** (`!` permission lock or `?` question prompt) in any open project on the host to be immediately visible inside the shared **Workshop Room** and in the **Guild Master Ledger** `Overview` alert card, so that I never miss a blocked session in a second project.
3. As a **Guild Operator** watching characters from multiple projects inside the same **Workshop Room**, I want all characters from the same project to wear the same Guild Order uniform palette and characters from different projects to wear distinct, collision-free Guild Order uniform palettes, so that I can identify project teammates at a glance.
4. As a **Guild Operator**, I want each character within a project to retain their individual **Guild Role Archetype** (`MAGE`, `WARRIOR`, `SCOUT`, `ALCHEMIST`, `CLERIC`, `SAPPER`) and facial identity while wearing their project's Guild Order uniform colors, so that role specialization and project affiliation are both clear.
5. As a **Guild Operator**, I want child **Squad Subagents** to inherit their parent **Guild Adventurer**'s **Project Heraldry** uniform palette and display a dashed underfoot pedestal ring in that project's color, so that subagent lineage and project membership are both unmistakable.
6. As a **Guild Operator**, I want root **Guild Adventurers** to stand on a solid underfoot pedestal ring in their project's heraldic color, so that I can visually distinguish root sessions from child **Squad Subagents** while seeing their project color on the floor.
7. As a **Guild Operator**, I want each character's underfoot canvas nameplate to display a two-segment badge—the project's crest and short tag on the left in the project's primary color, and the character's session title on the right—so that I can read both the project name and session title directly on the **Guild Floorplan**.
8. As a **Guild Operator** using Git worktrees within a project, I want characters working inside a worktree to share their parent project's **Project Heraldry** uniform and crest while displaying a compact `🌿` worktree indicator on their badge, so that worktree sessions stay grouped with their project in the shared room.
9. As a **Guild Operator**, I want multiple characters from different projects who visit the same **Preparation Station** (`Library Study Bookshelf`, `Crafting Workbench`, `Anvil Forge`, `Armory Wardrobe`, `Observatory Spyglass`, `Arcane Lectern`, `Alchemy Lab`) or the **Break Lounge** to occupy adjacent non-overlapping slots, so that cross-project co-habitation remains legible and uncluttered.
10. As a **Guild Operator** in `Active Squads` **Roster Visibility Mode** when no session is actively running on the host, I want the single most recent non-archived root **Guild Adventurer** from each open project to rest in the **Break Lounge**, so that every open project on the host remains represented in the room.
11. As a **Guild Operator** toggling to `Full Lineage` **Roster Visibility Mode**, I want to see the combined historical roster of retired **Guild Adventurers** and completed **Squad Subagents** across all projects on the host, each badged with its **Project Heraldry**.
12. As a **Guild Operator**, I want the North Wall of the **Workshop Room** to display the connected OpenCode host's Guild Hall banner along with colored heraldic pennants for each active project in the room, so that the room architecture reflects all projects currently hosted inside it.
13. As a **Guild Operator**, I want the top-bar project strip to serve as a non-isolating **Project Heraldry** legend showing each active project's crest, color, and active character count, where clicking a project pill focuses that project for Git commit inspection without hiding characters from other projects on the **Guild Floorplan**.
14. As a **Guild Operator** during a **Debugging Hunt**, I want **Bug Monsters** spawned in the shared **Dungeon Wilds** to display their source project's short tag (`🐛 [PROJECT] BUG: ...`) and heraldic accent on their overhead banner, so that I know which project's defect each monster represents.
15. As a **Guild Operator** viewing the **Guild Master Ledger** (`Overview` and `Roster` subtabs), I want every character row to include a colored **Project Heraldry** pill alongside the character's title and **Workflow Intent** badge, so that I can scan and jump to characters by project.
16. As a **Guild Operator** inspecting a hero's **Character Sheet** (`Hero` tab), I want the sheet header and `Details` subtab to display the character's **Project Heraldry** badge and project directory path, so that I always know which repository the selected character operates in.
17. As a **Guild Operator** dispatching a **Command Scroll** or terminating a character from the **Character Sheet**, I want the command to route to that character's exact project or worktree directory on the OpenCode daemon, so that multi-project room unification never sends prompts or deletes to the wrong directory.
18. As a **Guild Operator** opening the `Assembly & Commit` subtab in the **Guild Master Ledger**, I want a compact project repository selector pill bar (defaulting to the currently selected character's project or the most recently active project on the host) that scopes the **Goal Assembly Site** checklist and **Assembly Commit Ledger** Git status, diffs, staging, and commits to the chosen repository.
19. As a **Guild Operator** summoning a new **Guild Adventurer**, I want the summon modal to let me choose any open project directory on the host (displaying each project's crest and name) and immediately materialize the new adventurer inside the shared **Workshop Room** wearing that project's **Project Heraldry**.
20. As a **Guild Operator** switching between different registered machines via the top-header **OpenCode Machine Pairing** pills, I want the unified **Workshop Room** to transition atomically to the newly selected host's projects and characters.

## Implementation Decisions

1. **Follow `ADR-0001` (Host-Level Spatial Unification with Preserved Repository Metadata)**:
   - Keep per-project directory records (`locationDirectory`, `projectId`, `projectName`, `taskProgress`) intact in the state store and on each character state record so OpenCode V2 directory-scoped daemon requests, feature issue scanning, and Git working-tree commands operate on each project's true filesystem path.
   - Unify the spatial projection and client visibility selector so the **Guild Floorplan** renders one shared **Workshop Room** and **Dungeon Wilds** containing characters from all projects on the active **OpenCode Machine Pairing**.
2. **Deterministic, Collision-Free `Project Heraldry` Resolver**:
   - Introduce a pure **Project Heraldry** resolver module that accepts a character or room and the current host snapshot, canonicalizes the project root path (collapsing Git worktrees into their parent project's heraldry while flagging `isWorktree`), and deterministically maps each project on the host to a unique Guild Order palette from the 9 canonical party rosters (`01`..`10`) using hash seeding with linear-probing collision avoidance across sorted host project IDs.
   - Derive a concise uppercase `shortTag` (3–10 characters) and a distinct `crestIcon` per party palette.
   - Seed character uniform palettes (`partyKey`) from the character's canonical `projectId` rather than `sessionId`, while resolving the character's individual hero rig from their stable **Guild Role Archetype**.
3. **Cross-Project Floorplan Visibility & Non-Isolating Project Legend**:
   - Update the visible room character selector to include characters from all rooms on the host snapshot rather than filtering by `selectedProjectId`.
   - Sort visible characters by active open state first and most recent activity second. In `Active Squads` mode, return all actively open characters across the host (up to 16); when zero characters are actively executing or blocked on the host, return the single most recent non-archived root **Guild Adventurer** from each open project (up to 4) resting in the **Break Lounge**.
   - Repurpose `selectedProjectId` from an isolating room filter into the active **Repository Focus Target** used by the **Assembly Commit Ledger**, the **Goal Assembly Site** header, and the default directory in the Summon Adventurer modal. When a character is selected on the canvas or in the roster, automatically sync the repository focus target to that character's project.
4. **Canvas Heraldry Rendering (Pedestal Rings, Two-Segment Nameplates & North Wall Pennants)**:
   - Render an underfoot heraldic pedestal ellipse beneath every character in their project's primary and accent colors (solid stroke for root **Guild Adventurers**, dashed stroke for child **Squad Subagents**).
   - Render a two-segment underfoot nameplate pill: left segment filled with the project's primary hex displaying the project crest and `shortTag` (plus `🌿` when `isWorktree` is true); right segment displaying the character's truncated session title; outer border stroked in the project's accent hex.
   - Render the connected host's Guild Hall title on the North Wall banner along with colored project pennants for each active project on the host.
5. **Multi-Project Dungeon Wilds, Ledger & Character Sheet Integration**:
   - Aggregate active **Bug Monsters** in the **Dungeon Wilds** across all visible characters in the unified host room and prefix each monster's overhead banner with its source project's `[SHORT-TAG]`.
   - Display a colored **Project Heraldry** badge pill on every character row in the **Guild Master Ledger** (`Overview` and `Roster` subtabs), in scene hover tooltips, and in the **Character Sheet** header.
   - Render a project repository selector pill bar at the top of the `Assembly & Commit` subtab whenever multiple projects exist on the host so the operator can switch which repository's tasks and Git working tree are inspected and committed.

## Testing Decisions

- **What Makes a Good Test**:
  - Tests must exercise observable behavior through public module interfaces (the **World State Reducer**, the **Project Heraldry & Spatial Selector**, the **Spectator HUD View-Model Builders**, and the **Canvas / DOM Reconcilers**) using multi-project snapshots—never private internal helpers.
- **Primary Testing Seams**:
  1. **Unified Host Spatial & Project Heraldry Seam**: Given a `GuildSnapshot` with sessions across multiple distinct OpenCode projects and Git worktrees on the same host, verify that:
     - All active characters across all open projects are returned together for the shared **Workshop Room** (never hidden when another project is focused for Git commit);
     - Each project receives a collision-free Guild Order palette, crest, and `shortTag`;
     - Characters in the same project (including worktrees and child **Squad Subagents**) share their project's uniform palette while keeping their individual **Guild Role Archetype**.
  2. **Spectator HUD & Canvas Heraldry Seam**: Given a multi-project host snapshot, verify that:
     - Canvas character rendering paints the two-segment `[CREST SHORT-TAG] Title` nameplate, underfoot project pedestal ring, and North Wall project pennants;
     - **Dungeon Wilds** **Bug Monsters** carry their source project's `[SHORT-TAG]` prefix;
     - **Guild Master Ledger** roster rows, **Character Sheet** headers, and the **Assembly Commit Ledger** repository selector accurately reflect and switch per-project metadata.
- **Prior Art in Codebase**:
  - `tests/08-choreography-encounters-and-project-isolation.test.ts`
  - `tests/10-articulated-character-graphics.test.ts`
  - `tests/18-top-bar-world-navigation-and-operator-deepening.test.ts`
  - `tests/22-character-lifecycle-and-v2-parity.test.ts`

## Out of Scope

- Merging characters from *different* paired physical hosts (**OpenCode Machine Pairings**) into the same room—each paired machine represents a distinct host OpenCode daemon and remains switched via the top-header machine pills.
- Executing a single atomic Git commit across multiple unrelated Git repositories at once (the **Assembly Commit Ledger** commits to one selected project repository at a time).

## Further Notes

- Respects [ADR-0001: Unified Host Workshop Room and Project Heraldry](../../adr/0001-unified-host-workshop-room-and-project-heraldry.md) and the canonical domain terms in [`GLOSSARY.md`](../../../GLOSSARY.md).
