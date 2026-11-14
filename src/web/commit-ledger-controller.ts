import type { RoomGitWorkingTreeState } from "../ingress/index.ts";
import { clientState, triggerPlatformSnapBurst } from "./client-state.ts";
import {
  reconcileCommitLedgerDockWithContext, renderAssemblyShowcaseCardHtml,
  renderCommitFilesListHtmlWithContext, renderCommitLedgerDockHtmlWithContext,
  renderOverviewAssemblyShowcaseCardHtml, renderProjectBrowserRowHtml, renderUnselectedProjectCommitHtml,
} from "./commit-ledger-view.ts";
import { getOperatorHeaders } from "./operator-pairing-controller.ts";
import { applyAuthoritativeSnapshot } from "./snapshot-gate.ts";
import { hasActiveTextSelection } from "./text-selection-guard.ts";

export {
  renderAssemblyShowcaseCardHtml, renderOverviewAssemblyShowcaseCardHtml,
  renderProjectBrowserRowHtml, renderUnselectedProjectCommitHtml,
};

const cachedGitStateByRoom = new Map<string, RoomGitWorkingTreeState>();
const cachedDiffByFile = new Map<string, string>();
const inFlightWaitersByRoom = new Map<string, Array<() => void>>();
const pendingFollowUpRefreshByRoom = new Set<string>();
const localDraftByRoom = new Map<string, { title: string; body: string }>();
const lastMutationAtByRoom = new Map<string, number>();
const inFlightActionByRoom = new Map<string, string>();
const inFlightFileActionsByRoom = new Map<string, Map<string, "stage" | "unstage" | "discard">>();
const clientGitMutationEpochByRoom = new Map<string, number>();
let activeControlContext = { roomId: "", onResetSig: () => {}, onStateChanged: () => {} };
let draftSyncTimer: ReturnType<typeof setTimeout> | null = null;
let lastCommitFeedbackText = "";
let gitStateRevision = 0;

function bumpGitStateRevision(): void { gitStateRevision += 1; }
function bumpRoomMutationEpoch(roomId: string): number {
  const next = (clientGitMutationEpochByRoom.get(roomId) ?? 0) + 1;
  clientGitMutationEpochByRoom.set(roomId, next);
  return next;
}

function applyServerSnapshot(
  nextSnap: typeof clientState.currentSnapshot | null | undefined,
  roomId?: string,
): void {
  applyAuthoritativeSnapshot(nextSnap, { roomIdHint: roomId });
}

export function getCommitLedgerRevision(): number { return gitStateRevision; }
export function getLastCommitFeedbackText(): string { return lastCommitFeedbackText; }
export function isGitSyncInFlight(roomId?: string | null): boolean {
  const key = roomId || "all";
  return inFlightActionByRoom.get(key) === "git.sync" || inFlightActionByRoom.get(key) === "git.status" || inFlightActionByRoom.get("all") === "git.sync";
}

