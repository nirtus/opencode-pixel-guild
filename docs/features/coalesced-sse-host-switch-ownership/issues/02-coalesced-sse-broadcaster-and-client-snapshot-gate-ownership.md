# 02: Coalesced SSE Broadcaster Host Ownership & Client Snapshot Gate Ownership Separation

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: None (can start immediately)

## What to build

Enforce connection ownership (`daemonUrl`) independently of `snapshot.version` across the server's coalesced SSE broadcaster and the browser client's authoritative snapshot gate (**V2** & **V3** in [spec.md](../spec.md)).

1. **Host-Scoped Coalesced SSE Broadcaster (`src/server/sse-broadcaster.ts`, `src/server/machine-switch-reconciler.ts`, `src/server/operator-registry.ts`)**:
   - Extend `SseBroadcaster` in `src/server/sse-broadcaster.ts` with `reset(): void` (cancelling `pendingTimer`, clearing `pendingEmission`, clearing `lastSentCharMeta`, and resetting `activeDaemonUrl = null` and `lastBroadcastAtMs = 0`).
   - Track `activeDaemonUrl: string | null` inside `createSseBroadcaster` (normalized via `normalizeDaemonEndpointUrl(emission.snapshot.daemonUrl)`).
   - When `broadcast(emission)` receives an emission whose normalized `snapshot.daemonUrl` differs from `activeDaemonUrl` (when `activeDaemonUrl !== null`) or whose `delta.kind === "adapter.switched"`:
     - Immediately call `clearPending()` and `lastSentCharMeta.clear()`, update `activeDaemonUrl`, and write the new host's emission without coalescing against the old host's character metadata.
   - Guard the trailing `setTimeout` callback and `flush()` so a queued `pendingEmission` is only written if its normalized `snapshot.daemonUrl` still matches `activeDaemonUrl`.
   - Call `sseBroadcaster.reset()` when stopping adapters in `createRuntimePairingController` / `operator-registry.ts` so pending coalesced frames from the previous host are discarded the instant a host switch begins.

2. **Separate Connection Ownership from Version Comparison in Client `SnapshotGate` (`src/web/snapshot-gate.ts`, `src/web/operator-pairing-controller.ts`)**:
   - Keep `expectedMachineDaemonUrl` in `src/web/snapshot-gate.ts` as the persistent active host `daemonUrl` across the session (updated on `setExpectedMachineDaemonUrl(...)` and on valid `allowVersionReset` snapshots, and preserved when `setPendingOperatorAction(null)` clears at the end of a switch or when `resetAuthoritativeSnapshotGate({ preservePendingAction: true })` runs).
   - In `applyAuthoritativeSnapshot(nextSnap, options)`:
     - Check connection ownership **before** `nextVer < curVer`:
       - If `expectedMachineDaemonUrl` is set and `incomingUrl !== expectedMachineDaemonUrl` (including when `allowVersionReset` is false and `pendingOperatorAction` is already `null`), reject the snapshot (`return false`) even if `nextVer > curVer`.
       - If `incomingUrl` matches `expectedMachineDaemonUrl` and transitions host ownership from a different `curUrl` (`curUrl && incomingUrl && curUrl !== incomingUrl`), clear old-host client tombstones (`clientDeletedSessionIds`, `clientDeletedRoomIds`) and allow the new host's snapshot to apply even when `nextVer < curVer` and `allowVersionReset` was not explicitly passed.
       - Within the same host ownership (`incomingUrl === curUrl`), preserve the strict monotonic version gate (`nextVer < curVer` rejected unless `allowVersionReset: true`).

## Acceptance Criteria

- [x] A pending 70ms coalesced `session.upserted` emission from Host A (`version: 500`) in `createSseBroadcaster` is immediately discarded when switching to Host B (`version: 2`), and Host B's sessions are never coalesced against Host A's `lastSentCharMeta`.
- [x] In `applyAuthoritativeSnapshot`, switching from Host A (`version: 500`) to Host B (`version: 2`) renders Host B (`version: 2`) both via explicit `allowVersionReset` and via preserved-SSE host ownership transition (`nextVer < curVer`).
- [x] After the switch to Host B (`version: 2`) completes and `pendingOperatorAction` is `null`, a late snapshot from Host A with a higher version (`version: 501 > 2`) is rejected (`return false`) by connection ownership check, leaving Host B rendered.
- [x] All files under `src/` remain `<= 400` lines (`tests/00-architecture-invariants.test.ts`).

## Answer

Implemented in `src/server/sse-broadcaster.ts`, `src/server/operator-registry.ts`, and `src/web/snapshot-gate.ts`. Added `reset()` and `activeDaemonUrl` ownership tracking to `createSseBroadcaster` (wired to `onAdapterChanged` in `createOperatorWorkspaceRegistry`), and separated persistent connection ownership (`expectedMachineDaemonUrl` and `isHostOwnershipTransition`) from `nextVer < curVer` in `applyAuthoritativeSnapshot`. Verified via `tests/52-visualizer-runtime-performance.test.ts` (Slice 3b) and `tests/00-architecture-invariants.test.ts`.
