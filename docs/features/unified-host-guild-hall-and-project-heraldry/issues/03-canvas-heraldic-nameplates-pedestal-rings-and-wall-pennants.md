# 03: On-Canvas Heraldic Nameplates, Project Pedestal Rings & North Wall Pennants

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 02: Project-Seeded Guild Order Uniforms & Collision-Free Project Heraldry

**What to build:** Render unmistakable on-canvas **Project Heraldry** for every character and on the **Workshop Room** North Wall—including underfoot project pedestal rings, two-segment `[CREST SHORT-TAG] Title` nameplates, and North Wall project pennants—so spectators can tell at a glance which project each character in the room belongs to.

**Blocked by:** 02: Project-Seeded Guild Order Uniforms & Collision-Free Project Heraldry

**Status:** resolved

- [x] Every character on the **Guild Floorplan** stands on an underfoot **Project Pedestal Ring** colored in their project's primary and accent hex—rendered as a solid ring for root **Guild Adventurers** and a dashed satellite ring for child **Squad Subagents**.
- [x] Every character's underfoot canvas nameplate renders as a two-segment heraldic pill framed in the project's accent color: the left segment (filled with the project's primary color) displays the project crest and short tag (plus a `🌿` indicator when inside a Git worktree), and the right segment displays the character's session title.
- [x] Hovering a character on the canvas displays their **Project Heraldry** crest and project name in the scene tooltip.
- [x] The North Wall of the **Workshop Room** displays the connected OpenCode host's Guild Hall title flanked by colored heraldic pennants for each active project co-habiting the room.
- [x] Automated and visual verification confirm that multi-project pedestal rings, two-segment nameplates, and North Wall pennants render clearly on the live canvas.

## Answer

Updated `drawCharacterHero` (`src/web/canvas-hero-painter.ts`) to paint underfoot Project Pedestal Rings and two-segment `[CREST SHORT-TAG] Title` nameplates, added the `Project Heraldry` detail row to `buildCharacterTooltip` (`src/hud/tooltip-encounters-vm.ts`), and rendered North Wall project pennants in `renderWorkshopRoom` (`src/web/canvas-room-painter.ts`).
