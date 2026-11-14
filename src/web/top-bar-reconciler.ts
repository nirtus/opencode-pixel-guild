import { buildTopBarViewModel } from "../hud/index.ts";
import { resolveCharacterWorldFocus } from "../spatial/index.ts";
import { resolveOperatorDisplayAlias } from "../types/domain.ts";
import {
  initAddWorldFolderControls,
  openAddWorldFolderModal,
} from "./add-world-folder-controller.ts";
import {
  clientState,
  getSelectedProjectRoom,
  isMobileViewport,
  resolveProjectWorldAfterHydration,
  selectCommitRepository,
} from "./client-state.ts";
import { clearCachedGitState, refreshRoomGitState } from "./commit-ledger-controller.ts";
import {
  dispatchOperatorModalAction,
  getCachedOperatorProfile,
  getOperatorHeaders,
  openOperatorPairingModal,
  refreshCachedOperatorProfile,
  syncOperatorPreferences,
} from "./operator-pairing-controller.ts";
import { applyAuthoritativeSnapshot, getPendingOperatorAction } from "./snapshot-gate.ts";

let controlsInitialized = false;

function updateTextIfChanged(el: HTMLElement | null, text: string): void {
  if (el && el.textContent !== text) {
    el.textContent = text;
  }
}

export function initTopBarControls(onStateChanged: () => void): void {
  initAddWorldFolderControls(onStateChanged);
  if (controlsInitialized) return;
  controlsInitialized = true;

  const daemonBadge = document.getElementById("daemon-indicator");
  if (daemonBadge) {
    daemonBadge.addEventListener("click", () => {
      void openOperatorPairingModal(onStateChanged, "machines");
    });
  }

  const btnPairing = document.getElementById("btn-open-pairing-modal");
  if (btnPairing) {
    btnPairing.addEventListener("click", () => {
      void openOperatorPairingModal(onStateChanged, "machines");
    });
  }

  const btnAccount = document.getElementById("btn-open-account-modal");
  if (btnAccount) {
    btnAccount.addEventListener("click", () => {
      const isSignedIn =
        clientState.isAuthenticated &&
        Boolean(resolveOperatorDisplayAlias(getCachedOperatorProfile()));
      void openOperatorPairingModal(onStateChanged, isSignedIn ? "profile" : "login");
    });
  }

  const btnRefresh = document.getElementById("btn-refresh-live");
  if (btnRefresh) {
    btnRefresh.addEventListener("click", async () => {
      updateTextIfChanged(btnRefresh, "⏳");
      try {
        const [res] = await Promise.all([
          fetch("/api/guild/refresh", {
            method: "POST",
            headers: getOperatorHeaders(),
            signal:
              typeof AbortSignal?.timeout === "function"
                ? AbortSignal.timeout(8000)
                : undefined,
          }),
          refreshCachedOperatorProfile(),
        ]);
        if (res.ok) {
          const payload = await res.json();
          if (payload?.snapshot) {
            applyAuthoritativeSnapshot(payload.snapshot);
          }
          clearCachedGitState();
          const room = getSelectedProjectRoom();
          if (room?.roomId) {
            await refreshRoomGitState(room.roomId, onStateChanged);
          }
        }
      } catch {
        // Ignore transient network errors
      } finally {
        updateTextIfChanged(btnRefresh, "🔄");
        onStateChanged();
      }
    });
  }

  const btnLineage = document.getElementById("btn-toggle-lineage");
  if (btnLineage) {
    btnLineage.addEventListener("click", () => {
      const nextRoster =
        clientState.rosterMode === "active-squads"
          ? "full-lineage"
          : "active-squads";
      void syncOperatorPreferences({ rosterMode: nextRoster });
      onStateChanged();
    });
  }

  const btnStyle = document.getElementById("btn-toggle-style");
  if (btnStyle) {
    btnStyle.addEventListener("click", () => {
      const nextStyle =
        clientState.visualStyleMode === "clean-cartoon"
          ? "pixel-atlas"
          : "clean-cartoon";
      void syncOperatorPreferences({ visualStyleMode: nextStyle });
      onStateChanged();
    });
  }
}

