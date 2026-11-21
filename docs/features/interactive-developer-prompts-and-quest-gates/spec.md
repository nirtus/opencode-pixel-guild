# Feature Specification: Interactive Developer Prompts, Quest Gate Resolution & Summon Adventurer (`interactive-developer-prompts-and-quest-gates`)

## 1. Overview

Transform the **OpenCode Pixel Guild Visualizer** from a passive spectator companion (with only destructive session/room delete actions) into a **full two-way interactive developer companion**. Developers can directly steer and unblock their AI coding agents from inside the RPG Workshop interface:

1. **Send Scroll (Interactive Prompt Composer)**: Send new prompts or follow-up instructions to any selected Adventurer or Squad Subagent (`POST /api/session/{sessionID}/prompt`), with `steer` vs `queue` delivery modes when busy and automatic `@skill` Grimoire attachment.
2. **Resolve Quest Gates (`!` Permission & `?` Question / Form / Conversational Gates)**:
   - Approve (`once` / `always`) or reject (`reject`) pending tool permissions (`POST /api/session/{sessionID}/permission/{requestID}/reply`).
   - Answer structured multi-question / multi-option form prompts (`POST /api/session/{sessionID}/form/{formID}/reply` or tool-question prompt reply) and conversational assistant questions (`❓` grilling / clarification prompts) with clickable option chips or custom text.
3. **Interrupt Active Turn**: Stop a runaway or misdirected turn (`POST /api/session/{sessionID}/interrupt`) and return the character to an idle/resting state.
4. **Summon New Adventurer**: Spawn a new root OpenCode session in any Project World / Workshop Room (`POST /api/session`) with an agent class (`build`, `plan`, `explore`, `general`), title, and optional opening prompt.
5. **Latest Assistant Reply Preview**: Inspect the character's latest assistant text message (`lastAssistantText`) directly inside the Character Sheet so conversational questions and status updates are readable in context.

All four interactive commands work seamlessly against **both** the **Live OpenCode V2 HTTP Daemon** and the **Demo Guild Simulator** via a single deep command seam (`POST /api/guild/command`).

---

## 2. Architecture & Design-It-Twice Synthesis

### 2.1 Single Deep Command Seam (`POST /api/guild/command`)
Rather than scattering REST routes across the server and browser, all non-destructive interactive developer mutations flow through a single discriminated-union command contract in `src/types/command-types.ts`:

```ts
export type QuestGateSource = "permission" | "form" | "conversational";

export interface QuestGateOptionItem {
  readonly label: string;
  readonly description?: string;
  readonly value?: string;
}

export interface QuestGateQuestionField {
  readonly key: string; // Deterministic "q0".."qN" or form field key
  readonly header?: string;
  readonly question: string;
  readonly options?: readonly QuestGateOptionItem[];
  readonly multiple?: boolean;
  readonly required?: boolean;
}

export type GuildCommandRequest =
  | {
      readonly command: "scroll.send";
      readonly sessionId: string;
      readonly directory?: string;
      readonly promptText: string;
      readonly delivery?: "steer" | "queue";
      readonly skills?: readonly string[];
      readonly agentClass?: string;
      readonly modelId?: string;
    }
  | {
      readonly command: "turn.interrupt";
      readonly sessionId: string;
      readonly directory?: string;
    }
  | {
      readonly command: "adventurer.summon";
      readonly directory: string;
      readonly title?: string;
      readonly agentClass?: string;
      readonly modelId?: string;
      readonly promptText?: string;
      readonly skills?: readonly string[];
    }
  | {
      readonly command: "gate.resolve";
      readonly sessionId: string;
      readonly gateId: string;
      readonly directory?: string;
      readonly kind: "permission" | "question";
      readonly source?: QuestGateSource;
      readonly decision?: "once" | "always" | "reject";
      readonly answers?: Readonly<Record<string, string | readonly string[]>>;
      readonly promptText?: string;
    };

export interface GuildCommandResult {
  readonly ok: boolean;
  readonly command: GuildCommandRequest["command"];
  readonly adapter: TelemetryAdapterKind;
  readonly sessionId: string | null;
  readonly gateId?: string | null;
  readonly error?: string;
  readonly delta: GuildDelta;
  readonly snapshot: GuildSnapshot;
}
```

