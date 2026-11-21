# 03: Verify Live Docker Container Build, Healthcheck & Visual Proof on Port 4310

Type: task
Label: wayfinder:task
Status: resolved
Blocked by: 01, 02

**What to build:** Build and start the Docker container stack on port `4310` after [01: Add Docker Host-Gateway Service Discovery Fallback (`host.docker.internal`)](./01-docker-host-daemon-service-discovery-fallback.md) and [02: Create `Dockerfile`, `.dockerignore`, `docker-compose.yml` & NPM Scripts](./02-dockerfile-dockerignore-and-compose-stack.md), verify `GET http://127.0.0.1:4310/api/guild/snapshot` and the full automated test suite (`npm test`), and capture + visually inspect a headless Chrome screenshot (`docs/images/docker-container-live-verified.png`) from the running container.

**Blocked by:** [01: Add Docker Host-Gateway Service Discovery Fallback (`host.docker.internal`)](./01-docker-host-daemon-service-discovery-fallback.md), [02: Create `Dockerfile`, `.dockerignore`, `docker-compose.yml` & NPM Scripts](./02-dockerfile-dockerignore-and-compose-stack.md)

**Status:** resolved

- [x] `docker compose up --build -d` (or `docker build` + `docker run`) builds cleanly and serves `http://127.0.0.1:4310/` with a healthy snapshot response.
- [x] Automated tests in `tests/` verify the Docker configuration invariants and pass 100%.
- [x] A live headless Chrome screenshot (`docs/images/docker-container-live-verified.png`) is captured from the running container on port `4310` and visually inspected with `read`.

## Answer

Built and launched the `opencode-pixel-guild-visualizer` container stack via `docker compose up --build -d`, verified live connection to the host OpenCode V2 daemon on port `4310`, verified all automated tests pass (`npm test`), and captured + visually inspected `docs/images/docker-container-live-verified.png`.
