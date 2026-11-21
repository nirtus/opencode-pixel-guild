# 01: Directory-Scoped V2 Session Discovery, Per-Directory Cache & Room-Scoped Active Sessions

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: None

**What to build:** Fix the OpenCode V2 HTTP session discovery and location polling pipeline so every **Project World** queries its own sessions using OpenCode V2's top-level `?directory=` filter (including a dedicated `parentID=null` root-session query so bursts of child **Squad Subagents** never starve root **Guild Adventurers**), caches session lists per directory rather than globally, and intersects process-global `/api/session/active` responses with each room's discovered sessions so active turns in one project never materialize empty home directories (`/home/...`, `/c/Users/...`), resurrect demolished **Workshop Rooms**, or spawn empty worktree annex rooms.

- [x] Update session list queries in the daemon ingress adapter to use `?directory=<daemonDir>&limit=100` plus `?directory=<daemonDir>&parentID=null&limit=50` (merging both by session ID) instead of the ignored `?location[directory]=` query parameter.
- [x] Replace the single global `cachedSessionsList` with a per-directory session list cache keyed by normalized directory so querying one **Project World** never returns another project's session list.
- [x] Intersect process-global `GET /api/session/active` (`Record<Session.ID, { type: "running" }>`) with the session IDs belonging to the target location (fixing `info.type === "running" || info.status === "running"` instead of `info.type !== "idle"`) before populating `activeSessionIds` or computing `totalSessionsInLoc`.
- [x] Suppress `location.discovered` emissions for 0-session user home directories, demolished rooms, and worktree directories whose sessions are consolidated into their canonical parent **Workshop Room**.
- [x] Add unit and integration tests verifying multi-project discovery isolation, root-session preservation during subagent bursts, and room-scoped active session filtering, keeping all `src/**` files `<= 400` lines.

## Answer

Updated `fetchDaemonLocationState` and `executeDeleteRoomResources` to query `/api/session` with top-level `?directory=` plus a dedicated `?directory=...&parentID=null&limit=50` root-session query, keyed `cachedSessionsByPath` per request path in `createHttpOpenCodeDaemonClient`, and intersected process-global `/api/session/active` responses with each location's discovered session IDs.
