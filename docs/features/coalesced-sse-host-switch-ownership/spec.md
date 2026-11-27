# Specification: Coalesced SSE Connection Ownership & Mid-Stream Paired Host Switch Hardening

Label: ready-for-agent
Status: resolved

## 1. Problem Statement & Motivation

In `opencode-pixel-guild`, live telemetry flows across three streaming and reconciliation boundaries:
1. **Upstream Daemon SSE Reader & Client Adapter** (`src/ingress/daemon-http-client.ts` & `src/ingress/opencode-client-adapter.ts`): Reads chunked `text/event-stream` payloads from the active paired OpenCode daemon (`GET /api/event`), buffers incomplete frames across `\r?\n\r?\n` boundaries, maps OpenCode SSE frames to `TelemetryEvent`s (`src/ingress/daemon-sse-mapper.ts`), and tracks per-session `sequenceCursor` values in `sessionCursors`.
2. **Server Coalesced SSE Broadcaster & Pairing Controller** (`src/server/sse-broadcaster.ts`, `src/server/machine-switch-reconciler.ts`, & `src/server/operator-registry.ts`): Coalesces high-frequency passive streaming `session.upserted` bursts in a `70ms` trailing window (`DEFAULT_SSE_STREAM_COALESCE_MS`) while broadcasting lifecycle, tool, **Quest Gate**, room, and deletion deltas immediately to connected browser SSE clients (`runtime.sseClients`).
3. **Browser Authoritative Snapshot Gate** (`src/web/snapshot-gate.ts`, `src/web/operator-pairing-controller.ts`, & `src/web/app-main.ts`): Preserves the live browser `EventSource("/api/guild/events")` across same-operator **OpenCode Machine Pairing** switches (`"guild-machine-changed"`) and gates incoming HTTP and SSE `GuildSnapshot` payloads via `applyAuthoritativeSnapshot(nextSnap, options)`.

When a **Guild Operator** switches paired OpenCode hosts while the previous host's SSE stream is halfway through a large event (for example, a `700,000`-character offline/streaming assistant output split across chunks) and the newly activated host starts at a **lower** `snapshot.version` (for example, Host A was at `version: 500` and Host B starts at `version: 2`), three connection-ownership vulnerabilities arise if connection ownership is not enforced independently of `snapshot.version` comparisons:

| # | Vulnerability | Exact Code Location | Failure Mode |
|---|---|---|---|
| **V1** | **Upstream SSE chunk reader finishes a mid-stream read after `abortAll()` / `stop()` and Adapter retains old connection cursors** | `src/ingress/daemon-http-client.ts:300–375`, `src/ingress/opencode-client-adapter.ts:20–26, 360–384`, `src/ingress/daemon-sse-mapper.ts:7–16` | 1. `subscribeEvents()` creates a local `controller = new AbortController()` separate from `clientAbortController`. When `client.abortAll()` is called on machine switch, `while (!streamCtrl.signal.aborted)` does not link `clientAbortController.signal`, and line `337` (`const { value, done } = await reader.read()`) does not re-check abort state after `await reader.read()` resolves. If the second half of a `700,000`-character SSE frame resolves as `stop()` runs, the reader still decodes the partial buffer, parses the JSON block, mutates `toolNameByCallId`, clears `cachedSessionsByPath`, and evicts `idleMessageHydrationCache` before reaching the adapter's `isStale(epoch)` check.<br>2. `OpenCodeClientAdapter.stop()` increments `runEpoch` and clears `sweepDigests`, but **never clears** `sessionCursors`, `sessionDirectoryBySessionId`, `knownRoomMeta`, or `canonicalByWorktreeMap`. |
| **V2** | **Coalesced SSE Broadcaster (`createSseBroadcaster`) lacks `daemonUrl` ownership scoping and reset on host switch** | `src/server/sse-broadcaster.ts:21–142`, `src/server/machine-switch-reconciler.ts:168–174, 220–342`, `src/server/operator-registry.ts:72, 106–117` | `createSseBroadcaster` holds `pendingTimer` (`70ms`), `pendingEmission`, and `lastSentCharMeta: Map<string, string>` without tracking which `daemonUrl` owns them. If Host A (`version: 500`) queues a coalesced `pendingEmission` in the 70ms trailing window and the operator switches to Host B (`version: 2`), `reducer.reset()` does not notify subscribers. Unless `sseBroadcaster` discards pending emissions and clears `lastSentCharMeta` when `daemonUrl` changes (or on switch start), a pending timer from Host A can fire after the switch or `isPassiveStreamingUpsert()` can compare Host B's session against Host A's stale `lastSentCharMeta`. |
| **V3** | **Client `applyAuthoritativeSnapshot` only checks `expectedMachineDaemonUrl` while `pendingOperatorAction` is in-flight, then falls back to `nextVer < curVer`** | `src/web/snapshot-gate.ts:17–34, 152–194`, `src/web/operator-pairing-controller.ts:133–231` | 1. `applyAuthoritativeSnapshot` only enforces `incomingUrl === expectedMachineDaemonUrl` while `pendingOperatorAction` is non-null (`lines 164–175`). Once `dispatchOperatorModalAction` finishes its `finally` block (`setPendingOperatorAction(null)`), Host B is rendered at a lower version (`curVer = 2`). If a trailing SSE frame or delayed HTTP response from Host A (`nextVer = 501`, `daemonUrl = Host A`) arrives afterwards, `nextVer (501) < curVer (2)` evaluates to `false`, so **Host A's higher version overwrites Host B**!<br>2. Conversely, if `expectedMachineDaemonUrl` was updated to Host B (`v2`) and Host B's first SSE emission arrives over the preserved `EventSource` before the `PATCH` HTTP response calls `allowVersionReset: true`, `curSnap` is still Host A (`curVer = 500`), so `nextVer (2) < curVer (500)` **rejects Host B's legitimate snapshot** unless host-ownership transition (`curUrl !== incomingUrl && incomingUrl === expectedMachineDaemonUrl`) supersedes the monotonic version check. |

