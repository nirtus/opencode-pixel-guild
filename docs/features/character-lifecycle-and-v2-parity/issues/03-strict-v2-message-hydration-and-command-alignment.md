# 03: Strict V2 Message-Union Hydration, Worktree Parity & Agent Command Endpoint Alignment

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01: Directory-Scoped V2 Session Discovery, Per-Directory Cache & Room-Scoped Active Sessions

**What to build:** Align HTTP message hydration and command dispatch with OpenCode V2's `Session.Message.Info` 11-variant union and `POST /api/session/{sessionID}/agent` endpoint so internal `"system"` notices never pollute **Character Sheet** assistant chat bubbles, worktree sessions under `/.local/share/opencode/worktree/` receive full hydration, and switching agents via a **Command Scroll** uses the valid V2 endpoint.

- [x] Filter the 11 `Session.Message.Info` union variants during message hydration so only `"user"` and `"assistant"` messages enter `messages`, `lastUserPromptText`, and `lastAssistantText` (excluding `"system"`, `"shell"`, `"agent-switched"`, `"model-switched"`, and `"location-switched"` from assistant chat bubbles while still extracting `"skill"`, `"compaction"`, `"agent-switched"`, and `"model-switched"` metadata).
- [x] Sort hydrated messages deterministically by `time.created` before extracting latest turn state and transcript ordering.
- [x] Remove the `isWorktreeOrRoot` hydration block for `/.local/share/opencode/worktree/` paths so sessions in OpenCode V2 Git worktrees hydrate catalogs, permissions, forms, and messages identically to project roots.
- [x] Update **Command Scroll** and summon execution so specifying `agentClass` calls `POST /api/session/{sessionID}/agent` (`{ agent: agentClass }`) rather than passing an invalid `agent` field inside `POST /api/session/{sessionID}/prompt` (`additionalProperties: false`).
- [x] Add tests verifying exclusion of `"system"` messages from assistant chat logs, chronological message ordering, worktree session hydration, and V2 agent-switch command requests, keeping all `src/**` files `<= 400` lines.

## Answer

Updated `hydrateSessionMessages` to order messages by timestamp (newest-first), exclude `"system"` and control messages from assistant chat transcripts while extracting `"agent-switched"` and `"model-switched"` metadata, enabled full hydration for `/.local/share/opencode/worktree/` locations in `fetchDaemonLocationState`, and updated `executeDaemonCommand` to switch agents via `POST /api/session/{sessionID}/agent`.
