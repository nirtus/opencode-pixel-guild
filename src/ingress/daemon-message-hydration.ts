import {
  classifyCapability,
  formatInputPreview,
} from "../capability/classifier.ts";
import {
  detectConversationalQuestionPrompt,
  normalizeQuestGateFields,
  type QuestGateQuestionField,
  type QuestGateSource,
  type SessionChatMessage,
  type ToolExecutionRecord,
} from "../types/domain.ts";

export { detectConversationalQuestionPrompt };

export interface SessionMessageHydration {
  skills?: string[];
  latestAgentClass?: string;
  latestModelId?: string;
  activeTool?: {
    callId?: string;
    toolName: string;
    toolInput?: Record<string, unknown> | string | null;
    outputPreview?: string;
    timestampMs?: number;
  } | null;
  recentTools?: ToolExecutionRecord[];
  latestContextTokens?: number;
  compactedAtMs?: number | null;
  lastAssistantText?: string | null;
  lastUserPromptText?: string | null;
  messages?: SessionChatMessage[];
  pendingQuestion?: { gateId: string; title: string; reason: string; source?: QuestGateSource; fields?: readonly QuestGateQuestionField[] } | null;
}

interface RawMessagePart {
  id?: string; callID?: string; type?: string; text?: string; skillId?: string;
  name?: string; tool?: string; time?: { created?: number; completed?: number };
  input?: Record<string, unknown> | string | null; output?: unknown; result?: unknown; error?: unknown;
  state?: {
    status?: string; input?: Record<string, unknown> | string | null;
    output?: unknown; result?: unknown; error?: unknown;
    content?: Array<{ type?: string; text?: string; uri?: string; name?: string }> | string;
    metadata?: Record<string, unknown>;
    time?: { start?: number; end?: number; created?: number; completed?: number };
  };
}

export function extractToolOutputPreview(part: RawMessagePart): string | undefined {
  const stateContentPreview = Array.isArray(part.state?.content)
    ? part.state.content
        .map((item) => {
          if (!item || typeof item !== "object") return "";
          if (typeof item.text === "string" && item.text.trim()) return item.text.trim();
          if (item.type === "file" && (item.name ?? item.uri)) return `[file: ${item.name ?? item.uri}]`;
          return "";
        })
        .filter(Boolean)
        .join("\n")
    : typeof part.state?.content === "string"
      ? part.state.content
      : undefined;

  const candidates: unknown[] = [
    part.state?.error, part.error, stateContentPreview,
    part.state?.output, part.output, part.state?.result, part.result,
    part.state?.metadata?.error, part.state?.metadata?.stderr,
    part.state?.metadata?.stdout, part.state?.metadata?.output,
  ];

  for (const raw of candidates) {
    if (raw === null || raw === undefined) continue;
    if (typeof raw === "string") {
      const cleaned = raw.trim();
      if (cleaned) return cleaned.slice(0, 2000);
      continue;
    }
    if (typeof raw === "object") {
      const obj = raw as Record<string, unknown>;
      for (const key of ["error", "stderr", "stdout", "output", "message", "text", "content"]) {
        if (typeof obj[key] === "string" && obj[key].trim()) {
          return obj[key].trim().slice(0, 2000);
        }
      }
      try {
        const serialized = JSON.stringify(raw);
        if (serialized && serialized !== "{}" && serialized !== "[]") {
          return serialized.slice(0, 2000);
        }
      } catch {
        // Ignore non-serializable tool state
      }
    }
  }

  return undefined;
}