export function reconcileTopBar(onStateChanged: () => void): void {
  let vm = buildTopBarViewModel(
    clientState.currentSnapshot,
    clientState,
    getCachedOperatorProfile(),
  );
  if (vm.worldTabs.length > 0 && !clientState.isAllWorldsFocused) {
    const prevProj = clientState.selectedProjectId;
    const nextProj = resolveProjectWorldAfterHydration(vm.worldTabs, prevProj);
    if (nextProj !== prevProj) {
      vm = buildTopBarViewModel(
        clientState.currentSnapshot,
        clientState,
        getCachedOperatorProfile(),
      );
    }
  } else if (vm.worldTabs.length === 0 && clientState.selectedProjectId !== null) {
    clientState.selectedProjectId = null;
    clientState.selectedRoomId = null;
  }
  updateTextIfChanged(
    document.getElementById("daemon-indicator"),
    vm.daemonIndicatorText,
  );
  updateTextIfChanged(
    document.getElementById("summary-indicator"),
    vm.statusSummaryText,
  );

  const machineStrip = document.getElementById("header-machine-strip");
  if (machineStrip) {
    const desiredMachineIds = new Set<string>();
    const existingMachineBtns = new Map<string, HTMLButtonElement>();
    for (const btn of machineStrip.querySelectorAll<HTMLButtonElement>(
      "button[data-machine-switch-id]",
    )) {
      const mid = btn.getAttribute("data-machine-switch-id");
      if (mid) existingMachineBtns.set(mid, btn);
    }

    for (const mTab of vm.machineTabs) {
      desiredMachineIds.add(mTab.machineId);
      let mBtn = existingMachineBtns.get(mTab.machineId);
      if (!mBtn) {
        mBtn = document.createElement("button");
        mBtn.type = "button";
        mBtn.className = "btn machine-switch-btn";
        mBtn.setAttribute("data-machine-switch-id", mTab.machineId);
        mBtn.addEventListener("click", () => {
          void dispatchOperatorModalAction(
            "activate-machine",
            { machineId: mTab.machineId },
            onStateChanged,
            null,
          );
        });
        machineStrip.appendChild(mBtn);
      }
      const isSwitchingMachine = getPendingOperatorAction() === `activate-machine:${mTab.machineId}`;
      mBtn.disabled = isSwitchingMachine;
      mBtn.classList.toggle("active", mTab.isActive);
      updateTextIfChanged(mBtn, isSwitchingMachine ? "⏳ Switching..." : mTab.buttonText);
      mBtn.title = mTab.tooltip;
    }

    for (const [mid, btn] of existingMachineBtns.entries()) {
      if (!desiredMachineIds.has(mid)) {
        btn.remove();
      }
    }
  }

  const pairBtn = document.getElementById("btn-open-pairing-modal");
  if (pairBtn) {
    updateTextIfChanged(
      pairBtn,
      vm.machineTabs.length > 0 ? vm.pairActionLabel : vm.connectionPill.label,
    );
    pairBtn.title = vm.connectionPill.tooltip;
  }

  const acctBtn = document.getElementById("btn-open-account-modal");
  if (acctBtn) {
    updateTextIfChanged(acctBtn, vm.accountPill.authenticated ? "👤" : "👤 Login");
    acctBtn.title = vm.accountPill.tooltip;
  }

  const btnLineage = document.getElementById("btn-toggle-lineage");
  if (btnLineage) {
    btnLineage.classList.toggle("active", vm.rosterActive);
    updateTextIfChanged(btnLineage, vm.rosterActive ? "👥 All" : "👥");
    btnLineage.title = `${vm.rosterButtonText} — Click to toggle Active Squads vs Full Lineage`;
  }

  const btnStyle = document.getElementById("btn-toggle-style");
  if (btnStyle) {
    btnStyle.classList.toggle("active", vm.styleActive);
    updateTextIfChanged(btnStyle, vm.styleActive ? "👾" : "🎨");
    btnStyle.title = `${vm.styleButtonText} — Click to toggle Clean Cartoon vs Pixel Atlas`;
  }

  const filterContainer = document.getElementById("room-filter-buttons");
  if (!filterContainer) return;

  const projTabs = vm.worldTabs;

  if (projTabs.length > 0 && !clientState.isAllWorldsFocused) {
    resolveProjectWorldAfterHydration(projTabs, clientState.selectedProjectId);
  }

  let labelEl = filterContainer.querySelector(
    ".scenario-label",
  ) as HTMLElement | null;
  if (!labelEl) {
    labelEl = document.createElement("span");
    labelEl.className = "scenario-label";
    filterContainer.prepend(labelEl);
  }
  updateTextIfChanged(labelEl, vm.worldLabel);

  const desiredKeys = new Set<string>();
  const existingBtns = new Map<string, HTMLButtonElement>();
  for (const btn of filterContainer.querySelectorAll<HTMLButtonElement>(
    "button[data-tab-key]",
  )) {
    const k = btn.getAttribute("data-tab-key");
    if (k) existingBtns.set(k, btn);
  }

  if (projTabs.length > 0) {
    const allKey = "proj:all";
    desiredKeys.add(allKey);
    let allBtn = existingBtns.get(allKey);
    if (!allBtn) {
      allBtn = document.createElement("button");
      allBtn.type = "button";
      allBtn.className = "btn";
      allBtn.setAttribute("data-tab-key", allKey);
      allBtn.addEventListener("click", () => {
        selectCommitRepository(null);
        onStateChanged();
      });
      filterContainer.appendChild(allBtn);
    }
    const isMobile = isMobileViewport();
    const isAllActive = clientState.isAllWorldsFocused || clientState.selectedProjectId === null;
    allBtn.classList.toggle("active", isAllActive);
    allBtn.title = "Show all projects with equal focus inside the shared Workshop Room";
    updateTextIfChanged(allBtn, isMobile ? "🌐 All" : `🌐 All (${projTabs.length})`);

    for (const tab of projTabs) {
      const key = `proj:${tab.projectId}`;
      desiredKeys.add(key);
      let btn = existingBtns.get(key);
      if (!btn) {
        btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn";
        btn.setAttribute("data-tab-key", key);
        btn.setAttribute("data-project-id", tab.projectId);
        const tabBtn = btn;
        tabBtn.addEventListener("click", () => {
          const projId = tabBtn.getAttribute("data-project-id") || tab.projectId;
          const alreadyFocused =
            !clientState.isAllWorldsFocused && clientState.selectedProjectId === projId;
          const nextRoom = selectCommitRepository(alreadyFocused ? null : projId);
          if (clientState.mobileActiveTab !== "character") {
            clientState.selectedSessionId = null;
          } else if (!alreadyFocused && clientState.selectedSessionId) {
            const curChar = clientState.currentSnapshot.characters?.[clientState.selectedSessionId];
            if (!curChar || !resolveCharacterWorldFocus(curChar, clientState.currentSnapshot, projId).isFocusedMember) {
              const projChar = Object.values(clientState.currentSnapshot.characters || {}).find(
                (c) =>
                  c.lifecycleState !== "Archived" &&
                  resolveCharacterWorldFocus(c, clientState.currentSnapshot, projId).isFocusedMember,
              );
              if (projChar) {
                clientState.selectedSessionId = projChar.sessionId;
              } else {
                clientState.selectedSessionId = null;
                clientState.mobileActiveTab = "ledger";
              }
            }
          }
          if (nextRoom?.roomId) {
            void refreshRoomGitState(nextRoom.roomId, onStateChanged);
          }
          onStateChanged();
        });
        filterContainer.appendChild(btn);
      }
      const isSelected =
        !clientState.isAllWorldsFocused &&
        (clientState.selectedProjectId === tab.projectId ||
          (clientState.selectedProjectId === null && tab.active));
      btn.classList.toggle("active", isSelected);
      btn.setAttribute("data-herald-tag", tab.shortTag || tab.projectName);
      if (tab.partyKey) btn.setAttribute("data-herald-party", tab.partyKey);
      btn.title = `${tab.crestIcon || "🛡️"} ${tab.projectName} · ${tab.partyName || "Guild Order"} — Click to toggle World Focus Aura on characters in this project`;
      const mobileProjLabel = `${tab.crestIcon || "🏰"} ${tab.shortTag || tab.projectName}`;
      const desktopProjLabel = `${tab.crestIcon || "🏰"} ${tab.projectName} (${tab.sessionCount})${isSelected ? " ✨" : ""}`;
      updateTextIfChanged(btn, isMobile ? mobileProjLabel : desktopProjLabel);
    }
  } else {
    const key = "room:all";
    desiredKeys.add(key);
    let btn = existingBtns.get(key);
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn";
      btn.setAttribute("data-tab-key", key);
      btn.addEventListener("click", () => {
        clientState.selectedRoomId = null;
        onStateChanged();
      });
      filterContainer.appendChild(btn);
    }
    btn.classList.toggle("active", clientState.selectedRoomId === null);
    updateTextIfChanged(btn, `All Rooms (${vm.totalRooms})`);
  }

  const addKey = "proj:add";
  desiredKeys.add(addKey);
  let addBtn = existingBtns.get(addKey);
  if (!addBtn) {
    addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.id = "btn-add-world-folder";
    addBtn.className = "btn btn-icon-compact btn-add-world";
    addBtn.setAttribute("data-tab-key", addKey);
    addBtn.setAttribute("aria-label", "Add folder as new World");
    addBtn.title = "Add folder as new Project World";
    addBtn.addEventListener("click", () => {
      void openAddWorldFolderModal(onStateChanged);
    });
    filterContainer.appendChild(addBtn);
  } else if (filterContainer.lastElementChild !== addBtn) {
    filterContainer.appendChild(addBtn);
  }
  updateTextIfChanged(addBtn, "＋");

  // Remove any stale buttons not in desiredKeys
  for (const [k, btn] of existingBtns.entries()) {
    if (!desiredKeys.has(k)) {
      btn.remove();
    }
  }
}
