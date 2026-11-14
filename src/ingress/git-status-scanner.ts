import { execFile, execFileSync } from "node:child_process";
import { existsSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { normalizeLocationDirectory, resolveLocalProjectDir } from "../state/location-normalization.ts";

export interface RoomGitFileEntry {
  readonly path: string; readonly indexStatus: string; readonly worktreeStatus: string;
  readonly staged: boolean; readonly additions: number; readonly deletions: number;
}

export interface RoomGitWorkingTreeState {
  readonly isGitRepo: boolean; readonly branch: string | null;
  readonly upstream?: string | null; readonly ahead?: number; readonly behind?: number;
  readonly headCommit: { readonly hash: string; readonly subject: string } | null;
  readonly isClean: boolean; readonly files: readonly RoomGitFileEntry[];
  readonly draftCommitTitle: string; readonly draftCommitBody: string;
  readonly lastCommittedAtMs: number | null; readonly lastError?: string | null;
}

export interface GitSyncResult {
  readonly ok: boolean; readonly syncedRemote?: boolean; readonly pulled?: boolean;
  readonly pushed?: boolean; readonly error?: string; readonly state: RoomGitWorkingTreeState;
}

export interface GitWorkingTreePort {
  getStatus(roomDir: string): Promise<RoomGitWorkingTreeState>;
  syncRepository?(roomDir: string, options?: { runRemoteCommand?: (directory: string, command: string) => Promise<{ ok: boolean; output: string }> }): Promise<GitSyncResult>;
  getFileDiff(roomDir: string, filePath: string): Promise<string>;
  stageFiles(roomDir: string, paths: readonly string[] | "all"): Promise<RoomGitWorkingTreeState>;
  unstageFiles(roomDir: string, paths: readonly string[] | "all"): Promise<RoomGitWorkingTreeState>;
  updateDraft(roomDir: string, title: string, body?: string): Promise<RoomGitWorkingTreeState>;
  discardFiles(roomDir: string, paths: readonly string[] | "all"): Promise<RoomGitWorkingTreeState>;
  createCommit(roomDir: string, title: string, body?: string): Promise<{ ok: boolean; commitHash?: string; subject?: string; error?: string; state: RoomGitWorkingTreeState }>;
}

const NON_INTERACTIVE_GIT_ENV = { ...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "never" };

export function runGit(cwd: string, args: string[], timeoutMs = 8000): string {
  return execFileSync("git", args, {
    cwd, encoding: "utf8", env: NON_INTERACTIVE_GIT_ENV, stdio: ["ignore", "pipe", "pipe"], timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024,
  });
}

let activeAsyncGitCount = 0;
const asyncGitWaitQueue: Array<() => void> = [];

function acquireAsyncGitSlot(): Promise<() => void> {
  return new Promise((resolveSlot) => {
    const grant = () => {
      activeAsyncGitCount += 1;
      let released = false;
      resolveSlot(() => {
        if (released) return;
        released = true;
        activeAsyncGitCount = Math.max(0, activeAsyncGitCount - 1);
        asyncGitWaitQueue.shift()?.();
      });
    };
    if (activeAsyncGitCount < 2) grant();
    else asyncGitWaitQueue.push(grant);
  });
}

export function runGitAsync(cwd: string, args: string[], timeoutMs = 8000): Promise<string> {
  return new Promise((resolveOut, rejectOut) => {
    execFile("git", args, { cwd, encoding: "utf8", env: NON_INTERACTIVE_GIT_ENV, timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024 }, (err: unknown, stdout: unknown, stderr: unknown) => {
      if (err) {
        if (typeof err === "object" && err !== null && stderr && !(err as { stderr?: unknown }).stderr) {
          (err as { stderr?: unknown }).stderr = stderr;
        }
        rejectOut(err);
      } else {
        resolveOut(typeof stdout === "string" ? stdout : String(stdout ?? ""));
      }
    });
  });
}

export function extractGitErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object") {
    const e = err as { stderr?: unknown; stdout?: unknown; message?: unknown };
    const toStr = (val: unknown) =>
      typeof val === "string" ? val.trim() : Buffer.isBuffer(val) ? (val as { toString(enc: string): string }).toString("utf8").trim() : "";
    const raw = toStr(e.stderr) || toStr(e.stdout) || toStr(e.message);
    if (raw) {
      const cleaned = raw
        .split(/\r?\n/)
        .map((line: string) => line.trim())
        .filter((line: string) => Boolean(line) && !line.startsWith("warning: in the working copy of") && !/^Command failed:\s*git\b/i.test(line))
        .join(" ")
        .replace(/^Command failed:\s*git\s+\S+(?:\s+-\S+)*\s*/i, "")
        .trim();
      if (cleaned) return cleaned.slice(0, 280);
    }
  }
  return fallback;
}

