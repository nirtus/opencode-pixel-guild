import { resolveProjectHeraldry } from "../spatial/project-heraldry.ts";
import type {
  AssemblyDeliverableKind,
  AssemblyResultDeliverable,
  GoalAssemblyPartState,
  GoalAssemblyState,
  GuildResultsMetrics,
  GuildSnapshot,
} from "../types/domain.ts";
import {
  type GoalAssemblyMilestoneTier,
  resolveGoalAssemblyMilestone,
} from "./goal-assembly.ts";
import {
  type DeriveGuildAssemblyShowcaseOptions,
  deriveProjectMiniAssemblies,
  mapDeliverablesToAssemblyParts,
  type ProjectMiniAssemblyState,
  resolveScopedRoomsAndCharacters,
} from "./project-mini-assemblies.ts";

export type {
  AssemblyDeliverableKind,
  AssemblyResultDeliverable,
  DeriveGuildAssemblyShowcaseOptions,
  GuildResultsMetrics,
};

export interface GuildAssemblyShowcaseState {
  readonly featureSlug: string;
  readonly source: "docs/features" | "subagents" | "session-results" | "working-tree" | "multi-project" | "none";
  readonly sourceLabel: string;
  readonly isMultiProjectScope: boolean;
  readonly projectAssemblies: readonly ProjectMiniAssemblyState[];
  readonly assembly: GoalAssemblyState;
  readonly milestone: GoalAssemblyMilestoneTier;
  readonly deliverables: readonly AssemblyResultDeliverable[];
  readonly modifiedFiles: readonly string[];
  readonly metrics: GuildResultsMetrics;
}

function formatAssemblySourceLabel(params: {
  source: GuildAssemblyShowcaseState["source"];
  featureSlug: string;
  fittedCount: number;
  totalParts: number;
  projectAssemblies: readonly ProjectMiniAssemblyState[];
}): string {
  const { source, featureSlug, fittedCount, totalParts, projectAssemblies } = params;
  if (source === "working-tree") return `🌿 Working Tree (${fittedCount}/${totalParts} staged)`;
  if (source === "docs/features") return `📐 Feature Blueprint: ${featureSlug} (${fittedCount}/${totalParts})`;
  if (source === "subagents") return `📜 Subagent Tasks (${fittedCount}/${totalParts})`;
  if (source === "session-results") return `⚔️ Session Deliverables (${fittedCount}/${totalParts})`;
  if (source === "multi-project") {
    return `🌐 Multi-Project Assembly (${projectAssemblies.length} worlds · ${fittedCount}/${totalParts} parts)`;
  }
  return "✨ Blueprint Ready (0/0)";
}

export function deduplicateAssemblyDeliverables<
  T extends { projectId: string; kind: string; title: string },
>(items: ReadonlyArray<T>): T[] {
  const deduped: T[] = [];
  const seenKeys = new Set<string>();
  for (const item of items) {
    const dedupeKey = `${item.projectId}::${item.kind}::${item.title}`;
    if (!seenKeys.has(dedupeKey)) {
      seenKeys.add(dedupeKey);
      deduped.push(item);
    }
  }
  return deduped;
}

function makeDeliverable(
  params: Omit<AssemblyResultDeliverable, "projectId" | "projectName" | "shortTag" | "crestIcon" | "partyKey">,
  heraldry: ReturnType<typeof resolveProjectHeraldry>,
): AssemblyResultDeliverable {
  return Object.freeze({
    ...params,
    projectId: heraldry.projectId,
    projectName: heraldry.projectName,
    shortTag: heraldry.shortTag,
    crestIcon: heraldry.crestIcon,
    partyKey: heraldry.partyKey,
  });
}

