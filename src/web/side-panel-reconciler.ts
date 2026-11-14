import { buildCharacterSheetViewModel, escapeHtml, formatPublicSafePath } from "../hud/spectator-hud.ts";
import { resolveCharacterWorldFocus } from "../spatial/index.ts";
import type { CharacterState } from "../types/domain.ts";
import { deriveScopedGameMasterBugMonsters } from "./canvas-wilds-painter.ts";
import {
  clientState, getActiveRoom, getScopedGameMasterCharacters, getSelectedProjectRoom,
  hasCharacterUnviewedResult, type HeroCategorySubtab, isCharacterWaitingAtGate, reconcileMobileDrawerSelection,
} from "./client-state.ts";
import { getCommitLedgerRevision } from "./commit-ledger-controller.ts";
import { acknowledgeSessionResultAsRead, reconcileInteractiveCommandSlot, syncClientViewedSessionsToSnapshot } from "./command-scroll-controller.ts";
import { expandedChatMessageIds, renderHeroSubtabBarHtml, renderHeroSubtabStaticHtml } from "./hero-subtabs-reconciler.ts";
import { reconcileTicker, renderGuildMasterLedgerPanel, resetTickerSignature, syncSpectatorDrawerChrome } from "./ledger-panel-reconciler.ts";
import { getCachedOperatorProfile, getOperatorHeaders } from "./operator-pairing-controller.ts";
import {
  applyAuthoritativeSnapshot, isRoomDemolishing, isSessionKilling, markSessionKilling, recordClientDeletedSession,
} from "./snapshot-gate.ts";
import { resolveCharacterDisplayBadge } from "./station-and-workflow-routing.ts";
import { hasActiveTextSelection } from "./text-selection-guard.ts";

export { reconcileTicker };

let lastHeaderSignature = "";
let lastSidePanelSignature = "";
let lastSelectedHydratedSessionId: string | null = null;
let lastChatScrollSessionId: string | null = null;
let lastChatScrollSubtab: string | null = null;
let lastChatScrollDispatchRev = "";
let lastChatScrollVisible = false;
const onDemandHydratedSessionRev = new Map<string, string>();

export function resetSidePanelSignatures(): void {
  lastHeaderSignature = "";
  lastSidePanelSignature = "";
  lastSelectedHydratedSessionId = null;
  lastChatScrollSessionId = null;
  lastChatScrollSubtab = null;
  lastChatScrollDispatchRev = "";
  lastChatScrollVisible = false;
  onDemandHydratedSessionRev.clear();
  resetTickerSignature();
}

function buildCharHydrationDigest(c: CharacterState | null | undefined): string {
  if (!c) return "";
  const msgs = c.messages ?? [];
  const lastMsg = msgs[msgs.length - 1];
  return `${msgs.length}:${lastMsg?.messageId ?? ""}:${lastMsg?.text?.length ?? 0}:${(c.lastAssistantText || "").length}:${c.questGate?.gateId ?? ""}`;
}

async function executeKillCharacterSession(rawChar: CharacterState, onStateChanged: () => void): Promise<void> {
  const sid = rawChar.sessionId;
  markSessionKilling(sid, true);
  lastSidePanelSignature = "";
  onStateChanged();
  try {
    const dirParam = rawChar.locationDirectory ? `?directory=${encodeURIComponent(rawChar.locationDirectory)}` : "";
    const res = await fetch(`/api/guild/session/${encodeURIComponent(sid)}${dirParam}`, {
      method: "DELETE", headers: getOperatorHeaders(),
    });
    if (res.ok) {
      recordClientDeletedSession(sid);
      const payload = await res.json();
      if (payload?.snapshot) applyAuthoritativeSnapshot(payload.snapshot);
      if (clientState.selectedSessionId === sid) clientState.selectedSessionId = null;
      clientState.pendingKillSessionId = null;
    }
  } catch { /* ignore transient network errors */ } finally {
    markSessionKilling(sid, false);
    lastHeaderSignature = "";
    lastSidePanelSignature = "";
    onStateChanged();
  }
}

