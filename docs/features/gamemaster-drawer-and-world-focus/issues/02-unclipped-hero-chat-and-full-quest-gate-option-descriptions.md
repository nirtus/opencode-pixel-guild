# 02: Unclipped Hero Chat & Full Quest Gate Option Descriptions

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01

**What to build:** Eliminate all text slicing and truncation across the **Character Sheet** (`Hero -> Chat`) and **Quest Gate** cards so multi-paragraph questions, option descriptions, and live assistant responses are always visible in full.

**Blocked by:** 01

**Status:** resolved

- [x] **Full Multi-Line Question Extraction (`src/ingress/daemon-message-hydration.ts` & `src/capability/classifier.ts`)**:
  - Update `detectConversationalQuestionPrompt(text)` to match `❓` markers (including markdown headings/lists/bold prefixes like `### ❓ **Q1**` or `1. ❓`) and capture the full multi-line question block (up to `2,500` chars) instead of slicing a single line to `200` chars.
  - Ensure `question` tool calls populate `QuestGate` with the full question prompt(s) rather than falling back to the 80-char `formatInputPreview()`.
- [x] **Render Option Descriptions & Deduplicate Question Prompt (`src/web/quest-gate-card.ts` & `src/web/styles-components.css`)**:
  - Render both `opt.label` and `opt.description` inside every option button in `renderQuestGateCardHtml()`.
  - Do not repeat `gate.prompt` in `.gate-prompt-text` when `fields[0]?.question` already displays the same question text.
  - Remove `white-space: nowrap; text-overflow: ellipsis` from `.roster-row-reason` on the **Guild Master Ledger** `Open Quest Gates` alert card so question text wraps cleanly.
- [x] **Unclipped Active Chat Turns & Stable Turn IDs (`src/hud/chat-markdown-formatter.ts`)**:
  - Never auto-compact the newest 2 turns in `buildAdventurerDispatchLogViewModel()` (or any turn when `pendingQuestGate` is active), and raise the historical turn compaction threshold from `550` chars to `2,500` chars (`previewLimit = 1,200`).
  - Use a deterministic turn-index ID (`turn-${idx}-${role}`) instead of `a:${sessionId}:live` so expanding or reading a message during SSE streaming never resets when the next HTTP poll hydrates `msg.id`.
- [x] **Default Hero Subtab = `Chat` (`src/web/client-state.ts`, `src/web/pointer-and-camera.ts`, `src/web/ledger-panel-reconciler.ts`)**:
  - Change the default `currentHeroSubtab` in `client-state.ts` from `"details"` to `"chat"`, and ensure clicking a character with an open **Quest Gate** (on the canvas or in the Ledger) always switches to `Hero -> Chat`.
- [x] **Unit & Integration Tests**: Verify that 1,500-char assistant replies and multi-question grilling blocks render unclipped in `buildAdventurerDispatchLogViewModel()`, option `description`s render in `renderQuestGateCardHtml()`, and SSE-to-poll hydration preserves message expansion.

## Answer

Implemented and verified with unit/integration tests in `tests/24-gamemaster-drawer-and-world-focus.test.ts` and live 1600x1000 headless Chrome screenshots in `docs/images/`.
