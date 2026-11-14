import type { CanonicalPreparationStationId } from "../encounter/index.ts";
import {
  type DirectionalTurnaround,
  deriveFacingDirectionFromDelta,
  resolveStationFacingDirection,
} from "../sprites/index.ts";
import type { CharacterState } from "../types/domain.ts";
import {
  buildCombatLairPerimeterSlots,
  LAIR_POSITIONS,
  LOUNGE_SEAT_SLOTS,
  PREPARATION_STATION_GEOMETRY_CATALOG,
  type StationPerimeterSlotSpec,
  WILDS_SEARCH_WAYPOINTS,
} from "./station-geometry-catalog.ts";

function isSlotPointOccupiedByWalker(x: number, y: number, otherW: AllocatePerimeterSlotWalkerView): boolean {
  const otx = typeof otherW.targetX === "number" ? otherW.targetX : otherW.currentX;
  const oty = typeof otherW.targetY === "number" ? otherW.targetY : otherW.currentY;
  return (
    Math.hypot(otx - x, oty - y) < 32 ||
    (!otherW.isWalking && Math.hypot(otherW.currentX - x, otherW.currentY - y) < 32)
  );
}

export function resolveLoungeSeatSlot(loungeSeatIndex: number): StationPerimeterSlotSpec {
  const len = LOUNGE_SEAT_SLOTS.length;
  const safeIdx = Math.max(0, loungeSeatIndex);
  if (safeIdx < len) return LOUNGE_SEAT_SLOTS[safeIdx];
  const base = LOUNGE_SEAT_SLOTS[safeIdx % len];
  const overflowTier = Math.floor(safeIdx / len);
  const stepX = 20 * Math.ceil(overflowTier / 2);
  const sign = overflowTier % 2 === 1 ? 1 : -1;
  const candX = base.x + sign * stepX;
  const x = candX >= 458 && candX <= 746 ? candX : Math.max(458, Math.min(746, base.x - sign * stepX));
  const y = Math.max(540, Math.min(690, base.y - Math.min(22 * overflowTier, Math.max(12, base.y - 540))));
  return { x, y, facingDirection: base.facingDirection, side: base.side };
}

export function allocateLoungeSeatSlot(
  sessionId: string,
  loungeSeatIndex: number,
  stationOccupantCounts: Map<string, number>,
  walker?: AllocatePerimeterSlotWalkerView,
  allWalkers?: ReadonlyMap<string, AllocatePerimeterSlotWalkerView>,
): StationPerimeterSlotSpec {
  const claimPrefix = "LoungeSeat:";
  const isOccupiedByOther = (pt: { x: number; y: number }): boolean => {
    if (!allWalkers) return false;
    for (const [otherId, otherW] of allWalkers.entries()) {
      if (otherId === sessionId || otherW.despawnCompleted || otherW.awaitingParentSummon) continue;
      if (otherW.resolvedSlot?.station !== "Lounge" || !otherW.resolvedSlot?.isActing) continue;
      const ox = typeof otherW.targetX === "number" ? otherW.targetX : otherW.currentX;
      const oy = typeof otherW.targetY === "number" ? otherW.targetY : otherW.currentY;
      if (Math.hypot(ox - pt.x, oy - pt.y) < 24 || (!otherW.isWalking && Math.hypot(otherW.currentX - pt.x, otherW.currentY - pt.y) < 24)) {
        return true;
      }
    }
    return false;
  };
  if (
    walker && walker.assignedStation === "Lounge" && typeof walker.assignedSlotIdx === "number" &&
    walker.assignedSlotIdx >= 0 && !stationOccupantCounts.has(`${claimPrefix}${walker.assignedSlotIdx}`)
  ) {
    const existingSeat = resolveLoungeSeatSlot(walker.assignedSlotIdx);
    if (!isOccupiedByOther(existingSeat)) {
      stationOccupantCounts.set(`${claimPrefix}${walker.assignedSlotIdx}`, 1);
      return existingSeat;
    }
  }
  if (
    walker && walker.resolvedSlot?.station === "Lounge" && !walker.isWalking &&
    Math.hypot((walker.targetX ?? walker.currentX) - walker.currentX, (walker.targetY ?? walker.currentY) - walker.currentY) <= 3.5 &&
    !isOccupiedByOther({ x: walker.currentX, y: walker.currentY })
  ) {
    const matchIdx = LOUNGE_SEAT_SLOTS.findIndex((s) => Math.hypot(s.x - walker.currentX, s.y - walker.currentY) < 6);
    if (matchIdx >= 0 && !stationOccupantCounts.has(`${claimPrefix}${matchIdx}`)) {
      stationOccupantCounts.set(`${claimPrefix}${matchIdx}`, 1);
      walker.assignedStation = "Lounge"; walker.assignedSlotIdx = matchIdx;
    }
    return { x: walker.currentX, y: walker.currentY, facingDirection: walker.facingDirection ?? "south", side: "south" };
  }
  let candIdx = Math.max(0, loungeSeatIndex);
  while (
    stationOccupantCounts.has(`${claimPrefix}${candIdx}`) ||
    (candIdx < LOUNGE_SEAT_SLOTS.length && isOccupiedByOther(resolveLoungeSeatSlot(candIdx)))
  ) {
    candIdx++;
  }
  stationOccupantCounts.set(`${claimPrefix}${candIdx}`, 1);
  if (walker) { walker.assignedStation = "Lounge"; walker.assignedSlotIdx = candIdx; }
  return resolveLoungeSeatSlot(candIdx);
}

