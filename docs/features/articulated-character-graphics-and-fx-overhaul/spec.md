# Feature Specification: 1:1 Articulated Character Graphics, 4-Directional Turnarounds, Station Work Implements & Combat/Spellcast FX Overhaul

Label: ready-for-agent

## Problem Statement

While the project's reference art sheets define a rich, expressive hand-crafted cartoon RPG aesthetic across 9 guild parties (54 named heroes across 6 **Guild Role Archetype**s) and 9 specialized guild chambers, the live spectator companion currently renders characters and stations as simplified geometric primitives:

1. **Dumbed-Down Pill Characters Instead of 1:1 Reference Anatomy**: Characters on the live **Guild Floorplan** are drawn as two rounded rectangles and a plain circle head. They lack the reference sheets' back hair, ears, forehead bangs, rosy cheek blushes, colored iris + pupil + dual-catchlight eyes, expression eyebrows (`frown`, `smile`, `grin`, `stoic`), beards and mustaches, trousers, boots, articulated sleeves and hands, capes, arrow-packed quivers, wooden alchemist backpacks with corked potion vials and glass bulbs, pulsing sacred halos, and strapped dynamite bundles.
2. **Moonwalking & Sliding Cutouts Instead of 4-Directional Turnarounds**: Characters only flip horizontally on a front-facing portrait. When walking East, West, or North along the **Toil Queue** ring-corridor or working at North Wall **Preparation Station**s, they slide sideways or backwards instead of assuming a true **Directional Turnaround** (`south` front view, `east` right 3/4 profile with scissor leg gait and forward-pointing boot toes, `west` left 3/4 profile, and `north` full back view displaying their cape, quiver, alchemist backpack, and back of headgear).
3. **Levitating Props & Combat Weapons Held During Station Work**: When acting at a **Preparation Station** (`Anvil Forge`, `Crafting Workbench`, `Library Study Bookshelf`, `Observatory Spyglass`, `Alchemy Lab`, `Arcane Lectern`), characters continue holding combat weapons, and props float at detached offsets instead of having their handles pass directly through the hand center with the hand drawn clasping the grip.
4. **Inward Cross-Body Swings & Invisible Sparks**: Station actions previously rotated arms inward across the character's torso/pelvis while anvil sparks remained invisible for most of the animation cycle. Station work requires pure vertical up-and-down motion (`translateY`) strictly on the outside of the body (`x < 80` left, `x > 140` right) striking directly onto visible workpieces with continuous multi-wave sparks.
5. **Generic Combat Swings & Underwhelming Spellcasting**: All roles shared a generic rectangle lunge in combat rather than attacking with biomechanics unique to their **Combat Weapon Archetype** (`SWORD`, `STAFF`, `BOW`, `PICKAXE`, and `DAGGER` for roles without a dedicated primary weapon). Spellcasting at the **Arcane Lectern** and **Summoning Ritual** rendered a single thin circle instead of a multi-layer arcane spectacle matching the `Enchanter's Study` reference art.

## Solution

Replace the primitive character and station painters with the biomechanically audited **1:1 Articulated Character Rig, 4-Directional Turnaround, Station Work Implement, and Visual FX Engine**:

