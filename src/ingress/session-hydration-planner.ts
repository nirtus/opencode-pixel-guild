import { hydrateSessionMessages, type SessionMessageHydration } from "./daemon-message-hydration.ts";

export type LocationHydrationMode = "fast" | "full";

const MAX_CONCURRENT_HYDRATIONS = 6;
const idleMessageHydrationCache = new Map<string, { updatedAtMs: number; hydration: SessionMessageHydration }>();
const daemonHydrationSemaphores = new Map<string, { active: number; queue: Array<() => void> }>();

function acquireDaemonHydrationSlot(rootUrl: string): Promise<() => void> {
  const key = (rootUrl || "local").trim().replace(/\/+$/, "").toLowerCase();
  let sem = daemonHydrationSemaphores.get(key);
  if (!sem) {
    sem = { active: 0, queue: [] };
    daemonHydrationSemaphores.set(key, sem);
  }
  return new Promise((resolveSlot) => {
    const grant = () => {
      sem!.active += 1;
      let released = false;
      resolveSlot(() => {
        if (released) return;
        released = true;
        sem!.active = Math.max(0, sem!.active - 1);
        const next = sem!.queue.shift();
        if (next) next();
        else if (sem!.active === 0) daemonHydrationSemaphores.delete(key);
      });
    };
    if (sem!.active < MAX_CONCURRENT_HYDRATIONS) grant();
    else sem!.queue.push(grant);
  });
}

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

export interface SelectSessionsForHydrationInput<T> {
  readonly mode: LocationHydrationMode;
  readonly isWorktreeOrRoot: boolean;
  readonly sortedRootSessions: ReadonlyArray<T>;
  readonly filteredRawSessions: ReadonlyArray<T>;
  readonly activeIdSet: ReadonlySet<string>;
  readonly pendingGateSessionIds: ReadonlySet<string>;
  readonly openTuiSessionIds: ReadonlySet<string>;
  readonly cacheNowMs: number;
  readonly recentChildWindowMs: number;
  readonly getId: (s: T) => string | undefined;
  readonly getParentId: (s: T) => string | null;
  readonly isArchived: (s: T) => boolean;
  readonly hasOutcome: (s: T) => boolean;
  readonly isParentFinished: (pid: string | null) => boolean;
  readonly isUnviewedRoot: (s: T) => boolean;
  readonly getActivityMs: (s: T) => number | undefined;
}

export function selectSessionsForHydration<T>(input: SelectSessionsForHydrationInput<T>): Set<string> {
  const {
    mode,
    isWorktreeOrRoot,
    sortedRootSessions,
    filteredRawSessions,
    activeIdSet,
    pendingGateSessionIds,
    openTuiSessionIds,
    cacheNowMs,
    recentChildWindowMs,
    getId,
    getParentId,
    isArchived,
    hasOutcome,
    isParentFinished,
    isUnviewedRoot,
    getActivityMs,
  } = input;

  if (isWorktreeOrRoot) {
    return new Set<string>([...activeIdSet, ...pendingGateSessionIds]);
  }

  const rootLimit = mode === "fast" ? 4 : 60;
  const unviewedLimit = mode === "fast" ? 15 : 60;
  const childLimit = mode === "fast" ? 10 : 30;

  const topRootSlice = sortedRootSessions
    .filter((s) => {
      const sid = getId(s);
      return Boolean(sid && !activeIdSet.has(sid) && !pendingGateSessionIds.has(sid));
    })
    .slice(0, rootLimit)
    .map(getId)
    .filter((id): id is string => Boolean(id));

  const openTuiRootIds = sortedRootSessions
    .filter((s) => {
      const sid = getId(s);
      return Boolean(sid && !isArchived(s) && openTuiSessionIds.has(sid));
    })
    .map((s) => getId(s)!);

  const unviewedRootIds = sortedRootSessions
    .filter((s) => isUnviewedRoot(s))
    .slice(0, unviewedLimit)
    .map(getId)
    .filter((id): id is string => Boolean(id));

  const recentChildIds = filteredRawSessions
    .filter((s) => {
      const pid = getParentId(s);
      const parentEligible = mode === "fast" ? Boolean(pid && activeIdSet.has(pid)) : Boolean(pid && !isParentFinished(pid));
      return Boolean(
        parentEligible &&
          !isArchived(s) &&
          !hasOutcome(s) &&
          cacheNowMs - (getActivityMs(s) ?? 0) < recentChildWindowMs,
      );
    })
    .slice(0, childLimit)
    .map(getId)
    .filter((id): id is string => Boolean(id));

  return new Set<string>([
    ...activeIdSet,
    ...pendingGateSessionIds,
    ...openTuiRootIds,
    ...unviewedRootIds,
    ...recentChildIds,
    ...topRootSlice,
  ]);
}

