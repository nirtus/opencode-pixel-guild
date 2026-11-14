import type { IncomingMessage, ServerResponse } from "node:http";
import type {
  DeleteRoomResourcesResult,
  OpenCodeClientAdapter,
  OpenCodeDaemonClientPort,
} from "../ingress/index.ts";
import {
  DEMO_SCENARIO_PRESETS,
  type DemoScenarioPresetId,
  type DemoScenarioRunResult,
} from "../simulator/demo-guild-simulator.ts";
import { normalizeLocationDirectory } from "../state/world-reducer.ts";
import type {
  GuildStateEmission,
  TelemetryAdapterKind,
  WorldStateReducer,
} from "../types/domain.ts";
import { handleGuildCommandRoute } from "./command-router.ts";
import {
  handleAddRoomRoute,
  handleGetWorkspaceFoldersRoute,
} from "./workspace-folder-routes.ts";

export interface GuildApiRouterContext {
  readonly authenticated?: boolean;
  readonly daemonUrl: string;
  readonly sseClients: Set<ServerResponse>;
  getReducer(): WorldStateReducer;
  getActiveAdapter?(): TelemetryAdapterKind;
  activatePreset(presetId: DemoScenarioPresetId): DemoScenarioRunResult;
  readonly clientAdapter?: OpenCodeClientAdapter;
  readonly daemonClient?:
    | Pick<OpenCodeDaemonClientPort, "deleteSession" | "deleteRoomResources" | "executeCommand">
    | OpenCodeDaemonClientPort;
  readonly onRefresh?: () => Promise<unknown> | void;
}

export function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

const MAX_JSON_BODY_BYTES = 1_048_576;

export function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolveBody, rejectBody) => {
    const chunks: Buffer[] = [];
    let bytes = 0;
    let tooLarge = false;
    req.on("data", (chunk: Buffer | string) => {
      if (tooLarge) return;
      const buf = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
      bytes += buf.length;
      if (bytes > MAX_JSON_BODY_BYTES) {
        tooLarge = true;
        chunks.length = 0;
        rejectBody(Object.assign(new Error("Payload too large"), { statusCode: 413 }));
        return;
      }
      chunks.push(buf);
    });
    req.on("end", () => {
      if (tooLarge) return;
      if (chunks.length === 0) {
        resolveBody({});
        return;
      }
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        resolveBody(typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {});
      } catch (err) {
        rejectBody(err);
      }
    });
    req.on("error", (err) => {
      if (!tooLarge) rejectBody(err);
    });
  });
}

