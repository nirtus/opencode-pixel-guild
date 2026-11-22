import { isAbsolute, relative, resolve } from "node:path";
import {
  clearRemoteDirectoryScopes,
  isLocalDaemonEndpoint,
  markDirectoryDaemonScope,
  normalizeDaemonEndpointUrl,
  normalizeLocationDirectory,
} from "../state/index.ts";
import {
  accumulateNumstat,
  BASE_STATUS_ARGS,
  buildFilesFromNumstat,
  invalidateGitStatusCache,
  parsePorcelainStatus,
  type RoomGitFileEntry,
  type ScannedGitStatus,
  STAGED_DIFF_ARGS,
  UNSTAGED_DIFF_ARGS,
} from "./git-status-scanner.ts";
import { invalidateTaskProgressCache } from "./issue-tracker-scanner.ts";

export interface RemoteGitDirectoryRunner {
  rawDirectory: string;
  daemonUrl: string;
  runShellCommand: (
    directory: string,
    command: string,
  ) => Promise<{ ok: boolean; output: string }>;
}

const remoteRunnersByNormDir = new Map<string, RemoteGitDirectoryRunner>();

export function registerRemoteDirectoryRunner(
  rawDirectory: string,
  daemonUrl: string | null | undefined,
  runShellCommand?: (
    directory: string,
    command: string,
  ) => Promise<{ ok: boolean; output: string }>,
): void {
  if (!rawDirectory || !rawDirectory.trim()) return;
  markDirectoryDaemonScope(rawDirectory, daemonUrl);
  const norm = normalizeLocationDirectory(rawDirectory).toLowerCase();
  if (!norm || norm === "/") return;
  if (daemonUrl && !isLocalDaemonEndpoint(daemonUrl) && runShellCommand) {
    const prev = remoteRunnersByNormDir.get(norm);
    remoteRunnersByNormDir.set(norm, {
      rawDirectory: rawDirectory.trim(),
      daemonUrl: daemonUrl.trim(),
      runShellCommand,
    });
    if (prev && normalizeDaemonEndpointUrl(prev.daemonUrl) !== normalizeDaemonEndpointUrl(daemonUrl)) {
      invalidateGitStatusCache(rawDirectory, prev.daemonUrl);
      invalidateTaskProgressCache(rawDirectory);
    }
  } else if (daemonUrl && isLocalDaemonEndpoint(daemonUrl)) {
    if (remoteRunnersByNormDir.delete(norm)) {
      invalidateGitStatusCache(rawDirectory, "local");
      invalidateTaskProgressCache(rawDirectory);
    }
  }
}

export function getRemoteDirectoryRunner(directory: string): RemoteGitDirectoryRunner | null {
  if (!directory || !directory.trim()) return null;
  return remoteRunnersByNormDir.get(normalizeLocationDirectory(directory).toLowerCase()) ?? null;
}

export function clearRemoteDirectoryRunners(daemonUrl?: string | null): void {
  const target = normalizeDaemonEndpointUrl(daemonUrl);
  if (!target) {
    remoteRunnersByNormDir.clear();
    clearRemoteDirectoryScopes();
    invalidateGitStatusCache();
    invalidateTaskProgressCache();
    return;
  }
  for (const [norm, runner] of remoteRunnersByNormDir.entries()) {
    if (normalizeDaemonEndpointUrl(runner.daemonUrl) === target) {
      remoteRunnersByNormDir.delete(norm);
    }
  }
  clearRemoteDirectoryScopes(daemonUrl);
}

function quoteGitArg(arg: string): string {
  if (/^[A-Za-z0-9._/=-]+$/.test(arg)) return arg;
  return `"${arg.replace(/(["\\$`])/g, "\\$1")}"`;
}

function buildGitCommand(args: readonly string[]): string {
  return `git ${args.map(quoteGitArg).join(" ")}`;
}

