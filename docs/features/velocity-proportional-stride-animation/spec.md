# Specification: Velocity-Proportional Character Stride Animation & Phase-Locked Locomotion

## 1. Overview & Problem Statement

Previously, character walking animations were decoupled from actual character movement speed in several places:
1. **Wall-Clock Renderer Disconnection (`src/web/canvas-hero-painter.ts`)**: Although `stepClientChoreography` in `src/web/client-choreography.ts` accumulated `walker.walkCycle`, `drawCharacterHero` ignored `walker.walkCycle` and drove walking limb swing (`animBucket`) and vertical bounce (`bobY`) from global wall-clock time `t` (`timestampMs * 0.001`), with only a hardcoded `t * 0.5` check at the `Assembly` station.
2. **Mismatched Bob vs. Limb Frequencies & Coarse 6-Bucket Quantization (`src/web/canvas-hero-painter.ts`)**: `bobY` (`Math.sin(walkAnimT * 14) * 2.2`, `~2.23 Hz`) and `animBucket` (`Math.floor(walkAnimT * 6) % 6`, `1.0 Hz`) ran at non-harmonic frequencies, causing vertical footstep bounce to drift out of phase with leg swing, while 6 discrete SVG buckets per walk cycle dropped slow walking animations to `3 FPS`.
3. **Hardcoded Speed Branches & Subagent Foot Skating (`src/web/client-choreography.ts`)**: `walkCycle` incremented via a binary branch (`isThinkingPacingStep ? 0.006 : 0.012`) instead of scaling directly with actual per-step displacement $\Delta s = \text{hypot}(\Delta x, \Delta y)$, only applied `walkSpeedMultiplier` when `chars.length > 1`, and did not account for `Squad Subagent` stature (`SUBAGENT_SCALE_RATIO = 0.7`), causing smaller subagents to skate across the floor with oversized strides.
4. **Running in Place During Departure Stagger (`src/web/client-choreography.ts`)**: When a character waited for `departureUntilMs` (departure stagger), `walker.isWalking` was set to `true` before early `continue`, causing stationary characters (`0 px/s`) to jog in place.
5. **Fixed Time-Step Stride Phase in Scene Stepper (`src/scene/walker-stepper.ts`)**: `stepCharacterWalker` incremented `walker.stridePhase += dtMs * 0.018` regardless of how far (or how fast) the character actually moved in that tick.

## 2. Locked Design Decisions (Grilling Round 1)

1. **Q1 — Distance-Integrated Stride Phase ($\Delta \phi \propto \Delta s = v \cdot \Delta t$)**:
   - All walking locomotion animations—articulated SVG limb swing (`pose-walk`), vertical footstep bob (`bobY`), pixel-atlas walk frames (`drawPixelAtlasHero`), and scene-frame tile walker `stridePhase`—are driven by distance-integrated phase accumulated in strict proportion to the distance traveled each step.
2. **Q2 — Displacement Proportionality & Subagent Stature Scaling (`SUBAGENT_SCALE_RATIO = 0.7`)**:
   - Define the canonical proportionality constant `WALK_CYCLE_UNITS_PER_PX = 12 / 155` (`0.012 * 1000 / TRANSIT_WALK_SPEED_PX_PER_SEC`).
   - For any step where a character moves $\Delta s = \text{hypot}(\Delta x, \Delta y)$ pixels across the chamber floor:
     $$\Delta \text{walkCycle} = \frac{\Delta s \times \text{WALK\_CYCLE\_UNITS\_PER\_PX}}{\text{statureScale}}$$
     where $\text{statureScale} = 0.7$ (`SUBAGENT_SCALE_RATIO`) for a `Squad Subagent` and $1.0$ for a root `Guild Adventurer`.
   - At base transit speed (`155 px/s`), a root adventurer advances `walkCycle` by `12.0` units/sec (`2.4` units per `200ms`); at half-speed `Thinking` pacing (`77.5 px/s`), `walkCycle` naturally advances by `6.0` units/sec (`1.2` units per `200ms`); at any per-character `walkSpeedMultiplier` (`0.88x–1.12x`, applied consistently for $\ge 1$ characters) or steering-adjusted velocity, `walkCycle` scales 1:1 with actual movement speed; and a `0.7x` `Squad Subagent` steps $\sim 1.43\times$ (`1 / 0.7`) faster for the same ground speed so their shorter legs never skate.
3. **Q3 — Phase-Locked Vertical Stride Bob & 12-Bucket Walk Quantization**:
   - One full two-step stride cycle (left step + right step, `animPhase` $\in [0, 1)$) spans `STRIDE_CYCLE_WALK_UNITS = 6` `walkCycle` units (`77.5 px` of floor travel for a root adventurer, or `2.0` full cycles/sec at `155 px/s` and `1.0` full cycle/sec at `77.5 px/s`).
   - `poseMode === "walk"` quantizes `animPhase = ((walkCycle / STRIDE_CYCLE_WALK_UNITS) % 1 + 1) % 1` into **`12` discrete phase buckets** (`animBucket = Math.floor(animPhase * 12) % 12`, passing `animBucket / 12` to `buildArticulatedHeroSvg`), while stationary poses (`idle`, `combat`, `forge`, `tinker`, `library`, `spyglass`, `alchemy`, `spellcast`, `exhale`) retain `6` buckets driven by wall-clock time `t`.
   - Vertical walking bounce `bobY` is phase-locked to the exact same `animPhase` at 2 footstep oscillations per full left-right stride cycle:
     $$\text{bobY}_{\text{walk}} = \sin(\text{animPhase} \times 4\pi) \times 2.2$$
     so every left and right foot strike coincides deterministically with the vertical bounce at every movement speed.
   - In `pixel-atlas` mode (`drawPixelAtlasHero`), when `isWalking` is `true`, the 4-frame walk cycle is likewise indexed from `animPhase` (`Math.floor(animPhase * 4) % 4`) instead of wall-clock `t`.
