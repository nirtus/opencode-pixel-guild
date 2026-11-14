import { formatChatMarkdownHtml, formatInlineMarkdown, sanitizeAndExtractSkillsFromChatText, type CharacterSheetViewModel } from "../hud/spectator-hud.ts";
import { detectConversationalQuestionPrompt, normalizeQuestGateFields, type CharacterState, type GuildCommandRequest, type QuestGateQuestionField, type QuestGateSource } from "../types/domain.ts";
import { clientState, promoteDrawerExpandedOnMobileFocus, resolvedClientGateIds, resolvedClientPromptsBySession } from "./client-state.ts";
import { escapeHtml } from "./ledger-panel-reconciler.ts";
import { bindSkillBrowserControls, renderSkillBrowserRowHtml, syncSkillBrowserSelectionState } from "./skill-browser-controller.ts";
import { isGateResolving, markGateResolving } from "./snapshot-gate.ts";
import { hasActiveTextSelection } from "./text-selection-guard.ts";

export function isClientGateResolved(gateId: string | null | undefined, sessionId?: string | null, promptText?: string | null): boolean {
  if (gateId && resolvedClientGateIds.has(gateId)) return true;
  const cleanPrompt = promptText?.trim();
  return Boolean(sessionId && cleanPrompt && resolvedClientPromptsBySession.get(sessionId)?.has(cleanPrompt));
}

export function markClientGateResolved(gateId: string | null | undefined, resolved = true, sessionId?: string | null, promptText?: string | null): void {
  if (gateId) {
    if (resolved) resolvedClientGateIds.add(gateId);
    else resolvedClientGateIds.delete(gateId);
  }
  const cleanPrompt = promptText?.trim();
  if (sessionId && cleanPrompt) {
    let set = resolvedClientPromptsBySession.get(sessionId);
    if (resolved) {
      if (!set) { set = new Set<string>(); resolvedClientPromptsBySession.set(sessionId, set); }
      set.add(cleanPrompt);
    } else set?.delete(cleanPrompt);
  }
}

