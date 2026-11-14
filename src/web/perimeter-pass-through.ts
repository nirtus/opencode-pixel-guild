import {
  GOAL_ASSEMBLY_OBSTACLE_BOX,
  hashRouteSeed,
  type ObstacleBox,
  RESOURCE_STOCKPILE_OBSTACLE_BOX,
  segmentIntersectsBox,
} from "../encounter/index.ts";
import { anchorWorldPoint, WORLD_CHAMBER_WIDTH_PX, WORLD_TOTAL_HEIGHT_PX } from "../scene/index.ts";
import type { WalkerState } from "./client-state.ts";
import { ensureAvailableStationSlot } from "./station-slot-allocator.ts";
import { type ChamberProportionalContext, resolveProportionalAssemblyObstacleBox } from "./thinking-roam-circuits.ts";

export const MIN_WALKER_SEPARATION_PX = 24;
export const COLLISION_WALKER_SEPARATION_PX = 36;
export const ELLIPSE_CLEARANCE_X_PX = 46;
export const ELLIPSE_CLEARANCE_Y_PX = 34;
export const PASS_THROUGH_OVERLAP_GRACE_MS = 450;
export const ROUTE_RETARGET_GRACE_MS = 500;
export const STATION_ACTION_DWELL_GRACE_MS = 750;

export function clampToWalkableChamberPoint(
  x: number,
  y: number,
  isWilds: boolean,
  box: ObstacleBox = GOAL_ASSEMBLY_OBSTACLE_BOX,
): { x: number; y: number } {
  if (x >= 716 && x <= 845 && y >= 316 && y <= 388) {
    return { x: Math.max(716, Math.min(845, x)), y: Math.max(328, Math.min(376, y)) };
  }
  const minX = isWilds ? 828 : 54;
  const maxX = isWilds ? 1546 : 748;
  let cx = Math.max(minX, Math.min(maxX, x));
  let cy = Math.max(68, Math.min(698, y));

  if (!isWilds) {
    for (const obs of [box, RESOURCE_STOCKPILE_OBSTACLE_BOX]) {
      const pad = 6;
      if (cx > obs.minX - pad && cx < obs.maxX + pad && cy > obs.minY - pad && cy < obs.maxY + pad) {
        const dLeft = Math.abs(cx - (obs.minX - pad));
        const dRight = Math.abs(obs.maxX + pad - cx);
        const dTop = Math.abs(cy - (obs.minY - pad));
        const dBottom = Math.abs(obs.maxY + pad - cy);
        const minD = Math.min(dLeft, dRight, dTop, dBottom);
        if (minD === dLeft) cx = obs.minX - pad;
        else if (minD === dRight) cx = obs.maxX + pad;
        else if (minD === dTop) cy = obs.minY - pad;
        else cy = obs.maxY + pad;
      }
    }
  }
  return { x: cx, y: cy };
}

export function canReevaluateWalkerRoute(walker: WalkerState, nowMs: number): boolean {
  if (walker.isClearingPerimeter) return false;
  if (typeof walker.routeGraceUntilMs === "number" && nowMs < walker.routeGraceUntilMs) return false;
  if (typeof walker.overlapGraceUntilMs === "number" && nowMs < walker.overlapGraceUntilMs) return false;
  return true;
}

