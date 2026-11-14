import { buildActivityTickerViewModel, buildGuildMasterLedgerViewModel, escapeHtml, formatInlineMarkdown, sanitizeAndExtractSkillsFromChatText } from "../hud/spectator-hud.ts";
import { listHostProjectHeraldries, resolveProjectHeraldry } from "../spatial/index.ts";
import { deriveScopedGameMasterBugMonsters } from "./canvas-wilds-painter.ts";
import {
  clientState, getScopedGameMasterCharacters, getSelectedProjectRoom, hasCharacterUnviewedResult, isCharacterWaitingAtGate,
  type LedgerCategorySubtab, reconcileMobileDrawerSelection, selectCommitRepository,
} from "./client-state.ts";
import { acknowledgeSessionResultAsRead } from "./command-scroll-controller.ts";
import {
  bindCommitLedgerControls, getCachedRoomGitState, getLastCommitFeedbackText, isGitSyncInFlight,
  reconcileCommitLedgerDock, refreshRoomGitState, renderAssemblyShowcaseCardHtml, renderCommitFilesListHtml,
  renderOverviewAssemblyShowcaseCardHtml, renderProjectBrowserRowHtml, renderUnselectedProjectCommitHtml, triggerGitSync,
} from "./commit-ledger-controller.ts";
import { openDemolitionModal } from "./demolition-modal-controller.ts";
import { syncDesktopSplitRatioDom } from "./layout-resizer.ts";
import { isRoomDemolishing } from "./snapshot-gate.ts";
import { resolveCharacterDisplayBadge } from "./station-and-workflow-routing.ts";
import { openSummonAdventurerModal } from "./summon-adventurer-controller.ts";
import { hasActiveTextSelection } from "./text-selection-guard.ts";

export { escapeHtml };

let lastTickerSignature = "";
export function resetTickerSignature(): void { lastTickerSignature = ""; }

function renderLedgerSubtabBarHtml(activeSubtab: LedgerCategorySubtab, resolvedTasks: number, totalTasks: number, rosterCount: number): string {
  const effectiveSubtab = activeSubtab === "roster" ? "overview" : activeSubtab;
  const tabs: Array<{ id: LedgerCategorySubtab; label: string }> = [
    { id: "overview", label: `🏰 Overview<span class="subtab-desktop-suffix"> &amp; Roster</span> (${rosterCount})` },
    { id: "assembly", label: `⚙️ Assembly<span class="subtab-desktop-suffix"> &amp; Commit</span> (${resolvedTasks}/${totalTasks})` },
  ];
  return `<div class="subtab-deck-bar" role="tablist" aria-label="Guild Master Ledger Categories">${tabs
    .map((t) => `<button type="button" class="btn subtab-btn ${effectiveSubtab === t.id ? "active" : ""}" data-ledger-subtab="${t.id}">${t.label}</button>`)
    .join("")}</div>`;
}

function renderCharacterRosterRowsHtml(
  chars: ReturnType<typeof getScopedGameMasterCharacters>,
  hasBugs: boolean,
): string {
  if (chars.length === 0) {
    return `<div class="muted-empty-text">No active sessions in this room.</div>`;
  }
  return chars
    .map((ch) => {
      const heraldry = resolveProjectHeraldry(ch, clientState.currentSnapshot);
      const badge = resolveCharacterDisplayBadge(ch, hasBugs);
      const wfClass =
        badge.workflowIntent === "debugging-hunt"
          ? "val-red"
          : badge.workflowIntent === "information-gathering"
            ? "val-sky"
            : "val-gold";
      const wfBadge = `<span class="${wfClass}">${badge.workflowShortLabel}</span>`;
      const gateTag = isCharacterWaitingAtGate(ch)
        ? `<span class="roster-gate-tag">[${escapeHtml(ch.questGate?.marker || "?")}] </span>`
        : hasCharacterUnviewedResult(ch)
          ? `<span class="roster-gate-tag">[${ch.turnOutcome === "failed" || ch.errorState ? "⚠️" : ch.turnOutcome === "interrupted" ? "⏹" : "✓"}] </span>`
          : "";
      const projTag = `<span class="roster-project-pill" data-herald-party="${escapeHtml(heraldry.partyKey)}">[${escapeHtml(heraldry.crestIcon)} ${escapeHtml(heraldry.shortTag)}]</span>`;
      return `<button type="button" class="btn roster-row-btn" data-select-session="${escapeHtml(ch.sessionId)}"><span class="roster-row-title">${projTag} ⚔️ ${gateTag}${escapeHtml(ch.title || ch.sessionId)}</span><span class="roster-row-meta">${wfBadge} · ${escapeHtml(badge.overheadVerb)}</span></button>`;
    })
    .join("");
}