export function deriveGuildAssemblyShowcase(
  snapshot: GuildSnapshot,
  options?: DeriveGuildAssemblyShowcaseOptions,
): GuildAssemblyShowcaseState {
  const { scopedRooms, isMultiProjectScope } = resolveScopedRoomsAndCharacters(snapshot, options);
  const explicitDeliverablesByRoom = new Map<string, AssemblyResultDeliverable[]>();
  const modifiedFilesSet = new Set<string>();

  for (const room of scopedRooms) {
    const prog = room.taskProgress;
    if (!prog || prog.totalTasks <= 0) continue;
    const heraldry = resolveProjectHeraldry(room, snapshot);
    const roomItems: AssemblyResultDeliverable[] = [];
    for (let i = 0; i < prog.totalTasks; i += 1) {
      const t = prog.tasks?.[i];
      const isResolved = t ? t.status === "resolved" : i < prog.resolvedTasks;
      const id = t?.id ?? String(i + 1).padStart(2, "0");
      const title = t?.title ?? `Assembly Component #${i + 1}`;
      const isWorkingTree = prog.featureSlug === "Working Tree Changes";
      const kind: AssemblyDeliverableKind = isWorkingTree
        ? "file-change"
        : prog.source === "subagents"
          ? "subagent"
          : "feature-task";
      if (isWorkingTree && title) modifiedFilesSet.add(title);
      roomItems.push(
        makeDeliverable(
          {
            id,
            kind,
            title,
            subtitle: isWorkingTree
              ? isResolved ? "Staged in Git working tree" : "Modified in Git working tree"
              : `${prog.featureSlug || room.projectName} · ${t?.status || (isResolved ? "resolved" : "open")}`,
            status: isResolved ? "fitted" : "unbuilt",
            roomId: room.roomId,
            timestampMs: room.lastActivityAtMs || snapshot.timestampMs || 0,
          },
          heraldry,
        ),
      );
    }
    explicitDeliverablesByRoom.set(room.roomId, roomItems);
  }

  const allExplicitDeliverables = [...explicitDeliverablesByRoom.values()].flat();

  const projectAssemblies = deriveProjectMiniAssemblies({
    snapshot,
    scopedRooms,
    isMultiProjectScope,
    explicitDeliverablesByRoom,
  });

  let assemblySourceItems: AssemblyResultDeliverable[] = [];
  let featureSlug = "Blueprint Ready";
  let source: GuildAssemblyShowcaseState["source"] = "none";

  if (!isMultiProjectScope && allExplicitDeliverables.length > 0) {
    assemblySourceItems = allExplicitDeliverables;
    const primaryProg = scopedRooms.find((r) => r.taskProgress && r.taskProgress.totalTasks > 0)?.taskProgress;
    featureSlug = primaryProg?.featureSlug || scopedRooms[0]?.projectName || "Active Feature";
    source =
      primaryProg?.featureSlug === "Working Tree Changes"
        ? "working-tree"
        : "docs/features";
  } else if (isMultiProjectScope && allExplicitDeliverables.length > 0) {
    assemblySourceItems = allExplicitDeliverables;
    const totalHostProjects = projectAssemblies.length || new Set(assemblySourceItems.map((d) => d.projectId)).size;
    if (totalHostProjects > 1) {
      featureSlug = `All Guild Worlds (${totalHostProjects} Projects)`;
      source = "multi-project";
    } else {
      const singleRoom = scopedRooms.find((r) => r.taskProgress && r.taskProgress.totalTasks > 0);
      featureSlug = singleRoom?.taskProgress?.featureSlug || assemblySourceItems[0]?.projectName || "Active Feature";
      source =
        singleRoom?.taskProgress?.featureSlug === "Working Tree Changes"
          ? "working-tree"
          : "docs/features";
    }
  } else if (isMultiProjectScope && projectAssemblies.length > 1) {
    featureSlug = `All Guild Worlds (${projectAssemblies.length} Projects)`;
    source = "multi-project";
  }

  const mergedDeliverables = deduplicateAssemblyDeliverables(assemblySourceItems);
  const parts = mapDeliverablesToAssemblyParts(mergedDeliverables);
  const fittedCount = parts.filter((p) => p.status === "fitted").length;
  const totalParts = parts.length;

  const modifiedFiles = Object.freeze([...modifiedFilesSet]);
  const sourceLabel = formatAssemblySourceLabel({
    source,
    featureSlug,
    fittedCount,
    totalParts,
    projectAssemblies,
  });
  return Object.freeze({
    featureSlug,
    source,
    sourceLabel,
    isMultiProjectScope,
    projectAssemblies,
    assembly: Object.freeze({
      totalParts,
      fittedCount,
      parts: Object.freeze(parts),
      isComplete: totalParts > 0 && fittedCount >= totalParts,
    }),
    milestone: resolveGoalAssemblyMilestone(fittedCount, totalParts || 5),
    deliverables: Object.freeze(mergedDeliverables),
    modifiedFiles,
    metrics: Object.freeze({
      completedQuestsCount: fittedCount,
      activeQuestsCount: Math.max(0, totalParts - fittedCount),
      subagentReportsCount: 0,
      filesModifiedCount: modifiedFiles.length,
      issuesFixedCount: 0,
      toolExecutionsCount: 0,
    }),
  });
}
