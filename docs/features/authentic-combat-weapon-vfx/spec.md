# Feature Specification: Unclipped, Phase-Gated 2D Combat Weapon VFX (Slash, Bash, Thrust, Barrage, Volley & Monster Hit-Sparks)

## 1. Overview & Problem Statement

Based on the `@diagnosing-bugs` investigation and live visual inspection (`docs/research/combat-weapon-vfx-diagnosis-and-design.md` and `docs/images/per-bug-monster-combat-targeting.png`), three compounding visual defects currently break **Debugging Hunt** combat in the **Dungeon Wilds**:

1. **Combat FX & Weapon Tips Are Visually Cut Off at the SVG `viewBox` Boundary**:
   - `buildArticulatedHeroSvg()` (`src/sprites/hero-vector-rig.ts:270, 276, 280`) outputs `<svg width="220" height="260" viewBox="0 0 220 260">`, which `createSvgImage()` (`src/web/canvas-hero-painter.ts:111-116`) rasterizes via an `HTMLImageElement` (`data:image/svg+xml;utf8,...`) and paints via `c.drawImage(img, -36, -48, 72, 85)`.
   - When an `<svg>` is rasterized inside an `<img>`, the CSS class `overflow-visible` on the root `<svg>` element is ignored by the browser rasterizer, which hard-clips all pixels outside `[0..220] × [0..260]`.
   - Because combat weapons (`x = 222..254`) and combat FX overlays (`x = 218..252`, `y = -4..220`) extend past `x = 220` and `y = 0`, their right and top edges are guillotined off in a flat straight line right between the hero and the **Bug Monster**.

2. **FX Moves Rigidly With the Weapon Across Every Frame & Detaches the Shoulder**:
   - In `buildPhaseKeyframeStyles(phase)` (`src/sprites/hero-vector-rig.ts:224-228`), `.limb-arm-r` and `.fx-slash` share the exact same CSS transform (`transform: translateY(${swordY}px) rotate(${swordRot}deg)`), while `buildActionAndCombatFxOverlay()` (`src/sprites/hero-rig-fx-and-combat.ts:107-213`) emits the same full-size static arc on all 6 animation buckets (`animPhase = 0..5/6`).
   - As a result, the entire slash arc and impact star never sweep, appear on strike, or dissipate — they are bolted rigidly in front of the weapon and bob up and down with the arm even during wind-up and recovery.
   - Furthermore, `translateY(-38px)` on `.limb-arm-r` translates the entire upper sleeve vertically off the character's shoulder socket (`(140, 148)`).

3. **Shapes Do Not Look Like 2D Combat VFX (Round-Capped Tubes & Orbiting Loading Spinner)**:
   - On the hero (`src/sprites/hero-rig-fx-and-combat.ts`), `sword` and `pickaxe` render a constant-thickness circular stroke (`<path d="M 138,34 A 92,92 ..." stroke-width="15" stroke-linecap="round">`), which looks like a bent yellow sausage rather than a **filled tapered crescent smear** (`sword` slash), **overhead crush plume + elliptical shockwave ring + flying shrapnel** (`pickaxe` bash), or **needle-point piercing cone + sonic compression ring + speed lines** (`dagger` thrust).
   - On the monster (`src/web/canvas-wilds-painter.ts:163-181`), `bug.inCombat` draws a 6-segment circular arc at constant radius `r = 34` orbiting around `headAng = (t * 8) % (Math.PI * 2)`, which looks like a browser loading spinner rather than directional cross-slash cuts and impact hit-sparks across the monster's body.

---

## 2. Requirements & Technical Design

### 2.1 Symmetric Unclipped SVG `viewBox` & Proportional Canvas Rendering (`src/sprites/hero-vector-rig.ts`, `src/web/canvas-hero-painter.ts`)
- Expand the root `<svg>` dimensions and `viewBox` in `buildArticulatedHeroSvg()` (`src/sprites/hero-vector-rig.ts`) symmetrically around the horizontal character axis (`x = 110`):
  - From `width="220" height="260" viewBox="0 0 220 260"`
  - To `width="330" height="325" viewBox="-55 -32.5 330 325"` (`1.5×` width, `1.25×` height).
  - Because `[-55, 275]` is symmetric around `x = 110` (`(-55 + 275) / 2 = 110`), the west-facing profile reflection `transform="translate(220, 0) scale(-1, 1)"` maps `[-55, 275]` onto `[-55, 275]` identically with zero coordinate shift, providing `165` SVG units of unclipped forward reach (`+55` extra units past `220`) and `32.5` units of overhead room above `y = 0`.
