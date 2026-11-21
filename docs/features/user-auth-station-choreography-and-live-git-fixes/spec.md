# Specification: User Registration/Login & Multi-Machine OpenCode Pairing Windows, Deterministic Station Routing & Committed Walk Queue, Real Host Git Commit CRUD & Feature Retirement, Border-Locked Camera & iPhone Safe-Area Top Bar

Label: ready-for-agent
Status: resolved

## Problem Statement

1. **Missing Visible User Registration, Login, Profile Configuration & Multi-Machine OpenCode Pairing Windows**: The visualizer lacks visible top-bar buttons and dedicated windows for **Guild Operator** registration, login, profile configuration, and managing multiple **OpenCode Machine Pairings** across different machines. Previously, pairing was hidden behind an unlabelled status indicator, accounts were not persisted to disk with login credentials, and users could not register, log in, or manage multiple paired OpenCode endpoints.
2. **Incorrect Station Routing (`Enchanter` Instead of `Library` and `Armory`) & Mid-Path U-Turns**: Characters performing file reads (`read`, `glob`, `grep`, `list`, `lsp`) or equipping skills (`skill` tool or `@skill`) were routed to the **Arcane Lectern** (`Enchanter` summoning circle) because station classification checked stale `lastEquippedToolCategory === "skill"` before checking the active `read` tool, and mapped `skill` to `Enchanter` instead of **Armory Wardrobe**. Furthermore, a 1.45-second wall-clock Armory timer expired while characters were still walking across the room (a 3–7 second walk), causing characters to brake in the middle of their path and reverse back to their previous station or **Bug Monster**.
3. **Broken Container Git Commit & Leftover Assembly Parts After Commit**: Inside the container deployment, only partial read-only mounts were attached, causing `git status` to report phantom diffs and `git commit` (`Seal & Commit`) to fail against the host working tree. Additionally, completed features remained stuck on the **Goal Assembly Site** whenever any unrelated untracked file (such as a screenshot) existed in the repository.
4. **Room Pushed Outside Screen, Mobile Post-Navigation Un-Anchored Room & iPhone Home Screen Top-Bar Blur**: Camera pan clamping allowed a `±50%` viewport margin over a 1600px width even in single-chamber mode, permitting drags to push the **Workshop Room** off-screen. On mobile, camera fitting ran before the world container was unhidden on tab navigation (and was skipped outside `auto` mode), leaving the room un-anchored after navigating. On iPhone Home Screen (iOS standalone PWA / notch / Dynamic Island), the top bar lacked `viewport-fit=cover` and `env(safe-area-inset-top)` padding and mobile action buttons were hidden, making **Project Worlds** and account/pairing functions inaccessible in the status-bar blur zone.

## Solution

1. **Full User Auth, Profile Management & Multi-Machine OpenCode Pairing System**: Add prominent top-bar `👤 Login / Account` and `🔗 Pair OpenCode` buttons (visible on both desktop and mobile) that open a multi-window modal with four dedicated views:
   - **`Login` Window**: Authenticate with username and password (`POST /api/guild/auth/login`) to load the operator's isolated workspace, saved preferences, and paired OpenCode machines.
   - **`Register` Window**: Create a new disk-persisted **Guild Operator** account (`POST /api/guild/auth/register`) with username, password, and optional initial machine pairing.
   - **`OpenCode Machines` Window**: Full CRUD for multiple **OpenCode Machine Pairings** across different machines (`POST /api/guild/users/me/machines`, `PATCH /api/guild/users/me/machines/:machineId`, `DELETE /api/guild/users/me/machines/:machineId`), allowing the user to add named machines (e.g., local workstation, remote server, laptop), test reachability, switch the active paired machine, edit credentials, or remove machines.
   - **`Profile & Config` Window**: Update display alias, change password, configure default preferences, log out (`POST /api/guild/auth/logout`), or delete the account (`DELETE /api/guild/users/me`).
