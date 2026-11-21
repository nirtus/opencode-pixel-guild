# 04: Summon Adventurer Modal & Single Reducer Sink Alignment

Type: task
Label: wayfinder:task
Status: resolved
Blocked by: 02, 03

## Question

How should developers summon a brand-new root session ("Summon Adventurer") from the Guild Master Ledger or Top Bar, and how do we ensure that both `POST /api/guild/command` and `POST /api/guild/preset` mutate the existing `activeReducer` in place so SSE subscribers and `options.reducer` never experience a split-brain reducer reference?

## Specification

### 1. Summon Adventurer Modal & Ledger Trigger (`src/web/summon-adventurer-controller.ts` & `src/web/ledger-panel-reconciler.ts`)
- Add a **✨ Summon Adventurer** button in the Guild Master Ledger header (`src/web/ledger-panel-reconciler.ts`) and in the top bar controls (`src/web/app.html`).
- Create `src/web/summon-adventurer-controller.ts` (~180 lines) managing the `#summon-adventurer-modal` overlay in `src/web/app.html`:
  - **Project / Workshop Room Directory**: Defaults to the currently active room's `locationDirectory` (with a selector for discovered project rooms).
  - **Adventurer Title**: Optional session title (e.g., `"Feature Builder"`, `"Bug Hunter"`).
  - **Agent Class**: Selector for `build`, `plan`, `explore`, `general` (or discovered catalog agents).
  - **Initial Quest Scroll (Prompt)**: Optional initial prompt `<textarea>` with `@skill` support.
  - Submitting sends `POST /api/guild/command` with `{ command: "adventurer.summon", directory, title, agentClass, promptText }`, automatically selects the newly created `sessionId` in `clientState.selectedSessionId`, and triggers the character's `Entering` -> `Thinking` / `Arcane Lectern` choreography.

### 2. Single Reducer Sink Alignment (`src/server/main.ts` & `src/state/world-reducer.ts`)
- In `src/state/world-reducer.ts`, add a `reset(options?: { adapter?: TelemetryAdapterKind; daemonUrl?: string | null })` method on `WorldStateReducer` (or handle reset cleanly inside `adapter.switched` / `preset.activated`) so `activatePreset` in `src/server/main.ts` clears and replays events into the **same** `activeReducer` instance rather than reallocating `activeReducer = createWorldStateReducer(...)`.
- This guarantees that external callers holding `server.reducer` or `options.reducer` and all active SSE clients share a single unbroken state sink across preset switches, live daemon sweeps, and interactive `POST /api/guild/command` dispatches.

## Answer

Settled in Q4 of the design phase:
1. Developers can summon a new root session (`adventurer.summon`) from either the Top Bar or the Guild Master Ledger via `#summon-adventurer-modal` (`src/web/summon-adventurer-controller.ts`), which posts to `POST /api/guild/command`, spawns the new character in the target Workshop Room, and optionally dispatches its opening prompt.
2. `src/server/main.ts` preserves a single `WorldStateReducer` instance across its entire lifecycle so `POST /api/guild/command`, SSE broadcasts, and scenario presets never diverge.