export function renderGuildMasterLedgerPanel(
  container: HTMLElement,
  onResetSig: () => void,
  onStateChanged: () => void,
): void {
  const activeRoom = getSelectedProjectRoom();
  const visibleChars = getScopedGameMasterCharacters();
  const bugs = deriveScopedGameMasterBugMonsters();
  const isAllWorlds =
    clientState.isAllWorldsFocused ||
    (!clientState.selectedProjectId && !clientState.selectedRoomId && !activeRoom);
  const ledger = buildGuildMasterLedgerViewModel(clientState.currentSnapshot, {
    selectedRoomId: activeRoom?.roomId ?? clientState.selectedRoomId,
    selectedProjectId: clientState.selectedProjectId,
    isAllWorldsFocused: isAllWorlds,
  });
  const taskProg = activeRoom?.taskProgress;
  const totalTasks = ledger.activeGoalAssembly.totalParts;
  const resolvedTasks = ledger.activeGoalAssembly.fittedCount;
  const activeBug = bugs[0];
  const waitingGateChars = visibleChars.filter((c) => isCharacterWaitingAtGate(c));
  const unviewedResultChars = visibleChars.filter((c) => hasCharacterUnviewedResult(c));
  const activeSubtab = clientState.ledgerSubtab;
  const subtabBarHtml = renderLedgerSubtabBarHtml(activeSubtab, resolvedTasks, totalTasks, visibleChars.length);

  let headerSlot = container.querySelector("#sheet-header-slot") as HTMLElement | null;
  let interactiveSlot = container.querySelector("#sheet-interactive-slot") as HTMLElement | null;
  let staticSlot = container.querySelector("#sheet-static-slot") as HTMLElement | null;
  if (!headerSlot || !interactiveSlot || !staticSlot) {
    container.innerHTML = `<div id="sheet-header-slot">${subtabBarHtml}</div><div id="sheet-interactive-slot"></div><div id="sheet-static-slot"></div>`;
    headerSlot = container.querySelector("#sheet-header-slot") as HTMLElement | null;
    interactiveSlot = container.querySelector("#sheet-interactive-slot") as HTMLElement | null;
    staticSlot = container.querySelector("#sheet-static-slot") as HTMLElement | null;
    if (!headerSlot || !interactiveSlot || !staticSlot) return;
  }

  const prevStaticScrollTop = staticSlot.scrollTop ?? 0;
  const prevInnerScrolls = Array.from(staticSlot.querySelectorAll?.(".sheet-scroll-list") ?? []).map((el) => (el as HTMLElement).scrollTop ?? 0);
  const existingLedgerBtns = headerSlot.querySelectorAll?.<HTMLButtonElement>("button[data-ledger-subtab]") ?? [];
  if (existingLedgerBtns.length === 2) {
    const effectiveSub = activeSubtab === "roster" ? "overview" : activeSubtab;
    for (const btn of existingLedgerBtns) {
      const id = btn.getAttribute("data-ledger-subtab");
      btn.classList?.toggle("active", id === effectiveSub);
      btn.innerHTML = id === "assembly"
        ? `⚙️ Assembly<span class="subtab-desktop-suffix"> &amp; Commit</span> (${resolvedTasks}/${totalTasks})`
        : `🏰 Overview<span class="subtab-desktop-suffix"> &amp; Roster</span> (${visibleChars.length})`;
    }
  } else {
    headerSlot.innerHTML = subtabBarHtml;
  }

  if (activeSubtab === "assembly") {
    const hostHeraldries = listHostProjectHeraldries(clientState.currentSnapshot);
    const repoSelectorHtml = renderProjectBrowserRowHtml(hostHeraldries, activeRoom, clientState.selectedProjectId);

    if (!activeRoom) {
      staticSlot.innerHTML = `${renderAssemblyShowcaseCardHtml(ledger.activeGoalAssembly, repoSelectorHtml, null)}${renderUnselectedProjectCommitHtml({ isSyncing: isGitSyncInFlight("all"), feedbackText: getLastCommitFeedbackText() })}`;
      interactiveSlot.classList.add("is-hidden");
      interactiveSlot.innerHTML = "";
    } else {
      const roomId = activeRoom.roomId;
      const gitState = getCachedRoomGitState(roomId);
      if (!gitState && typeof window !== "undefined") {
        void refreshRoomGitState(roomId, () => { onResetSig(); onStateChanged(); });
      }
      const slug = taskProg?.featureSlug;
      const suggestedCommitTitle =
        slug && slug !== "Blueprint Ready" && slug !== "Working Tree Changes"
          ? `feat(${slug}): complete ${resolvedTasks}/${totalTasks} assembly parts`
          : "";

      staticSlot.innerHTML = `${renderAssemblyShowcaseCardHtml(ledger.activeGoalAssembly, repoSelectorHtml, activeRoom.projectName)}${renderCommitFilesListHtml(gitState, clientState.selectedCommitFilePath, undefined, roomId)}`;
      reconcileCommitLedgerDock(interactiveSlot, roomId, gitState, suggestedCommitTitle);
    }
  } else {
    const activeGitState = activeRoom?.roomId ? getCachedRoomGitState(activeRoom.roomId) : null;
    if (activeRoom?.roomId && !activeGitState && typeof window !== "undefined") {
      void refreshRoomGitState(activeRoom.roomId, () => { onResetSig(); onStateChanged(); });
    }
    const ovAhead = activeGitState?.ahead ?? 0;
    const ovBehind = activeGitState?.behind ?? 0;
    const ovSyncDelta = `${ovAhead > 0 ? ` ↑${ovAhead}` : ""}${ovBehind > 0 ? ` ↓${ovBehind}` : ""}`;
    const ovSyncing = isGitSyncInFlight(activeRoom?.roomId ?? "all");
    const ovFeedback = activeGitState?.lastError ? `⚠️ ${activeGitState.lastError}` : getLastCommitFeedbackText();
    const demolishRoom = isAllWorlds
      ? null
      : (activeRoom ?? (clientState.selectedProjectId ? { roomId: clientState.selectedProjectId } : null));
    const focusedCharsCount = visibleChars.length;
    const rosterChars = clientState.showSubagentsInRoster
      ? visibleChars
      : visibleChars.filter((c) => !(c.parentId || c.parentSessionId || c.role === "Squad Subagent"));
    const gateAlertRowsHtml = waitingGateChars
      .map((ch) => {
        const heraldry = resolveProjectHeraldry(ch, clientState.currentSnapshot);
        const projTag = `<span class="roster-project-pill" data-herald-party="${escapeHtml(heraldry.partyKey)}">[${escapeHtml(heraldry.crestIcon)} ${escapeHtml(heraldry.shortTag)}]</span>`;
        const marker = ch.questGate?.kind === "permission" ? "⚠️ !" : "❓ ?";
        const rawReason = sanitizeAndExtractSkillsFromChatText(ch.questGate?.reason || ch.questGate?.title || "Awaiting input").cleanText.replace(/\s+/g, " ").trim();
        const reasonPreview = rawReason.length > 110 ? `${rawReason.slice(0, 109)}…` : rawReason;
        return `<button type="button" class="btn roster-row-btn roster-row-gate" data-select-session="${escapeHtml(ch.sessionId)}"><span class="roster-row-title-bold">${projTag} ${marker} ${escapeHtml(ch.title || ch.sessionId)}</span><span class="roster-row-reason">${formatInlineMarkdown(reasonPreview)} →</span></button>`;
      })
      .join("");

    const unviewedAlertRowsHtml = unviewedResultChars
      .map((ch) => {
        const heraldry = resolveProjectHeraldry(ch, clientState.currentSnapshot);
        const projTag = `<span class="roster-project-pill" data-herald-party="${escapeHtml(heraldry.partyKey)}">[${escapeHtml(heraldry.crestIcon)} ${escapeHtml(heraldry.shortTag)}]</span>`;
        const statusIcon = ch.turnOutcome === "failed" || ch.errorState ? "⚠️" : ch.turnOutcome === "interrupted" ? "⏹" : "✓";
        const latestAsstMsg = [...(ch.messages ?? [])].reverse().find((m) => m.role === "assistant")?.text;
        const cleanReply = sanitizeAndExtractSkillsFromChatText(ch.lastAssistantText || latestAsstMsg || "").cleanText;
        const rawPreview = (cleanReply || ch.errorState?.message || "Session finished — click to inspect result").replace(/\s+/g, " ").trim();
        const preview = rawPreview.length > 96 ? `${rawPreview.slice(0, 95)}…` : rawPreview;
        return `<button type="button" class="btn roster-row-btn roster-row-gate" data-select-session="${escapeHtml(ch.sessionId)}"><span class="roster-row-title-bold">${projTag} ${statusIcon} ${escapeHtml(ch.title || ch.sessionId)}</span><span class="roster-row-reason">${escapeHtml(preview)} →</span></button>`;
      })
      .join("");

    staticSlot.innerHTML = `
      ${waitingGateChars.length > 0 ? `<div class="sheet-card ledger-gate-alert-card"><div class="sheet-card-title gate-title-permission"><span>⚠️ Open Quest Gates (Quick Jump)</span><span>${waitingGateChars.length} waiting</span></div><div>${gateAlertRowsHtml}</div></div>` : ""}
      ${unviewedResultChars.length > 0 ? `<div class="sheet-card ledger-gate-alert-card" id="ledger-unviewed-results-card"><div class="sheet-card-title"><span>📜 Completed Session Results (Unread)</span><span>${unviewedResultChars.length} ready</span></div><div>${unviewedAlertRowsHtml}</div></div>` : ""}
      <div class="ledger-telemetry-ribbon">
        <span>👥 <strong class="val-sky">${focusedCharsCount}</strong> Active</span>
        <span>🏰 <strong>${ledger.totalRooms}</strong> Worlds</span>
        <span title="${escapeHtml(ledger.tokensTooltip ?? `Lifetime Tribute: ${ledger.totalUsedTokens.toLocaleString()} tokens`)}">🪙 <strong class="val-purple">${ledger.totalUsedTokens.toLocaleString()}</strong> Tokens</span>
        <span title="${escapeHtml(ledger.costTooltip ?? `Lifetime Tribute: ${ledger.formattedCost}`)}">💰 <strong class="val-green">${escapeHtml(ledger.formattedCost)}</strong></span>
        ${demolishRoom ? `<button type="button" class="btn btn-danger" id="btn-demolish-active-room" data-demolish-room-id="${escapeHtml(demolishRoom.roomId)}" title="Demolish Room &amp; Teardown OpenCode Resources"${isRoomDemolishing(demolishRoom.roomId) ? " disabled" : ""}>${isRoomDemolishing(demolishRoom.roomId) ? "⏳ Demolishing..." : "💣 Demolish"}</button>` : ""}
      </div>
      ${renderOverviewAssemblyShowcaseCardHtml(ledger.activeGoalAssembly, { isSyncing: ovSyncing, syncDelta: ovSyncDelta, feedbackText: ovFeedback })}
      ${
        activeBug
          ? `<div class="sheet-card"><div class="sheet-card-title"><span>👾 Dungeon Wilds Threat</span><span class="val-red">${bugs.length} Bug Monster(s)</span></div>${bugs
              .map((b) => `<div class="ledger-body-text">Named Threat: <strong>${escapeHtml(b.bugName)}</strong> (${escapeHtml(b.monsterName)}). ${b.inCombat ? "⚔️ Character fighting monster!" : "🔦 Diagnostic search revealing tracks!"}</div>`)
              .join("")}</div>`
          : ""
      }
      <div class="sheet-card sheet-card-flex-fill">
        <div class="sheet-card-title"><span>🧙‍♂️ Active Room Roster &amp; Quick Jump</span><span class="roster-header-controls"><label class="roster-subagent-toggle" for="roster-show-subagents-checkbox"><input type="checkbox" id="roster-show-subagents-checkbox"${clientState.showSubagentsInRoster ? " checked" : ""} /><span>show subagents</span></label><span>${rosterChars.length}</span></span></div>
        <div class="sheet-scroll-list">${renderCharacterRosterRowsHtml(rosterChars, bugs.length > 0)}</div>
      </div>
    `;
    interactiveSlot.classList.add("is-hidden");
    interactiveSlot.innerHTML = "";
  }
  if (prevStaticScrollTop > 0) staticSlot.scrollTop = prevStaticScrollTop;
  const nextInnerLists = Array.from(staticSlot.querySelectorAll?.(".sheet-scroll-list") ?? []);
  nextInnerLists.forEach((el, idx) => {
    if ((prevInnerScrolls[idx] ?? 0) > 0) (el as HTMLElement).scrollTop = prevInnerScrolls[idx]!;
  });

  for (const btn of container.querySelectorAll<HTMLButtonElement>("button[data-ledger-subtab]")) {
    if (btn.getAttribute?.("data-bound-ledger-subtab") === "1") continue;
    btn.setAttribute?.("data-bound-ledger-subtab", "1");
    btn.addEventListener("click", () => {
      const nextSub = btn.getAttribute("data-ledger-subtab") as LedgerCategorySubtab | null;
      if (!nextSub) return;
      clientState.ledgerSubtab = nextSub;
      staticSlot.scrollTop = 0;
      const room = nextSub === "assembly" ? getSelectedProjectRoom() : null;
      if (room?.roomId && getCachedRoomGitState(room.roomId) && typeof window !== "undefined") {
        void refreshRoomGitState(room.roomId, () => { onResetSig(); onStateChanged(); });
      }
      onResetSig();
      onStateChanged();
    });
  }

  if (activeSubtab === "assembly" && activeRoom) {
    bindCommitLedgerControls(container, activeRoom.roomId, onResetSig, onStateChanged);
  }
  for (const syncBtn of container.querySelectorAll<HTMLButtonElement>("button[data-git-sync]")) {
    if (syncBtn.getAttribute?.("data-bound-control") === "1" || syncBtn.getAttribute?.("data-bound-git-sync") === "1") continue;
    syncBtn.setAttribute?.("data-bound-git-sync", "1");
    syncBtn.addEventListener("click", () => {
      syncBtn.disabled = true;
      syncBtn.textContent = "⏳ Syncing...";
      void triggerGitSync(activeRoom?.roomId ?? null, onResetSig, onStateChanged);
    });
  }
  for (const projBtn of container.querySelectorAll<HTMLButtonElement>("button[data-select-commit-project]")) {
    if (projBtn.getAttribute?.("data-bound-project") === "1") continue;
    projBtn.setAttribute?.("data-bound-project", "1");
    projBtn.addEventListener("click", () => {
      if (hasActiveTextSelection(projBtn)) return;
      const pid = projBtn.getAttribute("data-select-commit-project");
      if (!pid) return;
      const nextRoom = selectCommitRepository(pid);
      if (nextRoom?.roomId && typeof window !== "undefined") {
        void refreshRoomGitState(nextRoom.roomId, () => { onResetSig(); onStateChanged(); });
      }
      onResetSig();
      onStateChanged();
    });
  }

  for (const summonBtn of container.querySelectorAll<HTMLElement>("#btn-open-summon-modal, [data-open-summon-modal]")) {
    summonBtn.addEventListener("click", () => { openSummonAdventurerModal(); onStateChanged(); });
  }
  for (const demBtn of container.querySelectorAll<HTMLElement>("#btn-demolish-active-room, [data-demolish-room-id]")) {
    demBtn.addEventListener("click", () => {
      const rid = demBtn.getAttribute("data-demolish-room-id") || activeRoom?.roomId || clientState.selectedProjectId;
      if (rid) { openDemolitionModal(rid); onStateChanged(); }
    });
  }

  const subagentCheckbox = container.querySelector<HTMLInputElement>("#roster-show-subagents-checkbox");
  subagentCheckbox?.addEventListener?.("change", () => {
    clientState.showSubagentsInRoster = Boolean(subagentCheckbox.checked);
    onResetSig();
    onStateChanged();
  });

  for (const btn of container.querySelectorAll<HTMLElement>("[data-select-session]")) {
    btn.addEventListener("click", () => {
      if (hasActiveTextSelection(btn)) return;
      const sid = btn.getAttribute("data-select-session");
      if (sid) {
        acknowledgeSessionResultAsRead(sid, onStateChanged);
        reconcileMobileDrawerSelection(sid, clientState.selectedSessionId);
        onResetSig();
        onStateChanged();
      }
    });
  }
}

