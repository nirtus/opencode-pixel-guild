# 08: CLI Deletion Pruning, Per-Operator Background Sweeps & Non-Destructive Chronicle Boot Sync

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01: Directory-Scoped V2 Session Discovery, Per-Directory Cache & Room-Scoped Active Sessions, 07: Authoritative Roster Visibility Mode & Thrash-Free Squad Subagent Retirement

**What to build:** Prune characters (and their orphaned SQLite `session_messages` rows) when sessions are deleted in the OpenCode CLI, run the 15-second background location sweep across all active authenticated **Guild Operator** runtimes in `operator-registry.ts`, and preserve historical **Guild Chronicle Store** transcripts when `pairDaemon` reconciles live daemon state on boot.

- [x] In `handleStreamReconnected` (`src/state/batch-reconciler.ts`), prune any character in `room.characterIds` / `state.characters` whose `sessionId` is absent from `loc.sessions` (unless the character was created within the last 15 seconds as an optimistic summon), and remove its reference from any parent `childSessionIds`.
- [x] Add `deleteSessionMessages(operatorId, sessionId)` (and room-level cleanup) to `GuildChronicleStorePort` in `src/server/chronicle-sqlite-store.ts` and invoke it whenever a session is deleted, pruned, or its **Workshop Room** is demolished.
- [x] Add a periodic 15-second background location sweep timer inside `createOperatorWorkspaceRegistry` (`src/server/operator-registry.ts`) that sweeps all active paired `OperatorWorkspaceRuntime` instances so authenticated **Guild Operators** receive automatic background reconciliation.
- [x] In `pairDaemon` (`src/server/operator-registry.ts`), seed `stagingReducer` with the operator's persisted **Guild Chronicle Store** message transcripts when reconnecting to the same machine so `reducer.hydrateFromSnapshot` merges live daemon state without wiping stored chat history for non-hydrated sessions.
- [x] Add tests verifying CLI-deleted session pruning, SQLite `session_messages` cleanup, per-operator background sweeps, and transcript preservation across `pairDaemon` boot sync, keeping all `src/**` files `<= 400` lines.

## Answer

Pruned CLI-deleted sessions (absent from `loc.sessions` and `activeSet` with age `> 15s`) in `handleStreamReconnected`, added `deleteSessionMessages` and automatic orphaned message cleanup on `saveSnapshot` in `src/server/chronicle-sqlite-store.ts`, added a 15-second background location sweep interval across active operator runtimes in `src/server/operator-registry.ts`, and seeded `stagingReducer` with persisted transcripts on same-machine `pairDaemon` boot sync.