function bindHeroHeaderButtons(headerSlot: HTMLElement, onStateChanged: () => void): void {
  for (const navBtn of headerSlot.querySelectorAll<HTMLButtonElement>("button[data-select-hero-session]")) {
    navBtn.addEventListener("click", () => {
      const nextSid = navBtn.getAttribute("data-select-hero-session");
      if (nextSid && nextSid !== clientState.selectedSessionId) {
        const savedProjId = clientState.selectedProjectId;
        const savedAllFocused = clientState.isAllWorldsFocused;
        acknowledgeSessionResultAsRead(nextSid, onStateChanged);
        reconcileMobileDrawerSelection(nextSid, clientState.selectedSessionId);
        clientState.selectedProjectId = savedProjId;
        clientState.isAllWorldsFocused = savedAllFocused;
        lastHeaderSignature = "";
        lastSidePanelSignature = "";
        reconcileSidePanel(onStateChanged);
        onStateChanged();
      }
    });
  }
  for (const btn of headerSlot.querySelectorAll<HTMLButtonElement>("button[data-hero-subtab]")) {
    btn.addEventListener("click", () => {
      const nextSub = btn.getAttribute("data-hero-subtab") as HeroCategorySubtab | null;
      if (nextSub) {
        clientState.heroSubtab = nextSub;
        lastHeaderSignature = "";
        lastSidePanelSignature = "";
        reconcileSidePanel(onStateChanged);
      }
    });
  }
}