2. **Deterministic Action-to-Station Routing & Non-Interruptible Committed Walk Queue**: Route `read`, `glob`, `grep`, `list`, `ls`, `lsp`, and `codesearch` strictly to **Library Study Bookshelf** (`Library`); route `skill` equipping strictly to **Armory Wardrobe** (`Armory`); ensure the active or latest tool always takes precedence over historical categories; and lock each character walk leg until the character arrives at the destination and completes a minimum station dwell (`1.2s`), queuing subsequent targets in `pendingSlot` so characters never brake or reverse direction mid-path.
3. **Real Read-Write Host Git Commit CRUD & Feature-Scoped Retirement**: Mount the host repository and parent workspace directories read-write into the container so `Stage`, `Unstage`, `Discard`, and `Seal & Commit` execute real Git commands against the host working tree with explicit UI feedback (`✅ Committed <hash>: <subject>`). Retire completed feature folders as soon as the feature directory itself has no uncommitted Git changes (or immediately upon `Seal & Commit`), resetting the **Goal Assembly Site** to `0/0 Blueprint Ready` with zero leftover parts.
4. **Border-Locked Chamber Camera, Post-Navigation Mobile Re-Anchoring & iPhone Safe-Area Top Bar**: Lock single-chamber pan at fit zoom (`zoom <= 1.0`) to `0px` off-screen margin and clamp zoomed-in pan strictly inside the active chamber's walls. Run drawer chrome visibility updates before camera fitting across all focus modes (`auto`, `workshop`, `wilds`, `split`) and attach a `ResizeObserver` to the canvas stage so mobile navigation always redraws the room anchored to all 4 borders. Add `viewport-fit=cover`, `env(safe-area-inset-top)` padding, and accessible mobile top-bar buttons so iPhone Home Screen users can cleanly switch **Project Worlds** and open the Account/Pairing windows.

## User Stories

