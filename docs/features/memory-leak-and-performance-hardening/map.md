# Feature Map: Memory Leak Elimination, 60 FPS Sprite Cache Sizing, Idle-Safe SSE Tick Loop & Transactional SQLite Chronicle Store

Label: wayfinder:map

## Destination

Deliver the complete memory leak elimination and performance hardening specification in [Specification: Memory Leak Elimination, 60 FPS Sprite Cache Sizing, Idle-Safe SSE Tick Loop & Transactional SQLite Chronicle Store](./spec.md) through five vertical-slice tickets:

1. **[01: Idle-Safe `timer.tick` Short-Circuit, Bounded Transcript History & Deduplicated Server Polling](./issues/01-idle-safe-timer-tick-and-bounded-transcripts.md)** (`Blocked by: None`)
2. **[02: Transactional WAL Guild Chronicle SQLite Store & Dirty-Session Message Upserts](./issues/02-transactional-wal-sqlite-and-dirty-session-upserts.md)** (`Blocked by: 01`)
3. **[03: Unified `deriveProjectTaskProgress` & Git Status Cache Coalescing](./issues/03-cached-task-progress-and-git-status-coalescing.md)** (`Blocked by: None`)
4. **[04: High-Capacity Hero Sprite Cache, Pentagram Portal Choreography & Per-Frame Scene Memoization](./issues/04-hero-sprite-cache-pentagram-portal-and-frame-memoization.md)** (`Blocked by: None`)
5. **[05: End-to-End Memory Leak & Performance Regression Suite + Live Visual Proof](./issues/05-memory-leak-regression-suite-and-visual-proof.md)** (`Blocked by: 01, 02, 03, 04`)

## Notes

- **Domain**: **Workshop Room**, **Guild Floorplan**, **Guild Adventurer**, **Squad Subagent**, **Summoning Ritual**, **Arcane Lectern**, **Authoritative Live State**, **Guild Chronicle Store**, **Guild Operator**, **Bug Monster**, **Goal Assembly Site**.
- **Specification**: [Feature Specification](./spec.md).
- **Standing Rules**: Work strictly inside the project root directory (`./`). Never create git worktrees or write files to `/tmp` or `/tmp/opencode`. Every source file in `src/` must remain `<= 400` lines.

## Decisions so far

- [01: Idle-Safe `timer.tick` Short-Circuit, Bounded Transcript History & Deduplicated Server Polling](./issues/01-idle-safe-timer-tick-and-bounded-transcripts.md): Short-circuit no-op `timer.tick` dispatches in `WorldStateReducer` without bumping `version` or broadcasting SSE, skip `JSON.stringify` when `sseClients.size === 0`, and cap `char.messages` at 60 turns with deterministic fallback IDs.
- [02: Transactional WAL Guild Chronicle SQLite Store & Dirty-Session Message Upserts](./issues/02-transactional-wal-sqlite-and-dirty-session-upserts.md): Enable `PRAGMA journal_mode = WAL`, wrap `saveSnapshot` in `BEGIN IMMEDIATE ... COMMIT`, and track per-operator/per-session signatures to skip redundant SQLite writes.

## Not yet specified

<!-- All items specified in spec.md and tickets 01..05 -->

## Out of scope

- Replacing the 2D Canvas renderer with WebGL.
- External database servers beyond `./data/guild-chronicle.sqlite`.
