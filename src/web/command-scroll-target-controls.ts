import type { CharacterSheetViewModel } from "../hud/spectator-hud.ts";
import type { CharacterState, GuildCommandRequest } from "../types/domain.ts";
import { escapeHtml } from "./ledger-panel-reconciler.ts";

const draftAgentModeBySession = new Map<string, string>();
const draftModelIdBySession = new Map<string, string>();
const draftModelVariantBySession = new Map<string, string | null>();

export interface TargetControlsDeps {
  formatCompactModeLabel: (id: string) => string;
  dispatchCommand: (cmd: GuildCommandRequest, onStateChanged: () => void) => Promise<boolean>;
  getLastDispatchError: () => string | null;
  setFeedback: (msg: string, isError: boolean) => void;
  onStateChanged: () => void;
}

export function pruneTargetControlSessionCaches(hasSession: (sessionId: string) => boolean): void {
  for (const sid of draftAgentModeBySession.keys()) if (!hasSession(sid)) draftAgentModeBySession.delete(sid);
  for (const sid of draftModelIdBySession.keys()) if (!hasSession(sid)) draftModelIdBySession.delete(sid);
  for (const sid of draftModelVariantBySession.keys()) if (!hasSession(sid)) draftModelVariantBySession.delete(sid);
}

function findModelVariantsInSheet(sheet: CharacterSheetViewModel, modelId: string): readonly string[] {
  const lower = modelId.toLowerCase();
  for (const group of sheet.commandScroll.availableModelGroups ?? []) {
    for (const model of group.models ?? []) {
      if (model.id.toLowerCase() === lower) return model.variants ?? [];
    }
  }
  return sheet.commandScroll.availableVariants ?? [];
}

export function computeTargetControlsDigest(sheet: CharacterSheetViewModel): string {
  const cs = sheet.commandScroll;
  const agentsSig = (cs.availableAgentModes ?? []).map((m) => m.id).join(",");
  const modelsSig = (cs.availableModelGroups ?? [])
    .map((g) => `${g.providerId}:${(g.models ?? []).map((m) => `${m.id}=${m.name}[${(m.variants ?? []).join("/")}]`).join(",")}`)
    .join("|");
  return `${cs.canSwitchAgentMode ? 1 : 0}|${cs.selectedAgentClass ?? ""}|${agentsSig}||${cs.canSwitchModel ? 1 : 0}|${cs.selectedModelId ?? ""}|${cs.selectedModelVariant ?? ""}|${(cs.availableVariants ?? []).join(",")}|${modelsSig}`;
}

