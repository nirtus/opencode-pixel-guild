# 03: Focus-Safe Command Scroll Composer & Interactive Quest Gate Cards

Type: prototype
Label: wayfinder:prototype
Status: resolved
Blocked by: 01, 02

## Question

How should the Character Sheet in the Spectator Sidebar render the interactive **Send Scroll (Prompt Composer)**, **Interrupt Turn** button, **Latest Assistant Reply** preview, and **Quest Gate Resolution Cards** (`! Permission` and `? Question`) so that 60fps SSE updates never destroy `<textarea>` focus, cursor selection, or unsent draft text?

## Specification

### 1. Character Sheet View-Model Extensions (`src/hud/hud-character-types.ts` & `src/hud/character-sheet-vm.ts`)
- Extend `PendingQuestGateViewModel` with:
  - `source: "permission" | "form" | "conversational"`
  - `fields: readonly QuestGateQuestionField[]`
  - `action?: string`
  - `resources?: readonly string[]`
- Extend `CharacterSheetViewModel` with:
  - `lastAssistantText: string | null`
  - `commandScroll: CharacterCommandScrollViewModel`:
    ```ts
    export interface CharacterCommandScrollViewModel {
      readonly endpoint: "/api/guild/command";
      readonly sessionId: string;
      readonly locationDirectory: string;
      readonly isBusy: boolean;
      readonly canInterrupt: boolean;
      readonly defaultDelivery: "steer" | "queue";
      readonly placeholder: string;
      readonly availableSkillIds: readonly string[];
    }
    ```

### 2. Two-Slot Focus-Safe DOM Reconciliation (`src/web/side-panel-reconciler.ts` & `src/web/command-scroll-controller.ts`)
- Partition `#character-sheet` into two persistent child containers when viewing a character:
  1. `#sheet-interactive-slot`: Mounted once per `(selectedSessionId, pendingQuestGate?.gateId ?? "none", isBusy)` signature by `src/web/command-scroll-controller.ts`.
     - Holds the **Quest Gate Resolution Card** (when `sheet.pendingQuestGate` is non-null):
       - **Permission Gate (`kind === "permission"`)**: Shows `title`, `reason`, `resources`, and three action buttons: **✅ Allow Once** (`decision: "once"`), **🛡️ Always Allow** (`decision: "always"`), and **🚫 Reject** (`decision: "reject"`).
       - **Question / Form Gate (`kind === "question"`)**: Renders each `field` in `pendingQuestGate.fields` with clickable option chips (`radio` or `checkbox` when `field.multiple` is true) plus a custom answer input, or a conversational reply box when `fields` is empty, and a **📤 Submit Answer** button (`command: "gate.resolve"`).
     - Holds the **Command Scroll Composer** (`command: "scroll.send"`):
       - Persistent `<textarea id="command-scroll-input">` whose draft value is cached in `clientState.draftPromptsBySession.get(sessionId)` on every `input` event.
       - Clickable `@skill` quick-attach chips (from room catalog skills / equipped grimoires) that insert `@<skillId>` into the draft.
       - Delivery mode toggle when `sheet.commandScroll.isBusy` is true (`⚡ Steer` vs `📥 Queue`) and **📤 Send Scroll** submit button (`Ctrl+Enter` / `Cmd+Enter` shortcut).
       - **⏹️ Interrupt Turn** button (`command: "turn.interrupt"`) visible whenever `sheet.commandScroll.canInterrupt` is true (`Thinking`, `WorkingAtStation`, `Entering`).
  2. `#sheet-static-slot`: Updated by `src/web/side-panel-reconciler.ts` whenever telemetry changes (Latest Assistant Reply card, Armory Equipment Loadout, Inventory Skills/Plugins/Tool Belt, Session & Context Mana Details, Recent Tool & Shell Log, and Kill Character confirmation).
- Because `#sheet-interactive-slot` is never wiped when `#sheet-static-slot` re-renders on token/tool SSE ticks, `<textarea>` focus, cursor selection, and in-progress form selections remain 100% intact during live 60fps streaming.

## Answer

Settled in Q2 & Q3 of the design phase:
1. `#character-sheet` uses a two-slot DOM architecture (`#sheet-interactive-slot` + `#sheet-static-slot`).
2. `src/web/command-scroll-controller.ts` owns `#sheet-interactive-slot` and caches per-session drafts in `clientState.draftPromptsBySession`, guaranteeing zero focus loss or draft clobbering across 60fps SSE emissions.
3. `src/web/side-panel-reconciler.ts` drops from 331 lines to ~270 lines while adding the **Latest Assistant Reply** card (`sheet.lastAssistantText`) in `#sheet-static-slot`.
