import { DEFAULT_GUILD_SKILL_IDS } from "../hud/spectator-hud.ts";
import type { GuildSnapshot } from "../types/domain.ts";
import { clientState } from "./client-state.ts";
import { escapeHtml } from "./ledger-panel-reconciler.ts";

const skillOffsetByScope = new Map<string, number>();
const skillFilterByScope = new Map<string, string>();

export interface SkillBrowserRenderOptions {
  readonly scopeId: string;
  readonly skills?: readonly string[];
  readonly currentInputText?: string;
  readonly filterText?: string;
  readonly charBudget?: number;
}

export interface SkillBrowserBindOptions {
  readonly containerEl: HTMLElement;
  readonly scopeId: string;
  readonly skills?: readonly string[];
  readonly getTargetInput: () => HTMLTextAreaElement | HTMLInputElement | null;
  readonly onInputUpdated?: (
    newValue: string,
    inputEl: HTMLTextAreaElement | HTMLInputElement,
    appendedSkillId: string,
  ) => void;
  readonly charBudget?: number;
}

export interface VisibleSkillWindow {
  readonly visibleSkills: readonly string[];
  readonly normalizedOffset: number;
  readonly total: number;
}

export function getSkillBrowserOffset(scopeId: string): number {
  return skillOffsetByScope.get(scopeId) ?? 0;
}

export function setSkillBrowserOffset(scopeId: string, offset: number): void {
  skillOffsetByScope.set(scopeId, offset);
}

export function getSkillBrowserFilter(scopeId: string): string {
  return skillFilterByScope.get(scopeId) ?? "";
}

export function setSkillBrowserFilter(scopeId: string, filterText: string): void {
  skillFilterByScope.set(scopeId, filterText);
}

export function filterSkillIdsByQuery(
  skills: readonly string[],
  query: string | undefined | null,
): readonly string[] {
  const cleanQuery = (query ?? "").replace(/^@+/, "").trim().toLowerCase();
  if (!cleanQuery) return skills;
  return Object.freeze(
    skills.filter((sk) => sk.toLowerCase().includes(cleanQuery)),
  );
}

export function resolveAvailableSkillIds(
  preferredSkillIds?: readonly string[],
  snapshot: GuildSnapshot = clientState.currentSnapshot,
): readonly string[] {
  const seen = new Set<string>();
  const addSkill = (raw: string | undefined | null) => {
    const clean = (raw ?? "").replace(/^@+/, "").trim();
    if (clean) seen.add(clean);
  };

  for (const sk of preferredSkillIds ?? []) addSkill(sk);
  for (const sk of snapshot?.availableSkillIds ?? []) addSkill(sk);
  for (const char of Object.values(snapshot?.characters ?? {})) {
    for (const grimoire of char.skillGrimoires ?? []) {
      addSkill(grimoire.skillId);
    }
  }
  for (const sk of DEFAULT_GUILD_SKILL_IDS) addSkill(sk);

  return Object.freeze([...seen]);
}

function resolveOptionSkills(skills?: readonly string[]): readonly string[] {
  if (skills && skills.length > 0) {
    const seen = new Set<string>();
    for (const sk of skills) {
      const clean = (sk ?? "").replace(/^@+/, "").trim();
      if (clean) seen.add(clean);
    }
    if (seen.size > 0) return Object.freeze([...seen]);
  }
  return resolveAvailableSkillIds();
}

export function extractMentionedSkillSet(text: string | undefined | null): Set<string> {
  const mentioned = new Set<string>();
  if (!text) return mentioned;
  const regex = /(?:^|\s)@([a-zA-Z0-9_-]+)/g;
  let match: RegExpExecArray | null = null;
  while ((match = regex.exec(text)) !== null) {
    if (match[1]) mentioned.add(match[1]);
  }
  return mentioned;
}

export function appendSkillToMessageText(
  currentText: string,
  skillId: string,
): string {
  const cleanSkill = skillId.replace(/^@+/, "").trim();
  if (!cleanSkill) return currentText;
  const prefix = currentText && !/\s$/.test(currentText) ? " " : "";
  return `${currentText}${prefix}@${cleanSkill} `;
}

export function computeVisibleSkillWindow(
  skills: readonly string[],
  offset: number,
  charBudget = 38,
): VisibleSkillWindow {
  const total = skills.length;
  if (total === 0) {
    return { visibleSkills: [], normalizedOffset: 0, total: 0 };
  }
  const normalizedOffset = ((offset % total) + total) % total;
  const effectiveBudget = Math.max(14, charBudget);
  const maxBadges = Math.min(total, 5);
  const visible: string[] = [];
  let usedChars = 0;

  for (let i = 0; i < maxBadges; i += 1) {
    const candidate = skills[(normalizedOffset + i) % total]!;
    const badgeCost = candidate.length + 5;
    if (i === 0 || usedChars + badgeCost <= effectiveBudget) {
      visible.push(candidate);
      usedChars += badgeCost;
    } else {
      break;
    }
  }

  return {
    visibleSkills: Object.freeze(visible),
    normalizedOffset,
    total,
  };
}

