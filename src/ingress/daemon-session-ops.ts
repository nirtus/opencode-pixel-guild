import {
  normalizeLocationDirectory,
  toDaemonDirectoryPath,
} from "../state/world-reducer.ts";
import type {
  DeleteRoomResourcesInput,
  DeleteRoomResourcesResult,
} from "./daemon-types.ts";
import { fetchWithDockerHostFallback } from "./opencode-pair-redeemer.ts";

let activeDaemonDeletes = 0;
const daemonDeleteQueue: Array<() => void> = [];

function acquireDaemonDeleteSlot(): Promise<() => void> {
  return new Promise((resolve) => {
    const grant = () => {
      activeDaemonDeletes += 1;
      let done = false;
      resolve(() => {
        if (done) return;
        done = true;
        activeDaemonDeletes = Math.max(0, activeDaemonDeletes - 1);
        daemonDeleteQueue.shift()?.();
      });
    };
    if (activeDaemonDeletes < 6) grant();
    else daemonDeleteQueue.push(grant);
  });
}

export async function deleteSingleSession(
  rootUrl: string,
  headers: Record<string, string>,
  sessionId: string,
  directory?: string,
  fetchImpl?: typeof fetch,
): Promise<boolean> {
  const trimmedDir = directory?.trim();
  const daemonDir = trimmedDir ? toDaemonDirectoryPath(trimmedDir) : trimmedDir;
  const query = daemonDir
    ? `?location[directory]=${encodeURIComponent(daemonDir)}`
    : "";
  const locHeaders: Record<string, string> = daemonDir
    ? { "x-opencode-directory": daemonDir }
    : {};
  const release = await acquireDaemonDeleteSlot();
  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetchWithDockerHostFallback(
          `${rootUrl}/api/session/${encodeURIComponent(sessionId)}${query}`,
          {
            method: "DELETE",
            headers: {
              Accept: "application/json",
              ...headers,
              ...locHeaders,
            },
          },
          fetchImpl,
          2500,
        );
        if (response.ok) return true;
        if (daemonDir) {
          const fallbackRes = await fetchWithDockerHostFallback(
            `${rootUrl}/api/session/${encodeURIComponent(sessionId)}`,
            {
              method: "DELETE",
              headers: { Accept: "application/json", ...headers },
            },
            fetchImpl,
            2500,
          );
          if (fallbackRes.ok) return true;
          if (fallbackRes.status < 500) return false;
        } else if (response.status < 500) {
          return false;
        }
      } catch {
        // retry once on transient socket/SQLite contention
      }
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 60));
      }
    }
    return false;
  } finally {
    release();
  }
}

