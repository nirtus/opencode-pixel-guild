import {
  normalizeLocationDirectory,
  toDaemonDirectoryPath,
} from "../state/world-reducer.ts";
import {
  mergeQuestGateFields,
  normalizeQuestGateFields,
  type QuestGateSource,
  type SessionTokenTelemetry,
} from "../types/domain.ts";
import type { OpenCodeDaemonLocationPayload } from "./daemon-types.ts";
import {
  hydrateSessionMessages,
  type SessionMessageHydration,
} from "./daemon-message-hydration.ts";
import {
  mapDaemonSessionTokens,
  mergeDaemonPluginsAndMcps,
  normalizeDaemonModels,
  type RawDaemonMcpResponse,
  type RawDaemonModelItem,
  type RawDaemonPluginItem,
} from "./daemon-mcp-normalizer.ts";

const TEN_MINUTES_MS = 600_000;
const ONE_DAY_MS = 86_400_000;
const STATIC_CATALOG_TTL_MS = 60_000;

interface CachedStaticCatalog {
  expiresAtMs: number;
  skills: Array<{ id: string; name?: string; description?: string }> | null;
  plugins: RawDaemonPluginItem[] | null;
  mcps: RawDaemonMcpResponse | null;
  agents: Array<{ id?: string; name?: string; color?: string; mode?: string; hidden?: boolean; disabled?: boolean; description?: string }> | null;
  rawModels: RawDaemonModelItem[] | null;
}

const staticCatalogCache = new Map<string, CachedStaticCatalog>();
const idleMessageHydrationCache = new Map<
  string,
  { updatedAtMs: number; hydration: SessionMessageHydration }
>();

export function evictIdleMessageHydrationCache(sessionId?: string): void {
  if (!sessionId) {
    idleMessageHydrationCache.clear();
    return;
  }
  const suffix = `::${sessionId}`;
  for (const key of idleMessageHydrationCache.keys()) {
    if (key.endsWith(suffix)) idleMessageHydrationCache.delete(key);
  }
}

interface RawDaemonSessionItem {
  id?: string; sessionId?: string; parentID?: string | null; parentId?: string | null;
  title?: string; agent?: string; agentClass?: string;
  model?: { id?: string; providerID?: string; variant?: string } | string; modelID?: string; modelId?: string;
  cost?: number; outcome?: "succeeded" | "failed" | "interrupted";
  tokens?: SessionTokenTelemetry & { input?: number; output?: number; cache?: { read?: number; write?: number } };
  skills?: string[]; time?: { created?: number; updated?: number; viewed?: number; archived?: number; idle?: number; busy?: number };
  location?: { directory?: string }; compactedAtMs?: number | null; archived?: boolean;
}

function resolveSessionActivityMs(s: RawDaemonSessionItem): number | undefined {
  const candidates = [s.time?.updated, s.time?.idle, s.time?.busy, s.time?.viewed, s.time?.created].filter(
    (t): t is number => typeof t === "number" && t > 0,
  );
  return candidates.length > 0 ? Math.max(...candidates) : undefined;
}

function isUnviewedRootSession(s: RawDaemonSessionItem, activeIdSet: Set<string>, nowMs = Date.now(), compactedAtMs?: number | null): boolean {
  const sid = s.sessionId ?? s.id;
  if (!sid || s.parentId || s.parentID || s.archived || s.time?.archived || activeIdSet.has(sid)) return false;
  const idleMs = s.time?.idle;
  const viewedMs = s.time?.viewed;
  if (typeof compactedAtMs === "number" && compactedAtMs > 0 && typeof idleMs === "number" && compactedAtMs >= idleMs - 15_000) return false;
  return typeof idleMs === "number" && idleMs > 0 && nowMs - idleMs <= ONE_DAY_MS && (typeof viewedMs !== "number" || viewedMs < idleMs);
}

