import { compileCharacterToilQueue, computeRingCorridorWaypoints, stepCharacterToilQueue } from "../encounter/index.ts";
import type { SceneHitboxSpec } from "../scene/index.ts";
import { resolveStationFacingDirection } from "../sprites/index.ts";
import { resolveActiveGoalAssemblyAndLayout } from "./canvas-assembly-painter.ts";
import { appendGoalAssemblySceneHitboxes } from "./canvas-mini-assembly-painter.ts";
import { deriveProjectBugMonsters } from "./canvas-wilds-painter.ts";
import {
  collectPendingSummonParentIds,
  enqueueCharacterActions,
  ensureParentSummoningSlotQueued,
  stampCharacterActionSlot,
  stepSubagentSummonPortal,
} from "./character-action-queue.ts";
import { clientState, getActiveRoom, getVisibleProjectCharacters, isMobileViewport, triggerPlatformSnapBurst } from "./client-state.ts";
import { getLastSummonedSessionId } from "./command-scroll-controller.ts";
import { PENTAGRAM_CENTER, SOUTH_GUILD_DOOR_ENTRANCE, type ResolvedCharacterSlot, resolveCharacterTargetSlot, resolveEffectiveCharacterLifecycleState, resolveInwardStationFacing } from "./station-and-workflow-routing.ts";
import { ensureAvailableStationSlot, PREPARATION_STATION_HITBOX_SPECS } from "./station-geometry-catalog.ts";
import { advanceThinkingRoamLeg, advanceWalkerStrideCycle, canReevaluateWalkerRoute, enforceWalkerPersonalSpace, ROUTE_RETARGET_GRACE_MS, resolveCharacterWalkSpeed, resolveDepartureStaggerMs, resolveSmoothedWalkerFacing, resolveSmoothPerimeterExitTarget, STATION_ACTION_DWELL_GRACE_MS, updatePassThroughOverlapGrace } from "./walker-separation.ts";

export const TRANSIT_WALK_SPEED_PX_PER_SEC = 155;
export const THINKING_PACING_SPEED_PX_PER_SEC = 46.5;

export function populateDualChamberSceneHitboxes(): SceneHitboxSpec[] {
  const activeRoom = getActiveRoom();
  const roomId = activeRoom?.roomId || clientState.selectedRoomId || clientState.selectedProjectId || "/guild";
  const hitboxes: SceneHitboxSpec[] = [];

  for (const st of PREPARATION_STATION_HITBOX_SPECS) {
    const kind = st.workstation === "Resource Stockpile" ? "resource-stockpile" : st.workstation === "Break Lounge" ? "break-lounge" : "workstation";
    hitboxes.push({ priority: 3, roomId, x: st.x, y: st.y, w: st.w, h: st.h, target: { kind, roomId, workstation: st.workstation } });
  }
  appendGoalAssemblySceneHitboxes(hitboxes, roomId, resolveActiveGoalAssemblyAndLayout());
  const mobileScale = isMobileViewport() ? 2.0 : 1.0;
  for (const bug of deriveProjectBugMonsters()) {
    const bw = Math.round(84 * mobileScale);
    const bh = Math.round(90 * mobileScale);
    hitboxes.push({
      priority: 8, roomId, x: 800 + bug.x - Math.round(42 * mobileScale), y: bug.y - Math.round(48 * mobileScale), w: bw, h: bh,
      target: { kind: "bug-monster", roomId, monsterId: bug.id, name: `${bug.bugName} (${bug.monsterName})`, tier: Math.max(1, Math.min(4, bug.tier)) as 1 | 2 | 3 | 4, status: bug.inCombat ? "combat" : "idle", currentHp: Math.round(bug.hpPct * 100), maxHp: 100 },
    });
  }
  clientState.characterHitboxes = [];
  for (const c of getVisibleProjectCharacters()) {
    const walker = clientState.characterWalkers.get(c.sessionId);
    if (!walker || walker.awaitingParentSummon || walker.despawnCompleted) continue;
    const scale = (c.parentId || c.parentSessionId || c.role === "Squad Subagent" ? 0.7 : 1.0) * mobileScale;
    const rect = { sessionId: c.sessionId, x: walker.currentX - Math.round(20 * scale), y: walker.currentY - Math.round(34 * scale), w: Math.round(40 * scale), h: Math.round(60 * scale) };
    clientState.characterHitboxes.push(rect);
    hitboxes.push({ priority: 10, sessionId: c.sessionId, roomId: c.roomId || roomId, x: rect.x, y: rect.y, w: rect.w, h: rect.h, target: { kind: "character", sessionId: c.sessionId, roomId: c.roomId || roomId, isWalking: walker.isWalking, walkingToLabel: walker.resolvedSlot?.overheadLabel || walker.resolvedSlot?.station } });
  }
  hitboxes.sort((a, b) => a.priority - b.priority);
  clientState.sceneHitboxes = hitboxes;
  return hitboxes;
}