async function executeGitAction(
  body: Record<string, unknown>,
  options: { silentDom?: boolean } = {},
  explicitRoomId?: string | null,
): Promise<void> {
  const targetRoomId = explicitRoomId || activeControlContext.roomId || "all";
  const isDraftOp = body.action === "git.draft.update" || body.action === "git.draft.clear";
  const filePaths = Array.isArray(body.paths) ? (body.paths as string[]) : null;
  try {
    if (!isDraftOp) {
      bumpRoomMutationEpoch(targetRoomId);
      lastMutationAtByRoom.set(targetRoomId, Date.now());
      if (filePaths && (body.action === "git.stage" || body.action === "git.unstage" || body.action === "git.discard")) {
        const kind = body.action === "git.stage" ? "stage" : body.action === "git.unstage" ? "unstage" : "discard";
        let map = inFlightFileActionsByRoom.get(targetRoomId);
        if (!map) { map = new Map(); inFlightFileActionsByRoom.set(targetRoomId, map); }
        for (const p of filePaths) map.set(p, kind);
      } else {
        inFlightActionByRoom.set(targetRoomId, String(body.action ?? ""));
      }
      if (!options.silentDom) {
        bumpGitStateRevision();
        activeControlContext.onResetSig();
        activeControlContext.onStateChanged();
      }
    }
    const res = await fetch("/api/guild/git", {
      method: "POST",
      headers: getOperatorHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ roomId: targetRoomId, ...body }),
    });
    const payload = await res.json();
    if (!isDraftOp) {
      bumpRoomMutationEpoch(targetRoomId);
      lastMutationAtByRoom.set(targetRoomId, Date.now());
    }
    if (payload?.state && targetRoomId !== "all") cachedGitStateByRoom.set(targetRoomId, payload.state);
    if (payload?.snapshot) applyServerSnapshot(payload.snapshot, targetRoomId !== "all" ? targetRoomId : undefined);
    const nextFiles = payload?.state?.files || [];
    const nextStaged = nextFiles.filter((f: { staged?: boolean }) => f.staged).length;
    if (body.action === "git.commit") {
      if (payload?.ok) {
        localDraftByRoom.delete(targetRoomId); clientState.selectedCommitFilePath = null; cachedDiffByFile.clear();
        lastCommitFeedbackText = `✅ Committed ${payload.commitHash || "HEAD"}: ${payload.subject || body.title || ""}`;
        triggerPlatformSnapBurst(390, 345);
      } else {
        lastCommitFeedbackText = `⚠️ ${payload?.error || "Commit failed"}`;
      }
    } else if (body.action === "git.status" || body.action === "git.sync") {
      if (payload?.ok === false || payload?.error) {
        lastCommitFeedbackText = `⚠️ ${payload?.error || "Failed to sync with Git"}`;
      } else if (payload?.pushed || payload?.pulled) {
        const verb = payload.pulled && payload.pushed ? "pulled & pushed commits" : payload.pushed ? "pushed commits" : "pulled commits";
        lastCommitFeedbackText = `🔄 Synced with remote (${verb})`;
      } else if (targetRoomId === "all") {
        lastCommitFeedbackText = "✨ Synced all project worlds with Git";
      } else if (nextFiles.length === 0) {
        localDraftByRoom.delete(targetRoomId); clientState.selectedCommitFilePath = null; cachedDiffByFile.clear();
        lastCommitFeedbackText = "✨ Synced with Git — working tree is clean (0 uncommitted files)";
      } else {
        lastCommitFeedbackText = `🔄 Synced with Git (${nextStaged}/${nextFiles.length} files staged)`;
      }
    } else if (body.action === "git.stage") {
      lastCommitFeedbackText = payload?.ok === false ? `⚠️ ${payload?.error || "Failed to stage"}` : `✅ Staged (${nextStaged}/${nextFiles.length} files ready to commit)`;
    } else if (body.action === "git.unstage") {
      lastCommitFeedbackText = payload?.ok === false ? `⚠️ ${payload?.error || "Failed to unstage"}` : `ℹ️ Unstaged (${nextStaged}/${nextFiles.length} files staged)`;
    } else if (body.action === "git.discard") {
      if (nextFiles.length === 0) { localDraftByRoom.delete(targetRoomId); clientState.selectedCommitFilePath = null; cachedDiffByFile.clear(); }
      lastCommitFeedbackText = payload?.ok === false ? `⚠️ ${payload?.error || "Failed to discard"}` : `🗑️ Discarded working-tree changes`;
    } else if (body.action === "git.draft.clear") {
      localDraftByRoom.delete(targetRoomId);
    }
  } catch {
    if (!isDraftOp) lastCommitFeedbackText = "⚠️ Failed to communicate with Git companion endpoint";
  } finally {
    if (!isDraftOp) {
      if (filePaths) {
        const map = inFlightFileActionsByRoom.get(targetRoomId);
        if (map) for (const p of filePaths) map.delete(p);
      } else {
        inFlightActionByRoom.delete(targetRoomId);
      }
    }
    if (!options.silentDom) {
      bumpGitStateRevision();
      activeControlContext.onResetSig();
      activeControlContext.onStateChanged();
    }
  }
}

export async function triggerGitSync(roomId: string | null | undefined, onResetSig: () => void, onStateChanged: () => void): Promise<void> {
  const targetRoomId = roomId || "all";
  activeControlContext = { roomId: targetRoomId, onResetSig, onStateChanged };
  await executeGitAction({ action: "git.sync" }, {}, targetRoomId);
}