function buildCompoundGitStatusCommand(): string {
  const statusCmd = buildGitCommand([...BASE_STATUS_ARGS, "-u"]);
  const headCmd = buildGitCommand(["--no-optional-locks", "log", "-1", "--format=%h%x09%s"]);
  const unstagedCmd = buildGitCommand(UNSTAGED_DIFF_ARGS);
  const stagedCmd = buildGitCommand(STAGED_DIFF_ARGS);
  return [
    "printf '__PG_STATUS__\\n'",
    `&& (${statusCmd} || ${buildGitCommand(BASE_STATUS_ARGS)})`,
    "&& printf '\\n__PG_HEAD__\\n'",
    `&& (${headCmd} 2>/dev/null || true)`,
    "&& printf '\\n__PG_UNSTAGED__\\n'",
    `&& (${unstagedCmd} 2>/dev/null || true)`,
    "&& printf '\\n__PG_STAGED__\\n'",
    `&& (${stagedCmd} 2>/dev/null || true)`,
    "&& printf '\\n__PG_END__\\n'",
  ].join(" ");
}

function finalizeRemoteGitStatus(
  rawEntries: Array<{ path: string; indexStatus: string; worktreeStatus: string; staged: boolean }>,
  branch: string | null,
  upstream: string | null,
  ahead: number,
  behind: number,
  headRaw: string,
  unstagedRaw: string | null,
  stagedRaw: string | null,
): ScannedGitStatus {
  let headCommit: { hash: string; subject: string } | null = null;
  if (headRaw.trim()) {
    const [hash, subject] = headRaw.trim().split(/\r?\n/)[0]!.trim().split("\t");
    if (hash) headCommit = { hash, subject: subject || "" };
  }
  const numstatByPath = new Map<string, { additions: number; deletions: number }>();
  let unstagedDiffOk = false;
  if (unstagedRaw !== null) {
    accumulateNumstat(unstagedRaw, numstatByPath);
    unstagedDiffOk = true;
  }
  if (stagedRaw !== null) accumulateNumstat(stagedRaw, numstatByPath);
  return {
    isGitRepo: true,
    branch,
    upstream,
    ahead,
    behind,
    headCommit,
    files: buildFilesFromNumstat(rawEntries, numstatByPath, unstagedDiffOk),
  };
}

function parseCompoundGitStatusOutput(raw: string): ScannedGitStatus | null {
  const statusIdx = raw.indexOf("__PG_STATUS__");
  if (statusIdx < 0) return null;
  const headIdx = raw.indexOf("__PG_HEAD__", statusIdx);
  const unstagedIdx = raw.indexOf("__PG_UNSTAGED__", headIdx >= 0 ? headIdx : statusIdx);
  const stagedIdx = raw.indexOf("__PG_STAGED__", unstagedIdx >= 0 ? unstagedIdx : statusIdx);
  const endIdx = raw.indexOf("__PG_END__", stagedIdx >= 0 ? stagedIdx : statusIdx);
  const sliceBetween = (start: number, markerLen: number, end: number): string =>
    start < 0 ? "" : raw.slice(start + markerLen, end >= 0 ? end : raw.length).trim();

  const statusText = sliceBetween(statusIdx, "__PG_STATUS__".length, headIdx >= 0 ? headIdx : raw.length);
  if (!statusText || /fatal:\s+not a git repository/i.test(statusText) || !statusText.startsWith("## ")) {
    return null;
  }
  const { branch, upstream, ahead, behind, rawEntries, hasUnstagedTracked, hasStaged } =
    parsePorcelainStatus(statusText);
  const headText = headIdx >= 0 ? sliceBetween(headIdx, "__PG_HEAD__".length, unstagedIdx >= 0 ? unstagedIdx : raw.length) : "";
  const unstagedText = unstagedIdx >= 0 ? sliceBetween(unstagedIdx, "__PG_UNSTAGED__".length, stagedIdx >= 0 ? stagedIdx : raw.length) : null;
  const stagedText = stagedIdx >= 0 ? sliceBetween(stagedIdx, "__PG_STAGED__".length, endIdx >= 0 ? endIdx : raw.length) : null;
  return finalizeRemoteGitStatus(
    rawEntries,
    branch,
    upstream,
    ahead,
    behind,
    headText,
    unstagedText !== null && (hasUnstagedTracked || unstagedText.length > 0) ? unstagedText : null,
    stagedText !== null && (hasStaged || stagedText.length > 0) ? stagedText : null,
  );
}