export function syncSpectatorDrawerChrome(): void {
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 960;
  if (clientState.isGamemasterCollapsed && clientState.isWorldCollapsed) {
    clientState.isWorldCollapsed = false;
  }
  const mainStage = document.getElementById("main-stage");
  if (mainStage) {
    syncDesktopSplitRatioDom(mainStage, clientState.desktopWorldWidthRatio);
    const prevWorldHidden = mainStage.getAttribute("data-world-hidden");
    const prevGmHidden = mainStage.getAttribute("data-gamemaster-hidden");
    const nextWorldHidden = clientState.isWorldCollapsed ? "true" : "false";
    const nextGmHidden = !isMobile && clientState.isGamemasterCollapsed ? "true" : "false";
    mainStage.setAttribute("data-world-hidden", nextWorldHidden);
    mainStage.setAttribute("data-gamemaster-hidden", nextGmHidden);
    mainStage.setAttribute("data-mobile-view", clientState.mobileDrawerState === "collapsed" ? "world" : "details");
    if (typeof window !== "undefined" && typeof requestAnimationFrame === "function" && (prevWorldHidden !== nextWorldHidden || prevGmHidden !== nextGmHidden)) {
      requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    }
  }
  document.getElementById("btn-restore-gamemaster")?.classList.toggle("is-hidden", isMobile || !clientState.isGamemasterCollapsed);

  const sidebar = document.querySelector?.(".spectator-sidebar") as HTMLElement | null;
  if (!sidebar) return;
  sidebar.setAttribute("data-drawer-state", clientState.mobileDrawerState);
  sidebar.setAttribute("data-drawer-tab", clientState.mobileActiveTab);
  sidebar.setAttribute("data-ticker-collapsed", clientState.isTickerCollapsed ? "true" : "false");

  const isMobileWorldActive = isMobile && clientState.mobileDrawerState === "collapsed";
  const visibleChars = getScopedGameMasterCharacters();
  const gateCount = visibleChars.filter((c) => isCharacterWaitingAtGate(c)).length;

  const btnWorld = document.getElementById("drawer-tab-world");
  const btnLedger = document.getElementById("drawer-tab-ledger");
  const btnChar = document.getElementById("drawer-tab-character");
  const btnTicker = document.getElementById("drawer-tab-ticker");

  if (btnWorld) {
    btnWorld.classList.toggle("active", isMobileWorldActive);
    btnWorld.classList.toggle("is-world-collapsed-restore", !isMobile && clientState.isWorldCollapsed);
    btnWorld.textContent = !isMobile && clientState.isWorldCollapsed ? "🌍 Show World ▶" : "🌍 World";
  }
  if (btnLedger) {
    btnLedger.classList.toggle("active", !isMobileWorldActive && clientState.mobileActiveTab === "ledger");
    btnLedger.textContent = `📜 General (${visibleChars.length})`;
  }
  if (btnChar) {
    btnChar.classList.toggle("active", !isMobileWorldActive && clientState.mobileActiveTab === "character");
    const alertSuffix = gateCount > 0 ? ` ⚠️${gateCount}` : clientState.selectedSessionId ? " ●" : "";
    btnChar.textContent = `🧙‍♂️ Hero${alertSuffix}`;
  }
  if (btnTicker) {
    btnTicker.classList.toggle("active", !isMobileWorldActive && clientState.mobileActiveTab === "ticker");
    const tickerCount = buildScopedActivityTicker().entries.length;
    btnTicker.textContent = `⚡ Ticker (${tickerCount})`;
  }
}