export async function tryHandleGuildApiRoute(
  req: IncomingMessage,
  res: ServerResponse,
  urlObj: URL,
  ctx: GuildApiRouterContext,
): Promise<boolean> {
  const method = req.method ?? "GET";
  const pathname = urlObj.pathname;
  const activeReducer = ctx.getReducer();

  if (method === "GET" && pathname === "/api/guild/snapshot") {
    const snap = activeReducer.getSnapshot();
    sendJson(res, 200, ctx.authenticated !== undefined ? { ...snap, authenticated: ctx.authenticated } : snap);
    return true;
  }

  if (method === "GET" && pathname === "/api/guild/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });

    const snap = activeReducer.getSnapshot();
    const initialEmission: GuildStateEmission = {
      snapshot: snap,
      delta: {
        version: snap.version,
        timestampMs: Date.now(),
        kind: "stream.connected",
        roomId: null,
        sessionId: null,
        description: "Connected to OpenCode Pixel Guild SSE stream",
        changedRoomIds: [],
        changedCharacterIds: [],
      },
    };
    res.write(`data: ${JSON.stringify(initialEmission)}\n\n`);
    ctx.sseClients.add(res);
    const keepAliveTimer = setInterval(() => {
      if (res.writableEnded) return;
      try {
        res.write(": keepalive\n\n");
      } catch {
        ctx.sseClients.delete(res);
      }
    }, 15_000);
    keepAliveTimer.unref?.();
    req.on("close", () => {
      clearInterval(keepAliveTimer);
      ctx.sseClients.delete(res);
    });
    return true;
  }

  const sessionMessagesMatch = /^\/api\/guild\/session\/([^/]+)\/messages$/.exec(pathname);
  const deleteSessionMatch = /^\/api\/guild\/session\/([^/]+)$/.exec(pathname);
  const deleteRoomPathMatch = /^\/api\/guild\/room\/(.+)$/.exec(pathname);
  const isProtectedGuildRoute =
    (method === "POST" &&
      (pathname === "/api/guild/refresh" ||
        pathname === "/api/guild/preset" ||
        pathname === "/api/guild/scenario" ||
        pathname === "/api/guild/adapter" ||
        pathname === "/api/guild/room" ||
        pathname === "/api/guild/command")) ||
    (method === "GET" && (pathname === "/api/guild/workspace-folders" || Boolean(sessionMessagesMatch))) ||
    (method === "DELETE" && (pathname === "/api/guild/room" || Boolean(deleteRoomPathMatch) || Boolean(deleteSessionMatch)));

  if (isProtectedGuildRoute && ctx.authenticated === false) {
    sendJson(res, 401, { ok: false, error: "Authentication required" });
    return true;
  }

  if (method === "POST" && pathname === "/api/guild/refresh") {
    try {
      if (ctx.onRefresh) {
        await ctx.onRefresh();
      } else if (ctx.clientAdapter) {
        await ctx.clientAdapter.sweepAllLocations(false);
      }
      sendJson(res, 200, { snapshot: activeReducer.getSnapshot() });
    } catch (err) {
      sendJson(res, 500, {
        error: err instanceof Error ? err.message : "Failed to refresh live OpenCode state",
      });
    }
    return true;
  }

  if (method === "POST" && (pathname === "/api/guild/preset" || pathname === "/api/guild/scenario")) {
    try {
      const body = await readJsonBody(req);
      const rawPresetId =
        (typeof body.presetId === "string" ? body.presetId : null) ??
        urlObj.searchParams.get("presetId") ??
        "cohabited-guild-hall";

      if (!(rawPresetId in DEMO_SCENARIO_PRESETS)) {
        sendJson(res, 400, { error: `Unknown presetId: ${rawPresetId}` });
        return true;
      }

      const runResult = ctx.activatePreset(rawPresetId as DemoScenarioPresetId);
      sendJson(res, 200, { presetId: runResult.preset.id, snapshot: runResult.snapshot });
    } catch (err) {
      const status = (err as { statusCode?: number })?.statusCode ?? 400;
      sendJson(res, status, { error: err instanceof Error ? err.message : "Invalid request body" });
    }
    return true;
  }

  if (method === "POST" && pathname === "/api/guild/adapter") {
    try {
      const body = await readJsonBody(req);
      const adapter = typeof body.adapter === "string" ? (body.adapter as TelemetryAdapterKind) : "demo-simulator";
      const emission = activeReducer.dispatch({
        type: "adapter.switched",
        timestampMs: Date.now(),
        adapter,
        daemonUrl: typeof body.daemonUrl === "string" ? body.daemonUrl : ctx.daemonUrl,
      });
      sendJson(res, 200, { snapshot: emission.snapshot });
    } catch (err) {
      const status = (err as { statusCode?: number })?.statusCode ?? 400;
      sendJson(res, status, { error: err instanceof Error ? err.message : "Invalid adapter body" });
    }
    return true;
  }

  if (method === "GET" && sessionMessagesMatch) {
    const sessionId = decodeURIComponent(sessionMessagesMatch[1]);
    try {
      const char = activeReducer.getSnapshot().characters[sessionId];
      const dir = char?.locationDirectory ?? urlObj.searchParams.get("directory") ?? undefined;
      if (char && (ctx.daemonClient as OpenCodeDaemonClientPort | undefined)?.getSessionMessages) {
        const hydrated = await (ctx.daemonClient as OpenCodeDaemonClientPort).getSessionMessages!(sessionId, dir);
        const charNow = activeReducer.getSnapshot().characters[sessionId];
        if (hydrated && charNow) {
          const locationDirectory = dir ?? charNow.roomId ?? "/";
          const pq = hydrated.pendingQuestion;
          const pqDone = Boolean(pq && hydrated.recentTools?.some((t) => t.status === "completed" && (t.callId === pq.gateId || t.toolName.trim().toLowerCase() === "question")));
          activeReducer.dispatch({
            type: "session.upserted", timestampMs: Date.now(), sessionId,
            locationDirectory, preserveActivityTimestamp: true,
            lastAssistantText: pqDone ? undefined : hydrated.lastAssistantText, lastUserPromptText: hydrated.lastUserPromptText,
            messages: hydrated.messages, recentTools: hydrated.recentTools,
          } as any);
          const charAfter = activeReducer.getSnapshot().characters[sessionId];
          const lastRole = charAfter?.messages?.[charAfter.messages.length - 1]?.role;
          if (pq && !pqDone && lastRole !== "user") {
            activeReducer.dispatch({
              type: "question.requested", timestampMs: Date.now(), sessionId, locationDirectory,
              gateId: pq.gateId, title: pq.title || "Waiting for User Input",
              reason: pq.reason, prompt: pq.reason, source: pq.source, fields: pq.fields,
            } as any);
          }
        }
      }
    } catch {
      // Return current snapshot if daemon message fetch fails
    }
    const snapAfter = activeReducer.getSnapshot();
    sendJson(res, 200, { ok: true, messages: snapAfter.characters[sessionId]?.messages ?? [], snapshot: snapAfter });
    return true;
  }

  if (method === "DELETE" && deleteSessionMatch) {
    const sessionId = decodeURIComponent(deleteSessionMatch[1]);
    try {
      const snapBefore = activeReducer.getSnapshot();
      const targetChar = snapBefore.characters[sessionId];
      const locationDirectory = targetChar?.locationDirectory ?? urlObj.searchParams.get("directory") ?? urlObj.searchParams.get("location[directory]") ?? undefined;
      const emission = activeReducer.dispatch({ type: "session.deleted", timestampMs: Date.now(), sessionId, locationDirectory });
      const deletedIds = emission.delta.changedCharacterIds.length > 0 ? emission.delta.changedCharacterIds : [sessionId];
      ctx.clientAdapter?.evictDeletedSessions?.(deletedIds);
      const delResults = ctx.daemonClient?.deleteSession
        ? await Promise.all(deletedIds.map((id) => ctx.daemonClient!.deleteSession!(id, snapBefore.characters[id]?.locationDirectory ?? locationDirectory)))
        : [true];
      sendJson(res, 200, {
        ok: delResults[0] ?? true, sessionId, locationDirectory: locationDirectory ?? null,
        deletedCharacterIds: deletedIds, delta: emission.delta, snapshot: emission.snapshot,
      });
    } catch (err) {
      sendJson(res, 500, { error: err instanceof Error ? err.message : `Failed to terminate session ${sessionId}` });
    }
    return true;
  }

  if (method === "GET" && pathname === "/api/guild/workspace-folders") {
    await handleGetWorkspaceFoldersRoute(req, res, urlObj, ctx);
    return true;
  }

  if (method === "POST" && pathname === "/api/guild/room") {
    await handleAddRoomRoute(req, res, urlObj, ctx);
    return true;
  }

  if (
    method === "DELETE" &&
    (pathname === "/api/guild/room" || Boolean(deleteRoomPathMatch))
  ) {
    await handleDeleteRoomRoute(req, res, urlObj, deleteRoomPathMatch, ctx);
    return true;
  }

  if (method === "POST" && pathname === "/api/guild/command") {
    await handleGuildCommandRoute(req, res, ctx);
    return true;
  }

  return false;
}

