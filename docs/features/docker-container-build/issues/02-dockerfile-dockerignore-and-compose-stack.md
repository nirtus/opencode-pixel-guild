# 02: Create `Dockerfile`, `.dockerignore`, `docker-compose.yml` & NPM Scripts

Type: task
Label: wayfinder:task
Status: resolved
Blocked by: 01

**What to build:** Create the `node:22-alpine` `Dockerfile`, `.dockerignore`, `docker-compose.yml` (with `4310:4310` port mapping, `extra_hosts: ["host.docker.internal:host-gateway"]`, and read-only host state/feature mounts), and `docker:*` convenience scripts in `package.json`, building on [01: Add Docker Host-Gateway Service Discovery Fallback (`host.docker.internal`)](./01-docker-host-daemon-service-discovery-fallback.md).

**Blocked by:** [01: Add Docker Host-Gateway Service Discovery Fallback (`host.docker.internal`)](./01-docker-host-daemon-service-discovery-fallback.md)

**Status:** resolved

- [x] `.dockerignore` excludes `.git`, `node_modules`, and temporary test artifacts while keeping `src/`, `docs/examples/`, and `docs/features/`.
- [x] `Dockerfile` uses `node:22-alpine`, sets `HOST=0.0.0.0` and `PORT=4310`, exposes `4310`, defines a `HEALTHCHECK` against `http://127.0.0.1:4310/api/guild/snapshot`, and starts `node --experimental-strip-types src/server/main.ts`.
- [x] `docker-compose.yml` configures `extra_hosts: ["host.docker.internal:host-gateway"]`, maps port `4310:4310`, and mounts `~/.local/state/opencode` and `./docs/features` read-only.
- [x] `package.json` exposes `docker:build`, `docker:up`, `docker:down`, and `docker:logs` scripts.

## Answer

Created `.dockerignore`, `Dockerfile` (`node:22-alpine` with port `4310` `HEALTHCHECK` and `node --experimental-strip-types src/server/main.ts`), `docker-compose.yml` (`4310:4310`, `host.docker.internal:host-gateway`, read-only `/opencode-state` and `/app/docs/features` mounts), updated `resolveLocalProjectDir` in `src/state/location-normalization.ts` to resolve `/app` inside Docker, and added `docker:build`, `docker:up`, `docker:down`, and `docker:logs` to `package.json`.
