# Feature Specification: Live Daemon Auto-Discovery, Reconnection & Session Sync

Label: ready-for-agent

## Problem Statement

When a developer launches one or more OpenCode V2 sessions after the **OpenCode Pixel Guild Visualizer** (or its persistent Docker container on port `4310`) has already started, the launched **Guild Adventurers** and **Squad Subagents** never appear in the visualizer:

1. **One-Shot Startup Discovery Trap**: If the visualizer boots when no OpenCode V2 daemon is running yet (for example, when Docker starts the container on system boot with `restart: unless-stopped` a few minutes before the developer opens a terminal and runs `opencode`), startup service discovery fails once and falls back to the **Demo Guild Simulator** (`cohabited-guild-hall`). In this fallback branch, no background discovery loop is started, no client adapter is attached, and clicking **🔄 Refresh Live** (`POST /api/guild/refresh`) is a no-op—leaving the system permanently stranded on synthetic demo data until the server or container is manually restarted.
2. **Daemon Restart & SSE Drop Blindness**: Even when the visualizer initially connects to a live OpenCode V2 daemon, the discovered daemon URL and Basic Auth headers are captured once at process startup, and the `/api/event` Server-Sent Events (SSE) subscription exits permanently if the connection closes. If the OpenCode background service restarts with a new port or password in `service.json`, the visualizer never re-discovers the new endpoint or reconnects its live event stream.
3. **Viewed Session Recency Blindness**: When a developer launches `opencode` and opens or switches to an existing session in the TUI without immediately sending a new prompt, OpenCode updates `time.viewed` rather than `time.updated`. Because location hydration only inspects `time.updated` and `time.created`, recently opened sessions older than 10 minutes are misclassified as inactive (`isOpenInOpenCode: false`) and hidden from the active **Workshop Room** roster.
4. **WSL-to-Windows Docker Volume Mount Drift**: In hybrid WSL + Windows Docker Desktop environments where `node` and `docker` resolve Windows paths (`C:\Users\<user>\.local\state\opencode`), mounting `~/.local/state/opencode` into `/opencode-state` inside the container reads a stale Windows `service.json` rather than the live WSL `~/.local/state/opencode/service.json` written by the WSL OpenCode V2 daemon.

## Solution

Transform the visualizer's OpenCode V2 ingress from a one-shot boot check into a self-healing, hot-swappable connection lifecycle:

1. **Continuous Auto-Discovery & Live Promotion**: Run a unified connection manager that periodically probes service discovery while in **Demo Guild Simulator** fallback mode (or after daemon communication failures) and whenever the developer triggers **🔄 Refresh Live** (`POST /api/guild/refresh`). As soon as a live OpenCode V2 daemon becomes reachable, automatically reset and switch the world state reducer from `demo-simulator` to `opencode-client`, perform a full location sweep, and start live SSE streaming without requiring a server or container restart.
2. **Dynamic Daemon Re-Discovery & Resilient SSE Streaming**: Allow the active client adapter and command/session/room routers to swap to freshly discovered daemon credentials whenever the OpenCode V2 daemon restarts on a new port or password, and automatically reconnect the `/api/event` SSE stream with backoff when disconnected.
3. **Viewed Session Recency Hydration**: Incorporate `time.viewed` alongside `time.updated` and `time.created` when hydrating session activity timestamps and `isOpenInOpenCode` status so sessions opened or focused in the OpenCode TUI immediately appear as active **Guild Adventurers** in their **Workshop Room**.
4. **Cross-Environment `service.json` Synchronization**: Ensure the WSL and Windows `.local/state/opencode/service.json` state is synchronized and probed reliably so Docker containers always read current daemon credentials.

## User Stories

