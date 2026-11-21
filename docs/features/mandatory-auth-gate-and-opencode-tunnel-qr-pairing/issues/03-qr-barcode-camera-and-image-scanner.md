# 03: Camera & Image QR Barcode Scanner in OpenCode Machines Window

**What to build:** Built-in `📷 Scan QR with Camera` (`navigator.mediaDevices.getUserMedia` + `BarcodeDetector`) and `🖼️ Upload / Paste QR Image` (`createImageBitmap` + `BarcodeDetector`) controls inside the **`🔗 OpenCode Machines`** pairing window so users can scan or upload the QR barcode printed by `opencode pair --remote` or `opencode pair` and pair remote machines in one step.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] `📷 Scan QR with Camera` opens a live camera preview in `#qr-camera-preview-slot`, detects QR codes containing `http(s)://` URLs, stops the camera stream, and auto-submits the pairing link.
- [x] `🖼️ Upload / Paste QR Image` decodes QR barcodes from uploaded image files and auto-submits the pairing link.
- [x] All source files remain `<= 400` lines and pass `tests/00-architecture-invariants.test.ts`.
