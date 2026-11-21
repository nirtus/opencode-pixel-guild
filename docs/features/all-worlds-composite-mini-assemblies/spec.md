# Feature Specification: All-Worlds Composite Mini-Assemblies on the Goal Assembly Site

Label: ready-for-agent

## Problem Statement

When a **Guild Operator** selects `🌐 All` in the top-bar `Worlds:` row (`clientState.isAllWorldsFocused === true` or `selectedProjectId === null`), the central **Goal Assembly Site** on the **Workshop Room** canvas (`(390, 345)`) and the **Guild Results Showcase** in the **Guild Master Ledger** exhibit three compounding architectural and visual deficiencies:

1. **Lossy Flattening Across Projects (`src/encounter/assembly-results.ts`)**:
   - In `deriveGuildAssemblyShowcase` (`src/encounter/assembly-results.ts:329–364`), `isMultiProjectScope: true` concatenates all deliverables from all projects into a single flat `combined.slice(0, 12)` array and computes a single blended `fittedCount / totalParts` ratio and a single `GoalAssemblyMilestoneTier`.
   - If Project A has `4/4` **Assembly Parts** fitted (`100% Complete` — Tier 3 Master Guild Monument) and Project B has `0/4` fitted (`0% Open` — Tier 1), `🌐 All` blends them into `4/8 (50% — Tier 2)`. Individual project statuses and Project A's completion are erased.
2. **Clean `0/0 Blueprint Ready` Projects Disappear from `🌐 All` (`src/encounter/assembly-results.ts:127–130, 186`)**:
   - Any room with a hydrated `taskProgress`—including `BLUEPRINT_READY_TASK_PROGRESS` (`0/0` after a Git commit or clean status sweep)—is added to `roomsWithHydratedProgress`. Because `prog.totalTasks <= 0` skips `explicitDeliverablesByRoom` and `roomsWithHydratedProgress` suppresses `characterDeliverables`, clean or freshly committed projects vanish completely from the `🌐 All` **Goal Assembly Site**.
3. **Single-Machine Canvas Rigidity & Missing Completion Distinction (`src/web/canvas-assembly-painter.ts`)**:
   - `renderGoalAssemblySite` (`src/web/canvas-assembly-painter.ts:127–388`) only has a single-project layout: one large Artificer machine on the right (`x: 70..165`) and one flat anonymous N-socket grid on the left (`GOAL_ASSEMBLY_DECK_BOUNDS_PX = { x: 286, y: 274, w: 148, h: 132 }`), coloring sockets by `SOCKET_FITTED_PALETTE[socket.partIndex % 5]` instead of **Project Heraldry**.
   - Spectators cannot see a minimized assembly per project, cannot tell which project each part belongs to, and cannot visually distinguish a **completed** project assembly (`★ COMPLETE`) from an **in-progress** (`⚙️ IN PROGRESS`), **unstarted** (`📐 OPEN`), or **clean** (`✨ BLUEPRINT READY`) project.

## Architectural Solution (`@improve-codebase-architecture`)

See `docs/architecture-review/architecture-review-20261108-all-worlds-mini-assemblies.html` for the full architectural audit and visual comparison.

