# 05: High-RTT Machine-Switch Performance Regression Suite, Live Container Visual Proof & Documentation Sync

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01, 02, 03, 04

## What to build

Lock in the performance improvements with deterministic automated regression tests, verify end-to-end on the live `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`), capture visual proof, and synchronize all project documentation.

1. **High-RTT Remote Machine-Switch Regression Suite (`tests/55-fast-remote-machine-switching.test.ts`)**:
   - Using `withTestSandbox` (never touching `./data/`), construct realistic simulated remote OpenCode daemons (`150ms` simulated network latency per HTTP call, `5` projects × `25` historical sessions + `2` active sessions + slow remote Git repos):
     - **Cold Remote Switch Budget**: Assert `PATCH /api/guild/users/me/machines/:id` returns `200` with live rooms, characters, agents, and inline `snapshot` in `< 1500ms` (whereas sequential Git + 60-session hydration would exceed `10_000ms`), and that background `tasks.hydrated` arrives asynchronously after the switch without blocking `PATCH`.
     - **Warm Repeat Toggle (`Remote A → Remote B → Remote A`)**: Assert toggling back to Machine A reuses Machine A's scoped warm caches without cross-machine data leakage on identical directory paths.
     - **Abort-on-Switch**: Assert switching from slow Machine A to Machine B immediately aborts Machine A's in-flight `AbortSignal`s.
     - **Stale Local `service.json` Timeout Guard**: Assert switching to a remote `*.opentunnel.xyz` tunnel when a local candidate hangs completes within `< 1500ms` and caches local discovery across consecutive tunnel switches.
     - **Loopback-Only Docker Fallback**: Assert private LAN/VPN IPs (`192.168.x.x`, `10.x.x.x`, `172.x.x.x`) never fall back to `host.docker.internal`.
     - **Client Inline Snapshot & Preserved SSE**: Assert `dispatchOperatorModalAction("activate-machine", ...)` triggers immediate `⏳ Switching...` feedback, applies inline `payload.snapshot` with zero extra `GET /api/guild/snapshot` call, and dispatches `"guild-machine-changed"` rather than forcing an SSE reconnect.

2. **Full Test Suite, Docker Container Deployment & Visual Verification**:
   - Run `npm test` and confirm 100% pass including `tests/00-architecture-invariants.test.ts` (`<= 400` lines across all `src/**/*`), `tests/48-paired-machine-worlds-and-state.test.ts`, `tests/54-paired-machine-switch-leak-prevention.test.ts`, and `tests/55-fast-remote-machine-switching.test.ts`.
   - Deploy to the Docker container (`npm run docker:up` on port `4310`), verify `docker ps` and `http://127.0.0.1:4310/api/guild/snapshot` (`200 OK`), and capture visual proof at `docs/images/fast-remote-machine-switching.png` via headless Chrome.
   - Visually inspect `docs/images/fast-remote-machine-switching.png` via `read` to confirm top-bar machine switcher, room layout, wall banners, character placements, Goal Assembly Site, and Spectator Drawer render cleanly.

3. **Documentation & Knowledge Graph Sync**:
   - Update `GLOSSARY.md` (`OpenCode Machine Pairing` and `Authoritative Live State` definitions and `_Avoid_:` guardrails) to document progressive non-blocking remote Git enrichment, two-phase bounded session hydration, abortable client switches, machine-scoped caches, and loopback-only Docker fallback.
   - Update `README.md` if machine-switching behavior or performance architecture notes changed.
   - Resolve `docs/features/fast-remote-machine-switching/spec.md`, `map.md`, and tickets `01..05`, and run `GRAPHIFY_OUT="docs/graphify-out" WSLENV="${WSLENV:+$WSLENV:}GRAPHIFY_OUT/u" graphify update .` to refresh the knowledge graph.

## Acceptance Criteria

- [x] `tests/55-fast-remote-machine-switching.test.ts` passes deterministically and catches regressions across all 9 diagnosed bottlenecks (R1–R9).
- [x] Full `npm test` passes with zero failures and zero files under `src/` exceeding 400 lines.
- [x] Live Docker container (`opencode-pixel-guild-visualizer` on port `4310`) is deployed and verified with `docs/images/fast-remote-machine-switching.png` visually inspected.
- [x] `GLOSSARY.md`, `README.md`, `docs/features/fast-remote-machine-switching/map.md`, `spec.md`, and tickets `01..05` are updated and resolved, and `docs/graphify-out/` is refreshed.

## Answer

Added `tests/55-fast-remote-machine-switching.test.ts` covering all 9 bottlenecks (including real POSIX `sh -c` compound Git verification and end-to-end 150ms-RTT 5-project × 25-session remote switch budget), passed two-axis code review + full `npm test` (`415/415` tests), deployed on Docker container `opencode-pixel-guild-visualizer` (`Up (healthy)` on `4310:4310`, `GET /api/guild/snapshot` `200 OK` in `1.5ms`), captured & visually verified `docs/images/fast-remote-machine-switching.png`, updated `README.md`, `GLOSSARY.md`, and feature docs, and refreshed `docs/graphify-out/`.
