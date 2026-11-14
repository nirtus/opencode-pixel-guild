import {
  escapeHtml,
  formatPublicSafeEndpoint,
} from "../hud/index.ts";
import type {
  ClientMachineRecord,
  ClientOperatorPreferences,
  ClientOperatorProfile,
} from "../types/domain.ts";
import { getPendingOperatorAction } from "./snapshot-gate.ts";

export type {
  ClientMachineRecord,
  ClientOperatorPreferences,
  ClientOperatorProfile,
};

export type OperatorModalTab = "login" | "register" | "machines" | "profile";

export type OperatorModalAction =
  | "switch-tab"
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

const esc = escapeHtml;

function renderOpenCodePairingSectionHtml(machines: ClientMachineRecord[]): string {
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
              : `<button type="button" class="btn btn-summon-cta btn-compact-action" data-operator-action="activate-machine" data-machine-activate="${esc(m.machineId)}"${rowDis}>${isSwitching ? "⏳ Switching..." : "⚡ Switch to Machine"}</button>`;
            const delBtn = `<button type="button" class="btn btn-compact-action" data-operator-action="delete-machine" data-machine-delete="${esc(m.machineId)}"${rowDis}>${isDeleting ? "⏳ Removing..." : "🗑 Remove"}</button>`;
            return `<div class="tool-log-entry ${m.isActive ? "commit-file-row active" : ""}">
              <div class="tool-log-header">
                <strong class="tool-log-name">${m.isActive ? "🟢 [ACTIVE] " : "⚪ "}${esc(m.label)} (${m.reachable ? "Connected" : "Offline"})</strong>
                <span class="tool-log-station">${esc(formatPublicSafeEndpoint(m.daemonUrl))}</span>
              </div>
              <div class="gate-actions-row">${actBtn}${delBtn}</div>
            </div>`;
          })
          .join("")
      : `<div class="muted-empty-text">No OpenCode machines paired yet. Complete Step 2 below by pasting a pairing link or QR code.</div>`;

  return `
    <div class="sheet-card">
      <div class="sheet-card-title"><span>🖥️ Paired OpenCode Machines</span><span>${machines.length} configured</span></div>
      ${machinesHtml}
    </div>
    <form class="sheet-card" data-operator-scope="machine" data-operator-form-action="pair-machine">
      <div class="sheet-card-title"><span>🔗 Step 2: Add OpenCode (Pair Local or Remote)</span><span class="val-emerald">Local Host, LAN &amp; Remote Tunnel Ready</span></div>
      <div class="ledger-body-text">Click <strong>Detect &amp; Pair Local OpenCode</strong> to connect to the OpenCode daemon on your host machine automatically, OR run <strong><code>opencode pair --url http://&lt;LAN-IP&gt;:4096</code></strong> (LAN) / <strong><code>opencode pair --remote</code></strong> (Remote Tunnel) and paste the pairing link or QR code:</div>
      <div class="gate-actions-row">
        <button type="button" class="btn btn-summon-cta" id="btn-pair-local-machine" data-operator-action="pair-local-machine" data-operator-scope-target="machine"${isPairingLocal ? " disabled" : ""}>${isPairingLocal ? "⏳ Pairing..." : "🖥️ Detect &amp; Pair Local OpenCode"}</button>
        <button type="button" class="btn" id="btn-scan-qr-camera" data-operator-action="scan-qr-camera">📷 Scan QR with Camera</button>
        <button type="button" class="btn" id="btn-upload-qr-image" data-operator-action="upload-qr-image">🖼️ Upload / Paste QR Image</button>
        <input type="file" id="qr-image-file-input" name="qrImageFile" accept="image/*" class="is-hidden" />
      </div>
      <div id="qr-camera-preview-slot"></div>
      <div class="modal-form-grid">
        <label class="modal-field-label" for="machine-label-input">Machine Name (e.g. LAN Workstation, Remote Tunnel Server)</label>
        <input id="machine-label-input" name="label" class="modal-input" type="text" placeholder="e.g. LAN OpenCode / Remote Tunnel" />
        <label class="modal-field-label" for="machine-url-input">Pairing Link (/auth/connect/:code) or Paste QR Code (Text / Ctrl+V Image)</label>
        <textarea id="machine-url-input" name="daemonUrl" class="modal-input" rows="3" placeholder="Paste http(s)://.../auth/connect/... link OR paste terminal QR code (██ ▄▄▄▄▄ ...) OR press Ctrl+V with a QR screenshot"></textarea>
        <label class="modal-field-label" for="machine-pass-input">Daemon Password / Token (Auto-filled by Pairing Link / QR)</label>
        <input id="machine-pass-input" name="daemonPassword" class="modal-input" type="password" placeholder="Optional — automatically redeemed from Pairing Link or QR code" />
      </div>
      <div class="modal-actions">
        <button type="submit" class="btn btn-summon-cta" id="btn-add-pair-machine" data-operator-action="pair-machine" data-operator-scope-target="machine"${isPairingRemote ? " disabled" : ""}>${isPairingRemote ? "⏳ Pairing..." : "🔗 Redeem &amp; Pair Machine"}</button>
      </div>
    </form>`;
}

