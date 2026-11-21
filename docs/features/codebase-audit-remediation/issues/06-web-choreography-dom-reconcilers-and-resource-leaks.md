# 06: Station Slot Self-Collision Fix, Clock-Domain Normalization, DOM Reconcilers & Camera/Bitmap Leak Cleanup

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 03, 05

**What to build:** Prevent characters from colliding with their own **Preparation Station** slot claims when enqueueing tool records in the same frame, normalize monotonic animation timestamps and Unix epoch timestamps in **Armory Wardrobe** dwell checks and **Toil Queue** ordering, enable `◀` / `▶` hero navigation buttons on the **Character Sheet** header fast path when a second hero spawns, isolate **Assembly Commit Ledger** file diffs and debounced commit drafts per repository room, re-anchor single-finger camera panning after two-finger pinch gestures, and close the QR scanner camera `MediaStream` and `ImageBitmap` resource leaks.

**Blocked by:** 03: 30 FPS Canvas Frame-Pacing Cap, Camera Gesture Bypass & 60Hz Layout Reflow Elimination, 05: Worktree Goal Assembly Deduplication, Corridor Boundary Routing & Wilderness Bug Targeting Fixes

**Status:** resolved

## Acceptance Criteria

- [x] Every modified or created source module remains strictly `<= 400` lines.
- [x] **Preparation Station** perimeter slot allocation normalizes `:tool:`-suffixed session identifiers to the base session ID before checking or recording `SessionSlot` claims so a character executing multiple tools at the same station reuses its own slot, and replaces invalid `"down"` facing fallbacks with `"south"`.
- [x] **Armory Wardrobe** dwell timestamp checks and **Toil Queue** slot sorting normalize `requestAnimationFrame` monotonic timestamps and Unix epoch timestamps into a single consistent clock domain.
- [x] The **Character Sheet** header fast-path reconciler updates `disabled`, `data-select-hero-session`, and `title` on the `◀` and `▶` hero navigation buttons whenever the scoped hero count or adjacent hero IDs change.
- [x] The **Assembly Commit Ledger** keys cached file diffs by both room ID and file path and captures the target room ID when draft input occurs so switching projects within the 350ms debounce window never overwrites another project's draft or displays another project's diff.
- [x] Lifting one finger after a two-finger pinch gesture on the **Guild Floorplan** re-anchors the remaining finger's start coordinates and camera pan/zoom state so continued single-finger dragging never jumps the camera.
- [x] The QR camera scanner uses a monotonic generation token so streams resolving after modal close or re-scan immediately stop all hardware tracks, auto-closing the pairing modal stops any active camera stream, and QR image decoding always closes its `ImageBitmap` in a `finally` block.
- [x] Automated unit tests verify station slot reuse across `:tool:` claims, clock-domain normalization, Hero `◀`/`▶` fast-path updates, room-isolated commit drafts/diffs, pinch-to-pan re-anchoring, and camera/bitmap cleanup, verified on the `opencode-pixel-guild-visualizer` Docker container.

## Answer

- **Station Slot Self-Collision & Facing Fallbacks (`src/web/station-slot-allocator.ts`, `src/web/station-and-workflow-routing.ts`)**: Normalized `const baseSessionId = sessionId.split(":tool:")[0]` at the top of `allocateStationPerimeterSlot` and keyed `SessionSlot:${stationKey}:${baseSessionId}` on `baseSessionId` so a character executing multiple tools at the same station in the same frame reuses its own perimeter slot rather than colliding with itself. Replaced invalid `"down"` facing fallbacks with `"south"` in `allocateLoungeSeatSlot` and `DistillingContextMana` target resolution.
- **Clock-Domain Normalization (`src/web/station-and-workflow-routing.ts`, `src/web/character-action-queue.ts`)**: Normalized `requestAnimationFrame` monotonic timestamps (`< 1_000_000_000_000`) to `Date.now()` when comparing against Unix epoch `stateEnteredAtMs` and `armoryUntilMs` in **Armory Wardrobe** dwell checks, when stamping fallback action timestamps in `enqueueCharacterActions`, and fell back to `sequenceOrder` in `sortCharacterActionQueue` when comparing cross-domain timestamps.
- **Hero Header Fast-Path Reconciler (`src/web/side-panel-reconciler.ts`)**: Updated `disabled`, `data-select-hero-session`, and `title` on `button[data-hero-nav="prev"]` and `button[data-hero-nav="next"]` inside the `#sheet-header-slot` fast-path branch so `◀` and `▶` immediately enable/disable and point to adjacent heroes when the scoped hero count changes.
- **Room-Scoped Commit Ledger Diffs & Debounced Drafts (`src/web/commit-ledger-controller.ts`, `src/web/commit-ledger-view.ts`)**: Keyed `cachedDiffByFile` by `${roomId || ""}::${path}` with room-scoped lookup in `renderCommitFilesListHtmlWithContext`, and captured `draftRoomId` before the 350ms `setTimeout` in `handleDraftInput` (passing `draftRoomId` to `postGitAction`'s `explicitRoomId` parameter) so switching rooms never leaks diffs or overwrites another project's draft.
- **Pinch-to-Pan Re-Anchoring (`src/web/canvas-gesture-controller.ts`, `src/web/pointer-and-camera.ts`)**: Updated `stepPointerMove` and `stepPointerUp` so lifting one finger from a 2-finger pinch (`state.activePointers.size === 1`) re-anchors `primaryStartX`, `primaryStartY`, `startPanX`, `startPanY`, and `startZoom` to the remaining finger's position and current pinched camera transform.
- **QR Camera Stream Generation Guard & `ImageBitmap` Cleanup (`src/web/qr-barcode-scanner.ts`, `src/web/operator-pairing-controller.ts`)**: Guarded `startCameraQrScanner` with `cameraStreamGeneration` incremented in `stopActiveQrCameraStream()` so late-resolving `getUserMedia` streams immediately stop all hardware tracks, closed `ImageBitmap` instances inside a `finally` block in `decodeQrFromImageBlob`, and called `stopActiveQrCameraStream()` when auto-closing the pairing modal on login.