export async function runBoundedSessionHydrations(input: {
  readonly sessionIds: Iterable<string>;
  readonly rootUrl: string;
  readonly mode: LocationHydrationMode;
  readonly activeIdSet: ReadonlySet<string>;
  readonly pendingGateSessionIds: ReadonlySet<string>;
  readonly getUpdatedAtMs: (sessionId: string) => number;
  readonly fetchJson: <T>(path: string, extraHeaders?: Record<string, string>) => Promise<T | null>;
  readonly query: string;
  readonly locHeaders: Record<string, string>;
  readonly signal?: AbortSignal;
}): Promise<Map<string, SessionMessageHydration>> {
  const {
    sessionIds,
    rootUrl,
    mode,
    activeIdSet,
    pendingGateSessionIds,
    getUpdatedAtMs,
    fetchJson,
    query,
    locHeaders,
    signal,
  } = input;

  const result = new Map<string, SessionMessageHydration>();
  const toFetch: Array<{ sessionId: string; sUpdatedAt: number; isIdle: boolean; limit: number }> = [];

  for (const sessionId of sessionIds) {
    const sUpdatedAt = getUpdatedAtMs(sessionId);
    const cacheEntryKey = `${rootUrl}::${sessionId}`;
    const isIdle = !activeIdSet.has(sessionId) && !pendingGateSessionIds.has(sessionId);
    if (!isIdle && rootUrl) idleMessageHydrationCache.delete(cacheEntryKey);
    if (isIdle && rootUrl) {
      const cachedHyd = idleMessageHydrationCache.get(cacheEntryKey);
      const cachedMsgs = cachedHyd?.hydration.messages ?? [];
      const hasCompletedTurn = cachedMsgs.length > 0 && cachedMsgs[cachedMsgs.length - 1]?.role !== "user";
      if (cachedHyd && cachedHyd.updatedAtMs === sUpdatedAt && hasCompletedTurn && !cachedHyd.hydration.pendingQuestion) {
        result.set(sessionId, cachedHyd.hydration);
        continue;
      }
    }
    const limit = mode === "fast" ? (isIdle ? 24 : 60) : 100;
    toFetch.push({ sessionId, sUpdatedAt, isIdle, limit });
  }

  await Promise.all(
    toFetch.map(async (job) => {
      if (signal?.aborted) return;
      const release = await acquireDaemonHydrationSlot(rootUrl);
      try {
        if (signal?.aborted) return;
        const hydration = await hydrateSessionMessages(fetchJson, job.sessionId, query, locHeaders, job.limit);
        if (hydration !== null) {
          result.set(job.sessionId, hydration);
          if (job.isIdle && !hydration.pendingQuestion && rootUrl) {
            idleMessageHydrationCache.set(`${rootUrl}::${job.sessionId}`, {
              updatedAtMs: job.sUpdatedAt,
              hydration,
            });
          }
        }
      } finally {
        release();
      }
    }),
  );

  return result;
}
