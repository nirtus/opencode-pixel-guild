# 02: Stateful OpenCode V2 SSE Event Decoder for Tools, Prompts, Skills & Identity

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: None

**What to build:** Upgrade the OpenCode V2 `/api/event` SSE decoder so live tool calls (`session.tool.input.started`, `session.tool.called`, `session.tool.success`, `session.tool.failed`), shell commands (`session.shell.started`, `session.shell.ended`), CLI user prompts (`session.inbox.enqueued`), skill activations (`session.skill.activated`), and session identity/lifecycle transitions (`session.agent.selected`, `session.model.selected`, `session.renamed`, `session.step.started`, `session.moved`, `session.archived`, `session.unarchived`, `session.execution.interrupted`) drive **Guild Adventurers** and **Squad Subagents** in real time without waiting for a poll or creating phantom `"/"` rooms.

- [x] Maintain a lightweight per-stream tool-call correlation map so `session.tool.input.started` (`{ id, name }`) paired with `session.tool.called` (`{ id, input }`) emits `tool.started` with both `toolName` and `toolInput`, and `session.tool.success` / `session.tool.failed` emits `tool.completed` with extracted output/error previews.
- [x] Map `session.shell.started` / `session.shell.ended` to shell tool transitions, `session.inbox.enqueued` (`item.type === "user"`) to `message.user.prompt` (with attached skills), and `session.skill.activated` to `skill.activated`.
- [x] Map `session.agent.selected`, `session.model.selected`, `session.renamed`, and `session.step.started` (`agent`, `model`) to character identity updates without overwriting `locationDirectory` to `"/"` when the character already exists in a **Workshop Room**.
- [x] Map `session.moved` to `session.moved`, `session.archived` / `session.unarchived` to archive state transitions, and `session.execution.interrupted` to `session.idle`.
- [x] Add unit tests covering the full OpenCode V2 `/api/event` schema catalog (`session.tool.*`, `session.inbox.enqueued`, `session.skill.activated`, `session.agent.selected`, `session.model.selected`, `session.renamed`, `session.moved`, `session.archived`, `session.unarchived`, `session.execution.interrupted`), keeping all `src/**` files `<= 400` lines.

## Answer

Implemented stateful OpenCode V2 SSE decoding in `src/ingress/daemon-sse-mapper.ts` (correlating `session.tool.input.started` and `session.tool.called` via `toolNameByCallId`, mapping `session.tool.success`/`failed`, `session.shell.*`, `session.inbox.enqueued`, `session.skill.activated`, `session.agent.selected`, `session.model.selected`, `session.renamed`, `session.step.started`, `session.moved`, `session.archived`/`unarchived`, and `session.execution.interrupted`) and guarded `handleSessionUpserted` against creating phantom `"/"` rooms on partial SSE frames.
