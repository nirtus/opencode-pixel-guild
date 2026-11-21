# Step 2 Specification: Guild Rooms & Specialized Chambers (`01`–`10`)

**Reference Standard:** `docs/examples/rooms/01 Grand Library@1x.png` through `10 Artificer's Workshop@1x.png`  
**Live 1:1 Animated Preview:** `./docs/features/modular-refactor-and-128px-craftpix-encounters/sketches/rooms-preview.html`

---

## 1. Architectural Language & Shared Room Anatomy

Every chamber in the Guild Compound follows the exact top-down architectural style of `docs/examples/rooms/`:

1. **Perimeter Masonry / Conservatory Walls (`32px` border)**:
   - Staggered stone/brick courses (`#59483e`, `#4a3e37`, `#221b36`, `#6e4230`) or aqua glass conservatory panes (`#bce3dc` in Room 08) with a dark `#281e18` inner frame outline (`3px`) and a soft radial interior wall vignette shadow (`rgba(0,0,0,0.38)`).
2. **Textured Floor Surfaces**:
   - **Staggered Wood Floorboards** (Rooms `01`, `05`, `09`, `10`): Warm oak/walnut planks with alternating row offsets, plank joint lines, nail-head dots (Room `05`), or workshop oil stains (Room `10`).
   - **Chiselled Stone Slabs** (Rooms `02`, `06`, `07`): Staggered stone flagstones with subtle surface chisel marks.
   - **Square Grid Tiles** (Rooms `04`, `08`): Dark slate alchemy tiles (`#454b4b`) or warm terracotta greenhouse tiles (`#b87352`).
3. **South Swing Doorway**:
   - Centered bottom doorway opening (`60px` wide) with an inward-swung wooden door leaf on the left jamb and a **dashed quarter-circle door-swing arc**.
4. **Lighting & Diffused Drop Shadows**:
   - Every fixture and prop casts a soft diffused drop shadow (`rgba(0,0,0,0.38)`, blur `10px`, offset `5px, 7px`).
   - Windows cast translucent trapezoidal daylight shafts (`rgba(255,220,145,0.42)`), while furnaces, cauldrons, braziers, candles, and rune circles emit soft radial color glows.

---

## 2. The 9 Specialized Guild Chambers & OpenCode Action Mapping

Instead of a single generic room, each Project World organizes its indoor Guild Hall into specialized chambers from `docs/examples/rooms/` (connected around a central corridor/courtyard so widescreen displays are richly utilized):

