# 03: Telemetry Ingress & Client Micro-Modules Decomposition (<250 Lines per File)

**What to build:**
Decompose `src/ingress/adapters.ts` (1,937 lines) into focused micro-modules bounded strictly under 250 lines each behind `src/ingress/index.ts`, maintaining full OpenCode daemon HTTP/SSE connectivity and test fixtures.

**Blocked by:** 01: Core Domain Models, RPG Roles & Preparation Station Vocabulary.

**Status:** resolved

- [x] Extract `src/ingress/daemon-http-port.ts` (<220 lines): core HTTP requests and JSON serialization.
- [x] Extract `src/ingress/daemon-session-ops.ts` (<200 lines): session deletion, room teardown, and log streaming.
- [x] Extract `src/ingress/demo-simulator-adapter.ts` (<180 lines): synthetic scenario adapter.
- [x] Extract `src/ingress/ingress-hub.ts` (<150 lines): unified telemetry stream hub.
- [x] Expose stable facade at `src/ingress/index.ts` preserving existing ingress seams.
- [x] All telemetry tests in `tests/01-capability-and-world-reducer.test.ts` pass green.

## Comments
Resolved via micro-module decomposition under `src/ingress/` (`service-discovery.ts`, `daemon-types.ts`, `daemon-http-client.ts`, `daemon-session-ops.ts`, `daemon-message-hydration.ts`, `daemon-location-state.ts`, `opencode-client-adapter.ts`, `plugin-adapter.ts`, `demo-simulator-adapter.ts`, `ingress-hub.ts`, `index.ts`). All 69 automated tests pass green.
