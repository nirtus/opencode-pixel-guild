# Specification: Top-Bar `+` World Folder Registration & Focused-World `Guild Adventurer` Summoning

## Problem Statement

1. **No `+` Button in the Top `Worlds:` Selection Row (`#room-filter-buttons`) to Register a Folder as a New World**:
   - In `src/web/top-bar-reconciler.ts`, `#room-filter-buttons` only renders `proj:all` (`🌐 All`) and passive tabs for existing `snapshot.rooms` (`proj:${tab.projectId}`).
   - A **Guild Operator** cannot add a folder from the top `Worlds:` row to create a new project world (`World Folder Registration`) and summon a **Guild Adventurer** into that folder project.

2. **Shallow Leaks Across World Selection, Summon Directory Targeting, and `0`-Session World Retention**:
   - **Hydration Clobber (`src/web/world-persistence.ts` & `src/web/top-bar-reconciler.ts`)**: `reconcileTopBar` calls `resolveProjectWorldAfterHydration(projTabs, clientState.selectedProjectId)` on every render, and `computeHydratedProjectSelection` silently overwrites `selectedProjectId` with `projTabs[0].projectId` if a newly selected/added project is not yet matched.
   - **SSE Summon Dropdown Clobber (`src/web/summon-adventurer-controller.ts`)**: `syncSummonModalDom()` runs on every `scheduleHudSync()` SSE frame while `#summon-adventurer-modal` is open and overwrites `dirSelect.innerHTML`, resetting any user directory change back to `getDefaultSummonDirectory()`.
   - **Post-Summon Focus Drift (`src/web/client-state.ts`)**: `reconcileMobileDrawerSelection` sets `selectedProjectId = ch.roomId` (which can be a worktree directory instead of the canonical project root) only when `!clientState.isAllWorldsFocused`, and does not call `persistProjectWorldSelection`.
   - **Inaccurate `0`-Session Count (`src/spatial/project-world.ts`)**: `layoutProjectWorld` falls back to `fallbackRoomCount = 1` instead of `0` when `Object.keys(snapshot.characters).length === 0`, causing an empty world to display `(1)` instead of `(0)`.
   - **Passive-Only Discovery & Demolition Tombstone Blocking (`src/ingress/opencode-client-adapter.ts`, `src/state/batch-reconciler.ts`, `src/server/operator-registry.ts`)**:
     - `runSweepAllLocations` only queries `client.getProjects()` and `client.getLocations()`, dropping any `0`-session folder not yet known to the OpenCode daemon.
     - `deletedRoomDirs` (`opencode-client-adapter.ts`) and `state.deletedRoomIds` (`batch-reconciler.ts`) block re-adding a previously demolished folder while it has `0` sessions.
     - `pairDaemon` (`operator-registry.ts`) skips hydrating `prevSnap.rooms` when `Object.keys(prevSnap.characters).length === 0`.
   - **Container (`/workspaces`) ↔ Host Daemon Path Translation**:
     - Inside the `opencode-pixel-guild-visualizer` Docker container (`..:/workspaces:rw`), sibling folders on the host machine live at `/workspaces/<folder-name>`, whereas the host OpenCode daemon expects the host's native path format (`/mnt/c/...`, `C:/...`, or `/home/...`).
   - **Static Agent Mode Options in Summon Modal (`src/web/app.html` & `src/web/summon-adventurer-controller.ts`)**:
     - `#summon-adventurer-modal` hardcodes `build`, `plan`, `explore`, `general` instead of dynamically hydrating primary-capable **OpenCode Agent Modes** (`GET /api/agent?location[directory]=...` filtered to `(mode === "primary" || mode === "all" || !mode) && !hidden && !disabled`) for the target folder world.

---

## Core Design Decisions (Confirmed in Grilling Round 1, Q1–Q5)

### Decision 1: Trailing `+` Icon Button in `#room-filter-buttons` & `Add World Folder` Modal (`Q1`)

- **Top-Bar `Worlds:` Row (`src/web/top-bar-reconciler.ts`, `src/web/styles.css`, `src/web/styles-components.css`)**:
  - Always render a compact trailing `+` icon button (`button#btn-add-world-folder`, `data-tab-key="proj:add"`, class `btn btn-add-world`, text `＋`, `aria-label="Add folder as new World"`, `title="Add folder as new Project World"`) immediately to the right of the world buttons in `#room-filter-buttons` (both when `projTabs.length > 0` and when `0` worlds exist).
