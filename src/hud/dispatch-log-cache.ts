import type { SessionChatMessage } from "../types/domain.ts";
import {
  buildFenceSafePreviewSlice,
  formatChatMarkdownHtml,
  sanitizeAndExtractSkillsFromChatText,
} from "./chat-markdown-formatter.ts";
import type {
  AdventurerDispatchLogViewModel,
  AdventurerDispatchTurnViewModel,
} from "./hud-character-types.ts";

export interface DispatchLogBuildInput {
  readonly sessionId: string;
  readonly agentDisplayName: string;
  readonly modelId: string;
  readonly overheadLabel: string;
  readonly isBusy: boolean;
  readonly messages: readonly SessionChatMessage[];
  readonly lastUserPromptText: string | null;
  readonly lastAssistantText: string | null;
}

export interface DispatchLogBuildOptions {
  readonly formatMarkdown?: (text: string) => string;
}

type FormatMarkdownFn = (text: string) => string;

interface CachedDispatchLogEntry {
  readonly turnsMetaDigest: string;
  readonly lastUserPrompt: string;
  readonly lastReply: string;
  readonly msgTexts: readonly string[];
  readonly turnsRevPart: string;
  readonly turns: readonly AdventurerDispatchTurnViewModel[];
  readonly isBusy: boolean;
  readonly overheadLabel: string;
  readonly result: AdventurerDispatchLogViewModel;
}

interface CachedTurnHtmlEntry {
  readonly text: string;
  readonly html: string;
}

interface CachedSanitizedTurnEntry {
  readonly rawText: string;
  readonly cleanText: string;
  readonly skills: readonly string[];
}

interface FormatterCacheBucket {
  readonly dispatchLogCache: Map<string, CachedDispatchLogEntry>;
  readonly turnHtmlCache: Map<string, CachedTurnHtmlEntry>;
}

const DISPATCH_LOG_CACHE_MAX = 64;
const TURN_HTML_CACHE_MAX = 512;
const TURN_SANITIZE_CACHE_MAX = 512;

const defaultFormatterCaches: FormatterCacheBucket = {
  dispatchLogCache: new Map<string, CachedDispatchLogEntry>(),
  turnHtmlCache: new Map<string, CachedTurnHtmlEntry>(),
};
const customFormatterCachesByFn = new WeakMap<FormatMarkdownFn, FormatterCacheBucket>();
const customFormatterBucketRefs = new Set<WeakRef<FormatterCacheBucket>>();
const turnSanitizeCache = new Map<string, CachedSanitizedTurnEntry>();

function getFormatterCaches(formatFn: FormatMarkdownFn): FormatterCacheBucket {
  if (formatFn === formatChatMarkdownHtml) return defaultFormatterCaches;
  let bucket = customFormatterCachesByFn.get(formatFn);
  if (!bucket) {
    bucket = { dispatchLogCache: new Map(), turnHtmlCache: new Map() };
    customFormatterCachesByFn.set(formatFn, bucket);
    if (typeof WeakRef === "function") {
      customFormatterBucketRefs.add(new WeakRef(bucket));
    }
  }
  return bucket;
}

function touchLruEntry<K, V>(cache: Map<K, V>, key: K, value: V, maxSize: number): void {
  if (cache.has(key)) {
    cache.delete(key);
  } else if (cache.size >= maxSize) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, value);
}

function resolveMessageIdentity(msg: SessionChatMessage, fallbackIdx: number): string {
  const legacyId = (msg as { readonly id?: string }).id;
  return msg.messageId || legacyId || `idx:${fallbackIdx}`;
}

function resolveMessageTimestamp(msg: SessionChatMessage): number {
  const legacyTs = (msg as { readonly timestampMs?: number }).timestampMs;
  return msg.updatedAtMs ?? msg.createdAtMs ?? legacyTs ?? 0;
}

