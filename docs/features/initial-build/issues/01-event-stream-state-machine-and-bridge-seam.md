# Deep Capability, World-State Reducer, and Telemetry Ingress Seam

Type: grilling
Status: closed
Blocked by: none

## Architectural Decisions Settled

- **Single Telemetry Ingress Seam with Three Adapters (`Q4: A`, `Q8: A`, `Q9: B`)**:
  1. **OpenCode Host Plugin Adapter (`@opencode/plugin` + `@opencode/plugin/tui`)**: Server plugin registers a `guild` RPC channel (`ctx.rpc.register`), discovers registered tool definitions via `await ctx.tool.list()`, and hooks `ctx.tool.hook("execute.before" / "execute.after")`; TUI plugin registers the `/guild` slash command / keybind (`context.keymap.layer`) and renders live room/adventurer/quest-gate counts in `"home.footer.status"` and `"prompt.footer.status"`.
  2. **Standalone `@opencode/client` Bridge Adapter**: Connects to the machine's shared background OpenCode V2 daemon via `Service.discover()` / `Service.ensure()` and sweeps all discovered `Project`s (`GET /api/project` + `project.sandboxes`), loaded `Location`s (`GET /api/debug/location`), and per-location resources (`?location[directory]=...`: `/api/worktree`, `/api/session`, `/api/session/active`, `/api/session/{sessionID}/message`, `/api/skill`, `/api/plugin`, `/api/mcp`, `/api/agent`, `/api/permission/request`, `/api/form`) alongside the global `/api/event` stream so all terminal sessions on the machine are represented in their canonical `Location.directory` `Workshop Room` (`Q10: A`).
  3. **`Demo Guild Simulator` Adapter**: Emits deterministic multi-room, `Skill Grimoire`, and `Plugin Alcove` lifecycles through the same ingress seam.
- **Three-Tier Deterministic Capability Classifier Inside Module `01` (`Q2: A`, `Q5: A`)**:
  - Resolves built-in tools, skills (`Arcane Lectern`), plugin/MCP tools (`Plugin Alcove`), and custom agents (`Agent.Info.color` + deterministic hash-seeded visual traits) behind one snapshot/delta interface so downstream modules (`03`, `04`, `05`) never parse raw tool or plugin identifiers.
  - Parses Code Mode (`execute`) scripts for `tools.<namespace>.<tool>` calls: single-namespace scripts route the character to that namespace's `Plugin Alcove`; multi-namespace or orchestration scripts route the character to the `Reactor Console` with secondary telemetry beam targets to each referenced `Plugin Alcove`.
- **Persistent `Skill Grimoire` Lifecycle (`Q1: A`, `Q6: A`)**:
  - Detects all three OpenCode V2 skill activation forms (model `skill` tool calls, user `@skill-id` prompt attachments in `Session.Message.User.skills[]`, and `Session.Message.Skill` items), enforces a minimum choreographic dwell at the `Arcane Lectern`, maintains an ordered stack of equipped `Skill Grimoire`s per character, propagates the parent's `Skill Grimoire` stack to spawned `Squad Subagent`s, and distills/clears the stack at the `Altar of Compaction`.

## Remaining Questions

1. What are the exact state transition rules and timers of a character's lifecycle reducer (`Entering`, `Thinking`, `WorkingAtStation` including minimum `Arcane Lectern` dwell, `BlockedAtQuestGate`, `DistillingContextMana`, `ReportingScroll`, `RestingInLounge`, `Archived`)?
2. Because `client.event.subscribe()` in OpenCode V2 is live-only with no event replay on reconnect, how should the module reconcile missed transitions (using `/api/experimental/session/{sessionID}/log?after=...` or per-location message/active-session re-hydration) if the SSE stream drops or a browser tab connects mid-turn?
3. What is the exact TypeScript schema of the resolved snapshot + delta interface exposed by Module `01` to the floorplan, sprite renderer, and HUD modules?

## Resolution

Implemented and verified in `src/types/domain.ts`, `src/capability/classifier.ts`, `src/state/world-reducer.ts`, `src/ingress/adapters.ts`, and `tests/01-capability-and-world-reducer.test.ts`:

