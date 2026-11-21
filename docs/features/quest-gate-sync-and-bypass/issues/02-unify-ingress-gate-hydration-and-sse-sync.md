# 02. Unify Daemon Ingress Gate Hydration & SSE Resolution Seam

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01

## Context

In `src/ingress/`, external OpenCode TUI/CLI/web question answers and rejections fail to propagate cleanly:
1. `daemon-sse-mapper.ts` misses `question.rejected`, `question.cancelled`, `question.dismissed`, `permission.rejected`, and `permission.cancelled`, and omits `requestID`, `questionID`, and `callID` when extracting `gateId` for question resolution events. It also does not consult `toolNameByCallId` on `message.part.updated` completion frames when `part.tool` is omitted.
2. `daemon-message-hydration.ts` drops `convQ.fields` (`fields: []`) on hydrated conversational questions.
3. `daemon-location-state.ts` caches idle session hydrations in `idleMessageHydrationCache` even when `msgHydration.pendingQuestion` is non-null.
4. `opencode-client-adapter.ts` and `api-router.ts` duplicate post-hydration dispatch logic and only emit `question.requested` when `pq` is active—never emitting `question.resolved` when `hydrated.pendingQuestion` is `null` or `completed` for a character that still has an open `question` gate.

## Requirements

1. **SSE Resolution & Tool Call Mapping (`src/ingress/daemon-sse-mapper.ts`)**:
   - Map `permission.replied | permission.resolved | permission.rejected | permission.cancelled` to `permission.resolved`.
   - Map `form.replied | form.resolved | form.cancelled | form.rejected | question.replied | question.resolved | question.rejected | question.cancelled | question.dismissed` to `question.resolved`.
   - Extract `gateId` from `gateId`, `formID`, `requestID`, `questionID`, `callID`, `permissionID`, or `id` (with fallback `"question:${sessionId}"` / `"perm:${sessionId}"` when `sessionId` is known).
   - In `message.part.updated` (`part.type === "tool"`), remember tool names via `rememberToolCallName` and fall back to `toolNameByCallId.get(callId)` when `part.tool` / `part.name` is missing.
2. **Hydration Field Preservation & Cache Hygiene (`src/ingress/daemon-message-hydration.ts`, `src/ingress/daemon-location-state.ts`)**:
   - Preserve `fields: convQ.fields` in `hydrateSessionMessages` when constructing a conversational `pendingQuestion`.
   - In `fetchDaemonLocationState`, do not cache `msgHydration` in `idleMessageHydrationCache` when `msgHydration.pendingQuestion` is non-null.
3. **Two-Way Post-Hydration Gate Reconciliation (`src/ingress/opencode-client-adapter.ts`, `src/server/api-router.ts`)**:
   - When `getSessionMessages` completes, if `hydrated.pendingQuestion` is `null` (or `completed` or `lastRole === "user"`) and the character in the reducer snapshot currently has `questGate?.kind === "question"`, dispatch `question.resolved` for that `gateId` so externally answered questions clear immediately.
4. **Tests & Line Ceiling**:
   - Add unit tests verifying SSE `requestID` / `question.rejected` mapping, conversational field preservation in `hydrateSessionMessages`, and post-hydration `question.resolved` emission.
   - Keep all files under `src/` strictly `<= 400` lines.

## Answer

- Extended `mapOpenCodeSseFrameToTelemetryEvents` (`src/ingress/daemon-sse-mapper.ts`) to map `question.rejected`, `question.cancelled`, `question.dismissed`, `permission.rejected`, and `permission.cancelled` with `requestID`/`questionID`/`callID` extraction and `toolNameByCallId` lookup on `message.part.updated`.
- Preserved `convQ.fields` in `hydrateSessionMessages` (`src/ingress/daemon-message-hydration.ts`), skipped caching pending questions in `idleMessageHydrationCache` (`src/ingress/daemon-location-state.ts`), and extracted `buildHydratedSessionEvents` to emit `question.resolved` when hydrated transcripts show an open question gate was settled externally.
- Verified with unit tests in `tests/51-quest-gate-sync-and-bypass.test.ts` and live Docker container deployment (`port 4310`).

