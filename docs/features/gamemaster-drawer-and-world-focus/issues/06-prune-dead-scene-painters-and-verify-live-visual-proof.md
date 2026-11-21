# 06: Prune Dead Scene Painters, Consolidate Client State & Verify Live Visual Proof

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01, 02, 03, 04, 05

**What to build:** Apply the deletion test to remove unused parallel canvas painters in `src/scene/canvas-paint-*.ts` and duplicate state aliases in `src/web/client-state.ts`, enforce the 400-line ceiling across all files, and capture live 1600×1000 headless Chrome screenshots verifying every UI/UX improvement.

**Blocked by:** 01, 02, 03, 04, 05

**Status:** resolved

- [x] **Consolidate `src/web/client-state.ts` Aliases & Dead Pager Counters**:
  - Remove dead pagination counters (`toolsPage`, `rosterPage`, `tickerPage`, `commitFilesPage`) and consolidate duplicate selector/tab aliases while keeping a clean public interface.
- [x] **Prune Unused Parallel Painters (`src/scene/`)**:
  - Remove or consolidate unused `src/scene/canvas-paint-*.ts` modules that are never called by the live web application (`src/web/canvas-*.ts`), updating any unit tests that tested the dead painter seam to test the active seams and keeping `tests/00-architecture-invariants.test.ts` green (every file under `src/` `<= 400` lines).
- [x] **Live Headless Chrome Visual Proof & Analysis (`docs/images/`)**:
  - Start the live server on port `4310` and capture 1600×1000 screenshots (`docs/images/gamemaster-50-percent-drawer-and-world-focus.png`, `docs/images/hero-chat-unclipped-and-question-mark.png`) using headless Chrome.
  - Visually inspect the captured PNGs using `read` to verify:
    1. 50% World : 50% Gamemaster **Spectator Drawer** desktop split;
    2. Single-row drawer navigation header and compact single-line vitals bar;
    3. Full unclipped **Character Sheet** chat and **Quest Gate** option descriptions;
    4. Collapsed 1-line **Command Scroll** trigger bar at the bottom of `Chat`;
    5. `?` overhead **Quest Gate** marker above a character asking a question;
    6. **World Focus Aura** halo above focused project characters' heads and dimmed non-focused characters when a top-bar `Worlds:` pill is clicked.

## Answer

Implemented and verified with unit/integration tests in `tests/24-gamemaster-drawer-and-world-focus.test.ts` and live 1600x1000 headless Chrome screenshots in `docs/images/`.
