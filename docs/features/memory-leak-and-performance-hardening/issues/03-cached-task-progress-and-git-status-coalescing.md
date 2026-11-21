# 03: Unified `deriveProjectTaskProgress` & Git Status Cache Coalescing

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: None (can start immediately)

**What to build:** Prevent mutating tool completions (`edit`, `write`, `bash`, `shell`) and `session.idle` SSE events from bypassing `taskProgressCache` and spawning 5 synchronous `git` child processes on the Node.js event loop on every event.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Cache `deriveProjectTaskProgress(projectDir, fallbackSessions)` results in `taskProgressCache` (with an `8,000 ms` TTL) both when `fallbackSessions` is provided and when `fallbackSessions === undefined` (direct SSE tool completion / idle calls).
- [x] Coalesce rapid `getStatus(roomDir)` calls in `createLiveGitWorkingTreeAdapter` (`1,500 ms` cache window) while still invalidating immediately on `stageFiles`, `unstageFiles`, `discardFiles`, `createCommit`, and `retireCompletedFeatureSlug`.

## Answer

Cached `deriveProjectTaskProgress(projectDir, fallbackSessions)` across both direct (`fallbackSessions === undefined`) and fallback calls in `src/ingress/issue-tracker-scanner.ts` with immediate invalidation on `retireCompletedFeatureSlug` and `invalidateTaskProgressCache`.
