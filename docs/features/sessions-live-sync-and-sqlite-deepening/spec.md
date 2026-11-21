# Specification: Sessions & Subagents Lifecycle Deepening, Workflow Invariance, Quest Gate Reconciler, Bounded Live Sync & Guild Chronicle SQLite Store

## Problem Statement

An end-to-end functionality and architectural audit of the live OpenCode Pixel Guild Visualizer (`http://127.0.0.1:4310/`) surfaced five compounding architectural failures across session/subagent choreography, roster mode filtering, **Quest Gate** signaling, live daemon synchronization, and Hero Chat persistence:

1. **Four Disconnected Choreography Modules & Unticked Operator Reducers (Candidate 1)**:
   - Character lifecycle and movement are split across four incompatible modules (`src/state/*` using `16×12` server tiles, `src/roster/*` which is completely orphaned in production, `src/scene/walker-stepper.ts` used only in headless tests, and `src/web/client-choreography.ts` + `src/web/station-and-workflow-routing.ts` using `800×720` browser pixels).
   - `src/server/main.ts` (`lines 308–324`) only dispatches `timer.tick` and `syncLiveDaemon()` to the unauthenticated fallback reducer—never to authenticated **Guild Operator** runtimes in `src/server/operator-registry.ts`. Consequently, `char.summoningRitual.active` (`900ms`), `Entering` (`600ms`), `ReportingScroll` (`900ms`), and `DistillingContextMana` (`1200ms`) never expire on operator runtimes, leaving characters permanently stuck displaying `Summoning Squad` or `Reporting Scroll`.
   - In the browser (`src/web/station-and-workflow-routing.ts:303–308`), newly created walkers immediately snap `currentX = resolvedX`, skipping the entry walk from the South Guild Door (`368, 692`) and failing to materialize **Squad Subagent**s beside their parent summoner. Meanwhile, `src/web/client-choreography.ts:249–255` overwrites newly created walkers (wiping `armoryUntilMs`), and `occIdx` / `loungeSeatIndex` are recomputed from volatile `lastActivityAtMs` sort order every frame, causing stationary characters to jump slots whenever another character acts.
   - In `src/state/batch-reconciler.ts:370–386`, `HISTORICAL_ARCHIVE_IDLE_MS` (`30 minutes`) transitions all idle root sessions older than 30 minutes to `Archived` (`isOpenInOpenCode = false`), hiding 99 of 103 sessions and zeroing top-bar **Project World** tab counts.

2. **Roster Mode Toggle (`Active Squads` ↔ `Full Roster`) Mutates Character Work Representations (Candidate 2)**:
   - `deriveProjectBugMonsters()` (`src/web/canvas-wilds-painter.ts:89–120`) computes room bugs from `getVisibleProjectCharacters()` without filtering out `Archived` or `RestingInLounge` sessions.
   - Switching `#btn-toggle-lineage` from `Active Squads` (`active-squads`) to `Full Roster` (`full-lineage`) pulls up to 16 historical sessions into `getVisibleProjectCharacters()`. If any archived session has a debug keyword in its title (`bug|fix|issue|fail|error|diagnos|slow`) or stored `debugging-hunt` intent, `deriveProjectBugMonsters()` spawns a **Bug Monster** (`hasActiveRoomBug = true`).
   - `classifyCharacterWorkflowIntent()` (`src/encounter/workflow-classifier.ts:149–151`) then executes `if (options?.hasActiveRoomBug && char.questGate?.kind !== "question") return "debugging-hunt";`, overriding **every** character in the room—mutating active `MAGE`s doing `Feature Build` at indoor **Preparation Station**s into `WARRIOR`s running out to `Combat` (`1267, 384`) in the **Dungeon Wilds**, and flipping even `RestingInLounge` / `Archived` rows in `resolveCharacterDisplayBadge` (`src/web/station-and-workflow-routing.ts:343–358`) to `👾 Debug · Fighting Bug`.
   - Additionally, `countProjectSessions` (`src/spatial/project-world.ts:218`) filters out `Archived` characters even when `rosterMode === "full-lineage"`, and `isLockedInWalkOrDwell` (`src/web/client-choreography.ts:259`) delays roster slot updates by 3–5 seconds.