export function stepClientChoreography(dtSec: number, nowMs: number): void {
  const effectiveDtSec = dtSec > 1.0 ? Math.min(0.25, Math.max(0.001, dtSec / 1000)) : Math.min(0.25, Math.max(0.001, dtSec));
  const dtMs = effectiveDtSec * 1000;

  // 1. Goal Assembly resolved task transition & snap burst
  const activeRoom = getActiveRoom();
  const taskProgress = activeRoom?.taskProgress;
  const builtCount = taskProgress && taskProgress.totalTasks > 0 ? taskProgress.resolvedTasks : resolveActiveGoalAssemblyAndLayout().assembly.fittedCount;
  if (clientState.lastResolvedTasksCount >= 0 && builtCount > clientState.lastResolvedTasksCount) triggerPlatformSnapBurst(390, 345);
  clientState.lastResolvedTasksCount = builtCount;

  // 2. Step and expire snap particles
  for (let i = clientState.snapParticles.length - 1; i >= 0; i--) {
    const sp = clientState.snapParticles[i];
    sp.life -= dtMs * 0.002;
    if (sp.life <= 0) clientState.snapParticles.splice(i, 1);
  }

  // 3. Bug Monster count transitions & timers
  const activeBugs = deriveProjectBugMonsters();
  if (activeBugs.length > clientState.lastActiveBugCount) clientState.mutationFlashTimer = 1.0;
  else if (activeBugs.length === 0 && clientState.lastActiveBugCount > 0) clientState.slayVictoryTimer = 1.0;
  else {
    clientState.mutationFlashTimer = Math.max(0, clientState.mutationFlashTimer - effectiveDtSec);
    clientState.slayVictoryTimer = Math.max(0, clientState.slayVictoryTimer - effectiveDtSec);
  }
  clientState.lastActiveBugCount = activeBugs.length;

  // 4. Expire old dynamic lantern flares
  for (let i = clientState.lanternFlares.length - 1; i >= 0; i--) {
    if (nowMs > clientState.lanternFlares[i].expiresAtMs) clientState.lanternFlares.splice(i, 1);
  }

  // 5. Prune deleted sessions & manage summoning rituals
  const snapshotChars = clientState.currentSnapshot.characters || {};
  for (const sid of clientState.characterWalkers.keys()) {
    if (!snapshotChars[sid]) {
      clientState.characterWalkers.delete(sid);
      clientState.activeSummoningRituals.delete(sid);
    }
  }
  for (const sid of clientState.knownSessionIds) {
    if (!snapshotChars[sid]) clientState.knownSessionIds.delete(sid);
  }

  for (const [childId, ritual] of clientState.activeSummoningRituals.entries()) {
    if (nowMs - ritual.startedAtMs >= ritual.durationMs) {
      if (ritual.kind === "despawn") {
        const w = clientState.characterWalkers.get(childId);
        if (w && w.resolvedSlot?.overheadLabel === "Despawning") {
          w.despawnCompleted = true; w.wasActiveSubagent = false; w.portalPhase = undefined; w.portalProgress = 1;
        }
      }
      clientState.activeSummoningRituals.delete(childId);
    }
  }

  const chars = getVisibleProjectCharacters();
  const hasActiveRoomBug = activeBugs.length > 0;
  const hadExistingWalkersAtStepStart = [...clientState.characterWalkers.values()].some((w) => Boolean(w.initializedQueue));
  if (!hadExistingWalkersAtStepStart) {
    clientState.knownSessionIds.clear();
    for (const sid of Object.keys(snapshotChars)) clientState.knownSessionIds.add(sid);
  }
  const newlyArrivedSessionIds = new Set<string>();

  for (const ch of chars) {
    if (!clientState.knownSessionIds.has(ch.sessionId)) {
      newlyArrivedSessionIds.add(ch.sessionId);
      clientState.knownSessionIds.add(ch.sessionId);
    }
  }
  for (const sid of Object.keys(snapshotChars)) clientState.knownSessionIds.add(sid);
  const orderedChars = [...chars].sort((a, b) => {
    const aSub = a.parentId || a.parentSessionId || a.role === "Squad Subagent" ? 1 : 0;
    const bSub = b.parentId || b.parentSessionId || b.role === "Squad Subagent" ? 1 : 0;
    return aSub - bSub;
  });
  const pendingSummonParents = collectPendingSummonParentIds(orderedChars, newlyArrivedSessionIds, hadExistingWalkersAtStepStart, nowMs);

  // 6. Step character walkers along ring-corridor waypoints with FIFO job queueing
  let loungeSeatIndex = 0;
  let simultaneousTransitions = 0;
  const stationOccupantCounts = new Map<string, number>();

  for (const c of orderedChars) {
    const hadWalkerBeforeSlot = Boolean(clientState.characterWalkers.get(c.sessionId)?.initializedQueue);
    const effectiveLifecycleState = resolveEffectiveCharacterLifecycleState(c, nowMs);
    const slot = resolveCharacterTargetSlot(c, loungeSeatIndex, stationOccupantCounts, nowMs, hasActiveRoomBug);
    if (slot.station === "Lounge" && slot.isActing) loungeSeatIndex++;

    const isSubagent = Boolean(c.parentId || c.parentSessionId || c.role === "Squad Subagent");
    const isAlreadyDespawning = isSubagent && slot.overheadLabel === "Despawning";
    let walker = clientState.characterWalkers.get(c.sessionId);
    if (!walker) {
      walker = {
        currentX: isSubagent ? PENTAGRAM_CENTER.x : slot.x, currentY: isSubagent ? PENTAGRAM_CENTER.y : slot.y,
        targetX: slot.x, targetY: slot.y, resolvedSlot: slot, pendingSlot: null, slotQueue: [],
        seenToolCallIds: new Set((c.recentTools ?? []).map((r) => r.callId).filter((id): id is string => Boolean(id))),
        initializedQueue: true, hasReachedAssemblyPacing: false, dwellUntilMs: 0, isWalking: false,
        facingLeft: false, walkCycle: 0, lastToolCategory: "", armoryUntilMs: 0,
        searchWaypointIdx: loungeSeatIndex, wasActiveSubagent: isSubagent && !isAlreadyDespawning, despawnCompleted: isAlreadyDespawning,
      };
      clientState.characterWalkers.set(c.sessionId, walker);
    } else if (!walker.initializedQueue) {
      walker.slotQueue = [];
      walker.seenToolCallIds = new Set((c.recentTools ?? []).map((r) => r.callId).filter((id): id is string => Boolean(id)));
      if (!walker.resolvedSlot) {
        walker.resolvedSlot = slot;
        walker.targetX = slot.x;
        walker.targetY = slot.y;
        if (walker.isWalking) walker.waypoints = [{ x: slot.x, y: slot.y }];
      }
      walker.initializedQueue = true;
    } else if (!walker.resolvedSlot) {
      walker.resolvedSlot = slot;
    }

    const isRecentlySpawnedArrival =
      hadExistingWalkersAtStepStart &&
      newlyArrivedSessionIds.has(c.sessionId) &&
      effectiveLifecycleState !== "RestingInLounge" &&
      effectiveLifecycleState !== "Archived" &&
      (c.lastActivityAtMs ?? c.stateEnteredAtMs ?? 0) >= nowMs - 15_000;
    const shouldEnterViaSouthDoor =
      !isSubagent &&
      !hadWalkerBeforeSlot &&
      (effectiveLifecycleState === "Entering" ||
        c.sessionId === getLastSummonedSessionId() ||
        isRecentlySpawnedArrival);
    if (shouldEnterViaSouthDoor) {
      walker.currentX = SOUTH_GUILD_DOOR_ENTRANCE.x; walker.currentY = SOUTH_GUILD_DOOR_ENTRANCE.y;
      walker.targetX = slot.x; walker.targetY = slot.y; walker.resolvedSlot = slot;
      walker.isWalking = Math.hypot(slot.x - SOUTH_GUILD_DOOR_ENTRANCE.x, slot.y - SOUTH_GUILD_DOOR_ENTRANCE.y) > 3;
      walker.facingDirection = SOUTH_GUILD_DOOR_ENTRANCE.facingDirection; walker.facingLeft = false;
      walker.hasReachedAssemblyPacing = false; walker.routeLegCounter = 0;
      walker.routeGraceUntilMs = nowMs + ROUTE_RETARGET_GRACE_MS;
      walker.waypoints = [...computeRingCorridorWaypoints(SOUTH_GUILD_DOOR_ENTRANCE.x, SOUTH_GUILD_DOOR_ENTRANCE.y, slot.x, slot.y, `${c.sessionId}:0`)];
    }

    const queue = walker.slotQueue ?? (walker.slotQueue = []);
    enqueueCharacterActions(c, walker, slot, stationOccupantCounts, hasActiveRoomBug, nowMs);
    if (!isSubagent) {
      ensureParentSummoningSlotQueued(c, walker, slot, queue, stationOccupantCounts, pendingSummonParents, nowMs);
    } else if (stepSubagentSummonPortal(c, walker, slot, queue, isAlreadyDespawning, newlyArrivedSessionIds, nowMs, hadExistingWalkersAtStepStart)) {
      continue;
    }

    if (effectiveLifecycleState === "DistillingContextMana") {
      walker.targetX = walker.currentX; walker.targetY = walker.currentY;
      walker.waypoints = []; walker.slotQueue = []; walker.pendingSlot = null;
      walker.isWalking = false; walker.isClearingPerimeter = false; walker.departureUntilMs = 0;
      walker.resolvedSlot = { ...(walker.resolvedSlot ?? slot), x: walker.currentX, y: walker.currentY, overheadLabel: "Compacting...", isActing: true };
      continue;
    }
    const isEffectivelyThinking =
      effectiveLifecycleState === "Thinking" ||
      (effectiveLifecycleState === "WorkingAtStation" && slot.station === "Assembly" && !slot.isActing);
    const currentlyAtAssemblyPacing = walker.resolvedSlot?.station === "Assembly" && !walker.resolvedSlot?.isActing;
    const currentlyAtNonActing = Boolean(walker.resolvedSlot && !walker.resolvedSlot.isActing);
    const currentlyRestingAtLounge =
      walker.resolvedSlot?.station === "Lounge" &&
      Boolean(walker.resolvedSlot?.isActing) &&
      (!walker.isWalking || (effectiveLifecycleState !== "RestingInLounge" && effectiveLifecycleState !== "Archived"));
    const currentlyInAbandonedCombat = (!hasActiveRoomBug || (slot.station !== "Combat" && !slot.isActing && !walker.resolvedSlot?.actionId)) && walker.resolvedSlot?.station === "Combat";
    const hasShiftedCombatTarget =
      walker.resolvedSlot?.station === "Combat" &&
      slot.station === "Combat" &&
      Math.hypot(walker.targetX - slot.x, walker.targetY - slot.y) > 6;
    const hasUnfinishedWalkToActiveJob =
      Boolean(walker.resolvedSlot) && walker.resolvedSlot!.station !== "Lounge" && !currentlyAtNonActing &&
      walker.resolvedSlot!.overheadLabel !== "Despawning" && Math.hypot(walker.targetX - walker.currentX, walker.targetY - walker.currentY) > 3;
    const isUrgentDespawn = isSubagent && slot.overheadLabel === "Despawning" && walker.resolvedSlot?.overheadLabel !== "Despawning";
    const isLockedInStationJob =
      !isUrgentDespawn && !currentlyAtNonActing && !currentlyRestingAtLounge && !currentlyInAbandonedCombat && !hasShiftedCombatTarget &&
      (walker.isWalking || Boolean(walker.isClearingPerimeter) || hasUnfinishedWalkToActiveJob || (typeof walker.dwellUntilMs === "number" && nowMs < walker.dwellUntilMs));

    const startSlotTransition = (nextSlot: ResolvedCharacterSlot) => {
      stampCharacterActionSlot(walker!, nextSlot, nowMs);
      const prevSlot = walker!.resolvedSlot;
      if (
        prevSlot && prevSlot.station === nextSlot.station && nextSlot.station !== "Combat" &&
        nextSlot.station !== "Assembly" && nextSlot.overheadLabel !== "Despawning" && prevSlot.overheadLabel !== "Reporting Scroll" &&
        Math.hypot(walker!.targetX - walker!.currentX, walker!.targetY - walker!.currentY) <= 3
      ) {
        nextSlot.x = walker!.currentX; nextSlot.y = walker!.currentY;
        nextSlot.facingDirection = walker!.facingDirection ?? nextSlot.facingDirection;
      }
      ensureAvailableStationSlot(c.sessionId, walker!, nextSlot, clientState.characterWalkers);
      const legIdx = (walker!.routeLegCounter ?? 0) + 1;
      walker!.routeLegCounter = legIdx;
      const keepEntrySpeed = prevSlot?.overheadLabel === "Entering Hall" && walker!.isWalking && typeof walker!.walkSpeedMultiplier === "number";
      if (!keepEntrySpeed) walker!.walkSpeedMultiplier = resolveCharacterWalkSpeed(1, c.sessionId, legIdx);
      const isInPlaceActionStep = Math.hypot(nextSlot.x - walker!.currentX, nextSlot.y - walker!.currentY) <= 3;
      const staggerMs = isInPlaceActionStep || walker!.isWalking ? 0 : resolveDepartureStaggerMs(c.sessionId, simultaneousTransitions++);
      walker!.departureUntilMs = staggerMs > 0 ? nowMs + staggerMs : 0;
      if (isInPlaceActionStep && nextSlot.isActing && nextSlot.station !== "Lounge" && nextSlot.actionId && nextSlot.actionId !== prevSlot?.actionId) {
        walker!.dwellUntilMs = nowMs + STATION_ACTION_DWELL_GRACE_MS;
      }
      walker!.routeGraceUntilMs = nowMs + ROUTE_RETARGET_GRACE_MS; walker!.isClearingPerimeter = false;
      walker!.resolvedSlot = nextSlot; walker!.pendingSlot = queue[0] ?? null;
      walker!.targetX = nextSlot.x; walker!.targetY = nextSlot.y; walker!.hasReachedAssemblyPacing = false; walker!.hasActiveDetour = false;
      walker!.waypoints = isInPlaceActionStep ? [] : [...computeRingCorridorWaypoints(walker!.currentX, walker!.currentY, nextSlot.x, nextSlot.y, `${c.sessionId}:${legIdx}`)];
    };

    if (!isLockedInStationJob) {
      const hasRestingLoungeSlotChanged = !walker.resolvedSlot || walker.resolvedSlot.station !== slot.station || walker.resolvedSlot.overheadLabel !== slot.overheadLabel || Math.hypot(slot.x - walker.targetX, slot.y - walker.targetY) > 3;
      if (queue.length > 0) startSlotTransition(queue.shift()!);
      else if (currentlyInAbandonedCombat || hasShiftedCombatTarget) startSlotTransition(slot);
      else if (slot.station === "Assembly" && !slot.isActing && isEffectivelyThinking && !currentlyAtAssemblyPacing && !(walker.resolvedSlot?.station === "Combat" && hasActiveRoomBug)) startSlotTransition(slot);
      else if ((currentlyAtNonActing || (currentlyRestingAtLounge && hasRestingLoungeSlotChanged)) && !isEffectivelyThinking && effectiveLifecycleState !== "Entering") startSlotTransition(slot);
    }
    const canRetargetStationSlot = canReevaluateWalkerRoute(walker, nowMs) || Math.hypot(walker.targetX - walker.currentX, walker.targetY - walker.currentY) <= 36;
    if (walker.resolvedSlot?.isActing && canRetargetStationSlot && ensureAvailableStationSlot(c.sessionId, walker, walker.resolvedSlot, clientState.characterWalkers)) {
      walker.targetX = walker.resolvedSlot.x; walker.targetY = walker.resolvedSlot.y; walker.hasActiveDetour = false;
      walker.routeGraceUntilMs = nowMs + ROUTE_RETARGET_GRACE_MS;
      walker.waypoints = [...computeRingCorridorWaypoints(walker.currentX, walker.currentY, walker.targetX, walker.targetY, `${c.sessionId}:${walker.routeLegCounter ?? 0}`)];
    }
    walker.pendingSlot = queue[0] ?? null;

    if (isSubagent && walker.resolvedSlot?.overheadLabel === "Despawning" && queue.length === 0) {
      if (walker.despawnCompleted) { walker.portalPhase = undefined; continue; }
      if (Math.hypot(walker.currentX - PENTAGRAM_CENTER.x, walker.currentY - PENTAGRAM_CENTER.y) <= 4) {
        let despawnRitual = clientState.activeSummoningRituals.get(c.sessionId);
        if (!despawnRitual || despawnRitual.kind !== "despawn") {
          despawnRitual = {
            ritualId: `ritual:despawn:${c.sessionId}`, parentId: c.parentId || c.parentSessionId || "",
            x: PENTAGRAM_CENTER.x, y: PENTAGRAM_CENTER.y, childId: c.sessionId, startedAtMs: nowMs, durationMs: 950, kind: "despawn",
          };
          clientState.activeSummoningRituals.set(c.sessionId, despawnRitual);
        }
        const dElapsed = Math.max(0, nowMs - despawnRitual.startedAtMs);
        walker.currentX = PENTAGRAM_CENTER.x; walker.currentY = PENTAGRAM_CENTER.y; walker.targetX = PENTAGRAM_CENTER.x; walker.targetY = PENTAGRAM_CENTER.y;
        walker.isWalking = false; walker.facingDirection = "south"; walker.facingLeft = false; walker.portalPhase = "despawning";
        walker.portalProgress = Math.max(0.05, Math.min(1, dElapsed / despawnRitual.durationMs));
        if (dElapsed >= despawnRitual.durationMs) {
          walker.despawnCompleted = true; walker.wasActiveSubagent = false; walker.portalPhase = undefined; clientState.activeSummoningRituals.delete(c.sessionId);
        }
        continue;
      }
      walker.portalPhase = undefined; walker.portalProgress = undefined;
    } else if (!walker.despawnCompleted) {
      walker.portalPhase = undefined; walker.portalProgress = undefined; walker.despawnCompleted = false;
      if (isSubagent) {
        walker.wasActiveSubagent = true;
        if (clientState.activeSummoningRituals.get(c.sessionId)?.kind === "despawn") clientState.activeSummoningRituals.delete(c.sessionId);
      }
    }

    const activeSlot = walker.resolvedSlot ?? slot;
    const chamberCtx = { chamberWidth: clientState.chamberWidth, chamberHeight: clientState.chamberHeight, wildsWidth: clientState.wildsWidth };
    const isThinkingPacingStep = activeSlot.station === "Assembly" && !activeSlot.isActing && isEffectivelyThinking;
    const isDespawningSlot = activeSlot.overheadLabel === "Despawning";
    if (isThinkingPacingStep && activeSlot.pacingSide && queue.length === 0 && Math.hypot(walker.targetX - walker.currentX, walker.targetY - walker.currentY) <= 18) {
      walker.hasReachedAssemblyPacing = true;
      const nextPt = advanceThinkingRoamLeg(walker, activeSlot.pacingSide, c.sessionId, chamberCtx);
      walker.targetX = nextPt.x; walker.targetY = nextPt.y;
      walker.resolvedSlot = { ...activeSlot, x: nextPt.x, y: nextPt.y, facingDirection: nextPt.facingDirection };
      walker.waypoints = [...nextPt.waypoints]; walker.isWalking = true;
    }
    const speedMult = walker.walkSpeedMultiplier ?? (chars.length > 1 ? resolveCharacterWalkSpeed(1, c.sessionId, walker.routeLegCounter ?? 0) : 1);
    const walkSpeed = (isThinkingPacingStep ? THINKING_PACING_SPEED_PX_PER_SEC : TRANSIT_WALK_SPEED_PX_PER_SEC) * speedMult;
    let dist = Math.hypot(walker.targetX - walker.currentX, walker.targetY - walker.currentY);
    if (dist <= 3 && !isThinkingPacingStep && !isDespawningSlot && walker.isWalking && resolveSmoothPerimeterExitTarget(c.sessionId, walker, clientState.characterWalkers, nowMs, chamberCtx)) {
      dist = Math.hypot(walker.targetX - walker.currentX, walker.targetY - walker.currentY);
    }
    if (dist > 3) {
      if (walker.departureUntilMs && nowMs < walker.departureUntilMs) { walker.isWalking = false; continue; }
      walker.isWalking = true;
      updatePassThroughOverlapGrace(c.sessionId, walker, clientState.characterWalkers, nowMs, chamberCtx);
      if (!walker.waypoints || walker.waypoints.length === 0) {
        const toilQueue = compileCharacterToilQueue({
          fromX: walker.currentX, fromY: walker.currentY, toX: walker.targetX, toY: walker.targetY,
          station: activeSlot.station, overheadLabel: activeSlot.overheadLabel, speedPxPerSec: walkSpeed,
          routeSeed: `${c.sessionId}:${walker.routeLegCounter ?? 0}`,
        });
        const walkToil = toilQueue.find((t) => t.kind === "walk-corridor");
        walker.waypoints = walkToil ? [...walkToil.waypoints] : [{ x: walker.targetX, y: walker.targetY }];
      }
      const prevX = walker.currentX, prevY = walker.currentY;
      const stepped = stepCharacterToilQueue(
        { x: walker.currentX, y: walker.currentY, queue: [{ kind: "walk-corridor", waypoints: walker.waypoints, speedPxPerSec: walkSpeed, label: activeSlot.overheadLabel }], completedKinds: [] },
        dtMs,
      );
      walker.currentX = stepped.x; walker.currentY = stepped.y;
      updatePassThroughOverlapGrace(c.sessionId, walker, clientState.characterWalkers, nowMs, chamberCtx);
      const stepDx = walker.currentX - prevX, stepDy = walker.currentY - prevY;
      const stepDistPx = Math.hypot(stepDx, stepDy);
      walker.isWalking = stepDistPx > 0.01;
      if (stepDistPx > 0.01) resolveSmoothedWalkerFacing(walker, stepDx, stepDy);
      walker.walkCycle = advanceWalkerStrideCycle(walker.walkCycle, stepDistPx, isSubagent);
      const nextWalk = stepped.queue[0];
      walker.waypoints = nextWalk && nextWalk.kind === "walk-corridor" ? [...nextWalk.waypoints] : [];
      if (walker.waypoints.length === 0 && !isThinkingPacingStep && !isDespawningSlot) {
        resolveSmoothPerimeterExitTarget(c.sessionId, walker, clientState.characterWalkers, nowMs, chamberCtx);
      }
    } else {
      if (isThinkingPacingStep && activeSlot.pacingSide && queue.length === 0) {
        walker.walkCycle = advanceWalkerStrideCycle(walker.walkCycle, dist, isSubagent);
        walker.currentX = walker.targetX; walker.currentY = walker.targetY; walker.hasReachedAssemblyPacing = true; walker.isWalking = false; walker.waypoints = [];
        walker.facingDirection = activeSlot.facingDirection ?? resolveInwardStationFacing(activeSlot.station, walker.currentX, walker.currentY);
        walker.facingLeft = walker.facingDirection === "west";
      } else {
        if (walker.isWalking) {
          walker.dwellUntilMs = activeSlot.station === "Lounge" ? 0 : nowMs + STATION_ACTION_DWELL_GRACE_MS;
          walker.routeGraceUntilMs = nowMs + ROUTE_RETARGET_GRACE_MS;
        }
        walker.isWalking = false; walker.isClearingPerimeter = false; walker.currentX = walker.targetX; walker.currentY = walker.targetY; walker.waypoints = [];
        walker.facingDirection = activeSlot.facingDirection ?? resolveInwardStationFacing(activeSlot.station, walker.currentX, walker.currentY) ?? resolveStationFacingDirection(activeSlot.station, walker.currentX, walker.currentY);
        walker.facingLeft = walker.facingDirection === "west";
        if (activeSlot.station === "Combat" && walker.facingDirection !== "west") walker.facingLeft = false;
        if (queue.length > 0 && (!walker.dwellUntilMs || nowMs >= walker.dwellUntilMs)) {
          startSlotTransition(queue.shift()!); walker.pendingSlot = queue[0] ?? null;
        }
      }
      if (activeSlot.overheadLabel === "Reporting Scroll" || c.lifecycleState === "ReportingScroll") {
        const scrollTs = c.reportScroll?.createdAtMs ?? c.stateEnteredAtMs ?? 1;
        if (walker.lastDeliveredScrollAtMs !== scrollTs) {
          walker.lastDeliveredScrollAtMs = scrollTs; triggerPlatformSnapBurst(walker.currentX, walker.currentY);
        }
      }
    }
    if (walker.currentX >= 815 && (activeSlot.station === "WildsSearch" || activeSlot.station === "Combat")) {
      const existingFlare = clientState.lanternFlares.find((f) => f.sessionId === c.sessionId && Math.hypot(f.x - walker.currentX, f.y - walker.currentY) < 48);
      if (existingFlare) existingFlare.expiresAtMs = nowMs + 8500;
      else {
        clientState.lanternFlares.push({ id: `flare:${c.sessionId}:${Math.round(nowMs)}`, sessionId: c.sessionId, x: walker.currentX, y: walker.currentY, r: 105, createdAtMs: nowMs, expiresAtMs: nowMs + 8500 });
        if (clientState.lanternFlares.length > 8) clientState.lanternFlares.shift();
      }
    }
  }
  enforceWalkerPersonalSpace(chars, clientState.characterWalkers, { chamberWidth: clientState.chamberWidth, chamberHeight: clientState.chamberHeight, wildsWidth: clientState.wildsWidth });
  populateDualChamberSceneHitboxes();
}
