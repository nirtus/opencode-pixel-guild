import { formatPublicSafeEndpoint } from "../hud/index.ts";
import { normalizeQrPayloadToPairingUrl } from "../ingress/qr-matrix-decoder.ts";
import { clientState } from "./client-state.ts";
import { clearCachedGitState } from "./commit-ledger-controller.ts";
import { type ClientOperatorPreferences, type ClientOperatorProfile, type OperatorModalAction, type OperatorModalTab, renderOperatorModalWindowHtml } from "./operator-modal-views.ts";
import { decodeQrFromImageBlob, startCameraQrScanner, stopActiveQrCameraStream } from "./qr-barcode-scanner.ts";
import { resetSidePanelSignatures } from "./side-panel-reconciler.ts";
import { applyAuthoritativeSnapshot, setPendingOperatorAction } from "./snapshot-gate.ts";
import { applyPreferencesToStateTarget, getBrowserStorage, type KeyValueStoragePort, OPERATOR_ID_STORAGE_KEY, readSavedUiWindowState, syncProjectUrlQueryParam, UI_WINDOW_STATE_STORAGE_KEY, writeSavedProjectId, writeSavedUiWindowState } from "./world-persistence.ts";

export type { ClientOperatorPreferences, ClientOperatorProfile, OperatorModalAction, OperatorModalTab };

let pairingModalEl: HTMLElement | null = null;
let activeModalTab: OperatorModalTab = "profile";
let cachedProfile: ClientOperatorProfile | null = null;
let statusMessageText = "";
let isAuthLocked = false;
let profileMutationEpoch = 0;

export function getCachedOperatorProfile(): ClientOperatorProfile | null { return cachedProfile; }

export function getSavedOperatorId(): string | null {
  if (clientState.operatorId) return clientState.operatorId;
  if (typeof window !== "undefined" && window.location?.search) {
    const qOp = new URLSearchParams(window.location.search).get("operatorId")?.trim();
    if (qOp) return (clientState.operatorId = qOp);
  }
  try { const val = getBrowserStorage()?.getItem(OPERATOR_ID_STORAGE_KEY)?.trim(); if (val) return (clientState.operatorId = val); } catch { /* ignore */ }
  return null;
}

export function setSavedOperatorId(operatorId: string | null): void {
  clientState.operatorId = operatorId;
  const store = getBrowserStorage();
  if (!store) return;
  try {
    if (operatorId?.trim()) store.setItem(OPERATOR_ID_STORAGE_KEY, operatorId.trim());
    else store.removeItem?.(OPERATOR_ID_STORAGE_KEY);
  } catch { /* ignore */ }
}

export function getOperatorHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const opId = getSavedOperatorId();
  return opId ? { ...extra, "X-Guild-Operator-Id": opId } : { ...extra };
}

export function withOperatorQuery(path: string): string {
  const opId = getSavedOperatorId();
  return opId ? `${path}${path.includes("?") ? "&" : "?"}operatorId=${encodeURIComponent(opId)}` : path;
}

export function applyOperatorPreferencesToClientState(prefs: Partial<ClientOperatorPreferences> | null | undefined, options: { searchString?: string; storage?: KeyValueStoragePort | null } = {}): void {
  applyPreferencesToStateTarget(clientState, prefs, options);
}

export async function syncOperatorPreferences(partial: Partial<ClientOperatorPreferences>, fetchImpl?: typeof fetch, storage?: KeyValueStoragePort | null): Promise<void> {
  if ("selectedProjectId" in partial) {
    clientState.selectedProjectId = partial.selectedProjectId ?? null;
    writeSavedProjectId(clientState.selectedProjectId, storage);
    syncProjectUrlQueryParam(clientState.selectedProjectId);
  }
  applyPreferencesToStateTarget(clientState, partial, { searchString: "", storage });
  if (cachedProfile) cachedProfile.preferences = { ...(cachedProfile.preferences ?? {}), ...partial };
  const fn = fetchImpl ?? (typeof fetch === "function" ? fetch : undefined);
  if (!fn || storage) return;
  try { await fn("/api/guild/users/me", { method: "PATCH", headers: getOperatorHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ preferences: partial }) }); } catch { /* ignore */ }
}

