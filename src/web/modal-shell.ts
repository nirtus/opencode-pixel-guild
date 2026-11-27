export type ModalSizeVariant = "compact" | "wide";

export interface ModalRegistration {
  id: string;
  element: HTMLElement;
  dismissible?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  size?: ModalSizeVariant;
  onRequestClose?: () => void;
}

interface ManagedModalEntry {
  id: string;
  element: HTMLElement;
  dismissible: boolean;
  closeOnBackdrop: boolean;
  closeOnEscape: boolean;
  size: ModalSizeVariant;
  onRequestClose?: () => void;
  previousFocus: HTMLElement | null;
}

const registeredModals = new Map<string, ManagedModalEntry>();
const openModalStack: string[] = [];
let globalEscapeBound = false;

function getDialogEl(overlay: HTMLElement): HTMLElement | null {
  return overlay.querySelector?.(".modal-dialog") as HTMLElement | null;
}

function applySizeAttribute(overlay: HTMLElement, size: ModalSizeVariant): void {
  overlay.setAttribute?.("data-modal-size", size);
  getDialogEl(overlay)?.setAttribute?.("data-modal-size", size);
}

function bindGlobalEscapeListener(): void {
  if (globalEscapeBound || typeof window === "undefined" || typeof window.addEventListener !== "function") {
    return;
  }
  globalEscapeBound = true;
  window.addEventListener("keydown", (ev: KeyboardEvent) => {
    if (ev.key !== "Escape") return;
    if (handleModalEscapeKey()) {
      ev.preventDefault();
    }
  });
}

export function syncViewportGeometryCssVars(effectiveWidth?: number): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const rootStyle = document.documentElement?.style;
  if (!rootStyle || typeof rootStyle.setProperty !== "function") return;
  const vv = window.visualViewport;
  const rawW = vv?.width && vv.width > 0 ? vv.width : window.innerWidth;
  const visW =
    typeof effectiveWidth === "number" && effectiveWidth > 0
      ? Math.min(rawW, effectiveWidth)
      : rawW;
  const visH = vv?.height && vv.height > 0 ? vv.height : window.innerHeight;
  const kbInset = vv
    ? Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))
    : 0;
  if (visW > 0) rootStyle.setProperty("--viewport-visible-width", `${Math.round(visW)}px`);
  if (visH > 0) rootStyle.setProperty("--viewport-visible-height", `${Math.round(visH)}px`);
  rootStyle.setProperty("--keyboard-inset-height", `${kbInset}px`);
}

export function registerModal(config: ModalRegistration): void {
  const { id, element } = config;
  const existing = registeredModals.get(id);
  const entry: ManagedModalEntry = {
    id,
    element,
    dismissible: config.dismissible ?? true,
    closeOnBackdrop: config.closeOnBackdrop ?? false,
    closeOnEscape: config.closeOnEscape ?? false,
    size: config.size ?? "compact",
    onRequestClose: config.onRequestClose ?? existing?.onRequestClose,
    previousFocus: existing?.previousFocus ?? null,
  };
  registeredModals.set(id, entry);

  element.setAttribute?.("role", "dialog");
  element.setAttribute?.("aria-modal", "true");
  applySizeAttribute(element, entry.size);

  if (
    typeof element.addEventListener === "function" &&
    element.getAttribute?.("data-modal-shell-bound") !== "true"
  ) {
    element.setAttribute?.("data-modal-shell-bound", "true");
    element.addEventListener("click", (ev: Event) => {
      if (ev.target !== element) return;
      const current = registeredModals.get(id);
      if (!current || !current.dismissible || !current.closeOnBackdrop) return;
      if (current.onRequestClose) current.onRequestClose();
      else closeModal(id);
    });
  }
  bindGlobalEscapeListener();
}

export function setModalDismissible(id: string, dismissible: boolean): void {
  const entry = registeredModals.get(id);
  if (entry) entry.dismissible = dismissible;
}

export function setModalSize(id: string, size: ModalSizeVariant): void {
  const entry = registeredModals.get(id);
  if (!entry) return;
  entry.size = size;
  applySizeAttribute(entry.element, size);
}

export function openModal(
  id: string,
  options?: { dismissible?: boolean; size?: ModalSizeVariant },
): void {
  const entry = registeredModals.get(id);
  if (!entry) return;
  if (typeof options?.dismissible === "boolean") entry.dismissible = options.dismissible;
  if (options?.size) {
    entry.size = options.size;
    applySizeAttribute(entry.element, options.size);
  }
  syncViewportGeometryCssVars();
  const existingIdx = openModalStack.indexOf(id);
  if (existingIdx < 0) {
    const active = typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null;
    entry.previousFocus = active && !entry.element.contains?.(active) ? active : null;
    openModalStack.push(id);
  } else {
    openModalStack.splice(existingIdx, 1);
    openModalStack.push(id);
  }
  if (entry.element.style) entry.element.style.display = "";
  entry.element.classList?.add("is-open");
}

export function closeModal(id: string): void {
  const entry = registeredModals.get(id);
  const idx = openModalStack.indexOf(id);
  if (idx >= 0) openModalStack.splice(idx, 1);
  if (!entry) return;
  entry.element.classList?.remove("is-open");
  if (entry.element.style) entry.element.style.display = "";
  const restoreTarget = entry.previousFocus;
  entry.previousFocus = null;
  if (
    openModalStack.length === 0 &&
    restoreTarget &&
    typeof restoreTarget.focus === "function" &&
    (typeof document === "undefined" || !document.body || document.body.contains?.(restoreTarget))
  ) {
    try { restoreTarget.focus(); } catch { /* ignore */ }
  }
}

export function isModalOpen(id: string): boolean {
  return openModalStack.includes(id);
}

export function hasOpenModal(): boolean {
  return openModalStack.length > 0;
}

export function handleModalEscapeKey(): boolean {
  if (openModalStack.length === 0) return false;
  const topId = openModalStack[openModalStack.length - 1];
  const entry = registeredModals.get(topId);
  if (!entry) {
    openModalStack.pop();
    return false;
  }
  if (!entry.dismissible || !entry.closeOnEscape) {
    return true;
  }
  if (entry.onRequestClose) entry.onRequestClose();
  else closeModal(topId);
  return true;
}

export function resetModalShellForTests(): void {
  registeredModals.clear();
  openModalStack.length = 0;
}
