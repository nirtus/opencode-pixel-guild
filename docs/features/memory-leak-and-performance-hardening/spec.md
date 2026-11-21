# Specification: Memory Leak Elimination, 60 FPS Sprite Cache Sizing, Idle-Safe SSE Tick Loop & Transactional SQLite Chronicle Store

Label: ready-for-agent
Status: resolved

## Problem Statement

When the OpenCode Pixel Guild Visualizer runs continuously against a live OpenCode daemon (especially with multiple projects and **Squad Subagents** co-habiting the unified **Workshop Room**), the application progressively consumes more memory, stalls the Node.js event loop, and stutters on the 60 FPS HTML5 Canvas after a few minutes of operation.

Diagnosis (`@diagnosing-bugs`) identified five compounding memory leaks and performance bottlenecks across the browser renderer, reducer/SSE broadcast pipeline, and SQLite persistence layer:

1. **100% LRU Thrashing in `articulatedRigImageCache` at `>= 11` Characters (`src/web/canvas-hero-painter.ts`)**:
   - `drawCharacterHero` cycles through `12` animation buckets per second (`Math.floor(t * 12) % 12`) per visible character.
   - Because `selectVisibleHostCharacters` returns up to `16` characters in the shared **Workshop Room** (`16 × 12 = 192` active sprite keys) while `articulatedRigImageCache` is capped at `128` entries, every character's animation bucket is evicted before the 1-second cycle repeats.
   - After 11 characters appear, cache hit rate drops to **0%**, causing `createSvgImage()` to synthesize ~192 multi-kilobyte SVG strings, `encodeURIComponent` data URLs, `new Image()` DOM elements, and `guild-sprite-loaded` events every single second, plus visible sprite staggering during **Squad Subagent** pentagram summoning.

2. **Unconditional 1 Hz Full-World `structuredClone` & Multi-MB SSE Broadcast Storm (`src/server/operator-registry.ts`, `src/state/world-reducer.ts`)**:
   - Every `1,000 ms`, `tickTimer` dispatches `{ type: "timer.tick" }` to every registered **Guild Operator** reducer.
   - Even when `handleTimerTick` mutates zero characters and zero rooms, `dispatch()` unconditionally calls `buildSnapshot()` (`structuredClone(state.rooms)` and `structuredClone(state.characters)`) and broadcasts the full ~2 MB JSON snapshot over SSE (`JSON.stringify(emission)`), forcing the browser to `JSON.parse` a multi-megabyte object graph and run DOM reconciliation every second while idle.

3. **Unbatched Synchronous SQLite Autocommits & Unbounded `messages` Growth (`src/server/chronicle-sqlite-store.ts`, `src/state/session-handlers.ts`, `src/ingress/daemon-message-hydration.ts`)**:
   - `chronicle-sqlite-store.ts` opens `guild-chronicle.sqlite` with `PRAGMA journal_mode = DELETE` and runs `saveSnapshot()` without a `BEGIN IMMEDIATE ... COMMIT` transaction, executing hundreds of individual autocommit disk writes on the main Node.js thread every 1.2s–15s.
   - Simultaneously, fallback message IDs `${role}:${sessionId}:${orderedMessages.length - mIdx}` shift whenever `orderedMessages.length` grows, and `char.messages` has no length cap, causing duplicate message records to accumulate indefinitely in RAM and SQLite.

4. **Redundant 60 FPS Per-Frame Scene Allocations & Unpruned Client Maps (`src/web/app-main.ts`, `src/web/client-choreography.ts`, `src/web/canvas-wilds-painter.ts`)**:
   - Every 16.6ms frame recomputes `deriveProjectBugMonsters()` 3–4 times (cloning snapshots and running regexes over tool outputs) and `getVisibleProjectCharacters()` 5 times, while `clientState.characterWalkers`, `clientState.knownSessionIds`, `onDemandHydratedSessions`, and `expandedChatMessageIds` never prune deleted sessions.

5. **Uncached Synchronous `git` Subprocess Spawns & Duplicate Background Sweep Loops (`src/ingress/issue-tracker-scanner.ts`, `src/server/main.ts`)**:
   - `deriveProjectTaskProgress(rawDir)` bypasses `taskProgressCache` whenever `fallbackSessions === undefined` (every mutating `tool.completed` and `session.idle` SSE event), spawning up to 5 synchronous `execFileSync("git", ...)` processes on the Node.js event loop. Meanwhile, `main.ts` runs an unused unauthenticated 15s daemon sweep in parallel with `operatorRegistry`'s 15s sweep.

