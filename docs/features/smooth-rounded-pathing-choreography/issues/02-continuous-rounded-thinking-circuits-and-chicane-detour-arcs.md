# 02: Continuous Rounded Thinking Plaza Circuits & 3-Point Smooth Chicane Crowd Detours

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01

## Specification

Implement **Decision 4 (`Q4`)** from [Specification: Smooth, Rounded Turn Trajectories, Continuous Arc-Length Stepping & Hysteresis-Stabilized Directional Turnaround](../spec.md):

1. **Continuous Rounded `Thinking` Plaza Circuits (`src/web/thinking-roam-circuits.ts` & `src/web/client-choreography.ts`)**:
   - Keep `resolveThinkingRoamCircuit` returning the 5 plaza waypoints (preserving horizontal, vertical, and diagonal segments outside `GOAL_ASSEMBLY_OBSTACLE_BOX`).
   - Update `advanceThinkingRoamLeg(walker, pacingSide, sessionId, chamberCtx)` so in addition to `{ x, y, facingDirection }`, it computes a corner-filleted waypoint sequence (`waypoints: ReadonlyArray<{ x: number; y: number }>`) that rounds the turn between the incoming plaza leg and the next plaza leg (using `filletWaypointPolyline` outside `resolveProportionalAssemblyObstacleBox`).
   - Implement a lookahead handoff helper (e.g. `stepThinkingRoamLookahead` in `src/web/thinking-roam-circuits.ts`) called from `stepClientChoreography` before `stepCharacterToilQueue`: when a `Thinking` character is actively roaming on an Assembly plaza (`walker.hasReachedAssemblyPacing && activeSlot.station === "Assembly" && !activeSlot.isActing && activeSlot.pacingSide && c.lifecycleState === "Thinking" && queue.length === 0`) and `Math.hypot(walker.targetX - walker.currentX, walker.targetY - walker.currentY) <= 18`, advance immediately to the next rounded roam leg and append its filleted waypoints into `walker.waypoints` so the character continues walking smoothly around the bend without ever dropping to `isWalking = false` or stopping at a polygon vertex.

2. **3-Point Smooth Chicane Crowd Detours (`src/web/walker-separation.ts` & `src/encounter/path-curve-fillet.ts`)**:
   - In `resolveDynamicDetourWaypoints`, replace the 1-point perpendicular spike (`walker.waypoints = [chosen, ...walker.waypoints]`) with a 3-point rounded chicane bypass arc (`[entryArcPt, apexPt, exitArcPt]`) built via `buildSmoothDetourChicaneArc`:
     - `entryArcPt` (`~0.45 * forwardMid` forward, `~0.55 * detourDist` lateral),
     - `apexPt` (`forwardMid` forward, `1.0 * detourDist` lateral),
     - `exitArcPt` (`min(cLen * 0.9, forwardMid * 1.55)` forward, `~0.55 * detourDist` lateral),
     clamped and validated against obstacle boxes (`isDetourValid`), falling back gracefully to `[apexPt]` if tight obstacle margins block the entry/exit shoulder points.
   - Remove the abrupt mid-walk waypoint truncation at `distToFinalTarget <= 62` so active bypass arcs finish smoothly without snapping heading, and keep `src/web/walker-separation.ts` and `src/web/client-choreography.ts` well below the 400-line ceiling (`<= 385` lines each).

## Verification

- Run `npm test` and verify that `Thinking` characters cycle continuously through all plaza legs without stopping at vertices and that opposing walkers in `resolveDynamicDetourWaypoints` follow smooth opposite-side chicane arcs around blockers while maintaining `>= 36px` separation.

## Answer

- Updated `advanceThinkingRoamLeg` in `src/web/thinking-roam-circuits.ts` to return corner-filleted curve waypoints (`filletWaypointPolyline`) rounding the transition between consecutive plaza legs, and wired `<= 18px` lookahead handoff in `stepClientChoreography` (`src/web/client-choreography.ts`) so `Thinking` characters roam continuously without stopping at polygon vertices.
- Updated `resolveDynamicDetourWaypoints` in `src/web/walker-separation.ts` to insert a 3-point smooth chicane bypass arc (`buildSmoothDetourChicaneArc`: `entryPt → apexPt → exitPt`) around blocking characters while keeping `src/web/walker-separation.ts` and `src/web/client-choreography.ts` safely below the 400-line ceiling.
- Verified with `npm test` (`243/243` tests passing) and live Docker container deployment (`opencode-pixel-guild-visualizer` on port `4310`, `docs/images/smooth-rounded-pathing-choreography.png`).
