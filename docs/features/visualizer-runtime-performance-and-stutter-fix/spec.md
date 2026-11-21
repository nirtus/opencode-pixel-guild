# Feature Specification: Visualizer Runtime Performance & Stutter Elimination

Label: ready-for-agent

## Problem Statement

Over extended spectator sessions—especially when multiple **Guild Adventurers** and **Squad Subagents** execute tool turns, stream assistant responses, and accumulate multi-turn transcripts across several project worlds—the OpenCode Pixel Guild Visualizer progressively becomes laggy and stutters on both the 30 FPS **Guild Floorplan** canvas and the **Spectator Drawer** HUD:

1. **Full-Snapshot Retention & 80x Per-Frame `JSON.stringify` in the Activity Ticker**:
   - The client SSE listener pushes the entire `GuildStateEmission` (`{ snapshot, delta }`) into `clientState.tickerLog` (up to 40 items), retaining 40 full historical world snapshots in browser memory.
   - On every SSE frame, `scheduleHudSync()` invokes `buildScopedActivityTicker()` twice (once in `syncSpectatorDrawerChrome()` to render the `⚡ Ticker (N)` tab badge and once in `reconcileTicker()` to reconcile `#ticker-entries`), and `buildActivityTickerViewModel()` runs `JSON.stringify(item)` on every entry in `tickerLog`—stringifying 40 full `GuildSnapshot` objects twice per SSE event (80 multi-megabyte `JSON.stringify` calls on the browser UI thread) plus re-running regex skill extraction across all character histories.
2. **Unconditional Full-Transcript Markdown Parsing Before Signature Short-Circuiting**:
   - On every SSE frame when a **Guild Character** is selected, `reconcileSidePanel()` unconditionally calls `buildCharacterSheetViewModel()`, which runs `buildAdventurerDispatchLogViewModel()` and executes multi-pass Markdown formatting (`formatChatMarkdownHtml()`) over all 60 chat turns *before* checking whether `staticSig === lastSidePanelSignature` or whether the **Character Sheet** is even on the `Chat` subtab (`Details`, `Scrolls & Gear`, and `Tool Log` pay the full 60-turn Markdown parse cost on every frame).
3. **Self-Amplifying On-Demand Message Hydration Loops & High-Frequency Streaming SSE Broadcasts**:
   - In `reconcileSidePanel()`, `hydrationRev` includes `lastActivityAtMs`, `lifecycleState`, `sequenceCursor`, and `recentTools[0]`. During an active turn, every SSE status or tool update changes `hydrationRev` and triggers `GET /api/guild/session/:id/messages`—even when the **Character Sheet** is hidden or on the `General` (**Guild Master Ledger**) tab on mobile.
   - The server handler for `GET /api/guild/session/:id/messages` dispatches `session.upserted` into the reducer, bumping `snapshot.version` and broadcasting another full snapshot over SSE to all connected browsers, creating a self-amplifying HTTP → reducer → SSE → HTTP feedback loop.
   - Similarly, rapid token/text streaming frames (`message.part.updated`, `message.updated`, `session.text.ended`, `session.usage.updated`) trigger immediate full-world `structuredClone` + `JSON.stringify` SSE broadcasts dozens of times per second, and routine 15-second background location sweeps re-dispatch unchanged `catalog.hydrated` and `tasks.hydrated` events and trigger redundant client `refreshRoomGitState()` HTTP polls.
4. **30 FPS Canvas & Choreography Per-Frame Allocations**:
   - `renderWorkshopRoom()` calls `listHostProjectHeraldries(snapshot)` on every 30 FPS frame without per-snapshot memoization, scanning all rooms and characters 30 times per second.
   - `drawCharacterHero()` runs a `while (k > 1 && c.measureText(...).width > row1TextW) k--` canvas text-measurement loop per character on every 30 FPS frame whenever a character's title exceeds the first-row **Project Heraldry** badge width.
   - `stepClientChoreography()` invokes `enqueueCharacterActions()` on every 30 FPS frame for every visible character, scanning and sorting `recentTools` 30 times per second even when `snapshot.version` has not changed.
