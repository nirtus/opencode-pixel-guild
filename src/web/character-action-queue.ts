import type { CharacterState } from "../types/domain.ts";
import {
  allocateNextWalkerActionSeq,
  buildCharacterActionSyncKey,
  EPOCH_MS_THRESHOLD,
  getHighestActionTimestampMs,
  isIdleDestinationSlot,
  pruneWalkerSeenToolCallIds,
  resolveToolRecordTimestampMs,
  sortCharacterActionQueue,
  stampCharacterActionSlot,
} from "./action-queue-sync-key.ts";
import { clientState, type WalkerState } from "./client-state.ts";
import { allocateStationPerimeterSlot, PENTAGRAM_CENTER, type ResolvedCharacterSlot, resolveToolRecordTargetSlot } from "./station-and-workflow-routing.ts";

export {
  allocateNextWalkerActionSeq,
  isIdleDestinationSlot,
  resolveToolRecordTimestampMs,
  sortCharacterActionQueue,
  stampCharacterActionSlot,
};

function updateSlotMetadataInPlace(target: ResolvedCharacterSlot, candidate: ResolvedCharacterSlot, character: CharacterState, updateCoordinates: boolean): void {
  target.overheadLabel = candidate.overheadLabel; target.questMarker = candidate.questMarker;
  target.carriedCargo = candidate.carriedCargo; target.role = candidate.role; target.workflowIntent = candidate.workflowIntent;
  if (candidate.actionId && !target.actionId) target.actionId = candidate.actionId;
  if (character.lifecycleState === "ReportingScroll" || candidate.station === "Combat" || updateCoordinates) {
    target.x = candidate.x; target.y = candidate.y; target.facingDirection = candidate.facingDirection;
  }
}

const MAX_ACTIVE_SLOT_QUEUE_LEN = 6;

