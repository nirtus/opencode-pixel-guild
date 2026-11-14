import type { ResourceCargoKind } from "../types/domain.ts";
import {
  ARMORY_ANCHOR,
  ASSEMBLY_ANCHOR,
  computeRingCorridorWaypoints,
  EAST_WILDERNESS_PORTAL,
  GOAL_ASSEMBLY_OBSTACLE_BOX,
  hashRouteSeed,
  type ObstacleBox,
  RESOURCE_STOCKPILE_OBSTACLE_BOX,
  resolveCharacterWalkSpeed,
  resolveDepartureStaggerMs,
  STOCKPILE_ANCHOR,
  segmentIntersectsBox,
} from "./corridor-router.ts";
import type { CanonicalPreparationStationId } from "./workflow-classifier.ts";

export {
  ARMORY_ANCHOR,
  ASSEMBLY_ANCHOR,
  computeRingCorridorWaypoints,
  EAST_WILDERNESS_PORTAL,
  GOAL_ASSEMBLY_OBSTACLE_BOX,
  hashRouteSeed,
  type ObstacleBox,
  RESOURCE_STOCKPILE_OBSTACLE_BOX,
  resolveCharacterWalkSpeed,
  resolveDepartureStaggerMs,
  STOCKPILE_ANCHOR,
  segmentIntersectsBox,
};

export type CanonicalStationId = CanonicalPreparationStationId;

export type StationGestureKind =
  | "read-book"
  | "peer-spyglass"
  | "hammer-anvil"
  | "craft-blueprint"
  | "equip-gear"
  | "channel-runes"
  | "stir-cauldron"
  | "haul-cargo"
  | "fit-part"
  | "rest-lounge"
  | "cast-flare"
  | "melee-strike";

export interface CharacterToilTiming {
  readonly timestampMs?: number;
  readonly sequenceOrder?: number;
}

export type CharacterToil =
  | ({ kind: "walk-corridor"; waypoints: ReadonlyArray<{ x: number; y: number }>; speedPxPerSec: number; label: string } & CharacterToilTiming)
  | ({ kind: "dwell-station"; station: CanonicalStationId; durationMs: number; elapsedMs: number; gesture: StationGestureKind; label: string } & CharacterToilTiming)
  | ({ kind: "pickup-cargo"; cargo: ResourceCargoKind; durationMs: number; elapsedMs: number; label: string } & CharacterToilTiming)
  | ({ kind: "fit-assembly-part"; partIndex: number; durationMs: number; elapsedMs: number; label: string } & CharacterToilTiming)
  | ({ kind: "cast-lantern-flare"; targetX: number; targetY: number; radiusPx: number; durationMs: number; elapsedMs: number; label: string } & CharacterToilTiming)
  | ({ kind: "melee-strike-monster"; monsterId: string; durationMs: number; elapsedMs: number; label: string } & CharacterToilTiming)
  | ({ kind: "deliver-report-scroll"; parentCharacterId: string; durationMs: number; elapsedMs: number; label: string } & CharacterToilTiming);

export function resolveStationGesture(station: CanonicalStationId): StationGestureKind {
  const map: Record<CanonicalStationId, StationGestureKind> = {
    Library: "read-book",
    Spyglass: "peer-spyglass",
    Forge: "hammer-anvil",
    Tinker: "craft-blueprint",
    Armory: "equip-gear",
    Enchanter: "channel-runes",
    Alchemy: "stir-cauldron",
    Stockpile: "haul-cargo",
    Assembly: "fit-part",
    WildsSearch: "cast-flare",
    Combat: "melee-strike",
    Lounge: "rest-lounge",
  };
  return map[station] ?? "rest-lounge";
}

export interface CompileToilQueueInput {
  readonly fromX: number;
  readonly fromY: number;
  readonly toX: number;
  readonly toY: number;
  readonly station: CanonicalStationId;
  readonly equippingAtArmory?: boolean;
  readonly cargo?: ResourceCargoKind | null;
  readonly fitAssemblyPartIndex?: number | null;
  readonly castFlareTarget?: { x: number; y: number; radiusPx?: number } | null;
  readonly combatMonsterId?: string | null;
  readonly reportScrollParentId?: string | null;
  readonly overheadLabel?: string;
  readonly speedPxPerSec?: number;
  readonly routeSeed?: string | number;
  readonly timestampMs?: number;
}

