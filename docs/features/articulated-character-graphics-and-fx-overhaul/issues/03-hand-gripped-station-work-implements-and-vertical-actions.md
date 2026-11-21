# 03: Hand-Gripped Station Work Implements, Pure Vertical Up-Down Actions & Continuous Sparks

Type: task
Label: ready-for-agent
Status: resolved

**What to build:** Upgrade all **Preparation Station** work animations (`Anvil Forge`, `Crafting Workbench`, `Library Study Bookshelf`, `Observatory Spyglass`, `Alchemy Lab`) and two-handed **Resource Cargo** / **Report Scroll** hauling across all 4 directions (`south`, `east`, `west`, `north`) so that working characters stow all combat weapons, grip their station-specific **Station Work Implement** through the hand center (`(80, 186)` left / `(140, 186)` right) with the hand `<circle>` drawn over the handle, and execute pure vertical up-and-down (`translateY`) motions strictly on the outside of the body with continuous multi-wave sparks and station workpieces.

**Blocked by:** 02: 4-Directional Movement Turnarounds (`south`, `east`, `west`, `north`) & Station Orientation

**Status:** resolved

- [x] Working at any **Preparation Station** (`forge`, `tinker`, `library`, `spyglass`, `alchemy`, `spellcast`) stows all combat weapons (`sword`, `axe`, `shield`, `bow`, `dagger`, `mace`, `bomb`, `pickaxe`) and equips the station's exact **Station Work Implement** with the hand `<circle>` drawn on top of the grip.
- [x] **Anvil Forge (`bash`)**: Left hand holds **Iron Blacksmith Tongs & a Glowing Ingot** on the outside left (`x < 80`); right hand grips the **Blacksmith's Forge Hammer** extending outward-right (`x = 140..174`) and smashes in a pure vertical up-and-down motion (`translateY(-36px)` $\leftrightarrow$ `translateY(8px)`) onto a **Horned Steel Anvil & White-Hot Billet** at `(174, 212)` with an impact starburst flash and 16 continuous counter-phased `Wave A`/`Wave B` sparks.
- [x] **Crafting Workbench (`edit`/`write`)**: Left hand holds a **Cobalt Engineering Blueprint Board** on the outside left; right hand grips a **Brass Machinist Spanner** extending outward-right (`x = 140..172`) moving purely vertically up-and-down (`translateY(-26px)` $\leftrightarrow$ `translateY(6px)`) onto a spinning **Brass Clockwork Gear** at `(172, 208)` with cyan and gold calibration sparks.
- [x] **Library Study Bookshelf (`read`), Observatory Spyglass (`search`) & Alchemy Lab (`execute`)**: Characters hold **Open Illuminated Codex + Magnifying Loupe** (with floating knowledge glyphs), **3-Stage Brass Spyglass Telescope + Compass** (with radar scan cone), and **Boiling Erlenmeyer Flask + Wooden Stirring Ladle** (plunging vertically into a **Bubbling Neon-Emerald Cauldron** at `(172, 214)`) strictly on the outside of the body.
- [x] **Resource Cargo & Report Scroll Hauling**: Characters carrying **Resource Cargo** or a **Report Scroll** hold the crate/scroll in a two-handed clasp in front of their chest, and **Compaction Exhalation** renders rising silver-cyan breath clouds above the head.
- [x] All station work actions and sparks render identically and consistently across `south`, `east`, `west`, and `north`, verified by unit tests.

## Answer

Implemented station work tool override in `src/sprites/hero-rig-arms-and-tools.ts`, continuous multi-wave station sparks and workpieces (`fx-spark-a`, `fx-spark-b`, `fx-impact-flash`, `fx-rune-spin`, `fx-float-2`, `anim-bubble-1/2`, `anim-breath-1/2`) in `src/sprites/hero-rig-fx-and-combat.ts`, and pure vertical `translateY` keyframes in `src/sprites/hero-vector-rig.ts`.
