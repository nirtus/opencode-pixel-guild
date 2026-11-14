import { existsSync, readFileSync, rmSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { normalizeLocationDirectory, resolveLocalProjectDir } from "../state/location-normalization.ts";
import {
  clearStaleGitIndexLock, enqueueRepoMutation, extractGitErrorMessage, getCachedGitStatus,
  type GitSyncResult, type GitWorkingTreePort, invalidateGitStatusCache,
  peekCachedGitStatus, type RoomGitFileEntry, type RoomGitWorkingTreeState, runGitAsync,
  type ScannedGitStatus, scanGitStatusAsync, scanGitStatusSync,
} from "./git-status-scanner.ts";

export {
  getCachedGitStatus,
  type GitSyncResult, type GitWorkingTreePort, invalidateGitStatusCache, peekCachedGitStatus,
  type RoomGitFileEntry, type RoomGitWorkingTreeState, type ScannedGitStatus, scanGitStatusAsync, scanGitStatusSync,
};

export function isSafeGitRefName(ref: string | null | undefined): boolean {
  return Boolean(ref && /^[A-Za-z0-9._/-]+$/.test(ref) && !ref.startsWith("-") && !ref.includes(".."));
}

export function createLiveGitWorkingTreeAdapter(): GitWorkingTreePort {
  invalidateGitStatusCache();
  const draftsByRoom = new Map<
    string,
    { title: string; body: string; lastCommittedAtMs: number | null }
  >();

  function buildStateFromScanned(
    roomDir: string,
    scanned: ScannedGitStatus,
    lastError: string | null = null,
  ): RoomGitWorkingTreeState {
    const roomKey = normalizeLocationDirectory(roomDir);
    const draft = draftsByRoom.get(roomKey) ?? {
      title: "",
      body: "",
      lastCommittedAtMs: null,
    };
    return {
      isGitRepo: scanned.isGitRepo,
      branch: scanned.branch,
      upstream: scanned.upstream ?? null,
      ahead: scanned.ahead ?? 0,
      behind: scanned.behind ?? 0,
      headCommit: scanned.headCommit,
      isClean: scanned.files.length === 0,
      files: scanned.files,
      draftCommitTitle: draft.title,
      draftCommitBody: draft.body,
      lastCommittedAtMs: draft.lastCommittedAtMs,
      lastError,
    };
  }

  async function buildStateAsync(
    roomDir: string,
    lastError: string | null = null,
    options?: { force?: boolean },
  ): Promise<RoomGitWorkingTreeState> {
    const scanned = options?.force
      ? await scanGitStatusAsync(roomDir, { force: true })
      : (getCachedGitStatus(roomDir) ?? (await scanGitStatusAsync(roomDir)));
    return buildStateFromScanned(roomDir, scanned, lastError);
  }

  return {
    async getStatus(roomDir) {
      return buildStateAsync(roomDir);
    },
    async syncRepository(roomDir, options) {
      const resolved = resolveLocalProjectDir(roomDir, existsSync);
      if (!resolved) {
        const msg = "Project directory not found on host";
        return { ok: false, error: msg, state: await buildStateAsync(roomDir, msg, { force: true }) };
      }
      return enqueueRepoMutation(resolved, async () => {
        clearStaleGitIndexLock(resolved);
        invalidateGitStatusCache(roomDir);
        const before = await scanGitStatusAsync(roomDir, { force: true });
        if (!before.isGitRepo) {
          const msg = "Selected project is not a Git repository";
          return { ok: false, error: msg, state: buildStateFromScanned(roomDir, before, msg) };
        }
        let syncedRemote = false;
        let pulled = false;
        let pushed = false;
        let syncWarning: string | null = null;
        let latestScanned = before;
        let needsFinalScan = false;
        const remotesRaw = await runGitAsync(resolved, ["remote"], 5000).catch(() => "");
        const remotes = remotesRaw.split(/\r?\n/).map((r) => r.trim()).filter(Boolean);
        if (remotes.length > 0 && before.branch && before.branch !== "HEAD") {
          const remoteName = before.upstream?.split("/")[0] || (remotes.includes("origin") ? "origin" : remotes[0]!);
          if (!isSafeGitRefName(remoteName) || !isSafeGitRefName(before.branch)) {
            syncWarning = "Unsafe git remote or branch name";
          } else {
            let preferRemoteShell = Boolean(options?.runRemoteCommand && existsSync("/.dockerenv"));
            const tryGitOrRemote = async (gitArgs: string[], shellCmd: string) => {
              if (!preferRemoteShell) {
                try {
                  await runGitAsync(resolved, gitArgs, 15_000);
                  return { ok: true, error: null };
                } catch (localErr) {
                  const msg = extractGitErrorMessage(localErr, "Git remote operation failed");
                  if (!options?.runRemoteCommand) return { ok: false, error: msg };
                  preferRemoteShell = true;
                }
              }
              if (options?.runRemoteCommand) {
                const fb = await options.runRemoteCommand(roomDir, shellCmd).catch(() => ({ ok: false, output: "Git remote operation failed" }));
                if (fb.ok) return { ok: true, error: null };
                return { ok: false, error: fb.output || "Git remote operation failed" };
              }
              return { ok: false, error: "Git remote operation failed" };
            };
            const winGit = "/mnt/c/Program Files/Git/cmd/git.exe";
            const gcm = "/mnt/c/Program\\ Files/Git/mingw64/bin/git-credential-manager.exe";
            const fallbackGit = `GIT_TERMINAL_PROMPT=0 GCM_INTERACTIVE=never git -c core.filemode=false -c core.autocrlf=true -c 'credential.helper=${gcm}'`;
            const buildHostGitCmd = (subCmd: string) =>
              `run_git() { if [ -x "${winGit}" ] && pwd | grep -q '^/mnt/[a-zA-Z]'; then "${winGit}" "$@" || "${winGit}" "$@"; else ${fallbackGit} "$@" || ${fallbackGit} "$@"; fi; }; run_git ${subCmd}`;
            const fetchRes = await tryGitOrRemote(["fetch", "--prune", remoteName], buildHostGitCmd(`fetch --prune ${remoteName}`));
            if (fetchRes.ok) {
              syncedRemote = true;
              invalidateGitStatusCache(roomDir);
              latestScanned = await scanGitStatusAsync(roomDir, { force: true });
              if ((latestScanned.behind ?? 0) > 0) {
                if (!isSafeGitRefName(latestScanned.branch)) {
                  syncWarning = "Unsafe git remote or branch name";
                } else {
                  const pullRes = await tryGitOrRemote(
                    ["-c", "core.filemode=false", "-c", "core.autocrlf=true", "pull", "--rebase", "--autostash", remoteName, latestScanned.branch!],
                    `${buildHostGitCmd(`pull --rebase --autostash ${remoteName} ${latestScanned.branch!}`)} || (git rebase --abort >/dev/null 2>&1; exit 1)`,
                  );
                  if (pullRes.ok) {
                    pulled = true;
                    invalidateGitStatusCache(roomDir);
                    latestScanned = await scanGitStatusAsync(roomDir, { force: true });
                  } else {
                    await runGitAsync(resolved, ["rebase", "--abort"], 5000).catch(() => {});
                    syncWarning = pullRes.error;
                    needsFinalScan = true;
                  }
                }
              }
              const curAhead = latestScanned.ahead ?? before.ahead ?? 0;
              if (!syncWarning && curAhead > 0) {
                if (!latestScanned.upstream && !isSafeGitRefName(latestScanned.branch)) {
                  syncWarning = "Unsafe git remote or branch name";
                } else {
                  const pushArgs = latestScanned.upstream ? ["push"] : ["push", "-u", remoteName, latestScanned.branch!];
                  const pushCmd = latestScanned.upstream ? buildHostGitCmd("push") : buildHostGitCmd(`push -u ${remoteName} ${latestScanned.branch!}`);
                  const pushRes = await tryGitOrRemote(pushArgs, pushCmd);
                  if (pushRes.ok) {
                    pushed = true;
                    needsFinalScan = true;
                  } else {
                    syncWarning = pushRes.error;
                  }
                }
              }
            } else {
              syncWarning = fetchRes.error;
            }
          }
        }
        if (needsFinalScan) {
          invalidateGitStatusCache(roomDir);
          latestScanned = await scanGitStatusAsync(roomDir, { force: true });
        }
        const nextState = buildStateFromScanned(roomDir, latestScanned, syncWarning);
        return {
          ok: !syncWarning,
          syncedRemote,
          pulled,
          pushed,
          ...(syncWarning ? { error: syncWarning } : {}),
          state: nextState,
        };
      });
    },
    async getFileDiff(roomDir, filePath) {
      const resolved = resolveLocalProjectDir(roomDir, existsSync);
      if (!resolved || !filePath || filePath.startsWith("-")) return "";
      try {
        const resolvedRoot = resolve(resolved);
        const fullUntracked = resolve(resolvedRoot, filePath);
        const rel = relative(resolvedRoot, fullUntracked).replace(/\\/g, "/");
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
        const unstagedDiff = await runGitAsync(
          resolved,
          ["--no-optional-locks", "-c", "core.checkStat=minimal", "-c", "core.autocrlf=true", "diff", "--ignore-cr-at-eol", "--", rel],
          6000,
        ).catch(() => "");
        const diff =
          unstagedDiff ||
          (await runGitAsync(
            resolved,
            ["--no-optional-locks", "-c", "core.checkStat=minimal", "-c", "core.autocrlf=true", "diff", "--cached", "--ignore-cr-at-eol", "--", rel],
            6000,
          ).catch(() => ""));
        if (diff) return diff.slice(0, 4000);
        if (existsSync(fullUntracked) && statSync(fullUntracked).isFile()) {
          const raw = readFileSync(fullUntracked, "utf8").slice(0, 2400);
          return `--- /dev/null\n+++ b/${rel}\n${raw
            .split(/\r?\n/)
            .map((l: string) => `+${l}`)
            .join("\n")}`.slice(0, 4000);
        }
        return "";
      } catch {
        return "";
      }
    },
    async stageFiles(roomDir, paths) {
      const resolved = resolveLocalProjectDir(roomDir, existsSync);
      if (!resolved) return buildStateAsync(roomDir, "Project directory not found on host");
      return enqueueRepoMutation(resolved, async () => {
        clearStaleGitIndexLock(resolved);
        let lastError: string | null = null;
        try {
          if (paths === "all") {
            try {
              await runGitAsync(resolved, ["-c", "core.autocrlf=true", "add", "-A"], 10_000);
            } catch {
              const cur = getCachedGitStatus(roomDir) ?? (await scanGitStatusAsync(roomDir));
              const targetPaths = cur.files.map((f) => f.path);
              if (targetPaths.length > 0) {
                await runGitAsync(resolved, ["-c", "core.autocrlf=true", "add", "--", ...targetPaths], 10_000);
              }
            }
          } else if (paths.length > 0) {
            await runGitAsync(resolved, ["-c", "core.autocrlf=true", "add", "--", ...paths], 10_000);
          }
        } catch (err) {
          lastError = extractGitErrorMessage(err, "Failed to stage files");
        }
        invalidateGitStatusCache(roomDir);
        return buildStateAsync(roomDir, lastError, { force: true });
      });
    },
    async unstageFiles(roomDir, paths) {
      const resolved = resolveLocalProjectDir(roomDir, existsSync);
      if (!resolved) return buildStateAsync(roomDir, "Project directory not found on host");
      return enqueueRepoMutation(resolved, async () => {
        clearStaleGitIndexLock(resolved);
        let lastError: string | null = null;
        try {
          if (paths === "all") {
            try {
              await runGitAsync(resolved, ["reset", "HEAD"], 10_000);
            } catch {
              await runGitAsync(resolved, ["rm", "--cached", "-r", "."], 10_000);
            }
          } else if (paths.length > 0) {
            try {
              await runGitAsync(resolved, ["reset", "HEAD", "--", ...paths], 10_000);
            } catch {
              await runGitAsync(resolved, ["rm", "--cached", "--", ...paths], 10_000);
            }
          }
        } catch (err) {
          lastError = extractGitErrorMessage(err, "Failed to unstage files");
        }
        invalidateGitStatusCache(roomDir);
        return buildStateAsync(roomDir, lastError, { force: true });
      });
    },
    async updateDraft(roomDir, title, body = "") {
      const roomKey = normalizeLocationDirectory(roomDir);
      const prev = draftsByRoom.get(roomKey);
      draftsByRoom.set(roomKey, {
        title,
        body,
        lastCommittedAtMs: prev?.lastCommittedAtMs ?? null,
      });
      const scanned = peekCachedGitStatus(roomDir) ?? (await scanGitStatusAsync(roomDir));
      return buildStateFromScanned(roomDir, scanned);
    },
    async discardFiles(roomDir, paths) {
      const resolved = resolveLocalProjectDir(roomDir, existsSync);
      if (!resolved) return buildStateAsync(roomDir, "Project directory not found on host");
      return enqueueRepoMutation(resolved, async () => {
        clearStaleGitIndexLock(resolved);
        const current = getCachedGitStatus(roomDir) ?? (await scanGitStatusAsync(roomDir));
        const rawTargets = paths === "all" ? current.files.map((f) => f.path) : [...paths];
        const cleaned = rawTargets.map((p) => p.trim()).filter(Boolean);
        let lastError: string | null = null;
        const untrackedPaths: string[] = [];
        const trackedPaths: string[] = [];
        for (const relPath of cleaned) {
          const entry = current.files.find((f) => f.path === relPath);
          if (entry && entry.indexStatus === "?" && entry.worktreeStatus === "?") {
            untrackedPaths.push(relPath);
          } else {
            trackedPaths.push(relPath);
          }
        }
        for (const relPath of untrackedPaths) {
          try {
            rmSync(join(resolved, relPath), { force: true, recursive: true });
          } catch (err) {
            lastError = extractGitErrorMessage(err, `Failed to discard ${relPath}`);
          }
        }
        if (trackedPaths.length > 0) {
          try {
            try {
              await runGitAsync(resolved, ["reset", "-q", "HEAD", "--", ...trackedPaths], 10_000);
            } catch { /* Ignore unstage error before checkout */ }
            await runGitAsync(resolved, ["checkout", "--", ...trackedPaths], 10_000);
          } catch (err) {
            lastError = extractGitErrorMessage(err, "Failed to discard tracked files");
          }
        }
        invalidateGitStatusCache(roomDir);
        return buildStateAsync(roomDir, lastError, { force: true });
      });
    },
    async createCommit(roomDir, title, body = "") {
      const resolved = resolveLocalProjectDir(roomDir, existsSync);
      const roomKey = normalizeLocationDirectory(roomDir);
      const draft = draftsByRoom.get(roomKey);
      const cleanTitle = (title || draft?.title || "").trim();
      const cleanBody = (body || draft?.body || "").trim();
      if (!resolved || !cleanTitle) {
        const msg = "Commit title and valid Git repository are required";
        return { ok: false, error: msg, state: await buildStateAsync(roomDir, msg) };
      }
      return enqueueRepoMutation(resolved, async () => {
        clearStaleGitIndexLock(resolved);
        try {
          invalidateGitStatusCache(roomDir);
          const before = await scanGitStatusAsync(roomDir, { force: true });
          if (!before.isGitRepo) {
            const msg = "Selected project is not a Git repository";
            return { ok: false, error: msg, state: buildStateFromScanned(roomDir, before, msg) };
          }
          if (before.files.length === 0) {
            const msg = "Working tree is clean — nothing to commit";
            return { ok: false, error: msg, state: buildStateFromScanned(roomDir, before, msg) };
          }
          if (!before.files.some((f) => f.staged)) {
            try {
              await runGitAsync(resolved, ["-c", "core.autocrlf=true", "add", "-A"], 10_000);
            } catch {
              const targetPaths = before.files.map((f) => f.path);
              await runGitAsync(resolved, ["-c", "core.autocrlf=true", "add", "--", ...targetPaths], 10_000);
            }
          }
          const commitArgs = ["commit", "-m", cleanTitle];
          if (cleanBody) commitArgs.push("-m", cleanBody);
          try {
            await runGitAsync(resolved, commitArgs, 10_000);
          } catch (commitErr) {
            const msg = extractGitErrorMessage(commitErr, "");
            if (/author identity unknown|please tell me who you are/i.test(msg)) {
              await runGitAsync(
                resolved,
                ["-c", "user.name=Guild Operator", "-c", "user.email=guild@opencode.local", ...commitArgs],
                10_000,
              );
            } else {
              throw commitErr;
            }
          }
          invalidateGitStatusCache(roomDir);
          draftsByRoom.set(roomKey, { title: "", body: "", lastCommittedAtMs: Date.now() });
          const nextState = await buildStateAsync(roomDir, null, { force: true });
          return {
            ok: true,
            commitHash: nextState.headCommit?.hash,
            subject: nextState.headCommit?.subject ?? cleanTitle,
            state: nextState,
          };
        } catch (err) {
          const errMsg = extractGitErrorMessage(err, "git commit failed");
          invalidateGitStatusCache(roomDir);
          return { ok: false, error: errMsg, state: await buildStateAsync(roomDir, errMsg, { force: true }) };
        }
      });
    },
  };
}