---

## 2. Target Invariants & User Stories

1. **Upstream Reader & Cursor Discard Invariant**:
   - When an **OpenCode Machine Pairing** switch or adapter stop occurs while the upstream SSE stream (`GET /api/event`) is halfway through reading a multi-chunk `700,000`-character event, aborting/stopping the old connection immediately cancels the stream reader, discards the partial event buffer without parsing or mutating caches, and clears `sessionCursors`, `sessionDirectoryBySessionId`, `knownRoomMeta`, and `canonicalByWorktreeMap` on the old adapter.
2. **Coalesced Broadcaster Host-Ownership Invariant**:
   - `createSseBroadcaster` binds its `pendingEmission`, `pendingTimer`, and `lastSentCharMeta` to the normalized `daemonUrl` of the active host.
   - Whenever the broadcaster's `reset()` is invoked on machine switch or an emission arrives with a different normalized `snapshot.daemonUrl` (or `delta.kind === "adapter.switched"`), any pending coalesced timer/emission from the old host is immediately cancelled and `lastSentCharMeta` is cleared before evaluating or writing the new host's emission.
3. **Client Snapshot Gate Connection-Ownership vs. Version Invariant**:
   - `applyAuthoritativeSnapshot` checks **connection ownership (`daemonUrl`) before and separately from `snapshot.version` comparison**:
     - Once an operator is paired to or activates a host (`expectedMachineDaemonUrl`), any incoming snapshot with a non-empty `daemonUrl` that does not match `expectedMachineDaemonUrl` is **rejected (`return false`)**, even after `pendingOperatorAction` has cleared and even if `nextSnap.version > clientState.currentSnapshot.version`.
     - When an incoming snapshot's `daemonUrl` matches `expectedMachineDaemonUrl` and transitions ownership from a different `clientState.currentSnapshot.daemonUrl` (e.g., Host A at `version: 500` → Host B at `version: 2`), `applyAuthoritativeSnapshot` accepts the ownership transition, clears stale client tombstones from the old host, and renders Host B even when `nextSnap.version < clientState.currentSnapshot.version` and `allowVersionReset` was not explicitly passed.
     - Within the *same* host ownership (`incomingUrl === curUrl`), the strict monotonic version gate (`nextVer < curVer` rejected unless `allowVersionReset: true`) continues to protect against out-of-order HTTP responses.

---

## 3. Architectural Design (Deep Modules & Seams)

Per `@codebase-design` and the strict `<= 400`-line file ceiling (`tests/00-architecture-invariants.test.ts`):

### 3.1 Deepening Upstream SSE Stream Reader & Adapter Ownership (`src/ingress/daemon-http-client.ts`, `src/ingress/opencode-client-adapter.ts`)
- **In `src/ingress/daemon-http-client.ts` (`subscribeEvents`)**:
  - Include `clientAbortController.signal` in `combinedSignal` alongside `controller.signal` and `streamCtrl.signal` (and attach an abort listener on `clientAbortController.signal` to abort `controller` / `streamCtrl`).
  - Inside the chunk read loop (`while (!combinedSignal.aborted)`):
    - Immediately after `const { value, done } = await reader.read();`, check `if (combinedSignal.aborted) { buffer = ""; try { void reader.cancel(); } catch {} break; }`.
    - Before dispatching each parsed event in `for (const ev of mapOpenCodeSseFrameToTelemetryEvents(...))`, re-check `if (combinedSignal.aborted) break;`.
    - In the `finally` block of the reader loop, clear `buffer = ""` and cancel the reader if aborted so no partial multi-chunk payload survives across stream attempts or host switches.