async function handleDeleteRoomRoute(
  req: IncomingMessage,
  res: ServerResponse,
  urlObj: URL,
  deleteRoomPathMatch: RegExpExecArray | null,
  ctx: GuildApiRouterContext,
): Promise<void> {
  const activeReducer = ctx.getReducer();
  try {
    let body: Record<string, unknown> = {};
    try {
      body = await readJsonBody(req);
    } catch (err) {
      if ((err as { statusCode?: number })?.statusCode === 413) {
        sendJson(res, 413, { ok: false, error: err instanceof Error ? err.message : "Payload too large" });
        return;
      }
      body = {};
    }

    const rawRoomId =
      (typeof body.roomId === "string" && body.roomId.trim()
        ? body.roomId.trim()
        : null) ??
      (typeof body.directory === "string" && body.directory.trim()
        ? body.directory.trim()
        : null) ??
      urlObj.searchParams.get("roomId") ??
      urlObj.searchParams.get("directory") ??
      urlObj.searchParams.get("location[directory]") ??
      (deleteRoomPathMatch ? decodeURIComponent(deleteRoomPathMatch[1]) : null);

    if (!rawRoomId) {
      sendJson(res, 400, { error: "Missing roomId parameter for DELETE /api/guild/room" });
      return;
    }

    const snapshotBefore = activeReducer.getSnapshot();
    const normRoomId = normalizeLocationDirectory(rawRoomId);
    const roomState = snapshotBefore.rooms[normRoomId] ?? snapshotBefore.rooms[rawRoomId];
    const directory = roomState?.locationDirectory ?? rawRoomId;
    const isWorktree =
      typeof body.isWorktree === "boolean"
        ? body.isWorktree
        : (roomState?.isWorktree ?? (normRoomId.includes("/worktree/") || normRoomId.includes("/.worktrees/")));
    const projectId = typeof body.projectId === "string" ? body.projectId : roomState?.projectId;

    let deleted: DeleteRoomResourcesResult = {
      deletedSessionIds: [], deletedPtyIds: [], deletedShellIds: [], worktreeRemoved: false, locationEvicted: false,
    };

    let roomDeletedEmission: GuildStateEmission | null = null;
    const unsub = activeReducer.subscribe((em) => {
      if (em.delta.kind === "room.deleted") roomDeletedEmission = em;
    });

    try {
      if (ctx.clientAdapter?.deleteRoom) {
        deleted = await ctx.clientAdapter.deleteRoom(directory, { projectId, isWorktree });
      } else if (ctx.daemonClient?.deleteRoomResources) {
        deleted = await ctx.daemonClient.deleteRoomResources({ directory, projectId, isWorktree });
      }

      if (!roomDeletedEmission) {
        roomDeletedEmission = activeReducer.dispatch({
          type: "room.deleted", timestampMs: Date.now(), roomId: normRoomId, locationDirectory: directory,
        });
      }
      if (roomDeletedEmission.delta.changedCharacterIds.length) {
        ctx.clientAdapter?.evictDeletedSessions?.(roomDeletedEmission.delta.changedCharacterIds);
      }
      if (roomDeletedEmission.delta.changedRoomIds.length) {
        ctx.clientAdapter?.evictDeletedRooms?.(roomDeletedEmission.delta.changedRoomIds);
      }
    } finally {
      unsub();
    }

    sendJson(res, 200, {
      ok: true, roomId: normRoomId, locationDirectory: directory, deleted,
      delta: roomDeletedEmission.delta, snapshot: roomDeletedEmission.snapshot,
    });
  } catch (err) {
    sendJson(res, 500, { error: err instanceof Error ? err.message : "Failed to demolish Workshop Room" });
  }
}
