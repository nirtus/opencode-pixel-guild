import { formatPublicSafePath } from "../hud/index.ts";
import { resolveProjectHeraldry, resolveRoomCanonicalProjectRoot } from "../spatial/index.ts";
import { isSelectablePrimaryAgentMode } from "../types/domain.ts";
import {
  clientState, getActiveRoom, getSelectedProjectRoom, reconcileMobileDrawerSelection, selectCommitRepository,
} from "./client-state.ts";
import {
  dispatchGuildCommandFromWeb, formatCompactModeLabel, getLastSummonedSessionId,
} from "./command-scroll-controller.ts";
import { escapeHtml } from "./ledger-panel-reconciler.ts";
import {
  bindSkillBrowserControls, renderSkillBrowserRowHtml, resolveAvailableSkillIds, syncSkillBrowserSelectionState,
} from "./skill-browser-controller.ts";

const SUMMON_SKILL_SCOPE_ID = "summon:adventurer";

const DEFAULT_PRIMARY_AGENT_MODES: ReadonlyArray<{ id: string; name?: string; description?: string }> = [
  { id: "build", name: "build", description: "Warrior / Feature Smith" },
  { id: "plan", name: "plan", description: "Scout / Strategist" },
  { id: "document", name: "document", description: "Mage / Lore & Specs" },
];

let selectedAgentClass = "build";
let preferredSummonDirectory: string | null = null;
let userSelectedSummonDirectory: string | null = null;
let boundSummonDoc: unknown = null;

function formatAgentModeOptionLabel(mode: { id: string; name?: string; description?: string }): string {
  if (mode.id === "build") return "⚔️ build (Warrior / Feature Smith)";
  if (mode.id === "plan") return "📐 plan (Scout / Strategist)";
  if (mode.id === "document") return "📜 document (Mage / Lore & Specs)";
  const desc = mode.description || (mode.name && mode.name !== mode.id ? mode.name : "Primary Agent");
  return `✨ ${mode.id} (${desc})`;
}

function findMatchingRoomByDirectory<
  T extends { roomId: string; locationDirectory: string; parentProjectDirectory?: string | null; isWorktree?: boolean },
>(
  allRooms: ReadonlyArray<T>,
  targetDir: string | null | undefined,
): T | undefined {
  if (!targetDir) return undefined;
  return allRooms.find(
    (r) =>
      r.locationDirectory === targetDir ||
      r.roomId === targetDir ||
      resolveRoomCanonicalProjectRoot(r).projectRoot === targetDir,
  );
}

export function getDefaultSummonDirectory(): string {
  const allRooms = Object.values(clientState.currentSnapshot.rooms || {});
  if (preferredSummonDirectory) {
    const matched = findMatchingRoomByDirectory(allRooms, preferredSummonDirectory);
    return matched?.locationDirectory || preferredSummonDirectory;
  }
  if (!clientState.isAllWorldsFocused && clientState.selectedProjectId) {
    const selectedProjRoom = getSelectedProjectRoom();
    if (selectedProjRoom?.locationDirectory) {
      return selectedProjRoom.locationDirectory;
    }
    return clientState.selectedRoomId || clientState.selectedProjectId;
  }
  if (clientState.selectedSessionId) {
    const selChar = clientState.currentSnapshot.characters?.[clientState.selectedSessionId];
    const selRoom = findMatchingRoomByDirectory(allRooms, selChar?.roomId || selChar?.locationDirectory);
    if (selRoom?.locationDirectory) return selRoom.locationDirectory;
  }
  const primaryRooms = allRooms.filter((r) => !r.isWorktree);
  const chars = Object.values(clientState.currentSnapshot.characters || {});
  const roomWithChars = primaryRooms.find(
    (r) =>
      (r.activeSessionIds?.length ?? 0) > 0 ||
      chars.some((c) => c.roomId === r.roomId || c.locationDirectory === r.locationDirectory),
  );
  if (roomWithChars?.locationDirectory) return roomWithChars.locationDirectory;
  const vizRoom = primaryRooms.find((r) => r.locationDirectory.toLowerCase().endsWith("/opencode-game-visualizer"));
  if (vizRoom?.locationDirectory) return vizRoom.locationDirectory;
  const activeRoom = getActiveRoom();
  if (activeRoom?.locationDirectory) return activeRoom.locationDirectory;
  return primaryRooms[0]?.locationDirectory || allRooms[0]?.locationDirectory || "/";
}

