# 04: Border-Locked Chamber Camera, Post-Navigation Mobile Re-Anchoring & iPhone Home Screen Safe-Area Top Bar

**What to build:** Strict border-locked camera clamping (`0px` off-screen margin so the **Workshop Room** can never be pushed outside the screen), post-DOM-sync mobile border re-anchoring (`ResizeObserver` + all focus modes) so mobile always redraws anchored to all 4 borders after navigating, and iPhone Home Screen PWA `viewport-fit=cover` + `env(safe-area-inset-top)` top-bar layout so iPhone users can cleanly access all **Project Worlds** and actions without status-bar blur overlap.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] `clampCameraPan` clamps camera pan strictly to the active chamber walls (`0px` off-screen void margin): at fit zoom (`zoom <= 1.0`), the room is locked to the stage borders; when zoomed in (`zoom > 1.0`), `panX` and `panY` cannot exceed `[viewportSize - chamberSize * zoom, 0]`.
- [x] `scheduleHudSync` runs `syncSpectatorDrawerChrome()` **before** `syncViewportCameraFit(canvas)` across all focus modes (`auto`, `workshop`, `wilds`, `split`), and a `ResizeObserver` on `.world-canvas-stage` triggers `syncViewportCameraFit(canvas, true)` whenever the stage becomes visible or resizes after mobile tab/world navigation.
- [x] `src/web/app.html` and `src/web/styles-responsive.css` add `viewport-fit=cover`, `apple-mobile-web-app-capable`, `padding-top: calc(env(safe-area-inset-top, 0px) + 5px)`, and keep **Project World** tabs, `👤 Account`, `🔗 Pair`, `✨ Summon`, and `🔄 Refresh` accessible and tappable on mobile/iPhone Home Screen.
- [x] Automated tests and headless Chrome mobile/desktop screenshots verify zero off-screen room push, mobile border re-anchoring after tab navigation, and iPhone top-bar usability.