export async function computeRemoteGitStatusAsync(
  runner: RemoteGitDirectoryRunner,
): Promise<ScannedGitStatus> {
  const empty: ScannedGitStatus = {
    isGitRepo: false,
    branch: null,
    upstream: null,
    ahead: 0,
    behind: 0,
    headCommit: null,
    files: [],
  };
  try {
    const isWindowsPath = /^[A-Za-z]:[\\/]/.test(runner.rawDirectory);
    let statusRes = await runner.runShellCommand(
      runner.rawDirectory,
      isWindowsPath ? buildGitCommand([...BASE_STATUS_ARGS, "-u"]) : buildCompoundGitStatusCommand(),
    );
    if (/fatal:\s+not a git repository/i.test(statusRes.output)) {
      return empty;
    }
    const compoundParsed = parseCompoundGitStatusOutput(statusRes.output);
    if (compoundParsed) {
      return compoundParsed;
    }
    if (!statusRes.ok && !statusRes.output.startsWith("## ")) {
      statusRes = await runner.runShellCommand(
        runner.rawDirectory,
        buildGitCommand(BASE_STATUS_ARGS),
      );
    }
    if (
      (!statusRes.ok && !statusRes.output.startsWith("## ")) ||
      /fatal:\s+not a git repository/i.test(statusRes.output)
    ) {
      return /fatal:\s+not a git repository/i.test(statusRes.output) ? empty : { ...empty, transientError: true };
    }

    const {
      branch,
      upstream,
      ahead,
      behind,
      rawEntries,
      hasUnstagedTracked,
      hasStaged,
      unstagedPaths,
      stagedPaths,
    } = parsePorcelainStatus(statusRes.output);

    const unstagedArgs =
      unstagedPaths.length > 0 && unstagedPaths.length <= 64
        ? [...UNSTAGED_DIFF_ARGS, "--", ...unstagedPaths]
        : [...UNSTAGED_DIFF_ARGS];
    const stagedArgs =
      stagedPaths.length > 0 && stagedPaths.length <= 64
        ? [...STAGED_DIFF_ARGS, "--", ...stagedPaths]
        : [...STAGED_DIFF_ARGS];

    const [headRes, unstagedRes, stagedRes] = await Promise.all([
      runner
        .runShellCommand(
          runner.rawDirectory,
          buildGitCommand(["--no-optional-locks", "log", "-1", "--format=%h%x09%s"]),
        )
        .catch(() => null),
      hasUnstagedTracked
        ? runner
            .runShellCommand(runner.rawDirectory, buildGitCommand(unstagedArgs))
            .catch(() => null)
        : Promise.resolve(null),
      hasStaged
        ? runner
            .runShellCommand(runner.rawDirectory, buildGitCommand(stagedArgs))
            .catch(() => null)
        : Promise.resolve(null),
    ]);

    return finalizeRemoteGitStatus(
      rawEntries,
      branch,
      upstream,
      ahead,
      behind,
      headRes?.ok ? headRes.output : "",
      unstagedRes?.ok ? unstagedRes.output : null,
      stagedRes?.ok ? stagedRes.output : null,
    );
  } catch {
    return empty;
  }
}

export async function remoteGitGetFileDiff(
  runner: RemoteGitDirectoryRunner,
  filePath: string,
): Promise<string> {
  if (!filePath || filePath.startsWith("-")) return "";
  const root = resolve("/repo");
  const full = resolve(root, filePath.replace(/\\/g, "/"));
  const rel = relative(root, full).replace(/\\/g, "/");
  if (
    !rel ||
    rel.startsWith("..") ||
    isAbsolute(rel) ||
    rel === ".git" ||
    rel.startsWith(".git/") ||
    rel === "data" ||
    rel.startsWith("data/")
  ) {
    return "";
  }
  const unstaged = await runner
    .runShellCommand(
      runner.rawDirectory,
      buildGitCommand(["--no-optional-locks", "-c", "core.checkStat=minimal", "-c", "core.autocrlf=true", "diff", "--ignore-cr-at-eol", "--", rel]),
    )
    .catch(() => ({ ok: false, output: "" }));
  if (unstaged.output.trim()) return unstaged.output.slice(0, 4000);
  const staged = await runner
    .runShellCommand(
      runner.rawDirectory,
      buildGitCommand(["--no-optional-locks", "-c", "core.checkStat=minimal", "-c", "core.autocrlf=true", "diff", "--cached", "--ignore-cr-at-eol", "--", rel]),
    )
    .catch(() => ({ ok: false, output: "" }));
  return staged.output.slice(0, 4000);
}