function syncAuthLockDom(): void {
  clientState.isAuthenticated = !isAuthLocked;
  if (typeof document === "undefined") return;
  document.body?.setAttribute("data-auth-locked", isAuthLocked ? "true" : "false");
  pairingModalEl?.querySelector("#btn-close-pairing-modal")?.classList.toggle("is-hidden", isAuthLocked);
}

function resetClientWorldViewState(clearSelection = false): void {
  clientState.characterWalkers.clear(); clientState.activeSummoningRituals.clear();
  clientState.lanternFlares.length = 0; clientState.tickerLog.length = 0;
  clearCachedGitState(); resetSidePanelSignatures();
  if (clearSelection) {
    clientState.selectedProjectId = clientState.selectedRoomId = clientState.selectedSessionId = null; clientState.cameraFocusMode = "auto";
    writeSavedProjectId(null); writeSavedUiWindowState({ selectedProjectId: null, selectedRoomId: null, selectedSessionId: null, cameraFocusMode: "auto" });
    syncProjectUrlQueryParam(null);
  }
}

async function refreshSnapshotAndRender(modal: HTMLElement | null, onStateChanged: () => void, fetchImpl?: typeof fetch): Promise<void> {
  const fn = fetchImpl ?? (typeof fetch === "function" ? fetch : undefined);
  if (fn) {
    try { const snapRes = await fn("/api/guild/snapshot", { headers: getOperatorHeaders() }); if (snapRes.ok) applyAuthoritativeSnapshot(await snapRes.json(), { allowVersionReset: true }); } catch { /* ignore */ }
  }
  resetSidePanelSignatures(); syncAuthLockDom();
  if (typeof window !== "undefined") window.dispatchEvent(new Event("guild-operator-changed"));
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
  profileMutationEpoch += 1;
  setPendingOperatorAction(fields.machineId ? `${action}:${fields.machineId}` : action);
  try {
    if (action === "login" || action === "register") {
      const endpoint = action === "login" ? "/api/guild/auth/login" : "/api/guild/auth/register";
      const body = action === "login"
        ? { username: (fields.username || "").trim(), password: fields.password || "" }
        : { username: (fields.username || "").trim(), password: fields.password || "", label: (fields.label || "").trim() };
      const res = await fn(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await res.json();
      profileMutationEpoch += 1;
      if (res.ok && payload?.operatorId) {
        cachedProfile = payload; isAuthLocked = false; clientState.authBootCompleted = true;
        setSavedOperatorId(payload.operatorId); resetClientWorldViewState(true);
        applyOperatorPreferencesToClientState(payload.preferences, { searchString: "" });
        const displayAlias = payload.label && payload.label !== "Guild Operator" ? payload.label : payload.username;
        statusMessageText = action === "login"
          ? `✅ Signed in as ${displayAlias} — manage OpenCode machines below or in the header row`
          : `✅ Step 1 Complete! Registered '${displayAlias}' — now complete Step 2 in Profile Settings: add OpenCode with pairing link or paste QR code`;
        activeModalTab = "profile";
        await refreshSnapshotAndRender(modal, onStateChanged, fn);
        if (action === "login" && (payload.pairedMachines?.length ?? 0) > 0) { stopActiveQrCameraStream(); modal?.classList.remove("is-open"); }
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
      profileMutationEpoch += 1;
      if (res.ok && payload?.operatorId) {
        cachedProfile = payload; isAuthLocked = false; setSavedOperatorId(payload.operatorId);
        resetClientWorldViewState(true);
        const pairedEndpoint = payload.daemonUrl || daemonUrl.replace(/\/auth\/connect\/.*/, "");
        statusMessageText = `✅ Step 2 Complete! Paired '${label}' (${formatPublicSafeEndpoint(pairedEndpoint)})`;
        await refreshSnapshotAndRender(modal, onStateChanged, fn);
      } else {
        statusMessageText = `⚠️ ${payload?.error || "Failed to pair machine"}`;
        if (modal) mountModalInnerDom(modal, onStateChanged);
      }
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
      profileMutationEpoch += 1;
      if (res.ok) {
        cachedProfile = payload; resetClientWorldViewState(true);
        statusMessageText = isActivate ? "✅ Switched active OpenCode machine" : "🗑 Removed OpenCode machine pairing";
        await refreshSnapshotAndRender(modal, onStateChanged, fn);
      } else {
        statusMessageText = `⚠️ ${payload?.error || "Failed to update machine"}`;
        if (modal) mountModalInnerDom(modal, onStateChanged);
      }
      return;
    }
    if (action === "save-profile") {
      const username = (fields.username || "").trim();
      const label = (fields.label || "").trim();
      const password = (fields.password || "").trim();
      const res = await fn("/api/guild/users/me", {
        method: "PATCH", headers: getOperatorHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ username, label, ...(password ? { password } : {}) }),
      });
      const payload = await res.json();
      profileMutationEpoch += 1;
      if (res.ok) {
        cachedProfile = payload; statusMessageText = "✅ Profile settings saved";
        await refreshSnapshotAndRender(modal, onStateChanged, fn);
      } else {
        statusMessageText = `⚠️ ${payload?.error || "Failed to save profile"}`;
        if (modal) mountModalInnerDom(modal, onStateChanged);
      }
      return;
    }
    if (action === "logout" || action === "delete-account") {
      if (action === "logout") {
        await fn("/api/guild/auth/logout", { method: "POST" });
        statusMessageText = "Signed out — register or sign in to access your workspace";
      } else {
        await fn("/api/guild/users/me", { method: "DELETE", headers: getOperatorHeaders() });
        statusMessageText = "🗑 Account deleted";
      }
      profileMutationEpoch += 1;
      setSavedOperatorId(null);
      getBrowserStorage()?.removeItem?.(UI_WINDOW_STATE_STORAGE_KEY);
      cachedProfile = null;
      isAuthLocked = true;
      activeModalTab = "register";
      resetClientWorldViewState(true);
      applyAuthoritativeSnapshot({
        ...clientState.currentSnapshot,
        daemonUrl: null, roomOrder: [], rooms: {}, characters: {}, questGates: {},
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
  const bodySlot = modal.querySelector("#operator-modal-body-slot") as HTMLElement | null;
  if (!bodySlot) return;
  bodySlot.innerHTML = renderOperatorModalWindowHtml(cachedProfile, activeModalTab, statusMessageText, isAuthLocked);

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
          (decodedUrl) => { statusMessageText = `📷 Scanned QR link: ${decodedUrl}`; void dispatchOperatorModalAction("pair-machine", { ...extractScopedFields(bodySlot, "machine"), daemonUrl: decodedUrl }, onStateChanged, modal); },
          (msg) => { statusMessageText = msg; mountModalInnerDom(modal, onStateChanged); },
        );
      }
      return;
    }
    if (action === "upload-qr-image") { qrFileInput?.click(); return; }
    const scopedFields = extractScopedFields(bodySlot, target.getAttribute("data-operator-scope-target"));
    void dispatchOperatorModalAction(
      action,
      { ...scopedFields, window: target.getAttribute("data-operator-window") || "", machineId: target.getAttribute("data-machine-activate") || target.getAttribute("data-machine-delete") || "" },
      onStateChanged, modal,
    );
  };
}

