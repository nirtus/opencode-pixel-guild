import { matchProjectTabSelection } from "../spatial/index.ts";
import type { ClientOperatorPreferences } from "../types/domain.ts";
import { clampDesktopWorldRatio, DEFAULT_DESKTOP_WORLD_RATIO } from "./layout-resizer.ts";

export { matchProjectTabSelection };

export interface KeyValueStoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export const SELECTED_PROJECT_STORAGE_KEY = "guild.selectedProjectId";
export const OPERATOR_ID_STORAGE_KEY = "guild.operatorId";
export const UI_WINDOW_STATE_STORAGE_KEY = "guild.uiWindowState";

export function getBrowserStorage(custom?: KeyValueStoragePort | null): KeyValueStoragePort | null {
  if (custom) return custom;
  try {
    if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  } catch { /* Ignore storage access errors in restricted frames */ }
  return null;
}

export function readSavedProjectId(storage?: KeyValueStoragePort | null): string | null {
  const store = getBrowserStorage(storage);
  if (!store) return null;
  try {
    const val = store.getItem(SELECTED_PROJECT_STORAGE_KEY);
    return val && val.trim() ? val.trim() : null;
  } catch { return null; }
}

export function writeSavedProjectId(projectId: string | null, storage?: KeyValueStoragePort | null): void {
  const store = getBrowserStorage(storage);
  if (!store) return;
  try {
    if (projectId && projectId.trim()) {
      store.setItem(SELECTED_PROJECT_STORAGE_KEY, projectId.trim());
    } else {
      store.removeItem?.(SELECTED_PROJECT_STORAGE_KEY);
      writeSavedUiWindowState({ selectedProjectId: null }, storage);
    }
  } catch { /* Ignore quota errors */ }
}

export function isSavedAllWorldsSelection(storage?: KeyValueStoragePort | null): boolean {
  if (typeof window !== "undefined" && window.location?.search) {
    const p = new URLSearchParams(window.location.search);
    const q = (p.get("projectId") || p.get("project") || "").trim().toLowerCase();
    if (q === "all") return true;
    if (q) return false;
  }
  if (readSavedProjectId(storage)) return false;
  const savedUi = readSavedUiWindowState(storage);
  return Boolean(savedUi && "selectedProjectId" in savedUi && !savedUi.selectedProjectId);
}

export function readSavedUiWindowState(storage?: KeyValueStoragePort | null): Partial<ClientOperatorPreferences> | null {
  const store = getBrowserStorage(storage);
  if (!store) return null;
  try {
    const raw = store.getItem(UI_WINDOW_STATE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Partial<ClientOperatorPreferences>) : null;
  } catch { return null; }
}

export function writeSavedUiWindowState(prefs: Partial<ClientOperatorPreferences>, storage?: KeyValueStoragePort | null): void {
  const store = getBrowserStorage(storage);
  if (!store) return;
  try {
    const prev = readSavedUiWindowState(storage) ?? {};
    store.setItem(UI_WINDOW_STATE_STORAGE_KEY, JSON.stringify({ ...prev, ...prefs }));
  } catch { /* Ignore storage quota errors */ }
}

export function syncProjectUrlQueryParam(projectId: string | null): void {
  if (typeof window === "undefined" || !window.location || !window.history?.replaceState) return;
  try {
    const url = new URL(window.location.href);
    if (projectId && projectId.trim()) {
      url.searchParams.set("project", projectId.trim());
      url.searchParams.delete("projectId");
    } else {
      url.searchParams.delete("project");
      url.searchParams.delete("projectId");
      url.searchParams.delete("sessionId");
      url.searchParams.delete("roomId");
    }
    window.history.replaceState(null, "", url.toString());
  } catch { /* Ignore history replaceState errors */ }
}

let lastPersistedUiSig = "";
let serverSyncTimer: ReturnType<typeof setTimeout> | null = null;

