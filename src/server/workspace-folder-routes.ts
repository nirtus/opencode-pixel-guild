import { existsSync, readdirSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { deriveProjectTaskProgress, type OpenCodeDaemonClientPort } from "../ingress/index.ts";
import {
  deriveProjectName, isDeletedHostDirectory, normalizeLocationDirectory,
  resolveLocalProjectDir, toPosixMountPath,
} from "../state/index.ts";
import { type GuildApiRouterContext, readJsonBody, sendJson } from "./api-router.ts";

export interface WorkspaceFolderEntry {
  name: string;
  hostPath: string;
  normalizedPath: string;
  isGitRepo: boolean;
  alreadyAdded: boolean;
}

function isUsableProjectDirectoryCandidate(cleanDir: string): boolean {
  if (!cleanDir || cleanDir === "/") return false;
  if (cleanDir === "/workspaces" || cleanDir.startsWith("/workspaces/")) return false;
  if (
    cleanDir.includes("/.worktrees/") ||
    cleanDir.includes("/worktree/") ||
    cleanDir.includes("/.local/share/opencode/worktree/")
  ) {
    return false;
  }
  if (/^(?:[A-Za-z]:|\/mnt\/[a-z]|\/[a-z])?\/(?:home|Users)\/[^/]+$/i.test(cleanDir)) {
    return false;
  }
  return cleanDir.lastIndexOf("/") > 0;
}

export async function inferHostWorkspaceParentPrefix(ctx: GuildApiRouterContext): Promise<string | null> {
  const rawCandidates: string[] = [];
  const fullDaemon = ctx.daemonClient as OpenCodeDaemonClientPort | undefined;
  if (fullDaemon?.getProjects) {
    try {
      for (const proj of (await fullDaemon.getProjects()) ?? []) {
        if (proj?.directory) rawCandidates.push(proj.directory);
      }
    } catch { /* Ignore daemon discovery errors */ }
  }
  if (rawCandidates.length === 0 && fullDaemon?.getLocations) {
    try {
      for (const loc of (await fullDaemon.getLocations()) ?? []) {
        if (loc?.directory) rawCandidates.push(loc.directory);
      }
    } catch { /* Ignore daemon discovery errors */ }
  }

  const snap = ctx.getReducer().getSnapshot();
  for (const room of Object.values(snap.rooms ?? {})) {
    const dir = room.locationDirectory || room.roomId;
    if (dir) rawCandidates.push(toPosixMountPath(dir));
  }

  const repoBaseName = basename(process.cwd()).toLowerCase();
  let fallbackParent: string | null = null;
  for (const candidate of rawCandidates) {
    const clean = candidate.trim().replace(/\\/g, "/").replace(/\/+$/, "");
    if (!isUsableProjectDirectoryCandidate(clean)) continue;
    const slashIdx = clean.lastIndexOf("/");
    if (slashIdx <= 0) continue;
    const parent = clean.slice(0, slashIdx);
    const leaf = clean.slice(slashIdx + 1).toLowerCase();
    if (leaf === "opencode-game-visualizer" || leaf === repoBaseName) return parent;
    fallbackParent ??= parent;
  }
  return fallbackParent;
}

function alignPathWithHostPrefixFormat(rawPath: string, hostParentPrefix: string | null): string {
  const clean = rawPath.trim().replace(/\\/g, "/").replace(/\/+$/, "");
  if (!clean) return "/";
  if (!hostParentPrefix) return clean;
  if (/^[A-Za-z]:\//.test(hostParentPrefix)) {
    const m = /^\/([a-z])\/(.*)$/i.exec(normalizeLocationDirectory(clean));
    if (m) return `${m[1].toUpperCase()}:/${m[2]}`;
  } else if (/^\/mnt\/[a-z]\//i.test(hostParentPrefix)) {
    return toPosixMountPath(clean);
  }
  return clean;
}

export function resolveRequestedWorldDirectory(
  rawInput: string,
  hostParentPrefix: string | null,
): { rawDirectory: string; normDirectory: string; localDir: string | null } {
  const trimmed = rawInput.trim().replace(/\\/g, "/").replace(/\/+$/, "");
  if (!trimmed || trimmed === "/") return { rawDirectory: "/", normDirectory: "/", localDir: null };

  const cleanPrefix = hostParentPrefix ? hostParentPrefix.trim().replace(/\\/g, "/").replace(/\/+$/, "") : null;
  const fallbackLocalRoot = existsSync("/workspaces") ? "/workspaces" : dirname(process.cwd()).replace(/\\/g, "/");

  let rawDirectory: string;
  if (trimmed === "/workspaces") {
    rawDirectory = cleanPrefix ?? fallbackLocalRoot;
  } else if (trimmed.startsWith("/workspaces/")) {
    const rel = trimmed.slice("/workspaces/".length).replace(/^\/+/, "");
    rawDirectory = cleanPrefix ? `${cleanPrefix}/${rel}` : `${fallbackLocalRoot}/${rel}`;
  } else if (!trimmed.includes("/") && !/^[A-Za-z]:/.test(trimmed)) {
    rawDirectory = cleanPrefix ? `${cleanPrefix}/${trimmed}` : `${fallbackLocalRoot}/${trimmed}`;
  } else {
    rawDirectory = alignPathWithHostPrefixFormat(trimmed, cleanPrefix);
  }

  const normDirectory = normalizeLocationDirectory(rawDirectory);
  const localDir =
    resolveLocalProjectDir(rawDirectory, existsSync) ??
    (trimmed.startsWith("/workspaces/") && existsSync(trimmed) ? trimmed : null);
  return { rawDirectory, normDirectory, localDir };
}

function isAllowedWorkspaceParent(requestedParent: string, defaultLocalRoot: string): boolean {
  if (/(?:^|[\\/])\.\.(?:[\\/]|$)/.test(requestedParent)) return false;
  const resolvedParent = resolve(requestedParent);
  const resolvedDefaultRoot = resolve(defaultLocalRoot);
  const resolvedCwd = resolve(process.cwd());
  const resolvedDataDir = resolve(resolvedCwd, "data");
  if (resolvedParent === resolvedDataDir || resolvedParent.startsWith(resolvedDataDir + sep)) return false;
  const normalizedPosix = resolvedParent.replace(/\\/g, "/");
  if (normalizedPosix === "/" || /^\/(?:etc|proc|sys|root|var|usr|bin|sbin|dev|run)(?:\/|$)/i.test(normalizedPosix)) {
    return false;
  }
  const isInsideDefaultRoot = resolvedParent === resolvedDefaultRoot || resolvedParent.startsWith(resolvedDefaultRoot + sep);
  const isInsideCwd = resolvedParent === resolvedCwd || resolvedParent.startsWith(resolvedCwd + sep);
  return isInsideDefaultRoot || isInsideCwd;
}

export async function handleGetWorkspaceFoldersRoute(
  _req: IncomingMessage,
  res: ServerResponse,
  urlObj: URL,
  ctx: GuildApiRouterContext,
): Promise<void> {
  const requestedParent = urlObj.searchParams.get("parent")?.trim();
  const defaultLocalRoot = existsSync("/workspaces") ? "/workspaces" : dirname(process.cwd());
  if (requestedParent && !isAllowedWorkspaceParent(requestedParent, defaultLocalRoot)) {
    sendJson(res, 400, {
      ok: false,
      error: "Requested parent directory is outside the allowed workspace root",
      folders: [],
    });
    return;
  }
  const hostParentPrefix = await inferHostWorkspaceParentPrefix(ctx);
  const resolvedDefaultRoot = resolve(defaultLocalRoot);
  const scanRoot = requestedParent && existsSync(requestedParent) ? resolve(requestedParent) : resolvedDefaultRoot;
  const resolvedScanRoot = scanRoot;
  const isSyntheticTestWorkspaceRoot = basename(scanRoot).startsWith(".test-");
  const relFromDefault = relative(resolvedDefaultRoot, resolvedScanRoot).replace(/\\/g, "/");
  const isSubfolderOfDefault = Boolean(
    !isSyntheticTestWorkspaceRoot &&
      relFromDefault &&
      !relFromDefault.startsWith("..") &&
      !isAbsolute(relFromDefault),
  );
  const cleanHostPrefix = hostParentPrefix ? hostParentPrefix.replace(/\\/g, "/").replace(/\/+$/, "") : null;

  const snapshot = ctx.getReducer().getSnapshot();
  const folders: WorkspaceFolderEntry[] = [];

  try {
    const sortedDirs = readdirSync(scanRoot, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith(".") && e.name !== "node_modules")
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of sortedDirs) {
      const localChildPath = join(scanRoot, entry.name).replace(/\\/g, "/");
      let hostPath: string;
      if (
        cleanHostPrefix &&
        (defaultLocalRoot === "/workspaces" ||
          scanRoot === resolvedDefaultRoot ||
          isSyntheticTestWorkspaceRoot ||
          isSubfolderOfDefault)
      ) {
        const effectiveHostBase = isSubfolderOfDefault
          ? `${cleanHostPrefix}/${relFromDefault}`
          : cleanHostPrefix;
        hostPath = `${effectiveHostBase}/${entry.name}`;
      } else {
        hostPath = localChildPath;
      }
      const normalizedPath = normalizeLocationDirectory(hostPath);
      folders.push({
        name: entry.name,
        hostPath,
        normalizedPath,
        isGitRepo: existsSync(join(localChildPath, ".git")),
        alreadyAdded: Boolean(snapshot.rooms[normalizedPath]),
      });
    }
  } catch { /* Return empty folders list if workspace root cannot be read */ }

  sendJson(res, 200, {
    ok: true,
    workspaceRoot: hostParentPrefix ?? scanRoot.replace(/\\/g, "/"),
    localWorkspaceRoot: scanRoot.replace(/\\/g, "/"),
    folders,
  });
}