### 1. Deepen the Encounter Derivation & Spatial Layout Seam (`src/encounter/project-mini-assemblies.ts`, `src/encounter/assembly-results.ts`, `src/types/goal-assembly-catalog.ts`)
- Keep all files strictly `<= 400` lines (`tests/00-architecture-invariants.test.ts`) by extracting per-project mini-assembly derivation and multi-project platform layout into `src/encounter/project-mini-assemblies.ts` (re-exported through `src/encounter/index.ts`).
- Define canonical **Project Mini-Assembly** contracts:
  - `ProjectMiniAssemblyStatus`: `"complete" | "in-progress" | "open" | "blueprint-ready"`
    - `"complete"`: `totalParts > 0 && fittedCount >= totalParts`
    - `"in-progress"`: `totalParts > 0 && fittedCount > 0 && fittedCount < totalParts`
    - `"open"`: `totalParts > 0 && fittedCount === 0`
    - `"blueprint-ready"`: `totalParts === 0`
  - `ProjectMiniAssemblyState`:
    - `projectId: string` (canonical project root matching `Worlds:` row tabs)
    - `roomId: string` (primary room ID for the project)
    - `projectName: string`
    - `shortTag: string`
    - `crestIcon: string`
    - `partyKey: string`
    - `primaryHex: string`
    - `secondaryHex: string`
    - `accentHex: string`
    - `featureSlug: string`
    - `source: "docs/features" | "subagents" | "session-results" | "working-tree" | "none"`
    - `status: ProjectMiniAssemblyStatus`
    - `statusLabel: string` (e.g. `"★ COMPLETE"`, `"⚙️ IN PROGRESS"`, `"📐 OPEN"`, `"✨ READY"`)
    - `fittedCount: number`
    - `totalParts: number`
    - `completionRatio: number` (`0..1`)
    - `percentComplete: number` (`0..100`)
    - `isComplete: boolean`
    - `milestone: GoalAssemblyMilestoneTier`
    - `parts: readonly GoalAssemblyPartState[]`
  - `ProjectMiniAssemblyBaySpec`:
    - `bayIndex: number`, `projectId: string`, `x: number`, `y: number`, `w: number`, `h: number` (in room coordinates `800×720` around `(390, 345)`).
- In `deriveGuildAssemblyShowcase`:
  - Discover all canonical host projects (`listHostProjectHeraldries(snapshot)` / `resolveRoomCanonicalProjectRoot`), rolling up any child Git `.worktrees` into their parent canonical project so the `projectAssemblies` array has a `1:1` correspondence with the project buttons in the top-bar `Worlds:` row.
  - Fix the `0/0 Blueprint Ready` suppression bug: a room whose `taskProgress` has `totalTasks === 0` (`Blueprint Ready`) only suppresses fallback `characterDeliverables` if it was explicitly reset to `Blueprint Ready` after a commit or has no unviewed completed session deliverables; and in `🌐 All` mode, every canonical host project is always included in `showcase.projectAssemblies` (even when `0/0 Blueprint Ready`).
  - Expose `projectAssemblies: readonly ProjectMiniAssemblyState[]` and `isMultiProjectScope: boolean` on `GuildAssemblyShowcaseState` (and `activeGoalAssembly` in `GuildMasterLedgerViewModel`).

### 2. Deepen the Canvas Goal Assembly Site Painter for `🌐 All` Mini-Assemblies (`src/web/canvas-mini-assembly-painter.ts` & `src/web/canvas-assembly-painter.ts`)
- Extract `src/web/canvas-mini-assembly-painter.ts` (`< 300` lines) so `src/web/canvas-assembly-painter.ts` drops well below 350 lines.
- **When a single project is focused in `Worlds:` (`!isAllWorldsFocused && selectedProjectId !== null`)**:
  - Render the existing full-scale single-project Artificer platform (left socket deck + right clockwork gears, pressure gauge, console, and Tesla coil), enhanced so fitted sockets also carry subtle **Project Heraldry** accents.
