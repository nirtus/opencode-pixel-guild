# 01: Reusable Offscreen Canvas & OOM Memory Leak Fix

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: None

## Question

How can the Fog of War dynamic lighting layer in `src/web/app.html` be refactored to eliminate the 138 MB/sec memory allocation leak caused by creating a new canvas element on every animation frame?

## Specification

- In `src/web/app.html`:
  - Locate `renderOutdoorWilderness`: eliminate `const fogCanvas = document.createElement("canvas");` inside the 60 FPS animation loop.
  - Allocate a single persistent `cachedFogCanvas` and 2D context outside the loop.
  - On each frame, verify dimensions against viewport (`w, h`) and resize only if dimensions change.
  - Clear the buffer with `cachedFogCtx.clearRect(0, 0, w, h)` on each frame.
  - Verify that memory usage remains stable and bounded across minutes of continuous execution with zero OOM crashes.
  - Verify through automated tests in `tests/`.

## Answer

Replaced the per-frame `document.createElement("canvas")` allocation inside `renderOutdoorWilderness` with a persistent `cachedFogCanvas` and `cachedFogCtx` allocated once at module scope. Resizing only occurs when viewport dimensions change, and the buffer is cleared on each frame with `clearRect()`. Completely eliminates the 138 MB/sec memory leak and fixes the browser/server OOM crash. Verified in `tests/09-choreography-and-project-isolation.test.ts`.
