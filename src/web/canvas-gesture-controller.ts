import {
  type CameraTransform,
  clampCameraPan,
  zoomCameraAtFocalPoint,
} from "../scene/index.ts";

export interface GesturePointerSample {
  pointerId: number;
  clientX: number;
  clientY: number;
  pointerType?: string;
  timestampMs?: number;
}

export interface CanvasGestureState {
  activePointers: Map<number, { clientX: number; clientY: number; pointerType: string }>;
  primaryStartX: number;
  primaryStartY: number;
  startPanX: number;
  startPanY: number;
  startZoom: number;
  hasDraggedBeyondSlop: boolean;
  pinchInitialDistance: number;
  pinchInitialZoom: number;
  pinchLastMidX: number;
  pinchLastMidY: number;
  lastTapTimestampMs: number;
  lastTapClientX: number;
  lastTapClientY: number;
}

export type GestureStepResult =
  | { kind: "none"; camera: CameraTransform }
  | { kind: "pan"; camera: CameraTransform }
  | { kind: "pinch"; camera: CameraTransform }
  | {
      kind: "tap";
      clientX: number;
      clientY: number;
      isCoarsePointer: boolean;
      isDoubleTap: boolean;
    };

export const DRAG_HYSTERESIS_PX = 8;
export const DOUBLE_TAP_WINDOW_MS = 300;
export const DOUBLE_TAP_RADIUS_PX = 24;

function computeTwoPointerPair(
  activePointers: Map<number, { clientX: number; clientY: number }>,
): { dist: number; midX: number; midY: number } {
  const pts = Array.from(activePointers.values());
  const dx = pts[1].clientX - pts[0].clientX;
  const dy = pts[1].clientY - pts[0].clientY;
  return {
    dist: Math.max(12, Math.hypot(dx, dy)),
    midX: (pts[0].clientX + pts[1].clientX) / 2,
    midY: (pts[0].clientY + pts[1].clientY) / 2,
  };
}

export function createCanvasGestureState(): CanvasGestureState {
  return {
    activePointers: new Map(),
    primaryStartX: 0,
    primaryStartY: 0,
    startPanX: 0,
    startPanY: 0,
    startZoom: 1,
    hasDraggedBeyondSlop: false,
    pinchInitialDistance: 0,
    pinchInitialZoom: 1,
    pinchLastMidX: 0,
    pinchLastMidY: 0,
    lastTapTimestampMs: 0,
    lastTapClientX: 0,
    lastTapClientY: 0,
  };
}

export function stepPointerDown(
  state: CanvasGestureState,
  sample: GesturePointerSample,
  camera: CameraTransform,
): void {
  state.activePointers.set(sample.pointerId, {
    clientX: sample.clientX,
    clientY: sample.clientY,
    pointerType: sample.pointerType ?? "mouse",
  });

  if (state.activePointers.size === 1) {
    state.primaryStartX = sample.clientX;
    state.primaryStartY = sample.clientY;
    state.startPanX = camera.panX;
    state.startPanY = camera.panY;
    state.startZoom = camera.zoom;
    state.hasDraggedBeyondSlop = false;
  } else if (state.activePointers.size === 2) {
    const pair = computeTwoPointerPair(state.activePointers);
    state.pinchInitialDistance = pair.dist;
    state.pinchInitialZoom = camera.zoom;
    state.pinchLastMidX = pair.midX;
    state.pinchLastMidY = pair.midY;
    state.hasDraggedBeyondSlop = true;
  }
}

