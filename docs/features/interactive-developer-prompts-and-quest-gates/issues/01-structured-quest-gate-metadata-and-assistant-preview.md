# 01: Structured Quest Gate Metadata & Assistant Reply Preview

Type: grilling
Label: wayfinder:grilling
Status: resolved

## Question

How should Quest Gate metadata (`QuestGateState`, `QuestGateQuestionField`, `source: "permission" | "form" | "conversational"`) and the latest assistant reply preview (`lastAssistantText`) be modeled, hydrated from the OpenCode V2 daemon and SSE stream, and reduced into `CharacterState` without exceeding the 400-line ceiling on `src/types/core-types.ts`, `src/ingress/daemon-message-hydration.ts`, or `src/state/tool-and-gate-handlers.ts`?

## Specification

### 1. Domain Types (`src/types/command-types.ts` & `src/types/core-types.ts`)
- Create `src/types/command-types.ts` (re-exported from `src/types/domain.ts`) to keep `src/types/core-types.ts` well under 400 lines.
- Define structured question field metadata:
  ```ts
  export type QuestGateSource = "permission" | "form" | "conversational";

  export interface QuestGateOptionItem {
    readonly label: string;
    readonly description?: string;
    readonly value?: string;
  }

  export interface QuestGateQuestionField {
    readonly key: string; // e.g. "q0".."qN" or explicit form field key
    readonly header?: string;
    readonly question: string;
    readonly options?: readonly QuestGateOptionItem[];
    readonly multiple?: boolean;
    readonly required?: boolean;
  }
  ```
- Extend `QuestGateState` in `src/types/core-types.ts`:
  - `source?: QuestGateSource` (`"permission"` for `/api/permission/request` and `permission.requested`; `"form"` for `/api/form`, `form.asked`, `question.requested`, and `question` tool calls; `"conversational"` for assistant turns ending with `❓` or trailing `?`).
  - `fields?: readonly QuestGateQuestionField[]` (populated with indexed keys `"q0".."qN"` for `question` tool `input.questions` arrays and `/api/form` `fields` arrays).
  - `action?: string` and `resources?: readonly string[]` (for permission gates).
- Extend `CharacterState` in `src/types/core-types.ts` with `lastAssistantText?: string | null` (most recent non-empty assistant text block, truncated to 600 chars for the Character Sheet preview card).

### 2. Ingress Hydration (`src/ingress/daemon-message-hydration.ts` & `src/ingress/daemon-location-state.ts`)
- Extract question/assistant-text parsing helpers into a dedicated helper or keep `src/ingress/daemon-message-hydration.ts` under 400 lines by delegating structured question field normalization.
- When a `question` tool call (`status: "running" | "pending"`) is detected in `hydrateSessionMessages`:
  - Map `rawInput.questions` (array of `{ header?, question, options?: Array<{ label, description?, value? }>, multiple? }`) into `fields: QuestGateQuestionField[]` with deterministic keys `"q0"`, `"q1"`, ..., `"qN"`.
  - Set `source: "form"`.
- When a conversational question (`❓` grilling line or trailing `?`) is detected on the latest assistant message (with no running tool):
  - Set `source: "conversational"` and `fields: []`.
- Extract `lastAssistantText?: string | null` from the most recent assistant message containing text parts in `hydrateSessionMessages`, and pass it through `OpenCodeDaemonLocationPayload["sessions"]` and `LocationReconciliationSnapshot["sessions"]` into `session.upserted` / `stream.reconnected`.
- In `src/ingress/daemon-location-state.ts` and `src/ingress/daemon-http-client.ts`:
  - Populate `source: "permission"`, `action`, and `resources` on `pendingPermissions` and `permission.requested` SSE frames.
  - Populate `source: "form"` and normalized `fields: QuestGateQuestionField[]` (defaulting `key` to `fld.key ?? "q" + idx`) on `/api/form` and `form.asked` / `question.requested` SSE frames.

### 3. Reducer Decomposition (`src/state/quest-gate-handlers.ts`)
- Extract `handleQuestGateOpened`, `handleQuestGateResolved`, and `buildQuestionToolQuestGate` from `src/state/tool-and-gate-handlers.ts` into a dedicated `src/state/quest-gate-handlers.ts` module (~160 lines), bringing `src/state/tool-and-gate-handlers.ts` from 396 lines down to ~275 lines.
- Preserve `source`, `fields`, `action`, and `resources` on `QuestGateState` across `handleToolStarted`, `handleQuestGateOpened`, and `handleStreamReconnected`.
- Store `lastAssistantText` on `CharacterState` during `handleSessionUpserted`, `handleSessionIdle` (`event.summary`), and `handleStreamReconnected`.

## Answer

Settled in Q1 & Q2 of the design phase:
1. `QuestGateState` carries `source: "permission" | "form" | "conversational"` and `fields: readonly QuestGateQuestionField[]` with deterministic `"q0".."qN"` keys, `options`, and `multiple` flags so the Character Sheet can render interactive option chips, multi-select checkboxes, or free-text inputs and submit exact keyed answers.
2. `CharacterState` carries `lastAssistantText?: string | null` hydrated from the latest assistant turn so developers can read the agent's latest reply or question directly in the Character Sheet without leaving the visualizer.
3. Quest gate reducer handlers are extracted into `src/state/quest-gate-handlers.ts` to keep every file in `src/state/` strictly under the 400-line ceiling.
