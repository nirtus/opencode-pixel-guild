import { clientState, selectCommitRepository } from "./client-state.ts";
import { escapeHtml } from "./ledger-panel-reconciler.ts";
import { getOperatorHeaders } from "./operator-pairing-controller.ts";
import { applyAuthoritativeSnapshot, clearClientDeletedRoom } from "./snapshot-gate.ts";
import { openSummonAdventurerModal } from "./summon-adventurer-controller.ts";

export interface DiscoveredWorkspaceFolder {
  name: string;
  hostPath: string;
  normalizedPath: string;
  isGitRepo: boolean;
  alreadyAdded: boolean;
}

let addWorldModalEl: HTMLElement | null = null;
let addWorldModalOwnerBody: HTMLElement | null = null;
let activeOnStateChanged: (() => void) | null = null;
let selectedWorkspaceFolderPath: string | null = null;
let isSubmittingAddWorld = false;

function setStatusMessage(text: string, isError = false): void {
  if (typeof document === "undefined") return;
  const msgEl = document.getElementById("add-world-status-msg");
  if (!msgEl) return;
  msgEl.textContent = text;
  msgEl.classList.toggle("is-visible", Boolean(text));
  msgEl.classList.toggle("is-error", Boolean(text) && isError);
}

function updateSelectedFolderHighlight(selectedPath: string | null): void {
  selectedWorkspaceFolderPath = selectedPath;
  if (typeof document === "undefined") return;
  const listEl = document.getElementById("add-world-folder-list");
  if (!listEl) return;
  for (const btn of listEl.querySelectorAll<HTMLButtonElement>(
    "button[data-workspace-folder-path]",
  )) {
    const path = btn.getAttribute("data-workspace-folder-path");
    btn.classList.toggle("active", Boolean(selectedPath && path === selectedPath));
  }
}

function renderWorkspaceFolderRows(folders: DiscoveredWorkspaceFolder[]): void {
  if (typeof document === "undefined") return;
  const listEl = document.getElementById("add-world-folder-list");
  if (!listEl) return;
  listEl.innerHTML = "";

  if (folders.length === 0) {
    const emptyEl = document.createElement("div");
    emptyEl.className = "muted-empty-text";
    emptyEl.textContent =
      "No sibling workspace folders discovered automatically — enter a folder path above.";
    listEl.appendChild(emptyEl);
    return;
  }

  for (const folder of folders) {
    const rowBtn = document.createElement("button");
    rowBtn.type = "button";
    rowBtn.className = `btn add-world-folder-row${selectedWorkspaceFolderPath === folder.hostPath ? " active" : ""}`;
    rowBtn.setAttribute("data-workspace-folder-path", folder.hostPath);
    rowBtn.setAttribute("data-workspace-normalized-path", folder.normalizedPath);
    rowBtn.title = `${folder.hostPath}${folder.alreadyAdded ? " (Already in Worlds)" : ""}`;

    const icon = folder.isGitRepo ? "📦" : "📁";
    const gitBadge = folder.isGitRepo
      ? '<span class="inv-pill inv-pill-plugin">Git</span>'
      : "";
    const addedBadge = folder.alreadyAdded
      ? '<span class="inv-pill inv-pill-workflow">Added ✓</span>'
      : "";
    rowBtn.textContent = `${icon} ${folder.name}${folder.isGitRepo ? " Git" : ""}${folder.alreadyAdded ? " Added ✓" : ""}`;
    rowBtn.innerHTML = `<span class="add-world-folder-name">${icon} ${escapeHtml(folder.name)}</span><span class="add-world-folder-badges">${gitBadge}${addedBadge}</span>`;

    rowBtn.addEventListener("click", () => {
      const inputEl = document.getElementById(
        "add-world-directory-input",
      ) as HTMLInputElement | null;
      if (inputEl) {
        inputEl.value = folder.hostPath;
      }
      updateSelectedFolderHighlight(folder.hostPath);
      setStatusMessage("");
    });

    rowBtn.addEventListener("dblclick", () => {
      void submitAddWorldFolder(folder.hostPath, false, activeOnStateChanged ?? undefined);
    });

    listEl.appendChild(rowBtn);
  }
}

