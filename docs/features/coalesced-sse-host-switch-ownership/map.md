# Feature Map: Coalesced SSE Connection Ownership & Mid-Stream Paired Host Switch Hardening

Label: wayfinder:map

## Destination

Deliver the complete specification in [Specification: Coalesced SSE Connection Ownership & Mid-Stream Paired Host Switch Hardening](./spec.md) so that switching between **OpenCode Machine Pairings** while the previous host's SSE stream is halfway through a large (`700,000`-character) event and the new host starts at a lower `snapshot.version` deterministically discards the old connection's partial event, cursors, and pending coalesced broadcasts, renders the new host immediately at its lower version, and enforces connection ownership (`daemonUrl`) independently of `snapshot.version` comparison:

1. **[01: Upstream SSE Mid-Chunk Abort & Adapter Cursor Ownership Reset](./issues/01-upstream-sse-mid-chunk-abort-and-adapter-cursor-reset.md)** (`Status: resolved`)
2. **[02: Coalesced SSE Broadcaster Host Ownership & Client Snapshot Gate Ownership Separation](./issues/02-coalesced-sse-broadcaster-and-client-snapshot-gate-ownership.md)** (`Status: resolved`)
3. **[03: Two-Host 700k-Char Mid-Stream Switch Regression Suite, Docs & Live Docker Verification](./issues/03-two-host-700k-mid-stream-switch-regression-and-docker-proof.md)** (`Status: resolved`, blocked by `01, 02`)

## Notes

- **Origin**: Community feedback from an Open Agent API maintainer proposing a two-host regression test for coalesced SSE: switching paired hosts while the old stream is halfway through a large (`700,000`-character) event, letting the new host start at a lower `snapshot.version`, and then finishing the old read to verify connection ownership separately from version comparison.
- **Mode**: Feature plan, architecture investigation, specification (`spec.md`), wayfinder map (`map.md`), and implementation tickets (`issues/01..03`) prepared first with zero code changes, ready for review or implementation.
- **Parallelizable Frontier**: Tickets `01` (`src/ingress/daemon-http-client.ts`, `src/ingress/opencode-client-adapter.ts`) and `02` (`src/server/sse-broadcaster.ts`, `src/server/machine-switch-reconciler.ts`, `src/server/operator-registry.ts`, `src/web/snapshot-gate.ts`, `src/web/operator-pairing-controller.ts`) touch orthogonal slices and can be worked in parallel before Ticket `03`.
- **Domain**: **Authoritative Live State**, **OpenCode Machine Pairing**, **Guild Character**, **Workshop Room**, **Guild Chronicle Store**.
- **Specification**: [Feature Specification](./spec.md).
- **Skills to consult**: `research`, `codebase-design`, `tdd`, `code-review`, `verification-before-completion`.
- **Standing Rules**: Work strictly inside the project root directory (`./`). Never create git worktrees or write files to `/tmp` or `/tmp/opencode`. Never delete `./data/` or modify live operator profiles. Every source file in `src/` must remain `<= 400` lines (`tests/00-architecture-invariants.test.ts`). Deploy and verify on the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`) with visual proof in `docs/images/`.

## Decisions so far

- [Specification: Coalesced SSE Connection Ownership & Mid-Stream Paired Host Switch Hardening](./spec.md): Investigated the two-host mid-chunk SSE switch scenario across `src/ingress/`, `src/server/`, and `src/web/`, uncovering three connection-ownership vulnerabilities (V1: `subscribeEvents` chunk reader not checking `clientAbortController` after `await reader.read()` and `OpenCodeClientAdapter.stop()` not clearing `sessionCursors`; V2: `createSseBroadcaster` not scoping `pendingEmission` / `lastSentCharMeta` to `daemonUrl` or resetting on machine switch; V3: `applyAuthoritativeSnapshot` only checking `expectedMachineDaemonUrl` while `pendingOperatorAction` is in-flight and then relying purely on `nextVer < curVer`, allowing a late higher-version old-host frame to clobber a lower-version new host or rejecting an early lower-version new-host SSE frame). Authored the 3-ticket vertical slice plan and 700,000-character two-host regression test design.
- [01: Upstream SSE Mid-Chunk Abort & Adapter Cursor Ownership Reset](./issues/01-upstream-sse-mid-chunk-abort-and-adapter-cursor-reset.md): Linked `clientAbortController.signal` into `subscribeEvents()`'s `combinedSignal`, added immediate post-`reader.read()` abort checks that cancel the stream reader (with safe `.catch(() => {})`) and discard the partial `buffer` before JSON decoding or cache eviction, and added `clearConnectionState()` on `OpenCodeClientAdapter.start()` and `.stop()` to reset `sessionCursors`, `sessionDirectoryBySessionId`, `knownRoomMeta`, `canonicalByWorktreeMap`, and `sweepDigests`.
- [02: Coalesced SSE Broadcaster Host Ownership & Client Snapshot Gate Ownership Separation](./issues/02-coalesced-sse-broadcaster-and-client-snapshot-gate-ownership.md): Added `reset()` and `activeDaemonUrl` ownership tracking to `createSseBroadcaster` (wired to `onAdapterChanged` in `createOperatorWorkspaceRegistry`), and separated persistent connection ownership (`expectedMachineDaemonUrl` and `isHostOwnershipTransition`) from `nextVer < curVer` in `applyAuthoritativeSnapshot` so a newly activated host starting at a lower `snapshot.version` renders immediately while any late higher-version snapshot from the old host is rejected.
- [03: Two-Host 700k-Char Mid-Stream Switch Regression Suite, Docs & Live Docker Verification](./issues/03-two-host-700k-mid-stream-switch-regression-and-docker-proof.md): Added the two-host `700,000`-character mid-stream switch regression test in `tests/54-paired-machine-switch-leak-prevention.test.ts` and `tests/52-visualizer-runtime-performance.test.ts`, updated `GLOSSARY.md`, `README.md`, and `docs/graphify-out/`, deployed on Docker (`opencode-pixel-guild-visualizer` on port `4310`), passed all 430 tests (`npm test`), and captured + visually inspected `docs/images/coalesced-sse-host-switch-ownership.png`.

## Not yet specified

<!-- All investigation findings have graduated into spec.md and tickets 01..03 -->

## Out of scope

- Modifying the upstream OpenCode V2 daemon's `/api/event` SSE framing format.
- Keeping concurrent live SSE streams open to inactive paired hosts.
