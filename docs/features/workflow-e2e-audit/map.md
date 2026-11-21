# Wayfinder Map — `workflow-e2e-audit`

## Issues

- `01-library-lore-scrying.md` — Parallel Workflow 01: Library & Alchemy Scrying Task
- `02-forge-shell-tempering.md` — Parallel Workflow 02: Forge & Shell Execution Task
- `03-lectern-answer-gate-quorum.md` — Parallel Workflow 03: Interactive Answer Gate & Quorum Resolution Task
- `04-tinker-scroll-steering.md` — Parallel Workflow 04: Command Scroll Instructions & Report Inspection Task
- `05-assembly-stage-and-seal.md` — Parallel Workflow 05: Assembly Staging, Commit Seal & Session Cleanup Task
- `06-alchemy-mana-distillation.md` — Parallel Workflow 06: Alchemy Lab & Context Mana Task
- `07-spyglass-web-reconnaissance.md` — Parallel Workflow 07: Observatory Spyglass Reconnaissance Task
- `08-armory-gear-wardrobe-swap.md` — Parallel Workflow 08: Armory Wardrobe Loadout Task
- `09-stockpile-cargo-hauling.md` — Parallel Workflow 09: Resource Stockpile Cargo Task
- `10-wilds-bug-monster-bounty.md` — Parallel Workflow 10: Dungeon Wilds Bounty Task

## Decisions so far

- Executed the 5-task subagent workflow, 10-parallel-session subagent workflow, and 50-concurrent-session full-function stress test against the live containerized visualizer (`http://127.0.0.1:4310`).
- Fixed pre-hydration `selectedSessionId` clearing in `src/web/side-panel-reconciler.ts` and `src/web/world-persistence.ts`.
- Added 6-slot bounded concurrency + retry (`acquireSessionCreateSlot`, `acquireDaemonDeleteSlot`) and `350ms` fast-ack prompt/view dispatch (`postPromptWithFastAck`) in `src/ingress/daemon-command-ops.ts` and `src/ingress/daemon-session-ops.ts` so 50 concurrent `adventurer.summon`, `scroll.send`, `session.view`, and `DELETE /api/guild/session/:id` calls complete in seconds without blocking on long-running LLM turns.
- Updated `selectVisibleHostCharacters` in `src/spatial/project-heraldry.ts` and `fetchDaemonLocationState` in `src/ingress/daemon-location-state.ts` so Quest Gate (`BlockedAtQuestGate`) and actively working characters always sort ahead of resting characters and all 50+ concurrent active/unviewed sessions remain visible in the Workshop Room and Guild Master Ledger.
