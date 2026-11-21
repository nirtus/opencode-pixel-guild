# 03: Scene Tile Walker Proportional Stride Phase, Regression Tests & Container Visual Verification

Type: task
Label: wayfinder:task
Status: resolved
Blocked by: 01, 02

## Question

How should we align the tile-based scene walker (`src/scene/walker-stepper.ts` and `src/scene/frame-characters.ts`) with distance-integrated `stridePhase`, verify all velocity-proportional animation invariants in automated tests, and prove the live rendering on the `opencode-pixel-guild-visualizer` Docker container?

## Specification

Confirmed in Grilling Round 1 (`Q1–Q4`) and [Specification: Velocity-Proportional Character Stride Animation & Phase-Locked Locomotion](./../spec.md):
- **Scene Tile Walker Stepper (`src/scene/walker-stepper.ts` & `src/scene/frame-characters.ts`)**:
  - Export `STRIDE_RAD_PER_TILE = 0.018 / (4.2 / 1000)` (`~4.285714 rad/tile`) in `src/scene/walker-stepper.ts`.
  - Allow optional `speedTilesPerSec = 4.2` in `stepCharacterWalker` and accumulate actual `movedTiles` inside the `while (moveBudget > 0 && walker.waypoints.length > 0)` loop.
  - Advance `walker.stridePhase += (movedTiles / statureScale) * STRIDE_RAD_PER_TILE` (where `statureScale = (char.role === "Squad Subagent" || Boolean(char.parentId)) ? 0.7 : 1.0`), so `stridePhase` scales strictly with distance moved and Subagent stature, and advances by `0` when `movedTiles === 0`.
  - In `src/scene/frame-characters.ts`, phase-lock `bobOffsetY` when `isWalking` to `Math.abs(Math.sin(walker.stridePhase)) * -2.2` and `strideOffsetPx` to `Math.sin(walker.stridePhase) * 3.5`.
- **Automated Regression Suite (`tests/31-velocity-proportional-stride-animation.test.ts`)**:
  - Verify `advanceWalkerStrideCycle` and `stepClientChoreography` advance `walkCycle` strictly in proportion to movement speed (`77.5 px/s`, `155 px/s`, custom speeds, and per-character `walkSpeedMultiplier` values).
  - Verify `Squad Subagent` (`0.7x` scale) advances `walkCycle` and `stridePhase` at `1 / 0.7` (`~1.43x`) the rate of a root `Guild Adventurer` for the same distance traveled.
  - Verify zero-speed guard during `departureUntilMs` stagger (`isWalking === false`, `Delta walkCycle === 0`).
  - Verify `drawCharacterHero` phase-locks `bobY` (2 bobs per cycle) and 12-bucket SVG `pose-walk` frames to `walker.walkCycle` across slow, normal, and fast speeds without wall-clock `t` jumps.
  - Verify `stepCharacterWalker` in `src/scene/walker-stepper.ts` scales `stridePhase` proportionally with tile movement speed and subagent scale.
- **Docker Container Deployment & Visual Proof**:
  - Deploy to `opencode-pixel-guild-visualizer` on port `4310` (`npm run docker:up`), run `npm test`, capture `docs/images/velocity-proportional-stride-animation.png`, and visually inspect the rendered output.

## Acceptance Criteria

- [x] `stepCharacterWalker` advances `walker.stridePhase` proportionally to `movedTiles / statureScale` (`STRIDE_RAD_PER_TILE`).
- [x] `tests/31-velocity-proportional-stride-animation.test.ts` and the full `npm test` suite pass with every file in `src/` `<= 400` lines.
- [x] Live Docker container (`opencode-pixel-guild-visualizer` on port `4310`) is deployed, healthy, and verified via headless Chrome screenshot in `docs/images/velocity-proportional-stride-animation.png`.

## Answer

Updated `stepCharacterWalker` in `src/scene/walker-stepper.ts` to export `STRIDE_RAD_PER_TILE = 0.018 / (4.2 / 1000)` (`~4.285714 rad/tile`), accumulate actual `movedTiles` across waypoints without double-counting `dtMs`, and advance `walker.stridePhase += (movedTiles / statureScale) * STRIDE_RAD_PER_TILE` (`statureScale = 0.7` for `Squad Subagent`, `1.0` for `Guild Adventurer`). Added `tests/31-velocity-proportional-stride-animation.test.ts` (all 232 tests passing), deployed to the `opencode-pixel-guild-visualizer` Docker container on port `4310`, and verified the rendered output in `docs/images/velocity-proportional-stride-animation.png`.
