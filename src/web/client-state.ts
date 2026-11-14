import type { ChamberFocusMode, SceneHitboxSpec } from "../scene/index.ts";
import { filterProjectRooms, hasCharacterUnviewedResult, isCharacterActivelyOpen, isCharacterWaitingAtGate as spatialIsCharacterWaitingAtGate, resolveCharacterWorldFocus, resolveRoomCanonicalProjectRoot, resolveWorldFocusScope, selectVisibleHostCharacters } from "../spatial/index.ts";
import type { DirectionalTurnaround } from "../sprites/index.ts";
import type { CharacterState, GuildOperatorPreferences, GuildSnapshot, WorkshopRoomState } from "../types/domain.ts";
import type { ResolvedCharacterSlot } from "./station-and-workflow-routing.ts";
import { clampDesktopWorldRatio } from "./layout-resizer.ts";
import {
  computeHydratedProjectSelection, getBrowserStorage, isSavedAllWorldsSelection, type KeyValueStoragePort, persistClientUiWindowState,
  readSavedUiWindowState, resolveInitialProjectSelection, syncProjectUrlQueryParam, writeSavedProjectId,
} from "./world-persistence.ts";

export { persistClientUiWindowState };

export type SpectatorDrawerState = NonNullable<GuildOperatorPreferences["mobileDrawerState"]>;
export type SpectatorDrawerTab = GuildOperatorPreferences["activeDrawerTab"];
export type HeroCategorySubtab = GuildOperatorPreferences["activeHeroSubtab"];
export type LedgerCategorySubtab = GuildOperatorPreferences["activeLedgerSubtab"];

export const MOBILE_BREAKPOINT_PX = 960;

let cachedSearchStr = "";
let cachedQueryVw = 0;
export function getCachedQueryViewportWidth(): number {
  if (typeof window === "undefined") return 0;
  const s = window.location?.search || "";
  if (s !== cachedSearchStr) { cachedSearchStr = s; cachedQueryVw = Number(new URLSearchParams(s).get("vw") || 0); }
  return cachedQueryVw;
}

export function isMobileViewport(viewportWidthPx?: number): boolean {
  if (typeof viewportWidthPx === "number" && viewportWidthPx > 0) return viewportWidthPx <= MOBILE_BREAKPOINT_PX;
  if (typeof window === "undefined") return false;
  const qVw = getCachedQueryViewportWidth();
  const outer = window.outerWidth && window.outerWidth < window.innerWidth ? window.outerWidth : window.innerWidth;
  const effectiveW = qVw > 0 ? qVw : outer;
  return effectiveW > 0 && effectiveW <= MOBILE_BREAKPOINT_PX;
}

export interface WalkerState {
  currentX: number; currentY: number; targetX: number; targetY: number;
  waypoints?: Array<{ x: number; y: number }>;
  lastArmoryTriggerKey?: string; lastDeliveredScrollAtMs?: number;
  resolvedSlot?: ResolvedCharacterSlot; pendingSlot?: ResolvedCharacterSlot | null;
  slotQueue?: ResolvedCharacterSlot[]; seenToolCallIds?: Set<string>;
  initializedQueue?: boolean; hasReachedAssemblyPacing?: boolean; dwellUntilMs?: number;
  isWalking: boolean; facingLeft: boolean; facingDirection?: DirectionalTurnaround;
  walkCycle: number; lastToolCategory: string; armoryUntilMs: number; searchWaypointIdx: number;
  assignedStation?: string; assignedSlotIdx?: number;
  portalPhase?: "spawning" | "despawning"; portalProgress?: number; despawnCompleted?: boolean; awaitingParentSummon?: boolean;
  wasActiveSubagent?: boolean; routeLegCounter?: number; walkSpeedMultiplier?: number;
  departureUntilMs?: number; pacingLeg?: number; pacingSide?: "top" | "left" | "right" | "bottom";
  pacingSideOcc?: number; hasActiveDetour?: boolean; smoothVx?: number; smoothVy?: number;
  overlapGraceUntilMs?: number; routeGraceUntilMs?: number; isClearingPerimeter?: boolean;
  actionSequenceCounter?: number; lastEnqueuedArmoryKey?: string;
}

export interface DynamicLanternFlare {
  id: string; sessionId: string; x: number; y: number; r: number;
  createdAtMs: number; expiresAtMs: number; label?: string;
}

export interface SummoningRitualFx {
  ritualId: string; parentId: string; x: number; y: number;
  childId: string; startedAtMs: number; durationMs: number;
  kind?: "spawn" | "despawn";
}

