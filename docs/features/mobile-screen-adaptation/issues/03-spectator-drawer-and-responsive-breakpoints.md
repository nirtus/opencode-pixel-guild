# 03: Spectator Drawer State Machine, Compact Header Strip & Responsive Breakpoints

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: None

## Question

What is the exact state machine, tab layout, and responsive breakpoint contract for the **Spectator Drawer** and compact top navigation bar (`src/web/side-panel-reconciler.ts`, `src/web/ledger-panel-reconciler.ts`, `src/web/top-bar-reconciler.ts`, and `src/web/styles-responsive.css`)?

## Answer

Locked in `docs/features/mobile-screen-adaptation/spec.md`:
- Deduplicate `resolveCharacterDisplayBadge(char, hasActiveBug)` in `src/web/station-and-workflow-routing.ts`.
- Add `cameraFocusMode`, `mobileDrawerState` (`"collapsed" | "peek" | "expanded"`), `mobileActiveTab` (`"ledger" | "character" | "ticker"`), and `pinnedTooltipTarget` to `src/web/client-state.ts`, plus a pure state transition helper `reconcileMobileDrawerSelection(selectedSessionId, prevSelectedSessionId)` that auto-switches to `"character"` + `"peek"` when a character is selected and collapses to `"collapsed"` on floor deselect.
- Add `.drawer-chrome` (drag handle + 3 tab pills `📜 Ledger` · `🧙‍♂️ Hero Sheet` · `⚡ Ticker`) and `.camera-focus-group` (`✨ Auto` · `🏰 Workshop` · `🌫️ Wilds` · `🗺️ Split`) in `src/web/app.html` and reconcilers.
- [x] Deduplicate `resolveCharacterDisplayBadge` in `src/web/station-and-workflow-routing.ts` and wire into `side-panel-reconciler.ts` and `ledger-panel-reconciler.ts`.
- [x] Add **Spectator Drawer** state & tab reconciliation and **Chamber Focus Mode** pill controls.
- [x] Verify with unit tests in `tests/12-mobile-screen-adaptation.test.ts`.
