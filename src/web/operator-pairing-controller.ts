import { formatPublicSafeEndpoint } from "../hud/index.ts";
import { normalizeQrPayloadToPairingUrl } from "../ingress/qr-matrix-decoder.ts";
import { clientState } from "./client-state.ts";
import { clearCachedGitState } from "./commit-ledger-controller.ts";
import { closeModal, openModal, registerModal, setModalDismissible, setModalSize } from "./modal-shell.ts";
import { isOfflineDemoModeActive } from "./offline-demo-flag.ts";
import {
  type OperatorModalAction, type OperatorModalTab, type OperatorPairingMode,
  renderOperatorModalWindowHtml, resolveOperatorModalMeta,
} from "./operator-modal-views.ts";
import {
  applyOperatorPreferencesToClientState, bumpOperatorProfileMutationEpoch, type ClientOperatorProfile,
  getCachedOperatorProfile, getOperatorHeaders, refreshCachedOperatorProfile,
  setCachedOperatorProfile, setSavedOperatorId,
} from "./operator-session-store.ts";
import { decodeQrFromImageBlob, startCameraQrScanner, stopActiveQrCameraStream } from "./qr-barcode-scanner.ts";
import { resetSidePanelSignatures } from "./side-panel-reconciler.ts";
import {
  applyAuthoritativeSnapshot, resetAuthoritativeSnapshotGate,
  setExpectedMachineDaemonUrl, setPendingOperatorAction,
} from "./snapshot-gate.ts";
import {
  getBrowserStorage, readSavedUiWindowState, syncProjectUrlQueryParam,
  UI_WINDOW_STATE_STORAGE_KEY, writeSavedProjectId, writeSavedUiWindowState,
} from "./world-persistence.ts";

export type { OperatorModalAction, OperatorModalTab, OperatorPairingMode };

const OPERATOR_MODAL_ID = "operator-pairing-modal";

let pairingModalEl: HTMLElement | null = null;
let activeModalTab: OperatorModalTab = "machines";
let activePairingMode: OperatorPairingMode = "link-qr";
let statusMessageText = "";
let isAuthLocked = false;

function syncAuthLockDom(): void {
  clientState.isAuthenticated = !isAuthLocked;
  setModalDismissible(OPERATOR_MODAL_ID, !isAuthLocked);
  if (typeof document === "undefined") return;
  document.body?.setAttribute("data-auth-locked", isAuthLocked ? "true" : "false");
  pairingModalEl?.querySelector("#btn-close-pairing-modal")?.classList.toggle("is-hidden", isAuthLocked);
}

export function closeOperatorPairingModal(): void {
  if (isAuthLocked) return;
  stopActiveQrCameraStream();
  closeModal(OPERATOR_MODAL_ID);
  pairingModalEl?.classList.remove("is-open");
}

function resetClientWorldViewState(clearSelection = false): void {
  clientState.characterWalkers.clear();
  clientState.activeSummoningRituals.clear();
  clientState.knownSessionIds.clear();
  clientState.lanternFlares.length = 0;
  clientState.tickerLog.length = 0;
  clearCachedGitState();
  resetSidePanelSignatures();
  if (!clearSelection) return;
  resetAuthoritativeSnapshotGate({ preservePendingAction: true });
  clientState.isAllWorldsFocused = true;
  clientState.selectedProjectId = clientState.selectedRoomId = clientState.selectedSessionId = null;
  clientState.cameraFocusMode = "auto";
  writeSavedProjectId(null);
  writeSavedUiWindowState({ selectedProjectId: null, selectedRoomId: null, selectedSessionId: null, cameraFocusMode: "auto" });
  syncProjectUrlQueryParam(null);
}

