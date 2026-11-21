# Wayfinder Map: Unclipped, Phase-Gated 2D Combat Weapon VFX

## Goal
Eliminate the visually clipped, weapon-glued circular tube FX during **Dungeon Wilds** combat (`docs/features/authentic-combat-weapon-vfx/spec.md` & `docs/research/combat-weapon-vfx-diagnosis-and-design.md`) by:
1. Expanding the hero SVG `viewBox` symmetrically to `-55 -32.5 330 325` (with proportional `drawImage` scaling in `canvas-hero-painter.ts`) so weapons and VFX never clip at `x = 220` or `y = 0`;
2. Rotating combat arms around the anatomical shoulder socket (`140px 148px`) and decoupling `.fx-slash` from `.limb-arm-r`'s rigid vertical translation;
3. Replacing uniform-width stroked tubes with phase-gated, weapon-specific 2D VFX silhouettes (**Filled Tapered Crescent Slash**, **Overhead Crush + Elliptical Shockwave Bash**, **Needle-Point Piercing Thrust + Sonic Ring**, **Travelling Arcane Crescent Barrage**, and **Wind-Shear Arrow Volley**); and
4. Replacing the monster's orbiting `r = 34` circular spinner in `canvas-wilds-painter.ts` with directional cross-body tapered slash cuts and 8-point hit-spark bursts.

## Architecture & Module Seams
- `src/sprites/hero-vector-rig.ts` (<= 400 lines): Symmetric `viewBox="-55 -32.5 330 325"`, shoulder-pivot `.limb-arm-r` combat keyframes, and decoupled phase-progressive `.fx-slash` keyframes.
- `src/sprites/hero-rig-arms-and-tools.ts` (<= 400 lines): Combat weapon grip angles (`sword`, `pickaxe`, `dagger`, `staff`, `bow`) aligned with shoulder-pivot strike arcs.
- `src/sprites/hero-rig-fx-and-combat.ts` (<= 400 lines): Phase-gated filled crescent smear (`sword`), vertical crush + elliptical shockwave + shrapnel (`pickaxe`), needle-point cone + sonic ring + speed lines (`dagger`), runic sigil + travelling arcane crescent (`staff`), and V-wake arrow volley (`bow`).
- `src/web/canvas-hero-painter.ts` (<= 400 lines): Proportional `c.drawImage(img, -54, -58.625, 108, 106.25)` mapping the expanded `330×325` SVG `viewBox` at exact `1:1` character scale.
- `src/web/canvas-wilds-painter.ts` (<= 400 lines): Canvas-space monster hit-impact painter (`bug.inCombat`) rendering tapered diagonal cross-slashes, 8-point hit-sparks, and radial impact shards across `(bx, by)`.

## Issue Order & Dependencies
- [x] [01: Symmetric Unclipped Hero SVG `viewBox` & Shoulder-Pivot Combat Biomechanics](./issues/01-unclipped-svg-viewbox-and-shoulder-pivot-weapon-biomechanics.md) (Resolved)
- [x] [02: Phase-Gated 2D Weapon VFX (Crescent Slash, Shockwave Bash, Viper Thrust, Arcane Bolt & Arrow Wake)](./issues/02-phase-gated-weapon-smear-bash-shockwave-and-thrust-vfx.md) (Resolved)
- [x] [03: Monster Cross-Slash Hit-Sparks, Regression Tests & Live Docker Visual Verification](./issues/03-monster-cross-slash-hit-sparks-and-docker-visual-verification.md) (Resolved)
