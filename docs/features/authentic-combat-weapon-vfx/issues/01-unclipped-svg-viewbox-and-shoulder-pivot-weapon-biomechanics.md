# Issue 01: Symmetric Unclipped Hero SVG `viewBox` & Shoulder-Pivot Combat Biomechanics

- **Triage Label:** `ready-for-agent`
- **Status:** Resolved
- **Feature Spec:** `docs/features/authentic-combat-weapon-vfx/spec.md` (§2.1, §2.2)

## What to Build

1. **Symmetric Unclipped SVG `viewBox` (`src/sprites/hero-vector-rig.ts`, `src/web/canvas-hero-painter.ts`)**:
   - In `buildArticulatedHeroSvg()` (`src/sprites/hero-vector-rig.ts`), change the root `<svg>` dimensions and `viewBox` on all directional branches (`north`, `east`/`west`, `south`) from `width="220" height="260" viewBox="0 0 220 260"` to `width="330" height="325" viewBox="-55 -32.5 330 325"`.
   - In `drawCharacterHero()` (`src/web/canvas-hero-painter.ts`), update `c.drawImage(img, -36, -48, 72, 85)` to `c.drawImage(img, -54, -58.625, 108, 106.25)` so the character body renders at the exact same pixel size and canvas origin while giving weapons and combat VFX `165` SVG units of horizontal reach (`x = -55..275`) and `32.5` units of overhead room (`y = -32.5..292.5`).

2. **Anatomical Shoulder-Pivot Weapon Biomechanics & Decoupled FX Rule (`src/sprites/hero-vector-rig.ts`, `src/sprites/hero-rig-arms-and-tools.ts`)**:
   - In `buildHandGrippedArmsAndCargo()` (`src/sprites/hero-rig-arms-and-tools.ts`), orient the `SAPPER` combat pickaxe at `rotate(56)` (matching the shoulder swing plane rather than sticking out horizontally at `0deg`) and refine the `WARRIOR` broadsword combat grip (`rotate(52)`).
   - In `buildPhaseKeyframeStyles(phase)` (`src/sprites/hero-vector-rig.ts`):
     - Separate `.limb-arm-r` and `.fx-slash` into distinct CSS rules so `.fx-slash` never inherits the arm's vertical translation or wind-up lift.
     - Rotate `.pose-combat.weapon-sword .limb-arm-r` and `.pose-combat.weapon-pickaxe .limb-arm-r` around the anatomical shoulder joint (`transform-origin: 140px 148px`, with at most `±4px` vertical heave instead of `translateY(-38px)`).
     - Provide a dedicated phase-varying `.fx-slash` keyframe rule in `buildPhaseKeyframeStyles(phase)` for smear sweep and opacity progression.

## Acceptance Criteria
- [x] `buildArticulatedHeroSvg` uses `viewBox="-55 -32.5 330 325"` and `width="330" height="325"` across all 4 facing directions.
- [x] `drawCharacterHero` draws the cached SVG image at `(-54, -58.625, 108, 106.25)` so character stature and position are unchanged.
- [x] `.limb-arm-r` and `.fx-slash` are decoupled into separate CSS rules in `buildPhaseKeyframeStyles(phase)`, and `.limb-arm-r` pivots around the shoulder (`140px 148px`) without detaching from the torso.
- [x] All modified files remain `<= 400` lines.