async function refreshSnapshotAndRender(
  modal: HTMLElement | null,
  onStateChanged: () => void,
  fetchImpl?: typeof fetch,
  opts?: { inlineSnapshot?: unknown; preserveEventStream?: boolean },
): Promise<void> {
  if (opts?.inlineSnapshot && typeof opts.inlineSnapshot === "object") {
    applyAuthoritativeSnapshot(opts.inlineSnapshot as typeof clientState.currentSnapshot, { allowVersionReset: true });
  } else {
    const fn = fetchImpl ?? (typeof fetch === "function" ? fetch : undefined);
    if (fn) {
      try {
        const snapRes = await fn("/api/guild/snapshot", { headers: getOperatorHeaders() });
        if (snapRes.ok) applyAuthoritativeSnapshot(await snapRes.json(), { allowVersionReset: true });
      } catch { /* ignore */ }
    }
  }
  resetSidePanelSignatures();
  syncAuthLockDom();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(opts?.preserveEventStream ? "guild-machine-changed" : "guild-operator-changed"));
  }
  if (modal) mountModalInnerDom(modal, onStateChanged);
  onStateChanged();
}

function extractScopedFields(root: ParentNode, scopeName?: string | null): Record<string, string> {
  const scopeEl = scopeName ? (root.querySelector(`[data-operator-scope="${scopeName}"]`) ?? root) : root;
  const values: Record<string, string> = {};
  if (typeof FormData !== "undefined" && typeof HTMLFormElement !== "undefined" && scopeEl instanceof HTMLFormElement) {
    for (const [key, val] of new FormData(scopeEl).entries()) if (typeof val === "string") values[key] = val;
    return values;
  }
  for (const el of scopeEl.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input[name], textarea[name], select[name]")) {
    const key = el.getAttribute("name");
    if (key) values[key] = el.value ?? "";
  }
  return values;
}

