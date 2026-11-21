# 01: Add Docker Host-Gateway Service Discovery Fallback (`host.docker.internal`)

Type: task
Label: wayfinder:task
Status: resolved

**What to build:** Enhance `discoverLocalOpenCodeService` in `src/ingress/service-discovery.ts` so that when the visualizer runs inside a Docker container, it supports `OPENCODE_SERVICE_FILE` and automatically expands any `127.0.0.1` or `localhost` URL discovered from `service.json` (or WSL fallback) with a `host.docker.internal:<port>` fallback candidate carrying the same Basic Auth credentials.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] `discoverLocalOpenCodeService` checks `process.env.OPENCODE_SERVICE_FILE` in addition to `~/.local/state/opencode/service.json`.
- [x] For any discovered candidate URL targeting `127.0.0.1` or `localhost`, `discoverLocalOpenCodeService` appends a fallback candidate rewriting the hostname to `process.env.OPENCODE_DOCKER_HOST || "host.docker.internal"` with the same port and password.
- [x] Automated unit tests verify that when `http://127.0.0.1:<port>/api/info` is unreachable inside a container, `discoverLocalOpenCodeService` automatically succeeds against `http://host.docker.internal:<port>/api/info` with the expected Basic Auth header.

## Answer

Updated `discoverLocalOpenCodeService` in `src/ingress/service-discovery.ts` to accept `DiscoverOpenCodeServiceOptions`, probe `OPENCODE_SERVICE_FILE` and `/opencode-state/service.json`, and expand any `127.0.0.1` or `localhost` candidate with a `host.docker.internal` fallback candidate via `appendCandidateWithDockerHostFallback`. Verified with automated unit test in `tests/00-architecture-invariants.test.ts`.
