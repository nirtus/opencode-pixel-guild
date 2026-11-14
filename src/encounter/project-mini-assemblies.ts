import {
  listHostProjectHeraldries,
  type ProjectHeraldryDescriptor,
  resolveProjectHeraldry,
} from "../spatial/project-heraldry.ts";
import {
  resolveWorldFocusScope,
  type WorldFocusOptions,
  type WorldFocusScope,
} from "../spatial/world-focus-scope.ts";
import type {
  AssemblyResultDeliverable,
  GoalAssemblyPartState,
  GuildSnapshot,
  WorkshopRoomState,
} from "../types/domain.ts";
import { deduplicateAssemblyDeliverables } from "./assembly-results.ts";
import {
  type GoalAssemblyMilestoneTier,
  resolveGoalAssemblyMilestone,
} from "./goal-assembly.ts";

export type DeriveGuildAssemblyShowcaseOptions = WorldFocusOptions;

export type ProjectMiniAssemblyStatus = "complete" | "in-progress" | "open" | "blueprint-ready";
export type ProjectMiniAssemblySource = "docs/features" | "subagents" | "session-results" | "working-tree" | "none";

export interface ProjectMiniAssemblyState {
  readonly projectId: string;
  readonly roomId: string;
  readonly projectName: string;
  readonly shortTag: string;
  readonly crestIcon: string;
  readonly partyKey: string;
  readonly primaryHex: string;
  readonly secondaryHex: string;
  readonly accentHex: string;
  readonly featureSlug: string;
  readonly source: ProjectMiniAssemblySource;
  readonly status: ProjectMiniAssemblyStatus;
  readonly statusLabel: string;
  readonly fittedCount: number;
  readonly totalParts: number;
  readonly completionRatio: number;
  readonly percentComplete: number;
  readonly isComplete: boolean;
  readonly milestone: GoalAssemblyMilestoneTier;
  readonly parts: readonly GoalAssemblyPartState[];
}

