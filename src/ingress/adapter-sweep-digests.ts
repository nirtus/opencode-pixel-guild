import type { ProjectTaskProgress } from "../types/domain.ts";
import type { OpenCodeDaemonLocationPayload } from "./daemon-types.ts";

export function computeCatalogHydrationDigest(
  state: Pick<OpenCodeDaemonLocationPayload, "skills" | "plugins" | "agents" | "models" | "defaultModelId">,
): string {
  const skills = (state.skills ?? [])
    .map((s) => `${s.id}:${s.name ?? ""}:${s.description ?? ""}`)
    .sort()
    .join(",");
  const plugins = (state.plugins ?? [])
    .map(
      (p) =>
        `${p.namespace}:${p.name ?? ""}:${p.status ?? ""}:${p.toolCount ?? 0}:${p.statusMessage ?? ""}`,
    )
    .sort()
    .join(",");
  const agents = (state.agents ?? [])
    .map(
      (a) =>
        `${a.id}:${a.name ?? ""}:${a.color ?? ""}:${a.mode ?? ""}:${a.hidden ? 1 : 0}:${a.disabled ? 1 : 0}:${a.description ?? ""}`,
    )
    .sort()
    .join(",");
  const models = (state.models ?? [])
    .map(
      (m) =>
        `${m.id}:${m.providerId ?? ""}:${m.providerName ?? ""}:${m.name ?? ""}:${m.type ?? ""}:${m.disabled ? 1 : 0}:${(m.variants ?? []).join("/")}:${m.limitContext}:${m.limitOutput ?? 0}`,
    )
    .sort()
    .join(",");
  return `s[${skills}]|p[${plugins}]|a[${agents}]|m[${models}]|d[${state.defaultModelId ?? ""}]`;
}

export function computeTaskProgressDigest(
  taskProgress: ProjectTaskProgress,
  isLocalGit: boolean,
): string {
  const taskItems = (taskProgress.tasks ?? [])
    .map((t) => `${t.id}:${t.slug}:${t.status}:${t.title}`)
    .join("|");
  return `${isLocalGit ? "git" : "nogit"}:${taskProgress.source}:${taskProgress.featureSlug ?? ""}:${taskProgress.resolvedTasks}/${taskProgress.totalTasks}:${taskItems}`;
}

export interface SweepDigestTracker {
  shouldEmitCatalog(
    dir: string,
    state: Pick<OpenCodeDaemonLocationPayload, "skills" | "plugins" | "agents" | "models" | "defaultModelId">,
    isReconnect: boolean,
  ): boolean;
  shouldEmitTaskProgress(
    dir: string,
    nextProg: ProjectTaskProgress,
    prevSnapProg: ProjectTaskProgress | undefined,
    isLocalGit: boolean,
    isReconnect: boolean,
  ): boolean;
  recordTaskProgress(dir: string, prog: ProjectTaskProgress, isLocalGit: boolean): void;
  evictDir(dir: string): void;
  clear(): void;
}

export function createSweepDigestTracker(): SweepDigestTracker {
  const lastCatalogByDir = new Map<string, string>();
  const lastTaskByDir = new Map<string, string>();

  return {
    shouldEmitCatalog(dir, state, isReconnect) {
      const digest = computeCatalogHydrationDigest(state);
      if (!isReconnect && lastCatalogByDir.get(dir) === digest) return false;
      lastCatalogByDir.set(dir, digest);
      return true;
    },
    shouldEmitTaskProgress(dir, nextProg, prevSnapProg, isLocalGit, isReconnect) {
      const digest = computeTaskProgressDigest(nextProg, isLocalGit);
      const prevMatches =
        !isLocalGit || (prevSnapProg !== undefined && computeTaskProgressDigest(prevSnapProg, isLocalGit) === digest);
      if (!isReconnect && lastTaskByDir.get(dir) === digest && prevMatches) return false;
      lastTaskByDir.set(dir, digest);
      return true;
    },
    recordTaskProgress(dir, prog, isLocalGit) {
      lastTaskByDir.set(dir, computeTaskProgressDigest(prog, isLocalGit));
    },
    evictDir(dir) {
      lastCatalogByDir.delete(dir);
      lastTaskByDir.delete(dir);
      for (const k of lastCatalogByDir.keys()) {
        if (k.startsWith(`${dir}/.worktrees/`) || k.startsWith(`${dir}/worktree/`)) lastCatalogByDir.delete(k);
      }
      for (const k of lastTaskByDir.keys()) {
        if (k.startsWith(`${dir}/.worktrees/`) || k.startsWith(`${dir}/worktree/`)) lastTaskByDir.delete(k);
      }
    },
    clear() {
      lastCatalogByDir.clear();
      lastTaskByDir.clear();
    },
  };
}
