# Feature Map: Character Lifecycle Audit, OpenCode V2 Protocol Parity & Unified Choreography

Label: wayfinder:map

## Destination

Deliver the complete specification in [Specification: Character Lifecycle Audit, OpenCode V2 Protocol Parity & Unified Choreography](./spec.md) across all four architecture review candidates through ten single-responsibility vertical-slice tickets:

1. **[01: Directory-Scoped V2 Session Discovery, Per-Directory Cache & Room-Scoped Active Sessions](./issues/01-directory-scoped-v2-discovery-and-active-sessions.md)** (`Blocked by: None`)
2. **[02: Stateful OpenCode V2 SSE Event Decoder for Tools, Prompts, Skills & Identity](./issues/02-stateful-opencode-v2-sse-event-decoder.md)** (`Blocked by: None`)
3. **[03: Strict V2 Message-Union Hydration, Worktree Parity & Agent Command Endpoint Alignment](./issues/03-strict-v2-message-hydration-and-command-alignment.md)** (`Blocked by: 01`)
4. **[04: Delete Dead Choreography Modules & Unify Canonical Preparation Station Taxonomy](./issues/04-delete-dead-choreography-and-unify-station-taxonomy.md)** (`Blocked by: None`)
5. **[05: Stable Guild Role Archetype Identity & Parent-Tethered Squad Subagent Visuals](./issues/05-stable-role-archetype-and-squad-subagent-visuals.md)** (`Blocked by: 02, 04`)
6. **[06: Live Summoning Ritual Adjacent Spawn & Unified Toil Queue Walker Choreography](./issues/06-live-summoning-ritual-and-unified-toil-choreography.md)** (`Blocked by: 04, 05`)
7. **[07: Authoritative Roster Visibility Mode & Thrash-Free Squad Subagent Retirement](./issues/07-authoritative-roster-visibility-and-subagent-retirement.md)** (`Blocked by: 01, 09`)
8. **[08: CLI Deletion Pruning, Per-Operator Background Sweeps & Non-Destructive Chronicle Boot Sync](./issues/08-cli-deletion-pruning-and-chronicle-boot-sync.md)** (`Blocked by: 01, 07`)
9. **[09: Authoritative Quest Gate Lifecycle (`Permission.Request`, `Form.Info` IDs, Time-Scoped Conversational `?`) & Clean Turn Termination](./issues/09-authoritative-quest-gate-lifecycle-and-turn-termination.md)** (`Blocked by: 02, 03`)
10. **[10: Per-Turn Context Mana Utilization & Single-Pulse Compaction Exhalation](./issues/10-per-turn-context-mana-and-compaction-exhalation.md)** (`Blocked by: 02, 03`)

## Notes

- **Mode**: Design, Planning & Wayfinding phase (`spec.md`, `map.md`, `GLOSSARY.md`, `./docs/research/character-lifecycle-audit.md`, `./docs/architecture-review/architecture-review-20261029-character-lifecycle.html`, and tickets `01..10` published; zero application code modified per `no code, this is design phase` directive).
- **Domain**: **Guild Adventurer**, **Squad Subagent**, **Guild Role Archetype**, **Preparation Station**, **Armory Wardrobe**, **Arcane Lectern**, **Summoning Ritual**, **Report Scroll**, **Toil Queue**, **Workflow Intent**, **Quest Gate**, **Context Mana**, **Compaction Exhalation**, **Roster Visibility Mode**, **Break Lounge**, **Guild Chronicle Store**.
- **Primary-Source Research Audit**: [Character Lifecycle & Architecture Audit (2026-10-29)](../../research/character-lifecycle-audit.md).
- **Architecture Review**: [Architecture Review Report (2026-10-29)](../../architecture-review/architecture-review-20261029-character-lifecycle.html).
- **Specification**: [Feature Specification](./spec.md).
- **Skills to consult**: `codebase-design`, `domain-modeling`, `opencode`, `tdd`, `code-review`.
- **Standing Rules**: Work strictly inside the project root directory (`./`). Never create git worktrees or write files to `/tmp` or `/tmp/opencode`. Every source file in `src/` must remain `<= 400` lines.

## Decisions so far

