# Step 1 Specification: Hero Character Rig & Visual Design System

**Reference Standard:** `docs/examples/characters/I · Emberfall Vanguard@1x.png` through `X · Stormcrest Legion@1x.png`  
**Live Interactive Verification Preview:** `./docs/features/modular-refactor-and-128px-craftpix-encounters/sketches/heroes-preview.html`

---

## 1. Visual Language & Proportions

Every Guild Adventurer and Squad Subagent is rendered as a crisp, multi-layered 2D vector-illustrated rig (zero pixel blockiness) matching the exact proportions, line weights, and facial expressiveness of the 9 party sheets in `docs/examples/characters/`:

1. **Consistent Ink Outlines**:
   - Warm espresso-charcoal ink (`#2b211d`), `2.5px` outer contour stroke, `1.8px–2.2px` interior seam and facial detail strokes, rounded joins and caps.
2. **2.5-Head Chibi-Heroic Proportions (`220×260` native rig coordinate space)**:
   - **Head & Expressive Face (`y: 52..132`)**:
     - Rounded head capsule with left/right ear curves and forehead hair bangs + back hair framing the shoulders.
     - **Expressive Eyes**: Crisp white sclera ovals, large colored iris rings, dark pupil centers, and **dual white specular catchlights** (top-left primary + bottom-right secondary).
     - **Facial Features**: Expressive eyebrows (arched, neutral, or angled determined), soft translucent rosy cheek blushes (`#e57373` at 45% opacity), curved nose bridge, and expressive mouth states (open white-toothed grin, warm smile, or stoic line) with optional sculpted full beard and mustache.
   - **Torso, Garments & Arms (`y: 136..204`)**:
     - Role-specific layered armor, robes, jerkins, aprons, tabards, or blast vests, with cylindrical sleeves ending in outlined round fists.
   - **Legs, Boots & Ground Shadow (`y: 198..244`)**:
     - Fitted trousers or full-length robe hems over sturdy rounded-toe leather boots planted on an elliptical ground shadow (`rx: 48, ry: 8`).
   - **Role Aura Disc**:
     - Soft pastel circular backdrop (`r: 72`) behind the character's upper torso, tinted to the party/project palette.

---

## 2. The 6 Canonical Hero Classes & Loadout Variants

Each OpenCode session maps deterministically to one of the **6 Hero Classes** from the reference sheets, with **2 interchangeable Equipment Loadout Variants (Variant A & Variant B)** that reflect the session's active OpenCode tools and skills:

| # | Hero Class | OpenCode Role Mapping | Headgear & Garb Anatomy | Loadout Variant A | Loadout Variant B |
|---|---|---|---|---|---|
| **1** | **WARRIOR** | Bug hunting, test execution (`bash` test runners), error diagnosis (`diagnosing-bugs`) | Segmented steel breastplate with center ridge, bulbous steel shoulder pauldrons, leather belt with silver buckle, pleated tunic skirt, full-length cape. Headgear: **Tied cloth headband** OR **Viking horned nasal helm**. | **Upright Broadsword** (with fuller ridge & gold crossguard) + **Heater Shield** (with inner border & 5-point star boss). | **Long-Hafted Bearded Battleaxe** held beside the left shoulder. |
| **2** | **MAGE** | Feature creation, code generation & authoring (`write`, `edit`), subagent summoning | Wide-brimmed crooked **pointed wizard hat** with hatband & 5-point star badge; floor-length flared robe with contrasting center stole panel, waist sash, and embroidered 4-point star sparkles. | **Cradled Crystal Staff**: carved wooden staff holding a levitating faceted diamond crystal with pulsing radial glow. | **Grimoire Tome & Floating Orb**: star-emblazoned spellbook in left hand + levitating arcane orb with sparkles on right. |
| **3** | **SCOUT** | Codebase exploration, search & planning (`glob`, `grep`, `read`, `websearch`, `plan` agent) | Layered **ranger hood / cowl** draping over shoulders, split leather jerkin vest over long-sleeved tunic, rolled neck scarf, diagonal cross-chest leather strap. | **Tall Wooden Longbow** held in right hand + **Leather Back-Quiver** with fletched arrows over left shoulder. | **Pointed Hunting Dagger** held blade-down in right hand + **Recon Scroll Pack** slung on back. |
| **4** | **ALCHEMIST** *(Artificer)* | Refactoring, architecture deepening, context distillation & tool orchestration (`execute`, `codebase-design`) | Forehead **brass chemist goggles** with dual tinted glass lenses & specular shine; **white bib-apron** with front pocket over tunic; diagonal **3-vial reagent bandolier**; wide **wooden backpack frame** with corked orange & purple potion tubes strapped to both sides. | **Bubbling Erlenmeyer Flask**: conical glass flask held in right hand, half-filled with glowing potion liquid and rising vapor bubbles. | **Side-Strapped Boiling Flask**: round-bottom potion flask strapped to lower pack frame, hands free for tinkering. |
| **5** | **CLERIC** | Code review, spec verification, safety guardrails & permissions (`code-review`, `question`) | Brow **circlet with center diamond gem** + large luminous **Sacred Halo Ring** behind head; flared vestments with central scapular tabard bearing an **8-rayed sacred sun emblem**. | **Scripture Tome & Flanged Mace**: sacred book with star emblem in right hand + flanged steel mace over left shoulder. | **Radiant Sun-Staff**: tall staff topped with a glowing sun-orb inside an 8-spiked sunburst ring. |
| **6** | **SAPPER** *(Demolitionist)* | Worktree teardown, room demolition bomb, session termination & cleanup | Domed metal **miner's hard-hat helmet** with front brim and circular glowing headlamp; padded **blast vest** with twin chest pockets and high-vis stripe; **3-stick red dynamite bundle** strapped to right shoulder. | **Round Cast-Iron Bomb** with burning, sparking fuse in right hand + **Steel Miner's Pickaxe** in left hand. | **Lit Red Dynamite Charge** sparking in right hand + **Steel Tamping/Blasting Rod** strapped on left. |

