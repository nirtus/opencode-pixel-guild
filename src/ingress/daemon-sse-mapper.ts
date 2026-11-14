import {
  normalizeQuestGateFields,
  type TelemetryEvent,
} from "../types/domain.ts";
import { extractToolOutputPreview } from "./daemon-message-hydration.ts";

const toolNameByCallId = new Map<string, string>();

function rememberToolCallName(callId: string, toolName: string): void {
  if (!callId || !toolName) return;
  if (toolNameByCallId.size >= 500) {
    const oldest = toolNameByCallId.keys().next().value;
    if (oldest) toolNameByCallId.delete(oldest);
  }
  toolNameByCallId.set(callId, toolName);
}

function extractModelId(rawModel: unknown, fallbackObj?: Record<string, any>): string | undefined {
  if (typeof rawModel === "object" && rawModel !== null) {
    const m = rawModel as Record<string, any>;
    const id = m.id ?? m.model ?? m.modelID;
    return m.providerID ? `${m.providerID}/${id ?? "unknown-model"}` : (id ?? undefined);
  }
  if (typeof rawModel === "string" && rawModel.trim()) return rawModel.trim();
  return fallbackObj?.modelID ?? fallbackObj?.modelId ?? undefined;
}

function sliceAssistantTextTail(text: string, maxChars = 64000): string {
  return text.length > maxChars ? text.slice(0, maxChars) : text;
}

