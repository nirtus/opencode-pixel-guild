# Feature Specification: Break Lounge Multi-Zone Space Filling & One-Third Visible Overflow Crowding

## 1. Overview & Problem Statement

In the `800×720` **Workshop Room**, the **Break Lounge** (`x: 452..755, y: 536..692`) contains four painted fixtures (`paintCompactBreakLoungeStation` in `src/web/canvas-station-painter.ts`):
1. **Crimson Carpet & Round Tavern Table**: centered at `(622, 632)`, table radius `36.5px`, carpet radius `57px` (`x: 565..679, y: 575..689`).
2. **Green Lounge Armchair**: `x: 480..522, y: 592..634` (`center: 501, 613`).
3. **Hearth Fireplace**: `x: 576..652, y: 536..564` (`center: 614, 550`).
4. **Ale Barrel Rack**: `x: 716..740, y: 570..668` (`center: 728, 619`).

Previously, `resolveCharacterTargetSlot` (`src/web/station-and-workflow-routing.ts`) assigned resting **Guild Adventurers** via `LOUNGE_SEAT_SLOTS[loungeSeatIndex % LOUNGE_SEAT_SLOTS.length]` with **zero overflow offset** and shared vertical `x` columns (`x = 622`, `x = 572`, `x = 672`), causing characters in the **Break Lounge** to occlude each other or land on the exact same `(x, y)` coordinates (`100%` occlusion) once `loungeSeatIndex >= 12`.

## 2. Requirements & Invariants

1. **Fill All Available Break Lounge Space First (Before Any Stacking)**:
   - Resting **Guild Adventurers** must first occupy all `20` distinct, non-overlapping positions across the **Break Lounge** (`x: 458..746, y: 540..690`):
     - **Tier 1 (`0..10`) — Three Vertically-Cleared Bands (`y = 542`, `y = 612`, `y = 686`, `>= 56px` pairwise distance)**:
       - Around the **Crimson Carpet & Round Tavern Table**: West `(556, 612)` facing `east`, East `(684, 612)` facing `west`, South `(628, 686)` facing `north`, and North `(616, 564)` facing `south` (with distinct `x` coordinates `616` vs `628` and the empty Round Table at `(622, 632)` between them).
       - Beside the **Green Lounge Armchair**: `(476, 610)` facing `east` and `(516, 686)` facing `north`.
       - Flanking the **Hearth Fireplace**: `(536, 542)` facing `south`, `(696, 542)` facing `south`, and `(462, 542)` facing `south`.
       - Beside the **Ale Barrel Rack**: `(708, 686)` facing `north` and `(742, 608)` facing `west`.
     - **Tier 2 (`11..19`) — Secondary Honeycomb Gaps Around Carpet & Lounge Fixtures**:
       - Diagonal carpet corners (`(582, 576)`, `(658, 576)`, `(576, 652)`, `(666, 652)`) and secondary fixture gaps (`(502, 572)`, `(464, 654)`, `(578, 540)`, `(656, 540)`, `(742, 564)`).
   - All `20` primary **Break Lounge** slots have pairwise center-to-center distance `>= 26px` and never share an `(x, y)` coordinate.