---

## 3. The 9 Canonical Party Palettes (Project / Squad Themes)

Each Project World (or Squad Lineage) automatically assigns one of the **9 Canonical Party Palettes** from `docs/examples/characters/`, giving every room and squad a cohesive, designer-curated color identity:

1. **Party I — Emberfall Vanguard**: Crimson `#c83d28`, Flame Amber `#e6a82e`, Hearth Aura `#f9dcc4`
2. **Party II — Frostmere Wardens**: Glacial Navy `#2b547e`, Ice Blue `#8eb8d9`, Frost Aura `#d9effc`
3. **Party III — Verdant Thorn**: Forest Green `#34673d`, Moss Lime `#7ce04b`, Canopy Aura `#dff0cf`
4. **Party IV — Duskborne Circle**: Shadow Violet `#4d387a`, Amethyst `#a97ee8`, Dusk Aura `#eadcf8`
5. **Party V — Sunspire Order**: Solar Gold `#d4a634`, Ivory Cream `#f7f3e6`, Sun Aura `#f9ecc7`
6. **Party VI — Tidecall Crew**: Deep Teal `#1c7274`, Coral Salmon `#f08265`, Seafoam Aura `#d5f2ed`
7. **Party VII — Ironvale Company**: Forged Slate `#434a54`, Smelter Orange `#d96b27`, Forge Aura `#f4e3cc`
8. **Party IX — Sandreach Nomads**: Oasis Turquoise `#1e7e7a`, Desert Ochre `#d49137`, Dune Aura `#d8f0e8`
9. **Party X — Stormcrest Legion**: Thunder Indigo `#233c78`, Lightning Gold `#e3b430`, Storm Aura `#dde5f7`

---

## 4. Character Animation & Visual Effects System

Keeping the smooth procedural animations and particle effects you approved, each Hero Rig supports:
1. **Idle Breathing & Gaze**: Gentle `2.6s` vertical torso breathing bob, periodic eye blink, and subtle cape sway.
2. **Role-Specific Active Implements**:
   - **Mage**: Levitating staff crystal bobs and pulses with radial arcane light.
   - **Alchemist**: Conical flask liquid sloshes and emits rising translucent vapor bubbles.
   - **Cleric**: Sacred halo ring pulses gently behind the head.
   - **Sapper**: Bomb and dynamite fuses emit flickering 8-point yellow-orange spark stars.
3. **In-Place Compaction Exhalation (`💨 Compaction Exhale`)**:
   - When context compaction occurs, the character remains in-place, inhales, and exhales a curling translucent cyan-white breath vapor cloud from their mouth that rises and dissipates while refilling Context Mana.
4. **Walking & Action States**:
   - Smooth 4-phase boot stride along room tiles and outdoor wilderness paths, plus weapon swing / tool-use motion arcs at Preparation Stations and during Bug Monster combat.

---

## 5. Modular Code Architecture for Hero Rigs (`<200` Lines per File)

To keep files small, clean, and maintainable:
- `src/sprites/heroes/hero-palettes.ts` (`~140 lines`): The 9 canonical Party Palettes and deterministic session-to-character trait seeding (skin tone, eye color, hair/beard style, headgear variant, expression).
- `src/sprites/heroes/hero-head-painter.ts` (`~180 lines`): Renders ears, head oval, hair bangs, expressive eyes with dual catchlights, eyebrows, blush, beard/mouth, and the 6 headgear types.
- `src/sprites/heroes/hero-body-painter.ts` (`~200 lines`): Renders boots, trousers, capes, backpacks, and the 6 role outfits.
- `src/sprites/heroes/hero-gear-painter.ts` (`~190 lines`): Renders Loadout A & Loadout B weapons/implements and active particle effects (bubbles, fuse sparks, crystal glow, compaction breath cloud).
- `src/sprites/heroes/index.ts` (`~90 lines`): Public facade exposing `renderHeroCharacterRig(ctx, spec, frameTime)`.
