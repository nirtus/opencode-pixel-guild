# 02: Authoritative Daemon Room Reconciliation, Self-Healing SQLite Pruning & Remote Refresh Guard

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01: Atomic Epoch-Guarded Machine Switching, Save-Timer Isolation & Stopped-Adapter Guard

## What to build

Ensure that connecting or switching to an **OpenCode Machine Pairing** reconciles any persisted **Guild Chronicle Store** snapshot against the target daemon's live project, location, and session discovery—automatically pruning foreign or stale **Workshop Rooms** and cross-machine **Lifetime Tribute** rows so even previously polluted SQLite databases self-heal on connect—while preserving legitimate user-registered `0`-session worlds on that machine and preventing `POST /api/guild/refresh` from hijacking `0`-room remote machines to the visualizer host's local OpenCode service.

1. **Authoritative Daemon Room & Tribute Reconciliation (Self-Healing SQLite Snapshots)**:
   - When switching to or booting a paired machine (`pairDaemon`), pass `baseSnap?.deletedSessionIds` and `baseSnap?.deletedRoomIds` tombstones to `ca.evictDeletedSessions` and `ca.evictDeletedRooms`, and run `ca.start(proxyReducer)` against a fresh `stagingReducer` so the target daemon's live `/api/project`, `/api/worktree`, `/api/location`, `/api/debug/location`, and `/api/session` responses establish the authoritative room and character set.
   - Reconcile any `0`-session rooms from `baseSnap.rooms` (that are not in `deletedRoomIds` or system root/home directories) by verifying that they belong to the target machine (e.g., matching the target daemon's discovered workspace root prefix or passing `dc.probeDirectory` when available) and pruning any foreign rooms that belong to a different machine's path tree or fail verification.
   - Restore persisted chat messages (`baseSnap.characters[sid]?.messages`) only onto characters that were discovered on the target daemon, and filter `baseSnap.tributeLedger` (and prune foreign `session_tribute_ledger` SQLite rows on `saveSnapshot`) so tribute records whose `roomId`/`locationDirectory` belongs to a foreign machine room are removed.
2. **Guard `onRefresh` & Tunnel Loopback Matching Against Local Service Hijacking**:
   - In `toRouterContext().onRefresh`, only invoke `options.discoverService()` fallback when `!runtime.profile.daemonUrl || isLocalDaemonEndpoint(runtime.profile.daemonUrl)`. Never call local `discoverService()` when the operator is paired to a remote machine (`!isLocalDaemonEndpoint(runtime.profile.daemonUrl)`), even if the remote machine returns `0` rooms.
   - In `pairDaemon`'s tunnel-to-local loopback check, require an exact normalized URL match in `info.urls` before substituting `svc.url`.

## Acceptance Criteria

- [x] If Machine B's SQLite row in the **Guild Chronicle Store** was previously polluted with foreign **Workshop Rooms**, **Guild Characters**, and **Lifetime Tribute** entries from Machine A, switching to Machine B automatically prunes the foreign rooms, characters, and tribute rows and persists the clean self-healed snapshot to SQLite.
- [x] A legitimate `0`-session project world explicitly registered on Machine A (via `POST /api/guild/room` / `registerLocation` within Machine A's workspace) is preserved when switching from Machine A to Machine B and back to Machine A, without appearing on Machine B.
- [x] Calling `POST /api/guild/refresh` (`onRefresh`) while paired to a remote machine (`https://...opentunnel.xyz`) that has `0` rooms keeps the remote machine pairing active with `0` rooms and never calls local `discoverService()` or pairs to the visualizer host's local daemon.
- [x] All source files under `src/` remain `<= 400` lines (`tests/00-architecture-invariants.test.ts`).

## Answer

Implemented in:
- `src/server/snapshot-reconciler.ts` (`reconcilePersistedSnapshotWithDaemon`), `src/server/chronicle-sqlite-store.ts` (`pruneTributeSessions`, `MachineScopeKey`), and `src/ingress/daemon-http-client.ts` (casing-preserving `resolveDaemonDir` in `probeDirectory`): On machine switch and initial boot sync, swept the target daemon cleanly before reconciling persisted `0`-session worlds (verified via `probeDirectory` or workspace prefix), merging persisted chat messages only onto live discovered sessions, filtering out foreign rooms and cross-machine **Lifetime Tribute** records, and deleting pruned foreign rows from SQLite `session_tribute_ledger`.
- `src/server/operator-registry.ts` & `src/server/machine-switch-reconciler.ts`: Guarded `toRouterContext().onRefresh` with `isLocalDaemonEndpoint(currentUrl)` so refreshing a `0`-room remote machine never invokes local host `discoverService()`, and hardened tunnel loopback matching to require exact normalized URL equality.
- Verified via `tests/54-paired-machine-switch-leak-prevention.test.ts` (Ticket 02 Slices 1–2) and live Docker container deployment (`opencode-pixel-guild-visualizer` on port `4310`, confirmed the active paired remote machine snapshot contains strictly its own 3 rooms and matching tribute rooms).