export interface SnapParticleFx {
  x: number; y: number; vx: number; vy: number;
  size: number; color: string; life: number;
}

export interface HitboxRect {
  sessionId: string; x: number; y: number; w: number; h: number;
}

const urlParams = new URLSearchParams(
  typeof window !== "undefined" ? window.location.search : "",
);
const savedUiWindow = readSavedUiWindowState();
const initialProjectSelection = resolveInitialProjectSelection(
  typeof window !== "undefined" ? window.location.search : "",
);

let currentHeroSubtab: HeroCategorySubtab = ((urlParams.get("heroSubtab") as HeroCategorySubtab) ||
  savedUiWindow?.activeHeroSubtab ||
  "chat") as HeroCategorySubtab;

let currentLedgerSubtab: LedgerCategorySubtab = ((urlParams.get("ledgerSubtab") as LedgerCategorySubtab) ||
  savedUiWindow?.activeLedgerSubtab ||
  "overview") as LedgerCategorySubtab;

let currentDrawerTab: SpectatorDrawerTab = ((urlParams.get("tab") as SpectatorDrawerTab) ||
  (urlParams.get("sessionId") ? "character" : savedUiWindow?.activeDrawerTab || "ledger")) as SpectatorDrawerTab;

export const clientState = {
  currentSnapshot: {
    version: 0, timestampMs: 0, activeAdapter: "opencode-client", daemonUrl: null,
    roomOrder: [], rooms: {}, characters: {}, questGates: {},
    summary: { totalRooms: 0, activeAdventurers: 0, activeSubagents: 0, openQuestGates: 0, equippedGrimoires: 0, connectedPlugins: 0 },
  } as GuildSnapshot,
  selectedRoomId: urlParams.get("roomId") ? decodeURIComponent(urlParams.get("roomId")!) : (savedUiWindow?.selectedRoomId ?? (null as string | null)),
  selectedSessionId: urlParams.get("sessionId") ? decodeURIComponent(urlParams.get("sessionId")!) : (savedUiWindow?.selectedSessionId ?? (null as string | null)),
  selectedProjectId: initialProjectSelection,
  operatorId: null as string | null, isAuthenticated: true, authBootCompleted: false,
  get heroSubtab(): HeroCategorySubtab { return currentHeroSubtab; },
  set heroSubtab(val: HeroCategorySubtab) { currentHeroSubtab = val; },
  get activeHeroSubtab(): HeroCategorySubtab { return currentHeroSubtab; },
  set activeHeroSubtab(val: HeroCategorySubtab) { currentHeroSubtab = val; },
  get ledgerSubtab(): LedgerCategorySubtab { return currentLedgerSubtab; },
  set ledgerSubtab(val: LedgerCategorySubtab) { currentLedgerSubtab = val; },
  get activeLedgerSubtab(): LedgerCategorySubtab { return currentLedgerSubtab; },
  set activeLedgerSubtab(val: LedgerCategorySubtab) { currentLedgerSubtab = val; },
  get activeDrawerTab(): SpectatorDrawerTab { return currentDrawerTab; },
  set activeDrawerTab(val: SpectatorDrawerTab) { currentDrawerTab = val; },
  get mobileActiveTab(): SpectatorDrawerTab { return currentDrawerTab; },
  set mobileActiveTab(val: SpectatorDrawerTab) { currentDrawerTab = val; },
  isAllWorldsFocused: isSavedAllWorldsSelection(),
  isCommandScrollExpanded: urlParams.get("compose") === "1",
  isCommitFormExpanded: true,
  selectedToolCallId: savedUiWindow?.selectedToolCallId ?? (null as string | null),
  selectedCommitFilePath: savedUiWindow?.selectedCommitFilePath ?? (null as string | null),
  rosterMode: ((urlParams.get("roster") as "active-squads" | "full-lineage") || savedUiWindow?.rosterMode || "active-squads") as "active-squads" | "full-lineage",
  showSubagentsInRoster: false,
  visualStyleMode: (savedUiWindow?.visualStyleMode || "clean-cartoon") as "clean-cartoon" | "pixel-atlas",
  desktopWorldWidthRatio: clampDesktopWorldRatio(savedUiWindow?.desktopWorldWidthRatio),
  isWorldCollapsed: Boolean(savedUiWindow?.isWorldCollapsed),
  isGamemasterCollapsed: urlParams.get("gmHidden") === "1" ? true : urlParams.get("gmHidden") === "0" ? false : Boolean(savedUiWindow?.isGamemasterCollapsed),
  isTickerCollapsed: Boolean(savedUiWindow?.isTickerCollapsed),
  cameraFocusMode: ((urlParams.get("focus") as ChamberFocusMode) || savedUiWindow?.cameraFocusMode || "auto") as ChamberFocusMode,
  mobileDrawerState: ((urlParams.get("drawer") as SpectatorDrawerState) || (urlParams.get("sessionId") ? "peek" : savedUiWindow?.mobileDrawerState || "collapsed")) as SpectatorDrawerState,
  pinnedTooltipTarget: null as SceneHitboxSpec["target"] | null,
  tickerLog: [] as Array<Record<string, unknown>>,
  cameraZoom: 1.0, cameraPanX: 0, cameraPanY: 0, chamberWidth: 800, chamberHeight: 720, wildsWidth: 800,
  isDragging: false, cameraGestureActive: false, dragStartX: 0, dragStartY: 0, pointerDownX: 0, pointerDownY: 0,
  lastFrameTs: typeof performance !== "undefined" ? performance.now() : Date.now(),
  characterWalkers: new Map<string, WalkerState>(),
  lanternFlares: [] as DynamicLanternFlare[],
  activeSummoningRituals: new Map<string, SummoningRitualFx>(),
  knownSessionIds: new Set<string>(),
  snapParticles: [] as SnapParticleFx[],
  lastResolvedTasksCount: -1, mutationFlashTimer: 0, slayVictoryTimer: 0, lastActiveBugCount: 0,
  pendingKillSessionId: null as string | null, pendingDemolishRoomId: null as string | null,
  draftPromptsBySession: new Map<string, string>(),
  draftDeliveryBySession: new Map<string, "steer" | "queue">(),
  draftGateAnswersByGateId: new Map<string, Record<string, string | string[]>>(),
  isSummonModalOpen: urlParams.get("summon") === "1",
  characterHitboxes: [] as HitboxRect[], sceneHitboxes: [] as SceneHitboxSpec[],
};

