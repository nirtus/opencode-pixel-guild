# Session and Subagent Persistence, Skill Grimoire Lineage, and Squad Choreography

Type: grilling
Status: closed
Blocked by: none

## Architectural Decisions Settled

- **Co-Habited Canonical `Workshop Room`s Across Local Terminal Sessions (`Q9: B`, `Q10: A`)**:
  - Every `Workshop Room` maps 1:1 to a canonical filesystem `Location.directory` (`Project` root or `Worktree` sandbox) on the machine's shared OpenCode V2 daemon. Multiple concurrent root sessions opened in the same directory across different terminals co-habit the same `Workshop Room` and share its `Workstation`s and `Break Lounge`.
- **`Skill Grimoire` Persistence & `Squad Subagent` Inheritance (`Q1: A`, `Q6: A`)**:
  - Equipped `Skill Grimoire`s persist on a `Guild Adventurer` across turns (including while resting in the `Break Lounge`) until the character visits the `Altar of Compaction`.
  - When a `Guild Adventurer` spawns a `Squad Subagent` at the `Summoning Pad`, the child inherits the parent's active `Skill Grimoire` stack as starting lineage context and can equip additional `Skill Grimoire`s at the `Arcane Lectern` during its own task.

## Remaining Questions

How should a `Workshop Room` balance visual clarity with persistence as sessions and subagents accumulate over a workday?

Specifically:
1. When a `Guild Adventurer` finishes a turn (`Session.Message.Idle`), where does it stay in the `Break Lounge`, and what visual distinction separates *recently idle* sessions (including their active `Skill Grimoire` aura) from *older historical* sessions in the same `Workshop Room`?
2. When a `Squad Subagent` (`parentID != null`) finishes its task and delivers its `Report Scroll` to its parent `Guild Adventurer`, how do we support both the celebratory completion handoff *and* keeping completed subagents and their `Skill Grimoire` lineage inspectable (e.g., a toggleable *"Active Squads vs. Full Lineage"* view, or a compact **Squad Bench / Trophy Shelf** next to the parent)?
3. What is the cap or pagination/overflow mechanic inside a `Workshop Room` when a project has 20+ historical sessions?

## Resolution

Implemented in [`src/roster/roster-choreography.ts`](../src/roster/roster-choreography.ts) and verified via [`tests/02-roster-choreography.test.ts`](../tests/02-roster-choreography.test.ts):

1. **`Break Lounge` Two-Tier Placement & `Skill Grimoire` Aura Visibility (`recentlyIdle` vs. `historical`)**:
   - **Hearth Coffee Table (`zone: "hearth-table"`, `tier: "recentlyIdle"`)**: Up to `maxRecentlyIdleSlots = 6` `Guild Adventurer`s that entered `RestingInLounge` within `recentlyIdleWindowMs = 15 * 60 * 1000` (15 minutes) sit at the hearth table (`pose: "drinking-coffee"`), rendered at full opacity (`opacity: 1.0`) with their active `Skill Grimoire` tome and orbiting rune sparks fully visible (`grimoireAuraVisibility: "full"`).
   - **Persistent Session Bench (`zone: "session-bench"`, `tier: "historical"`)**: Sessions idle longer than 15 minutes (or overflowing the 6 hearth seats) sit along the wooden session bench (`pose: "seated-on-bench"`) at muted opacity (`opacity: 0.72`) with their `Skill Grimoire` stack collapsed into a closed dormant tome emblem (`grimoireAuraVisibility: "dormant-emblem"`) so historical skills remain inspectable without filling the lounge with particle noise.
   - Equipped `Skill Grimoire`s persist across turns and idle states until distilled at the `Altar of Compaction` (`distillAtAltarOfCompaction`), which clears the active stack, increments `distilledGrimoireCount`, and resets `Context Mana`.

2. **Celebratory `Report Scroll` Handoff & Toggleable `"active-squads"` vs. `"full-lineage"` Squad Bench**:
   - **Spawn & Lineage Inheritance (`spawnSquadSubagent`)**: When spawned, a `Squad Subagent` materializes at the `Summoning Pad` (`status: "SummoningAtPad"`), inherits an immutable snapshot of its parent's equipped `Skill Grimoire` stack (`inherited: true`, `inheritedFromSessionID`), and can equip additional `Skill Grimoire`s (`inherited: false`) at the `Arcane Lectern` without mutating the parent.
   - **Celebratory Delivery Window (`completeSquadSubagent` -> `DeliveringReportScroll`)**: Upon completion, the subagent carries a `Report Scroll` (`hasReportScroll: true`, `renderStyle: "celebratory-handoff"`) for `DEFAULT_REPORT_HANDOFF_DURATION_MS = 1800ms` while its parent `Guild Adventurer` enters a celebratory state (`celebratingReportUntil`).
   - **Post-Handoff Persistence (`advanceRosterChoreography` -> `CompletedOnSquadBench`)**: Once `now >= handoffEndsAt`, the subagent is archived onto its parent's **Squad Bench / Trophy Shelf** (`squadBenchTrophies`, `benchSlotIndex: 0..N`) with its full `Skill Grimoire` lineage and `reportSummary`.
   - **Roster Visibility Modes (`setRoomRosterMode`)**:
     - `"active-squads"` (default): Active and mid-handoff subagents render on the floorplan (`visibleOnFloorplan: true`), while completed subagents collapse into inspectable **Trophy Scroll Badges** on their parent's Squad Bench (`visibleOnFloorplan: false`, `visibleOnSquadBench: true`, `renderStyle: "bench-trophy-scroll"`).
     - `"full-lineage"`: Completed subagents also materialize on the floorplan alongside their parent (`visibleOnFloorplan: true`, `visibleOnSquadBench: true`, `renderStyle: "lineage-ghost"`).

3. **20+ Historical Session Cap, Guild Registry Overflow Ledger, and Pagination (`computeWorkshopRoomView`, `setRoomRosterPage`)**:
   - Each `Workshop Room` enforces a configurable `maxVisibleSessions = 12` cap for root `Guild Adventurer`s on the floorplan.
   - Active `Guild Adventurer`s (`Entering`, `Thinking`, `WorkingAtStation`, `BlockedAtQuestGate`, `DistillingContextMana`) are **never** capped or paged out—they remain pinned on the floorplan at all times.
   - Remaining room capacity (`pageSize = Math.max(1, maxVisibleSessions - activeAdventurers.length)`) paginates the `Break Lounge` roster ordered by most recent activity (`idleSince ?? lastActivityAt` descending).
   - Sessions outside the current page are tracked in `archivedAdventurers` and surfaced via `overflowArchiveCount` + `pagination` metadata (`currentPage`, `pageSize`, `totalIdleSessions`, `totalPages`, `hasPreviousPage`, `hasNextPage`), allowing spectators to page through 20+ historical sessions without visual crowding.
