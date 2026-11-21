# Feature Map: Smooth, Rounded Turn Trajectories, Continuous Arc-Length Stepping & Hysteresis-Stabilized Directional Turnaround

Label: wayfinder:map

## Destination

Deliver the complete architectural deepening and smooth-pathing choreography specification in [Specification: Smooth, Rounded Turn Trajectories, Continuous Arc-Length Stepping & Hysteresis-Stabilized Directional Turnaround](./spec.md) through three vertical-slice implementation tickets:
1. **[01: Obstacle-Safe Quadratic Bezier Corner Filleting & Continuous Arc-Length Toil Stepper](./issues/01-obstacle-safe-corner-filleting-and-continuous-toil-stepper.md)** (`Blocked by: None`)
2. **[02: Continuous Rounded Thinking Plaza Circuits & 3-Point Smooth Chicane Crowd Detours](./issues/02-continuous-rounded-thinking-circuits-and-chicane-detour-arcs.md)** (`Blocked by: 01`)
3. **[03: Smoothed Directional Turnaround Hysteresis, Regression Suite & Container Visual Proof](./issues/03-directional-turnaround-hysteresis-curved-trail-and-visual-proof.md)** (`Blocked by: 01, 02`)

## Notes

- **Mode**: Wayfinder charting & specification complete (`map.md`, `spec.md`, and tickets `01..03` created; `GLOSSARY.md` updated).
- **Architecture Review Reference**: [Architecture Review · Smooth & Rounded Pathing Choreography](../../architecture-review/architecture-review-20261106-smooth-rounded-pathing.html).
- **Domain**: **Toil Queue**, **Directional Turnaround**, **Stride Cadence**, **Guild Character**, **Workshop Room**, **Dungeon Wilds**, **Goal Assembly Site**, **Preparation Station**, **Resource Stockpile**, **Armory Wardrobe**.
- **Specification**: [Specification: Smooth, Rounded Turn Trajectories, Continuous Arc-Length Stepping & Hysteresis-Stabilized Directional Turnaround](./spec.md).
- **Skills to consult**: `codebase-design`, `domain-modeling`, `tdd`, `code-review`.
- **Standing Rules**: Work strictly inside the project root directory (`./`). Never create git worktrees or write files to `/tmp` or `/tmp/opencode`. Every source file in `src/` must remain `<= 400` lines. Deploy and verify on the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`) with visual proof in `docs/images/`.

## Decisions so far

- [Specification: Smooth, Rounded Turn Trajectories, Continuous Arc-Length Stepping & Hysteresis-Stabilized Directional Turnaround](./spec.md): Locked all five Grilling Round 1 decisions (`Q1–Q5`) and updated `GLOSSARY.md` (`Toil Queue` and `Directional Turnaround`):
  1. Extract `src/encounter/path-curve-fillet.ts` (`<= 240` lines) as the shared spatial curve-rounding module so `src/web/client-choreography.ts` and `src/web/walker-separation.ts` stay safely below the 400-line ceiling.
  2. Deepen `computeRingCorridorWaypoints` to fillet every interior corner (`A → B → C` around the **Goal Assembly Site**, unobstructed seeded doglegs, and East Wilderness Portal approaches) with obstacle-safe quadratic Bezier curves ($r = \min(44\text{ px}, 0.38 \cdot L_{\text{in}}, 0.38 \cdot L_{\text{out}})$, shrinking $r$ if needed to clear `GOAL_ASSEMBLY_OBSTACLE_BOX` and `RESOURCE_STOCKPILE_OBSTACLE_BOX`) while preserving unseeded 1-point direct segments.
  3. Deepen `stepCharacterToilQueue` with a continuous `while (wps.length > 0 && remainingBudget > 0)` arc-length carry-over loop so characters glide through intermediate curve points without losing frame movement budget while keeping projected floor path lines suppressed on the canvas.
  4. Deepen `Thinking` plaza circuits (`src/web/thinking-roam-circuits.ts`) with corner-filleted legs and `<= 18px` lookahead handoff so roaming characters never stop at polygon vertices, and replace single-point triangular detour spikes in `resolveDynamicDetourWaypoints` with 3-point smooth chicane bypass arcs (`entry tangent → lateral apex → exit merge`).
  5. Deepen `deriveFacingDirectionFromDelta(dx, dy, currentFacing?)` (`src/sprites/hero-vector-rig.ts`) with a `1.18` diagonal hysteresis deadband and smoothed velocity tangent in `stepClientChoreography` to eliminate 45° sprite orientation chatter on curves.
- [01: Obstacle-Safe Quadratic Bezier Corner Filleting & Continuous Arc-Length Toil Stepper](./issues/01-obstacle-safe-corner-filleting-and-continuous-toil-stepper.md): Created `src/encounter/path-curve-fillet.ts`, wired obstacle-safe quadratic Bezier corner filleting into `computeRingCorridorWaypoints`, and replaced single-vertex snap-and-stop stepping in `stepCharacterToilQueue` with continuous arc-length budget carry-over.
- [02: Continuous Rounded Thinking Plaza Circuits & 3-Point Smooth Chicane Crowd Detours](./issues/02-continuous-rounded-thinking-circuits-and-chicane-detour-arcs.md): Updated `advanceThinkingRoamLeg` to emit corner-filleted plaza legs with `<= 18px` lookahead handoff in `stepClientChoreography` (zero vertex stops) and replaced single-point detour spikes in `resolveDynamicDetourWaypoints` with 3-point smooth chicane bypass arcs (`buildSmoothDetourChicaneArc`).
- [03: Smoothed Directional Turnaround Hysteresis, Regression Suite & Container Visual Proof](./issues/03-directional-turnaround-hysteresis-curved-trail-and-visual-proof.md): Added `DIAGONAL_FACING_HYSTERESIS = 1.18` to `deriveFacingDirectionFromDelta`, smoothed walker velocity tangent (`smoothVx`, `smoothVy`) in `stepClientChoreography`, added `tests/32-smooth-rounded-pathing-choreography.test.ts` (`243/243` tests passing), and verified on the live `opencode-pixel-guild-visualizer` Docker container (`docs/images/smooth-rounded-pathing-choreography.png`).

## Not yet specified

<!-- All wayfinder fog has graduated into spec.md and tickets 01..03 -->

## Out of scope

- Changing character sprite dimensions (`72×85` base, `0.70x` subagent scale) or base walk speeds (`155 px/s` transit, `46.5 px/s` thinking-pacing).
- Modifying non-canvas HUD drawer tabs (`General`, `Hero`, `Ticker`).