3. **Split & Leaky Quest Gate Detection Across SSE and Polling (Candidate 3)**:
   - Conversational `?` question detection only exists in `hydrateSessionMessages` (`src/ingress/daemon-message-hydration.ts:185–213`), never on live SSE `session.idle` (`src/ingress/daemon-sse-mapper.ts`), so sessions asking plain-text questions over SSE immediately walk to `RestingInLounge` instead of `BlockedAtQuestGate`.
   - `hydrateSessionMessages` has an unconditional `break;` at `line 213` after inspecting only `messages[0]`, and `src/ingress/daemon-location-state.ts:229–245` only hydrates `sortedRootSessions.slice(0, 4)` (skipping all idle **Squad Subagent**s and 5th+ root sessions).
   - `handleStreamReconnected` (`src/state/batch-reconciler.ts:321–330`) deletes any live SSE **Quest Gate** not returned by the 15s poll, while `callId` vs `formId` mismatches in `src/state/quest-gate-handlers.ts:112` leave resolved gates stuck on the character.

4. **Unbounded Daemon Fetch Timeouts, Destructive Pairing & 12,313+ Leaked `AbortSignal` Listeners in Docker (Candidate 4)**:
   - `fetchFn` in `src/ingress/daemon-http-client.ts:32–50` has no `AbortSignal.timeout()`, while `sweepAllLocations(false)` (`src/ingress/opencode-client-adapter.ts:36–239`) fans out ~90 HTTP requests + 28 synchronous `git` calls. When paired to a closed/expired OpenTunnel endpoint, TLS completes and headers hang for 300s, leaving `#btn-refresh-live` stuck on `"⏳ Refreshing..."`.
   - `pairDaemon` (`src/server/operator-registry.ts:98`) calls `reducer.reset()` *before* verifying reachability, wiping all existing sessions. On container restart, `loadPersistedOperators` (`lines 169–181`) creates empty reducers and never connects saved operators.
   - `subscribeEvents` (`src/ingress/daemon-http-client.ts:200–252`) reuses one `AbortController` across infinite 1.5s SSE reconnect retries without removing `abort` listeners, causing Docker to log `MaxListenersExceededWarning: Possible EventTarget memory leak detected. 12313 abort listeners added to [AbortSignal]`.
   - `resolveLocalProjectDir` (`src/state/location-normalization.ts:80–120`) never checks `/workspaces/<project-name>` (mounted by `docker-compose.yml:23`), breaking local Git status/commit and `docs/features` scanning for sibling repositories inside Docker.

5. **Volatile 2-String Hero Chat & Missing Local SQLite Persistence (Candidate 5)**:
   - World state lives only in volatile RAM, and `CharacterState` (`src/types/core-types.ts:210–211`) stores only two 4,000-char strings (`lastUserPromptText` and `lastAssistantText`).
   - `hydrateSessionMessages` (`src/ingress/daemon-message-hydration.ts:160`) ignores `msgRole === "user"` messages; `daemon-sse-mapper.ts:185` overwrites `lastAssistantText` whenever a turn has multiple text parts; tool output previews are sliced at `240` chars (`line 92`); raw `<skill_content>` XML blocks and unformatted Markdown walls clutter the chat view; and `side-panel-reconciler.ts:210` resets scroll position on every token update.

---

## Core Design Decisions (Confirmed in Grilling Rounds 1 & 2, Q1–Q8)

### Decision 1: Bounded Daemon Client, Non-Destructive Pairing, Per-Operator Tick/Poll Loop & Docker Hygiene (Candidate 4)

- **Bounded Per-Request Timeouts & Deduplicated Sweep**:
  - Every HTTP request in `createHttpOpenCodeDaemonClient` (`src/ingress/daemon-http-client.ts`) enforces a bounded timeout (`AbortSignal.timeout(4000)` by default, configurable via options) and only retries `host.docker.internal` when the original hostname is `localhost` or `127.0.0.1` (not remote tunnels).
  - Deduplicate `getProjects()` + `getLocations()` inside `sweepAllLocations` so `/api/project` and `/api/worktree` are fetched once per sweep with bounded concurrency (`<= 4` locations in flight).
  - Add an 8-second client-side `AbortSignal.timeout(8000)` in `#btn-refresh-live` (`src/web/top-bar-reconciler.ts`) so the button always restores `"🔄 Refresh Live"` promptly.
- **Non-Destructive Pairing & Auto-Boot of Persisted Operators**:
  - In `src/server/operator-registry.ts`, `runtime.pairDaemon(targetUrl, password)` probes daemon reachability *before* replacing the active adapter and merges incoming locations/sessions into the reducer without calling `reducer.reset()` when re-pairing or refreshing, preserving existing session representations if a tunnel is unreachable.
  - On startup, `createOperatorWorkspaceRegistry` restores persisted world state from the **Guild Chronicle Store** (SQLite) and asynchronously connects active paired machines for persisted operators.
  - `createOperatorWorkspaceRegistry` runs a managed background loop that dispatches `{ type: "timer.tick", timestampMs: Date.now() }` every `1,000ms` to **every** active operator reducer and sweeps connected operator adapters every `15,000ms` (cleaned up in `closeAll()`).