const ARMORY_SLOTS = Object.freeze([
  { x: 118, y: 445 }, { x: 106, y: 372 }, { x: 106, y: 514 }, { x: 172, y: 444 }, { x: 166, y: 402 }, { x: 166, y: 486 },
]);
const STOCKPILE_SLOTS = Object.freeze([
  { x: 452, y: 138 }, { x: 382, y: 88 }, { x: 522, y: 88 }, { x: 418, y: 136 }, { x: 486, y: 136 }, { x: 388, y: 116 },
]);

export function compileCharacterToilQueue(input: CompileToilQueueInput): CharacterToil[] {
  const speed = input.speedPxPerSec ?? 155;
  const label = input.overheadLabel ?? "Working...";
  const seed = input.routeSeed;
  const queue: CharacterToil[] = [];
  let cursorX = input.fromX;
  let cursorY = input.fromY;

  if (input.equippingAtArmory) {
    const armoryPt = seed !== undefined ? ARMORY_SLOTS[hashRouteSeed(`${seed}:armory-slot`) % ARMORY_SLOTS.length] : ARMORY_ANCHOR;
    queue.push({ kind: "walk-corridor", waypoints: computeRingCorridorWaypoints(cursorX, cursorY, armoryPt.x, armoryPt.y, seed !== undefined ? `${seed}:armory` : undefined), speedPxPerSec: speed, label: "Equipping Gear" });
    queue.push({ kind: "dwell-station", station: "Armory", durationMs: 1400, elapsedMs: 0, gesture: "equip-gear", label: "Equipping Gear" });
    cursorX = armoryPt.x;
    cursorY = armoryPt.y;
  }

  if (input.cargo) {
    const stockPt = seed !== undefined ? STOCKPILE_SLOTS[hashRouteSeed(`${seed}:stock-slot`) % STOCKPILE_SLOTS.length] : STOCKPILE_ANCHOR;
    queue.push({ kind: "walk-corridor", waypoints: computeRingCorridorWaypoints(cursorX, cursorY, stockPt.x, stockPt.y, seed !== undefined ? `${seed}:cargo` : undefined), speedPxPerSec: speed, label: "Picking Cargo" });
    queue.push({ kind: "pickup-cargo", cargo: input.cargo, durationMs: 500, elapsedMs: 0, label: "Picking Cargo" });
    cursorX = stockPt.x;
    cursorY = stockPt.y;
  }

  queue.push({ kind: "walk-corridor", waypoints: computeRingCorridorWaypoints(cursorX, cursorY, input.toX, input.toY, seed), speedPxPerSec: speed, label });
  cursorX = input.toX;
  cursorY = input.toY;

  if (input.reportScrollParentId) {
    queue.push({ kind: "deliver-report-scroll", parentCharacterId: input.reportScrollParentId, durationMs: 450, elapsedMs: 0, label: "Reporting Scroll" });
    return stampToilQueueTimestamps(queue, input.timestampMs);
  }

  if (input.castFlareTarget) {
    queue.push({ kind: "cast-lantern-flare", targetX: input.castFlareTarget.x, targetY: input.castFlareTarget.y, radiusPx: input.castFlareTarget.radiusPx ?? 105, durationMs: 600, elapsedMs: 0, label });
  } else if (input.combatMonsterId) {
    queue.push({ kind: "melee-strike-monster", monsterId: input.combatMonsterId, durationMs: 700, elapsedMs: 0, label });
  } else {
    queue.push({ kind: "dwell-station", station: input.station, durationMs: 900, elapsedMs: 0, gesture: resolveStationGesture(input.station), label });
  }

  if (typeof input.fitAssemblyPartIndex === "number" && input.fitAssemblyPartIndex >= 0) {
    queue.push({ kind: "walk-corridor", waypoints: computeRingCorridorWaypoints(cursorX, cursorY, ASSEMBLY_ANCHOR.x, ASSEMBLY_ANCHOR.y, seed !== undefined ? `${seed}:fit` : undefined), speedPxPerSec: speed, label: "Hauling Part" });
    queue.push({ kind: "fit-assembly-part", partIndex: input.fitAssemblyPartIndex, durationMs: 550, elapsedMs: 0, label: "Hauling Part" });
  }

  return stampToilQueueTimestamps(queue, input.timestampMs);
}