- **In `src/ingress/opencode-client-adapter.ts`**:
  - Extract a `clearConnectionState()` helper called on `stop()` and at the start of `start()`:
    ```ts
    function clearConnectionState(): void {
      sweepDigests.clear();
      sessionCursors.clear();
      sessionDirectoryBySessionId.clear();
      knownRoomMeta.clear();
      canonicalByWorktreeMap.clear();
    }
    ```
  - This guarantees that stopping an adapter or starting a new epoch deterministically discards the old connection's `sessionCursors` and partial directory mappings.

### 3.2 Deepening Coalesced SSE Broadcaster Ownership (`src/server/sse-broadcaster.ts`, `src/server/operator-registry.ts`, `src/server/machine-switch-reconciler.ts`)
- **In `src/server/sse-broadcaster.ts`**:
  - Add `reset(): void` to `SseBroadcaster` interface (which calls `clearPending()`, `lastSentCharMeta.clear()`, and resets `activeDaemonUrl = null` and `lastBroadcastAtMs = 0`).
  - Track `let activeDaemonUrl: string | null = null;` (normalized via `normalizeDaemonEndpointUrl(emission.snapshot.daemonUrl)`).
  - At the top of `broadcast(emission)`:
    - Compute `const incomingDaemonUrl = normalizeDaemonEndpointUrl(emission.snapshot.daemonUrl);`
    - If `activeDaemonUrl !== null && incomingDaemonUrl !== activeDaemonUrl` (or `emission.delta.kind === "adapter.switched"`):
      - Call `clearPending()` and `lastSentCharMeta.clear()` so any queued 70ms coalesced frame from the previous host is discarded immediately and the new host's first frame is never classified as a passive streaming upsert against the old host's `lastSentCharMeta`.
    - Update `activeDaemonUrl = incomingDaemonUrl`.
  - Inside the trailing `setTimeout` callback and `flush()`:
    - Verify `normalizeDaemonEndpointUrl(next.snapshot.daemonUrl) === activeDaemonUrl` before calling `writeNow(next)`.
- **In `src/server/operator-registry.ts` & `src/server/machine-switch-reconciler.ts`**:
  - Wire `sseBroadcaster.reset()` into `onAdapterChanged` / `stopAdapters()` in `createRuntimePairingController` so the instant `pairDaemon` or `resetDisconnected` stops the old host's adapter, any pending 70ms coalesced timer from the old host is cancelled before the new host's sweep even starts.

### 3.3 Deepening Client Authoritative Snapshot Gate Ownership (`src/web/snapshot-gate.ts`, `src/web/operator-pairing-controller.ts`)
- **In `src/web/snapshot-gate.ts`**:
  - Keep `expectedMachineDaemonUrl: string | null` as the persistent client-side record of the active host's normalized `daemonUrl` (only cleared when explicitly logging out, deleting account, or resetting disconnected with `daemonUrl: null`, NOT cleared when `pendingOperatorAction` finishes!).
  - In `resetAuthoritativeSnapshotGate(options)`:
    - Preserve `expectedMachineDaemonUrl` when `options?.preservePendingAction` or `options?.preserveExpectedDaemonUrl` is true; only clear `expectedMachineDaemonUrl = null` on full reset (e.g. logout / test teardown).
  - In `applyAuthoritativeSnapshot(nextSnap, options)`:
    1. Compute:
       - `const incomingUrl = normalizeDaemonEndpointUrl(nextSnap.daemonUrl);`
       - `const curSnap = clientState.currentSnapshot;`
       - `const curUrl = normalizeDaemonEndpointUrl(curSnap?.daemonUrl);`
    2. **Explicit `allowVersionReset`**:
       - Clear `clientDeletedSessionIds` and `clientDeletedRoomIds`.
       - If `incomingUrl` is non-empty, guard against stale resets while a machine switch action is pending: if `isMachineSwitchAction && expectedMachineDaemonUrl && incomingUrl !== expectedMachineDaemonUrl`, return `false`. Otherwise update `expectedMachineDaemonUrl = incomingUrl` (or `null` if `nextSnap.daemonUrl === null`).
    3. **Connection Ownership Check (Independent of `pendingOperatorAction` and `version`)**:
       - If `isMachineSwitchAction` and (`!expectedMachineDaemonUrl || incomingUrl !== expectedMachineDaemonUrl`), return `false`.
       - If `expectedMachineDaemonUrl` is set and `incomingUrl !== expectedMachineDaemonUrl`:
         - Return `false` immediately! (This blocks late high-version SSE frames or late HTTP responses from Host A after Host B is active, even after `pendingOperatorAction` is `null`.)
       - If `!expectedMachineDaemonUrl && incomingUrl`:
         - Initialize `expectedMachineDaemonUrl = incomingUrl`.
    4. **Host Ownership Transition vs. Same-Host Version Check**:
       - Define `const isHostOwnershipTransition = Boolean(incomingUrl && curUrl && incomingUrl !== curUrl && incomingUrl === expectedMachineDaemonUrl);`
       - If `isHostOwnershipTransition`:
         - Clear `clientDeletedSessionIds.clear()` and `clientDeletedRoomIds.clear()` and **bypass** `nextVer < curVer` so a newly activated host starting at a lower `snapshot.version` renders immediately even if its first snapshot arrived over SSE before an `allowVersionReset` call.
       - Otherwise (same host ownership), enforce the existing monotonic version check (`if (!options.allowVersionReset && curVer > 0 && nextVer > 0 && nextVer < curVer) return false;`).

