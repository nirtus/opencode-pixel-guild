# Specification: Atomic `Guild Adventurer` Summoning, Orphan Rollback & Ghost Directory Pruning

## Problem Statement

When a **Guild Operator** clicks **Summon Adventurer** in `#summon-adventurer-modal`, two compounding defects occur:

1. **Failed Summon Still Spawns an Orphaned Character in the `Workshop Room` (Violation of Atomic Summon Invariant)**:
   - In `src/ingress/daemon-command-ops.ts` (`executeDaemonCommand`, lines 266–305), `adventurer.summon` executes in two non-atomic steps:
     1. `POST /api/session?location[directory]=...` creates `newSessionId` in OpenCode's `session_v2` database table and immediately broadcasts `session.created` over the live `/api/event` SSE stream (`HTTP 200 OK`, because `session.create` does not validate that `location.directory` exists on disk).
     2. `POST /api/session/${newSessionId}/prompt?location[directory]=...` dispatches the initial prompt (`HTTP 404 LocationNotFoundError` when the target directory does not exist on disk, or `4xx/5xx` on prompt rejection).
   - When Step 2 fails, `executeDaemonCommand` returns `{ ok: false, sessionId: newSessionId, error: "Prompt HTTP 404" }` **without deleting `newSessionId` on the OpenCode daemon (`DELETE /api/session/${newSessionId}`)**.
   - Meanwhile, `src/ingress/opencode-client-adapter.ts` receives the `session.created` SSE event from Step 1 (and subsequent `/api/session` location sweeps), dispatches `session.upserted` into `WorldStateReducer`, and spawns the orphaned, promptless **Guild Adventurer** into the **Workshop Room** while `#summon-adventurer-modal` displays `"⚠️ Summon Failed — Retry"`. Each retry spawns another orphaned character.
   - Furthermore, `src/server/command-router.ts` (lines 177–180) calls `recordDirectory(rawDirectory)` and `await ctx.clientAdapter?.registerLocation?.(rawDirectory)` **before** `ctx.daemonClient.executeCommand(cmd)` succeeds, mutating room state even when the summon fails.

2. **Deleted Host Project Directories (`opencode-guild`) Escape `isDeletedHostDirectory` Inside Docker and Become the Default Summon Target**:
   - In `docker-compose.yml`, the host workspace parent directory (`..`, e.g., `/mnt/c/Users/.../Documents/Development`) is mounted at `/workspaces`, while the visualizer repository is mounted at `/app`.
   - When `GET /api/project` returns a stale/deleted host project first in the list (e.g., `/mnt/c/Users/.../Documents/Development/opencode-guild`), `isDeletedHostDirectory` (`src/state/location-normalization.ts`, lines 223–257) checks if `/workspaces/opencode-guild` exists (`false`), and then checks if any ancestor path (`/c/Users/.../Documents/Development`) resolves via `resolveLocalProjectDir`.
   - Because `resolveLocalProjectDir` only checks `/workspaces/Development` and `/workspaces/Documents/Development` (lines 178–186) and never maps the host workspace parent directory itself to `/workspaces`, `resolveLocalProjectDir(ancestor)` returns `null` for every ancestor. Consequently, `isDeletedHostDirectory` always returns `false` inside the Docker container for deleted sibling folders under the workspace parent root.
   - Because `opencode-guild` is index `0` in `snapshot.roomOrder`, opening `#summon-adventurer-modal` while `🌐 All` worlds is focused (`selectedProjectId === null`) causes `getDefaultSummonDirectory()` (`src/web/summon-adventurer-controller.ts`, lines 49–65) to fall back to `allRooms[0]` (`opencode-guild`), targeting a non-existent directory and triggering `HTTP 404 LocationNotFoundError` on `POST /api/session/{id}/prompt`.
   - Additionally, `src/web/summon-adventurer-controller.ts` (line 310) sets `const promptText = promptInput?.value?.trim() || title || undefined;`, forcing a `POST /api/session/{id}/prompt` call even when the user only typed a Quest Title and left the optional prompt textarea blank.

---

## Core Design Decisions (Confirmed in Grilling Round 1, Q1–Q3)

### Decision 1: Atomic `adventurer.summon` with Daemon Rollback & SSE Orphan Eviction
- **Pre-Flight Validation & Deferred Registration (`src/server/command-router.ts`)**:
  - Before invoking `ctx.daemonClient.executeCommand(cmd)` for `adventurer.summon`, validate `!isDeletedHostDirectory(rawDirectory, undefined, snapshotBefore.daemonUrl)`. If the directory is a deleted host directory, immediately return `{ ok: false, command: "adventurer.summon", sessionId: null, error: "Directory does not exist on host: ...", snapshot: snapshotBefore }` without calling the daemon or registering the location.
  - Only call `ctx.daemonClient?.recordDirectory?.(rawDirectory)` and `await ctx.clientAdapter?.registerLocation?.(rawDirectory)` **after** `daemonRes?.ok !== false` is confirmed.