1. As a **Guild Operator**, I want a visible `👤 Login / Register` button in the top bar on both desktop and mobile, so that I can immediately find and open the user authentication system.
2. As a **Guild Operator**, I want a dedicated **Register Window** where I can create an account with a username, password, and optional initial OpenCode daemon URL, so that my account and workspace are persisted to disk across server restarts.
3. As a **Guild Operator**, I want a dedicated **Login Window** where I can sign in with my username and password, so that I can access my private workspace, saved **Project World**, and paired OpenCode machines from any browser or device.
4. As a **Guild Operator**, I want my logged-in username displayed on the top-bar account button (`👤 <Username>`), so that I always know which account is active.
5. As a **Guild Operator**, I want a visible `🔗 Pair OpenCode` button in the top bar, so that I can open the **OpenCode Machines Window** with one click/tap.
6. As a **Guild Operator**, I want to add multiple **OpenCode Machine Pairings** (each with a machine label, daemon URL, and optional auth password/token) inside the **OpenCode Machines Window**, so that I can connect the visualizer to OpenCode instances running on different machines.
7. As a **Guild Operator**, I want to see the live reachability status (`Connected` / `Offline`), URL, and active badge for each of my paired OpenCode machines in the **OpenCode Machines Window**, so that I know which machine is currently streaming telemetry.
8. As a **Guild Operator**, I want to click `Activate` on any of my paired OpenCode machines in the **OpenCode Machines Window**, so that my isolated workspace switches to that machine's OpenCode daemon and hydrates its **Project Worlds**.
9. As a **Guild Operator**, I want to click `Test Connection` or `Edit` on a paired machine in the **OpenCode Machines Window**, so that I can verify reachability or update its port/password when a daemon restarts.
10. As a **Guild Operator**, I want to remove an **OpenCode Machine Pairing** from my account (`DELETE /api/guild/users/me/machines/:machineId`), so that I can clean up old machine endpoints.
11. As a **Guild Operator**, I want a dedicated **Profile & Config Window** where I can update my display alias, change my password, configure default view preferences, log out, or delete my account, so that I have full CRUD control over my user profile.
12. As a **Guild Operator** on an iPhone Home Screen (iOS standalone web app), I want the top bar to respect `env(safe-area-inset-top)` with an opaque background below the iOS status bar / Dynamic Island, so that the top bar is never trapped in an unreadable status-bar blur.
13. As a **Guild Operator** on an iPhone or mobile device, I want all **Project World** tabs, `👤 Account`, `🔗 Pair`, `✨ Summon`, and `🔄 Refresh` buttons to remain accessible and scrollable in the top bar without being hidden by mobile CSS rules, so that I can access every project and function on my phone.
14. As a **Guild Operator**, I want characters executing `read`, `glob`, `grep`, `list`, `ls`, `lsp`, or `codesearch` to walk to and work at the **Library Study Bookshelf** (`Library`), so that file reading and code inspection visually happen at the library.
15. As a **Guild Operator**, I want characters activating or equipping a skill (`skill` tool or `@skill` prompt attachment) to walk to and work at the **Armory Wardrobe** (`Armory`), so that equipping a **Skill Grimoire** visually happens at the armory rather than the summoning circle.
16. As a **Guild Operator**, I want characters invoking `subagent` or `task` to perform their **Summoning Ritual** at the **Arcane Lectern** (`Enchanter`), so that the summoning station is reserved for summoning subagents.
17. As a **Guild Operator**, I want a character's active or most recent tool to always determine their **Preparation Station**, so that having equipped a skill earlier in the session never forces subsequent `read` or `edit` actions back to the summoning station.
18. As a **Guild Operator**, I want characters to commit to their current walk path until they reach the destination station and complete a minimum station dwell (`1.2s`), so that characters never brake in the middle of a path and reverse direction.
19. As a **Guild Operator**, I want characters fighting a **Bug Monster** in the **Dungeon Wilds** (`debugging-hunt`) to stay engaged in combat rather than starting a 1.45-second indoor detour to the **Armory Wardrobe** and turning back mid-walk.
20. As a **Guild Operator**, I want `Stage`, `Unstage`, `Discard`, and `Seal & Commit` in the **Assembly Commit Ledger** to execute against the real host Git repository mounted read-write, so that clicking `Seal & Commit` genuinely creates a Git commit in my repository.
21. As a **Guild Operator**, I want the **Assembly Commit Ledger** to display a clear status banner (`✅ Committed <hash>: <subject>` or any Git error message) after clicking `Seal & Commit`, so that I have immediate confirmation that Git executed the commit.
22. As a **Guild Operator**, I want completed feature folders to be retired as soon as their feature files are committed (or when `Seal & Commit` succeeds), so that the **Goal Assembly Site** resets to `0/0 Blueprint Ready` without showing leftover `5/5` assembly parts.
23. As a **Guild Operator**, I want unrelated untracked files (such as screenshots) to never resurrect an already-committed feature on the **Goal Assembly Site**, so that finished features stay retired.
24. As a **Guild Operator**, I want the **Workshop Room** locked inside the viewport borders (`0px` off-screen margin), so that dragging or panning never pushes the room outside the screen into black void.
25. As a **Guild Operator** on mobile, I want navigating between `World`, `General`, `Hero`, and `Ticker` tabs or switching **Project Worlds** to immediately recalculate the stage dimensions and redraw the **Workshop Room** anchored to all 4 borders of my screen.
26. As a **Guild Operator**, I want every window (`Login`, `Register`, `OpenCode Machines`, `Profile & Config`, `Summon Adventurer`, `Demolish Room`), every drawer subtab (`Overview`, `Assembly & Commit`, `Roster`, `Details`, `Chat`, `Scrolls & Gear`, `Tool Log`, `Ticker`), and mobile navigation verified with live headless Chrome screenshots, so that every function is proven to work visually and functionally.

## Implementation Decisions

### 1. User Auth, Profile Config & Multi-Machine OpenCode Pairing Module
- Extend the server operator registry with disk-persisted storage (JSON file on disk, configurable path for tests) and password hashing (`scryptSync` / `randomBytes` from `node:crypto`):
  ```ts
  export interface PairedOpenCodeMachine {
    readonly machineId: string;
    readonly label: string;
    readonly daemonUrl: string;
    readonly daemonPassword?: string;
    readonly reachable: boolean;
    readonly isActive: boolean;
    readonly lastSyncedAtMs: number | null;
    readonly errorMessage: string | null;
  }

  export interface GuildOperatorAccountRecord {
    readonly operatorId: string;
    readonly username: string;
    readonly passwordHash: string;
    readonly label: string;
    readonly createdAtMs: number;
    readonly updatedAtMs: number;
    readonly pairedMachines: readonly PairedOpenCodeMachine[];
    readonly preferences: GuildOperatorPreferences;
  }
  ```