export async function dispatchOperatorModalAction(
  action: OperatorModalAction,
  fields: Record<string, string>,
  onStateChanged: () => void,
  modal: HTMLElement | null = pairingModalEl,
  fetchImpl?: typeof fetch,
): Promise<void> {
  const fn = fetchImpl ?? fetch;
  if (action === "switch-tab") {
    const nextTab = fields.window as OperatorModalTab | undefined;
    if (nextTab) { activeModalTab = nextTab; statusMessageText = ""; if (modal) mountModalInnerDom(modal, onStateChanged); }
    return;
  }
  if (action === "switch-pairing-mode") {
    const nextMode = fields.pairingMode as OperatorPairingMode | undefined;
    if (nextMode === "link-qr" || nextMode === "manual") {
      activePairingMode = nextMode; statusMessageText = "";
      if (modal) mountModalInnerDom(modal, onStateChanged);
    }
    return;
  }

  bumpOperatorProfileMutationEpoch();
  setPendingOperatorAction(fields.machineId ? `${action}:${fields.machineId}` : action);
  if (action === "activate-machine") {
    setExpectedMachineDaemonUrl(getCachedOperatorProfile()?.pairedMachines?.find((m) => m.machineId === fields.machineId)?.daemonUrl ?? null);
    onStateChanged();
  } else if (action === "pair-machine" || action === "pair-local-machine") {
    setExpectedMachineDaemonUrl(null);
    onStateChanged();
  }

  try {
    if (action === "login" || action === "register") {
      const endpoint = action === "login" ? "/api/guild/auth/login" : "/api/guild/auth/register";
      const body = action === "login"
        ? { username: (fields.username || "").trim(), password: fields.password || "" }
        : { username: (fields.username || "").trim(), password: fields.password || "", label: (fields.label || "").trim() };
      const res = await fn(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await res.json();
      bumpOperatorProfileMutationEpoch();
      if (res.ok && payload?.operatorId) {
        setCachedOperatorProfile(payload); isAuthLocked = false; clientState.authBootCompleted = true;
        setSavedOperatorId(payload.operatorId); resetClientWorldViewState(true);
        applyOperatorPreferencesToClientState(payload.preferences, { searchString: "" });
        const alias = payload.label && payload.label !== "Guild Operator" ? payload.label : payload.username;
        statusMessageText = action === "login" ? `✅ Signed in as ${alias}` : `✅ Account '${alias}' created — pair your OpenCode machine below`;
        activeModalTab = (payload.pairedMachines?.length ?? 0) > 0 ? "profile" : "machines";
        await refreshSnapshotAndRender(modal, onStateChanged, fn);
        if (action === "login" && (payload.pairedMachines?.length ?? 0) > 0) { closeOperatorPairingModal(); modal?.classList.remove("is-open"); }
      } else {
        statusMessageText = `⚠️ ${payload?.error || (action === "login" ? "Login failed" : "Registration failed")}`;
        if (modal) mountModalInnerDom(modal, onStateChanged);
      }
      return;
    }

    if (action === "pair-machine" || action === "pair-local-machine") {
      const discoverLocal = action === "pair-local-machine";
      const label = (fields.label || "").trim() || (discoverLocal ? "Local OpenCode" : "OpenCode Machine");
      const rawBoxVal = (fields.daemonUrl || "").trim();
      const daemonUrl = normalizeQrPayloadToPairingUrl(rawBoxVal) ?? rawBoxVal;
      const daemonPassword = (fields.daemonPassword || "").trim() || undefined;
      const res = await fn("/api/guild/users/me/machines", {
        method: "POST", headers: getOperatorHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ label, daemonUrl, daemonPassword, discoverLocal, activate: true }),
      });
      const payload = await res.json();
      bumpOperatorProfileMutationEpoch();
      if (res.ok && payload?.operatorId) {
        const { snapshot: inlineSnapshot, ...profileOnly } = payload;
        setCachedOperatorProfile(profileOnly); isAuthLocked = false; setSavedOperatorId(profileOnly.operatorId);
        if (profileOnly.daemonUrl) setExpectedMachineDaemonUrl(profileOnly.daemonUrl);
        resetClientWorldViewState(true);
        statusMessageText = `✅ Paired '${label}' (${formatPublicSafeEndpoint(profileOnly.daemonUrl || daemonUrl.replace(/\/auth\/connect\/.*/, ""))})`;
        await refreshSnapshotAndRender(modal, onStateChanged, fn, { inlineSnapshot, preserveEventStream: true });
      } else { statusMessageText = `⚠️ ${payload?.error || "Failed to pair machine"}`; if (modal) mountModalInnerDom(modal, onStateChanged); }
      return;
    }

    if ((action === "activate-machine" || action === "delete-machine") && fields.machineId) {
      const isActivate = action === "activate-machine";
      const res = await fn(`/api/guild/users/me/machines/${encodeURIComponent(fields.machineId)}`, {
        method: isActivate ? "PATCH" : "DELETE",
        headers: getOperatorHeaders(isActivate ? { "Content-Type": "application/json" } : {}),
        ...(isActivate ? { body: JSON.stringify({ activate: true }) } : {}),
      });
      const payload = await res.json();
      bumpOperatorProfileMutationEpoch();
      if (res.ok) {
        const { snapshot: inlineSnapshot, ...profileOnly } = payload;
        setCachedOperatorProfile(profileOnly);
        if (isActivate && profileOnly?.daemonUrl) setExpectedMachineDaemonUrl(profileOnly.daemonUrl);
        resetClientWorldViewState(true);
        statusMessageText = isActivate ? "✅ Switched active OpenCode machine" : "🗑 Removed OpenCode machine pairing";
        await refreshSnapshotAndRender(modal, onStateChanged, fn, { inlineSnapshot, preserveEventStream: true });
      } else { statusMessageText = `⚠️ ${payload?.error || "Failed to update machine"}`; if (modal) mountModalInnerDom(modal, onStateChanged); }
      return;
    }

    if (action === "save-profile") {
      const username = (fields.username || "").trim(), label = (fields.label || "").trim(), password = (fields.password || "").trim();
      const res = await fn("/api/guild/users/me", {
        method: "PATCH", headers: getOperatorHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ username, label, ...(password ? { password } : {}) }),
      });
      const payload = await res.json();
      bumpOperatorProfileMutationEpoch();
      if (res.ok) { setCachedOperatorProfile(payload); statusMessageText = "✅ Profile settings saved"; await refreshSnapshotAndRender(modal, onStateChanged, fn); }
      else { statusMessageText = `⚠️ ${payload?.error || "Failed to save profile"}`; if (modal) mountModalInnerDom(modal, onStateChanged); }
      return;
    }

    if (action === "logout" || action === "delete-account") {
      if (action === "logout") { await fn("/api/guild/auth/logout", { method: "POST" }); statusMessageText = "Signed out — sign in or register to access your workspace"; }
      else { await fn("/api/guild/users/me", { method: "DELETE", headers: getOperatorHeaders() }); statusMessageText = "🗑 Account deleted"; }
      bumpOperatorProfileMutationEpoch();
      setSavedOperatorId(null); getBrowserStorage()?.removeItem?.(UI_WINDOW_STATE_STORAGE_KEY);
      setCachedOperatorProfile(null); isAuthLocked = true; activeModalTab = "login";
      resetClientWorldViewState(true);
      applyAuthoritativeSnapshot({
        ...clientState.currentSnapshot, daemonUrl: null, roomOrder: [], rooms: {}, characters: {}, questGates: {},
        summary: { totalRooms: 0, activeAdventurers: 0, activeSubagents: 0, openQuestGates: 0, equippedGrimoires: 0, connectedPlugins: 0 },
      }, { allowVersionReset: true });
      await refreshSnapshotAndRender(modal, onStateChanged, fn);
    }
  } finally {
    setPendingOperatorAction(null);
  }
}

