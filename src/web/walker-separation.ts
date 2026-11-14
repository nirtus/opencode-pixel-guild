import {
  hashRouteSeed,
  resolveCharacterWalkSpeed,
  resolveDepartureStaggerMs,
} from "../encounter/index.ts";
import { WORLD_CHAMBER_WIDTH_PX, WORLD_TOTAL_HEIGHT_PX } from "../scene/index.ts";
import { type DirectionalTurnaround, deriveFacingDirectionFromDelta } from "../sprites/index.ts";
import type { CharacterState } from "../types/domain.ts";
import type { WalkerState } from "./client-state.ts";
import {
  COLLISION_WALKER_SEPARATION_PX,
  canReevaluateWalkerRoute,
  clampToWalkableChamberPoint,
  ELLIPSE_CLEARANCE_X_PX,
  ELLIPSE_CLEARANCE_Y_PX,
  evaluatePointPairPerimeter,
  isPointInsideAnyPersonalPerimeter,
  MIN_WALKER_SEPARATION_PX,
  PASS_THROUGH_OVERLAP_GRACE_MS,
  ROUTE_RETARGET_GRACE_MS,
  resolveSmoothPerimeterExitTarget,
  STATION_ACTION_DWELL_GRACE_MS,
  updatePassThroughOverlapGrace,
} from "./perimeter-pass-through.ts";
import {
  advanceThinkingRoamLeg,
  assignThinkingRoamTarget,
  type ChamberProportionalContext,
  resolveProportionalAssemblyObstacleBox,
  resolveReportingScrollSlotOffset,
  resolveThinkingRoamCircuit,
  type ThinkingRoamCircuit,
} from "./thinking-roam-circuits.ts";

export {
  advanceThinkingRoamLeg,
  assignThinkingRoamTarget,
  type ChamberProportionalContext,
  COLLISION_WALKER_SEPARATION_PX,
  canReevaluateWalkerRoute,
  clampToWalkableChamberPoint,
  ELLIPSE_CLEARANCE_X_PX,
  ELLIPSE_CLEARANCE_Y_PX,
  evaluatePointPairPerimeter,
  isPointInsideAnyPersonalPerimeter,
  MIN_WALKER_SEPARATION_PX,
  PASS_THROUGH_OVERLAP_GRACE_MS,
  ROUTE_RETARGET_GRACE_MS,
  resolveCharacterWalkSpeed,
  resolveDepartureStaggerMs,
  resolveProportionalAssemblyObstacleBox,
  resolveReportingScrollSlotOffset,
  resolveSmoothPerimeterExitTarget,
  resolveThinkingRoamCircuit,
  STATION_ACTION_DWELL_GRACE_MS,
  type ThinkingRoamCircuit,
  updatePassThroughOverlapGrace,
};

export const WALK_CYCLE_UNITS_PER_PX = 12 / 155;
export const STRIDE_CYCLE_WALK_UNITS = 6;
export const SUBAGENT_STRIDE_SCALE = 0.7;

export function advanceWalkerStrideCycle(
  currentWalkCycle: number,
  distancePx: number,
  isSubagent = false,
): number {
  const base = Number.isFinite(currentWalkCycle) ? currentWalkCycle : 0;
  if (!Number.isFinite(distancePx) || distancePx <= 0.01) return base;
  const statureScale = isSubagent ? SUBAGENT_STRIDE_SCALE : 1;
  return base + (distancePx * WALK_CYCLE_UNITS_PER_PX) / statureScale;
}

export function resolveWalkStrideAnimPhase(walkCycle: number): { animPhase: number; animBucket12: number; bobOffsetY: number } {
  const safeCycle = Number.isFinite(walkCycle) ? walkCycle : 0;
  const animPhase = (((safeCycle / STRIDE_CYCLE_WALK_UNITS) % 1) + 1) % 1;
  return { animPhase, animBucket12: Math.floor(animPhase * 12) % 12, bobOffsetY: Math.sin(animPhase * Math.PI * 4) * 2.2 };
}

export function resolveSmoothedWalkerFacing(walker: WalkerState, stepDx: number, stepDy: number): DirectionalTurnaround {
  walker.smoothVx = (walker.smoothVx ?? stepDx) * 0.65 + stepDx * 0.35;
  walker.smoothVy = (walker.smoothVy ?? stepDy) * 0.65 + stepDy * 0.35;
  const facing = deriveFacingDirectionFromDelta(walker.smoothVx, walker.smoothVy, walker.facingDirection);
  walker.facingDirection = facing;
  walker.facingLeft = facing === "west";
  return facing;
}

function reanchorDisplacedStationWalker(walker: WalkerState, nextPt: { x: number; y: number }, distToTgt: number): void {
  walker.targetX = nextPt.x;
  walker.targetY = nextPt.y;
  if (walker.resolvedSlot) {
    walker.resolvedSlot.x = nextPt.x;
    walker.resolvedSlot.y = nextPt.y;
  }
  if (distToTgt <= 36) {
    walker.waypoints = [];
    walker.isWalking = false;
  }
}

