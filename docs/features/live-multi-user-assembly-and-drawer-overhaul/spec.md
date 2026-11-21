# Specification: Anonymous Multi-User OpenCode Pairing, Live Real-Time Telemetry, Reactive Goal Assembly & Commit CRUD, Zero-Scrollbar Category Subtab Deck & Project World Persistence

Label: ready-for-agent
Status: resolved

## Problem Statement

1. **No Multi-User Isolation or Private OpenCode Pairing**: The companion server operates with a single process-wide state reducer, daemon connection, and SSE broadcast set. Multiple users cannot use the visualizer independently and anonymously with their own paired OpenCode instance; any action taken by one browser (switching worlds, running a preset, summoning or terminating a session) mutates the shared global state for every connected viewer.
2. **Spectator Drawer Clutter & Scrollbar Fatigue**: The **Character Sheet** (`Hero` tab) and **Guild Master Ledger** (`General` tab) stack every category—hero vitals, streaming chat, **Quest Gate** forms, **Command Scroll** composer, **Equipment Loadout**, **Skill Grimoires**, **Context Mana**, and tool logs—into one long vertical scrolling container while a permanently pinned bottom ticker steals vertical height, forcing both outer and nested scrollbars instead of showing one category in full.
3. **Stuck Goal Assembly & Missing Commit CRUD**: The **Goal Assembly Site** never resets after a feature finishes because the issue scanner stays permanently latched onto the newest completed feature folder (`100%` forever), while canvas and HUD fallbacks hardcode `3/5 (60%)` when task progress is absent. Furthermore, when all **Assembly Parts** are assembled, there is no live Git working-tree integration or Commit CRUD to inspect changed files, stage/unstage, write a commit message, create a commit, and reset the assembly cycle.
4. **Lost Project World Context on Refresh**: Switching a **Project World** in the top bar only updates volatile in-memory client state. Refreshing the page causes the top bar to race ahead of snapshot hydration and snap back to the first project in the list instead of reopening the last active **Project World**.
5. **Non-Live Latency & Demo Fallback Pollution**: Live SSE frames from OpenCode drop streaming text parts (`message.part.updated` for `text`), location sweeps execute 70–120+ sequential HTTP requests every 15 seconds while commands trigger 10 redundant client/server polling timers, and empty live rooms inject four fake **Demo Guild Simulator** characters onto the canvas.

## Solution

1. **Anonymous Guild Operator CRUD & Private OpenCode Pairing**: Introduce an independent, anonymous **Guild Operator** CRUD system (`Create`, `Read`, `Update`, `Delete`) with no public user switcher. Each **Guild Operator** receives a private workspace token, pairs their own OpenCode daemon endpoint (visible only to them), and operates against an isolated `WorldStateReducer`, SSE stream, and persisted preference record.
2. **Deterministic Project World Persistence**: Persist the active **Project World** (`selectedProjectId` and `selectedRoomId`) on every selection to `localStorage`, the URL query string (`?project=...`), and the operator's server preferences, and guard initial top-bar reconciliation so page refresh always restores the last opened **Project World**.
3. **Sub-100ms Real-Time Live Telemetry**: Stream text deltas, user prompts, and tool lifecycle updates directly from the paired OpenCode SSE stream into the operator's reducer, replace sequential N+1 location sweeps with parallel TTL-cached capability reads and immediate post-tool room/Git/assembly delta hydration, and banish all synthetic **Demo Guild Simulator** characters when operating in live mode.
4. **Reactive Goal Assembly Reset & Assembly Commit Ledger CRUD**: Connect the **Goal Assembly Site** to live Git working-tree state and active task telemetry. Retire completed feature folders once their changes are committed, remove all hardcoded `3/5` fallbacks, automatically reset the **Feature Assembly Scaffold** to `0/0 Blueprint Ready` when the working tree is clean, and unlock the **Assembly Commit Ledger** with full Git Commit CRUD (`Create` draft, `Read` changed files/diffs/commits, `Update` staged files & commit message, `Delete`/discard unstaged edits, and `Execute` commit) when assembly parts finish.
5. **Zero-Scrollbar Category Subtab Deck**: Overhaul the **Spectator Drawer** so the permanently pinned bottom ticker is removed and every view renders at `100%` of the drawer height without vertical scrollbars. Partition the **Character Sheet** (`Hero` tab) into four full-height subtabs (`Details`, `Chat`, `Scrolls & Gear`, `Tool Log`) and the **Guild Master Ledger** (`General` tab) into three full-height subtabs (`Overview`, `Assembly & Commit`, `Roster`), using compact pagination controls whenever list items exceed the viewport height.