export function reconcileMobileDrawerSelection(nextSessionId: string | null, prevSessionId?: string | null): void {
  const isDifferentSession = prevSessionId !== undefined && prevSessionId !== nextSessionId;
  clientState.selectedSessionId = nextSessionId;
  if (nextSessionId) {
    const ch = clientState.currentSnapshot.characters?.[nextSessionId];
    if (ch?.roomId && !clientState.isAllWorldsFocused && clientState.selectedProjectId) {
      const room = clientState.currentSnapshot.rooms?.[ch.roomId];
      clientState.selectedProjectId = room ? resolveRoomCanonicalProjectRoot(room).projectRoot : ch.roomId;
      clientState.selectedRoomId = ch.roomId;
    }
    if (isDifferentSession || clientState.mobileActiveTab !== "character" || (ch && (isCharacterWaitingAtGate(ch) || hasCharacterUnviewedResult(ch)))) {
      clientState.heroSubtab = "chat";
    }
    clientState.mobileActiveTab = "character";
    if (clientState.mobileDrawerState === "collapsed") clientState.mobileDrawerState = "peek";
  } else {
    clientState.mobileActiveTab = "ledger";
    clientState.mobileDrawerState = "collapsed";
  }
}

export function promoteDrawerExpandedOnMobileFocus(): void {
  if (typeof window !== "undefined" && window.innerWidth <= MOBILE_BREAKPOINT_PX) {
    clientState.mobileDrawerState = "expanded";
    if (typeof document !== "undefined") document.querySelector(".spectator-sidebar")?.setAttribute("data-drawer-state", "expanded");
  }
}

export function triggerPlatformSnapBurst(px: number, py: number): void {
  const colors = ["#fbbf24", "#fef08a", "#38bdf8", "#10b981", "#f59e0b"];
  for (let i = 0; i < 14; i++) {
    const ang = (i / 14) * Math.PI * 2 + Math.random() * 0.2;
    const spd = 0.7 + Math.random() * 1.4;
    clientState.snapParticles.push({
      x: px, y: py, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
      size: 2 + Math.random() * 2, color: colors[i % colors.length], life: 1.0,
    });
  }
}