export interface ProjectMiniAssemblyBaySpec {
  readonly bayIndex: number;
  readonly projectId: string;
  readonly roomId: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface MultiProjectAssemblyPlatformLayout {
  readonly cols: number;
  readonly rows: number;
  readonly bays: readonly ProjectMiniAssemblyBaySpec[];
}

export function resolveScopedRoomsAndCharacters(
  snapshot: GuildSnapshot,
  options?: DeriveGuildAssemblyShowcaseOptions,
): WorldFocusScope {
  return resolveWorldFocusScope(snapshot, options);
}

export function mapDeliverablesToAssemblyParts(
  items: readonly AssemblyResultDeliverable[],
): GoalAssemblyPartState[] {
  return items.map((item, idx) =>
    Object.freeze({
      id: item.kind === "feature-task" ? item.id : String(idx + 1).padStart(2, "0"),
      name: item.title,
      status: item.status,
      visualTone: item.status === "fitted" ? "vibrant-animated" : "bleak-wireframe",
      shortTag: item.shortTag,
      crestIcon: item.crestIcon,
      partyKey: item.partyKey,
      kind: item.kind,
      subtitle: item.subtitle,
    }),
  );
}

export function classifyProjectMiniAssemblyStatus(
  fittedCount: number,
  totalParts: number,
): { status: ProjectMiniAssemblyStatus; statusLabel: string } {
  if (totalParts <= 0) return { status: "blueprint-ready", statusLabel: "✨ READY" };
  if (fittedCount >= totalParts) return { status: "complete", statusLabel: "★ COMPLETE" };
  if (fittedCount > 0) return { status: "in-progress", statusLabel: "⚙️ IN PROGRESS" };
  return { status: "open", statusLabel: "📐 OPEN" };
}

export function deriveProjectMiniAssemblies(params: {
  snapshot: GuildSnapshot;
  scopedRooms: readonly WorkshopRoomState[];
  isMultiProjectScope: boolean;
  explicitDeliverablesByRoom: ReadonlyMap<string, readonly AssemblyResultDeliverable[]>;
}): readonly ProjectMiniAssemblyState[] {
  const {
    snapshot,
    scopedRooms,
    isMultiProjectScope,
    explicitDeliverablesByRoom,
  } = params;

  const canonicalHeraldries = new Map<string, ProjectHeraldryDescriptor>();

  if (isMultiProjectScope) {
    for (const h of listHostProjectHeraldries(snapshot)) {
      canonicalHeraldries.set(h.projectId.toLowerCase(), h);
    }
  }

  for (const room of scopedRooms) {
    const h = resolveProjectHeraldry(room, snapshot);
    const key = h.projectId.toLowerCase();
    if (!canonicalHeraldries.has(key) || !room.isWorktree) {
      canonicalHeraldries.set(key, h);
    }
  }

  const results: ProjectMiniAssemblyState[] = [];

  for (const [projKey, heraldry] of canonicalHeraldries.entries()) {
    const projectRooms = scopedRooms.filter(
      (r) => resolveProjectHeraldry(r, snapshot).projectId.toLowerCase() === projKey,
    );
    const primaryRoom = projectRooms.find((r) => !r.isWorktree) ?? projectRooms[0];
    const primaryRoomId = primaryRoom?.roomId ?? heraldry.projectId;

    const rawExplicitItems: AssemblyResultDeliverable[] = [];
    for (const r of projectRooms) {
      const items = explicitDeliverablesByRoom.get(r.roomId);
      if (items && items.length > 0) {
        rawExplicitItems.push(...items);
      }
    }
    const explicitItems = deduplicateAssemblyDeliverables(rawExplicitItems);

    const sourceItems = explicitItems;

    let featureSlug = "Blueprint Ready";
    let source: ProjectMiniAssemblySource = "none";

    if (explicitItems.length > 0) {
      const roomWithProg = projectRooms.find((r) => r.taskProgress && r.taskProgress.totalTasks > 0);
      const prog = roomWithProg?.taskProgress;
      featureSlug = prog?.featureSlug || heraldry.projectName || "Active Feature";
      source =
        prog?.featureSlug === "Working Tree Changes"
          ? "working-tree"
          : "docs/features";
    }

    const parts = mapDeliverablesToAssemblyParts(sourceItems);

    const totalParts = parts.length;
    const fittedCount = parts.filter((p) => p.status === "fitted").length;
    const completionRatio = totalParts > 0 ? Math.max(0, Math.min(1, fittedCount / totalParts)) : 0;
    const percentComplete = totalParts > 0 ? Math.round(completionRatio * 100) : 0;
    const isComplete = totalParts > 0 && fittedCount >= totalParts;
    const { status, statusLabel } = classifyProjectMiniAssemblyStatus(fittedCount, totalParts);

    results.push(
      Object.freeze({
        projectId: heraldry.projectId,
        roomId: primaryRoomId,
        projectName: heraldry.projectName,
        shortTag: heraldry.shortTag,
        crestIcon: heraldry.crestIcon,
        partyKey: heraldry.partyKey,
        primaryHex: heraldry.primaryHex,
        secondaryHex: heraldry.secondaryHex,
        accentHex: heraldry.accentHex,
        featureSlug,
        source,
        status,
        statusLabel,
        fittedCount,
        totalParts,
        completionRatio,
        percentComplete,
        isComplete,
        milestone: resolveGoalAssemblyMilestone(fittedCount, totalParts || 5),
        parts: Object.freeze(parts),
      }),
    );
  }

  return Object.freeze(results);
}

export function computeMultiProjectAssemblyPlatformLayout(
  projectAssemblies: ReadonlyArray<{ readonly projectId: string; readonly roomId?: string }>,
  platformPx: { readonly x: number; readonly y: number; readonly w: number; readonly h: number },
): MultiProjectAssemblyPlatformLayout {
  const count = projectAssemblies.length;
  if (count === 0) return Object.freeze({ cols: 1, rows: 1, bays: Object.freeze([]) });

  const cols = count === 1 ? 1 : count === 2 ? 2 : count === 3 ? 3 : count === 4 ? 2 : count <= 6 ? 3 : 4;
  const rows = Math.ceil(count / cols);
  const padX = 6;
  const padY = 6;
  const gapX = 6;
  const gapY = 6;
  const availW = Math.max(24, platformPx.w - padX * 2);
  const availH = Math.max(24, platformPx.h - padY * 2);
  const bayW = Math.max(18, Math.floor((availW - (cols - 1) * gapX) / cols));
  const bayH = Math.max(18, Math.floor((availH - (rows - 1) * gapY) / rows));

  const bays: ProjectMiniAssemblyBaySpec[] = [];
  for (let i = 0; i < count; i += 1) {
    const proj = projectAssemblies[i]!;
    const col = i % cols;
    const row = Math.floor(i / cols);
    const itemsInRow = row === rows - 1 ? count - row * cols : cols;
    const rowTotalW = itemsInRow * bayW + Math.max(0, itemsInRow - 1) * gapX;
    const rowStartX = platformPx.x + padX + Math.max(0, Math.floor((availW - rowTotalW) / 2));

    bays.push(
      Object.freeze({
        bayIndex: i,
        projectId: proj.projectId,
        roomId: proj.roomId ?? proj.projectId,
        x: rowStartX + col * (bayW + gapX),
        y: platformPx.y + padY + row * (bayH + gapY),
        w: bayW,
        h: bayH,
      }),
    );
  }

  return Object.freeze({ cols, rows, bays: Object.freeze(bays) });
}
