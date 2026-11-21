# Issue 01: Spawn New Characters at South Guild Door & Route Around Stockpile

Type: bug
Label: ready-for-agent
Status: resolved

## Goal

Fix new root **Guild Adventurer** spawning (`src/web/station-geometry-catalog.ts`, `src/web/station-and-workflow-routing.ts`, `src/web/client-choreography.ts`, and `src/encounter/toil-queue.ts`) so newly created or entering characters always enter via the **South Swinging Guild Door** at the bottom of the **Workshop Room** (`(400, 692)`, facing `"north"`) and walk into the room, rather than spawning out of another character or at a random station/pacing coordinate.

## Acceptance Criteria

1. **South Guild Door Geometry Constants (`src/web/station-geometry-catalog.ts`)**:
   - Define and export:
     - `SOUTH_GUILD_DOOR_ENTRANCE = Object.freeze({ x: 400, y: 692, facingDirection: "north" as const })`
     - `SOUTH_DOOR_FOYER_WAYPOINT = Object.freeze({ x: 444, y: 556, facingDirection: "north" as const })`
   - Re-export both from `src/web/station-and-workflow-routing.ts`.
2. **Eliminate Bogus `"Entering"` Station Detour & Teleport-on-Spawn (`src/web/station-and-workflow-routing.ts`)**:
   - When `c.lifecycleState === "Entering"` and `!hasRunningTool && !isWaitingAtGate && !isEquippingAtArmory && !c.activeWorkstation`:
     - Return `{ x: SOUTH_DOOR_FOYER_WAYPOINT.x, y: SOUTH_DOOR_FOYER_WAYPOINT.y, station: "Lounge", role, workflowIntent, overheadLabel: "Entering Hall", facingDirection: "north", questMarker: null, carriedCargo: null, isActing: false }` instead of falling through to `"Enchanter"` (`(206, 526)`) or `"Spyglass"` (`(380, 108)`).
   - When `isThinkingPacing` is true and `walker.isWalking && !walker.hasReachedAssemblyPacing && walkerPace.pacingSide && typeof walkerPace.pacingLeg === "number"`, keep `pacingSide = walkerPace.pacingSide` and `paceLeg = walkerPace.pacingLeg` locked while the character walks from the South Door to the **Goal Assembly Site** pacing ring.
   - When `createdWalker` is `true` for a root character (`!isSubagent`) and `c.lifecycleState === "Entering"`, initialize `walker.currentX = SOUTH_GUILD_DOOR_ENTRANCE.x`, `walker.currentY = SOUTH_GUILD_DOOR_ENTRANCE.y`, `walker.facingDirection = "north"`, `walker.facingLeft = false`.
3. **Track New Session Arrivals Before Mutating `knownSessionIds` (`src/web/client-choreography.ts`)**:
   - Record `hadExistingWalkersAtStepStart = clientState.characterWalkers.size > 0` and `newlyArrivedSessionIds = new Set<string>()` before adding new `chars` to `clientState.knownSessionIds`.
   - A root character (`!isSubagent`) whose walker is created on this step must start at `SOUTH_GUILD_DOOR_ENTRANCE` (`(400, 692)`, `facingDirection: "north"`, `isWalking: true`, `waypoints: [...computeRingCorridorWaypoints(400, 692, slot.x, slot.y)]`) whenever:
     - `c.lifecycleState === "Entering"`, OR
     - `c.sessionId === getLastSummonedSessionId()`, OR
     - `hadExistingWalkersAtStepStart && newlyArrivedSessionIds.has(c.sessionId)`.
   - In `enqueueStationJob`, ignore non-acting slots (`if (!candidate.isActing) return;`) so `"Entering Hall"` foyer slots are not queued as station jobs.
   - Ensure `isLockedInStationJob` is `false` when `walker.resolvedSlot?.isActing === false`, so a character walking inward from the South Door smoothly redirects to `Assembly`, a `Preparation Station`, or `Break Lounge` as soon as its state updates.
4. **Doorway Corridor Pathing Around Resource Stockpile (`src/encounter/toil-queue.ts`)**:
   - Update `computeRingCorridorWaypoints(fromX, fromY, toX, toY)` so paths starting near the South Guild Door (`fromY >= 675 && fromX >= 340 && fromX <= 450`) route around the **Resource Stockpile** table (`x: 306..430, y: 584..672`) via `{ x: 292, y: 668 } -> { x: 292, y: 556 }` (when `toX < 310`) or `{ x: 444, y: 668 } -> { x: 444, y: 556 }` (otherwise) before joining the indoor ring corridor.
5. **Regression Tests & Docker Container Verification (`tests/11-articulated-character-graphics-and-fx-overhaul.test.ts`)**:
   - Add regression tests verifying:
     1. A new root **Guild Adventurer** in `lifecycleState: "Entering"` spawns at `SOUTH_GUILD_DOOR_ENTRANCE` `(400, 692)` facing `"north"` (never at `Enchanter` `(206, 526)` or `Spyglass` `(380, 108)`) and walks northward into the room without clipping through the **Resource Stockpile** box (`x: 306..430, y: 584..672`).
     2. A new root **Guild Adventurer** added while other characters are already working/pacing in the room (e.g., in `"Thinking"`, `"WorkingAtStation"`, or `"RestingInLounge"` state, or via `adventurer.summon`) spawns at `SOUTH_GUILD_DOOR_ENTRANCE` `(400, 692)` and walks to its target slot instead of spawning out of another character or teleporting onto an `Assembly` pacing corner.
   - Deploy to Docker (`npm run docker:up` on port `4310`), run `npm test`, and capture visual proof in `docs/images/south-door-character-entry.png`.