- **Immediate Daemon Session Rollback on Prompt Failure (`src/ingress/daemon-command-ops.ts`)**:
  - In `executeDaemonCommand` (`cmd.command === "adventurer.summon"`), if `POST /api/session` succeeds and creates `newSessionId`, and the subsequent initial prompt (`postPromptWithFastAck`) returns `!promptRes.ok`:
    - Immediately delete the newly created session on the OpenCode daemon (`DELETE /api/session/${encodeURIComponent(newSessionId)}${query}`) before returning `{ ok: false, sessionId: newSessionId, error: "Prompt HTTP ..." }`.
- **Server-Side SSE Race Cleanup & Tombstoning (`src/server/command-router.ts`)**:
  - When `cmd.command === "adventurer.summon"` and `daemonRes && !daemonRes.ok`:
    - If `daemonRes.sessionId` was allocated before failure:
      1. Evict `daemonRes.sessionId` in `ctx.clientAdapter?.evictDeletedSessions?.([daemonRes.sessionId])` so any in-flight or late `session.created` SSE event or location sweep ignores it.
      2. Ensure `await ctx.daemonClient?.deleteSession?.(daemonRes.sessionId, cmd.directory).catch(() => false)` deletes the session on the daemon.
      3. If `activeReducer.getSnapshot().characters[daemonRes.sessionId]` was already inserted by a racing SSE `session.created` event while `executeCommand` was awaiting the prompt response, dispatch `session.deleted` to `activeReducer` so connected browsers immediately remove it.
    - Return `{ ok: false, sessionId: null, error: daemonRes.error, delta: { kind: "adventurer.summon.failed", ... }, snapshot: activeReducer.getSnapshot() }`.

### Decision 2: Docker `/workspaces` Parent-Mount Resolution & Ghost Directory Pruning
- **Container Workspace Parent Resolution (`src/state/location-normalization.ts`)**:
  - In `resolveLocalProjectDir(projectDir, checkExists)`:
    - Recognize when `/workspaces` is the mounted host workspace parent directory (e.g., when `/workspaces/<cwdBaseName>` such as `/workspaces/opencode-game-visualizer` exists locally and `norm` is the parent path of a sibling project under that same workspace parent).
    - Specifically, in `isDeletedHostDirectory(rawDir, checkExists, daemonUrl)`: when `resolveLocalProjectDir(trimmed, checkExists)` returns `null` (meaning `/workspaces/<leaf>` does not exist), if `/workspaces` is mounted with known sibling projects (such as `/workspaces/opencode-game-visualizer`) and `norm` shares the host workspace parent prefix (or its parent segment matches the parent of `opencode-game-visualizer`), treat the parent ancestor as existing at `/workspaces` so `isDeletedHostDirectory` returns `true` for deleted sibling folders like `/mnt/c/Users/.../Documents/Development/opencode-guild`.
    - Also filter out the bare workspace parent root itself (`/mnt/c/Users/.../Documents/Development` when it maps to `/workspaces` itself rather than `/workspaces/<project>`) from being discovered as a project room when it has `0` active sessions.
- **Smart Default Summon Directory & Optional Prompt Separation (`src/web/summon-adventurer-controller.ts`)**:
  - In `getDefaultSummonDirectory()`: when `🌐 All` worlds is focused (`isAllWorldsFocused`), prefer:
    1. The room of the currently selected character (`clientState.selectedSessionId`), if any;
    2. A non-worktree room with active or open characters in `snapshot.characters`;
    3. A room matching `opencode-game-visualizer` before falling back to `allRooms[0]`.
  - In `submitSummon()`: keep `title` and `promptText` separate (`const promptText = promptInput?.value?.trim() || undefined;`) so summoning with only a Quest Title creates an idle session with that title without forcing a synthetic prompt dispatch.

---

## Verification & Acceptance Criteria

1. **Zero Characters Spawned on Failed Summon**:
   - If `POST /api/session` fails, OR if `POST /api/session` succeeds (`200 OK`) and `POST /api/session/{id}/prompt` fails (`404`/`500`), **and even if the daemon emits `session.created` over SSE before the prompt fails**, the newly created session is rolled back (`DELETE /api/session/{id}`), evicted from `OpenCodeClientAdapter` and `WorldStateReducer`, and **zero characters appear in `snapshot.characters` or on the canvas**.
2. **Ghost Host Directories Pruned Inside Docker Container**:
   - `isDeletedHostDirectory("/mnt/c/Users/.../Documents/Development/opencode-guild")` returns `true` inside the Docker container when `/workspaces/opencode-game-visualizer` exists and `/workspaces/opencode-guild` does not, pruning `opencode-guild` from `snapshot.rooms` and stopping `404 LocationNotFoundError` polling spam.
3. **Smart Summon Directory Default & Optional Prompt**:
   - Opening `#summon-adventurer-modal` when `🌐 All` is focused defaults to the selected hero's project room or an active project room (`opencode-game-visualizer`), never a deleted ghost room.
   - Summoning with only a title and an empty prompt textarea does not copy `title` into `promptText`.
4. **400-Line Ceiling & Live Docker Container Visual Verification**:
   - All files under `src/` remain `<= 400` lines (`tests/00-architecture-invariants.test.ts`).
   - Deployed and verified on `opencode-pixel-guild-visualizer` (`npm run docker:up` on port `4310`) with headless Chrome screenshot proof in `docs/images/atomic-summon-and-ghost-directory-pruning.png`.