## User Stories

1. As a **Guild Operator**, I want an anonymous operator workspace created automatically on my first visit, so that my sessions, settings, and paired OpenCode connection are immediately isolated from every other user.
2. As a **Guild Operator**, I want there to be no public user-switcher dropdown listing other users, so that my workspace and paired OpenCode instance remain completely private and invisible to anyone else.
3. As a **Guild Operator**, I want to create a new anonymous operator workspace or reset my current identity (`Create` / `Delete` in User CRUD), so that I can start fresh with a clean workspace whenever I choose.
4. As a **Guild Operator**, I want to read my current operator profile and pairing status (`Read` in User CRUD), so that I can see which OpenCode daemon endpoint I am paired with, its live reachability, and my saved preferences.
5. As a **Guild Operator**, I want to pair my own OpenCode daemon URL and optional authentication credentials (`Update` in User CRUD), so that the visualizer connects to my private OpenCode instance and streams only my projects and sessions.
6. As a **Guild Operator**, I want to update my workspace preferences (active **Project World**, active **Workshop Room**, roster mode, visual style mode, and active **Category Subtab Deck** selections) via User CRUD, so that my setup persists across browser reloads.
7. As a **Guild Operator**, I want to delete my operator profile and unpair my OpenCode daemon (`Delete` in User CRUD), so that my stored pairing configuration, cached state, and preferences are permanently wiped from the server.
8. As a **Guild Operator**, I want my SSE event stream to emit only state changes from my isolated `WorldStateReducer`, so that another user's activity never flickers or overwrites my screen.
9. As a **Guild Operator**, I want my active **Project World** to be saved whenever I click a world tab in the top bar, so that the system remembers which project world I am working in.
10. As a **Guild Operator**, I want refreshing the browser page (F5) to reopen the exact **Project World** I had open before refreshing, rather than defaulting back to the first project world in the list.
11. As a **Guild Operator**, I want the URL query parameter (`?project=...`) and `localStorage` to stay synchronized with my active **Project World**, so that bookmarking or refreshing the tab preserves my place even before the first server snapshot finishes hydrating.
12. As a **Guild Operator**, I want top-bar reconciliation to wait for snapshot hydration before falling back to the first discovered project tab, so that a slow initial sweep never clobbers my remembered **Project World**.
13. As a **Guild Operator**, I want the **Spectator Drawer** to display zero vertical scrollbars across all tabs and subtabs, so that I can view full, unclipped category information instead of scrolling through cramped panels.
14. As a **Guild Operator**, I want the permanently pinned bottom activity ticker removed from beneath the **Character Sheet** and **Guild Master Ledger**, so that the active tab receives `100%` of the vertical drawer height.
15. As a **Guild Operator**, I want the **Character Sheet** (`Hero` tab) separated into four dedicated subtabs—`Details`, `Chat`, `Scrolls & Gear`, and `Tool Log`—so that I can inspect each category in full screen height.
16. As a **Guild Operator** viewing the `Hero > Details` subtab, I want to see the character's full identity, **Guild Role Archetype**, model identifier, active **Preparation Station**, **Context Mana** gauge, token and cost telemetry, squad lineage, and session termination control in one clean, non-scrolling view.
17. As a **Guild Operator** viewing the `Hero > Chat` subtab, I want the entire drawer height dedicated to the latest user prompt, live streaming assistant reply, active **Quest Gate** resolution controls, and the sticky **Command Scroll** composer without competing cards pushing the chat off-screen.
18. As a **Guild Operator** viewing the `Hero > Scrolls & Gear` subtab, I want to see the character's 2×2 **Equipment Loadout**, equipped **Skill Grimoires**, and connected **Resource Stockpile** (MCPs, plugins, and tools) in full detail without scrollbars.
19. As a **Guild Operator** viewing the `Hero > Tool Log` subtab, I want to see a viewport-fitted list of recent tool and shell executions with compact page steppers (`Prev` / `Next`) and inline single-item output preview, so that I can inspect tool outputs without nested scrollbars.
20. As a **Guild Operator**, I want the **Guild Master Ledger** (`General` tab) separated into three dedicated subtabs—`Overview`, `Assembly & Commit`, and `Roster`—so that room-level information is never crammed into a single scrolling column.
21. As a **Guild Operator** viewing the `General > Overview` subtab, I want to see the **Workshop Room** summary, 2×2 telemetry counters, active **Quest Gate** quick-jump alerts, **Dungeon Wilds** threat summary, and the `Summon New Adventurer` trigger fitted cleanly to the viewport.
22. As a **Guild Operator** viewing the `General > Assembly & Commit` subtab, I want to see the live **Goal Assembly Site** part checklist alongside the interactive **Assembly Commit Ledger**, so that I can track progress and manage Git commits in one dedicated full-height view.
23. As a **Guild Operator** viewing the `General > Roster` subtab, I want to browse active **Workshop Room** characters using viewport-fitted cards and compact page steppers rather than a scrolling list.
24. As a **Guild Operator** viewing the `Ticker` tab, I want the live activity feed to occupy the full height of the **Spectator Drawer** with page steppers instead of a tiny 115px scrolling strip at the bottom.
25. As a **Guild Operator**, I want the **Goal Assembly Site** to reflect actual live uncommitted work and active tasks in my **Workshop Room**, never a hardcoded `3/5 (60%)` fallback.
26. As a **Guild Operator**, I want the **Goal Assembly Site** to automatically reset to `0/0 Blueprint Ready` when all prior feature tasks are resolved and the Git working tree is clean, so that finished features do not leave the scaffold stuck at `100%` forever.
27. As a **Guild Operator**, I want **Assembly Parts** on the **Feature Assembly Scaffold** to update in real time as my **Guild Adventurers** and **Squad Subagents** edit files, complete tasks, and run tests during a turn.
28. As a **Guild Operator**, I want the **Assembly Commit Ledger** to unlock Commit CRUD as soon as all active **Assembly Parts** are fitted (or whenever uncommitted Git working-tree changes exist in the room), so that I can turn completed work into a Git commit directly from the visualizer.
29. As a **Guild Operator**, I want to **Read** the live Git status of my **Workshop Room** (staged files, modified/unstaged files, untracked files, line additions/deletions, per-file diff preview, current branch, and latest commit summary) inside the **Assembly Commit Ledger**.
30. As a **Guild Operator**, I want to **Create** a commit draft with an auto-suggested or custom commit title and description inside the **Assembly Commit Ledger**.
31. As a **Guild Operator**, I want to **Update** my commit draft by staging or unstaging individual files (or clicking `Stage All` / `Unstage All`) and editing the commit message before committing.
32. As a **Guild Operator**, I want to **Delete** (discard/revert) unstaged changes on a selected file or clear my current commit draft from the **Assembly Commit Ledger**, so that I can clean up unwanted edits without leaving the visualizer.
33. As a **Guild Operator**, I want to **Execute** the Git commit from the **Assembly Commit Ledger**, see the celebratory **Feature Assembly Scaffold** completion burst, and watch the **Goal Assembly Site** immediately reset to `0/0 Blueprint Ready` for the next task.
34. As a **Guild Operator**, I want live assistant text responses (`message.part.updated` with `type: "text"`) and user prompts to stream into the `Hero > Chat` subtab and overhead labels in real time over SSE, rather than waiting up to 15 seconds for a background HTTP poll.
35. As a **Guild Operator**, I want tool completions (`edit`, `write`, `apply_patch`, `bash`) to immediately trigger a targeted refresh of the affected **Workshop Room**'s Git working-tree and **Goal Assembly Site** state, so that the canvas and HUD react within milliseconds of a file change.
36. As a **Guild Operator** paired with a live OpenCode daemon, I want rooms with zero active sessions to display an authentic empty **Workshop Room** rather than injecting fake **Demo Guild Simulator** characters.

