# Feature Specification: Quest Gate Two-Way OpenCode Sync, Collapse & Quiet Bypass

## 1. Overview & Problem Statement

When a **Guild Operator** works across both the actual OpenCode interface (TUI, CLI, or web client) and the OpenCode Pixel Guild Visualizer, **Quest Gates** (`!` permission locks and `?` structured `question` forms or conversational assistant prompts) must stay synchronized in both directions and never trap the **Character Sheet** HUD:

1. **Stale Gates After Answering in OpenCode**:
   - Answering a `question` tool in OpenCode TUI marks the tool part `completed` and transitions the session to `Thinking` / `WorkingAtStation` without creating a new `role: "user"` chat message. Previously, `handleSessionStatus`, `transitionCharacterState`, `mergeHydratedRecentTools`, and `handleSessionUpserted` left `char.questGate` non-null, keeping the **Quest Gate** card stuck on screen and forcing the character back into `BlockedAtQuestGate` when `session.idle` arrived.
   - Conversational gates (`source: "conversational"`) remained open even after a new assistant turn completed without a question or when `handleMessageUserPrompt` returned early on `alreadyProgressedTurn`.
   - SSE resolution frames carrying `requestID` / `questionID` / `callID` or `question.rejected` / `question.cancelled` were dropped by `daemon-sse-mapper.ts`, and `idleMessageHydrationCache` cached pending questions on idle sessions.
2. **No Collapse or Bypass & Locked-Out Command Scroll**:
   - `command-scroll-controller.ts` applied `.is-gate-hidden` (`display: none !important`) to `.command-scroll-card` whenever `pendingQuestGate` was present, preventing the operator from steering the hero, switching **OpenCode Agent Mode**, or sending a freeform prompt.
   - `quest-gate-card.ts` had no header collapse toggle (`Collapse ▾` / `Expand ▸`) and no `Bypass ✕` action to dismiss a gate without sending a fake chat message.

---

## 2. Architectural Design

### 2.1 Candidate 1: Deepen the Quest Gate Lifecycle Module (`src/state/`)

Consolidate all `char.questGate` and `state.questGates` mutations behind a single deep module seam in `src/state/quest-gate-handlers.ts`:

- **4-Signal Automatic Gate Settlement (With Consecutive-Turn & Same-Step Guards)**:
  1. **Explicit Resolution / Bypass**: `handleQuestGateResolved` settles `permission.resolved` and `question.resolved` (matching `gateId`, active `char.questGate.gateId`, or `sessionId` wildcard) and records both `gateId` and non-placeholder question `reason` in the settled sets so late sweeps cannot resurrect the gate. Generic placeholder strings (`"Awaiting user answer"`, `"Waiting for User Input"`, `"Question Prompt"`, `"Permission Request"`) are never recorded in `resolvedQuestionReasonsByState` so initial `status: "pending"` tool frames with empty `{}` input never blacklist subsequent `question` tool calls.
  2. **Session Progress Transitions**: Whenever a character with an open `char.questGate` starts a non-question tool (`handleToolStarted`) or receives a `message.user.prompt` (`handleMessageUserPrompt`, even when `alreadyProgressedTurn` is true), `settleCharacterQuestGate(state, char)` records the gate as settled and clears `char.questGate` and `state.questGates[gateId]`. On `handleSessionStatus` (`"thinking"` / `"working"`), an open structured `source: "form"` gate is **not** settled while a `question` tool is currently `"running"` (since OpenCode V2 emits `session.status: { type: "busy" }` and `session.step.streamed` while a `question` tool awaits user reply), and clearing a mid-stream `source: "conversational"` gate does not blacklist `lastAssistantText` before `session.idle`.
  3. **Completed `question` Tool Parts (Scoped to Active Gate)**: In `handleToolCompleted`, `mergeHydratedRecentTools`, `buildHydratedSessionEvents`, and `GET /api/guild/session/:id/messages`, a `question` gate is settled by `recentTools` **only** when no `question` tool is currently `"running"` and the completed record matches `callId === gateId` (or, for `source === "form"` with a non-call `gateId`, is the newest `question` tool started at or after the gate opened)—never merely because an earlier completed `question` tool from a previous turn exists in `recentTools`.
  4. **Superseded Conversational Turns**: In `handleSessionUpserted`, if `char.questGate?.source === "conversational"` and either `latestMsgRole === "user"` or `event.lastAssistantText` is non-empty and `detectConversationalQuestionPrompt(event.lastAssistantText)` is `null`, settle and clear the conversational gate without mutating or blacklisting any `"running"` `question` tool in `char.recentTools`.