export function persistClientUiWindowState(
  state: {
    selectedProjectId: string | null;
    selectedRoomId: string | null;
    selectedSessionId: string | null;
    rosterMode: "active-squads" | "full-lineage";
    visualStyleMode: "clean-cartoon" | "pixel-atlas";
    cameraFocusMode: "auto" | "workshop" | "wilds" | "split";
    desktopWorldWidthRatio?: number;
    isWorldCollapsed: boolean;
    isGamemasterCollapsed?: boolean;
    isTickerCollapsed: boolean;
    mobileActiveTab: "ledger" | "character" | "ticker";
    mobileDrawerState: "collapsed" | "peek" | "expanded";
    heroSubtab: "details" | "chat" | "scrolls" | "tools";
    ledgerSubtab: "overview" | "assembly" | "roster";
    selectedCommitFilePath: string | null;
    selectedToolCallId: string | null;
    isSummonModalOpen: boolean;
    operatorId?: string | null;
    isAuthenticated?: boolean;
    authBootCompleted?: boolean;
  },
  storage?: KeyValueStoragePort | null,
): void {
  if (state.authBootCompleted === false || state.isAuthenticated === false) return;
  const snapshotPrefs: ClientOperatorPreferences = {
    selectedProjectId: state.selectedProjectId,
    selectedRoomId: state.selectedRoomId,
    selectedSessionId: state.selectedSessionId,
    rosterMode: state.rosterMode,
    visualStyleMode: state.visualStyleMode,
    cameraFocusMode: state.cameraFocusMode,
    desktopWorldWidthRatio: clampDesktopWorldRatio(state.desktopWorldWidthRatio ?? DEFAULT_DESKTOP_WORLD_RATIO),
    isWorldCollapsed: state.isWorldCollapsed,
    isGamemasterCollapsed: Boolean(state.isGamemasterCollapsed),
    isTickerCollapsed: state.isTickerCollapsed,
    activeDrawerTab: state.mobileActiveTab,
    mobileDrawerState: state.mobileDrawerState,
    activeHeroSubtab: state.heroSubtab,
    activeLedgerSubtab: state.ledgerSubtab,
    selectedCommitFilePath: state.selectedCommitFilePath,
    selectedToolCallId: state.selectedToolCallId,
    isSummonModalOpen: state.isSummonModalOpen,
  };
  const sig = JSON.stringify(snapshotPrefs);
  if (!storage && sig === lastPersistedUiSig) return;
  if (!storage) lastPersistedUiSig = sig;

  writeSavedProjectId(state.selectedProjectId, storage);
  writeSavedUiWindowState(snapshotPrefs, storage);

  if (
    !storage &&
    typeof window !== "undefined" &&
    window.location &&
    window.history?.replaceState
  ) {
    try {
      const url = new URL(window.location.href);
      const setOrDel = (k: string, v: string | null | undefined, defVal?: string) => {
        if (v && v !== defVal) url.searchParams.set(k, v);
        else url.searchParams.delete(k);
      };
      setOrDel("project", state.selectedProjectId);
      setOrDel("sessionId", state.selectedSessionId);
      setOrDel("tab", state.mobileActiveTab, "ledger");
      setOrDel("heroSubtab", state.heroSubtab, "details");
      setOrDel("ledgerSubtab", state.ledgerSubtab, "overview");
      setOrDel("focus", state.cameraFocusMode, "auto");
      setOrDel("roster", state.rosterMode, "active-squads");
      setOrDel("gmHidden", state.isGamemasterCollapsed ? "1" : null);
      setOrDel("summon", state.isSummonModalOpen ? "1" : null);
      window.history.replaceState(null, "", url.toString());
    } catch {
      // Ignore replaceState errors
    }
  }

  const isHeadless =
    typeof navigator !== "undefined" &&
    /HeadlessChrome/i.test(navigator.userAgent || "");
  if (!storage && !isHeadless && typeof window !== "undefined" && typeof fetch === "function") {
    if (serverSyncTimer) clearTimeout(serverSyncTimer);
    serverSyncTimer = setTimeout(() => {
      if (state.isAuthenticated === false || state.authBootCompleted === false) return;
      const opId =
        state.operatorId ||
        getBrowserStorage()?.getItem(OPERATOR_ID_STORAGE_KEY)?.trim() ||
        null;
      if (!opId) return;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Guild-Operator-Id": opId,
      };
      void fetch("/api/guild/users/me", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ preferences: snapshotPrefs }),
      }).catch(() => {});
    }, 180);
  }
}

export function resolveInitialProjectSelection(
  searchString: string,
  storage?: KeyValueStoragePort | null,
): string | null {
  const params = new URLSearchParams(searchString || "");
  const rawQuery = params.get("projectId") || params.get("project");
  if (rawQuery && rawQuery.trim()) {
    const decoded = decodeURIComponent(rawQuery.trim());
    if (decoded.toLowerCase() === "all") {
      writeSavedProjectId(null, storage);
      return null;
    }
    writeSavedProjectId(decoded, storage);
    return decoded;
  }
  return readSavedProjectId(storage) ?? readSavedUiWindowState(storage)?.selectedProjectId ?? null;
}