1. As a developer whose visualizer container starts automatically on machine boot before I open a terminal, I want the visualizer to automatically detect my OpenCode V2 daemon within seconds of launching `opencode`, so that my live **Project Worlds** and **Guild Adventurers** replace the **Demo Guild Simulator** without restarting Docker.
2. As a developer who just launched several `opencode` sessions, I want clicking the **🔄 Refresh Live** button in the top navigation bar to immediately probe for a running OpenCode V2 daemon (even if the visualizer booted in **Demo Guild Simulator** mode) and hydrate all live **Workshop Rooms** and characters, so that manual refresh always synchronizes with reality.
3. As a developer whose OpenCode V2 background service (`opencode serve --service`) restarts with a new ephemeral port or password in `service.json`, I want the visualizer to detect that the previous daemon endpoint is unreachable, re-run service discovery, and reconnect to the new daemon endpoint automatically, so that telemetry and **Command Scroll** dispatches keep working seamlessly.
4. As a developer monitoring live agent turns, I want the visualizer's `/api/event` SSE subscription to automatically reconnect if the stream drops or resets, so that real-time tool executions, **Quest Gates**, **Skill Grimoire** activations, and **Summoning Rituals** never silently freeze.
5. As a developer who launches `opencode` in a project directory and opens or views an existing session before sending a new prompt, I want the visualizer to factor `time.viewed` into session recency and `isOpenInOpenCode` detection, so that the session's **Guild Adventurer** immediately appears in the **Workshop Room** in `Active Squads` roster mode.
6. As a developer dispatching a **Command Scroll** prompt, resolving a **Quest Gate**, terminating a session, or triggering a **Demolition Bomb** after the visualizer has hot-switched from **Demo Guild Simulator** to a live OpenCode V2 daemon, I want all API command and teardown routes to use the newly connected daemon client, so that interactive controls work immediately after auto-discovery.
7. As a developer running OpenCode V2 inside WSL while Docker Desktop runs on Windows, I want the container startup workflow and service discovery to stay synchronized with WSL's `~/.local/state/opencode/service.json`, so that the container never reads stale daemon credentials from the Windows user profile.
8. As a developer running the visualizer when no OpenCode V2 daemon is active, I want the visualizer to remain playable in **Demo Guild Simulator** mode while quietly probing in the background without spamming error logs or resetting my demo preset on failed probes, so that offline demo exploration remains smooth.

## Implementation Decisions

