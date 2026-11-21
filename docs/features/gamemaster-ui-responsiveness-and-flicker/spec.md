# Specification: Gamemaster Menus, Lists & Buttons — Keyed DOM Reconciliation, Tombstone & Epoch Gating, and Persistent Action Spinners

Label: ready-for-agent

## Problem Statement

When a **Guild Operator** interacts with menus, lists, and buttons across the **Spectator Drawer** (**Guild Master Ledger**, **Assembly Commit Ledger**, **Character Sheet**, and **Quest Gate** cards), modals (**Summon New Guild Adventurer**, **Guild Operator Account & Profile Settings**, and **Demolish Workshop Room**), and top-bar controls during live OpenCode sessions, four user-experience failures occur:

1. **Continuous & Mouseover Flickering**:
   - High-frequency SSE telemetry frames (10–60 Hz during active streaming and tool calls) and 1 Hz timer ticks trigger full-slot DOM destruction and recreation across the **Guild Master Ledger**, **Character Sheet**, and open **Summon New Guild Adventurer** modal.
   - Destroying a hovered button and inserting a brand-new DOM node resets its `:hover` pseudoclass state and restarts its CSS background/border transition on every tick, causing visible mouseover flicker.
   - Project Heraldry attribute selectors compete with button hover styles, and non-interactive header/track containers carry interactive button classes that trigger false hover states.

2. **Buttons & Menus Not Responding Instantly (or Dropping Clicks)**:
   - When a container's inner HTML is replaced during the 80–150ms window between `mousedown` and `mouseup`, the browser drops the `click` event because `mousedown` and `mouseup` occurred on different DOM nodes—requiring repeated clicks on subtabs, roster rows, git action buttons, and modal controls.
   - Selecting a hero triggers an on-demand message hydration request during render that forces an unconditional full-panel rebuild 50–200ms later right as the user clicks a subtab or button; similarly, opening the **Guild Operator Account & Profile Settings** modal mounts its body and then overwrites it again as soon as the background profile fetch resolves.
   - Expanding or collapsing a single chat message row in the **Live Markdown Dispatch Log** or a tool row in the **Tool Log** invalidates the entire **Character Sheet** signature, re-parses all markdown turns, and fires redundant network requests instead of toggling the clicked row in place.
   - Clicking destructive or asynchronous action buttons (`Kill Character`, `Demolition Bomb`, per-file `Stage` / `Unstage` / `Discard`, `Quest Gate` resolution buttons, and `OpenCode Machine Pairing` actions) either fails to display a disabled `⏳` loading spinner or sets it imperatively on an ephemeral DOM node that is wiped by the next SSE frame, while the server blocks for seconds on sequential daemon teardown loops or synchronous Git subprocesses.

3. **Deleted or Dismissed List Items Reappearing ("Resurrection")**:
   - **Deleted Guild Characters**: Out-of-order HTTP responses (such as a `session.view` command returning a stale pre-await snapshot) overwrite the client snapshot without checking monotonic version order or client deletion tombstones, and mid-loop background location sweeps re-emit sessions that were deleted while the sweep was awaiting Git or message hydration.
   - **Demolished Workshop Rooms**: Trailing `session.updated` and `message.updated` SSE frames emitted while tearing down a room's sessions lack activity-preservation flags and erase the room's demolition tombstone in the adapter and reducer, resurrecting the demolished world.
   - **Discarded / Staged Git Files**: When a background Git status scan is already in flight while the user clicks `Discard`, `Stage`, or `Unstage`, the in-flight scan finishes after cache invalidation and writes the stale pre-mutation file list back into the Git status cache.
   - **Dismissed Completed Session Results (Unread) & Resolved Quest Gates**: A 1.5s post-view location sweep sees a daemon idle timestamp 1ms newer than the client's viewed timestamp and evicts the client's read acknowledgment, causing the unread result row to reappear. Similarly, when a question tool **Quest Gate** (`call_...`) is resolved, a subsequent sweep sees the corresponding `/api/form` (`frm_...`) entry before the daemon clears it and resurrects the gate.
   - **Removed OpenCode Machine Pairings**: Overlapping unsequenced profile fetches overwrite the cached operator profile with the pre-delete machine list.