function ensureOperatorPairingModal(onStateChanged: () => void): HTMLElement {
  if (pairingModalEl) return pairingModalEl;
  const modal = document.createElement("div");
  modal.id = "operator-pairing-modal";
  modal.className = "modal-overlay";
  modal.innerHTML = `<div class="modal-dialog modal-dialog-summon"><div class="modal-header-row"><div class="modal-title-summon">👤 Guild Operator Account &amp; Profile Settings</div><button type="button" class="btn modal-close-btn" id="btn-close-pairing-modal" aria-label="Close Pairing Modal">✕</button></div><div id="operator-modal-body-slot"></div></div>`;
  document.body.appendChild(modal);
  pairingModalEl = modal;
  modal.querySelector("#btn-close-pairing-modal")?.addEventListener("click", () => {
    if (!isAuthLocked) { stopActiveQrCameraStream(); modal.classList.remove("is-open"); }
  });
  modal.addEventListener("paste", (ev: ClipboardEvent) => {
    for (const item of ev.clipboardData?.items ?? []) {
      if (!item.type.startsWith("image/")) continue;
      const blob = item.getAsFile();
      if (blob) { ev.preventDefault(); void handleDecodedQrImage(blob, modal, modal, onStateChanged, "📋 Pasted QR code image decoded"); return; }
    }
  });
  return modal;
}

