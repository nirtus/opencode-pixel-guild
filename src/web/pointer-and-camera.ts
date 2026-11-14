import { buildSceneObjectTooltip, escapeHtml, type SceneObjectTooltipViewModel } from "../hud/spectator-hud.ts";
import { type CameraTransform, type ChamberFocusMode, clampCameraToChamberWalls, computeChamberCameraFit, computeProportionalWorldDimensions, hitTestSceneFrame, resolveEffectiveChamberFocus, type SceneHitboxSpec, screenToWorldCoords, unanchorWorldPoint, zoomCameraAtFocalPoint } from "../scene/index.ts";
import { createCanvasGestureState, stepPointerDown, stepPointerMove, stepPointerUp, stepWheelZoom } from "./canvas-gesture-controller.ts";
import { deriveProjectBugMonsters, hasHeroFightingMonster } from "./canvas-wilds-painter.ts";
import { clientState, getCachedQueryViewportWidth, getScopedGameMasterCharacters, MOBILE_BREAKPOINT_PX, reconcileMobileDrawerSelection, selectCommitRepository, type SpectatorDrawerState, type SpectatorDrawerTab } from "./client-state.ts";
import { closeDemolitionModal, confirmDemolishRoom, openDemolitionModal } from "./demolition-modal-controller.ts";
import { clampDesktopWorldRatio, initDesktopLayoutResizer } from "./layout-resizer.ts";

export { closeDemolitionModal, confirmDemolishRoom, openDemolitionModal };

export const TARGET_CANVAS_FPS = 30;
export const TARGET_FRAME_INTERVAL_MS = 1000 / TARGET_CANVAS_FPS;
export const MIN_FRAME_DELTA_MS = 31;

export function shouldRenderCanvasFrameAtTimestamp(
  timestampMs: number,
  lastRenderedTs: number,
  options?: { isHeadless?: boolean; cameraGestureActive?: boolean },
): boolean {
  if (options?.isHeadless || options?.cameraGestureActive || lastRenderedTs <= 0 || timestampMs < lastRenderedTs) return true;
  return timestampMs - lastRenderedTs >= MIN_FRAME_DELTA_MS;
}

let lastAutoCameraSignature = "";

export function getEffectiveViewportWidth(): number {
  if (typeof window === "undefined") return 1280;
  const qVw = getCachedQueryViewportWidth();
  const outer = qVw > 0 ? qVw : (window.outerWidth || window.innerWidth);
  if (outer > 0 && outer < window.innerWidth && typeof document !== "undefined") {
    document.body.style.width = `${outer}px`; document.body.style.maxWidth = `${outer}px`;
    return outer;
  }
  return window.innerWidth;
}

function getCamera(): CameraTransform {
  return { zoom: clientState.cameraZoom, panX: clientState.cameraPanX, panY: clientState.cameraPanY };
}

function applyCameraTransform(next: CameraTransform): void {
  const vw = getEffectiveViewportWidth();
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const effective = resolveEffectiveChamberFocus(clientState.cameraFocusMode, vw, vh, hasHeroFightingMonster());
  const cw = clientState.chamberWidth || 800;
  const wildsW = clientState.wildsWidth || cw;
  const ch = clientState.chamberHeight || 720;
  const c = typeof document !== "undefined" ? (document.getElementById("guild-canvas") as HTMLCanvasElement | null) : null;
  const locked = clampCameraToChamberWalls(next, effective, cw, ch, c?.width || (effective === "split" ? cw + wildsW : cw), c?.height || ch, wildsW);
  clientState.cameraZoom = locked.zoom;
  clientState.cameraPanX = locked.panX;
  clientState.cameraPanY = locked.panY;
  const el = typeof document !== "undefined" ? document.getElementById("zoom-readout") : null;
  if (el) el.textContent = `${clientState.cameraZoom.toFixed(2)}x`;
}

let lastLayoutCacheKey = "";
let cachedStageH = 0, cachedWorldW = 0, cachedWorldH = 0, cachedToolbarH = 0, cachedOverheadH = 0;