export function evaluatePointPairPerimeter(
  candX: number,
  candY: number,
  walker: WalkerState,
  other: WalkerState,
  chamberCtx?: Partial<ChamberProportionalContext>,
): {
  overlapping: boolean;
  rDist: number;
  targetDist: number;
  ellipNorm: number;
  useElliptical: boolean;
  rdx: number;
  rdy: number;
  bothNearDistinctSlots: boolean;
} {
  const cw = chamberCtx?.chamberWidth ?? WORLD_CHAMBER_WIDTH_PX;
  const ch = chamberCtx?.chamberHeight ?? WORLD_TOTAL_HEIGHT_PX;
  const ww = chamberCtx?.wildsWidth ?? cw;
  const isWilds = candX >= 800;

  const targetSep = Math.hypot(candX - other.targetX, candY - other.targetY);
  const distToTgtOther = Math.hypot(other.targetX - other.currentX, other.targetY - other.currentY);
  const bothNearDistinctSlots =
    targetSep >= 26 &&
    Boolean(walker.resolvedSlot?.isActing && other.resolvedSlot?.isActing) &&
    distToTgtOther <= 175;

  const rA = anchorWorldPoint(candX, candY, cw, ch, ww);
  const rB = anchorWorldPoint(other.currentX, other.currentY, cw, ch, ww);
  const rdx = rB.x - rA.x;
  const rdy = rB.y - rA.y;
  const rDist = Math.hypot(rdx, rdy);
  const isAtSouthDoorway =
    !isWilds &&
    candY >= 685 &&
    other.currentY >= 685 &&
    Math.abs(candX - 400) < 28 &&
    Math.abs(other.currentX - 400) < 28;
  const useElliptical = !isAtSouthDoorway && !bothNearDistinctSlots;
  const ellipNorm = Math.hypot(rdx / ELLIPSE_CLEARANCE_X_PX, rdy / ELLIPSE_CLEARANCE_Y_PX);
  const targetDist = useElliptical ? COLLISION_WALKER_SEPARATION_PX : MIN_WALKER_SEPARATION_PX;
  const overlapping = rDist < targetDist || (useElliptical && ellipNorm < 0.82);

  return { overlapping, rDist, targetDist, ellipNorm, useElliptical, rdx, rdy, bothNearDistinctSlots };
}

export function isPointInsideAnyPersonalPerimeter(
  sessionId: string,
  candX: number,
  candY: number,
  walker: WalkerState,
  allWalkers: ReadonlyMap<string, WalkerState>,
  chamberCtx?: Partial<ChamberProportionalContext>,
  forStopCheck = false,
): WalkerState | null {
  const isWilds = candX >= 800;
  for (const [otherId, other] of allWalkers.entries()) {
    if (otherId === sessionId || other.despawnCompleted) continue;
    if (other.awaitingParentSummon || other.portalPhase || other.resolvedSlot?.overheadLabel === "Despawning") continue;
    if ((other.currentX >= 800) !== isWilds) continue;
    if (forStopCheck && other.isWalking && walker.resolvedSlot?.isActing) {
      const targetSep = Math.hypot(candX - other.targetX, candY - other.targetY);
      if (targetSep >= 26) continue;
    }
    const check = evaluatePointPairPerimeter(candX, candY, walker, other, chamberCtx);
    if (check.overlapping) return other;
  }
  return null;
}

export function updatePassThroughOverlapGrace(
  sessionId: string,
  walker: WalkerState,
  allWalkers: ReadonlyMap<string, WalkerState>,
  nowMs: number,
  chamberCtx?: Partial<ChamberProportionalContext>,
): boolean {
  const blocker = isPointInsideAnyPersonalPerimeter(
    sessionId,
    walker.currentX,
    walker.currentY,
    walker,
    allWalkers,
    chamberCtx,
    false,
  );
  if (blocker) {
    const graceUntil = nowMs + PASS_THROUGH_OVERLAP_GRACE_MS;
    walker.overlapGraceUntilMs = Math.max(walker.overlapGraceUntilMs ?? 0, graceUntil);
    if (blocker.isWalking) {
      blocker.overlapGraceUntilMs = Math.max(blocker.overlapGraceUntilMs ?? 0, graceUntil);
    }
    return true;
  }
  return typeof walker.overlapGraceUntilMs === "number" && nowMs < walker.overlapGraceUntilMs;
}

