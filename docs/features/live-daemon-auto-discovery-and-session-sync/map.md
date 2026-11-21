# Feature Map: Live Daemon Auto-Discovery, Reconnection & Session Sync

Label: wayfinder:map

## Destination

Eliminate the one-shot startup discovery trap and daemon reconnection blindness so that OpenCode V2 sessions launched at any time—before or after the visualizer server or Docker container starts, after daemon restarts/port changes, or when viewing existing sessions in the TUI—automatically appear and stay synchronized in the **OpenCode Pixel Guild Visualizer** on port `4310`.

## Notes

- **Domain**: OpenCode V2 daemon service discovery (`service.json` / `host.docker.internal`), self-healing `demo-simulator` -> `opencode-client` adapter promotion, SSE stream auto-reconnection, and session recency (`time.viewed`) hydration.
- **Rules**: Strictly use the project root directory (`./`). Never create external worktrees or use `/tmp/opencode`. Keep every file under `src/` strictly `<= 400` lines (`tests/00-architecture-invariants.test.ts`). Verify the final live system on port `4310` with a headless Chrome screenshot saved to `docs/images/` and inspected via `read`.
- **Spec**: [./spec.md](./spec.md)

## Decisions so far

<!-- the index: one line per closed ticket, enough to judge relevance, then zoom the link for the detail the ticket holds -->

- [01: Self-Healing Daemon Discovery & Refresh Reconnection](./issues/01-self-healing-daemon-discovery-and-refresh-reconnection.md): Added `syncLiveDaemon()` and hot-swappable `clientAdapter`/`daemonClient` coordination to `createGuildCompanionServer` so booting before OpenCode starts or rotating daemon ports/passwords self-heals on background ticks and `POST /api/guild/refresh`.
- [02: SSE Auto-Reconnect & Viewed Session Recency Hydration](./issues/02-sse-auto-reconnect-and-viewed-session-recency-hydration.md): Added `/api/event` SSE auto-reconnect loop in `src/ingress/daemon-http-client.ts`, incorporated `s.time?.viewed` into session recency and `isOpenInOpenCode` hydration in `src/ingress/daemon-location-state.ts`, and woke `Archived` characters when `isOpenInOpenCode` becomes `true`.
- [03: WSL-Docker Service State Sync & Live Visual Verification](./issues/03-wsl-docker-service-state-sync-and-live-visual-verification.md): Added `syncWslServiceStateToHost` in `src/ingress/service-discovery.ts` and `package.json` `docker:up`, rebuilt container on port `4310`, and verified all live sessions visually in `docs/images/live-daemon-auto-discovery-verified.png`.

## Not yet specified

<!-- in-scope fog you can't ticket yet; graduates as the frontier advances -->

## Out of scope

- Spawning or supervising the host `opencode serve --service` process from inside the visualizer container.
