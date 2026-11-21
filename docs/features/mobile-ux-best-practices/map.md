# Feature Map: Mobile UI/UX Best-Practices Overhaul — Semantic Touch System, Full-Bleed Stage, Sticky Keyboard-Aware Composer & Contained Modal Sheets

Label: wayfinder:map

## Destination

Deliver the complete mobile UI/UX best-practices overhaul specified in `docs/features/mobile-ux-best-practices/spec.md` and prototyped in `docs/architecture-review/architecture-review-mobile-ux-prototype.html` (resolving all 6 empirical mobile audit defects captured in `docs/images/mobile-audit-1..6.png`): replace 95+ hardcoded inline `style="..."` strings with a semantic CSS class seam enforcing `>= 44×44px` touch targets and `16px` anti-zoom mobile inputs; dynamically size `#guild-canvas` to fill the portrait stage with `0px` black letterbox void and synchronous resize repaint; dock a sticky bottom **Command Scroll Composer** with `window.visualViewport` virtual-keyboard lift; promote `#summon-adventurer-modal` and `#demolition-modal` to viewport-level `position: fixed` bottom sheets with `minmax(0, 1fr)` containment; and decompose `side-panel-reconciler.ts` and `command-scroll-controller.ts` well below the 400-line ceiling.

## Notes

- **Mode**: Design phase complete; ready for `@implement-spec`.
- **Domain**: **Guild Floorplan**, **Chamber Focus Mode**, **Spectator Drawer**, **Character Sheet**, **Guild Master Ledger**, **Command Scroll**, **Quest Gate**, **Demolition Bomb**.
- **Audit & Prototype Artifacts**:
  - [Mobile UI/UX Best-Practices Audit & Architecture Review](../../architecture-review/architecture-review-mobile-ux-best-practices-20261025.html) (`docs/images/architecture-review-mobile-ux-best-practices.png` and `docs/images/mobile-audit-1..6.png`)
  - [Interactive Mobile UX Best-Practices Prototype](../../architecture-review/architecture-review-mobile-ux-prototype.html) (`docs/images/mobile-ux-best-practices-prototype.png`)
- **Skills to consult**: `codebase-design`, `domain-modeling`, `grilling`, `prototype`, `tdd`, `code-review`.
- **Standing Rules**: Work strictly inside the project root directory (`./`). Never create git worktrees or write files to `/tmp` or `/tmp/opencode`. Every source file in `src/` must remain `<= 400` lines.

## Decisions so far

- [Mobile UI/UX Best-Practices Audit & Architecture Review](../../architecture-review/architecture-review-mobile-ux-best-practices-20261025.html): Captured 6 empirical mobile device screenshots (`390×844`, `320×568`, `375×667`, `844×390`) on port `4310` and selected all 5 deepening candidates.
- [01: Semantic Mobile-First Design System Seam, `>= 44×44px` Touch Targets & `16px` Anti-Zoom Inputs](issues/01-semantic-css-touch-targets-and-16px-inputs.md): Extract 95+ inline `style="..."` strings into `src/web/styles-components.css` + `src/web/styles-responsive.css` with `--touch-target-min: 44px` and `font-size: 16px` on mobile form inputs.
- [02: Full-Bleed Dynamic Stage Aspect-Ratio Sizing & Non-Overlapping Top/Camera Bars](issues/02-full-bleed-dynamic-stage-and-bars.md): Match `#guild-canvas`'s backing height to `.canvas-container`'s portrait aspect ratio (`0px` black letterbox void + synchronous resize repaint), replace `calc(100dvh - 74px)` with `height: 100%; min-height: 0;`, keep `.brand` visible, and prevent `.camera-overlay` overlap.
- [03: Sticky Bottom Command Scroll Composer & `visualViewport` Virtual Keyboard Adapter](issues/03-sticky-command-scroll-and-visual-viewport-keyboard.md): Dock the **Command Scroll Composer** as a sticky bottom bar inside `.spectator-sidebar`, lift it above the virtual keyboard via `window.visualViewport` (`--keyboard-inset-height`), and replace `Deselect [Esc]` with a `44×44px` `✕` button on mobile.
- [04: Viewport-Level Mobile Bottom-Sheet Modals (`#summon-adventurer-modal` & `#demolition-modal`)](issues/04-viewport-level-mobile-bottom-sheet-modals.md): Move modals out of `.canvas-container` to top-level `position: fixed; z-index: 100` bottom-sheet dialogs with `minmax(0, 1fr)` containment, truncated project labels, coarse-pointer focus guard, and backdrop/Escape dismissal.
- [05: Decompose `side-panel-reconciler.ts` & `command-scroll-controller.ts` into Deep Single-Responsibility Modules](issues/05-decompose-reconciler-and-controller-modules.md): Approved the 4-frame visual prototype (`docs/images/mobile-ux-best-practices-prototype.png`) and extraction of `src/web/quest-gate-card.ts` (~145 lines) so every file in `src/web/` sits around 180–260 lines.

## Not yet specified

<!-- All wayfinder fog graduated into spec.md and tickets 01..05 -->

## Out of scope

- Native iOS/Android wrapper apps.
