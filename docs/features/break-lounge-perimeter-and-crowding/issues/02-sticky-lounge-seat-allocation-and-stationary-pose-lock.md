# Issue 02: Sticky Break Lounge Seat Allocation & Stationary Pose Lock (Zero Walking Oscillation or Seat Overlap)

Type: bug
Label: ready-for-agent
Status: open

## Symptom & Diagnosis (`@diagnosing-bugs`)

In the live containerized visualizer (`docs/images/job-based-character-looks.png` and `docs/images/break-lounge-perimeter-and-crowding.png`), characters inside the **Break Lounge** exhibit two compounding bugs:
1. **Some resting characters are stuck in a perpetual walking animation (`pose-walk` + dashed orange route line)** while inside the **Break Lounge**.
2. **Some resting/archived characters cover each other (`100%` horizontal/vertical seat collision at `Slot 0 (556, 612)` and `Slot 3 (616, 564)`)** while other primary **Break Lounge** seats (`Slot 6..19`) remain completely empty.

### Root Causes Verified Against Code Paths

1. **Non-Sticky `loungeSeatIndex` Allocation (`src/web/station-and-workflow-routing.ts:158-178`)**:
   - `resolveCharacterTargetSlot` wipes `existingWalker.assignedStation = undefined; existingWalker.assignedSlotIdx = undefined;` for every `RestingInLounge` / `Archived` character and assigns `resolveLoungeSeatSlot(loungeSeatIndex)` by raw array iteration counter `loungeSeatIndex = 0, 1, 2...`.
   - Whenever `getVisibleProjectCharacters()` changes order — such as when an active character finishes a turn and transitions to `RestingInLounge` (sorting ahead of older resting characters by `lastActivityAtMs`), or when `syncOperatorAuthGate` / `reconcileTopBar` hydrates `selectedProjectId` or `rosterMode: "full-lineage"` after Frame 1 — newly-ordered characters at the front of `chars` are assigned `loungeSeatIndex = 0, 1, 3` (`(556, 612)`, `(684, 612)`, `(616, 564)`), which are **already occupied** by existing walkers.
2. **`enqueueStationJob` Drops Coordinate Updates When `station === "Lounge"` (`src/web/client-choreography.ts:206-227`)**:
   - When an existing walker's `loungeSeatIndex` shifts from `0` to `6`, `enqueueStationJob` checks `tail.station === candidate.station` (`"Lounge" === "Lounge"`), evaluates `isSameJob = true`, and **never updates `tail.x`, `tail.y`, `walker.targetX`, or `walker.targetY`**.
   - Consequently, the existing walker remains at `targetX = 556, targetY = 612` (`Slot 0`) while the newly-ordered character also targets `(556, 612)`.
3. **`enforceWalkerPersonalSpace` Pushes Stationary Walkers Off Target, Triggering Infinite `dist > 3 => isWalking = true` Oscillation (`src/web/walker-separation.ts:182-242` & `src/web/client-choreography.ts:321`)**:
   - At the end of every frame, `enforceWalkerPersonalSpace` pushes any two walkers within `MIN_WALKER_SEPARATION_PX (24px)` apart (`±12.4px` from their shared `(556, 612)` or `(616, 564)` target, or by `weight = 0.15` when a moving walker passes a seated character) by mutating `walker.currentX, walker.currentY` without updating `walker.targetX, walker.targetY`.
   - On the very next frame (`src/web/client-choreography.ts:321`), `Math.hypot(walker.targetX - walker.currentX, walker.targetY - walker.currentY)` is `12.4px > 3px`, so `stepClientChoreography` sets `walker.isWalking = true` (`pose-walk` animation + dashed walking path) and steps the character `2.5px` back toward `(targetX, targetY)`, only for `enforceWalkerPersonalSpace` to push it back out to `12.4px` at the end of the frame — trapping both characters in an infinite walking animation loop on top of each other.
4. **`shouldEnterViaSouthDoor` Stampede on Roster/World Hydration (`src/web/client-choreography.ts:185-201`)**:
   - When Frame 1 renders with `characterWalkers.size > 0` (`hadExistingWalkersAtStepStart = true`) and a subsequent frame reveals `RestingInLounge` or `Archived` characters (via `syncOperatorAuthGate` preference hydration, `rosterMode` toggle to `All`, or project world switch), `shouldEnterViaSouthDoor` triggers for those idle/archived characters and spawns them at `SOUTH_GUILD_DOOR_ENTRANCE (400, 692)` walking into the **Break Lounge**.

## Acceptance Criteria

