import type {
  CharacterState,
  ContextManaState,
  SessionTokenTelemetry,
  SessionTributeRecord,
  WorkshopRoomState,
} from "../types/domain.ts";
import { normalizeLocationDirectory } from "./location-normalization.ts";

export function resolveModelContextLimit(
  modelId?: string | null,
  catalogModels?: Record<string, { limitContext: number }>,
): number {
  const raw = (modelId ?? "").trim();
  if (raw) {
    const lower = raw.toLowerCase();
    const shortId = lower.split("/").pop() ?? lower;
    if (catalogModels) {
      const exact =
        catalogModels[raw] ??
        catalogModels[lower] ??
        catalogModels[shortId];
      if (exact && typeof exact.limitContext === "number" && exact.limitContext > 0) {
        return exact.limitContext;
      }
    }
    if (shortId.includes("gemini-")) {
      return 1_048_576;
    }
    if (shortId.includes("gpt-5") || shortId.includes("codex")) {
      return 400_000;
    }
    if (shortId.includes("flint-") || shortId.includes("qwen3")) {
      return 262_144;
    }
  }
  return 200_000;
}

export function createInitialContextMana(
  tokens?: SessionTokenTelemetry,
  modelId?: string | null,
  catalogModels?: Record<string, { limitContext: number }>,
): ContextManaState {
  const inputTokens = tokens?.inputTokens ?? tokens?.input ?? 0;
  const outputTokens = tokens?.outputTokens ?? tokens?.output ?? 0;
  const cacheReadTokens = tokens?.cacheReadTokens ?? tokens?.cacheRead ?? 0;
  const cacheWriteTokens = tokens?.cacheWriteTokens ?? tokens?.cacheWrite ?? 0;
  const usedTokens =
    tokens?.usedTokens ?? (inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens);
  const limitTokens =
    typeof tokens?.limitTokens === "number" && tokens.limitTokens > 0
      ? tokens.limitTokens
      : resolveModelContextLimit(modelId, catalogModels);
  const fillRatio =
    limitTokens > 0 ? Math.min(1, Math.max(0, usedTokens / limitTokens)) : 0;
  return {
    usedTokens,
    limitTokens,
    fillRatio,
    inputTokens: tokens?.inputTokens ?? tokens?.input ?? usedTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    totalCostUsd: tokens?.totalCostUsd ?? tokens?.totalUsd ?? 0,
    compactionCount: 0,
    lastDistilledAtMs: null,
  };
}

export function updateContextMana(
  current: ContextManaState,
  tokens?: SessionTokenTelemetry,
  modelId?: string | null,
  catalogModels?: Record<string, { limitContext: number }>,
): void {
  const resolvedModelLimit = resolveModelContextLimit(modelId, catalogModels);
  if (!tokens) {
    if (modelId && resolvedModelLimit > 0) {
      current.limitTokens = resolvedModelLimit;
    }
    current.fillRatio =
      current.limitTokens > 0
        ? Math.min(1, Math.max(0, current.usedTokens / current.limitTokens))
        : 0;
    return;
  }
  const inTok = tokens.inputTokens ?? tokens.input;
  const outTok = tokens.outputTokens ?? tokens.output;
  const cacheRead = tokens.cacheReadTokens ?? tokens.cacheRead;
  const cacheWrite = tokens.cacheWriteTokens ?? tokens.cacheWrite;
  if (typeof inTok === "number") {
    current.inputTokens = inTok;
  }
  if (typeof outTok === "number") {
    current.outputTokens = outTok;
  }
  if (typeof cacheRead === "number") {
    current.cacheReadTokens = cacheRead;
  }
  if (typeof cacheWrite === "number") {
    current.cacheWriteTokens = cacheWrite;
  }
  const isCumulativeOnly = Boolean((tokens as { cumulativeOnly?: boolean }).cumulativeOnly);
  if (typeof tokens.usedTokens === "number") {
    current.usedTokens = tokens.usedTokens;
  } else if (
    !isCumulativeOnly &&
    (typeof inTok === "number" ||
      typeof outTok === "number" ||
      typeof cacheRead === "number" ||
      typeof cacheWrite === "number")
  ) {
    current.usedTokens =
      current.inputTokens +
      current.outputTokens +
      current.cacheReadTokens +
      current.cacheWriteTokens;
  }
  if (typeof tokens.limitTokens === "number" && tokens.limitTokens > 0) {
    current.limitTokens = tokens.limitTokens;
  } else if (modelId && resolvedModelLimit > 0 && !isCumulativeOnly) {
    current.limitTokens = resolvedModelLimit;
  }
  const totalUsd = tokens.totalCostUsd ?? tokens.totalUsd;
  if (typeof totalUsd === "number") {
    current.totalCostUsd = totalUsd;
  }
  current.fillRatio =
    current.limitTokens > 0
      ? Math.min(1, Math.max(0, current.usedTokens / current.limitTokens))
      : 0;
}