5. **Unbounded Long-Session Memory Growth across Server & Client State**:
   - Per-character `walker.seenToolCallIds` sets and per-session client UI Maps/Sets (`expandedChatMessageIds`, `resolvedClientPromptsBySession`, `draftPromptsBySession`, `draftDeliveryBySession`, `draftGateAnswersByGateId`, `collapsedGateIds`, `draftAgentModeBySession`, `skillOffsetByScope`, `skillFilterByScope`) accumulate entries without pruning when sessions are deleted or archived.
   - `Archived` sessions and retired **Squad Subagents** retain full 60-turn `messages` arrays and 2,000-character `recentTools[].outputPreview` strings in memory inside `state.characters`, inflating every `structuredClone` in `buildSnapshot()` and every SSE payload over multi-hour runs.

## Solution

Eliminate progressive lag, main-thread stalls, and memory creep across the **Spectator Drawer**, **Authoritative Live State** SSE pipeline, **Guild Floorplan** 30 FPS canvas renderer, and **WorldStateReducer** by:

1. Storing lightweight delta-only ticker entries in `clientState.tickerLog`, replacing `JSON.stringify(item)` deduplication with O(1) structural keys, sharing a single memoized ticker view-model per HUD sync frame, and memoizing **Live Markdown Dispatch Log** turn formatting per message digest so unchanged turns and non-`Chat` subtabs never re-parse Markdown.
2. Coalescing high-frequency streaming text/usage SSE broadcasts over a short cadence window, restricting on-demand `/api/guild/session/:id/messages` hydration fetches to visible **Character Sheet** selections without redundant server-side reducer emissions when message digests are unchanged, and silencing no-op 15-second background sweep emissions and client Git status re-polls.
3. Memoizing `listHostProjectHeraldries(snapshot)` via `WeakMap<GuildSnapshot, ...>`, caching truncated two-row underfoot **Project Heraldry** nameplate strings per `(row1TextW, name)`, and short-circuiting `enqueueCharacterActions()` in `stepClientChoreography()` when `snapshot.version` and Armory timers are unchanged.
4. Bounding `walker.seenToolCallIds`, pruning orphaned per-session client Maps/Sets, and trimming heavy in-memory transcript/tool output payloads from `Archived` sessions once persisted to the **Guild Chronicle Store**.

## User Stories