export function enqueueCharacterActions(
  c: CharacterState,
  walker: WalkerState,
  slot: ResolvedCharacterSlot,
  stationOccupantCounts: Map<string, number>,
  hasActiveRoomBug: boolean,
  nowMs: number,
): void {
  const snapVer = clientState.currentSnapshot.version;
  const snapTs = clientState.currentSnapshot.timestampMs;
  const syncKey = buildCharacterActionSyncKey(c, walker, slot, hasActiveRoomBug, snapVer, snapTs);
  if (syncKey !== null && walker.lastActionSyncKey === syncKey) return;
  const queue = walker.slotQueue ?? (walker.slotQueue = []);
  const seenCalls = walker.seenToolCallIds ?? (walker.seenToolCallIds = new Set<string>());
  const recentToolTs =
    (c.recentTools?.[0] as { startedAtMs?: number } | undefined)?.startedAtMs ?? c.recentTools?.[0]?.timestampMs ?? 0;
  const usesEpochClock =
    (c.stateEnteredAtMs ?? 0) >= EPOCH_MS_THRESHOLD ||
    (c.idleAtMs ?? 0) >= EPOCH_MS_THRESHOLD ||
    recentToolTs >= EPOCH_MS_THRESHOLD;
  const actionNowMs = nowMs < EPOCH_MS_THRESHOLD && usesEpochClock ? Date.now() : nowMs;
  if (slot.overheadLabel === "Despawning") {
    for (const rec of c.recentTools ?? []) if (rec?.callId) seenCalls.add(rec.callId);
    pruneWalkerSeenToolCallIds(seenCalls, c.recentTools);
    queue.length = 0;
    walker.dwellUntilMs = 0;
    if (walker.resolvedSlot?.overheadLabel !== "Despawning") {
      queue.push(stampCharacterActionSlot(walker, { ...slot }, actionNowMs));
    }
    walker.lastActionSyncKey = buildCharacterActionSyncKey(c, walker, slot, hasActiveRoomBug, snapVer, snapTs) ?? undefined;
    return;
  }
  if (walker.resolvedSlot) stampCharacterActionSlot(walker, walker.resolvedSlot, c.stateEnteredAtMs || actionNowMs);
  if (queue.length > 0) sortCharacterActionQueue(queue, walker, actionNowMs);

  const enqueueStationJob = (candidate: ResolvedCharacterSlot, isDistinctToolAction = false) => {
    if (!candidate.isActing) return;
    const isCandidateIdleDest = isIdleDestinationSlot(candidate);
    if (!isCandidateIdleDest && queue.length > 0) {
      for (let q = queue.length - 1; q >= 0; q--) {
        if (isIdleDestinationSlot(queue[q])) queue.splice(q, 1);
      }
    }
    const tail = queue.length > 0 ? queue[queue.length - 1] : walker.resolvedSlot;
    const isCurrentlyAtNonActing = Boolean(tail && !tail.isActing);
    const isSameCombatCoords = Boolean(tail && Math.hypot(tail.x - candidate.x, tail.y - candidate.y) <= 6);
    const hasDistinctActionIds = Boolean(
      isDistinctToolAction && candidate.actionId && tail?.actionId && candidate.actionId !== tail.actionId,
    );
    const isSameJob =
      tail &&
      !isCurrentlyAtNonActing &&
      !hasDistinctActionIds &&
      tail.station === candidate.station &&
      (candidate.station !== "Combat" || isSameCombatCoords) &&
      Boolean(tail.isActing) === Boolean(candidate.isActing) &&
      (tail.overheadLabel === "Despawning") === (candidate.overheadLabel === "Despawning");

    if (!isSameJob) {
      const minNextTs = isCandidateIdleDest
        ? Math.max(actionNowMs, getHighestActionTimestampMs(queue, walker.resolvedSlot) + 1)
        : candidate.timestampMs ?? actionNowMs;
      stampCharacterActionSlot(walker, candidate, minNextTs, candidate.actionId);
      queue.push(candidate);
      sortCharacterActionQueue(queue, walker, actionNowMs);
    } else if (tail) {
      updateSlotMetadataInPlace(tail, candidate, c, queue.length > 0);
    }
  };

  // 1. Collect unseen tool records and sort them chronologically by timestampMs + sequenceOrder
  const recent = c.recentTools ?? [];
  const unseenTools: Array<{
    rec: NonNullable<CharacterState["recentTools"]>[number];
    ts: number;
    hasExplicitTs: boolean;
    seq?: number;
    chronIdx: number;
    isNewestInRecent: boolean;
  }> = [];

  const isIdleCharacter = c.lifecycleState === "RestingInLounge" || c.lifecycleState === "Archived";
  const isBlockedAtGate = Boolean(slot.questMarker) || c.lifecycleState === "BlockedAtQuestGate";
  const isInitialHistoricalDump = seenCalls.size === 0 && recent.length > 4;
  for (let i = recent.length - 1; i >= 0; i--) {
    const rec = recent[i];
    if (!rec?.callId || seenCalls.has(rec.callId)) continue;
    seenCalls.add(rec.callId);
    if ((rec.toolName || "").toLowerCase() === "question") continue;
    const { timestampMs: recTs, hasExplicitTimestamp } = resolveToolRecordTimestampMs(rec, actionNowMs);
    if (
      rec.status === "completed" &&
      (isIdleCharacter || isBlockedAtGate || (hasExplicitTimestamp && isInitialHistoricalDump && i > 0))
    ) {
      continue;
    }
    unseenTools.push({
      rec, ts: recTs, hasExplicitTs: hasExplicitTimestamp,
      seq: rec.sequenceOrder, chronIdx: recent.length - 1 - i, isNewestInRecent: i === 0,
    });
  }
  pruneWalkerSeenToolCallIds(seenCalls, recent);

  if (isBlockedAtGate && slot.isActing) {
    queue.length = 0;
    walker.dwellUntilMs = 0;
    if (walker.resolvedSlot?.station === slot.station && walker.resolvedSlot.isActing) {
      updateSlotMetadataInPlace(walker.resolvedSlot, slot, c, false);
    } else {
      queue.push(stampCharacterActionSlot(walker, { ...slot }, actionNowMs));
    }
    walker.lastActionSyncKey = buildCharacterActionSyncKey(c, walker, slot, hasActiveRoomBug, snapVer, snapTs) ?? undefined;
    return;
  }

  if (isIdleCharacter && isIdleDestinationSlot(slot) && (c.hasUnviewedResult || queue.length > 3)) {
    for (let q = queue.length - 1; q >= 0; q--) {
      if (!isIdleDestinationSlot(queue[q])) queue.splice(q, 1);
    }
    walker.dwellUntilMs = 0;
    enqueueStationJob({ ...slot });
    sortCharacterActionQueue(queue, walker, actionNowMs);
    walker.lastActionSyncKey = buildCharacterActionSyncKey(c, walker, slot, hasActiveRoomBug, snapVer, snapTs) ?? undefined;
    return;
  }

  unseenTools.sort((a, b) => {
    if (a.hasExplicitTs && b.hasExplicitTs && a.ts !== b.ts) return a.ts - b.ts;
    if (a.seq !== undefined && b.seq !== undefined && a.seq !== b.seq) return a.seq - b.seq;
    return a.chronIdx - b.chronIdx;
  });

  // 2. If the character is equipping at the Armory, timestamp the Armory action right before the triggering tool
  if (slot.station === "Armory" && slot.isActing) {
    const armoryKey = walker.lastArmoryTriggerKey || `${c.activeCapability?.capabilityId || "armory"}:${c.stateEnteredAtMs || 0}`;
    const alreadyAtOrQueuedArmory =
      walker.lastEnqueuedArmoryKey === armoryKey ||
      walker.resolvedSlot?.station === "Armory" ||
      queue.some((q) => q.station === "Armory");
    if (!alreadyAtOrQueuedArmory) {
      walker.lastEnqueuedArmoryKey = armoryKey;
      const latestUnseen = unseenTools[unseenTools.length - 1];
      const armoryTs = latestUnseen ? latestUnseen.ts - 0.5 : (c.stateEnteredAtMs || actionNowMs);
      enqueueStationJob({
        ...slot, timestampMs: armoryTs,
        sequenceOrder: allocateNextWalkerActionSeq(walker), actionId: `armory:${armoryKey}`,
      });
    } else if (walker.resolvedSlot?.station === "Armory" && queue.length === 0) {
      updateSlotMetadataInPlace(walker.resolvedSlot, slot, c, false);
    }
  }

  // 3. Enqueue each unseen tool record in ascending chronological order
  let lastQueuedToolTs = getHighestActionTimestampMs(queue, walker.resolvedSlot);
  for (const item of unseenTools) {
    const recSlot = resolveToolRecordTargetSlot(c, item.rec, stationOccupantCounts, hasActiveRoomBug);
    const chosenSlot = item.isNewestInRecent && recSlot.station === slot.station && slot.isActing ? { ...slot } : recSlot;
    const monotonicTs = item.hasExplicitTs ? item.ts : Math.max(item.ts, lastQueuedToolTs + 1);
    lastQueuedToolTs = Math.max(lastQueuedToolTs, monotonicTs);
    chosenSlot.timestampMs = monotonicTs;
    chosenSlot.sequenceOrder = allocateNextWalkerActionSeq(walker);
    chosenSlot.actionId = item.rec.callId;
    enqueueStationJob(chosenSlot, true);
  }

  // 4. Reconcile live character slot (idle destinations, quest gates, scroll delivery, or non-recentTools capabilities)
  if (slot.station !== "Armory" && slot.isActing) {
    if (isIdleDestinationSlot(slot)) {
      enqueueStationJob({ ...slot });
    } else {
      const latestNonQuestionTool = recent.find((rt) => (rt.toolName || "").toLowerCase() !== "question" && rt.callId);
      const isBackedBySeenTool = Boolean(latestNonQuestionTool?.callId && seenCalls.has(latestNonQuestionTool.callId));
      const matchingQueued = [...queue].reverse().find((q) => q.station === slot.station);
      const matchingResolved = walker.resolvedSlot?.station === slot.station ? walker.resolvedSlot : undefined;

      if (isBackedBySeenTool && (matchingQueued || matchingResolved) && slot.station !== "Combat") {
        const target = matchingQueued ?? matchingResolved!;
        updateSlotMetadataInPlace(target, slot, c, Boolean(matchingQueued));
      } else {
        const liveTs = Math.max(c.stateEnteredAtMs || actionNowMs, getHighestActionTimestampMs(queue, walker.resolvedSlot) + 1);
        enqueueStationJob({ ...slot, timestampMs: liveTs });
      }
    }
  }

  if (!hasActiveRoomBug && queue.length > 0) {
    for (let q = queue.length - 1; q >= 0; q--) {
      if (queue[q].station === "Combat") queue.splice(q, 1);
    }
  }

  sortCharacterActionQueue(queue, walker, actionNowMs);
  if (queue.length > MAX_ACTIVE_SLOT_QUEUE_LEN) {
    queue.splice(0, queue.length - MAX_ACTIVE_SLOT_QUEUE_LEN);
  }
  walker.lastActionSyncKey = buildCharacterActionSyncKey(c, walker, slot, hasActiveRoomBug, snapVer, snapTs) ?? undefined;
}