export function enforceWalkerPersonalSpace(
  chars: ReadonlyArray<CharacterState>,
  walkerMap: Map<string, WalkerState>,
  chamberCtx?: Partial<ChamberProportionalContext>,
): void {
  const cw = chamberCtx?.chamberWidth ?? WORLD_CHAMBER_WIDTH_PX;
  const ch = chamberCtx?.chamberHeight ?? WORLD_TOTAL_HEIGHT_PX;
  const ww = chamberCtx?.wildsWidth ?? cw;
  const box = resolveProportionalAssemblyObstacleBox(cw, ch);

  const activeEntries: Array<{ sessionId: string; walker: WalkerState; isSettledSlot: boolean }> = [];
  for (const c of chars) {
    const w = walkerMap.get(c.sessionId);
    if (!w || w.despawnCompleted) continue;
    if (w.awaitingParentSummon || w.portalPhase || w.resolvedSlot?.overheadLabel === "Despawning") continue;
    const distToTgt = Math.hypot(w.targetX - w.currentX, w.targetY - w.currentY);
    const isSettledSlot = w.resolvedSlot?.overheadLabel === "Compacting..." || (!w.isWalking && distToTgt <= 3.5 && Boolean(w.resolvedSlot?.isActing));
    activeEntries.push({ sessionId: c.sessionId, walker: w, isSettledSlot });
  }

  if (activeEntries.length < 2) return;

  for (let pass = 0; pass < 8; pass++) {
    let anyAdjusted = false;
    for (let i = 0; i < activeEntries.length; i++) {
      for (let j = i + 1; j < activeEntries.length; j++) {
        const a = activeEntries[i];
        const b = activeEntries[j];
        // Moving characters pass smoothly through each other and through stationary characters;
        // only enforce Personal Perimeter separation between stationary characters.
        if (a.walker.isWalking || b.walker.isWalking) continue;

        const isWildsA = a.walker.currentX >= 800;
        const isWildsB = b.walker.currentX >= 800;
        if (isWildsA !== isWildsB) continue;

        const targetSep = Math.hypot(a.walker.targetX - b.walker.targetX, a.walker.targetY - b.walker.targetY);
        const distToTgtA = Math.hypot(a.walker.targetX - a.walker.currentX, a.walker.targetY - a.walker.currentY);
        const distToTgtB = Math.hypot(b.walker.targetX - b.walker.currentX, b.walker.targetY - b.walker.currentY);
        const check = evaluatePointPairPerimeter(a.walker.currentX, a.walker.currentY, a.walker, b.walker, chamberCtx);
        if (check.bothNearDistinctSlots && (check.rDist >= MIN_WALKER_SEPARATION_PX || (a.isSettledSlot && b.isSettledSlot))) continue;
        if (!check.overlapping) continue;
        if (a.isSettledSlot && b.isSettledSlot && targetSep >= 26) continue;

        anyAdjusted = true;
        const scaleX = isWildsA ? Math.max(0.35, ww / 800) : Math.max(0.5, cw / 800);
        const scaleY = Math.max(0.5, ch / 720);
        const overlap = Math.max(check.targetDist - check.rDist, check.useElliptical ? (1 - check.ellipNorm) * 36 : 0) + 0.75;
        const isAtSouthDoorway = !isWildsA && a.walker.currentY >= 685 && b.walker.currentY >= 685 && Math.abs(a.walker.currentX - 400) < 28 && Math.abs(b.walker.currentX - 400) < 28;
        let ux: number;
        let uy: number;
        if (isAtSouthDoorway) {
          ux = check.rdx >= 0 ? 1 : -1;
          uy = 0;
        } else if (check.rDist > 0.5) {
          ux = check.rdx / check.rDist;
          uy = check.rdy / check.rDist;
        } else {
          const h = hashRouteSeed(`sep:${a.sessionId}:${b.sessionId}:${i}:${j}:${pass}`);
          const ang = (((i * 73 + j * 137 + (h % 97)) % 360) * Math.PI) / 180;
          ux = Math.cos(ang);
          uy = Math.sin(ang);
        }

        const weightA = a.isSettledSlot && !b.isSettledSlot ? 0 : !a.isSettledSlot && b.isSettledSlot ? 1 : 0.5;
        const weightB = 1 - weightA;
        const rawPushAx = (-ux * overlap * weightA) / scaleX;
        const rawPushAy = (-uy * overlap * weightA) / scaleY;
        const rawPushBx = (ux * overlap * weightB) / scaleX;
        const rawPushBy = (uy * overlap * weightB) / scaleY;

        const nextA = clampToWalkableChamberPoint(a.walker.currentX + rawPushAx, a.walker.currentY + rawPushAy, isWildsA, box);
        const nextB = clampToWalkableChamberPoint(b.walker.currentX + rawPushBx, b.walker.currentY + rawPushBy, isWildsB, box);
        a.walker.currentX = nextA.x;
        a.walker.currentY = nextA.y;
        b.walker.currentX = nextB.x;
        b.walker.currentY = nextB.y;
        if (weightA > 0) reanchorDisplacedStationWalker(a.walker, nextA, distToTgtA);
        if (weightB > 0) reanchorDisplacedStationWalker(b.walker, nextB, distToTgtB);
      }
    }
    if (!anyAdjusted) break;
  }
}
