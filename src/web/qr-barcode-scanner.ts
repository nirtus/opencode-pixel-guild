import {
  decodeQrBooleanMatrix,
  normalizeQrPayloadToPairingUrl,
} from "../ingress/qr-matrix-decoder.ts";

let activeCameraStream: MediaStream | null = null;
let cameraStreamGeneration = 0;

export function stopActiveQrCameraStream(): void {
  cameraStreamGeneration += 1;
  if (activeCameraStream) {
    for (const track of activeCameraStream.getTracks()) {
      track.stop();
    }
    activeCameraStream = null;
  }
}

interface BarcodeDetectorLike {
  detect(source: ImageBitmapSource): Promise<Array<{ rawValue?: string }>>;
}

function createDetector(): BarcodeDetectorLike | null {
  const g = globalThis as Record<string, any>;
  if (typeof g.BarcodeDetector === "function") {
    try {
      return new g.BarcodeDetector({ formats: ["qr_code"] }) as BarcodeDetectorLike;
    } catch {
      return new g.BarcodeDetector() as BarcodeDetectorLike;
    }
  }
  return null;
}

export function decodeQrFromRgbaPixels(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
): string | null {
  if (width < 21 || height < 21) return null;
  const lum = new Uint8Array(width * height);
  let minLum = 255;
  let maxLum = 0;
  for (let i = 0; i < width * height; i++) {
    const r = rgba[i * 4] ?? 0;
    const g = rgba[i * 4 + 1] ?? 0;
    const b = rgba[i * 4 + 2] ?? 0;
    const y = (r * 77 + g * 150 + b * 29) >> 8;
    lum[i] = y;
    if (y < minLum) minLum = y;
    if (y > maxLum) maxLum = y;
  }
  const thresh = (minLum + maxLum) >> 1;

  for (const foregroundIsBright of [true, false]) {
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const isFg = foregroundIsBright ? lum[y * width + x] >= thresh : lum[y * width + x] < thresh;
        if (isFg) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX <= minX + 15 || maxY <= minY + 15) continue;
    const boxW = maxX - minX + 1;
    const boxH = maxY - minY + 1;

    for (const borderCells of [2, 0]) {
      for (const moduleIsDark of [true, false]) {
        for (let version = 1; version <= 12; version++) {
          const size = version * 4 + 17;
          const totalSpan = size + borderCells * 2;
          const modules: boolean[][] = Array.from({ length: size }, (_, my) =>
            Array.from({ length: size }, (_, mx) => {
              const px = Math.min(width - 1, Math.floor(minX + ((mx + borderCells + 0.5) / totalSpan) * boxW));
              const py = Math.min(height - 1, Math.floor(minY + ((my + borderCells + 0.5) / totalSpan) * boxH));
              const l = lum[py * width + px];
              return moduleIsDark ? l < thresh : l >= thresh;
            }),
          );
          const decoded = decodeQrBooleanMatrix(modules);
          const url = decoded ? normalizeQrPayloadToPairingUrl(decoded) : null;
          if (url) return url;
        }
      }
    }
  }
  return null;
}

export async function startCameraQrScanner(
  slotEl: HTMLElement,
  onDecodedUrl: (url: string) => void,
  onStatus: (msg: string) => void,
): Promise<void> {
  stopActiveQrCameraStream();
  const myGen = ++cameraStreamGeneration;
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    onStatus("⚠️ Camera access is not available in this browser — paste the QR code or pairing link directly.");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });
    if (myGen !== cameraStreamGeneration) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
      return;
    }
    activeCameraStream = stream;
    slotEl.innerHTML = `
      <div class="sheet-card">
        <div class="sheet-card-title">
          <span>📷 Point Camera at OpenCode QR Barcode</span>
          <button type="button" class="btn btn-compact-action" id="btn-stop-qr-camera">✕ Stop Camera</button>
        </div>
        <video id="qr-camera-video" autoplay playsinline muted class="modal-input"></video>
      </div>
    `;
    const videoEl = slotEl.querySelector("#qr-camera-video") as HTMLVideoElement | null;
    slotEl.querySelector("#btn-stop-qr-camera")?.addEventListener("click", () => {
      stopActiveQrCameraStream();
      slotEl.innerHTML = "";
    });
    if (!videoEl) return;
    videoEl.srcObject = stream;
    await videoEl.play();

    const detector = createDetector();
    const offscreen = typeof document !== "undefined" ? document.createElement("canvas") : null;

    const scanTick = async () => {
      if (!activeCameraStream) return;
      try {
        if (videoEl.readyState >= 2) {
          if (detector) {
            const results = await detector.detect(videoEl);
            for (const r of results) {
              const url = r.rawValue ? normalizeQrPayloadToPairingUrl(r.rawValue) : null;
              if (url) {
                stopActiveQrCameraStream();
                slotEl.innerHTML = "";
                onDecodedUrl(url);
                return;
              }
            }
          }
          if (offscreen && videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
            offscreen.width = videoEl.videoWidth;
            offscreen.height = videoEl.videoHeight;
            const ctx = offscreen.getContext("2d");
            if (ctx) {
              ctx.drawImage(videoEl, 0, 0);
              const imgData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
              const url = decodeQrFromRgbaPixels(imgData.data, offscreen.width, offscreen.height);
              if (url) {
                stopActiveQrCameraStream();
                slotEl.innerHTML = "";
                onDecodedUrl(url);
                return;
              }
            }
          }
        }
      } catch {
        // Continue scanning next frame
      }
      if (activeCameraStream) {
        requestAnimationFrame(scanTick);
      }
    };
    requestAnimationFrame(scanTick);
  } catch (err) {
    onStatus(
      `⚠️ Camera permission denied or unavailable (${err instanceof Error ? err.message : "error"}) — paste the QR code or pairing link directly.`,
    );
  }
}

export async function decodeQrFromImageBlob(blob: Blob): Promise<string | null> {
  if (typeof createImageBitmap !== "function") return null;
  try {
    const bitmap = await createImageBitmap(blob);
    try {
      const detector = createDetector();
      if (detector) {
        try {
          const results = await detector.detect(bitmap);
          for (const r of results) {
            const url = r.rawValue ? normalizeQrPayloadToPairingUrl(r.rawValue) : null;
            if (url) return url;
          }
        } catch {
          // Fall through to canvas matrix decoder
        }
      }
      if (typeof document !== "undefined") {
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(bitmap, 0, 0);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          return decodeQrFromRgbaPixels(imgData.data, canvas.width, canvas.height);
        }
      }
      return null;
    } finally {
      try {
        (bitmap as { close?: () => void }).close?.();
      } catch {}
    }
  } catch {
    return null;
  }
}
