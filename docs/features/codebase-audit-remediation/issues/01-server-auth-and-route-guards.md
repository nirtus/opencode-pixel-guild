# 01: Server Auth Enforcement, Registered Room Validation & Request Body Limits

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: None (can start immediately)

**What to build:** Enforce the **Operator Auth Gate** across all Git, command, room, session, and workspace-folder HTTP routes when unauthenticated, require Git operations to target a registered **Workshop Room** in the active snapshot, protect existing **Guild Operator** accounts against passwordless takeover while preserving HTTP status codes (`401`, `409`, `413`), and bound HTTP JSON request body buffering to `1 MB`.

**Blocked by:** None (can start immediately)

**Status:** resolved

## Acceptance Criteria

- [x] Every modified or created source module remains strictly `<= 400` lines.
- [x] When the **Operator Auth Gate** is locked (`authenticated === false`), all Git routes (`/api/guild/git`) and all mutating or filesystem-probing API routes (`/api/guild/command`, `/api/guild/room`, `/api/guild/refresh`, `/api/guild/scenario`, `/api/guild/workspace-folders`, `/api/guild/session/*`) reject unauthenticated requests with `401 Unauthorized`, while the snapshot and SSE bootstrap routes continue returning the locked empty state.
- [x] Room resolution for Git working-tree inspection and mutations requires the requested room or project identifier to match a registered **Workshop Room** in the operator's active snapshot (or known rooms list), rejecting arbitrary unregistered filesystem paths with `400` / `404`.
- [x] Operator registration and login never overwrite the password hash of an existing registered **Guild Operator** account without password verification, and operator route error handlers preserve `401`, `409`, and `413` status codes.
- [x] The HTTP JSON request body reader aborts and returns `413 Payload Too Large` whenever a request body exceeds `1 MB` (`1_048_576` bytes).
- [x] Automated behavioral tests at the companion server HTTP seam verify `401` unauthenticated rejection, unregistered room rejection, operator account protection, and `413` body limits, verified on the `opencode-pixel-guild-visualizer` Docker container.

## Answer

- Enforced `ctx.authenticated === false` checks across `tryHandleGuildGitRoute` (`src/server/git-router.ts`) and `tryHandleGuildApiRoute` (`src/server/api-router.ts`), returning `401 Unauthorized` for all Git, command, room, refresh, preset/scenario, adapter, workspace-folders, and session routes while keeping `GET /api/guild/snapshot` and `GET /api/guild/events` open for locked-state bootstrap.
- Hardened `resolveSelectedRoomDirectory` in `src/server/git-router.ts` to require a matching room in `snapshot.rooms`, returning `null` (`404` when an unregistered room identifier is supplied, `400` when omitted) instead of falling back to raw unvalidated filesystem paths.
- Removed passwordless overwrite branches from `registerOperator` and `loginOperator` in `src/server/operator-registry.ts` so existing operator accounts cannot be claimed by unauthenticated callers, and updated `src/server/operator-routes.ts` error handlers to preserve `statusCode` (`401`, `409`, `413`).
- Added a `MAX_JSON_BODY_BYTES = 1_048_576` (`1 MB`) limit to `readJsonBody` (`src/server/api-router.ts`) and propagated `413` status codes across all route handlers.