interface RawDaemonGateItem {
  id?: string; gateId?: string; sessionID?: string; sessionId?: string;
  action?: string; resources?: string[]; message?: string; title?: string; reason?: string;
  fields?: Array<{ key?: string; title?: string; description?: string; label?: string }>;
}

export async function fetchDaemonLocationState(
  rootUrl: string,
  _headers: Record<string, string>,
  fetchJson: <T>(path: string, extraHeaders?: Record<string, string>) => Promise<T | null>,
  directory: string,
): Promise<OpenCodeDaemonLocationPayload> {
  const daemonDir = toDaemonDirectoryPath(directory);
  const locHeaders = { "x-opencode-directory": daemonDir };
  const query = `?location[directory]=${encodeURIComponent(daemonDir)}`;
  const sessionQuery = `?directory=${encodeURIComponent(daemonDir)}&location[directory]=${encodeURIComponent(daemonDir)}`;
  const normTargetDir = normalizeLocationDirectory(directory);
  const cacheKey = `${rootUrl}::${normTargetDir}`;
  const cacheNowMs = Date.now();
  const cachedCatalog = staticCatalogCache.get(cacheKey);
  const isWorktreeOrRoot = Boolean(rootUrl) && normTargetDir === "/";
  const hasValidCache = Boolean(isWorktreeOrRoot || (cachedCatalog && cachedCatalog.expiresAtMs > cacheNowMs && rootUrl));

  if (isWorktreeOrRoot) {
    const rawSessionsQuick = await fetchJson<RawDaemonSessionItem[]>(`/api/session${sessionQuery}&limit=100`, locHeaders);
    const matchingQuick = (Array.isArray(rawSessionsQuick) ? rawSessionsQuick : []).filter(
      (s) => normalizeLocationDirectory(s.location?.directory ?? directory) === normTargetDir,
    );
    if (matchingQuick.length === 0) {
      return { skills: [], plugins: [], agents: [], models: [], activeSessionIds: [], sessions: [], pendingPermissions: [], pendingQuestions: [] };
    }
  }

  const [skills, plugins, mcps, agents, rawModels, rawSessions, rawRootSessions, activeSessions, permissions, forms] =
    await Promise.all([
      hasValidCache ? Promise.resolve(cachedCatalog?.skills ?? null) : fetchJson<Array<{ id: string; name?: string; description?: string }>>(`/api/skill${query}`, locHeaders),
      hasValidCache ? Promise.resolve(cachedCatalog?.plugins ?? null) : fetchJson<RawDaemonPluginItem[]>(`/api/plugin${query}`, locHeaders),
      hasValidCache ? Promise.resolve(cachedCatalog?.mcps ?? null) : fetchJson<RawDaemonMcpResponse>(`/api/mcp${query}`, locHeaders),
      hasValidCache ? Promise.resolve(cachedCatalog?.agents ?? null) : fetchJson<Array<{ id?: string; name?: string; color?: string; mode?: string; hidden?: boolean; disabled?: boolean; description?: string }>>(`/api/agent${query}`, locHeaders),
      hasValidCache ? Promise.resolve(cachedCatalog?.rawModels ?? null) : fetchJson<RawDaemonModelItem[]>(`/api/model${query}`, locHeaders),
      fetchJson<RawDaemonSessionItem[]>(`/api/session${sessionQuery}&limit=200`, locHeaders),
      fetchJson<RawDaemonSessionItem[]>(`/api/session${sessionQuery}&parentID=null&limit=100`, locHeaders),
      fetchJson<Array<string | { id?: string; sessionId?: string }> | Record<string, { type?: string; status?: string }>>(`/api/session/active${query}`, locHeaders),
      isWorktreeOrRoot ? Promise.resolve(null) : fetchJson<RawDaemonGateItem[]>(`/api/permission/request${query}`, locHeaders),
      isWorktreeOrRoot ? Promise.resolve(null) : fetchJson<RawDaemonGateItem[]>(`/api/form${query}`, locHeaders),
    ]);

  if (!hasValidCache && rootUrl) {
    staticCatalogCache.set(cacheKey, { expiresAtMs: cacheNowMs + STATIC_CATALOG_TTL_MS, skills, plugins, mcps, agents, rawModels });
  }

  const { models, modelLimitByKey } = normalizeDaemonModels(rawModels);
  const mergedPlugins = mergeDaemonPluginsAndMcps(mcps, plugins);

  const mergedRawSessionsMap = new Map<string, RawDaemonSessionItem>();
  for (const s of [...(Array.isArray(rawSessions) ? rawSessions : []), ...(Array.isArray(rawRootSessions) ? rawRootSessions : [])]) {
    const sid = s?.sessionId ?? s?.id;
    if (sid && !mergedRawSessionsMap.has(sid)) {
      mergedRawSessionsMap.set(sid, s);
    }
  }
  const filteredRawSessions = [...mergedRawSessionsMap.values()].filter(
    (s) =>
      normalizeLocationDirectory(
        s.location?.directory ?? (s as { directory?: string }).directory ?? directory,
      ).toLowerCase() === normTargetDir.toLowerCase(),
  );
  const locationSessionIdSet = new Set<string>(
    filteredRawSessions.map((s) => s.sessionId ?? s.id).filter((id): id is string => Boolean(id)),
  );

  const rawActiveIds: string[] = [];
  if (Array.isArray(activeSessions)) {
    for (const entry of activeSessions) {
      if (typeof entry === "string") {
        rawActiveIds.push(entry);
      } else if (entry && typeof (entry.sessionId ?? entry.id) === "string") {
        rawActiveIds.push((entry.sessionId ?? entry.id)!);
      }
    }
  } else if (activeSessions && typeof activeSessions === "object") {
    for (const [sessionId, info] of Object.entries(activeSessions)) {
      if (
        info &&
        (info.type === "running" ||
          info.status === "running" ||
          info.type === "busy" ||
          info.status === "busy")
      ) {
        rawActiveIds.push(sessionId);
      }
    }
  }

  const RECENT_BUSY_HEARTBEAT_MS = 20_000;
  const activeSessionIds = rawActiveIds.filter((id) => locationSessionIdSet.has(id));
  const activeIdSet = new Set<string>(activeSessionIds);
  const isParentFinished = (pid: string | null): boolean => {
    if (!pid || activeIdSet.has(pid)) return false;
    const p = mergedRawSessionsMap.get(pid);
    if (!p) return true;
    if (p.archived || p.time?.archived) return true;
    const pBusy = p.time?.busy ?? 0;
    const pIdle = p.time?.idle ?? 0;
    const pUpdated = resolveSessionActivityMs(p) ?? 0;
    if (pIdle > 0 && pIdle >= pBusy) return true;
    return cacheNowMs - Math.max(pBusy, pUpdated) >= RECENT_BUSY_HEARTBEAT_MS;
  };
  for (const s of filteredRawSessions) {
    const sid = s.sessionId ?? s.id;
    const pid = s.parentId ?? s.parentID ?? null;
    const busyTs = s.time?.busy ?? 0;
    const idleTs = s.time?.idle ?? 0;
    const updatedTs = resolveSessionActivityMs(s) ?? 0;
    if (
      sid &&
      !isParentFinished(pid) &&
      !s.archived &&
      !s.time?.archived &&
      !s.outcome &&
      busyTs > idleTs &&
      cacheNowMs - Math.max(busyTs, updatedTs) < RECENT_BUSY_HEARTBEAT_MS &&
      !activeIdSet.has(sid)
    ) {
      activeIdSet.add(sid);
      activeSessionIds.push(sid);
    }
  }
  for (const s of filteredRawSessions) {
    const sid = s.sessionId ?? s.id;
    const pid = s.parentId ?? s.parentID ?? null;
    if (sid && pid && activeIdSet.has(sid) && !activeIdSet.has(pid)) {
      activeIdSet.add(pid);
      activeSessionIds.push(pid);
    }
  }

  const rawPermList = Array.isArray(permissions) ? permissions : Array.isArray((permissions as any)?.data) ? (permissions as any).data : [];
  const pendingPermissions = (rawPermList as RawDaemonGateItem[])
    .map((p) => ({
      gateId: p.gateId ?? p.id ?? "",
      sessionId: p.sessionId ?? p.sessionID ?? "",
      title: p.title ?? (p.action ? `Permission: ${p.action}` : "Permission Request"),
      reason: p.reason ?? p.message ?? (Array.isArray(p.resources) ? p.resources.join(", ") : ""),
      source: "permission" as const,
      action: p.action,
      resources: p.resources,
    }))
    .filter((p) => Boolean(p.gateId && p.sessionId));

  const rawFormList = Array.isArray(forms) ? forms : Array.isArray((forms as any)?.data) ? (forms as any).data : [];
  const pendingQuestions = (rawFormList as RawDaemonGateItem[])
    .map((q) => ({
      gateId: q.gateId ?? q.id ?? "",
      sessionId: q.sessionId ?? q.sessionID ?? "",
      title: q.title ?? "Question Prompt",
      reason:
        q.reason ??
        (Array.isArray(q.fields)
          ? q.fields.map((fld) => fld.title ?? fld.description ?? fld.label ?? fld.key ?? "").filter(Boolean).join("; ")
          : ""),
      source: ((q as any).source ?? "form") as QuestGateSource,
      fields: normalizeQuestGateFields((q as any).fields ?? (q as any).questions),
    }))
    .filter((q) => Boolean(q.gateId && q.sessionId));

  const pendingGateSessionIds = new Set<string>([
    ...pendingPermissions.map((p) => p.sessionId),
    ...pendingQuestions.map((q) => q.sessionId),
  ]);

  const sortedRootSessions = filteredRawSessions
    .filter((s) => !(s.parentId ?? s.parentID))
    .sort((a, b) => (resolveSessionActivityMs(b) ?? 0) - (resolveSessionActivityMs(a) ?? 0));

  const mostRecentRootSessionId = sortedRootSessions[0]?.sessionId ?? sortedRootSessions[0]?.id ?? null;
  const topRootSlice = sortedRootSessions.slice(0, 60).map((s) => s.sessionId ?? s.id).filter((id): id is string => Boolean(id));
  const unviewedRootIds = sortedRootSessions
    .filter((s) => isUnviewedRootSession(s, activeIdSet))
    .slice(0, 60)
    .map((s) => s.sessionId ?? s.id)
    .filter((id): id is string => Boolean(id));
  const recentChildIds = isWorktreeOrRoot
    ? []
    : filteredRawSessions
        .filter((s) => {
          const pid = s.parentId ?? s.parentID ?? null;
          return Boolean(pid && !isParentFinished(pid) && !s.archived && !s.time?.archived && !s.outcome && cacheNowMs - (resolveSessionActivityMs(s) ?? 0) < TEN_MINUTES_MS);
        })
        .slice(0, 30)
        .map((s) => s.sessionId ?? s.id)
        .filter((id): id is string => Boolean(id));
  const hydrateSessionIds = new Set<string>([...activeIdSet, ...(isWorktreeOrRoot ? [] : [...topRootSlice, ...unviewedRootIds, ...recentChildIds]), ...pendingGateSessionIds]);

  const messageHydrationBySession = new Map<string, SessionMessageHydration>();
  await Promise.all(
    [...hydrateSessionIds].map(async (sessionId) => {
      const sItem = filteredRawSessions.find((s) => (s.sessionId ?? s.id) === sessionId);
      const sUpdatedAt = sItem ? resolveSessionActivityMs(sItem) ?? 1 : 1;
      const cacheEntryKey = `${rootUrl}::${sessionId}`;
      const isIdle = !activeIdSet.has(sessionId) && !pendingGateSessionIds.has(sessionId);
      if (!isIdle && rootUrl) idleMessageHydrationCache.delete(cacheEntryKey);
      if (isIdle && rootUrl) {
        const cachedHyd = idleMessageHydrationCache.get(cacheEntryKey);
        const cachedMsgs = cachedHyd?.hydration.messages ?? [];
        const hasCompletedTurn = cachedMsgs.length > 0 && cachedMsgs[cachedMsgs.length - 1]?.role !== "user";
        if (cachedHyd && cachedHyd.updatedAtMs === sUpdatedAt && hasCompletedTurn) {
          messageHydrationBySession.set(sessionId, cachedHyd.hydration);
          return;
        }
      }
      const hydration = await hydrateSessionMessages(fetchJson, sessionId, query, locHeaders);
      if (hydration !== null) {
        messageHydrationBySession.set(sessionId, hydration);
        if (isIdle && rootUrl) idleMessageHydrationCache.set(cacheEntryKey, { updatedAtMs: sUpdatedAt, hydration });
      }
    }),
  );

  const nowMs = Date.now();
  const hasAnyRecentlyOpenRoot = sortedRootSessions.some((rs) => {
    const rsid = rs.sessionId ?? rs.id;
    if (!rsid || rs.archived || rs.time?.archived) return false;
    const rUpdated = resolveSessionActivityMs(rs);
    const rViewed = rs.time?.viewed;
    return (
      activeIdSet.has(rsid) ||
      pendingGateSessionIds.has(rsid) ||
      isUnviewedRootSession(rs, activeIdSet) ||
      (typeof rUpdated === "number" && nowMs - rUpdated <= TEN_MINUTES_MS) ||
      (typeof rViewed === "number" && nowMs - rViewed <= TEN_MINUTES_MS)
    );
  });
  const sessions: NonNullable<OpenCodeDaemonLocationPayload["sessions"]> = [];
  for (const s of filteredRawSessions) {
    const sessionId = s.sessionId ?? s.id;
    if (!sessionId) continue;

    const msgHydration = messageHydrationBySession.get(sessionId);
    const compactedAtMs = s.compactedAtMs ?? msgHydration?.compactedAtMs ?? null;
    const updatedAtMs = resolveSessionActivityMs(s);
    const idleAtMs = typeof s.time?.idle === "number" ? s.time.idle : null;
    const rawViewedAtMs = typeof s.time?.viewed === "number" ? s.time.viewed : null;
    const isCompactionIdle = typeof compactedAtMs === "number" && compactedAtMs > 0 && typeof idleAtMs === "number" && compactedAtMs >= idleAtMs - 15_000;
    const viewedAtMs = isCompactionIdle ? Math.max(rawViewedAtMs ?? 0, idleAtMs ?? 0, updatedAtMs ?? 0) : rawViewedAtMs;
    const hasUnviewedResult = isUnviewedRootSession(s, activeIdSet, nowMs, compactedAtMs);
    const isRecentlyActive =
      (typeof updatedAtMs === "number" && nowMs - updatedAtMs <= TEN_MINUTES_MS) ||
      (typeof viewedAtMs === "number" && nowMs - viewedAtMs <= TEN_MINUTES_MS);
    const isArchived = Boolean(s.archived || s.time?.archived);
    const parentIdForSession = s.parentId ?? s.parentID ?? null;
    if (msgHydration?.activeTool && !isArchived && !isParentFinished(parentIdForSession) && !activeIdSet.has(sessionId)) {
      activeIdSet.add(sessionId);
      activeSessionIds.push(sessionId);
      if (parentIdForSession && !activeIdSet.has(parentIdForSession)) {
        activeIdSet.add(parentIdForSession);
        activeSessionIds.push(parentIdForSession);
      }
    }
    const existingFormGate = pendingQuestions.find((q) => q.sessionId === sessionId);
    if (existingFormGate && msgHydration?.pendingQuestion) {
      existingFormGate.fields = mergeQuestGateFields(existingFormGate.fields, msgHydration.pendingQuestion.fields);
      if ((!existingFormGate.reason || existingFormGate.reason === existingFormGate.title) && msgHydration.pendingQuestion.reason) {
        existingFormGate.reason = msgHydration.pendingQuestion.reason;
      }
    } else if (msgHydration?.pendingQuestion && !existingFormGate && !isArchived) {
      pendingQuestions.push({
        gateId: msgHydration.pendingQuestion.gateId, sessionId,
        title: msgHydration.pendingQuestion.title, reason: msgHydration.pendingQuestion.reason,
        source: msgHydration.pendingQuestion.source ?? "form",
        fields: normalizeQuestGateFields(msgHydration.pendingQuestion.fields),
      });
      pendingGateSessionIds.add(sessionId);
    }
    const sessionSkills = Array.isArray(s.skills) ? [...s.skills] : msgHydration?.skills;

    const rawModelId =
      typeof s.model === "object" && s.model
        ? s.model.providerID ? `${s.model.providerID}/${s.model.id ?? "unknown-model"}` : (s.model.id ?? "unknown-model")
        : (s.modelId ?? s.modelID ?? (typeof s.model === "string" ? s.model : "unknown-model"));
    const modelId = msgHydration?.latestModelId ?? rawModelId;
    const shortModelId = modelId.split("/").pop() ?? modelId;
    const catalogLimit = modelLimitByKey.get(modelId.toLowerCase()) ?? modelLimitByKey.get(shortModelId.toLowerCase());
    const mappedTokens = mapDaemonSessionTokens(s, shortModelId, catalogLimit, msgHydration?.latestContextTokens);

    const isChild = Boolean(s.parentId ?? s.parentID);
    const isOpenInOpenCode = isChild
      ? activeIdSet.has(sessionId) || pendingGateSessionIds.has(sessionId)
      : activeIdSet.has(sessionId) || pendingGateSessionIds.has(sessionId) || hasUnviewedResult || isRecentlyActive || (!hasAnyRecentlyOpenRoot && sessionId === mostRecentRootSessionId);

    sessions.push({
      sessionId, parentId: s.parentId ?? s.parentID ?? null, title: s.title,
      agentClass: msgHydration?.latestAgentClass ?? s.agentClass ?? s.agent, modelId,
      tokens: mappedTokens, skills: sessionSkills, ...(msgHydration !== undefined ? { activeTool: msgHydration.activeTool ?? null } : {}),
      recentTools: msgHydration?.recentTools, compactedAtMs, archived: isArchived,
      updatedAtMs, idleAtMs, viewedAtMs, turnOutcome: s.outcome ?? null, hasUnviewedResult,
      isOpenInOpenCode: isArchived ? false : isOpenInOpenCode,
      lastAssistantText: msgHydration?.lastAssistantText, lastUserPromptText: msgHydration?.lastUserPromptText,
      messages: msgHydration?.messages,
    } as any);
  }

  const normalizedSkills = (Array.isArray(skills) ? skills : [])
    .map((s) => { const id = (s?.id || s?.name || "").trim(); return id ? { id, name: s?.name ?? id, description: s?.description } : null; })
    .filter((s): s is NonNullable<typeof s> => Boolean(s));
  const normalizedAgents = (Array.isArray(agents) ? agents : [])
    .map((a) => { const id = (a?.id || a?.name || "").trim(); return id ? { id, name: a?.name ?? id, color: a?.color, mode: a?.mode, hidden: a?.hidden, disabled: a?.disabled, description: a?.description } : null; })
    .filter((a): a is NonNullable<typeof a> => Boolean(a));
  return {
    skills: normalizedSkills, plugins: mergedPlugins, agents: normalizedAgents, models, activeSessionIds,
    sessions: Array.isArray(rawSessions) && Array.isArray(rawRootSessions) ? sessions : sessions.length > 0 ? sessions : undefined,
    pendingPermissions, pendingQuestions,
  };
}
