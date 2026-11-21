# Specification: Fast Paired Remote OpenCode Machine Switching & Progressive Hydration

Label: ready-for-agent
Status: open

## 1. Plain-Language Problem Summary

When a **Guild Operator** clicks a paired remote OpenCode machine in the top header (`#header-machine-strip`) or Profile Settings modal to switch between two remote machines (for example, two OpenTunnel `*.opentunnel.xyz` / `*.lhr.life` machines or remote LAN/VPN hosts), the visualizer stalls on `⏳ Switching...` for **10 to 40+ seconds** before showing the target machine's **Workshop Room**, projects, or **Guild Characters**.

**Why it feels frozen (in plain English):**
Right now, when you click "Switch to Machine B", the server refuses to reply until it finishes **every slow remote task one after another**:
1. It first checks your local computer for a local OpenCode daemon (and has **no timeout** if any local config entry is stale).
2. It asks Machine B for its project list, *waits*, asks for worktrees, *waits*, asks for locations, *waits*.
3. It then downloads the **last 100 chat messages** for **up to 60–150+ old sessions per project** all at once over the slow remote tunnel.
4. Worst of all, it then runs `git status`, `git log`, and `git diff` **one project after another (not in parallel)** via remote `/api/shell` polling — where **every single git command** takes 4+ remote round-trips and a forced `150ms` sleep. With 6–10 projects/worktrees, remote Git alone takes **12–30+ seconds** before the screen updates!
5. Then it checks persisted 0-session folders one-by-one (2 requests per folder).
6. Finally, when you switch back to Machine A (`A → B → A`), the server throws away almost all of Machine A's caches and repeats the entire cold process from scratch — while Machine A's abandoned in-flight HTTP requests aren't even cancelled!

---

## 2. Complete Root-Cause Investigation Matrix

Every bottleneck below was verified directly against the current source files:

