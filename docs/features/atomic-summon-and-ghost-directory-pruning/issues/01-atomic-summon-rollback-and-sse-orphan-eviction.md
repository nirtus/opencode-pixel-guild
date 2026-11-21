# 01: Atomic Summon Rollback, Deferred Location Registration & SSE Orphan Eviction

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: None

## Question

How should `executeDaemonCommand` (`src/ingress/daemon-command-ops.ts`) and `handleGuildCommandRoute` (`src/server/command-router.ts`) guarantee that when `adventurer.summon` fails at any stage (pre-flight directory validation, `POST /api/session`, or `POST /api/session/{id}/prompt`), zero orphaned sessions remain on the OpenCode daemon and zero characters appear in the **Workshop Room** (even if the daemon emitted `session.created` over SSE before the prompt failed)?

## Specification

Per [Feature Specification](./../spec.md) (Decision 1):
1. **Rollback in `executeDaemonCommand` (`src/ingress/daemon-command-ops.ts`)**:
   - In `if (cmd.command === "adventurer.summon")`:
     - If `POST /api/session` succeeds and returns `newSessionId`, and `cmd.promptText?.trim()` is then sent via `postPromptWithFastAck`:
     - When `!promptRes.ok`, immediately issue a rollback `DELETE /api/session/${encodeURIComponent(newSessionId)}${query}` (via `fetchWithDockerHostFallback`) before returning `{ ok: false, sessionId: newSessionId, error: \`Prompt HTTP \${promptRes.status}\` }`.
2. **Pre-Flight Check, Deferred Location Registration & SSE Race Cleanup in `handleGuildCommandRoute` (`src/server/command-router.ts`)**:
   - Keep `src/server/command-router.ts` (`<= 400` lines) clean and within the architectural line limit.
   - Before calling `ctx.daemonClient.executeCommand(cmd)` on `adventurer.summon`:
     - Check `if (isDeletedHostDirectory(rawDirectory, undefined, snapshotBefore.daemonUrl))` and return `{ ok: false, command: "adventurer.summon", adapter: activeAdapter, sessionId: null, error: \`Directory does not exist on host: \${rawDirectory}\`, delta: ..., snapshot: snapshotBefore }` immediately.
     - Defer `await ctx.clientAdapter?.registerLocation?.(rawDirectory)` until **after** `daemonRes` succeeds (`!daemonRes || daemonRes.ok`).
   - When `daemonRes && !daemonRes.ok`:
     - If `daemonRes.sessionId` is present:
       1. Call `ctx.clientAdapter?.evictDeletedSessions?.([daemonRes.sessionId])`.
       2. Call `await ctx.daemonClient?.deleteSession?.(daemonRes.sessionId, cmd.directory).catch(() => false)`.
       3. If `activeReducer.getSnapshot().characters[daemonRes.sessionId]` exists (due to an SSE `session.created` event arriving during `executeCommand`), dispatch `{ type: "session.deleted", timestampMs: Date.now(), sessionId: daemonRes.sessionId, locationDirectory: cmd.directory }` so SSE clients immediately evict the character.

## Acceptance Criteria

- [x] When `POST /api/session` succeeds (`200 OK`) and `POST /api/session/{id}/prompt` fails (`404` or `500`), `DELETE /api/session/{id}` is called automatically to roll back the session on the daemon.
- [x] Even if an SSE `session.created` / `session.upserted` event arrives on `activeReducer` before `POST /api/session/{id}/prompt` fails, `handleGuildCommandRoute` evicts and deletes the session so `snapshot.characters` contains `0` characters from the failed summon.
- [x] `registerLocation(rawDirectory)` is not called when `adventurer.summon` fails.
- [x] All source files under `src/` remain `<= 400` lines (`tests/00-architecture-invariants.test.ts`).

## Answer

Implemented in:
- `src/ingress/daemon-command-ops.ts`: Added immediate `DELETE /api/session/${encodeURIComponent(newSessionId)}${query}` rollback inside `executeDaemonCommand` whenever `adventurer.summon` creates `newSessionId` via `POST /api/session` and the subsequent initial prompt `postPromptWithFastAck` returns `!promptRes.ok`.
- `src/server/command-router.ts`: Added pre-flight `isDeletedHostDirectory` check before calling the daemon, deferred `registerLocation(resolvedDirectory)` until after `daemonRes` succeeds, and added full orphan cleanup (`evictDeletedSessions`, `deleteSession`, and `session.deleted` reducer dispatch) when `daemonRes && !daemonRes.ok` carries a `daemonRes.sessionId`.
- `tests/36-add-world-folder-and-summon.test.ts`: Added TDD regression test `4b` verifying `DELETE /api/session/:id` rollback, SSE race character eviction, and deferred `registerLocation`.