export async function loadWorkspaceFoldersIntoModal(
  parentDir?: string,
  fetchImpl?: typeof fetch,
): Promise<DiscoveredWorkspaceFolder[]> {
  const fn = fetchImpl ?? (typeof fetch === "function" ? fetch : undefined);
  if (!fn) return [];
  try {
    const query = parentDir ? `?parent=${encodeURIComponent(parentDir)}` : "";
    const res = await fn(`/api/guild/workspace-folders${query}`, {
      headers: getOperatorHeaders(),
    });
    if (!res.ok) return [];
    const payload = (await res.json()) as {
      ok?: boolean;
      parentDirectory?: string | null;
      folders?: DiscoveredWorkspaceFolder[];
    };
    const folders = Array.isArray(payload?.folders) ? payload.folders : [];
    const inputEl =
      typeof document !== "undefined"
        ? (document.getElementById("add-world-directory-input") as HTMLInputElement | null)
        : null;
    if (inputEl && !inputEl.value.trim() && folders.length > 0) {
      const preferred = folders.find((f) => !f.alreadyAdded) ?? folders[0]!;
      inputEl.value = preferred.hostPath;
      selectedWorkspaceFolderPath = preferred.hostPath;
    }
    renderWorkspaceFolderRows(folders);
    return folders;
  } catch {
    renderWorkspaceFolderRows([]);
    return [];
  }
}

export async function submitAddWorldFolder(
  directory?: string,
  summonAfterAdd = false,
  onStateChanged?: () => void,
  fetchImpl?: typeof fetch,
): Promise<{
  ok: boolean;
  roomId?: string;
  locationDirectory?: string;
  error?: string;
}> {
  if (isSubmittingAddWorld) {
    return { ok: false, error: "Already adding world folder" };
  }
  const inputEl =
    typeof document !== "undefined"
      ? (document.getElementById("add-world-directory-input") as HTMLInputElement | null)
      : null;
  const trimmedDir = (directory ?? inputEl?.value ?? "").trim();
  if (!trimmedDir) {
    const err = "Enter or select a folder path to add as a World";
    setStatusMessage(`⚠️ ${err}`, true);
    return { ok: false, error: err };
  }

  const fn = fetchImpl ?? (typeof fetch === "function" ? fetch : undefined);
  if (!fn) {
    return { ok: false, error: "Fetch unavailable" };
  }

  isSubmittingAddWorld = true;
  setStatusMessage("⏳ Adding folder as Project World...", false);

  try {
    const res = await fn("/api/guild/room", {
      method: "POST",
      headers: getOperatorHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ directory: trimmedDir }),
    });
    const payload = (await res.json()) as {
      ok?: boolean;
      roomId?: string;
      locationDirectory?: string;
      rawDirectory?: string;
      snapshot?: typeof clientState.currentSnapshot;
      error?: string;
    };

    if (!res.ok || !payload?.ok) {
      const errMsg = payload?.error || `Failed to add folder (HTTP ${res.status})`;
      setStatusMessage(`⚠️ ${errMsg}`, true);
      return { ok: false, error: errMsg };
    }

    clearClientDeletedRoom(trimmedDir);
    if (payload.roomId) clearClientDeletedRoom(payload.roomId);
    if (payload.locationDirectory) clearClientDeletedRoom(payload.locationDirectory);
    if (payload.snapshot) {
      applyAuthoritativeSnapshot(payload.snapshot);
    }

    const roomId = payload.roomId || trimmedDir;
    const roomInSnap = clientState.currentSnapshot.rooms?.[roomId];
    const locationDirectory =
      payload.locationDirectory || roomInSnap?.locationDirectory || roomId;

    selectCommitRepository(roomId);
    closeAddWorldFolderModal();

    if (summonAfterAdd) {
      openSummonAdventurerModal(locationDirectory);
    }

    const notify = onStateChanged ?? activeOnStateChanged;
    notify?.();

    return { ok: true, roomId, locationDirectory };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error adding folder";
    setStatusMessage(`⚠️ ${msg}`, true);
    return { ok: false, error: msg };
  } finally {
    isSubmittingAddWorld = false;
  }
}

