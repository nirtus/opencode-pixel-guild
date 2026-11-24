# 01: Upstream SSE Mid-Chunk Abort & Adapter Cursor Ownership Reset

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: None (can start immediately)

## What to build

Harden upstream OpenCode daemon SSE stream reading and adapter lifecycle state (**V1** in [spec.md](../spec.md)) so that switching paired hosts or stopping an adapter while a large multi-chunk SSE event (e.g. `700,000` characters) is halfway read immediately cancels the stream reader, discards the partial event buffer without side effects, and resets the old connection's cursors.

1. **Mid-Chunk Abort Guard in `subscribeEvents` (`src/ingress/daemon-http-client.ts`)**:
   - Link `clientAbortController.signal` into `subscribeEvents()`'s `combinedSignal` alongside `controller.signal` and `streamCtrl.signal`, and ensure `clientAbortController` aborting immediately aborts `controller` / `streamCtrl`.
   - Inside the reader loop (`while (!combinedSignal.aborted)`):
     - Immediately after `const { value, done } = await reader.read();`, check `if (combinedSignal.aborted) { buffer = ""; try { void reader.cancel(); } catch {} break; }` before decoding or splitting `buffer`.
     - Before invoking `onEvent(ev)` or mutating `cachedSessionsByPath` / `evictIdleMessageHydrationCache(ev.sessionId)` inside the parsed frame loop, re-check `if (combinedSignal.aborted) break;`.
     - In the `finally` block of the stream reader, clear `buffer = ""` and cancel the reader if aborted so partial multi-chunk JSON payloads are deterministically discarded.

2. **Deterministic Connection Cursor & Directory State Reset (`src/ingress/opencode-client-adapter.ts`)**:
   - Add a `clearConnectionState()` helper inside `createOpenCodeClientAdapter` that clears:
     - `sweepDigests.clear()`
     - `sessionCursors.clear()`
     - `sessionDirectoryBySessionId.clear()`
     - `knownRoomMeta.clear()`
     - `canonicalByWorktreeMap.clear()`
   - Call `clearConnectionState()` in both `stop()` and at the start of `start()` so an old connection's cursors and partial directory mappings never survive after `stop()`.

## Acceptance Criteria

- [x] When `subscribeEvents` is halfway through reading a multi-chunk (`700,000`-character) SSE `data:` frame (first chunk read into `buffer`, second chunk pending in `reader.read()`) and `adapter.stop()` or `daemonClient.abortAll()` is called before or as the second chunk resolves, the partial buffer and second chunk are discarded with `0` `onEvent` emissions and `0` cache/tool-map side effects.
- [x] Calling `adapter.stop()` clears `sessionCursors`, `sessionDirectoryBySessionId`, `knownRoomMeta`, and `canonicalByWorktreeMap`.
- [x] All files under `src/` remain `<= 400` lines (`tests/00-architecture-invariants.test.ts`).

## Answer

Implemented in `src/ingress/daemon-http-client.ts` and `src/ingress/opencode-client-adapter.ts`. Linked `clientAbortController.signal` into `subscribeEvents()`'s `combinedSignal`, added immediate post-`reader.read()` abort checks that cancel the stream reader and discard the partial `buffer` before JSON decoding or cache eviction, and added `clearConnectionState()` on `OpenCodeClientAdapter.start()` and `.stop()` to reset `sessionCursors`, `sessionDirectoryBySessionId`, `knownRoomMeta`, `canonicalByWorktreeMap`, and `sweepDigests`. Verified via `tests/54-paired-machine-switch-leak-prevention.test.ts` and `tests/00-architecture-invariants.test.ts`.
