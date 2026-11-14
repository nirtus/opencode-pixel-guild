import { isAbsolute, relative, resolve } from "node:path";
import {
  isLocalDaemonEndpoint,
  markDirectoryDaemonScope,
  normalizeLocationDirectory,
} from "../state/location-normalization.ts";
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
    if (
      !prev ||
      prev.daemonUrl !== daemonUrl.trim() ||
      prev.runShellCommand !== runShellCommand
    ) {
      invalidateGitStatusCache(rawDirectory);
      invalidateTaskProgressCache(rawDirectory);
    }
  } else if (daemonUrl && isLocalDaemonEndpoint(daemonUrl)) {
    if (remoteRunnersByNormDir.delete(norm)) {
      invalidateGitStatusCache(rawDirectory);
      invalidateTaskProgressCache(rawDirectory);
    }
  }
}

export function getRemoteDirectoryRunner(
  directory: string,
): RemoteGitDirectoryRunner | null {
  if (!directory || !directory.trim()) return null;
  const norm = normalizeLocationDirectory(directory).toLowerCase();
  return remoteRunnersByNormDir.get(norm) ?? null;
}

function quoteGitArg(arg: string): string {
  if (/^[A-Za-z0-9._/=-]+$/.test(arg)) return arg;
  return `"${arg.replace(/(["\\$`])/g, "\\$1")}"`;
}

function buildGitCommand(args: readonly string[]): string {
  return `git ${args.map(quoteGitArg).join(" ")}`;
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
    let statusRes = await runner.runShellCommand(
      runner.rawDirectory,
      buildGitCommand([...BASE_STATUS_ARGS, "-u"]),
    );
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
      return empty;
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

    let headCommit: { hash: string; subject: string } | null = null;
    if (headRes?.ok && headRes.output) {
      const [hash, subject] = headRes.output.trim().split("\t");
      if (hash) headCommit = { hash, subject: subject || "" };
    }

    const numstatByPath = new Map<string, { additions: number; deletions: number }>();
    let unstagedDiffOk = false;
    if (unstagedRes?.ok) {
      accumulateNumstat(unstagedRes.output, numstatByPath);
      unstagedDiffOk = true;
    }
    if (stagedRes?.ok) {
      accumulateNumstat(stagedRes.output, numstatByPath);
    }

    return {
      isGitRepo: true,
      branch,
      upstream,
      ahead,
      behind,
      headCommit,
      files: buildFilesFromNumstat(rawEntries, numstatByPath, unstagedDiffOk),
    };
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
      buildGitCommand([
        "--no-optional-locks",
        "-c",
        "core.checkStat=minimal",
        "-c",
        "core.autocrlf=true",
        "diff",
        "--ignore-cr-at-eol",
        "--",
        rel,
      ]),
    )
    .catch(() => ({ ok: false, output: "" }));
  if (unstaged.output.trim()) return unstaged.output.slice(0, 4000);
  const staged = await runner
    .runShellCommand(
      runner.rawDirectory,
      buildGitCommand([
        "--no-optional-locks",
        "-c",
        "core.checkStat=minimal",
        "-c",
        "core.autocrlf=true",
        "diff",
        "--cached",
        "--ignore-cr-at-eol",
        "--",
        rel,
      ]),
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