export function syncViewportCameraFit(canvas?: HTMLCanvasElement | null, force = false): void {
  const c = canvas ?? (typeof document !== "undefined" ? (document.getElementById("guild-canvas") as HTMLCanvasElement | null) : null);
  const vw = getEffectiveViewportWidth();
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const bugs = deriveProjectBugMonsters();
  const heroFighting = hasHeroFightingMonster(bugs);
  const effective = resolveEffectiveChamberFocus(clientState.cameraFocusMode, vw, vh, heroFighting);
  const stageEl = c?.parentElement;
  const isMobile = vw <= MOBILE_BREAKPOINT_PX;
  const worldRatio = clampDesktopWorldRatio(clientState.desktopWorldWidthRatio);
  const layoutKey = `${vw}x${vh}:${clientState.isGamemasterCollapsed ? 1 : 0}:${worldRatio}`;
  if (force || layoutKey !== lastLayoutCacheKey) {
    lastLayoutCacheKey = layoutKey;
    const stageRect = stageEl?.getBoundingClientRect?.();
    const worldRect = typeof document !== "undefined" ? document.getElementById("world-section")?.getBoundingClientRect?.() : undefined;
    const headerRect = typeof document !== "undefined" ? document.querySelector(".top-bar")?.getBoundingClientRect?.() : undefined;
    const toolbarRect = typeof document !== "undefined" ? document.querySelector(".world-toolbar")?.getBoundingClientRect?.() : undefined;
    const footerRect = typeof document !== "undefined" ? document.querySelector(".drawer-chrome")?.getBoundingClientRect?.() : undefined;
    cachedStageH = stageRect?.height || 0;
    cachedWorldW = worldRect?.width || 0;
    cachedWorldH = worldRect?.height || 0;
    cachedToolbarH = toolbarRect?.height || 0;
    cachedOverheadH = (headerRect?.height || 0) + cachedToolbarH + (isMobile ? (footerRect?.height || 0) : 0);
  }
  const fallbackW = cachedWorldW || (isMobile || clientState.isGamemasterCollapsed ? vw : Math.round(vw * worldRatio));
  const fallbackH = Math.max(240, cachedStageH || (cachedWorldH ? cachedWorldH - cachedToolbarH : vh - cachedOverheadH));
  const availW = Math.max(280, Math.min(vw, stageEl?.clientWidth || Math.round(fallbackW)));
  const availH = Math.max(240, stageEl?.clientHeight || Math.round(fallbackH));
  const dims = computeProportionalWorldDimensions(availW, availH, effective);
  clientState.chamberWidth = dims.roomWidth;
  clientState.wildsWidth = dims.wildsWidth;
  clientState.chamberHeight = dims.chamberHeight;
  const targetWidth = dims.worldWidth;
  const targetHeight = dims.worldHeight;
  const sig = `${clientState.cameraFocusMode}:${effective}:${targetWidth}:${targetHeight}:${vw}x${vh}:${bugs.length}:${heroFighting ? 1 : 0}:${clientState.isGamemasterCollapsed ? 1 : 0}:${worldRatio}`;
  if (!force && sig === lastAutoCameraSignature) return;
  lastAutoCameraSignature = sig;

  if (typeof document !== "undefined") {
    const roomVisible = effective === "workshop" || effective === "split";
    const wildsVisible = effective === "wilds" || effective === "split";
    document.getElementById("btn-focus-auto")?.classList.toggle("active", clientState.cameraFocusMode === "auto");
    document.getElementById("btn-focus-workshop")?.classList.toggle("active", clientState.cameraFocusMode === "workshop");
    document.getElementById("btn-focus-wilds")?.classList.toggle("active", clientState.cameraFocusMode === "wilds");
    document.getElementById("btn-focus-split")?.classList.toggle("active", clientState.cameraFocusMode === "split");
    const btnRoom = document.getElementById("btn-focus-workshop");
    const btnWilds = document.getElementById("btn-focus-wilds");
    if (btnRoom) btnRoom.textContent = roomVisible ? "🏰 Room ✓" : "🏰 Room";
    if (btnWilds) {
      const bugSuffix = bugs.length > 0 ? ` (${bugs.length})` : "";
      btnWilds.textContent = wildsVisible ? `🌫️ Wilds${bugSuffix} ✓` : `🌫️ Wilds${bugSuffix}`;
    }
    c?.setAttribute("data-chamber-view", effective);
  }

  let resizedBitmap = false;
  if (c && (c.width !== targetWidth || c.height !== targetHeight)) {
    c.width = targetWidth; c.height = targetHeight; resizedBitmap = true;
  }
  applyCameraTransform(computeChamberCameraFit(c?.width || targetWidth, c?.height || targetHeight, effective, dims.roomWidth, dims.chamberHeight, dims.wildsWidth));
  if (resizedBitmap && typeof window !== "undefined") {
    window.dispatchEvent(new Event("guild-sprite-loaded"));
  }
}