export function computeHydratedProjectSelection(
  projTabs: ReadonlyArray<{
    projectId: string;
    projectName: string;
    active?: boolean;
  }>,
  currentSelectedProjectId: string | null,
  storage?: KeyValueStoragePort | null,
): string | null {
  if (!currentSelectedProjectId && isSavedAllWorldsSelection(storage)) {
    return null;
  }
  const savedId = readSavedProjectId(storage) ?? readSavedUiWindowState(storage)?.selectedProjectId ?? null;
  const queryId =
    typeof window !== "undefined" && window.location?.search
      ? resolveInitialProjectSelection(window.location.search, storage)
      : null;
  const preferredId = currentSelectedProjectId || queryId || savedId;

  if (projTabs.length === 0) {
    return preferredId;
  }

  const matchedPreferred = matchProjectTabSelection(projTabs, preferredId);
  if (matchedPreferred) {
    writeSavedProjectId(matchedPreferred.projectId, storage);
    return matchedPreferred.projectId;
  }

  const fallbackTab = projTabs[0];
  if (fallbackTab) {
    writeSavedProjectId(fallbackTab.projectId, storage);
    return fallbackTab.projectId;
  }
  return preferredId;
}

export function applyPreferencesToStateTarget(
  targetState: {
    selectedProjectId: string | null;
    selectedRoomId: string | null;
    selectedSessionId?: string | null;
    rosterMode: "active-squads" | "full-lineage";
    visualStyleMode: "clean-cartoon" | "pixel-atlas";
    cameraFocusMode?: "auto" | "workshop" | "wilds" | "split";
    desktopWorldWidthRatio?: number;
    isWorldCollapsed?: boolean;
    isGamemasterCollapsed?: boolean;
    isTickerCollapsed?: boolean;
    mobileActiveTab?: "ledger" | "character" | "ticker";
    mobileDrawerState?: "collapsed" | "peek" | "expanded";
    heroSubtab?: "details" | "chat" | "scrolls" | "tools";
    ledgerSubtab?: "overview" | "assembly" | "roster";
    activeDrawerTab?: "ledger" | "character" | "ticker";
    activeHeroSubtab?: "details" | "chat" | "scrolls" | "tools";
    activeLedgerSubtab?: "overview" | "assembly" | "roster";
    selectedCommitFilePath?: string | null;
    selectedToolCallId?: string | null;
    isSummonModalOpen?: boolean;
    isAllWorldsFocused?: boolean;
  },
  prefs: Partial<ClientOperatorPreferences> | null | undefined,
  options: { searchString?: string; storage?: KeyValueStoragePort | null } = {},
): void {
  const searchStr =
    options.searchString ??
    (typeof window !== "undefined" ? window.location?.search || "" : "");
  const params = new URLSearchParams(searchStr);
  const rawQueryProj = params.get("projectId") || params.get("project");
  const explicitUrlProject =
    rawQueryProj && rawQueryProj.trim()
      ? decodeURIComponent(rawQueryProj.trim())
      : null;

  if (explicitUrlProject && explicitUrlProject.toLowerCase() === "all") {
    targetState.selectedProjectId = null;
    targetState.selectedRoomId = null;
    targetState.isAllWorldsFocused = true;
    writeSavedProjectId(null, options.storage);
  } else if (explicitUrlProject) {
    targetState.selectedProjectId = explicitUrlProject;
    targetState.isAllWorldsFocused = false;
    writeSavedProjectId(explicitUrlProject, options.storage);
  } else if (
    prefs &&
    typeof prefs.selectedProjectId === "string" &&
    prefs.selectedProjectId.trim()
  ) {
    targetState.selectedProjectId = prefs.selectedProjectId.trim();
    targetState.isAllWorldsFocused = false;
    writeSavedProjectId(targetState.selectedProjectId, options.storage);
  } else if (prefs && "selectedProjectId" in prefs && !prefs.selectedProjectId) {
    targetState.selectedProjectId = null;
    targetState.isAllWorldsFocused = true;
    writeSavedProjectId(null, options.storage);
  }

  const explicitFocus = params.get("focus") as "auto" | "workshop" | "wilds" | "split" | null;
  if (explicitFocus === "auto" || explicitFocus === "workshop" || explicitFocus === "wilds" || explicitFocus === "split") {
    targetState.cameraFocusMode = explicitFocus;
  } else if (prefs && (prefs.cameraFocusMode === "auto" || prefs.cameraFocusMode === "workshop" || prefs.cameraFocusMode === "wilds" || prefs.cameraFocusMode === "split")) {
    targetState.cameraFocusMode = prefs.cameraFocusMode;
  } else if (!targetState.cameraFocusMode) {
    targetState.cameraFocusMode = "auto";
  }

  if (!prefs) return;
  if (prefs.selectedRoomId !== undefined) targetState.selectedRoomId = prefs.selectedRoomId;
  const explicitSessionId = params.get("sessionId")?.trim();
  if (explicitSessionId) targetState.selectedSessionId = decodeURIComponent(explicitSessionId);
  else if (prefs.selectedSessionId !== undefined) targetState.selectedSessionId = prefs.selectedSessionId;
  const explicitRoster = params.get("roster");
  if (explicitRoster === "active-squads" || explicitRoster === "full-lineage") {
    targetState.rosterMode = explicitRoster;
  } else if (prefs.rosterMode === "active-squads" || prefs.rosterMode === "full-lineage") {
    targetState.rosterMode = prefs.rosterMode;
  }
  if (prefs.visualStyleMode === "clean-cartoon" || prefs.visualStyleMode === "pixel-atlas") {
    targetState.visualStyleMode = prefs.visualStyleMode;
  }
  if (typeof prefs.desktopWorldWidthRatio === "number") targetState.desktopWorldWidthRatio = clampDesktopWorldRatio(prefs.desktopWorldWidthRatio);
  if (typeof prefs.isWorldCollapsed === "boolean") targetState.isWorldCollapsed = prefs.isWorldCollapsed;
  if (params.get("gmHidden") === "1") targetState.isGamemasterCollapsed = true;
  else if (params.get("gmHidden") === "0") targetState.isGamemasterCollapsed = false;
  else if (typeof prefs.isGamemasterCollapsed === "boolean") targetState.isGamemasterCollapsed = prefs.isGamemasterCollapsed;
  if (targetState.isGamemasterCollapsed) targetState.isWorldCollapsed = false;
  if (typeof prefs.isTickerCollapsed === "boolean") targetState.isTickerCollapsed = prefs.isTickerCollapsed;
  const explicitDrawer = params.get("drawer") as "collapsed" | "peek" | "expanded" | null;
  if (explicitDrawer === "collapsed" || explicitDrawer === "peek" || explicitDrawer === "expanded") {
    targetState.mobileDrawerState = explicitDrawer;
  } else if (explicitFocus && !params.has("tab") && !params.has("sessionId")) {
    targetState.mobileDrawerState = "collapsed";
  } else if (prefs.mobileDrawerState) {
    targetState.mobileDrawerState = prefs.mobileDrawerState;
  }
  if (prefs.selectedCommitFilePath !== undefined) targetState.selectedCommitFilePath = prefs.selectedCommitFilePath;
  if (prefs.selectedToolCallId !== undefined) targetState.selectedToolCallId = prefs.selectedToolCallId;
  if (typeof prefs.isSummonModalOpen === "boolean" && !params.has("summon")) {
    targetState.isSummonModalOpen = prefs.isSummonModalOpen;
  }

  const explicitTab = params.get("tab") as "ledger" | "character" | "ticker" | null;
  const explicitHeroSubtab = params.get("heroSubtab") as "details" | "chat" | "scrolls" | "tools" | null;
  const explicitLedgerSubtab = params.get("ledgerSubtab") as "overview" | "assembly" | "roster" | null;

  if (explicitTab === "ledger" || explicitTab === "character" || explicitTab === "ticker") {
    targetState.activeDrawerTab = explicitTab;
    targetState.mobileActiveTab = explicitTab;
  } else if (explicitSessionId) {
    targetState.activeDrawerTab = "character";
    targetState.mobileActiveTab = "character";
  } else if (prefs.activeDrawerTab === "ledger" || prefs.activeDrawerTab === "character" || prefs.activeDrawerTab === "ticker") {
    targetState.activeDrawerTab = prefs.activeDrawerTab;
    targetState.mobileActiveTab = prefs.activeDrawerTab;
  }

  if (explicitHeroSubtab === "details" || explicitHeroSubtab === "chat" || explicitHeroSubtab === "scrolls" || explicitHeroSubtab === "tools") {
    targetState.activeHeroSubtab = explicitHeroSubtab;
    targetState.heroSubtab = explicitHeroSubtab;
  } else if (prefs.activeHeroSubtab === "details" || prefs.activeHeroSubtab === "chat" || prefs.activeHeroSubtab === "scrolls" || prefs.activeHeroSubtab === "tools") {
    targetState.activeHeroSubtab = prefs.activeHeroSubtab;
    targetState.heroSubtab = prefs.activeHeroSubtab;
  }

  if (explicitLedgerSubtab === "overview" || explicitLedgerSubtab === "assembly" || explicitLedgerSubtab === "roster") {
    targetState.activeLedgerSubtab = explicitLedgerSubtab;
    targetState.ledgerSubtab = explicitLedgerSubtab;
  } else if (prefs.activeLedgerSubtab === "overview" || prefs.activeLedgerSubtab === "assembly" || prefs.activeLedgerSubtab === "roster") {
    targetState.activeLedgerSubtab = prefs.activeLedgerSubtab;
    targetState.ledgerSubtab = prefs.activeLedgerSubtab;
  }

  writeSavedUiWindowState(prefs, options.storage);
}
