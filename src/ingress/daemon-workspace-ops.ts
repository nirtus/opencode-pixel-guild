import { normalizeLocationDirectory } from "../state/location-normalization.ts";

export interface DaemonDiscoveredDirectory {
  name: string;
  hostPath: string;
  isGitRepo: boolean;
}

export interface DaemonWorkspaceListResult {
  workspaceRoot: string | null;
  folders: DaemonDiscoveredDirectory[];
}

interface RawFsListEntry {
  path?: string;
  name?: string;
  type?: string;
  isDirectory?: boolean;
}

function joinTargetPath(baseDir: string, childName: string): string {
  const cleanBase = baseDir.trim().replace(/[\\/]+$/, "");
  const sep = cleanBase.includes("\\") ? "\\" : "/";
  return `${cleanBase}${sep}${childName}`;
}

function extractDirEntryName(entry: RawFsListEntry): string | null {
  const raw = (entry.name ?? entry.path ?? "").trim();
  if (!raw) return null;
  const isDir =
    entry.type === "directory" ||
    entry.isDirectory === true ||
    /[\\/]$/.test(raw);
  if (!isDir) return null;
  const stripped = raw.replace(/[\\/]+$/, "");
  const parts = stripped.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? null;
}

export async function resolveDaemonHomeDirectory(
  fetchJson: <T>(path: string, extraHeaders?: Record<string, string>) => Promise<T | null>,
): Promise<string | null> {
  const loc = await fetchJson<{
    directory?: string;
    worktree?: string;
    project?: { canonical?: string; directory?: string };
  }>("/api/location");
  const baseDir = (
    loc?.project?.canonical ??
    loc?.project?.directory ??
    loc?.directory ??
    loc?.worktree ??
    ""
  ).trim();
  if (!baseDir || baseDir === "/") return null;
  const homeMatch = /^((?:[A-Za-z]:[\\/]|\/mnt\/[a-z]\/|\/[a-z]\/|\/)(?:home|Users)[\\/][^\\/]+)/i.exec(baseDir);
  return homeMatch ? homeMatch[1]! : baseDir.replace(/[\\/]+$/, "");
}