function getWorldCoords(canvas: HTMLCanvasElement, clientX: number, clientY: number): { worldX: number; worldY: number; canvasX: number; canvasY: number } {
  const projected = screenToWorldCoords(getCamera(), canvas.getBoundingClientRect(), canvas.width, canvas.height, clientX, clientY);
  const canonical = unanchorWorldPoint(projected.x, projected.y, clientState.chamberWidth, clientState.chamberHeight, clientState.wildsWidth);
  return { worldX: canonical.x, worldY: canonical.y, canvasX: projected.canvasX, canvasY: projected.canvasY };
}

export function hitTestActiveScene(worldX: number, worldY: number, hitSlopWorldPx = 0): SceneHitboxSpec | null {
  return hitTestSceneFrame({ sceneHitboxes: clientState.sceneHitboxes }, worldX, worldY, { hitSlopWorldPx });
}

export function findHitCharacter(worldX: number, worldY: number, hitSlopWorldPx = 0): string | null {
  const sceneHit = hitTestActiveScene(worldX, worldY, hitSlopWorldPx);
  if (sceneHit?.target.kind === "character") return sceneHit.target.sessionId;
  for (let i = clientState.characterHitboxes.length - 1; i >= 0; i--) {
    const ch = clientState.characterHitboxes[i];
    if (worldX >= ch.x - hitSlopWorldPx && worldX <= ch.x + ch.w + hitSlopWorldPx && worldY >= ch.y - hitSlopWorldPx && worldY <= ch.y + ch.h + hitSlopWorldPx) {
      return ch.sessionId;
    }
  }
  return null;
}

function renderTooltipTitleAndBadgeHtml(vm: SceneObjectTooltipViewModel): string {
  return `<strong style="color:${escapeHtml(vm.accentHex || "#f5d08a")};font-size:12px;">${escapeHtml(vm.title)}</strong><span class="badge-pill" style="border-color:${escapeHtml(vm.accentHex || "#f59e0b")};color:#fef3c7;">${escapeHtml(vm.statusBadge)}</span>`;
}

function isSameSceneHoverTarget(a: unknown, b: unknown): boolean {
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  const ta = a as Record<string, unknown>;
  const tb = b as Record<string, unknown>;
  return ta.kind === tb.kind && ta.workstation === tb.workstation && ta.sessionId === tb.sessionId && ta.partId === tb.partId && ta.monsterId === tb.monsterId && ta.roomId === tb.roomId;
}

export function renderSceneHoverTitleHtml(vm: SceneObjectTooltipViewModel): string {
  return `<div class="tooltip-hover-pill" style="display:flex;align-items:center;gap:8px;">${renderTooltipTitleAndBadgeHtml(vm)}</div>`;
}

export function renderSceneTooltipHtml(vm: SceneObjectTooltipViewModel): string {
  const rowsHtml = (vm.rows ?? []).slice(0, 5).map((r) => `<div class="tooltip-row"><span class="tooltip-row-label">${escapeHtml(r.label)}:</span> <span style="color:${escapeHtml(r.accentHex || "#f5ebe1")};${r.mono ? "font-family:var(--font-mono);" : ""}">${escapeHtml(r.value)}</span></div>`).join("");
  return `<div class="tooltip-situation-popover"><div class="tooltip-header">${renderTooltipTitleAndBadgeHtml(vm)}</div><div class="tooltip-subtitle">${escapeHtml(vm.subtitle)}</div><div class="tooltip-desc">${escapeHtml(vm.description)}</div>${rowsHtml}</div>`;
}