1. **Canonical 54-Hero Roster & 4-Way Directional Turnaround**: Encode all 9 canonical guild parties (54 named heroes across `WARRIOR`, `MAGE`, `SCOUT`, `ALCHEMIST`, `CLERIC`, and `SAPPER`) with their exact reference traits, and orient each character into one of four **Directional Turnaround** states (`south`, `east`, `west`, `north`) based on their active **Toil Queue** movement vector and target **Preparation Station** facing.
2. **Unified 4-Directional 1:1 Character Rig**: Render every **Guild Adventurer** and **Squad Subagent** with the exact `220×260` multi-layer anatomy across `south` (front), `east` (right 3/4 profile), `west` (left 3/4 profile), and `north` (back view), sharing one audited arm, tool, weapon, cargo, and FX pipeline across all four directions.
3. **Hand-Gripped Station Work Implements & Pure Vertical Up-Down Motions**: Stow all combat weapons during **Preparation Station** work and anchor the station's exact **Station Work Implement** through the hand center (`(80, 186)` left / `(140, 186)` right) with the hand `<circle>` drawn on top of the handle, executing pure vertical up-and-down (`translateY`) motions strictly on the outside left (`x < 80`) and outside right (`x > 140`) with continuous multi-wave sparks and workpieces.
4. **5 Unique Weapon Combat Attacks & 6-Layer Spectacular Spellcasting**: Drive **Debugging Hunt** combat in the **Dungeon Wilds** with five distinct **Combat Weapon Archetype** animations (`SWORD` cleave, `STAFF` laser & 3 homing bolts, `BOW` riser grip & feathered arrow volley, `PICKAXE` overhead slam & seismic ground shatter, and horizontal `DAGGER` viper thrust for `ALCHEMIST` and `CLERIC`), and render skill/subagent casting with the 6-layer sacred geometry pentagram mandala, levitating open **Skill Grimoire**, 8-point staff supernova, and crackling lightning arcs.
5. **Frame-Bucketed Offscreen Caching & 1:1 Room Station Props**: Cache animated directional rig frames in a bounded LRU offscreen bitmap cache for 60 FPS `drawImage` blitting, and upgrade **Workshop Room** station fixtures to match the 9 reference room sheets.

## User Stories

