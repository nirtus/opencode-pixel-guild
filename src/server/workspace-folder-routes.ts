import { existsSync, readdirSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import {
  deriveProjectTaskProgress, isLocalGitRepository,
  scanGitStatusAsync, type OpenCodeDaemonClientPort,
} from "../ingress/index.ts";
import {
  deriveProjectName, isDeletedHostDirectory, isLocalDaemonEndpoint,
  normalizeLocationDirectory, resolveLocalProjectDir, toPosixMountPath,
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
  const snap = ctx.getReducer().getSnapshot();
  const daemonUrl = snap.daemonUrl || ctx.daemonUrl;
  const isRemote = Boolean(daemonUrl && !isLocalDaemonEndpoint(daemonUrl));

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

  for (const room of Object.values(snap.rooms ?? {})) {
    const dir = room.locationDirectory || room.roomId;
    if (dir) rawCandidates.push(isRemote ? dir : toPosixMountPath(dir));
  }

  const cleanedCandidates = rawCandidates
    .map((c) => c.trim().replace(/\\/g, "/").replace(/\/+$/, ""))
    .filter((c) => isUsableProjectDirectoryCandidate(c));
  const leafCandidates = cleanedCandidates.filter(
    (c) => !cleanedCandidates.some((other) => other !== c && other.toLowerCase().startsWith(`${c.toLowerCase()}/`)),
  );
  const effectiveCandidates = leafCandidates.length > 0 ? leafCandidates : cleanedCandidates;

  const repoBaseName = basename(process.cwd()).toLowerCase();
  let fallbackParent: string | null = null;
  for (const clean of effectiveCandidates) {
    const slashIdx = clean.lastIndexOf("/");
    if (slashIdx <= 0) continue;
    const parent = clean.slice(0, slashIdx);
    if (/^[A-Za-z]:$/.test(parent)) continue;
    const leaf = clean.slice(slashIdx + 1).toLowerCase();
    if (leaf === "opencode-game-visualizer" || leaf === repoBaseName) return parent;
    fallbackParent ??= parent;
  }
  if (!fallbackParent && isRemote && fullDaemon?.listWorkspaceDirectories) {
    try {
      fallbackParent = (await fullDaemon.listWorkspaceDirectories())?.workspaceRoot ?? null;
    } catch { /* Ignore */ }
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
  daemonUrl?: string | null,
): { rawDirectory: string; normDirectory: string; localDir: string | null } {
  const trimmed = rawInput.trim().replace(/\\/g, "/").replace(/\/+$/, "");
  if (!trimmed || trimmed === "/") return { rawDirectory: "/", normDirectory: "/", localDir: null };

  const isRemote = Boolean(daemonUrl && !isLocalDaemonEndpoint(daemonUrl));
  const cleanPrefix = hostParentPrefix ? hostParentPrefix.trim().replace(/\\/g, "/").replace(/\/+$/, "") : null;
  const fallbackLocalRoot = isRemote
    ? (cleanPrefix ?? "")
    : (existsSync("/workspaces") ? "/workspaces" : dirname(process.cwd()).replace(/\\/g, "/"));

  let rawDirectory: string;
  if (trimmed === "/workspaces") {
    rawDirectory = cleanPrefix ?? (fallbackLocalRoot || "/");
  } else if (trimmed.startsWith("/workspaces/")) {
    const rel = trimmed.slice("/workspaces/".length).replace(/^\/+/, "");
    const base = cleanPrefix ?? fallbackLocalRoot;
    rawDirectory = base ? `${base}/${rel}` : `/${rel}`;
  } else if (!trimmed.includes("/") && !/^[A-Za-z]:/.test(trimmed)) {
    const base = cleanPrefix ?? fallbackLocalRoot;
    rawDirectory = base ? `${base}/${trimmed}` : `/${trimmed}`;
  } else {
    rawDirectory = alignPathWithHostPrefixFormat(trimmed, cleanPrefix);
  }

  const normDirectory = normalizeLocationDirectory(rawDirectory);
  const localDir = isRemote
    ? null
    : (resolveLocalProjectDir(rawDirectory, existsSync, daemonUrl) ??
      (trimmed.startsWith("/workspaces/") && existsSync(trimmed) ? trimmed : null));
  return { rawDirectory, normDirectory, localDir };
}

function isAllowedWorkspaceParent(requestedParent: string, defaultLocalRoot: string, isRemote = false): boolean {
  if (/(?:^|[\\/])\.\.(?:[\\/]|$)/.test(requestedParent)) return false;
  const normalizedPosix = requestedParent.trim().replace(/\\/g, "/").replace(/\/+$/, "") || "/";
  if (
    normalizedPosix === "/" ||
    /^[A-Za-z]:$/.test(normalizedPosix) ||
    /^\/(?:etc|proc|sys|root|var|usr|bin|sbin|dev|run)(?:\/|$)/i.test(normalizedPosix)
  ) {
    return false;
  }
  if (isRemote) return true;
  const resolvedParent = resolve(requestedParent);
  const resolvedDefaultRoot = resolve(defaultLocalRoot);
  const resolvedCwd = resolve(process.cwd());
  const resolvedDataDir = resolve(resolvedCwd, "data");
  if (resolvedParent === resolvedDataDir || resolvedParent.startsWith(resolvedDataDir + sep)) return false;
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
  const snapshot = ctx.getReducer().getSnapshot();
  const daemonUrl = snapshot.daemonUrl || ctx.daemonUrl;
  const isRemote = Boolean(daemonUrl && !isLocalDaemonEndpoint(daemonUrl));
  const defaultLocalRoot = existsSync("/workspaces") ? "/workspaces" : dirname(process.cwd());
  if (requestedParent && !isAllowedWorkspaceParent(requestedParent, defaultLocalRoot, isRemote)) {
    sendJson(res, 400, {
      ok: false,
      error: "Requested parent directory is outside the allowed workspace root",
      folders: [],
    });
    return;
  }
  const hostParentPrefix = await inferHostWorkspaceParentPrefix(ctx);
  const fullDaemon = ctx.daemonClient as OpenCodeDaemonClientPort | undefined;
  if (isRemote) {
    const targetParent = requestedParent || hostParentPrefix || undefined;
    const remoteListed = await fullDaemon?.listWorkspaceDirectories?.(targetParent);
    const remoteRoot = (remoteListed?.workspaceRoot ?? targetParent ?? "/").replace(/\\/g, "/");
    const remoteFolders: WorkspaceFolderEntry[] = (remoteListed?.folders ?? []).map((entry) => {
      const normalizedPath = normalizeLocationDirectory(entry.hostPath);
      return {
        name: entry.name,
        hostPath: entry.hostPath,
        normalizedPath,
        isGitRepo: entry.isGitRepo,
        alreadyAdded: Boolean(snapshot.rooms[normalizedPath]),
      };
    });
    sendJson(res, 200, {
      ok: true,
      workspaceRoot: remoteRoot,
      localWorkspaceRoot: remoteRoot,
      folders: remoteFolders,
    });
    return;
  }
  const resolvedDefaultRoot = resolve(defaultLocalRoot);
  const scanRoot = requestedParent && existsSync(requestedParent) ? resolve(requestedParent) : resolvedDefaultRoot;
  const resolvedScanRoot = scanRoot;
  const isSyntheticTestWorkspaceRoot = basename(scanRoot).startsWith(".test-");
  const rawRelFromDefault = relative(resolvedDefaultRoot, resolvedScanRoot).replace(/\\/g, "/");
  const relFromDefault = rawRelFromDefault.startsWith("..")
    ? relative(resolve(dirname(process.cwd())), resolvedScanRoot).replace(/\\/g, "/")
    : rawRelFromDefault;
  const isSubfolderOfDefault = Boolean(
    !isSyntheticTestWorkspaceRoot &&
      relFromDefault &&
      !relFromDefault.startsWith("..") &&
      !isAbsolute(relFromDefault),
  );
  const cleanHostPrefix = hostParentPrefix ? hostParentPrefix.replace(/\\/g, "/").replace(/\/+$/, "") : null;
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
    (typeof body.directory === "string" && body.directory.trim() ? body.directory.trim() : null) ??
    urlObj.searchParams.get("directory")?.trim() ?? "";
  if (!rawInput || rawInput === "/") {
    sendJson(res, 400, { ok: false, error: "Missing or invalid directory parameter for POST /api/guild/room" });
    return;
  }

  const snapBefore = activeReducer.getSnapshot();
  const daemonUrl = snapBefore.daemonUrl || ctx.daemonUrl;
  const isRemote = Boolean(daemonUrl && !isLocalDaemonEndpoint(daemonUrl));
  const hostParentPrefix = await inferHostWorkspaceParentPrefix(ctx);
  let { rawDirectory, normDirectory, localDir } = resolveRequestedWorldDirectory(rawInput, hostParentPrefix, daemonUrl);
  if (!normDirectory || normDirectory === "/") {
    sendJson(res, 400, { ok: false, error: "Cannot register root '/' as a project world" });
    return;
  }

  const fullDaemon = ctx.daemonClient as OpenCodeDaemonClientPort | undefined;
  if (isRemote && fullDaemon?.probeDirectory) {
    const probe = await fullDaemon.probeDirectory(rawDirectory);
    if (!probe.exists) {
      sendJson(res, 400, { ok: false, error: `Directory does not exist on paired machine: ${rawDirectory}` });
      return;
    }
    if (probe.resolvedDirectory) {
      rawDirectory = probe.resolvedDirectory;
      normDirectory = normalizeLocationDirectory(rawDirectory);
    }
  } else if (isDeletedHostDirectory(rawDirectory, undefined, daemonUrl)) {
    sendJson(res, 400, { ok: false, error: `Directory does not exist on host: ${rawDirectory}` });
    return;
  }

  const explicitProjectName = typeof body.projectName === "string" && body.projectName.trim() ? body.projectName.trim() : undefined;
  const resolvedProjectName = deriveProjectName(normDirectory, explicitProjectName);
  fullDaemon?.recordDirectory?.(rawDirectory);

  if (ctx.clientAdapter?.registerLocation) {
    await ctx.clientAdapter.registerLocation(rawDirectory, { projectId: normDirectory, projectName: resolvedProjectName });
  }

  const now = Date.now();
  activeReducer.dispatch({
    type: "location.discovered", timestampMs: now, locationDirectory: rawDirectory,
    projectId: normDirectory, projectName: resolvedProjectName, isWorktree: false, parentProjectDirectory: null, explicit: true,
  });

  const taskDir = localDir ?? rawDirectory;
  await scanGitStatusAsync(taskDir);
  const taskProgress = deriveProjectTaskProgress(taskDir);
  const isLocalGit = Boolean((localDir && existsSync(join(localDir, ".git"))) || isLocalGitRepository(taskDir));
  activeReducer.dispatch({
    type: "tasks.hydrated", timestampMs: now, ...(isLocalGit ? { roomId: normDirectory } : {}),
    locationDirectory: normDirectory, taskProgress,
  });

  if (fullDaemon?.getLocationState) {
    try {
      const state = await fullDaemon.getLocationState(rawDirectory);
      if (state.skills?.length || state.plugins?.length || state.agents?.length || state.models?.length) {
        activeReducer.dispatch({
          type: "catalog.hydrated", timestampMs: Date.now(), locationDirectory: normDirectory,
          skills: state.skills, plugins: state.plugins, agents: state.agents, models: state.models,
        });
      }
    } catch { /* Non-fatal if daemon location state cannot be fetched yet */ }
  }

  const snapshot = activeReducer.getSnapshot();
  sendJson(res, 200, {
    ok: true, roomId: normDirectory, locationDirectory: normDirectory, rawDirectory,
    projectName: snapshot.rooms[normDirectory]?.projectName ?? resolvedProjectName, snapshot,
  });
}