export function clearStaleGitIndexLock(resolvedDir: string): void {
  try {
    const lockPath = join(resolvedDir, ".git", "index.lock");
    if (existsSync(lockPath) && Date.now() - statSync(lockPath).mtimeMs > 15_000) {
      rmSync(lockPath, { force: true });
    }
  } catch { /* Ignore lock stat errors */ }
}

const repoMutationQueues = new Map<string, Promise<unknown>>();

export function enqueueRepoMutation<T>(resolvedDir: string, fn: () => T | Promise<T>): Promise<T> {
  const prev = repoMutationQueues.get(resolvedDir) ?? Promise.resolve();
  const next = prev.then(() => fn(), () => fn());
  repoMutationQueues.set(resolvedDir, next.then(() => undefined, () => undefined));
  return next;
}

export interface ScannedGitStatus {
  isGitRepo: boolean; branch: string | null; upstream?: string | null;
  ahead?: number; behind?: number; headCommit: { hash: string; subject: string } | null;
  files: RoomGitFileEntry[];
}

const EMPTY_SCANNED_GIT: ScannedGitStatus = Object.freeze({
  isGitRepo: false, branch: null, upstream: null, ahead: 0, behind: 0, headCommit: null, files: [],
});

const gitStatusCache = new Map<string, { atMs: number; value: ScannedGitStatus }>();
const inFlightGitScans = new Map<string, Promise<ScannedGitStatus>>();
let globalGitCacheEpoch = 0;
const gitCacheEpochByDir = new Map<string, number>();

function getDirGitEpoch(normDir: string): number {
  return (gitCacheEpochByDir.get(normDir) ?? 0) + globalGitCacheEpoch;
}

function bumpDirGitEpoch(normDir: string): void {
  if (!normDir) return;
  gitCacheEpochByDir.set(normDir, (gitCacheEpochByDir.get(normDir) ?? 0) + 1);
}

function storeCachedGitStatus(projectDir: string, resolved: string, value: ScannedGitStatus): void {
  const entry = { atMs: Date.now(), value };
  const normProj = normalizeLocationDirectory(projectDir);
  const normRes = normalizeLocationDirectory(resolved);
  gitStatusCache.set(normProj, entry);
  gitStatusCache.set(normRes, entry);
}

export function getCachedGitStatus(projectDir: string, ttlMs = 30_000): ScannedGitStatus | null {
  const now = Date.now();
  const direct = gitStatusCache.get(normalizeLocationDirectory(projectDir));
  if (direct && now - direct.atMs < ttlMs) return direct.value;
  const resolved = resolveLocalProjectDir(projectDir, existsSync);
  if (resolved) {
    const byResolved = gitStatusCache.get(normalizeLocationDirectory(resolved));
    if (byResolved && now - byResolved.atMs < ttlMs) return byResolved.value;
  }
  return null;
}

export function peekCachedGitStatus(projectDir: string): ScannedGitStatus | null {
  const direct = gitStatusCache.get(normalizeLocationDirectory(projectDir));
  if (direct) return direct.value;
  const resolved = resolveLocalProjectDir(projectDir, existsSync);
  if (resolved) {
    const byResolved = gitStatusCache.get(normalizeLocationDirectory(resolved));
    if (byResolved) return byResolved.value;
  }
  return null;
}

