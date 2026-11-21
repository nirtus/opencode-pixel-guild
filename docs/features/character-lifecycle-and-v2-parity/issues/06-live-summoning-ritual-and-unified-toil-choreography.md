# 06: Live Summoning Ritual Adjacent Spawn & Unified Toil Queue Walker Choreography

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 04: Delete Dead Choreography Modules & Unify Canonical Preparation Station Taxonomy, 05: Stable Guild Role Archetype Identity & Parent-Tethered Squad Subagent Visuals

**What to build:** Ensure **Summoning Rituals** only fire for newly spawned live **Squad Subagents** (never for historical subagents hydrated on boot or reconnect), materialize each spawned **Squad Subagent** on the slot adjacent to its parent **Guild Adventurer** before walking to its target **Preparation Station**, and drive the browser walker directly from the reducer's authoritative `workflowIntent`, `overheadLabel`, and **Toil Queue**.

- [x] Guard `linkParentAndChild` in `src/state/session-handlers.ts` so `castRitual` is `true` only when the child session was created within a recent live window (`nowMs - activityTimestampMs < 15_000`), preventing historical subagents from triggering false summoning circles on boot or reconnect sweeps.
- [x] Update `resolveCharacterTargetSlot` and `stepClientChoreography` so a newly spawned **Squad Subagent** initializes its walker at the slot adjacent to its parent **Guild Adventurer** during the **Summoning Ritual**, then walks along the ring corridor to its assigned **Preparation Station**.
- [x] Remove `ignoreStoredIntent: true` and `ignoreStoredLabel: true` overrides in `src/web/station-and-workflow-routing.ts` so the browser canvas and HUD read the reducer's authoritative `workflowIntent` and `overheadLabel`.
- [x] Execute the full compiled **Toil Queue** (`dwell-station` at `Armory Wardrobe`, `pickup-cargo` at `Resource Stockpile`, station work, `fit-assembly-part`, and `deliver-report-scroll`) in `stepClientChoreography` rather than discarding non-walk steps.
- [x] Add choreography tests verifying adjacent subagent spawn coordinates, suppression of historical summoning rituals on reconnect, and multi-step **Toil Queue** progression, keeping all `src/**` files `<= 400` lines.

## Answer

Guarded `linkParentAndChild` in `src/state/session-handlers.ts` so `SummoningRitualState` only activates for newly created live subagents (`Math.abs(event.timestampMs - activityTimestampMs) < 15_000`), updated `resolveCharacterTargetSlot` to initialize newly spawned subagent walkers adjacent to their parent's walker position, and removed unconditional `ignoreStoredIntent` / `ignoreStoredLabel` overrides in `src/web/station-and-workflow-routing.ts`.