2. **Overflow Stacking Only After All Available Lounge Space Is Filled (`>= 1/3` Body Visible Behind)**:
   - Overflow stacking (`overflowTier = Math.floor(loungeSeatIndex / LOUNGE_SEAT_SLOTS.length) >= 1`) activates **only when all 20 primary Break Lounge slots are already occupied** (`loungeSeatIndex >= 20`).
   - When `overflowTier >= 1`, `resolveLoungeSeatSlot(loungeSeatIndex)` offsets the character behind/beside the base slot (`baseSlot = LOUNGE_SEAT_SLOTS[loungeSeatIndex % LOUNGE_SEAT_SLOTS.length]`):
     - Vertical step `dy = -22 * overflowTier` (smaller `y` places the overflow character **behind** the front character via `app-main.ts` Y-depth sorting, exposing `~34%` of the `64px` character height above the front character's head/shoulders).
     - Horizontal step `dx = (overflowTier % 2 === 1 ? 16 : -16) * Math.ceil(overflowTier / 2)` (exposing `~38%` of the `42px` character width to the side).
     - Clamped within the **Break Lounge** bounds (`x: 458..746, y: 540..690`) while guaranteeing Euclidean distance `>= 18px` (`>= 1/3` sprite visibility) from the front occupant.

3. **Sticky Break Lounge Seat Allocation & Zero Mid-Rest Shuffling (`src/web/station-geometry-catalog.ts` & `src/web/station-and-workflow-routing.ts`)**:
   - **Root Cause**: Previously, `resolveCharacterTargetSlot` cleared `existingWalker.assignedStation = undefined; existingWalker.assignedSlotIdx = undefined;` for resting/archived characters and indexed `resolveLoungeSeatSlot(loungeSeatIndex)` by raw loop counter `loungeSeatIndex` across `getVisibleProjectCharacters()`. Whenever an active character finished a turn (sorting ahead of older resting characters by `lastActivityAtMs`), or when `syncOperatorAuthGate` / `reconcileTopBar` hydrated `selectedProjectId` or `rosterMode` (`"active-squads"` → `"full-lineage"`), newly-ordered characters at the front of `chars` were assigned `loungeSeatIndex = 0, 1, 3` (`(556, 612)`, `(684, 612)`, `(616, 564)`), while existing walkers already sitting at those seats were ignored by `enqueueStationJob` (`tail.station === "Lounge"` treated `isSameJob = true` without updating `tail.x / tail.y`). Multiple characters consequently shared identical `(targetX, targetY)` coordinates in the **Break Lounge**.
   - **Requirement**:
     - Export `allocateLoungeSeatSlot` (or route `"Lounge"` through sticky reservation-aware slot allocation in `src/web/station-geometry-catalog.ts` and `src/web/station-and-workflow-routing.ts`):
       - If a walker already has `walker.assignedStation === "Lounge"` and a valid `walker.assignedSlotIdx` that has not yet been claimed in the current frame (`!stationOccupantCounts.has("SlotClaim:Lounge:" + walker.assignedSlotIdx)`), it **retains its sticky `assignedSlotIdx`** (`resolveLoungeSeatSlot(chosenIdx)`).
       - Before assigning a seat to a character without a sticky `"Lounge"` seat, collect all `assignedSlotIdx` values held by other walkers currently resting/archived in `"Lounge"` into a `reserved` set, and pick the lowest unclaimed, unreserved seat index (`0, 1, 2, ...`).
       - Record `stationOccupantCounts.set("SlotClaim:Lounge:" + chosenIdx, 1)` and increment `stationOccupantCounts.get("Lounge")` so `allocateStationPerimeterSlot` and `resolveCharacterTargetSlot` never assign duplicate **Break Lounge** seats.

4. **Stationary Resting Pose Invariant & Personal-Space Anchoring (`src/web/client-choreography.ts` & `src/web/walker-separation.ts`)**:
   - **Root Cause**:
     1. When two characters shared or came within `24px` (`MIN_WALKER_SEPARATION_PX`) of a **Break Lounge** coordinate, `enforceWalkerPersonalSpace` (`src/web/walker-separation.ts`) pushed their `currentX, currentY` away from `targetX, targetY` by `weight = 0.5` (or `0.15` when passed by a moving walker) without updating `targetX, targetY`. On the next frame, `stepClientChoreography` saw `Math.hypot(walker.targetX - walker.currentX, walker.targetY - walker.currentY) > 3`, immediately flipping `walker.isWalking = true` (`pose-walk` animation + dashed walking path line) in a permanent oscillation loop.
     2. When `rosterMode` or `selectedProjectId` hydrated after Frame 1 (`hadExistingWalkersAtStepStart === true`), `shouldEnterViaSouthDoor` (`src/web/client-choreography.ts:185-190`) falsely triggered for newly-revealed `RestingInLounge` and `Archived` characters, spawning them at `SOUTH_GUILD_DOOR_ENTRANCE (400, 692)` and marching them into the **Break Lounge** in `walk` animation.
     3. `applyInTransitSteeringAvoidance` (`STEERING_AVOIDANCE_RADIUS_PX = 28px`) deflected characters walking into the **Break Lounge** away from already-seated neighbors within `28px` of their target seat, preventing clean arrival (`dist <= 3`).
   - **Requirements**:
     - **No South-Door Stampede for Resting/Archived Characters**: In `stepClientChoreography` (`src/web/client-choreography.ts`), `shouldEnterViaSouthDoor` must only trigger when `c.lifecycleState === "Entering" || c.sessionId === getLastSummonedSessionId() || (hadExistingWalkersAtStepStart && newlyArrivedSessionIds.has(c.sessionId) && c.lifecycleState !== "RestingInLounge" && c.lifecycleState !== "Archived" && slot.station !== "Lounge")`. Historical or idle characters revealed in the **Break Lounge** must initialize directly at their assigned seat with `isWalking = false`.
     - **Sync Lounge Slot Coordinates on `enqueueStationJob`**: In `enqueueStationJob` (`src/web/client-choreography.ts`), when `isSameJob` is `true` and `candidate.station === "Lounge"`, update `tail.x = candidate.x; tail.y = candidate.y; tail.facingDirection = candidate.facingDirection;`. If `tail === walker.resolvedSlot` and `queue.length === 0`, keep a stationary lounge walker locked at `currentX = targetX = candidate.x, currentY = targetY = candidate.y, isWalking = false` (or update `targetX, targetY` if actively walking from another station).
     - **Immovable Anchored Walkers in `enforceWalkerPersonalSpace`**: In `enforceWalkerPersonalSpace` (`src/web/walker-separation.ts`), if both walkers are anchored (`a.isAnchored && b.isAnchored`, i.e. `!w.isWalking`), `continue` without displacing either walker from its slot. If one walker is anchored (`a.isAnchored && !b.isAnchored`), set `weightA = 0, weightB = 1` so only the moving walker yields and stationary resting/working characters are **never** pushed off their `(targetX, targetY)` coordinate into `dist > 3` (`isWalking = true`).
     - **Clean Target Landing in `applyInTransitSteeringAvoidance`**: When a walking character is within `36px` of its own `(walker.targetX, walker.targetY)`, scale steering repulsion down to `0` (`Math.max(0, Math.min(1, (distToTarget - 6) / 30))`) so arriving characters cleanly snap onto their **Break Lounge** seat (`dist <= 3`, `isWalking = false`).

5. **Container Deployment & Verification**:
   - Per `docs/agents/container-deployment.md`, the implementation must be deployed to and tested against the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`), verified with `npm test`, and visually inspected via headless Chrome screenshot.
