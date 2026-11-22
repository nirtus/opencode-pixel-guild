# 01: Compound Single-Shell Remote Git, Non-Blocking Sweep Git Enrichment & Machine-Scoped Git Cache

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: None (can start immediately)

## What to build

Eliminate the single largest remote machine-switching bottleneck (**R1** & **R6** in [spec.md](../spec.md)): sequential, multi-command remote `/api/shell` Git polling blocking `OpenCodeClientAdapter.start()` and global Git/task cache wipes on every switch.

1. **Extract Machine-Scoped Git & Task Cache Seam (`src/ingress/git-status-cache.ts`)**:
   - Extract `gitStatusCache`, `inFlightGitScans`, epoch counters, `getCachedGitStatus`, `peekCachedGitStatus`, `storeCachedGitStatus`, and `invalidateGitStatusCache` out of `src/ingress/git-status-scanner.ts` (currently 395 lines) into a dedicated `src/ingress/git-status-cache.ts` module so both files stay well below the 400-line ceiling.
   - Scope cache keys by `(machineScope, normDir)` where `machineScope = normalizeDaemonEndpointUrl(daemonUrl) || "local"` (preserving backwards-compatible default lookups using the active/registered scope for `projectDir`).
   - Update `src/ingress/remote-git-ops.ts` and `src/ingress/issue-tracker-scanner.ts` so `remoteRunnersByNormDir` and `taskProgressCache` are also keyed/scoped by `machineScope` (while still supporting `clearRemoteDirectoryRunners(daemonUrl)`).
   - In `src/server/machine-switch-reconciler.ts`, keep cross-machine isolation intact without wiping unrelated machines' warm caches when toggling `Remote A → Remote B → Remote A` (or only invalidate the previous scope on explicit demolition/refresh, never leaking across scopes when identical paths exist on two machines).

2. **Compound Single-Shell Remote Git Status (`src/ingress/remote-git-ops.ts` & `src/ingress/daemon-session-ops.ts`)**:
   - Refactor `computeRemoteGitStatusAsync` in `src/ingress/remote-git-ops.ts` to gather `git status --porcelain=v1 -b -u`, `git log -1 --format=%h%x09%s`, unstaged `git diff --numstat`, and staged `git diff --cached --numstat` inside **one single compound shell invocation** with clear section markers (`__PG_STATUS__`, `__PG_HEAD__`, `__PG_UNSTAGED__`, `__PG_STAGED__`) instead of 2–4 sequential `/api/shell` calls (cutting 16+ remote RTTs down to 1 shell lifecycle).
   - Keep a clean fallback parser if a remote Windows `cmd.exe` / PowerShell shell cannot execute POSIX `sh` syntax, and never run a second fallback `git status` command when stdout/stderr already says `not a git repository`.
   - Optimize `executeDaemonShellCommand` in `src/ingress/daemon-session-ops.ts`:
     - Replace the flat `150ms` initial sleep with adaptive backoff (`40ms → 80ms → 150ms`) so fast `git status` commands return immediately on the first poll.
     - Fire-and-forget `DELETE /api/shell/:id` (`.catch(() => {})` without `await`) once output has been read so shell teardown does not add an extra serial remote RTT.

3. **Decouple Remote Git Scanning from `OpenCodeClientAdapter.start()` (`src/ingress/opencode-client-adapter.ts`)**:
   - Extend `sweepAllLocations(isReconnect?: boolean, options?: { deferGitHydration?: boolean })` and default `ca.start()` to `{ deferGitHydration: true }` for remote endpoints (or all multi-room sweeps where cache is cold).
   - Inside `runSweepAllLocations()`:
     - Never `await scanGitStatusAsync(...)` sequentially in the `for (const { locMeta, state } of locEntries)` loop when `deferGitHydration` is enabled.
     - Immediately dispatch `location.discovered`, `catalog.hydrated`, cached `tasks.hydrated` (if warm for this machine scope), and `stream.reconnected` so rooms and characters appear without waiting for Git.
     - Kick off an epoch-guarded background Git enrichment pass (`if (isStale(epoch)) return;`) bounded to concurrency `3` that scans cold directories and dispatches `tasks.hydrated` deltas as each repo finishes (prioritizing directories with active sessions first).

## Acceptance Criteria

- [x] `computeRemoteGitStatusAsync` executes **at most 1** `runShellCommand()` call for a dirty POSIX Git repository (down from 3–4) and **1** call for a non-Git directory (down from 2).
- [x] `executeDaemonShellCommand` uses adaptive poll backoff starting at `<= 50ms` and does not block return on `DELETE /api/shell/:id`.
- [x] `OpenCodeClientAdapter.start()` completes and emits rooms/characters **without blocking** on slow remote `scanGitStatusAsync()` calls; background `tasks.hydrated` updates arrive asynchronously and abort cleanly if `adapter.stop()` is called mid-scan.
- [x] Switching `Machine A → Machine B → Machine A` where both machines contain identical directory paths (e.g. `/home/dev/app`) never leaks Machine A's Git status or remote runner into Machine B, while keeping Machine A's cache warm on return.
- [x] `tests/54-paired-machine-switch-leak-prevention.test.ts` and `tests/00-architecture-invariants.test.ts` (all `src/**/*` `<= 400` lines) pass.

## Answer

Implemented in `src/ingress/git-status-cache.ts`, `src/ingress/git-status-scanner.ts`, `src/ingress/remote-git-ops.ts`, `src/ingress/daemon-session-ops.ts`, `src/ingress/issue-tracker-scanner.ts`, `src/ingress/opencode-client-adapter.ts`, `src/ingress/adapter-sweep-helpers.ts`, and `src/server/machine-switch-reconciler.ts`. Verified via `tests/55-fast-remote-machine-switching.test.ts` (Slices 1A–1C, including real POSIX `sh -c` execution against a sandbox Git repo), `tests/48-paired-machine-worlds-and-state.test.ts`, and `tests/54-paired-machine-switch-leak-prevention.test.ts`.