export function wasRoomGitMutatedRecently(roomId: string | null | undefined, withinMs = 1500): boolean {
  if (!roomId) return false;
  if (inFlightActionByRoom.has(roomId) || (inFlightFileActionsByRoom.get(roomId)?.size ?? 0) > 0) return true;
  const ts = lastMutationAtByRoom.get(roomId);
  return typeof ts === "number" && Date.now() - ts <= withinMs;
}

export function getCachedRoomGitState(roomId: string | null | undefined): RoomGitWorkingTreeState | null {
  if (!roomId) return null;
  return cachedGitStateByRoom.get(roomId) ?? null;
}

export function invalidateRoomGitCache(roomId: string | null | undefined): void {
  if (!roomId) return;
  cachedGitStateByRoom.delete(roomId);
  cachedDiffByFile.clear();
  bumpGitStateRevision();
}

export function clearCachedGitState(roomId?: string): void {
  if (roomId) {
    invalidateRoomGitCache(roomId);
    return;
  }
  cachedGitStateByRoom.clear();
  cachedDiffByFile.clear();
  inFlightWaitersByRoom.clear();
  pendingFollowUpRefreshByRoom.clear();
  localDraftByRoom.clear();
  lastMutationAtByRoom.clear();
  inFlightActionByRoom.clear();
  inFlightFileActionsByRoom.clear();
  clientGitMutationEpochByRoom.clear();
  lastCommitFeedbackText = "";
  bumpGitStateRevision();
}

export async function refreshRoomGitState(roomId: string, onStateChanged: () => void): Promise<void> {
  if (!roomId || roomId === "/guild") return;
  if (typeof window === "undefined" || typeof fetch !== "function") return;
  const existingWaiters = inFlightWaitersByRoom.get(roomId);
  if (existingWaiters) {
    existingWaiters.push(onStateChanged);
    pendingFollowUpRefreshByRoom.add(roomId);
    return;
  }
  const waiters: Array<() => void> = [onStateChanged];
  inFlightWaitersByRoom.set(roomId, waiters);
  try {
    do {
      pendingFollowUpRefreshByRoom.delete(roomId);
      const startEpoch = clientGitMutationEpochByRoom.get(roomId) ?? 0;
      const res = await fetch(`/api/guild/git?roomId=${encodeURIComponent(roomId)}&refresh=1`, { headers: getOperatorHeaders() });
      if (res.ok) {
        const payload = await res.json();
        const currentEpoch = clientGitMutationEpochByRoom.get(roomId) ?? 0;
        if (currentEpoch !== startEpoch || inFlightActionByRoom.has(roomId) || (inFlightFileActionsByRoom.get(roomId)?.size ?? 0) > 0) {
          continue;
        }
        if (payload?.state) {
          cachedGitStateByRoom.set(roomId, payload.state);
          if (payload.state.files?.length === 0) {
            localDraftByRoom.delete(roomId);
            clientState.selectedCommitFilePath = null;
            cachedDiffByFile.clear();
          }
          if (payload.state.isClean && clientState.currentSnapshot?.rooms?.[roomId]) {
            clientState.currentSnapshot.rooms[roomId] = { ...clientState.currentSnapshot.rooms[roomId]!, taskProgress: { source: "none", featureSlug: "Blueprint Ready", totalTasks: 0, resolvedTasks: 0, tasks: [] } };
          }
        }
        if (payload?.snapshot) applyServerSnapshot(payload.snapshot, roomId);
        bumpGitStateRevision();
        for (const cb of [...waiters]) { try { cb(); } catch { /* ignore */ } }
      }
    } while (pendingFollowUpRefreshByRoom.has(roomId));
  } catch { /* Ignore transient network errors */ } finally {
    pendingFollowUpRefreshByRoom.delete(roomId);
    inFlightWaitersByRoom.delete(roomId);
  }
}