1. **Character Lifecycle Reducer Rules & Choreographic Dwell Timers (`LIFECYCLE_TIMERS_MS`)**:
   - `Entering` (`600ms` dwell via `ENTERING_DWELL_MS`): Initial state on `session.upserted` (at room door for a root `Guild Adventurer` or `Summoning Pad` for a `Squad Subagent`), with `deferredLifecycleState = "Thinking"`. Transitions to `Thinking` on `timer.tick` once `timestampMs >= dwellUntilMs` or immediately on tool/prompt activity.
   - `Thinking`: Active reasoning/streaming state between tool calls. Transitions to `WorkingAtStation` on `tool.started` / skill activation, `BlockedAtQuestGate` on `permission.requested` / `question.requested`, `DistillingContextMana` on `session.compacted`, `ReportingScroll` on subagent `session.idle`, or `RestingInLounge` on root `session.idle`.
   - `WorkingAtStation` (with `1500ms` minimum dwell at `Arcane Lectern` via `ARCANE_LECTERN_MIN_DWELL_MS`): Routes the character to the pre-resolved `WorkstationKind` (`Drafting Table`, `Archive Radar`, `Anvil Forge`, `Reactor Console`, `Comms Dish`, `Altar of Compaction`, `Arcane Lectern`, or `Plugin Alcove`). When a skill is activated via any of the 3 OpenCode V2 forms (`skill` tool call, `@skill-id` user prompt attachment / `skills[]`, or `Session.Message.Skill` item), `dwellUntilMs` is set to `timestampMs + 1500`. If `tool.completed` or `session.idle` arrives before `dwellUntilMs`, the target state (`Thinking` or `RestingInLounge`) is stored in `deferredLifecycleState` and applied when `timer.tick` reaches `dwellUntilMs`.
   - `BlockedAtQuestGate`: Entered on `permission.requested` (`marker: "!"`) or `question.requested` (`marker: "?"`). Resolving the gate (`permission.resolved` / `question.resolved`) returns the character to `WorkingAtStation` (if a station is still active) or `Thinking`.
   - `DistillingContextMana` (`1200ms` dwell at `Altar of Compaction` via `DISTILLING_CONTEXT_MANA_DWELL_MS`): Entered on `session.compacted`. Moves equipped `skillGrimoires` into `distilledSkillHistory`, clears `skillGrimoires`, increments `contextMana.compactionCount`, updates post-compaction token usage, and returns to `Thinking` after the `1200ms` dwell.
   - `ReportingScroll` (`900ms` handoff dwell via `REPORTING_SCROLL_DWELL_MS`): Entered when a `Squad Subagent` (`parentId !== null`) emits `session.idle`. Creates a `ReportScrollState` targeting `parentId`; once `timer.tick` reaches `dwellUntilMs`, sets `reportScroll.deliveredAtMs` and transitions the subagent to `RestingInLounge`.
   - `RestingInLounge` -> `Archived`: Idle characters rest in `Break Lounge` (`RestingInLounge`) while retaining their equipped `Skill Grimoire` stack across turns. After `HISTORICAL_ARCHIVE_IDLE_MS` (`30 minutes`) of inactivity or explicit `session.archived`, the character transitions to `Archived`.

2. **Missed-Transition Reconciliation on SSE Reconnect / Mid-Turn Connect (`stream.reconnected`)**:
   - Every `CharacterState` tracks a monotonic `sequenceCursor`.
   - On initial hydration or SSE reconnect, `createOpenCodeClientAdapter` sweeps all discovered `Project`s (`/api/project` + `project.sandboxes`) and `Location`s (`/api/debug/location`), fetches per-location state (`?location[directory]=...`) and incremental session logs (`/api/experimental/session/{sessionID}/log?after=<sequenceCursor>`), and dispatches `stream.reconnected`.
   - The reducer replays log entries strictly where `entry.cursor > char.sequenceCursor` in ascending cursor order (applying missed skill activations, compactions, and tool completions without duplicating already-applied cursors), reconciles `questGates` against live `pendingPermissions` and `pendingQuestions`, and reconciles active vs. idle session states against `activeSessionIds`.

3. **Resolved Snapshot + Delta Seam Schema (`GuildSnapshot`, `GuildDelta`, `GuildStateEmission`)**:
   - Defined in `src/types/domain.ts`: `WorldStateReducer` exposes `dispatch(event): GuildStateEmission`, `getSnapshot(): GuildSnapshot`, `getCatalog(): CapabilityCatalog`, and `subscribe(listener)` where `GuildSnapshot` contains normalized `rooms` (`Record<string, WorkshopRoomState>` with `4` prioritized `pluginAlcoves` + `overflowPluginNamespaces`), `roomOrder`, `characters` (`Record<string, CharacterState>` with pre-resolved `CapabilityDescriptor`, `VisualTraitPalette`, `skillGrimoires`, `contextMana`, `questGate`, `reportScroll`), `questGates`, and `summary` counters.
