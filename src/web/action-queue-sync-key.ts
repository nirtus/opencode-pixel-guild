import type { CharacterState } from "../types/domain.ts";
import type { WalkerState } from "./client-state.ts";
import type { ResolvedCharacterSlot } from "./station-and-workflow-routing.ts";

export const EPOCH_MS_THRESHOLD = 1_000_000_000_000;
export const MAX_WALKER_SEEN_TOOL_CALL_IDS = 120;

export function isIdleDestinationSlot(slot: Pick<ResolvedCharacterSlot, "station" | "overheadLabel">): boolean {
  return slot.station === "Lounge" || slot.overheadLabel === "Despawning";
}

export function allocateNextWalkerActionSeq(walker: WalkerState): number {
  const next = (walker.actionSequenceCounter ?? 0) + 1;
  walker.actionSequenceCounter = next;
  return next;
}

export function stampCharacterActionSlot(
  walker: WalkerState,
  slot: ResolvedCharacterSlot,
  timestampMs: number,
  actionId?: string,
): ResolvedCharacterSlot {
  if (typeof slot.timestampMs !== "number" || !Number.isFinite(slot.timestampMs)) slot.timestampMs = timestampMs;
  if (typeof slot.sequenceOrder !== "number" || !Number.isFinite(slot.sequenceOrder)) slot.sequenceOrder = allocateNextWalkerActionSeq(walker);
  if (actionId && !slot.actionId) slot.actionId = actionId;
  return slot;
}

export function resolveToolRecordTimestampMs(
  rec: NonNullable<CharacterState["recentTools"]>[number],
  fallbackTs: number,
): { timestampMs: number; hasExplicitTimestamp: boolean } {
  const started = (rec as { startedAtMs?: number }).startedAtMs;
  if (typeof started === "number" && Number.isFinite(started) && started > 0) return { timestampMs: started, hasExplicitTimestamp: true };
  if (typeof rec.timestampMs === "number" && Number.isFinite(rec.timestampMs) && rec.timestampMs > 0) return { timestampMs: rec.timestampMs, hasExplicitTimestamp: true };
  return { timestampMs: fallbackTs, hasExplicitTimestamp: false };
}

export function sortCharacterActionQueue(queue: ResolvedCharacterSlot[], walker?: WalkerState, fallbackNowMs = 0): void {
  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    if (typeof item.timestampMs !== "number" || !Number.isFinite(item.timestampMs)) item.timestampMs = fallbackNowMs + i;
    if (typeof item.sequenceOrder !== "number" || !Number.isFinite(item.sequenceOrder)) {
      item.sequenceOrder = walker ? allocateNextWalkerActionSeq(walker) : i + 1;
    }
  }
  queue.sort((a, b) => {
    const idleA = isIdleDestinationSlot(a);
    const idleB = isIdleDestinationSlot(b);
    if (idleA !== idleB) return idleA ? 1 : -1;
    const tsA = a.timestampMs ?? 0;
    const tsB = b.timestampMs ?? 0;
    const isCrossDomain =
      (tsA >= EPOCH_MS_THRESHOLD && tsB > 0 && tsB < EPOCH_MS_THRESHOLD) ||
      (tsB >= EPOCH_MS_THRESHOLD && tsA > 0 && tsA < EPOCH_MS_THRESHOLD);
    if (!isCrossDomain) {
      const tsDiff = tsA - tsB;
      if (tsDiff !== 0) return tsDiff;
    }
    return (a.sequenceOrder ?? 0) - (b.sequenceOrder ?? 0);
  });
}

export function getHighestActionTimestampMs(queue: ResolvedCharacterSlot[], resolvedSlot?: ResolvedCharacterSlot): number {
  let maxTs = typeof resolvedSlot?.timestampMs === "number" && Number.isFinite(resolvedSlot.timestampMs) ? resolvedSlot.timestampMs : 0;
  for (const item of queue) {
    if (typeof item.timestampMs === "number" && Number.isFinite(item.timestampMs) && item.timestampMs > maxTs) {
      maxTs = item.timestampMs;
    }
  }
  return maxTs;
}