- **When `🌐 All` is selected in `Worlds:` (`isAllWorldsFocused || selectedProjectId === null`)**:
  - Render the ornate crimson/gold fringed rug, riveted steel grid plate, and outer copper steam frame at `(390, 345)`, and partition the steel platform deck (`GOAL_ASSEMBLY_MULTI_BAY_BOUNDS_PX = { x: 280, y: 264, w: 220, h: 160 }` in `800×720` room coordinates) into a **responsive grid of Project Mini-Assembly bays** (`computeMultiProjectAssemblyPlatformLayout(projectAssemblies.length, GOAL_ASSEMBLY_MULTI_BAY_BOUNDS_PX)`):
    - `1` project: `1×1` centered mini-assembly bay (or full bay).
    - `2` projects: `2` columns × `1` row (`1×2`).
    - `3` projects: `3` columns × `1` row (`1×3`) or `2×2`.
    - `4` projects: `2` columns × `2` rows (`2×2`).
    - `5–6` projects: `3` columns × `2` rows (`2×3`).
    - `7–8` projects: `4` columns × `2` rows (`2×4`).
  - Inside each **Project Mini-Assembly** bay, render:
    1. **Project Heraldry Header Strip**: Project crest and shortTag (`[CREST SHORT-TAG]`) in the project's deterministic guild palette (`primaryHex` / `accentHex`).
    2. **Miniaturized Mechanism & Status Iconography**:
       - **`"complete"` (`★ COMPLETE`, `100%`)**:
         - Radiant double border: outer gleaming gold (`#fbbf24`, `lineWidth: 2.4`) + inner emerald (`#10b981`, `lineWidth: 1.4`) over a rich dark emerald-gold gradient fill (`#064e3b` / `#1e293b`), with an animated golden aura pulse.
         - Mini spinning golden clockwork gear (`#fbbf24`), golden victory monument crown/star emblem (`★`), and crackling cyan Tesla lightning arcs (`#d8f8ff`).
         - All mini **Assembly Part** pips filled in vibrant emerald (`#10b981`) with golden (`#fde047`) borders.
         - High-contrast completion seal banner at bottom of bay: `★ DONE N/N` (or `✓ 100%`).
       - **`"in-progress"` (`⚙️ IN PROGRESS`, `0 < fitted < total`)**:
         - Solid **Project Heraldry** border (`accentHex` / `primaryHex`, `lineWidth: 1.8`) over dark slate (`rgba(15, 23, 42, 0.9)`).
         - Mini spinning brass clockwork gear (`drawClockworkGear`, rotation speed proportional to `completionRatio`) + mini active console indicator.
         - Mini **Assembly Part** pip row/grid: fitted pips filled in the project's vibrant `primaryHex` with `#fbbf24` border; unbuilt pips in dashed cyan wireframe (`#7ce8ff`).
         - Progress bar + `⚙️ X/Y (P%)` footer label.
       - **`"open"` (`📐 OPEN`, `0/Y`)**:
         - Muted project border (`secondaryHex`, `lineWidth: 1.4`) over dark slate.
         - Stationary bronze gear (`active = false`) + bleak dashed wireframe pips for all `Y` parts.
         - `📐 0/Y OPEN` footer label.
       - **`"blueprint-ready"` (`✨ READY`, `0/0`)**:
         - Calm dashed cyan blueprint wireframe border (`#38bdf8`) with project header `[CREST SHORT-TAG]`.
         - Schematic blueprint reticle/compass icon in the center.
         - `✨ READY 0/0` footer label.
  - **Top Platform Station Banner (`(390, 244)`)**:
    - In `🌐 All` mode with multiple projects, summarize the composite platform state clearly, e.g.:
      `🌐 ALL WORLDS: N Projects · ★C Done · ⚙️B Active (${fittedCount}/${totalParts})`
  - **Mobile Core (`renderMobileGoalAssemblyCore`)**:
    - When `🌐 All` is active on mobile viewports, draw segmented per-project progress arcs around the central ring (using each project's heraldry/completion color—emerald/gold for completed projects) and display the completed project count (`★C/${projectAssemblies.length} Projects`).

### 3. Unify Canvas Hitboxes, Hover Tooltips, Click-to-Focus, Headless Scene & HUD Showcase (`src/web/client-choreography.ts`, `src/hud/tooltip-encounters-vm.ts`, `src/web/commit-ledger-view.ts`, `src/scene/frame-encounters.ts`)
- **Canvas Hitboxes & Click-to-Focus (`src/web/client-choreography.ts` & `src/web/canvas-input-controller.ts`)**:
  - In `🌐 All` mode, register scene hitboxes for each minimized project assembly bay (with `roomId: bay.roomId`, `projectId: bay.projectId`, and enriched `goal-assembly-socket` / `goal-assembly-project` metadata including `shortTag`, `crestIcon`, `partyKey`, `status`, `statusLabel`, `fittedCount`, `totalParts`, `featureSlug`, and `milestoneName`).
  - Hovering over a minimized project assembly bay on the canvas displays a rich tooltip:
    `[CREST SHORT-TAG] ProjectName — ★ COMPLETE (4/4 · 100%) · Tier 3: Master Guild Monument (Airship)` (plus its feature slug and part summary).
  - Clicking a minimized project assembly bay on the canvas in `🌐 All` mode selects that project in `Worlds:` (`selectCommitRepository(bay.projectId)`) so the operator can immediately zoom into its full assembly and **Assembly Commit Ledger**.
- **HUD `Guild Results Showcase` Sync (`src/web/commit-ledger-view.ts` & `src/hud/guild-ledger-vm.ts`)**:
  - Expose `projectAssemblies` on `GuildMasterLedgerViewModel["activeGoalAssembly"]`.
  - In `renderOverviewAssemblyShowcaseCardHtml` and `renderAssemblyShowcaseCardHtml`, when `projectAssemblies.length > 1` (or `🌐 All` mode is active), render a compact **Project Mini-Assemblies** grid/strip inside the card (`data-select-commit-project="<projectId>"`) where each project pill shows `[CREST SHORT-TAG]`, its distinct status badge (`★ DONE 4/4`, `⚙️ 2/5 (40%)`, `📐 0/3`, or `✨ READY 0/0`), and a visual completion highlight class (`mini-assembly-chip-complete`, `mini-assembly-chip-active`, `mini-assembly-chip-ready`).
- **Headless Scene Frame Unification (`src/scene/frame-encounters.ts`)**:
  - Replace the legacy `equippedGrimoires` fake assembly fallback in `buildFrameEncounters` with `deriveGuildAssemblyShowcase` so headless scene frames and canvas painters share a single source of truth.

## User Stories

1. As a **Guild Operator** with `🌐 All` selected in the `Worlds:` row, I want the central **Goal Assembly Site** to be composed of minimized versions of the assemblies of all canonical projects on my host (`1:1` with the `Worlds:` row), rather than one blended anonymous grid.
2. As a **Guild Operator** viewing `🌐 All`, I want each **Project Mini-Assembly** to clearly represent its project's **Project Heraldry** (`[CREST SHORT-TAG]` and guild colors) and current status (`★ COMPLETE`, `⚙️ IN PROGRESS`, `📐 OPEN`, or `✨ BLUEPRINT READY`).
3. As a **Guild Operator** viewing `🌐 All`, I want a completed project (`100%` of parts fitted) to be visually unmistakable at a glance—with a radiant gold-and-emerald monument frame, trophy/crown icon, crackling Tesla arcs, all part pips lit in emerald/gold, and a `★ DONE` seal—even when sibling projects are still `0/4` or `2/5` in progress.
4. As a **Guild Operator**, I want hovering a **Project Mini-Assembly** on the canvas to show that project's assembly status and milestone tooltip, clicking it to focus that project, and viewing the **Guild Master Ledger** (`Overview` and `Assembly & Commit` subtabs) to show a matching per-project mini-assembly status strip.

## Testing & Verification Decisions

1. **Architecture Invariants (`tests/00-architecture-invariants.test.ts`)**:
   - Every file under `src/` must remain strictly `<= 400` lines.
2. **Unit & Integration Tests (`tests/33-assembly-results-showcase.test.ts` & `tests/08-task-telemetry-and-encounter-engine.test.ts`)**:
   - Verify `deriveGuildAssemblyShowcase` in `🌐 All` mode populates `projectAssemblies` for every canonical host project—preserving a `4/4` project as `status: "complete"` (`isComplete: true`, Tier 3), a `2/5` project as `status: "in-progress"`, a `0/3` project as `status: "open"`, and a `0/0` clean project as `status: "blueprint-ready"` without dropping the `0/0` project.
   - Verify `computeMultiProjectAssemblyPlatformLayout` produces non-overlapping bay coordinates inside the **Goal Assembly Site** platform bounds for `1..8` projects.
   - Verify `renderGoalAssemblySite` in `🌐 All` mode draws each **Project Mini-Assembly** bay with its `[CREST SHORT-TAG]`, mini-mechanism, part pips, and distinct `★ DONE` / `⚙️ X/Y` / `✨ READY` visual markers.
   - Verify hover tooltips and **Guild Master Ledger** showcase HTML render per-project mini-assembly status chips in `🌐 All` mode.
3. **Docker Container Deployment & Visual Proof (`opencode-pixel-guild-visualizer` on port `4310`)**:
   - Deploy via `npm run docker:up`, run `npm test`, capture `docs/images/all-worlds-composite-mini-assemblies.png` via headless Chrome, and visually verify via `read`.

## Visual Proof

![All-Worlds Composite Mini-Assemblies on the Goal Assembly Site](../../images/all-worlds-composite-mini-assemblies.png)