function ensureAddWorldFolderModal(onStateChanged?: () => void): HTMLElement | null {
  if (typeof document === "undefined" || !document.body) return null;
  if (onStateChanged) activeOnStateChanged = onStateChanged;

  const existing = document.getElementById("add-world-folder-modal");
  if (existing && addWorldModalEl === existing && addWorldModalOwnerBody === document.body) {
    return existing;
  }

  const modal = document.createElement("div");
  modal.id = "add-world-folder-modal";
  modal.className = "modal-overlay";

  const dialog = document.createElement("div");
  dialog.className = "modal-dialog modal-dialog-summon";

  const headerRow = document.createElement("div");
  headerRow.className = "modal-header-row";

  const titleEl = document.createElement("div");
  titleEl.className = "modal-title-summon";
  titleEl.textContent = "➕ Add Folder as New Project World";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.id = "btn-close-add-world-modal";
  closeBtn.className = "btn modal-close-btn";
  closeBtn.setAttribute("aria-label", "Close Add World Modal");
  closeBtn.textContent = "✕";

  headerRow.appendChild(titleEl);
  headerRow.appendChild(closeBtn);

  const formGrid = document.createElement("div");
  formGrid.className = "modal-form-grid";

  const pathLabel = document.createElement("label");
  pathLabel.className = "modal-field-label";
  pathLabel.setAttribute("for", "add-world-directory-input");
  pathLabel.textContent = "Project Folder Path";

  const dirInput = document.createElement("input");
  dirInput.id = "add-world-directory-input";
  dirInput.type = "text";
  dirInput.className = "modal-input";
  dirInput.setAttribute("aria-label", "Project Folder Path");
  dirInput.setAttribute(
    "placeholder",
    "Select a workspace folder below or enter a path (e.g. ~/projects/my-app)",
  );

  const listLabel = document.createElement("div");
  listLabel.className = "modal-field-label";
  listLabel.textContent = "Discovered Workspace Folders";

  const folderList = document.createElement("div");
  folderList.id = "add-world-folder-list";
  folderList.className = "add-world-folder-list";
  folderList.setAttribute("role", "listbox");
  folderList.setAttribute("aria-label", "Discovered Workspace Folders");

  const statusMsg = document.createElement("div");
  statusMsg.id = "add-world-status-msg";
  statusMsg.className = "scroll-feedback-msg";

  formGrid.appendChild(pathLabel);
  formGrid.appendChild(dirInput);
  formGrid.appendChild(listLabel);
  formGrid.appendChild(folderList);
  formGrid.appendChild(statusMsg);

  const actionsRow = document.createElement("div");
  actionsRow.className = "modal-actions";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.id = "btn-cancel-add-world";
  cancelBtn.className = "btn";
  cancelBtn.textContent = "Cancel";

  const confirmBtn = document.createElement("button");
  confirmBtn.type = "button";
  confirmBtn.id = "btn-confirm-add-world";
  confirmBtn.className = "btn";
  confirmBtn.textContent = "➕ Add World";

  const addAndSummonBtn = document.createElement("button");
  addAndSummonBtn.type = "button";
  addAndSummonBtn.id = "btn-add-world-and-summon";
  addAndSummonBtn.className = "btn btn-summon-cta";
  addAndSummonBtn.textContent = "✨ Add & Summon Adventurer";

  actionsRow.appendChild(cancelBtn);
  actionsRow.appendChild(confirmBtn);
  actionsRow.appendChild(addAndSummonBtn);

  dialog.appendChild(headerRow);
  dialog.appendChild(formGrid);
  dialog.appendChild(actionsRow);
  modal.appendChild(dialog);
  document.body.appendChild(modal);

  addWorldModalEl = modal;
  addWorldModalOwnerBody = document.body;

  const handleClose = () => {
    closeAddWorldFolderModal();
    activeOnStateChanged?.();
  };

  closeBtn.addEventListener("click", handleClose);
  cancelBtn.addEventListener("click", handleClose);
  modal.addEventListener("click", (ev) => {
    if (ev.target === modal) handleClose();
  });

  dirInput.addEventListener("input", () => {
    updateSelectedFolderHighlight(dirInput.value.trim() || null);
    setStatusMessage("");
  });
  dirInput.addEventListener("keydown", (ev) => {
    const ke = ev as KeyboardEvent;
    if (ke.key === "Enter") {
      ke.preventDefault();
      void submitAddWorldFolder(dirInput.value, false, activeOnStateChanged ?? undefined);
    }
  });

  confirmBtn.addEventListener("click", () => {
    void submitAddWorldFolder(dirInput.value, false, activeOnStateChanged ?? undefined);
  });
  addAndSummonBtn.addEventListener("click", () => {
    void submitAddWorldFolder(dirInput.value, true, activeOnStateChanged ?? undefined);
  });

  return modal;
}

export function initAddWorldFolderControls(onStateChanged: () => void): void {
  activeOnStateChanged = onStateChanged;
  ensureAddWorldFolderModal(onStateChanged);
}

export async function openAddWorldFolderModal(
  onStateChanged?: () => void,
  fetchImpl?: typeof fetch,
): Promise<void> {
  if (onStateChanged) activeOnStateChanged = onStateChanged;
  const modal = ensureAddWorldFolderModal(onStateChanged);
  if (!modal) return;

  const dirInput = modal.querySelector(
    "#add-world-directory-input",
  ) as HTMLInputElement | null;
  if (dirInput) {
    dirInput.value = "";
  }
  selectedWorkspaceFolderPath = null;
  setStatusMessage("");
  modal.classList.add("is-open");
  modal.style.display = "grid";

  await loadWorkspaceFoldersIntoModal(undefined, fetchImpl);
}

export function closeAddWorldFolderModal(): void {
  if (typeof document === "undefined") return;
  const modal = document.getElementById("add-world-folder-modal") ?? addWorldModalEl;
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.style.display = "none";
  setStatusMessage("");
}