## Implementation Decisions

### 1. Anonymous Guild Operator CRUD & Workspace Isolation Module
- Replace the global singleton reducer/connection state on the companion server with a **Guild Operator Workspace Registry module**.
- Each **Guild Operator** is identified by an opaque, cryptographically random `operatorId` passed via request header (`X-Guild-Operator-Id`), query parameter (`?operatorId=...` for SSE), or HTTP cookie, and persisted in the browser's `localStorage`.
- Expose full REST CRUD endpoints for the operator's own workspace:
  - `POST /api/guild/users`: Provision a new anonymous **Guild Operator** record (accepting optional initial `daemonUrl`, `daemonPassword`, `label`, and `preferences`), persist to disk, and initialize its isolated workspace runtime.
  - `GET /api/guild/users/me`: Return the caller's **Guild Operator** profile, OpenCode pairing status (`paired`, `daemonUrl`, `reachable`, `lastSyncedAtMs`, `errorMessage`), and persisted preferences (`selectedProjectId`, `selectedRoomId`, `rosterMode`, `visualStyleMode`, `activeDrawerTab`, `activeHeroSubtab`, `activeLedgerSubtab`).
  - `PATCH /api/guild/users/me`: Update the caller's OpenCode pairing configuration (`daemonUrl`, `daemonPassword` / auth headers, `adapterMode: "opencode-client" | "demo-simulator"`) and/or persisted UI preferences. Updating the paired `daemonUrl` reconnects only that operator's isolated `OpenCodeClientAdapter` and `WorldStateReducer`.
  - `DELETE /api/guild/users/me`: Tear down the caller's active adapter subscription and SSE streams, delete their persisted **Guild Operator** record, and reset their workspace.
