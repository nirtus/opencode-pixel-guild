# 01: Distance-Integrated Stride Phase, Subagent Stature Scaling & Zero-Speed Stagger Guard

Type: task
Label: wayfinder:task
Status: resolved
Blocked by: None

## Question

How should `stepClientChoreography` and `walker-separation.ts` advance `walker.walkCycle` so character walking animation speed is strictly proportional to actual per-step displacement (`Δs`), accounts for `0.7x` `Squad Subagent` stature without foot skating, and never runs in place during `departureUntilMs` stagger—while keeping `src/web/client-choreography.ts` (`<= 400` lines) clean and modular?

## Specification

Confirmed in Grilling Round 1 (`Q1`, `Q2`, `Q4`) and [Specification: Velocity-Proportional Character Stride Animation & Phase-Locked Locomotion](./../spec.md):
- **Pure Stride Phase Seam (`src/web/walker-separation.ts`)**:
  - Export `WALK_CYCLE_UNITS_PER_PX = 12 / 155` (`0.012 * 1000 / 155`).
  - Export `STRIDE_CYCLE_WALK_UNITS = 6` (`77.5 px` per full two-step stride cycle for a root adventurer).
  - Export `SUBAGENT_STRIDE_SCALE = 0.7`.
  - Export `advanceWalkerStrideCycle(currentWalkCycle: number, distancePx: number, isSubagent = false): number`:
    - Returns `currentWalkCycle` unchanged when `distancePx <= 0.01` or `!Number.isFinite(distancePx)`.
    - Otherwise advances `currentWalkCycle + (distancePx * WALK_CYCLE_UNITS_PER_PX) / (isSubagent ? SUBAGENT_STRIDE_SCALE : 1)`.
  - Export `resolveWalkStrideAnimPhase(walkCycle: number): { animPhase: number; animBucket12: number; bobOffsetY: number }`:
    - Computes normalized cycle phase `animPhase = (((walkCycle / STRIDE_CYCLE_WALK_UNITS) % 1) + 1) % 1` in `[0, 1)`.
    - Computes `animBucket12 = Math.floor(animPhase * 12) % 12` (`0..11`).
    - Computes phase-locked vertical footstep bob `bobOffsetY = Math.sin(animPhase * Math.PI * 4) * 2.2` (2 footstep bobs per full left-right stride cycle).
- **Choreography Integration (`src/web/client-choreography.ts`)**:
  - Apply `walker.walkSpeedMultiplier` consistently whenever `walker.walkSpeedMultiplier` is set (removing the `chars.length > 1` branch that ignored `walkSpeedMultiplier` for single characters).
  - In the `if (dist > 3)` walking block:
    - If `walker.departureUntilMs && nowMs < walker.departureUntilMs`, set `walker.isWalking = false` before `continue` so a staggered character stands still instead of jogging in place at `0 px/s`.
    - Compute actual displacement `stepDistPx = Math.hypot(walker.currentX - prevX, walker.currentY - prevY)` after stepping and steering avoidance.
    - Set `walker.isWalking = stepDistPx > 0.01` and `walker.walkCycle = advanceWalkerStrideCycle(walker.walkCycle, stepDistPx, isSubagent)`.

## Acceptance Criteria

- [x] Root `Guild Adventurer` moving at `155 px/s` (`31 px` in `200ms`) advances `walkCycle` by `2.4`; at `77.5 px/s` (`15.5 px` in `200ms`) advances `walkCycle` by `1.2`; and at any `walkSpeedMultiplier` (`0.88x–1.12x`) scales `walkCycle` strictly in proportion to actual distance traveled.
- [x] `Squad Subagent` (`isSubagent = true`, `0.7x` scale) moving the same distance advances `walkCycle` by `1 / 0.7` (`~1.43x`) so its shorter legs step proportionally faster without skating.
- [x] While `nowMs < walker.departureUntilMs` or `stepDistPx <= 0.01`, `walker.isWalking` is `false` and `walker.walkCycle` does not advance.
- [x] Every file in `src/` remains `<= 400` lines.

## Answer

Implemented the pure locomotion stride seam in `src/web/walker-separation.ts` (`WALK_CYCLE_UNITS_PER_PX = 12 / 155`, `STRIDE_CYCLE_WALK_UNITS = 6`, `SUBAGENT_STRIDE_SCALE = 0.7`, `advanceWalkerStrideCycle`, and `resolveWalkStrideAnimPhase`) and wired `stepClientChoreography` in `src/web/client-choreography.ts` to:
1. Apply `walker.walkSpeedMultiplier` consistently for any walking character,
2. Set `walker.isWalking = false` while waiting for `departureUntilMs` stagger (`0 px/s`), and
3. Measure actual per-step displacement `stepDistPx = Math.hypot(walker.currentX - prevX, walker.currentY - prevY)` and advance `walker.walkCycle = advanceWalkerStrideCycle(walker.walkCycle, stepDistPx, isSubagent)`.