async function handleDecodedQrImage(blob: Blob, scopeRoot: ParentNode, modal: HTMLElement, onStateChanged: () => void, prefix: string): Promise<void> {
  const decoded = await decodeQrFromImageBlob(blob);
  if (decoded) {
    statusMessageText = `${prefix}: ${decoded}`;
    await dispatchOperatorModalAction("pair-machine", { ...extractScopedFields(scopeRoot, "machine"), daemonUrl: decoded }, onStateChanged, modal);
  } else {
    statusMessageText = "⚠️ Could not detect a valid QR barcode in that image — paste the pairing link or terminal QR code directly.";
    mountModalInnerDom(modal, onStateChanged);
  }
}

function mountModalInnerDom(modal: HTMLElement, onStateChanged: () => void): void {
  stopActiveQrCameraStream();
  syncAuthLockDom();
  const meta = resolveOperatorModalMeta(activeModalTab, isAuthLocked);
  setModalSize(OPERATOR_MODAL_ID, meta.size);
  const titleEl = modal.querySelector("#operator-modal-title");
  if (titleEl) titleEl.textContent = meta.title;
  const bodySlot = modal.querySelector("#operator-modal-body-slot") as HTMLElement | null;
  if (!bodySlot) return;
  bodySlot.innerHTML = renderOperatorModalWindowHtml(getCachedOperatorProfile(), activeModalTab, statusMessageText, isAuthLocked, activePairingMode);

  const qrFileInput = bodySlot.querySelector<HTMLInputElement>("input[type='file'][name='qrImageFile']");
  qrFileInput?.addEventListener("change", () => {
    const file = qrFileInput.files?.[0];
    if (file) void handleDecodedQrImage(file, bodySlot, modal, onStateChanged, "🖼️ Decoded QR code");
  });

  bodySlot.onsubmit = (ev: SubmitEvent) => {
    ev.preventDefault();
    const form = (ev.target as HTMLElement | null)?.closest<HTMLFormElement>("form[data-operator-form-action]");
    const formAction = form?.getAttribute("data-operator-form-action") as OperatorModalAction | null;
    if (form && formAction) void dispatchOperatorModalAction(formAction, extractScopedFields(bodySlot, form.getAttribute("data-operator-scope")), onStateChanged, modal);
  };

  bodySlot.onclick = (ev: MouseEvent) => {
    const target = (ev.target as HTMLElement | null)?.closest<HTMLElement>("[data-operator-action]");
    const action = target?.getAttribute("data-operator-action") as OperatorModalAction | null;
    if (!target || !action) return;
    ev.preventDefault();
    if (action === "scan-qr-camera") {
      const previewSlot = bodySlot.querySelector("#qr-camera-preview-slot") as HTMLElement | null;
      if (previewSlot) {
        void startCameraQrScanner(
          previewSlot,
          (decodedUrl) => {
            statusMessageText = `📷 Scanned QR link: ${decodedUrl}`;
            void dispatchOperatorModalAction("pair-machine", { ...extractScopedFields(bodySlot, "machine"), daemonUrl: decodedUrl }, onStateChanged, modal);
          },
          (msg) => { statusMessageText = msg; mountModalInnerDom(modal, onStateChanged); },
        );
      }
      return;
    }
    if (action === "upload-qr-image") { qrFileInput?.click(); return; }
    const scopedFields = extractScopedFields(bodySlot, target.getAttribute("data-operator-scope-target"));
    void dispatchOperatorModalAction(
      action,
      { ...scopedFields, window: target.getAttribute("data-operator-window") || "", pairingMode: target.getAttribute("data-pairing-mode") || "", machineId: target.getAttribute("data-machine-activate") || target.getAttribute("data-machine-delete") || "" },
      onStateChanged,
      modal,
    );
  };
}