## Solution

Deliver a cohesive three-part architectural deepening across the **Spectator Drawer**, modal controllers, client snapshot state, and companion server routes:

1. **Keyed DOM Reconciliation, Subtab-Isolated Signatures & Hover Stability**:
   - Isolate header and per-subtab render signatures so streaming chat tokens, tool logs, or background Git refreshes never invalidate unrelated views.
   - Preserve existing `<button>`, `<select>`, and list-row DOM nodes in place by key with container-level delegated events so `:hover` transitions never flicker and `mousedown -> mouseup` clicks are never dropped.
   - Toggle local chat and tool log accordions in `0ms` directly on the DOM node without full-panel re-renders or redundant network calls.
   - Guard modal `<select>` dropdowns, `@skill` badges, operator profile refreshes, and floorplan tooltips by content signature, and clean up `.btn:hover` vs. **Project Heraldry** CSS specificity.

2. **Monotonic `Authoritative Live State` Gate, Strict Tombstones & Epoch-Stamped Caches**:
   - Route all client snapshot updates through a single monotonic gate (`applyAuthoritativeSnapshot`) that rejects older snapshot versions, filters client-side deleted session and room tombstones, and synchronizes read session acknowledgments.
   - Lock server and client `deletedRoomIds` tombstones against trailing `session.updated` and `message.updated` SSE echoes, re-filter `deletedSessionIds` after async awaits in location sweeps and snapshot hydration, return the post-await snapshot from command routes, unify `frm_...` and `call_...` **Quest Gate** suppression, and guard Git working-tree and operator profile caches with monotonic mutation epochs so stale in-flight reads never overwrite newer mutations.

3. **Render-Persistent `⏳` Loading Spinners & Tombstone-First Parallel Server Teardown**:
   - Track in-flight pending actions in controller state so every clicked action button (`Kill Character`, `Demolition Bomb`, per-file `Stage`/`Unstage`/`Discard`, `Stage All`/`Unstage All`/`Sync Git`/`Commit`, `Quest Gate` buttons, and `OpenCode Machine Pairing` buttons) immediately renders `disabled` with a persistent `⏳ ...` spinner that survives SSE frames until the server responds and updates the list authoritatively.
   - Record room/session tombstones and emit `room.deleted` immediately on the server before running parallelized (`Promise.allSettled`) daemon session, PTY, and shell teardown, and avoid synchronous Git subprocess stalls when deriving task progress from an already-scanned Git working tree.

## User Stories

