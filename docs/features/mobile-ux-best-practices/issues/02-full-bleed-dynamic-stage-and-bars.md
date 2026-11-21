# 02: Full-Bleed Dynamic Stage Aspect-Ratio Sizing & Non-Overlapping Top/Camera Bars

Type: grilling
Label: wayfinder:grilling
Status: resolved
Blocked by: None

## Question

Should `syncViewportCameraFit` dynamically match `#guild-canvas`'s backing height to `.canvas-container`'s portrait aspect ratio (reclaiming the 328px of dead black letterbox void on `390×844` phones and triggering an immediate repaint on resize), replace the brittle `height: calc(100dvh - 74px)` with flex/grid `height: 100%; min-height: 0;`, condense `.top-bar` action buttons (`✨ Summon`, `🔄`, `🎨`) so `.brand` (`⚔️ Pixel Guild`) is never crushed to `0px`, and prevent `.camera-focus-group` and `.camera-zoom-group` from overlapping?

## Answer

Locked:
- In `syncViewportCameraFit` (`src/web/pointer-and-camera.ts`), dynamically match `#guild-canvas`'s backing height on mobile portrait viewports (`window.innerWidth <= 960` and `window.innerHeight > 540`) to `.canvas-container`'s aspect ratio (`canvas.height = Math.max(720, Math.min(1280, Math.round(canvas.width * (stageH / stageW))))`) so `#guild-canvas` fills the vertical stage with `0px` black letterbox void, and dispatch `"guild-sprite-loaded"` whenever `canvas.width` or `canvas.height` changes to trigger an immediate repaint frame.
- Replace `.canvas-container { height: calc(100dvh - 74px) }` with `height: 100%; min-height: 0;` in `src/web/styles-responsive.css`.
- Condense mobile `.top-bar` controls (`✨ Summon`, `🔄`, `🎨`) so `.brand` (`⚔️ Pixel Guild`) stays visible, and give `.camera-focus-group` and `.camera-zoom-group` `flex-shrink: 0` so they never overlap.
