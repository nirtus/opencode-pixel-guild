import type {
  CameraTransform,
  ChamberFocusMode,
  EffectiveChamberFocus,
  ProportionalWorldDimensions,
} from "./scene-contracts.ts";

export type { ChamberFocusMode, EffectiveChamberFocus, ProportionalWorldDimensions };

export const MIN_CAMERA_ZOOM = 0.35;
export const MAX_CAMERA_ZOOM = 2.5;
export const WORLD_TOTAL_WIDTH_PX = 1600;
export const WORLD_CHAMBER_WIDTH_PX = 800;
export const WORLD_TOTAL_HEIGHT_PX = 720;
export const SPLIT_ROOM_WIDTH_RATIO = 0.65;
export const SPLIT_WILDS_WIDTH_RATIO = 0.35;
export const SPLIT_WILDS_WIDTH_PX = 432;

function clampZoomValue(zoom: number): number {
  return Number(
    Math.min(MAX_CAMERA_ZOOM, Math.max(MIN_CAMERA_ZOOM, zoom)).toFixed(3),
  );
}

export function resolveEffectiveChamberFocus(
  focusMode: ChamberFocusMode,
  viewportW: number,
  viewportH: number,
  hasActiveBug: boolean,
): EffectiveChamberFocus {
  if (focusMode === "workshop" || focusMode === "wilds" || focusMode === "split") {
    return focusMode;
  }
  const isMobileLandscape = viewportH <= 540 && viewportW > viewportH;
  if (viewportW > 960 || isMobileLandscape) {
    return hasActiveBug ? "split" : "workshop";
  }
  return hasActiveBug ? "wilds" : "workshop";
}

export function computeProportionalWorldDimensions(
  availW: number,
  availH: number,
  chamber: EffectiveChamberFocus,
): ProportionalWorldDimensions {
  const roomWidth = WORLD_CHAMBER_WIDTH_PX;
  const chamberWidth = roomWidth;
  const isMobilePortrait =
    availW > 0 &&
    availW <= 960 &&
    availH > availW &&
    chamber !== "split";
  const chamberHeight = isMobilePortrait
    ? Math.max(
        WORLD_TOTAL_HEIGHT_PX,
        Math.round(WORLD_CHAMBER_WIDTH_PX * (availH / Math.max(1, availW))),
      )
    : WORLD_TOTAL_HEIGHT_PX;
  const worldHeight = chamberHeight;
  const wildsWidth =
    chamber === "split" ? SPLIT_WILDS_WIDTH_PX : WORLD_CHAMBER_WIDTH_PX;
  const worldWidth =
    chamber === "split" ? roomWidth + wildsWidth : WORLD_CHAMBER_WIDTH_PX;
  return { chamberWidth, chamberHeight, worldWidth, worldHeight, roomWidth, wildsWidth };
}

export function anchorChamberPoint(
  x: number,
  y: number,
  chamberW = WORLD_CHAMBER_WIDTH_PX,
  chamberH = WORLD_TOTAL_HEIGHT_PX,
): { x: number; y: number } {
  const dx = chamberW - WORLD_CHAMBER_WIDTH_PX;
  const dy = Math.max(0, chamberH - WORLD_TOTAL_HEIGHT_PX);
  let ax = x;
  if (dx < 0) {
    ax = x * (Math.max(1, chamberW) / WORLD_CHAMBER_WIDTH_PX);
  } else if (dx > 0) {
    if (x <= 160) ax = x;
    else if (x >= 590) ax = x + dx;
    else ax = x + dx * ((x - 160) / 430);
  }
  let ay = y;
  if (dy > 0) {
    if (y <= 160) ay = y;
    else if (y >= 520) ay = y + dy;
    else ay = y + dy * ((y - 160) / 360);
  }
  return { x: ax, y: ay };
}