- Never expose an endpoint or UI dropdown that lists or switches into other operators' workspaces. Each **Guild Operator** runtime owns a private `WorldStateReducer`, a private set of SSE subscribers, and its own paired OpenCode client adapter.

### 2. Project World Refresh Persistence & Hydration Guard
- Centralize **Project World** selection and restoration inside a dedicated navigation state module shared by the top-bar reconciler and client bootstrap:
  - When a **Guild Operator** selects a **Project World** tab, atomically update `selectedProjectId` in client state, write to `localStorage`, update `?project=<projectId>` via `window.history.replaceState`, and asynchronously sync with the operator preferences endpoint if available.
  - On page load/refresh, resolve the initial `selectedProjectId` in priority order: (1) explicit URL query parameter `?project=...`, (2) `localStorage` saved project ID, (3) server operator profile preference.
  - Add a snapshot hydration guard in top-bar reconciliation: while `snapshot.version === 0` or while discovered project tabs are empty during initial boot, never overwrite a non-null remembered `selectedProjectId`. Only fall back to the first discovered project tab when tabs are populated and no remembered `selectedProjectId` matches any discovered project root, project ID, or project name.

### 3. Real-Time OpenCode SSE Streaming & Targeted Delta Hydration
- Deepen the OpenCode SSE frame mapper and client adapter:
  - Map `message.part.updated` with `part.type === "text"` and `message.updated` / `message.created` into live telemetry events (`message.assistant.delta` / `message.user.prompt`) so `lastAssistantText` and `lastUserPromptText` update in real time without waiting for polling.
  - Maintain a `sessionId -> locationDirectory` lookup cache inside the adapter so incremental SSE events that omit `info.location.directory` resolve to their true **Workshop Room** rather than defaulting to `"/"`.
  - Trigger an immediate targeted room + Git/assembly delta refresh whenever `tool.completed` fires for file-mutating or shell tools (`edit`, `write`, `apply_patch`, `bash`, `execute`) or when `session.idle` fires.
  - Parallelize location state hydration (`Promise.all`) across discovered locations and cache static capability catalogs (`skills`, `plugins`, `models`, `agents`) with a 60-second TTL so background sweeps complete in a fraction of a second.
  - Remove the redundant browser `setTimeout` snapshot polls after commands and the redundant full-location server sweep timers.
  - Strictly isolate `demo-simulator` from `opencode-client`: remove the hardcoded fallback characters from the live canvas frame renderer so a live room with 0 sessions renders 0 characters.