export function invalidateGitStatusCache(resolvedDir?: string): void {
  if (resolvedDir) {
    const norm = normalizeLocationDirectory(resolvedDir);
    bumpDirGitEpoch(norm);
    gitStatusCache.delete(resolvedDir);
    gitStatusCache.delete(norm);
    inFlightGitScans.delete(resolvedDir);
    inFlightGitScans.delete(norm);
    const local = resolveLocalProjectDir(resolvedDir, existsSync);
    if (local) {
      const normLocal = normalizeLocationDirectory(local);
      bumpDirGitEpoch(normLocal);
      gitStatusCache.delete(local);
      gitStatusCache.delete(normLocal);
      inFlightGitScans.delete(local);
      inFlightGitScans.delete(normLocal);
    }
  } else {
    globalGitCacheEpoch += 1;
    gitCacheEpochByDir.clear();
    gitStatusCache.clear();
    inFlightGitScans.clear();
  }
}

export function isLocalGitRepository(projectDir: string): boolean {
  const resolved = resolveLocalProjectDir(projectDir, existsSync);
  return Boolean(resolved && existsSync(join(resolved, ".git")));
}

export function scanGitStatusSync(projectDir: string, ttlMs = 30_000): ScannedGitStatus {
  const cached = getCachedGitStatus(projectDir, ttlMs);
  if (cached) return cached;
  const resolved = resolveLocalProjectDir(projectDir, existsSync);
  if (!resolved) return { ...EMPTY_SCANNED_GIT, files: [] };
  const computed = computeGitStatusSync(resolved);
  storeCachedGitStatus(projectDir, resolved, computed);
  return computed;
}

export async function scanGitStatusAsync(
  projectDir: string,
  options?: { force?: boolean; ttlMs?: number },
): Promise<ScannedGitStatus> {
  const ttlMs = options?.ttlMs ?? 30_000;
  if (!options?.force) {
    const cached = getCachedGitStatus(projectDir, ttlMs);
    if (cached) return cached;
  }
  const resolved = resolveLocalProjectDir(projectDir, existsSync);
  if (!resolved) return { ...EMPTY_SCANNED_GIT, files: [] };
  const inFlightKey = normalizeLocationDirectory(resolved);
  if (!options?.force) {
    const existing = inFlightGitScans.get(inFlightKey);
    if (existing) return existing;
  }
  const startEpoch = getDirGitEpoch(inFlightKey);
  let scanPromise: Promise<ScannedGitStatus> | null = null;
  scanPromise = (async () => {
    const release = await acquireAsyncGitSlot();
    try {
      const computed = await computeGitStatusAsync(resolved);
      if (options?.force || getDirGitEpoch(inFlightKey) === startEpoch) {
        storeCachedGitStatus(projectDir, resolved, computed);
        return computed;
      }
      return getCachedGitStatus(projectDir, ttlMs) ?? computed;
    } finally {
      release();
      if (scanPromise && inFlightGitScans.get(inFlightKey) === scanPromise) {
        inFlightGitScans.delete(inFlightKey);
      }
    }
  })();
  inFlightGitScans.set(inFlightKey, scanPromise);
  return scanPromise;
}

function parsePorcelainBranchHeader(headerLine: string) {
  const body = headerLine.replace(/^##\s*/, "").trim();
  if (!body) return { branch: null, upstream: null, ahead: 0, behind: 0 };
  const unbornMatch = body.match(/^(?:No commits yet on|Initial commit on)\s+(.+)$/i);
  if (unbornMatch) return { branch: unbornMatch[1]?.trim() || "main", upstream: null, ahead: 0, behind: 0 };
  if (body.startsWith("HEAD")) return { branch: "HEAD", upstream: null, ahead: 0, behind: 0 };
  const bracketMatch = body.match(/\[([^\]]+)\]\s*$/);
  const ahead = Number.parseInt(bracketMatch?.[1]?.match(/\bahead\s+(\d+)/i)?.[1] ?? "0", 10) || 0;
  const behind = Number.parseInt(bracketMatch?.[1]?.match(/\bbehind\s+(\d+)/i)?.[1] ?? "0", 10) || 0;
  const [rawBranch, rawUpstream] = body.replace(/\s*\[[^\]]+\]\s*$/, "").trim().split("...");
  return { branch: rawBranch?.trim() || null, upstream: rawUpstream?.trim() || null, ahead, behind };
}