export async function refreshCachedOperatorProfile(fetchImpl?: typeof fetch): Promise<ClientOperatorProfile | null> {
  const fn = fetchImpl ?? (typeof fetch === "function" ? fetch : undefined);
  if (!fn) return cachedProfile;
  const startEpoch = profileMutationEpoch;
  try {
    const res = await fn("/api/guild/users/me", { headers: getOperatorHeaders() });
    if (res.ok) {
      const next = (await res.json()) as ClientOperatorProfile;
      if (startEpoch === profileMutationEpoch) cachedProfile = next;
    }
  } catch { /* ignore */ }
  return cachedProfile;
}

export async function syncOperatorAuthGate(onStateChanged: () => void): Promise<boolean> {
  if (typeof document === "undefined" || typeof fetch !== "function") {
    clientState.authBootCompleted = true;
    return true;
  }
  const requestedModal = typeof window !== "undefined" ? new URLSearchParams(window.location?.search || "").get("modal") : null;
  try {
    const profile = await refreshCachedOperatorProfile();
    if (profile) {
      if (profile.authenticated === false) {
        isAuthLocked = true;
        resetClientWorldViewState(false);
        clientState.authBootCompleted = true;
        activeModalTab = requestedModal === "register" ? "register" : "login";
        const modal = ensureOperatorPairingModal(onStateChanged);
        modal.classList.add("is-open");
        mountModalInnerDom(modal, onStateChanged);
        onStateChanged();
        return false;
      }
      isAuthLocked = false;
      if (profile.operatorId) setSavedOperatorId(profile.operatorId);
      const localSaved = readSavedUiWindowState() ?? {};
      const mergedPrefs = { ...(profile.preferences ?? {}), ...localSaved };
      if (clientState.selectedSessionId) mergedPrefs.selectedSessionId = clientState.selectedSessionId;
      applyOperatorPreferencesToClientState(mergedPrefs);
      clientState.authBootCompleted = true;
      syncAuthLockDom();
      onStateChanged();
      if (requestedModal === "profile" || requestedModal === "machines" || (profile.pairedMachines?.length ?? 0) === 0) {
        activeModalTab = requestedModal === "machines" ? "machines" : "profile";
        const modal = ensureOperatorPairingModal(onStateChanged);
        modal.classList.add("is-open");
        mountModalInnerDom(modal, onStateChanged);
      }
    }
  } catch { /* ignore */ }
  clientState.authBootCompleted = true;
  return true;
}

export async function openOperatorPairingModal(onStateChanged: () => void, initialTab: OperatorModalTab = "profile"): Promise<void> {
  if (typeof document === "undefined") return;
  activeModalTab = initialTab;
  statusMessageText = "";
  const modal = ensureOperatorPairingModal(onStateChanged);
  modal.classList.add("is-open");
  const prevSig = JSON.stringify(cachedProfile);
  mountModalInnerDom(modal, onStateChanged);
  try {
    const profile = await refreshCachedOperatorProfile();
    if (profile) {
      isAuthLocked = profile.authenticated === false;
      onStateChanged();
      const activeEl = document.activeElement;
      const isInteracting = Boolean(activeEl && modal.contains(activeEl) && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(activeEl.tagName));
      if (!isInteracting && JSON.stringify(profile) !== prevSig) mountModalInnerDom(modal, onStateChanged);
    }
  } catch { /* ignore */ }
}