1. **Hot-Swappable Daemon Connection Manager**:
   - Replace the static boot-only `try / catch` wiring in the companion server entrypoint with a stateful connection coordinator that holds references to the current `clientAdapter`, `daemonClient`, and discovered service (`url` and auth headers).
   - Provide dynamic getter/proxy delegation (`clientAdapter` and `daemonClient` delegates) to the HTTP API router so `POST /api/guild/refresh`, `POST /api/guild/command`, `DELETE /api/guild/session/:id`, and `DELETE /api/guild/room` always invoke the currently connected daemon instance, even if the server originally booted in `demo-simulator` mode and connected later.
   - When the server boots and no live daemon is reachable, initialize with the `cohabited-guild-hall` **Demo Guild Simulator** preset as before, but still start the periodic background poll timer and attach an `onRefresh` handler.
   - During each background poll tick or `POST /api/guild/refresh` request:
     - If no live `clientAdapter` is currently connected (or if the connected daemon's `/api/info` health check or location sweep fails), invoke `discoverLocalOpenCodeService()`.
     - When a live daemon is newly discovered (or rediscovered with a changed URL or password), stop any previous adapter, reset the `WorldStateReducer` to `opencode-client` mode (`activeReducer.reset({ adapter: "opencode-client", daemonUrl: svc.url })`), start the new `clientAdapter` and live SSE subscription, and broadcast the hydrated live snapshot to all connected browser SSE clients.
     - If the server is in `demo-simulator` mode and `discoverLocalOpenCodeService()` still finds no live daemon, leave the current `demo-simulator` state untouched so interactive demo sessions are not disrupted.
2. **Resilient SSE Event Subscription with Reconnect Loop**:
   - Update the daemon HTTP client's `subscribeEvents` loop so that if the `/api/event` stream ends or throws a network error while `!controller.signal.aborted`, it waits briefly (e.g., configurable retry delay defaulting to `1500ms`) and reconnects automatically until `unsubscribe()` is called.
3. **Include `time.viewed` in Session Activity & Open Status Hydration**:
   - Extend the raw daemon session time contract in location state hydration to read `time?: { created?: number; updated?: number; viewed?: number; archived?: number }`.
   - Compute `updatedAtMs` as the maximum of `s.time?.updated`, `s.time?.viewed`, and `s.time?.created` (when present) so that viewing or focusing a session in OpenCode marks it as recently active (`isRecentlyUpdated` within the 10-minute window) and sets `isOpenInOpenCode = true`.
4. **WSL & Windows `service.json` Synchronization**:
   - Expand `discoverLocalOpenCodeService` candidate paths to also probe `/mnt/c/Users/*/.local/state/opencode/service.json` and `/home/*/.local/state/opencode/service.json` when available, and when `wsl.exe` fallback reads WSL's `~/.local/state/opencode/service.json` on Windows, prefer the freshest reachable daemon candidate.
   - Update the Docker startup script (`docker:up`) so that when launched from WSL with Windows Docker Compose, `~/.local/state/opencode/service.json` is synced to the mounted state directory before starting the container.
5. **Strict 400-Line Module Ceiling**:
   - Keep every file under `src/` strictly `<= 400` lines by isolating any new daemon connection/re-discovery coordination logic in a dedicated module or within existing budget rather than bloating `src/server/api-router.ts` (378 lines), `src/ingress/daemon-http-client.ts` (378 lines), or `src/ingress/opencode-client-adapter.ts` (373 lines).

## Testing Decisions

1. **What Makes a Good Test**:
   - Tests must assert observable external behavior through public module seams (`createGuildCompanionServer`, `discoverLocalOpenCodeService`, `createHttpOpenCodeDaemonClient`, `createOpenCodeClientAdapter`, and HTTP endpoints `/api/guild/snapshot` and `/api/guild/refresh`) rather than internal timers or private variables.
2. **Primary Testing Seams**:
   - **Seam 1 — Server Auto-Discovery & Refresh Promotion (`createGuildCompanionServer` / `/api/guild/refresh`)**: Boot the companion server when service discovery initially fails (verifying `activeAdapter === "demo-simulator"`), then make the mock/stubbed OpenCode V2 daemon become reachable and trigger `POST /api/guild/refresh` (or a discovery tick); assert that `GET /api/guild/snapshot` transitions to `activeAdapter === "opencode-client"` and contains the live **Workshop Rooms** and **Guild Adventurers**, and that subsequent `POST /api/guild/command` requests route to the newly connected daemon client.
   - **Seam 2 — Daemon Endpoint Rotation & SSE Auto-Reconnect (`createHttpOpenCodeDaemonClient`)**: Simulate an SSE stream disconnect and verify `subscribeEvents` automatically reconnects and delivers subsequent telemetry events; simulate a daemon port/password change in `service.json` and verify re-discovery switches to the new daemon endpoint.
   - **Seam 3 — Viewed Session Recency Hydration (`fetchDaemonLocationState` / `createHttpOpenCodeDaemonClient`)**: Provide a session whose `time.created` and `time.updated` are >1 hour old but whose `time.viewed` is within the last 10 minutes; assert that `getLocationState` marks `isOpenInOpenCode: true` and updates `updatedAtMs` to `time.viewed`.
3. **Prior Art in Codebase**:
   - `tests/00-architecture-invariants.test.ts` (service discovery & 400-line ceiling guard tests).
   - `tests/05-spectator-hud-and-simulator.test.ts` and `tests/13-interactive-developer-prompts-and-quest-gates.test.ts` (HTTP companion server & reducer integration tests).

## Out of Scope

- Launching or managing the OpenCode V2 daemon process (`opencode serve --service`) from inside the visualizer container.
- Persisting historical visualizer snapshots to an external database.

## Further Notes

- Per repository rules, after implementing the tickets and rebuilding the live container on port `4310`, a headless Chrome screenshot must be captured to `docs/images/<task-name>.png` and visually inspected via `read` to confirm live OpenCode sessions render inside their **Workshop Room**.