function stampToilQueueTimestamps(queue: CharacterToil[], baseTimestampMs?: number): CharacterToil[] {
  const baseTs = typeof baseTimestampMs === "number" && Number.isFinite(baseTimestampMs) ? baseTimestampMs : Date.now();
  return queue.map((toil, idx) => ({
    ...toil,
    timestampMs: toil.timestampMs ?? baseTs + idx,
    sequenceOrder: toil.sequenceOrder ?? idx + 1,
  }));
}

export function sortCharacterToilQueue(queue: ReadonlyArray<CharacterToil>): CharacterToil[] {
  return [...queue].sort((a, b) => {
    const hasTsA = typeof a.timestampMs === "number" && Number.isFinite(a.timestampMs);
    const hasTsB = typeof b.timestampMs === "number" && Number.isFinite(b.timestampMs);
    if (hasTsA && hasTsB && a.timestampMs !== b.timestampMs) return a.timestampMs! - b.timestampMs!;
    const hasSeqA = typeof a.sequenceOrder === "number" && Number.isFinite(a.sequenceOrder);
    const hasSeqB = typeof b.sequenceOrder === "number" && Number.isFinite(b.sequenceOrder);
    if (hasSeqA && hasSeqB && a.sequenceOrder !== b.sequenceOrder) return a.sequenceOrder! - b.sequenceOrder!;
    return 0;
  });
}

export interface ToilRunnerState {
  readonly x: number;
  readonly y: number;
  readonly queue: ReadonlyArray<CharacterToil>;
  readonly completedKinds: ReadonlyArray<string>;
}

export function stepCharacterToilQueue(state: ToilRunnerState, dtMs: number): ToilRunnerState {
  if (state.queue.length === 0) return state;
  const orderedQueue = sortCharacterToilQueue(state.queue);
  const current = orderedQueue[0];
  const rest = orderedQueue.slice(1);

  if (current.kind === "walk-corridor") {
    if (current.waypoints.length === 0) {
      return { x: state.x, y: state.y, queue: rest, completedKinds: [...state.completedKinds, current.kind] };
    }
    let curX = state.x;
    let curY = state.y;
    let remainingBudget = current.speedPxPerSec * (dtMs / 1000);
    const remainingWps = [...current.waypoints];

    while (remainingWps.length > 0 && remainingBudget > 0) {
      const wp = remainingWps[0];
      const dist = Math.hypot(wp.x - curX, wp.y - curY);
      if (remainingWps.length === 1 && dist <= Math.max(3, remainingBudget)) {
        return { x: wp.x, y: wp.y, queue: rest, completedKinds: [...state.completedKinds, current.kind] };
      }
      if (remainingWps.length > 1 && dist <= remainingBudget) {
        curX = wp.x;
        curY = wp.y;
        remainingBudget -= dist;
        remainingWps.shift();
        continue;
      }
      const angle = Math.atan2(wp.y - curY, wp.x - curX);
      curX += Math.cos(angle) * remainingBudget;
      curY += Math.sin(angle) * remainingBudget;
      remainingBudget = 0;
    }

    if (remainingWps.length === 0) {
      return { x: curX, y: curY, queue: rest, completedKinds: [...state.completedKinds, current.kind] };
    }
    return {
      x: curX,
      y: curY,
      queue: [{ ...current, waypoints: remainingWps }, ...rest],
      completedKinds: state.completedKinds,
    };
  }

  const nextElapsed = current.elapsedMs + dtMs;
  if (nextElapsed >= current.durationMs) {
    return { x: state.x, y: state.y, queue: rest, completedKinds: [...state.completedKinds, current.kind] };
  }
  return { x: state.x, y: state.y, queue: [{ ...current, elapsedMs: nextElapsed }, ...rest], completedKinds: state.completedKinds };
}