1. As a **Guild Operator**, I want buttons and list rows in the **Guild Master Ledger** (`Overview` and `Assembly & Commit`) to keep their DOM node identity while sessions stream tokens at 10–60 Hz, so that hovering over any button or roster row never flickers.
2. As a **Guild Operator**, I want clicking any subtab, roster row, **Quest Gate** alert row, unread result row, or Git action button to register on the very first click even during heavy SSE streaming, so that `innerHTML` replacement between `mousedown` and `mouseup` never swallows my click.
3. As a **Guild Operator**, I want the **Category Subtab Deck** and `◀ 1/N ▶` Hero/Project Browser headers to update their counts and badges in place without destroying the `<button>` elements, so that switching subtabs or cycling heroes/projects feels instantaneous.
4. As a **Guild Operator** viewing the `Details`, `Scrolls & Gear`, or `Tool Log` subtab of the **Character Sheet**, I want streaming chat text and token updates in the background not to rebuild my active subtab, so that I can inspect details or click `☠ Kill Character` without DOM resets.
5. As a **Guild Operator** viewing the `Overview` subtab of the **Guild Master Ledger**, I want background Git working-tree refreshes and streaming assistant replies on active sessions not to rebuild the `Overview` DOM, so that the **Active Room Roster** remains rock-solid under my cursor.
6. As a **Guild Operator** reading the **Live Markdown Dispatch Log**, I want clicking a chat message one-liner (`Expand ▾` / `Collapse ▴`) or `Expand All ▾` to toggle that row's expanded state immediately in `0ms` without re-rendering the entire **Character Sheet** or firing redundant `session.view` network calls, so that reading transcripts is instantaneous.
7. As a **Guild Operator** inspecting the **Tool Log** subtab, I want clicking a tool call row to expand or collapse its output preview in place without rebuilding the entire panel, so that my scroll position and hover state are preserved.
8. As a **Guild Operator** selecting a **Guild Character**, I want on-demand message hydration (`GET /api/guild/session/:id/messages`) to trigger a DOM update only if the hydrated messages or **Quest Gate** actually differ from what is already rendered, so that the **Character Sheet** does not wipe and re-mount 100ms after I select a hero.
9. As a **Guild Operator** with the **Summon New Guild Adventurer** modal open, I want the target directory `<select>`, **OpenCode Agent Mode** `<select>`, and **Available Skills Browser** `@skill` chips to remain stable across background SSE ticks, so that open dropdown menus never collapse and `@skill` chips never flicker on mouseover.
10. As a **Guild Operator** opening the **Guild Operator Account & Profile Settings** modal, I want the background profile refresh to re-mount the modal body only if the profile data actually changed and I am not actively clicking or typing, so that my first click inside the modal is never lost.
11. As a **Guild Operator** hovering over stations, characters, and **Bug Monsters** on the **Guild Floorplan**, I want the floating tooltip to update its DOM only when the hovered target or content changes and to position itself accurately in both single-chamber (`Workshop Room`) and split views, so that tooltips never jitter on mousemove.
12. As a **Guild Operator** hovering over **Project Heraldry**-tinted buttons (world pills, **Project Mini-Assembly** pills, and repository browser buttons), I want the `.btn:hover` highlight to transition smoothly without fighting `[data-herald-party]` border rules, and I want non-interactive header/skill-track containers not to impersonate clickable buttons on hover.
13. As a **Guild Operator** clicking `☠ Confirm Delete` to terminate a **Guild Character**, I want the button to immediately disable and show `⏳ Deleting...` across all SSE frames until the server finishes, and I want the deleted character to never reappear in the **Active Room Roster**, **Character Sheet**, or **Guild Floorplan** when out-of-order `session.view` responses or mid-flight location sweeps complete.
14. As a **Guild Operator** confirming the **Demolition Bomb** (`💣 Demolish`) on a selected world, I want the button to immediately disable and show `⏳ Demolishing...` while the server records the room tombstone first and tears down sessions, PTYs, shells, and worktrees in parallel (`Promise.allSettled`), so that demolition completes rapidly and trailing `session.updated` or `message.updated` SSE frames never resurrect the demolished world.
15. As a **Guild Operator** re-adding a previously demolished folder via `+` (**World Folder Registration**) or summoning a new **Guild Adventurer** into it, I want the explicit registration or root session creation to cleanly lift the room tombstone, so that intentional re-registration always works while passive sweeps and SSE update echoes remain blocked.
16. As a **Guild Operator** clicking `✓ Allow Once`, `✓✓ Always`, `✕ Reject`, or `Send Answer ↵` on a **Quest Gate**, I want the gate buttons to immediately disable and show `⏳ Sending...` (with immediate UI reconciliation) and I want the resolved gate to stay permanently dismissed across both `call_...` tool IDs and `frm_...` form IDs in the **Character Sheet**, **Guild Master Ledger** alert list, and `🧙‍♂️ Hero ⚠️N` tab badge.
17. As a **Guild Operator** clicking an item in **Completed Session Results (Unread)** to inspect a finished hero's work, I want the unread alert row to disappear and never pop back into the list 1.5 seconds later when a location sweep reports a slightly newer daemon `idle` timestamp.
18. As a **Guild Operator** clicking `Stage`, `Unstage`, `Discard`, `Stage All`, `Unstage All`, `Sync Git`, or `Commit` in the **Assembly Commit Ledger**, I want the clicked button to display a render-persistent `⏳ Staging...` / `⏳ Unstaging...` / `⏳ Discarding...` / `⏳ Syncing...` / `⏳ Committing...` spinner across any SSE frames while in flight, and I want the updated file list to never revert or resurrect discarded files when an older background Git scan finishes.
19. As a **Guild Operator** switching, pairing, reconnecting, or removing an **OpenCode Machine Pairing** in the top header bar or profile modal, I want the clicked button to immediately show a disabled `⏳` pending state and I want deleted machines to never reappear from overlapping profile fetches.

