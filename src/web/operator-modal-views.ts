import {
  escapeHtml,
  formatPublicSafeEndpoint,
} from "../hud/index.ts";
import type {
  ClientMachineRecord,
  ClientOperatorPreferences,
  ClientOperatorProfile,
} from "../types/domain.ts";
import type { ModalSizeVariant } from "./modal-shell.ts";
import { getPendingOperatorAction } from "./snapshot-gate.ts";

export type {
  ClientMachineRecord,
  ClientOperatorPreferences,
  ClientOperatorProfile,
};

export type OperatorModalTab = "login" | "register" | "machines" | "profile";
export type OperatorPairingMode = "link-qr" | "manual";

export type OperatorModalAction =
  | "switch-tab"
  | "switch-pairing-mode"
  | "login"
  | "register"
  | "pair-machine"
  | "pair-local-machine"
  | "scan-qr-camera"
  | "upload-qr-image"
  | "activate-machine"
  | "delete-machine"
  | "save-profile"
  | "logout"
  | "delete-account";

export interface OperatorModalMeta {
  title: string;
  size: ModalSizeVariant;
  effectiveTab: OperatorModalTab;
}

const esc = escapeHtml;

export function resolveOperatorModalMeta(
  activeModalTab: OperatorModalTab,
  isAuthLocked = false,
): OperatorModalMeta {
  const effectiveTab: OperatorModalTab =
    isAuthLocked && activeModalTab !== "register" ? "login" : activeModalTab;
  if (isAuthLocked) {
    return { title: "🔒 Operator Auth Gate", size: "compact", effectiveTab };
  }
  if (effectiveTab === "machines") {
    return { title: "🔗 OpenCode Machine Pairing", size: "wide", effectiveTab };
  }
  if (effectiveTab === "profile") {
    return { title: "👤 Guild Operator Profile", size: "compact", effectiveTab };
  }
  if (effectiveTab === "register") {
    return { title: "✨ Register Guild Operator", size: "compact", effectiveTab };
  }
  return { title: "🔑 Switch Guild Operator", size: "compact", effectiveTab };
}

