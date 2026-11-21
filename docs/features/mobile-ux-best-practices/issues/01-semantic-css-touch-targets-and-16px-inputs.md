# 01: Semantic Mobile-First Design System Seam, `>= 44×44px` Touch Targets & `16px` Anti-Zoom Inputs

Type: grilling
Label: wayfinder:grilling
Status: resolved
Blocked by: None

## Question

Should we extract the 95+ hardcoded inline `style="..."` strings across `command-scroll-controller.ts`, `side-panel-reconciler.ts`, `ledger-panel-reconciler.ts`, `pointer-and-camera.ts`, and `app.html` into semantic CSS classes (`src/web/styles-components.css` + `src/web/styles-responsive.css`) that enforce `min-height: 44px` (`min-width: 44px` for icon buttons) on mobile/coarse pointers and `font-size: 16px` (`1rem`) on all `<input>`, `<select>`, and `<textarea>` elements so iOS Safari and mobile Chrome never force-zoom the viewport on focus?

## Answer

Locked:
- Create `src/web/styles-components.css` (linked in `src/web/app.html`) and replace the 95+ hardcoded inline `style="..."` strings in `command-scroll-controller.ts`, `side-panel-reconciler.ts`, `ledger-panel-reconciler.ts`, `pointer-and-camera.ts`, and `app.html` with semantic CSS classes.
- Enforce `min-height: 44px` (`min-width: 44px` on icon buttons, `36px–40px` on compact `@skill` chips with `6px` gap) on mobile (`@media (max-width: 960px)` / `@media (pointer: coarse)`).
- Enforce `font-size: 16px` (`1rem`) on all mobile `<input>`, `<select>`, and `<textarea>` elements (`#command-scroll-input`, `.gate-custom-input`, `#summon-directory-select`, `#summon-agent-class`, `#summon-title-input`, `#summon-prompt-input`) to eliminate iOS Safari forced viewport zoom on focus.
