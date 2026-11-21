# 01: Self-Healing Daemon Discovery & Refresh Reconnection

Type: task
Label: ready-for-agent
Status: resolved

**What to build:** Replace the one-shot startup daemon discovery in the companion server with a self-healing connection coordinator so that if the visualizer boots while no OpenCode V2 daemon is running (falling back to the **Demo Guild Simulator**) or if the OpenCode V2 daemon later restarts on a new port or password, both the periodic background poll and manual `POST /api/guild/refresh` (**🔄 Refresh Live**) automatically discover the live daemon, promote the reducer from `demo-simulator` to `opencode-client`, hydrate all live **Workshop Rooms** and **Guild Adventurers**, and route subsequent **Command Scroll** and room/session teardown API calls through the active daemon client.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] When the server starts while no OpenCode V2 daemon is reachable, it initializes in `demo-simulator` mode (`cohabited-guild-hall`) AND keeps a background discovery/poll loop and `onRefresh` hook active.
- [x] Triggering `POST /api/guild/refresh` (or a periodic poll tick) while in `demo-simulator` fallback mode probes `discoverLocalOpenCodeService()`; when a live daemon is reachable, the reducer resets to `opencode-client`, runs a full location sweep, starts live SSE streaming, and broadcasts the live snapshot without restarting the server.
- [x] If the currently connected OpenCode V2 daemon becomes unreachable or restarts with a new URL/password in `service.json`, the next sweep or `POST /api/guild/refresh` re-discovers the updated daemon credentials and reconnects `clientAdapter` and `daemonClient`.
- [x] Dynamic `clientAdapter` and `daemonClient` delegation ensures `POST /api/guild/command`, `DELETE /api/guild/session/:id`, and `DELETE /api/guild/room` work against a hot-discovered daemon even when the server initially booted in `demo-simulator` mode.
- [x] All files under `src/` remain strictly `<= 400` lines (`tests/00-architecture-invariants.test.ts`).
- [x] Automated integration tests verify boot-in-demo -> live daemon appears -> `POST /api/guild/refresh` promotes to `opencode-client` and hydrates live sessions.

## Answer

Added `syncLiveDaemon()` and `discoverService` / `createDaemonClient` options to `createGuildCompanionServer` in `src/server/main.ts` and wired `POST /api/guild/refresh` and the unconditional 15s background poll loop to `syncLiveDaemon()`. Verified with integration test in `tests/14-live-daemon-auto-discovery-and-session-sync.test.ts`.
