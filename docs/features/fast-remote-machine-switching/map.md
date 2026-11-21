# Feature Map: Fast Paired Remote OpenCode Machine Switching & Progressive Hydration

Label: wayfinder:map

## Destination

Deliver the complete specification in [Specification: Fast Paired Remote OpenCode Machine Switching & Progressive Hydration](./spec.md) so that switching between paired remote OpenCode machines (**OpenCode Machine Pairing**) completes in **~1–2 seconds cold** and **< 1 second warm** (down from 10–40+ seconds) with immediate `⏳ Switching...` UI feedback, non-blocking compound remote Git hydration, two-phase bounded session message hydration, abortable in-flight daemon requests, parallel discovery with timeout-bounded local probes, and inline switch snapshots—while preserving 100% of the cross-machine isolation and self-healing invariants from `docs/features/paired-machine-switch-leak-prevention/spec.md`:

1. **[01: Compound Single-Shell Remote Git, Non-Blocking Sweep Git Enrichment & Machine-Scoped Git Cache](./issues/01-compound-remote-git-and-nonblocking-sweep-enrichment.md)** (`Status: open`)
2. **[02: Two-Phase Bounded Session Hydration, Deduplicated Session Queries & Abortable Daemon Client](./issues/02-two-phase-bounded-session-hydration-and-abortable-daemon-client.md)** (`Status: open`)
3. **[03: Parallel Discovery, Timeout-Bounded Local Probe, Existence-Only Room Probing & Loopback-Only Docker Fallback](./issues/03-parallel-discovery-fast-tunnel-resolution-and-lan-fallback-fix.md)** (`Status: open`)
4. **[04: Inline Switch Snapshot, Preserved SSE Stream, Instant UI Feedback & Single-Query SQLite Load](./issues/04-inline-switch-snapshot-instant-ui-feedback-and-single-query-sqlite.md)** (`Status: open`, blocked by `01, 02, 03`)
5. **[05: High-RTT Machine-Switch Performance Regression Suite, Live Container Visual Proof & Documentation Sync](./issues/05-latency-regression-suite-container-verification-and-docs.md)** (`Status: open`, blocked by `01, 02, 03, 04`)

## Notes

- **Mode**: Complete root-cause investigation (`@diagnosing-bugs`) and full technical specification + 5-ticket execution plan authored (`spec.md`, `map.md`, `issues/01..05`), ready for implementation by the **Build** agent.
- **Parallelizable Frontier**: Tickets `01`, `02`, and `03` touch distinct module slices (`git-status-cache`/`remote-git-ops`/`daemon-session-ops`, `session-hydration-planner`/`daemon-location-state`/`daemon-http-client`, and `service-discovery`/`snapshot-reconciler`/`daemon-workspace-ops`/`opencode-pair-redeemer`) and can be implemented sequentially or in parallel before `04` and `05`.
- **Domain**: **OpenCode Machine Pairing**, **Authoritative Live State**, **Guild Chronicle Store**, **Workshop Room**, **Guild Character**, **Assembly Commit Ledger**, **Goal Assembly Site**.
- **Specification**: [Feature Specification](./spec.md).
- **Skills to consult**: `diagnosing-bugs`, `codebase-design`, `tdd`, `code-review`, `verification-before-completion`.
- **Standing Rules**: Work strictly inside the project root directory (`./`). Never create git worktrees or write files to `/tmp` or `/tmp/opencode`. Never delete `./data/` or modify live operator profiles. Every source file in `src/` must remain `<= 400` lines (`tests/00-architecture-invariants.test.ts`). Deploy and verify on the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`) with visual proof in `docs/images/`.

## Decisions so far

- [Specification: Fast Paired Remote OpenCode Machine Switching & Progressive Hydration](./spec.md): Audited the entire machine-switching critical path across `src/web/`, `src/server/`, and `src/ingress/`, identifying 9 verified bottlenecks (R1–R9) led by sequential multi-shell remote Git polling inside `ca.start()`, unbounded cold message hydration of 60–150+ sessions per directory, timeout-less sequential local service discovery probes on tunnel URLs, serial discovery/probing waterfalls, global cache wipes + un-aborted previous-machine HTTP requests, private-IP Docker host fallback doubling timeouts, redundant client snapshot/SSE round-trips, and N+1 SQLite message loading. Designed a 5-ticket vertical slice plan preserving all `paired-machine-switch-leak-prevention` invariants and the `<= 400`-line file ceiling.

## Not yet specified

<!-- All investigation findings have graduated into spec.md and tickets 01..05 -->

## Out of scope

- Replacing OpenCode V2's HTTP/SSE transport protocol or modifying the upstream `opencode` daemon binary itself (all optimizations operate strictly within `opencode-pixel-guild`).
- Maintaining live concurrent SSE subscriptions to inactive background paired machines (only the active paired machine maintains an open live SSE stream, preserving memory and tunnel bandwidth).