export function unanchorChamberPoint(
  ax: number,
  ay: number,
  chamberW = WORLD_CHAMBER_WIDTH_PX,
  chamberH = WORLD_TOTAL_HEIGHT_PX,
): { x: number; y: number } {
  const dx = chamberW - WORLD_CHAMBER_WIDTH_PX;
  const dy = Math.max(0, chamberH - WORLD_TOTAL_HEIGHT_PX);
  let x = ax;
  if (dx < 0) {
    x = ax * (WORLD_CHAMBER_WIDTH_PX / Math.max(1, chamberW));
  } else if (dx > 0) {
    if (ax <= 160) x = ax;
    else if (ax >= 590 + dx) x = ax - dx;
    else x = 160 + ((ax - 160) / (430 + dx)) * 430;
  }
  let y = ay;
  if (dy > 0) {
    if (ay <= 160) y = ay;
    else if (ay >= 520 + dy) y = ay - dy;
    else y = 160 + ((ay - 160) / (360 + dy)) * 360;
  }
  return { x, y };
}

function resolveEffectiveWildsWidth(chamberW: number, wildsW?: number): number {
  return (
    wildsW ??
    (chamberW > WORLD_CHAMBER_WIDTH_PX && chamberW < WORLD_TOTAL_WIDTH_PX
      ? WORLD_TOTAL_WIDTH_PX - chamberW
      : chamberW)
  );
}

function resolveActiveChamberWidth(
  chamber: EffectiveChamberFocus,
  chamberW: number,
  wildsW: number,
): number {
  return chamber === "split" ? chamberW + wildsW : chamber === "wilds" ? wildsW : chamberW;
}

export function anchorWorldPoint(
  worldX: number,
  worldY: number,
  chamberW = WORLD_CHAMBER_WIDTH_PX,
  chamberH = WORLD_TOTAL_HEIGHT_PX,
  wildsW?: number,
): { x: number; y: number } {
  const effectiveWildsW = resolveEffectiveWildsWidth(chamberW, wildsW);
  if (worldX >= WORLD_CHAMBER_WIDTH_PX) {
    const p = anchorChamberPoint(
      worldX - WORLD_CHAMBER_WIDTH_PX,
      worldY,
      effectiveWildsW,
      chamberH,
    );
    return { x: chamberW + p.x, y: p.y };
  }
  return anchorChamberPoint(worldX, worldY, chamberW, chamberH);
}

export function unanchorWorldPoint(
  anchoredX: number,
  anchoredY: number,
  chamberW = WORLD_CHAMBER_WIDTH_PX,
  chamberH = WORLD_TOTAL_HEIGHT_PX,
  wildsW?: number,
): { x: number; y: number } {
  const effectiveWildsW = resolveEffectiveWildsWidth(chamberW, wildsW);
  if (anchoredX >= chamberW) {
    const p = unanchorChamberPoint(
      anchoredX - chamberW,
      anchoredY,
      effectiveWildsW,
      chamberH,
    );
    return { x: WORLD_CHAMBER_WIDTH_PX + p.x, y: p.y };
  }
  return unanchorChamberPoint(anchoredX, anchoredY, chamberW, chamberH);
}

export function computeChamberCameraFit(
  viewportW: number,
  viewportH: number,
  chamber: EffectiveChamberFocus,
  chamberW = WORLD_CHAMBER_WIDTH_PX,
  chamberH = WORLD_TOTAL_HEIGHT_PX,
  wildsW = chamberW,
  mobileEdgeFit = false,
): CameraTransform {
  const activeW = resolveActiveChamberWidth(chamber, chamberW, wildsW);
  const vw = Math.max(240, viewportW || activeW);
  const vh = Math.max(240, viewportH || chamberH);
  const worldH = chamberH;
  const originX = chamber === "wilds" ? chamberW : 0;
  const fitW = mobileEdgeFit && chamber !== "split" ? Math.max(400, activeW - 36) : activeW;
  const fitH = mobileEdgeFit && chamber !== "split" ? Math.max(400, worldH - 24) : worldH;
  const zoom = clampZoomValue(Math.min(vw / fitW, vh / fitH));
  const panX = Math.round((vw - activeW * zoom) / 2 - originX * zoom);
  const panY = Math.round((vh - worldH * zoom) / 2);
  return { zoom, panX, panY };
}