export async function executeDeleteRoomResources(
  rootUrl: string,
  headers: Record<string, string>,
  fetchJson: <T>(path: string, extraHeaders?: Record<string, string>) => Promise<T | null>,
  input: DeleteRoomResourcesInput,
  fetchImpl?: typeof fetch,
): Promise<DeleteRoomResourcesResult> {
  const trimmedDir = input.directory.trim();
  const daemonDir = toDaemonDirectoryPath(trimmedDir);
  const normTargetDir = normalizeLocationDirectory(input.directory);
  const locHeaders: Record<string, string> = {
    "x-opencode-directory": daemonDir,
  };
  const query = `?location[directory]=${encodeURIComponent(daemonDir)}`;
  const sessionQuery = `?directory=${encodeURIComponent(daemonDir)}&location[directory]=${encodeURIComponent(daemonDir)}`;

  const deletedSessionIds: string[] = [];
  const deletedPtyIds: string[] = [];
  const deletedShellIds: string[] = [];
  let worktreeRemoved = false;
  let locationEvicted = false;

  // 1. Sessions: query both location-scoped and global /api/session, interrupt and delete matching sessions
  // 1. Sessions (query root + child sessions and global fallback)
  const [scopedSessions, rootScopedSessions, globalSessions] = await Promise.all([
    fetchJson<Array<{ id?: string; sessionId?: string; parentID?: string | null; parentId?: string | null; location?: { directory?: string } }>>(
      `/api/session${sessionQuery}&limit=200`,
      locHeaders,
    ),
    fetchJson<Array<{ id?: string; sessionId?: string; parentID?: string | null; parentId?: string | null; location?: { directory?: string } }>>(
      `/api/session${sessionQuery}&parentID=null&limit=100`,
      locHeaders,
    ),
    fetchJson<Array<{ id?: string; sessionId?: string; parentID?: string | null; parentId?: string | null; location?: { directory?: string } }>>(
      "/api/session?limit=200",
    ),
  ]);

  const normTargetLower = normTargetDir.toLowerCase();
  const matchesTargetDir = (rawDir: string | undefined): boolean => {
    if (!rawDir) return false;
    const norm = normalizeLocationDirectory(rawDir).toLowerCase();
    if (norm === normTargetLower) return true;
    if (!input.isWorktree && (norm.startsWith(`${normTargetLower}/.worktrees/`) || norm.startsWith(`${normTargetLower}/worktree/`))) {
      return true;
    }
    return false;
  };
  const matchingSessionIds = new Set<string>();
  for (const s of [...(Array.isArray(scopedSessions) ? scopedSessions : []), ...(Array.isArray(rootScopedSessions) ? rootScopedSessions : [])]) {
    const sid = s?.sessionId ?? s?.id;
    if (!sid) continue;
    const sDir = s.location?.directory ?? (s as { directory?: string }).directory ?? input.directory;
    if (matchesTargetDir(sDir)) matchingSessionIds.add(sid);
  }
  for (const s of Array.isArray(globalSessions) ? globalSessions : []) {
    const sid = s?.sessionId ?? s?.id;
    if (!sid) continue;
    const sDir = s.location?.directory ?? (s as { directory?: string }).directory;
    if (matchesTargetDir(sDir)) matchingSessionIds.add(sid);
  }

  const doFetch = (url: string, init?: RequestInit) =>
    fetchWithDockerHostFallback(url, init, fetchImpl);

  await Promise.allSettled(
    [...matchingSessionIds].map(async (sessionId) => {
      try {
        await doFetch(
          `${rootUrl}/api/session/${encodeURIComponent(sessionId)}/interrupt${query}`,
          { method: "POST", headers: { Accept: "application/json", ...headers, ...locHeaders } },
        );
      } catch { /* Ignore 404/idle interrupt errors */ }
      try {
        const delRes = await doFetch(
          `${rootUrl}/api/session/${encodeURIComponent(sessionId)}${query}`,
          { method: "DELETE", headers: { Accept: "application/json", ...headers, ...locHeaders } },
        );
        if (delRes.ok) deletedSessionIds.push(sessionId);
      } catch { /* Ignore individual session delete error */ }
    }),
  );

  // 2. PTYs & Running Shells
  const [ptys, shells] = await Promise.all([
    fetchJson<Array<{ id?: string; ptyID?: string; ptyId?: string } | string>>(`/api/pty${query}`, locHeaders),
    fetchJson<Array<{ id?: string; shellID?: string; shellId?: string } | string>>(`/api/shell${query}`, locHeaders),
  ]);

  await Promise.allSettled([
    ...(Array.isArray(ptys) ? ptys : []).map(async (item) => {
      const ptyId = typeof item === "string" ? item : (item?.id ?? item?.ptyID ?? item?.ptyId);
      if (!ptyId) return;
      try {
        const delRes = await doFetch(`${rootUrl}/api/pty/${encodeURIComponent(ptyId)}${query}`, {
          method: "DELETE", headers: { Accept: "application/json", ...headers, ...locHeaders },
        });
        if (delRes.ok) deletedPtyIds.push(ptyId);
      } catch { /* Ignore PTY delete error */ }
    }),
    ...(Array.isArray(shells) ? shells : []).map(async (item) => {
      const shellId = typeof item === "string" ? item : (item?.id ?? item?.shellID ?? item?.shellId);
      if (!shellId) return;
      try {
        const delRes = await doFetch(`${rootUrl}/api/shell/${encodeURIComponent(shellId)}${query}`, {
          method: "DELETE", headers: { Accept: "application/json", ...headers, ...locHeaders },
        });
        if (delRes.ok) deletedShellIds.push(shellId);
      } catch { /* Ignore shell delete error */ }
    }),
  ]);

  // 3. Worktree removal (only if isWorktree is true)
  if (input.isWorktree === true) {
    const projectID = input.projectId;
    try {
      const wtDelRes = await doFetch(`${rootUrl}/api/worktree`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...headers,
          ...locHeaders,
        },
        body: JSON.stringify({
          projectID,
          directory: daemonDir,
          force: true,
        }),
      });
      worktreeRemoved = wtDelRes.ok;
    } catch {
      worktreeRemoved = false;
    }
    try {
      await doFetch(`${rootUrl}/api/worktree/refresh`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...headers,
          ...locHeaders,
        },
        body: JSON.stringify({ projectID }),
      });
    } catch {
      // Ignore worktree refresh error
    }
  }

  // 4. Location Cache Eviction
  try {
    const evictRes = await doFetch(
      `${rootUrl}/api/debug/location${query}`,
      {
        method: "DELETE",
        headers: { Accept: "application/json", ...headers, ...locHeaders },
      },
    );
    locationEvicted = evictRes.ok;
  } catch {
    locationEvicted = false;
  }

  return {
    deletedSessionIds,
    deletedPtyIds,
    deletedShellIds,
    worktreeRemoved,
    locationEvicted,
  };
}