export function renderTargetControlsInnerHtml(
  sheet: CharacterSheetViewModel,
  rawChar: CharacterState,
  formatCompactModeLabel: (id: string) => string,
): string {
  const cs = sheet.commandScroll;
  const selectedAgent =
    draftAgentModeBySession.get(sheet.sessionId) || cs.selectedAgentClass || rawChar.agentClass || "build";
  draftAgentModeBySession.set(sheet.sessionId, selectedAgent);

  const selectedModel =
    draftModelIdBySession.get(sheet.sessionId) || cs.selectedModelId || rawChar.modelId || "";
  if (selectedModel) draftModelIdBySession.set(sheet.sessionId, selectedModel);

  const selectedVariant = draftModelVariantBySession.has(sheet.sessionId)
    ? (draftModelVariantBySession.get(sheet.sessionId) ?? null)
    : (cs.selectedModelVariant ?? rawChar.modelVariant ?? null);
  draftModelVariantBySession.set(sheet.sessionId, selectedVariant);

  const agentSelectHtml = cs.canSwitchAgentMode
    ? `<select id="command-scroll-agent-select" class="command-scroll-agent-select" aria-label="OpenCode Agent Mode" title="OpenCode Agent Mode">${(cs.availableAgentModes ?? [])
        .map((m) => `<option value="${escapeHtml(m.id)}" ${m.id === selectedAgent ? "selected" : ""}>${escapeHtml(formatCompactModeLabel(m.id))}</option>`)
        .join("")}</select>`
    : "";

  let modelSelectHtml = "";
  let variantSelectHtml = "";
  const modelGroups = cs.availableModelGroups ?? [];
  if (cs.canSwitchModel && modelGroups.length > 0) {
    const groupsHtml = modelGroups
      .map(
        (group) =>
          `<optgroup label="${escapeHtml(group.providerLabel)}">${group.models
            .map(
              (m) =>
                `<option value="${escapeHtml(m.id)}" ${m.id.toLowerCase() === selectedModel.toLowerCase() ? "selected" : ""}>${escapeHtml(m.name)}</option>`,
            )
            .join("")}</optgroup>`,
      )
      .join("");
    modelSelectHtml = `<select id="command-scroll-model-select" class="command-scroll-model-select" aria-label="OpenCode Model" title="OpenCode Model">${groupsHtml}</select>`;

    const variants = findModelVariantsInSheet(sheet, selectedModel);
    if (variants.length > 0) {
      const variantOptions = [
        `<option value="" ${!selectedVariant ? "selected" : ""}>Default</option>`,
        ...variants.map(
          (v) => `<option value="${escapeHtml(v)}" ${v === selectedVariant ? "selected" : ""}>⚡ ${escapeHtml(v)}</option>`,
        ),
      ].join("");
      variantSelectHtml = `<select id="command-scroll-variant-select" class="command-scroll-variant-select" aria-label="Model Variant" title="Model Reasoning / Effort Variant">${variantOptions}</select>`;
    }
  }

  return `${agentSelectHtml}${modelSelectHtml}${variantSelectHtml}`;
}

function resolveTargetHost(slotEl: HTMLElement): HTMLElement {
  const candidate = slotEl.querySelector("#command-scroll-target-controls") as HTMLElement | null;
  return candidate && typeof candidate.querySelector === "function" ? candidate : slotEl;
}

function renderVariantOptionsHtml(variants: readonly string[], selectedVariant: string | null): string {
  return [
    `<option value="" ${!selectedVariant ? "selected" : ""}>Default</option>`,
    ...variants.map(
      (v) => `<option value="${escapeHtml(v)}" ${v === selectedVariant ? "selected" : ""}>⚡ ${escapeHtml(v)}</option>`,
    ),
  ].join("");
}

function syncVariantSelectElement(
  hostEl: HTMLElement,
  variants: readonly string[],
  selectedVariant: string | null,
  onVariantChange: (selectEl: HTMLSelectElement) => void,
): void {
  const existing = hostEl.querySelector("#command-scroll-variant-select") as HTMLSelectElement | null;
  if (variants.length === 0) {
    existing?.remove?.();
    return;
  }
  const optionsHtml = renderVariantOptionsHtml(variants, selectedVariant);
  if (existing) {
    existing.innerHTML = optionsHtml;
    existing.value = selectedVariant ?? "";
    return;
  }
  if (typeof document !== "undefined" && typeof document.createElement === "function" && typeof hostEl.appendChild === "function") {
    const sel = document.createElement("select");
    sel.id = "command-scroll-variant-select";
    sel.className = "command-scroll-variant-select";
    sel.setAttribute("aria-label", "Model Variant");
    sel.setAttribute("title", "Model Reasoning / Effort Variant");
    sel.innerHTML = optionsHtml;
    sel.value = selectedVariant ?? "";
    sel.addEventListener("change", () => onVariantChange(sel));
    hostEl.appendChild(sel);
  }
}