function renderOpenCodePairingViewHtml(
  machines: ClientMachineRecord[],
  pairingMode: OperatorPairingMode,
): string {
  const pendingAct = getPendingOperatorAction();
  const isPairingLocal = pendingAct === "pair-local-machine";
  const isPairingRemote = pendingAct === "pair-machine";

  const machinesHtml =
    machines.length > 0
      ? machines
          .map((m) => {
            const isSwitching = pendingAct === `activate-machine:${m.machineId}`;
            const isDeleting = pendingAct === `delete-machine:${m.machineId}`;
            const rowDis = isSwitching || isDeleting ? " disabled" : "";
            const actBtn = m.isActive
              ? `<button type="button" class="btn btn-compact-action" data-operator-action="activate-machine" data-machine-activate="${esc(m.machineId)}"${rowDis}>${isSwitching ? "⏳ Reconnecting..." : "🔄 Reconnect"}</button>`
              : `<button type="button" class="btn btn-summon-cta btn-compact-action" data-operator-action="activate-machine" data-machine-activate="${esc(m.machineId)}"${rowDis}>${isSwitching ? "⏳ Switching..." : "⚡ Switch"}</button>`;
            const delBtn = `<button type="button" class="btn btn-compact-action" data-operator-action="delete-machine" data-machine-delete="${esc(m.machineId)}"${rowDis}>${isDeleting ? "⏳ Removing..." : "🗑 Remove"}</button>`;
            const statusIcon = m.reachable ? "🟢 " : m.isActive ? "🟠 " : "⚪ ";
            return `<div class="tool-log-entry ${m.isActive ? "commit-file-row active" : ""}">
              <div class="tool-log-header">
                <strong class="tool-log-name">${statusIcon}${m.isActive ? "[ACTIVE] " : ""}${esc(m.label)} (${m.reachable ? "Connected" : "Offline"})</strong>
                <span class="tool-log-station">${esc(formatPublicSafeEndpoint(m.daemonUrl))}</span>
              </div>
              <div class="gate-actions-row">${actBtn}${delBtn}</div>
            </div>`;
          })
          .join("")
      : `<div class="muted-empty-text">No OpenCode machines paired yet. Detect a local daemon or paste a pairing link / QR code.</div>`;

  const modeFieldsHtml =
    pairingMode === "manual"
      ? `<div class="modal-form-grid">
          <label class="modal-field-label" for="machine-label-input">Machine Name</label>
          <input id="machine-label-input" name="label" class="modal-input" type="text" placeholder="e.g. LAN Workstation" />
          <label class="modal-field-label" for="machine-url-input">OpenCode Daemon URL</label>
          <input id="machine-url-input" name="daemonUrl" class="modal-input" type="url" placeholder="http://<LAN-IP>:4096 or https://..." />
          <label class="modal-field-label" for="machine-pass-input">Daemon Password / Token (Optional)</label>
          <input id="machine-pass-input" name="daemonPassword" class="modal-input" type="password" placeholder="Optional daemon password or token" />
        </div>
        <div class="modal-actions">
          <button type="submit" class="btn btn-summon-cta" id="btn-add-pair-machine" data-operator-action="pair-machine" data-operator-scope-target="machine"${isPairingRemote ? " disabled" : ""}>${isPairingRemote ? "⏳ Pairing..." : "🔗 Pair Machine"}</button>
        </div>`
      : `<div class="gate-actions-row">
          <button type="button" class="btn" id="btn-scan-qr-camera" data-operator-action="scan-qr-camera">📷 Scan QR</button>
          <button type="button" class="btn" id="btn-upload-qr-image" data-operator-action="upload-qr-image">🖼️ QR Image</button>
          <input type="file" id="qr-image-file-input" name="qrImageFile" accept="image/*" class="is-hidden" />
        </div>
        <div id="qr-camera-preview-slot"></div>
        <div class="modal-form-grid">
          <label class="modal-field-label" for="machine-url-input">Pairing Link or QR Code (Text / Ctrl+V)</label>
          <textarea id="machine-url-input" name="daemonUrl" class="modal-input modal-textarea" rows="2" placeholder="Paste /auth/connect/... link, terminal QR, or press Ctrl+V with a QR image"></textarea>
          <label class="modal-field-label" for="machine-label-input">Machine Name (Optional)</label>
          <input id="machine-label-input" name="label" class="modal-input" type="text" placeholder="e.g. Remote Tunnel" />
        </div>
        <div class="modal-actions">
          <button type="submit" class="btn btn-summon-cta" id="btn-add-pair-machine" data-operator-action="pair-machine" data-operator-scope-target="machine"${isPairingRemote ? " disabled" : ""}>${isPairingRemote ? "⏳ Pairing..." : "🔗 Redeem &amp; Pair"}</button>
        </div>`;

  return `
    <div class="operator-pairing-grid">
      <div class="sheet-card">
        <div class="sheet-card-title"><span>🖥️ Paired Machines</span><span>${machines.length} configured</span></div>
        <div class="gate-actions-row">
          <button type="button" class="btn btn-summon-cta" id="btn-pair-local-machine" data-operator-action="pair-local-machine" data-operator-scope-target="machine"${isPairingLocal ? " disabled" : ""}>${isPairingLocal ? "⏳ Detecting..." : "🖥️ Detect Local OpenCode"}</button>
        </div>
        ${machinesHtml}
      </div>
      <form class="sheet-card" data-operator-scope="machine" data-operator-form-action="pair-machine">
        <div class="sheet-card-title"><span>🔗 Add Machine</span><span class="val-emerald">LAN · Remote Tunnel</span></div>
        <div class="pairing-mode-bar" role="tablist" aria-label="Pairing Method">
          <button type="button" class="btn pairing-mode-btn ${pairingMode === "link-qr" ? "active" : ""}" data-operator-action="switch-pairing-mode" data-pairing-mode="link-qr">📷 Link / QR</button>
          <button type="button" class="btn pairing-mode-btn ${pairingMode === "manual" ? "active" : ""}" data-operator-action="switch-pairing-mode" data-pairing-mode="manual">🔧 Manual URL</button>
        </div>
        ${modeFieldsHtml}
        <details class="modal-disclosure"${machines.length === 0 ? " open" : ""}>
          <summary><span>❓ Pairing Commands</span><span>▾</span></summary>
          <div class="ledger-body-text">LAN: <code>opencode pair --url http://&lt;LAN-IP&gt;:4096</code> · Tunnel: <code>opencode pair --remote</code></div>
        </details>
      </form>
    </div>`;
}

