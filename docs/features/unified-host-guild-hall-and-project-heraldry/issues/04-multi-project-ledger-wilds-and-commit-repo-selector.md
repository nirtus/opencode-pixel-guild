# 04: Multi-Project Dungeon Wilds & Project-Tagged Bug Monsters

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01: Unified Host Workshop Room Co-Habitation & Non-Isolating Project Legend, 02: Project-Seeded Guild Order Uniforms & Collision-Free Project Heraldry

**What to build:** Aggregate active **Debugging Hunt** encounters across all open projects co-habiting the unified host **Workshop Room** into the shared **Dungeon Wilds**, prefixing each **Bug Monster**'s overhead banner with its source project's **Project Heraldry** short tag (`🐛 [SHORT-TAG] BUG: ...`) and routing debugging characters from any open project into combat with their project's monster.

**Blocked by:** 01: Unified Host Workshop Room Co-Habitation & Non-Isolating Project Legend, 02: Project-Seeded Guild Order Uniforms & Collision-Free Project Heraldry

**Status:** resolved

- [x] Active **Bug Monsters** in the shared **Dungeon Wilds** aggregate across all visible characters from all projects in the unified host **Workshop Room** (up to 4 concurrent lair positions) rather than filtering to a single project.
- [x] Each **Bug Monster**'s overhead banner on the canvas and hover tooltip prefixes the defect name with its source project's **Project Heraldry** short tag (`🐛 [SHORT-TAG] BUG: ...`) and frames the banner with the project's heraldic accent color.
- [x] Characters in a **Debugging Hunt** **Workflow Intent** from any open project on the host venture into the shared **Dungeon Wilds** with **Lantern Flares** and engage in melee/ranged combat against their project's **Bug Monster**.
- [x] Automated and visual tests verify that simultaneous debugging turns across two or more projects on the same host spawn project-tagged **Bug Monsters** in the shared **Dungeon Wilds** and route each project's characters into combat.

## Answer

Updated `deriveProjectBugMonsters` in `src/web/canvas-wilds-painter.ts` to resolve each monster's source character `ProjectHeraldryDescriptor`, prefix monster titles with `[${heraldry.shortTag}]`, and tint monster auras with the project's heraldic accent color across all active projects in the unified host room.
