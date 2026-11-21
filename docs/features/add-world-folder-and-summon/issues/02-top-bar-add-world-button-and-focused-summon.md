# 02: Top-Bar `+` Add World Button, Folder Picker Modal, Dynamic Agent Modes & Focused-Folder Summon

Type: task
Label: wayfinder:task
Status: resolved
Blocked by: 01

## Question

How should the top `Worlds:` row (`#room-filter-buttons`) expose the trailing `+` button to add a folder as a new world, and how should selecting that world and clicking `Summon` open an OpenCode session inside that folder project with its discovered **OpenCode Agent Modes**?

## Specification

Confirmed in Grilling Round 1 (`Q1`, `Q3`, `Q5`) and [Feature Specification](./../spec.md):
- **Trailing `+` Button in `#room-filter-buttons` (`src/web/top-bar-reconciler.ts`, `src/web/styles.css`, `src/web/styles-components.css`)**:
  - Append `button#btn-add-world-folder` (`data-tab-key="proj:add"`, class `btn btn-add-world`, text `＋`, `title="Add folder as new Project World"`, `aria-label="Add folder as new World"`) as the last button in `#room-filter-buttons` on every `reconcileTopBar` pass (both when `projTabs.length > 0` and in the `0`-rooms state).
  - Clicking `#btn-add-world-folder` opens `#add-world-folder-modal`.
- **`Add World Folder` Modal (`src/web/app.html` & `src/web/add-world-folder-controller.ts`)**:
  - Keep `src/web/app.html` (`<= 150 lines`) and all `src/web/*.ts` files (`<= 400 lines`) within architecture limits.
  - Render `#add-world-folder-modal` with:
    - A clickable list of workspace folders loaded from `GET /api/guild/workspace-folders` (`#add-world-folder-list`) showing folder name, git badge, and whether it is already in `Worlds:`.
    - A text input (`#add-world-directory-input`) for typing/pasting a folder path or selecting a folder from the list.
    - **`➕ Add World` (`#btn-confirm-add-world`)**: POSTs `{ directory }` to `/api/guild/room`, updates `clientState.currentSnapshot`, calls `selectCommitRepository(result.roomId)` so the new world pill (`<crest> <project> (0) ✨`) is immediately focused in `#room-filter-buttons`, and closes the modal.
    - **`✨ Add & Summon Adventurer` (`#btn-add-world-and-summon`)**: Registers and focuses the folder world via `POST /api/guild/room`, closes `#add-world-folder-modal`, and calls `openSummonAdventurerModal(result.locationDirectory)`.
- **Focused-World Summon Targeting & Post-Summon Focus (`src/web/summon-adventurer-controller.ts`, `src/web/client-state.ts`, `src/web/world-persistence.ts`)**:
  - When `openSummonAdventurerModal(preferredDirectory?)` is called, set the initial selected directory in `#summon-directory-select` to `preferredDirectory || getDefaultSummonDirectory()` (where `getDefaultSummonDirectory()` returns the focused world's canonical `locationDirectory` when a world pill is active in `#room-filter-buttons`).
  - Preserve any user-selected value in `#summon-directory-select` across background SSE `syncSummonModalDom()` updates while `clientState.isSummonModalOpen` is `true`.
  - Populate `#summon-agent-class` and `[data-summon-agent]` mode buttons from the snapshot's primary-capable **OpenCode Agent Modes** (`build`, `plan`, `document`, and custom primary agents).
  - When `submitSummon()` succeeds:
    - Focus and persist the target room's canonical project root via `selectCommitRepository(canonicalProjectRoot)` so the summoned character's world pill is active in `#room-filter-buttons` with **World Focus Aura**.
    - Call `reconcileMobileDrawerSelection(newSessionId, clientState.selectedSessionId)` (updating `reconcileMobileDrawerSelection` to resolve `resolveRoomCanonicalProjectRoot(room).projectRoot` instead of raw worktree `roomId`).
- **Container Deployment & Visual Verification**:
  - Update `README.md` and `GLOSSARY.md` to document the `+` Add World button in the top `Worlds:` row and focused-folder summoning.
  - Deploy to `opencode-pixel-guild-visualizer` (`npm run docker:up` on port `4310`), run `npm test`, and capture headless Chrome visual proof in `docs/images/`.

## Answer

Implemented the trailing `＋` icon button (`#btn-add-world-folder`, `data-tab-key="proj:add"`) at the right end of `#room-filter-buttons` in `src/web/top-bar-reconciler.ts`, created `src/web/add-world-folder-controller.ts` for `#add-world-folder-modal` (`GET /api/guild/workspace-folders` folder picker, custom path input, `➕ Add World`, and `✨ Add & Summon Adventurer`), updated `src/web/summon-adventurer-controller.ts` and `src/web/client-state.ts` to lock `#summon-directory-select` to the focused world's canonical folder without SSE clobbering, dynamically populate primary **OpenCode Agent Modes** from `snapshot.availableAgentModes`, and focus the target canonical project world after summoning. Deployed and verified on the `opencode-pixel-guild-visualizer` Docker container (`docs/images/add-world-folder-and-summon.png`).

## Acceptance Criteria

- [x] `#btn-add-world-folder` (`＋`, `data-tab-key="proj:add"`) renders at the right end of `#room-filter-buttons` in the top `Worlds:` row.
- [x] Clicking `＋` opens `#add-world-folder-modal` with discovered workspace folders and path input; adding a folder creates and focuses its world tab (`(0)` sessions) in the top `Worlds:` row.
- [x] Selecting that world tab (or clicking `✨ Add & Summon Adventurer`) and summoning a character opens the OpenCode session in that folder project (`?location[directory]=...`), spawns the **Guild Adventurer** into that world with **Project Heraldry** and **World Focus Aura**, and updates the world tab count to `(1)`.
- [x] `#summon-adventurer-modal` offers dynamically hydrated primary **OpenCode Agent Modes** (`build`, `plan`, `document`, etc.) and never resets `#summon-directory-select` on background SSE ticks while open.
- [x] Deployed and verified on the `opencode-pixel-guild-visualizer` Docker container (`port 4310`) with visual proof in `docs/images/`.