export function clampCameraToChamberWalls(
  camera: CameraTransform,
  chamber: EffectiveChamberFocus,
  chamberW = WORLD_CHAMBER_WIDTH_PX,
  chamberH = WORLD_TOTAL_HEIGHT_PX,
  viewportW?: number,
  viewportH = chamberH,
  wildsW = chamberW,
): CameraTransform {
  const clampedZoom = clampZoomValue(camera.zoom);
  const activeW = resolveActiveChamberWidth(chamber, chamberW, wildsW);
  const vw = viewportW ?? activeW;
  const originX = chamber === "wilds" ? chamberW : 0;
  const scaledW = activeW * clampedZoom;
  const scaledH = chamberH * clampedZoom;

  let panX: number;
  if (scaledW <= vw) {
    panX = Math.round((vw - scaledW) / 2 - originX * clampedZoom);
  } else {
    const maxPanX = Math.round(-originX * clampedZoom);
    const minPanX = Math.round(vw - (originX + activeW) * clampedZoom);
    panX = Math.min(maxPanX, Math.max(minPanX, Math.round(camera.panX)));
  }

  let panY: number;
  if (scaledH <= viewportH) {
    panY = Math.round((viewportH - scaledH) / 2);
  } else {
    const maxPanY = 0;
    const minPanY = Math.round(viewportH - scaledH);
    panY = Math.min(maxPanY, Math.max(minPanY, Math.round(camera.panY)));
  }

  return {
    zoom: clampedZoom,
    panX: panX === 0 ? 0 : panX,
    panY: panY === 0 ? 0 : panY,
  };
}

export function clampCameraPan(
  zoom: number,
  panX: number,
  panY: number,
  viewportW = WORLD_TOTAL_WIDTH_PX,
  viewportH = WORLD_TOTAL_HEIGHT_PX,
): CameraTransform {
  const clampedZoom = clampZoomValue(zoom);
  const marginX = Math.round(viewportW * 0.5);
  const marginY = Math.round(viewportH * 0.5);
  const minPanX = Math.round(-WORLD_TOTAL_WIDTH_PX * clampedZoom + marginX);
  const maxPanX = marginX;
  const minPanY = Math.round(-WORLD_TOTAL_HEIGHT_PX * clampedZoom + marginY);
  const maxPanY = marginY;
  return {
    zoom: clampedZoom,
    panX: Math.min(maxPanX, Math.max(minPanX, Math.round(panX))),
    panY: Math.min(maxPanY, Math.max(minPanY, Math.round(panY))),
  };
}

export function zoomCameraAtFocalPoint(
  camera: CameraTransform,
  nextZoom: number,
  focalCanvasX: number,
  focalCanvasY: number,
  viewportW = WORLD_TOTAL_WIDTH_PX,
  viewportH = WORLD_TOTAL_HEIGHT_PX,
): CameraTransform {
  const clampedZoom = clampZoomValue(nextZoom);
  const worldX = (focalCanvasX - camera.panX) / camera.zoom;
  const worldY = (focalCanvasY - camera.panY) / camera.zoom;
  const rawPanX = focalCanvasX - worldX * clampedZoom;
  const rawPanY = focalCanvasY - worldY * clampedZoom;
  return clampCameraPan(clampedZoom, rawPanX, rawPanY, viewportW, viewportH);
}

export function screenToWorldCoords(
  camera: CameraTransform,
  canvasRect: { left: number; top: number; width: number; height: number },
  canvasWidth: number,
  canvasHeight: number,
  clientX: number,
  clientY: number,
): { x: number; y: number; canvasX: number; canvasY: number } {
  const rectW = Math.max(1, canvasRect.width);
  const rectH = Math.max(1, canvasRect.height);
  const cw = Math.max(1, canvasWidth);
  const ch = Math.max(1, canvasHeight);
  const canvasAspect = cw / ch;
  const rectAspect = rectW / rectH;

  let renderW = rectW;
  let renderH = rectH;
  let offsetX = 0;
  let offsetY = 0;

  if (rectAspect > canvasAspect + 0.001) {
    renderH = rectH;
    renderW = rectH * canvasAspect;
    offsetX = (rectW - renderW) / 2;
  } else if (rectAspect < canvasAspect - 0.001) {
    renderW = rectW;
    renderH = rectW / canvasAspect;
    offsetY = (rectH - renderH) / 2;
  }

  const canvasX = ((clientX - canvasRect.left - offsetX) / renderW) * cw;
  const canvasY = ((clientY - canvasRect.top - offsetY) / renderH) * ch;
  const x = (canvasX - camera.panX) / camera.zoom;
  const y = (canvasY - camera.panY) / camera.zoom;
  return { x, y, canvasX, canvasY };
}