export function bindTargetControls(
  slotEl: HTMLElement,
  sheet: CharacterSheetViewModel,
  rawChar: CharacterState,
  deps: TargetControlsDeps,
): void {
  const hostEl = resolveTargetHost(slotEl);
  const agentSelect = hostEl.querySelector("#command-scroll-agent-select") as HTMLSelectElement | null;
  const modelSelect = hostEl.querySelector("#command-scroll-model-select") as HTMLSelectElement | null;
  const variantSelect = hostEl.querySelector("#command-scroll-variant-select") as HTMLSelectElement | null;

  agentSelect?.addEventListener("change", () => {
    const nextAgent = (agentSelect.value || "").trim();
    if (!nextAgent) return;
    const prevAgent = draftAgentModeBySession.get(sheet.sessionId) || rawChar.agentClass || sheet.commandScroll.selectedAgentClass || "build";
    draftAgentModeBySession.set(sheet.sessionId, nextAgent);
    rawChar.agentClass = nextAgent;
    void deps
      .dispatchCommand(
        {
          command: "agent.switch",
          sessionId: sheet.sessionId,
          directory: rawChar.locationDirectory,
          agentClass: nextAgent,
        },
        deps.onStateChanged,
      )
      .then((ok) => {
        if (!ok) {
          draftAgentModeBySession.set(sheet.sessionId, prevAgent);
          rawChar.agentClass = prevAgent;
          agentSelect.value = prevAgent;
          const err = deps.getLastDispatchError();
          deps.setFeedback(err ? `⚠️ Agent switch failed: ${err}` : "⚠️ Agent switch failed", true);
        }
      });
  });

  const handleVariantChange = (sel: HTMLSelectElement) => {
    const currentModelId = (
      modelSelect?.value ||
      draftModelIdBySession.get(sheet.sessionId) ||
      sheet.commandScroll.selectedModelId ||
      rawChar.modelId ||
      ""
    ).trim();
    if (!currentModelId) return;
    const prevVariant = draftModelVariantBySession.get(sheet.sessionId) ?? rawChar.modelVariant ?? null;
    const nextVariant = (sel.value || "").trim() || null;
    dispatchModelSwitch(currentModelId, nextVariant, currentModelId, prevVariant);
  };

  const dispatchModelSwitch = (
    nextModelId: string,
    nextVariant: string | null,
    prevModelId: string,
    prevVariant: string | null,
  ) => {
    draftModelIdBySession.set(sheet.sessionId, nextModelId);
    draftModelVariantBySession.set(sheet.sessionId, nextVariant);
    rawChar.modelId = nextModelId;
    if (nextVariant) rawChar.modelVariant = nextVariant;
    else delete rawChar.modelVariant;

    syncVariantSelectElement(hostEl, findModelVariantsInSheet(sheet, nextModelId), nextVariant, handleVariantChange);

    void deps
      .dispatchCommand(
        {
          command: "model.switch",
          sessionId: sheet.sessionId,
          directory: rawChar.locationDirectory,
          modelId: nextModelId,
          modelVariant: nextVariant,
        },
        deps.onStateChanged,
      )
      .then((ok) => {
        if (!ok) {
          draftModelIdBySession.set(sheet.sessionId, prevModelId);
          draftModelVariantBySession.set(sheet.sessionId, prevVariant);
          rawChar.modelId = prevModelId;
          if (prevVariant) rawChar.modelVariant = prevVariant;
          else delete rawChar.modelVariant;
          if (modelSelect) modelSelect.value = prevModelId;
          syncVariantSelectElement(hostEl, findModelVariantsInSheet(sheet, prevModelId), prevVariant, handleVariantChange);
          const err = deps.getLastDispatchError();
          deps.setFeedback(err ? `⚠️ Model switch failed: ${err}` : "⚠️ Model switch failed", true);
        }
      });
  };

  modelSelect?.addEventListener("change", () => {
    const nextModelId = (modelSelect.value || "").trim();
    if (!nextModelId) return;
    const prevModelId = draftModelIdBySession.get(sheet.sessionId) || rawChar.modelId || sheet.commandScroll.selectedModelId;
    const prevVariant = draftModelVariantBySession.get(sheet.sessionId) ?? rawChar.modelVariant ?? null;
    const nextModelVariants = findModelVariantsInSheet(sheet, nextModelId);
    const nextVariant = prevVariant && nextModelVariants.includes(prevVariant) ? prevVariant : null;
    dispatchModelSwitch(nextModelId, nextVariant, prevModelId, prevVariant);
  });

  variantSelect?.addEventListener("change", () => handleVariantChange(variantSelect));
}