- **`Add World Folder` Modal (`src/web/app.html` & `src/web/add-world-folder-controller.ts` or `src/web/summon-adventurer-controller.ts`)**:
  - Clicking `#btn-add-world-folder` opens the **Add World Folder** modal (`#add-world-folder-modal`) containing:
    1. **Workspace Folder Browser**: Fetches `GET /api/guild/workspace-folders` (with optional `?parent=...` drill-down) and renders clickable folder pills/rows for sibling project folders discovered in the workspace root (`/workspaces` or the host parent directory) with badges indicating git repositories and already-registered worlds. Clicking a folder populates the path input (and supports navigating into subfolders).
    2. **Direct Folder Path Input (`#add-world-directory-input`)**: Allows pasting or typing any host or workspace path (`C:\Users\...\my-app`, `/mnt/c/Users/.../my-app`, `/home/.../my-app`, `/workspaces/my-app`, or a folder name under the workspace root).
    3. **Actions**:
       - **`➕ Add World` (`#btn-confirm-add-world`)**: Sends `POST /api/guild/room` with `{ directory }`, updates `clientState.currentSnapshot`, focuses the newly registered world (`selectCommitRepository(roomId)`), and closes the modal.
       - **`✨ Add & Summon Adventurer` (`#btn-add-world-and-summon`)**: Registers and focuses the new world via `POST /api/guild/room`, closes the Add World modal, and immediately opens `#summon-adventurer-modal` pre-targeted to that folder's `locationDirectory`.

### Decision 2: Server & Ingress World-Folder Registration, Workspace Browsing & Host Path Translation (`Q2`, `Q4`)