export async function handleAddRoomRoute(
  req: IncomingMessage,
  res: ServerResponse,
  urlObj: URL,
  ctx: GuildApiRouterContext,
): Promise<void> {
  const activeReducer = ctx.getReducer();
  let body: Record<string, unknown> = {};
  try {
    body = await readJsonBody(req);
  } catch (err) {
    const status = (err as { statusCode?: number })?.statusCode ?? 400;
    sendJson(res, status, { ok: false, error: err instanceof Error ? err.message : "Invalid JSON body" });
    return;
  }

  const rawInput =
    (typeof body.directory === "string" && body.directory.trim()
      ? body.directory.trim()
      : null) ??
    urlObj.searchParams.get("directory")?.trim() ??
    "";

  if (!rawInput || rawInput === "/") {
    sendJson(res, 400, {
      ok: false,
      error: "Missing or invalid directory parameter for POST /api/guild/room",
    });
    return;
  }

  const hostParentPrefix = await inferHostWorkspaceParentPrefix(ctx);
  const { rawDirectory, normDirectory, localDir } =
    resolveRequestedWorldDirectory(rawInput, hostParentPrefix);

  if (!normDirectory || normDirectory === "/") {
    sendJson(res, 400, {
      ok: false,
      error: "Cannot register root '/' as a project world",
    });
    return;
  }

  if (
    isDeletedHostDirectory(
      rawDirectory,
      undefined,
      activeReducer.getSnapshot().daemonUrl,
    )
  ) {
    sendJson(res, 400, {
      ok: false,
      error: `Directory does not exist on host: ${rawDirectory}`,
    });
    return;
  }

  const explicitProjectName =
    typeof body.projectName === "string" && body.projectName.trim()
      ? body.projectName.trim()
      : undefined;
  const resolvedProjectName = deriveProjectName(
    normDirectory,
    explicitProjectName,
  );

  const fullDaemon = ctx.daemonClient as OpenCodeDaemonClientPort | undefined;
  fullDaemon?.recordDirectory?.(rawDirectory);

  if (ctx.clientAdapter?.registerLocation) {
    await ctx.clientAdapter.registerLocation(rawDirectory, {
      projectId: normDirectory,
      projectName: resolvedProjectName,
    });
  }

  const now = Date.now();
  activeReducer.dispatch({
    type: "location.discovered",
    timestampMs: now,
    locationDirectory: rawDirectory,
    projectId: normDirectory,
    projectName: resolvedProjectName,
    isWorktree: false,
    parentProjectDirectory: null,
    explicit: true,
  });

  const taskDir = localDir ?? rawDirectory;
  const taskProgress = deriveProjectTaskProgress(taskDir);
  const isLocalGit = Boolean(localDir && existsSync(join(localDir, ".git")));
  activeReducer.dispatch({
    type: "tasks.hydrated",
    timestampMs: now,
    ...(isLocalGit ? { roomId: normDirectory } : {}),
    locationDirectory: normDirectory,
    taskProgress,
  });

  if (fullDaemon?.getLocationState) {
    try {
      const state = await fullDaemon.getLocationState(rawDirectory);
      if (
        state.skills?.length ||
        state.plugins?.length ||
        state.agents?.length ||
        state.models?.length
      ) {
        activeReducer.dispatch({
          type: "catalog.hydrated",
          timestampMs: Date.now(),
          locationDirectory: normDirectory,
          skills: state.skills,
          plugins: state.plugins,
          agents: state.agents,
          models: state.models,
        });
      }
    } catch {
      // Non-fatal if daemon location state cannot be fetched yet
    }
  }

  const snapshot = activeReducer.getSnapshot();
  sendJson(res, 200, {
    ok: true,
    roomId: normDirectory,
    locationDirectory: normDirectory,
    rawDirectory,
    projectName: snapshot.rooms[normDirectory]?.projectName ?? resolvedProjectName,
    snapshot,
  });
}