| Room ID | Chamber Name | Signature Fixtures & Props (1:1 with Reference) | OpenCode Action & Tool Mapping | Live 60 FPS Animations |
|---|---|---|---|---|
| **01** | **GRAND LIBRARY** | 4 wall bookcases with colorful book spines, NW rolling ladder, reading desk (open manuscript, 3 stacked books, candle, quill & inkwell), green chair, NE floor book pile, crimson fringed rug, 6-candle brass wheel chandelier, SW green armchair with **sleeping orange cat**, round side stool, SE terrestrial globe & magnifier. | **Preparation (`read`)**: Reading files, inspecting `GLOSSARY.md` / ADRs / specs, loading documentation. | Gently swaying brass chandelier, flickering desk candle, and breathing sleeping orange cat in the armchair. |
| **02** | **SMITHY FORGE** | North red-brick hearth furnace with glowing ember bed & tongs, NW coal bunker, coal shovel & accordion leather bellows, west hammer rack, water quench barrel & bucket, center tree-stump & horned steel anvil with **red-hot blade billet** & floor hammer, east weapon table (2 swords, axe, spear, round shield), SE grindstone with crank. | **Execution (`bash`)**: Running shell commands, build scripts, compilers, and test suites. | Pulsing orange furnace coals, pumping bellows, glowing red-hot blade billet on the anvil, and water ripples in the quench barrel. |
| **04** | **ALCHEMY LAB** | North specimen jar shelves (eyeball, skull, colored reagents), hanging **sea-dragon skeleton**, west open alchemy spellbook & floating candle, SW x-braced reagent crates, center bubbling neon-green cauldron with ladle, east distillation table (violet flask, curved glass tubes, coiled copper condenser, green receiver flask, test-tube rack, mortar & pestle) + spilled purple potion puddle. | **Code Mode (`execute`) & Distillation**: Running scripted tool pipelines, data synthesis, and reagent preparation. | Swirling green cauldron with rising/popping bubbles, flowing condenser liquid, hovering candle orb, and gently swaying hanging skeleton. |
| **05** | **NAVIGATOR'S LOOKOUT** | 3 north oceanfront windows overlooking a **sandy beach, blue sea with wave crests, seagulls & rowboat with oars**, 3 daylight shafts, NE brass tripod spyglass, center grand sea-chart table (parchment map with islands, red dashed route to `X`, compass, calipers, corner weights), west canvas hammock & sea chest, east scroll cubby, SE globe, coiled rope & barrels. | **Reconnaissance (`websearch`, `webfetch`, `glob`, `grep`)**: Searching the web, fetching URLs, and charting wayfinder `map.md` routes. | Rolling white ocean waves outside the windows, bobbing rowboat, and glinting spyglass optics. |
| **06** | **ENCHANTER'S STUDY** | North bookcases & night-sky star window, center **cyan arcane pentagram & tick-mark rune circle** around an octagonal pedestal & glossy blue crystal ball, **3 levitating open spellbooks**, 3 floating candle orbs, west scriptorium desk & chair, east 7-orb rack, SE **perched owl familiar** & glowing wizard staff. | **Skills & Subagents (`skill`, `subagent`)**: Equipping Skill Grimoires and casting the Summoning Ritual to materialize Squad Subagents. | Slowly rotating cyan pentagram rune circle, pulsing crystal ball, bobbing levitating spellbooks, and blinking owl familiar. |
| **07** | **ARMORY** | North heraldic shield wall (4 red/blue shields, center targe with crossed broadswords, 2 spear racks), 4 full-plate armor stands with red plumes & mounted halberds, center tripod fire brazier, south crimson diamond runner rug, SW **straw training dummy** (`x x` eyes & practice arrow), SE arrow crate & quiver barrel. | **Verification & Guardrails (`code-review`, `tdd`, `permission`)**: Standards & spec reviews, git guardrails, and Warrior combat readiness. | Blazing tripod brazier coals casting warm flickering light across the plate armor stands. |
| **08** | **HERBALIST GREENHOUSE** | Aqua glass conservatory perimeter walls with diagonal sunlight beam, north potting bench, 3 raised soil planter beds (8 green cabbages, 6 star ferns with dibber, 7 red blossoms), center oval stone **Koi pond** (lily pads, lotus, 2 swimming Koi fish, bamboo water spout), south berry bush, SE **carnivorous Snapper Plant** & 2 orange butterflies. | **Worktree Nursery & Wilderness Gateway**: Seeding isolated git worktrees and stepping outdoors into the vegetation/wilderness biome. | Swimming orange-and-white Koi fish, expanding pond water ripples, and fluttering butterflies. |
| **09** | **COUNCIL HALL** | North stone hearth fireplace with blazing crossed logs & poker, 2 potted shrubs, 3 wall sconces, center circular fringed crimson rug & round oak council table with **8 radial crimson armchairs**, angled **Quest Map** with colored tokens & red dashed path, wine goblets, plates, candle & **2 ivory dice**, west waiting benches & golden trophy, east buffet & ale keg. | **Planning & Break Lounge (`plan` agent, `grilling`, `to-spec`, `to-tickets`, Idle Rest)**: Squad strategy, ticket breakdown, and resting between turns. | Roaring hearth log fire, warm sconce halos, and pulsing quest tokens on the council map. |
| **10** | **ARTIFICER'S WORKSHOP** | NW tinkerer's bench (vise, **Clockwork Owl**, magnifier lamp, wrench, screwdriver), north/east copper steam pipeline with 2 red valve wheels & pressure gauge, west **Automaton Assembly Table** (brass clockwork automaton with cyan eye, chest dial, wires & legs), east riveted steel deck with **3 interlocking brass/copper gears** & control console, SW blue schematic blueprint table, SE red toolbox, oil can & **crackling Tesla coil**. | **Code Authoring (`edit`, `write`) & Feature Goal Assembly**: Writing code and fitting crafted parts onto the central **Automaton & Gear Machine**. | **Bleak Unbuilt vs. Vibrant Built**: Unbuilt feature parts appear dim/motionless; as tasks complete, the 3 interlocking brass gears spin, the Automaton's cyan eye & gauge light up, the console screen turns green, and the Tesla coil crackles with white lightning arcs! |

---

## 3. Modular Code Architecture for Rooms (`<220` Lines per File)

- `src/scene/rooms/room-shell-painter.ts` (`~160 lines`): Shared wood-plank, stone-slab, and grid-tile floors, brick/glass perimeter walls, window sunbeams, and south swing doorway.
- `src/scene/rooms/library-and-study-painter.ts` (`~190 lines`): Rooms `01` (Grand Library) and `06` (Enchanter's Study).
- `src/scene/rooms/forge-and-armory-painter.ts` (`~190 lines`): Rooms `02` (Smithy Forge) and `07` (Armory).
- `src/scene/rooms/alchemy-and-greenhouse-painter.ts` (`~190 lines`): Rooms `04` (Alchemy Lab) and `08` (Herbalist Greenhouse).
- `src/scene/rooms/lookout-and-council-painter.ts` (`~190 lines`): Rooms `05` (Navigator's Lookout) and `09` (Council Hall).
- `src/scene/rooms/artificer-assembly-painter.ts` (`~200 lines`): Room `10` (Artificer's Workshop) including the Bleak-to-Vibrant Goal Assembly Automaton & Interlocking Gear Machine.
