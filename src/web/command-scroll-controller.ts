import type { CharacterSheetViewModel } from "../hud/spectator-hud.ts";
import type { CharacterState, GuildCommandRequest, GuildSnapshot } from "../types/domain.ts";
import {
  clientState, hasCharacterUnviewedResult, promoteDrawerExpandedOnMobileFocus, reconcileMobileDrawerSelection,
} from "./client-state.ts";
import { escapeHtml } from "./ledger-panel-reconciler.ts";
import { getOperatorHeaders } from "./operator-pairing-controller.ts";
import {
  bindQuestGateCardControls, isClientGateResolved, markClientGateResolved, renderQuestGateCardHtml,
} from "./quest-gate-card.ts";
import {
  bindSkillBrowserControls, renderSkillBrowserRowHtml, syncSkillBrowserSelectionState,
} from "./skill-browser-controller.ts";
import { applyAuthoritativeSnapshot, clearClientDeletedRoom } from "./snapshot-gate.ts";

let lastSummonedSessionId: string | null = null;
const clientViewedAtBySession = new Map<string, number>();
const dispatchedViewIdleAtBySession = new Map<string, number>();
const acknowledgedIdleAtBySession = new Map<string, number>();
const draftAgentModeBySession = new Map<string, string>();

export function formatCompactModeLabel(id: string): string {
  if (id === "build") return "⚔️ build";
  if (id === "plan") return "📐 plan";
  if (id === "document") return "📜 document";
  return `✨ ${id}`;
}

export function getLastSummonedSessionId(): string | null {
  return lastSummonedSessionId;
}

export function syncClientViewedSessionsToSnapshot(snapshot: GuildSnapshot | null | undefined): void {
  if (!snapshot?.characters) return;
  for (const [sid, viewedTs] of clientViewedAtBySession.entries()) {
    const ch = snapshot.characters[sid];
    if (!ch) continue;
    const isRestingOrCompactingToRest =
      ch.lifecycleState === "RestingInLounge" ||
      (ch.lifecycleState === "DistillingContextMana" && ch.deferredLifecycleState === "RestingInLounge");
    if (!isRestingOrCompactingToRest && ch.lifecycleState !== "DistillingContextMana") {
      clientViewedAtBySession.delete(sid);
      dispatchedViewIdleAtBySession.delete(sid);
      acknowledgedIdleAtBySession.delete(sid);
      continue;
    }
    const latestIdleTs = typeof ch.idleAtMs === "number" ? ch.idleAtMs : 0;
    const distilledTs = typeof ch.contextMana?.lastDistilledAtMs === "number" ? ch.contextMana.lastDistilledAtMs : 0;
    const ackIdleTs = acknowledgedIdleAtBySession.get(sid) ?? viewedTs;
    const isCompactionIdle =
      ch.lifecycleState === "DistillingContextMana" ||
      (distilledTs >= viewedTs - 5_000 && latestIdleTs <= distilledTs + 15_000);
    const isSettlingSameIdleTurn =
      isRestingOrCompactingToRest &&
      (latestIdleTs <= viewedTs + 5_000 || latestIdleTs <= ackIdleTs + 5_000);
    if (latestIdleTs > viewedTs && !isCompactionIdle && !isSettlingSameIdleTurn) {
      clientViewedAtBySession.delete(sid);
      dispatchedViewIdleAtBySession.delete(sid);
      acknowledgedIdleAtBySession.delete(sid);
      continue;
    }
    const effectiveViewedTs = Math.max(viewedTs, isCompactionIdle || isSettlingSameIdleTurn ? latestIdleTs : 0);
    if (effectiveViewedTs > viewedTs) clientViewedAtBySession.set(sid, effectiveViewedTs);
    ch.viewedAtMs = Math.max(ch.viewedAtMs ?? 0, effectiveViewedTs);
    if (isRestingOrCompactingToRest) {
      ch.hasUnviewedResult = false;
    }
  }
}

