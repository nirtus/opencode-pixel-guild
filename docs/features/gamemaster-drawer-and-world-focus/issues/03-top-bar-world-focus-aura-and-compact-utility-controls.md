# 03: Top-Bar World Focus Aura & Compact Utility Controls

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: None (can start immediately)

**What to build:** Make clicking a project button in the top-bar `Worlds:` row visually focus and separate that world's characters inside the shared **Workshop Room** with an overhead **World Focus Aura** (`heraldry.auraHex`), while compacting the top-bar utility controls (`User`, `Refresh Live`, `Roster`, `Style`) into concise icon-first pills.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] **Toggleable World Focus Selection (`src/spatial/project-heraldry.ts`, `src/hud/scene-tooltip-vm.ts`, `src/web/top-bar-reconciler.ts`)**:
  - Export `resolveCharacterWorldFocus(char, snapshot, selectedProjectId)` in `src/spatial/project-heraldry.ts` returning `{ isWorldFocused: boolean; isFocusedMember: boolean; isDimmed: boolean; heraldry: ProjectHeraldryDescriptor }`.
  - Render an explicit `🌐 All Worlds` pill at the start of `#room-filter-buttons` (active when `selectedProjectId === null`), and make clicking an already-active world pill toggle `selectedProjectId` back to `null` (`All Worlds`).
- [x] **Canvas Overhead `World Focus Aura` & Squad Separation (`src/web/canvas-hero-painter.ts`)**:
  - When a world is focused (`isWorldFocused && isFocusedMember`), render an animated **World Focus Aura** above the head of every **Guild Adventurer** and **Squad Subagent** belonging to that project (a glowing halo/crown and rising arcane motes using `heraldry.auraHex` and `heraldry.accentHex`) plus a brightened underfoot pedestal ring.
  - When a world is focused and a character belongs to a different project (`isWorldFocused && isDimmed`), render the character at `45%` opacity (`c.globalAlpha = 0.45`) with a muted nameplate border—visually separating the focused world's squad while keeping all characters and any `!`/`?` **Quest Gate** markers visible inside the unified **Workshop Room** (per **ADR-0001**).
- [x] **Synchronized Ledger Scope (`src/web/ledger-panel-reconciler.ts` & `src/hud/guild-ledger-vm.ts`)**:
  - Synchronize the **Guild Master Ledger** character count, token/cost totals, and roster ordering (floating focused-world characters to the top of the list) with `selectedProjectId`.
- [x] **Compact Top-Bar Utility Controls (`src/web/app.html`, `src/web/top-bar-reconciler.ts`, `src/hud/scene-tooltip-vm.ts`, `src/web/styles.css`)**:
  - Compact the right-side top-bar controls (`#btn-open-account-modal`, `#btn-refresh-live`, `#btn-toggle-lineage`, `#btn-toggle-style`) into compact icon-first pills (`👤`, `🔄`, `👥 Active` / `👥 All`, `🎨 Cartoon` / `🎨 Pixel`) with full descriptive `title` tooltips so they stop crowding the header bar.
- [x] **Unit & Integration Tests**: Verify `resolveCharacterWorldFocus`, toggleable `All Worlds` / world pill click behavior, canvas aura painting, and synchronized Ledger metrics.

## Answer

Implemented and verified with unit/integration tests in `tests/24-gamemaster-drawer-and-world-focus.test.ts` and live 1600x1000 headless Chrome screenshots in `docs/images/`.