| # | Bottleneck | Exact Code Location | Measured / Structural Cost |
|---|---|---|---|
| **R1** | **Sequential remote Git shell polling blocking switch** | `src/ingress/opencode-client-adapter.ts:147–188` → `src/ingress/git-status-scanner.ts:214–252` → `src/ingress/remote-git-ops.ts:104–202` → `src/ingress/daemon-session-ops.ts:265–330` | `for ... await scanGitStatusAsync(...)` runs **one directory at a time** (concurrency `1`) inside `ca.start()`. Each remote directory executes **2–4 separate `/api/shell` commands** (`git status -u`, redundant retry on non-git dirs, `git log -1`, `git diff --numstat`, `git diff --cached --numstat`). Every shell command does `POST /api/shell` + mandatory `150ms` sleep + `GET /api/shell/:id` poll + `GET /api/shell/:id/output` + awaited `DELETE /api/shell/:id` (**4+ RTTs + ≥150ms each**). At `200ms` tunnel RTT × 8 dirs = **16–25+ seconds** blocking `PATCH`. |
| **R2** | **Unbounded cold session-message hydration storm** | `src/ingress/daemon-location-state.ts:92–105, 252–296` → `src/ingress/daemon-message-hydration.ts:81–101` | For **every** discovered directory, `fetchDaemonLocationState` builds `hydrateSessionIds` with up to `60` top roots + `60` unviewed roots + `30` child sessions + open TUI + active + pending gates, then fires `Promise.all` of `GET /api/session/:id/message?limit=100&order=desc` with **no concurrency cap**. Multi-MB responses saturate the tunnel; **any single slow session stalls the entire switch up to `10_000ms`** (`daemon-http-client.ts:23`). Redundant because on-demand `GET /api/guild/session/:id/messages` already exists (`src/server/api-router.ts:218–254`, `src/web/session-message-hydration-guard.ts:116–168`). Also fires **two overlapping session list queries** (`limit=200` AND `parentID=null&limit=100`) per directory unconditionally. |
| **R3** | **Local service discovery probe with no timeout on every tunnel switch** | `src/server/machine-switch-reconciler.ts:28–65` → `src/ingress/service-discovery.ts:167–254` | Every switch to `*.opentunnel.xyz` / `*.lhr.life` calls `discoverLocalOpenCodeService()`, which scans user profile directories synchronously and loops **sequentially** calling `fetch(${url}/api/info)` **with NO `AbortSignal.timeout`** (`service-discovery.ts:233`). Any dead/firewalled local `service.json` candidate hangs for Node's connect timeout (10–30s). When local OpenCode is up, it fetches `/api/info` a **second time** (`machine-switch-reconciler.ts:45`) with no caching. |
| **R4** | **Serial discovery waterfall (`getProjects` → `getLocations` → `getLocationState`)** | `src/ingress/opencode-client-adapter.ts:94–112`, `src/ingress/daemon-http-client.ts:107–198` | `await getProjects()` (`/api/project`, then `Promise.all(/api/worktree?projectID=...)` including `"global"`) finishes completely before `await getLocations()` (`/api/location`, `/api/debug/location`, `/api/session?limit=100`) even begins — adding 1–2 unnecessary serial remote RTTs. |
| **R5** | **Sequential double-RTT directory probes during snapshot reconciliation** | `src/server/snapshot-reconciler.ts:90–104, 155–166` → `src/ingress/daemon-workspace-ops.ts:75–105` | Persisted 0-session rooms and tribute dirs are probed **sequentially** in `for ... await probeDirOnce(rawDir)` loops. Each `probeDaemonDirectory()` makes **2 sequential HTTP requests** (`/api/fs/list?path=dir` + `/api/fs/list?path=dir/.git`), even though `snapshot-reconciler.ts` only checks `probe.exists` and ignores `isGitRepo`. |
| **R6** | **Global cache wipes & un-aborted previous-machine requests on toggle (`A → B → A`)** | `src/server/machine-switch-reconciler.ts:99–105, 160–161`, `src/ingress/opencode-client-adapter.ts:373–377`, `src/ingress/daemon-mcp-normalizer.ts:198–202`, `src/server/operator-registry.ts:191` | Switching machines globally clears `gitStatusCache` and `taskProgressCache`, destroys `daemonClient` (`cachedProjects`, `cachedLocations`, `tuiOpenSessionsByFetcher` WeakMap), and stops the old adapter **without aborting in-flight HTTP `fetch` calls**. Meanwhile the 15s background `sweepTimer` (`operator-registry.ts:191`) queues overlapping sweeps (`queuedSweepPromise`) when a remote sweep exceeds 15s, keeping the remote tunnel continuously saturated. |
| **R7** | **Private-IP Docker host fallback doubles remote LAN/VPN timeouts** | `src/ingress/opencode-pair-redeemer.ts:12–39, 58–67` | `buildDockerHostFallbackUrl()` rewrites private LAN/VPN IPs (`10.*`, `172.*`, `192.168.*`) to `host.docker.internal` on **any** fetch timeout/error — turning a 10s timeout into **20s** and risking routing a remote LAN machine's request to a local host daemon on port `4096`. |
| **R8** | **Triple snapshot transfer, extra HTTP round-trip, unnecessary SSE reconnect & delayed spinner** | `src/web/operator-pairing-controller.ts:90–99, 128–194`, `src/web/app-main.ts:317–328`, `src/web/snapshot-gate.ts:169–174`, `src/server/operator-routes.ts:145–168` | `PATCH /api/guild/users/me/machines/:id` returns only the profile (not `snapshot`), forcing a follow-up `GET /api/guild/snapshot`, then `guild-operator-changed` closes and re-opens `EventSource("/api/guild/events")` (re-sending the full snapshot a 3rd time) even though `operatorId` is unchanged and `runtime.sseClients` is the same `Set`. Clicking the machine button also sets `pendingOperatorAction` without calling `onStateChanged()`, delaying `⏳ Switching...` feedback, and sets `expectedMachineDaemonUrl = null` even when the target URL is already known in `cachedProfile.pairedMachines`. |
| **R9** | **N+1 SQLite message queries on `loadSnapshot`** | `src/server/chronicle-sqlite-store.ts:321–335` | `loadSnapshot(targetKey)` runs one `SELECT ... FROM session_messages` per character in a loop instead of a single query per `machineScopeKey`. |

