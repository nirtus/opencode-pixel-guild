# 01: Hidable Gamemaster Spectator Drawer & Icon Toggle Button

Type: task
Label: wayfinder:task
Status: resolved
Blocked by: None

## Question

How should the Gamemaster panel (**Spectator Drawer**) be made hidable via an icon toggle button to the right of the `⚡ Ticker` button in the Gamemaster top menu (`.drawer-tabs`), and how should the user restore it when hidden?

## Specification

Confirmed in Grilling Round 1 (`Q1`, `Q3`) and [Feature Specification](./../spec.md):
- **DOM (`src/web/app.html`)**:
  - Add `<button type="button" class="btn btn-icon-compact" id="btn-toggle-gamemaster" aria-label="Hide Gamemaster Panel" title="Hide Gamemaster Panel">⇥</button>` inside `.drawer-tabs` immediately to the right of `#drawer-tab-ticker`.
  - Add `<button type="button" class="btn btn-icon-compact is-hidden" id="btn-restore-gamemaster" aria-label="Show Gamemaster Panel" title="Show Gamemaster Panel">⇤</button>` inside `.camera-zoom-group` immediately to the right of `#btn-hide-world`.
- **State & Persistence (`src/web/client-state.ts`, `src/types/operator-types.ts`, `src/server/operator-store.ts`, `src/web/world-persistence.ts`)**:
  - Add `isGamemasterCollapsed: boolean` (default `false`) to `clientState` and `ClientOperatorPreferences`.
  - Enforce mutual exclusion with `isWorldCollapsed`: hiding Gamemaster (`isGamemasterCollapsed = true`) forces `isWorldCollapsed = false`, and hiding World (`isWorldCollapsed = true`) forces `isGamemasterCollapsed = false`.
- **Layout & Camera Sync (`src/web/ledger-panel-reconciler.ts`, `src/web/pointer-and-camera.ts`, `src/web/styles.css`, `src/web/styles-responsive.css`)**:
  - Set `data-gamemaster-hidden="true" | "false"` on `#main-stage` in `syncSpectatorDrawerChrome()` (never using `data-details-hidden`).
  - Style `.main-stage[data-gamemaster-hidden="true"]` with `grid-template-columns: minmax(0, 1fr)` and `.main-stage[data-gamemaster-hidden="true"] .spectator-sidebar { display: none !important; }`.
  - Toggle `.is-hidden` on `#btn-restore-gamemaster` when `clientState.isGamemasterCollapsed` is active on desktop, and ensure `syncViewportCameraFit` uses full viewport width (`vw`) when `clientState.isGamemasterCollapsed` is `true`.

## Answer

Implemented the hidable Gamemaster panel (`Spectator Drawer`) with `#btn-toggle-gamemaster` (`⇥`) placed immediately to the right of `#drawer-tab-ticker` (`⚡ Ticker`) in `.drawer-tabs` and `#btn-restore-gamemaster` (`⇤`) in `.camera-zoom-group` when collapsed. Added `isGamemasterCollapsed` persistence across `client-state.ts`, `operator-types.ts`, `operator-store.ts`, and `world-persistence.ts` (including `?gmHidden=1`), enforced mutual exclusion with `isWorldCollapsed`, and verified on the `opencode-pixel-guild-visualizer` Docker container (`docs/images/gamemaster-toggle-and-pacing-tuning.png` and `docs/images/gamemaster-hidden-and-split-65-35.png`).

## Acceptance Criteria

- [x] `#btn-toggle-gamemaster` (`.btn-icon-compact`) is rendered to the right of `#drawer-tab-ticker` in `src/web/app.html`.
- [x] Clicking `#btn-toggle-gamemaster` collapses `.spectator-sidebar` (`data-gamemaster-hidden="true"`), expands `.world-section` to 100% width, re-fits the canvas camera, and reveals `#btn-restore-gamemaster` in the World toolbar.
- [x] Clicking `#btn-restore-gamemaster` restores `.spectator-sidebar` (`data-gamemaster-hidden="false"`) and hides `#btn-restore-gamemaster`.
- [x] `isGamemasterCollapsed` is mutually exclusive with `isWorldCollapsed` and persisted in operator preferences.