- Expose REST endpoints:
  - `POST /api/guild/auth/register`: Create a new **Guild Operator** account (`username`, `password`, `label`, optional initial `daemonUrl` & `daemonPassword`), persist to disk, issue a session token (`operatorId`), and pair the initial machine if provided.
  - `POST /api/guild/auth/login`: Verify `username` and `password`, issue/return the operator profile and `operatorId`, and ensure their active paired OpenCode machine adapter is running.
  - `POST /api/guild/auth/logout`: Clear the active session token association on the client.
  - `GET /api/guild/users/me`, `PATCH /api/guild/users/me`, `DELETE /api/guild/users/me`: Read profile + `pairedMachines`, update username/label/password/preferences, or delete the account from disk and close its workspace.
  - `POST /api/guild/users/me/machines`: Add a new **OpenCode Machine Pairing** (`label`, `daemonUrl`, `daemonPassword`, `activate?: boolean`), probe reachability, and persist to disk.
  - `PATCH /api/guild/users/me/machines/:machineId`: Update machine `label`, `daemonUrl`, `daemonPassword`, or set `activate: true` to switch the operator's isolated `WorldStateReducer` and `OpenCodeClientAdapter` to that machine.
  - `DELETE /api/guild/users/me/machines/:machineId`: Remove a paired machine from the operator's account.
- Build the 4-window **User Auth, Profile & Multi-Machine OpenCode Modal** (`Login`, `Register`, `OpenCode Machines`, `Profile & Config`) triggered by visible top-bar buttons (`#btn-open-account-modal` `👤 Login / Account` and `#btn-open-pairing-modal` `🔗 Pair OpenCode`).

### 2. Deterministic Station Routing & Committed Walk Queue
- In station classification:
  - Evaluate the active or most recent tool name (`rawTool`) **first**, completely independent of `lastEquippedToolCategory` (`cat`). Only consult `lastEquippedToolCategory` when `rawTool` is empty!
  - Route `skill` tool and `@skill` activation to **Armory Wardrobe** (`Armory`), and route `read`, `glob`, `grep`, `list`, `ls`, `lsp`, `codesearch` to **Library Study Bookshelf** (`Library`). Reserve **Arcane Lectern** (`Enchanter`) for `subagent` / `task` summoning.
- In walker choreography:
  ```ts
  // Committed walk-leg state machine on WalkerState
  export interface CommittedWalkerLock {
    committedStation?: ResolvedCharacterSlot["station"];
    committedTargetX?: number;
    committedTargetY?: number;
    dwellUntilMs?: number;
    pendingSlot?: ResolvedCharacterSlot | null;
  }
  ```
  - Remove the mid-walk 1.45s `armoryUntilMs` timer override from `resolveCharacterTargetSlot`.
  - When a character starts walking (`walker.isWalking === true`) toward `(committedTargetX, committedTargetY)` or is dwelling at the station upon arrival (`nowMs < walker.dwellUntilMs`, minimum `1200ms` dwell), keep `walker.targetX = committedTargetX` and `walker.targetY = committedTargetY` locked and store any newly computed slot in `walker.pendingSlot` (unless the character was deleted or entered a blocking **Quest Gate** at their current station). Once the walk finishes and `nowMs >= walker.dwellUntilMs`, promote `walker.pendingSlot` to the next committed leg.

### 3. Real Read-Write Host Git Commit CRUD & Feature-Scoped Retirement
- In `docker-compose.yml`, mount `.:/app:rw` (and `..:/workspaces:rw`) instead of partial read-only mounts so the container has full read-write access to the host Git working tree.
- In task progress derivation:
  - Track a set of retired/committed feature slugs (`retiredFeatureSlugs`) and check `git status --porcelain -- docs/features/<slug>` when evaluating a feature where `resolvedTasks >= totalTasks`.
  - If all issues in `docs/features/<slug>` are `resolved` and `docs/features/<slug>` has `0` uncommitted changes in Git (or was retired via `Seal & Commit`), immediately retire that feature and return `0/0 Blueprint Ready` (`totalTasks: 0, resolvedTasks: 0`), ignoring unrelated untracked files in `docs/images/`.
  - When `git.commit` runs on the server, stage all selected/modified files, execute `git commit`, mark any active completed feature slug as retired, dispatch `tasks.hydrated` with `0/0 Blueprint Ready`, and return `commitHash` and `subject` so the UI renders a visible `✅ Committed <hash>: <subject>` banner.