- **Dedicated Server Route Module (`src/server/workspace-folder-routes.ts` wired into `src/server/api-router.ts`)**:
  - **`GET /api/guild/workspace-folders`**:
    - Infers the host workspace parent prefix from existing daemon projects/locations (`getProjects()`, `getLocations()`, or active `snapshot.rooms` — e.g., if `opencode-game-visualizer` is at `/mnt/c/Users/developer/Documents/Development/opencode-game-visualizer` or `C:/Users/developer/Documents/Development/opencode-game-visualizer`, the host workspace parent prefix is `/mnt/c/Users/developer/Documents/Development` or `C:/Users/developer/Documents/Development`).
    - Scans the local workspace root (`/workspaces` inside Docker, or `path.dirname(process.cwd())` on host) — or a requested `?parent=` directory — for subdirectories (excluding hidden `.git`, `node_modules`, `.worktrees`).
    - Returns each directory entry with:
      - `name`: folder basename
      - `hostPath`: translated host-native directory path (using the inferred host parent prefix so the OpenCode daemon can open sessions in it directly)
      - `normalizedPath`: `normalizeLocationDirectory(hostPath)`
      - `isGitRepo`: whether `.git` exists in that directory
      - `alreadyAdded`: whether `snapshot.rooms` already includes `normalizedPath`
  - **`POST /api/guild/room` (and `registerLocation` on `OpenCodeClientAdapter`)**:
    - Accepts `{ directory: string, projectName?: string }`.
    - Resolves container `/workspaces/<rel>` or bare folder names against the inferred host workspace parent prefix so `rawDirectory` is in the host OpenCode daemon's native path format (`C:/...` or `/mnt/c/...` or `/home/...`), and verifies that the folder exists locally (via `resolveLocalProjectDir`) when on a local daemon.
    - Clears any prior demolition tombstones (`state.deletedRoomIds.delete(normDir)` via reducer and `deletedRoomDirs.delete(normDir)` in `OpenCodeClientAdapter`).
    - Records `{ rawDirectory, projectId: normDir, isWorktree: false }` in `OpenCodeClientAdapter` so subsequent `sweepAllLocations` runs include this registered `0`-session folder, and records the raw daemon path in `daemon-http-client.ts` (`rawDirByNormDir`).
    - Dispatches `location.discovered` (creating the `WorkshopRoomState` in `snapshot.rooms` and persisting it to `GuildChronicleStore`), immediately hydrates `tasks.hydrated` (`deriveProjectTaskProgress(rawDirectory)`), and queries `getLocationState(rawDirectory)` to hydrate `catalog.hydrated` (including the folder's primary **OpenCode Agent Modes** from `GET /api/agent?location[directory]=...`).
    - Returns `{ ok: true, roomId: normDir, locationDirectory: normDir, rawDirectory, snapshot }`.
- **Durable `0`-Session Worlds & Non-Phantom Summon (`Q4`)**:
  - In `src/spatial/project-world.ts`, fix `layoutProjectWorld` and `countProjectSessions` so a project world with `0` matching characters always reports `sessionCount: 0` (`(0)` on the top-bar pill) even when `Object.keys(snapshot.characters).length === 0`.
  - In `src/server/operator-registry.ts`, ensure `pairDaemon` hydrates `prevSnap` when `Object.keys(prevSnap.rooms).length > 0` as well as when characters exist, preserving `0`-session registered worlds.
  - In `src/server/command-router.ts`, when `cmd.command === "adventurer.summon"` and `daemonRes && !daemonRes.ok`, do **not** dispatch a synthetic `ses_summon_*` character into `activeReducer`; return `{ ok: false, error: daemonRes.error, snapshot: snapshotBefore }` so failed daemon summons never spawn phantom characters.

### Decision 3: Focused-World Summon Targeting & Dynamic `OpenCode Agent Mode` Hydration (`Q3`, `Q5`)

- **Focused-World Summon Directory (`src/web/summon-adventurer-controller.ts` & `src/web/client-state.ts`)**:
  - When opening `#summon-adventurer-modal` (`openSummonAdventurerModal(preferredDirectory?: string)`), initialize `#summon-directory-select` to `preferredDirectory || getDefaultSummonDirectory()` (which resolves `getSelectedProjectRoom()?.locationDirectory` when a world is focused in the top `Worlds:` row).
  - Do **not** overwrite `dirSelect.value` on background SSE `syncSummonModalDom()` ticks while the modal is already open if the user has selected a directory in `#summon-directory-select` that still exists in `allRooms`.
  - After a successful `adventurer.summon`, resolve the canonical project root of the target room (`resolveRoomCanonicalProjectRoot(room).projectRoot || normalizeLocationDirectory(directory)`), call `selectCommitRepository(canonicalProjectRoot)` so the top `Worlds:` row focuses and persists that folder world with **World Focus Aura**, and call `reconcileMobileDrawerSelection(newSessionId, prevSessionId)` so the **Character Sheet** opens to the new **Guild Adventurer**'s `Chat` subtab.
- **Dynamic `OpenCode Agent Mode` Discovery per Folder World (`Q5`)**:
  - In `src/ingress/daemon-location-state.ts` and `src/state/batch-reconciler.ts`, normalize `/api/agent` items using `id = (a.id || a.name || "").trim()` and preserve `{ mode, hidden, disabled, description, color }`, filtering or tagging primary-capable modes (`(a.mode === "primary" || a.mode === "all" || !a.mode) && !a.hidden && !a.disabled`).
  - In `src/web/summon-adventurer-controller.ts`, populate `#summon-agent-class` and `[data-summon-agent]` buttons dynamically from the snapshot catalog's primary-capable **OpenCode Agent Modes** (e.g. `build`, `plan`, `document`, plus any custom primary agents discovered for that folder), defaulting to `build`.

---

## Verification & Acceptance Criteria

1. **Top-Bar `+` World Button & Add World Folder Modal**:
   - `#room-filter-buttons` renders `button#btn-add-world-folder` (`data-tab-key="proj:add"`, `＋`) immediately to the right of the world buttons.
   - Clicking `＋` opens `#add-world-folder-modal`, lists available workspace directories from `GET /api/guild/workspace-folders`, and accepts custom directory paths.
   - Clicking `➕ Add World` registers the folder via `POST /api/guild/room`, adds its heraldic world button (`<crest> <name> (0) ✨`) to `#room-filter-buttons`, and focuses it.
   - Clicking `✨ Add & Summon Adventurer` registers + focuses the folder world and opens `#summon-adventurer-modal` pre-selected to that folder.

2. **Focused-World Summoning & OpenCode Session Creation in That Folder Project**:
   - Selecting a world pill in `#room-filter-buttons` and clicking `✨ Summon` pre-selects that world's folder in `#summon-directory-select` without background SSE ticks resetting the dropdown.
   - Submitting `Summon Adventurer` sends `POST /api/guild/command` (`adventurer.summon`) with that folder's directory, which translates `/workspaces/<folder>` (if applicable) to the host daemon's native path and calls `POST /api/session?location[directory]=<hostDir>` on the OpenCode daemon.
   - The newly created **Guild Adventurer** spawns at the South Swinging Guild Door inside that project world with **Project Heraldry** and **World Focus Aura**, and the top-bar world pill updates from `(0)` to `(1)`.

3. **Dynamic Primary `OpenCode Agent Mode` Selection**:
   - Hydrated primary agents from `GET /api/agent?location[directory]=...` (`build`, `plan`, `document`, and custom primary agents, excluding subagent-only `explore`/`general` and `hidden` agents) populate the Summon modal's mode selector.

4. **400-Line Ceiling & Live Docker Container Visual Proof**:
   - Every file under `src/` remains `<= 400` lines (`tests/00-architecture-invariants.test.ts`).
   - Deployed and verified on `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`) with headless Chrome screenshot proof saved in `docs/images/`.