export function handleScenePointerHover(
  worldX: number,
  worldY: number,
  tooltipEl?: HTMLElement | null,
  hitSlopWorldPx = 0,
): SceneObjectTooltipViewModel | null {
  const el = tooltipEl ?? (typeof document !== "undefined" ? document.getElementById("alcove-tooltip") : null);
  const hit = hitTestActiveScene(worldX, worldY, hitSlopWorldPx);
  const vm = hit ? buildSceneObjectTooltip(clientState.currentSnapshot, hit.target) : null;
  if (!vm) {
    if (el && !clientState.pinnedTooltipTarget) {
      el.style.display = "none";
      el.classList?.remove("visible");
    }
    return null;
  }
  if (el && hit) {
    const isPinnedSame = isSameSceneHoverTarget(clientState.pinnedTooltipTarget, hit.target);
    const nextHtml = isPinnedSame ? renderSceneTooltipHtml(vm) : renderSceneHoverTitleHtml(vm);
    if (el.innerHTML !== nextHtml) el.innerHTML = nextHtml;
    const cw = clientState.chamberWidth || 800;
    const wildsW = clientState.wildsWidth || cw;
    const effFocus = resolveEffectiveChamberFocus(
      clientState.cameraFocusMode,
      getEffectiveViewportWidth(),
      typeof window !== "undefined" ? window.innerHeight : 800,
      hasHeroFightingMonster(),
    );
    const worldW = effFocus === "workshop" ? cw : cw + wildsW;
    el.style.left = `${Math.min(72, Math.max(2, ((hit.x + hit.w * 0.5) / worldW) * 100)).toFixed(1)}%`;
    el.style.top = `${Math.min(76, Math.max(3, (hit.y / 720) * 100)).toFixed(1)}%`;
    el.style.display = "block";
    el.classList?.add("visible");
  }
  return vm;
}

export function handleScenePointerClick(worldX: number, worldY: number, onStateChanged: () => void, modalEl?: HTMLElement | null, isCoarsePointer = false): SceneHitboxSpec | null {
  const slop = isCoarsePointer ? 14 / Math.max(0.35, clientState.cameraZoom) : 0;
  const hit = hitTestActiveScene(worldX, worldY, slop);
  if (hit?.target.kind === "demolition-bomb") {
    openDemolitionModal(hit.target.roomId || hit.roomId, modalEl);
    onStateChanged();
    return hit;
  }
  const hitCharId = hit?.target.kind === "character" ? hit.target.sessionId : findHitCharacter(worldX, worldY, slop);
  if (hitCharId) {
    clientState.pinnedTooltipTarget = null;
    reconcileMobileDrawerSelection(hitCharId, clientState.selectedSessionId);
    onStateChanged();
    return hit;
  }
  if (hit) {
    if (hit.target.kind === "goal-assembly-socket" && hit.target.projectId && clientState.isAllWorldsFocused) selectCommitRepository(hit.target.projectId);
    clientState.pinnedTooltipTarget = hit.target;
    handleScenePointerHover(worldX, worldY, undefined, slop);
    onStateChanged();
    return hit;
  }
  clientState.pinnedTooltipTarget = null;
  const tipEl = typeof document !== "undefined" ? document.getElementById("alcove-tooltip") : null;
  if (tipEl) { tipEl.style.display = "none"; tipEl.classList?.remove("visible"); }
  if (clientState.selectedSessionId !== null || clientState.mobileDrawerState !== "collapsed") {
    reconcileMobileDrawerSelection(null, clientState.selectedSessionId);
    onStateChanged();
  }
  return null;
}