function renderSkillBadgesInnerHtml(
  scopeId: string,
  visibleSkills: readonly string[],
  mentionedSkills: ReadonlySet<string>,
): string {
  return visibleSkills
    .map((sk) => {
      const isSelected = mentionedSkills.has(sk);
      return `<button type="button" class="btn skill-chip-btn skill-browser-badge${isSelected ? " active" : ""}" data-skill-chip="${escapeHtml(sk)}" data-skill-browser-scope="${escapeHtml(scopeId)}" aria-pressed="${isSelected ? "true" : "false"}" title="Append @${escapeHtml(sk)} to command message"><span class="skill-browser-badge-label">@${escapeHtml(sk)}</span></button>`;
    })
    .join("");
}

export function renderSkillBrowserRowHtml(
  options: SkillBrowserRenderOptions,
): string {
  const allSkills = resolveOptionSkills(options.skills);
  if (options.filterText !== undefined) {
    skillFilterByScope.set(options.scopeId, options.filterText);
  }
  const filterVal = getSkillBrowserFilter(options.scopeId);
  const skills = filterSkillIdsByQuery(allSkills, filterVal);
  const offset = getSkillBrowserOffset(options.scopeId);
  const { visibleSkills, normalizedOffset, total } = computeVisibleSkillWindow(
    skills,
    offset,
    options.charBudget ?? 38,
  );
  skillOffsetByScope.set(options.scopeId, normalizedOffset);

  const mentionedSkills = extractMentionedSkillSet(options.currentInputText);
  const badgesHtml = renderSkillBadgesInnerHtml(
    options.scopeId,
    visibleSkills,
    mentionedSkills,
  );
  const navDisabledAttr = total <= 1 ? " disabled" : "";
  const prevIdx = total > 0 ? ((normalizedOffset - 1 + total) % total) + 1 : 0;
  const nextIdx = total > 0 ? ((normalizedOffset + 1) % total) + 1 : 0;
  const countLabel = total > 0 ? `${normalizedOffset + 1}/${total}` : "0/0";
  const escapedScope = escapeHtml(options.scopeId);

  return `<div class="project-browser-row skill-browser-row" role="group" aria-label="Available Skills Browser" data-skill-browser="${escapedScope}"><input type="text" class="skill-browser-filter-input" data-skill-filter="${escapedScope}" data-skill-browser-scope="${escapedScope}" size="6" value="${escapeHtml(filterVal)}" placeholder="filter" aria-label="Filter skills" title="Filter skills by name" autocomplete="off" spellcheck="false" /><button type="button" class="btn project-browser-nav-btn skill-browser-nav-btn" data-skill-nav="prev" data-skill-browser-scope="${escapedScope}" title="Previous skills (${prevIdx}/${total})" aria-label="Previous skills"${navDisabledAttr}>◀</button><div class="btn subtab-btn project-browser-current-btn skill-browser-track" data-skill-track="${escapedScope}"><div class="skill-browser-badges" data-skill-badges="${escapedScope}">${badgesHtml}</div><span class="project-browser-count skill-browser-count" data-skill-count="${escapedScope}">${countLabel}</span></div><button type="button" class="btn project-browser-nav-btn skill-browser-nav-btn" data-skill-nav="next" data-skill-browser-scope="${escapedScope}" title="Next skills (${nextIdx}/${total})" aria-label="Next skills"${navDisabledAttr}>▶</button></div>`;
}

export function syncSkillBrowserSelectionState(
  containerEl: HTMLElement | null | undefined,
  scopeId: string,
  currentInputText: string,
): void {
  if (!containerEl?.querySelectorAll) return;
  const mentioned = extractMentionedSkillSet(currentInputText);
  for (const chip of containerEl.querySelectorAll<HTMLButtonElement>(
    `button[data-skill-chip][data-skill-browser-scope="${scopeId}"]`,
  )) {
    const sk = chip.getAttribute("data-skill-chip") || "";
    const isSelected = mentioned.has(sk);
    chip.classList?.toggle("active", isSelected);
    chip.setAttribute?.("aria-pressed", isSelected ? "true" : "false");
  }
}

