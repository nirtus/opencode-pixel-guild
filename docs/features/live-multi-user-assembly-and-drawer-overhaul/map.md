# Feature Map: Anonymous Multi-User OpenCode Pairing, Live Real-Time Telemetry, Reactive Goal Assembly & Commit CRUD, Zero-Scrollbar Category Subtab Deck & Project World Persistence

Label: wayfinder:map

## Destination

Deliver the complete overhaul specified in [Specification: Anonymous Multi-User OpenCode Pairing, Live Real-Time Telemetry, Reactive Goal Assembly & Commit CRUD, Zero-Scrollbar Category Subtab Deck & Project World Persistence](./spec.md) through five parallel, non-blocking vertical-slice tickets:
1. **[01: Anonymous Guild Operator CRUD & Private OpenCode Daemon Pairing](./issues/01-anonymous-guild-operator-crud-and-opencode-pairing.md)** (`Blocked by: None`)
2. **[02: Persistent Project World Selection & Refresh Restoration](./issues/02-persistent-project-world-selection-across-refresh.md)** (`Blocked by: None`)
3. **[03: Real-Time OpenCode SSE Streaming, Parallel Delta Hydration & Zero Demo Pollution](./issues/03-live-sse-streaming-and-zero-demo-telemetry-ingress.md)** (`Blocked by: None`)
4. **[04: Live Reactive Goal Assembly Reset & Assembly Commit Ledger CRUD](./issues/04-reactive-goal-assembly-reset-and-commit-crud.md)** (`Blocked by: None`)
5. **[05: Zero-Scrollbar Category Subtab Deck for Character Sheet & Guild Master Ledger](./issues/05-zero-scrollbar-category-subtab-deck-and-reconciler-split.md)** (`Blocked by: None`)

## Notes

- **Mode**: Design phase complete (`spec.md` and parallel tickets `01..05` published; no production code modified).
- **Domain**: **Guild Operator**, **Project World**, **Workshop Room**, **Goal Assembly Site**, **Assembly Part**, **Feature Assembly Scaffold**, **Assembly Commit Ledger**, **Spectator Drawer**, **Category Subtab Deck**, **Character Sheet**, **Guild Master Ledger**, **Command Scroll**, **Quest Gate**, **Demo Guild Simulator**.
- **Architecture Review**: [Architecture Review Report (2026-10-26)](../../architecture-review/architecture-review-20261026.html) (`docs/images/architecture-review-20261026.png`).
- **Specification**: [Feature Specification](./spec.md).
- **Skills to consult**: `codebase-design`, `domain-modeling`, `tdd`, `code-review`.
- **Standing Rules**: Work strictly inside the project root directory (`./`). Never create git worktrees or write files to `/tmp` or `/tmp/opencode`. Every source file in `src/` must remain `<= 400` lines.

## Decisions so far

- [Architecture Review & Initial Scope Alignment](../../architecture-review/architecture-review-20261026.html): Selected all 5 architectural deepening candidates and defined `Guild Operator`, `Category Subtab Deck`, and `Assembly Commit Ledger` in `GLOSSARY.md`.
- [Specification: Anonymous Multi-User OpenCode Pairing, Live Real-Time Telemetry, Reactive Goal Assembly & Commit CRUD, Zero-Scrollbar Category Subtab Deck & Project World Persistence](./spec.md): Synthesized 36 user stories, 5 deep module implementation decisions, and 5 primary testing seams into the canonical feature spec.
- [01: Anonymous Guild Operator CRUD & Private OpenCode Daemon Pairing](./issues/01-anonymous-guild-operator-crud-and-opencode-pairing.md): Independent vertical slice for anonymous per-operator workspace CRUD, private OpenCode pairing, and isolated server reducer/SSE state.
- [02: Persistent Project World Selection & Refresh Restoration](./issues/02-persistent-project-world-selection-across-refresh.md): Independent vertical slice for **Project World** refresh persistence (`localStorage` + URL query + operator profile) and boot hydration guard.
- [03: Real-Time OpenCode SSE Streaming, Parallel Delta Hydration & Zero Demo Pollution](./issues/03-live-sse-streaming-and-zero-demo-telemetry-ingress.md): Independent vertical slice for live text/tool SSE streaming, cached room resolution, parallel TTL capability sweeps, and banishing fake demo characters in live mode.
- [04: Live Reactive Goal Assembly Reset & Assembly Commit Ledger CRUD](./issues/04-reactive-goal-assembly-reset-and-commit-crud.md): Independent vertical slice removing hardcoded `3/5` fallbacks, retiring completed feature folders, deriving live assembly parts from Git working-tree + active tasks, resetting to `0/0 Blueprint Ready` when clean, and providing full Git Commit CRUD.
- [05: Zero-Scrollbar Category Subtab Deck for Character Sheet & Guild Master Ledger](./issues/05-zero-scrollbar-category-subtab-deck-and-reconciler-split.md): Independent vertical slice delivering full-height zero-scrollbar subtabs (`Details`, `Chat`, `Scrolls & Gear`, `Tool Log` under `Hero`; `Overview`, `Assembly & Commit`, `Roster` under `General`), removing the pinned 115px ticker, and decomposing reconcilers `< 400` lines.

## Not yet specified

<!-- All wayfinder fog has graduated into spec.md and parallel vertical-slice tickets 01..05 -->

## Out of scope

- Public multi-user account switcher or shared global roster across different **Guild Operators**.
- Third-party OAuth / external identity provider integration.
- Remote `git push` / `git pull` / merge conflict resolution UI.
