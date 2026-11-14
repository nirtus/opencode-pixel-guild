import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { normalizeLocationDirectory, resolveLocalProjectDir } from "../state/location-normalization.ts";
import type { ProjectTaskItem, ProjectTaskProgress } from "../types/domain.ts";
import { runGit } from "./git-status-scanner.ts";
import { scanGitStatusSync } from "./git-working-tree.ts";

export const BLUEPRINT_READY_TASK_PROGRESS: ProjectTaskProgress = Object.freeze({
  source: "none",
  featureSlug: "Blueprint Ready",
  totalTasks: 0,
  resolvedTasks: 0,
  tasks: Object.freeze([]),
});

const retiredFeatureSlugs = new Set<string>();
const taskProgressCache = new Map<string, { atMs: number; value: ProjectTaskProgress }>();

export function invalidateTaskProgressCache(projectDir?: string): void {
  if (!projectDir) {
    taskProgressCache.clear();
    return;
  }
  const prefixes = new Set<string>([
    `${projectDir}::`,
    `${normalizeLocationDirectory(projectDir)}::`,
  ]);
  const resolved = resolveLocalProjectDir(projectDir, existsSync);
  if (resolved) {
    prefixes.add(`${resolved}::`);
    prefixes.add(`${normalizeLocationDirectory(resolved)}::`);
  }
  for (const key of taskProgressCache.keys()) {
    for (const prefix of prefixes) {
      if (key.startsWith(prefix)) {
        taskProgressCache.delete(key);
        break;
      }
    }
  }
}

export function retireCompletedFeatureSlug(featureSlug: string | null | undefined): void {
  if (featureSlug && featureSlug.trim()) {
    retiredFeatureSlugs.add(featureSlug.trim());
    taskProgressCache.clear();
  }
}

function getRelevantGitFiles<T extends { path: string }>(
  gitState: { files?: ReadonlyArray<T> },
): T[] {
  return (gitState.files ?? []).filter(
    (f) => !f.path.startsWith("docs/images/") && !f.path.endsWith(".png"),
  );
}

function getDirtyFeatureFiles<T extends { path: string }>(
  featureSlug: string,
  gitState: { files?: ReadonlyArray<T> },
): T[] {
  const prefix = `docs/features/${featureSlug}`;
  return (gitState.files ?? []).filter(
    (f) =>
      f.path === "docs" ||
      f.path === "docs/" ||
      f.path === "docs/features" ||
      f.path === "docs/features/" ||
      f.path === prefix ||
      f.path.startsWith(`${prefix}/`),
  );
}

function hasDirtyFeatureFiles(
  featureSlug: string,
  gitState: {
    isGitRepo: boolean;
    files: ReadonlyArray<{ path: string }>;
  },
): boolean {
  return getDirtyFeatureFiles(featureSlug, gitState).length > 0;
}

function isCompletedFeatureCommittedInGit(
  projectDir: string,
  featureSlug: string | null | undefined,
  explicitGitState?: {
    isGitRepo: boolean;
    files: ReadonlyArray<{ path: string; staged: boolean; indexStatus?: string; worktreeStatus?: string }>;
  },
): boolean {
  if (!featureSlug) return false;
  const gitStatus = explicitGitState ?? scanGitStatusSync(projectDir, 60_000);
  if (!gitStatus.isGitRepo) return false;
  const prefix = `docs/features/${featureSlug}`;
  const issuesPrefix = `${prefix}/issues/`;
  const dirtyFeatureFiles = getDirtyFeatureFiles(featureSlug, gitStatus);
  if (dirtyFeatureFiles.length === 0) return true;
  if (
    dirtyFeatureFiles.some(
      (f) =>
        f.path === "docs" ||
        f.path === "docs/" ||
        f.path === "docs/features" ||
        f.path === "docs/features/" ||
        f.path === prefix ||
        f.path === `${prefix}/` ||
        f.path === `${prefix}/issues` ||
        f.path === issuesPrefix ||
        (f.path.startsWith(issuesPrefix) &&
          (f.indexStatus === "?" || f.indexStatus === "A" || f.worktreeStatus === "?")),
    )
  ) {
    return false;
  }
  const resolvedDir = resolveLocalProjectDir(projectDir, existsSync);
  if (!resolvedDir) return false;
  const dirtyIssueFiles = dirtyFeatureFiles.filter((f) => f.path.startsWith(issuesPrefix));
  if (dirtyIssueFiles.length === 0) {
    try {
      runGit(resolvedDir, ["--no-optional-locks", "rev-parse", "--verify", `HEAD:${prefix}/issues`], 3000);
      return true;
    } catch {
      return false;
    }
  }
  for (const issueFile of dirtyIssueFiles) {
    try {
      const headContent = runGit(resolvedDir, ["--no-optional-locks", "show", `HEAD:${issueFile.path}`], 3000);
      if (!/^(?:\*\*)?Status:?(?:\*\*)?:?\s*(?:\*\*)?`?resolved`?/im.test(headContent)) {
        return false;
      }
    } catch {
      return false;
    }
  }
  return true;
}

