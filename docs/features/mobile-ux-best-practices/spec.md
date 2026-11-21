# Specification: Mobile UI/UX Best-Practices Overhaul (`mobile-ux-best-practices`)

## 1. Objective & Empirical Problem Statement

Visual audit of the live visualizer across 6 mobile device viewports (`docs/images/mobile-audit-1..6.png`, `320×568` through `844×390`) surfaced 6 systemic mobile UI/UX failures:

1. **95+ Hardcoded Inline `style="..."` Strings & Sub-Standard Touch Targets (`17px–25px` vs `44×44px` Apple HIG / Material Design Standard)**:
   - `command-scroll-controller.ts` (33 inline styles), `side-panel-reconciler.ts` (36 inline styles), `ledger-panel-reconciler.ts` (21 inline styles), and `app.html` (15 inline styles) hardcode `font-size: 9px–10.5px` and `padding: 2px 5px`, locking buttons to `17px–25px` tall and blocking `@media` rules in `styles-responsive.css`.
2. **Forced iOS Safari / Mobile Browser Auto-Zoom on Input Focus (`font-size: 10px–10.5px < 16px`)**:
   - Every `<textarea>`, `<input>`, and `<select>` (`#command-scroll-input`, `.gate-custom-input`, `#summon-directory-select`, `#summon-agent-class`, `#summon-title-input`, `#summon-prompt-input`) has `font-size: 10px–10.5px`, forcing mobile WebKit/Blink browsers to zoom the entire page in on tap.
3. **328px of Dead Black Letterbox Void on Portrait Phones & Top/Camera Bar Collisions (`mobile-audit-1` & `mobile-audit-2`)**:
   - Locking `#guild-canvas` to `800×720` (`height: auto !important`) leaves 328px of empty black void on a `390×844` portrait phone; `.top-bar` crushes `.brand` to `0px` width; `.camera-zoom-group` overlaps `🗺️ Split`; and `height: calc(100dvh - 74px)` overflows on `320×568` when `.top-bar` wraps, burying `.camera-overlay` under `.spectator-sidebar`.
4. **Clipped `📜 Send Scroll ↵` CTA in `peek` State & Zero Virtual Keyboard (`window.visualViewport`) Awareness (`mobile-audit-4` & `mobile-audit-5`)**:
   - In `peek` (`45dvh`) state, `📜 Send Scroll ↵` is pushed below the fold, and focusing `#command-scroll-input` opens a ~300px mobile keyboard that covers the bottom sheet.
5. **~650px Horizontal Summon Modal Blowout & Trapped Modal Nesting (`mobile-audit-3` & `mobile-audit-6`)**:
   - `#summon-adventurer-modal` and `#demolition-modal` are nested inside `.canvas-container` (`position: absolute`) with an unconstrained CSS Grid where long directory paths in `#summon-directory-select` blow the modal out to ~650px wide off the right edge of a `390px` screen, while `openSummonAdventurerModal()` auto-focuses `#summon-prompt-input` immediately on open.

---

## 2. Architectural Design Across the 5 Candidates

### 2.1 Candidate 1: Semantic Mobile-First Design System Seam (`src/web/styles-components.css` & `src/web/styles-responsive.css`)
- Extract all inline `style="..."` strings from `command-scroll-controller.ts`, `side-panel-reconciler.ts`, `ledger-panel-reconciler.ts`, `pointer-and-camera.ts`, and `app.html` into semantic CSS classes in `src/web/styles-components.css` (linked in `src/web/app.html`).
- Define responsive tokens in `src/web/styles-responsive.css` (`@media (max-width: 960px)`):
  - `--touch-target-min: 44px`: Enforce `min-height: 44px` (`min-width: 44px` on icon buttons) across `.btn`, `.drawer-handle-btn`, `.drawer-tabs .btn`, `.roster-row-btn`, `.camera-overlay .btn`, and modal actions (`min-height: 36px` on compact `@skill` chips with `6px` gap).
  - Enforce `font-size: 16px` (`1rem`) on `#command-scroll-input`, `.gate-custom-input`, `#summon-directory-select`, `#summon-agent-class`, `#summon-title-input`, and `#summon-prompt-input` on mobile (`<= 960px`) so iOS Safari never auto-zooms.

