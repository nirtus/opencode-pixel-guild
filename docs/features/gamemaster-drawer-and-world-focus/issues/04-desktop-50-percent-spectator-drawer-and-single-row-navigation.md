# 04: Desktop 50% Spectator Drawer & Single-Row Navigation Consolidation

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 02

**What to build:** Expand the Gamemaster **Spectator Drawer** (`aside.spectator-sidebar`) to **50% width** on desktop (`1fr : 1fr`) and consolidate the stacked navigation and identity rows so dynamic chat and roster views gain maximum horizontal and vertical space.

**Blocked by:** 02

**Status:** resolved

- [x] **Desktop 50% / 50% Split (`src/web/styles.css` & `src/web/pointer-and-camera.ts`)**:
  - Change `.main-stage` in `src/web/styles.css` from `grid-template-columns: minmax(0, 6fr) minmax(0, 4fr)` to `grid-template-columns: minmax(0, 1fr) minmax(0, 1fr)` on desktop (`> 960px`).
  - Update the fallback world viewport width ratio in `src/web/pointer-and-camera.ts` from `0.6` to `0.5`.
- [x] **Unified Single-Row Drawer Navigation Header (`src/web/app.html`, `src/web/side-panel-reconciler.ts`, `src/web/ledger-panel-reconciler.ts`, `src/web/styles.css`)**:
  - Merge `.drawer-chrome` and `.subtab-deck-bar` into a single compact navigation header row (~36px tall) that displays top-level mode pills (`📜 General`, `🧙‍♂️ Hero`, `⚡ Ticker`) alongside the active mode's contextual subtabs (`🏰 Overview` / `⚙️ Assembly & Commit` for `General`; `💬 Chat` / `📊 Details` / `📘 Gear` / `🛠️ Tools` for `Hero`).
  - Remove the duplicate `🧙‍♂️ Roster` subtab from `General` (since `🏰 Overview` directly hosts the full-height live Roster).
- [x] **Single-Line Hero Identity & Ledger Telemetry Strips (`src/web/side-panel-reconciler.ts` & `src/web/ledger-panel-reconciler.ts`)**:
  - Compact `.sheet-header-bar` on `Hero` into a single-line identity and vitals bar (`[🛡️ SHORT-TAG] Title · Role · Verb · Mana%` + `[Esc]`), keeping the full filesystem directory path inside the `📊 Details` subtab only.
  - Remove the duplicate `.ledger-header-bar` `✨ Summon Adventurer` button (already permanently in `header.top-bar`) and compact the 2×2 `.ledger-stats-grid` into a single-line horizontal telemetry ribbon (`👥 Active · 🏰 Worlds · 🪙 Tokens · 💰 Cost`).
- [x] **Unit & Layout Tests**: Verify the 50/50 desktop grid rule, single-row navigation header, deduplicated `General` subtabs (`Overview` and `Assembly & Commit`), and single-line vitals bar.

## Answer

Implemented and verified with unit/integration tests in `tests/24-gamemaster-drawer-and-world-focus.test.ts` and live 1600x1000 headless Chrome screenshots in `docs/images/`.