function isParentAtSummoningStation(parentId: string, nowMs: number): boolean {
  if (!parentId) return true;
  const parentChar = clientState.currentSnapshot.characters?.[parentId];
  if (!parentChar) return true;
  const parentWalker = clientState.characterWalkers.get(parentId);
  if (!parentWalker || !parentWalker.resolvedSlot) return false;
  return (
    parentWalker.resolvedSlot.station === "Enchanter" &&
    Boolean(parentWalker.resolvedSlot.isActing) &&
    !parentWalker.isWalking &&
    !(parentWalker.departureUntilMs && nowMs < parentWalker.departureUntilMs) &&
    Math.hypot(parentWalker.targetX - parentWalker.currentX, parentWalker.targetY - parentWalker.currentY) <= 3
  );
}

function shouldDelaySubagentForParentSummon(parentId: string, hadExistingWalkersAtStepStart: boolean, nowMs: number): boolean {
  if (!parentId) return false;
  const parentChar = clientState.currentSnapshot.characters?.[parentId];
  if (!parentChar) return false;
  if (hadExistingWalkersAtStepStart) return true;
  if (parentChar.activeWorkstation === "Arcane Lectern") return true;
  const endsAt = parentChar.summoningRitual?.endsAtMs;
  return Boolean(parentChar.summoningRitual?.active && (typeof endsAt !== "number" || nowMs < endsAt));
}