function ensureOperatorPairingModal(onStateChanged: () => void): HTMLElement {
  if (pairingModalEl) return pairingModalEl;
  const modal = document.createElement("div");
  modal.id = OPERATOR_MODAL_ID;
  modal.className = "modal-overlay";
  modal.innerHTML = `<div class="modal-dialog modal-dialog-summon"><div class="modal-header-row"><div id="operator-modal-title" class="modal-title-summon">🔗 OpenCode Machine Pairing</div><button type="button" class="btn modal-close-btn" id="btn-close-pairing-modal" aria-label="Close Modal">✕</button></div><div id="operator-modal-body-slot" class="modal-body"></div></div>`;
  document.body.appendChild(modal);
  pairingModalEl = modal;
  registerModal({ id: OPERATOR_MODAL_ID, element: modal, dismissible: !isAuthLocked, size: resolveOperatorModalMeta(activeModalTab, isAuthLocked).size, onRequestClose: () => closeOperatorPairingModal() });
  modal.querySelector("#btn-close-pairing-modal")?.addEventListener("click", () => closeOperatorPairingModal());
  modal.addEventListener("paste", (ev: ClipboardEvent) => {
    for (const item of ev.clipboardData?.items ?? []) {
      if (!item.type.startsWith("image/")) continue;
      const blob = item.getAsFile();
      if (blob) { ev.preventDefault(); void handleDecodedQrImage(blob, modal, modal, onStateChanged, "📋 Pasted QR code image decoded"); return; }
    }
  });
  return modal;
}

export async function refreshLiveGuildAndOperatorProfile(onStateChanged: () => void, fetchImpl?: typeof fetch): Promise<{ snapshot?: unknown; profile: ClientOperatorProfile | null }> {
  const fn = fetchImpl ?? (typeof fetch === "function" ? fetch : undefined);
  if (!fn) return { profile: getCachedOperatorProfile() };
  let snapshot: unknown;
  try {
    const signal = typeof AbortSignal?.timeout === "function" ? AbortSignal.timeout(8000) : undefined;
    const res = await fn("/api/guild/refresh", { method: "POST", headers: getOperatorHeaders(), signal });
    if (res.ok) {
      const payload = (await res.json()) as { snapshot?: unknown };
      if (payload?.snapshot) { snapshot = payload.snapshot; applyAuthoritativeSnapshot(payload.snapshot as typeof clientState.currentSnapshot); }
    }
  } catch { /* ignore */ }
  const profile = await refreshCachedOperatorProfile(fn);
  onStateChanged();
  return { snapshot, profile };
}

