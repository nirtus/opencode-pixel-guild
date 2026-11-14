import {
  resolveProjectHeraldry,
  resolveWorldFocusScope,
} from "../spatial/index.ts";
import type {
  CharacterState,
  GuildDelta,
  GuildSnapshot,
  GuildStateEmission,
} from "../types/domain.ts";
import { sanitizeAndExtractSkillsFromChatText } from "./chat-markdown-formatter.ts";
import type {
  ActivityTickerBuildOptions,
  ActivityTickerCategory,
  ActivityTickerEntryViewModel,
  ActivityTickerInputItem,
  ActivityTickerViewModel,
} from "./hud-character-types.ts";

function classifyTickerCategory(deltaKind: string): ActivityTickerCategory {
  if (
    deltaKind === "skill.activated" ||
    deltaKind === "message.skill.item" ||
    deltaKind === "message.user.prompt"
  ) {
    return "skill";
  }
  if (
    deltaKind === "permission.requested" ||
    deltaKind === "permission.resolved" ||
    deltaKind === "question.requested" ||
    deltaKind === "question.resolved"
  ) {
    return "quest-gate";
  }
  if (deltaKind === "session.compacted") {
    return "compaction";
  }
  if (deltaKind === "plugin.status.updated") {
    return "plugin";
  }
  if (deltaKind === "tool.started" || deltaKind === "tool.completed") {
    return "capability";
  }
  if (
    deltaKind === "location.discovered" ||
    deltaKind === "worktree.created" ||
    deltaKind === "session.moved" ||
    deltaKind === "room.deleted"
  ) {
    return "room";
  }
  if (deltaKind.startsWith("session.")) {
    return "lifecycle";
  }
  return "system";
}

export function formatActivityTickerEntry(
  emissionOrDelta: GuildStateEmission | GuildDelta,
): ActivityTickerEntryViewModel {
  const delta =
    "delta" in emissionOrDelta ? emissionOrDelta.delta : emissionOrDelta;
  return Object.freeze({
    timestamp: delta.timestampMs,
    roomId: delta.roomId,
    sessionId: delta.sessionId,
    category: classifyTickerCategory(delta.kind),
    summary: delta.description,
  });
}

function attachTickerHeraldry(
  entry: ActivityTickerEntryViewModel,
  snapshot?: GuildSnapshot | null,
): ActivityTickerEntryViewModel {
  if (!snapshot) return entry;
  const charTarget = entry.sessionId ? snapshot.characters?.[entry.sessionId] : undefined;
  const roomTarget = entry.roomId ? (snapshot.rooms?.[entry.roomId] ?? entry.roomId) : undefined;
  const target = charTarget ?? roomTarget;
  if (!target) return entry;
  const heraldry = resolveProjectHeraldry(target, snapshot);
  return Object.freeze({
    ...entry,
    projectId: heraldry.projectId,
    projectName: heraldry.projectName,
    shortTag: heraldry.shortTag,
    crestIcon: heraldry.crestIcon,
    partyKey: heraldry.partyKey,
  });
}

