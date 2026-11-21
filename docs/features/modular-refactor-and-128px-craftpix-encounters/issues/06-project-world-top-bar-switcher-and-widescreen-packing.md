# 06: Project World Top Bar Switcher & Widescreen Spatial Packing

**What to build:**
Replace the single-column infinite vertical room stacking with dedicated Project Worlds. A spectator top bar tab menu allows switching between project worlds instantly, utilizing 100% of widescreen canvas space without empty margins or coordinate shift.

**Blocked by:** 02: Spatial Layout Micro-Modules Decomposition (<250 Lines per File).

**Status:** resolved

- [x] Implement `layoutProjectWorld` in `src/spatial/` (<220 lines), isolating canonical project rooms and their worktree annexes.
- [x] Add top bar Project World tab switcher in `src/web/app.html`, displaying active projects with badge counts.
- [x] Camera auto-fits the active Project World bounds, eliminating infinite vertical scrolling.
- [x] All annexation and worktree tests pass green without coordinate shift.

## Comments
Resolved with `src/spatial/project-world.ts` isolating project worlds and worktree annexes, top bar project switcher tabs in `app.html`, and full widescreen space utilization. 71/71 automated tests pass green.