---

## 3. Target Performance Budgets

For a remote OpenCode machine with `150–250ms` tunnel RTT, `5–8` projects, and `20–60` historical sessions per project:

| Metric | Current Behavior | Target Budget |
|---|---|---|
| Tactile button feedback (`⏳ Switching...`) | Delayed until next SSE tick (`0–1000ms`) | **Immediate (`< 16ms`, same frame)** |
| **Cold switch** (`PATCH` returns live rooms, characters, agents, active tools & Quest Gates) | **12–40+ seconds** | **`< 1.5–2.5 seconds`** (3–4 parallel RTT waves max, zero blocking Git, bounded fast session hydration) |
| **Warm repeat switch** (`Remote A → Remote B → Remote A` within cache TTL) | **12–30+ seconds** (all caches wiped) | **`< 0.5–1.0 second`** (machine-scoped warm caches + incremental live refresh) |
| Background remote Git & Assembly Parts update after switch | Blocked the entire switch | Streams smoothly over existing SSE within **1–3 seconds** via compound single-shell Git command |
| Unreachable/stale local `service.json` penalty on tunnel switch | Up to **10–30s** hang | **`<= 800ms`** hard cap (parallel probe + 60s cache) |

---

## 4. Architectural Design (Deep Modules & Seams)

Per `codebase-design` and the `<= 400`-line file ceiling (`tests/00-architecture-invariants.test.ts`), hide switching complexity behind five clean, deep seams while preserving every isolation invariant from `docs/features/paired-machine-switch-leak-prevention/spec.md`:

### 4.1 Machine-Scoped Git & Task Cache + Compound Remote Git (`src/ingress/git-status-cache.ts`, `src/ingress/remote-git-ops.ts`, `src/ingress/daemon-session-ops.ts`)
- **Seam**: Extract cache storage and epoch tracking from `src/ingress/git-status-scanner.ts` (currently 395 lines) into `src/ingress/git-status-cache.ts`, keying entries by `(machineScope, normDir)` where `machineScope = normalizeDaemonEndpointUrl(daemonUrl) || "local"`.
- **No Global Wipe**: Switching machines no longer wipes Machine A's cached Git/task entries — `getCachedGitStatus(projectDir, ttlMs, machineScope)` and `getRemoteDirectoryRunner(projectDir, machineScope)` isolate machines strictly by scope key so identical directory paths on Machine A and Machine B never collide while repeat toggles stay warm.
- **Single-Shell Compound Remote Git Status**: Replace the 2–4 sequential `/api/shell` invocations in `computeRemoteGitStatusAsync` with **one compound shell command** using unique section delimiters (`__PG_STATUS__`, `__PG_HEAD__`, `__PG_UNSTAGED__`, `__PG_STAGED__`) that runs `git status --porcelain=v1 -b -u` (falling back inline if needed), `git log -1`, and conditional `git diff --numstat` / `git diff --cached --numstat` in a single remote shell lifecycle.
- **Fast Shell Poll & Non-Blocking Cleanup**: In `executeDaemonShellCommand` (`src/ingress/daemon-session-ops.ts`), use adaptive poll backoff (`40ms → 80ms → 150ms`) instead of a flat `150ms` initial sleep, and fire-and-forget `DELETE /api/shell/:id` (`.catch(() => {})` without `await`) after output is read.
- **Non-Blocking Background Git Enrichment in `OpenCodeClientAdapter`**:
  - Add an option `sweepAllLocations(isReconnect?: boolean, options?: { deferGitHydration?: boolean; hydrationMode?: "fast" | "full" })`.
  - During `ca.start()` (initial switch), **do not `await scanGitStatusAsync(...)`** in the `for` loop. Emit `location.discovered`, `catalog.hydrated`, and `stream.reconnected` immediately (using cached `taskProgress` if warm for this machine scope), then schedule background Git + task enrichment (`Promise.all` bounded to concurrency `3`, strictly guarded by `if (isStale(epoch)) return;`) that dispatches `tasks.hydrated` deltas over the live SSE stream as each repo completes.

