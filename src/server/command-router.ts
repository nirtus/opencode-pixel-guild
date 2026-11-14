import type { IncomingMessage, ServerResponse } from "node:http";
import {
  extractMergedSkills,
  formatAnswersAsText,
} from "../ingress/daemon-command-ops.ts";
import {
  isDeletedHostDirectory,
  normalizeLocationDirectory,
} from "../state/world-reducer.ts";
import type {
  GuildCommandRequest,
  GuildCommandResult,
  GuildSnapshot,
  GuildStateEmission,
} from "../types/domain.ts";
import {
  type GuildApiRouterContext,
  readJsonBody,
  sendJson,
} from "./api-router.ts";
import {
  inferHostWorkspaceParentPrefix,
  resolveRequestedWorldDirectory,
} from "./workspace-folder-routes.ts";

function isWorkingModelId(modelId: string | undefined): modelId is string {
  if (!modelId) return false;
  const trimmed = modelId.trim();
  return (
    trimmed.includes("/") &&
    trimmed !== "default" &&
    trimmed !== "unknown-model" &&
    !trimmed.endsWith("/unknown-model") &&
    trimmed !== "opencode/flint-40b-free"
  );
}

function resolveDefaultSummonModelId(
  snapshot: GuildSnapshot,
  directory: string | undefined,
): string {
  const normDir = directory ? normalizeLocationDirectory(directory) : "";
  const chars = Object.values(snapshot.characters);
  if (normDir) {
    const roomMatch = chars.find(
      (c) =>
        (c.roomId === normDir ||
          normalizeLocationDirectory(c.locationDirectory) === normDir) &&
        isWorkingModelId(c.modelId),
    );
    if (roomMatch) return roomMatch.modelId;
  }
  const anyMatch = chars.find((c) => isWorkingModelId(c.modelId));
  return anyMatch?.modelId ?? "google/gemini-4-argon";
}

function sendSummonFailed(
  res: ServerResponse, adapter: GuildSnapshot["activeAdapter"], snapshot: GuildSnapshot,
  timestampMs: number, directory: string | undefined, error: string,
): void {
  sendJson(res, 200, {
    ok: false, command: "adventurer.summon", adapter, sessionId: null, error,
    delta: {
      version: snapshot.version, timestampMs, kind: "adventurer.summon.failed",
      roomId: normalizeLocationDirectory(directory || "/"), sessionId: null, description: error,
      changedRoomIds: [], changedCharacterIds: [],
    },
    snapshot,
  } satisfies GuildCommandResult);
}