- **Zero `AbortSignal` Listener Leak & Docker Environment Fixes**:
  - In `subscribeEvents` (`src/ingress/daemon-http-client.ts:199–261`), create a per-attempt child `AbortController` inside each `while` loop iteration and explicitly call `controller.signal.removeEventListener("abort", onAbort)` inside `finally` / timer completion so zero listeners accumulate across retries.
  - Add `--no-warnings=ExperimentalWarning` to `Dockerfile` `CMD` and `package.json` scripts.
  - Extend `resolveLocalProjectDir` (`src/state/location-normalization.ts`) to check `/workspaces/<project-folder-name>` when running inside Docker.

### Decision 2: Strict Workflow Intent Invariance & Immediate Roster Mode Projection (Candidate 2)

- **Character-Local Workflow Intent**:
  - Remove the room-wide `if (options?.hasActiveRoomBug && char.questGate?.kind !== "question") return "debugging-hunt";` override from `classifyCharacterWorkflowIntent` (`src/encounter/workflow-classifier.ts:149–151`).
  - Each character's `workflowIntent`, `role` (`MAGE`, `WARRIOR`, `SCOUT`, `ALCHEMIST`, `CLERIC`, `SAPPER`), target `station`, and `overheadLabel` are derived strictly from **that character's own active turn state** (and tighten `inputPreview` matching so `chrome.exe --headless` or file paths containing `test` do not falsely trigger `debugging-hunt` on completed feature builds).
- **Consistent Resting/Archived Badges & Active-Only Bug Monsters**:
  - In `deriveOverheadActionLabel` (`src/encounter/workflow-classifier.ts`) and `resolveCharacterDisplayBadge` (`src/web/station-and-workflow-routing.ts`), check `RestingInLounge` (`"Resting"`) and `Archived` (`"Archived"`) *before* station/tool overrides so resting or archived characters never display `"Fighting Bug"` or `"Summoning Squad"`.
  - In `deriveProjectBugMonsters` (`src/web/canvas-wilds-painter.ts`) and `deriveBugMonsterEncounter` (`src/encounter/bug-monsters.ts`), filter input characters to **actively working** sessions only (excluding `RestingInLounge` and `Archived` sessions) so switching between `Active Squads` and `Full Roster` never spawns or despawns **Bug Monster**s.
- **Immediate Roster Mode Toggle & Accurate Project World Tab Counts**:
  - In `countProjectSessions` (`src/spatial/project-world.ts:209–243`), include `Archived` sessions when `rosterMode === "full-lineage"`, and in `active-squads` mode count open/recent room sessions so **Project World** tabs reflect both modes accurately.
  - Include `rosterMode` in `lastSidePanelSignature` (`src/web/side-panel-reconciler.ts`) and allow `Roster Mode` visibility changes to take effect immediately on the canvas.

### Decision 3: Unified Character Lifecycle, Toil Queue & Summoning Choreography (Candidate 1)

- **Door Entry & Adjacent Subagent Summoning**:
  - When a new **Guild Adventurer** (`!c.parentId`) first materializes on the live canvas (`src/web/station-and-workflow-routing.ts` / `src/web/client-choreography.ts`), initialize its walker at the South Guild Door (`x: 368, y: 692`) so it visibly walks along the ring corridor to its target **Preparation Station**.
  - When a new **Squad Subagent** (`Boolean(c.parentId)`) first materializes, initialize its walker on an adjacent offset beside its parent's current walker position `(parentX + offsetX, parentY + offsetY)` and trigger a `1,200ms` **Summoning Ritual** floor rune circle at the parent's position before the subagent walks to its target **Preparation Station**.
- **Single Walker Initialization & Deterministic Slot Reservation**:
  - Eliminate the duplicate `!walker` overwrite in `stepClientChoreography` (`src/web/client-choreography.ts:237–255`) so `walker.armoryUntilMs` (`1450ms` **Armory Wardrobe** dwell) is preserved.
  - Replace frame-order `stationOccupantCounts` (`occIdx`) and `loungeSeatIndex` assignment with deterministic slot reservation keyed by `sessionId` so stationary characters never jump tiles or swap **Break Lounge** chairs when another character's `lastActivityAtMs` updates.
