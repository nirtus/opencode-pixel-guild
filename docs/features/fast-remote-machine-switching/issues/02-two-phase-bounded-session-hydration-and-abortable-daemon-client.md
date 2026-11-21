# 02: Two-Phase Bounded Session Hydration, Deduplicated Session Queries & Abortable Daemon Client

Type: task
Label: ready-for-agent
Status: open
Blocked by: None (can start immediately)

## What to build

Eliminate the cold session-message hydration storm (**R2**) and un-aborted previous-machine HTTP socket pileups (**R6**) during paired remote OpenCode machine switches.

1. **Extract `SessionHydrationPlanner` (`src/ingress/session-hydration-planner.ts`) & Two-Phase Hydration (`src/ingress/daemon-location-state.ts`)**:
   - Extract session hydration selection and bounded concurrency execution out of `src/ingress/daemon-location-state.ts` (currently 394 lines) into `src/ingress/session-hydration-planner.ts`.
   - Support two hydration modes via an optional `options?: { hydrationMode?: "fast" | "full"; signal?: AbortSignal }` parameter on `getLocationState` / `fetchDaemonLocationState`:
     - **`"fast"` mode** (used by `OpenCodeClientAdapter.start()` on initial switch): Hydrate **only** sessions needed for immediate live fidelity — `activeIdSet`, `pendingGateSessionIds`, `openTuiRootIds`, `unviewedRootIds` (capped at 15), `recentChildIds` (active parents only, capped at 10), and at most the **top `6` most recent roots per directory** (down from `60 + 60 + 30`). Use `limit=24` for idle root sessions and `limit=60` for active / pending-gate sessions.
     - **`"full"` mode**: Preserves broader hydration for background follow-up or explicit refresh, while older idle historical sessions continue to hydrate on demand via the existing `GET /api/guild/session/:id/messages` seam when clicked in the Character Sheet.
   - Enforce a **bounded concurrency semaphore (`maxConcurrent = 6`)** across message hydrations so remote tunnels are never flooded by 50–250 simultaneous multi-MB `/message` requests.
   - Bump on-demand client message hydration timeout in `src/web/session-message-hydration-guard.ts:148` from `2500ms` to `6000ms` so clicking an unhydrated historical hero over a high-RTT tunnel succeeds reliably.

2. **Deduplicate Overlapping `/api/session` Queries & Fix Ephemeral Caches (`src/ingress/daemon-location-state.ts`, `src/ingress/daemon-mcp-normalizer.ts`)**:
   - In `fetchDaemonLocationState`, fetch `/api/session${sessionQuery}&limit=200` first; only issue the secondary `/api/session${sessionQuery}&parentID=null&limit=100` fallback request when the first query returned `>= 200` items (meaning child subagents may have crowded out root sessions).
   - Raise `STATIC_CATALOG_TTL_MS` from `60_000` (1 min) to `300_000` (5 min), keyed by `${rootUrl}::${normTargetDir}`.
   - Replace the `WeakMap<object, ...>` (`tuiOpenSessionsByFetcher`) in `src/ingress/daemon-mcp-normalizer.ts:199` with a `Map<string, ...>` keyed by `rootUrl` (falling back to the fetcher WeakMap only when `rootUrl` is empty) with a `15_000ms` TTL so switching machines does not discard the cached TUI tabs on every new `daemonClient` instance.

3. **Abortable `OpenCodeDaemonClientPort` (`src/ingress/daemon-types.ts`, `src/ingress/daemon-http-client.ts`, `src/ingress/opencode-client-adapter.ts`, `src/ingress/daemon-session-ops.ts`)**:
   - Add an optional `abortAll?(): void` method to `OpenCodeDaemonClientPort`.
   - Inside `createHttpOpenCodeDaemonClient`, create a client-scoped `AbortController` (`clientAbortController`), combine its `.signal` with per-request `AbortSignal.timeout(timeoutMs)` via `AbortSignal.any(...)` in `fetchFn` and `executeDaemonShellCommand`, and abort it when `abortAll()` is called.
   - In `OpenCodeClientAdapter.stop()` (`src/ingress/opencode-client-adapter.ts:373–377`), call `options.client.abortAll?.()` so switching from Machine A to Machine B immediately cancels every in-flight HTTP request and shell poll to Machine A instead of holding open sockets until their 10s–90s timeouts expire.

## Acceptance Criteria

- [ ] On a directory with 50 idle historical root sessions and 2 active sessions, `"fast"` mode issues `<= 8` `/api/session/:id/message` requests (down from 50+) with at most `6` concurrent requests in flight at any moment.
- [ ] When `/api/session?...&limit=200` returns fewer than 200 sessions, the redundant `&parentID=null&limit=100` request is skipped.
- [ ] Calling `adapter.stop()` while `getProjects()`, `getLocationState()`, or `executeDaemonShellCommand()` is awaiting a slow remote fetch immediately aborts the underlying `AbortSignal`.
- [ ] Clicking any older idle session in `Full Lineage` still hydrates its full transcript cleanly via `GET /api/guild/session/:id/messages`.
- [ ] All source files under `src/` remain `<= 400` lines (`tests/00-architecture-invariants.test.ts`).
