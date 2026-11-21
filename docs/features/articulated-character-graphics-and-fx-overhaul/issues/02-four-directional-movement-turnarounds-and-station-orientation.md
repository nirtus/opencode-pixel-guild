# 02: 4-Directional Movement Turnarounds (`south`, `east`, `west`, `north`) & Station Orientation

Type: task
Label: ready-for-agent
Status: resolved

**What to build:** Enable every **Guild Adventurer** and **Squad Subagent** on the live 2D canvas to dynamically turn into the direction they are moving (`south` front view, `east` right 3/4 profile, `west` left 3/4 profile, and `north` full back view) as they walk along the **Toil Queue** ring-corridor and orient to their occupied **Preparation Station**.

**Blocked by:** 01: 1:1 Canonical 54-Hero Roster & South-Facing Articulated Rig on Live Canvas

**Status:** resolved

- [x] Walking characters compute their 4-way **Directional Turnaround** (`"south" | "east" | "west" | "north"`) from their active movement vector `(dx, dy)` (`|dx| >= |dy|` $\rightarrow$ `"east"` / `"west"`; `|dy| > |dx|` $\rightarrow$ `"south"` / `"north"`).
- [x] Stationary characters orient to their occupied **Preparation Station** (`"north"` at North Wall stations, `"east"` in **Dungeon Wilds** search and combat, `"south"` in **Break Lounge** and southern stations).
- [x] `east` and `west` 3/4 profile views render trailing back-gear on the back side (flowing cape, arrow-packed quiver, wooden alchemist backpack & vials, sacred halo, dynamite bundle), scissor-gait profile legs with rounded boot toes pointing forward in the movement direction, 3/4 role torso outfits (including the Alchemist's 3-vial bandolier and Mage robe stars), and 3/4 heads with dual-catchlight eyes, profile nose, expression eyebrows/mouth, beard, and 3/4 headgear.
- [x] `north` back view renders back-view leather boots with heel trim, full back-gear centerpiece (layered royal cape, flared back robes & stole, arrow-packed quiver with 3 feathered arrows, unobstructed wooden alchemist backpack frame & vials, sacred halo & back sun scapular, back-mounted dynamite pack), cascading back hair, and back views of all 7 headgear types.
- [x] Automated tests verify 4-way movement turnaround transitions and complete SVG/canvas rendering across `south`, `east`, `west`, and `north`.

## Answer

Implemented `deriveFacingDirectionFromDelta(dx, dy)` and `resolveStationFacingDirection(station)` in `src/sprites/hero-party-catalog.ts`, `buildNorthAnatomyLayers` and `buildProfileAnatomyLayers` in `src/sprites/hero-rig-anatomy.ts`, and wired `walker.facingDirection` into `src/web/client-state.ts`, `src/web/client-choreography.ts`, `src/web/canvas-hero-painter.ts`, and `src/web/app-main.ts`.
