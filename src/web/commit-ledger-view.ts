import { escapeHtml, type GuildMasterLedgerViewModel } from "../hud/spectator-hud.ts";
import type { RoomGitWorkingTreeState } from "../ingress/index.ts";
import { clientState } from "./client-state.ts";

export interface CommitLedgerViewOptions {
  readonly cachedDiffByFile: ReadonlyMap<string, string>;
  readonly localDraftByRoom: ReadonlyMap<string, { title: string; body: string }>;
  readonly lastCommitFeedbackText: string;
  readonly roomId?: string;
  readonly inFlightAction?: string | null;
  readonly inFlightFileActions?: ReadonlyMap<string, "stage" | "unstage" | "discard"> | null;
}

const DELIVERABLE_KIND_BADGES: Readonly<Record<string, string>> = Object.freeze({
  "file-change": "📝 FILE",
  "issue-fixed": "🛠️ FIX",
  subagent: "📜 SUBAGENT",
  quest: "⚔️ QUEST",
  "feature-task": "🔩 TASK",
});

export function renderProjectMiniAssembliesStripHtml(
  projectAssemblies: GuildMasterLedgerViewModel["activeGoalAssembly"]["projectAssemblies"],
): string {
  if (!projectAssemblies || projectAssemblies.length === 0) return "";
  const pillsHtml = projectAssemblies
    .map((p) => {
      const badgeHtml =
        p.status === "complete"
          ? `<span class="val-emerald">★ DONE ${p.fittedCount}/${p.totalParts} (100%)</span>`
          : p.status === "in-progress"
            ? `<span class="val-gold">⚙️ ${p.fittedCount}/${p.totalParts} (${p.percentComplete}%)</span>`
            : p.status === "open"
              ? `<span class="val-sky">📐 0/${p.totalParts} OPEN</span>`
              : `<span class="val-sky">✨ READY 0/0</span>`;
      const chipTone = p.status === "complete" ? "complete" : p.status === "in-progress" ? "active" : "ready";
      return `<button type="button" class="btn btn-compact-action project-mini-assembly-pill mini-assembly-status-${escapeHtml(p.status)} mini-assembly-chip-${chipTone}" data-herald-party="${escapeHtml(p.partyKey)}" data-select-commit-project="${escapeHtml(p.projectId)}" title="${escapeHtml(p.crestIcon)} ${escapeHtml(p.projectName)} [${escapeHtml(p.shortTag)}] — ${escapeHtml(p.statusLabel)} (${p.fittedCount}/${p.totalParts})"><span>${escapeHtml(p.crestIcon)} <strong>${escapeHtml(p.shortTag)}</strong></span>${badgeHtml}</button>`;
    })
    .join("");
  return `<div class="project-mini-assemblies-strip" role="group" aria-label="Project Mini-Assemblies">${pillsHtml}</div>`;
}

export function renderOverviewAssemblyShowcaseCardHtml(
  assemblyVm: GuildMasterLedgerViewModel["activeGoalAssembly"],
  options?: { isSyncing?: boolean; syncDelta?: string; feedbackText?: string },
): string {
  if (!assemblyVm) return "";
  const { totalParts, fittedCount, percentComplete, sourceLabel, metrics, projectAssemblies } =
    assemblyVm;
  const effectiveSourceLabel =
    sourceLabel ||
    (totalParts > 0 ? `${fittedCount}/${totalParts} Assembly Parts` : "✨ Blueprint Ready (0/0)");
  const miniStripHtml =
    projectAssemblies && projectAssemblies.length > 0
      ? renderProjectMiniAssembliesStripHtml(projectAssemblies)
      : "";
  const hasMetrics =
    metrics.completedQuestsCount > 0 ||
    metrics.filesModifiedCount > 0 ||
    metrics.issuesFixedCount > 0 ||
    metrics.subagentReportsCount > 0;
  const metricsHtml = hasMetrics
    ? `<div class="ledger-telemetry-ribbon"><span>✅ <strong>${metrics.completedQuestsCount}</strong> Quests</span><span>📝 <strong>${metrics.filesModifiedCount}</strong> Files</span><span>🛠️ <strong>${metrics.issuesFixedCount}</strong> Fixes</span><span>📜 <strong>${metrics.subagentReportsCount}</strong> Subagents</span></div>`
    : "";
  const isSyncing = Boolean(options?.isSyncing);
  const syncLabel = isSyncing ? "⏳ Syncing..." : `🔄 Sync Git${options?.syncDelta || ""}`;
  const feedbackHtml = options?.feedbackText ? `<div class="dispatch-user-row">${escapeHtml(options.feedbackText)}</div>` : "";
  return `
    <div class="sheet-card">
      <div class="sheet-card-title">
        <span>⚙️ Goal Assembly Site &amp; Results</span>
        <span class="val-gold">${fittedCount}/${totalParts} (${percentComplete}%)</span>
      </div>
      <div class="char-inline-fact" style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:6px">
        <span class="val-sky">${escapeHtml(effectiveSourceLabel)}</span>
        <button type="button" class="btn btn-compact-action" data-git-sync="overview" ${isSyncing ? "disabled" : ""}>${syncLabel}</button>
      </div>
      ${feedbackHtml}
      ${miniStripHtml}
      ${metricsHtml}
    </div>
  `;
}