1. As a spectator, I want every **Guild Adventurer** and **Squad Subagent** to render with the exact 1:1 proportions, dark ink outlines (`#2b211d`), skin tones, hair styles, rosy cheek blushes, and colored iris + pupil + dual-catchlight eyes from the reference character sheets, so that characters on the live canvas match the approved artwork.
2. As a spectator, I want each character to display their canonical facial expression (`smile`, `grin` with white teeth, `frown` with angled eyebrows, or `stoic`) and facial hair (full beard and mustache where applicable), so that every hero has distinct personality and visual identity.
3. As a spectator, I want all 9 canonical guild parties (`Emberfall Vanguard`, `Frostmere Wardens`, `Verdant Thorn`, `Duskborne Circle`, `Sunspire Order`, `Tidecall Crew`, `Ironvale Company`, `Sandreach Nomads`, and `Stormcrest Legion`) and their 54 named heroes to be deterministically assigned to sessions and squads, so that multi-session rooms showcase rich party variety.
4. As a spectator, I want a `WARRIOR` character to wear a steel breastplate with center crease, bulbous steel shoulder pauldrons, leather belt with steel buckle, split tunic skirt, full-length flowing cape, and either a knotted headband or horned Viking nasal helm, so that warriors match the reference sheets 1:1.
5. As a spectator, I want a `MAGE` character to wear full-length flared robes with a contrasting center stole panel, brown waist sash, embroidered 4-point star sparkles on the lower robe, and a pointed bent wizard hat with wide brim, hatband, and star emblem, so that mages match the reference sheets 1:1.
6. As a spectator, I want a `SCOUT` character to wear a split brown leather jerkin over an under-tunic, contrasting neck scarf collar, cross-body leather strap, ranger hood with back cape drape, and an angled leather quiver packed with feathered arrows on their back, so that scouts match the reference sheets 1:1.
7. As a spectator, I want an `ALCHEMIST` character to wear a white bib-apron with front pocket, diagonal leather bandolier strapped with 3 colored potion vials (`#e6a82e`, `#52b788`, `#9b5de5`), forehead brass goggles with tinted lenses and white catchlights, and a wide wooden backpack frame holding corked orange and purple potion vials plus a half-filled glass potion bulb, so that alchemists match the reference sheets 1:1.
8. As a spectator, I want a `CLERIC` character to wear flared clerical vestments, a central scapular tabard with a sacred sun emblem, a golden forehead circlet with a diamond gem, and a luminous pulsing sacred halo ring behind their head, so that clerics match the reference sheets 1:1.
9. As a spectator, I want a `SAPPER` character to wear a heavy padded brown blast vest with dual chest pockets and a high-visibility yellow stripe, a yellow miner's hardhat with a glowing headlamp, and a strapped bundle of 3 red dynamite sticks behind their shoulder, so that sappers match the reference sheets 1:1.
10. As a spectator, I want characters rendered on the **Workshop Room** floorboards or **Dungeon Wilds** terrain to omit the circular portrait-card backdrop while preserving their ground elliptical shadow and Cleric sacred halo, so that characters integrate cleanly into the world floorplan.
11. As a spectator, I want a character walking downward (`dy > |dx|`) to face `south` (front view) with counter-phase articulated left and right leg/boot strides and swinging arms, so that downward movement looks natural.
12. As a spectator, I want a character walking rightward (`dx >= |dy|`) to turn into an `east` 3/4 right-profile **Directional Turnaround** where their cape, quiver, alchemist backpack, or dynamite bundle trails on the left/back side, their boots point right in a scissor walking gait, and their near and foreshortened far eyes look forward to the right, so that rightward movement looks natural.
13. As a spectator, I want a character walking leftward (`-dx >= |dy|`) to turn into a `west` 3/4 left-profile **Directional Turnaround** with boot toes, nose, gaze, and leading tools/weapons pointing left and back-gear trailing on the right, so that leftward movement looks natural.
14. As a spectator, I want a character walking upward (`-dy > |dx|`) or working at a North Wall **Preparation Station** to turn into a `north` full back-view **Directional Turnaround** showing the back of their boots, full layered royal cape / back robes / arrow-packed quiver / unobstructed wooden alchemist backpack frame & vials / sacred halo / back-mounted dynamite pack, cascading back hair, and the back of their headgear, so that upward movement and north-wall work look natural.
15. As a spectator, I want every held weapon, relic, and **Station Work Implement** across all 4 directions (`south`, `east`, `west`, `north`) to have its handle or shaft pass directly through the hand socket center (`(80, 186)` left / `(140, 186)` right) with the hand `<circle>` drawn on top of the handle, so that no item ever levitates detached from a character's hand.
16. As a spectator, I want a character working at any **Preparation Station** (`Anvil Forge`, `Crafting Workbench`, `Library Study Bookshelf`, `Observatory Spyglass`, `Alchemy Lab`, `Arcane Lectern`) to stow their combat weapon and hold only the **Station Work Implement** corresponding to that station, so that working characters hold tools rather than weapons.
17. As a spectator, I want all station tool actions (`Anvil Forge`, `Crafting Workbench`, `Library Study Bookshelf`, `Observatory Spyglass`, `Alchemy Lab`) to operate strictly on the outside left (`x < 80`) and outside right (`x > 140`) of the character's body using pure vertical up-and-down (`translateY`) motion rather than swinging inward across the torso or pelvis, so that working animations look clean and mechanical.
18. As a spectator, I want a character working at the **Anvil Forge** (`bash`) to hold **Iron Blacksmith Tongs & a Glowing Ingot** in their left hand on the outside left and smash a **Blacksmith's Cross-Peen Forge Hammer** vertically up-and-down (`translateY(-38px)` to `translateY(8px)`) with their right hand directly onto a **Horned Steel Anvil & White-Hot Billet** on the outside right, triggering an impact starburst flash and 16 continuous multi-wave yellow/orange/white sparks, so that shell execution looks like real forging.
19. As a spectator, I want a character working at the **Crafting Workbench** (`edit`/`write`) to hold an unrolled **Cobalt Engineering Blueprint Board** in their left hand on the outside left and move a **Brass Machinist Spanner Wrench** vertically up-and-down (`translateY(-28px)` to `translateY(8px)`) with their right hand onto a spinning **Brass Clockwork Gear** on the outside right with continuous cyan and gold calibration sparks, so that code editing looks like precision artificer work.
20. As a spectator, I want a character working at the **Library Study Bookshelf** (`read`) to support an **Open Illuminated Leather Codex** with ruled pages in their left hand on the outside left and scan vertically up-and-down with a **Gold-Rimmed Magnifying Loupe** in their right hand on the outside right while golden knowledge glyphs float upward, so that file reading is visually clear.
21. As a spectator, I want a character working at the **Observatory Spyglass** (`grep`/`glob`/`websearch`/`webfetch`) to hold a **Golden Wayfinder Compass** in their left hand on the outside left and raise a **3-Stage Extending Brass Spyglass Telescope** vertically with their right hand on the outside right projecting an expanding cyan and gold reconnaissance radar scan cone, so that search and reconnaissance actions are visually clear.
22. As a spectator, I want a character working at the **Alchemy Lab** (`execute`) to grip the neck of a **Boiling Conical Erlenmeyer Flask** in their left hand on the outside left and plunge a **Wooden Cauldron Stirring Ladle** vertically up-and-down (`translateY(-20px)` to `translateY(6px)`) with their right hand into a **Bubbling Neon-Emerald Cauldron** on the outside right with rising green and violet vapor orbs, so that Code Mode execution looks like alchemical brewing.
23. As a spectator, I want a character hauling **Resource Cargo** from the **Resource Stockpile** or carrying a **Report Scroll** to hold the crate/scroll in a two-handed carry clasp in front of their chest while walking, so that material hauling is physically legible.
24. As a spectator, I want a `WARRIOR` in **Debugging Hunt** combat in the **Dungeon Wilds** to grip a **Broadsword** in their right hand and brace a **Heater Shield** on their left arm, executing a vertical overhead-to-downward sword cleave (`translateY(-38px) rotate(-26deg)` to `translateY(10px) rotate(14deg)`) on the outside right with a multi-layer crimson, gold, and white crescent slash wave and critical impact starburst, so that warrior combat feels weighty and impactful.
25. As a spectator, I want a `MAGE` in **Debugging Hunt** combat to grip their **Crystal Staff** shaft through their right hand and channel vertically while firing a **Focused Arcane Laser Beam & 3 Homing Astral Bolts** directly from the staff's top diamond crystal with a muzzle starburst, so that mage combat is a distinct ranged spell barrage.
26. As a spectator, I want a `SCOUT` in **Debugging Hunt** combat to grip their curved wooden **Longbow** riser on the outside right and fire a high-velocity **Streaking Feathered Arrow Volley** through concentric emerald and gold sonic wind-vortex rings and speed wake lines, so that scout combat is a distinct archer attack.
27. As a spectator, I want an `ALCHEMIST` or `CLERIC` in **Debugging Hunt** combat (roles without a sword, staff, bow, or pickaxe) to grip a horizontal **Razor Steel Combat Dagger** through their right hand pointing outward-right and execute a rapid **Horizontal Forward-Right Linear Viper Stab** (`translateX(-8px)` to `translateX(18px)`) into twin silver and gold piercing thrust cones and a critical cross-flash, so that every role has an authentic weapon attack.
28. As a spectator, I want a `SAPPER` in **Debugging Hunt** combat to grip their **Miner's Pickaxe** extending outward-right and execute a **Vertical Overhead Armor-Cracker Slam** (`translateY(-40px) rotate(-24deg)` to `translateY(12px) rotate(12deg)`) onto the ground/target on the outside right, creating seismic ground-shatter cracks, an impact flash, and flying jagged rock shards, so that sapper combat is a distinct heavy smash.
29. As a spectator, I want any character activating a skill at the **Arcane Lectern** or conjuring a **Summoning Ritual** to channel a 6-layer arcane spectacle—(1) Rising Arcane Mana Pillar column, (2) 32-tick rotating Celestial Pentagram Mandala (`r=84`, `r=72`, inscribed 5-pointed star pentagram, 5 glowing vertex node orbs) + counter-rotating inner sacred hexagram (`r=54`), (3) Perspective Ground Summoning Pentagram (`scale(1, 0.32)`) beneath the feet, (4) Twin swirling helical mana ribbons + awakened luminous caster eyes, (5) Levitating open **Skill Grimoire** with glowing script lines and rising sigils, and (6) 8-point radiant staff supernova burst + 3 crackling jagged arcane lightning arcs—across all 4 directions (`south`, `east`, `west`, `north`), so that spellcasting is spectacular.
30. As a spectator, I want the **Workshop Room** perimeter **Preparation Station** fixtures to render the detailed props from the reference room sheets (rolling library ladder & open manuscript, forge bellows & horned anvil with red-hot billet & quench barrel, clockwork owl & cobalt blueprint table, armor stands & shield wall at the **Armory Wardrobe**, rotating cyan pentagram & crystal ball at the **Arcane Lectern**, bubbling green cauldron & condenser at the **Alchemy Lab**, and sleeping orange cat on the green armchair in the **Break Lounge**), so that the room environment matches the character art level.