export function renderOperatorModalWindowHtml(
  profile: ClientOperatorProfile | null,
  activeModalTab: OperatorModalTab,
  statusMessageText: string,
  isAuthLocked = false,
  pairingMode: OperatorPairingMode = "link-qr",
): string {
  const { effectiveTab } = resolveOperatorModalMeta(activeModalTab, isAuthLocked);
  const machines = profile?.pairedMachines ?? [];

  const tabs: Array<{ id: OperatorModalTab; label: string }> = isAuthLocked
    ? [
        { id: "login", label: "🔑 Sign In" },
        { id: "register", label: "✨ Register" },
      ]
    : [
        { id: "machines", label: `🔗 Machines (${machines.length})` },
        { id: "profile", label: "👤 Profile" },
      ];

  const navHtml = `<div class="operator-modal-nav" role="tablist" aria-label="Operator and Pairing Views">${tabs
    .map(
      (t) =>
        `<button type="button" class="btn subtab-btn ${effectiveTab === t.id ? "active" : ""}" data-operator-action="switch-tab" data-operator-window="${t.id}">${t.label}</button>`,
    )
    .join("")}</div>`;

  const bannerHtml = statusMessageText
    ? `<div class="operator-status-banner">${esc(statusMessageText)}</div>`
    : "";

  if (effectiveTab === "login") {
    const lockHint = isAuthLocked
      ? `<div class="ledger-body-text">Sign in to access your isolated Guild Operator workspace and paired OpenCode machines.</div>`
      : "";
    return `${navHtml}${bannerHtml}${lockHint}
      <form class="modal-form-grid" data-operator-scope="login" data-operator-form-action="login">
        <label class="modal-field-label" for="auth-login-username">Username</label>
        <input id="auth-login-username" name="username" class="modal-input" type="text" placeholder="example (do not use actual name)" />
        <label class="modal-field-label" for="auth-login-password">Password</label>
        <input id="auth-login-password" name="password" class="modal-input" type="password" placeholder="Enter your password..." />
        <div class="modal-actions modal-actions-split">
          <button type="button" class="btn" data-operator-action="switch-tab" data-operator-window="register">✨ Create Account</button>
          <button type="submit" class="btn btn-summon-cta" id="btn-submit-login" data-operator-action="login" data-operator-scope-target="login">🔑 Sign In</button>
        </div>
      </form>`;
  }

  if (effectiveTab === "register") {
    const stepHint = isAuthLocked
      ? `<div class="ledger-body-text">Create your isolated Guild Operator account, then pair a local or remote OpenCode machine.</div>`
      : "";
    return `${navHtml}${bannerHtml}${stepHint}
      <form class="modal-form-grid" data-operator-scope="register" data-operator-form-action="register">
        <label class="modal-field-label" for="auth-reg-username">Choose username: example (do not use actual name)</label>
        <input id="auth-reg-username" name="username" class="modal-input" type="text" placeholder="example (do not use actual name)" />
        <label class="modal-field-label" for="auth-reg-password">Choose Password</label>
        <input id="auth-reg-password" name="password" class="modal-input" type="password" placeholder="Create password..." />
        <label class="modal-field-label" for="auth-reg-label">Guild Master alias: example (do not use actual name)</label>
        <input id="auth-reg-label" name="label" class="modal-input" type="text" placeholder="example (do not use actual name)" />
        <div class="modal-actions modal-actions-split">
          <button type="button" class="btn" data-operator-action="switch-tab" data-operator-window="login">Already Registered? Sign In</button>
          <button type="submit" class="btn btn-summon-cta" id="btn-submit-register" data-operator-action="register" data-operator-scope-target="register">✨ Create Account</button>
        </div>
      </form>`;
  }

  if (effectiveTab === "profile") {
    const uname = profile?.username || "guest";
    const label = profile?.label || "Guild Operator";
    const opId = profile?.operatorId || "op_default";
    const headerDisplayName = label && label !== "Guild Operator" ? label : uname;
    return `${navHtml}${bannerHtml}
      <form class="sheet-card" data-operator-scope="profile" data-operator-form-action="save-profile">
        <div class="sheet-card-title"><span>👤 ${esc(headerDisplayName)}</span><span>ID: ${esc(opId)}</span></div>
        <div class="modal-form-grid">
          <label class="modal-field-label" for="profile-username-input">Choose username: example (do not use actual name)</label>
          <input id="profile-username-input" name="username" class="modal-input" type="text" value="${esc(uname)}" placeholder="example (do not use actual name)" />
          <label class="modal-field-label" for="profile-label-input">Guild Master alias: example (do not use actual name)</label>
          <input id="profile-label-input" name="label" class="modal-input" type="text" value="${esc(label)}" placeholder="example (do not use actual name)" />
          <details class="modal-disclosure">
            <summary><span>🔑 Change Password (Optional)</span><span>▾</span></summary>
            <div class="modal-form-grid">
              <label class="modal-field-label" for="profile-password-input">New Password</label>
              <input id="profile-password-input" name="password" class="modal-input" type="password" placeholder="Leave blank to keep current password" />
            </div>
          </details>
        </div>
        <div class="modal-actions modal-actions-split">
          <div class="operator-profile-footer-links">
            <button type="button" class="btn" id="btn-logout-operator" data-operator-action="logout">🚪 Logout</button>
            <button type="button" class="btn" data-operator-action="switch-tab" data-operator-window="login">🔑 Switch</button>
            <button type="button" class="btn" data-operator-action="switch-tab" data-operator-window="register">✨ Register</button>
          </div>
          <button type="submit" class="btn btn-summon-cta" id="btn-save-operator-profile" data-operator-action="save-profile" data-operator-scope-target="profile">💾 Save Profile</button>
        </div>
      </form>
      <details class="modal-disclosure modal-danger-zone">
        <summary><span>⚠️ Danger Zone</span><span>▾</span></summary>
        <div class="ledger-body-text">Permanently delete this Guild Operator account and all saved machine pairings.</div>
        <div class="modal-actions">
          <button type="button" class="btn btn-danger-cta" id="btn-delete-operator-profile" data-operator-action="delete-account">🗑 Delete Account</button>
        </div>
      </details>`;
  }

  return `${navHtml}${bannerHtml}${renderOpenCodePairingViewHtml(machines, pairingMode)}`;
}
