# Feature Map: Mobile Screen Adaptation — Chamber Focus Camera, Touch/Pinch Gestures & Spectator Drawer

Label: wayfinder:map

## Destination

Deliver the complete mobile screen adaptation specified in `docs/features/mobile-screen-adaptation/spec.md` and prototyped in `docs/architecture-review/architecture-review-mobile-prototype.html`: deepen `src/scene/camera.ts` with **Chamber Focus Mode** (`Auto` / `Workshop Room` / `Dungeon Wilds` / `Split`), focal-point zoom, clamped pan, and dynamic viewport sizing; extract a unified `PointerEvent` + pinch-zoom gesture controller (`src/web/canvas-gesture-controller.ts`) and `14px` coarse-pointer hit-slop (`src/scene/frame-hit-test.ts`); deepen the HUD reconcilers into a 3-state **Spectator Drawer** (`collapsed` / `peek` / `expanded` with `Ledger` · `Hero Sheet` · `Ticker` tabs); and partition responsive CSS into `src/web/styles-responsive.css` while keeping every file `<= 400` lines.

## Notes

- **Domain**: **Guild Floorplan**, **Chamber Focus Mode** (`Workshop Room` · `Dungeon Wilds` · `Split` · `Auto`), **Spectator Drawer** (`collapsed` · `peek` · `expanded`), **Character Sheet**, **Guild Master Ledger**, **Preparation Station**, **Goal Assembly Site**, **Bug Monster**, **Demolition Bomb**.
- **Architecture Review & Prototype References**:
  - [Mobile Screen Adaptation Architecture Review](../../architecture-review/architecture-review-mobile-adaptation-20261024.html) (`docs/images/architecture-review-mobile-adaptation.png`)
  - [Interactive Mobile Portrait & Landscape Prototype](../../architecture-review/architecture-review-mobile-prototype.html) (`docs/images/mobile-prototype-review.png`)
- **Skills to consult**: `codebase-design`, `domain-modeling`, `tdd`, `code-review`.
- **Standing Rules**: Work strictly inside the project root directory (`./`). Never create git worktrees or write files to `/tmp` or `/tmp/opencode`. Every source file in `src/` must remain `<= 400` lines.

## Decisions so far

- [Mobile Screen Adaptation Architecture Review](../../architecture-review/architecture-review-mobile-adaptation-20261024.html): Locked in all 4 deepening candidates across Camera Framing, Touch/Pinch Gestures & Hit-Slop, Spectator Drawer, and Responsive Stylesheet Split.
- [01: Chamber Focus Mode Interface & Auto-Pan Trigger Contract (`src/scene/camera.ts`)](issues/01-chamber-focus-mode-and-camera-interface.md): Dynamic DPR canvas sizing, `"auto"` Workshop $\leftrightarrow$ Wilds tracking on portrait (`<= 960px`) with manual override, and `[0.35, 2.5]` zoom with 50%-viewport world clamping.
- [02: Multi-Pointer Touch/Pinch Gesture State Machine & Coarse Hit-Slop Contract](issues/02-touch-pinch-gesture-and-hit-slop-contract.md): Priority + center-distance tie-breaking for `14px` coarse hit-slop, top-of-stage mobile tooltip toast, 1-finger drag pan (`8px` hysteresis), 2-finger pinch focal zoom, and double-tap floor re-center.
- [03: Spectator Drawer State Machine, Compact Header Strip & Responsive Breakpoints](issues/03-spectator-drawer-and-responsive-breakpoints.md): `52px` `collapsed` bar with 3 tab pills + live badge counts, tap & vertical drag-handle snap (`52px` / `45dvh` / `82dvh`), auto-peek `Hero Sheet` on character tap, and `44px` + `36px` compact single-row mobile top bars.
- [04: Interactive Mobile Portrait & Landscape Visual Prototype (`docs/architecture-review/architecture-review-mobile-prototype.html`)](issues/04-interactive-mobile-visual-prototype.md): Approved side-by-side Mobile Portrait (`390×844`) and Mobile Landscape (`844×390`) visual prototype and graduated `docs/features/mobile-screen-adaptation/spec.md`.

## Not yet specified

<!-- All wayfinder fog graduated into spec.md and tickets 01..04 -->

## Out of scope

- Native mobile app wrappers (Capacitor, Cordova, React Native).