export function collectPendingSummonParentIds(
  chars: ReadonlyArray<CharacterState>,
  newlyArrivedSessionIds: ReadonlySet<string>,
  hadExistingWalkersAtStepStart = true,
  nowMs = 0,
): Set<string> {
  const parents = new Set<string>();
  for (const ch of chars) {
    const parentId = ch.parentId || ch.parentSessionId || "";
    if (!parentId || ch.lifecycleState === "RestingInLounge" || ch.lifecycleState === "Archived") continue;
    const w = clientState.characterWalkers.get(ch.sessionId);
    if (w?.awaitingParentSummon) {
      parents.add(parentId);
    } else if ((!w || !w.wasActiveSubagent || newlyArrivedSessionIds.has(ch.sessionId)) && shouldDelaySubagentForParentSummon(parentId, hadExistingWalkersAtStepStart, nowMs)) {
      parents.add(parentId);
    }
  }
  return parents;
}

export function ensureParentSummoningSlotQueued(
  c: CharacterState,
  walker: WalkerState,
  slot: ResolvedCharacterSlot,
  queue: ResolvedCharacterSlot[],
  stationOccupantCounts: Map<string, number>,
  pendingSummonParents: ReadonlySet<string>,
  nowMs: number,
): void {
  if (pendingSummonParents.has(c.sessionId)) {
    const hasEnchanterTarget =
      (walker.resolvedSlot?.station === "Enchanter" && Boolean(walker.resolvedSlot?.isActing)) ||
      queue.some((q) => q.station === "Enchanter" && Boolean(q.isActing));
    if (!hasEnchanterTarget) {
      const perim = allocateStationPerimeterSlot({
        sessionId: c.sessionId, station: "Enchanter", stationOccupantCounts, walker,
        allWalkers: clientState.characterWalkers, activeCharacters: clientState.currentSnapshot.characters,
      });
      const summonSlot: ResolvedCharacterSlot = {
        ...slot, x: perim.x, y: perim.y, station: "Enchanter",
        overheadLabel: "Summoning Squad", facingDirection: perim.facingDirection, isActing: true,
      };
      stampCharacterActionSlot(walker, summonSlot, nowMs, `summon:${c.sessionId}:${nowMs}`);
      queue.push(summonSlot);
      sortCharacterActionQueue(queue, walker, nowMs);
    }
    if (
      walker.resolvedSlot?.station === "Enchanter" && walker.resolvedSlot?.isActing &&
      !walker.isWalking && Math.hypot(walker.targetX - walker.currentX, walker.targetY - walker.currentY) <= 3
    ) {
      walker.dwellUntilMs = Math.max(walker.dwellUntilMs ?? 0, nowMs + 750);
    }
  }
  for (const ritual of clientState.activeSummoningRituals.values()) {
    if (ritual.parentId === c.sessionId && ritual.kind !== "despawn" && nowMs - ritual.startedAtMs < ritual.durationMs) {
      if (walker.resolvedSlot?.station === "Enchanter" && !walker.isWalking) {
        walker.dwellUntilMs = Math.max(walker.dwellUntilMs ?? 0, ritual.startedAtMs + ritual.durationMs);
      }
    }
  }
}

