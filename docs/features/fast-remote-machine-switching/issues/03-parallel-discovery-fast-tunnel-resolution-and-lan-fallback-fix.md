# 03: Parallel Discovery, Timeout-Bounded Local Probe, Existence-Only Room Probing & Loopback-Only Docker Fallback

Type: task
Label: ready-for-agent
Status: open
Blocked by: None (can start immediately)

## What to build

Eliminate the serial discovery waterfalls (**R3**, **R4**, **R5**) and the private-IP Docker host fallback double-timeout bug (**R7**) documented in [spec.md](../spec.md).

1. **Timeout-Bounded Parallel Local Service Discovery & Cached Tunnel Resolution (`src/ingress/service-discovery.ts`, `src/server/machine-switch-reconciler.ts`)**:
   - In `discoverLocalOpenCodeService()` (`src/ingress/service-discovery.ts:224–249`):
     - Probe all local candidates **in parallel** (`Promise.allSettled`) instead of sequentially, preserving priority order when selecting the first reachable candidate.
     - Attach `signal: AbortSignal.timeout(800)` to every `/api/info` fetch so a dead or firewalled `service.json` candidate can never hang for 10–30s.
     - Parse and return `urls?: string[]` from the `/api/info` JSON payload on `DiscoveredOpenCodeService` so callers do not need to fetch `/api/info` a second time.
   - In `resolveEffectiveDaemonEndpoint()` (`src/server/machine-switch-reconciler.ts:28–65`):
     - Cache the local discovery result (`{ url, headers, urls, expiresAtMs }`) for `60_000ms` so switching between remote tunnels skips redundant filesystem scans and local `/api/info` round-trips.
     - Reuse `svc.urls` directly when present instead of issuing a second `fetch(${svc.url}/api/info)` call.

2. **Parallel Remote Discovery & Skip Global Worktree Query (`src/ingress/opencode-client-adapter.ts`, `src/ingress/daemon-http-client.ts`)**:
   - In `createHttpOpenCodeDaemonClient` (`src/ingress/daemon-http-client.ts`), coalesce concurrent `fetchProjects()` calls via an `inFlightProjectsPromise` so parallel callers share one `/api/project` request.
   - Skip `/api/worktree?projectID=global` in `fetchProjects()` (`daemon-http-client.ts:142`) since `"global"` is not a Git repository project.
   - In `runSweepAllLocations()` (`src/ingress/opencode-client-adapter.ts:94–112`), run `options.client.getProjects()` and `options.client.getLocations()` **in parallel** via `Promise.all(...)` instead of serially awaiting `getProjects()` before `getLocations()`.

3. **Parallel Existence-Only Directory Probing in Snapshot Reconciliation (`src/ingress/daemon-workspace-ops.ts`, `src/ingress/daemon-http-client.ts`, `src/ingress/daemon-types.ts`, `src/server/snapshot-reconciler.ts`)**:
   - Extend `probeDaemonDirectory(fetchJson, directory, options?: { checkGit?: boolean })` and `OpenCodeDaemonClientPort.probeDirectory?(directory: string, options?: { checkGit?: boolean })` so passing `{ checkGit: false }` returns after the single `/api/fs/list?path=...` existence check without making a second `/api/fs/list?path=.../.git` RTT.
   - In `reconcilePersistedSnapshotWithDaemon()` (`src/server/snapshot-reconciler.ts:90–104, 155–166`), collect candidate persisted 0-session rooms and unverified tribute directories first, then probe them **concurrently via `Promise.all`** with `{ checkGit: false }` instead of sequential `for ... await probeDirOnce(rawDir)` loops.

4. **Restrict Docker Host Fallback Strictly to Loopback Addresses (`src/ingress/opencode-pair-redeemer.ts`)**:
   - In `buildDockerHostFallbackUrl()` (`src/ingress/opencode-pair-redeemer.ts:12–39`), only rewrite loopback hostnames (`127.0.0.1`, `localhost`, `0.0.0.0`) to `host.docker.internal`.
   - Remove the `h.startsWith("172.") || h.startsWith("192.168.") || h.startsWith("10.")` condition so a timed-out request to a remote LAN/VPN OpenCode machine fails cleanly after 1 timeout instead of waiting a second 10s timeout or accidentally querying the visualizer host's local daemon on port `4096`.

## Acceptance Criteria

- [ ] `discoverLocalOpenCodeService()` completes in `<= 1000ms` even when an unreachable candidate URL hangs indefinitely, and returns `urls` from `/api/info`.
- [ ] Switching between two `*.opentunnel.xyz` machines twice within 60 seconds invokes `discoverService()` at most once.
- [ ] `runSweepAllLocations()` starts `getProjects()` and `getLocations()` concurrently (without waiting for `getProjects()` to resolve first) and skips `/api/worktree?projectID=global`.
- [ ] `reconcilePersistedSnapshotWithDaemon()` probes multiple persisted 0-session rooms in parallel (`Promise.all`) using `{ checkGit: false }` (1 HTTP call per dir instead of 2 sequential calls).
- [ ] `buildDockerHostFallbackUrl("http://192.168.1.50:4096/api/project")` and `buildDockerHostFallbackUrl("http://10.0.0.5:4096/api/project")` return `null`, while `buildDockerHostFallbackUrl("http://127.0.0.1:4096/api/project")` still returns `http://host.docker.internal:4096/api/project`.
- [ ] All source files under `src/` remain `<= 400` lines (`tests/00-architecture-invariants.test.ts`).