function parsePorcelainStatus(rawPorcelain: string) {
  let branch: string | null = null;
  let upstream: string | null = null;
  let ahead = 0;
  let behind = 0;
  const rawEntries: Array<{ path: string; indexStatus: string; worktreeStatus: string; staged: boolean }> = [];
  for (const line of rawPorcelain.split(/\r?\n/)) {
    if (line.startsWith("## ")) {
      ({ branch, upstream, ahead, behind } = parsePorcelainBranchHeader(line));
      continue;
    }
    if (line.length < 4) continue;
    const indexStatus = line[0] ?? " ";
    const worktreeStatus = line[1] ?? " ";
    const rawPath = line.slice(3).trim();
    const arrowIdx = rawPath.indexOf(" -> ");
    const unquoted = (arrowIdx >= 0 ? rawPath.slice(arrowIdx + 4) : rawPath).replace(/^"(.*)"$/, "$1");
    const staged = indexStatus !== " " && indexStatus !== "?" && worktreeStatus === " ";
    rawEntries.push({ path: unquoted, indexStatus, worktreeStatus, staged });
  }
  const unstagedPaths = rawEntries.filter((e) => e.worktreeStatus !== " " && e.worktreeStatus !== "?").map((e) => e.path);
  const stagedPaths = rawEntries.filter((e) => e.indexStatus !== " " && e.indexStatus !== "?").map((e) => e.path);
  return {
    branch, upstream, ahead, behind, rawEntries,
    hasUnstagedTracked: unstagedPaths.length > 0,
    hasStaged: stagedPaths.length > 0,
    unstagedPaths,
    stagedPaths,
  };
}

function accumulateNumstat(rawStat: string, numstatByPath: Map<string, { additions: number; deletions: number }>): void {
  for (const line of rawStat.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const [addStr, delStr, p] = line.split("\t");
    if (!p) continue;
    const prev = numstatByPath.get(p) ?? { additions: 0, deletions: 0 };
    numstatByPath.set(p, {
      additions: prev.additions + (Number.parseInt(addStr, 10) || 0),
      deletions: prev.deletions + (Number.parseInt(delStr, 10) || 0),
    });
  }
}

function buildFilesFromNumstat(
  rawEntries: Array<{ path: string; indexStatus: string; worktreeStatus: string; staged: boolean }>,
  numstatByPath: Map<string, { additions: number; deletions: number }>,
  unstagedDiffOk: boolean,
): RoomGitFileEntry[] {
  return rawEntries
    .filter((e) => !(unstagedDiffOk && e.indexStatus === " " && e.worktreeStatus === "M" && !numstatByPath.has(e.path)))
    .map((entry) => {
      const stats = numstatByPath.get(entry.path) ?? { additions: 0, deletions: 0 };
      return { ...entry, additions: stats.additions, deletions: stats.deletions };
    });
}

const BASE_STATUS_ARGS = ["--no-optional-locks", "-c", "core.checkStat=minimal", "-c", "core.filemode=false", "-c", "core.autocrlf=true", "status", "--porcelain=v1", "-b"];
const UNSTAGED_DIFF_ARGS = ["--no-optional-locks", "-c", "core.checkStat=minimal", "-c", "core.filemode=false", "-c", "core.autocrlf=true", "diff", "--ignore-cr-at-eol", "--numstat"];
const STAGED_DIFF_ARGS = ["--no-optional-locks", "-c", "core.checkStat=minimal", "-c", "core.filemode=false", "-c", "core.autocrlf=true", "diff", "--cached", "--ignore-cr-at-eol", "--numstat"];