### 2.2 OpenCode V2 HTTP Daemon Endpoint Mapping (`src/ingress/daemon-command-ops.ts`)
Every command normalizes the target `directory` with `toPosixMountPath(directory)` and sends both query parameter `?location[directory]=<encoded>` and header `x-opencode-directory: <daemonDir>`:

| `GuildCommandRequest["command"]` | OpenCode V2 HTTP Endpoint | Request Payload & Behavior |
| :--- | :--- | :--- |
| `scroll.send` | `POST /api/session/{sessionID}/prompt` | `{ text: promptText, parts: [{ type: "text", text: promptText }], skills, agent: agentClass, delivery: delivery ?? "steer" }`. Extracts `@skill` mentions and dispatches `message.user.prompt` to the reducer. |
| `turn.interrupt` | `POST /api/session/{sessionID}/interrupt` | `{}` POST body. Dispatches `session.idle` (and clears any active tool / gate) on the reducer. |
| `adventurer.summon` | `POST /api/session` (+ optional `POST /api/session/{id}/prompt`) | Creates the session with `{ title, agent: agentClass, model: modelId, directory }`. Dispatches `session.upserted` (and `message.user.prompt` if `promptText` is provided). |
| `gate.resolve` (`permission`) | `POST /api/session/{sessionID}/permission/{requestID}/reply` | `{ reply: decision ?? "once", decision: decision ?? "once" }`. Dispatches `permission.resolved` (or `session.idle` if rejected). |
| `gate.resolve` (`question` / `form`) | `POST /api/session/{sessionID}/form/{formID}/reply` with fallback to `POST /api/session/{sessionID}/prompt` | Sends `{ answers, data: answers }` to `/form/{formID}/reply` when `source === "form"`. If `source === "conversational"` or `/form` returns non-2xx (e.g. a `question` tool call awaiting user message reply), sends the formatted answer text to `POST /api/session/{sessionID}/prompt`. Dispatches `question.resolved` and `message.user.prompt`. |

### 2.3 Structured Quest Gate Metadata & Assistant Reply Preview
- `QuestGateState` in `src/types/core-types.ts` is enriched with:
  - `source?: QuestGateSource` (`"permission" | "form" | "conversational"`)
  - `fields?: readonly QuestGateQuestionField[]`
  - `action?: string`
  - `resources?: readonly string[]`