## Implementation Decisions

### 1. Unified 4-Directional Articulated Character Rig Module
- A single deep **Articulated Character Rig Module** owns the `220×260` character representation and exposes a narrow interface taking the character's resolved hero traits, party palette, **Equipment Loadout** variant (`"A" | "B" | "OPENCODE" | "CARGO"`), active pose (`"idle" | "walk" | "forge" | "tinker" | "library" | "spyglass" | "alchemy" | "spellcast" | "combat" | "exhale"`), **Directional Turnaround** (`"south" | "east" | "west" | "north"`), and card-aura visibility flag (`includeCardAura: boolean`).
- **Decision-Encoding Pose & Turnaround Contract** (from the approved prototype):
  ```ts
  export type DirectionalTurnaround = "south" | "east" | "west" | "north";

  export type ArticulatedRigPoseKind =
    | "idle"
    | "walk"
    | "forge"
    | "tinker"
    | "library"
    | "spyglass"
    | "alchemy"
    | "spellcast"
    | "combat"
    | "exhale";

  export type CombatWeaponArchetypeKind =
    | "sword"   // WARRIOR: Vertical overhead-to-downward cleave + shield guard
    | "staff"   // MAGE: Vertical channel + crystal apex laser & 3 homing bolts
    | "bow"     // SCOUT: Outside-right bow riser grip + sonic arrow volley
    | "pickaxe" // SAPPER: Vertical overhead armor-cracker slam + ground shatter
    | "dagger"; // ALCHEMIST & CLERIC: Horizontal blade grip + linear viper thrust
  ```
