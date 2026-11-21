# 02: Transactional WAL Guild Chronicle SQLite Store & Dirty-Session Message Upserts

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01

**What to build:** Harden the **Guild Chronicle Store** (`./data/guild-chronicle.sqlite`) so snapshot saves execute inside a single atomic SQLite transaction under WAL mode and only upsert `session_messages` for sessions whose transcript signature actually changed since the last save.

**Blocked by:** 01: Idle-Safe `timer.tick` Short-Circuit, Bounded Transcript History & Deduplicated Server Polling

**Status:** resolved

- [x] Configure `PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;` on disk-backed databases in `createGuildChronicleStore` instead of `PRAGMA journal_mode = DELETE;`.
- [x] Wrap `saveSnapshot()` and `upsertSessionMessages()` in `BEGIN IMMEDIATE ... COMMIT` (with `ROLLBACK` on error) so all message upserts, orphan deletions, and `world_snapshots` updates execute in a single atomic transaction instead of hundreds of individual autocommit disk flushes.
- [x] Track per-session message signatures in `createGuildChronicleStore` so `saveSnapshot()` skips `upsertSessionMessages()` for unchanged sessions and caps persisted messages per session cleanly.

## Answer

Configured `PRAGMA journal_mode = WAL` and `PRAGMA synchronous = NORMAL` for disk-backed databases in `src/server/chronicle-sqlite-store.ts`, wrapped `saveSnapshot` and `upsertSessionMessages` in `BEGIN IMMEDIATE ... COMMIT` transactions, and added per-operator snapshot signatures and per-session message signatures so unchanged sweeps and unchanged sessions skip redundant SQLite disk writes.
