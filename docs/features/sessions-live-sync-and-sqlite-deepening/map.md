# Feature Map: Sessions & Subagents Lifecycle Deepening, Workflow Invariance, Quest Gate Reconciler, Bounded Live Sync & Guild Chronicle SQLite Store

Label: wayfinder:map

## Destination

Deliver the complete architectural deepening and bug-resolution specification in [Specification: Sessions & Subagents Lifecycle Deepening, Workflow Invariance, Quest Gate Reconciler, Bounded Live Sync & Guild Chronicle SQLite Store](./spec.md) through five vertical-slice tickets:
1. **[01: Bounded Daemon Client, Non-Destructive Pairing, Operator Tick Loop & Docker Hygiene](./issues/01-bounded-daemon-client-non-destructive-pairing-and-operator-tick-loop.md)** (`Blocked by: None`)
2. **[02: Workflow Intent Invariance, Active-Only Bug Monsters & Roster Mode Projection](./issues/02-workflow-intent-invariance-and-roster-mode-projection.md)** (`Blocked by: None`)
3. **[03: Unified Character Lifecycle, Toil Queue, Adjacent Summoning & Deterministic Station Slots](./issues/03-unified-character-lifecycle-toil-queue-and-summoning-choreography.md)** (`Blocked by: 01, 02`)
4. **[04: Unified Quest Gate Reconciler Across Live SSE & Full-Turn Hydration](./issues/04-unified-quest-gate-reconciler-across-sse-and-polling.md)** (`Blocked by: 01`)
5. **[05: Guild Chronicle SQLite Store (`./data/`) & Formatted, Compacted Multi-Turn Hero Chat](./issues/05-guild-chronicle-sqlite-store-and-formatted-hero-chat.md)** (`Blocked by: 01`)

## Notes

- **Mode**: Wayfinder charting & design phase complete (`map.md`, `spec.md`, and tickets `01..05` resolved; `GLOSSARY.md` updated with **Guild Chronicle Store**; no production code in `src/**` or `tests/**` modified).
- **Domain**: **Guild Adventurer**, **Squad Subagent**, **Toil Queue**, **Preparation Station**, **Armory Wardrobe**, **Summoning Ritual**, **Report Scroll**, **Break Lounge**, **Workflow Intent**, **Bug Monster**, **Quest Gate**, **Guild Operator**, **OpenCode Machine Pairing**, **Guild Chronicle Store**, **Character Sheet**, **Guild Master Ledger**.
- **Architecture & Functionality Audit Report**: [Architecture & Functionality Review (2026-10-27)](../../architecture-review/architecture-review-20261027-sessions-and-live-sync.html) (`docs/images/architecture-review-html-full.png`).
- **Specification**: [Feature Specification](./spec.md).
- **Skills to consult**: `codebase-design`, `domain-modeling`, `grilling`, `tdd`, `code-review`.
- **Standing Rules**: Work strictly inside the project root directory (`./`). Never create git worktrees or write files to `/tmp` or `/tmp/opencode`. Every source file in `src/` must remain `<= 400` lines.

## Decisions so far

- [Architecture & Functionality Audit (2026-10-27)](../../architecture-review/architecture-review-20261027-sessions-and-live-sync.html): Audited all 12 character/subagent lifecycle phases, live container state (`http://127.0.0.1:4310`), data storage tiers, Hero Chat truncation points, and Docker warnings; confirmed `Q1–Q8` across two grilling rounds and added **Guild Chronicle Store** to `GLOSSARY.md`.
- [01: Bounded Daemon Client, Non-Destructive Pairing, Operator Tick Loop & Docker Hygiene](./issues/01-bounded-daemon-client-non-destructive-pairing-and-operator-tick-loop.md): Enforce 4s per-request `AbortSignal.timeout` and deduplicated location sweeps, make `pairDaemon` non-destructive, start a 1s `timer.tick` + 15s poll loop for all operator runtimes, fix the 12,313+ `AbortSignal` listener leak in `subscribeEvents`, suppress `ExperimentalWarning`, and resolve `/workspaces/<repo>` in Docker.
- [02: Workflow Intent Invariance, Active-Only Bug Monsters & Roster Mode Projection](./issues/02-workflow-intent-invariance-and-roster-mode-projection.md): Remove the room-wide `hasActiveRoomBug` override from `classifyCharacterWorkflowIntent`, restrict **Bug Monster** derivation to actively executing sessions, ensure `RestingInLounge` and `Archived` always resolve to `Lounge` / `Resting` / `Archived`, and update **Project World** tab session counts accurately across `Active Squads` and `Full Roster`.
- [03: Unified Character Lifecycle, Toil Queue, Adjacent Summoning & Deterministic Station Slots](./issues/03-unified-character-lifecycle-toil-queue-and-summoning-choreography.md): Spawn new **Guild Adventurer**s at the South Guild Door (`368, 692`) and new **Squad Subagent**s adjacent to their parent summoner, eliminate the duplicate walker overwrite in `stepClientChoreography`, reserve station and **Break Lounge** slots deterministically per `sessionId`, expire ritual/armory/report phases via timestamps, and retain recent root sessions in `RestingInLounge`.
- [04: Unified Quest Gate Reconciler Across Live SSE & Full-Turn Hydration](./issues/04-unified-quest-gate-reconciler-across-sse-and-polling.md): Key **Quest Gate**s canonically per session (correlating `callId`, `formId`, and `messageId`), run shared conversational `?` detection on both live SSE `session.idle` and full-turn message hydration (including subagents), and preserve unresolved SSE gates across 15s reconnect sweeps.
- [05: Guild Chronicle SQLite Store (`./data/`) & Formatted, Compacted Multi-Turn Hero Chat](./issues/05-guild-chronicle-sqlite-store-and-formatted-hero-chat.md): Persist operator workspaces, rooms, sessions, and full multi-turn `user` + `assistant` chat transcripts in `./data/guild-chronicle.sqlite` (`node:sqlite` WAL mode, mounted at `./data:/app/data:rw`), expose on-demand session message loading, strip `<skill_content>` into `@skill` pills, render clean Markdown with collapsible long turns, and preserve scroll position during streaming.

## Not yet specified

<!-- All wayfinder fog has graduated into spec.md and resolved decision tickets 01..05 -->

## Out of scope

- Replacing the 2D Canvas renderer with WebGL.
- Multi-node distributed database replication beyond the local `./data/guild-chronicle.sqlite` store.
