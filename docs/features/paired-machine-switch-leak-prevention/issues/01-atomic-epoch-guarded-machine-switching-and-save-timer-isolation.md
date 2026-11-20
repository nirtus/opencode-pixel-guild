# 01: Atomic Epoch-Guarded Machine Switching, Save-Timer Isolation & Stopped-Adapter Guard

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: None (can start immediately)

## What to build

Make switching between **OpenCode Machine Pairings** in `OperatorWorkspaceRegistry` and `OpenCodeClientAdapter` atomic and concurrency-safe so that switching from Machine A to Machine B—even when Machine B's initial daemon sweep takes longer than the `1200ms` snapshot debounce timer or when the operator rapidly clicks through Machine A → Machine B → Machine C—never writes Machine A's **Workshop Rooms**, **Guild Characters**, or **Lifetime Tribute** into Machine B's **Guild Chronicle Store** snapshot, never broadcasts Machine A's rooms under Machine B's `daemonUrl` to SSE clients, and immediately silences all in-flight sweeps and hydration callbacks on stopped adapters.

1. **Flush & Suspend Debounced Snapshot Persistence During Machine Switch**:
   - Before mutating `profile.daemonUrl` or touching `reducer` in `pairDaemon(targetUrl, password)`, cancel any pending `saveTimer` and flush `prevSnap` under `getStoreKey(prevSnap.daemonUrl)` only when `prevSnap.daemonUrl` is non-null and not currently mid-pairing.
   - Track an `isPairingInFlight` flag per runtime and suppress `scheduleSnapshotSave()` inside `reducer.subscribe` while `isPairingInFlight` is `true` so intermediate reducer emissions during a switch never trigger a `1200ms` timer that saves stale rooms under the new machine's storage key.
   - Compute `isDifferentMachine` by comparing normalized URLs (`prevUrl !== nextUrl`, including when `prevUrl` is `null`), and when `isDifferentMachine` is `true`, reset `reducer` (`reducer.reset({ adapter: "opencode-client", daemonUrl: cleanUrl })`) instead of dispatching `adapter.switched` with `cleanUrl` onto Machine A's in-memory rooms.
2. **Monotonic `pairingEpoch` & Background Sweep Guard**:
   - Increment a per-runtime `pairingEpoch` at the start of every `pairDaemon` call and check `currentEpoch === pairingEpoch` after every `await` boundary. If a newer `pairDaemon` call has started, immediately call `ca.stop()` on the superseded adapter and return `false` without mutating `reducer`, `runtime.clientAdapter`, `runtime.profile`, or `chronicleStore`.
   - Keep `runtime.clientAdapter` cleared (`undefined`) while `isDifferentMachine` initial pairing is in flight (until `ca.start(proxyReducer)` finishes for the active epoch) so the 15-second `sweepTimer` never triggers concurrent sweeps mid-switch.
3. **Generation-Guarded `OpenCodeClientAdapter.stop()`**:
   - Guard `runSweepAllLocations` and `startLiveSubscription` async callbacks (`scanGitStatusAsync`, `getSessionMessages`) with an adapter generation counter / `stopped` check after every `await`, and use optional chaining `activeSink?.(ev)` / `activeBatchSink?.(sweepEvents)` so a stopped adapter can never emit trailing events or throw a null-sink `TypeError`.

## Acceptance Criteria

- [x] Switching from Machine A to Machine B when Machine B's daemon sweep takes `>1500ms` (crossing the `1200ms` `saveTimer` threshold) never saves Machine A's **Workshop Rooms**, **Guild Characters**, or **Lifetime Tribute** under Machine B's **Guild Chronicle Store** key, and never emits an SSE snapshot containing Machine A's rooms with Machine B's `daemonUrl`.
- [x] Rapidly triggering overlapping `pairDaemon` switches (Machine A → slow Machine B → Machine C) aborts Machine B's superseded adapter and leaves Machine C's rooms, characters, and live SSE subscription authoritative without orphaned streams from Machine A or Machine B.
- [x] Calling `stop()` on an `OpenCodeClientAdapter` while `sweepAllLocations()` or post-idle `getSessionMessages()` is mid-flight silences all pending callbacks without throwing or dispatching events to the sink.
- [x] All source files under `src/` remain `<= 400` lines (`tests/00-architecture-invariants.test.ts`).

## Answer

Implemented in:
- `src/server/machine-switch-reconciler.ts` (`createRuntimePairingController`) & `src/server/operator-registry.ts`: Extracted a dedicated per-runtime pairing controller owning `pairingEpoch`, `pairingInFlight`, `initialSyncCompleted`, `lastStableDaemonUrl`, and `pendingAdapter`. Flushed debounced `saveTimer` saves strictly under the previous stable machine key before mutating `profile.daemonUrl`, suspended `scheduleSnapshotSave` during active switches, reset `reducer` immediately on `isDifferentMachine` (including `wasInFlight` and post-`removeOperatorMachine` disconnected resets), checked `currentEpoch === pairingEpoch` after every `await`, and aborted superseded adapters immediately.
- `src/ingress/opencode-client-adapter.ts` & `src/ingress/adapter-sweep-helpers.ts`: Added `runEpoch` / `isStopped` lifecycle guards checked after every `await` in `runSweepAllLocations`, `startLiveSubscription`, and `start`, and optional-chained `activeSink?.(ev)` so stopped adapters never emit late events or throw.
- Verified via `tests/54-paired-machine-switch-leak-prevention.test.ts` (Ticket 01 Slices 1–3) and live Docker container deployment (`opencode-pixel-guild-visualizer` on port `4310`, `docs/images/paired-machine-switch-leak-prevention.png`).