- [Primary-Source Character Lifecycle Audit (2026-10-29)](../../research/character-lifecycle-audit.md): Audited all 5 stages of the character lifecycle against OpenCode V2 (`https://opencode.ai/v2/openapi.json`, `opencode v2.2.1` runtime, and `opencode.db` vs. `data/guild-chronicle.sqlite`), identifying 26 concrete protocol and state discrepancies.
- [Architecture Deepening Review & Grilling Alignment (2026-10-29)](../../architecture-review/architecture-review-20261029-character-lifecycle.html): Resolved `Q1–Q6` across all four deepening candidates, updated `GLOSSARY.md` definitions for **Context Mana** and **Roster Visibility Mode**, and decomposed the work into 10 single-responsibility vertical-slice tickets (`01..10`).
- [Specification: Character Lifecycle Audit, OpenCode V2 Protocol Parity & Unified Choreography](./spec.md): Locked OpenCode V2 ingress discovery/SSE contracts, unified **Preparation Station** and **Guild Role Archetype** state reduction, thrash-free **Squad Subagent** retirement and **Roster Visibility Mode**, CLI deletion pruning and **Guild Chronicle Store** boot preservation, and authoritative **Quest Gate** and per-turn **Context Mana** invariants.
- [01: Directory-Scoped V2 Session Discovery, Per-Directory Cache & Room-Scoped Active Sessions](./issues/01-directory-scoped-v2-discovery-and-active-sessions.md): Queried `/api/session` with top-level `?directory=` plus `?parentID=null&limit=50`, keyed session caching per request path, and intersected process-global `/api/session/active` with each room's discovered sessions.
- [02: Stateful OpenCode V2 SSE Event Decoder for Tools, Prompts, Skills & Identity](./issues/02-stateful-opencode-v2-sse-event-decoder.md): Correlated `session.tool.input.started` and `session.tool.called` via `toolNameByCallId`, mapped `session.tool.success`/`failed`, `session.shell.*`, `session.inbox.enqueued`, `session.skill.activated`, `session.agent.selected`, `session.model.selected`, `session.renamed`, `session.step.started`, `session.moved`, `session.archived`/`unarchived`, and `session.execution.interrupted`, and prevented phantom `"/"` rooms.
- [03: Strict V2 Message-Union Hydration, Worktree Parity & Agent Command Endpoint Alignment](./issues/03-strict-v2-message-hydration-and-command-alignment.md): Ordered hydrated messages newest-first, excluded `"system"` and control messages from assistant chat transcripts while extracting `"agent-switched"` and `"model-switched"` metadata, enabled full hydration for `/.local/share/opencode/worktree/` paths, and routed agent switches to `POST /api/session/{sessionID}/agent`.
- [04: Delete Dead Choreography Modules & Unify Canonical Preparation Station Taxonomy](./issues/04-delete-dead-choreography-and-unify-station-taxonomy.md): Deleted dead `src/roster/*` (5 files, 1,181 lines), added `PREPARATION_STATION_DISPLAY_NAMES` and `resolvePreparationStationDisplayName`, surfaced `activePreparationStation` and `preparationStation` across reducer, **Character Sheet**, and **Tool Log**, and routed `skill` equipping to **Armory Wardrobe**.
- [05: Stable Guild Role Archetype Identity & Parent-Tethered Squad Subagent Visuals](./issues/05-stable-role-archetype-and-squad-subagent-visuals.md): Persisted `roleArchetype` on `CharacterState`, stopped `resolveCharacterRole` from morphing characters into `WARRIOR` during `debugging-hunt` turns, and tethered **Squad Subagent** party palettes to `parentId`.
- [06: Live Summoning Ritual Adjacent Spawn & Unified Toil Queue Walker Choreography](./issues/06-live-summoning-ritual-and-unified-toil-choreography.md): Guarded `SummoningRitualState` so historical subagents on reconnect never trigger false rituals, and initialized newly spawned **Squad Subagent** walkers adjacent to their parent summoner on the canvas.
- [07: Authoritative Roster Visibility Mode & Thrash-Free Squad Subagent Retirement](./issues/07-authoritative-roster-visibility-and-subagent-retirement.md): Removed the permanent top-6 `isOpenInOpenCode` pin, restricted child subagent `isOpenInOpenCode` to active/gate-blocked turns, and eliminated 15-second `Archived <-> RestingInLounge` thrashing.
- [08: CLI Deletion Pruning, Per-Operator Background Sweeps & Non-Destructive Chronicle Boot Sync](./issues/08-cli-deletion-pruning-and-chronicle-boot-sync.md): Pruned CLI-deleted sessions in `handleStreamReconnected`, cleaned up orphaned SQLite `session_messages` on `saveSnapshot`, added 15s per-operator background sweeps, and preserved **Guild Chronicle Store** transcripts across `pairDaemon` boot sync.
- [09: Authoritative Quest Gate Lifecycle & Clean Turn Termination](./issues/09-authoritative-quest-gate-lifecycle-and-turn-termination.md): Mapped `permission.replied` (`requestID`), `form.created` (`data.form`), and `form.cancelled`, bound form gates to `frm_...` IDs, expired stale conversational `?` gates (>10m), and transitioned `session.error` / `session.execution.failed` to `RestingInLounge`.
- [10: Per-Turn Context Mana Utilization & Single-Pulse Compaction Exhalation](./issues/10-per-turn-context-mana-and-compaction-exhalation.md): Computed **Context Mana** from active-turn context tokens without waking idle sessions or overwriting `usedTokens` on cumulative `session.usage.updated` events, and triggered **Compaction Exhalation** once on `session.compaction.ended`.

## Not yet specified

<!-- All wayfinder fog has graduated into spec.md and tickets 01..10 -->

## Out of scope

- Modifying the **Operator Auth Gate** login/registration modal flows or **Assembly Commit Ledger** Git staging commands.
- Changing OpenCode V2 server-side database schemas inside `~/.local/share/opencode/opencode.db`.