export function resolveInwardStationFacing(station: string, slotX?: number, slotY?: number): DirectionalTurnaround {
  if (station === "Combat" && typeof slotX === "number" && typeof slotY === "number") {
    let nearest = { x: 800 + LAIR_POSITIONS[0].x, y: LAIR_POSITIONS[0].y };
    let bestDist = Math.hypot(nearest.x - slotX, nearest.y - slotY);
    for (let i = 1; i < LAIR_POSITIONS.length; i++) {
      const cx = 800 + LAIR_POSITIONS[i].x;
      const cy = LAIR_POSITIONS[i].y;
      const d = Math.hypot(cx - slotX, cy - slotY);
      if (d < bestDist) { bestDist = d; nearest = { x: cx, y: cy }; }
    }
    if (Math.abs(nearest.x - slotX) > 2 || Math.abs(nearest.y - slotY) > 2) {
      return deriveFacingDirectionFromDelta(nearest.x - slotX, nearest.y - slotY);
    }
  }
  const spec = PREPARATION_STATION_GEOMETRY_CATALOG[station as CanonicalPreparationStationId];
  if (typeof slotX === "number" && typeof slotY === "number" && spec) {
    const matched = spec.perimeterSlots.find((s) => Math.hypot(s.x - slotX, s.y - slotY) <= 3);
    if (matched) return matched.facingDirection;
    if (Math.abs(spec.focalCenter.x - slotX) > 2 || Math.abs(spec.focalCenter.y - slotY) > 2) {
      return deriveFacingDirectionFromDelta(spec.focalCenter.x - slotX, spec.focalCenter.y - slotY);
    }
  }
  return spec?.perimeterSlots[0]?.facingDirection ?? resolveStationFacingDirection(station, slotX, slotY);
}

export interface AllocatePerimeterSlotWalkerView {
  currentX: number; currentY: number; targetX?: number; targetY?: number;
  isWalking?: boolean; facingDirection?: DirectionalTurnaround; despawnCompleted?: boolean; awaitingParentSummon?: boolean; searchWaypointIdx?: number;
  assignedStation?: string; assignedSlotIdx?: number;
  resolvedSlot?: { station?: string; isActing?: boolean } | null;
}

export interface AllocatePerimeterSlotInput {
  sessionId: string; station: CanonicalPreparationStationId; stationOccupantCounts: Map<string, number>;
  walker?: AllocatePerimeterSlotWalkerView;
  createdWalker?: boolean; allWalkers?: ReadonlyMap<string, AllocatePerimeterSlotWalkerView>;
  activeCharacters?: Readonly<Record<string, CharacterState>>;
  customSlots?: ReadonlyArray<StationPerimeterSlotSpec>;
  customFocalCenter?: { readonly x: number; readonly y: number };
  customStationKey?: string;
}

