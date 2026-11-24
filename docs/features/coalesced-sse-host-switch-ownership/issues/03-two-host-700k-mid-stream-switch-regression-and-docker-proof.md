# 03: Two-Host 700k-Char Mid-Stream Switch Regression Suite, Docs & Live Docker Verification

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01, 02

## What to build

Build the end-to-end two-host regression test covering a paired host switch while the old stream is halfway through a `700,000`-character SSE event and the new host starts at a lower `snapshot.version`, update project documentation (`GLOSSARY.md` and `README.md`), refresh the knowledge graph (`docs/graphify-out/`), and verify on the live `opencode-pixel-guild-visualizer` Docker container (`:4310`).

1. **Two-Host 700,000-Character Mid-Stream Switch Regression Test (`tests/54-paired-machine-switch-leak-prevention.test.ts` & `tests/52-visualizer-runtime-performance.test.ts`)**:
   - Create a two-host fixture (`Host A` and `Host B`):
     - **Host A** (`https://host-a-stream.example.opentunnel.xyz`) advances to a higher snapshot version (`version >= 25`, `sequenceCursor = 100`), triggers a passive streaming burst in `createSseBroadcaster`, and begins streaming a **`700,000`-character** assistant text event (`message.part.updated` / `session.text.ended`) over a chunked `ReadableStream`—delivering the first `350,000`-character chunk (halfway through the JSON event, prior to `\n\n`).
     - While Host A's stream is halfway through the `700,000`-character event, switch the operator's active paired machine to **Host B** (`https://host-b-lower.example.opentunnel.xyz`), which starts at a **lower snapshot version** (`version: 2`, `sequenceCursor: 1`).
     - After the switch to Host B, push the remaining `350,000` characters + `\n\n` onto Host A's old stream reader and advance timers past the `70ms` SSE coalescing window.
     - Feed Host B's lower-version snapshot (`version: 2`) and a trailing high-version Host A snapshot (`version: 26`) into `applyAuthoritativeSnapshot` after `pendingOperatorAction` has cleared.
   - Assert that:
     - Host B renders cleanly at its lower snapshot version (`version: 2 < 25`) on both server and client.
     - Host A's partial `700,000`-character event, remaining stream chunk, `sessionCursors` (`100`), and pending coalesced broadcast are completely discarded.
     - Host A's trailing high-version snapshot (`version: 26 > 2`) is rejected by `applyAuthoritativeSnapshot` due to connection ownership mismatch.

2. **Documentation, Knowledge Graph & Live Docker Container Verification**:
   - Update `GLOSSARY.md` (**Authoritative Live State** and **OpenCode Machine Pairing**) and `README.md` to document connection-ownership gating across mid-stream chunked SSE reads, coalesced SSE broadcasts, and lower-version host switches.
   - Update `docs/graphify-out/` via `graphify update .`.
   - Deploy and test on the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`), run `npm test`, capture headless Chrome visual proof in `docs/images/coalesced-sse-host-switch-ownership.png`, and visually inspect the rendered output via `read`.

## Acceptance Criteria

- [x] Two-host `700,000`-character mid-stream switch regression test passes in `tests/54-paired-machine-switch-leak-prevention.test.ts` and `tests/52-visualizer-runtime-performance.test.ts`.
- [x] Full `npm test` suite and `tests/00-architecture-invariants.test.ts` pass (`100%` pass rate, all `src/**/*` `<= 400` lines).
- [x] `README.md`, `GLOSSARY.md`, `docs/features/coalesced-sse-host-switch-ownership/map.md`, and `docs/graphify-out/` are updated.
- [x] Docker container (`opencode-pixel-guild-visualizer` on `:4310`) is deployed, healthy, and visually verified via `docs/images/coalesced-sse-host-switch-ownership.png`.

## Answer

Added the two-host `700,000`-character mid-stream switch regression suite in `tests/54-paired-machine-switch-leak-prevention.test.ts` and `tests/52-visualizer-runtime-performance.test.ts`. Updated `GLOSSARY.md`, `README.md`, `docs/features/coalesced-sse-host-switch-ownership/spec.md`, `docs/features/coalesced-sse-host-switch-ownership/map.md`, and `docs/graphify-out/`. Deployed and verified on the `opencode-pixel-guild-visualizer` Docker container on port `4310`, ran `npm test` (430/430 tests passing), and captured and visually inspected `docs/images/coalesced-sse-host-switch-ownership.png`.