export function stepPointerMove(
  state: CanvasGestureState,
  sample: GesturePointerSample,
  camera: CameraTransform,
  viewportW: number,
  viewportH: number,
): GestureStepResult {
  if (!state.activePointers.has(sample.pointerId)) {
    return { kind: "none", camera };
  }
  state.activePointers.set(sample.pointerId, {
    clientX: sample.clientX,
    clientY: sample.clientY,
    pointerType: sample.pointerType ?? "mouse",
  });

  if (state.activePointers.size === 2) {
    const pair = computeTwoPointerPair(state.activePointers);
    const scaleFactor = pair.dist / Math.max(12, state.pinchInitialDistance);
    const targetZoom = state.pinchInitialZoom * scaleFactor;
    const zoomed = zoomCameraAtFocalPoint(
      camera,
      targetZoom,
      pair.midX,
      pair.midY,
      viewportW,
      viewportH,
    );
    const midDx = pair.midX - state.pinchLastMidX;
    const midDy = pair.midY - state.pinchLastMidY;
    state.pinchLastMidX = pair.midX;
    state.pinchLastMidY = pair.midY;
    const clamped = clampCameraPan(
      zoomed.zoom,
      zoomed.panX + midDx,
      zoomed.panY + midDy,
      viewportW,
      viewportH,
    );
    state.startPanX = clamped.panX;
    state.startPanY = clamped.panY;
    state.startZoom = clamped.zoom;
    return { kind: "pinch", camera: clamped };
  }

  if (state.activePointers.size === 1) {
    const dx = sample.clientX - state.primaryStartX;
    const dy = sample.clientY - state.primaryStartY;
    if (!state.hasDraggedBeyondSlop && Math.hypot(dx, dy) < DRAG_HYSTERESIS_PX) {
      return { kind: "none", camera };
    }
    state.hasDraggedBeyondSlop = true;
    const nextCam = clampCameraPan(
      camera.zoom,
      state.startPanX + dx,
      state.startPanY + dy,
      viewportW,
      viewportH,
    );
    return { kind: "pan", camera: nextCam };
  }

  return { kind: "none", camera };
}

export function stepPointerUp(
  state: CanvasGestureState,
  sample: GesturePointerSample,
  camera?: CameraTransform,
): GestureStepResult {
  const prev = state.activePointers.get(sample.pointerId);
  state.activePointers.delete(sample.pointerId);

  if (state.activePointers.size === 1) {
    const remaining = state.activePointers.values().next().value;
    if (remaining) {
      state.primaryStartX = remaining.clientX;
      state.primaryStartY = remaining.clientY;
      if (camera) {
        state.startPanX = camera.panX;
        state.startPanY = camera.panY;
        state.startZoom = camera.zoom;
      }
    }
  }

  if (state.activePointers.size > 0 || state.hasDraggedBeyondSlop) {
    if (state.activePointers.size === 0) {
      state.hasDraggedBeyondSlop = false;
    }
    return {
      kind: "none",
      camera: { zoom: state.startZoom, panX: state.startPanX, panY: state.startPanY },
    };
  }

  const pointerType = sample.pointerType ?? prev?.pointerType ?? "mouse";
  const isCoarsePointer = pointerType === "touch" || pointerType === "pen";
  const nowMs = sample.timestampMs ?? Date.now();
  const dt = nowMs - state.lastTapTimestampMs;
  const dist = Math.hypot(
    sample.clientX - state.lastTapClientX,
    sample.clientY - state.lastTapClientY,
  );
  const isDoubleTap = dt > 0 && dt <= DOUBLE_TAP_WINDOW_MS && dist <= DOUBLE_TAP_RADIUS_PX;

  state.lastTapTimestampMs = isDoubleTap ? 0 : nowMs;
  state.lastTapClientX = sample.clientX;
  state.lastTapClientY = sample.clientY;

  return {
    kind: "tap",
    clientX: sample.clientX,
    clientY: sample.clientY,
    isCoarsePointer,
    isDoubleTap,
  };
}

export function stepWheelZoom(
  camera: CameraTransform,
  deltaY: number,
  focalCanvasX: number,
  focalCanvasY: number,
  viewportW: number,
  viewportH: number,
): CameraTransform {
  const zoomDelta = deltaY < 0 ? 0.14 : -0.14;
  return zoomCameraAtFocalPoint(
    camera,
    camera.zoom + zoomDelta,
    focalCanvasX,
    focalCanvasY,
    viewportW,
    viewportH,
  );
}