### 2.2 Candidate 2: Full-Bleed Dynamic Stage Sizing, Synchronous Resize Repaint & Non-Overlapping Bars (`src/web/pointer-and-camera.ts`, `src/web/app-main.ts`, `src/web/styles-responsive.css`)
- Replace `.canvas-container { height: calc(100dvh - 74px) }` with pure Flexbox/Grid sizing (`height: 100%; min-height: 0;`) so `.canvas-container` never overflows when `.top-bar` wraps on `320px` screens.
- In `syncViewportCameraFit(canvas, force)` (`src/web/pointer-and-camera.ts`):
  - On mobile portrait (`window.innerWidth <= 960` and `window.innerHeight > 540`), size `canvas.height` proportionally to the container's aspect ratio (`canvas.width = effective === "split" ? 1600 : 800`, `canvas.height = Math.max(720, Math.min(1280, Math.round(canvas.width * (stageH / stageW))))`) so `#guild-canvas` fills the vertical portrait stage with **zero black letterbox bars**, and dispatch `"guild-sprite-loaded"` / request an immediate repaint whenever `canvas.width` or `canvas.height` changes so resizes never leave a blank canvas (`mobile-audit-6`).
- Condense mobile `.top-bar` controls (`✨ Summon`, `🔄`, `🎨`) so `.brand` (`⚔️ Pixel Guild`) always remains visible with `min-width: 110px`, and fix `.camera-overlay` (`flex-shrink: 0` on groups, clean layout above the collapsed drawer).

### 2.3 Candidate 3: Sticky Bottom Command Scroll Composer & `visualViewport` Keyboard Adapter (`src/web/command-scroll-controller.ts`, `src/web/side-panel-reconciler.ts`)
- Reorganize `#character-sheet` on mobile so `#sheet-interactive-slot` docks the **Command Scroll** input + `📜 Send ↵` + `⏹ Stop` as a **sticky bottom footer** inside `.spectator-sidebar` (always visible above the fold in both `peek` `50dvh` and `expanded` `85dvh` states, as well as `844×390` landscape!).
- Add a `window.visualViewport` listener (`resize` and `scroll`) that sets `--keyboard-inset-height: ${Math.max(0, window.innerHeight - vv.height - vv.offsetTop)}px` on `document.documentElement` and automatically promotes `mobileDrawerState` to `"expanded"` when `#command-scroll-input` or `.gate-custom-input` is focused on mobile.
- Replace `Deselect [Esc]` with a `44×44px` `✕` button on mobile (`<= 960px`), and add a floating `✕ Exit Cinema` button when `isCinemaMode` is active.

### 2.4 Candidate 4: Viewport-Level Mobile Bottom-Sheet Modals (`src/web/app.html`, `src/web/summon-adventurer-controller.ts`, `src/web/demolition-modal-controller.ts`)
- Move `#summon-adventurer-modal` and `#demolition-modal` out of `.canvas-container` to top-level children of `<body>` with `position: fixed; inset: 0; z-index: 100`.
- Style `.modal-dialog` with `grid-template-columns: minmax(0, 1fr)`, `max-width: min(460px, calc(100vw - 24px))`, `max-height: 90dvh`, `overflow-y: auto`, and visible `<label>` headers.
- Format `#summon-directory-select` options on mobile with concise project names (`🏰 ${r.projectName}`) and `width: 100%; max-width: 100%; min-width: 0; text-overflow: ellipsis;` so long paths never blow out the modal width.
- Guard `promptEl?.focus()` in `openSummonAdventurerModal()` with `window.matchMedia("(pointer: fine)").matches` so opening the modal on touch devices does not immediately pop up the keyboard over the room/class selectors.
- Support backdrop tap and `Escape` key to close `#summon-adventurer-modal`.

### 2.5 Candidate 5: Single-Responsibility Module Decomposition (`<= 400` Lines per File)
- Extract `src/web/quest-gate-card.ts` (~145 lines) from `src/web/command-scroll-controller.ts` (dropping `command-scroll-controller.ts` from 379 lines to ~235 lines).
- Moving inline styles to `src/web/styles-components.css` (~220 lines) drops `src/web/side-panel-reconciler.ts` from 396 lines to ~270 lines.