4. **Q4 — Zero-Speed Guard & Departure Stagger**:
   - While a character is paused awaiting `departureUntilMs` (`nowMs < walker.departureUntilMs`) or when actual displacement in a step is zero ($\Delta s \le 0.01\text{ px}$), `walker.isWalking` is `false` and `walker.walkCycle` does not advance.
   - Characters never jog in place at `0 px/s`; when stationary (`!isWalking`), they render in their stationary pose (`idle` or station work/combat gesture) driven by wall-clock `t`.

## 3. Module Architecture & Seams

### 3.1 Locomotion Stride Seam (`src/web/walker-separation.ts` & `src/web/client-choreography.ts`)
- Export pure locomotion helpers in `src/web/walker-separation.ts` (keeping `src/web/client-choreography.ts` well below the 400-line ceiling):
  - `WALK_CYCLE_UNITS_PER_PX = 12 / 155`
  - `STRIDE_CYCLE_WALK_UNITS = 6`
  - `SUBAGENT_STRIDE_SCALE = 0.7`
  - `advanceWalkerStrideCycle(currentWalkCycle: number, distancePx: number, isSubagent?: boolean): number`
  - `resolveWalkStrideAnimPhase(walkCycle: number): { animPhase: number; animBucket12: number; bobOffsetY: number }`
- In `src/web/client-choreography.ts`:
  - Apply `walker.walkSpeedMultiplier` consistently for any walking character (removing the `chars.length > 1` gate that ignored `walkSpeedMultiplier` when a single character walked).
  - When `walker.departureUntilMs && nowMs < walker.departureUntilMs`, set `walker.isWalking = false` before `continue` so staggered characters wait in a standing pose until departure.
  - Measure actual displacement `stepDistPx = Math.hypot(walker.currentX - prevX, walker.currentY - prevY)` after stepping and steering avoidance, set `walker.isWalking = stepDistPx > 0.01`, and update `walker.walkCycle = advanceWalkerStrideCycle(walker.walkCycle, stepDistPx, isSubagent)`.

### 3.2 Phase-Locked Hero Painter (`src/web/canvas-hero-painter.ts`)
- In `drawCharacterHero`:
  - When `isWalking` is `true`, resolve `{ animPhase, animBucket12, bobOffsetY }` from `walker?.walkCycle ?? (t * 12)` via `resolveWalkStrideAnimPhase`.
  - Use `bobOffsetY` for `bobY` when `isWalking` is `true` (and `Math.sin(t * 3.2 + hx) * 1.4` when stationary).
  - For articulated SVG heroes, pass `bucketCount = poseMode === "walk" ? 12 : 6` and `animBucket = poseMode === "walk" ? animBucket12 : Math.floor(t * 6) % 6` to `getCachedArticulatedHeroImage` / `createSvgImage`.
  - For pixel-atlas heroes (`drawPixelAtlasHero`), index walking frames from `animPhase` (`Math.floor(animPhase * 4) % 4`) when `isWalking` is `true`, and `Math.floor(t * 6) % 4` when stationary.

### 3.3 Scene Tile Walker Stepper (`src/scene/walker-stepper.ts` & `src/scene/frame-characters.ts`)
- Export `STRIDE_RAD_PER_TILE = 0.018 / (4.2 / 1000)` (`~4.285714 rad/tile`) in `src/scene/walker-stepper.ts`.
- Track total tile distance `movedTiles` accumulated during the `while (moveBudget > 0 && walker.waypoints.length > 0)` loop in `stepCharacterWalker(char, ..., dtMs, speedTilesPerSec = 4.2)`.
- Advance `walker.stridePhase += (movedTiles / statureScale) * STRIDE_RAD_PER_TILE` (where `statureScale = isSubagent ? 0.7 : 1.0`), so `stridePhase` advances strictly in proportion to distance moved and remains `0` when stationary.

## 4. Acceptance Criteria

1. Doubling or halving a character's movement speed (e.g., `155 px/s` transit vs. `77.5 px/s` `Thinking` pacing, or any `walkSpeedMultiplier`) doubles or halves both their `walkCycle` accumulation rate and their rendered limb-swing (`animBucket`) and vertical stride bob (`bobY`) frequency.
2. Changing a character's movement speed mid-walk produces a continuous, glitch-free change in animation speed with zero instantaneous phase jumps.
3. A `Squad Subagent` (`0.7x` scale) walking at the same ground speed as a root `Guild Adventurer` (`1.0x` scale) advances its `walkCycle` and limb-swing cadence at `1 / 0.7` (`~1.43x`) the root adventurer's rate so its shorter legs do not skate.
4. While a character is stationary or waiting for `departureUntilMs` (`0 px/s`), `isWalking` is `false` and `walkCycle` / `stridePhase` advances by `0`.
5. `poseMode === "walk"` uses `12` phase buckets per full stride cycle and locks `bobY` (`2` vertical footstep bobs per full cycle) in exact phase with limb swing.
6. Every source file in `src/` remains `<= 400` lines, all unit/integration tests pass, and the containerized visualizer (`opencode-pixel-guild-visualizer` on port `4310`) is verified with visual proof.
