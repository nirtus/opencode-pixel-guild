# 03: Deepen OpenCode V2 Ingress: Live `/api/event` SSE Stream, V2 Schema Alignment & Unified Project Room

Type: task
Label: ready-for-agent
Status: resolved

**What to build:** Upgrade OpenCode V2 telemetry ingress to subscribe to the live `GET /api/event` SSE stream for sub-50ms updates, batch background reconciliation sweeps into a single atomic snapshot broadcast, align all DTO normalizers with OpenCode V2's OpenAPI schemas (while preserving `?` **Quest Gate**s for both structured forms/`question` tools and conversational `❓`/`?` assistant questions), and consolidate all workspaces and Git `Worktree`s of a canonical project into its single unified **Workshop Room**.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] The daemon HTTP client subscribes to OpenCode V2's `GET /api/event` SSE stream and dispatches live session, tool, permission, compaction, and worktree events in real time.
- [x] Background location reconciliation sweeps run as a single atomic batch transaction (`dispatchBatch`) on the world state reducer, emitting at most one `GuildSnapshot` clone and SSE broadcast per sweep.
- [x] OpenCode V2 wire schemas are normalized accurately: `Permission.Request` maps `action`, `resources`, and `message`; `Form.Info` maps `fields`; completed tools extract output previews from `state.content` so test failures spawn **Bug Monster**s; compaction is detected from `Session.Message.Compaction`; and archival reads `time.archived`.
- [x] Both structured `/api/form` / `question` tools and assistant turns ending in conversational questions (`❓` prompts or trailing `?`) place the character at a `?` **Quest Gate** at their last active **Preparation Station** (or **Arcane Lectern**), clearing as soon as the user responds or a new tool run starts.
- [x] All workspaces, sandboxes, and Git `Worktree`s belonging to a canonical OpenCode project merge into that project's single unified **Workshop Room** so all project sessions collaborate in the same room.
- [x] The OpenCode V2 plugin adapter matches the V2 `@opencode/plugin` contract (`Plugin.define`, `Rpc.define`, tool/session hooks, and TUI keymap/slot registration) and WSL/Windows path conversion uses a single shared helper.
- [x] Automated ingress and reducer tests verify live SSE event handling, single-snapshot batch sweeps, V2 schema normalization, and single-room worktree consolidation.

## Answer

- **Live OpenCode V2 SSE Stream (`GET /api/event`)**: Added `subscribeEvents` and `mapOpenCodeSseFrameToTelemetryEvents` in `src/ingress/daemon-http-client.ts`, streaming `data:` SSE frames with `AbortController` teardown and mapping `session.created`/`session.updated`, `message.part.updated` (`tool.started`/`tool.completed` with `state.content` preview), `permission.asked`/`permission.replied`, `form.asked`/`form.replied`, `session.compaction.*`, `session.execution.succeeded`/`session.idle`, `session.execution.failed`, and `worktree.updated` into live `TelemetryEvent` dispatches. Wired `startLiveSubscription` in `src/ingress/opencode-client-adapter.ts` and `src/server/main.ts` alongside a 15-second background reconciliation sweep.
- **Atomic Batch Sweep Transaction (`dispatchBatch`)**: Added `dispatchBatch(events)` to `WorldStateReducer` (`src/state/world-reducer.ts`, `src/types/core-types.ts`) and wired `sweepAllLocations` (`src/ingress/opencode-client-adapter.ts`) and `createTelemetryIngressHub` (`src/ingress/ingress-hub.ts`) to batch all sweep events into a single `finalizeEmission` call, emitting at most one `GuildSnapshot` clone and listener broadcast per sweep.
- **OpenCode V2 Wire Schema Alignment**: Updated `src/ingress/daemon-location-state.ts` and `src/ingress/daemon-message-hydration.ts` to normalize V2 `Permission.Request` (`action`, `resources`, `message`), `Form.Info` (`fields`), `ToolState.Completed` (`state.content` text/file items for **Bug Monster** detection in `src/encounter/bug-monsters.ts`), `Session.Message.Compaction` (`compactedAtMs`), and `s.time.archived`, and removed unparameterized `GET /api/worktree` calls from `getLocations()`.
- **Single Unified Workshop Room per Canonical Project & Shared Path Helper**: Consolidated worktree sessions, permissions, questions, and catalogs into their parent project's canonical **Workshop Room** via `canonicalByWorktreeMap` in `src/ingress/opencode-client-adapter.ts` and `getActiveRoom`/`getActiveRoomCharacters` in `src/web/client-state.ts`. Consolidated WSL/Windows path conversion into `toPosixMountPath` and `resolveLocalProjectDir` in `src/state/location-normalization.ts`, and updated `src/ingress/plugin-adapter.ts` for V2 `@opencode/plugin` hooks and `ui.slot` registration.