export function reconcileTargetControlsInPlace(
  slotEl: HTMLElement,
  sheet: CharacterSheetViewModel,
  rawChar: CharacterState,
  deps: TargetControlsDeps,
): void {
  const hostEl = resolveTargetHost(slotEl);
  const canSwapHostHtml = hostEl !== slotEl && typeof hostEl.getAttribute === "function";
  const nextSig = computeTargetControlsDigest(sheet);
  const prevSig = canSwapHostHtml ? hostEl.getAttribute("data-targets-sig") : nextSig;

  if (sheet.commandScroll.selectedAgentClass) {
    draftAgentModeBySession.set(sheet.sessionId, sheet.commandScroll.selectedAgentClass);
  }
  if (sheet.commandScroll.selectedModelId) {
    draftModelIdBySession.set(sheet.sessionId, sheet.commandScroll.selectedModelId);
  }
  draftModelVariantBySession.set(sheet.sessionId, sheet.commandScroll.selectedModelVariant ?? null);

  if (prevSig !== nextSig) {
    const activeEl = typeof document !== "undefined" ? document.activeElement : null;
    const focusedInside = Boolean(
      activeEl &&
        (activeEl === hostEl.querySelector("#command-scroll-agent-select") ||
          activeEl === hostEl.querySelector("#command-scroll-model-select") ||
          activeEl === hostEl.querySelector("#command-scroll-variant-select")),
    );
    if (!focusedInside) {
      hostEl.setAttribute?.("data-targets-sig", nextSig);
      hostEl.innerHTML = renderTargetControlsInnerHtml(sheet, rawChar, deps.formatCompactModeLabel);
      bindTargetControls(slotEl, sheet, rawChar, deps);
      return;
    }
  }

  const existingModeSel = hostEl.querySelector("#command-scroll-agent-select") as HTMLSelectElement | null;
  if (existingModeSel && sheet.commandScroll.selectedAgentClass) {
    existingModeSel.value = sheet.commandScroll.selectedAgentClass;
  }
  const existingModelSel = hostEl.querySelector("#command-scroll-model-select") as HTMLSelectElement | null;
  if (existingModelSel && sheet.commandScroll.selectedModelId) {
    existingModelSel.value = sheet.commandScroll.selectedModelId;
  }
  const existingVariantSel = hostEl.querySelector("#command-scroll-variant-select") as HTMLSelectElement | null;
  if (existingVariantSel) {
    existingVariantSel.value = sheet.commandScroll.selectedModelVariant ?? "";
  }
}

export function readSelectedTargetsForSend(
  slotEl: HTMLElement,
  sheet: CharacterSheetViewModel,
): { agentClass?: string; modelId?: string; modelVariant?: string | null } {
  const hostEl = resolveTargetHost(slotEl);
  const agentSelect = hostEl.querySelector("#command-scroll-agent-select") as HTMLSelectElement | null;
  const modelSelect = hostEl.querySelector("#command-scroll-model-select") as HTMLSelectElement | null;
  const variantSelect = hostEl.querySelector("#command-scroll-variant-select") as HTMLSelectElement | null;

  const chosenAgent = (
    agentSelect?.value ||
    draftAgentModeBySession.get(sheet.sessionId) ||
    sheet.commandScroll.selectedAgentClass ||
    ""
  ).trim();
  const chosenModel = (
    modelSelect?.value ||
    draftModelIdBySession.get(sheet.sessionId) ||
    sheet.commandScroll.selectedModelId ||
    ""
  ).trim();
  const chosenVariant = variantSelect
    ? ((variantSelect.value || "").trim() || null)
    : (draftModelVariantBySession.has(sheet.sessionId)
        ? (draftModelVariantBySession.get(sheet.sessionId) ?? null)
        : (sheet.commandScroll.selectedModelVariant ?? null));

  return {
    ...(sheet.commandScroll.canSwitchAgentMode && chosenAgent ? { agentClass: chosenAgent } : {}),
    ...(sheet.commandScroll.canSwitchModel && chosenModel ? { modelId: chosenModel, modelVariant: chosenVariant } : {}),
  };
}