function bindOverlayAndDrawerControls(canvas: HTMLCanvasElement, onStateChanged: () => void): void {
  for (const mode of ["auto", "workshop", "wilds", "split"] as ChamberFocusMode[]) {
    document.getElementById(`btn-focus-${mode}`)?.addEventListener("click", () => {
      clientState.isWorldCollapsed = false; clientState.cameraFocusMode = mode;
      if (typeof window !== "undefined" && window.innerWidth <= MOBILE_BREAKPOINT_PX) clientState.mobileDrawerState = "collapsed";
      syncViewportCameraFit(canvas, true); onStateChanged();
    });
  }
  document.getElementById("btn-hide-world")?.addEventListener("click", () => {
    clientState.isWorldCollapsed = !clientState.isWorldCollapsed;
    if (clientState.isWorldCollapsed) clientState.isGamemasterCollapsed = false;
    onStateChanged();
  });
  document.getElementById("btn-toggle-gamemaster")?.addEventListener("click", () => {
    clientState.isGamemasterCollapsed = !clientState.isGamemasterCollapsed;
    if (clientState.isGamemasterCollapsed) clientState.isWorldCollapsed = false;
    syncViewportCameraFit(canvas, true); onStateChanged();
  });
  document.getElementById("btn-restore-gamemaster")?.addEventListener("click", () => {
    clientState.isGamemasterCollapsed = false; syncViewportCameraFit(canvas, true); onStateChanged();
  });
  document.getElementById("drawer-tab-world")?.addEventListener("click", () => {
    clientState.isWorldCollapsed = false; clientState.mobileDrawerState = "collapsed";
    syncViewportCameraFit(canvas, true); onStateChanged();
  });
  document.getElementById("ticker-header-toggle")?.addEventListener("click", () => {
    if (clientState.mobileActiveTab !== "ticker") { clientState.isTickerCollapsed = !clientState.isTickerCollapsed; onStateChanged(); }
  });
  const zoomBy = (delta: number) =>
    applyCameraTransform(zoomCameraAtFocalPoint(getCamera(), clientState.cameraZoom + delta, canvas.width / 2, canvas.height / 2, canvas.width, canvas.height));
  document.getElementById("btn-zoom-in")?.addEventListener("click", () => zoomBy(0.2));
  document.getElementById("btn-zoom-out")?.addEventListener("click", () => zoomBy(-0.2));
  document.getElementById("btn-reset-camera")?.addEventListener("click", () => syncViewportCameraFit(canvas, true));

  for (const tab of ["ledger", "character", "ticker"] as SpectatorDrawerTab[]) {
    document.getElementById(`drawer-tab-${tab}`)?.addEventListener("click", () => {
      clientState.mobileActiveTab = tab;
      if (tab === "character" && !clientState.selectedSessionId) {
        const firstId = getScopedGameMasterCharacters()[0]?.sessionId ?? null;
        if (firstId) clientState.selectedSessionId = firstId;
      }
      if (clientState.mobileDrawerState === "collapsed") clientState.mobileDrawerState = "expanded";
      onStateChanged();
    });
  }

  document.getElementById("drawer-handle-btn")?.addEventListener("click", () => {
    const order: SpectatorDrawerState[] = ["collapsed", "peek", "expanded"];
    clientState.mobileDrawerState = order[(order.indexOf(clientState.mobileDrawerState) + 1) % order.length];
    onStateChanged();
  });
}

