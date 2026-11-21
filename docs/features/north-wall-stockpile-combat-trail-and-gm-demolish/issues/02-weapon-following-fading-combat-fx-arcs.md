# Issue 02: Weapon-Following Combat FX with Tip-Bright / Tail-Fading Gradient

Type: task
Label: ready-for-agent
Status: resolved

## Goal

Update the combat attack FX (`src/sprites/hero-rig-fx-and-combat.ts`, `src/sprites/hero-vector-rig.ts`, and `src/web/canvas-wilds-painter.ts`) so that weapon slash/strike effects follow the moving weapon across `animPhase`, are brightest right next to the weapon tip/blade, and taper + fade to transparent at the trailing end.

## Acceptance Criteria

1. **Phase-Driven Combat FX (`src/sprites/hero-rig-fx-and-combat.ts` & `src/sprites/hero-vector-rig.ts`)**:
   - Pass `animPhase` into `buildActionAndCombatFxOverlay(party, poseMode, weaponType, animPhase)`.
   - In `buildPhaseKeyframeStyles(phase)` and `buildActionAndCombatFxOverlay`:
     - Bind `.fx-slash` (and weapon-specific combat FX groups for `sword`, `pickaxe`, `staff`, `bow`, `dagger`) to the weapon's phase motion so the slash/trail translates and rotates with the weapon rather than remaining static.
     - Define an SVG `<linearGradient>` (and/or segmented progressive-opacity trail paths) along the weapon swing path where the head of the arc right next to the weapon blade is brightest (`#ffffff` / `#fef08a`, `opacity="1"`) and the tail end fades smoothly to `opacity="0"`.
2. **Wilderness Monster Combat Slash Trail (`src/web/canvas-wilds-painter.ts`)**:
   - Replace the uniform-opacity spinning arc on `bug.inCombat` with a segmented fading slash wake that is brightest and widest at the leading weapon strike point (`#ffffff` / `#fef08a`, alpha `1.0`) and fades to `0` at the tail.
3. **Tests**:
   - Add unit assertions in `tests/11-articulated-character-graphics-and-fx-overhaul.test.ts` verifying that `buildArticulatedHeroSvg(..., "combat", ..., animPhase)` produces distinct phase-coupled weapon trail transforms across different `animPhase` values and includes a tip-to-tail fading opacity gradient.
