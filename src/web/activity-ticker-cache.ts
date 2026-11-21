import {
  buildActivityTickerViewModel,
  type ActivityTickerViewModel,
} from "../hud/spectator-hud.ts";
import type { GuildDelta, GuildSnapshot } from "../types/domain.ts";
import {
  clientState,
  getScopedGameMasterCharacters,
  getSelectedProjectRoom,
} from "./client-state.ts";

const IGNORED_SSE_TICKER_DELTA_KINDS: ReadonlySet<string> = new Set([
  "timer.tick",
  "location.discovered",
  "catalog.hydrated",
  "tasks.hydrated",
]);

export interface SseTickerEmissionLike {
  readonly delta?: GuildDelta | null;
  readonly snapshot?: unknown;
}

export function recordSseTickerEmission(
  tickerLog: Array<Record<string, unknown>>,
  emission: SseTickerEmissionLike | null | undefined,
  maxEntries = 40,
): boolean {
  const delta = emission?.delta;
  if (!delta?.description || IGNORED_SSE_TICKER_DELTA_KINDS.has(delta.kind)) {
    return false;
  }
  tickerLog.push({ delta });
  if (tickerLog.length > maxEntries) {
    tickerLog.splice(0, tickerLog.length - maxEntries);
  }
  return true;
}

let cachedSnapshotRef: GuildSnapshot | null = null;
let cachedSnapshotVersion = -1;
let cachedTickerLogRef: ReadonlyArray<Record<string, unknown>> | null = null;
let cachedTickerLogLen = -1;
let cachedFirstTickerItem: unknown = undefined;
let cachedLastTickerItem: unknown = undefined;
let cachedScopeKey = "";
let cachedTickerVm: ActivityTickerViewModel | null = null;

export function resetScopedActivityTickerCache(): void {
  cachedSnapshotRef = null;
  cachedSnapshotVersion = -1;
  cachedTickerLogRef = null;
  cachedTickerLogLen = -1;
  cachedFirstTickerItem = undefined;
  cachedLastTickerItem = undefined;
  cachedScopeKey = "";
  cachedTickerVm = null;
}

export function getScopedActivityTicker(): ActivityTickerViewModel {
  const snap = clientState.currentSnapshot;
  const activeRoom = getSelectedProjectRoom();
  const isAllWorlds =
    clientState.isAllWorldsFocused ||
    (!clientState.selectedProjectId && !clientState.selectedRoomId && !activeRoom);
  const effectiveRoomId = activeRoom?.roomId ?? clientState.selectedRoomId ?? "";
  const scopeKey = `${clientState.selectedProjectId ?? ""}|${effectiveRoomId}|${isAllWorlds ? 1 : 0}|${clientState.rosterMode}`;
  const log = clientState.tickerLog;
  const logLen = log.length;
  const firstItem = logLen > 0 ? log[0] : undefined;
  const lastItem = logLen > 0 ? log[logLen - 1] : undefined;

  if (
    cachedTickerVm !== null &&
    cachedSnapshotRef === snap &&
    cachedSnapshotVersion === snap.version &&
    cachedTickerLogRef === log &&
    cachedTickerLogLen === logLen &&
    cachedFirstTickerItem === firstItem &&
    cachedLastTickerItem === lastItem &&
    cachedScopeKey === scopeKey
  ) {
    return cachedTickerVm;
  }

  const scopedChars = getScopedGameMasterCharacters();
  const vm = buildActivityTickerViewModel(log as never[], 40, {
    snapshot: snap,
    selectedRoomId: activeRoom?.roomId ?? clientState.selectedRoomId,
    selectedProjectId: clientState.selectedProjectId,
    isAllWorldsFocused: isAllWorlds,
    characters: scopedChars,
  });

  cachedSnapshotRef = snap;
  cachedSnapshotVersion = snap.version;
  cachedTickerLogRef = log;
  cachedTickerLogLen = logLen;
  cachedFirstTickerItem = firstItem;
  cachedLastTickerItem = lastItem;
  cachedScopeKey = scopeKey;
  cachedTickerVm = vm;
  return vm;
}