export function reconcileSidePanel(onStateChanged: () => void): void {
  syncClientViewedSessionsToSnapshot(clientState.currentSnapshot);
  syncSpectatorDrawerChrome();
  const snapshotChars = clientState.currentSnapshot.characters || {};
  for (const sid of onDemandHydratedSessionRev.keys()) {
    if (!snapshotChars[sid]) onDemandHydratedSessionRev.delete(sid);
  }
  const container = document.getElementById("character-sheet");
  if (!container) return;

  const sessionId = clientState.selectedSessionId;
  const activeRoom = getActiveRoom();
  const visibleChars = getScopedGameMasterCharacters();
  const bugs = deriveScopedGameMasterBugMonsters();
  let selectedChar = sessionId ? (clientState.currentSnapshot.characters?.[sessionId] ?? null) : null;
  if (sessionId && !selectedChar && (clientState.currentSnapshot.version ?? 0) > 0) {
    clientState.selectedSessionId = null;
  }
  if (
    selectedChar && !clientState.isAllWorldsFocused && clientState.selectedProjectId &&
    !resolveCharacterWorldFocus(selectedChar, clientState.currentSnapshot, clientState.selectedProjectId).isFocusedMember
  ) {
    selectedChar = clientState.mobileActiveTab === "character" ? (visibleChars[0] ?? null) : null;
    clientState.selectedSessionId = selectedChar?.sessionId ?? null;
    if (!selectedChar && clientState.mobileActiveTab === "character") clientState.mobileActiveTab = "ledger";
    syncSpectatorDrawerChrome();
  }
  if (!clientState.selectedSessionId && clientState.mobileActiveTab === "character" && visibleChars.length > 0) {
    selectedChar = visibleChars[0] ?? null;
    if (selectedChar) clientState.selectedSessionId = selectedChar.sessionId;
  }
  const rawChar = selectedChar;

  if (!rawChar || clientState.mobileActiveTab === "ledger") {
    const prof = getCachedOperatorProfile();
    const selectedProjRoom = getSelectedProjectRoom();
    const effectiveRoomId = selectedProjRoom?.roomId ?? activeRoom?.roomId ?? null;
    const isAssemblySub = clientState.ledgerSubtab === "assembly";
    const sig = JSON.stringify({
      mode: "ledger", opId: clientState.operatorId, isAuth: clientState.isAuthenticated,
      opLabel: prof?.label || prof?.username || "", tab: clientState.mobileActiveTab, subtab: clientState.ledgerSubtab,
      commitFile: isAssemblySub ? clientState.selectedCommitFilePath : null, gitRev: isAssemblySub ? getCommitLedgerRevision() : 0,
      allFocused: clientState.isAllWorldsFocused, proj: clientState.selectedProjectId, roomId: effectiveRoomId, demolishing: isRoomDemolishing(effectiveRoomId),
      totalRooms: clientState.currentSnapshot.summary?.totalRooms ?? 0, rosterMode: clientState.rosterMode, showSubagents: clientState.showSubagentsInRoster,
      visIds: isAssemblySub ? [] : visibleChars.map((c) => `${c.sessionId}:${c.lifecycleState}:${c.deferredLifecycleState || ""}:${c.recentTools?.length ?? 0}:${c.overheadLabel || ""}:${isCharacterWaitingAtGate(c) ? c.questGate?.gateId || "gate" : ""}:${hasCharacterUnviewedResult(c) ? `u:${(c.lastAssistantText || "").slice(0, 32)}` : ""}`),
      bugs: isAssemblySub ? [] : bugs.map((b) => `${b.id}:${b.inCombat}`),
      tasks: selectedProjRoom?.taskProgress?.resolvedTasks, totalTasks: selectedProjRoom?.taskProgress?.totalTasks,
      roomTasks: Object.values(clientState.currentSnapshot.rooms || {}).map((r) => `${r.roomId}:${r.taskProgress?.source ?? ""}:${r.taskProgress?.featureSlug ?? ""}:${r.taskProgress?.resolvedTasks ?? 0}/${r.taskProgress?.totalTasks ?? 0}`),
    });
    if (sig === lastSidePanelSignature) return;
    if (lastHeaderSignature === "ledger" && lastSidePanelSignature !== "" && hasActiveTextSelection(container)) return;
    lastHeaderSignature = "ledger";
    lastSidePanelSignature = sig;
    renderGuildMasterLedgerPanel(container, () => { lastSidePanelSignature = ""; }, onStateChanged);
    return;
  }

  const activeSubtab = clientState.heroSubtab;
  const isSheetVisible =
    typeof window === "undefined" ||
    (window.innerWidth > 960 ? !clientState.isGamemasterCollapsed : clientState.mobileDrawerState !== "collapsed");
  if (activeSubtab === "chat" && isSheetVisible && hasCharacterUnviewedResult(rawChar)) {
    acknowledgeSessionResultAsRead(rawChar.sessionId, onStateChanged);
  }
  const sheet = buildCharacterSheetViewModel(clientState.currentSnapshot, rawChar.sessionId);
  const hydrationRev = `${rawChar.lastActivityAtMs}:${rawChar.idleAtMs ?? 0}:${rawChar.lifecycleState}:${rawChar.sequenceCursor}:${rawChar.recentTools?.length ?? 0}:${rawChar.recentTools?.[0]?.callId ?? ""}:${rawChar.recentTools?.[0]?.status ?? ""}`;
  const isNewlySelectedHero = lastSelectedHydratedSessionId !== rawChar.sessionId;
  lastSelectedHydratedSessionId = rawChar.sessionId;
  if (
    typeof window !== "undefined" && typeof fetch === "function" &&
    (!/HeadlessChrome/i.test(navigator.userAgent || "") || (sheet.messages?.length ?? 0) === 0) &&
    (isNewlySelectedHero || onDemandHydratedSessionRev.get(rawChar.sessionId) !== hydrationRev)
  ) {
    onDemandHydratedSessionRev.set(rawChar.sessionId, hydrationRev);
    const prevDigest = buildCharHydrationDigest(rawChar);
    const dirQ = rawChar.locationDirectory ? `?directory=${encodeURIComponent(rawChar.locationDirectory)}` : "";
    void fetch(`/api/guild/session/${encodeURIComponent(rawChar.sessionId)}/messages${dirQ}`, {
      headers: getOperatorHeaders(),
      signal: typeof AbortSignal?.timeout === "function" ? AbortSignal.timeout(2500) : undefined,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((payload) => {
        if (payload?.snapshot && clientState.currentSnapshot.characters?.[rawChar.sessionId]) {
          const nextDigest = buildCharHydrationDigest(payload.snapshot.characters?.[rawChar.sessionId]);
          if (applyAuthoritativeSnapshot(payload.snapshot) && nextDigest !== prevDigest) {
            lastSidePanelSignature = "";
            onStateChanged();
          }
        }
      })
      .catch(() => {});
  }

  const badge = resolveCharacterDisplayBadge(rawChar, bugs.length > 0);
  const wf = badge.workflowIntent;
  const overheadVerb = badge.overheadVerb;
  const lastUserPrompt = (sheet.lastUserPromptText ?? rawChar.lastUserPromptText ?? "").trim();
  const lastReply = (sheet.lastAssistantText ?? rawChar.lastAssistantText ?? "").trim();

  let headerSlot = container.querySelector("#sheet-header-slot") as HTMLElement | null;
  let interactiveSlot = container.querySelector("#sheet-interactive-slot") as HTMLElement | null;
  let staticSlot = container.querySelector("#sheet-static-slot") as HTMLElement | null;
  if (!headerSlot || !interactiveSlot || !staticSlot) {
    container.innerHTML = `<div id="sheet-header-slot"></div><div id="sheet-interactive-slot"></div><div id="sheet-static-slot"></div>`;
    headerSlot = container.querySelector("#sheet-header-slot") as HTMLElement;
    interactiveSlot = container.querySelector("#sheet-interactive-slot") as HTMLElement;
    staticSlot = container.querySelector("#sheet-static-slot") as HTMLElement;
    lastHeaderSignature = "";
    lastSidePanelSignature = "";
  }

  const showInteractive = activeSubtab === "chat" || Boolean(sheet.pendingQuestGate);
  interactiveSlot.classList.toggle("is-hidden", !showInteractive);
  reconcileInteractiveCommandSlot(interactiveSlot, sheet, rawChar, onStateChanged);

  const heroChars = visibleChars.some((c) => c.sessionId === rawChar.sessionId) ? visibleChars : [rawChar, ...visibleChars];
  const heroIdx = Math.max(0, heroChars.findIndex((c) => c.sessionId === rawChar.sessionId));
  const totalHeroes = heroChars.length;
  const prevHero = heroChars[(heroIdx - 1 + totalHeroes) % totalHeroes] ?? rawChar;
  const nextHero = heroChars[(heroIdx + 1) % totalHeroes] ?? rawChar;
  const heroNavDisabledAttr = totalHeroes <= 1 ? " disabled" : "";
  const wfLabel = wf === "debugging-hunt" ? "👾 Debugging Hunt" : wf === "information-gathering" ? "🔭 Information Gathering" : "⚙️ Feature Build";

  const headerSig = JSON.stringify({
    mode: "character-header", subtab: activeSubtab, sessionId: sheet.sessionId, title: sheet.title,
    role: sheet.role, agentName: sheet.agentBadge.displayName, heraldKey: sheet.projectHeraldry?.partyKey ?? "",
    heroNav: `${heroIdx + 1}/${totalHeroes}:${prevHero.sessionId}:${nextHero.sessionId}`,
    wf, overheadVerb, manaPct: sheet.contextMana.percent, toolsLen: sheet.recentTools.length,
    skillsLen: sheet.skillGrimoireStack.length, hasGate: Boolean(sheet.pendingQuestGate), unviewed: Boolean(sheet.hasUnviewedResult),
  });

  if (headerSig !== lastHeaderSignature) {
    lastHeaderSignature = headerSig;
    const existingSubBtns = headerSlot.querySelectorAll?.<HTMLButtonElement>("button[data-hero-subtab]") ?? [];
    if (existingSubBtns.length > 0 && headerSlot.getAttribute?.("data-header-session") === sheet.sessionId && headerSlot.innerHTML.includes("hero-browser-row")) {
      const chatSuffix = sheet.pendingQuestGate ? " ⚠️" : sheet.hasUnviewedResult ? " ✓" : "";
      for (const btn of existingSubBtns) {
        const subId = btn.getAttribute("data-hero-subtab");
        btn.classList?.toggle("active", subId === activeSubtab);
        if (subId === "chat") btn.innerHTML = `💬 Chat${chatSuffix}`;
        else if (subId === "scrolls") btn.innerHTML = `📘 Scrolls<span class="subtab-desktop-suffix"> &amp; Gear</span> (${sheet.skillGrimoireStack.length})`;
        else if (subId === "tools") btn.innerHTML = `🛠️ Tool<span class="subtab-desktop-suffix"> Log</span> (${sheet.recentTools.length})`;
      }
      const titleEl = headerSlot.querySelector?.(".sheet-hero-title"); if (titleEl) titleEl.textContent = sheet.title;
      const verbEl = headerSlot.querySelector?.(".inv-pill-verb"); if (verbEl) verbEl.textContent = `💬 ${overheadVerb}`;
      const manaEl = headerSlot.querySelector?.(".val-purple"); if (manaEl) manaEl.textContent = `${sheet.contextMana.percent}% Mana`;
      const wfEl = headerSlot.querySelector?.(".inv-pill-workflow"); if (wfEl) wfEl.textContent = wfLabel;
      const countEl = headerSlot.querySelector?.(".project-browser-count"); if (countEl) countEl.textContent = `${heroIdx + 1}/${totalHeroes}`;
      const prevBtn = headerSlot.querySelector?.('button[data-hero-nav="prev"]') as HTMLButtonElement | null;
      const nextBtn = headerSlot.querySelector?.('button[data-hero-nav="next"]') as HTMLButtonElement | null;
      const navDisabled = totalHeroes <= 1;
      if (prevBtn) {
        prevBtn.disabled = navDisabled;
        prevBtn.setAttribute?.("data-select-hero-session", prevHero.sessionId);
        prevBtn.setAttribute?.("title", `Previous session (${((heroIdx - 1 + totalHeroes) % totalHeroes) + 1}/${totalHeroes})`);
      }
      if (nextBtn) {
        nextBtn.disabled = navDisabled;
        nextBtn.setAttribute?.("data-select-hero-session", nextHero.sessionId);
        nextBtn.setAttribute?.("title", `Next session (${((heroIdx + 1) % totalHeroes) + 1}/${totalHeroes})`);
      }
    } else {
      headerSlot.setAttribute?.("data-header-session", sheet.sessionId);
      const subtabBarHtml = renderHeroSubtabBarHtml(
        activeSubtab, sheet.recentTools.length, sheet.skillGrimoireStack.length,
        Boolean(sheet.pendingQuestGate), Boolean(sheet.hasUnviewedResult),
      );
      const heraldPillHtml = sheet.projectHeraldry
        ? `<span class="inv-pill inv-pill-project" data-herald-party="${escapeHtml(sheet.projectHeraldry.partyKey)}" title="${escapeHtml(sheet.projectHeraldry.partyName)} · ${escapeHtml(sheet.projectHeraldry.projectName)} (${escapeHtml(formatPublicSafePath(sheet.projectHeraldry.projectId))})">${escapeHtml(sheet.projectHeraldry.crestIcon)} ${escapeHtml(sheet.projectHeraldry.shortTag)}</span>`
        : "";
      headerSlot.innerHTML = `${subtabBarHtml}<div class="sheet-header-bar project-browser-row hero-browser-row" role="group" aria-label="Hero Session Browser"><button type="button" class="btn project-browser-nav-btn" data-hero-nav="prev" data-select-hero-session="${escapeHtml(prevHero.sessionId)}" title="Previous session (${((heroIdx - 1 + totalHeroes) % totalHeroes) + 1}/${totalHeroes})" aria-label="Previous session"${heroNavDisabledAttr}>◀</button><div class="btn subtab-btn project-browser-current-btn hero-browser-current-btn active" data-herald-party="${escapeHtml(sheet.projectHeraldry?.partyKey || "")}" title="${escapeHtml(sheet.title)} (${heroIdx + 1}/${totalHeroes})"><div class="sheet-header-main">${heraldPillHtml}<div class="sheet-hero-title">${escapeHtml(sheet.title)}</div><div class="sheet-hero-badges"><span class="inv-pill inv-pill-verb">💬 ${escapeHtml(overheadVerb)}</span><span class="inv-pill val-purple" title="Context Mana">${sheet.contextMana.percent}% Mana</span><span class="inv-pill inv-pill-workflow">${wfLabel}</span></div><div class="sheet-hero-sub">${escapeHtml(sheet.role)} · <span class="val-gold">${escapeHtml(sheet.agentBadge.displayName)}</span></div></div><span class="project-browser-count">${heroIdx + 1}/${totalHeroes}</span></div><button type="button" class="btn project-browser-nav-btn" data-hero-nav="next" data-select-hero-session="${escapeHtml(nextHero.sessionId)}" title="Next session (${((heroIdx + 1) % totalHeroes) + 1}/${totalHeroes})" aria-label="Next session"${heroNavDisabledAttr}>▶</button></div>`;
      bindHeroHeaderButtons(headerSlot, onStateChanged);
    }
  }

  const computeStaticSig = () => JSON.stringify(
    activeSubtab === "details"
      ? ["details", sheet.sessionId, sheet.projectHeraldry?.partyKey, sheet.modelId, sheet.contextMana.usedTokens, sheet.contextMana.limitTokens, sheet.contextMana.percent, sheet.cost.inputTokens, sheet.cost.outputTokens, sheet.cost.formattedCost, sheet.activeTarget.preparationStation || sheet.activeTarget.workstation, sheet.contextMana.compactionCount, sheet.childSubagents.map((s) => `${s.sessionId}:${s.lifecycleState}`), clientState.pendingKillSessionId, isSessionKilling(sheet.sessionId)]
      : activeSubtab === "scrolls"
        ? ["scrolls", sheet.sessionId, sheet.equipmentLoadout.level, sheet.equipmentLoadout.tierTitle, sheet.equipmentLoadout.headgear.rpgName, sheet.equipmentLoadout.robes.rpgName, sheet.equipmentLoadout.mainHand.rpgName, sheet.equipmentLoadout.offHand.rpgName, sheet.equipmentLoadout.toolBelt.map((b) => `${b.toolName}:${b.count}`), sheet.skillGrimoireStack.map((s) => s.skillId), (sheet.connectedPlugins ?? []).map((p) => `${p.namespace}:${p.status}`)]
        : activeSubtab === "tools"
          ? ["tools", sheet.sessionId, clientState.selectedToolCallId, sheet.recentTools.map((t) => `${t.callId}:${t.status}:${(t.outputPreview ?? "").length}`)]
          : ["chat", sheet.sessionId, isSheetVisible, sheet.lifecycleState, overheadVerb, lastUserPrompt, lastReply, sheet.dispatchLog?.revisionKey ?? "", sheet.pendingQuestGate?.gateId, sheet.hasUnviewedResult, sheet.turnOutcome, Array.from(expandedChatMessageIds)],
  );
  const staticSig = computeStaticSig();
  if (staticSig === lastSidePanelSignature) return;
  if (
    lastSidePanelSignature !== "" &&
    sheet.sessionId === lastChatScrollSessionId &&
    activeSubtab === lastChatScrollSubtab &&
    hasActiveTextSelection(staticSlot)
  ) return;
  lastSidePanelSignature = staticSig;

  const prevTranscriptEl = staticSlot.querySelector(".dispatch-transcript-scroll") as HTMLElement | null;
  const savedScrollTop = prevTranscriptEl ? prevTranscriptEl.scrollTop : null;
  const savedStaticScrollTop = typeof staticSlot.scrollTop === "number" ? staticSlot.scrollTop : null;
  const hasValidPrevScroll = prevTranscriptEl !== null && prevTranscriptEl.scrollHeight > 0 && prevTranscriptEl.clientHeight > 0;
  const wasNearBottom = hasValidPrevScroll
    ? prevTranscriptEl.scrollHeight - prevTranscriptEl.scrollTop - prevTranscriptEl.clientHeight <= 64
    : true;
  const currentDispatchRev = (sheet.dispatchLog?.turns ?? []).map((t) => `${t.messageId}:${t.cleanText.length}:${t.skills.length}`).join("|");
  const isContextOrTurnChange =
    sheet.sessionId !== lastChatScrollSessionId || activeSubtab !== lastChatScrollSubtab ||
    currentDispatchRev !== lastChatScrollDispatchRev || (isSheetVisible && !lastChatScrollVisible);
  const shouldScrollToLatest =
    !sheet.pendingQuestGate && isContextOrTurnChange &&
    (wasNearBottom || sheet.sessionId !== lastChatScrollSessionId || activeSubtab !== lastChatScrollSubtab || (isSheetVisible && !lastChatScrollVisible));
  lastChatScrollSessionId = sheet.sessionId;
  lastChatScrollSubtab = activeSubtab;
  lastChatScrollDispatchRev = currentDispatchRev;
  lastChatScrollVisible = isSheetVisible;

  staticSlot.innerHTML = renderHeroSubtabStaticHtml(sheet, activeSubtab);

  const nextTranscriptEl = staticSlot.querySelector(".dispatch-transcript-scroll") as HTMLElement | null;
  if (nextTranscriptEl) {
    if (shouldScrollToLatest) {
      const scrollToBottom = () => {
        nextTranscriptEl.scrollTop = nextTranscriptEl.scrollHeight;
        if (staticSlot) staticSlot.scrollTop = staticSlot.scrollHeight;
      };
      scrollToBottom();
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(scrollToBottom);
    } else {
      if (savedScrollTop !== null && savedScrollTop >= 0) nextTranscriptEl.scrollTop = savedScrollTop;
      if (savedStaticScrollTop !== null && savedStaticScrollTop >= 0) staticSlot.scrollTop = savedStaticScrollTop;
    }
  }

  for (const toggleBtn of staticSlot.querySelectorAll<HTMLButtonElement>("button[data-toggle-chat-msg]")) {
    toggleBtn.addEventListener("click", () => {
      if (hasActiveTextSelection(toggleBtn)) return;
      const msgId = toggleBtn.getAttribute("data-toggle-chat-msg");
      if (!msgId) return;
      const scopedId = `${sheet.sessionId}:${msgId}`;
      const nowExpanded = !(expandedChatMessageIds.has(msgId) || expandedChatMessageIds.has(scopedId));
      if (nowExpanded) expandedChatMessageIds.add(scopedId);
      else { expandedChatMessageIds.delete(msgId); expandedChatMessageIds.delete(scopedId); }
      if (hasCharacterUnviewedResult(rawChar)) acknowledgeSessionResultAsRead(sheet.sessionId, onStateChanged);
      const rowEl = staticSlot.querySelector?.(`[data-chat-message-id="${msgId}"]`) as HTMLElement | null;
      const detailsEl = rowEl?.querySelector?.(".dispatch-turn-details") as HTMLElement | null;
      if (rowEl && detailsEl) {
        rowEl.classList?.toggle("is-expanded", nowExpanded);
        rowEl.classList?.toggle("is-collapsed", !nowExpanded);
        if (nowExpanded) detailsEl.removeAttribute?.("hidden");
        else detailsEl.setAttribute?.("hidden", "");
        const chev = rowEl.querySelector?.(".dispatch-turn-chevron"); if (chev) chev.textContent = nowExpanded ? "▾" : "▸";
        const pill = rowEl.querySelector?.(".dispatch-toggle-pill"); if (pill) pill.textContent = nowExpanded ? "Collapse ▴" : "Expand ▾";
        lastSidePanelSignature = computeStaticSig();
      } else {
        lastSidePanelSignature = "";
        reconcileSidePanel(onStateChanged);
      }
    });
  }

  staticSlot.querySelector<HTMLButtonElement>("button[data-toggle-all-chat-msgs]")?.addEventListener("click", () => {
    const turnIds = (sheet.dispatchLog?.turns ?? []).map((t) => t.messageId);
    const allOpen = turnIds.length > 0 && turnIds.every((id) => expandedChatMessageIds.has(id) || expandedChatMessageIds.has(`${sheet.sessionId}:${id}`));
    for (const id of turnIds) {
      const scopedId = `${sheet.sessionId}:${id}`;
      if (allOpen) { expandedChatMessageIds.delete(id); expandedChatMessageIds.delete(scopedId); }
      else expandedChatMessageIds.add(scopedId);
    }
    if (hasCharacterUnviewedResult(rawChar)) acknowledgeSessionResultAsRead(sheet.sessionId, onStateChanged);
    lastSidePanelSignature = "";
    reconcileSidePanel(onStateChanged);
  });

  for (const row of staticSlot.querySelectorAll<HTMLElement>("[data-tool-call-id]")) {
    row.addEventListener("click", () => {
      if (hasActiveTextSelection(row)) return;
      const cid = row.getAttribute("data-tool-call-id");
      clientState.selectedToolCallId = clientState.selectedToolCallId === cid ? null : cid;
      lastSidePanelSignature = "";
      reconcileSidePanel(onStateChanged);
    });
  }

  staticSlot.querySelector("#btn-kill-character")?.addEventListener("click", () => {
    clientState.pendingKillSessionId = sheet.sessionId;
    lastSidePanelSignature = "";
    reconcileSidePanel(onStateChanged);
  });
  staticSlot.querySelector("#btn-cancel-kill-character")?.addEventListener("click", () => {
    clientState.pendingKillSessionId = null;
    lastSidePanelSignature = "";
    reconcileSidePanel(onStateChanged);
  });
  staticSlot.querySelector("#btn-confirm-kill-character")?.addEventListener("click", async () => {
    await executeKillCharacterSession(rawChar, onStateChanged);
  });
}