export function deriveWorkingTreeTaskProgressFromGitState(gitState: {
  isGitRepo: boolean;
  files: ReadonlyArray<{ path: string; staged: boolean }>;
}): ProjectTaskProgress {
  const relevantGitFiles = getRelevantGitFiles(gitState);
  if (gitState.isGitRepo && relevantGitFiles.length > 0) {
    const tasks: ProjectTaskItem[] = relevantGitFiles.map((f, idx) => ({
      id: String(idx + 1).padStart(2, "0"),
      slug: f.path,
      title: f.path,
      status: f.staged ? ("resolved" as const) : ("claimed" as const),
    }));
    return {
      source: "none",
      featureSlug: "Working Tree Changes",
      totalTasks: tasks.length,
      resolvedTasks: tasks.filter((t) => t.status === "resolved").length,
      tasks: Object.freeze(tasks),
    };
  }
  return BLUEPRINT_READY_TASK_PROGRESS;
}

export function deriveRoomTaskProgressForGitState(
  projectDir: string,
  gitState: {
    isGitRepo: boolean;
    files: ReadonlyArray<{ path: string; staged: boolean }>;
  },
): ProjectTaskProgress {
  invalidateTaskProgressCache(projectDir);
  if (gitState.isGitRepo && getRelevantGitFiles(gitState).length === 0) {
    return BLUEPRINT_READY_TASK_PROGRESS;
  }
  const fromTracker = scanProjectIssueTracker(projectDir, gitState);
  if (fromTracker && (!fromTracker.featureSlug || !retiredFeatureSlugs.has(fromTracker.featureSlug))) {
    return fromTracker;
  }
  return deriveWorkingTreeTaskProgressFromGitState(gitState);
}