export function getSelectedProjectRoom(): WorkshopRoomState | null {
  if (clientState.isAllWorldsFocused) return null;
  const queryProj = !clientState.selectedProjectId && typeof window !== "undefined" ? new URLSearchParams(window.location?.search || "").get("project")?.trim() : null;
  const effectiveProjId = clientState.selectedProjectId || queryProj;
  if (effectiveProjId || clientState.selectedRoomId) {
    const scope = resolveWorldFocusScope(clientState.currentSnapshot, {
      selectedProjectId: effectiveProjId,
      selectedRoomId: effectiveProjId ? null : clientState.selectedRoomId,
      isAllWorldsFocused: clientState.isAllWorldsFocused,
    });
    if (effectiveProjId && clientState.selectedRoomId) {
      const explicitMatch = scope.scopedRooms.find((r) => r.roomId === clientState.selectedRoomId);
      if (explicitMatch) return explicitMatch;
    }
    return scope.selectedProjectRoom;
  }
  const allRooms = Object.values(clientState.currentSnapshot.rooms || {});
  const primaryRooms = allRooms.filter((r) => !r.isWorktree);
  if (primaryRooms.length === 1) return primaryRooms[0] ?? null;
  if (allRooms.length === 1) return allRooms[0] ?? null;
  return null;
}

export function getActiveRoom(): WorkshopRoomState | null {
  const selected = getSelectedProjectRoom();
  if (selected) return selected;
  if (clientState.isAllWorldsFocused) return null;
  const allRooms = Object.values(clientState.currentSnapshot.rooms || {});
  return allRooms.find((r) => !r.isWorktree) ?? allRooms[0] ?? null;
}

export function selectCommitRepository(projectId: string | null, storage?: KeyValueStoragePort | null): WorkshopRoomState | null {
  if (!projectId) {
    clientState.isAllWorldsFocused = true;
    clientState.selectedRoomId = null;
    clientState.selectedCommitFilePath = null;
    persistProjectWorldSelection(null, storage);
    return null;
  }
  clientState.isAllWorldsFocused = false;
  const projRooms = filterProjectRooms(clientState.currentSnapshot, projectId);
  const primary = projRooms.find((r) => !r.isWorktree) ?? projRooms[0] ?? null;
  clientState.selectedRoomId = primary?.roomId ?? projectId;
  clientState.selectedCommitFilePath = null;
  persistProjectWorldSelection(projectId, storage);
  if (clientState.selectedSessionId) {
    const curChar = clientState.currentSnapshot.characters?.[clientState.selectedSessionId];
    if (!curChar || !resolveCharacterWorldFocus(curChar, clientState.currentSnapshot, projectId).isFocusedMember) {
      const scopedChars = getScopedGameMasterCharacters();
      if (scopedChars.length > 0 && clientState.mobileActiveTab === "character") {
        clientState.selectedSessionId = scopedChars[0]!.sessionId;
      } else {
        clientState.selectedSessionId = null;
        if (clientState.mobileActiveTab === "character") clientState.mobileActiveTab = "ledger";
      }
    }
  }
  return primary;
}

export const resolvedClientGateIds = new Set<string>();
export const resolvedClientPromptsBySession = new Map<string, Set<string>>();

export function isCharacterWaitingAtGate(c: CharacterState | null | undefined): boolean {
  if (!c || !spatialIsCharacterWaitingAtGate(c)) return false;
  const g = c?.questGate;
  if (g?.gateId && resolvedClientGateIds.has(g.gateId)) return false;
  const p = g?.reason?.trim();
  if (c?.sessionId && p && resolvedClientPromptsBySession.get(c.sessionId)?.has(p)) return false;
  return true;
}

export { hasCharacterUnviewedResult, isCharacterActivelyOpen };

export function getScopedGameMasterCharacters(): CharacterState[] {
  const snap = clientState.currentSnapshot;
  const activeRoom = getSelectedProjectRoom();
  const isSingleWorld =
    !clientState.isAllWorldsFocused &&
    Boolean(clientState.selectedProjectId || clientState.selectedRoomId || activeRoom);
  const focusProjectId = isSingleWorld
    ? (clientState.selectedProjectId || activeRoom?.projectId || activeRoom?.locationDirectory || clientState.selectedRoomId)
    : null;
  if (!isSingleWorld || !focusProjectId) {
    return getVisibleProjectCharacters();
  }
  return selectVisibleHostCharacters(
    snap,
    clientState.rosterMode,
    activeRoom?.roomId ?? clientState.selectedRoomId,
    focusProjectId,
    { strictWorldScope: true },
  );
}

let cachedVisibleCharsSnapshotRef: GuildSnapshot | null = null;
let cachedVisibleCharsKey = "";
let cachedVisibleCharsResult: CharacterState[] = [];