export function allocateStationPerimeterSlot(
  input: AllocatePerimeterSlotInput,
): { x: number; y: number; facingDirection: DirectionalTurnaround; slotIdx: number } {
  const { sessionId, station, stationOccupantCounts, walker, createdWalker = false, allWalkers, activeCharacters, customSlots, customFocalCenter, customStationKey } = input;
  const stationKey = customStationKey ?? station;
  const spec = PREPARATION_STATION_GEOMETRY_CATALOG[station] ?? PREPARATION_STATION_GEOMETRY_CATALOG.Library;
  const slots = customSlots ?? spec.perimeterSlots;
  const focalCenter = customFocalCenter ?? spec.focalCenter;
  const baseSessionId = sessionId.split(":tool:")[0];
  const sessionClaimKey = `SessionSlot:${stationKey}:${baseSessionId}`;
  const existingSessionSlot = stationOccupantCounts.get(sessionClaimKey);
  if (existingSessionSlot !== undefined && existingSessionSlot < slots.length && station !== "WildsSearch") {
    const s = slots[existingSessionSlot];
    return { x: s.x, y: s.y, facingDirection: s.facingDirection, slotIdx: existingSessionSlot };
  }

  const occIdx = stationOccupantCounts.get(stationKey) ?? 0;
  stationOccupantCounts.set(stationKey, occIdx + 1);
  if (stationKey !== station) stationOccupantCounts.set(station, (stationOccupantCounts.get(station) ?? 0) + 1);

  if (station === "WildsSearch") {
    const wpIdx = ((walker?.searchWaypointIdx ?? 0) + occIdx) % WILDS_SEARCH_WAYPOINTS.length;
    const wp = WILDS_SEARCH_WAYPOINTS[wpIdx];
    return { x: wp.x, y: wp.y, facingDirection: wp.facingDirection, slotIdx: wpIdx };
  }

  const claimPrefix = `SlotClaim:${stationKey}:`;
  const reserved = new Set<number>();
  if (allWalkers) {
    for (const [otherId, otherW] of allWalkers.entries()) {
      if (otherId === sessionId || otherId === baseSessionId || otherW.despawnCompleted || otherW.awaitingParentSummon) continue;
      const otherChar = activeCharacters?.[otherId];
      const otherActiveOrInTransit = Boolean(
        otherW.isWalking ||
          (otherW.resolvedSlot?.isActing && otherW.resolvedSlot.station !== "Lounge") ||
          !otherChar ||
          (otherChar.lifecycleState !== "RestingInLounge" && otherChar.lifecycleState !== "Archived"),
      );
      if (!otherActiveOrInTransit) continue;
      if (otherW.assignedStation === stationKey && typeof otherW.assignedSlotIdx === "number") {
        reserved.add(otherW.assignedSlotIdx);
      }
      for (let i = 0; i < slots.length; i++) {
        if (isSlotPointOccupiedByWalker(slots[i].x, slots[i].y, otherW)) {
          reserved.add(i);
        }
      }
    }
  }

  let chosenIdx: number | undefined;
  if (
    walker && walker.assignedStation === stationKey &&
    typeof walker.assignedSlotIdx === "number" && walker.assignedSlotIdx >= 0 &&
    !stationOccupantCounts.has(`${claimPrefix}${walker.assignedSlotIdx}`) &&
    !reserved.has(walker.assignedSlotIdx)
  ) {
    chosenIdx = walker.assignedSlotIdx;
  }

  if (chosenIdx === undefined) {
    const freeIndices: number[] = [];
    for (let i = 0; i < slots.length; i++) {
      if (!stationOccupantCounts.has(`${claimPrefix}${i}`) && !reserved.has(i)) freeIndices.push(i);
    }
    if (freeIndices.length > 0) {
      if (!createdWalker && walker && (occIdx > 0 || !freeIndices.includes(0))) {
        freeIndices.sort((a, b) => {
          const da = Math.hypot(slots[a].x - walker.currentX, slots[a].y - walker.currentY);
          const db = Math.hypot(slots[b].x - walker.currentX, slots[b].y - walker.currentY);
          return da + a * 0.01 - (db + b * 0.01);
        });
      }
      chosenIdx = freeIndices[0];
    } else {
      let overflowCand = Math.max(occIdx, slots.length);
      while (stationOccupantCounts.has(`${claimPrefix}${overflowCand}`) || reserved.has(overflowCand)) {
        overflowCand++;
      }
      chosenIdx = overflowCand;
    }
  }

  stationOccupantCounts.set(`${claimPrefix}${chosenIdx}`, 1);
  stationOccupantCounts.set(sessionClaimKey, chosenIdx);
  if (walker) { walker.assignedStation = stationKey; walker.assignedSlotIdx = chosenIdx; }
  if (chosenIdx < slots.length) {
    const slot = slots[chosenIdx];
    return { x: slot.x, y: slot.y, facingDirection: slot.facingDirection, slotIdx: chosenIdx };
  }

  const baseSlot = slots[chosenIdx % slots.length];
  const ringLayer = Math.floor(chosenIdx / slots.length);
  const vx = baseSlot.x - focalCenter.x;
  const vy = baseSlot.y - focalCenter.y;
  const vLen = Math.hypot(vx, vy) || 1;
  const rawX = Math.round(baseSlot.x + (vx / vLen) * 40 * ringLayer);
  const rawY = Math.round(baseSlot.y + (vy / vLen) * 40 * ringLayer);
  const clampedX = station === "Combat" ? Math.max(830, Math.min(1540, rawX)) : Math.max(54, Math.min(746, rawX));
  const clampedY = Math.max(68, Math.min(698, rawY));
  return {
    x: clampedX, y: clampedY,
    facingDirection: deriveFacingDirectionFromDelta(focalCenter.x - clampedX, focalCenter.y - clampedY),
    slotIdx: chosenIdx,
  };
}