export function renderCommitFilesListHtml(gitState: RoomGitWorkingTreeState | null, selectedFilePath: string | null = null, explicitDiffText?: string | null, roomId = ""): string {
  const effectiveRoomId = roomId || activeControlContext.roomId;
  return renderCommitFilesListHtmlWithContext(gitState, selectedFilePath, explicitDiffText, {
    cachedDiffByFile, localDraftByRoom, lastCommitFeedbackText,
    roomId: effectiveRoomId,
    inFlightAction: effectiveRoomId ? inFlightActionByRoom.get(effectiveRoomId) : null,
    inFlightFileActions: effectiveRoomId ? inFlightFileActionsByRoom.get(effectiveRoomId) : null,
  });
}

export function renderCommitLedgerDockHtml(gitState: RoomGitWorkingTreeState | null, suggestedTitle = "", roomId = ""): string {
  const effectiveRoomId = roomId || activeControlContext.roomId;
  return renderCommitLedgerDockHtmlWithContext(gitState, suggestedTitle, roomId, localDraftByRoom, effectiveRoomId ? inFlightActionByRoom.get(effectiveRoomId) : null);
}

export function reconcileCommitLedgerDock(interactiveSlot: HTMLElement, roomId: string, gitState: RoomGitWorkingTreeState | null, suggestedTitle: string): void {
  reconcileCommitLedgerDockWithContext(interactiveSlot, roomId, gitState, suggestedTitle, localDraftByRoom, roomId ? inFlightActionByRoom.get(roomId) : null);
}

export function renderCommitLedgerPanelHtml(gitState: RoomGitWorkingTreeState | null, _pageIndex = 0, selectedFilePath: string | null = null, suggestedTitle = ""): string {
  return `${renderCommitFilesListHtml(gitState, selectedFilePath)}${renderCommitLedgerDockHtml(gitState, suggestedTitle)}`;
}