export function renderOperatorModalWindowHtml(
  profile: ClientOperatorProfile | null,
  activeModalTab: OperatorModalTab,
  statusMessageText: string,
  isAuthLocked = false,
): string {
  const effectiveTab: OperatorModalTab =
    isAuthLocked && activeModalTab !== "register" ? "login" : activeModalTab;

  const tabs: Array<{ id: OperatorModalTab; label: string }> = isAuthLocked
    ? [
        { id: "register", label: "✨ Step 1: Register" },
        { id: "login", label: "🔑 Login" },
      ]
    : [
        { id: "profile", label: "👤 Step 2: Profile Settings & Pair OpenCode" },
        { id: "machines", label: `🔗 OpenCode Machines (${profile?.pairedMachines?.length ?? 0})` },
        { id: "login", label: "🔑 Switch Account" },
        { id: "register", label: "✨ Register" },
      ];

  const tabBarHtml = `<div class="subtab-deck-bar" role="tablist" aria-label="User &amp; OpenCode Pairing Windows">${tabs
    .map((t) => `<button type="button" class="btn subtab-btn ${effectiveTab === t.id ? "active" : ""}" data-operator-action="switch-tab" data-operator-window="${t.id}">${t.label}</button>`)
    .join("")}</div>`;

  const lockNoticeHtml = isAuthLocked
    ? `<div class="sheet-card"><div class="sheet-card-title"><span>🔒 Operator Auth Gate</span><span class="val-gold">Step 1: Register or Sign In</span></div><div class="ledger-body-text">Step 1: Register your Guild Operator account (or sign in). Step 2: Open Profile Settings to add your OpenCode server via pairing link or QR code.</div></div>`
    : "";

  const bannerHtml = statusMessageText ? `<div class="dispatch-user-row">${esc(statusMessageText)}</div>` : "";

  if (effectiveTab === "login") {
    return `${tabBarHtml}${lockNoticeHtml}${bannerHtml}
      <form class="modal-form-grid" data-operator-scope="login" data-operator-form-action="login">
        <label class="modal-field-label" for="auth-login-username">Username</label>
        <input id="auth-login-username" name="username" class="modal-input" type="text" placeholder="example (do not use actual name)" />
        <label class="modal-field-label" for="auth-login-password">Password</label>
        <input id="auth-login-password" name="password" class="modal-input" type="password" placeholder="Enter your password..." />
        <div class="modal-actions">
          <button type="button" class="btn" data-operator-action="switch-tab" data-operator-window="register">✨ Step 1: Register New Account</button>
          <button type="submit" class="btn btn-summon-cta" id="btn-submit-login" data-operator-action="login" data-operator-scope-target="login">🔑 Sign In &amp; Open Profile Settings</button>
        </div>
      </form>`;
  }

  if (effectiveTab === "register") {
    return `${tabBarHtml}${lockNoticeHtml}${bannerHtml}
      <div class="sheet-card">
        <div class="sheet-card-title"><span>✨ Step 1: Create Your Guild Operator Account</span><span class="val-gold">Step 1 of 2</span></div>
        <div class="ledger-body-text">Register your isolated operator account first. Next, in Step 2 (Profile Settings), you will connect your OpenCode server using a pairing link or QR code.</div>
      </div>
      <form class="modal-form-grid" data-operator-scope="register" data-operator-form-action="register">
        <label class="modal-field-label" for="auth-reg-username">Choose username: example (do not use actual name)</label>
        <input id="auth-reg-username" name="username" class="modal-input" type="text" placeholder="example (do not use actual name)" />
        <label class="modal-field-label" for="auth-reg-password">Choose Password</label>
        <input id="auth-reg-password" name="password" class="modal-input" type="password" placeholder="Create password..." />
        <label class="modal-field-label" for="auth-reg-label">Guild Master alias: example (do not use actual name)</label>
        <input id="auth-reg-label" name="label" class="modal-input" type="text" placeholder="example (do not use actual name)" />
        <div class="modal-actions">
          <button type="button" class="btn" data-operator-action="switch-tab" data-operator-window="login">Already Registered? Login</button>
          <button type="submit" class="btn btn-summon-cta" id="btn-submit-register" data-operator-action="register" data-operator-scope-target="register">✨ Step 1: Register &amp; Continue to Profile Settings</button>
        </div>
      </form>`;
  }

  const machines = profile?.pairedMachines ?? [];
  const pairingSectionHtml = renderOpenCodePairingSectionHtml(machines);

  if (effectiveTab === "profile") {
    const uname = profile?.username || "guest";
    const label = profile?.label || "Guild Operator";
    const opId = profile?.operatorId || "op_default";
    const headerDisplayName = label && label !== "Guild Operator" ? label : uname;
    return `${tabBarHtml}${bannerHtml}
      <div class="operator-profile-desktop-grid">
        <form class="sheet-card" data-operator-scope="profile" data-operator-form-action="save-profile">
          <div class="sheet-card-title"><span>👤 Profile Settings (${esc(headerDisplayName)})</span><span>ID: ${esc(opId)}</span></div>
          <div class="modal-form-grid">
            <label class="modal-field-label" for="profile-username-input">Choose username: example (do not use actual name)</label>
            <input id="profile-username-input" name="username" class="modal-input" type="text" value="${esc(uname)}" placeholder="example (do not use actual name)" />
            <label class="modal-field-label" for="profile-label-input">Guild Master alias: example (do not use actual name)</label>
            <input id="profile-label-input" name="label" class="modal-input" type="text" value="${esc(label)}" placeholder="example (do not use actual name)" />
            <label class="modal-field-label" for="profile-password-input">Update Password (Optional)</label>
            <input id="profile-password-input" name="password" class="modal-input" type="password" placeholder="Leave blank to keep current password" />
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-kill-danger" id="btn-delete-operator-profile" data-operator-action="delete-account">🗑 Delete Account</button>
            <button type="button" class="btn" id="btn-logout-operator" data-operator-action="logout">🚪 Logout</button>
            <button type="submit" class="btn btn-summon-cta" id="btn-save-operator-profile" data-operator-action="save-profile" data-operator-scope-target="profile">💾 Save Profile</button>
          </div>
        </form>
        <div class="operator-pairing-column">${pairingSectionHtml}</div>
      </div>`;
  }

  return `${tabBarHtml}${bannerHtml}${pairingSectionHtml}`;
}