function formatConciseRoomLabel(projectName: string, directory: string): string {
  const heraldry = resolveProjectHeraldry(
    { roomId: directory, locationDirectory: directory, projectName },
    clientState.currentSnapshot,
  );
  const isCompact = typeof window !== "undefined" && window.innerWidth <= 960;
  if (isCompact) {
    return `${heraldry.crestIcon} ${projectName} [${heraldry.shortTag}]`;
  }
  const safeDir = formatPublicSafePath(directory);
  const shortDir =
    safeDir.length > 38 ? `…/${safeDir.split("/").slice(-2).join("/")}` : safeDir;
  return `${heraldry.crestIcon} ${projectName} [${heraldry.shortTag}] (${shortDir})`;
}

export function syncSummonModalDom(): void {
  if (typeof document === "undefined") return;
  const modal = document.getElementById("summon-adventurer-modal");
  if (!modal) return;
  modal.style.display = clientState.isSummonModalOpen ? "grid" : "none";
  if (!clientState.isSummonModalOpen) return;

  const allRooms = Object.values(clientState.currentSnapshot.rooms || {});
  const targetDir =
    userSelectedSummonDirectory ||
    preferredSummonDirectory ||
    getDefaultSummonDirectory();
  const matchedRoom = findMatchingRoomByDirectory(allRooms, targetDir);
  const selectedDirValue = matchedRoom ? matchedRoom.locationDirectory : targetDir;

  const dirSelect = modal.querySelector("#summon-directory-select") as HTMLSelectElement | null;
  if (dirSelect) {
    const dirOptionsSig = allRooms.length > 0
      ? allRooms.map((r) => `${r.locationDirectory}:${r.projectName}`).join("|")
      : `fallback:${selectedDirValue}`;
    if (dirSelect.getAttribute?.("data-options-sig") !== dirOptionsSig || !dirSelect.innerHTML) {
      dirSelect.setAttribute?.("data-options-sig", dirOptionsSig);
      dirSelect.innerHTML = allRooms.length > 0
        ? allRooms.map((r) => `<option value="${escapeHtml(r.locationDirectory)}" ${r.locationDirectory === selectedDirValue ? "selected" : ""}>${escapeHtml(formatConciseRoomLabel(r.projectName, r.locationDirectory))}</option>`).join("")
        : `<option value="${escapeHtml(selectedDirValue)}" selected>${escapeHtml(selectedDirValue)}</option>`;
    }
    dirSelect.value = selectedDirValue;
  }

  const roomModes = Array.isArray(matchedRoom?.availableAgents)
    ? matchedRoom.availableAgents.filter((a) => isSelectablePrimaryAgentMode(a))
    : [];
  const snapshotModes = clientState.currentSnapshot.availableAgentModes;
  const modes =
    roomModes.length > 0
      ? roomModes
      : Array.isArray(snapshotModes) && snapshotModes.length > 0
        ? snapshotModes
        : DEFAULT_PRIMARY_AGENT_MODES;
  if (!modes.some((m) => m.id === selectedAgentClass)) {
    selectedAgentClass = modes.find((m) => m.id === "build")?.id ?? modes[0]?.id ?? "build";
  }
  const modesSig = modes.map((m) => `${m.id}:${m.name || ""}:${m.description || ""}`).join("|");

  const agentSelect = modal.querySelector("#summon-agent-class") as HTMLSelectElement | null;
  if (agentSelect) {
    if (agentSelect.getAttribute?.("data-options-sig") !== modesSig || !agentSelect.innerHTML) {
      agentSelect.setAttribute?.("data-options-sig", modesSig);
      agentSelect.innerHTML = modes.map((m) => `<option value="${escapeHtml(m.id)}" ${m.id === selectedAgentClass ? "selected" : ""}>${escapeHtml(formatAgentModeOptionLabel(m))}</option>`).join("");
    }
    agentSelect.value = selectedAgentClass;
  }

  const actionAgentSelect = modal.querySelector("#summon-action-agent-select") as HTMLSelectElement | null;
  if (actionAgentSelect) {
    if (actionAgentSelect.getAttribute?.("data-options-sig") !== modesSig || !actionAgentSelect.innerHTML) {
      actionAgentSelect.setAttribute?.("data-options-sig", modesSig);
      actionAgentSelect.innerHTML = modes.map((m) => `<option value="${escapeHtml(m.id)}" ${m.id === selectedAgentClass ? "selected" : ""}>${escapeHtml(formatCompactModeLabel(m.id))}</option>`).join("");
    }
    actionAgentSelect.value = selectedAgentClass;
  }

  for (const btn of modal.querySelectorAll<HTMLButtonElement>("button[data-summon-agent]")) {
    btn.classList.toggle("active", btn.getAttribute("data-summon-agent") === selectedAgentClass);
  }

  const skillSlot = modal.querySelector("#summon-skill-browser-slot") as HTMLElement | null;
  const promptInput = modal.querySelector("#summon-prompt-input") as HTMLTextAreaElement | null;
  if (skillSlot) {
    const summonSkills = resolveAvailableSkillIds();
    const skillsSig = summonSkills.join("|");
    const isFilterFocused =
      typeof document !== "undefined" &&
      Boolean(document.activeElement && skillSlot.contains?.(document.activeElement));
    if (
      (isFilterFocused && skillSlot.querySelector?.(`[data-skill-browser="${SUMMON_SKILL_SCOPE_ID}"]`)) ||
      (skillSlot.getAttribute?.("data-skills-sig") === skillsSig && Boolean(skillSlot.innerHTML))
    ) {
      syncSkillBrowserSelectionState(skillSlot, SUMMON_SKILL_SCOPE_ID, promptInput?.value ?? "");
    } else {
      skillSlot.setAttribute?.("data-skills-sig", skillsSig);
      skillSlot.innerHTML = renderSkillBrowserRowHtml({
        scopeId: SUMMON_SKILL_SCOPE_ID,
        skills: summonSkills,
        currentInputText: promptInput?.value ?? "",
        charBudget: 44,
      });
      bindSkillBrowserControls({
        containerEl: skillSlot,
        scopeId: SUMMON_SKILL_SCOPE_ID,
        skills: summonSkills,
        getTargetInput: () => modal.querySelector("#summon-prompt-input") as HTMLTextAreaElement | null,
        charBudget: 44,
      });
    }
  }
}