- **Dependency Hygiene**: Import `detectConversationalQuestionPrompt` in `src/state/` from `../types/domain.ts` (never from `../ingress/daemon-message-hydration.ts`).

### 2.2 Candidate 2: Unify Daemon Ingress Gate Hydration & SSE Resolution (`src/ingress/`, `src/server/`)

- **SSE Resolution Mapping (`src/ingress/daemon-sse-mapper.ts`)**:
  - Map `permission.replied | permission.resolved | permission.rejected | permission.cancelled` to `permission.resolved`.
  - Map `form.replied | form.resolved | form.cancelled | form.rejected | question.replied | question.resolved | question.rejected | question.cancelled | question.dismissed` to `question.resolved`.
  - Extract `gateId` from `formObj.gateId ?? formObj.formID ?? formObj.requestID ?? formObj.questionID ?? formObj.callID ?? formObj.id ?? props.gateId ?? props.formID ?? props.requestID ?? props.questionID ?? props.callID ?? props.id ?? ""` (falling back to `"question:${sessionId}"` when `sessionId` is present so session-scoped rejections are never dropped).
  - In `message.part.updated` for `part.type === "tool"`, look up `toolNameByCallId.get(callId)` when `part.tool` / `part.name` is omitted on completion frames, and record `rememberToolCallName(callId, toolName)` when present.
- **Hydration Field Preservation & Cache Invalidation (`src/ingress/daemon-message-hydration.ts`, `src/ingress/daemon-location-state.ts`)**:
  - Populate `fields: convQ.fields` on `PendingConvCandidate` inside `hydrateSessionMessages` so conversational option pills are preserved at hydration time.
  - In `fetchDaemonLocationState`, do not store a session in `idleMessageHydrationCache` if `msgHydration.pendingQuestion` is non-null, and evict/bypass `idleMessageHydrationCache` when reconciling a session that had a pending question.
- **Two-Way Post-Hydration Gate Reconciliation (`src/ingress/opencode-client-adapter.ts`, `src/server/api-router.ts`, `src/ingress/daemon-message-hydration.ts`, `src/ingress/daemon-location-state.ts`, `src/ingress/daemon-command-ops.ts`)**:
  - Prefer `part.callID ?? part.id` in `hydrateSessionMessages` (matching `daemon-sse-mapper.ts`) so SSE and HTTP message hydration produce identical `call_...` IDs for `question` tool parts.
  - Poll and resolve OpenCode V2's `/api/question` endpoint alongside `/api/form` so structured `que_...` question requests are discovered and answered across both endpoints.
  - Extract a shared helper `buildHydratedSessionEvents(hydrated, sessionId, locationDirectory, existingQuestionGateId, emitIdleOrGateRequest)` so that when `getSessionMessages` returns:
    - `pqDone` is true only if `pq.source !== "conversational"`, no `question` tool in `recentTools` is `"running"`, and the matching `callId === pq.gateId` (or the newest `question` tool when `pq.gateId` is not a `call_...` ID) is `"completed"`.
    - If `pq && !pqDone && lastRole !== "user"`, it emits `question.requested` (with `pq.fields`).
    - If `(!pq || pqDone || lastRole === "user")` and `existingChar?.questGate?.kind === "question"`, it emits `question.resolved` for `existingChar.questGate.gateId`, immediately clearing any gate that was answered in OpenCode TUI/CLI/web.

### 2.3 Candidate 3: Character Sheet Collapse (`▾`/`▸`), Quiet Bypass (`✕`), and Unlocked Command Scroll (`src/hud/`, `src/web/`, `src/server/`, `src/ingress/`)

- **View-Model Field Normalization (`src/hud/character-sheet-vm.ts`)**:
  - Normalize `pendingQuestGate.fields` inside `buildCharacterSheetViewModel` (using `normalizeQuestGateFields` and `detectConversationalQuestionPrompt` fallback for conversational gates) so `PendingQuestGateViewModel` always carries ready-to-render `fields`.