### 4. Border-Locked Camera, Mobile Post-Navigation Re-Anchoring & iPhone Safe-Area Top Bar
- In camera pan clamping:
  - Replace the `±50%` `1600px` margin with strict chamber-wall clamping: for `workshop` (`0..chamberW`), `wilds` (`chamberW..chamberW*2`), or `split` (`0..chamberW*2`), compute `activeW` and `originX`. When `activeW * zoom <= viewportW`, lock `panX = Math.round((viewportW - activeW * zoom) / 2 - originX * zoom)`. When `activeW * zoom > viewportW`, clamp `panX` strictly to `[viewportW - (originX + activeW) * zoom, -originX * zoom]` (`0px` off-screen push). Apply the identical rule to `panY` over `[viewportH - chamberH * zoom, 0]`.
- In HUD & viewport synchronization:
  - Always call `syncSpectatorDrawerChrome()` **before** `syncViewportCameraFit(canvas)` in `scheduleHudSync()`, call `syncViewportCameraFit(canvas)` regardless of whether `cameraFocusMode` is `"auto"` or an explicit mode (`"workshop"`, `"wilds"`, `"split"`), and attach a `ResizeObserver` on `.world-canvas-stage` so any mobile tab switch or world switch immediately resizes and re-anchors the room to all 4 borders.
- In HTML & responsive CSS for iPhone Home Screen (iOS PWA):
  - Set `viewport-fit=cover` and `apple-mobile-web-app-capable` meta tags.
  - Add `padding-top: calc(env(safe-area-inset-top, 0px) + 5px)` and a solid `#16110e` background on `.top-bar`.
  - Keep `#btn-open-account-modal`, `#btn-open-pairing-modal`, and horizontally scrollable `.scenario-buttons` (**Project Worlds**) visible and tappable on mobile (`<= 960px`).

## Testing Decisions

### What Makes a Good Test
- Every feature and bug fix must be tested both through automated integration tests at the module **seams** and through live headless Chrome visual verification against port `4310`.

### Primary Testing Seams
1. **User Auth, Profile & Multi-Machine Pairing Seam (`createGuildCompanionServer`)**:
   - Tests `POST /api/guild/auth/register`, `POST /api/guild/auth/login`, `POST /api/guild/auth/logout`, disk persistence across registry reloads, `POST/PATCH/DELETE /api/guild/users/me/machines` (adding multiple machines, switching active machine, deleting a machine), and strict per-user reducer/SSE isolation.
2. **Station Routing & Committed Walk Queue Seam (`resolveCanonicalPreparationStation`, `resolveCharacterTargetSlot`, `stepClientChoreography`)**:
   - Verifies `read/glob/grep/list/lsp` -> `Library`, `skill` -> `Armory`, `subagent` -> `Enchanter`, verifies `read` is never hijacked to `Enchanter` when `lastEquippedToolCategory === "skill"`, and verifies that a walking character (`isWalking === true`) does not reverse direction mid-path when their next target changes before arrival + dwell completion.
3. **Host Git Commit CRUD & Feature Retirement Seam (`tryHandleGuildGitRoute`, `deriveProjectTaskProgress`)**:
   - Verifies real `git init` / `git status` / `git stage` / `git commit` execution on a temporary Git repo on disk, verifies `Seal & Commit` creates a real commit hash, and verifies that a completed feature (`resolvedTasks === totalTasks`) resets to `0/0 Blueprint Ready` even when an untracked screenshot exists in `docs/images/`.
4. **Border-Locked Camera & Mobile Re-Anchoring Seam (`clampCameraPan`, `computeChamberCameraFit`, `syncViewportCameraFit`)**:
   - Verifies that dragging/panning at fit zoom (`zoom <= 1.0`) or zoomed in (`zoom > 1.0`) never pushes the **Workshop Room** outside `[0, viewportW] × [0, viewportH]`, and verifies mobile `safe-area-inset-top` and visible account/pairing controls.

## Out of Scope

- Public user directory or switching into another user's account without their password.
- OAuth / SSO providers.

## Further Notes

- Every window (`Login`, `Register`, `OpenCode Machines`, `Profile & Config`, `Summon`, `Demolish`), every subtab, and mobile portrait/landscape views must be captured with headless Chrome screenshots in `docs/images/` and visually inspected via `read`.
