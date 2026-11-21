# Issue 02: Phase-Gated 2D Weapon VFX (Crescent Slash, Shockwave Bash, Viper Thrust, Arcane Bolt & Arrow Wake)

- **Triage Label:** `ready-for-agent`
- **Status:** Resolved
- **Depends On:** `01-unclipped-svg-viewbox-and-shoulder-pivot-weapon-biomechanics.md`
- **Feature Spec:** `docs/features/authentic-combat-weapon-vfx/spec.md` (§2.3)

## What to Build

Rewrite `poseMode === "combat"` in `buildActionAndCombatFxOverlay(party, poseMode, weaponType, animPhase)` (`src/sprites/hero-rig-fx-and-combat.ts`) so each `CombatWeaponArchetypeKind` renders an authentic, phase-gated 2D game VFX silhouette within the unclipped `-55 -32.5 330 325` `viewBox`:

1. **`sword` (`WARRIOR` Broadsword Cleave — Slash VFX)**:
   - Replace the constant-width `<path stroke-width="15" stroke-linecap="round">` tube with a **closed eccentric crescent smear `<path>`** (`fill="url(#fx-sword-outer)"` and inner hot core `<path fill="url(#fx-sword-core)">`) that is wide and white-hot (`#ffffff` / `#fde047`, `stop-opacity="1"`) at the leading blade edge and tapers to a `0px` razor point (`stop-opacity="0"`) at the trailing tail, accompanied by a thin outer speed-arc wisp and a directional 4-point slash star.
   - Gate geometry by `animPhase`:
     - Wind-up (`animPhase < 0.16`): Blade-tip star glint overhead + subtle preparatory speed line (no full arc hanging in front of the hero).
     - Upper-to-Mid Cleave (`0.16 <= animPhase < 0.5`): Upper-forward tapered crescent smear sweeping behind the descending blade.
     - Full Cleave & Impact (`0.5 <= animPhase < 0.82`): Full sweeping lower-forward crescent smear + directional cross-slash hit-spark burst at `(216, 184)`.
     - Recovery (`animPhase >= 0.82`): Thin eroding crescent afterimage + scattering spark embers.

2. **`pickaxe` (`SAPPER` Miner's Pickaxe — Bash / Heavy Slam VFX)**:
   - Replace the circular stroke arc with:
     - A downward-diverging **vertical crush plume** (`fill="url(#fx-pick-grad)"`) during the descending slam;
     - Perspective **concentric elliptical shockwave rings** (`<ellipse rx="38" ry="14">`, `<ellipse rx="22" ry="8">`) centered at the impact zone `(204, 206)`;
     - Jagged radial impact spikes and flying angular stone/armor shrapnel polygons bursting outward on the impact phases.

3. **`dagger` (`ALCHEMIST` / `CLERIC` Viper Dagger — Thrust / Pierce VFX)**:
   - Render a multi-layered **needle-point piercing spearhead cone** (`polygon` tapering to a sharp point at `x = 248` with a `#ffffff` core and `url(#fx-dagger-grad)` wake), a vertical elliptical **sonic air-burst compression ring** (`<ellipse rx="7" ry="22">`) around the thrust axis, parallel horizontal speed-blur lines, and a needle-tip star flare.

4. **`staff` (`MAGE` Crystal Staff — Arcane Barrage VFX)**:
   - Render a spinning geometric rune ring at the staff crystal (`(154, 62)`) launching a phase-advancing **arcane crescent wave / star-bolt** (`x = 168 -> 246`) with `url(#fx-staff-grad)` wake and forked cyan/gold lightning filaments.

5. **`bow` (`SCOUT` Longbow — Feathered Arrow Volley VFX)**:
   - Render a bowstring snap vibration wave and a high-speed feathered arrow streaking forward (`x = 158 -> 252`) inside a sharp **V-shaped aerodynamic wind-shear cone** (`url(#fx-bow-grad)`) with trailing slipstream lines.

## Acceptance Criteria
- [x] `sword` renders a filled tapered crescent smear (not a round-capped constant-width stroke) gated across wind-up, cleave, impact, and recovery phases.
- [x] `pickaxe` renders a vertical crush plume, elliptical impact shockwave rings, jagged impact spikes, and flying shrapnel.
- [x] `dagger` renders a needle-point piercing cone, vertical sonic compression ring, and horizontal speed streaks.
- [x] `staff` and `bow` render phase-advancing arcane crescent bolts and V-wake arrow volleys within the unclipped `viewBox`.
- [x] `src/sprites/hero-rig-fx-and-combat.ts` stays strictly `<= 400` lines.
