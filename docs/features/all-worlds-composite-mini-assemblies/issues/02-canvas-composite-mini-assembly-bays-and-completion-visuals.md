# 02: Canvas Composite Mini-Assembly Bays & Visually Distinct Completion Rendering

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01

**What to build:** Deepen the canvas **Goal Assembly Site** painter (`src/web/canvas-mini-assembly-painter.ts` and `src/web/canvas-assembly-painter.ts`) so that when `🌐 All` is selected in the top-bar `Worlds:` row, the central platform is composed of minimized versions of the assemblies of all canonical host projects (**Project Mini-Assemblies**), each visually representing its project's status and making completion (`★ COMPLETE`) unmistakably distinct.

## Acceptance Criteria

- [x] Extract `src/web/canvas-mini-assembly-painter.ts` (`< 300` lines) and keep `src/web/canvas-assembly-painter.ts` well under `350` lines (`tests/00-architecture-invariants.test.ts`).
- [x] Extend `resolveActiveGoalAssemblyAndLayout()` in `src/web/canvas-assembly-painter.ts` to return `isMultiProjectScope`, `projectAssemblies`, and `multiProjectLayout` (`computeMultiProjectAssemblyPlatformLayout`).
- [x] When a **single project** is focused in `Worlds:` (`!isMultiProjectScope`), keep the full-scale single-project Artificer platform (left socket deck + right clockwork gears, pressure gauge, digital console, and Tesla coil).
- [x] When **`🌐 All`** is selected in `Worlds:` (`isMultiProjectScope` with `projectAssemblies.length >= 1`), render the central platform's outer crimson/gold rug, riveted steel grid plate, and copper steam conduit frame at `(390, 345)`, and compose the inner platform deck out of **Project Mini-Assembly** bays (`renderMultiProjectMiniAssembliesOnCanvas`):
  1. **Project Heraldry Identity**: Draw each bay's header badge with `[CREST SHORT-TAG]` and project-tinted border (`primaryHex` / `accentHex`).
  2. **Miniaturized Mechanism & Part Pip Matrix**: Draw a mini clockwork gear / core emblem and a row/grid of mini **Assembly Part** pips representing `fitted` vs. `unbuilt` parts for that project.
  3. **Visually Distinct Statuses & Unmistakable Completion**:
     - **`"complete"` (`★ COMPLETE`, `100%`)**:
       - Radiant dual border (outer gold `#fbbf24` + inner emerald `#10b981`) over a rich emerald-slate fill (`#064e3b` / `#0f172a`) with an animated golden glow pulse.
       - Spinning golden gear (`#fbbf24`) + golden monument crown/star (`★`) + crackling cyan Tesla lightning arcs (`#d8f8ff`).
       - All mini **Assembly Part** pips filled in vibrant emerald (`#10b981`) with golden (`#fde047`) borders.
       - High-contrast completion banner at the bottom of the bay: `★ DONE N/N` (or `✓ 100%`).
     - **`"in-progress"` (`⚙️ IN PROGRESS`, `0 < fitted < total`)**:
       - Solid **Project Heraldry** border (`accentHex` / `primaryHex`) over dark slate (`rgba(15, 23, 42, 0.90)`).
       - Spinning brass clockwork gear (speed proportional to `completionRatio`) + mini console light.
       - Fitted pips filled in the project's vibrant `primaryHex` with `#fbbf24` border; unbuilt pips in dashed cyan wireframe (`#7ce8ff`).
       - `⚙️ X/Y (P%)` status footer.
     - **`"open"` (`📐 OPEN`, `0/Y`)**:
       - Muted project border (`secondaryHex`), stationary bronze gear (`0` speed), bleak dashed wireframe pips, and `📐 0/Y OPEN` footer.
     - **`"blueprint-ready"` (`✨ READY`, `0/0`)**:
       - Calm dashed cyan blueprint wireframe border (`#38bdf8`), static blueprint reticle/compass emblem, and `✨ READY 0/0` footer.
- [x] Update the top platform banner pill at `(390, 244)` in `🌐 All` mode to summarize the multi-project assembly state (including completed project count `★C Done` when any project is complete).
- [x] Update `renderMobileGoalAssemblyCore` so mobile viewports in `🌐 All` mode render segmented per-project arcs around the core ring (highlighting completed projects in emerald/gold) and show project completion summary text.
- [x] Add canvas rendering tests in `tests/33-assembly-results-showcase.test.ts` and `tests/09-choreography-and-project-isolation.test.ts` verifying that `renderGoalAssemblySite` in `🌐 All` mode draws each project's `[CREST SHORT-TAG]`, status badge (`★ DONE`, `⚙️ X/Y`, `✨ READY`), and completion visuals.

## Answer

Created `src/web/canvas-mini-assembly-painter.ts` (234 lines) and updated `src/web/canvas-assembly-painter.ts` (296 lines) so `renderGoalAssemblySite` in `🌐 All` mode composes the central **Goal Assembly Site** platform out of **Project Mini-Assembly** bays with `[CREST SHORT-TAG]` headers, mini clockwork mechanisms, **Assembly Part** pip matrices, and visually unmistakable completion (`★ DONE N/N` with dual gold-emerald border, pulsing aura, monument star, and Tesla arcs vs. `⚙️ X/Y`, `📐 0/Y OPEN`, and `✨ READY 0/0`).
