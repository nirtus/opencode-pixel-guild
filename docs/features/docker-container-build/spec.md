# Feature Specification: Docker Container Build & Host OpenCode V2 Daemon Discovery

Label: ready-for-agent

## Problem Statement

Running the **OpenCode Pixel Guild Visualizer** directly as a background host `node` process requires manual process management and can leave orphan listeners on port `4310`. Furthermore, when running the companion inside a Docker container, OpenCode V2's `~/.local/state/opencode/service.json` on the host advertises a loopback URL (`http://127.0.0.1:<dynamic-port>`), which inside a container resolves to the container's own loopback interface rather than the host machine's OpenCode V2 daemon.

## Solution

Package the visualizer as a lean, zero-dependency `node:22-alpine` Docker container (`Dockerfile`, `.dockerignore`, and `docker-compose.yml`) with a built-in HTTP `HEALTHCHECK` on port `4310`, and enhance `discoverLocalOpenCodeService()` in `src/ingress/service-discovery.ts` so that any `127.0.0.1` or `localhost` URL discovered from a mounted `service.json` (or `OPENCODE_SERVICE_FILE`) automatically probes a `host.docker.internal:<port>` fallback candidate with the same Basic Auth credentials before falling back to the **Demo Guild Simulator**.

## User Stories

1. As a developer, I want to build and launch the visualizer with a single `docker compose up --build -d` (or `npm run docker:up`) command on port `4310`, so that the companion runs in an isolated, reproducible container with automatic restart and health monitoring.
2. As a developer running OpenCode V2 on my host machine, I want the containerized visualizer to read the mounted `~/.local/state/opencode/service.json` file and automatically rewrite `127.0.0.1` / `localhost` to `host.docker.internal` when probing `/api/info`, so that the container connects to my live host OpenCode V2 daemon without manually looking up dynamic ports or passwords.
3. As a developer, I want to be able to override the daemon connection via `OPENCODE_SERVICE_URL`, `OPENCODE_SERVICE_PASSWORD`, or `OPENCODE_SERVICE_FILE` environment variables in Docker, so that custom host or remote daemon endpoints are supported.
4. As a developer running the container when no OpenCode V2 daemon is active on the host, I want the containerized server to gracefully fall back to the built-in **Demo Guild Simulator**, so that the visualizer is always playable on `http://127.0.0.1:4310/`.
5. As a developer, I want the Docker image to include `src/`, `docs/examples/`, and `docs/features/` while excluding `.git`, `node_modules`, and scratch artifacts via `.dockerignore`, so that browser ES modules, CraftPix PNG sprites, and **Goal Assembly Site** issue tracking work identically inside the container.

## Implementation Decisions

1. **Docker Host Gateway Fallback in Service Discovery (`src/ingress/service-discovery.ts`)**:
   - Support an optional `OPENCODE_SERVICE_FILE` environment variable (defaulting to `~/.local/state/opencode/service.json`) so Docker Compose can mount the host's state directory to a predictable path inside the container.
   - Whenever a candidate URL uses `127.0.0.1` or `localhost`, automatically append a companion candidate with the hostname rewritten to `process.env.OPENCODE_DOCKER_HOST || "host.docker.internal"` (preserving the dynamic port and Basic Auth password) so bridge-networked containers reach the host daemon seamlessly.
2. **Single-Stage `node:22-alpine` `Dockerfile` & `.dockerignore`**:
   - Base image: `node:22-alpine`.
   - Working directory: `/app`.
   - Copy `package.json`, `tsconfig.json`, `GLOSSARY.md`, `src/`, and `docs/` into `/app`.
   - Default environment: `NODE_ENV=production`, `HOST=0.0.0.0`, `PORT=4310`.
   - `EXPOSE 4310`.
   - `HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 CMD wget -qO- http://127.0.0.1:4310/api/guild/snapshot >/dev/null || exit 1`.
   - `CMD ["node", "--experimental-strip-types", "src/server/main.ts"]`.
3. **`docker-compose.yml` & `package.json` Convenience Scripts**:
   - Service `pixel-guild-visualizer` mapping `4310:4310` with `extra_hosts: ["host.docker.internal:host-gateway"]`.
   - Read-only volume mounts for `~/.local/state/opencode:/opencode-state:ro` (paired with `OPENCODE_SERVICE_FILE=/opencode-state/service.json`) and `./docs/features:/app/docs/features:ro` so live feature ticket updates on the host immediately reflect on the container's **Goal Assembly Site**.
   - Add `docker:build`, `docker:up`, `docker:down`, and `docker:logs` scripts to `package.json`.

## Testing Decisions

1. **Service Discovery Seam (`src/ingress/service-discovery.ts`)**:
   - Unit test `discoverLocalOpenCodeService` with a `service.json` containing `http://127.0.0.1:<port>` where `127.0.0.1` connection fails (simulating container loopback) and `http://host.docker.internal:<port>/api/info` succeeds, verifying that the resolved service URL and Basic Auth header match the `host.docker.internal` endpoint.
2. **Container Build & Runtime Seam (`Dockerfile` & `docker-compose.yml`)**:
   - Build the Docker image (`docker build` / `docker compose up -d --build`), verify container health and `GET http://127.0.0.1:4310/api/guild/snapshot`, and capture + inspect a headless Chrome screenshot from `http://127.0.0.1:4310/`.

## Out of Scope

- Running the OpenCode V2 daemon inside the visualizer container.
- External databases or multi-container orchestrations.
