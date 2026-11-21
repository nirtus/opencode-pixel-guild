# Feature Map: Docker Container Build & Host OpenCode V2 Daemon Discovery

Label: wayfinder:map

## Destination

Deliver a self-contained Docker container build and Compose stack (`Dockerfile`, `.dockerignore`, `docker-compose.yml`, `package.json` scripts, and `host.docker.internal` service-discovery fallback in `src/ingress/service-discovery.ts`) based on `node:22-alpine` that runs the OpenCode Pixel Guild Visualizer on port `4310` with a built-in container `HEALTHCHECK`, automatically discovers the host's live OpenCode V2 daemon via mounted `service.json` (`127.0.0.1` -> `host.docker.internal` fallback) or environment overrides, and falls back cleanly to the `Demo Guild Simulator` when no host daemon is reachable.

## Notes

- **Domain**: Containerized Node 22 runtime (`--experimental-strip-types`), Docker bridge-to-host OpenCode V2 service discovery (`host.docker.internal`), and 2D Canvas spectator companion hosting.
- **Rules**: Strictly use the project root directory (`./`). Never create external worktrees or use `/tmp/opencode`. Always chart a Wayfinder map (`docs/features/<feature-slug>/map.md`) for every feature. Keep every source file under 400 lines. Verify live container rendering with a headless Chrome screenshot on port `4310` saved to `docs/images/<task-name>.png` and inspected via `read`.
- **Skills to consult**: `codebase-design`, `domain-modeling`, `opencode`, `tdd`.

## Decisions so far

<!-- the index: one line per closed ticket, enough to judge relevance, then zoom the link for the detail the ticket holds -->

- [01: Add Docker Host-Gateway Service Discovery Fallback (`host.docker.internal`)](./issues/01-docker-host-daemon-service-discovery-fallback.md): Added `OPENCODE_SERVICE_FILE` / `/opencode-state/service.json` discovery and automatic `127.0.0.1` / `localhost` -> `host.docker.internal` fallback expansion in `src/ingress/service-discovery.ts`.
- [02: Create `Dockerfile`, `.dockerignore`, `docker-compose.yml` & NPM Scripts](./issues/02-dockerfile-dockerignore-and-compose-stack.md): Added the `node:22-alpine` `Dockerfile` with `HEALTHCHECK`, `.dockerignore`, `docker-compose.yml` with `host.docker.internal:host-gateway` and read-only state/feature mounts, and `docker:*` scripts in `package.json`.
- [03: Verify Live Docker Container Build, Healthcheck & Visual Proof on Port 4310](./issues/03-container-build-verification-and-live-visual-proof.md): Built and started the `opencode-pixel-guild-visualizer` container stack on port `4310`, verified live host OpenCode V2 daemon connection and container healthcheck, and captured `docs/images/docker-container-live-verified.png`.

## Not yet specified

<!-- in-scope fog you can't ticket yet; graduates as the frontier advances -->

## Out of scope

- Multi-container external databases, Redis caches, or reverse-proxy sidecars (the visualizer is a zero-dependency Node 22 server).
- Running the OpenCode V2 daemon itself inside the visualizer container (the container connects to the host's OpenCode V2 daemon or runs the built-in `Demo Guild Simulator`).