export function getVisibleProjectCharacters(): CharacterState[] {
  const snap = clientState.currentSnapshot;
  let despawnSig = "";
  if (clientState.rosterMode === "active-squads" && clientState.characterWalkers.size > 0) {
    for (const [sid, w] of clientState.characterWalkers.entries()) {
      if (!w.despawnCompleted && (w.wasActiveSubagent || w.awaitingParentSummon || w.portalPhase === "despawning" || clientState.activeSummoningRituals.has(sid))) {
        const ch = snap.characters?.[sid];
        if (ch && (ch.parentId || ch.parentSessionId || ch.role === "Squad Subagent")) {
          despawnSig += `${sid}:${ch.lifecycleState},`;
        }
      }
    }
  }
  const charCount = Object.keys(snap.characters || {}).length;
  let unviewedSig = "";
  for (const ch of Object.values(snap.characters || {})) {
    if (hasCharacterUnviewedResult(ch)) unviewedSig += `${ch.sessionId}:${ch.idleAtMs ?? 0},`;
  }
  const memoKey = `${snap.version}:${charCount}:${clientState.rosterMode}:${clientState.selectedRoomId ?? ""}:${clientState.isAllWorldsFocused ? "*" : (clientState.selectedProjectId ?? "")}:${despawnSig}:${unviewedSig}`;
  if (cachedVisibleCharsSnapshotRef === snap && cachedVisibleCharsKey === memoKey) {
    return cachedVisibleCharsResult;
  }
  const base = selectVisibleHostCharacters(
    snap,
    clientState.rosterMode,
    clientState.selectedRoomId,
    clientState.isAllWorldsFocused ? null : clientState.selectedProjectId,
  );
  if (clientState.rosterMode !== "active-squads") {
    cachedVisibleCharsSnapshotRef = snap;
    cachedVisibleCharsKey = memoKey;
    cachedVisibleCharsResult = base;
    return base;
  }
  const seen = new Set(base.map((c) => c.sessionId));
  const extraDespawning: CharacterState[] = [];
  for (const [sid, walker] of clientState.characterWalkers.entries()) {
    if (seen.has(sid) || walker.despawnCompleted) continue;
    const ch = snap.characters?.[sid];
    if (!ch || !(ch.parentId || ch.parentSessionId || ch.role === "Squad Subagent")) continue;
    if (walker.wasActiveSubagent || walker.awaitingParentSummon || walker.portalPhase === "despawning" || clientState.activeSummoningRituals.has(sid)) {
      extraDespawning.push(ch);
    }
  }
  const result = extraDespawning.length > 0 ? [...base, ...extraDespawning] : base;
  cachedVisibleCharsSnapshotRef = snap;
  cachedVisibleCharsKey = memoKey;
  cachedVisibleCharsResult = result;
  return result;
}

export const getVisibleHostCharacters = getVisibleProjectCharacters;
export const getActiveRoomCharacters = getVisibleProjectCharacters;

export function persistProjectWorldSelection(
  projectId: string | null,
  storage?: KeyValueStoragePort | null,
): void {
  clientState.selectedProjectId = projectId;
  writeSavedProjectId(projectId, storage);
  syncProjectUrlQueryParam(projectId);
  const isHeadless = typeof navigator !== "undefined" && /HeadlessChrome/i.test(navigator.userAgent || "");
  if (!storage && !isHeadless && typeof window !== "undefined" && typeof fetch === "function") {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const opId = clientState.operatorId || getBrowserStorage()?.getItem("guild.operatorId")?.trim() || null;
    if (opId) headers["X-Guild-Operator-Id"] = opId;
    void fetch("/api/guild/users/me", {
      method: "PATCH", headers,
      body: JSON.stringify({ preferences: { selectedProjectId: projectId, selectedRoomId: clientState.selectedRoomId } }),
    }).catch(() => {});
  }
}

export function restorePersistedProjectWorldSelection(
  searchString = typeof window !== "undefined" ? window.location.search : "",
  storage?: KeyValueStoragePort | null,
): string | null {
  const restored = resolveInitialProjectSelection(searchString, storage);
  clientState.selectedProjectId = restored;
  return restored;
}

export function resolveProjectWorldAfterHydration(
  projTabs: ReadonlyArray<{ projectId: string; projectName: string; active?: boolean }>,
  currentSelectedProjectId = clientState.selectedProjectId,
  storage?: KeyValueStoragePort | null,
): string | null {
  const nextId = computeHydratedProjectSelection(projTabs, currentSelectedProjectId, storage);
  clientState.selectedProjectId = nextId;
  if (nextId) {
    const projRooms = filterProjectRooms(clientState.currentSnapshot, nextId);
    if (!clientState.selectedRoomId || !projRooms.some((r) => r.roomId === clientState.selectedRoomId)) {
      const primary = projRooms.find((r) => !r.isWorktree) ?? projRooms[0] ?? null;
      if (primary) clientState.selectedRoomId = primary.roomId;
    }
  }
  return nextId;
}