## Implementation Decisions

### 1. Keyed DOM Reconciliation, Subtab-Isolated Signatures & Delegated Event Seam
- **Header vs. Static Slot Separation**:
  - Partition the **Spectator Drawer** reconciliation into independent header (`#sheet-header-slot`), interactive (`#sheet-interactive-slot`), and body (`#sheet-static-slot`) signatures.
  - Once the header for the current mode (`ledger` vs. `character`) is mounted, update subtab button labels, `.active` classes, `disabled` attributes, and `◀ 1/N ▶` browser labels in place rather than replacing `headerSlot.innerHTML`.
- **Subtab-Scoped Body Signatures**:
  - Compute the `#sheet-static-slot` signature strictly from the data displayed by the currently active subtab:
    - `Guild Master Ledger` &rarr; `Overview`: depend on world scope, active/total room counts, **Lifetime Tribute** totals, waiting **Quest Gate** list, **Completed Session Results (Unread)** list, **Dungeon Wilds** threats, **Project Mini-Assemblies**, `show subagents` toggle, and **Active Room Roster** rows (excluding `gitRev` and excluding streaming `lastAssistantText` for sessions that do not have an unviewed result).
    - `Guild Master Ledger` &rarr; `Assembly & Commit`: depend on world scope, active **Goal Assembly Site** showcase state, `gitRev`, selected diff file path, and in-flight Git pending action state.
    - `Character Sheet` &rarr; `Chat`: depend on `sessionId`, `dispatchLog.revisionKey`, `isBusy`, `overheadVerb`, `hasUnviewedResult`, `pendingQuestGate` auto-expand state, and `expandedChatMessageIds`.
    - `Character Sheet` &rarr; `Details`: depend on `sessionId`, `projectHeraldry`, `modelId`, `contextMana`, `cost`, `activeTarget`, `childSubagents`, `pendingKillSessionId`, and in-flight kill state.
    - `Character Sheet` &rarr; `Scrolls & Gear`: depend on `sessionId`, `equipmentLoadout`, `skillGrimoireStack`, and `connectedPlugins`.
    - `Character Sheet` &rarr; `Tool Log`: depend on `sessionId`, `recentTools`, and `selectedToolCallId`.
- **Keyed Row Patching, Delegated Container Listeners & 0ms Local Accordions**:
  - Bind delegated `click` and `change` listeners at the slot/container level so event handling never depends on ephemeral child node timing.
  - Reconcile list rows (`[data-select-session]`, `[data-commit-file-path]`, `[data-chat-message-id]`, `[data-tool-call-id]`) by key: reuse existing DOM nodes when keys match, updating only text/classes/attributes that changed.
  - Handle local accordion toggles (`button[data-toggle-chat-msg]`, `button[data-toggle-all-chat-msgs]`, and `[data-tool-call-id]`) by toggling `.is-expanded` / `.is-collapsed` / `hidden` / `.active` directly on the target DOM elements in `0ms` without resetting `lastSidePanelSignature` or re-sending `session.view` when the session is already marked viewed.
  - When on-demand message hydration (`GET /api/guild/session/:id/messages`) resolves, compare the hydrated message/gate digest against the rendered digest and only invalidate the panel signature if new messages, updated turn text, or a changed **Quest Gate** arrived.
- **Modal, Tooltip & CSS Hover Guards**:
  - Guard `Summon New Guild Adventurer` modal `<select>` elements (`#summon-directory-select`, `#summon-agent-class`, `#summon-action-agent-select`) and `#summon-skill-browser-slot` with option/skill signatures so `syncSummonModalDom()` never overwrites `.innerHTML` unless the available rooms, modes, or skills actually changed.
  - Guard `openOperatorPairingModal()` so the post-fetch `mountModalInnerDom` only runs if the profile signature changed and focus is not inside an interactive modal control.
  - Guard `#alcove-tooltip` updates in `handleScenePointerHover()` with a `lastTooltipSignature` string and compute horizontal percentage positioning against the active world width (`cw` in single-chamber workshop mode, `cw + wildsW` in split mode).
  - Ensure `.btn[data-herald-party]:hover` and `.btn.active[data-herald-party]` take precedence over bare `[data-herald-party]` border rules, and remove `.btn` from non-interactive `.hero-browser-current-btn` and `.skill-browser-track` containers.