- Update `drawCharacterHero()` (`src/web/canvas-hero-painter.ts:322`) proportionally:
  - From `c.drawImage(img, -36, -48, 72, 85);`
  - To `c.drawImage(img, -54, -58.625, 108, 106.25);` (`72 * 1.5 = 108`, `-36 - 18 = -54`, `85 * 1.25 = 106.25`, `-48 - 10.625 = -58.625`).
  - The character's head, torso, feet, and selection/heraldry badges remain at the **exact same sub-pixel canvas coordinates and scale** while weapons and combat VFX are never clipped.

### 2.2 Anatomical Shoulder-Pivot Weapon Biomechanics & Decoupled FX Transforms (`src/sprites/hero-vector-rig.ts`, `src/sprites/hero-rig-arms-and-tools.ts`)
- In `buildHandGrippedArmsAndCargo()` (`src/sprites/hero-rig-arms-and-tools.ts`):
  - Orient combat weapons relative to the hand socket `(140, 186)` so shoulder rotation sweeps the weapon naturally through its strike arc:
    - `WARRIOR` (`sword`): Held at forward-ready cleave angle (`rotate(52)`), swept by `.limb-arm-r` shoulder rotation from high overhead wind-up (`-58deg`) through deep forward cleave (`+48deg`).
    - `SAPPER` (`pickaxe`): Held with the pickaxe shaft extending along the swing axis (`rotate(56)`) so overhead shoulder rotation lifts the pickaxe head high above the hero and smashes it down into the target zone.
    - `ALCHEMIST` / `CLERIC` (`dagger`): Held horizontally forward (`rotate(90)`), driven by coiled pullback (`translateX(-14px)`) into a fast horizontal viper lunge (`translateX(+28px)`).
- In `buildPhaseKeyframeStyles(phase)` (`src/sprites/hero-vector-rig.ts`):
  - **Never** apply `.limb-arm-r`'s vertical translation or full arm rotation to `.fx-slash`!
  - Rotate `.pose-combat.weapon-sword .limb-arm-r` and `.pose-combat.weapon-pickaxe .limb-arm-r` cleanly around the anatomical shoulder joint (`transform-origin: 140px 148px`, with at most `±4px` shoulder heave instead of `-38px` detachment).
  - Give `.fx-slash` its own dedicated phase-driven CSS rule (`.fx-slash { transform: ...; opacity: ...; transform-origin: 140px 160px; }`) that reflects the smear's independent sweep progression and phase opacity across `animPhase` (preserving compatibility with phase-variation assertions while eliminating rigid lockstep movement with the weapon).

### 2.3 Authentic Phase-Gated 2D Weapon VFX Silhouettes (`src/sprites/hero-rig-fx-and-combat.ts`)
Replace the constant-width round-capped `<path>` tubes in `buildActionAndCombatFxOverlay(party, poseMode, weaponType, animPhase)` with authentic 2D game VFX geometry driven by `animPhase`:

1. **`sword` — Filled Tapered Crescent Slash Smear + Leading Edge Glint & Impact Cross-Slash**:
   - **Geometry**: Closed eccentric crescent `<path>` (outer arc + inner offset arc tapering to razor-sharp `0px` points at both ends, filled with `url(#fx-sword-outer)` / `url(#fx-sword-core)` where `stop-opacity="1"` is at the leading blade edge and `stop-opacity="0"` is at the trailing tail), paired with a thin detached outer speed-arc wisp and a 4-point directional slash star at the leading edge.
   - **Phase Gating**:
     - *Wind-up* (`animPhase < 0.16`): Compact blade-tip charge glint overhead + subtle preparatory speed wisp (no full banana arc hanging in front of the hero during wind-up).
     - *Upper-to-Mid Cleave* (`0.16 <= animPhase < 0.5`): Wide upper-to-forward filled crescent smear (`y = 24 -> 178`, `x = 128 -> 238`) carving behind the descending broadsword.
     - *Full Cleave & Impact* (`0.5 <= animPhase < 0.82`): Sweeping lower-forward crescent smear (`y = 64 -> 224`, `x = 148 -> 244`) + explosive directional X-slash impact burst and flying spark shards at `(216, 184)`.
     - *Dissipation / Follow-Through* (`animPhase >= 0.82`): Eroding thin crescent afterimage + scattering ember sparks.