function parseMultiValueAnswer(
  raw: string | string[] | undefined,
  existingDraft?: string | string[],
  field?: QuestGateQuestionField,
): string[] {
  if (Array.isArray(raw)) return [...raw];
  if (typeof raw === "string" && raw.trim()) {
    const trimmed = raw.trim();
    if (
      Array.isArray(existingDraft) &&
      existingDraft.length > 0 &&
      existingDraft.join(", ").trim() === trimmed
    ) {
      return [...existingDraft];
    }
    const exactOpt = field?.options?.find(
      (o) => (o.value || o.label).trim() === trimmed,
    );
    if (exactOpt) return [exactOpt.value || exactOpt.label];
    return trimmed
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function getDraftGateAnswers(
  sessionId: string,
  gateId: string,
): Record<string, string | string[]> {
  return (
    clientState.draftGateAnswersByGateId.get(gateId) ??
    clientState.draftGateAnswersByGateId.get(`session:${sessionId}`) ??
    {}
  );
}

function setDraftGateAnswers(
  sessionId: string,
  gateId: string,
  map: Record<string, string | string[]>,
): void {
  clientState.draftGateAnswersByGateId.set(gateId, map);
  clientState.draftGateAnswersByGateId.set(`session:${sessionId}`, map);
}

function clearDraftGateAnswers(sessionId: string, gateId: string): void {
  clientState.draftGateAnswersByGateId.delete(gateId);
  clientState.draftGateAnswersByGateId.delete(`session:${sessionId}`);
}

export function resolveQuestionGateFields(
  sheet: CharacterSheetViewModel,
  rawChar: CharacterState,
): QuestGateQuestionField[] {
  const gate = sheet.pendingQuestGate;
  const rawFields = gate?.fields ?? rawChar.questGate?.fields ?? [];
  const fields = normalizeQuestGateFields(rawFields);
  if (fields.length > 0) return fields;
  const promptText = gate?.prompt || rawChar.questGate?.reason || "";
  const conv = detectConversationalQuestionPrompt(promptText);
  if (conv && conv.fields.length > 0) return [...conv.fields];
  return normalizeQuestGateFields([{ key: "q0", question: promptText || "Your response:" }]);
}

export function renderQuestGateCardHtml(
  sheet: CharacterSheetViewModel,
  rawChar: CharacterState,
): string {
  const gate = sheet.pendingQuestGate;
  if (!gate || isClientGateResolved(gate.gateId, sheet.sessionId, gate.prompt)) return "";
  if (gate.kind === "permission") {
    const isResolving = isGateResolving(gate.gateId);
    const disAttr = isResolving ? " disabled" : "";
    const resources = gate.resources ?? rawChar.questGate?.resources ?? [];
    const resourcesHtml =
      resources.length > 0
        ? `<ul class="gate-resource-list">${resources.map((r) => `<li><code>${escapeHtml(r)}</code></li>`).join("")}</ul>`
        : "";
    const promptMdHtml = formatChatMarkdownHtml(
      sanitizeAndExtractSkillsFromChatText(gate.prompt).cleanText,
    );
    return `
      <div class="sheet-card gate-card-permission">
        <div class="sheet-card-title gate-title-permission">
          <span>⚠️ Permission Gate: ${formatInlineMarkdown(gate.title)}</span>
          <span class="gate-marker-bang">!</span>
        </div>
        <div class="gate-prompt-text"><div class="chat-md-body">${promptMdHtml}</div></div>
        ${resourcesHtml}
        <div class="gate-actions-row">
          <button id="btn-gate-allow-once" type="button" class="btn btn-gate-allow-once"${disAttr}>${isResolving ? "⏳ Sending..." : "✓ Allow Once"}</button>
          <button id="btn-gate-allow-always" type="button" class="btn btn-gate-allow-always"${disAttr}>${isResolving ? "⏳ Sending..." : "✓✓ Always"}</button>
          <button id="btn-gate-reject" type="button" class="btn btn-gate-reject"${disAttr}>${isResolving ? "⏳ Sending..." : "✕ Reject"}</button>
        </div>
      </div>
    `;
  }

  const effectiveFields = resolveQuestionGateFields(sheet, rawChar);
  const draftAnswers = getDraftGateAnswers(sheet.sessionId, gate.gateId);
  const gateSkillScopeId = `gate:${sheet.sessionId}:${gate.gateId}`;
  const firstDraftVal = draftAnswers[effectiveFields[0]?.key ?? "q0"];
  const firstDraftStr = Array.isArray(firstDraftVal) ? firstDraftVal.join(", ") : (firstDraftVal ?? "");
  const gateSkillBrowserHtml = renderSkillBrowserRowHtml({
    scopeId: gateSkillScopeId,
    skills: sheet.commandScroll?.availableSkillIds,
    currentInputText: firstDraftStr,
  });

  const fieldsHtml = effectiveFields
    .map((field, idx) => {
      const currentVal = draftAnswers[field.key];
      const strVal = Array.isArray(currentVal) ? currentVal.join(", ") : (currentVal ?? "");
      const optsHtml = (field.options ?? [])
        .map((opt) => {
          const val = opt.value || opt.label;
          const isSelected = Array.isArray(currentVal) ? currentVal.includes(val) : currentVal === val;
          return `<button type="button" class="btn gate-opt-chip ${isSelected ? "active" : ""}" data-gate-field-key="${escapeHtml(field.key)}" data-gate-opt-val="${escapeHtml(val)}" data-gate-multiple="${field.multiple ? "true" : "false"}"><span class="gate-option-label">${formatInlineMarkdown(opt.label)}</span>${opt.description ? `<span class="gate-option-desc">${formatInlineMarkdown(opt.description)}</span>` : ""}</button>`;
        })
        .join("");
      const showHeader =
        Boolean(field.header?.trim()) &&
        (effectiveFields.length > 1 ||
          (field.header!.trim() !== (gate.title ?? "").trim() &&
            field.header!.trim() !== field.question.trim()));
      const headerHtml = showHeader
        ? `<div class="gate-field-header">${formatInlineMarkdown(field.header!)}</div>`
        : "";
      const questionMdHtml = formatChatMarkdownHtml(
        sanitizeAndExtractSkillsFromChatText(field.question).cleanText,
      );
      return `<div class="gate-field-block">${headerHtml}<div class="gate-field-question"><div class="chat-md-body">${questionMdHtml}</div></div>${optsHtml ? `<div class="gate-opt-list">${optsHtml}</div>` : ""}${idx === 0 ? gateSkillBrowserHtml : ""}<input type="text" class="gate-custom-input" data-gate-input-key="${escapeHtml(field.key)}" value="${escapeHtml(strVal)}" placeholder="Type answer or tap option..." /></div>`;
    })
    .join("");

  const promptTrim = (gate.prompt ?? "").trim();
  const isCoveredByFields =
    effectiveFields.length > 1 ||
    promptTrim === (effectiveFields[0]?.question ?? "").trim() ||
    promptTrim === (effectiveFields[0]?.header ?? "").trim() ||
    (effectiveFields[0]?.question ?? "").includes(promptTrim);
  const showPromptText = Boolean(promptTrim) && !isCoveredByFields;
  const gatePromptMdHtml = showPromptText
    ? formatChatMarkdownHtml(sanitizeAndExtractSkillsFromChatText(gate.prompt).cleanText)
    : "";

  const isSubmittingGate = isGateResolving(gate.gateId);
  return `
    <div class="sheet-card gate-card-question">
      <div class="sheet-card-title gate-title-question">
        <span>❓ Question Gate: ${formatInlineMarkdown(gate.title)}</span>
        <span class="gate-marker-question">?</span>
      </div>
      ${showPromptText ? `<div class="gate-prompt-text"><div class="chat-md-body">${gatePromptMdHtml}</div></div>` : ""}
      ${fieldsHtml}
      <button id="btn-gate-submit-answer" type="button" class="btn btn-gate-submit"${isSubmittingGate ? " disabled" : ""}>${isSubmittingGate ? "⏳ Sending..." : "Send Answer ↵"}</button>
    </div>
  `;
}

export function bindQuestGateCardControls(
  slotEl: HTMLElement,
  sheet: CharacterSheetViewModel,
  rawChar: CharacterState,
  onStateChanged: () => void,
  dispatchCommand: (
    cmd: GuildCommandRequest,
    onStateChanged: () => void,
  ) => Promise<boolean>,
): void {
  const gate = sheet.pendingQuestGate;
  if (!gate) return;

  if (gate.kind === "permission") {
    let isResolving = false;
    const bindDecision = (id: string, decision: "once" | "always" | "reject") => {
      const btn = slotEl.querySelector(id) as HTMLButtonElement | null;
      btn?.addEventListener("click", async () => {
        if (isResolving) return;
        isResolving = true;
        if (btn) { btn.disabled = true; btn.textContent = "⏳ Sending..."; }
        markGateResolving(gate.gateId, true);
        markClientGateResolved(gate.gateId, true);
        if (rawChar.questGate?.gateId) markClientGateResolved(rawChar.questGate.gateId, true);
        onStateChanged();
        try {
          const ok = await dispatchCommand(
            { command: "gate.resolve", sessionId: sheet.sessionId, gateId: gate.gateId, directory: rawChar.locationDirectory, kind: "permission", decision },
            onStateChanged,
          );
          if (!ok) {
            markClientGateResolved(gate.gateId, false);
            if (rawChar.questGate?.gateId) markClientGateResolved(rawChar.questGate.gateId, false);
          }
        } finally {
          markGateResolving(gate.gateId, false);
          isResolving = false;
          onStateChanged();
        }
      });
    };
    bindDecision("#btn-gate-allow-once", "once");
    bindDecision("#btn-gate-allow-always", "always");
    bindDecision("#btn-gate-reject", "reject");
    return;
  }

  if (gate.kind === "question") {
    const effectiveFields = resolveQuestionGateFields(sheet, rawChar);
    const isMultipleField = (fKey: string, btn?: HTMLElement): boolean =>
      btn?.getAttribute("data-gate-multiple") === "true" ||
      effectiveFields.some((f) => f.key === fKey && f.multiple === true);

    for (const optBtn of slotEl.querySelectorAll<HTMLButtonElement>("button[data-gate-field-key]")) {
      optBtn.addEventListener("click", () => {
        if (hasActiveTextSelection(optBtn)) return;
        const fKey = optBtn.getAttribute("data-gate-field-key") || "q0";
        const oVal = optBtn.getAttribute("data-gate-opt-val") || "";
        const fieldDef = effectiveFields.find((f) => f.key === fKey);
        const map = { ...getDraftGateAnswers(sheet.sessionId, gate.gateId) };
        const inp = slotEl.querySelector<HTMLInputElement>(`.gate-custom-input[data-gate-input-key="${fKey}"]`);
        if (isMultipleField(fKey, optBtn)) {
          const selected = parseMultiValueAnswer(map[fKey], map[fKey], fieldDef);
          const existingIdx = selected.indexOf(oVal);
          if (existingIdx >= 0) selected.splice(existingIdx, 1);
          else if (oVal) selected.push(oVal);
          map[fKey] = selected;
          setDraftGateAnswers(sheet.sessionId, gate.gateId, map);
          if (inp) inp.value = selected.join(", ");
          for (const b of slotEl.querySelectorAll<HTMLButtonElement>(`button[data-gate-field-key="${fKey}"]`)) {
            b.classList.toggle("active", selected.includes(b.getAttribute("data-gate-opt-val") || ""));
          }
        } else {
          map[fKey] = oVal;
          setDraftGateAnswers(sheet.sessionId, gate.gateId, map);
          if (inp) inp.value = oVal;
          for (const b of slotEl.querySelectorAll<HTMLButtonElement>(`button[data-gate-field-key="${fKey}"]`)) {
            b.classList.toggle("active", b.getAttribute("data-gate-opt-val") === oVal);
          }
        }
      });
    }
    let isSubmitting = false;
    const submitQuestionAnswer = async (): Promise<void> => {
      if (isSubmitting) return;
      isSubmitting = true;
      const answers: Record<string, string | string[]> = { ...getDraftGateAnswers(sheet.sessionId, gate.gateId) };
      for (const inp of slotEl.querySelectorAll<HTMLInputElement>(".gate-custom-input")) {
        const fKey = inp.getAttribute("data-gate-input-key") || "q0";
        const fieldDef = effectiveFields.find((f) => f.key === fKey);
        const trimmed = inp.value.trim();
        if (trimmed) {
          answers[fKey] = isMultipleField(fKey) ? parseMultiValueAnswer(trimmed, answers[fKey], fieldDef) : trimmed;
        }
      }
      for (const field of effectiveFields) {
        const existing = answers[field.key];
        const hasVal = Array.isArray(existing) ? existing.length > 0 : Boolean(existing && existing.trim());
        if (!hasVal && field.required !== false && field.options?.length) {
          const firstOpt = field.options[0]!;
          const defVal = firstOpt.value || firstOpt.label;
          if (defVal) answers[field.key] = field.multiple ? [defVal] : defVal;
        }
      }
      const promptText =
        Object.values(answers).map((v) => (Array.isArray(v) ? v.join(", ") : v)).filter(Boolean).join("\n") || "Proceed";
      const source: QuestGateSource = gate.source ?? rawChar.questGate?.source ?? "form";
      const submitBtn = slotEl.querySelector("#btn-gate-submit-answer") as HTMLButtonElement | null;
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "⏳ Sending..."; }
      markGateResolving(gate.gateId, true);
      markClientGateResolved(gate.gateId, true, sheet.sessionId, gate.prompt);
      if (rawChar.questGate?.gateId) {
        markClientGateResolved(rawChar.questGate.gateId, true, sheet.sessionId, rawChar.questGate.reason);
      }
      onStateChanged();
      try {
        const ok = await dispatchCommand(
          { command: "gate.resolve", sessionId: sheet.sessionId, gateId: gate.gateId, directory: rawChar.locationDirectory, kind: "question", source, answers, promptText },
          onStateChanged,
        );
        if (ok) {
          clearDraftGateAnswers(sheet.sessionId, gate.gateId);
        } else {
          markClientGateResolved(gate.gateId, false, sheet.sessionId, gate.prompt);
          if (rawChar.questGate?.gateId) {
            markClientGateResolved(rawChar.questGate.gateId, false, sheet.sessionId, rawChar.questGate.reason);
          }
        }
      } finally {
        markGateResolving(gate.gateId, false);
        isSubmitting = false;
        onStateChanged();
      }
    };
    const gateSkillScopeId = `gate:${sheet.sessionId}:${gate.gateId}`;
    let activeGateInput: HTMLInputElement | null = null;
    for (const inp of slotEl.querySelectorAll<HTMLInputElement>(".gate-custom-input")) {
      if (!activeGateInput) activeGateInput = inp;
      inp.addEventListener("focus", () => {
        activeGateInput = inp;
        promoteDrawerExpandedOnMobileFocus();
      });
      inp.addEventListener("input", () => {
        const fKey = inp.getAttribute("data-gate-input-key") || "q0";
        const fieldDef = effectiveFields.find((f) => f.key === fKey);
        const map = { ...getDraftGateAnswers(sheet.sessionId, gate.gateId) };
        map[fKey] = isMultipleField(fKey) ? parseMultiValueAnswer(inp.value, map[fKey], fieldDef) : inp.value;
        setDraftGateAnswers(sheet.sessionId, gate.gateId, map);
        syncSkillBrowserSelectionState(slotEl, gateSkillScopeId, inp.value);
      });
      inp.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" && !ev.shiftKey) {
          ev.preventDefault?.();
          void submitQuestionAnswer();
        }
      });
    }
    bindSkillBrowserControls({
      containerEl: slotEl,
      scopeId: gateSkillScopeId,
      skills: sheet.commandScroll?.availableSkillIds,
      getTargetInput: () => activeGateInput ?? (slotEl.querySelector(".gate-custom-input") as HTMLInputElement | null),
      onInputUpdated: (nextVal, inputEl) => {
        const fKey = inputEl.getAttribute?.("data-gate-input-key") || "q0";
        const fieldDef = effectiveFields.find((f) => f.key === fKey);
        const map = { ...getDraftGateAnswers(sheet.sessionId, gate.gateId) };
        map[fKey] = isMultipleField(fKey) ? parseMultiValueAnswer(nextVal, map[fKey], fieldDef) : nextVal;
        setDraftGateAnswers(sheet.sessionId, gate.gateId, map);
      },
    });
    slotEl.querySelector("#btn-gate-submit-answer")?.addEventListener("click", () => void submitQuestionAnswer());
  }
}
