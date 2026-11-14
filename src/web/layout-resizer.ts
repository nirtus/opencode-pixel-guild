import { clientState } from "./client-state.ts";

export const DEFAULT_DESKTOP_WORLD_RATIO = 0.65;
export const MIN_DESKTOP_WORLD_RATIO = 0.25;
export const MAX_DESKTOP_WORLD_RATIO = 0.8;

export function clampDesktopWorldRatio(
  ratio: number | null | undefined,
): number {
  if (typeof ratio !== "number" || !Number.isFinite(ratio)) {
    return DEFAULT_DESKTOP_WORLD_RATIO;
  }
  const clamped = Math.min(
    MAX_DESKTOP_WORLD_RATIO,
    Math.max(MIN_DESKTOP_WORLD_RATIO, ratio),
  );
  return Math.round(clamped * 1000) / 1000;
}

export function computeDesktopWorldRatioFromPointer(
  clientX: number,
  stageRect: { left: number; width: number },
): number {
  if (!stageRect || !Number.isFinite(stageRect.width) || stageRect.width <= 0) {
    return DEFAULT_DESKTOP_WORLD_RATIO;
  }
  const raw = (clientX - stageRect.left) / stageRect.width;
  return clampDesktopWorldRatio(raw);
}

function formatFrNumber(pct: number): number {
  return Math.round(pct * 10) / 10;
}

export function formatDesktopGridColumns(worldRatio: number): string {
  const wPct = formatFrNumber(clampDesktopWorldRatio(worldRatio) * 100);
  const gmPct = formatFrNumber(100 - wPct);
  return `minmax(0, ${wPct}fr) minmax(0, ${gmPct}fr)`;
}

export function syncDesktopSplitRatioDom(
  mainStage: HTMLElement | null | undefined,
  worldRatio: number,
): void {
  if (!mainStage) return;
  const clamped = clampDesktopWorldRatio(worldRatio);
  const wPct = formatFrNumber(clamped * 100);
  const gmPct = formatFrNumber(100 - wPct);
  mainStage.style?.setProperty?.("--world-col-fr", `${wPct}fr`);
  mainStage.style?.setProperty?.("--gm-col-fr", `${gmPct}fr`);
  mainStage.style?.setProperty?.("--world-col-pct", `${wPct}%`);
  mainStage.setAttribute?.("data-world-ratio", clamped.toFixed(2));
}

export function initDesktopLayoutResizer(
  _canvas: HTMLCanvasElement | null,
  onStateChanged: () => void,
  onCameraSync?: () => void,
): void {
  if (typeof document === "undefined") return;
  const mainStage = document.getElementById("main-stage");
  const resizer = document.getElementById("layout-resizer");
  syncDesktopSplitRatioDom(mainStage, clientState.desktopWorldWidthRatio);
  if (!resizer || !mainStage) return;

  let activePointerId: number | null = null;

  const applyClientX = (clientX: number) => {
    const rect = mainStage.getBoundingClientRect?.();
    if (!rect || rect.width <= 0) return;
    const nextRatio = computeDesktopWorldRatioFromPointer(clientX, rect);
    if (nextRatio === clientState.desktopWorldWidthRatio) return;
    clientState.desktopWorldWidthRatio = nextRatio;
    syncDesktopSplitRatioDom(mainStage, nextRatio);
    onCameraSync?.();
    onStateChanged();
  };

  resizer.addEventListener("pointerdown", (e: PointerEvent) => {
    if (typeof e.button === "number" && e.button !== 0) return;
    e.preventDefault?.();
    activePointerId = e.pointerId ?? 1;
    resizer.setPointerCapture?.(activePointerId);
    resizer.classList?.add("is-dragging");
    document.body?.classList?.add("is-resizing-split");
  });

  const handlePointerMove = (e: PointerEvent) => {
    if (activePointerId === null) return;
    if (e.pointerId !== undefined && e.pointerId !== activePointerId) return;
    e.preventDefault?.();
    applyClientX(e.clientX);
  };

  const handlePointerEnd = (e: PointerEvent) => {
    if (activePointerId === null) return;
    if (e.pointerId !== undefined && e.pointerId !== activePointerId) return;
    resizer.releasePointerCapture?.(activePointerId);
    activePointerId = null;
    resizer.classList?.remove("is-dragging");
    document.body?.classList?.remove("is-resizing-split");
    onCameraSync?.();
    onStateChanged();
  };

  if (typeof window !== "undefined" && window.addEventListener) {
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);
  } else {
    resizer.addEventListener("pointermove", handlePointerMove);
    resizer.addEventListener("pointerup", handlePointerEnd);
    resizer.addEventListener("pointercancel", handlePointerEnd);
  }
}