1. **Sticky, Reservation-Aware Break Lounge Seat Allocator (`src/web/station-geometry-catalog.ts` & `src/web/station-and-workflow-routing.ts`)**:
   - Export `allocateLoungeSeatSlot` in `src/web/station-geometry-catalog.ts` (and call it from `resolveCharacterTargetSlot` in `src/web/station-and-workflow-routing.ts` when routing to `"Lounge"`):
     - Do **not** clear `existingWalker.assignedStation` / `existingWalker.assignedSlotIdx` when `existingWalker.assignedStation === "Lounge"`.
     - If `walker.assignedStation === "Lounge"` and `typeof walker.assignedSlotIdx === "number"` (`>= 0`) and `!stationOccupantCounts.has("SlotClaim:Lounge:" + walker.assignedSlotIdx)`, retain `chosenIdx = walker.assignedSlotIdx`.
     - Otherwise, build a `reserved` set of `otherW.assignedSlotIdx` across all other walkers in `allWalkers` whose `assignedStation === "Lounge"` and whose character is currently resting/archived in `"Lounge"`, then pick the lowest non-negative integer `i` (`0, 1, 2, ...`) that is neither claimed in `stationOccupantCounts` (`SlotClaim:Lounge:${i}`) nor in `reserved`.
     - Mark `stationOccupantCounts.set("SlotClaim:Lounge:" + chosenIdx, 1)` and increment `stationOccupantCounts.set("Lounge", (stationOccupantCounts.get("Lounge") ?? 0) + 1)`.
     - Persist `walker.assignedStation = "Lounge"` and `walker.assignedSlotIdx = chosenIdx` on the walker (creating the walker in `resolveCharacterTargetSlot` if needed so its seat reservation is immediately recorded in `clientState.characterWalkers`).
     - Return `resolveLoungeSeatSlot(chosenIdx)`.
2. **Keep Lounge Slot Coordinates Synchronized & Prevent South-Door Stampede for Idle/Archived Characters (`src/web/client-choreography.ts`)**:
   - In `shouldEnterViaSouthDoor` (`src/web/client-choreography.ts:185-190`), exclude characters that are already resting or archived in the **Break Lounge** (`c.lifecycleState !== "RestingInLounge" && c.lifecycleState !== "Archived" && slot.station !== "Lounge"`) unless `c.lifecycleState === "Entering"` or `c.sessionId === getLastSummonedSessionId()`.
   - In `enqueueStationJob` (`src/web/client-choreography.ts:206-227`), when `isSameJob` is `true` and `candidate.station === "Lounge"`, update `tail.x = candidate.x; tail.y = candidate.y; tail.facingDirection = candidate.facingDirection;`. If `tail === walker.resolvedSlot` and `queue.length === 0`:
     - If `!walker.isWalking`, snap `walker.currentX = candidate.x; walker.currentY = candidate.y; walker.targetX = candidate.x; walker.targetY = candidate.y; walker.facingDirection = candidate.facingDirection;`.
     - If `walker.isWalking`, update `walker.targetX = candidate.x; walker.targetY = candidate.y;`.
3. **Never Push Stationary Anchored Walkers Into `dist > 3` (`isWalking = true`) (`src/web/walker-separation.ts`)**:
   - In `enforceWalkerPersonalSpace`:
     - When both `a.isAnchored && b.isAnchored` (`!a.walker.isWalking && !b.walker.isWalking`), `continue` without modifying either walker's `currentX` or `currentY`.
     - When one walker is anchored and the other is not (`a.isAnchored && !b.isAnchored`), set `weightA = 0` and `weightB = 1` (and vice versa `weightA = 1, weightB = 0` when `!a.isAnchored && b.isAnchored`), so stationary resting/working characters are **never** pushed off their `(targetX, targetY)` coordinate.
   - In `applyInTransitSteeringAvoidance`:
     - Attenuate steering repulsion by `Math.max(0, Math.min(1, (Math.hypot(walker.targetX - walker.currentX, walker.targetY - walker.currentY) - 6) / 30))` when approaching `(walker.targetX, walker.targetY)` so arriving characters land cleanly on their target seat (`dist <= 3`, `isWalking = false`).
4. **Regression Tests & Docker Container Visual Verification (`tests/11-articulated-character-graphics-and-fx-overhaul.test.ts` & `docs/agents/container-deployment.md`)**:
   - Add regression tests in `tests/11-articulated-character-graphics-and-fx-overhaul.test.ts` proving that:
     1. When characters already resting in the **Break Lounge** are re-ordered (e.g. when an earlier character in `chars` transitions from `WorkingAtStation` to `RestingInLounge`, or when `selectedProjectId` / `rosterMode` changes across frames), existing resting characters retain their sticky **Break Lounge** seats without shuffling, newly-resting characters claim the next unoccupied **Break Lounge** seat (never colliding on `(556, 612)` or `(616, 564)`), and after arrival every resting character has `walker.isWalking === false` (`poseMode === "idle"`).
     2. Revealing `Archived` or `RestingInLounge` characters when switching `rosterMode` to `"full-lineage"` (`All`) after Frame 1 initializes them directly in their **Break Lounge** seats with `walker.isWalking === false` rather than marching them through the South Guild Door.
   - Deploy to the Docker container (`npm run docker:up` on port `4310`), verify `npm test`, capture `docs/images/break-lounge-perimeter-and-crowding.png` via headless Chrome, and visually confirm that all characters in the **Break Lounge** stand in stationary `idle` pose (`isWalking === false`, no dashed walking lines) in distinct non-overlapping seats around the carpet and lounge fixtures.