export function initPointerAndCameraControls(canvas: HTMLCanvasElement, onStateChanged: () => void): void {
  const gestureState = createCanvasGestureState();
  let wheelGestureTimer: ReturnType<typeof setTimeout> | null = null;
  syncViewportCameraFit(canvas, true);
  window.addEventListener("resize", () => syncViewportCameraFit(canvas, true));
  if (typeof ResizeObserver !== "undefined" && canvas.parentElement) {
    new ResizeObserver(() => syncViewportCameraFit(canvas, true)).observe(canvas.parentElement);
  }
  window.visualViewport?.addEventListener("resize", () => {
    const vv = window.visualViewport!;
    document.documentElement.style.setProperty("--keyboard-inset-height", `${Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))}px`);
  });
  bindOverlayAndDrawerControls(canvas, onStateChanged);
  initDesktopLayoutResizer(canvas, onStateChanged, () => syncViewportCameraFit(canvas, true));

  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture?.(e.pointerId);
    const { canvasX, canvasY } = getWorldCoords(canvas, e.clientX, e.clientY);
    stepPointerDown(
      gestureState,
      { pointerId: e.pointerId, clientX: canvasX, clientY: canvasY, pointerType: e.pointerType, timestampMs: e.timeStamp },
      getCamera(),
    );
    clientState.cameraGestureActive = gestureState.activePointers.size > 0;
  });

  canvas.addEventListener("pointermove", (e) => {
    if (gestureState.activePointers.size > 0) {
      clientState.cameraGestureActive = true;
      const { canvasX, canvasY } = getWorldCoords(canvas, e.clientX, e.clientY);
      const stepped = stepPointerMove(gestureState, { pointerId: e.pointerId, clientX: canvasX, clientY: canvasY, pointerType: e.pointerType }, getCamera(), canvas.width, canvas.height);
      if (stepped.kind === "pan" || stepped.kind === "pinch") {
        canvas.classList.add("dragging");
        applyCameraTransform(stepped.camera);
      }
      return;
    }
    if (e.pointerType === "mouse") {
      const { worldX, worldY } = getWorldCoords(canvas, e.clientX, e.clientY);
      canvas.classList.toggle("hovering-actor", Boolean(hitTestActiveScene(worldX, worldY)));
      handleScenePointerHover(worldX, worldY);
    }
  });

  const onPointerEnd = (e: PointerEvent) => {
    canvas.classList.remove("dragging");
    const res = stepPointerUp(gestureState, { pointerId: e.pointerId, clientX: e.clientX, clientY: e.clientY, pointerType: e.pointerType, timestampMs: e.timeStamp }, getCamera());
    if (gestureState.activePointers.size === 0) clientState.cameraGestureActive = false;
    if (res.kind === "tap") {
      const { worldX, worldY } = getWorldCoords(canvas, e.clientX, e.clientY);
      const slop = res.isCoarsePointer ? 14 / Math.max(0.35, clientState.cameraZoom) : 0;
      if (res.isDoubleTap && !hitTestActiveScene(worldX, worldY, slop)) {
        syncViewportCameraFit(canvas, true);
        return;
      }
      handleScenePointerClick(worldX, worldY, onStateChanged, undefined, res.isCoarsePointer);
    }
  };
  canvas.addEventListener("pointerup", onPointerEnd);
  canvas.addEventListener("pointercancel", onPointerEnd);
  canvas.addEventListener("mouseleave", () => {
    canvas.classList.remove("hovering-actor");
    if (!clientState.pinnedTooltipTarget) {
      const el = document.getElementById("alcove-tooltip");
      if (el) { el.style.display = "none"; el.classList.remove("visible"); }
    }
  });

  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    clientState.cameraGestureActive = true;
    if (wheelGestureTimer) clearTimeout(wheelGestureTimer);
    wheelGestureTimer = setTimeout(() => {
      wheelGestureTimer = null;
      if (gestureState.activePointers.size === 0) clientState.cameraGestureActive = false;
    }, 120);
    const { canvasX, canvasY } = getWorldCoords(canvas, e.clientX, e.clientY);
    applyCameraTransform(stepWheelZoom(getCamera(), e.deltaY, canvasX, canvasY, canvas.width, canvas.height));
  }, { passive: false });

  (document.getElementById("btn-cancel-demolish-room") ?? document.getElementById("demolition-cancel-btn"))
    ?.addEventListener("click", () => closeDemolitionModal());
  (document.getElementById("btn-confirm-demolish-room") ?? document.getElementById("demolition-confirm-btn"))
    ?.addEventListener("click", () => void confirmDemolishRoom(fetch, onStateChanged));

  window.addEventListener("keydown", (e) => {
    const activeTag = (document.activeElement as HTMLElement | null)?.tagName?.toLowerCase();
    const isInputFocused = activeTag === "input" || activeTag === "textarea" || activeTag === "select";
    if (e.key === "/" && !isInputFocused && clientState.selectedSessionId && clientState.mobileActiveTab === "character") {
      e.preventDefault(); clientState.heroSubtab = "chat"; clientState.isCommandScrollExpanded = true;
      onStateChanged(); (document.getElementById("command-scroll-input") as HTMLTextAreaElement | null)?.focus();
      return;
    }
    if (e.key === "Escape") {
      if (clientState.pendingDemolishRoomId !== null) { closeDemolitionModal(); return; }
      if (clientState.isCommandScrollExpanded) {
        clientState.isCommandScrollExpanded = false; (document.activeElement as HTMLElement | null)?.blur?.();
        onStateChanged(); return;
      }
      if (clientState.selectedSessionId !== null || clientState.mobileDrawerState !== "collapsed") {
        reconcileMobileDrawerSelection(null, clientState.selectedSessionId); onStateChanged();
      }
    }
  });
}
