# Feature Map: Fast Paired Remote OpenCode Machine Switching & Progressive Hydration

Label: wayfinder:map

## Destination

Deliver the complete specification in [Specification: Fast Paired Remote OpenCode Machine Switching & Progressive Hydration](./spec.md) so that switching between paired remote OpenCode machines (**OpenCode Machine Pairing**) completes in **~1–2 seconds cold** and **< 1 second warm** (down from 10–40+ seconds) with immediate `⏳ Switching...` UI feedback, non-blocking compound remote Git hydration, two-phase bounded session message hydration, abortable in-flight daemon requests, parallel discovery with timeout-bounded local probes, and inline switch snapshots—while preserving 100% of the cross-machine isolation and self-healing invariants from `docs/features/paired-machine-switch-leak-prevention/spec.md`:

1. **[01: Compound Single-Shell Remote Git, Non-Blocking Sweep Git Enrichment & Machine-Scoped Git Cache](./issues/01-compound-remote-git-and-nonblocking-sweep-enrichment.md)** (`Status: resolved`)
2. **[02: Two-Phase Bounded Session Hydration, Deduplicated Session Queries & Abortable Daemon Client](./issues/02-two-phase-bounded-session-hydration-and-abortable-daemon-client.md)** (`Status: resolved`)
3. **[03: Parallel Discovery, Timeout-Bounded Local Probe, Existence-Only Room Probing & Loopback-Only Docker Fallback](./issues/03-parallel-discovery-fast-tunnel-resolution-and-lan-fallback-fix.md)** (`Status: resolved`)
4. **[04: Inline Switch Snapshot, Preserved SSE Stream, Instant UI Feedback & Single-Query SQLite Load](./issues/04-inline-switch-snapshot-instant-ui-feedback-and-single-query-sqlite.md)** (`Status: resolved`, blocked by `01, 02, 03`)
5. **[05: High-RTT Machine-Switch Performance Regression Suite, Live Container Visual Proof & Documentation Sync](./issues/05-latency-regression-suite-container-verification-and-docs.md)** (`Status: resolved`, blocked by `01, 02, 03, 04`)

## Notes