### 4. Reactive Goal Assembly Lifecycle & Assembly Commit Ledger CRUD
- Replace the static issue-only scanner and all hardcoded `3/5 (60%)` fallbacks across canvas, choreography, and HUD view-models with a unified **Goal Assembly & Commit Ledger module**:
  ```ts
  // Decision-encoding state contract for live Goal Assembly & Commit CRUD
  export interface RoomGitWorkingTreeState {
    readonly isGitRepo: boolean;
    readonly branch: string | null;
    readonly headCommit: { readonly hash: string; readonly subject: string } | null;
    readonly isClean: boolean;
    readonly files: readonly RoomGitFileEntry[];
    readonly draftCommitTitle: string;
    readonly draftCommitBody: string;
    readonly lastCommittedAtMs: number | null;
  }

  export interface RoomGitFileEntry {
    readonly path: string;
    readonly indexStatus: string;
    readonly worktreeStatus: string;
    readonly staged: boolean;
    readonly additions: number;
    readonly deletions: number;
  }
  ```
- **Assembly Reset & Derivation Rules**:
  1. When a feature issue folder has all issues marked `resolved` **and** none of that feature's files have uncommitted changes in `RoomGitWorkingTreeState`, treat that feature as **completed and archived** rather than keeping the scaffold stuck at `100%`.
  2. When an active feature has open/claimed issues, or when uncommitted files exist in `RoomGitWorkingTreeState`, derive **Assembly Parts** from the active tasks and/or modified file groups so progress reflects real live work.
  3. When `RoomGitWorkingTreeState.isClean === true` and no open feature tasks exist, set `totalTasks: 0, resolvedTasks: 0` (`Blueprint Ready`) so both the canvas **Goal Assembly Site** and the **Guild Master Ledger** display a clean reset foundation (`0/0 Blueprint Ready`).
- **Commit CRUD Operations (`GET /api/guild/git` & `POST /api/guild/git`)**:
  - **Read (`git.status` & `git.diff`)**: Inspect live staged/unstaged/untracked files, line stats, branch, HEAD commit, and single-file unified diff preview for a **Workshop Room**.
  - **Create / Update (`git.draft.update`, `git.stage`, `git.unstage`)**: Create or update the room's commit draft message (`title`, `body`) and stage or unstage specified file paths (or all files).
  - **Delete / Reset (`git.discard`, `git.draft.clear`)**: Discard unstaged working-tree edits on specified file paths or clear the commit draft.
  - **Execute (`git.commit`)**: Stage selected files (if needed), execute `git commit` in the **Workshop Room** directory, emit a state delta that triggers the celebratory airship completion burst, and immediately reset the **Goal Assembly Site** to `0/0 Blueprint Ready`.

