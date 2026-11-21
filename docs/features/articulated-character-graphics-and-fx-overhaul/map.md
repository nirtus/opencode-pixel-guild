# Feature Map: 1:1 Articulated Character Graphics, 4-Directional Turnarounds, Station Work Implements & Combat/Spellcast FX Overhaul

Label: wayfinder:map

## Destination

Deliver the complete graphics and animation overhaul specified in `docs/features/articulated-character-graphics-and-fx-overhaul/spec.md` and prototyped in `docs/architecture-review/architecture-review-graphics-overhaul-20261024.html`: replace the dumbed-down primitive character and room painters with the exact 1:1 `docs/examples/characters/I..X` (54 heroes across 9 parties and 6 roles) and `docs/examples/rooms/01..10` visual anatomy; implement full 4-directional movement turnarounds (`south` front view, `east` right 3/4 profile, `west` left 3/4 profile, `north` back view); enforce hand-gripped **Station Work Implement**s with pure vertical up-and-down motions and continuous multi-wave sparks on the outside of the body (zero combat weapons during station work); implement the 5 unique **Combat Weapon Archetype** attacks (`SWORD`, `STAFF`, `BOW`, `DAGGER`, `PICKAXE`) and 6-layer `06 Enchanter's Study` spellcasting spectacle; and wire frame-bucketed offscreen bitmap caching into the live `1600×720` Canvas2D companion while keeping every source file `<= 400` lines.

## Notes

- **Domain**: 1:1 `docs/examples/characters/` & `docs/examples/rooms/` vector/canvas rendering, **Directional Turnaround** (`south`, `east`, `west`, `north`), **Station Work Implement** biomechanics, **Combat Weapon Archetype** animations (`sword`, `staff`, `bow`, `dagger`, `pickaxe`), 6-layer **Summoning Ritual** / **Arcane Lectern** spellcast geometry, and `OffscreenCanvas` frame-bucket caching.
- **Rules**: Strictly use the project root directory (`./`). Never create external worktrees or use `/tmp/opencode`. Keep every source file under 400 lines. After every visual task, capture a live headless Chrome screenshot on port `4310` to `docs/images/<task-name>.png` and visually inspect it with `read`.
- **Approved Visual Prototype**: `docs/architecture-review/architecture-review-graphics-overhaul-20261024.html` (rendered proof in `docs/images/architecture-review-graphics-overhaul.png`).
- **Skills to consult**: `codebase-design`, `domain-modeling`, `tdd`.

## Decisions so far

<!-- the index: one line per closed ticket, enough to judge relevance, then zoom the link for the detail the ticket holds -->

- **Visual Prototype & Biomechanical Audit Locked (`docs/architecture-review/architecture-review-graphics-overhaul-20261024.html`)**: Locked in 1:1 `docs/examples/characters/I..X` anatomy across all 54 heroes (9 parties × 6 roles), 4-directional turnarounds (`south`, `east`, `west`, `north`) sharing a single audited arm/tool/weapon/FX pipeline, hand-gripped **Station Work Implement**s with pure vertical up-and-down motions on the outside of the body (`x < 80` left, `x > 140` right) and 16 continuous multi-wave forge sparks, 5 unique **Combat Weapon Archetype** animations (`WARRIOR` sword cleave, `MAGE` staff laser & 3 bolts, `SCOUT` bow riser grip & arrow volley, `SAPPER` pickaxe overhead slam & ground shatter, `ALCHEMIST`/`CLERIC` horizontal steel dagger viper thrust), and the 6-layer `06 Enchanter's Study` spellcasting mandala, levitating open **Skill Grimoire**, 8-point supernova, and crackling lightning arcs.
- **[01: 1:1 Canonical 54-Hero Roster & South-Facing Articulated Rig on Live Canvas](issues/01-canonical-54-hero-roster-and-south-rig-on-live-canvas.md)**: Partitioned the 54-hero roster catalog (`src/sprites/hero-party-catalog.ts`) and 1:1 SVG rig builders (`hero-rig-anatomy.ts`, `hero-rig-arms-and-tools.ts`, `hero-rig-fx-and-combat.ts`, `hero-vector-rig.ts`) into `< 400` line modules and wired bounded LRU image caching into `src/web/canvas-hero-painter.ts`.
- **[02: 4-Directional Movement Turnarounds (`south`, `east`, `west`, `north`) & Station Orientation](issues/02-four-directional-movement-turnarounds-and-station-orientation.md)**: Added `deriveFacingDirectionFromDelta` and `resolveStationFacingDirection` and wired `walker.facingDirection` into `src/web/client-choreography.ts` so characters dynamically turn into `south`, `east`, `west`, and `north` during Toil Queue walks and station work.
- **[03: Hand-Gripped Station Work Implements, Pure Vertical Up-Down Actions & Continuous Sparks](issues/03-hand-gripped-station-work-implements-and-vertical-actions.md)**: Enforced combat weapon stowing during station work and equipped outside-body hand-gripped station tools (`Forge Hammer + Tongs`, `Brass Spanner + Blueprint`, `Open Codex + Loupe`, `3-Stage Brass Spyglass + Compass`, `Wooden Ladle + Boiling Flask`) with pure vertical `translateY` actions and continuous multi-wave sparks.
- **[04: Weapon-Specific Combat Attacks (`SWORD`, `STAFF`, `BOW`, `DAGGER`, `PICKAXE`) & 6-Layer Spectacular Spellcasting](issues/04-weapon-specific-combat-attacks-and-spectacular-spellcasting.md)**: Bound each role to its unique Combat Weapon Archetype (`WARRIOR -> sword`, `MAGE -> staff`, `SCOUT -> bow`, `SAPPER -> pickaxe`, `ALCHEMIST & CLERIC -> dagger`) and implemented the 6-layer `06 Enchanter's Study` spellcasting mandala, levitating grimoire, supernova, and lightning bolts across all 4 directions.
- **[05: 1:1 Reference Workshop Room Station Props & Full World Visual Verification](issues/05-reference-workshop-room-station-props-and-visual-verification.md)**: Upgraded `src/web/canvas-room-painter.ts` with reference props (rolling library ladder, forge accordion bellows & billet, clockwork owl with cyan lenses, Arcane Lectern pentagram rune circle) and verified all 122 tests and live rendering on port `4310`.

## Not yet specified

<!-- in-scope fog you can't ticket yet; graduates as the frontier advances -->

## Out of scope

- Deleting or altering any reference PNG assets in `docs/examples/`.
- Note: External runtime libraries, open-source 2D/WebGL rendering or rigging libraries, and asset packs ARE in scope wherever they improve visual fidelity, animation smoothness, or FX quality.