export function pruneWalkerSeenToolCallIds(
  seenCalls: Set<string>,
  recentTools: ReadonlyArray<{ readonly callId?: string | null }> | null | undefined,
  maxEntries = MAX_WALKER_SEEN_TOOL_CALL_IDS,
): void {
  const cap = Math.max(1, Math.floor(maxEntries));
  if (seenCalls.size <= cap) return;
  const protectedIds = new Set<string>();
  if (Array.isArray(recentTools)) {
    for (const rec of recentTools) {
      if (rec?.callId) {
        protectedIds.add(rec.callId);
        if (protectedIds.size >= cap) break;
      }
    }
  }
  for (const id of seenCalls) {
    if (seenCalls.size <= cap) break;
    if (!protectedIds.has(id)) seenCalls.delete(id);
  }
  for (const id of seenCalls) {
    if (seenCalls.size <= cap) break;
    seenCalls.delete(id);
  }
}

export function createBoundedSeenToolCallIds(
  recentTools: ReadonlyArray<{ readonly callId?: string | null }> | null | undefined,
  maxEntries = MAX_WALKER_SEEN_TOOL_CALL_IDS,
): Set<string> {
  const seen = new Set<string>();
  if (Array.isArray(recentTools)) {
    for (let i = recentTools.length - 1; i >= 0; i--) {
      const cid = recentTools[i]?.callId;
      if (cid) seen.add(cid);
    }
  }
  pruneWalkerSeenToolCallIds(seen, recentTools, maxEntries);
  return seen;
}

export function buildCharacterActionSyncKey(
  c: CharacterState,
  walker: WalkerState,
  slot: ResolvedCharacterSlot,
  hasActiveRoomBug: boolean,
  snapshotVersion: number,
  snapshotTimestampMs: number,
): string | null {
  const queue = walker.slotQueue;
  const qLen = queue?.length ?? 0;
  const resolved = walker.resolvedSlot;

  if (
    slot.overheadLabel === "Despawning" &&
    (resolved?.overheadLabel !== "Despawning" || qLen > 0 || (walker.dwellUntilMs ?? 0) > 0)
  ) {
    return null;
  }

  if (
    resolved &&
    (typeof resolved.timestampMs !== "number" ||
      !Number.isFinite(resolved.timestampMs) ||
      typeof resolved.sequenceOrder !== "number" ||
      !Number.isFinite(resolved.sequenceOrder))
  ) {
    return null;
  }

  const qFirst = qLen > 0 ? queue![0] : undefined;
  const qLast = qLen > 1 ? queue![qLen - 1] : qFirst;
  if (
    qLen > 0 &&
    (typeof qFirst?.timestampMs !== "number" ||
      !Number.isFinite(qFirst.timestampMs) ||
      typeof qLast?.timestampMs !== "number" ||
      !Number.isFinite(qLast.timestampMs))
  ) {
    return null;
  }

  const recent = c.recentTools;
  const rLen = recent?.length ?? 0;
  const firstTool = rLen > 0 ? recent![0] : undefined;
  const coordKey =
    slot.station === "Combat" || c.lifecycleState === "ReportingScroll"
      ? `${Math.round(slot.x)},${Math.round(slot.y)},${slot.facingDirection ?? ""}`
      : "";
  const resolvedKey = resolved
    ? `${resolved.station}:${resolved.isActing ? 1 : 0}:${resolved.overheadLabel}:${resolved.questMarker ?? ""}:${resolved.actionId ?? ""}`
    : "none";
  const qFirstKey = qFirst ? `${qFirst.station}:${qFirst.actionId ?? ""}` : "";
  const qLastKey = qLast ? `${qLast.station}:${qLast.actionId ?? ""}` : "";

  return `${snapshotVersion}|${snapshotTimestampMs}|${c.lifecycleState}|${c.stateEnteredAtMs ?? 0}|${c.idleAtMs ?? 0}|${c.lastActivityAtMs ?? 0}|${c.equippingAtArmory ? 1 : 0}|${c.activeCapability?.capabilityId ?? ""}|${rLen}|${firstTool?.callId ?? ""}|${firstTool?.status ?? ""}|${hasActiveRoomBug ? 1 : 0}|${slot.station}|${slot.isActing ? 1 : 0}|${slot.overheadLabel}|${slot.questMarker ?? ""}|${slot.carriedCargo ?? ""}|${slot.role}|${slot.workflowIntent}|${slot.actionId ?? ""}|${coordKey}|${walker.lastArmoryTriggerKey ?? ""}|${walker.lastEnqueuedArmoryKey ?? ""}|${walker.seenToolCallIds?.size ?? 0}|${resolvedKey}|${qLen}|${qFirstKey}|${qLastKey}`;
}