export function ensureAvailableStationSlot<
  TSlot extends { x: number; y: number; station: CanonicalPreparationStationId; facingDirection?: DirectionalTurnaround; isActing: boolean; overheadLabel?: string },
>(
  sessionId: string,
  walker: AllocatePerimeterSlotWalkerView,
  slot: TSlot,
  allWalkers: ReadonlyMap<string, AllocatePerimeterSlotWalkerView>,
): boolean {
  if (!slot.isActing || slot.station === "WildsSearch" || slot.overheadLabel === "Despawning") return false;
  const selfDist = Math.hypot(slot.x - walker.currentX, slot.y - walker.currentY);
  let hasConflict = false;
  for (const [otherId, otherW] of allWalkers.entries()) {
    if (otherId === sessionId || otherW.despawnCompleted) continue;
    if (!isSlotPointOccupiedByWalker(slot.x, slot.y, otherW)) continue;
    const otx = typeof otherW.targetX === "number" ? otherW.targetX : otherW.currentX;
    const oty = typeof otherW.targetY === "number" ? otherW.targetY : otherW.currentY;
    const currDiff = Math.hypot(otherW.currentX - slot.x, otherW.currentY - slot.y);
    const otherSettled = !otherW.isWalking && currDiff < 32;
    const otherDist = Math.hypot(otx - otherW.currentX, oty - otherW.currentY);
    if (otherSettled || (walker.isWalking && (otherDist + 2 < selfDist || (Math.abs(otherDist - selfDist) <= 2 && otherId < sessionId)))) {
      hasConflict = true;
      break;
    }
  }
  if (!hasConflict) return false;

  const spec = PREPARATION_STATION_GEOMETRY_CATALOG[slot.station] ?? PREPARATION_STATION_GEOMETRY_CATALOG.Library;
  let baseSlots = spec.perimeterSlots;
  let focalCenter = spec.focalCenter;
  if (slot.station === "Combat") {
    let bestLair = LAIR_POSITIONS[0];
    let bestDist = Math.hypot(800 + bestLair.x - slot.x, bestLair.y - slot.y);
    for (let i = 1; i < LAIR_POSITIONS.length; i++) {
      const d = Math.hypot(800 + LAIR_POSITIONS[i].x - slot.x, LAIR_POSITIONS[i].y - slot.y);
      if (d < bestDist) { bestDist = d; bestLair = LAIR_POSITIONS[i]; }
    }
    baseSlots = buildCombatLairPerimeterSlots(bestLair.x, bestLair.y);
    focalCenter = { x: 800 + bestLair.x, y: bestLair.y };
  }

  const isFreePoint = (x: number, y: number): boolean => {
    for (const [otherId, otherW] of allWalkers.entries()) {
      if (otherId === sessionId || otherW.despawnCompleted) continue;
      if (isSlotPointOccupiedByWalker(x, y, otherW)) return false;
    }
    return true;
  };

  const candidates = baseSlots.map((s, idx) => ({ x: s.x, y: s.y, facingDirection: s.facingDirection, idx }));
  const free = candidates.filter((cand) => isFreePoint(cand.x, cand.y));
  if (free.length === 0) {
    for (let ring = 1; ring <= 2 && free.length === 0; ring++) {
      for (let i = 0; i < baseSlots.length; i++) {
        const bs = baseSlots[i];
        const vx = bs.x - focalCenter.x, vy = bs.y - focalCenter.y, vLen = Math.hypot(vx, vy) || 1;
        const rx = Math.round(bs.x + (vx / vLen) * 40 * ring);
        const ry = Math.round(bs.y + (vy / vLen) * 40 * ring);
        const cx = slot.station === "Combat" ? Math.max(830, Math.min(1540, rx)) : Math.max(54, Math.min(746, rx));
        const cy = Math.max(68, Math.min(698, ry));
        if (isFreePoint(cx, cy)) {
          free.push({ x: cx, y: cy, facingDirection: deriveFacingDirectionFromDelta(focalCenter.x - cx, focalCenter.y - cy), idx: ring * baseSlots.length + i });
        }
      }
    }
  }

  if (free.length > 0) {
    free.sort((a, b) => Math.hypot(a.x - walker.currentX, a.y - walker.currentY) - Math.hypot(b.x - walker.currentX, b.y - walker.currentY));
    const chosen = free[0];
    slot.x = chosen.x;
    slot.y = chosen.y;
    slot.facingDirection = chosen.facingDirection;
    walker.assignedStation = slot.station;
    walker.assignedSlotIdx = chosen.idx;
    return true;
  }
  return false;
}