export function bindCommitLedgerControls(container: HTMLElement, roomId: string, onResetSig: () => void, onStateChanged: () => void): void {
  if (!roomId || roomId === "/guild") return;
  activeControlContext = { roomId, onResetSig, onStateChanged };
  const postGitAction = (body: Record<string, unknown>, options: { silentDom?: boolean } = {}, explicitRoomId?: string | null) =>
    executeGitAction(body, options, explicitRoomId || activeControlContext.roomId || roomId);

  const bindOnce = <T extends HTMLElement>(el: T | null, setup: (target: T) => void): void => {
    if (!el || el.getAttribute?.("data-bound-control") === "1") return;
    el.setAttribute?.("data-bound-control", "1");
    setup(el);
  };

  bindOnce(container.querySelector<HTMLElement>("#btn-toggle-commit-dock"), (btn) => {
    btn.addEventListener("click", () => {
      clientState.isCommitFormExpanded = !clientState.isCommitFormExpanded;
      bumpGitStateRevision();
      activeControlContext.onResetSig();
      activeControlContext.onStateChanged();
    });
  });

  bindOnce(container.querySelector<HTMLButtonElement>("#btn-git-stage-all"), (btn) => {
    btn.addEventListener("click", () => {
      btn.disabled = true;
      btn.textContent = "⏳ Staging...";
      void postGitAction({ action: "git.stage", paths: "all" });
    });
  });

  bindOnce(container.querySelector<HTMLButtonElement>("#btn-git-unstage-all"), (btn) => {
    btn.addEventListener("click", () => {
      btn.disabled = true;
      btn.textContent = "⏳ Unstaging...";
      void postGitAction({ action: "git.unstage", paths: "all" });
    });
  });

  bindOnce(container.querySelector<HTMLButtonElement>("#btn-git-refresh-status"), (btn) => {
    btn.addEventListener("click", () => {
      btn.disabled = true;
      btn.textContent = "⏳ Syncing...";
      void postGitAction({ action: "git.sync" });
    });
  });

  bindOnce(container.querySelector<HTMLElement>("#btn-git-clear-draft"), (btn) => {
    btn.addEventListener("click", () => {
      const targetRoom = activeControlContext.roomId || roomId;
      const titleEl = container.querySelector<HTMLInputElement>("#git-commit-title-input");
      const bodyEl = container.querySelector<HTMLInputElement>("#git-commit-body-input");
      if (titleEl) titleEl.value = "";
      if (bodyEl) bodyEl.value = "";
      localDraftByRoom.set(targetRoom, { title: "", body: "" });
      void postGitAction({ action: "git.draft.clear" });
    });
  });

  const handleDraftInput = () => {
    const draftRoomId = activeControlContext.roomId || roomId;
    const title = container.querySelector<HTMLInputElement>("#git-commit-title-input")?.value ?? "";
    const body = container.querySelector<HTMLInputElement>("#git-commit-body-input")?.value ?? "";
    localDraftByRoom.set(draftRoomId, { title, body });
    if (draftSyncTimer) clearTimeout(draftSyncTimer);
    draftSyncTimer = setTimeout(() => {
      void postGitAction({ action: "git.draft.update", title, body }, { silentDom: true }, draftRoomId);
    }, 350);
  };

  const executeCommitNow = () => {
    const targetRoom = activeControlContext.roomId || roomId;
    if (draftSyncTimer) { clearTimeout(draftSyncTimer); draftSyncTimer = null; }
    const titleEl = container.querySelector<HTMLInputElement>("#git-commit-title-input");
    const bodyEl = container.querySelector<HTMLInputElement>("#git-commit-body-input");
    const title = titleEl?.value.trim() || localDraftByRoom.get(targetRoom)?.title.trim() || "feat: complete goal assembly parts";
    const body = bodyEl?.value.trim() || localDraftByRoom.get(targetRoom)?.body.trim() || "";
    const commitBtn = container.querySelector<HTMLButtonElement>("#btn-git-execute-commit");
    if (commitBtn) { commitBtn.disabled = true; commitBtn.textContent = "⏳ Committing..."; }
    void postGitAction({ action: "git.commit", title, body });
  };

  bindOnce(container.querySelector<HTMLInputElement>("#git-commit-title-input"), (input) => {
    input.addEventListener("input", handleDraftInput);
    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") { ev.preventDefault(); executeCommitNow(); }
    });
  });
  bindOnce(container.querySelector<HTMLInputElement>("#git-commit-body-input"), (input) => {
    input.addEventListener("input", handleDraftInput);
  });
  bindOnce(container.querySelector<HTMLButtonElement>("#btn-git-execute-commit"), (btn) => {
    btn.addEventListener("click", executeCommitNow);
  });

  for (const btn of container.querySelectorAll<HTMLButtonElement>("button[data-git-toggle-stage]")) {
    btn.addEventListener("click", () => {
      const path = btn.getAttribute("data-git-toggle-stage");
      const isStaged = btn.getAttribute("data-git-staged") === "1";
      if (!path) return;
      btn.disabled = true;
      btn.textContent = isStaged ? "⏳ Unstaging..." : "⏳ Staging...";
      void postGitAction({ action: isStaged ? "git.unstage" : "git.stage", paths: [path] });
    });
  }

  for (const btn of container.querySelectorAll<HTMLButtonElement>("button[data-git-discard-file]")) {
    btn.addEventListener("click", () => {
      const path = btn.getAttribute("data-git-discard-file");
      if (!path) return;
      btn.disabled = true;
      btn.textContent = "⏳ Discarding...";
      void postGitAction({ action: "git.discard", paths: [path] });
    });
  }

  for (const btn of container.querySelectorAll<HTMLButtonElement>("button[data-git-preview-file]")) {
    btn.addEventListener("click", async () => {
      if (hasActiveTextSelection(btn)) return;
      const path = btn.getAttribute("data-git-preview-file");
      if (!path) return;
      const previewRoomId = activeControlContext.roomId || roomId;
      clientState.selectedCommitFilePath = clientState.selectedCommitFilePath === path ? null : path;
      if (clientState.selectedCommitFilePath) {
        try {
          const res = await fetch(`/api/guild/git?roomId=${encodeURIComponent(previewRoomId)}&file=${encodeURIComponent(path)}`, { headers: getOperatorHeaders() });
          if (res.ok) {
            const payload = await res.json();
            if (typeof payload?.diff === "string") cachedDiffByFile.set(`${previewRoomId || ""}::${path}`, payload.diff);
          }
        } catch { /* Ignore diff error */ }
      }
      bumpGitStateRevision();
      activeControlContext.onResetSig();
      activeControlContext.onStateChanged();
    });
  }
}