1. As a **Guild Operator** running the visualizer for hours across multiple projects, I want `clientState.tickerLog` to store only lightweight delta records rather than full `GuildSnapshot` copies, so that browser memory does not retain 40 redundant multi-megabyte world snapshots.
2. As a **Guild Operator**, I want `buildActivityTickerViewModel` to deduplicate ticker entries using a fast O(1) composite key rather than `JSON.stringify(item)`, so that each SSE update does not stall the browser main thread stringifying large objects.
3. As a **Guild Operator**, I want `syncSpectatorDrawerChrome` and `reconcileTicker` to share a single memoized `ActivityTickerViewModel` computation per `scheduleHudSync()` frame, so that the **Category Subtab Deck** badge count and ticker list never compute the same history twice per frame.
4. As a **Guild Operator** inspecting a **Guild Character** in the **Character Sheet**, I want `buildAdventurerDispatchLogViewModel` and `formatChatMarkdownHtml` to be memoized by character message digest and skipped when unchanged, so that streaming telemetry from other characters or non-chat updates never re-parse 60 turns of Markdown on every SSE frame.
5. As a **Guild Operator** viewing the `Details`, `Scrolls & Gear`, or `Tool Log` subtab of the **Character Sheet** (or viewing the **Guild Master Ledger**), I want the reconciler to avoid re-formatting the 60-turn chat transcript until I switch to `Chat` or the selected character's transcript digest changes, so that HUD updates remain instantaneous.
6. As a **Guild Operator** watching an active **Guild Adventurer** stream long assistant responses or reasoning tokens, I want high-frequency streaming `session.upserted` SSE broadcasts on the server to coalesce within a short window while lifecycle transitions (`tool.started`, `tool.completed`, `session.idle`, `permission.requested`, `question.requested`, `session.deleted`, `room.deleted`) broadcast immediately, so that the browser is not flooded with dozens of multi-megabyte JSON snapshots per second.
7. As a **Guild Operator**, I want on-demand `/api/guild/session/:id/messages` hydration in `reconcileSidePanel` to trigger only when the **Character Sheet** is actively visible and the session's message state actually requires hydration (throttled during active streaming turns), so that selecting a hero does not create a self-amplifying HTTP → reducer → SSE broadcast loop on every tool step.
8. As a **Guild Operator**, I want `GET /api/guild/session/:id/messages` on the server to avoid dispatching redundant `session.upserted` emissions when the hydrated message/tool digest matches the character's current state in the reducer, so that read-only message fetches do not broadcast unnecessary full-world SSE frames to all connected clients.
9. As a **Guild Operator**, I want the 15-second background location sweep (`sweepAllLocations`) to skip dispatching `catalog.hydrated` and `tasks.hydrated` events when a room's catalog and task progress digests are unchanged, so that idle 15-second sweeps do not bump `snapshot.version` or force client HUD and SQLite re-syncs.
10. As a **Guild Operator**, I want the browser SSE handler to avoid firing `refreshRoomGitState()` (`GET /api/guild/git`) on routine `stream.reconnected` background sweeps unless the selected room's `taskProgress` or active session state changed, so that the visualizer does not experience a periodic 15-second Git subprocess and network stutter.
11. As a **Guild Operator** watching the 30 FPS **Guild Floorplan**, I want `listHostProjectHeraldries(snapshot)` to be memoized per `GuildSnapshot` instance in a `WeakMap`, so that `renderWorkshopRoom()` does not re-scan and normalize all rooms and characters 30 times per second.
12. As a **Guild Operator** watching multiple **Guild Characters** with long session titles on the 30 FPS canvas, I want the truncated second-row underfoot nameplate label (`row2Label`) in `drawCharacterHero()` to be cached in an LRU map keyed by `(font, row1TextW, name)`, so that the canvas renderer never runs per-frame character-by-character `ctx.measureText()` loops.
13. As a **Guild Operator**, I want `stepClientChoreography()` to skip re-scanning and re-sorting `c.recentTools` inside `enqueueCharacterActions()` on 30 FPS frames where `snapshot.version` and the character's Armory/lifecycle timers have not changed, so that per-frame choreography CPU usage stays near zero between telemetry events.
14. As a **Guild Operator** running long sessions with hundreds of tool calls, I want `walker.seenToolCallIds` to remain bounded (e.g., capped at the most recent 120 tool call IDs while preserving the current `c.recentTools` IDs), so that per-walker sets do not grow without bound.
15. As a **Guild Operator**, I want per-session client UI Maps and Sets (`expandedChatMessageIds`, `resolvedClientPromptsBySession`, `draftPromptsBySession`, `draftDeliveryBySession`, `draftGateAnswersByGateId`, `collapsedGateIds`, `draftAgentModeBySession`, `skillOffsetByScope`, `skillFilterByScope`) to be automatically pruned when sessions are deleted from `snapshot.characters`, so that client memory remains clean across session lifecycles.
16. As a **Guild Operator**, I want characters that transition to `Archived` (including retired **Squad Subagents** and historical **Guild Adventurers** outside the active/recent window) to trim heavy in-memory `recentTools[].outputPreview` payloads and cap in-memory `messages` to a minimal tail (while full transcripts remain durably stored in the **Guild Chronicle Store** SQLite `session_messages` table and re-hydratable on demand when selected), so that `buildSnapshot()` `structuredClone` times and SSE JSON payload sizes remain small and constant over multi-day uptime.

## Implementation Decisions