function collectCharacterHistoryEntries(
  characters: ReadonlyArray<CharacterState>,
  seenKeys: Set<string>,
  snapshot?: GuildSnapshot | null,
): Array<ActivityTickerEntryViewModel & { readonly _seq?: number }> {
  const synthesized: Array<ActivityTickerEntryViewModel & { readonly _seq?: number }> = [];
  for (const c of characters) {
    const heraldry = snapshot ? resolveProjectHeraldry(c, snapshot) : null;
    const heraldFields = heraldry
      ? {
          projectId: heraldry.projectId,
          projectName: heraldry.projectName,
          shortTag: heraldry.shortTag,
          crestIcon: heraldry.crestIcon,
          partyKey: heraldry.partyKey,
        }
      : {};
    for (const sk of c.skillGrimoires || []) {
      const summary = `${c.title || c.sessionId} equipped Skill Grimoire '${sk.name || sk.skillId}'`;
      const key = `skill:${c.sessionId}:${sk.skillId}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        const ts = sk.activatedAtMs || c.lastActivityAtMs || 0;
        synthesized.push({
          timestamp: ts,
          roomId: c.roomId ?? null,
          sessionId: c.sessionId,
          category: "skill",
          summary,
          ...heraldFields,
        });
      }
    }
    const orderedTools = [...(c.recentTools || [])].reverse();
    for (let idx = 0; idx < orderedTools.length; idx++) {
      const rt = orderedTools[idx]!;
      const summary = `${c.title || c.sessionId} → ${rt.workstation} (${rt.toolName}: ${rt.inputPreview || rt.toolName})`;
      const key = `tool:${c.sessionId}:${rt.callId}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        const ts = rt.startedAtMs || rt.timestampMs || c.lastActivityAtMs || 0;
        synthesized.push({
          timestamp: ts,
          roomId: c.roomId ?? null,
          sessionId: c.sessionId,
          category: "capability",
          summary,
          _seq: rt.sequenceOrder ?? idx,
          ...heraldFields,
        });
      }
    }
    const latestMsg = c.messages?.[c.messages.length - 1];
    if (latestMsg?.text) {
      const cleanTxt = sanitizeAndExtractSkillsFromChatText(latestMsg.text).cleanText.replace(/\s+/g, " ").trim();
      if (cleanTxt) {
        const snippet = cleanTxt.length > 84 ? `${cleanTxt.slice(0, 83)}…` : cleanTxt;
        const summary = `${c.title || c.sessionId} ${latestMsg.role === "user" ? "📜 Prompt" : "💬 Reply"}: ${snippet}`;
        const key = `msg:${c.sessionId}:${latestMsg.messageId}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          const ts = latestMsg.updatedAtMs || latestMsg.createdAtMs || c.lastActivityAtMs || 0;
          synthesized.push({
            timestamp: ts,
            roomId: c.roomId ?? null,
            sessionId: c.sessionId,
            category: latestMsg.role === "user" ? "skill" : "lifecycle",
            summary,
            ...heraldFields,
          });
        }
      }
    }
  }
  return synthesized;
}

export function buildActivityTickerViewModel(
  inputs: ReadonlyArray<ActivityTickerInputItem>,
  maxEntries = 18,
  options?: ActivityTickerBuildOptions,
): ActivityTickerViewModel {
  const snapshot = options?.snapshot ?? null;
  const scope = snapshot ? resolveWorldFocusScope(snapshot, options) : null;
  const isSingleWorld = Boolean(scope && !scope.isMultiProjectScope);
  const scopedRoomSet = scope ? new Set(scope.scopedRooms.map((r) => r.roomId)) : null;
  const scopedCharSet = scope ? new Set(scope.scopedCharacters.map((c) => c.sessionId)) : null;
  const focusProjectId =
    isSingleWorld && snapshot && (options?.selectedProjectId || options?.selectedRoomId)
      ? resolveProjectHeraldry(
          scope?.selectedProjectRoom ?? options?.selectedProjectId ?? options?.selectedRoomId,
          snapshot,
        ).projectId.toLowerCase()
      : null;

  const formatted: Array<ActivityTickerEntryViewModel & { readonly _seq?: number }> = [];
  const seenKeys = new Set<string>();

  for (const item of inputs) {
    const dedupeKey = JSON.stringify(item);
    seenKeys.add(dedupeKey);
    let baseEntry: ActivityTickerEntryViewModel | null = null;
    if ("delta" in item || "kind" in item) {
      baseEntry = formatActivityTickerEntry(item as GuildStateEmission | GuildDelta);
    } else if ("category" in item && "summary" in item) {
      const rawEntry = item as {
        readonly timestamp?: number;
        readonly timestampMs?: number;
        readonly category?: string;
        readonly roomId?: string | null;
        readonly sessionId?: string | null;
        readonly summary?: string;
      };
      baseEntry = Object.freeze({
        timestamp: rawEntry.timestamp ?? rawEntry.timestampMs ?? 0,
        category: (rawEntry.category as ActivityTickerCategory) ?? "lifecycle",
        roomId: rawEntry.roomId ?? null,
        sessionId: rawEntry.sessionId ?? null,
        summary: rawEntry.summary ?? "",
      });
    }
    if (!baseEntry) continue;
    const enriched = attachTickerHeraldry(baseEntry, snapshot);
    if (isSingleWorld) {
      const matchesRoom = Boolean(enriched.roomId && scopedRoomSet?.has(enriched.roomId));
      const matchesChar = Boolean(enriched.sessionId && scopedCharSet?.has(enriched.sessionId));
      const matchesProj = Boolean(
        focusProjectId && enriched.projectId && enriched.projectId.toLowerCase() === focusProjectId,
      );
      if (!matchesRoom && !matchesChar && !matchesProj) continue;
    }
    formatted.push(enriched);
  }

  if (snapshot && options?.includeCharacterHistory !== false) {
    const sourceChars = options?.characters ?? (scope ? scope.scopedCharacters : Object.values(snapshot.characters ?? {}));
    const historyItems = collectCharacterHistoryEntries(sourceChars, seenKeys, snapshot);
    formatted.push(...historyItems);
    formatted.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0) || (a._seq ?? 0) - (b._seq ?? 0));
  }

  const sliced = formatted
    .slice(-maxEntries)
    .reverse()
    .map(({ _seq: _unused, ...rest }) => Object.freeze(rest));
  return Object.freeze({
    entries: Object.freeze(sliced),
  });
}