### 4.2 Two-Phase Bounded Session Hydration & Abortable Daemon Client (`src/ingress/session-hydration-planner.ts`, `src/ingress/daemon-location-state.ts`, `src/ingress/daemon-http-client.ts`)
- **Seam**: Extract session hydration selection & bounded concurrency runner into `src/ingress/session-hydration-planner.ts` (keeping `src/ingress/daemon-location-state.ts` well below 400 lines).
- **Two Hydration Modes**:
  - `"fast"` (used on initial machine switch / `ca.start()`): Hydrate **only** sessions needed for immediate `Active Squads` fidelity — active sessions, pending-gate sessions, open TUI tabs, unviewed roots, active child subagents, and at most the **top `6` most recent roots per directory** (fetching `limit=24` for idle sessions and `limit=60` for active/gate sessions), throttled through a **per-daemon concurrency semaphore (`maxConcurrent = 6`)**.
  - `"full"` / On-Demand: Older idle historical sessions remain visible in `Full Lineage` via their metadata from `/api/session` and hydrate immediately on click via the existing `GET /api/guild/session/:id/messages` endpoint (bump client timeout in `src/web/session-message-hydration-guard.ts:148` from `2500ms` to `6000ms` for remote tunnels), plus an optional low-priority background pass after the switch settles.
- **Deduplicate `/api/session` Calls**: In `fetchDaemonLocationState`, fetch `/api/session${sessionQuery}&limit=200` first; only issue the secondary `&parentID=null&limit=100` fallback call if the first response returned `>= 200` entries (meaning child sessions may have crowded out root sessions).
- **Abortable `OpenCodeDaemonClientPort`**:
  - Add an internal `AbortController` per `createHttpOpenCodeDaemonClient` instance plus an optional `abortAll?(): void` method on `OpenCodeDaemonClientPort`.
  - Combine the client-level signal with per-request `AbortSignal.timeout(timeoutMs)` via `AbortSignal.any(...)` in `fetchFn` and `executeDaemonShellCommand`.
  - When `OpenCodeClientAdapter.stop()` runs during a machine switch, invoke `options.client.abortAll?.()` so every in-flight remote HTTP fetch and shell poll to the old machine cancels immediately instead of clogging the connection pool.
- **Machine-Scoped Static & TUI Caches**:
  - Increase `STATIC_CATALOG_TTL_MS` from `60_000` (1 min) to `300_000` (5 min), keyed by `${rootUrl}::${normTargetDir}`.
  - Key `fetchOpenTuiSessionIds` cache by `rootUrl` (with `15_000ms` TTL) rather than an ephemeral `WeakMap` keyed on the per-client `fetchJson` closure.

### 4.3 Parallel Discovery, Timeout-Bounded Local Probe & Loopback-Only Docker Fallback (`src/ingress/service-discovery.ts`, `src/server/machine-switch-reconciler.ts`, `src/server/snapshot-reconciler.ts`, `src/ingress/daemon-workspace-ops.ts`, `src/ingress/opencode-pair-redeemer.ts`)
- **Bounded Parallel Local Service Discovery**:
  - In `discoverLocalOpenCodeService()` (`src/ingress/service-discovery.ts`), probe all candidate URLs **in parallel** with `signal: AbortSignal.timeout(800)` (never unbounded sequential fetches), and return any discovered `urls` array from `/api/info` on `DiscoveredOpenCodeService` so `resolveEffectiveDaemonEndpoint()` does **not** fetch `/api/info` a second time.
  - Cache the local discovery result (`{ url, headers, urls, expiresAtMs }`) in `machine-switch-reconciler.ts` for `60_000ms` so switching between remote tunnels skips redundant local probes.
- **Parallel Remote Discovery**:
  - In `runSweepAllLocations()` (`src/ingress/opencode-client-adapter.ts`), fetch `getProjects()` and `getLocations()` concurrently via `Promise.all([options.client.getProjects(), options.client.getLocations()])` (coalescing the internal `fetchProjects()` promise inside `daemon-http-client.ts` so `/api/project` is only requested once).
  - Skip `/api/worktree?projectID=global` in `daemon-http-client.ts:142` since `"global"` is not a Git project.
