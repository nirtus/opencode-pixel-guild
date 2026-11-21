# Issue 03: Monster Cross-Slash Hit-Sparks, Regression Tests & Live Docker Visual Verification

- **Triage Label:** `ready-for-agent`
- **Status:** Resolved
- **Depends On:** `01-unclipped-svg-viewbox-and-shoulder-pivot-weapon-biomechanics.md`, `02-phase-gated-weapon-smear-bash-shockwave-and-thrust-vfx.md`
- **Feature Spec:** `docs/features/authentic-combat-weapon-vfx/spec.md` (§2.4, §3)

## What to Build

1. **Replace Orbiting Monster Spinner with Directional Cross-Slash & Hit-Spark Impact VFX (`src/web/canvas-wilds-painter.ts`)**:
   - In `renderOutdoorWilderness()` (`src/web/canvas-wilds-painter.ts:163-181`), remove the orbiting circular arc loop (`c.arc(bx, by, 34, a0, a1)`) when `bug.inCombat` is `true`.
   - Paint authentic 2D **Monster Hit-Impact VFX** directly over `(bx, by)` in canvas space:
     - **Tapered Diagonal Cross-Slash Cuts**: Alternating `/` and `\` filled crescent slash cuts across the monster's body (`±28px` span, thick white-hot `#ffffff` core inside `#fef08a` / `#f97316` outer crescent, tapering to `0px` razor tips at both ends).
     - **Asymmetric 8-Point Hit-Spark Starburst**: Flashing at the strike center with long primary rays and short secondary spikes.
     - **Radial Impact Sparks & Shock Pulse**: Expanding elliptical/radial hit pulse and 4–6 flying spark streaks bursting outward from the monster on each strike beat.

2. **Regression Tests (`tests/31-north-wall-stockpile-combat-trail-and-gm-demolish.test.ts` or dedicated combat VFX test)**:
   - Assert that `buildArticulatedHeroSvg` emits the unclipped `viewBox="-55 -32.5 330 325"` across all directions.
   - Assert that `.limb-arm-r` and `.fx-slash` are decoupled into distinct CSS rules and `.limb-arm-r` pivots around the shoulder (`140px 148px`).
   - Assert that `sword`, `pickaxe`, `dagger`, `staff`, and `bow` emit their weapon-specific VFX silhouettes (`<linearGradient>`, filled crescent `<path>`, shockwave `<ellipse>`, piercing cone `<polygon>`) and vary across `animPhase` (`0.0`, `0.25`, `0.65`, `0.85`).
   - Assert that `canvas-wilds-painter.ts` no longer renders the `c.arc(bx, by, 34, a0, a1)` spinner and instead renders directional cross-slash / hit-spark geometry on `bug.inCombat`.

3. **Mandatory Docker Container Deployment & Visual Proof**:
   - Run `npm run docker:up` to deploy to `opencode-pixel-guild-visualizer` on port `4310`.
   - Verify container health (`docker ps` and `http://127.0.0.1:4310/api/guild/snapshot`) and run `npm test`.
   - Capture live headless Chrome screenshot `docs/images/authentic-combat-weapon-vfx.png` during an active **Dungeon Wilds** combat encounter and inspect it via `read`.

## Acceptance Criteria
- [x] `src/web/canvas-wilds-painter.ts` renders tapered diagonal cross-slash cuts, an 8-point hit-spark burst, and flying radial impact sparks over `bug.inCombat` monsters instead of an orbiting `r = 34` circle.
- [x] All unit and architecture invariant tests (`npm test`) pass with every file under `src/` `<= 400` lines.
- [x] Live Docker container screenshot `docs/images/authentic-combat-weapon-vfx.png` is captured and visually verified via `read`.