export function acknowledgeSessionResultAsRead(
  sessionId: string | null | undefined,
  onStateChanged: () => void,
  fetchImpl?: typeof fetch,
): boolean {
  if (!sessionId) return false;
  const ch = clientState.currentSnapshot.characters?.[sessionId];
  if (!ch) return false;
  const wasUnviewed = hasCharacterUnviewedResult(ch) || ch.hasUnviewedResult === true;
  const idleTs = typeof ch.idleAtMs === "number" && ch.idleAtMs > 0 ? ch.idleAtMs : ch.lastActivityAtMs || Date.now();
  const viewedTs = Math.max(Date.now(), idleTs + 1, (ch.lastActivityAtMs ?? 0) + 1, ch.viewedAtMs ?? 0);
  clientViewedAtBySession.set(sessionId, viewedTs);
  acknowledgedIdleAtBySession.set(sessionId, idleTs);
  ch.hasUnviewedResult = false;
  ch.viewedAtMs = viewedTs;
  if (wasUnviewed && dispatchedViewIdleAtBySession.get(sessionId) !== idleTs) {
    dispatchedViewIdleAtBySession.set(sessionId, idleTs);
    void dispatchGuildCommandFromWeb(
      { command: "session.view", sessionId, directory: ch.locationDirectory, idleAtMs: ch.idleAtMs ?? viewedTs },
      onStateChanged, fetchImpl,
    );
  }
  return wasUnviewed;
}

export async function dispatchGuildCommandFromWeb(
  cmd: GuildCommandRequest,
  onStateChanged: () => void,
  fetchImpl?: typeof fetch,
): Promise<boolean> {
  const invokeFetch: typeof fetch = !fetchImpl || fetchImpl === globalThis.fetch ? (input, init) => globalThis.fetch(input, init) : fetchImpl;
  if (cmd.command === "gate.resolve") markClientGateResolved(cmd.gateId, true);
  try {
    const res = await invokeFetch("/api/guild/command", {
      method: "POST", headers: getOperatorHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(cmd),
    });
    if (!res.ok) {
      if (cmd.command === "gate.resolve") markClientGateResolved(cmd.gateId, false);
      return false;
    }
    const payload = await res.json();
    if (cmd.command === "adventurer.summon" && cmd.directory) clearClientDeletedRoom(cmd.directory);
    if (payload?.snapshot) applyAuthoritativeSnapshot(payload.snapshot);
    if (cmd.command === "adventurer.summon" && typeof payload?.sessionId === "string") {
      lastSummonedSessionId = payload.sessionId;
      const ch = clientState.currentSnapshot.characters?.[payload.sessionId];
      if (ch) ch.isOpenInOpenCode = true;
      reconcileMobileDrawerSelection(payload.sessionId, clientState.selectedSessionId);
    }
    const ok = Boolean(payload?.ok ?? true);
    if (!ok && cmd.command === "gate.resolve") markClientGateResolved(cmd.gateId, false);
    onStateChanged();
    return ok;
  } catch {
    if (cmd.command === "gate.resolve") markClientGateResolved(cmd.gateId, false);
    return false;
  }
}