- **Parallel Existence-Only Directory Probing**:
  - Extend `probeDaemonDirectory(fetchJson, dir, options?: { checkGit?: boolean })` (`src/ingress/daemon-workspace-ops.ts`) so `checkGit: false` skips the second `/api/fs/list?path=.../.git` call.
  - In `reconcilePersistedSnapshotWithDaemon()` (`src/server/snapshot-reconciler.ts`), run `probeDirOnce` calls concurrently via `Promise.all` (with `checkGit: false`) instead of sequential `for ... await`.
- **Loopback-Only Docker Host Fallback**:
  - In `buildDockerHostFallbackUrl()` (`src/ingress/opencode-pair-redeemer.ts`), only rewrite loopback hosts (`127.0.0.1`, `localhost`, `0.0.0.0`) to `host.docker.internal` — **remove** the `172.*`, `192.168.*`, and `10.*` private-IP rewrite so remote LAN/VPN timeouts fail cleanly once instead of waiting 2× timeout or leaking to the local host daemon.

### 4.4 Inline Switch Snapshot, Preserved SSE Pipe, Instant UI Feedback & Single-Query SQLite (`src/server/operator-routes.ts`, `src/server/operator-registry.ts`, `src/server/chronicle-sqlite-store.ts`, `src/web/operator-pairing-controller.ts`, `src/web/app-main.ts`)
- **Return `snapshot` Inline from Machine Activation**:
  - Include `snapshot: runtime.reducer.getSnapshot()` in the JSON response of `PATCH /api/guild/users/me/machines/:machineId` and `POST /api/guild/users/me/machines` (backwards-compatible additive field alongside existing operator profile fields).
  - In `src/web/operator-pairing-controller.ts`, when `payload.snapshot` is present, apply it directly via `applyAuthoritativeSnapshot(payload.snapshot, { allowVersionReset: true })` and skip the extra `GET /api/guild/snapshot` round-trip.
- **Keep Existing SSE Connection Alive Across Same-Operator Machine Switches**:
  - Distinguish `"guild-machine-changed"` (same `operatorId`, only active machine changed) from `"guild-operator-changed"` (login/logout/register/account change).
  - When `operatorId` has not changed and `activeEventSource` is already `OPEN`, `app-main.ts` re-fits the camera and reconciles HUD/top-bar **without** tearing down and re-opening `EventSource("/api/guild/events")`, eliminating the 3rd full snapshot transfer and ensuring Phase B background `tasks.hydrated` / transcript deltas arrive seamlessly.
- **Instant Button Feedback & Early Expected URL**:
  - In `dispatchOperatorModalAction` (`src/web/operator-pairing-controller.ts`), when `action === "activate-machine"`, look up the target machine's `daemonUrl` in `cachedProfile?.pairedMachines`, call `setExpectedMachineDaemonUrl(targetUrl)` immediately, and invoke `onStateChanged()` right after `setPendingOperatorAction(...)` so `⏳ Switching...` renders on frame 1.
- **Single-Query SQLite `loadSnapshot`**:
  - In `src/server/chronicle-sqlite-store.ts:321–335`, fetch all `session_messages` rows for `operatorId` (`machineScopeKey`) in **one** prepared `SELECT` query grouped by `session_id` in memory instead of N separate per-character queries.

---

## 5. Non-Negotiable Safety & Isolation Invariants

Every optimization MUST preserve these existing invariants (verified by `tests/54-paired-machine-switch-leak-prevention.test.ts` and `tests/00-architecture-invariants.test.ts`):