export async function executeDaemonShellCommand(
  rootUrl: string,
  headers: Record<string, string>,
  directory: string,
  command: string,
  fetchImpl?: typeof fetch,
): Promise<{ ok: boolean; output: string }> {
  const daemonDir = toDaemonDirectoryPath(directory.trim());
  const query = `?location[directory]=${encodeURIComponent(daemonDir)}`;
  const locHeaders: Record<string, string> = {
    Accept: "application/json",
    ...headers,
    ...(daemonDir ? { "x-opencode-directory": daemonDir } : {}),
  };
  const doFetch = (url: string, init?: RequestInit) =>
    fetchWithDockerHostFallback(url, init, fetchImpl, 15_000);
  try {
    const startRes = await doFetch(`${rootUrl}/api/shell${query}`, {
      method: "POST",
      headers: { ...locHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ command }),
    });
    if (!startRes.ok) {
      return { ok: false, output: `Daemon /api/shell returned HTTP ${startRes.status}` };
    }
    const startBody = (await startRes.json()) as {
      data?: { id?: string; status?: string; exit?: number; exitCode?: number };
    };
    const shellId = startBody?.data?.id;
    if (!shellId) return { ok: false, output: "Daemon /api/shell did not return a shell id" };

    let exitCode: number | undefined = startBody?.data?.exit ?? startBody?.data?.exitCode;
    let status = startBody?.data?.status ?? "running";
    const deadline = Date.now() + 90_000;
    while (status === "running" && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 150));
      const pollRes = await doFetch(`${rootUrl}/api/shell/${encodeURIComponent(shellId)}${query}`, {
        headers: locHeaders,
      }).catch(() => null);
      if (pollRes?.ok) {
        const pollBody = (await pollRes.json()) as {
          data?: { status?: string; exit?: number; exitCode?: number };
        };
        status = pollBody?.data?.status ?? status;
        exitCode = pollBody?.data?.exit ?? pollBody?.data?.exitCode;
      }
    }
    let output = "";
    const outRes = await doFetch(
      `${rootUrl}/api/shell/${encodeURIComponent(shellId)}/output${query}`,
      { headers: locHeaders },
    ).catch(() => null);
    if (outRes?.ok) {
      const outBody = (await outRes.json()) as { data?: { output?: string; text?: string; chunk?: string } | string };
      const rawOut = typeof outBody?.data === "string" ? outBody.data : (outBody?.data?.output ?? outBody?.data?.text ?? outBody?.data?.chunk ?? "");
      output = String(rawOut).trim();
    }
    await doFetch(`${rootUrl}/api/shell/${encodeURIComponent(shellId)}${query}`, {
      method: "DELETE",
      headers: locHeaders,
    }).catch(() => {});
    return { ok: status !== "running" && (exitCode === 0 || exitCode === undefined), output };
  } catch (err) {
    return { ok: false, output: err instanceof Error ? err.message : "Failed to run daemon shell command" };
  }
}