export function mapOpenCodeSseFrameToTelemetryEvents(rawPayload: unknown): TelemetryEvent[] {
  if (!rawPayload || typeof rawPayload !== "object") return [];
  const rootObj = rawPayload as Record<string, any>;
  const inner =
    rootObj.payload && typeof rootObj.payload === "object" && typeof rootObj.payload.type === "string"
      ? (rootObj.payload as Record<string, any>)
      : rootObj;
  const type = typeof inner.type === "string" ? inner.type : "";
  if (!type) return [];
  const props = (
    inner.properties && typeof inner.properties === "object"
      ? inner.properties
      : inner.data && typeof inner.data === "object"
        ? inner.data
        : inner
  ) as Record<string, any>;
  const timestampMs =
    typeof inner.timestampMs === "number" ? inner.timestampMs
    : typeof props.timestampMs === "number" ? props.timestampMs
    : typeof inner.created === "number" ? inner.created : Date.now();
  const isValidEntityAsSessionId = (val: unknown): val is string =>
    typeof val === "string" && val.length > 0 && !/^(evt|call|msg|prt|per|frm|sh|req|pty)_/i.test(val);
  const resolveSessionId = (src = props): string => {
    const explicit =
      src.sessionID ?? src.sessionId ?? src.info?.sessionID ?? src.info?.sessionId ??
      props.sessionID ?? props.sessionId ?? inner.sessionID ?? inner.sessionId ??
      rootObj.durable?.aggregateID ?? rootObj.sessionID ?? rootObj.sessionId;
    if (typeof explicit === "string" && explicit && !explicit.startsWith("evt_")) return explicit;
    const fallbackId = isValidEntityAsSessionId(src.info?.id) ? src.info.id : isValidEntityAsSessionId(src.id) ? src.id : "";
    return fallbackId;
  };

  if (type === "session.created" || type === "session.updated" || type === "session.upserted") {
    const info = (props.info ?? props.session ?? props) as Record<string, any>;
    const sessionId = resolveSessionId(info);
    if (!sessionId) return [];
    const locationDirectory =
      info.location?.directory ?? inner.location?.directory ?? rootObj.location?.directory ?? info.directory ?? props.locationDirectory ?? rootObj.directory ?? "/";
    const modelId = extractModelId(info.model, info);
    const rawAgent = info.agent ?? info.agentClass;
    const isCompactionInfo = rawAgent === "compaction" || info.mode === "compaction" || info.summary === true;
    const isPassiveUpdate = type === "session.updated" || isCompactionInfo;
    const events: TelemetryEvent[] = [
      { type: "session.upserted", timestampMs, sessionId, parentId: info.parentID ?? info.parentId ?? null, locationDirectory, title: info.title, agentClass: isCompactionInfo ? undefined : rawAgent, modelId, tokens: info.tokens, ...(isPassiveUpdate ? { preserveActivityTimestamp: true } : {}) } as TelemetryEvent,
    ];
    if (info.archived || info.time?.archived) events.push({ type: "session.archived", timestampMs, sessionId });
    return events;
  }

  if (type === "session.agent.selected" || type === "session.model.selected" || type === "session.renamed") {
    const sessionId = resolveSessionId();
    if (!sessionId) return [];
    const locationDirectory = props.location?.directory ?? inner.location?.directory ?? rootObj.location?.directory ?? "/";
    const agentClass = type === "session.agent.selected" && typeof props.agent === "string" ? props.agent.trim() : undefined;
    const modelId = type === "session.model.selected" ? extractModelId(props.model, props) : undefined;
    const title = type === "session.renamed" && typeof props.title === "string" ? props.title.trim() : undefined;
    if (!agentClass && !modelId && !title) return [];
    return [{ type: "session.upserted", timestampMs, sessionId, locationDirectory, agentClass, modelId, title, preserveActivityTimestamp: true } as TelemetryEvent];
  }

  if (type === "session.moved") {
    const sessionId = resolveSessionId();
    const toDirectory = props.location?.directory ?? props.toDirectory ?? props.directory;
    const fromDirectory = props.previous?.location?.directory ?? props.fromDirectory;
    return sessionId && typeof toDirectory === "string" && toDirectory
      ? [{ type: "session.moved", timestampMs, sessionId, fromDirectory, toDirectory }]
      : [];
  }

  if (type === "session.archived") {
    const sessionId = resolveSessionId();
    return sessionId ? [{ type: "session.archived", timestampMs, sessionId }] : [];
  }

  if (type === "session.unarchived") {
    const sessionId = resolveSessionId();
    return sessionId
      ? [
          { type: "session.upserted", timestampMs, sessionId, locationDirectory: props.location?.directory ?? "/", isOpenInOpenCode: true, preserveActivityTimestamp: true } as TelemetryEvent,
          { type: "session.status", timestampMs, sessionId, status: "idle" },
        ]
      : [];
  }

  if (type === "session.deleted") {
    const info = (props.info ?? props) as Record<string, any>;
    const sessionId = resolveSessionId(info);
    if (!sessionId) return [];
    return [{ type: "session.deleted", timestampMs, sessionId, locationDirectory: info.location?.directory ?? props.locationDirectory ?? rootObj.directory }];
  }

  if (type === "session.viewed") {
    const sessionId = resolveSessionId();
    const viewedAtMs = typeof props.viewed === "number" ? props.viewed : typeof props.idle === "number" ? props.idle : timestampMs;
    return sessionId ? [{ type: "session.viewed", timestampMs, sessionId, viewedAtMs }] : [];
  }

  if (type === "session.idle" || type === "session.execution.succeeded" || type === "session.execution.interrupted") {
    const sessionId = resolveSessionId();
    const outcome = type === "session.execution.interrupted" ? ("interrupted" as const) : ("succeeded" as const);
    return sessionId ? [{ type: "session.idle", timestampMs, sessionId, summary: props.summary, outcome, tokens: props.tokens }] : [];
  }

  if (type === "session.execution.started" || type === "session.step.started" || type === "session.step.streamed" || type === "session.reasoning.started" || type === "session.reasoning.delta" || type === "session.reasoning.ended") {
    const sessionId = resolveSessionId();
    if (!sessionId) return [];
    if (props.agent === "compaction" || props.mode === "compaction") return [{ type: "session.compacting", timestampMs, sessionId }];
    const events: TelemetryEvent[] = [];
    if (type === "session.step.started" && (props.agent || props.model)) {
      events.push({
        type: "session.upserted", timestampMs, sessionId, locationDirectory: props.location?.directory ?? "/",
        agentClass: typeof props.agent === "string" ? props.agent : undefined, modelId: extractModelId(props.model, props), preserveActivityTimestamp: true,
      } as TelemetryEvent);
    }
    events.push({ type: "session.status", timestampMs, sessionId, status: "thinking" });
    return events;
  }

  if (type === "session.text.ended" || type === "session.message.content.updated") {
    const sessionId = resolveSessionId();
    const rawText = typeof props.text === "string" ? props.text : typeof inner.text === "string" ? inner.text : typeof props.content === "string" ? props.content : "";
    const text = rawText.trim();
    const role = props.role ?? props.info?.role ?? inner.role;
    if (!sessionId || !text || (role && role !== "assistant")) return [];
    const locDir = props.location?.directory ?? inner.location?.directory ?? rootObj.location?.directory ?? "/";
    return [{ type: "session.upserted", timestampMs, sessionId, locationDirectory: locDir, lastAssistantText: sliceAssistantTextTail(text), preserveActivityTimestamp: true } as TelemetryEvent];
  }

  if (type === "session.step.ended") {
    const sessionId = resolveSessionId();
    if (!sessionId || !props.tokens) return [];
    const t = props.tokens as Record<string, any>;
    const turnUsed =
      typeof t.usedTokens === "number"
        ? t.usedTokens
        : (t.input ?? t.inputTokens ?? 0) + (t.cache?.read ?? t.cacheRead ?? 0) + (t.cache?.write ?? t.cacheWrite ?? 0) + (t.output ?? t.outputTokens ?? 0) + (t.reasoning ?? 0);
    return [{
      type: "session.upserted", timestampMs, sessionId, locationDirectory: props.location?.directory ?? "/",
      tokens: { ...t, ...(turnUsed > 0 ? { usedTokens: turnUsed } : {}), ...(typeof props.cost === "number" ? { totalCostUsd: props.cost } : {}) },
      preserveActivityTimestamp: true,
    } as TelemetryEvent];
  }

  if (type === "session.usage.updated") {
    const sessionId = resolveSessionId();
    if (!sessionId || (!props.tokens && typeof props.cost !== "number")) return [];
    const t = (props.tokens ?? {}) as Record<string, any>;
    return [{
      type: "session.upserted", timestampMs, sessionId, locationDirectory: props.location?.directory ?? "/",
      tokens: {
        inputTokens: t.inputTokens ?? t.input, outputTokens: t.outputTokens ?? t.output,
        cacheReadTokens: t.cacheReadTokens ?? t.cacheRead ?? t.cache?.read,
        cacheWriteTokens: t.cacheWriteTokens ?? t.cacheWrite ?? t.cache?.write,
        totalCostUsd: typeof props.cost === "number" ? props.cost : (t.totalCostUsd ?? t.totalUsd),
        cumulativeOnly: true,
      },
      preserveActivityTimestamp: true,
    } as TelemetryEvent];
  }

  if (type === "session.status") {
    const sessionId = resolveSessionId();
    if (!sessionId) return [];
    const rawStatus = typeof props.status === "object" && props.status ? props.status.type : props.status;
    if (rawStatus === "idle") return [{ type: "session.idle", timestampMs, sessionId, tokens: props.tokens }];
    const status =
      rawStatus === "working" || rawStatus === "running"
        ? ("working" as const)
        : rawStatus === "archived"
          ? ("archived" as const)
          : ("thinking" as const);
    return [{ type: "session.status", timestampMs, sessionId, status, tokens: props.tokens }];
  }

  if (type === "session.error" || type === "session.execution.failed") {
    const sessionId = resolveSessionId();
    if (!sessionId) return [];
    const message = props.error?.data?.message ?? props.error?.message ?? props.message ?? "Session execution error";
    return [{ type: "session.error", timestampMs, sessionId, message: String(message) }];
  }

  if (type === "session.compacting" || type === "session.compaction.started" || type === "session.compaction.delta") {
    const sessionId = resolveSessionId();
    return sessionId ? [{ type: "session.compacting", timestampMs, sessionId }] : [];
  }

  if (type === "session.compacted" || type === "session.compaction.ended" || type === "session.compaction.completed" || type === "session.compaction.failed") {
    const sessionId = resolveSessionId();
    return sessionId ? [{ type: "session.compacted", timestampMs, sessionId, tokens: props.tokens }] : [];
  }

  if (type === "permission.asked" || type === "permission.requested" || type === "permission.updated") {
    const sessionId = resolveSessionId();
    if (!sessionId) return [];
    const gateId = props.gateId ?? props.id ?? `perm:${sessionId}:${timestampMs}`;
    const title = props.title ?? (props.action ? `Permission: ${props.action}` : "Permission Request");
    const reason = props.reason ?? props.message ?? (Array.isArray(props.resources) ? props.resources.join(", ") : "");
    return [{
      type: "permission.requested", timestampMs, sessionId, gateId, title, reason, source: "permission",
      action: typeof props.action === "string" ? props.action : undefined,
      resources: Array.isArray(props.resources) ? props.resources.map(String) : undefined,
    }];
  }

  if (type === "permission.replied" || type === "permission.resolved") {
    const sessionId = resolveSessionId();
    const gateId = props.requestID ?? props.gateId ?? props.permissionID ?? props.id ?? "";
    return sessionId && gateId ? [{ type: "permission.resolved", timestampMs, sessionId, gateId }] : [];
  }

  if (type === "form.asked" || type === "form.created" || type === "question.asked" || type === "question.requested") {
    const formObj = (props.form && typeof props.form === "object" ? props.form : props) as Record<string, any>;
    const sessionId = resolveSessionId(formObj) || resolveSessionId(props);
    if (!sessionId) return [];
    const gateId = formObj.gateId ?? formObj.id ?? props.gateId ?? props.id ?? `question:${sessionId}:${timestampMs}`;
    const title = formObj.title ?? props.title ?? "Waiting for User Input";
    const rawFields = formObj.fields ?? formObj.questions ?? props.fields ?? props.questions;
    const reason = formObj.reason ?? props.reason ?? (Array.isArray(rawFields) ? rawFields.map((f: any) => f.title ?? f.description ?? f.label ?? f.key ?? "").filter(Boolean).join("; ") : "");
    return [{
      type: "question.requested", timestampMs, sessionId, gateId, title, reason, source: "form",
      fields: normalizeQuestGateFields(rawFields),
    }];
  }

  if (type === "form.replied" || type === "form.resolved" || type === "form.cancelled" || type === "question.replied" || type === "question.resolved") {
    const formObj = (props.form && typeof props.form === "object" ? props.form : props) as Record<string, any>;
    const sessionId = resolveSessionId(formObj) || resolveSessionId(props);
    const gateId = formObj.gateId ?? formObj.formID ?? formObj.id ?? props.gateId ?? props.formID ?? props.id ?? "";
    return sessionId && gateId ? [{ type: "question.resolved", timestampMs, sessionId, gateId }] : [];
  }

  if (type === "session.tool.input.started" || type === "session.tool.input.ended" || type === "session.tool.called") {
    const sessionId = resolveSessionId();
    if (!sessionId) return [];
    const callId = String(props.id ?? props.callID ?? "");
    const rawName = typeof props.name === "string" && props.name.trim() ? props.name.trim() : typeof props.tool === "string" && props.tool.trim() ? props.tool.trim() : "";
    if (callId && rawName) rememberToolCallName(callId, rawName);
    const toolName = rawName || (callId ? toolNameByCallId.get(callId) : undefined) || "tool";
    let toolInput = props.input ?? null;
    if (!toolInput && type === "session.tool.input.ended" && typeof props.text === "string" && props.text.trim()) {
      try { toolInput = JSON.parse(props.text); } catch { toolInput = { text: props.text.trim().slice(0, 400) }; }
    }
    return [{ type: "tool.started", timestampMs, sessionId, callId: callId || undefined, toolName, toolInput }];
  }

  if (type === "session.tool.success" || type === "session.tool.failed") {
    const sessionId = resolveSessionId();
    if (!sessionId) return [];
    const callId = String(props.id ?? props.callID ?? "");
    const rawName = typeof props.name === "string" && props.name.trim() ? props.name.trim() : typeof props.tool === "string" && props.tool.trim() ? props.tool.trim() : "";
    const toolName = rawName || (callId ? toolNameByCallId.get(callId) : undefined) || "tool";
    const outputPreview = extractToolOutputPreview({
      state: { content: props.content, error: props.error, output: props.output, result: props.result, metadata: props.metadata },
      error: props.error,
      output: props.output,
      result: props.result,
    } as any);
    return [{ type: "tool.completed", timestampMs, sessionId, callId: callId || undefined, toolName, outputPreview }];
  }

  if (type === "session.shell.started") {
    const sessionId = resolveSessionId();
    if (!sessionId) return [];
    const sh = (props.shell && typeof props.shell === "object" ? props.shell : props) as Record<string, any>;
    const callId = String(sh.id ?? props.id ?? "") || undefined;
    const cmd = sh.command ?? props.command;
    return [{ type: "tool.started", timestampMs, sessionId, callId, toolName: "shell", toolInput: cmd ? { command: String(cmd) } : null }];
  }

  if (type === "session.shell.ended") {
    const sessionId = resolveSessionId();
    if (!sessionId) return [];
    const sh = (props.shell && typeof props.shell === "object" ? props.shell : props) as Record<string, any>;
    const callId = String(sh.id ?? props.id ?? "") || undefined;
    const outputPreview = typeof props.output === "string" && props.output.trim() ? props.output.trim().slice(0, 2000) : undefined;
    return [{ type: "tool.completed", timestampMs, sessionId, callId, toolName: "shell", outputPreview }];
  }

  if (type === "session.inbox.enqueued") {
    const sessionId = resolveSessionId();
    if (!sessionId) return [];
    const item = (props.item && typeof props.item === "object" ? props.item : props) as Record<string, any>;
    if (item.type === "compaction") return [{ type: "session.compacting", timestampMs, sessionId }];
    if (item.type && item.type !== "user") return [];
    const payload = (item.payload && typeof item.payload === "object" ? item.payload : item) as Record<string, any>;
    const text = typeof payload.text === "string" ? payload.text.trim() : typeof props.text === "string" ? props.text.trim() : "";
    if (!text) return [];
    const rawSkills = Array.isArray(payload.skills) ? payload.skills : Array.isArray(props.skills) ? props.skills : [];
    const skills = rawSkills.map((s: any) => (typeof s === "string" ? s.trim() : String(s?.id ?? s?.name ?? s?.skill ?? "").trim())).filter(Boolean);
    return [{ type: "message.user.prompt", timestampMs, sessionId, promptText: text.slice(0, 4000), ...(skills.length > 0 ? { skills } : {}) }];
  }

  if (type === "session.skill.activated") {
    const sessionId = resolveSessionId();
    const skillId = String(props.skillId ?? props.skill ?? props.id ?? props.name ?? "").trim();
    if (!sessionId || !skillId) return [];
    const skillName = typeof props.name === "string" ? props.name : typeof props.skillName === "string" ? props.skillName : undefined;
    return [{ type: "skill.activated", timestampMs, sessionId, skillId, skillName, source: "skill-tool" }];
  }

  if (type === "message.part.updated") {
    const part = (props.part ?? props) as Record<string, any>;
    const sessionId = resolveSessionId(part) || resolveSessionId(props);
    if (sessionId && (part.type === "compaction" || part.agent === "compaction" || part.mode === "compaction" || props.info?.agent === "compaction" || props.info?.mode === "compaction" || props.info?.summary === true)) {
      return [{ type: "session.compacting", timestampMs, sessionId }];
    }
    if (part.type === "tool" && sessionId) {
      const toolName = String(part.tool ?? part.name ?? "tool");
      const callId = part.callID ?? part.id;
      const status = part.state?.status;
      if (status === "running" || status === "pending") return [{ type: "tool.started", timestampMs, sessionId, callId, toolName, toolInput: part.state?.input ?? part.input ?? null }];
      if (status === "completed" || status === "error" || status === "failed") return [{ type: "tool.completed", timestampMs, sessionId, callId, toolName, outputPreview: extractToolOutputPreview(part as any) }];
    }
    if (part.type === "text" && sessionId && typeof part.text === "string" && part.text.trim()) {
      const partRole = part.role ?? props.role ?? inner.role;
      const partTs = typeof part.time?.created === "number" ? part.time.created : typeof props.info?.time?.created === "number" ? props.info.time.created : timestampMs;
      if (partRole === "user") return [{ type: "message.user.prompt", timestampMs: partTs, sessionId, promptText: part.text.trim().slice(0, 8000) }];
      const locDir = part.location?.directory ?? inner.location?.directory ?? rootObj.location?.directory ?? "/";
      return [{ type: "session.upserted", timestampMs, sessionId, locationDirectory: locDir, lastAssistantText: sliceAssistantTextTail(part.text.trim()), preserveActivityTimestamp: true } as TelemetryEvent];
    }
    return [];
  }

  if (type === "message.updated" || type === "message.created") {
    const info = (props.info ?? props.message ?? props) as Record<string, any>;
    const sessionId = resolveSessionId(info) || resolveSessionId(props);
    const rawParts = [...(info.content ?? []), ...(info.parts ?? []), ...(props.content ?? []), ...(props.parts ?? [])];
    if (sessionId && (info.agent === "compaction" || info.mode === "compaction" || info.summary === true || props.agent === "compaction" || props.mode === "compaction" || props.summary === true || rawParts.some((p: any) => p?.type === "compaction"))) {
      return [{ type: "session.compacting", timestampMs, sessionId }];
    }
    const partsText = rawParts.filter((p: any) => p && (p.type === "text" || !p.type) && typeof p.text === "string").map((p: any) => p.text.trim()).filter(Boolean).join("\n").trim();
    const text = typeof info.text === "string" && info.text.trim() ? info.text.trim() : typeof props.text === "string" && props.text.trim() ? props.text.trim() : partsText;
    const role = info.role ?? props.role ?? info.type;
    if (!sessionId || !text) return [];
    const msgTs = typeof info.time?.created === "number" ? info.time.created : typeof props.time?.created === "number" ? props.time.created : timestampMs;
    if (role === "user") return [{ type: "message.user.prompt", timestampMs: msgTs, sessionId, promptText: text.slice(0, 8000) }];
    if (role === "assistant") return [{ type: "session.upserted", timestampMs, sessionId, locationDirectory: info.location?.directory ?? props.location?.directory ?? "/", lastAssistantText: sliceAssistantTextTail(text), preserveActivityTimestamp: true } as TelemetryEvent];
    return [];
  }

  if (type === "worktree.updated") {
    const directory = props.directory ?? props.locationDirectory ?? rootObj.directory;
    return typeof directory === "string" && directory
      ? [{ type: "location.discovered", timestampMs, locationDirectory: directory, projectId: props.projectID ?? props.projectId, isWorktree: true, parentProjectDirectory: props.parentProjectDirectory ?? null }]
      : [];
  }

  if (
    type === "tool.started" ||
    type === "tool.completed" ||
    type === "skill.activated" ||
    type === "message.user.prompt" ||
    type === "worktree.created" ||
    type === "location.discovered"
  ) {
    return [{ ...(inner as TelemetryEvent), timestampMs }];
  }
  return [];
}