export async function expandDaemonTildePath(
  fetchJson: <T>(path: string, extraHeaders?: Record<string, string>) => Promise<T | null>,
  rawPath: string,
): Promise<string> {
  const trimmed = rawPath.trim();
  if (trimmed !== "~" && !trimmed.startsWith("~/") && !trimmed.startsWith("~\\")) {
    return trimmed;
  }
  const homeDir = await resolveDaemonHomeDirectory(fetchJson);
  if (!homeDir) return trimmed;
  if (trimmed === "~") return homeDir;
  const rel = trimmed.slice(2).replace(/^[\\/]+/, "");
  return joinTargetPath(homeDir, homeDir.includes("\\") ? rel.replace(/\//g, "\\") : rel.replace(/\\/g, "/"));
}

export async function probeDaemonDirectory(
  fetchJson: <T>(path: string, extraHeaders?: Record<string, string>) => Promise<T | null>,
  directory: string,
): Promise<{ exists: boolean; isGitRepo: boolean; resolvedDirectory?: string }> {
  const expanded = await expandDaemonTildePath(fetchJson, directory);
  const trimmed = expanded.trim();
  if (!trimmed || trimmed === "/") {
    return { exists: false, isGitRepo: false };
  }
  const entries = await fetchJson<RawFsListEntry[]>(
    `/api/fs/list?path=${encodeURIComponent(trimmed)}`,
  );
  if (!Array.isArray(entries)) {
    return { exists: false, isGitRepo: false };
  }
  const hasInlineGit = entries.some((e) => {
    const raw = (e?.name ?? e?.path ?? "").trim().replace(/[\\/]+$/, "");
    return raw === ".git" || raw.endsWith("/.git") || raw.endsWith("\\.git");
  });
  if (hasInlineGit) {
    return { exists: true, isGitRepo: true, resolvedDirectory: trimmed };
  }
  const gitEntries = await fetchJson<RawFsListEntry[]>(
    `/api/fs/list?path=${encodeURIComponent(joinTargetPath(trimmed, ".git"))}`,
  );
  return {
    exists: true,
    isGitRepo: Array.isArray(gitEntries),
    resolvedDirectory: trimmed,
  };
}

export async function resolveDaemonDefaultWorkspaceRoot(
  fetchJson: <T>(path: string, extraHeaders?: Record<string, string>) => Promise<T | null>,
): Promise<string | null> {
  const loc = await fetchJson<{
    directory?: string;
    worktree?: string;
    project?: { canonical?: string; directory?: string };
  }>("/api/location");
  const baseDir = (
    loc?.project?.canonical ??
    loc?.project?.directory ??
    loc?.directory ??
    loc?.worktree ??
    ""
  ).trim();
  if (!baseDir || baseDir === "/") return null;

  const norm = normalizeLocationDirectory(baseDir);
  const isHomeDir = /^\/(?:home|Users|[a-z]\/Users)\/[^/]+$/i.test(norm);
  if (!isHomeDir) {
    const clean = baseDir.replace(/[\\/]+$/, "");
    const lastSep = Math.max(clean.lastIndexOf("/"), clean.lastIndexOf("\\"));
    if (lastSep > 0) {
      const parent = clean.slice(0, lastSep);
      if (!/^[A-Za-z]:$/.test(parent)) return parent;
    }
    return clean;
  }

  for (const candidateRel of [
    "Documents/Development",
    "projects",
    "Development",
    "workspace",
    "repos",
  ]) {
    const candidatePath = baseDir.includes("\\")
      ? joinTargetPath(baseDir, candidateRel.replace(/\//g, "\\"))
      : joinTargetPath(baseDir, candidateRel);
    const probe = await fetchJson<RawFsListEntry[]>(
      `/api/fs/list?path=${encodeURIComponent(candidatePath)}`,
    );
    if (Array.isArray(probe)) {
      return candidatePath;
    }
  }
  return baseDir;
}

export async function listDaemonWorkspaceDirectories(
  fetchJson: <T>(path: string, extraHeaders?: Record<string, string>) => Promise<T | null>,
  parentDirectory?: string,
): Promise<DaemonWorkspaceListResult> {
  const expandedParent = parentDirectory?.trim()
    ? await expandDaemonTildePath(fetchJson, parentDirectory.trim())
    : undefined;
  const targetRoot =
    expandedParent || (await resolveDaemonDefaultWorkspaceRoot(fetchJson));
  if (!targetRoot) {
    return { workspaceRoot: null, folders: [] };
  }

  const entries = await fetchJson<RawFsListEntry[]>(
    `/api/fs/list?path=${encodeURIComponent(targetRoot)}`,
  );
  if (!Array.isArray(entries)) {
    return { workspaceRoot: targetRoot, folders: [] };
  }

  const dirNames = new Set<string>();
  for (const entry of entries) {
    const name = extractDirEntryName(entry);
    if (!name) continue;
    if (name.startsWith(".") || name === "node_modules" || name === ".worktrees") {
      continue;
    }
    dirNames.add(name);
  }

  const sortedNames = [...dirNames].sort((a, b) => a.localeCompare(b));
  const folders = await Promise.all(
    sortedNames.map(async (name): Promise<DaemonDiscoveredDirectory> => {
      const hostPath = joinTargetPath(targetRoot, name);
      const gitEntries = await fetchJson<RawFsListEntry[]>(
        `/api/fs/list?path=${encodeURIComponent(joinTargetPath(hostPath, ".git"))}`,
      );
      return {
        name,
        hostPath,
        isGitRepo: Array.isArray(gitEntries),
      };
    }),
  );

  return {
    workspaceRoot: targetRoot,
    folders,
  };
}