- **Mode**: Complete root-cause investigation (`@diagnosing-bugs`) and full technical specification + 5-ticket execution plan authored (`spec.md`, `map.md`, `issues/01..05`), ready for implementation by the **Build** agent.
- **Parallelizable Frontier**: Tickets `01`, `02`, and `03` touch distinct module slices (`git-status-cache`/`remote-git-ops`/`daemon-session-ops`, `session-hydration-planner`/`daemon-location-state`/`daemon-http-client`, and `service-discovery`/`snapshot-reconciler`/`daemon-workspace-ops`/`opencode-pair-redeemer`) and can be implemented sequentially or in parallel before `04` and `05`.
- **Domain**: **OpenCode Machine Pairing**, **Authoritative Live State**, **Guild Chronicle Store**, **Workshop Room**, **Guild Character**, **Assembly Commit Ledger**, **Goal Assembly Site**.
- **Specification**: [Feature Specification](./spec.md).
- **Skills to consult**: `diagnosing-bugs`, `codebase-design`, `tdd`, `code-review`, `verification-before-completion`.
- **Standing Rules**: Work strictly inside the project root directory (`./`). Never create git worktrees or write files to `/tmp` or `/tmp/opencode`. Never delete `./data/` or modify live operator profiles. Every source file in `src/` must remain `<= 400` lines (`tests/00-architecture-invariants.test.ts`). Deploy and verify on the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`) with visual proof in `docs/images/`.

## Decisions so far

- [Specification: Fast Paired Remote OpenCode Machine Switching & Progressive Hydration](./spec.md): Audited the entire machine-switching critical path across `src/web/`, `src/server/`, and `src/ingress/`, identifying 9 verified bottlenecks (R1–R9) led by sequential multi-shell remote Git polling inside `ca.start()`, unbounded cold message hydration of 60–150+ sessions per directory, timeout-less sequential local service discovery probes on tunnel URLs, serial discovery/probing waterfalls, global cache wipes + un-aborted previous-machine HTTP requests, private-IP Docker host fallback doubling timeouts, redundant client snapshot/SSE round-trips, and N+1 SQLite message loading. Designed a 5-ticket vertical slice plan preserving all `paired-machine-switch-leak-prevention` invariants and the `<= 400`-line file ceiling.
- [01: Compound Single-Shell Remote Git, Non-Blocking Sweep Git Enrichment & Machine-Scoped Git Cache](./issues/01-compound-remote-git-and-nonblocking-sweep-enrichment.md): Extracted `src/ingress/git-status-cache.ts` (machine-scoped Git cache), combined POSIX remote `git status` + `log -1` + staged/unstaged `diff --numstat` into one compound `/api/shell` invocation (verified on real `sh -c`), added adaptive shell poll backoff + non-blocking `DELETE`, and decoupled remote Git scanning from `OpenCodeClientAdapter.start()` with epoch-guarded background enrichment.
- [02: Two-Phase Bounded Session Hydration, Deduplicated Session Queries & Abortable Daemon Client](./issues/02-two-phase-bounded-session-hydration-and-abortable-daemon-client.md): Extracted `src/ingress/session-hydration-planner.ts` with `"fast"`/`"full"` modes and a per-daemon concurrency semaphore (`maxConcurrent = 6`), deduplicated `/api/session` fallback queries (`>= 100` threshold preserving `tests/22` parity), raised `STATIC_CATALOG_TTL_MS` to 5 min, cached TUI tabs by `rootUrl` (15s TTL), bumped on-demand client message timeout to 6000ms, and wired `daemonClient.abortAll()` on `adapter.stop()`.
- [03: Parallel Discovery, Timeout-Bounded Local Probe, Existence-Only Room Probing & Loopback-Only Docker Fallback](./issues/03-parallel-discovery-fast-tunnel-resolution-and-lan-fallback-fix.md): Added parallel `800ms`-bounded `discoverLocalOpenCodeService()` returning `urls`, 60s positive & negative caching in `resolveEffectiveDaemonEndpoint()`, parallel `getProjects()` + `getLocations()` (coalescing `/api/project`, skipping `projectID=global`), parallel `{ checkGit: false }` room probing in `reconcilePersistedSnapshotWithDaemon()`, and restricted `buildDockerHostFallbackUrl()` strictly to loopback hosts.
- [04: Inline Switch Snapshot, Preserved SSE Stream, Instant UI Feedback & Single-Query SQLite Load](./issues/04-inline-switch-snapshot-instant-ui-feedback-and-single-query-sqlite.md): Attached inline `snapshot` to machine activation/pairing responses, triggered immediate `⏳ Switching...` feedback and early `expectedMachineDaemonUrl`, skipped redundant `GET /api/guild/snapshot`, preserved live `EventSource` via `"guild-machine-changed"`, and replaced N+1 SQLite message queries in `loadSnapshot` with a single grouped query.
- [05: High-RTT Machine-Switch Performance Regression Suite, Live Container Visual Proof & Documentation Sync](./issues/05-latency-regression-suite-container-verification-and-docs.md): Verified 415/415 tests including `tests/55-fast-remote-machine-switching.test.ts` and `tests/00-architecture-invariants.test.ts`, completed two-axis code review and fixed all critical findings (POSIX `&&` compound command + per-daemon semaphore + negative discovery cache), deployed on Docker (`opencode-pixel-guild-visualizer` on port `4310`), captured and inspected `docs/images/fast-remote-machine-switching.png`, and synced `README.md`, `GLOSSARY.md`, and `docs/graphify-out/`.

## Not yet specified

<!-- All investigation findings have graduated into spec.md and tickets 01..05 -->

## Out of scope

- Replacing OpenCode V2's HTTP/SSE transport protocol or modifying the upstream `opencode` daemon binary itself (all optimizations operate strictly within `opencode-pixel-guild`).
- Maintaining live concurrent SSE subscriptions to inactive background paired machines (only the active paired machine maintains an open live SSE stream, preserving memory and tunnel bandwidth).