export async function remoteGitStageFiles(
  runner: RemoteGitDirectoryRunner,
  paths: readonly string[] | "all",
): Promise<string | null> {
  const args =
    paths === "all"
      ? ["-c", "core.autocrlf=true", "add", "-A"]
      : ["-c", "core.autocrlf=true", "add", "--", ...paths];
  if (paths !== "all" && paths.length === 0) return null;
  const res = await runner.runShellCommand(runner.rawDirectory, buildGitCommand(args));
  return res.ok ? null : res.output || "Failed to stage files";
}

export async function remoteGitUnstageFiles(
  runner: RemoteGitDirectoryRunner,
  paths: readonly string[] | "all",
): Promise<string | null> {
  const args =
    paths === "all" ? ["reset", "HEAD"] : ["reset", "HEAD", "--", ...paths];
  if (paths !== "all" && paths.length === 0) return null;
  const res = await runner.runShellCommand(runner.rawDirectory, buildGitCommand(args));
  return res.ok ? null : res.output || "Failed to unstage files";
}

export async function remoteGitDiscardFiles(
  runner: RemoteGitDirectoryRunner,
  paths: readonly string[] | "all",
  currentFiles: readonly RoomGitFileEntry[],
): Promise<string | null> {
  const rawTargets =
    paths === "all" ? currentFiles.map((f) => f.path) : [...paths];
  const cleaned = rawTargets.map((p) => p.trim()).filter(Boolean);
  const untracked = cleaned.filter((p) => {
    const entry = currentFiles.find((f) => f.path === p);
    return Boolean(entry && entry.indexStatus === "?" && entry.worktreeStatus === "?");
  });
  const tracked = cleaned.filter((p) => !untracked.includes(p));
  let lastError: string | null = null;
  if (untracked.length > 0) {
    const cleanRes = await runner.runShellCommand(
      runner.rawDirectory,
      buildGitCommand(["clean", "-fd", "--", ...untracked]),
    );
    if (!cleanRes.ok) lastError = cleanRes.output || "Failed to discard untracked files";
  }
  if (tracked.length > 0) {
    await runner
      .runShellCommand(
        runner.rawDirectory,
        buildGitCommand(["reset", "-q", "HEAD", "--", ...tracked]),
      )
      .catch(() => {});
    const coRes = await runner.runShellCommand(
      runner.rawDirectory,
      buildGitCommand(["checkout", "--", ...tracked]),
    );
    if (!coRes.ok) lastError = coRes.output || "Failed to discard tracked files";
  }
  return lastError;
}

export async function remoteGitCreateCommit(
  runner: RemoteGitDirectoryRunner,
  cleanTitle: string,
  cleanBody: string,
  hasStagedFiles: boolean,
): Promise<string | null> {
  if (!hasStagedFiles) {
    const addRes = await runner.runShellCommand(
      runner.rawDirectory,
      buildGitCommand(["-c", "core.autocrlf=true", "add", "-A"]),
    );
    if (!addRes.ok) return addRes.output || "Failed to stage files before commit";
  }
  const commitArgs = [
    "-c",
    "user.name=Guild Operator",
    "-c",
    "user.email=guild@opencode.local",
    "commit",
    "-m",
    cleanTitle,
    ...(cleanBody ? ["-m", cleanBody] : []),
  ];
  const commitRes = await runner.runShellCommand(
    runner.rawDirectory,
    buildGitCommand(commitArgs),
  );
  return commitRes.ok ? null : commitRes.output || "git commit failed";
}