- **Single Audited Arm, Tool, Weapon & FX Pipeline Across All 4 Directions**:
  - `leftArmLayer`, `rightArmLayer`, `cargoOverlay`, `spellcastBackMandala`, and `fxOverlay` are constructed once per call and shared across `south`, `north`, `east`, and `west`:
    - `south` composites: `backLayer` $\rightarrow$ `frontLegs` $\rightarrow$ `frontTorso` $\rightarrow$ `leftArmLayer` $\rightarrow$ `rightArmLayer` $\rightarrow$ `cargoOverlay` $\rightarrow$ `frontHead` $\rightarrow$ `fxOverlay`.
    - `north` composites: `northBackAura` $\rightarrow$ `backLegs` $\rightarrow$ `leftArmLayer` $\rightarrow$ `rightArmLayer` $\rightarrow$ `cargoOverlay` $\rightarrow$ `backTorsoAndGearCenterpiece` $\rightarrow$ `backHead` $\rightarrow$ `fxOverlay`.
    - `east` and `west` composite (with `west` wrapped in `translate(220, 0) scale(-1, 1)`): `profileBackGear` $\rightarrow$ `leftArmLayer` $\rightarrow$ `profileScissorLegs` $\rightarrow$ `profileTorso` $\rightarrow$ `profileHead` $\rightarrow$ `translate(-14, 0)[rightArmLayer]` $\rightarrow$ `translate(-12, 0)[cargoOverlay + fxOverlay]`.