export async function syncOperatorAuthGate(onStateChanged: () => void): Promise<boolean> {
  if (typeof document === "undefined" || typeof fetch !== "function") { clientState.authBootCompleted = true; return true; }
  const requestedModal = typeof window !== "undefined" ? new URLSearchParams(window.location?.search || "").get("modal") : null;
  try {
    const profile = await refreshCachedOperatorProfile();
    if (profile) {
      if (profile.authenticated === false) {
        isAuthLocked = true; resetClientWorldViewState(false); clientState.authBootCompleted = true;
        activeModalTab = requestedModal === "register" ? "register" : "login";
        const modal = ensureOperatorPairingModal(onStateChanged);
        openModal(OPERATOR_MODAL_ID, { dismissible: false, size: "compact" });
        mountModalInnerDom(modal, onStateChanged);
        onStateChanged(); return false;
      }
      isAuthLocked = false;
      if (profile.operatorId) setSavedOperatorId(profile.operatorId);
      const localSaved = readSavedUiWindowState() ?? {};
      const mergedPrefs = { ...(profile.preferences ?? {}), ...localSaved };
      if (clientState.selectedSessionId) mergedPrefs.selectedSessionId = clientState.selectedSessionId;
      applyOperatorPreferencesToClientState(mergedPrefs);
      clientState.authBootCompleted = true; syncAuthLockDom(); onStateChanged();
      if (requestedModal === "profile" || requestedModal === "machines" || (profile.pairedMachines?.length ?? 0) === 0) {
        activeModalTab = requestedModal === "profile" ? "profile" : "machines";
        const modal = ensureOperatorPairingModal(onStateChanged);
        openModal(OPERATOR_MODAL_ID, { dismissible: true, size: resolveOperatorModalMeta(activeModalTab, false).size });
        mountModalInnerDom(modal, onStateChanged);
      }
    }
  } catch { /* ignore */ }
  clientState.authBootCompleted = true;
  return true;
}

export function openSyntheticOperatorModal(tab: OperatorModalTab, authLocked: boolean, onStateChanged: () => void): void {
  if (typeof document === "undefined") return;
  isAuthLocked = authLocked; activeModalTab = tab; statusMessageText = "";
  const modal = ensureOperatorPairingModal(onStateChanged); syncAuthLockDom();
  openModal(OPERATOR_MODAL_ID, { dismissible: !isAuthLocked, size: resolveOperatorModalMeta(activeModalTab, isAuthLocked).size });
  mountModalInnerDom(modal, onStateChanged);
}
export async function openOperatorPairingModal(onStateChanged: () => void, initialTab: OperatorModalTab = "machines"): Promise<void> {
  if (typeof document === "undefined") return;
  activeModalTab = initialTab; statusMessageText = "";
  const modal = ensureOperatorPairingModal(onStateChanged);
  openModal(OPERATOR_MODAL_ID, { dismissible: !isAuthLocked, size: resolveOperatorModalMeta(activeModalTab, isAuthLocked).size });
  const prevSig = JSON.stringify(getCachedOperatorProfile());
  mountModalInnerDom(modal, onStateChanged);
  if (isOfflineDemoModeActive()) return;
  try {
    const profile = await refreshCachedOperatorProfile();
    if (!profile) return;
    isAuthLocked = profile.authenticated === false; onStateChanged();
    const activeEl = document.activeElement;
    const isInteracting = Boolean(activeEl && modal.contains(activeEl) && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(activeEl.tagName));
    if (!isInteracting && JSON.stringify(profile) !== prevSig) mountModalInnerDom(modal, onStateChanged);
  } catch { /* ignore */ }
}
