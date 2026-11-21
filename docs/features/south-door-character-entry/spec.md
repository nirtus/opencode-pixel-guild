# Feature Specification: South Guild Door Character Entry Choreography

## 1. Overview & Problem Statement

In the `800×720` **Workshop Room**, the **South Swinging Guild Door** is painted on the bottom perimeter wall at `x: 368..432, y: 692..720` (doorway center `(400, 692)`, swinging inward with a dashed arc in `src/web/canvas-room-painter.ts`).

Currently, when a new root **Guild Adventurer** is spawned (via `+ Summon Adventurer`, OpenCode CLI/TUI session creation, SSE `session.upserted`, or live daemon discovery), the character does **not** enter through the bottom door. Instead, four compounding defects cause it to materialize out of another character or at an arbitrary coordinate inside the room:

1. **In-Place Teleport on Walker Creation (`src/web/station-and-workflow-routing.ts:341-350` & `src/web/client-choreography.ts:164-173`)**:
   - When `walker` is first created for a root character (`!isSubagent`), `walker.currentX` and `walker.currentY` are set directly to `resolvedX` and `resolvedY` (`walker.targetX` and `walker.targetY`), yielding `dist = 0` and `isWalking = false`.
2. **Bogus Station Assignment During `"Entering"` (`src/web/station-and-workflow-routing.ts:239, 263` & `src/web/client-choreography.ts:227`)**:
   - New characters start in `lifecycleState: "Entering"` for `600ms` (`createCharacterDefaultState` in `src/state/reducer-helpers.ts:301`).
   - Because `isThinkingPacing` only checks `c.lifecycleState === "Thinking"`, an `"Entering"` character with no active tool falls through to `resolveCanonicalPreparationStation`, which defaults to `"Enchanter"` (`(206, 526)`) for `build` agents or `"Spyglass"` (`(380, 108)`) for `plan`/`explore`/`document` agents.
   - The new character spawns right on top of or beside whatever character is at `"Enchanter"` or `"Spyglass"`, locks into that station job, and `600ms` later walks out from that character toward the central **Goal Assembly Site** — visually appearing to spawn out of another character.
3. **Premature `knownSessionIds` Registration & Immediate `"Thinking"` Transition (`src/web/client-choreography.ts:126-138` & `src/server/command-router.ts:201-221`)**:
   - `stepClientChoreography` adds every character in `chars` to `clientState.knownSessionIds` *before* the walker loop runs.
   - When a character is summoned with an initial prompt (`adventurer.summon`), `command-router.ts` dispatches `session.upserted` (`"Entering"`) followed immediately by `message.user.prompt` (`"Thinking"`). By the time the browser receives the snapshot, `lifecycleState` is already `"Thinking"`, so `resolveCharacterTargetSlot` places the new character directly onto an `ASSEMBLY_PACING_SIDES` corner (`(305, 470)`, `(475, 470)`, `(305, 210)`, `(240, 280)`) right on top of another pacing character.
4. **Doorway-to-Corridor Furniture Clipping (`src/encounter/toil-queue.ts:89-145`)**:
   - The **Resource Stockpile** table (`x: 306..430, y: 584..672`) sits immediately north of the South Swinging Guild Door (`(400, 692)`). `computeIndoorCorridorLeg` only avoids `GOAL_ASSEMBLY_OBSTACLE_BOX` (`x: 280..500, y: 250..430`), so a straight line from `(400, 692)` to northern destinations clips straight through the **Resource Stockpile** table.

## 2. Requirements & Invariants

1. **Canonical South Guild Door Entrance Coordinate (`src/web/station-geometry-catalog.ts`)**:
   - Export `SOUTH_GUILD_DOOR_ENTRANCE = Object.freeze({ x: 400, y: 692, facingDirection: "north" as const })` and `SOUTH_DOOR_FOYER_WAYPOINT = Object.freeze({ x: 444, y: 556, facingDirection: "north" as const })`.
2. **Spawn New Root Characters at the South Guild Door (`src/web/station-and-workflow-routing.ts` & `src/web/client-choreography.ts`)**:
   - A root **Guild Adventurer** (`!isSubagent`) creating its walker for the first time must spawn at `SOUTH_GUILD_DOOR_ENTRANCE` (`currentX = 400, currentY = 692, facingDirection = "north"`) and walk (`isWalking = true`) to its target slot whenever:
     - `c.lifecycleState === "Entering"`, OR
     - `c.sessionId === getLastSummonedSessionId()`, OR
     - The room already has active walkers (`clientState.characterWalkers.size > 0` before this character's walker is created) and `!clientState.knownSessionIds.has(c.sessionId)`.
   - Pre-existing characters hydrated on the very first frame of a fresh room (`clientState.characterWalkers.size === 0` at the start of the frame, `c.lifecycleState !== "Entering"`, and `c.sessionId !== getLastSummonedSessionId()`) continue to initialize in-place at their station or **Break Lounge** slot so historical sessions do not stampede through the door on page reload.
   - Child **Squad Subagents** (`isSubagent === true`) continue to materialize at `PENTAGRAM_CENTER` (`(206, 624)`).
3. **No Bogus `"Enchanter"` / `"Spyglass"` Detour During `"Entering"` (`src/web/station-and-workflow-routing.ts` & `src/web/client-choreography.ts`)**:
   - When `c.lifecycleState === "Entering"` and the character has no active tool, no Quest Gate, no Armory equip, and no explicit `activeWorkstation`, `resolveCharacterTargetSlot` must target `SOUTH_DOOR_FOYER_WAYPOINT` (`x: 444, y: 556`, `station: "Lounge"`, `overheadLabel: "Entering Hall"`, `facingDirection: "north"`, `isActing: false`) rather than routing to `"Enchanter"` or `"Spyglass"`.
   - `enqueueStationJob` in `src/web/client-choreography.ts` must not enqueue non-acting `"Entering Hall"` slots (`!candidate.isActing`), and `isLockedInStationJob` must not lock a character into a non-acting doorway foyer transition once its state transitions to `"Thinking"`, `"WorkingAtStation"`, or `"RestingInLounge"`.
   - While a newly spawned character is walking from `SOUTH_GUILD_DOOR_ENTRANCE` `(400, 692)` toward its initial `Assembly` pacing slot (`!walker.hasReachedAssemblyPacing && walker.isWalking`), `resolveCharacterTargetSlot` must keep `walkerPace.pacingSide` and `walkerPace.pacingLeg` locked so the target coordinate does not jump mid-walk.
4. **Doorway Obstacle Avoidance Around Resource Stockpile (`src/encounter/toil-queue.ts`)**:
   - When `computeRingCorridorWaypoints(fromX, fromY, toX, toY)` routes from or to the South Guild Door threshold (`fromY >= 675 && fromX >= 340 && fromX <= 450`), it must step through the clear doorway corridor beside the **Resource Stockpile** (`{ x: 444, y: 668 } -> { x: 444, y: 556 }` when heading north/east, or `{ x: 292, y: 668 } -> { x: 292, y: 556 }` when heading west to `Enchanter` / `Armory` / `Tinker`) before computing the indoor ring-corridor leg around `GOAL_ASSEMBLY_OBSTACLE_BOX`.
5. **Container Deployment & Verification**:
   - Per `docs/agents/container-deployment.md`, deploy to and verify on `opencode-pixel-guild-visualizer` (`npm run docker:up` on port `4310`), run `npm test`, and capture visual proof in `docs/images/south-door-character-entry.png`.