export function openSummonAdventurerModal(preferredDirectory?: string): void {
  preferredSummonDirectory = preferredDirectory?.trim() || null;
  userSelectedSummonDirectory = null;
  clientState.isSummonModalOpen = true;
  syncSummonModalDom();
  const isFinePointer =
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function" ||
    window.matchMedia("(pointer: fine)").matches;
  if (isFinePointer && typeof document !== "undefined") {
    const promptEl = document.getElementById(
      "summon-prompt-input",
    ) as HTMLTextAreaElement | null;
    promptEl?.focus?.();
  }
}

export function closeSummonAdventurerModal(): void {
  clientState.isSummonModalOpen = false;
  preferredSummonDirectory = null;
  userSelectedSummonDirectory = null;
  syncSummonModalDom();
}

export function initSummonAdventurerControls(
  onStateChanged: () => void,
): void {
  if (typeof document === "undefined") return;
  const modal = document.getElementById("summon-adventurer-modal");

  if (boundSummonDoc !== document) {
    boundSummonDoc = document;
    document.addEventListener("click", (ev) => {
      const target = ev.target as HTMLElement | null;
      const trigger = target?.closest?.(
        "#btn-open-summon-modal, [data-open-summon-modal]",
      );
      if (trigger) {
        ev.preventDefault();
        openSummonAdventurerModal();
        onStateChanged();
      }
    });
    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      window.addEventListener("keydown", (ev) => {
        if (ev.key === "Escape" && clientState.isSummonModalOpen) {
          closeSummonAdventurerModal();
          onStateChanged();
        }
      });
    }
  }

  if (!modal || modal.hasAttribute("data-summon-modal-bound")) {
    syncSummonModalDom();
    return;
  }
  modal.setAttribute("data-summon-modal-bound", "true");
  syncSummonModalDom();

  modal.addEventListener("click", (ev) => {
    if (ev.target === modal) {
      closeSummonAdventurerModal();
      onStateChanged();
    }
  });

  const dirSelect = modal.querySelector("#summon-directory-select") as HTMLSelectElement | null;
  dirSelect?.addEventListener("change", () => {
    userSelectedSummonDirectory = dirSelect.value || null;
    syncSummonModalDom();
  });

  const agentSelect = modal.querySelector("#summon-agent-class") as HTMLSelectElement | null;
  const actionAgentSelect = modal.querySelector("#summon-action-agent-select") as HTMLSelectElement | null;
  agentSelect?.addEventListener("change", () => {
    selectedAgentClass = agentSelect.value || "build";
    if (actionAgentSelect) actionAgentSelect.value = selectedAgentClass;
  });
  actionAgentSelect?.addEventListener("change", () => {
    selectedAgentClass = actionAgentSelect.value || "build";
    if (agentSelect) agentSelect.value = selectedAgentClass;
  });

  for (const btn of modal.querySelectorAll<HTMLButtonElement>("button[data-summon-agent]")) {
    btn.addEventListener("click", () => {
      selectedAgentClass = btn.getAttribute("data-summon-agent") || "build";
      syncSummonModalDom();
    });
  }

  for (const closeSel of ["#btn-cancel-summon-adventurer", "#btn-close-summon-modal"]) {
    modal.querySelector(closeSel)?.addEventListener("click", () => {
      closeSummonAdventurerModal();
      onStateChanged();
    });
  }

  let isSubmitting = false;
  const submitSummon = async (): Promise<void> => {
    if (isSubmitting) return;
    isSubmitting = true;
    const confirmBtn = modal.querySelector("#btn-confirm-summon-adventurer") as HTMLButtonElement | null;
    const titleInput = modal.querySelector("#summon-title-input") as HTMLInputElement | null;
    const promptInput = modal.querySelector("#summon-prompt-input") as HTMLTextAreaElement | null;

    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.textContent = "⏳ Summoning...";
    }

    const directory = dirSelect?.value?.trim() || getDefaultSummonDirectory();
    const agentClass = actionAgentSelect?.value?.trim() || agentSelect?.value?.trim() || selectedAgentClass;
    const title = titleInput?.value?.trim() || undefined;
    const promptText = promptInput?.value?.trim() || undefined;

    try {
      const ok = await dispatchGuildCommandFromWeb(
        { command: "adventurer.summon", directory, title, agentClass, promptText },
        onStateChanged,
      );

      if (ok) {
        const roomsMap = clientState.currentSnapshot.rooms || {};
        const targetRoom =
          roomsMap[directory] ??
          findMatchingRoomByDirectory(Object.values(roomsMap), directory);
        const canonicalRoot = targetRoom
          ? resolveRoomCanonicalProjectRoot(targetRoom).projectRoot
          : directory;
        selectCommitRepository(canonicalRoot);

        const newSessionId = getLastSummonedSessionId();
        if (newSessionId) {
          const createdChar = clientState.currentSnapshot.characters?.[newSessionId];
          if (createdChar) {
            createdChar.isOpenInOpenCode = true;
            if (promptText) createdChar.lastUserPromptText = promptText;
          }
          reconcileMobileDrawerSelection(newSessionId, clientState.selectedSessionId);
        }
        if (titleInput) titleInput.value = "";
        if (promptInput) promptInput.value = "";
        const skillSlot = modal.querySelector("#summon-skill-browser-slot") as HTMLElement | null;
        syncSkillBrowserSelectionState(skillSlot, SUMMON_SKILL_SCOPE_ID, "");
        closeSummonAdventurerModal();
        onStateChanged();
      } else if (confirmBtn) {
        confirmBtn.textContent = "⚠️ Summon Failed — Retry";
      }
    } finally {
      isSubmitting = false;
      if (confirmBtn) {
        confirmBtn.disabled = false;
        if (!clientState.isSummonModalOpen) confirmBtn.textContent = "✨ Summon Adventurer";
      }
    }
  };

  modal.querySelector("#btn-confirm-summon-adventurer")?.addEventListener("click", () => void submitSummon());

  const summonPromptEl = modal.querySelector("#summon-prompt-input") as HTMLTextAreaElement | null;
  summonPromptEl?.addEventListener("input", () => {
    const skillSlot = modal.querySelector("#summon-skill-browser-slot") as HTMLElement | null;
    syncSkillBrowserSelectionState(skillSlot, SUMMON_SKILL_SCOPE_ID, summonPromptEl.value);
  });
  summonPromptEl?.addEventListener("keydown", (ev) => {
    const ke = ev as KeyboardEvent;
    if (ke.key === "Enter" && !ke.shiftKey) { ke.preventDefault(); void submitSummon(); }
  });
  modal.querySelector("#summon-title-input")?.addEventListener("keydown", (ev) => {
    const ke = ev as KeyboardEvent;
    if (ke.key === "Enter") { ke.preventDefault(); void submitSummon(); }
  });
}