## Solution

Eliminate all five memory leak and stagger sources through targeted architectural hardening while preserving all existing visual and functional guarantees (and keeping every file in `src/` strictly `<= 400` lines):

1. **Short-Circuit No-Op `timer.tick` Dispatches & Bound Per-Character Transcripts**:
   - Skip `buildSnapshot()` and subscriber emission when `timer.tick` mutates zero rooms and zero characters.
   - Skip `JSON.stringify(emission)` when `sseClients.size === 0`, and disable the redundant unauthenticated background poll in `main.ts` when `requireAuth: true`.
   - Use deterministic message IDs and cap in-memory `char.messages` to the latest `60` turns.
2. **Transactional WAL SQLite Persistence & Dirty-Session Upserts**:
   - Configure `PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;` on disk-backed **Guild Chronicle Store** instances, wrap `saveSnapshot()` in `BEGIN IMMEDIATE ... COMMIT`, and only upsert `session_messages` for sessions whose message signature changed.
3. **Cache `deriveProjectTaskProgress` Across Direct & Fallback Calls**:
   - Key `taskProgressCache` for both direct (`fallbackSessions === undefined`) and session-fallback invocations, and coalesce rapid `scanGitStatusSync` calls within a short TTL unless invalidated by a Git staging/commit mutation.
4. **Size Sprite Caches for Full 16-Hero Co-Habitation, Smooth Pentagram Portal Spawn/Despawn & Memoize 60 FPS Frame Queries**:
   - Expand `articulatedRigImageCache` to `1024` entries (`pixelSpriteBitmapCache` to `256`), implement smooth pentagram center (`206, 624`) rising/sinking hole-clipped portal choreography for **Squad Subagents**, memoize `getVisibleProjectCharacters()` and `deriveProjectBugMonsters()` per snapshot version/filter state, and prune deleted session keys from client maps.

## User Stories

1. As a **Guild Operator**, I want the **Guild Floorplan** canvas to maintain a smooth, stagger-free 60 FPS frame rate even when 12–16 **Guild Adventurers** and **Squad Subagents** are simultaneously active in the shared **Workshop Room**, so that character animations never stutter or flicker.
2. As a **Guild Operator**, I want `articulatedRigImageCache` to retain all active animation buckets for every visible character in the **Workshop Room**, so that the browser does not re-synthesize and re-decode hundreds of SVG `Image` objects every second.
3. As a **Guild Operator**, I want newly summoned **Squad Subagents** to rise smoothly from the center of the **Arcane Lectern** pentagram (`206, 624`) through a clipped portal hole and sink back into the pentagram hole upon retirement, so that subagent materialization and dismissal are visually cohesive without sprite stagger.
4. As a **Guild Operator**, I want idle 1-second `timer.tick` checks on the server to be zero-allocation no-ops when no character dwell, **Summoning Ritual**, or archive timer has expired, so that the server and browser do not deep-clone, serialize, transmit, and parse a multi-megabyte `GuildSnapshot` every second while idle.
5. As a **Guild Operator**, I want SSE serialization (`JSON.stringify`) to be skipped whenever no browser `EventSource` client is connected to an operator workspace, so that background operator runtimes consume negligible CPU and heap.
6. As a **Guild Operator**, I want each character's in-memory `messages` array to use deterministic message IDs and stay bounded to the most recent `60` conversation turns, so that long-running sessions do not bloat `GuildSnapshot` memory or create duplicate fallback message rows.
7. As a **Guild Operator**, I want the **Guild Chronicle Store** (`./data/guild-chronicle.sqlite`) to use SQLite WAL mode and wrap `saveSnapshot` in a single atomic `BEGIN IMMEDIATE ... COMMIT` transaction that only writes changed sessions, so that periodic snapshot persistence never blocks the Node.js event loop across hundreds of autocommit journal flushes.
8. As a **Guild Operator**, I want `deriveProjectTaskProgress` to cache filesystem and Git working-tree scans across both `tool.completed` / `session.idle` SSE events and location sweeps, so that rapid tool executions do not freeze the companion server with synchronous `git` child processes.
9. As a **Guild Operator**, I want `getVisibleProjectCharacters()` and `deriveProjectBugMonsters()` to be memoized across 60 FPS animation frames whenever `snapshot.version` and UI filter selections are unchanged, so that per-frame CPU work is minimal regardless of total historical session count.
10. As a **Guild Operator**, I want client-side state maps (`characterWalkers`, `knownSessionIds`, `onDemandHydratedSessions`, `expandedChatMessageIds`) to automatically prune deleted session IDs, so that browser memory stays flat over days of continuous operation.