- `CharacterState` in `src/types/core-types.ts` is enriched with:
  - `lastAssistantText?: string | null` (hydrated from the latest assistant turn's text parts in `src/ingress/daemon-message-hydration.ts`, capped at 600 characters).
- In `src/ingress/daemon-message-hydration.ts`:
  - Running/pending `question` tool calls parse `input.questions` into `QuestGateQuestionField[]` with keys `"q0".."qN"`, `header`, `question`, `options`, and `multiple`.
  - Conversational questions (`❓` grilling lines or trailing `?` with no running tool) set `source: "conversational"` and `fields: []`.

### 2.4 Focus-Safe Two-Slot DOM Reconciliation (`src/web/command-scroll-controller.ts`)
Because the visualizer receives live SSE deltas and re-evaluates HUD state at up to 60fps, naive `container.innerHTML = ...` replacement inside `#character-sheet` would destroy `<textarea>` focus, cursor position, and in-progress form selections.
- `#character-sheet` is split into two child containers:
  1. **`#sheet-interactive-slot`**: Managed by `reconcileInteractiveCommandSlot` in `src/web/command-scroll-controller.ts`. It only re-mounts when the interactive key `(sessionId, pendingQuestGate?.gateId ?? "none")` changes. Status pills (`Busy — Steer / Queue` vs `Idle — Send Scroll`) and the `Interrupt Turn` button visibility are updated in place via DOM attribute/class toggles without touching `<textarea id="command-scroll-input">`. Per-session draft text is persisted in `clientState.draftPromptsBySession`.
  2. **`#sheet-static-slot`**: Managed by `src/web/side-panel-reconciler.ts`. Safely updates `innerHTML` whenever telemetry changes (Latest Assistant Reply card, Armory Equipment Loadout, Inventory Skills/Plugins/Tools, Session & Context Mana Details, Recent Tool & Shell Log, and Kill Character confirmation).

---

## 3. Strict `<= 400`-Line File Partitioning Plan

Every source file under `src/` must remain strictly `<= 400` lines (enforced by `tests/00-architecture-invariants.test.ts`):

| File Path | Responsibility | Target Line Count |
| :--- | :--- | :--- |
| `src/types/command-types.ts` *(new)* | `GuildCommandRequest`, `GuildCommandResult`, `QuestGateSource`, `QuestGateOptionItem`, `QuestGateQuestionField` | ~110 lines |
| `src/types/core-types.ts` | Core domain types, `QuestGateState` (with `source`, `fields`), `CharacterState` (with `lastAssistantText`) | ~355 lines |
| `src/ingress/daemon-command-ops.ts` *(new)* | Live OpenCode V2 HTTP execution for `scroll.send`, `turn.interrupt`, `adventurer.summon`, `gate.resolve` | ~220 lines |
| `src/ingress/daemon-message-hydration.ts` | Session message hydration, `lastAssistantText`, structured `question` tool `fields`, conversational questions | ~375 lines |
| `src/ingress/daemon-location-state.ts` | Location state hydration forwarding `fields`, `source`, and `lastAssistantText` | ~290 lines |
| `src/ingress/daemon-http-client.ts` | SSE mapping + `executeCommand` delegation to `daemon-command-ops.ts` | ~345 lines |
| `src/state/quest-gate-handlers.ts` *(new)* | Extracted `handleQuestGateOpened`, `handleQuestGateResolved`, and `buildQuestionToolQuestGate` | ~160 lines |
| `src/state/tool-and-gate-handlers.ts` | `handleToolStarted`, `handleToolCompleted`, `handleSkillActivated`, `handleMessageUserPrompt`, `handlePluginStatusUpdated` | ~285 lines |
| `src/state/session-handlers.ts` | Session upsert/status/idle handlers preserving `lastAssistantText` | ~390 lines |
| `src/state/batch-reconciler.ts` | Reconnect & batch reconciliation preserving `source`, `fields`, `lastAssistantText` | ~385 lines |
| `src/server/command-router.ts` *(new)* | `POST /api/guild/command` handler + optimistic reducer dispatch & simulator follow-up choreography | ~240 lines |
| `src/server/api-router.ts` | HTTP route dispatcher delegating `/api/guild/command` to `command-router.ts` | ~360 lines |
| `src/hud/hud-character-types.ts` | Character sheet & command scroll view-model interfaces | ~280 lines |
| `src/hud/character-sheet-vm.ts` | `buildCharacterSheetViewModel` populating `commandScroll`, `lastAssistantText`, and structured `pendingQuestGate` | ~285 lines |
| `src/web/command-scroll-controller.ts` *(new)* | Focus-safe `#sheet-interactive-slot` reconciler (Prompt Composer, `@skill` chips, Interrupt, Quest Gate cards) | ~290 lines |
| `src/web/summon-adventurer-controller.ts` *(new)* | `#summon-adventurer-modal` controller for spawning new root sessions | ~175 lines |
| `src/web/side-panel-reconciler.ts` | Two-slot `#character-sheet` reconciler (`#sheet-interactive-slot` + `#sheet-static-slot` with Latest Assistant Reply card) | ~295 lines |

---

## 4. Verification & Acceptance Criteria

1. **Architecture Invariant Guard**: `tests/00-architecture-invariants.test.ts` passes with every file in `src/` `<= 400` lines.
2. **Unit & Integration Tests**:
   - `hydrateSessionMessages` extracts `lastAssistantText`, structured `QuestGateQuestionField[]` (`q0..qN`) from running `question` tools, and `source: "conversational"` from assistant questions.
   - `POST /api/guild/command` handles `scroll.send` (with `@skill` extraction and `steer`/`queue`), `turn.interrupt`, `adventurer.summon`, and `gate.resolve` (`permission`, `form`, and `conversational`) across both a mock OpenCode V2 HTTP daemon and the Demo Guild Simulator.
   - `buildCharacterSheetViewModel` exposes `commandScroll`, `lastAssistantText`, and `pendingQuestGate.fields`.
   - Focus-safe DOM reconciliation preserves `<textarea>` focus and draft text across simulated SSE snapshot updates.
3. **Mandatory Live Visual Proof**:
   - Capture live headless Chrome screenshots (`docs/images/interactive-developer-prompts-and-quest-gates.png`) on port `4310` and inspect them via `read` to verify the Command Scroll composer, Quest Gate resolution cards, Latest Assistant Reply preview, and Summon Adventurer button/modal.