export function renderProjectBrowserRowHtml(
  hostHeraldries: ReadonlyArray<{
    projectId: string;
    projectName: string;
    shortTag: string;
    crestIcon: string;
    partyKey: string;
  }>,
  activeRoom: {
    roomId: string;
    locationDirectory: string;
    projectId?: string;
    projectName: string;
  } | null,
  selectedProjectId: string | null,
): string {
  if (hostHeraldries.length === 0) return "";
  const matchedIndex = hostHeraldries.findIndex((hp) =>
    Boolean(
      activeRoom &&
        (activeRoom.roomId === hp.projectId ||
          activeRoom.locationDirectory === hp.projectId ||
          activeRoom.projectId === hp.projectId ||
          activeRoom.projectName === hp.projectName),
    ),
  );
  const selectedIndex = hostHeraldries.findIndex(
    (hp) =>
      Boolean(selectedProjectId) &&
      (selectedProjectId === hp.projectId || selectedProjectId === hp.projectName),
  );
  const isAllWorldsActive = matchedIndex < 0 && selectedIndex < 0;
  const fallbackIndex = matchedIndex >= 0 ? matchedIndex : Math.max(0, selectedIndex);
  const total = hostHeraldries.length;
  const currentHp = hostHeraldries[fallbackIndex] ?? hostHeraldries[0]!;
  const prevHp = isAllWorldsActive
    ? (hostHeraldries[total - 1] ?? currentHp)
    : (hostHeraldries[(fallbackIndex - 1 + total) % total] ?? currentHp);
  const nextHp = isAllWorldsActive
    ? (hostHeraldries[0] ?? currentHp)
    : (hostHeraldries[(fallbackIndex + 1) % total] ?? currentHp);
  const isCurrentActive = matchedIndex >= 0 || selectedIndex >= 0;
  const navDisabledAttr = total <= 1 && isCurrentActive ? " disabled" : "";

  if (isAllWorldsActive) {
    return `<div class="project-browser-row" role="group" aria-label="Project Repository Browser"><button type="button" class="btn project-browser-nav-btn" data-project-nav="prev" data-select-commit-project="${escapeHtml(prevHp.projectId)}" title="Previous project: ${escapeHtml(prevHp.projectName)} [${escapeHtml(prevHp.shortTag)}]" aria-label="Previous project: ${escapeHtml(prevHp.projectName)}"${navDisabledAttr}>◀</button><button type="button" class="btn subtab-btn project-browser-current-btn active" data-select-commit-project="${escapeHtml(currentHp.projectId)}" title="🌐 All Worlds (${total}) — Click to select ${escapeHtml(currentHp.projectName)} [${escapeHtml(currentHp.shortTag)}]"><span class="project-browser-label">🌐 All Worlds</span><span class="project-browser-count">${total} ${total === 1 ? "world" : "worlds"}</span></button><button type="button" class="btn project-browser-nav-btn" data-project-nav="next" data-select-commit-project="${escapeHtml(nextHp.projectId)}" title="Next project: ${escapeHtml(nextHp.projectName)} [${escapeHtml(nextHp.shortTag)}]" aria-label="Next project: ${escapeHtml(nextHp.projectName)}"${navDisabledAttr}>▶</button></div>`;
  }

  return `<div class="project-browser-row" role="group" aria-label="Project Repository Browser"><button type="button" class="btn project-browser-nav-btn" data-project-nav="prev" data-select-commit-project="${escapeHtml(prevHp.projectId)}" title="Previous project: ${escapeHtml(prevHp.projectName)} [${escapeHtml(prevHp.shortTag)}]" aria-label="Previous project: ${escapeHtml(prevHp.projectName)}"${navDisabledAttr}>◀</button><button type="button" class="btn subtab-btn project-browser-current-btn ${isCurrentActive ? "active" : ""}" data-herald-party="${escapeHtml(currentHp.partyKey)}" data-select-commit-project="${escapeHtml(currentHp.projectId)}" title="${escapeHtml(currentHp.crestIcon)} ${escapeHtml(currentHp.projectName)} [${escapeHtml(currentHp.shortTag)}] (${fallbackIndex + 1}/${total})"><span class="project-browser-label">${escapeHtml(currentHp.crestIcon)} ${escapeHtml(currentHp.projectName)} [${escapeHtml(currentHp.shortTag)}]</span><span class="project-browser-count">${fallbackIndex + 1}/${total}</span></button><button type="button" class="btn project-browser-nav-btn" data-project-nav="next" data-select-commit-project="${escapeHtml(nextHp.projectId)}" title="Next project: ${escapeHtml(nextHp.projectName)} [${escapeHtml(nextHp.shortTag)}]" aria-label="Next project: ${escapeHtml(nextHp.projectName)}"${navDisabledAttr}>▶</button></div>`;
}

