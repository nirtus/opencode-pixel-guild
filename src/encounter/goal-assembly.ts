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
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GoalAssemblyPlatformLayout {
  cols: number;
  rows: number;
  sockets: GoalAssemblySocketCoord[];
}

export function computeGoalAssemblyPlatformLayout(
  totalParts: number,
  platformPx: { x: number; y: number; w: number; h: number },
): GoalAssemblyPlatformLayout {
  const count = Math.max(1, totalParts);
  const cols = count <= 4 ? 2 : count <= 9 ? 3 : count <= 16 ? 4 : 5;
  const rows = Math.ceil(count / cols);

  const padX = count > 12 ? 8 : 12;
  const padY = count > 12 ? 8 : 12;
  const availW = Math.max(20, platformPx.w - padX * 2);
  const availH = Math.max(20, platformPx.h - padY * 2);

  const gap = count > 12 ? 4 : 8;
  const socketW = Math.max(12, Math.floor((availW - (cols - 1) * gap) / cols));
  const socketH = Math.max(12, Math.floor((availH - (rows - 1) * gap) / rows));

  const sockets: GoalAssemblySocketCoord[] = [];
  for (let i = 0; i < count; i += 1) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const socketX = platformPx.x + padX + col * (socketW + gap);
    const socketY = platformPx.y + padY + row * (socketH + gap);
    sockets.push({
      partIndex: i,
      x: socketX,
      y: socketY,
      w: socketW,
      h: socketH,
    });
  }

  return {
    cols,
    rows,
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