### 2. Hand-Socket Grip Invariant & Outside-Body Vertical Station Biomechanics
- **Hand-Socket Grip Invariant**: Every held item's handle or shaft is positioned in local hand coordinates (`(80, 186)` for the left hand, `(140, 186)` for the right hand) so the handle passes through `(0, 0)`, and the hand `<circle r="7">` is drawn *after* (on top of) the handle.
- **Outside-Body Vertical Station Biomechanics**:
  - Left-hand **Station Work Implement**s (`Iron Tongs & Ingot`, `Cobalt Blueprint Board`, `Open Illuminated Codex`, `Golden Wayfinder Compass`, `Boiling Erlenmeyer Flask`) extend strictly outward-left (`x = 38..80`).
  - Right-hand **Station Work Implement**s (`Forge Hammer`, `Brass Machinist Spanner`, `Magnifying Loupe`, `3-Stage Brass Spyglass Telescope`, `Wooden Stirring Ladle`) extend strictly outward-right (`x = 140..180`) and animate via pure vertical translation (`translateY`) onto station workpieces positioned on the outside right (`(174, 212)` for the Horned Steel Anvil & 16 counter-phased `Wave A`/`Wave B` sparks; `(172, 208)` for the spinning Brass Clockwork Gear & calibration sparks; `(172, 214)` for the Bubbling Neon-Emerald Cauldron).

### 3. Frame-Bucketed Offscreen Sprite Caching
- To render multi-layered SVG/vector rigs with zero per-frame DOM overhead on the 60 FPS Canvas2D loop, the browser character painter quantizes continuous animation time `t` into `12` phase buckets per animation cycle (`animBucket = Math.floor(t * 12) % 12`) and caches rasterized bitmaps keyed by `${partyId}:${heroName}:${dir}:${poseMode}:${loadout}:${animBucket}` in a bounded LRU cache (`128` entries).

## Testing Decisions

### Highest Test Seam (Single Primary Seam + Architecture Gate)
1. **Articulated Character Rig, Choreography & Scene Paint Seam**:
   - Good tests exercise the public rig and choreography interfaces (`resolveCanonicalHeroTraits`, `buildArticulatedHeroSvg`, `resolveCharacterTargetSlot`, and `stepClientChoreography`) and assert on observable outputs:
     - All 54 canonical heroes across 9 parties and 6 roles resolve deterministically and produce valid 4-directional (`south`, `east`, `west`, `north`) SVG/canvas rigs.
     - Walking between waypoints sets `facingDirection` to `"east"`, `"west"`, `"north"`, or `"south"` matching the movement vector, and arriving at a **Preparation Station** orients the character to the station.
     - Every station work pose (`forge`, `tinker`, `library`, `spyglass`, `alchemy`, `spellcast`) stows combat weapons and renders the station's specific **Station Work Implement** and continuous multi-wave spark/prop overlays across all 4 directions.
     - Every role in `combat` pose maps to its exact **Combat Weapon Archetype** (`WARRIOR -> sword`, `MAGE -> staff`, `SCOUT -> bow`, `SAPPER -> pickaxe`, `ALCHEMIST / CLERIC -> dagger`) and renders its weapon-unique attack FX across all 4 directions.
2. **Architecture & Typecheck Invariant Gate**:
   - Every source file remains `<= 400` lines, 100% reachable from the server and web entrypoints, and passes `tsc --noEmit` with zero errors.

### Prior Art in the Codebase
- `tests/00-architecture-invariants.test.ts` (400-line ceiling, module reachability, and TypeScript compilation gate)
- `tests/07-core-domain-and-roles.test.ts` (party palette and hero role trait assertions)
- `tests/09-choreography-and-project-isolation.test.ts` (walker choreography, station routing, and offscreen caching assertions)

## Out of Scope

- Modifying or deleting any reference PNG files in `docs/examples/`.

## Further Notes

- External runtime libraries, open-source 2D/WebGL rendering or animation libraries, and asset packs are **in scope** wherever they improve visual fidelity, animation smoothness, or FX quality.
- Every completed vertical slice must be visually verified by capturing a headless Chrome screenshot of the live server on port `4310` saved to `docs/images/<task-name>.png` and inspecting it with `read`.
