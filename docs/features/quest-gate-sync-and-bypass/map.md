# Wayfinder Map: Quest Gate Two-Way Sync, Collapse & Quiet Bypass

## Destination

Deepen the **Quest Gate** architecture across `src/state/`, `src/ingress/`, `src/hud/`, `src/web/`, and `src/server/` so that:
1. Answering, rejecting, or progressing past a question or permission in actual OpenCode (TUI, CLI, or web) automatically settles and removes the **Quest Gate** in the visualizer across all 4 authoritative signals (SSE reply/reject/cancel with `requestID`/`callID`, working/thinking transitions, completed `question` tool hydration, and new non-question assistant turns).
2. Operators can collapse (`Collapse ▾` / `Expand ▸`) any **Quest Gate** card into a persistent 1-line summary bar in the **Character Sheet** without losing the 2D canvas `[?]` / `[!]` alert marker.
3. Operators can bypass (`Bypass ✕` with `decision: "dismiss"`) any **Quest Gate** quietly without injecting a synthetic chat prompt, or use the always-accessible **Command Scroll** directly below the gate (implicitly bypassing the gate on send).

## Notes

- Architecture Review Report: `./docs/architecture-review/architecture-review-20261117-quest-gate-sync-and-bypass.html`
- Architecture Decision Record: `./docs/adr/0003-quest-gate-two-way-sync-and-bypass.md`
- Specification: `./docs/features/quest-gate-sync-and-bypass/spec.md`
- Strict 400-line ceiling applies to all files under `src/` (`tests/00-architecture-invariants.test.ts`).

## Decisions so far

- **Two-Way OpenCode Sync (Q1)**: Auto-settle open **Quest Gates** across all 4 signals: SSE reply/reject/cancel frames (including `requestID`, `questionID`, `callID`), session progress transitions (`Thinking` / `WorkingAtStation` / `message.user.prompt`), completed `question` tool hydrations, and new non-question assistant turns (`./docs/adr/0003-quest-gate-two-way-sync-and-bypass.md`).
- **Quest Gate Collapse UX (Q2)**: Render a `Collapse ▾` / `Expand ▸` header button on every **Quest Gate** card that collapses the body into a 1-line summary bar preserved across SSE ticks via `clientState.collapsedGateIds` while keeping the 2D canvas marker visible (`./docs/adr/0003-quest-gate-two-way-sync-and-bypass.md`).
- **Quiet Bypass & Unlocked Command Scroll (Q3)**: Keep the **Command Scroll** visible below any active **Quest Gate** (auto-settling the gate if a prompt is sent) and add a `Bypass ✕` button (`decision: "dismiss"`) that settles the gate without sending a fake user chat prompt (`./docs/adr/0003-quest-gate-two-way-sync-and-bypass.md`).
- **Ticket 01 Resolved**: Consolidated 4-signal Quest Gate settlement in `src/state/quest-gate-handlers.ts` (`./issues/01-deepen-reducer-quest-gate-lifecycle.md`).
- **Ticket 02 Resolved**: Unified SSE resolution mapping (`requestID`/`questionID`/`callID` + `rejected`/`cancelled`) and two-way post-hydration gate reconciliation in `src/ingress/` (`./issues/02-unify-ingress-gate-hydration-and-sse-sync.md`).
- **Ticket 03 Resolved**: Added `Collapse ▾` / `Expand ▸` and `Bypass ✕` (`decision: "dismiss"`) controls on **Quest Gate** cards and unlocked the **Command Scroll** beneath active gates (`./issues/03-quest-gate-collapse-bypass-and-command-scroll.md`).

## Not-yet-specified

- **Ticket 04 (`./issues/04-fix-consecutive-and-mid-turn-question-gate-drops.md`)**: Fix consecutive (2nd+) and mid-turn Question Gate drops caused by unscoped historical `recentTools` `toolName === "question"` completion checks, generic `"Awaiting user answer"` placeholder reason poisoning on `status: "pending"` tool frames, same-turn `session.status: "thinking"` (`busy`) gate settlement while a `question` tool is running, conversational settlement mutating newly hydrated `"running"` `question` tools, and `part.callID` / `/api/question` alignment.

## Out-of-scope

- Modifying OpenCode V2 daemon internals outside the visualizer companion.
