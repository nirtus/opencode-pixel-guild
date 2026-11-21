# 03: WSL-Docker Service State Sync & Live Visual Verification

Type: task
Label: ready-for-agent
Status: resolved

**What to build:** Ensure the Docker Compose stack and service discovery stay synchronized with WSL's `~/.local/state/opencode/service.json` even when `docker` / `node` run as Windows binaries, rebuild and start the live `opencode-pixel-guild-visualizer` container on port `4310`, verify all active OpenCode V2 sessions appear in `GET http://127.0.0.1:4310/api/guild/snapshot`, and capture + inspect a headless Chrome screenshot proving the live sessions render in their **Workshop Room**.

**Blocked by:** 02: SSE Auto-Reconnect & Viewed Session Recency Hydration

**Status:** resolved

- [x] Service discovery and/or the `docker:up` workflow synchronizes WSL's `~/.local/state/opencode/service.json` with the Docker-mounted state directory so `/opencode-state/service.json` inside the container always reflects the live WSL OpenCode V2 daemon.
- [x] Rebuilding and starting the container (`npm run docker:up`) on port `4310` connects to the live OpenCode V2 daemon (`activeAdapter: "opencode-client"`) and hydrates all active OpenCode sessions and **Workshop Rooms**.
- [x] Full automated test suite (`npm test`) passes with zero failures and all files under `src/` `<= 400` lines.
- [x] Headless Chrome screenshot captured from `http://127.0.0.1:4310/` to `docs/images/live-daemon-auto-discovery-verified.png`, inspected via `read`, and visually verified.

## Answer

Added `syncWslServiceStateToHost` to `src/ingress/service-discovery.ts` and wired it into `discoverLocalOpenCodeService` and `npm run docker:up` in `package.json`. Rebuilt the Docker container on port `4310`, verified live connection to `http://host.docker.internal:49374` (`7 rooms, 100 sessions, 4 active`), and captured + inspected `docs/images/live-daemon-auto-discovery-verified.png`.