### 2. Monotonic Snapshot Gate, Strict Tombstones & Epoch-Stamped Caches
```ts
// Decision-encoding contract for client snapshot & cache epoch gating
export interface ApplyAuthoritativeSnapshotOptions {
  readonly allowVersionReset?: boolean;
  readonly roomIdHint?: string;
}

export interface InFlightPendingActionsState {
  readonly killingSessionIds: ReadonlySet<string>;
  readonly demolishingRoomIds: ReadonlySet<string>;
  readonly resolvingGateIds: ReadonlySet<string>;
  readonly gitFileActionsByRoom: ReadonlyMap<string, ReadonlyMap<string, "stage" | "unstage" | "discard">>;
  readonly pendingOperatorAction: string | null;
}
```
- **Single Client Snapshot Ingestion Seam (`applyAuthoritativeSnapshot`)**:
  - Replace all direct `clientState.currentSnapshot = ...` assignments across client modules with `applyAuthoritativeSnapshot(nextSnapshot, options)`:
    - Reject incoming snapshots whose `version` is strictly less than `clientState.currentSnapshot.version` (unless `allowVersionReset` is true on auth/machine switch or test initialization).
    - Maintain client-side tombstones (`clientDeletedSessionIds`, `clientDeletedRoomIds`) populated when a session kill or room demolition succeeds, and strip any matching session or room from incoming snapshots until an explicit room registration (`POST /api/guild/room`) or summon clears the room tombstone.
    - Always execute `syncClientViewedSessionsToSnapshot(nextSnapshot)` inside `applyAuthoritativeSnapshot`.
- **Server Tombstone & Snapshot Ordering Invariants**:
  - The command router (`POST /api/guild/command`, including `session.view`) must always return the latest `activeReducer.getSnapshot()` at response time rather than a pre-await snapshot captured before daemon execution.
  - SSE mapper events for `session.updated` and `message.updated` (when not `session.created`) must set `preserveActivityTimestamp: true`, and both the client adapter (`deletedRoomDirs`) and reducer (`state.deletedRoomIds`) must never un-tombstone a demolished room on passive `session.updated` or `message.updated` events—only on explicit `POST /api/guild/room`, `adventurer.summon`, or brand-new root `session.created`.
  - `runSweepAllLocations` must re-verify `deletedRoomDirs` and `deletedSessionIds` after all async `await` boundaries inside the sweep loop before emitting `stream.reconnected` or `tool.started`.
  - `hydrateFromSnapshot` in the reducer must filter `deletedSessionIds` out of every room's `characterIds` and `activeSessionIds` arrays in addition to `state.characters`.
- **Epoch-Stamped Git & Operator Profile Caches + Unread/Gate Suppression**:
  - Add a monotonic `gitCacheEpochByDir` counter to the server Git status scanner incremented on every `invalidateGitStatusCache` and `storeCachedGitStatus`; if an in-flight `scanGitStatusAsync` started at an older epoch, discard its result on completion instead of overwriting `gitStatusCache`.
  - Add a monotonic `clientGitMutationEpochByRoom` counter to the client commit ledger controller incremented when `postGitAction` starts and finishes; `refreshRoomGitState` (`GET`) must drop its response if the mutation epoch changed while the request was in flight, and `wasRoomGitMutatedRecently` must return `true` whenever an action is currently in flight for that room.
  - In `syncClientViewedSessionsToSnapshot`, grant a `5_000ms` daemon-idle settlement tolerance around the acknowledged `idleAtMs` while a character is `RestingInLounge` so post-view location sweeps do not evict `clientViewedAtBySession`.
  - In `isQuestionReasonAlreadyResolved` and `handleStreamReconnected`, remove the `frm_` early-return bypass so `/api/form` (`frm_...`) gates whose session question prompt was already resolved (e.g. via a `call_...` tool gate) remain suppressed across sweeps, and include `isClientGateResolved(...)` in `isCharacterWaitingAtGate`.
  - Stamp `refreshCachedOperatorProfile()` with a monotonic request epoch bumped on every operator/machine mutation so stale `GET /api/guild/users/me` responses cannot overwrite `cachedProfile`.