function sanitizeTurnCached(
  sessionId: string,
  turnIdentity: string,
  rawText: string,
): { readonly cleanText: string; readonly skills: readonly string[] } {
  const text = rawText || "";
  if (!text) return { cleanText: "", skills: [] };
  const cacheKey = `${sessionId}:${turnIdentity}:${text.length}`;
  const cached = turnSanitizeCache.get(cacheKey);
  if (cached && cached.rawText === text) {
    touchLruEntry(turnSanitizeCache, cacheKey, cached, TURN_SANITIZE_CACHE_MAX);
    return cached;
  }
  const sanitized = sanitizeAndExtractSkillsFromChatText(text);
  const entry: CachedSanitizedTurnEntry = {
    rawText: text,
    cleanText: sanitized.cleanText,
    skills: Object.freeze(sanitized.skills),
  };
  touchLruEntry(turnSanitizeCache, cacheKey, entry, TURN_SANITIZE_CACHE_MAX);
  return entry;
}

function formatTurnMarkdownHtmlCached(
  htmlCache: Map<string, CachedTurnHtmlEntry>,
  cacheKey: string,
  cleanText: string,
  formatFn: FormatMarkdownFn,
): string {
  const cached = htmlCache.get(cacheKey);
  if (cached && cached.text === cleanText) {
    touchLruEntry(htmlCache, cacheKey, cached, TURN_HTML_CACHE_MAX);
    return cached.html;
  }
  const html = formatFn(cleanText);
  touchLruEntry(htmlCache, cacheKey, { text: cleanText, html }, TURN_HTML_CACHE_MAX);
  return html;
}

function computeDispatchTurnsMetaDigest(
  input: DispatchLogBuildInput,
  msgs: readonly SessionChatMessage[],
): string {
  const msgParts = new Array<string>(msgs.length);
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i]!;
    const skills = m.attachedSkills?.length ? m.attachedSkills.join(",") : "";
    msgParts[i] =
      `${resolveMessageIdentity(m, i)}:${m.role}:${resolveMessageTimestamp(m)}:${(m.text || "").length}:${skills}`;
  }
  return [input.agentDisplayName, input.modelId, msgs.length, msgParts.join("|")].join("\u0001");
}

function matchesCachedTurns(
  cached: CachedDispatchLogEntry,
  turnsMetaDigest: string,
  lastUserPrompt: string,
  lastReply: string,
  msgs: readonly SessionChatMessage[],
): boolean {
  if (
    cached.turnsMetaDigest !== turnsMetaDigest ||
    cached.lastUserPrompt !== lastUserPrompt ||
    cached.lastReply !== lastReply ||
    cached.msgTexts.length !== msgs.length
  ) {
    return false;
  }
  for (let i = 0; i < msgs.length; i++) {
    if (cached.msgTexts[i] !== (msgs[i]!.text || "")) return false;
  }
  return true;
}