export function reconcileInteractiveCommandSlot(
  slotEl: HTMLElement,
  sheet: CharacterSheetViewModel,
  rawChar: CharacterState,
  onStateChanged: () => void,
): void {
  const activeGate =
    sheet.pendingQuestGate &&
    !isClientGateResolved(sheet.pendingQuestGate.gateId, sheet.sessionId, sheet.pendingQuestGate.prompt)
      ? sheet.pendingQuestGate
      : null;
  const gateId = activeGate?.gateId ?? "none";
  const interactiveKey = `${sheet.sessionId}:${gateId}`;
  const gateSig = activeGate
    ? `${activeGate.title}:${activeGate.prompt?.length ?? 0}:${(activeGate.fields ?? []).map((f) => `${f.key}:${f.question.length}:${f.options?.length ?? 0}`).join("|")}`
    : "none";
  const busy = sheet.commandScroll.isBusy;
  const canInterrupt = sheet.commandScroll.canInterrupt;

  const hasGate = Boolean(activeGate);
  const urlExpand = typeof window !== "undefined" && new URLSearchParams(window.location?.search || "").get("scroll") === "1";
  if (urlExpand) clientState.isCommandScrollExpanded = true;
  const isExpanded = Boolean(clientState.isCommandScrollExpanded) && !hasGate;
  const syncCardCollapseState = () => {
    const cardEl = slotEl.querySelector(".command-scroll-card") as HTMLElement | null;
    if (!cardEl) return;
    const nowHasGate = Boolean(
      sheet.pendingQuestGate &&
        !isClientGateResolved(sheet.pendingQuestGate.gateId, sheet.sessionId, sheet.pendingQuestGate.prompt),
    );
    const nowExpanded = Boolean(clientState.isCommandScrollExpanded) && !nowHasGate;
    cardEl.classList?.toggle("is-gate-hidden", nowHasGate);
    cardEl.classList?.toggle("is-expanded", nowExpanded);
    cardEl.classList?.toggle("is-collapsed", !nowExpanded && !nowHasGate);
    const toggleLabelEl = slotEl.querySelector("#scroll-toggle-label") as HTMLElement | null;
    if (toggleLabelEl) toggleLabelEl.textContent = nowExpanded ? "Collapse ▾" : "Compose [/] ▴";
  };

  if (
    slotEl.getAttribute("data-interactive-key") === interactiveKey &&
    (slotEl.getAttribute("data-interactive-sig") ?? gateSig) === gateSig &&
    slotEl.querySelector("#command-scroll-input")
  ) {
    syncCardCollapseState();
    const badgeEl = slotEl.querySelector("#scroll-status-badge") as HTMLElement | null;
    if (badgeEl) {
      badgeEl.textContent = busy ? "⚡ Busy" : "🟢 Idle";
      badgeEl.className = busy ? "scroll-status-busy" : "scroll-status-idle";
    }
    const deliveryRow = slotEl.querySelector("#scroll-delivery-row") as HTMLElement | null;
    deliveryRow?.classList?.toggle("is-hidden", !busy);
    if (deliveryRow?.style) deliveryRow.style.display = busy ? "flex" : "none";
    const stopBtn = slotEl.querySelector("#btn-interrupt-turn") as HTMLElement | null;
    stopBtn?.classList?.toggle("is-hidden", !canInterrupt);
    if (stopBtn?.style) stopBtn.style.display = canInterrupt ? "inline-flex" : "none";
    const existingModeSel = slotEl.querySelector("#command-scroll-agent-select") as HTMLSelectElement | null;
    if (existingModeSel && sheet.commandScroll.selectedAgentClass) {
      draftAgentModeBySession.set(sheet.sessionId, sheet.commandScroll.selectedAgentClass);
      existingModeSel.value = sheet.commandScroll.selectedAgentClass;
    }
    return;
  }

  const prevInteractiveKey = slotEl.getAttribute("data-interactive-key");
  const prevSlotScrollTop = typeof slotEl.scrollTop === "number" ? slotEl.scrollTop : 0;
  const preserveSlotScroll = hasGate && prevInteractiveKey === interactiveKey;
  slotEl.setAttribute("data-interactive-key", interactiveKey);
  slotEl.setAttribute("data-interactive-sig", gateSig);
  const delivery =
    clientState.draftDeliveryBySession.get(sheet.sessionId) ??
    sheet.commandScroll.defaultDelivery;
  const draftPrompt =
    clientState.draftPromptsBySession.get(sheet.sessionId) ?? "";
  const selectedAgent =
    draftAgentModeBySession.get(sheet.sessionId) ||
    sheet.commandScroll.selectedAgentClass ||
    rawChar.agentClass ||
    "build";
  draftAgentModeBySession.set(sheet.sessionId, selectedAgent);
  const modeOptionsHtml = sheet.commandScroll.canSwitchAgentMode
    ? `<select id="command-scroll-agent-select" class="command-scroll-agent-select" aria-label="OpenCode Agent Mode" title="OpenCode Agent Mode">${sheet.commandScroll.availableAgentModes
        .map(
          (m) =>
            `<option value="${escapeHtml(m.id)}" ${m.id === selectedAgent ? "selected" : ""}>${escapeHtml(formatCompactModeLabel(m.id))}</option>`,
        )
        .join("")}</select>`
    : "";
  const skillScopeId = `scroll:${sheet.sessionId}`;
  const skillBrowserHtml = renderSkillBrowserRowHtml({
    scopeId: skillScopeId,
    skills: sheet.commandScroll.availableSkillIds,
    currentInputText: draftPrompt,
  });

  const cardStateClass = hasGate ? "is-gate-hidden" : isExpanded ? "is-expanded" : "is-collapsed";
  slotEl.innerHTML = `
    ${renderQuestGateCardHtml(sheet, rawChar)}
    <div class="sheet-card command-scroll-card ${cardStateClass}">
      <div class="sheet-card-title command-scroll-header" id="command-scroll-toggle-bar">
        <span>📜 Command Scroll <span class="command-scroll-trigger-hint">· Click or press [/] to compose</span></span>
        <span>
          <span id="scroll-status-badge" class="${busy ? "scroll-status-busy" : "scroll-status-idle"}">${busy ? "⚡ Busy" : "🟢 Idle"}</span>
          <span id="scroll-toggle-label" class="val-gold">${isExpanded ? "Collapse ▾" : "Compose [/] ▴"}</span>
        </span>
      </div>
      <div class="command-scroll-body">
        <div id="scroll-delivery-row" class="scroll-delivery-row ${busy ? "" : "is-hidden"}">
          <div class="scroll-delivery-modes">
            <button id="btn-delivery-steer" type="button" class="btn ${delivery === "steer" ? "active" : ""}" data-delivery-mode="steer">⚡ Steer</button>
            <button id="btn-delivery-queue" type="button" class="btn ${delivery === "queue" ? "active" : ""}" data-delivery-mode="queue">📥 Queue</button>
          </div>
          <button id="btn-interrupt-turn" type="button" class="btn btn-interrupt-turn ${canInterrupt ? "" : "is-hidden"}">⏹ Stop</button>
        </div>
        ${skillBrowserHtml}
        <div class="command-scroll-compose-row">
          <textarea id="command-scroll-input" class="command-scroll-input" rows="2" placeholder="Type prompt or @skill... (Enter to send)">${escapeHtml(draftPrompt)}</textarea>
          <div class="command-scroll-send-actions">
            ${modeOptionsHtml}
            <button id="btn-send-command-scroll" type="button" class="btn btn-send-scroll">📜 Send Scroll ↵</button>
          </div>
        </div>
        <span id="scroll-feedback-msg" class="scroll-feedback-msg"></span>
      </div>
    </div>
  `;
  if (typeof slotEl.scrollTop === "number") {
    slotEl.scrollTop = preserveSlotScroll ? prevSlotScrollTop : 0;
  }

  slotEl.querySelector("#command-scroll-toggle-bar")?.addEventListener("click", () => {
    clientState.isCommandScrollExpanded = !clientState.isCommandScrollExpanded;
    syncCardCollapseState();
    if (clientState.isCommandScrollExpanded) textarea?.focus();
  });

  const textarea = slotEl.querySelector("#command-scroll-input") as HTMLTextAreaElement | null;
  const sendBtn = slotEl.querySelector("#btn-send-command-scroll") as HTMLButtonElement | null;
  const agentSelect = slotEl.querySelector("#command-scroll-agent-select") as HTMLSelectElement | null;
  const feedbackEl = slotEl.querySelector("#scroll-feedback-msg") as HTMLElement | null;

  const setFeedback = (msg: string, isError: boolean) => {
    if (!feedbackEl) return;
    feedbackEl.textContent = msg;
    feedbackEl.className = isError ? "scroll-feedback-msg is-error" : "scroll-feedback-msg is-visible";
  };

  agentSelect?.addEventListener("change", () => {
    const nextAgent = (agentSelect.value || "").trim();
    if (!nextAgent) return;
    draftAgentModeBySession.set(sheet.sessionId, nextAgent);
    rawChar.agentClass = nextAgent;
    void dispatchGuildCommandFromWeb(
      {
        command: "agent.switch",
        sessionId: sheet.sessionId,
        directory: rawChar.locationDirectory,
        agentClass: nextAgent,
      },
      onStateChanged,
    );
  });

  textarea?.addEventListener("focus", () => promoteDrawerExpandedOnMobileFocus());

  textarea?.addEventListener("input", () => {
    clientState.draftPromptsBySession.set(sheet.sessionId, textarea.value);
    syncSkillBrowserSelectionState(slotEl, skillScopeId, textarea.value);
  });

  let isSending = false;
  const submitScroll = async (): Promise<void> => {
    if (isSending) return;
    const promptText = (textarea?.value ?? "").trim();
    if (!promptText) return;
    isSending = true;
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.textContent = "⏳ Sending...";
    }
    const mode = clientState.draftDeliveryBySession.get(sheet.sessionId) ?? "steer";
    const chosenAgent = (
      agentSelect?.value ||
      draftAgentModeBySession.get(sheet.sessionId) ||
      sheet.commandScroll.selectedAgentClass ||
      ""
    ).trim();
    try {
      const ok = await dispatchGuildCommandFromWeb(
        {
          command: "scroll.send",
          sessionId: sheet.sessionId,
          directory: rawChar.locationDirectory,
          promptText,
          delivery: mode,
          ...(sheet.commandScroll.canSwitchAgentMode && chosenAgent ? { agentClass: chosenAgent } : {}),
        },
        onStateChanged,
      );
      if (ok) {
        if (textarea) textarea.value = "";
        clientState.draftPromptsBySession.delete(sheet.sessionId);
        syncSkillBrowserSelectionState(slotEl, skillScopeId, "");
        clientState.isCommandScrollExpanded = false;
        syncCardCollapseState();
        rawChar.lastUserPromptText = promptText;
        rawChar.isOpenInOpenCode = true;
        setFeedback("✓ Scroll Dispatched!", false);
        onStateChanged();
      } else {
        setFeedback("⚠️ Send failed", true);
      }
    } finally {
      isSending = false;
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.textContent = "📜 Send Scroll ↵";
      }
    }
  };

  textarea?.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && !ev.shiftKey) {
      ev.preventDefault();
      void submitScroll();
    }
  });
  sendBtn?.addEventListener("click", () => void submitScroll());

  for (const modeBtn of slotEl.querySelectorAll<HTMLButtonElement>("button[data-delivery-mode]")) {
    modeBtn.addEventListener("click", () => {
      const m = modeBtn.getAttribute("data-delivery-mode") as "steer" | "queue";
      clientState.draftDeliveryBySession.set(sheet.sessionId, m);
      for (const b of slotEl.querySelectorAll("button[data-delivery-mode]")) {
        b.classList.toggle("active", b.getAttribute("data-delivery-mode") === m);
      }
    });
  }

  bindSkillBrowserControls({
    containerEl: slotEl, scopeId: skillScopeId, skills: sheet.commandScroll.availableSkillIds,
    getTargetInput: () => textarea,
    onInputUpdated: (nextVal) => { clientState.draftPromptsBySession.set(sheet.sessionId, nextVal); },
  });

  slotEl.querySelector("#btn-interrupt-turn")?.addEventListener("click", () => {
    void dispatchGuildCommandFromWeb(
      { command: "turn.interrupt", sessionId: sheet.sessionId, directory: rawChar.locationDirectory },
      onStateChanged,
    );
  });

  bindQuestGateCardControls(slotEl, sheet, rawChar, onStateChanged, dispatchGuildCommandFromWeb);
}