export function scanProjectIssueTracker(
  projectDir: string,
  explicitGitState?: {
    isGitRepo: boolean;
    files: ReadonlyArray<{ path: string; staged: boolean }>;
  },
): ProjectTaskProgress | null {
  try {
    const resolvedDir = resolveLocalProjectDir(projectDir, existsSync);
    if (!resolvedDir) {
      return null;
    }

    const gitStatus = explicitGitState ?? scanGitStatusSync(projectDir, 60_000);
    if (gitStatus.isGitRepo) {
      const relevant = getRelevantGitFiles(gitStatus);
      if (relevant.length === 0) return null;
      if (!relevant.some((f) => f.path.replace(/\\/g, "/").startsWith("docs/features/"))) {
        return null;
      }
    }

    const featuresDir = join(resolvedDir, "docs", "features");
    if (!existsSync(featuresDir) || !statSync(featuresDir).isDirectory()) {
      return null;
    }

    const entries = readdirSync(featuresDir);
    let bestProgress: { progress: ProjectTaskProgress; isOpen: boolean; mtimeMs: number } | null = null;

    for (const entry of entries) {
      if (retiredFeatureSlugs.has(entry)) continue;
      if (gitStatus.isGitRepo && !hasDirtyFeatureFiles(entry, gitStatus)) continue;
      const featurePath = join(featuresDir, entry);
      try {
        const featStat = statSync(featurePath);
        if (!featStat.isDirectory()) continue;
        const issuesDir = join(featurePath, "issues");
        if (!existsSync(issuesDir)) continue;
        const issuesStat = statSync(issuesDir);
        if (!issuesStat.isDirectory()) continue;

        let mtimeMs = Math.max(featStat.mtimeMs, issuesStat.mtimeMs);
        for (const metaFile of ["map.md", "spec.md"]) {
          const metaPath = join(featurePath, metaFile);
          if (existsSync(metaPath)) mtimeMs = Math.max(mtimeMs, statSync(metaPath).mtimeMs);
        }

        const issueFiles = readdirSync(issuesDir)
          .filter((file: string) => file.endsWith(".md"))
          .sort((a: string, b: string) => a.localeCompare(b, undefined, { numeric: true }));
        if (issueFiles.length === 0) continue;

        const tasks: ProjectTaskItem[] = [];
        for (const file of issueFiles) {
          const fullPath = join(issuesDir, file);
          try {
            mtimeMs = Math.max(mtimeMs, statSync(fullPath).mtimeMs);
            const content = readFileSync(fullPath, "utf8");
            const base = basename(file, ".md");
            const idMatch = base.match(/^(\d+)/);
            const id = idMatch ? idMatch[1] : base;
            const titleMatch = content.match(/^#\s+(.+)$/m);
            const title = titleMatch ? titleMatch[1].trim() : base;
            const statusMatch = content.match(/^(?:\*\*)?Status:?(?:\*\*)?:?\s*(?:\*\*)?`?(open|claimed|resolved)`?/im);
            const status = (statusMatch ? statusMatch[1].toLowerCase() : "open") as "open" | "claimed" | "resolved";
            tasks.push({ id, slug: base, title, status });
          } catch { /* Skip unreadable issue */ }
        }
        if (tasks.length === 0) continue;

        const resolvedTasks = tasks.filter((t) => t.status === "resolved").length;
        const isOpen = resolvedTasks < tasks.length;
        if (gitStatus.isGitRepo && !isOpen && isCompletedFeatureCommittedInGit(projectDir, entry, gitStatus)) {
          continue;
        }
        const progress: ProjectTaskProgress = {
          source: "docs/features",
          featureSlug: entry,
          totalTasks: tasks.length,
          resolvedTasks,
          tasks: Object.freeze(tasks),
        };
        if (
          !bestProgress ||
          (isOpen && !bestProgress.isOpen) ||
          (isOpen === bestProgress.isOpen && mtimeMs > bestProgress.mtimeMs)
        ) {
          bestProgress = { progress, isOpen, mtimeMs };
        }
      } catch {
        // Skip unreadable candidate
      }
    }

    return bestProgress ? bestProgress.progress : null;
  } catch {
    return null;
  }
}

export function deriveProjectTaskProgress(
  projectDir: string,
): ProjectTaskProgress {
  const normDir = normalizeLocationDirectory(projectDir);
  const cacheKey = `${normDir}::direct`;
  const cached = taskProgressCache.get(cacheKey);
  if (cached && Date.now() - cached.atMs < 30_000) {
    return cached.value;
  }
  const computed = computeProjectTaskProgress(projectDir);
  taskProgressCache.set(cacheKey, { atMs: Date.now(), value: computed });
  return computed;
}

function computeProjectTaskProgress(projectDir: string): ProjectTaskProgress {
  const gitStatus = scanGitStatusSync(projectDir, 60_000);
  if (gitStatus.isGitRepo) {
    return deriveRoomTaskProgressForGitState(projectDir, gitStatus);
  }
  const fromTracker = scanProjectIssueTracker(projectDir, gitStatus);
  if (fromTracker && (!fromTracker.featureSlug || !retiredFeatureSlugs.has(fromTracker.featureSlug))) {
    return fromTracker;
  }
  return BLUEPRINT_READY_TASK_PROGRESS;
}
