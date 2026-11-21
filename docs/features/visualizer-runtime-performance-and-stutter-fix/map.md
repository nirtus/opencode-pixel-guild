# Feature Map: Visualizer Runtime Performance & Stutter Elimination

Label: wayfinder:map

## Destination

Deliver the **Visualizer Runtime Performance & Stutter Elimination** (`docs/features/visualizer-runtime-performance-and-stutter-fix/spec.md`) across four vertical-slice tickets so the OpenCode Pixel Guild Visualizer stays smooth, responsive, and memory-bounded over multi-hour multi-project sessions:
1. Eliminate full-snapshot retention and 80x per-frame `JSON.stringify` calls in the Activity Ticker, share a single memoized ticker computation across `syncSpectatorDrawerChrome` and `reconcileTicker`, and memoize **Live Markdown Dispatch Log** formatting (both full-log and per-turn) so unchanged transcripts and non-`Chat` subtabs never re-parse 60 turns of Markdown on every SSE frame.
2. Coalesce high-frequency streaming SSE broadcasts, prevent self-amplifying on-demand `/api/guild/session/:id/messages` HTTP → reducer → SSE loops, and silence redundant `catalog.hydrated` / `tasks.hydrated` / `refreshRoomGitState` work on routine 15-second background sweeps.
3. Memoize `listHostProjectHeraldries(snapshot)` per `GuildSnapshot`, cache truncated two-row underfoot nameplate strings in `drawCharacterHero`, and short-circuit `enqueueCharacterActions` in `stepClientChoreography` across 30 FPS frames when `snapshot.version` is unchanged.
4. Bound `walker.seenToolCallIds`, prune orphaned per-session client UI Maps/Sets, compact in-memory `messages` and `outputPreview` payloads on `Archived` sessions after SQLite persistence, update project documentation (`README.md`, `GLOSSARY.md`, `docs/adr/`), and verify live on the `opencode-pixel-guild-visualizer` Docker container (`port 4310`).

## Notes

- **Domain**: `Guild Floorplan`, `Authoritative Live State`, `Spectator Drawer`, `Character Sheet`, `Guild Master Ledger`, `Toil Queue`, `Project Heraldry`, and `Guild Chronicle Store` (`GLOSSARY.md`, `ADR-0001`, `ADR-0002`, `ADR-0003`, `ADR-0004`).
- **Specification**: `docs/features/visualizer-runtime-performance-and-stutter-fix/spec.md`.
- **Rules**:
  - Work strictly inside the project root directory (`./`); never create git worktrees or use `/tmp/opencode`.
  - Keep every source file strictly `<= 400` lines (`tests/00-architecture-invariants.test.ts`).
  - Update project documentation (`README.md`, `GLOSSARY.md`, `docs/adr/`), deploy to the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`), run `npm test`, and capture visual proof in `docs/images/visualizer-runtime-performance-and-stutter-fix.png`.
- **Skills to consult**: `systematic-debugging`, `diagnosing-bugs`, `codebase-design`, `domain-modeling`, `tdd`.

## Decisions so far

<!-- the index: one line per closed ticket, enough to judge relevance, then zoom the link for the detail the ticket holds -->

- **[01: Delta-Only Activity Ticker Log & Lazy Character Sheet Markdown Reconciliation](./issues/01-delta-only-activity-ticker-and-lazy-markdown-reconciliation.md)**: Switched `clientState.tickerLog` to delta-only `{ delta }` entries (`src/web/activity-ticker-cache.ts`), replaced `JSON.stringify(item)` with O(1) structural keys, shared one memoized ticker view-model per HUD sync frame, and memoized whole-log + per-turn **Live Markdown Dispatch Log** formatting (`src/hud/dispatch-log-cache.ts`) while bypassing Markdown formatting whenever `Chat` is inactive or hidden.
- **[02: High-Frequency Streaming SSE Coalescing, On-Demand Hydration Loop Prevention & Quiet 15s Sweeps](./issues/02-streaming-sse-coalescing-hydration-guard-and-quiet-sweeps.md)**: Coalesced passive streaming `session.upserted` SSE broadcasts (`src/server/sse-broadcaster.ts`, `70ms` trailing window; `0ms` immediate delivery for lifecycle/tool/gate/room/delete deltas), gated & throttled client `/messages` fetches with error rollback (`src/web/session-message-hydration-guard.ts`), skipped no-op server `/messages` reducer dispatches with ADR-0003 parity and SQLite fallback (`src/server/session-hydration-diff.ts`), and suppressed redundant per-location 15s `catalog.hydrated` / `tasks.hydrated` / client `refreshRoomGitState` work (`src/ingress/adapter-sweep-digests.ts`, `src/web/sse-git-refresh-guard.ts`).
- **[03: 30 FPS Canvas Heraldry, Nameplate Truncation & Snapshot-Versioned Toil Queue Memoization](./issues/03-30fps-canvas-heraldry-nameplate-and-toil-queue-memoization.md)**: Memoized immutable `listHostProjectHeraldries(snapshot)` via `WeakMap` (`src/spatial/project-heraldry.ts`), cached truncated underfoot nameplate labels in a per-context 512-entry LRU (`src/web/nameplate-label-cache.ts`), and fast-pathed `enqueueCharacterActions()` across unchanged 30 FPS frames (`src/web/action-queue-sync-key.ts`).
- **[04: Long-Session Memory Bounding, Archived Payload Trimming & Live Docker Verification](./issues/04-long-session-memory-bounding-archived-trimming-and-docker-proof.md)**: Bounded `walker.seenToolCallIds` at `<= 120`, pruned deleted sessions from all client UI Maps/Sets (`src/web/session-cache-pruner.ts`), persisted `Archived` transcripts to SQLite via `onBeforeArchiveCharacter` immediately before compacting in-memory payloads to 6 turns and `<= 240`-char completed tool previews (`src/state/archived-payload-compactor.ts`), documented in `README.md`, `GLOSSARY.md`, and `docs/adr/0004-runtime-performance-sse-coalescing-and-memory-bounds.md`, and verified live on Docker (`port 4310`, `docs/images/visualizer-runtime-performance-and-stutter-fix.png`).

## Not yet specified

<!-- in-scope fog you can't ticket yet; graduates as the frontier advances -->

## Out of scope

- Replacing Canvas2D with WebGL or changing the 30 FPS simulation cadence of the **Guild Floorplan**.
- Changing **Preparation Station** perimeter slot coordinates or **Dungeon Wilds** combat rules.
