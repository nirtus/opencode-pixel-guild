import { existsSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  BLUEPRINT_READY_TASK_PROGRESS,
  deriveRoomTaskProgressForGitState,
  deriveWorkingTreeTaskProgressFromGitState,
  invalidateGitStatusCache,
  retireCompletedFeatureSlug,
  type GitWorkingTreePort,
  type RoomGitWorkingTreeState,
} from "../ingress/index.ts";
import { normalizeLocationDirectory, resolveLocalProjectDir } from "../state/index.ts";
import {
  type GuildApiRouterContext,
  readJsonBody,
  sendJson,
} from "./api-router.ts";

export async function tryHandleGuildGitRoute(
  req: IncomingMessage,
  res: ServerResponse,
  urlObj: URL,
  ctx: GuildApiRouterContext,
  gitAdapter: GitWorkingTreePort,
): Promise<boolean> {
  const method = req.method ?? "GET";
  const pathname = urlObj.pathname;
  if (pathname !== "/api/guild/git") return false;
  if (ctx.authenticated === false) {
    sendJson(res, 401, { ok: false, error: "Authentication required" });
    return true;
  }

  const activeReducer = ctx.getReducer();
  const snapshot = activeReducer.getSnapshot();

  function resolveSelectedRoomDirectory(
    rawRoomId: string | null | undefined,
  ): {
    roomId: string;
    directory: string;
  } | null {
    const candidate = rawRoomId?.trim();
    if (!candidate || candidate === "/guild") {
      return null;
    }
    const norm = normalizeLocationDirectory(candidate);
    const allRooms = Object.values(snapshot.rooms ?? {});
    const room =
      snapshot.rooms[norm] ??
      snapshot.rooms[candidate] ??
      allRooms.find(
        (r) =>
          (r.projectId === candidate ||
            r.projectId === norm ||
            r.locationDirectory === candidate ||
            normalizeLocationDirectory(r.locationDirectory) === norm) &&
          !r.isWorktree,
      ) ??
      allRooms.find(
        (r) =>
          r.projectId === candidate ||
          r.projectId === norm ||
          r.locationDirectory === candidate ||
          normalizeLocationDirectory(r.locationDirectory) === norm,
      );
    if (!room) {
      return null;
    }
    if (
      room.isWorktree &&
      room.parentProjectDirectory &&
      !resolveLocalProjectDir(room.locationDirectory || room.roomId, existsSync)
    ) {
      const parentRoom =
        snapshot.rooms[normalizeLocationDirectory(room.parentProjectDirectory)] ??
        snapshot.rooms[room.parentProjectDirectory];
      if (parentRoom) {
        return {
          roomId: parentRoom.roomId,
          directory: parentRoom.locationDirectory || parentRoom.roomId,
        };
      }
    }
    return {
      roomId: room.roomId,
      directory: room.locationDirectory || room.roomId,
    };
  }

  function formatTaskProgressSig(
    prog:
      | {
          source: string;
          featureSlug: string | null;
          resolvedTasks: number;
          totalTasks: number;
          tasks?: ReadonlyArray<{ id: string; title: string; status: string }>;
        }
      | null
      | undefined,
  ): string {
    if (!prog) return "";
    return `${prog.source}:${prog.featureSlug}:${prog.resolvedTasks}/${prog.totalTasks}:${(prog.tasks ?? []).map((t) => `${t.id}:${t.title}:${t.status}`).join(",")}`;
  }

  function syncRoomTaskProgress(
    roomId: string,
    directory: string,
    state: RoomGitWorkingTreeState,
    options?: { isCommitCompleted?: boolean },
  ): void {
    const curRoom = activeReducer.getSnapshot().rooms[roomId];
    const prevProg = curRoom?.taskProgress;

    if (options?.isCommitCompleted) {
      if (prevProg?.featureSlug) {
        retireCompletedFeatureSlug(prevProg.featureSlug);
      }
      const nowMs = Date.now();
      const nextTaskProgress = state.isClean
        ? { ...BLUEPRINT_READY_TASK_PROGRESS, hydratedAtMs: nowMs }
        : deriveWorkingTreeTaskProgressFromGitState(state);
      activeReducer.dispatch({
        type: "tasks.hydrated",
        timestampMs: nowMs,
        roomId,
        locationDirectory: directory,
        taskProgress: nextTaskProgress,
      });
      return;
    }

    if (state.isClean && prevProg?.source === "docs/features" && prevProg.featureSlug) {
      retireCompletedFeatureSlug(prevProg.featureSlug);
    }
    const nextProg = state.isClean
      ? BLUEPRINT_READY_TASK_PROGRESS
      : deriveRoomTaskProgressForGitState(directory, state);
    if (formatTaskProgressSig(prevProg) !== formatTaskProgressSig(nextProg)) {
      activeReducer.dispatch({
        type: "tasks.hydrated",
        timestampMs: Date.now(),
        roomId,
        locationDirectory: directory,
        taskProgress: nextProg,
      });
    }
  }

  function sendMissingRoomError(rawRoomId: string | null | undefined): void {
    const trimmed = rawRoomId?.trim();
    const hasCandidate = Boolean(trimmed && trimmed !== "/guild");
    sendJson(res, hasCandidate ? 404 : 400, {
      ok: false,
      error: hasCandidate
        ? `Registered project room not found: ${trimmed}`
        : "A selected project roomId is required for Assembly & Commit Git operations",
    });
  }

  if (method === "GET") {
    const rawRoomId =
      urlObj.searchParams.get("roomId") ??
      urlObj.searchParams.get("directory") ??
      urlObj.searchParams.get("projectId");
    const filePath = urlObj.searchParams.get("file");
    const target = resolveSelectedRoomDirectory(rawRoomId);
    if (!target) {
      sendMissingRoomError(rawRoomId);
      return true;
    }
    const { roomId, directory } = target;
    if (!filePath && urlObj.searchParams.get("refresh") === "1") {
      invalidateGitStatusCache(directory);
    }
    const state = await gitAdapter.getStatus(directory);
    if (!filePath) {
      syncRoomTaskProgress(roomId, directory, state);
    }
    const diff = filePath
      ? await gitAdapter.getFileDiff(directory, filePath)
      : undefined;
    sendJson(res, 200, {
      ok: true,
      roomId,
      directory,
      state,
      ...(filePath ? { diff } : { snapshot: activeReducer.getSnapshot() }),
    });
    return true;
  }

  if (method === "POST") {
    try {
      const body = await readJsonBody(req);
      const action = typeof body.action === "string" ? body.action : "git.status";
      const rawRoomId =
        typeof body.roomId === "string"
          ? body.roomId
          : typeof body.directory === "string"
            ? body.directory
            : typeof body.projectId === "string"
              ? body.projectId
              : null;
      if (
        (action === "git.sync" || action === "git.status") &&
        rawRoomId?.trim().toLowerCase() === "all"
      ) {
        const primaryRooms = Object.values(snapshot.rooms ?? {}).filter((r) => !r.isWorktree);
        const runRemoteCommand = (
          ctx.daemonClient as
            | { runShellCommand?: (d: string, c: string) => Promise<{ ok: boolean; output: string }> }
            | undefined
        )?.runShellCommand?.bind(ctx.daemonClient);
        let anyPulled = false;
        let anyPushed = false;
        let anySynced = false;
        let firstError: string | null = null;
        for (const r of primaryRooms) {
          const dir = r.locationDirectory || r.roomId;
          invalidateGitStatusCache(dir);
          if (action === "git.sync" && gitAdapter.syncRepository) {
            const sr = await gitAdapter.syncRepository(dir, { runRemoteCommand });
            if (sr.state.isGitRepo) {
              syncRoomTaskProgress(r.roomId, dir, sr.state);
              if (sr.syncedRemote) anySynced = true;
              if (sr.pulled) anyPulled = true;
              if (sr.pushed) anyPushed = true;
              if (sr.error && !firstError) firstError = `${r.projectName}: ${sr.error}`;
            }
          } else {
            const st = await gitAdapter.getStatus(dir);
            if (st.isGitRepo) syncRoomTaskProgress(r.roomId, dir, st);
          }
        }
        sendJson(res, 200, {
          ok: !firstError,
          syncedRemote: anySynced,
          pulled: anyPulled,
          pushed: anyPushed,
          ...(firstError ? { error: firstError } : {}),
          roomId: "all",
          snapshot: activeReducer.getSnapshot(),
        });
        return true;
      }
      const target = resolveSelectedRoomDirectory(rawRoomId);
      if (!target) {
        sendMissingRoomError(rawRoomId);
        return true;
      }
      const { roomId, directory } = target;
      const paths: readonly string[] | "all" =
        body.paths === "all"
          ? "all"
          : Array.isArray(body.paths)
            ? body.paths.map(String)
            : [];

      if (action === "git.sync" || action === "git.status") {
        invalidateGitStatusCache(directory);
        if (action === "git.sync" && gitAdapter.syncRepository) {
          const runRemoteCommand = (ctx.daemonClient as { runShellCommand?: (d: string, c: string) => Promise<{ ok: boolean; output: string }> } | undefined)?.runShellCommand?.bind(ctx.daemonClient);
          const syncRes = await gitAdapter.syncRepository(directory, { runRemoteCommand });
          syncRoomTaskProgress(roomId, directory, syncRes.state);
          sendJson(res, 200, {
            ...syncRes,
            roomId,
            snapshot: activeReducer.getSnapshot(),
          });
          return true;
        }
        const state = await gitAdapter.getStatus(directory);
        syncRoomTaskProgress(roomId, directory, state);
        sendJson(res, 200, {
          ok: true,
          roomId,
          state,
          snapshot: activeReducer.getSnapshot(),
        });
        return true;
      }

      if (action === "git.diff") {
        const filePath =
          typeof body.filePath === "string" ? body.filePath : "";
        const diff = filePath
          ? await gitAdapter.getFileDiff(directory, filePath)
          : "";
        const state = await gitAdapter.getStatus(directory);
        sendJson(res, 200, { ok: true, roomId, filePath, diff, state });
        return true;
      }

      if (action === "git.stage") {
        const state = await gitAdapter.stageFiles(directory, paths);
        syncRoomTaskProgress(roomId, directory, state);
        sendJson(res, 200, {
          ok: !state.lastError,
          ...(state.lastError ? { error: state.lastError } : {}),
          roomId,
          state,
          snapshot: activeReducer.getSnapshot(),
        });
        return true;
      }

      if (action === "git.unstage") {
        const state = await gitAdapter.unstageFiles(directory, paths);
        syncRoomTaskProgress(roomId, directory, state);
        sendJson(res, 200, {
          ok: !state.lastError,
          ...(state.lastError ? { error: state.lastError } : {}),
          roomId,
          state,
          snapshot: activeReducer.getSnapshot(),
        });
        return true;
      }

      if (action === "git.draft.update" || action === "git.draft.clear") {
        const title =
          action === "git.draft.clear"
            ? ""
            : typeof body.title === "string"
              ? body.title
              : "";
        const draftBody =
          action === "git.draft.clear"
            ? ""
            : typeof body.body === "string"
              ? body.body
              : "";
        const state = await gitAdapter.updateDraft(directory, title, draftBody);
        sendJson(res, 200, { ok: true, roomId, state });
        return true;
      }

      if (action === "git.discard") {
        const state = await gitAdapter.discardFiles(directory, paths);
        syncRoomTaskProgress(roomId, directory, state);
        sendJson(res, 200, {
          ok: !state.lastError,
          ...(state.lastError ? { error: state.lastError } : {}),
          roomId,
          state,
          snapshot: activeReducer.getSnapshot(),
        });
        return true;
      }

      if (action === "git.commit") {
        const title = typeof body.title === "string" ? body.title : "";
        const commitBody = typeof body.body === "string" ? body.body : "";
        const result = await gitAdapter.createCommit(
          directory,
          title,
          commitBody,
        );
        if (result.ok) {
          syncRoomTaskProgress(roomId, directory, result.state, {
            isCommitCompleted: true,
          });
        }
        sendJson(res, result.ok ? 200 : 400, {
          ...result,
          roomId,
          snapshot: activeReducer.getSnapshot(),
        });
        return true;
      }

      sendJson(res, 400, { ok: false, error: `Unknown git action: ${action}` });
      return true;
    } catch (err) {
      const status = (err as { statusCode?: number })?.statusCode ?? 400;
      sendJson(res, status, {
        ok: false,
        error: err instanceof Error ? err.message : "Invalid git request body",
      });
      return true;
    }
  }

  return false;
}