1. **Zero Cross-Machine Snapshot / Tribute Poisoning**: `pairingInFlight` still suspends `scheduleSnapshotSave()`, debounced `saveTimer` still flushes strictly under the previous machine's `machineScopeKey`, and `reducer` resets before sweeping a different machine.
2. **Epoch-Guarded Background Enrichment**: Background Git hydration (`tasks.hydrated`) and background session message hydration MUST check `isStale(epoch)` after every `await` and discard late responses if the user switched away again (`A → B → C`).
3. **Zero Cross-Machine Git / Runner Leakage**: Machine-scoped caches (`git-status-cache.ts`, `remote-git-ops.ts`, `issue-tracker-scanner.ts`) MUST include `normalizeDaemonEndpointUrl(daemonUrl)` in their cache keys so identical directory paths on two different machines never share entries.
4. **Authoritative Room Reconciliation & Self-Healing SQLite**: Persisted rooms and tribute rows are still reconciled against the target daemon's live discovery and verified directories, and `onRefresh` never hijacks a remote `0`-room pairing to local `discoverService()`.
5. **Strict 400-Line Source Ceiling**: Every file under `src/` must remain `<= 400` lines (`tests/00-architecture-invariants.test.ts`).

---

## 6. Execution Plan (Ticket Sequence)

1. **[01: Compound Single-Shell Remote Git, Non-Blocking Sweep Git Enrichment & Machine-Scoped Git Cache](./issues/01-compound-remote-git-and-nonblocking-sweep-enrichment.md)** (`Status: open`, unblocked)
2. **[02: Two-Phase Bounded Session Hydration, Deduplicated Session Queries & Abortable Daemon Client](./issues/02-two-phase-bounded-session-hydration-and-abortable-daemon-client.md)** (`Status: open`, unblocked)
3. **[03: Parallel Discovery, Timeout-Bounded Local Probe, Existence-Only Room Probing & Loopback-Only Docker Fallback](./issues/03-parallel-discovery-fast-tunnel-resolution-and-lan-fallback-fix.md)** (`Status: open`, unblocked)
4. **[04: Inline Switch Snapshot, Preserved SSE Stream, Instant UI Feedback & Single-Query SQLite Load](./issues/04-inline-switch-snapshot-instant-ui-feedback-and-single-query-sqlite.md)** (`Status: open`, blocked by `01, 02, 03`)
5. **[05: High-RTT Machine-Switch Performance Regression Suite, Live Container Visual Proof & Documentation Sync](./issues/05-latency-regression-suite-container-verification-and-docs.md)** (`Status: open`, blocked by `01, 02, 03, 04`)

---

## 7. Testing & Verification Decisions

- **Public Seams Under Test**:
  - `createOperatorWorkspaceRegistry` + `createGuildCompanionServer` (`PATCH /api/guild/users/me/machines/:id`) with simulated `150ms` remote RTT multi-project/multi-session mock daemon clients (`tests/55-fast-remote-machine-switching.test.ts`).
  - `createHttpOpenCodeDaemonClient` + `computeRemoteGitStatusAsync` (compound shell output parsing, abort signal propagation on `.abortAll()` / `adapter.stop()`, and loopback-only Docker fallback).
  - `discoverLocalOpenCodeService` (parallel timeout-bounded probes when a candidate hangs).
  - `dispatchOperatorModalAction` + `applyAuthoritativeSnapshot` (inline snapshot consumption without extra `GET /api/guild/snapshot`, immediate `⏳ Switching...` state, and preserved SSE stream).
- **Existing Regression Suites That Must Stay Green**:
  - `tests/00-architecture-invariants.test.ts` (all `src/**/*` files `<= 400` lines)
  - `tests/19-instant-operator-auth-and-header-machine-switcher.test.ts`
  - `tests/47-session-sweep-world-reset-prevention.test.ts`
  - `tests/48-paired-machine-worlds-and-state.test.ts`
  - `tests/54-paired-machine-switch-leak-prevention.test.ts`
  - Full `npm test` suite.
- **Live Container Deployment & Visual Proof**:
  - Deploy via `npm run docker:up` on port `4310`, verify `http://127.0.0.1:4310/api/guild/snapshot`, run the Phase 1 timing check, capture `docs/images/fast-remote-machine-switching.png` via headless Chrome, inspect visually, and update `README.md` and `GLOSSARY.md`.
