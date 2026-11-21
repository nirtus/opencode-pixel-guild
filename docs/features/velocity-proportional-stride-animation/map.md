# Feature Map: Velocity-Proportional Character Stride Animation & Phase-Locked Locomotion

Label: wayfinder:map

## Destination

Deliver the complete locomotion and animation synchronization specification in [Specification: Velocity-Proportional Character Stride Animation & Phase-Locked Locomotion](./spec.md) through three vertical-slice implementation tickets:
1. **[01: Distance-Integrated Stride Phase, Subagent Stature Scaling & Zero-Speed Stagger Guard](./issues/01-distance-integrated-stride-phase-and-zero-speed-guard.md)** (`Blocked by: None`)
2. **[02: Phase-Locked 12-Bucket Hero Painter & Vertical Stride Bob Synchronization](./issues/02-phase-locked-12-bucket-hero-painter-and-bob-sync.md)** (`Blocked by: 01`)
3. **[03: Scene Tile Walker Proportional Stride Phase, Regression Tests & Container Visual Verification](./issues/03-scene-walker-stepper-proportional-stride-and-visual-proof.md)** (`Blocked by: 01, 02`)

## Notes

- **Mode**: Wayfinder charting & specification complete (`map.md`, `spec.md`, and tickets `01..03` created; `GLOSSARY.md` updated).
- **Domain**: **Stride Cadence**, **Toil Queue**, **Directional Turnaround**, **Guild Character**, **Guild Adventurer**, **Squad Subagent**.
- **Specification**: [Feature Specification](./spec.md).
- **Skills to consult**: `codebase-design`, `domain-modeling`, `tdd`, `code-review`.
- **Standing Rules**: Work strictly inside the project root directory (`./`). Never create git worktrees or write files to `/tmp` or `/tmp/opencode`. Every source file in `src/` must remain `<= 400` lines. Deploy and verify on the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`) with visual proof in `docs/images/`.

## Decisions so far

- [Specification: Velocity-Proportional Character Stride Animation & Phase-Locked Locomotion](./spec.md): Locked all four Grilling Round 1 decisions (`Q1–Q4`) and updated `GLOSSARY.md` (`Stride Cadence` and `Toil Queue`):
  1. Replace wall-clock `t` walking animation with **Distance-Integrated Stride Phase** ($\Delta \phi \propto \Delta s = v \cdot \Delta t$) across both `src/web/` (`stepClientChoreography` + `drawCharacterHero` + `drawPixelAtlasHero`) and `src/scene/` (`stepCharacterWalker` + `buildRoomCharactersAndPathlines`).
  2. Scale `walkCycle` and `stridePhase` directly with actual per-frame displacement $\Delta s$ (`WALK_CYCLE_UNITS_PER_PX = 12 / 155`) and divide by `Squad Subagent` stature (`SUBAGENT_STRIDE_SCALE = 0.7`) so `0.7x` subagents step $\sim 1.43\times$ faster at the same ground speed without foot skating.
  3. Phase-lock vertical footstep bounce (`bobY = Math.sin(animPhase * Math.PI * 4) * 2.2`, 2 bobs per full leg cycle) to the same `walkCycle` phase as limb swing, and increase `poseMode === "walk"` SVG quantization from `6` to `12` phase buckets per cycle.
  4. Enforce a zero-speed guard so characters waiting for `departureUntilMs` stagger or moving `0 px` remain in a standing pose (`isWalking = false`, $\Delta \text{walkCycle} = 0$) and never jog in place.
- [01: Distance-Integrated Stride Phase, Subagent Stature Scaling & Zero-Speed Stagger Guard](./issues/01-distance-integrated-stride-phase-and-zero-speed-guard.md): Exported `WALK_CYCLE_UNITS_PER_PX`, `STRIDE_CYCLE_WALK_UNITS`, `SUBAGENT_STRIDE_SCALE`, `advanceWalkerStrideCycle`, and `resolveWalkStrideAnimPhase` in `src/web/walker-separation.ts`, and updated `stepClientChoreography` in `src/web/client-choreography.ts` to advance `walkCycle` strictly from actual displacement `stepDistPx / statureScale` while suppressing `isWalking` during `departureUntilMs` stagger.
- [02: Phase-Locked 12-Bucket Hero Painter & Vertical Stride Bob Synchronization](./issues/02-phase-locked-12-bucket-hero-painter-and-bob-sync.md): Updated `drawCharacterHero` and `drawPixelAtlasHero` in `src/web/canvas-hero-painter.ts` to phase-lock vertical footstep bounce (`bobY`, 2 bobs per full leg cycle) and 12-bucket articulated `walk` SVG frames (`animBucket / 12`) to `walker.walkCycle`.
- [03: Scene Tile Walker Proportional Stride Phase, Regression Tests & Container Visual Verification](./issues/03-scene-walker-stepper-proportional-stride-and-visual-proof.md): Updated `stepCharacterWalker` in `src/scene/walker-stepper.ts` to advance `stridePhase` proportionally to `movedTiles / statureScale` (`STRIDE_RAD_PER_TILE`), added `tests/31-velocity-proportional-stride-animation.test.ts` (`232/232` tests passing), and verified the deployed `opencode-pixel-guild-visualizer` Docker container (`docs/images/velocity-proportional-stride-animation.png`).

## Not yet specified

<!-- All wayfinder fog has graduated into spec.md and tickets 01..03 -->

## Out of scope

- Changing base movement speeds (`155 px/s` station transit, `77.5 px/s` `Thinking` pacing) or stationary station-work / combat gesture frequencies.
- Modifying non-canvas HUD drawer tabs (`General`, `Hero`, `Ticker`).