2. **`pickaxe` — Overhead Crush Plume + Elliptical Ground/Target Shockwave Ring + Flying Shrapnel (Bash / Slam VFX)**:
   - **Geometry**:
     - Downward-diverging filled crush smear cone (`url(#fx-pick-grad)`) trailing the descending pickaxe head;
     - Perspective **elliptical concentric shockwave rings** (`<ellipse rx="38" ry="14">` / `<ellipse rx="24" ry="8">`) at the impact point `(204, 206)`;
     - Upward-radiating jagged impact spikes (`<polygon>`) and angular flying rock/armor shrapnel chunks.

3. **`dagger` — Needle-Point Piercing Spearhead Cone + Sonic Compression Ring + Speed Streaks (Thrust / Pierce VFX)**:
   - **Geometry**:
     - Multi-layered razor-sharp elongated piercing cone (`polygon` tapering to a needle point at `x = 248` with a `#ffffff` core and `url(#fx-dagger-grad)` outer wake);
     - Vertical elliptical **sonic air-burst compression ring** (`<ellipse rx="7" ry="22">`) around the thrust axis at `x = 176`;
     - Parallel horizontal high-velocity speed lines and a piercing cross-flare at the needle tip.

4. **`staff` — Runic Casting Ring + Travelling Arcane Crescent Bolt & Forked Lightning (`MAGE`)**:
   - Spinning arcane sigil ring at the staff crystal (`(154, 62)`) firing a phase-advancing arcane crescent wave (`x = 168 -> 246`) with `url(#fx-staff-grad)` comet wake and crackling lightning filaments.

5. **`bow` — Bowstring Snap Wave + High-Speed Arrow in V-Shaped Wind-Shear Cone (`SCOUT`)**:
   - Bowstring release vibration wave + feathered arrow travelling forward (`x = 158 -> 252`) inside a sharp V-shaped aerodynamic wind-shear cone (`url(#fx-bow-grad)`) and trailing slipstream streaks.

### 2.4 Authentic Monster `inCombat` Cross-Slash & Hit-Spark Impact VFX (`src/web/canvas-wilds-painter.ts`)
- In `renderOutdoorWilderness()` (`src/web/canvas-wilds-painter.ts:163-181`), replace the orbiting `r = 34` circular loading spinner (`c.arc(bx, by, 34, a0, a1)`) when `bug.inCombat` is `true` with **directional 2D monster hit-impact VFX** painted directly across `(bx, by)` in unclipped canvas space:
  1. **Phase-Alternating Tapered Cross-Slash Cuts**:
     - Diagonal filled crescent slash cuts (`/` cleave on strike beat A, `\` cross-cleave on strike beat B) slicing directly across the monster's body (`±28px`), thick and white-hot (`#ffffff` core inside `#fef08a` / `#f97316` outer edge) at the center and tapering to razor-sharp `0px` points at both ends.
  2. **Asymmetric 8-Point Hit-Spark Starburst**:
     - Flashing at the slash intersection point on the monster's torso with long primary impact rays and short secondary spikes.
  3. **Radiating Impact Shards & Shock Ring**:
     - Expanding pulse ring and 4–6 directional spark streaks bursting outward from the monster on each strike beat.

---

## 3. Acceptance Criteria

1. **Zero Visual Clipping**: No weapon blade tip, slash crescent, bash shockwave, dagger thrust cone, arcane bolt, or arrow is ever flat-cut at `x = 220` or `y = 0` in any facing direction (`north`, `south`, `east`, `west`).
2. **Natural Shoulder-Pivot Weapon Motion & Decoupled FX**: The character's arm rotates around the shoulder socket without detaching vertically into the head, and the combat FX does not bob up and down as a rigid static shape glued to the weapon.
3. **Distinct, Authentic 2D VFX Per Attack Type**:
   - `WARRIOR` (`sword`): Filled tapered crescent slash smear + directional hit-spark.
   - `SAPPER` (`pickaxe`): Vertical crush plume + elliptical impact shockwave ring + flying shrapnel.
   - `ALCHEMIST` / `CLERIC` (`dagger`): Needle-point piercing cone + vertical sonic compression ring + horizontal speed streaks.
   - `MAGE` (`staff`): Runic casting ring + travelling arcane crescent bolt + lightning filaments.
   - `SCOUT` (`bow`): Bowstring snap + arrow in V-shaped wind-shear cone + slipstream lines.
   - `Bug Monster` (`inCombat`): Tapered diagonal cross-slash cuts + 8-point hit-spark burst + radial impact sparks across the monster's body (no orbiting circular spinner).
4. **Architecture & Test Invariants**: Every file in `src/` stays strictly `<= 400` lines (`tests/00-architecture-invariants.test.ts`), all unit/integration tests pass, and live visual proof is captured from the `opencode-pixel-guild-visualizer` Docker container on port `4310`.