- **Delta-Only Client Ticker Log & O(1) Deduplication**:
  - When the client SSE listener receives an emission with a valid `emission.delta.description`, push a lightweight `{ delta: emission.delta }` record (never the outer `emission` containing `emission.snapshot`) into `clientState.tickerLog`.
  - In `buildActivityTickerViewModel`, replace `JSON.stringify(item)` with a deterministic string key derived from `delta.version`, `delta.kind`, `delta.timestampMs`, `delta.sessionId`, `delta.roomId`, and `delta.description` (or `category:sessionId:roomId:timestamp:summary` for synthetic entries).
  - Memoize `buildScopedActivityTicker()` in the ledger panel reconciler against `(snapshot.version, tickerLog.length, lastTickerItem, selectedProjectId, selectedRoomId, isAllWorldsFocused, rosterMode)` so `syncSpectatorDrawerChrome()` and `reconcileTicker()` reuse the exact same computed view-model within a frame.
- **Memoized & Lazy Live Markdown Dispatch Log**:
  - In `chat-markdown-formatter.ts`, cache `buildAdventurerDispatchLogViewModel` results per `sessionId` keyed by a fast digest of `(messages.length, lastMsgId, lastMsgUpdatedAtMs, lastMsgTextLength, lastUserPromptLength, lastAssistantTextLength, agentDisplayName, modelId, isBusy, overheadLabel)`.
  - Additionally cache individual turn `formatChatMarkdownHtml` outputs by `(messageId, cleanText.length)` so when only the final streaming assistant turn grows during live token streaming, the preceding 59 turns reuse their already-formatted HTML strings in O(1) time without re-running regex Markdown formatting.
- **Streaming SSE Broadcast Coalescing & Quiet Background Sweeps**:
  - In the server's reducer-to-SSE broadcast layer, broadcast lifecycle, tool, Quest Gate, room, and deletion deltas immediately (`0ms`), while coalescing rapid passive text/token streaming updates (`session.upserted` where only streaming text/tokens changed) over a short `75ms` trailing timer per operator workspace so burst token streams do not serialize and push dozens of full-world snapshots per second.
  - In `opencode-client-adapter.ts`, track per-location catalog and task progress digests across sweeps so routine 15-second background sweeps (`isReconnect === false`) only emit `catalog.hydrated` or `tasks.hydrated` when the catalog or task progress actually changed.
  - In `app-main.ts`, on `stream.reconnected` SSE frames, only call `refreshRoomGitState()` if the selected room has no cached Git state yet or its `taskProgress` signature changed.
- **Guarded On-Demand Message Hydration**:
  - In `reconcileSidePanel()`, only trigger `GET /api/guild/session/:id/messages` when the **Character Sheet** is the active visible tab (not when `mobileActiveTab === "ledger"` or `"ticker"`), and when either the hero was newly selected with `0` messages or `lifecycleState` / `idleAtMs` transitioned (throttling mid-turn streaming re-fetches).
  - In `tryHandleGuildApiRoute` (`GET /api/guild/session/:id/messages`), compare the hydrated message/tool/gate digest against the character's existing state in `activeReducer.getSnapshot()` and skip dispatching `session.upserted` when nothing changed, returning the existing snapshot without triggering a redundant SSE broadcast.
- **30 FPS Canvas & Toil Queue Memoization**:
  - In `project-heraldry.ts`, cache `listHostProjectHeraldries(snapshot)` in a `WeakMap<GuildSnapshot, ProjectHeraldryDescriptor[]>`.
  - In `canvas-hero-painter.ts`, cache truncated `row2Label` nameplate strings in a bounded `Map<string, string>` (capped at 512 entries) keyed by `${Math.round(row1TextW)}:${name}` so `ctx.measureText()` truncation loops run at most once per unique character title and badge width.
  - In `client-choreography.ts` / `character-action-queue.ts`, record `lastEnqueuedSnapshotVersion` and `lastEnqueuedArmoryActive` on `WalkerState` so `enqueueCharacterActions()` fast-paths when the snapshot version and armory state have not changed since the previous frame.
