import {
  isDeletedHostDirectory,
  normalizeLocationDirectory,
  toDaemonDirectoryPath,
} from "../state/world-reducer.ts";
import type {
  GuildCommandRequest,
  ReconnectLogEntry,
  TelemetryEvent,
} from "../types/domain.ts";
import type {
  DeleteRoomResourcesInput,
  DeleteRoomResourcesResult,
  OpenCodeDaemonClientPort,
} from "./daemon-types.ts";
import { executeDaemonCommand } from "./daemon-command-ops.ts";
import {
  deleteSingleSession,
  executeDaemonShellCommand,
  executeDeleteRoomResources,
} from "./daemon-session-ops.ts";
import {
  evictIdleMessageHydrationCache,
  fetchDaemonLocationState,
} from "./daemon-location-state.ts";
import { hydrateSessionMessages } from "./daemon-message-hydration.ts";
import { mapOpenCodeSseFrameToTelemetryEvents } from "./daemon-sse-mapper.ts";
import { fetchWithDockerHostFallback } from "./opencode-pair-redeemer.ts";

export { executeDaemonCommand } from "./daemon-command-ops.ts";
export { mapOpenCodeSseFrameToTelemetryEvents } from "./daemon-sse-mapper.ts";

export function createHttpOpenCodeDaemonClient(
  baseUrl: string,
  headers: Record<string, string> = {},
  options?: { fetchImpl?: typeof fetch; sseRetryDelayMs?: number; timeoutMs?: number },
): OpenCodeDaemonClientPort {
  const rootUrl = baseUrl.trim().replace(/\/+$/, "");
  const sseRetryDelayMs = options?.sseRetryDelayMs ?? 1500;
  const timeoutMs = options?.timeoutMs ?? 3500;
  let cachedProjects: Awaited<ReturnType<OpenCodeDaemonClientPort["getProjects"]>> | null = null;
  let cachedProjectsAtMs = 0;
  let cachedLocations: Awaited<ReturnType<OpenCodeDaemonClientPort["getLocations"]>> | null = null;
  let cachedLocationsAtMs = 0;
  const cachedSessionsByPath = new Map<string, { data: unknown; atMs: number }>();
  const rawDirByNormDir = new Map<string, string>();
  let isWindowsDaemon = false;
  let anySuccessResponse = false;
  let lastTransportError: Error | null = null;

  function recordDaemonDirectory(rawDir: string | undefined, overwrite = false): void {
    if (!rawDir || !rawDir.trim()) return;
    const trimmed = rawDir.trim();
    if (/^[A-Za-z]:[\\/]/.test(trimmed)) {
      isWindowsDaemon = true;
    }
    const norm = normalizeLocationDirectory(trimmed).toLowerCase();
    if (norm && (overwrite || !rawDirByNormDir.has(norm))) {
      rawDirByNormDir.set(norm, trimmed);
    }
  }

  function resolveDaemonDir(dir: string): string {
    const trimmed = dir.trim();
    if (!trimmed) return "";
    const norm = normalizeLocationDirectory(trimmed).toLowerCase();
    const known = rawDirByNormDir.get(norm);
    if (known) return toDaemonDirectoryPath(known);
    if (isWindowsDaemon) {
      const cStyleMatch = /^\/([A-Za-z])(?:\/(.*))?$/.exec(norm);
      if (cStyleMatch && cStyleMatch[1].toLowerCase() !== "mnt") {
        return `${cStyleMatch[1].toUpperCase()}:/${cStyleMatch[2] ?? ""}`;
      }
    }
    return toDaemonDirectoryPath(trimmed);
  }

  async function fetchFn(url: string, init?: RequestInit): Promise<Response> {
    return fetchWithDockerHostFallback(url, init, options?.fetchImpl, timeoutMs);
  }

  async function fetchJson<T>(
    path: string,
    extraHeaders?: Record<string, string>,
  ): Promise<T | null> {
    const isSessionListQuery =
      !options?.fetchImpl &&
      /^\/api\/session\?(?:.*&)?limit=\d+$/.test(path);
    const cachedSessionEntry = isSessionListQuery ? cachedSessionsByPath.get(path) : undefined;
    if (cachedSessionEntry && Date.now() - cachedSessionEntry.atMs < 1200) {
      return cachedSessionEntry.data as T;
    }
    try {
      const response = await fetchFn(`${rootUrl}${path}`, {
        headers: { Accept: "application/json", ...headers, ...extraHeaders },
      });
      if (!response.ok) {
        lastTransportError = new Error(`OpenCode daemon returned HTTP ${response.status} on ${path}`);
        return null;
      }
      anySuccessResponse = true;
      lastTransportError = null;
      const raw = await response.json();
      const unwrapped = (
        raw && typeof raw === "object" && "data" in raw
          ? (raw as { data: T }).data
          : raw
      ) as T;
      if (isSessionListQuery && Array.isArray(unwrapped)) {
        cachedSessionsByPath.set(path, { data: unwrapped, atMs: Date.now() });
      }
      return unwrapped;
    } catch (err) {
      lastTransportError = err instanceof Error ? err : new Error("Failed to connect to OpenCode daemon");
      return null;
    }
  }

  async function fetchProjects() {
    if (!options?.fetchImpl && cachedProjects && Date.now() - cachedProjectsAtMs < 30000) {
      anySuccessResponse = true;
      return cachedProjects;
    }
    const data = await fetchJson<
      Array<{
        id: string;
        name?: string;
        canonical?: string;
        directory?: string;
        worktree?: string;
        sandboxes?: string[];
      }>
    >("/api/project");
    if (!Array.isArray(data)) return [];
    for (const proj of data) {
      const dir = proj?.canonical ?? proj?.directory ?? proj?.worktree;
      if (dir) normalizeLocationDirectory(dir);
    }
    const projects = await Promise.all(
      data.map(async (proj) => {
        const directory =
          proj.canonical ?? proj.directory ?? proj.worktree ?? "/";
        if (isDeletedHostDirectory(directory, undefined, rootUrl)) {
          return null;
        }
        recordDaemonDirectory(directory);
        const normRoot = normalizeLocationDirectory(directory);
        const sandboxSet = new Set<string>(
          (Array.isArray(proj.sandboxes) ? proj.sandboxes : []).filter(
            (sb) => !isDeletedHostDirectory(sb, undefined, rootUrl),
          ),
        );
        for (const sb of sandboxSet) recordDaemonDirectory(sb);
        if (proj.id) {
          const wtList = await fetchJson<
            Array<string | { directory?: string; path?: string; strategy?: string }>
          >(`/api/worktree?projectID=${encodeURIComponent(proj.id)}`);
          if (Array.isArray(wtList)) {
            for (const wt of wtList) {
              const wtDir =
                typeof wt === "string"
                  ? wt
                  : (wt?.directory ?? wt?.path ?? "");
              if (
                wtDir &&
                normalizeLocationDirectory(wtDir) !== normRoot &&
                !isDeletedHostDirectory(wtDir, undefined, rootUrl)
              ) {
                recordDaemonDirectory(wtDir);
                sandboxSet.add(wtDir);
              }
            }
          }
        }
        return {
          id: proj.id,
          name: proj.name,
          directory,
          sandboxes: [...sandboxSet],
        };
      }),
    );
    const filtered = projects.filter(
      (proj): proj is NonNullable<typeof proj> => Boolean(proj?.directory),
    );
    cachedProjects = filtered;
    cachedProjectsAtMs = Date.now();
    return filtered;
  }

  return {
    recordDirectory(rawDir: string) {
      recordDaemonDirectory(rawDir, true);
    },
    async getProjects() {
      return fetchProjects();
    },

    async getLocations() {
      if (!options?.fetchImpl && cachedLocations && Date.now() - cachedLocationsAtMs < 15000) {
        return cachedLocations;
      }
      anySuccessResponse = false;
      lastTransportError = null;
      const [debugLocations, projects, recentSessions] = await Promise.all([
        fetchJson<Array<{ directory: string; projectId?: string }>>(
          "/api/debug/location",
        ),
        fetchProjects(),
        fetchJson<
          Array<{
            projectID?: string;
            projectId?: string;
            location?: { directory?: string };
          }>
        >("/api/session?limit=100"),
      ]);
      if (!anySuccessResponse && lastTransportError) {
        throw lastTransportError;
      }

      const sessionDirs = new Set<string>();
      const combined: Array<{ directory: string; projectId?: string }> = [];
      const seenNormDirs = new Set<string>();

      function addLocation(directory: string, projectId?: string) {
        if (isDeletedHostDirectory(directory, undefined, rootUrl)) return;
        recordDaemonDirectory(directory);
        const norm = normalizeLocationDirectory(directory);
        if (!norm || seenNormDirs.has(norm)) return;
        if (/^\/home\/[^/]+$/.test(norm) && !sessionDirs.has(norm)) return;
        seenNormDirs.add(norm);
        combined.push({ directory, projectId });
      }

      if (Array.isArray(recentSessions)) {
        for (const s of recentSessions) {
          const dir = s?.location?.directory;
          if (typeof dir === "string" && dir.trim()) {
            sessionDirs.add(normalizeLocationDirectory(dir));
            addLocation(dir, s.projectID ?? s.projectId);
          }
        }
      }
      if (Array.isArray(debugLocations)) {
        for (const loc of debugLocations) {
          if (loc && typeof loc.directory === "string") {
            addLocation(loc.directory, loc.projectId);
          }
        }
      }
      for (const proj of projects) {
        addLocation(proj.directory, proj.id);
        for (const sb of proj.sandboxes ?? []) addLocation(sb, proj.id);
      }
      cachedLocations = combined;
      cachedLocationsAtMs = Date.now();
      return combined;
    },

    async getLocationState(directory: string) {
      return fetchDaemonLocationState(rootUrl, headers, fetchJson, resolveDaemonDir(directory));
    },

    async getSessionLogAfter(sessionId: string, afterCursor: number) {
      const entries = await fetchJson<ReconnectLogEntry[]>(
        `/api/experimental/session/${encodeURIComponent(sessionId)}/log?after=${afterCursor}`,
      );
      return Array.isArray(entries) ? entries : [];
    },

    async getSessionMessages(sessionId: string, directory?: string) {
      evictIdleMessageHydrationCache(sessionId);
      const dir = directory ? resolveDaemonDir(directory) : "";
      const query = dir ? `?location[directory]=${encodeURIComponent(dir)}` : "?";
      const locHeaders: Record<string, string> = dir ? { "x-opencode-directory": dir } : {};
      return hydrateSessionMessages(fetchJson, sessionId, query, locHeaders);
    },

    async deleteSession(sessionId: string, directory?: string): Promise<boolean> {
      cachedSessionsByPath.clear();
      evictIdleMessageHydrationCache(sessionId);
      const dir = directory ? resolveDaemonDir(directory) : undefined;
      return deleteSingleSession(rootUrl, headers, sessionId, dir, options?.fetchImpl);
    },

    async deleteRoomResources(input: DeleteRoomResourcesInput): Promise<DeleteRoomResourcesResult> {
      cachedSessionsByPath.clear();
      cachedLocations = null;
      cachedProjects = null;
      evictIdleMessageHydrationCache();
      const resolvedInput = { ...input, directory: resolveDaemonDir(input.directory) };
      return executeDeleteRoomResources(rootUrl, headers, fetchJson, resolvedInput, options?.fetchImpl);
    },

    async executeCommand(cmd: GuildCommandRequest) {
      cachedSessionsByPath.clear();
      const cmdSessionId = "sessionId" in cmd && typeof cmd.sessionId === "string" ? cmd.sessionId : undefined;
      evictIdleMessageHydrationCache(cmdSessionId);
      const resolvedCmd =
        "directory" in cmd && typeof cmd.directory === "string" && cmd.directory.trim()
          ? ({ ...cmd, directory: resolveDaemonDir(cmd.directory) } as GuildCommandRequest)
          : cmd;
      return executeDaemonCommand(rootUrl, headers, resolvedCmd, options?.fetchImpl);
    },

    async runShellCommand(directory: string, command: string) {
      return executeDaemonShellCommand(rootUrl, headers, resolveDaemonDir(directory), command, options?.fetchImpl);
    },

    clearCaches() {
      cachedSessionsByPath.clear();
      cachedLocations = null;
      cachedProjects = null;
    },

    async subscribeEvents(onEvent: (event: TelemetryEvent) => void, onReconnect?: () => void) {
      const controller = new AbortController();
      const idleWatchdogMs = options?.timeoutMs !== undefined ? Math.max(120, options.timeoutMs * 2) : 45_000;
      let streamAttempt = 0;
      const readLoop = (async () => {
        while (!controller.signal.aborted) {
          streamAttempt += 1;
          const streamCtrl = new AbortController();
          const combinedSignal =
            typeof AbortSignal.any === "function"
              ? AbortSignal.any([controller.signal, streamCtrl.signal])
              : streamCtrl.signal;
          const onOuterAbort = () => streamCtrl.abort();
          controller.signal.addEventListener("abort", onOuterAbort, { once: true });
          let watchdogTimer: ReturnType<typeof setTimeout> | null = null;
          const resetWatchdog = () => {
            if (watchdogTimer) clearTimeout(watchdogTimer);
            watchdogTimer = setTimeout(() => streamCtrl.abort(), idleWatchdogMs);
            watchdogTimer.unref?.();
          };
          try {
            resetWatchdog();
            const response = await fetchFn(`${rootUrl}/api/event`, {
              headers: { Accept: "text/event-stream", ...headers },
              signal: combinedSignal,
            });
            if (response.ok && response.body) {
              if (streamAttempt > 1) {
                cachedSessionsByPath.clear();
                cachedLocations = null;
                onReconnect?.();
              }
              const reader = response.body.getReader();
              const decoder = new TextDecoder();
              let buffer = "";
              while (!streamCtrl.signal.aborted) {
                resetWatchdog();
                const { value, done } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const blocks = buffer.split(/\r?\n\r?\n/);
                buffer = blocks.pop() ?? "";
                for (const block of blocks) {
                  const jsonText = block.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("\n");
                  if (!jsonText || jsonText === "[DONE]") continue;
                  try {
                    for (const ev of mapOpenCodeSseFrameToTelemetryEvents(JSON.parse(jsonText))) {
                      if ("sessionId" in ev && typeof ev.sessionId === "string") {
                        cachedSessionsByPath.clear();
                        evictIdleMessageHydrationCache(ev.sessionId);
                      }
                      onEvent(ev);
                    }
                  } catch { /* Ignore malformed SSE JSON frame */ }
                }
              }
            }
          } catch { /* Ignore stream abort or connection error */ } finally {
            if (watchdogTimer) clearTimeout(watchdogTimer);
          }
          if (controller.signal.aborted) break;
          await new Promise<void>((r) => {
            const onRetryAbort = () => { clearTimeout(t); r(); };
            const t = setTimeout(() => {
              controller.signal.removeEventListener("abort", onRetryAbort);
              controller.signal.removeEventListener("abort", onOuterAbort);
              r();
            }, sseRetryDelayMs);
            t.unref?.();
            controller.signal.addEventListener("abort", onRetryAbort, { once: true });
          });
        }
      })();
      await Promise.race([readLoop, new Promise<void>((resolve) => setTimeout(resolve, 15))]);
      return () => controller.abort();
    },
  };
}