export function mergeSessionTributeRecord(
  tributeLedger: Record<string, SessionTributeRecord>,
  incoming: SessionTributeRecord,
): SessionTributeRecord {
  const sessionId = incoming.sessionId;
  const prev = tributeLedger[sessionId];
  const inputTokens = Math.max(prev?.inputTokens ?? 0, incoming.inputTokens ?? 0);
  const outputTokens = Math.max(prev?.outputTokens ?? 0, incoming.outputTokens ?? 0);
  const cacheReadTokens = Math.max(prev?.cacheReadTokens ?? 0, incoming.cacheReadTokens ?? 0);
  const cacheWriteTokens = Math.max(prev?.cacheWriteTokens ?? 0, incoming.cacheWriteTokens ?? 0);
  const bucketSum = inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens;
  const totalTokens = Math.max(prev?.totalTokens ?? 0, incoming.totalTokens ?? 0, bucketSum);
  const totalCostUsd = Math.max(prev?.totalCostUsd ?? 0, incoming.totalCostUsd ?? 0);
  const merged: SessionTributeRecord = {
    sessionId,
    roomId: incoming.roomId || prev?.roomId || "",
    locationDirectory: incoming.locationDirectory || prev?.locationDirectory || "",
    projectId: incoming.projectId || prev?.projectId || incoming.locationDirectory || incoming.roomId || "",
    totalTokens,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    totalCostUsd,
    updatedAtMs: Math.max(prev?.updatedAtMs ?? 0, incoming.updatedAtMs ?? 0),
  };
  tributeLedger[sessionId] = merged;
  return merged;
}

export function syncCharacterTributeRecord(
  tributeLedger: Record<string, SessionTributeRecord>,
  char: CharacterState,
  rooms?: Record<string, WorkshopRoomState>,
): SessionTributeRecord | null {
  if (!char?.sessionId) return null;
  const prev = tributeLedger[char.sessionId];
  const mana = char.contextMana;
  const roomId = normalizeLocationDirectory(char.roomId || char.locationDirectory || prev?.roomId || "");
  const locationDirectory = normalizeLocationDirectory(
    char.locationDirectory || char.roomId || prev?.locationDirectory || "",
  );
  const room = rooms?.[roomId] ?? rooms?.[locationDirectory];
  const projectId = room?.parentProjectDirectory
    ? normalizeLocationDirectory(room.parentProjectDirectory)
    : room?.projectId || prev?.projectId || locationDirectory || roomId;
  const inputTokens = Math.max(prev?.inputTokens ?? 0, mana?.inputTokens ?? 0);
  const outputTokens = Math.max(prev?.outputTokens ?? 0, mana?.outputTokens ?? 0);
  const cacheReadTokens = Math.max(prev?.cacheReadTokens ?? 0, mana?.cacheReadTokens ?? 0);
  const cacheWriteTokens = Math.max(prev?.cacheWriteTokens ?? 0, mana?.cacheWriteTokens ?? 0);
  const bucketSum = inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens;
  const totalTokens = Math.max(prev?.totalTokens ?? 0, bucketSum, mana?.usedTokens ?? 0);
  const totalCostUsd = Math.max(prev?.totalCostUsd ?? 0, mana?.totalCostUsd ?? 0);
  return mergeSessionTributeRecord(tributeLedger, {
    sessionId: char.sessionId,
    roomId,
    locationDirectory,
    projectId,
    totalTokens,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    totalCostUsd,
    updatedAtMs: Math.max(prev?.updatedAtMs ?? 0, char.lastActivityAtMs || 0),
  });
}

export function syncAllCharacterTributes(state: {
  tributeLedger: Record<string, SessionTributeRecord>;
  characters: Record<string, CharacterState>;
  rooms: Record<string, WorkshopRoomState>;
}): void {
  for (const char of Object.values(state.characters)) {
    syncCharacterTributeRecord(state.tributeLedger, char, state.rooms);
  }
}