### 5. Zero-Scrollbar Category Subtab Deck & Reconciler Decomposition
- Remove the permanently pinned bottom activity ticker (`115px` height) from the sidebar layout so the active drawer view always receives `100%` of the sidebar body height (`overflow: hidden`).
- Add `heroSubtab: "details" | "chat" | "scrolls" | "tools"` and `ledgerSubtab: "overview" | "assembly" | "roster"`, plus per-subtab page indices (`toolsPage`, `rosterPage`, `tickerPage`, `commitFilesPage`), to client state and the **Character Sheet** / **Guild Master Ledger** view-models.
- Render a compact **Category Subtab Deck** header strip inside the drawer:
  - When `Hero` (`Character Sheet`) is active: `Details` · `Chat` · `Scrolls & Gear` · `Tool Log`.
  - When `General` (`Guild Master Ledger`) is active: `Overview` · `Assembly & Commit` · `Roster`.
  - When `Ticker` is active: full-height paginated live activity log.
- Enforce `overflow: hidden` on the drawer content viewport and bound list sections (`Tool Log`, `Roster`, `Commit Files`, `Ticker`) to a fixed viewport-safe item count per page (4–6 items) with compact `◀ Prev · Page X/Y · Next ▶` controls so vertical scrollbars never appear.
- Decompose the side-panel DOM reconcilers into focused single-responsibility subtab modules so every source file strictly obeys the 400-line ceiling.

## Testing Decisions

### What Makes a Good Test
- Tests must exercise behavior exclusively through the public **interfaces** at module **seams**, never asserting on private implementation helpers.
- Every external dependency seam has two **adapters**: the production adapter (live HTTP/Git/filesystem) and a deterministic in-memory test adapter.

### Primary Testing Seams
1. **Companion Server HTTP & SSE Seam**:
   - Exercises anonymous **Guild Operator** CRUD (`POST/GET/PATCH/DELETE /api/guild/users/me`), private OpenCode pairing isolation (verifying Operator A's SSE stream, reducer, and paired daemon state never leak to Operator B), **Project World** preference persistence, and **Assembly Commit Ledger** CRUD endpoints (`git.status`, `git.stage`, `git.unstage`, `git.discard`, `git.commit`) using an injected in-memory Git/Daemon adapter.
2. **Live Telemetry Ingress Seam**:
   - Exercises real-time SSE streaming for `message.part.updated` (`text` and `tool`), room directory resolution from cache, parallel cached location sweeps, and immediate targeted room + Git/assembly hydration upon `tool.completed`.
3. **Goal Assembly & Commit Ledger Seam**:
   - Exercises retirement of completed feature folders when the Git working tree is clean (`0/0 Blueprint Ready` reset), live assembly part derivation from uncommitted Git changes + open feature issues, removal of `3/5` hardcoded fallbacks, and post-commit reset.
4. **Spectator HUD & Category Subtab Deck Seam**:
   - Exercises the 4 `Hero` subtabs (`Details`, `Chat`, `Scrolls & Gear`, `Tool Log`), 3 `General` subtabs (`Overview`, `Assembly & Commit`, `Roster`), full-height `Ticker` pagination, zero-scrollbar DOM/CSS contracts, and **Project World** refresh restoration.
5. **Architecture Invariant Guard**:
   - Enforces that every source file remains `<= 400` lines.

## Out of Scope

- Public cross-user switcher dropdowns or shared multi-user spectator rooms (each **Guild Operator** workspace is strictly private and anonymous).
- External OAuth, email/password registration, or third-party identity providers.
- Remote `git push` / `git pull` / branch merge conflict resolution UI (scope is local working-tree inspection, staging, discarding, and commit creation at the **Goal Assembly Site**).

## Further Notes

- All five vertical-slice tickets are designed with clean module boundaries so they can be executed in parallel without blocking one another.