function computeGitStatusSync(resolved: string): ScannedGitStatus {
  if (!existsSync(join(resolved, ".git"))) return { ...EMPTY_SCANNED_GIT, files: [] };
  try {
    let rawPorcelain: string;
    try {
      rawPorcelain = runGit(resolved, [...BASE_STATUS_ARGS, "-u"], 12000);
    } catch {
      rawPorcelain = runGit(resolved, BASE_STATUS_ARGS, 12000);
    }
    const { branch, upstream, ahead, behind, rawEntries, hasUnstagedTracked, hasStaged, unstagedPaths, stagedPaths } = parsePorcelainStatus(rawPorcelain);
    let headCommit: { hash: string; subject: string } | null = null;
    try {
      const [hash, subject] = runGit(resolved, ["--no-optional-locks", "log", "-1", "--format=%h\t%s"], 8000).trim().split("\t");
      if (hash) headCommit = { hash, subject: subject || "" };
    } catch { /* Unborn branch */ }
    const numstatByPath = new Map<string, { additions: number; deletions: number }>();
    let unstagedDiffOk = false;
    for (const [isUnstaged, shouldRun, diffArgs, paths] of [
      [true, hasUnstagedTracked, UNSTAGED_DIFF_ARGS, unstagedPaths],
      [false, hasStaged, STAGED_DIFF_ARGS, stagedPaths],
    ] as const) {
      if (!shouldRun) continue;
      try {
        const scopedArgs = paths.length > 0 && paths.length <= 64 ? [...diffArgs, "--", ...paths] : [...diffArgs];
        accumulateNumstat(runGit(resolved, scopedArgs, 8000), numstatByPath);
        if (isUnstaged) unstagedDiffOk = true;
      } catch { /* Ignore numstat error */ }
    }
    return { isGitRepo: true, branch, upstream, ahead, behind, headCommit, files: buildFilesFromNumstat(rawEntries, numstatByPath, unstagedDiffOk) };
  } catch {
    return { ...EMPTY_SCANNED_GIT, files: [] };
  }
}

async function computeGitStatusAsync(resolved: string): Promise<ScannedGitStatus> {
  if (!existsSync(join(resolved, ".git"))) return { ...EMPTY_SCANNED_GIT, files: [] };
  try {
    let rawPorcelain: string;
    try {
      rawPorcelain = await runGitAsync(resolved, [...BASE_STATUS_ARGS, "-u"], 12000);
    } catch {
      rawPorcelain = await runGitAsync(resolved, BASE_STATUS_ARGS, 12000);
    }
    const { branch, upstream, ahead, behind, rawEntries, hasUnstagedTracked, hasStaged, unstagedPaths, stagedPaths } = parsePorcelainStatus(rawPorcelain);
    const unstagedArgs = unstagedPaths.length > 0 && unstagedPaths.length <= 64 ? [...UNSTAGED_DIFF_ARGS, "--", ...unstagedPaths] : [...UNSTAGED_DIFF_ARGS];
    const stagedArgs = stagedPaths.length > 0 && stagedPaths.length <= 64 ? [...STAGED_DIFF_ARGS, "--", ...stagedPaths] : [...STAGED_DIFF_ARGS];
    const [headOut, unstagedStatOut, stagedStatOut] = await Promise.all([
      runGitAsync(resolved, ["--no-optional-locks", "log", "-1", "--format=%h\t%s"], 8000).catch(() => null),
      hasUnstagedTracked ? runGitAsync(resolved, unstagedArgs, 8000).catch(() => null) : Promise.resolve(null),
      hasStaged ? runGitAsync(resolved, stagedArgs, 8000).catch(() => null) : Promise.resolve(null),
    ]);
    let headCommit: { hash: string; subject: string } | null = null;
    if (headOut) {
      const [hash, subject] = headOut.trim().split("\t");
      if (hash) headCommit = { hash, subject: subject || "" };
    }
    const numstatByPath = new Map<string, { additions: number; deletions: number }>();
    let unstagedDiffOk = false;
    if (unstagedStatOut !== null) {
      accumulateNumstat(unstagedStatOut, numstatByPath);
      unstagedDiffOk = true;
    }
    if (stagedStatOut !== null) accumulateNumstat(stagedStatOut, numstatByPath);
    return { isGitRepo: true, branch, upstream, ahead, behind, headCommit, files: buildFilesFromNumstat(rawEntries, numstatByPath, unstagedDiffOk) };
  } catch {
    return { ...EMPTY_SCANNED_GIT, files: [] };
  }
}
