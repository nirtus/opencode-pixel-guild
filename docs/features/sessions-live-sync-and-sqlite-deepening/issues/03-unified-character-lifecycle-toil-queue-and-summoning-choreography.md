# 03: Unified Character Lifecycle, Toil Queue, Adjacent Summoning & Deterministic Station Slots

Type: grilling
Label: wayfinder:grilling
Status: resolved
Blocked by: 01, 02

## Question

How should **Guild Adventurer** and **Squad Subagent** birth, **Summoning Ritual** placement, **Armory Wardrobe** dwell, **Preparation Station** slot reservation, **Report Scroll** delivery, and **Break Lounge** retention be unified so characters walk in naturally, summon subagents beside them, never jump slots when another character acts, and never disappear prematurely after 30 minutes?

## Answer

Confirmed in Grilling Round 1 (`Q2`):
1. **South Guild Door Entry & Adjacent Summoning Ritual Spawn**:
   - When a new **Guild Adventurer** (`!c.parentId`) is first registered in `clientState.characterWalkers` (`src/web/station-and-workflow-routing.ts` & `src/web/client-choreography.ts`) while actively entering/working, initialize `currentX = 368, currentY = 692` (South Guild Door) and set `targetX = resolvedX, targetY = resolvedY` so the adventurer visibly walks along the ring corridor to its station.
   - When a new **Squad Subagent** (`Boolean(c.parentId)`) is first registered while active, initialize its walker adjacent to its parent's current walker position `(parentX + offsetX, parentY + offsetY)` and spawn a `1,200ms` `SummoningRitualFx` rune circle at the parent's position before walking to its target **Preparation Station**.
2. **Single Walker Creation & Deterministic Per-Session Slot Reservation**:
   - Fix `stepClientChoreography` (`src/web/client-choreography.ts:237–255`) so it re-reads `clientState.characterWalkers.get(c.sessionId)` *after* `resolveCharacterTargetSlot` runs, never overwriting the walker or wiping `walker.armoryUntilMs`.
   - Replace volatile array-index `occIdx` and `loungeSeatIndex` calculation with a deterministic per-session slot assignment (`hashSessionSlotIndex` / sticky seat reservation on `WalkerState`) so characters working at the same **Preparation Station** or resting in the **Break Lounge** never swap positions when `lastActivityAtMs` changes.
3. **Self-Expiring Ritual, Armory & Report Scroll Phases**:
   - Expire `char.summoningRitual.active` when `timestampMs >= summoningRitual.startedAtMs + summoningRitual.durationMs` both in `handleTimerTick` (`src/state/batch-reconciler.ts`) and in `deriveOverheadActionLabel` (`src/encounter/workflow-classifier.ts`) so `Summoning Squad` never sticks past `900ms`.
   - When a **Squad Subagent** in `ReportingScroll` reaches its parent walker (or after `1,800ms`), transition it cleanly to `RestingInLounge` / `Archived` so completed subagents deliver their **Report Scroll**, burst particles, and exit in `Active Squads` mode.
4. **Recent Root Adventurer Retention in Break Lounge**:
   - In `fetchDaemonLocationState` (`src/ingress/daemon-location-state.ts`) and `handleStreamReconnected` (`src/state/batch-reconciler.ts`), keep the room's most recent root **Guild Adventurer**s (up to 6 per room) in `RestingInLounge` (`isOpenInOpenCode = true`) rather than archiving every root session after 30 minutes, so a paired project room retains its resting party on the **Break Lounge** bench.

## Acceptance Criteria

- [x] New **Guild Adventurer**s walk in from the South Guild Door (`368, 692`) and new **Squad Subagent**s spawn on an adjacent tile beside their parent summoner with a self-expiring **Summoning Ritual** circle.
- [x] `stepClientChoreography` preserves `walker.armoryUntilMs` on newly created walkers and assigns stable station/lounge slots per `sessionId` without frame-to-frame slot jumping.
- [x] `Summoning Squad`, `Entering Hall`, `Distilling Mana`, and `Reporting Scroll` phases expire deterministically on schedule, and recent root **Guild Adventurer**s remain seated in the **Break Lounge** in `Active Squads` mode.
