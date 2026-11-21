# 03. Quest Gate Collapse, Quiet Bypass & Unlocked Command Scroll

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01, 02

## Context

In the **Character Sheet** HUD (`src/hud/character-sheet-vm.ts`, `src/web/quest-gate-card.ts`, `src/web/command-scroll-controller.ts`, `src/server/command-router.ts`, `src/ingress/daemon-command-ops.ts`):
1. `.command-scroll-card` is hidden with `.is-gate-hidden` (`display: none !important`) whenever `sheet.pendingQuestGate` is non-null, locking the operator out of the **Command Scroll**.
2. **Quest Gate** cards have no `Collapse ▾` / `Expand ▸` toggle to collapse multi-question prompts into a 1-line summary bar, and no `Bypass ✕` button to dismiss a gate quietly without injecting a synthetic user prompt.
3. `quest-gate-card.ts` re-parses raw fields and conversational markdown on every DOM reconciliation instead of receiving normalized `fields` from `buildCharacterSheetViewModel`.

## Requirements

1. **Pre-Normalize Gate Fields in View-Model (`src/hud/character-sheet-vm.ts`)**:
   - Normalize `pendingQuestGate.fields` in `buildCharacterSheetViewModel` (including conversational fallback via `detectConversationalQuestionPrompt`) so `PendingQuestGateViewModel` always provides normalized `QuestGateQuestionField[]`.
2. **Header Collapse (`▾`/`▸`) & Quiet Bypass (`✕`) on Quest Gate Cards (`src/web/quest-gate-card.ts`, `src/web/client-state.ts`, `src/web/styles-components.css`)**:
   - Track collapsed gate IDs in `clientState.collapsedGateIds` (`Set<string>`).
   - Render `[Collapse ▾]` / `[Expand ▸]` (`data-gate-collapse-toggle`) and `[Bypass ✕]` (`data-gate-bypass`) buttons in the header of both `.gate-card-question` and `.gate-card-permission`.
   - When collapsed, apply `.is-collapsed` to `.gate-card` so the body hides and the header displays a compact 1-line summary bar (`[?] Question Pending — <summary>`) that persists across SSE ticks while keeping the 2D canvas `[?]` / `[!]` marker visible.
3. **Quiet Bypass Command (`decision: "dismiss"`) (`src/types/command-types.ts`, `src/server/command-router.ts`, `src/ingress/daemon-command-ops.ts`)**:
   - Support `decision: "dismiss"` in `gate.resolve`.
   - Clicking `Bypass ✕` calls `markClientGateResolved` and sends `gate.resolve` with `decision: "dismiss"`.
   - On the server, `decision: "dismiss"` settles the gate in `WorldStateReducer` (`question.resolved` / `permission.resolved` + `session.idle`) without dispatching any fake `message.user.prompt`, and in `daemon-command-ops.ts` performs a non-blocking form/permission reject call for daemon gates (and a clean no-op for conversational gates).
4. **Unlocked Command Scroll & Implicit Bypass (`src/web/command-scroll-controller.ts`)**:
   - Keep `.command-scroll-card` visible below any active **Quest Gate** card (never apply `.is-gate-hidden` when `hasGate` is true).
   - When the user dispatches a prompt from the **Command Scroll** while `sheet.pendingQuestGate` is active, automatically mark the active gate resolved on the client alongside `scroll.send`.
5. **Documentation, Tests & Live Container Verification**:
   - Update `README.md` (and verify `GLOSSARY.md` and `docs/adr/0003-quest-gate-two-way-sync-and-bypass.md`).
   - Add unit tests for collapse, `decision: "dismiss"` bypass, and Command Scroll co-existence.
   - Deploy to `opencode-pixel-guild-visualizer` (`npm run docker:up` on port `4310`), run `npm test`, and capture visual proof in `docs/images/`.

## Answer

- Pre-normalized `pendingQuestGate.fields` in `buildCharacterSheetViewModel` (`src/hud/character-sheet-vm.ts`).
- Added header `Collapse ▾` / `Expand ▸` (`data-gate-collapse-toggle`, persisted in `clientState.collapsedGateIds`) and `Bypass ✕` (`data-gate-bypass`, `decision: "dismiss"`) controls in `src/web/quest-gate-card.ts` and `src/web/styles-components.css`.
- Handled `decision: "dismiss"` in `src/ingress/daemon-command-ops.ts` and `src/server/command-router.ts` so bypassing settles the gate without injecting a synthetic user chat message.
- Unlocked `.command-scroll-card` in `src/web/command-scroll-controller.ts` so the **Command Scroll** remains accessible below any active **Quest Gate** and implicitly settles the gate when sending a prompt.
- Deployed to `opencode-pixel-guild-visualizer` (`port 4310`), verified all 376 tests pass (`npm test`), and captured visual proof in `docs/images/quest-gate-sync-and-bypass.png`.