export function bindSkillBrowserControls(
  options: SkillBrowserBindOptions,
): void {
  const { containerEl, scopeId, getTargetInput, onInputUpdated } = options;
  if (!containerEl?.querySelectorAll) return;
  const allSkills = resolveOptionSkills(options.skills);
  const resolveFilteredSkills = () =>
    filterSkillIdsByQuery(allSkills, getSkillBrowserFilter(scopeId));

  const resolveEffectiveCharBudget = (): number => {
    const trackEl = containerEl.querySelector?.(
      `[data-skill-track="${scopeId}"]`,
    ) as HTMLElement | null;
    const widthPx = trackEl?.clientWidth ?? 0;
    if (widthPx > 100) {
      return Math.max(18, Math.floor((widthPx - 42) / 5.8));
    }
    return options.charBudget ?? 38;
  };

  const bindBadgeClicks = () => {
    const scopedBadges = containerEl.querySelectorAll<HTMLButtonElement>(
      `button[data-skill-chip][data-skill-browser-scope="${scopeId}"]`,
    );
    const badges =
      scopedBadges.length > 0
        ? scopedBadges
        : containerEl.querySelectorAll<HTMLButtonElement>("button[data-skill-chip]");

    for (const chip of badges) {
      if (chip.getAttribute?.("data-skill-chip-bound") === "true") continue;
      chip.setAttribute?.("data-skill-chip-bound", "true");
      chip.addEventListener("click", () => {
        const sk = chip.getAttribute("data-skill-chip");
        const inputEl = getTargetInput();
        if (!sk || !inputEl) return;
        const nextVal = appendSkillToMessageText(inputEl.value ?? "", sk);
        inputEl.value = nextVal;
        onInputUpdated?.(nextVal, inputEl, sk);
        syncSkillBrowserSelectionState(containerEl, scopeId, nextVal);
        inputEl.focus?.();
      });
    }
  };

  const refreshWindowDom = (newOffset: number) => {
    const skills = resolveFilteredSkills();
    const total = skills.length;
    const { visibleSkills, normalizedOffset } = computeVisibleSkillWindow(
      skills,
      newOffset,
      resolveEffectiveCharBudget(),
    );
    skillOffsetByScope.set(scopeId, normalizedOffset);
    const inputVal = getTargetInput()?.value ?? "";
    const mentioned = extractMentionedSkillSet(inputVal);

    const badgesWrap = containerEl.querySelector?.(
      `[data-skill-badges="${scopeId}"]`,
    ) as HTMLElement | null;
    if (badgesWrap) {
      badgesWrap.innerHTML = renderSkillBadgesInnerHtml(
        scopeId,
        visibleSkills,
        mentioned,
      );
    }
    const countEl = containerEl.querySelector?.(
      `[data-skill-count="${scopeId}"]`,
    ) as HTMLElement | null;
    if (countEl) {
      countEl.textContent = total > 0 ? `${normalizedOffset + 1}/${total}` : "0/0";
    }
    for (const navBtn of containerEl.querySelectorAll<HTMLButtonElement>(
      `button[data-skill-nav][data-skill-browser-scope="${scopeId}"]`,
    )) {
      navBtn.disabled = total <= 1;
    }
    bindBadgeClicks();
  };

  const filterInput = (containerEl.querySelector?.(
    `input[data-skill-filter="${scopeId}"]`,
  ) ??
    containerEl.querySelector?.(
      "input.skill-browser-filter-input",
    )) as HTMLInputElement | null;
  if (filterInput && filterInput.getAttribute?.("data-skill-filter-bound") !== "true") {
    filterInput.setAttribute?.("data-skill-filter-bound", "true");
    filterInput.addEventListener("input", () => {
      setSkillBrowserFilter(scopeId, filterInput.value ?? "");
      setSkillBrowserOffset(scopeId, 0);
      refreshWindowDom(0);
    });
    filterInput.addEventListener("keydown", (ev: KeyboardEvent) => {
      if (ev.key === "Enter") ev.preventDefault();
    });
  }

  for (const navBtn of containerEl.querySelectorAll<HTMLButtonElement>(
    `button[data-skill-nav][data-skill-browser-scope="${scopeId}"]`,
  )) {
    if (navBtn.getAttribute?.("data-skill-nav-bound") === "true") continue;
    navBtn.setAttribute?.("data-skill-nav-bound", "true");
    navBtn.addEventListener("click", () => {
      const total = resolveFilteredSkills().length;
      if (total <= 1) return;
      const dir = navBtn.getAttribute("data-skill-nav");
      const currentOffset = getSkillBrowserOffset(scopeId);
      const step = dir === "prev" ? -1 : 1;
      const nextOffset = ((currentOffset + step) % total + total) % total;
      refreshWindowDom(nextOffset);
    });
  }

  bindBadgeClicks();
}