- **Bounded Session Memory & Archived Payload Compaction**:
  - Cap `walker.seenToolCallIds` at `120` entries (evicting oldest entries not present in `c.recentTools`).
  - Prune deleted session keys from `expandedChatMessageIds`, `resolvedClientPromptsBySession`, `draftPromptsBySession`, `draftDeliveryBySession`, `draftGateAnswersByGateId`, `collapsedGateIds`, `draftAgentModeBySession`, `skillOffsetByScope`, and `skillFilterByScope` whenever sessions are pruned in `stepClientChoreography()` or `reconcileSidePanel()`.
  - When a character transitions to `Archived` in the reducer (after its messages have been upserted to the **Guild Chronicle Store**), trim `recentTools[].outputPreview` on completed non-error tools to `<= 240` chars and cap in-memory `char.messages` on `Archived` sessions to the latest `6` turns (full 60-turn history remains in SQLite `session_messages` and re-hydrates automatically if the user selects the archived character in `Full Lineage` mode).

## Testing Decisions

- **What makes a good test**: Tests must assert observable external behavior, view-model identity/memoization, emission counts, DOM write counts, and memory/collection bounds across realistic multi-turn and multi-frame lifecycles without coupling to private variable names.
- **Testing Seams**:
  1. **Spectator Drawer View-Model & Reconciler Seam** (`buildActivityTickerViewModel`, `buildCharacterSheetViewModel`, `buildAdventurerDispatchLogViewModel`, `reconcileSidePanel`, `reconcileTicker`):
     - Verify `clientState.tickerLog` stores delta-only entries without retaining `GuildSnapshot` references, `buildActivityTickerViewModel` deduplicates without `JSON.stringify` on snapshots, and `reconcileSidePanel` + `reconcileTicker` share a memoized ticker result.
     - Verify `buildAdventurerDispatchLogViewModel` memoizes across unchanged snapshots and incrementally formats only the updated streaming turn without re-formatting older turns.
  2. **WorldStateReducer / SSE / Adapter Seam** (`createWorldStateReducer`, `createOpenCodeClientAdapter`, `tryHandleGuildApiRoute`, `createOperatorWorkspaceRegistry`):
     - Verify routine 15s `sweepAllLocations(false)` skips redundant `catalog.hydrated` and `tasks.hydrated` dispatches when unchanged.
     - Verify `GET /api/guild/session/:id/messages` does not bump `snapshot.version` or broadcast a redundant SSE emission when hydrated messages match current reducer state, and `reconcileSidePanel` does not fire `/messages` fetches while viewing the **Guild Master Ledger**.
     - Verify `Archived` sessions trim heavy in-memory `messages` and `outputPreview` payloads while preserving **Lifetime Tribute** and SQLite `session_messages` history.
  3. **30 FPS Choreography & Canvas Painter Seam** (`stepClientChoreography`, `listHostProjectHeraldries`, `drawCharacterHero`):
     - Verify `listHostProjectHeraldries(snapshot)` returns the memoized array reference for the same `GuildSnapshot`.
     - Verify `drawCharacterHero` caches truncated `row2Label` strings without repeating `measureText` loops on every frame.
     - Verify `stepClientChoreography` fast-paths `enqueueCharacterActions` across 30 FPS frames when `snapshot.version` is unchanged and caps `walker.seenToolCallIds` and per-session client Maps/Sets.
- **Prior Art**:
  - `tests/25-memory-leak-and-performance-hardening.test.ts`
  - `tests/44-gamemaster-ui-responsiveness-and-flicker.test.ts`
  - `tests/00-architecture-invariants.test.ts` (enforcing the strict 400-line ceiling across all `src/**/*` files).

## Out of Scope

- Replacing Canvas2D with WebGL or changing the 30 FPS simulation cadence of the **Guild Floorplan**.
- Changing the visual design of **Workshop Room** fixtures, **Preparation Station** coordinates, or **Dungeon Wilds** combat rules.
- Modifying the SQLite schema of `guild-chronicle.sqlite`.

## Further Notes

- Every modified file under `src/` must remain strictly `<= 400` lines (`tests/00-architecture-invariants.test.ts`).
- After implementation, documentation (`README.md`, `GLOSSARY.md`, `docs/adr/`) must be updated, the knowledge graph refreshed (`graphify update .`), and the changes deployed to the `opencode-pixel-guild-visualizer` Docker container on port `4310` with headless Chrome screenshot verification.