---

## 4. Two-Host 700,000-Character Mid-Stream Switch Regression Suite

We will add a comprehensive end-to-end two-host regression test in `tests/54-paired-machine-switch-leak-prevention.test.ts` (and unit tests in `tests/52-visualizer-runtime-performance.test.ts`) modeling the exact scenario described by the user:
1. **Host A (`https://host-a.example.opentunnel.xyz`)**:
   - Advances to a high snapshot version (`version >= 25`, `sequenceCursor = 100`).
   - Emits a burst of passive streaming `session.upserted` events (queuing a coalesced emission inside `createSseBroadcaster`) and begins streaming a **`700,000`-character** assistant message over `GET /api/event` chunked across multiple `ReadableStream` reads—pausing halfway (`350,000` chars sent, before the terminating `\n\n`).
2. **Switch to Host B (`https://host-b.example.opentunnel.xyz`) at a Lower Snapshot Version**:
   - While Host A's 700,000-character SSE frame is halfway read and Host A has a pending coalesced broadcast, the operator switches to Host B.
   - Host B starts at a **lower snapshot version** (`version: 2`, `sequenceCursor: 1`).
3. **Finish Old Host A Read & Late High-Version Host A Frame**:
   - Enqueue the remaining `350,000` characters + `\n\n` on Host A's stream and advance timers past `DEFAULT_SSE_STREAM_COALESCE_MS` (`70ms`).
   - Also feed a late Host A snapshot (`version: 30`, `daemonUrl: Host A`) into `applyAuthoritativeSnapshot` *after* `activate-machine` has completed (`pendingOperatorAction === null`) while the client is rendering Host B at `version: 2`.
4. **Verified Assertions**:
   - Host B renders cleanly at `version: 2` (`< 25`) across both server SSE emissions and client `applyAuthoritativeSnapshot`.
   - Host A's partial `700,000`-character event and remaining chunk are completely discarded (`0` telemetry events or reducer mutations from Host A's 700k payload).
   - Host A's `sessionCursors` (`100`) and pending coalesced emission are discarded.
   - Host A's late higher-version snapshot (`version: 30 > version: 2`) is rejected by `applyAuthoritativeSnapshot` due to connection ownership mismatch, keeping Host B (`version: 2`) rendered and intact.

---

## 5. Execution Plan (Tickets)

1. **[01: Upstream SSE Mid-Chunk Abort & Adapter Cursor Ownership Reset](./issues/01-upstream-sse-mid-chunk-abort-and-adapter-cursor-reset.md)** (`Status: open`, unblocked)
2. **[02: Coalesced SSE Broadcaster Host Ownership & Client Snapshot Gate Ownership Separation](./issues/02-coalesced-sse-broadcaster-and-client-snapshot-gate-ownership.md)** (`Status: open`, unblocked)
3. **[03: Two-Host 700k-Char Mid-Stream Switch Regression Suite, Docs & Live Docker Verification](./issues/03-two-host-700k-mid-stream-switch-regression-and-docker-proof.md)** (`Status: open`, blocked by `01, 02`)
