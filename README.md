# OpenCode Pixel Guild Visualizer [![v0.2.1](https://img.shields.io/badge/v0.2.1-0969da)](https://github.com/nirtus/opencode-pixel-guild/releases/tag/v0.2.1)

**OpenCode Pixel Guild Visualizer** (`opencode-pixel-guild-visualizer`) is a real-time 2D RPG and workshop companion for **OpenCode V2**. It turns live OpenCode hosts, projects, worktrees, root sessions, subagents, tool calls, skills, and debugging turns into an interactive **Guild Floorplan** where heroes craft features inside a shared **Workshop Room** and battle **Bug Monsters** in the **Dungeon Wilds**.

![OpenCode Pixel Guild Visualizer — 4-Scene Intro Sizzle Preview](./assets/images/opencode-pixel-guild-intro-preview.gif)

---

## Table of Contents

1. [What This App Does](#what-this-app-does)
2. [Visual Tour](#visual-tour)
3. [OpenCode V2 to Pixel Guild Mapping](#opencode-v2-to-pixel-guild-mapping)
4. [Guild Role Archetypes & Preparation Stations](#guild-role-archetypes--preparation-stations)
5. [How to Install & Run](#how-to-install--run)
   - [Option 1: Run with Docker Compose (Recommended)](#option-1-run-with-docker-compose-recommended)
   - [Option 2: Run Locally with Node.js 22+](#option-2-run-locally-with-nodejs-22)
   - [Environment Variables](#environment-variables)
6. [How to Use the Visualizer](#how-to-use-the-visualizer)
   - [1. Register or Log In at the Operator Auth Gate](#1-register-or-log-in-at-the-operator-auth-gate)
   - [2. Pair Local or Remote OpenCode Machines](#2-pair-local-or-remote-opencode-machines)
   - [3. Navigate the Floorplan, Project Heraldry & Chamber Focus Modes](#3-navigate-the-floorplan-project-heraldry--chamber-focus-modes)
   - [4. Track Results & Commit Git Changes in the Guild Master Ledger](#4-track-results--commit-git-changes-in-the-guild-master-ledger)
   - [5. Inspect, Chat With & Steer Heroes in the Character Sheet](#5-inspect-chat-with--steer-heroes-in-the-character-sheet)
   - [6. Summon New Adventurers & Demolish Rooms](#6-summon-new-adventurers--demolish-rooms)
   - [7. Mobile & Home-Screen Web App Experience](#7-mobile--home-screen-web-app-experience)
7. [Disclaimer](#disclaimer)

---

## What This App Does

- **Unified Host Workshop Room with Project Heraldry**: All active OpenCode projects and Git worktrees on a paired machine share one **Workshop Room** and **Dungeon Wilds**, distinguished by project-colored uniforms, `[CREST TAG]` nameplates, and North Wall pennants.
- **Autonomous Character Choreography**: **Guild Adventurers** enter through the **South Swinging Guild Door**, walk along smooth floor paths, pace in contemplative circuits while thinking, haul **Resource Cargo** from the **Resource Stockpile**, and work at specialized **Preparation Stations**.
- **Outdoor Debugging Hunts & Monster Combat**: Debugging sessions venture into the **Dungeon Wilds**, cast **Lantern Flares** during searches to clear **Fog of War**, and fight their bound **Bug Monster** until tests pass.
- **Interactive Command & Git Control**: Prompt idle heroes, steer or stop active turns, switch **OpenCode Agent Modes** and **OpenCode Models** (grouped by provider with optional reasoning `#variant` selection) live in **Command Scroll**, attach `@skill` grimoires, answer permission or question **Quest Gates**, and stage or commit Git changes in the **Assembly Commit Ledger**.
- **Inline Mermaid Diagrams**: Fenced `mermaid` blocks inside chat messages in the **Character Sheet** (`Chat` tab) and **Quest Gate** cards render inline as diagrams (flowcharts, sequence, state, class, entity-relationship, and pie charts) with a collapsible `Source` viewer.
- **Long-Session Live Reliability**: Automatically stays synchronized and responsive across long, multi-hour sessions without requiring a page reload.

---

## Visual Tour

| Split Chamber View (`65%` Workshop Room / `35%` Dungeon Wilds) | Dungeon Wilds & Per-Bug Monster Combat |
| :---: | :---: |
| ![Split Chamber Choreography](./assets/images/showcase-split-chamber.png) | ![Dungeon Wilds Bug Combat](./assets/images/showcase-wilds-combat.png) |
| **Character Sheet (`Chat`, Inline Mermaid Diagrams & Model Controls)** | **Assembly Commit Ledger (Interactive Git Staging & Commits)** |
| ![Character Sheet Mermaid & Command Scroll](./assets/images/showcase-hero-chat-mermaid.png) | ![Assembly Commit Ledger](./assets/images/showcase-assembly-commit.png) |
| **Quest Gate Two-Way Sync, Collapse & Quiet Bypass** | **4-Scene Intro Tour (1080p Video)** |
| ![Quest Gate Two-Way Sync](./assets/images/showcase-quest-gate.png) | ![Intro Demo Tour Scene 4 Combat](./assets/images/intro-demo-video.png) · [🎬 `opencode-pixel-guild-intro.mp4` (1080p)](./docs/video/opencode-pixel-guild-intro.mp4) |

---

## OpenCode V2 to Pixel Guild Mapping

| OpenCode V2 Concept | Pixel Guild Entity | How It Behaves in the World |
| :--- | :--- | :--- |
| **Paired OpenCode Host** | **Workshop Room** & **Dungeon Wilds** | One shared guild hall per host machine, switchable from the top header's machine strip. |
| **Project & Git Worktrees** | **Project Heraldry** & **World Focus Aura** | Characters wear project uniforms and `[CREST TAG]` badges; focusing a world highlights its heroes and dims others. |
| **Root Session** | **Guild Adventurer** | Primary 2D RPG hero outfitted according to its active **OpenCode Agent Mode** and **Guild Role Archetype**. |
| **Child Session** | **Squad Subagent** | Summoned at the **Arcane Lectern** pentagram by its parent adventurer, executes delegated tasks, and returns a **Report Scroll** on completion. |
| **Agent Profile** | **OpenCode Agent Mode** | Primary modes (`build`, `plan`, `document`, or custom) selectable on summon or switched live to change the hero's outfit. |
| **Chat Model & Effort** | **OpenCode Model** | Enabled chat models grouped by provider with optional `#variant` effort levels, switched live in **Command Scroll** to update **Context Mana** capacity immediately. |
| **Tool Execution** | **Preparation Station** & **Work Implement** | Heroes walk to the matching station perimeter and wield the corresponding craft implement. |
| **Loaded Skill** (`@skill`) | **Skill Grimoire** | Equipped at the **Armory Wardrobe** and carried in the hero's off-hand across turns. |
| **MCP Servers & Plugins** | **Resource Stockpile** & **Resource Cargo** | North-wall supply depot where heroes pick up raw materials before heading to workstations. |
| **Feature Tasks & Modified Files** | **Goal Assembly Site** & **Project Mini-Assemblies** | Central platform showing per-project **Mini-Assemblies** in `🌐 All` mode or a full-scale assembly platform when a single project is focused. |
| **Debugging & Failing Tests** | **Dungeon Wilds**, **Lantern Flares** & **Bug Monsters** | Searches pulse **Lantern Flares** through **Fog of War**; fixes and test runs send heroes to fight their bound **Bug Monster**. |
| **Context Window & Compaction** | **Context Mana** & **Compaction Exhalation** | Context usage bar; compaction plays an in-place **Compaction Exhalation** (`Compacting...`) vapor cloud above the hero. |
| **Permissions & Questions** | **Quest Gate** (`!` Lock / `?` Question) | Overhead alert marker that pauses the hero when approval or answers are needed, stays in sync if you answer directly in OpenCode TUI/CLI/web, and lets you answer, collapse (`Collapse ▾`), or quietly bypass (`Bypass ✕`) choices in the **Character Sheet**. |
| **Completed Session Output** | **Unread Session Result** (`✓ Result Ready`) | Finished sessions rest in the **Break Lounge** with a `✓ Result Ready` badge until viewed, stay resting while their tab remains open in OpenCode, and archive automatically once closed so `Active Squads` counts stay in sync with your live sessions. |
| **User Prompt Dispatch** | **Command Scroll** | Always-accessible prompt composer (`/` shortcut, available even beneath an active **Quest Gate**) for switching **OpenCode Agent Mode**, **OpenCode Model** (and optional `#variant`), attaching `@skill` grimoires, waking idle heroes, steering busy turns, bypassing a gate, or stopping execution. |
| **Working-Tree Git Changes** | **Assembly Commit Ledger** | Built-in Git panel for inspecting diffs, staging or discarding files, syncing remotes, and sealing commits. |

---

## Guild Role Archetypes & Preparation Stations

### Six Guild Role Archetypes (RPG Jobs)

| Archetype | OpenCode Modes & Specialties | Combat Weapon Archetype (Dungeon Wilds) |
| :--- | :--- | :--- |
| **`WARRIOR`** | `build` mode, feature implementation, debugging, and test/fix tasks | **Broadsword Cleave** with Heater Shield |
| **`MAGE`** | `general` and `document` modes, planning specifications, documentation, and orchestration | **Crystal Staff Arcane Barrage** with Runic Sigil |
| **`SCOUT`** | `plan` mode, codebase exploration, research, and reconnaissance | **Longbow Riser Grip** with Feathered Arrow Volley |
| **`ALCHEMIST`** | Prototyping, refactoring, architecture design, and MCP synthesis | **Steel Dagger Viper Thrust** with Sonic Ring |
| **`CLERIC`** | Code reviews, design interviews, pull requests, and QA verification | **Steel Dagger Viper Thrust** with Speed Streaks |
| **`SAPPER`** | Cleanup, pruning, and worktree or container teardown | **Overhead Miner's Pickaxe Slam** with Shockwave Ring |

### Indoor Preparation Stations & Fixtures

| Station / Fixture | Location in Workshop Room | Triggered By | Work Implement Held |
| :--- | :--- | :--- | :--- |
| **Library Study Bookshelf** | North-West Wall | Reading files, searching code, and browsing directories | Open Codex & Magnifying Loupe |
| **Observatory Spyglass** | North Wall | Web searches, fetching web pages, and checking external docs | Brass Spyglass Telescope & Compass |
| **Resource Stockpile** | North Wall | MCP servers, plugins, and external workspace inputs | Timber Planks, Stone Block, Iron Bar, Crystal, Scroll |
| **Anvil Forge** | North-East Corner | Running shell commands, builds, and tests | Blacksmith's Forge Hammer & Iron Tongs |
| **Crafting Workbench** | West Wall (Upper) | Creating, editing, and patching files | Brass Machinist Spanner & Blueprint Board |
| **Armory Wardrobe** | West Wall (Lower) | First tool pickup or loading `@skill` grimoires | Skill Grimoire & Equipment Loadout |
| **Arcane Lectern** | South-West Corner | Spawning and coordinating subagents | Runic Summoning Tome & Pentagram Circle |
| **Alchemy Lab** | South-East Wall (Upper) | Refactoring, synthesis, and scripted batch actions | Wooden Stirring Ladle & Boiling Flask |
| **Break Lounge** | South-East Corner | Idle, resting, or completed sessions | Hearth Fireplace, Tavern Table & Armchair |
| **Goal Assembly Site** | Center of Room | Fitting **Assembly Parts** from uncommitted project changes | Blueprint Platform & Clockwork Gears |

---

## How to Install & Run

### Prerequisites

- **Docker Runtime (Recommended)**: **Docker** and **Docker Compose**.
- **Local Node.js Runtime**: **Node.js 22+** and **Git**.

### Option 1: Run with Docker Compose (Recommended)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/nirtus/opencode-pixel-guild.git
   cd opencode-pixel-guild
   ```

2. **Build and start the container on port `4310`:**
   ```bash
   npm run docker:up
   ```

3. **Open the visualizer in your browser:**
   Visit **[http://127.0.0.1:4310](http://127.0.0.1:4310)**.

4. **Manage the container:**
   ```bash
   docker ps --filter "name=opencode-pixel-guild-visualizer"
   npm run docker:logs
   npm run docker:down
   ```

### Option 2: Run Locally with Node.js 22+

```bash
# Start the visualizer on http://127.0.0.1:4310
npm start
```

### Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `4310` | Port for the visualizer web app. |
| `HOST` | `0.0.0.0` | Network interface bind address. |
| `OPENCODE_SERVICE_URL` | *(auto-discovered)* | Explicit default URL for an OpenCode V2 daemon (e.g., `http://127.0.0.1:4096`). |
| `OPENCODE_SERVICE_PASSWORD` | *(empty)* | Optional password or bearer token for `OPENCODE_SERVICE_URL`. |
| `OPENCODE_SERVICE_FILE` | `~/.local/state/opencode/service.json` | Path to the local OpenCode service discovery file. |
| `OPENCODE_DAEMON_PORT` | `4096` | Default OpenCode daemon port used when resolving local pairing links inside Docker. |
| `OPENCODE_DOCKER_HOST` | `host.docker.internal` | Hostname used inside Docker to reach a daemon on the host machine. |

---

## How to Use the Visualizer

### 1. Register or Log In at the Operator Auth Gate

![Operator Auth Gate & Registration](./assets/images/showcase-auth-gate.png)

- Enter a **Username**, **Password**, and optional **Guild Master Alias**, then click **✨ Create Account** (or switch to **🔑 Sign In**).
- Each operator account is saved locally on your machine with its own worlds, preferences, and paired OpenCode machines.
- Once signed in, clicking **`👤`** opens the compact **Guild Operator Profile** modal (with collapsible **Change Password**, **Switch / Register**, **Logout**, and a collapsed **⚠️ Danger Zone** for account deletion) without duplicating the machine pairing form.

---

### 2. Pair Local or Remote OpenCode Machines

| OpenCode Machine Pairing Modal (`Link / QR` & `Manual URL`) | Paired Machine Strip & Live Availability |
| :---: | :---: |
| ![OpenCode Machine Pairing & QR Scanner](./assets/images/showcase-machine-pairing.png) | ![Responsive Paired Machine Strip & Live Availability](./assets/images/showcase-machine-strip.png) |

- Click **`🔗 Pair OpenCode`** / **`+ Pair`** in the top header (or switch to **`🔗 Machines`** inside the profile modal on compact phones) to open the **OpenCode Machine Pairing** window.
- Use **🖥️ Detect Local OpenCode** for local auto-discovery, or toggle between **📷 Link / QR** (paste an `opencode pair --remote` / `opencode pair --url http://<LAN-IP>:4096` link or terminal QR, scan via camera, or upload/paste a QR screenshot) and **🔧 Manual URL** (direct daemon URL + optional password/token). Pairing CLI hints expand automatically when `0` machines are paired and tuck into a collapsible **❓ Pairing Commands** disclosure once configured.
- Click any paired machine in the top header bar to switch your active **Workshop Room** immediately—showing `⏳ Switching...` while loading, displaying live availability (`🟢 Connected` vs. `🟠 Offline`) across every paired machine in the header and **OpenCode Machines** modal, and keeping each machine's worlds, heroes, agent modes, **Lifetime Tribute**, and Git changes cleanly isolated.
- When you pair many machines, the top machine bar adapts to your screen width, trims long names cleanly, and shows `◀` / `▶` scroll buttons (plus horizontal wheel scrolling) so every machine stays easy to reach.

---

### 3. Navigate the Floorplan, Project Heraldry & Chamber Focus Modes

| `🌐 All` Worlds Selected (All-Worlds Game Master Aggregation) | Specific World Selected (Single-World Scope & Subagent Roster) |
| :---: | :---: |
| ![All Worlds Game Master Scope](./assets/images/showcase-all-worlds.png) | ![Single World Game Master Scope](./assets/images/showcase-single-world.png) |

- **Project Worlds Bar (`Worlds:`)**: Select `🌐 All` to view all projects together with composite **Project Mini-Assemblies** (`★ DONE`, `⚙️ IN PROGRESS`, `📐 OPEN`, `✨ READY`), or click a project pill (e.g., `opencode-pixel-guild` or `arcane-engine`) to focus its heroes with an underfoot **World Focus Aura** and scope the **Spectator Drawer** to that project.
- **Add Project Worlds (`＋`)**: Click `＋` at the end of the `Worlds:` bar to browse workspace folders discovered directly on the currently active **OpenCode Machine Pairing**, register a folder as a new project world, or immediately summon an adventurer into it.
- **Chamber Focus (`World:` Toolbar)**: Switch between `Auto` (expands **Dungeon Wilds** automatically during outdoor bug hunts), `Room`, `Wilds`, and `Both` (`65% / 35%` split).
- **Camera & Layout Controls**: Drag to pan, scroll or click `-` / `+` to zoom, drag the vertical divider to resize the desktop split, or toggle `Hide World` / `⇥` to collapse either pane.

---

### 4. Track Results & Commit Git Changes in the Guild Master Ledger

Clicking empty floor space (or pressing `Escape`) opens the **Guild Master Ledger** (`General` tab):

#### `Overview & Roster` Subtab

- **Completed Session Results (Unread)**: Displays finished sessions waiting with `✓ Result Ready`; clicking any entry opens **Hero Chat** and marks the result as read.
- **Telemetry, Lifetime Tribute & Demolition**: Shows active hero count, world count, cumulative **Lifetime Tribute** (`🪙 Tokens` and `💰 Cost`), and—when a single world is focused—the **Demolish** button.
- **Goal Assembly & Active Room Roster**: Summarizes assembly progress with an inline **🔄 Sync Git** action, lists active **Bug Monsters**, and provides a quick-jump roster whose header shows `agents <count> | show subagents <count>` with a `show subagents` checkbox (agent and subagent counts stay stable regardless of subagent visibility). When `show subagents` is enabled, **Squad Subagents** appear grouped directly beneath their parent **Guild Adventurer** (or parent **Squad Subagent**, up to 3 nesting levels) with **Project Heraldry**-tinted tree connectors (`├─` / `└─`), indented child rows, and `✦ <class>` badges, while detached subagents stay at the top level with their project badge retained.

#### `Assembly & Commit` Subtab

| Standard Volume Level (`LVL 2 STD · 3/5`) & Commit Ledger | Bulk Volume Level (`LVL 4 BULK · 18/48`) |
| :---: | :---: |
| ![Assembly Commit Ledger](./assets/images/showcase-assembly-commit.png) | ![Bulk Goal Assembly Volume Level](./assets/images/showcase-assembly-bulk.png) |

- Select a project repository using the single-row project switcher at the top of **Goal Assembly Site**.
- On the 2D **Goal Assembly Site** in the center of the **Workshop Room**, **Assembly Parts** scale dynamically across 5 visual volume levels (`Level 0 READY`, `Level 1 LIGHT` for `1–4` items, `Level 2 STD` for `5–12` items, `Level 3 HVY` for `13–24` items, and `Level 4 BULK` for `25+` items), grouping large change sets into stacked cluster bays (`#01–#06`, `X/Y ITEMS`) while keeping the full per-file list inspectable in `Assembly & Commit`.
- Inspect uncommitted working-tree files (`[STAGED]`, `[MOD]`, `[NEW]`), stage or unstage changes, discard edits, sync with upstream (`🔄 Sync Git`), and click **Seal & Commit** to commit changes and reset the assembly platform.

---

### 5. Inspect, Chat With & Steer Heroes in the Character Sheet

Click any hero on the canvas or in the roster to open their **Character Sheet** (`Hero` tab):

| `Chat` (Mermaid Diagrams, Model/Variant & Command Scroll) | Active `?` Quest Gate (Two-Way Sync, Collapse & Bypass) |
| :---: | :---: |
| ![Character Sheet Mermaid & Command Scroll](./assets/images/showcase-hero-chat-mermaid.png) | ![Quest Gate Two-Way Sync, Collapse & Bypass](./assets/images/showcase-quest-gate.png) |
| **`Scrolls & Gear` (Equipment Loadout & Grimoires)** | **`Tool Log` (Executed Tool & Shell History)** |
| ![Character Sheet Scrolls & Gear](./assets/images/showcase-hero-scrolls-gear.png) | ![Character Sheet Tool Log](./assets/images/showcase-hero-tool-log.png) |

- **`Chat`**: Review the **Adventurer Dispatch Log** (collapsed into one-liners by default; click any row or `Expand All ▾` for full Markdown, including inline **Mermaid diagrams** with a collapsible `Source` viewer), answer, collapse (`Collapse ▾`), or quietly bypass (`Bypass ✕`) `!` Permission and `?` Question **Quest Gates** with clickable option pills (or answer directly in OpenCode TUI/CLI/web with automatic two-way sync), and use the always-accessible bottom **Command Scroll** composer (`/` shortcut) to attach `@skill` badges, switch **OpenCode Agent Modes** and **OpenCode Models** (with optional `#variant` effort selection), and wake, steer, bypass a gate, or stop the hero with clear error feedback if a command cannot be delivered.
- **`Details`**: Inspect read-only session ID, active **OpenCode Model** (with `#variant` when active), **Context Mana** utilization (`used / limit` tokens), **Lifetime Tribute** cost, **Workflow Intent**, target station, and subagent lineage.
- **`Scrolls & Gear`**: View the hero's RPG **Equipment Loadout** (Headgear, Robes, Main-Hand Implement, Off-Hand Relic), equipped **Skill Grimoires**, connected MCP plugins, and tool belt counts.
- **`Tool Log`**: Browse the chronological history of executed tool and shell calls with input/output previews and station routing tags.

---

### 6. Summon New Adventurers & Demolish Rooms

![Summon New Guild Adventurer](./assets/images/showcase-summon-modal.png)

- **Summon an Adventurer (`✨ Summon`)**: Choose a target project directory, select an **OpenCode Agent Mode** (`build`, `plan`, `document`, or custom), optionally attach `@skill` badges from the **Available Skills Browser** (each badge sized to its own text and showing as many as fit cleanly in the row), and send an opening prompt (or summon an idle hero) through the **South Swinging Guild Door**.
- **Demolish a Room (`Demolish`)**: When viewing a single project world in `Overview & Roster`, click **Demolish** and confirm to terminate its active sessions, running terminals, and worktree resources.
- **Safe, Adaptive Dialogs**: Every dialog adapts cleanly to desktop, tablet, and phone screens with scrollable content and closes only when you click **Cancel** or **✕**, preventing accidental dismissal.

---

### 7. Mobile & Home-Screen Web App Experience

| Mobile Workshop Room (`World` Tab) | Mobile Dungeon Wilds Combat | Mobile Guild Master Ledger (`General` Tab) | Mobile Character Sheet (`Hero` Tab) |
| :---: | :---: | :---: | :---: |
| ![Mobile Workshop Room](./assets/images/showcase-mobile-room.png) | ![Mobile Dungeon Wilds](./assets/images/showcase-mobile-wilds.png) | ![Mobile Guild Master Ledger](./assets/images/showcase-mobile-ledger.png) | ![Mobile Character Sheet](./assets/images/showcase-mobile-hero.png) |

- **Bottom Navigation Bar**: Switch between `🌍 World`, `📜 General`, `🧙 Hero`, and `⚡ Ticker` with live badge counters and Quest Gate alert indicators.
- **Mobile-Adapted Floorplan & Drawer**: Simplifies the central **Goal Assembly Site** into a high-contrast progress ring on compact screens and scrolls the `General` ledger as a unified mobile page so nothing is hidden behind notches or mobile browser bars.

---

## Disclaimer

*OpenCode Pixel Guild Visualizer (`opencode-pixel-guild`) is an independent, community-built project and is not built by or affiliated with the OpenCode or Anomaly team in any way.*