export function stepSubagentSummonPortal(
  c: CharacterState, walker: WalkerState, slot: ResolvedCharacterSlot, queue: ResolvedCharacterSlot[],
  isAlreadyDespawning: boolean, newlyArrivedSessionIds: ReadonlySet<string>, nowMs: number,
  hadExistingWalkersAtStepStart = true,
): boolean {
  if (isAlreadyDespawning) {
    if (walker.awaitingParentSummon && queue.length === 0) {
      walker.awaitingParentSummon = false; walker.despawnCompleted = true;
      walker.wasActiveSubagent = false; walker.portalPhase = undefined;
    }
    return false;
  }
  if (clientState.activeSummoningRituals.get(c.sessionId)?.kind === "despawn") {
    clientState.activeSummoningRituals.delete(c.sessionId);
  }
  const parentId = c.parentId || c.parentSessionId || "";
  const isFreshSpawn = !walker.wasActiveSubagent || newlyArrivedSessionIds.has(c.sessionId);
  if (isFreshSpawn) {
    walker.wasActiveSubagent = true; walker.despawnCompleted = false;
    walker.currentX = PENTAGRAM_CENTER.x; walker.currentY = PENTAGRAM_CENTER.y;
    walker.awaitingParentSummon =
      shouldDelaySubagentForParentSummon(parentId, hadExistingWalkersAtStepStart, nowMs) &&
      !isParentAtSummoningStation(parentId, nowMs);
  }
  const justUnlockedFromParent = Boolean(walker.awaitingParentSummon) && isParentAtSummoningStation(parentId, nowMs);
  if (justUnlockedFromParent) walker.awaitingParentSummon = false;
  if (!walker.awaitingParentSummon && (isFreshSpawn || justUnlockedFromParent) && !clientState.activeSummoningRituals.has(c.sessionId)) {
    clientState.activeSummoningRituals.set(c.sessionId, {
      ritualId: `ritual:${c.sessionId}`, parentId, x: PENTAGRAM_CENTER.x, y: PENTAGRAM_CENTER.y,
      childId: c.sessionId, startedAtMs: nowMs, durationMs: 950, kind: "spawn",
    });
    const pw = parentId ? clientState.characterWalkers.get(parentId) : undefined;
    if (pw && pw.resolvedSlot?.station === "Enchanter") pw.dwellUntilMs = Math.max(pw.dwellUntilMs ?? 0, nowMs + 950);
  }
  if (walker.resolvedSlot?.overheadLabel === "Despawning") {
    walker.resolvedSlot = slot; walker.targetX = slot.x; walker.targetY = slot.y;
  }
  const syncQueuedSlotWhileInPortal = () => {
    const armoryExpired = walker.resolvedSlot?.station === "Armory" && nowMs >= (walker.armoryUntilMs || 0);
    if ((!walker.resolvedSlot || !walker.resolvedSlot.isActing || armoryExpired) && queue.length > 0) {
      walker.resolvedSlot = queue.shift()!;
    }
    walker.resolvedSlot = walker.resolvedSlot ?? slot;
    walker.targetX = walker.resolvedSlot.x; walker.targetY = walker.resolvedSlot.y;
  };
  if (walker.awaitingParentSummon) {
    syncQueuedSlotWhileInPortal();
    walker.portalPhase = undefined; walker.portalProgress = undefined;
    walker.currentX = PENTAGRAM_CENTER.x; walker.currentY = PENTAGRAM_CENTER.y;
    walker.isWalking = false; walker.facingDirection = "south"; walker.facingLeft = false;
    return true;
  }
  const activeRitual = clientState.activeSummoningRituals.get(c.sessionId);
  if (activeRitual && activeRitual.kind !== "despawn") {
    const elapsed = Math.max(0, nowMs - activeRitual.startedAtMs);
    if (elapsed < activeRitual.durationMs && Math.hypot(walker.currentX - PENTAGRAM_CENTER.x, walker.currentY - PENTAGRAM_CENTER.y) <= 4) {
      syncQueuedSlotWhileInPortal();
      walker.portalPhase = "spawning"; walker.portalProgress = Math.max(0.02, Math.min(1, elapsed / activeRitual.durationMs));
      walker.wasActiveSubagent = true; walker.despawnCompleted = false;
      walker.currentX = PENTAGRAM_CENTER.x; walker.currentY = PENTAGRAM_CENTER.y;
      walker.isWalking = false; walker.facingDirection = "south"; walker.facingLeft = false;
      return true;
    }
  }
  return false;
}