- **Collapsible Quest Gate Card (`src/web/quest-gate-card.ts`, `src/web/client-state.ts`, `src/web/styles-components.css`)**:
  - Add `collapsedGateIds: Set<string>` to `clientState`.
  - Render a header action cluster on every `.gate-card-question` and `.gate-card-permission` containing:
    - A `Collapse ▾` / `Expand ▸` toggle button (`data-gate-collapse-toggle="<gateId>"`, `aria-expanded="true|false"`).
    - A `Bypass ✕` button (`data-gate-bypass="<gateId>"`).
  - When collapsed (`clientState.collapsedGateIds.has(gateId)`), add `.is-collapsed` to `.gate-card`, hiding `.gate-card-body` and showing a compact single-line summary bar (`[?] Question Pending — <summary> [Expand ▸] [Bypass ✕]`) while keeping the 2D canvas `[?]` / `[!]` marker intact.
- **Quiet Bypass (`decision: "dismiss"`) (`src/types/command-types.ts`, `src/server/command-router.ts`, `src/ingress/daemon-command-ops.ts`, `src/web/quest-gate-card.ts`)**:
  - Extend `gate.resolve` decision union with `"dismiss"`: `decision: "once" | "always" | "reject" | "answer" | "dismiss"`.
  - When `decision === "dismiss"`:
    - Client immediately calls `markClientGateResolved(sessionId, gateId, promptText)` and dispatches `gate.resolve` with `decision: "dismiss"`.
    - `daemon-command-ops.ts` (`executeDaemonCommand`):
      - For `conversational` gates: no-op on daemon HTTP (never sends a fake user chat prompt!).
      - For `form` / `permission` gates: attempts a non-blocking `POST /api/session/:id/form/:gateId/reject` (or `/cancel` / `/permission/:gateId/reply` with `reject`), ignoring 404/409/400 errors so local dismissal always succeeds cleanly.
    - `command-router.ts` (`handleGuildCommandRoute`): dispatches `question.resolved` / `permission.resolved` and `session.idle` without dispatching a synthetic `message.user.prompt`.
- **Unlocked Command Scroll & Implicit Bypass (`src/web/command-scroll-controller.ts`)**:
  - Remove the `.is-gate-hidden` lockout when `hasGate` is true so `.command-scroll-card` remains visible directly below `.gate-card`.
  - When the operator sends a prompt from `#command-scroll-input` while `sheet.pendingQuestGate` is non-null, automatically call `markClientGateResolved` for the active gate (and let the `scroll.send` prompt settle the gate on the server via `handleMessageUserPrompt`).

---

## 3. Acceptance Criteria & Verification

1. **External OpenCode Answer Auto-Sync**:
   - Answering a `question` tool or conversational prompt in OpenCode (simulated via SSE `session.status: "working"`, `tool.completed`, `question.replied` with `requestID`, or message hydration where `question` tool is `completed`) immediately removes `char.questGate`, clears `sheet.pendingQuestGate`, and transitions the character out of `BlockedAtQuestGate`.
2. **Collapse & Expand Toggle**:
   - Clicking `Collapse ▾` on a **Quest Gate** card collapses its body into a 1-line bar and persists across background SSE ticks; clicking `Expand ▸` restores the full question fields and option chips.
3. **Quiet Bypass (`Bypass ✕`)**:
   - Clicking `Bypass ✕` immediately removes the **Quest Gate** in both UI and server snapshot, suppresses resurrection on subsequent sweeps, and does not append any fake user message to the chat transcript.
4. **Co-existing Command Scroll**:
   - While a **Quest Gate** is open (expanded or collapsed), the **Command Scroll** trigger bar / composer remains visible and usable below it; sending a **Command Scroll** message settles the active **Quest Gate** automatically.
5. **Architecture Invariants**:
   - Every file under `src/` stays strictly `<= 400` lines (`tests/00-architecture-invariants.test.ts`).
   - Deployed and visually verified on the live `opencode-pixel-guild-visualizer` Docker container (`port 4310`), captured in `docs/images/quest-gate-sync-and-bypass.png`.