export function renderAssemblyShowcaseCardHtml(
  assemblyVm: GuildMasterLedgerViewModel["activeGoalAssembly"],
  repoSelectorHtml: string,
  activeRoomName: string | null,
): string {
  const { totalParts, fittedCount, percentComplete, sourceLabel, metrics, deliverables, projectAssemblies, isMultiProjectScope } =
    assemblyVm;
  const effectiveSourceLabel =
    sourceLabel ||
    (totalParts > 0 ? `${fittedCount}/${totalParts} Assembly Parts` : "✨ Blueprint Ready (0/0)");
  const scopeLabel = activeRoomName ? escapeHtml(activeRoomName) : "🌐 All Guild Worlds";
  const miniStripHtml =
    (isMultiProjectScope || !activeRoomName) && projectAssemblies && projectAssemblies.length > 0
      ? renderProjectMiniAssembliesStripHtml(projectAssemblies)
      : "";
  const deliverablesHtml =
    deliverables.length > 0
      ? `<div class="sheet-scroll-list assembly-tasks-scroll-list">${deliverables
          .map((d) => {
            const icon = d.status === "fitted" ? "✅" : "⏳";
            const kindBadge = DELIVERABLE_KIND_BADGES[d.kind] ?? "🔩 PART";
            const projPill = `<span class="roster-project-pill" data-herald-party="${escapeHtml(d.partyKey)}">[${escapeHtml(d.crestIcon)} ${escapeHtml(d.shortTag)}]</span>`;
            const titleLabel =
              d.kind === "feature-task"
                ? `#${escapeHtml(d.id)} ${escapeHtml(d.title)}`
                : escapeHtml(d.title);
            const jumpAttr = d.sessionId ? ` data-select-session="${escapeHtml(d.sessionId)}"` : "";
            return `<div class="tool-log-entry"${jumpAttr}><div class="tool-log-header"><strong class="tool-log-name">${icon} ${projPill} <span class="val-sky">[${kindBadge}]</span> ${titleLabel}</strong><span class="tool-log-station">${escapeHtml(d.subtitle || d.status)}</span></div></div>`;
          })
          .join("")}</div>`
      : `<div class="muted-empty-text">✨ Blueprint Ready (0/0). Start a task or edit files to assemble parts.</div>`;

  return `
    <div class="sheet-card">
      <div class="sheet-card-title">
        <span>⚙️ Goal Assembly Site · ${scopeLabel}</span>
        <span class="val-gold">${fittedCount}/${totalParts} (${percentComplete}%)</span>
      </div>
      ${repoSelectorHtml}
      ${miniStripHtml}
      <div class="char-inline-fact" style="margin-bottom:6px"><span class="val-sky">${escapeHtml(effectiveSourceLabel)}</span></div>
      <div class="ledger-telemetry-ribbon">
        <span>✅ <strong>${metrics.completedQuestsCount}</strong> Quests</span>
        <span>⏳ <strong>${metrics.activeQuestsCount}</strong> Active</span>
        <span>📝 <strong>${metrics.filesModifiedCount}</strong> Files</span>
        <span>🛠️ <strong>${metrics.issuesFixedCount}</strong> Fixes</span>
        <span>📜 <strong>${metrics.subagentReportsCount}</strong> Subagents</span>
      </div>
      ${deliverablesHtml}
    </div>
  `;
}

export function renderUnselectedProjectCommitHtml(options?: { isSyncing?: boolean; feedbackText?: string }): string {
  const isSyncing = Boolean(options?.isSyncing);
  const feedbackHtml = options?.feedbackText ? `<div class="dispatch-user-row">${escapeHtml(options.feedbackText)}</div>` : "";
  return `<div class="sheet-card commit-ledger-card sheet-card-flex-fill"><div class="sheet-card-title"><span>📦 Assembly Commit Ledger (Git CRUD)</span><span class="val-gold">Select Project</span></div>${feedbackHtml}<div class="gate-actions-row"><button type="button" class="btn btn-compact-action" id="btn-git-refresh-status" data-git-sync="all" ${isSyncing ? "disabled" : ""}>${isSyncing ? "⏳ Syncing..." : "🔄 Sync Git"}</button></div><div class="muted-empty-text">Select a project repository above — only the selected project is subject to Assembly &amp; Commit Git operations.</div></div>`;
}

export function renderCommitFilesListHtmlWithContext(
  gitState: RoomGitWorkingTreeState | null,
  selectedFilePath: string | null,
  explicitDiffText: string | null | undefined,
  ctx: CommitLedgerViewOptions,
): string {
  const isSyncingStatus = ctx.inFlightAction === "git.status" || ctx.inFlightAction === "git.sync";
  if (!gitState) {
    return `<div class="sheet-card commit-ledger-card sheet-card-flex-fill"><div class="sheet-card-title"><span>📦 Assembly Commit Ledger (Git CRUD)</span><span class="val-sky">Syncing...</span></div><div class="gate-actions-row"><button type="button" class="btn btn-compact-action" id="btn-git-refresh-status" data-git-sync="room" ${isSyncingStatus ? "disabled" : ""}>${isSyncingStatus ? "⏳ Syncing..." : "🔄 Sync Git"}</button></div><div class="muted-empty-text">Inspecting selected project Git working tree...</div></div>`;
  }

  const files = gitState.files || [];
  const stagedCount = files.filter((f) => f.staged).length;
  const headLabel = gitState.headCommit
    ? `${escapeHtml(gitState.headCommit.hash)} · ${escapeHtml(gitState.headCommit.subject.slice(0, 48))}`
    : "No commits yet";
  const ahead = gitState.ahead ?? 0;
  const behind = gitState.behind ?? 0;
  const syncDelta = `${ahead > 0 ? ` ↑${ahead}` : ""}${behind > 0 ? ` ↓${behind}` : ""}`;
  const branchLabel = gitState.branch ? `🌿 ${escapeHtml(gitState.branch)}${syncDelta}` : "No Git Repo";

  const fileRowsHtml =
    files.length > 0
      ? files
          .map((f) => {
            const statusTag = f.staged
              ? `<span class="val-emerald">[STAGED]</span>`
              : f.indexStatus === "?"
                ? `<span class="val-sky">[NEW]</span>`
                : `<span class="val-gold">[MOD]</span>`;
            const isSelected = selectedFilePath === f.path;
            const fileAction = ctx.inFlightFileActions?.get(f.path) ?? null;
            const fileDisAttr = fileAction ? " disabled" : "";
            const stageLabel = fileAction === "stage" ? "⏳ Staging..." : fileAction === "unstage" ? "⏳ Unstaging..." : (f.staged ? "Unstage" : "Stage");
            const discardLabel = fileAction === "discard" ? "⏳ Discarding..." : "Discard";
            return `<div class="tool-log-entry commit-file-row ${isSelected ? "active" : ""}" data-commit-file-path="${escapeHtml(f.path)}"><div class="tool-log-header"><button type="button" class="btn btn-compact-action" data-git-preview-file="${escapeHtml(f.path)}">${statusTag} <strong class="tool-log-name">${escapeHtml(f.path)}</strong></button><span class="tool-log-station">+${f.additions} / -${f.deletions}</span></div><div class="gate-actions-row"><button type="button" class="btn btn-compact-action" data-git-toggle-stage="${escapeHtml(f.path)}" data-git-staged="${f.staged ? "1" : "0"}"${fileDisAttr}>${stageLabel}</button><button type="button" class="btn btn-compact-action" data-git-discard-file="${escapeHtml(f.path)}"${fileDisAttr}>${discardLabel}</button></div></div>`;
          })
          .join("")
      : `<div class="muted-empty-text">✨ Working tree is clean (0 uncommitted files). Goal Assembly is reset and Blueprint Ready!</div>`;

  const scopedDiffKey = `${ctx.roomId || ""}::${selectedFilePath || ""}`;
  const resolvedDiff =
    explicitDiffText ??
    (selectedFilePath
      ? (ctx.cachedDiffByFile.get(scopedDiffKey) ??
          (!ctx.roomId ? ctx.cachedDiffByFile.get(selectedFilePath) : undefined))
      : undefined);
  const diffPreview =
    selectedFilePath && resolvedDiff
      ? `<div class="tool-log-entry"><div class="tool-log-header"><strong class="val-sky">Diff: ${escapeHtml(selectedFilePath)}</strong></div><div class="diff-preview-pre">${escapeHtml(resolvedDiff.slice(0, 1600))}</div></div>`
      : "";

  const errorOrFeedbackText = gitState.lastError ? `⚠️ ${gitState.lastError}` : ctx.lastCommitFeedbackText;
  const feedbackBannerHtml = errorOrFeedbackText ? `<div class="dispatch-user-row">${escapeHtml(errorOrFeedbackText)}</div>` : "";
  const isStagingAll = ctx.inFlightAction === "git.stage";
  const isUnstagingAll = ctx.inFlightAction === "git.unstage";
  const syncBtnLabel = isSyncingStatus ? "⏳ Syncing..." : `🔄 Sync Git${syncDelta}`;

  return `
    <div class="sheet-card commit-ledger-card sheet-card-flex-fill">
      <div class="sheet-card-title">
        <span>📦 Assembly Commit Ledger (CRUD)</span>
        <span>${branchLabel} · ${stagedCount}/${files.length} staged</span>
      </div>
      <div class="ledger-body-text">HEAD: <strong>${headLabel}</strong></div>
      ${feedbackBannerHtml}
      <div class="gate-actions-row">
        <button type="button" class="btn btn-compact-action" id="btn-git-stage-all" ${files.length === 0 || isStagingAll ? "disabled" : ""}>${isStagingAll ? "⏳ Staging..." : `Stage All (${files.length})`}</button>
        <button type="button" class="btn btn-compact-action" id="btn-git-unstage-all" ${stagedCount === 0 || isUnstagingAll ? "disabled" : ""}>${isUnstagingAll ? "⏳ Unstaging..." : `Unstage All (${stagedCount})`}</button>
        <button type="button" class="btn btn-compact-action" id="btn-git-refresh-status" data-git-sync="room" ${isSyncingStatus ? "disabled" : ""}>${syncBtnLabel}</button>
      </div>
      <div class="sheet-scroll-list">
        ${fileRowsHtml}
        ${diffPreview}
      </div>
    </div>
  `;
}

export function renderCommitLedgerDockHtmlWithContext(
  gitState: RoomGitWorkingTreeState | null,
  suggestedTitle: string,
  roomId: string,
  localDraftByRoom: ReadonlyMap<string, { title: string; body: string }>,
  inFlightAction?: string | null,
): string {
  const files = gitState?.files || [];
  const stagedCount = files.filter((f) => f.staged).length;
  const localDraft = roomId ? localDraftByRoom.get(roomId) : undefined;
  const draftTitleVal =
    localDraft?.title ?? (gitState?.draftCommitTitle || suggestedTitle);
  const draftBodyVal = localDraft?.body ?? (gitState?.draftCommitBody || "");
  const isExpanded = Boolean(clientState.isCommitFormExpanded);
  const isCommitting = inFlightAction === "git.commit";
  const stateClass =
    files.length === 0
      ? "is-gate-hidden"
      : isExpanded
        ? "is-expanded"
        : "is-collapsed";
  const commitCtaLabel = isCommitting
    ? "⏳ Committing..."
    : stagedCount > 0
      ? `🚀 Seal &amp; Commit (${stagedCount} staged)`
      : `🚀 Stage All &amp; Commit (${files.length})`;

  return `
    <div class="sheet-card command-scroll-card ${stateClass}" data-commit-dock-room="${escapeHtml(roomId)}">
      <div class="sheet-card-title command-scroll-header" id="btn-toggle-commit-dock">
        <span>🚀 Prepare Commit (${stagedCount}/${files.length} staged)</span>
        <span class="val-gold">${isExpanded ? "Collapse ▾" : "Compose Commit ▴"}</span>
      </div>
      <div class="command-scroll-body modal-form-grid">
        <label class="modal-field-label" for="git-commit-title-input">Commit Message Title</label>
        <input id="git-commit-title-input" class="modal-input" type="text" value="${escapeHtml(draftTitleVal)}" placeholder="feat: complete goal assembly parts..." />
        <label class="modal-field-label" for="git-commit-body-input">Commit Description (Optional)</label>
        <input id="git-commit-body-input" class="modal-input" type="text" value="${escapeHtml(draftBodyVal)}" placeholder="Optional commit description..." />
        <div class="gate-actions-row">
          <button type="button" class="btn btn-summon-cta" id="btn-git-execute-commit" ${files.length === 0 || isCommitting ? "disabled" : ""}>
            ${commitCtaLabel}
          </button>
          <button type="button" class="btn btn-compact-action" id="btn-git-clear-draft">
            Clear Draft
          </button>
        </div>
      </div>
    </div>
  `;
}

export function reconcileCommitLedgerDockWithContext(
  interactiveSlot: HTMLElement,
  roomId: string,
  gitState: RoomGitWorkingTreeState | null,
  suggestedTitle: string,
  localDraftByRoom: ReadonlyMap<string, { title: string; body: string }>,
  inFlightAction?: string | null,
): void {
  const files = gitState?.files || [];
  const stagedCount = files.filter((f) => f.staged).length;
  const isCommitting = inFlightAction === "git.commit";
  if (files.length === 0) interactiveSlot.classList.add("is-hidden");
  else interactiveSlot.classList.remove("is-hidden");

  const existingCard =
    typeof interactiveSlot.querySelector === "function"
      ? (interactiveSlot.querySelector("[data-commit-dock-room]") as HTMLElement | null)
      : null;

  if (existingCard && existingCard.getAttribute("data-commit-dock-room") === roomId) {
    const isExpanded = Boolean(clientState.isCommitFormExpanded);
    existingCard.className = `sheet-card command-scroll-card ${files.length === 0 ? "is-gate-hidden" : isExpanded ? "is-expanded" : "is-collapsed"}`;
    const toggleHeader = existingCard.querySelector("#btn-toggle-commit-dock");
    if (toggleHeader) {
      toggleHeader.innerHTML = `<span>🚀 Prepare Commit (${stagedCount}/${files.length} staged)</span><span class="val-gold">${isExpanded ? "Collapse ▾" : "Compose Commit ▴"}</span>`;
    }
    const commitBtn = existingCard.querySelector("#btn-git-execute-commit") as HTMLButtonElement | null;
    if (commitBtn) {
      commitBtn.disabled = files.length === 0 || isCommitting;
      commitBtn.textContent = isCommitting
        ? "⏳ Committing..."
        : stagedCount > 0
          ? `🚀 Seal & Commit (${stagedCount} staged)`
          : `🚀 Stage All & Commit (${files.length})`;
    }
    const activeEl = typeof document !== "undefined" ? document.activeElement : null;
    const titleEl = existingCard.querySelector("#git-commit-title-input") as HTMLInputElement | null;
    const bodyEl = existingCard.querySelector("#git-commit-body-input") as HTMLInputElement | null;
    const localDraft = localDraftByRoom.get(roomId);
    if (titleEl && activeEl !== titleEl) {
      const desiredTitle = localDraft?.title ?? (gitState?.draftCommitTitle || suggestedTitle);
      if (titleEl.value !== desiredTitle) titleEl.value = desiredTitle;
    }
    if (bodyEl && activeEl !== bodyEl) {
      const desiredBody = localDraft?.body ?? (gitState?.draftCommitBody || "");
      if (bodyEl.value !== desiredBody) bodyEl.value = desiredBody;
    }
    return;
  }

  interactiveSlot.innerHTML = renderCommitLedgerDockHtmlWithContext(
    gitState,
    suggestedTitle,
    roomId,
    localDraftByRoom,
    inFlightAction,
  );
}
