# 02: Phase-Locked 12-Bucket Hero Painter & Vertical Stride Bob Synchronization

Type: task
Label: wayfinder:task
Status: resolved
Blocked by: 01

## Question

How should `drawCharacterHero` and `drawPixelAtlasHero` in `src/web/canvas-hero-painter.ts` render walking characters so limb swing, vertical stride bob (`bobY`), and pixel-atlas walk frames are driven by `walker.walkCycle` rather than global wall-clock time `t`, with `12` phase buckets per walk cycle?

## Specification

Confirmed in Grilling Round 1 (`Q1`, `Q3`, `Q4`) and [Specification: Velocity-Proportional Character Stride Animation & Phase-Locked Locomotion](./../spec.md):
- **Distance-Integrated Walk Rendering (`src/web/canvas-hero-painter.ts`)**:
  - Import `resolveWalkStrideAnimPhase` from `./walker-separation.ts`.
  - In `drawCharacterHero`:
    - Resolve `effectiveWalkCycle = typeof walker?.walkCycle === "number" ? walker.walkCycle : t * 12`.
    - Call `const walkStride = resolveWalkStrideAnimPhase(effectiveWalkCycle)`.
    - Compute `bobY = portalPhase ? 0 : isWalking ? walkStride.bobOffsetY : Math.sin(t * 3.2 + hx) * 1.4` so vertical bounce is phase-locked to `walkCycle` when walking (`2` bobs per full leg cycle) and uses idle breathing only when stationary.
  - **12-Bucket Articulated Walk SVG Cache (`createSvgImage` & `getCachedArticulatedHeroImage`)**:
    - Support `bucketCount = poseMode === "walk" ? 12 : 6` so `createSvgImage` passes `animBucket / bucketCount` as `animPhase` to `buildArticulatedHeroSvg`.
    - When `poseMode === "walk"`, pass `animBucket = walkStride.animBucket12` (`0..11`). When stationary (`poseMode !== "walk"`), retain `animBucket = Math.floor(t * 6) % 6` (`0..5`).
    - Update the cache fallback scan loop in `getCachedArticulatedHeroImage` to check `0..bucketCount - 1` while preserving the `1024`-entry LRU cache bound.
  - **Pixel-Atlas Walk Frame Sync (`drawPixelAtlasHero`)**:
    - When `isWalking` is `true`, compute `animBucket = Math.floor(walkStride.animPhase * 4) % 4` so pixel-atlas walking sprites also cycle proportionally to movement speed.
  - **Walking Pathline Dash Flow (`src/web/app-main.ts`)**:
    - Drive the walking pathline dash offset from `-(walker.walkCycle * 2.5)` so pathline motion also reflects the walker's stride progress.

## Acceptance Criteria

- [x] `drawCharacterHero` drives both articulated limb swing (`animBucket`) and vertical bounce (`bobY`) from `walker.walkCycle` when `isWalking` is `true`, with zero station-specific `slot.station === "Assembly"` renderer hacks.
- [x] `poseMode === "walk"` renders `12` discrete phase buckets per full stride cycle (`animBucket / 12`), while stationary poses (`idle`, `combat`, station work) retain `6` buckets driven by wall-clock `t`.
- [x] `bobY` completes exactly 2 vertical oscillations per full left-right leg stride cycle (`Math.sin(animPhase * Math.PI * 4) * 2.2`).
- [x] Mid-walk speed changes produce smooth phase progression with zero instantaneous frame/bob jumps.
- [x] Every file in `src/` remains `<= 400` lines.

## Answer

Updated `src/web/canvas-hero-painter.ts` and `src/web/app-main.ts` so:
1. `drawCharacterHero` resolves `{ animPhase, animBucket12, bobOffsetY }` from `walker.walkCycle` via `resolveWalkStrideAnimPhase`, driving both `bobY` (`2` vertical footstep bobs per full stride cycle) and articulated `walk` SVG frames (`12` phase buckets per cycle: `animBucket / 12`) strictly from distance-integrated `walkCycle` when walking, while retaining wall-clock `t` (`6` buckets) for stationary poses.
2. `drawPixelAtlasHero` indexes its 4-frame walk cycle from `walkStride.animPhase` when `isWalking` is `true`.
3. Walking pathline dash offset in `src/web/app-main.ts` advances with `-(walker.walkCycle * 2.5)`.