## Implementation Decisions

- **No-Op `timer.tick` Guard in `WorldStateReducer`**:
  - When `rawEvent.type === "timer.tick"` and `collector.changedRoomIds.size === 0 && collector.changedCharacterIds.size === 0`, `dispatch()` returns the cached last snapshot (with a lightweight `timer.tick` delta) without incrementing `state.version`, calling `buildSnapshot()`, or invoking `state.subscribers`.
- **Bounded & Deduplicated Session Messages**:
  - Cap `char.messages` at `MAX_IN_MEMORY_SESSION_MESSAGES = 60` (keeping the newest 60 chronological messages).
  - In `hydrateSessionMessages`, when a raw daemon message lacks an explicit `id` / `info.id`, derive a stable ID from `${role}:${sessionId}:${createdTimestampOrStableIndex}` rather than `orderedMessages.length - mIdx`, and deduplicate adjacent messages with identical role and text prefix.
- **Transactional WAL SQLite Persistence**:
  - Configure `PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;` in `createGuildChronicleStore`.
  - Wrap `saveSnapshot` in `BEGIN IMMEDIATE ... COMMIT`, and maintain an in-memory per-session message hash/signature map so `upsertSessionMessages` only runs for sessions whose messages changed.
- **Task Progress & Git Status Caching**:
  - Cache `deriveProjectTaskProgress` in `taskProgressCache` for `8,000 ms` regardless of whether `fallbackSessions` is defined or `undefined`.
- **60 FPS Canvas Cache Sizing, Memoization & Pentagram Portal Choreography**:
  - Increase `articulatedRigImageCache` max entries from `128` to `1024` and `pixelSpriteBitmapCache` from `64` to `256`.
  - Memoize `getVisibleProjectCharacters()` and `deriveProjectBugMonsters()` keyed by `(snapshot.version, selectedProjectId, selectedRoomId, rosterMode, isAllWorldsFocused)`.
  - Implement pentagram center (`206, 624`) spawn/despawn portal choreography (`portalPhase: "spawning" | "despawning"`, `portalProgress`, hole clipping in `drawCharacterHero`, and `drawPentagramPortalRitual`).

## Testing Decisions

- **High-Seam Behavioral & Performance Invariant Tests (`tests/25-memory-leak-and-performance-hardening.test.ts`)**:
  - Test external behavior and measurable resource invariants at the reducer, SQLite store, ingress scanner, and canvas painter/choreography seams:
    1. Verify 100 idle `timer.tick` dispatches emit `0` subscriber notifications and do not increment `snapshot.version` when no timers expire, while expiring `summoningRitual` / `dwellUntilMs` still emit immediately.
    2. Verify `char.messages` stays `<= 60` across 120 upserted turns and never duplicates fallback message IDs when message count grows.
    3. Verify `createGuildChronicleStore` runs `saveSnapshot` inside a single transaction and skips redundant `session_messages` writes on unchanged sessions.
    4. Verify `drawCharacterHero` across 16 characters × 12 animation buckets (`192` combinations) achieves a 100% cache hit rate on subsequent cycles without evicting active buckets.
    5. Verify `getVisibleProjectCharacters()` and `deriveProjectBugMonsters()` memoize across frames and `stepClientChoreography` prunes deleted session walkers.
    6. Verify all existing test suites (`tests/00` through `tests/24`, including `tests/22` Tickets 06 & 12) pass 100%.

## Out of Scope

- Replacing the HTML5 Canvas2D renderer with WebGL/WebGPU.
- Moving SQLite to an external client-server RDBMS.

## Further Notes

- All source files under `src/` must remain strictly `<= 400` lines (`tests/00-architecture-invariants.test.ts`).