### 3. Render-Persistent `⏳` Spinners & Tombstone-First Parallel Server Teardown
- **Render-Persistent Spinner State**:
  - Track in-flight pending actions (`killingSessionIds`, `demolishingRoomIds`, `resolvingGateIds`, `inFlightFileActionsByRoom`, `pendingOperatorAction`) in controller state and render `disabled` + `⏳ ...` labels from the view-model/reconciler so SSE frames never wipe the loading indicator while waiting for the server response.
  - In `Quest Gate` handlers (`Allow Once`, `Always`, `Reject`, `Send Answer ↵`), mark the gate as resolving, call `onStateChanged()` immediately before `await dispatchCommand(...)`, and call `onStateChanged()` again when the command settles.
- **Tombstone-First Parallel Server Teardown & Non-Blocking Task Progress**:
  - When `deleteRoom` is invoked on the server, immediately add the normalized room directory to `deletedRoomDirs` and dispatch `room.deleted` to the reducer **before** running `executeDeleteRoomResources`, then execute session interrupt/delete (`limit=200` + `parentID=null&limit=100`), PTY teardown, and shell teardown concurrently via `Promise.allSettled`.
  - In `deriveRoomTaskProgressForGitState`, use the already-scanned `gitStatus` cleanliness and dirty file paths directly without spawning redundant synchronous `execFileSync("git")` calls on clean repositories.

## Testing Decisions

- **What makes a good test**:
  - Tests must exercise external behavior through the public reconciler, state, and HTTP/SSE adapter seams—asserting DOM node identity (`prevBtn === nextBtn`), persistent `disabled` / `⏳` spinner labels across simulated SSE ticks, and permanent non-resurrection of deleted/dismissed items under out-of-order responses and concurrent sweeps, never coupling to private internal helper names.
- **Primary Test Seams**:
  1. **Spectator Drawer & Modal Reconciler Seam** (`reconcileSidePanel`, `renderGuildMasterLedgerPanel`, `reconcileTopBar`, `syncSummonModalDom`, `openOperatorPairingModal`)
  2. **Authoritative Snapshot & Reducer/Adapter Seam** (`applyAuthoritativeSnapshot`, `WorldStateReducer`, `createOpenCodeClientAdapter`, `tryHandleGuildApiRoute`, `scanGitStatusAsync`)
- **Prior Art in Codebase**:
  - `tests/26-assembly-commit-ledger-deepening.test.ts` (Git CRUD, commit dock, and working-tree synchronization)
  - `tests/29-sessions-live-sync-and-sqlite.test.ts` (SSE mapping, session lifecycle, Quest Gates, and chronicle persistence)
  - `tests/36-add-world-folder-and-summon.test.ts` (DOM reconciler, modal interactions, and room registration/demolition)
  - `tests/00-architecture-invariants.test.ts` (400-line ceiling and module hygiene guard)

## Out of Scope

- Modifying 2D canvas **Preparation Station** perimeter slot coordinates, **Toil Queue** walking trajectories, or **Dungeon Wilds** combat weapon animations.
- Optimistic removal of list items prior to server confirmation (per user grilling decision `Q3`/`Q4`: buttons display render-persistent `⏳` loading spinners while in flight and lists update authoritatively when the server responds).

## Further Notes

- Architecture Review: `docs/architecture-review/architecture-review-20261111-gamemaster-ui-responsiveness-and-flicker.html`
- Strict 400-line ceiling per file under `src/` (`tests/00-architecture-invariants.test.ts`).
- Must be deployed to and visually verified on the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`) with headless Chrome screenshot proof in `docs/images/gamemaster-ui-responsiveness-and-flicker.png`.