function buildScopedActivityTicker() {
  const activeRoom = getSelectedProjectRoom();
  const isAllWorlds =
    clientState.isAllWorldsFocused ||
    (!clientState.selectedProjectId && !clientState.selectedRoomId && !activeRoom);
  const scopedChars = getScopedGameMasterCharacters();
  return buildActivityTickerViewModel(clientState.tickerLog as never[], 40, {
    snapshot: clientState.currentSnapshot,
    selectedRoomId: activeRoom?.roomId ?? clientState.selectedRoomId,
    selectedProjectId: clientState.selectedProjectId,
    isAllWorldsFocused: isAllWorlds,
    characters: scopedChars,
  });
}

export function reconcileTicker(): void {
  const container = document.getElementById("ticker-entries");
  if (!container) return;
  const tickerVm = buildScopedActivityTicker();
  const sig = tickerVm.entries.map((e) => `${e.shortTag ?? ""}:${e.category}:${e.summary}`).join("|");
  if (sig === lastTickerSignature) return;
  if (lastTickerSignature !== "" && hasActiveTextSelection(container)) return;
  lastTickerSignature = sig;

  container.innerHTML =
    tickerVm.entries.length > 0
      ? tickerVm.entries
          .map((entry) => {
            const projTag = entry.shortTag
              ? `<span class="roster-project-pill" data-herald-party="${escapeHtml(entry.partyKey || "01")}">[${escapeHtml(entry.crestIcon || "🛡️")} ${escapeHtml(entry.shortTag)}]</span>`
              : "";
            return `<div class="ticker-item">${projTag}<span class="roster-gate-tag">[${escapeHtml(entry.category.toUpperCase())}]</span><span>${escapeHtml(entry.summary)}</span></div>`;
          })
          .join("")
      : `<div class="muted-empty-text">No live activity recorded yet.</div>`;
}
