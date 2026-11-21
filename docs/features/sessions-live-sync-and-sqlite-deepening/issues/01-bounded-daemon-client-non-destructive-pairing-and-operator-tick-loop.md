# 01: Bounded Daemon Client, Non-Destructive Pairing, Operator Tick Loop & Docker Hygiene

Type: grilling
Label: wayfinder:grilling
Status: resolved
Blocked by: None

## Question

How should the OpenCode daemon HTTP/SSE client (`src/ingress/daemon-http-client.ts`, `src/ingress/opencode-client-adapter.ts`), `OperatorWorkspaceRegistry` (`src/server/operator-registry.ts`), and Docker runtime (`Dockerfile`, `docker-compose.yml`, `src/state/location-normalization.ts`) be deepened so that:
1. `Refresh Live` (`POST /api/guild/refresh`) never hangs on dead OpenTunnel sockets,
2. Pairing or restarting the container never wipes existing session representations or leaves operator runtimes unticked (`Summoning Squad` / `Reporting Scroll` stuck forever), and
3. The Docker container eliminates the `12,313+` `AbortSignal` listener memory leak, `ExperimentalWarning`, and `/workspaces/<repo>` path resolution failures?

## Answer

Confirmed in Grilling Round 1 (`Q5`) & Round 2 (`Q7`):
1. **Bounded Request Timeouts & Deduplicated Location Sweep**:
   - In `createHttpOpenCodeDaemonClient` (`src/ingress/daemon-http-client.ts`), attach a per-request timeout signal (`AbortSignal.timeout(timeoutMs ?? 4000)`) combined with any caller `init.signal` via `AbortSignal.any(...)`, and only attempt the `host.docker.internal` fallback when the target hostname is `localhost` or `127.0.0.1` (never doubling timeout duration on remote `https://*.opentunnel.xyz` or `*.lhr.life` URLs).
   - In `sweepAllLocations` (`src/ingress/opencode-client-adapter.ts`), reuse the projects list fetched in `getProjects()` rather than calling `fetchProjects()` a second time inside `getLocations()`, and cap concurrent location state fetches.
   - In `#btn-refresh-live` (`src/web/top-bar-reconciler.ts`), pass `signal: AbortSignal.timeout(8000)` to `fetch("/api/guild/refresh")` so the UI button always restores `"🔄 Refresh Live"` within 8 seconds.
2. **Per-Iteration SSE `AbortController` & Listener Cleanup**:
   - In `subscribeEvents` (`src/ingress/daemon-http-client.ts:199–261`), create a fresh per-iteration child `AbortController` linked to the outer `controller.signal` and always call `controller.signal.removeEventListener("abort", onAbort)` inside both the `setTimeout` callback and `finally` blocks so zero `abort` listeners leak across reconnect cycles.
3. **Non-Destructive Pairing & Per-Operator Background `timer.tick` + Poll Loop**:
   - In `src/server/operator-registry.ts`, `runtime.pairDaemon(targetUrl, password)` probes the daemon and merges discovered locations/sessions into the operator's reducer without calling `reducer.reset()` on re-pair/refresh, preserving existing rooms and sessions if the target tunnel is unreachable.
   - On server startup, `createOperatorWorkspaceRegistry` auto-hydrates persisted operator state and starts a managed interval that dispatches `{ type: "timer.tick", timestampMs: Date.now() }` every `1,000ms` to every operator runtime's reducer (expiring `Entering`, `summoningRitual`, `ReportingScroll`, and `DistillingContextMana` on schedule) and triggers a background sweep every `15,000ms`.
4. **Docker Volume & Path Hygiene**:
   - Add `--no-warnings=ExperimentalWarning` to `Dockerfile` and `package.json` scripts.
   - Mount `./data:/app/data:rw` in `docker-compose.yml` and update `resolveLocalProjectDir` (`src/state/location-normalization.ts`) to resolve `/workspaces/<project-folder-name>` for sibling repositories inside Docker.

## Acceptance Criteria

- [x] `createHttpOpenCodeDaemonClient` enforces a bounded per-request timeout (`4000ms` default) and cleans up all `AbortSignal` listeners in `subscribeEvents` across repeated SSE reconnects (`0` leaked listeners).
- [x] `pairDaemon` preserves existing rooms and characters when a target daemon/tunnel fails to respond, and `createOperatorWorkspaceRegistry` dispatches `timer.tick` (`1s`) and periodic sweeps (`15s`) to all active operator runtimes.
- [x] `resolveLocalProjectDir` resolves `/workspaces/<repo>` paths inside Docker, `docker-compose.yml` mounts `./data:/app/data:rw`, and `Dockerfile` suppresses `ExperimentalWarning`.