- **Timestamp-Driven Phase Expiry & Lounge Retention**:
  - Expire `summoningRitual.active` (`900ms`), `Entering` (`600ms`), `DistillingContextMana` (`1200ms`), and `ReportingScroll` (`900ms` dwell / `1800ms` subagent archive) via both server `timer.tick` and client-side `timestampMs >= expiresAtMs` guards so stale `Summoning Squad` or `Reporting Scroll` labels can never stick.
  - Retain up to the 6 most recent idle root **Guild Adventurer**s per room in `RestingInLounge` (`isOpenInOpenCode = true`) rather than archiving every root session after 30 minutes, whilecompleted **Squad Subagent**s deliver their **Report Scroll** to their parent and archive after `1.8s` (hidden in `Active Squads`, visible in `Full Roster`).

### Decision 4: Unified Quest Gate Reconciler Across Live SSE & Polling (Candidate 3)

- **Canonical Per-Session Quest Gate Slot**:
  - Each session owns at most one active `QuestGateState` correlated across `gateId`, `callId`, `formId`, and `messageId`. When a new gate opens on a session, any prior gate entry for that `sessionId` in `state.questGates` is replaced cleanly; when `permission.resolved`, `question.resolved`, `tool.completed` (`question`), or `message.user.prompt` arrives matching *any* of `gateId`, `callId`, or `sessionId`, both `char.questGate` and `state.questGates` are cleared.
- **Shared Conversational `?` Detector on SSE & Full-Turn Hydration**:
  - Extract a shared pure detector `detectConversationalQuestionGate(sessionId, text, timestampMs)` used by both `hydrateSessionMessages` (`src/ingress/daemon-message-hydration.ts`) and `handleSessionIdle` / `handleSessionStatus` (`src/state/session-handlers.ts`). When a session goes `idle` over SSE with a conversational question in its latest assistant text, it transitions directly to `BlockedAtQuestGate` (`?`) instead of `RestingInLounge`.
  - In `hydrateSessionMessages` (`src/ingress/daemon-message-hydration.ts:157–214`), remove the premature `break;` at `messages[0]` so all assistant messages in the latest turn (up to the most recent `user` message) are inspected for `question` tool calls and conversational `?` prompts.
  - In `fetchDaemonLocationState` (`src/ingress/daemon-location-state.ts:229–245`), include recently active **Squad Subagent**s and root sessions in `hydrateSessionIds`, and in `handleStreamReconnected` (`src/state/batch-reconciler.ts:321–330`), preserve unresolved SSE **Quest Gate**s while the session remains idle/blocked.

### Decision 5: Guild Chronicle Store (`node:sqlite` in `./data/`) & Formatted, Compacted Hero Chat (Candidate 5)

- **Project-Folder `./data/` Directory & Docker Volume Mount**:
  - Store the **Guild Chronicle Store** SQLite database at `./data/guild-chronicle.sqlite` (using Node 22's built-in `node:sqlite` `DatabaseSync` in WAL mode, or `:memory:` in unit tests) and operator profiles at `./data/guild-operators.json` (automatically migrating existing profiles from `./.opencode-guild-operators.json` on startup).
  - Mount `- ./data:/app/data:rw` in `docker-compose.yml` and ignore `data/*.sqlite*` and `data/*.json` in `.gitignore`.
- **Multi-Turn Transcript Persistence & On-Demand Hydration**:
  - Persist `rooms`, `sessions`, and `session_messages(operator_id, session_id, message_id, role, text, attached_skills_json, created_at_ms, updated_at_ms)` in `guild-chronicle.sqlite`.
  - Accumulate text parts per `message_id` (so multi-step assistant turns never overwrite earlier text parts) and extract both `user` and `assistant` messages in `hydrateSessionMessages` and `daemon-sse-mapper.ts` without 240-char tool output truncation.
  - Expose `GET /api/guild/session/:sessionId/messages` (returning cached SQLite turns immediately and backfilling from `/api/session/:id/message` on the daemon when needed) so clicking any **Guild Adventurer** or **Squad Subagent** in **Character Sheet** `Chat` loads its complete conversation history in `<5ms`.
- **Formatted & Compacted Hero Chat Log UI/UX**:
  - Strip injected `<skill_content name="...">...</skill_content>` and `<system-reminder>...</system-reminder>` blocks out of user prompts, rendering attached skills as compact `@skill` badge pills above the user's clean prompt text.
  - Format message bodies with a safe, lightweight Markdown renderer (headings, **bold**, inline `<code>`, bullet lists, and compact scrollable `<pre><code>` blocks).
  - Render chronological `You` and `Adventurer` turn cards; compact historical turns or long messages (`> 8 lines` / `> 500 chars`) behind an inline `Show full message ▾ / Collapse ▴` toggle while keeping the newest turn expanded, and preserve `.dispatch-transcript-scroll` `scrollTop` across live streaming updates.