export function resolveSmoothPerimeterExitTarget(
  sessionId: string,
  walker: WalkerState,
  allWalkers: ReadonlyMap<string, WalkerState>,
  nowMs: number,
  chamberCtx?: Partial<ChamberProportionalContext>,
): boolean {
  if (walker.awaitingParentSummon || walker.portalPhase || walker.resolvedSlot?.overheadLabel === "Despawning") return false;
  const blocker = isPointInsideAnyPersonalPerimeter(
    sessionId,
    walker.currentX,
    walker.currentY,
    walker,
    allWalkers,
    chamberCtx,
    true,
  );
  if (!blocker) {
    walker.isClearingPerimeter = false;
    return false;
  }

  if (
    walker.resolvedSlot?.isActing &&
    walker.resolvedSlot.station !== "WildsSearch" &&
    ensureAvailableStationSlot(sessionId, walker, walker.resolvedSlot, allWalkers)
  ) {
    const slotClear = !isPointInsideAnyPersonalPerimeter(
      sessionId,
      walker.resolvedSlot.x,
      walker.resolvedSlot.y,
      walker,
      allWalkers,
      chamberCtx,
      true,
    );
    if (slotClear && Math.hypot(walker.resolvedSlot.x - walker.currentX, walker.resolvedSlot.y - walker.currentY) > 3) {
      walker.targetX = walker.resolvedSlot.x;
      walker.targetY = walker.resolvedSlot.y;
      walker.waypoints = [{ x: walker.targetX, y: walker.targetY }];
      walker.isWalking = true;
      walker.isClearingPerimeter = true;
      walker.routeGraceUntilMs = nowMs + ROUTE_RETARGET_GRACE_MS;
      walker.overlapGraceUntilMs = Math.max(walker.overlapGraceUntilMs ?? 0, nowMs + PASS_THROUGH_OVERLAP_GRACE_MS);
      return true;
    }
  }

  const cw = chamberCtx?.chamberWidth ?? WORLD_CHAMBER_WIDTH_PX;
  const ch = chamberCtx?.chamberHeight ?? WORLD_TOTAL_HEIGHT_PX;
  const ww = chamberCtx?.wildsWidth ?? cw;
  const isWilds = walker.currentX >= 800;
  const box = resolveProportionalAssemblyObstacleBox(cw, ch);
  const scaleX = isWilds ? Math.max(0.35, ww / 800) : Math.max(0.5, cw / 800);
  const scaleY = Math.max(0.5, ch / 720);

  let baseVx = walker.smoothVx ?? 0;
  let baseVy = walker.smoothVy ?? 0;
  if (Math.hypot(baseVx, baseVy) < 0.05) {
    baseVx = walker.currentX - blocker.currentX;
    baseVy = walker.currentY - blocker.currentY;
  }
  if (Math.hypot(baseVx, baseVy) < 0.5) {
    const h = hashRouteSeed(`exit:${sessionId}:${Math.round(nowMs / 250)}`);
    const ang = ((h % 360) * Math.PI) / 180;
    baseVx = Math.cos(ang);
    baseVy = Math.sin(ang);
  }
  const baseAngle = Math.atan2(baseVy, baseVx);
  const angleOffsetsDeg = [0, 28, -28, 56, -56, 88, -88, 125, -125, 160, -160, 180];
  const radialSteps = [42, 52, 64, 78];

  let chosenPt: { x: number; y: number } | null = null;
  for (const distPx of radialSteps) {
    for (const deg of angleOffsetsDeg) {
      const ang = baseAngle + (deg * Math.PI) / 180;
      const cand = clampToWalkableChamberPoint(
        Math.round(blocker.currentX + (Math.cos(ang) * distPx) / scaleX),
        Math.round(blocker.currentY + (Math.sin(ang) * distPx) / scaleY),
        isWilds,
        box,
      );
      if (Math.hypot(cand.x - walker.currentX, cand.y - walker.currentY) <= 4) continue;
      if (
        !isWilds &&
        (segmentIntersectsBox(walker.currentX, walker.currentY, cand.x, cand.y, box) ||
          segmentIntersectsBox(walker.currentX, walker.currentY, cand.x, cand.y, RESOURCE_STOCKPILE_OBSTACLE_BOX))
      ) {
        continue;
      }
      if (!isPointInsideAnyPersonalPerimeter(sessionId, cand.x, cand.y, walker, allWalkers, chamberCtx)) {
        chosenPt = cand;
        break;
      }
    }
    if (chosenPt) break;
  }

  if (!chosenPt) {
    chosenPt = clampToWalkableChamberPoint(
      Math.round(blocker.currentX + (Math.cos(baseAngle) * 48) / scaleX),
      Math.round(blocker.currentY + (Math.sin(baseAngle) * 48) / scaleY),
      isWilds,
      box,
    );
  }

  walker.targetX = chosenPt.x;
  walker.targetY = chosenPt.y;
  if (walker.resolvedSlot) {
    walker.resolvedSlot.x = chosenPt.x;
    walker.resolvedSlot.y = chosenPt.y;
  }
  walker.waypoints = [{ x: chosenPt.x, y: chosenPt.y }];
  walker.isWalking = true;
  walker.isClearingPerimeter = true;
  walker.routeGraceUntilMs = nowMs + ROUTE_RETARGET_GRACE_MS;
  walker.overlapGraceUntilMs = Math.max(walker.overlapGraceUntilMs ?? 0, nowMs + PASS_THROUGH_OVERLAP_GRACE_MS);
  return true;
}