export async function hydrateSessionMessages(
  fetchJson: <T>(path: string, extraHeaders?: Record<string, string>) => Promise<T | null>,
  sessionId: string,
  query: string,
  locHeaders: Record<string, string>,
): Promise<SessionMessageHydration | null> {
  const messages = await fetchJson<
    Array<{
      id?: string; type?: string; role?: string; agent?: string;
      model?: { id?: string; providerID?: string; model?: string } | string;
      text?: string; status?: string; timestampMs?: number;
      info?: { id?: string; role?: string; text?: string; agent?: string; time?: { created?: number; completed?: number } };
      time?: { created?: number; completed?: number };
      tokens?: { input?: number; output?: number; reasoning?: number; cache?: { read?: number; write?: number } };
      skill?: string | { id?: string; name?: string }; skillId?: string;
      skills?: Array<string | { id?: string; name?: string }>;
      parts?: RawMessagePart[]; content?: RawMessagePart[];
    }>
  >(`/api/session/${encodeURIComponent(sessionId)}/message${query}&limit=100&order=desc`, locHeaders);

  if (!Array.isArray(messages)) return null;

  const getMsgTs = (m: (typeof messages)[number]): number | undefined =>
    m?.time?.created ?? m?.info?.time?.created ?? m?.time?.completed ?? m?.info?.time?.completed ?? m?.timestampMs;
  const firstWithTs = messages.find((m) => typeof getMsgTs(m) === "number");
  const lastWithTs = [...messages].reverse().find((m) => typeof getMsgTs(m) === "number");
  const orderedMessages =
    firstWithTs && lastWithTs && (getMsgTs(firstWithTs) ?? 0) < (getMsgTs(lastWithTs) ?? 0)
      ? [...messages].reverse()
      : messages;

  const discoveredSkills = new Set<string>();
  let latestAgentClass: string | undefined;
  let latestModelId: string | undefined;
  let runningTool: SessionMessageHydration["activeTool"] = null;
  let pendingQuestion: SessionMessageHydration["pendingQuestion"] = null;
  let lastAssistantText: string | null = null;
  let lastUserPromptText: string | null = null;
  const hydratedMessages: SessionChatMessage[] = [];
  const recentTools: ToolExecutionRecord[] = [];
  const seenToolCallIds = new Set<string>();
  let latestContextTokens: number | undefined;
  let compactedAtMs: number | null | undefined;

  let checkedNewestAssistantText = false;
  let PendingConvCandidate: SessionMessageHydration["pendingQuestion"] = null;
  for (const msg of orderedMessages) {
    const rawRole = msg.role ?? msg.info?.role ?? msg.type;
    const isConversationalRole =
      rawRole === "user" ||
      rawRole === "assistant" ||
      (!rawRole && (Array.isArray(msg.parts) || Array.isArray(msg.content)));
    if (!isConversationalRole) continue;
    if (rawRole === "user") break;

    const items = [...(msg.content ?? []), ...(msg.parts ?? [])];
    for (const part of items) {
      const partToolName = (part.name ?? part.tool ?? "").trim().toLowerCase();
      const status = part.state?.status;
      const isPendingQuestionTool =
        part.type === "tool" &&
        partToolName === "question" &&
        (status === "running" ||
          status === "pending" ||
          status === "waiting" ||
          status === "asked" ||
          status === "in_progress");
      if (isPendingQuestionTool) {
        const rawInput = part.state?.input ?? part.input;
        const fields = normalizeQuestGateFields(rawInput);
        const joinedQuestions = fields.map((f) => f.question.trim()).filter(Boolean).join("\n\n");
        pendingQuestion = {
          gateId: part.id ?? part.callID ?? `question:${sessionId}`,
          title: fields[0]?.header || "Waiting for User Input",
          reason: joinedQuestions || fields[0]?.question || formatInputPreview(rawInput) || "Awaiting user answer",
          source: "form",
          fields,
        };
        break;
      }
    }
    if (pendingQuestion) break;

    if (!checkedNewestAssistantText) {
      const hasRunningTool = items.some(
        (p) => p.type === "tool" && (p.state?.status === "running" || p.state?.status === "pending"),
      );
      const partsText = items
        .filter((p) => (p.type === "text" || !p.type) && typeof p.text === "string")
        .map((p) => p.text!.trim())
        .filter(Boolean)
        .join("\n")
        .trim();
      const fallbackText =
        typeof (msg.text ?? msg.info?.text) === "string" ? (msg.text ?? msg.info?.text)!.trim() : "";
      const fullText = partsText || fallbackText;
      const hasToolParts = items.some((p) => p.type === "tool" || Boolean(p.tool || p.name));
      if (fullText || hasToolParts) {
        checkedNewestAssistantText = true;
        const msgTime = msg.time?.completed ?? msg.info?.time?.completed ?? msg.time?.created ?? msg.info?.time?.created ?? msg.timestampMs;
        const isStaleHistoricalTurn =
          typeof msgTime === "number" && msgTime > 1_000_000_000_000 && Date.now() - msgTime > 3_600_000;
        if (!hasRunningTool && !isStaleHistoricalTurn && fullText) {
          const convQ = detectConversationalQuestionPrompt(fullText);
          if (convQ) {
            PendingConvCandidate = {
              gateId: `question:${sessionId}:conv:${convQ.gateHash}`,
              title: convQ.title || "Waiting for User Input",
              reason: convQ.reason,
              source: "conversational",
              fields: [],
            };
          }
        }
      }
    }
  }
  if (!pendingQuestion && PendingConvCandidate) {
    pendingQuestion = PendingConvCandidate;
  }

  for (let mIdx = 0; mIdx < orderedMessages.length; mIdx += 1) {
    const msg = orderedMessages[mIdx];
    const msgRole = msg.role ?? msg.info?.role ?? msg.type;
    const msgAgent =
      msg.agent ??
      msg.info?.agent ??
      (msg as { mode?: string }).mode ??
      (msg.info as { mode?: string } | undefined)?.mode;
    const items = [...(msg.content ?? []), ...(msg.parts ?? [])];
    const isCompactionMsg =
      msg.type === "compaction" || msg.role === "compaction" || msg.info?.role === "compaction" ||
      (msg as { summary?: boolean }).summary === true || (msg.info as { summary?: boolean } | undefined)?.summary === true ||
      msgAgent === "compaction" || items.some((p) => p?.type === "compaction");
    if (isCompactionMsg) {
      if (compactedAtMs === undefined && (!msg.status || msg.status === "running" || msg.status === "completed" || msg.status === "failed")) {
        compactedAtMs = msg.time?.completed ?? msg.info?.time?.completed ?? msg.time?.created ?? msg.info?.time?.created ?? msg.timestampMs ?? Date.now();
      }
      continue;
    }
    if (
      !latestAgentClass &&
      typeof msgAgent === "string" &&
      msgAgent.trim() &&
      (msgRole === "agent-switched" || msgRole === "assistant" || msgRole === "user")
    ) {
      latestAgentClass = msgAgent.trim();
    }
    if (!latestModelId && msg.model && (msgRole === "model-switched" || msgRole === "assistant")) {
      if (typeof msg.model === "string" && msg.model.trim()) {
        latestModelId = msg.model.trim();
      } else if (typeof msg.model === "object") {
        const mId = msg.model.id ?? msg.model.model;
        if (mId) latestModelId = msg.model.providerID ? `${msg.model.providerID}/${mId}` : mId;
      }
    }
    const partsText = items
      .filter((p) => (p.type === "text" || !p.type) && typeof p.text === "string")
      .map((p) => p.text!.trim())
      .filter(Boolean)
      .join("\n")
      .trim();
    const topLevelText =
      typeof msg.text === "string" && msg.text.trim()
        ? msg.text.trim()
        : typeof msg.info?.text === "string" && msg.info.text.trim()
          ? msg.info.text.trim()
          : "";
    const msgText = partsText || topLevelText;
    const isChatRole =
      msgRole === "user" ||
      msgRole === "assistant" ||
      (!msgRole && (Array.isArray(msg.parts) || Array.isArray(msg.content)));

    if (msgText && isChatRole) {
      const role: "user" | "assistant" = msgRole === "user" ? "user" : "assistant";
      const boundedText = msgText.length > 64000 ? msgText.slice(0, 64000) : msgText;
      if (role === "user" && lastUserPromptText === null) {
        lastUserPromptText = msgText.slice(0, 8000);
      } else if (role === "assistant" && lastAssistantText === null && lastUserPromptText === null) {
        lastAssistantText = boundedText;
      }
      const createdTs = msg.time?.created ?? msg.info?.time?.created ?? msg.timestampMs;
      const stableId =
        msg.id ??
        msg.info?.id ??
        (typeof createdTs === "number" && createdTs > 0
          ? `${role}:${sessionId}:${createdTs}`
          : `${role}:${sessionId}:${orderedMessages.length - mIdx}`);
      hydratedMessages.unshift({
        messageId: stableId,
        role,
        text: boundedText,
        createdAtMs: createdTs ?? Date.now() - mIdx * 1000,
        updatedAtMs: msg.time?.completed ?? msg.info?.time?.completed ?? createdTs,
      });
    }

    if (latestContextTokens === undefined && msg.tokens && typeof msg.tokens === "object") {
      const turnTotal =
        (msg.tokens.input ?? 0) +
        (msg.tokens.cache?.read ?? 0) +
        (msg.tokens.cache?.write ?? 0) +
        (msg.tokens.output ?? 0) +
        (msg.tokens.reasoning ?? 0);
      if (turnTotal > 0) latestContextTokens = turnTotal;
    }

    for (const part of [...items].reverse()) {
      const partToolName =
        typeof part.name === "string" && part.name.trim()
          ? part.name.trim()
          : typeof part.tool === "string" && part.tool.trim()
            ? part.tool.trim()
            : null;
      if (part.type === "tool" && partToolName) {
        const input = part.state?.input ?? ("input" in part ? part.input : undefined) ?? null;
        const status = part.state?.status;
        const outputPreview = extractToolOutputPreview(part);

        const startedAtMs =
          part.time?.created ?? part.state?.time?.created ?? part.state?.time?.start ??
          msg.time?.created ?? msg.info?.time?.created;
        const completedAtMs =
          part.time?.completed ?? part.state?.time?.completed ?? part.state?.time?.end ??
          msg.time?.completed ?? msg.info?.time?.completed;
        const timestampMs = startedAtMs ?? completedAtMs ?? (Date.now() - mIdx);
        const callId = part.id ?? part.callID ?? `${sessionId}:${partToolName}:${timestampMs}:${recentTools.length}`;

        if (!runningTool && (status === "running" || status === "pending")) {
          runningTool = { callId, toolName: partToolName, toolInput: input, timestampMs, ...(outputPreview ? { outputPreview } : {}) };
        }

        if (!seenToolCallIds.has(callId) && recentTools.length < 30) {
          seenToolCallIds.add(callId);
          const cap = classifyCapability({ kind: "tool", identifier: partToolName, input });
          const normStatus: "running" | "completed" | "error" =
            status === "running" || status === "pending" ? "running" : status === "error" || status === "failed" ? "error" : "completed";
          recentTools.push({
            callId, toolName: partToolName, workstation: cap.targetWorkstation, pluginNamespace: cap.pluginNamespace,
            status: normStatus, inputPreview: formatInputPreview(input) || cap.inputPreview || partToolName,
            ...(outputPreview ? { outputPreview } : {}), timestampMs,
            ...(startedAtMs !== undefined ? { startedAtMs } : {}), ...(completedAtMs !== undefined ? { completedAtMs } : {}),
          });
        }
      }
    }
  }
  recentTools.forEach((rt, idx) => { rt.sequenceOrder = recentTools.length - idx; });

  for (const msg of [...orderedMessages].reverse()) {
    for (const sk of msg.skills ?? []) {
      if (typeof sk === "string" && sk.trim()) discoveredSkills.add(sk.trim());
      else if (sk && typeof sk === "object" && (sk.id ?? sk.name)) discoveredSkills.add((sk.id ?? sk.name)!.trim());
    }
    if (msg.type === "skill") {
      if (typeof msg.skill === "string" && msg.skill.trim()) discoveredSkills.add(msg.skill.trim());
      else if (msg.skill && typeof msg.skill === "object" && (msg.skill.id ?? msg.skill.name)) discoveredSkills.add((msg.skill.id ?? msg.skill.name)!.trim());
      else if (typeof msg.skillId === "string" && msg.skillId.trim()) discoveredSkills.add(msg.skillId.trim());
    }
    const items = [...(msg.content ?? []), ...(msg.parts ?? [])];
    for (const part of items) {
      if (part.type === "skill" || part.tool === "skill" || part.name === "skill") {
        const rawIn = part.state?.input ?? ("input" in part ? part.input : undefined);
        const inId = typeof rawIn === "object" && rawIn
          ? ((rawIn as { id?: string; name?: string }).id ?? (rawIn as { id?: string; name?: string }).name)
          : typeof rawIn === "string" ? rawIn : part.skillId;
        if (inId && typeof inId === "string" && inId.trim()) discoveredSkills.add(inId.trim());
      }
    }
  }

  return {
    skills: discoveredSkills.size > 0 ? [...discoveredSkills] : undefined,
    latestAgentClass, latestModelId, activeTool: runningTool,
    recentTools: recentTools.length > 0 ? recentTools : undefined,
    latestContextTokens, compactedAtMs, lastAssistantText, lastUserPromptText,
    messages: hydratedMessages.length > 0 ? hydratedMessages : undefined, pendingQuestion,
  };
}