export async function handleGuildCommandRoute(
  req: IncomingMessage, res: ServerResponse, ctx: GuildApiRouterContext,
): Promise<void> {
  const activeReducer = ctx.getReducer();
  const activeAdapter = ctx.getActiveAdapter ? ctx.getActiveAdapter() : activeReducer.getSnapshot().activeAdapter;

  let rawBody: Record<string, unknown>;
  try {
    rawBody = await readJsonBody(req);
  } catch (err) {
    const status = (err as { statusCode?: number })?.statusCode ?? 400;
    sendJson(res, status, { ok: false, error: err instanceof Error ? err.message : "Invalid JSON request body" });
    return;
  }

  const command = rawBody.command;
  if (
    command !== "scroll.send" && command !== "turn.interrupt" && command !== "adventurer.summon" &&
    command !== "gate.resolve" && command !== "session.view" && command !== "agent.switch"
  ) {
    sendJson(res, 400, { ok: false, error: `Invalid or missing command: ${String(command ?? "")}` });
    return;
  }

  if (command === "scroll.send") {
    const sessionId = typeof rawBody.sessionId === "string" ? rawBody.sessionId.trim() : "";
    const promptText = typeof rawBody.promptText === "string" ? rawBody.promptText.trim() : "";
    if (!sessionId || !promptText) {
      sendJson(res, 400, { ok: false, error: "scroll.send requires non-empty sessionId and promptText" });
      return;
    }
  } else if (command === "agent.switch") {
    const sessionId =
      typeof rawBody.sessionId === "string" ? rawBody.sessionId.trim() : "";
    const agentClass =
      typeof rawBody.agentClass === "string" ? rawBody.agentClass.trim() : "";
    if (!sessionId || !agentClass) {
      sendJson(res, 400, {
        ok: false,
        error: "agent.switch requires non-empty sessionId and agentClass",
      });
      return;
    }
  } else if (command === "turn.interrupt" || command === "session.view") {
    const sessionId =
      typeof rawBody.sessionId === "string" ? rawBody.sessionId.trim() : "";
    if (!sessionId) {
      sendJson(res, 400, {
        ok: false,
        error: `${command} requires non-empty sessionId`,
      });
      return;
    }
  } else if (command === "adventurer.summon") {
    const directory =
      typeof rawBody.directory === "string" ? rawBody.directory.trim() : "";
    if (!directory) {
      sendJson(res, 400, {
        ok: false,
        error: "adventurer.summon requires non-empty directory",
      });
      return;
    }
  } else if (command === "gate.resolve") {
    const sessionId =
      typeof rawBody.sessionId === "string" ? rawBody.sessionId.trim() : "";
    const gateId =
      typeof rawBody.gateId === "string" ? rawBody.gateId.trim() : "";
    if (!sessionId || !gateId) {
      sendJson(res, 400, {
        ok: false,
        error: "gate.resolve requires non-empty sessionId and gateId",
      });
      return;
    }
  }

  const snapshotBefore = activeReducer.getSnapshot();
  const rawSessionId =
    typeof rawBody.sessionId === "string" ? rawBody.sessionId.trim() : "";
  const charBefore = rawSessionId
    ? snapshotBefore.characters[rawSessionId]
    : undefined;

  const rawPromptText =
    typeof rawBody.promptText === "string" ? rawBody.promptText : undefined;
  const rawSkills = Array.isArray(rawBody.skills)
    ? (rawBody.skills as string[])
    : undefined;
  const mergedSkills =
    command === "scroll.send" || command === "adventurer.summon"
      ? extractMergedSkills(rawPromptText, rawSkills)
      : undefined;

  let resolvedDirectory =
    typeof rawBody.directory === "string" && rawBody.directory.trim()
      ? rawBody.directory.trim()
      : charBefore?.locationDirectory;
  if (command === "adventurer.summon" && resolvedDirectory) {
    const activeDaemonUrl = snapshotBefore.daemonUrl || ctx.daemonUrl;
    const hostParentPrefix = await inferHostWorkspaceParentPrefix(ctx);
    const { rawDirectory } = resolveRequestedWorldDirectory(
      resolvedDirectory,
      hostParentPrefix,
      activeDaemonUrl,
    );
    resolvedDirectory = rawDirectory;
    if (isDeletedHostDirectory(rawDirectory, undefined, activeDaemonUrl)) {
      sendSummonFailed(res, activeAdapter, snapshotBefore, Date.now(), rawDirectory, `Directory does not exist on host: ${rawDirectory}`);
      return;
    }
  }
  const rawModelId =
    typeof rawBody.modelId === "string" && rawBody.modelId.trim()
      ? rawBody.modelId.trim()
      : undefined;

  const cmd = {
    ...rawBody,
    ...(resolvedDirectory ? { directory: resolvedDirectory } : {}),
    ...(command === "session.view" && typeof rawBody.idleAtMs !== "number" && typeof charBefore?.idleAtMs === "number"
      ? { idleAtMs: charBefore.idleAtMs }
      : {}),
    ...(command === "adventurer.summon" && !rawModelId
      ? { modelId: resolveDefaultSummonModelId(snapshotBefore, resolvedDirectory) }
      : {}),
    ...(mergedSkills !== undefined ? { skills: mergedSkills } : {}),
  } as unknown as GuildCommandRequest;

  const now = Date.now();
  let preDispatchedViewEmission: GuildStateEmission | null = null;
  if (cmd.command === "session.view") {
    preDispatchedViewEmission = activeReducer.dispatch({
      type: "session.viewed",
      timestampMs: now,
      sessionId: cmd.sessionId,
      viewedAtMs: cmd.idleAtMs ?? now,
    });
  }

  let daemonRes: { ok: boolean; sessionId?: string; error?: string } | null =
    null;
  if (
    ctx.daemonClient?.executeCommand &&
    activeAdapter === "opencode-client"
  ) {
    daemonRes = await ctx.daemonClient.executeCommand(cmd);
  }

  if (
    daemonRes &&
    !daemonRes.ok &&
    (cmd.command === "scroll.send" ||
      cmd.command === "agent.switch" ||
      cmd.command === "turn.interrupt" ||
      cmd.command === "gate.resolve")
  ) {
    const snap = activeReducer.getSnapshot();
    const errorMsg = daemonRes.error || "Daemon command failed";
    const roomId = normalizeLocationDirectory(resolvedDirectory || charBefore?.roomId || "/");
    const gateId = cmd.command === "gate.resolve" ? cmd.gateId : undefined;
    sendJson(res, 200, {
      ok: false, command: cmd.command, adapter: activeAdapter, sessionId: cmd.sessionId,
      ...(gateId !== undefined ? { gateId } : {}), error: errorMsg, daemonResult: daemonRes,
      delta: {
        version: snap.version, timestampMs: now, kind: `${cmd.command}.failed`,
        roomId, sessionId: cmd.sessionId, description: errorMsg, changedRoomIds: [], changedCharacterIds: [],
      },
      snapshot: snap,
    });
    return;
  }

  let emission: GuildStateEmission;
  let sessionId: string | null = null;
  let gateId: string | null | undefined;

  if (cmd.command === "scroll.send") {
    sessionId = cmd.sessionId;
    if (cmd.agentClass?.trim()) {
      activeReducer.dispatch({
        type: "session.upserted",
        timestampMs: now,
        sessionId: cmd.sessionId,
        locationDirectory:
          cmd.directory || charBefore?.locationDirectory || "/",
        agentClass: cmd.agentClass.trim(),
        preserveActivityTimestamp: true,
      } as any);
    }
    const skills = extractMergedSkills(cmd.promptText, cmd.skills);
    emission = activeReducer.dispatch({
      type: "message.user.prompt",
      timestampMs: now,
      sessionId: cmd.sessionId,
      promptText: cmd.promptText,
      skills,
    });
  } else if (cmd.command === "agent.switch") {
    sessionId = cmd.sessionId;
    emission = activeReducer.dispatch({
      type: "session.upserted",
      timestampMs: now,
      sessionId: cmd.sessionId,
      locationDirectory:
        cmd.directory || charBefore?.locationDirectory || "/",
      agentClass: cmd.agentClass.trim(),
      preserveActivityTimestamp: true,
    } as any);
  } else if (cmd.command === "turn.interrupt") {
    sessionId = cmd.sessionId;
    emission = activeReducer.dispatch({
      type: "session.idle",
      timestampMs: now,
      sessionId: cmd.sessionId,
      summary: "Interrupted by user",
      outcome: "interrupted",
    });
  } else if (cmd.command === "session.view") {
    sessionId = cmd.sessionId;
    emission = {
      delta: preDispatchedViewEmission!.delta,
      snapshot: activeReducer.getSnapshot(),
    };
  } else if (cmd.command === "adventurer.summon") {
    if (daemonRes && !daemonRes.ok) {
      if (daemonRes.sessionId) {
        ctx.clientAdapter?.evictDeletedSessions?.([daemonRes.sessionId]);
        if (activeReducer.getSnapshot().characters[daemonRes.sessionId]) {
          activeReducer.dispatch({ type: "session.deleted", timestampMs: now, sessionId: daemonRes.sessionId, locationDirectory: cmd.directory });
        }
      }
      sendSummonFailed(res, activeAdapter, activeReducer.getSnapshot(), now, cmd.directory, daemonRes.error || "Failed to summon adventurer on OpenCode daemon");
      return;
    }
    if (resolvedDirectory) {
      (ctx.daemonClient as { recordDirectory?: (d: string) => void } | undefined)?.recordDirectory?.(resolvedDirectory);
      await ctx.clientAdapter?.registerLocation?.(resolvedDirectory);
    }
    sessionId =
      daemonRes?.sessionId || `ses_summon_${Date.now().toString(36)}`;
    const hasInitialPrompt = Boolean(cmd.promptText?.trim());
    const alreadyInSnapshot = Boolean(
      activeReducer.getSnapshot().characters[sessionId],
    );
    emission = activeReducer.dispatch({
      type: "session.upserted",
      timestampMs: now,
      sessionId,
      parentId: null,
      locationDirectory: cmd.directory,
      title:
        cmd.title || cmd.promptText?.slice(0, 48) || "New Adventurer",
      agentClass: cmd.agentClass || "build",
      modelId: cmd.modelId,
      ...(alreadyInSnapshot ? { preserveActivityTimestamp: true } : {}),
      ...(!hasInitialPrompt ? { deferredLifecycleState: "RestingInLounge" } : {}),
    } as any);
    if (hasInitialPrompt && cmd.promptText) {
      const skills = extractMergedSkills(cmd.promptText, cmd.skills);
      emission = activeReducer.dispatch({
        type: "message.user.prompt",
        timestampMs: now + 1,
        sessionId,
        promptText: cmd.promptText.trim(),
        skills,
      });
    }
  } else {
    sessionId = cmd.sessionId;
    gateId = cmd.gateId;
    const isPermission = cmd.kind === "permission" || cmd.source === "permission";
    emission = activeReducer.dispatch({
      type: isPermission ? "permission.resolved" : "question.resolved",
      timestampMs: now, sessionId: cmd.sessionId, gateId: cmd.gateId,
    });
    const replyText = cmd.promptText?.trim() || (!isPermission ? formatAnswersAsText(cmd.answers) : "");
    if (cmd.decision === "reject") {
      emission = activeReducer.dispatch({
        type: "session.idle", timestampMs: now + 1, sessionId: cmd.sessionId, summary: "Rejected by user",
      });
    } else if (replyText) {
      const skills = extractMergedSkills(replyText, undefined);
      emission = activeReducer.dispatch({
        type: "message.user.prompt", timestampMs: now + 1, sessionId: cmd.sessionId, promptText: replyText, skills,
      });
    }
  }

  if (ctx.clientAdapter?.sweepAllLocations && (cmd.command === "scroll.send" || cmd.command === "adventurer.summon" || cmd.command === "gate.resolve")) {
    for (const delayMs of [1500, 3500, 6500, 10000]) {
      setTimeout(() => { void ctx.clientAdapter?.sweepAllLocations?.(false)?.catch(() => {}); }, delayMs).unref?.();
    }
  }

  const result: GuildCommandResult = {
    ok: daemonRes ? daemonRes.ok : true, command: cmd.command, adapter: activeAdapter, sessionId,
    ...(gateId !== undefined ? { gateId } : {}), ...(daemonRes?.error ? { error: daemonRes.error } : {}),
    delta: emission.delta, snapshot: emission.snapshot,
  };
  sendJson(res, 200, result);
}
