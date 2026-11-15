import {
  createInitialGoalAssembly,
  GOAL_ASSEMBLY_PARTS,
  type GoalAssemblyPartSpec,
  type GoalAssemblyPartState,
  type GoalAssemblyState,
  type ProjectTaskProgress,
} from "../types/domain.ts";

export { createInitialGoalAssembly, GOAL_ASSEMBLY_PARTS };
export type { GoalAssemblyPartSpec, GoalAssemblyPartState, GoalAssemblyState };

export interface GoalAssemblyMilestoneTier {
  readonly tier: 1 | 2 | 3;
  readonly name: string;
  readonly description: string;
  readonly minFittedParts: number;
}

export const GOAL_ASSEMBLY_MILESTONES: readonly GoalAssemblyMilestoneTier[] = Object.freeze([
  Object.freeze({
    tier: 1,
    name: "Foundation & Steam Conduit",
    description: "Timber staging deck, copper steam pipeline, and pressure dial.",
    minFittedParts: 0,
  }),
  Object.freeze({
    tier: 2,
    name: "Clockwork Engine & Automaton",
    description: "Interlocking brass gear train and clockwork automaton core.",
    minFittedParts: 2,
  }),
  Object.freeze({
    tier: 3,
    name: "Master Guild Monument (Airship)",
    description: "Fully energized power core, control console, and Tesla coil.",
    minFittedParts: 5,
  }),
]);

export function resolveGoalAssemblyMilestone(
  fittedCount: number,
  totalParts = 5,
): GoalAssemblyMilestoneTier {
  const ratio = totalParts > 0 ? fittedCount / totalParts : 0;
  if (ratio >= 0.99) return GOAL_ASSEMBLY_MILESTONES[2];
  if (ratio >= 0.4) return GOAL_ASSEMBLY_MILESTONES[1];
  return GOAL_ASSEMBLY_MILESTONES[0];
}

export interface GoalAssemblySocketCoord {
  partIndex: number;
  endPartIndex: number;
  batchSize: number;
  stackLayers: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export type GoalAssemblyVolumeLevelCode = "READY" | "LIGHT" | "STD" | "HVY" | "BULK";

export interface GoalAssemblyVolumeLevelInfo {
  readonly level: 0 | 1 | 2 | 3 | 4;
  readonly code: GoalAssemblyVolumeLevelCode;
  readonly label: string;
  readonly maxVisualSockets: number;
  readonly stackLayers: number;
}

export interface GoalAssemblyPlatformLayout {
  cols: number;
  rows: number;
  volumeLevel: GoalAssemblyVolumeLevelInfo;
  sockets: GoalAssemblySocketCoord[];
}

export function resolveGoalAssemblyVolumeLevel(
  totalParts: number,
  _fittedCount = 0,
): GoalAssemblyVolumeLevelInfo {
  if (totalParts <= 0) {
    return Object.freeze({
      level: 0,
      code: "READY",
      label: "Blueprint Ready",
      maxVisualSockets: 0,
      stackLayers: 0,
    });
  }
  if (totalParts <= 4) {
    return Object.freeze({
      level: 1,
      code: "LIGHT",
      label: "Light Assembly",
      maxVisualSockets: 4,
      stackLayers: 1,
    });
  }
  if (totalParts <= 12) {
    return Object.freeze({
      level: 2,
      code: "STD",
      label: "Standard Assembly",
      maxVisualSockets: 6,
      stackLayers: 2,
    });
  }
  if (totalParts <= 24) {
    return Object.freeze({
      level: 3,
      code: "HVY",
      label: "Heavy Assembly",
      maxVisualSockets: 4,
      stackLayers: 3,
    });
  }
  return Object.freeze({
    level: 4,
    code: "BULK",
    label: "Bulk Assembly",
    maxVisualSockets: 4,
    stackLayers: 4,
  });
}

export function computeGoalAssemblyPlatformLayout(
  totalParts: number,
  platformPx: { x: number; y: number; w: number; h: number },
): GoalAssemblyPlatformLayout {
  const volumeLevel = resolveGoalAssemblyVolumeLevel(totalParts);
  if (totalParts <= 0) {
    return {
      cols: 1,
      rows: 1,
      volumeLevel,
      sockets: [],
    };
  }

  const visualCount = Math.min(totalParts, volumeLevel.maxVisualSockets);
  const cols = visualCount === 1 ? 1 : visualCount <= 4 ? 2 : 3;
  const rows = Math.ceil(visualCount / cols);

  const headerReservePx = volumeLevel.level >= 2 ? Math.min(20, Math.floor(platformPx.h * 0.16)) : 0;
  const padX = 8;
  const padTop = volumeLevel.level >= 2 ? headerReservePx + 4 : 10;
  const padBottom = 8;
  const availW = Math.max(8, platformPx.w - padX * 2);
  const availH = Math.max(8, platformPx.h - padTop - padBottom);

  const gapX = cols >= 3 ? 6 : 8;
  const gapY = 6;
  const socketW = Math.max(4, Math.floor((availW - (cols - 1) * gapX) / cols));
  const socketH = Math.max(4, Math.floor((availH - (rows - 1) * gapY) / rows));

  const sockets: GoalAssemblySocketCoord[] = [];
  for (let sIdx = 0; sIdx < visualCount; sIdx += 1) {
    const col = sIdx % cols;
    const row = Math.floor(sIdx / cols);
    const itemsInRow = row === rows - 1 ? visualCount - row * cols : cols;
    const rowTotalW = itemsInRow * socketW + Math.max(0, itemsInRow - 1) * gapX;
    const rowStartX = platformPx.x + padX + Math.max(0, Math.floor((availW - rowTotalW) / 2));

    const socketX = rowStartX + col * (socketW + gapX);
    const socketY = platformPx.y + padTop + row * (socketH + gapY);

    const startIdx = Math.floor((sIdx * totalParts) / visualCount);
    const endIdx = Math.max(startIdx, Math.floor(((sIdx + 1) * totalParts) / visualCount) - 1);
    const batchSize = endIdx - startIdx + 1;

    sockets.push({
      partIndex: startIdx,
      endPartIndex: endIdx,
      batchSize,
      stackLayers: volumeLevel.stackLayers,
      x: socketX,
      y: socketY,
      w: socketW,
      h: socketH,
    });
  }

  return {
    cols,
    rows,
    volumeLevel,
    sockets,
  };
}

export function createGoalAssemblyFromTaskProgress(
  progress: ProjectTaskProgress,
): GoalAssemblyState {
  if (progress.totalTasks <= 0) {
    return {
      totalParts: 0,
      fittedCount: 0,
      parts: Object.freeze([]),
      isComplete: false,
    };
  }
  const taskCount = progress.totalTasks;
  const parts: GoalAssemblyPartState[] = [];

  for (let i = 0; i < taskCount; i += 1) {
    const taskItem = progress.tasks?.[i];
    const isResolved = taskItem
      ? taskItem.status === "resolved"
      : i < progress.resolvedTasks;
    const id = taskItem?.id ?? String(i + 1).padStart(2, "0");
    const name =
      taskItem?.title ??
      (GOAL_ASSEMBLY_PARTS[i]?.name || `Assembly Component #${i + 1}`);

    parts.push({
      id,
      name,
      status: isResolved ? "fitted" : "unbuilt",
      visualTone: isResolved ? "vibrant-animated" : "bleak-wireframe",
    });
  }

  const fittedCount = parts.filter((p) => p.status === "fitted").length;
  return {
    totalParts: taskCount,
    fittedCount,
    parts: Object.freeze(parts),
    isComplete: fittedCount >= taskCount,
  };
}