export function buildAdventurerDispatchLogViewModel(
  input: DispatchLogBuildInput,
  options?: DispatchLogBuildOptions,
): AdventurerDispatchLogViewModel {
  const formatFn: FormatMarkdownFn = options?.formatMarkdown ?? formatChatMarkdownHtml;
  const { dispatchLogCache, turnHtmlCache } = getFormatterCaches(formatFn);
  const msgs = Array.isArray(input.messages) ? input.messages : [];
  const lastUserPrompt = (input.lastUserPromptText ?? "").trim();
  const lastReply = (input.lastAssistantText ?? "").trim();
  const turnsMetaDigest = computeDispatchTurnsMetaDigest(input, msgs);
  const overheadLabel = input.overheadLabel || "";

  const cached = dispatchLogCache.get(input.sessionId);
  if (cached && matchesCachedTurns(cached, turnsMetaDigest, lastUserPrompt, lastReply, msgs)) {
    if (cached.isBusy === input.isBusy && cached.overheadLabel === overheadLabel) {
      touchLruEntry(dispatchLogCache, input.sessionId, cached, DISPATCH_LOG_CACHE_MAX);
      return cached.result;
    }
    const revisionKey = `${cached.turnsRevPart}:${input.isBusy ? 1 : 0}:${input.overheadLabel}`;
    const result: AdventurerDispatchLogViewModel = Object.freeze({
      turns: cached.turns,
      revisionKey,
      isBusy: input.isBusy,
      overheadVerb: input.overheadLabel || "Working",
    });
    touchLruEntry(
      dispatchLogCache,
      input.sessionId,
      { ...cached, isBusy: input.isBusy, overheadLabel, result },
      DISPATCH_LOG_CACHE_MAX,
    );
    return result;
  }

  const rawTurns: SessionChatMessage[] = [...msgs];

  if (lastUserPrompt) {
    const cleanPrompt = sanitizeTurnCached(input.sessionId, "fallback:lastUserPrompt", lastUserPrompt).cleanText;
    const hasMatchingUser = rawTurns.some(
      (m, idx) =>
        m.role === "user" &&
        sanitizeTurnCached(input.sessionId, resolveMessageIdentity(m, idx), m.text || "").cleanText.slice(0, 180) === cleanPrompt.slice(0, 180),
    );
    if (!hasMatchingUser && cleanPrompt) {
      rawTurns.push({
        messageId: `u:${input.sessionId}`, role: "user", text: lastUserPrompt,
        createdAtMs: (rawTurns[rawTurns.length - 1]?.createdAtMs ?? 0) + 1,
      });
    }
  }

  if (lastReply) {
    const cleanReply = sanitizeTurnCached(input.sessionId, "fallback:lastReply", lastReply).cleanText;
    const lastTurn = rawTurns[rawTurns.length - 1];
    let lastAsstIdx = -1;
    for (let i = rawTurns.length - 1; i >= 0; i--) {
      if (rawTurns[i]?.role === "assistant") { lastAsstIdx = i; break; }
    }
    const lastAsst = lastAsstIdx >= 0 ? rawTurns[lastAsstIdx] : undefined;
    const lastAsstClean = lastAsst
      ? sanitizeTurnCached(input.sessionId, resolveMessageIdentity(lastAsst, lastAsstIdx), lastAsst.text || "").cleanText
      : "";
    const hasMatchingAsst = rawTurns.some(
      (m, idx) =>
        m.role === "assistant" &&
        sanitizeTurnCached(input.sessionId, resolveMessageIdentity(m, idx), m.text || "").cleanText.slice(0, 180) === cleanReply.slice(0, 180),
    );

    if (!lastAsst && cleanReply) {
      rawTurns.push({
        messageId: `a:${input.sessionId}`, role: "assistant", text: lastReply,
        createdAtMs: (rawTurns[rawTurns.length - 1]?.createdAtMs ?? 0) + 2,
      });
    } else if (lastTurn?.role === "assistant" && cleanReply.slice(0, 180) === lastAsstClean.slice(0, 180)) {
      if (cleanReply.length > lastAsstClean.length) rawTurns[rawTurns.length - 1] = { ...lastTurn, text: lastReply };
    } else if (cleanReply && !hasMatchingAsst) {
      rawTurns.push({
        messageId: `a:${input.sessionId}:live`, role: "assistant", text: lastReply,
        createdAtMs: (rawTurns[rawTurns.length - 1]?.createdAtMs ?? 0) + 2,
      });
    }
  }

  const deduped: Array<{ msg: SessionChatMessage; turnIdentity: string; cleanText: string; skills: string[] }> = [];
  for (let idx = 0; idx < rawTurns.length; idx++) {
    const t = rawTurns[idx]!;
    const turnIdentity = resolveMessageIdentity(t, idx);
    const { cleanText, skills } = sanitizeTurnCached(input.sessionId, turnIdentity, t.text || "");
    const mergedSkills = Array.from(new Set([...(t.attachedSkills ?? []), ...skills]));
    if (!cleanText && mergedSkills.length === 0) continue;

    const prev = deduped[deduped.length - 1];
    if (prev && prev.msg.role === t.role && prev.cleanText.slice(0, 180) === cleanText.slice(0, 180)) {
      const combinedSkills = Array.from(new Set([...prev.skills, ...mergedSkills]));
      if (cleanText.length >= prev.cleanText.length) {
        deduped[deduped.length - 1] = { msg: t, turnIdentity, cleanText, skills: combinedSkills };
      } else {
        prev.skills = combinedSkills;
      }
      continue;
    }
    deduped.push({ msg: t, turnIdentity, cleanText, skills: mergedSkills });
  }

  const rawModel = String(input.modelId || "").trim();
  const shortModel = rawModel.indexOf("/") >= 0 ? rawModel.slice(rawModel.indexOf("/") + 1) : rawModel;
  const badgeText = shortModel ? `${input.agentDisplayName} · ${shortModel}` : input.agentDisplayName;

  const turns: readonly AdventurerDispatchTurnViewModel[] = Object.freeze(
    deduped.map((item, idx) => {
      const stableTurnId = `turn-${idx}-${item.msg.role}`;
      const isRecentUnclippedTurn = idx >= deduped.length - 2;
      const isOlderTurn = !isRecentUnclippedTurn;
      const isLongMessage = item.cleanText.length > 2400 || item.cleanText.split("\n").length > 40;
      const canCompact = !isRecentUnclippedTurn && isLongMessage;
      const previewText = canCompact ? buildFenceSafePreviewSlice(item.cleanText, 1200) : item.cleanText;
      const fullHtml = formatTurnMarkdownHtmlCached(
        turnHtmlCache, `${input.sessionId}:${item.turnIdentity}:full:${item.cleanText.length}`, item.cleanText, formatFn,
      );
      const compactHtml = canCompact
        ? formatTurnMarkdownHtmlCached(
            turnHtmlCache, `${input.sessionId}:${item.turnIdentity}:compact:${previewText.length}`, previewText, formatFn,
          )
        : fullHtml;

      return Object.freeze({
        messageId: stableTurnId, role: item.msg.role,
        speakerLabel: item.msg.role === "user" ? "📜 You:" : "💬 Reply:",
        agentBadgeLabel: item.msg.role === "assistant" ? badgeText : null,
        cleanText: item.cleanText, skills: Object.freeze(item.skills),
        canCompact, isOlderTurn, isLongMessage, previewText, fullHtml, compactHtml,
        createdAtMs: item.msg.createdAtMs,
      });
    }),
  );

  const turnsRevPart = `${turns.length}:${turns.map((t) => `${t.messageId}:${t.cleanText.length}:${t.skills.length}`).join("|")}`;
  const revisionKey = `${turnsRevPart}:${input.isBusy ? 1 : 0}:${input.overheadLabel}`;
  const result: AdventurerDispatchLogViewModel = Object.freeze({
    turns, revisionKey, isBusy: input.isBusy, overheadVerb: input.overheadLabel || "Working",
  });

  const msgTexts = msgs.map((m) => m.text || "");
  touchLruEntry(
    dispatchLogCache,
    input.sessionId,
    { turnsMetaDigest, lastUserPrompt, lastReply, msgTexts, turnsRevPart, turns, isBusy: input.isBusy, overheadLabel, result },
    DISPATCH_LOG_CACHE_MAX,
  );
  return result;
}

function pruneFormatterBucket(bucket: FormatterCacheBucket, hasSession: (sessionId: string) => boolean): void {
  for (const sid of bucket.dispatchLogCache.keys()) if (!hasSession(sid)) bucket.dispatchLogCache.delete(sid);
  for (const k of bucket.turnHtmlCache.keys()) { const i = k.indexOf(":"); if (i > 0 && !hasSession(k.slice(0, i))) bucket.turnHtmlCache.delete(k); }
}

export function pruneDispatchLogSessionCaches(hasSession: (sessionId: string) => boolean): void {
  pruneFormatterBucket(defaultFormatterCaches, hasSession);
  for (const ref of customFormatterBucketRefs) {
    const bucket = ref.deref();
    if (!bucket) customFormatterBucketRefs.delete(ref);
    else pruneFormatterBucket(bucket, hasSession);
  }
  for (const k of turnSanitizeCache.keys()) { const i = k.indexOf(":"); if (i > 0 && !hasSession(k.slice(0, i))) turnSanitizeCache.delete(k); }
}
