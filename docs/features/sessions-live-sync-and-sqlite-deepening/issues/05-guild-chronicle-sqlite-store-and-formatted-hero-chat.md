# 05: Guild Chronicle SQLite Store (`./data/`) & Formatted, Compacted Multi-Turn Hero Chat

Type: grilling
Label: wayfinder:grilling
Status: resolved
Blocked by: 01

## Question

How should the **Guild Chronicle Store** (`node:sqlite` in `./data/guild-chronicle.sqlite`) and the **Character Sheet** `Chat` view (`src/web/hero-subtabs-reconciler.ts`, `src/web/side-panel-reconciler.ts`, `src/hud/character-sheet-vm.ts`) be designed so that operator workspaces and complete multi-turn `user` + `assistant` conversations persist across restarts, load instantaneously for any character (including subagents), and render in a clean, formatted, compacted UI/UX?

## Answer

Confirmed in Grilling Round 1 (`Q6`) & Round 2 (`Q7`, `Q8`):
1. **Guild Chronicle SQLite Store (`./data/guild-chronicle.sqlite`)**:
   - Create a deep persistence module using Node 22's built-in `node:sqlite` (`DatabaseSync` in WAL mode at `./data/guild-chronicle.sqlite` by default, or `:memory:` in unit tests) and store operator profiles at `./data/guild-operators.json` (auto-migrating existing records from `./.opencode-guild-operators.json` if present).
   - Persist tables for `rooms`, `sessions`, and `session_messages(operator_id, session_id, message_id, role, text, attached_skills_json, created_at_ms, updated_at_ms, PRIMARY KEY (operator_id, session_id, message_id))`.
   - Restore persisted rooms, sessions, and recent chat turns into each operator's `WorldStateReducer` on startup so known sessions and chat transcripts are available in `<5ms` before network polling even finishes.
2. **Complete User + Assistant Message Extraction & On-Demand Transcript Endpoint**:
   - Update `hydrateSessionMessages` (`src/ingress/daemon-message-hydration.ts`) and `mapOpenCodeSseFrameToTelemetryEvents` (`src/ingress/daemon-sse-mapper.ts`) to extract both `user` and `assistant` messages into a chronological `messages: SessionChatMessage[]` array on `CharacterState` and `CharacterSheetViewModel`, accumulating multiple text parts within the same `messageId` instead of overwriting `lastAssistantText`, and raising tool `outputPreview` retention to `2,000` chars.
   - Expose `GET /api/guild/session/:sessionId/messages` on the companion server, returning cached turns from the **Guild Chronicle Store** and fetching `/api/session/:id/message?limit=50` from the daemon on demand when a user inspects any **Guild Adventurer** or **Squad Subagent** whose transcript is not yet hydrated.
3. **Formatted, Compacted Hero Chat UI/UX**:
   - **Clean Prompt Sanitization & `@skill` Pills**: Strip injected `<skill_content name="...">...</skill_content>` and `<system-reminder>...</system-reminder>` blocks from message text, extracting the skill names into compact `@skill` badge pills rendered in the message header.
   - **Safe Semantic Markdown Formatter**: Format message bodies into clean semantic HTML (headings, **bold**, inline `<code>`, bulleted/numbered lists, and compact scrollable `<pre><code>` blocks) instead of raw unformatted Markdown syntax.
   - **Turn Compaction & Scroll Preservation**: Render chronological `You` and `Adventurer` turn cards; automatically compact older turns or long messages (`> 8 lines` or `> 500 chars`) behind an inline `Show full message ▾ / Collapse ▴` button (`data-toggle-chat-msg="<messageId>"`) while keeping the latest turn expanded, and preserve `.dispatch-transcript-scroll` `scrollTop` during live streaming updates.

## Acceptance Criteria

- [x] `./data/guild-chronicle.sqlite` (`node:sqlite` WAL mode, with `:memory:` test support) persists rooms, sessions, and multi-turn `session_messages` across server restarts, and auto-migrates `./.opencode-guild-operators.json` into `./data/`.
- [x] Both `user` and `assistant` messages (and multi-part assistant turns) are captured from SSE and HTTP hydration, and `GET /api/guild/session/:sessionId/messages` hydrates full transcripts on demand for any selected **Guild Adventurer** or **Squad Subagent**.
- [x] `Hero > Chat` strips `<skill_content>`/`<system-reminder>` XML blocks into compact `@skill` pills, renders structured Markdown, provides inline `Show full message ▾ / Collapse ▴` toggles on long/historical messages, and preserves scroll position on live updates.
