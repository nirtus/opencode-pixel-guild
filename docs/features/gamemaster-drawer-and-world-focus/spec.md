# Specification: 50% Gamemaster Spectator Drawer, Unclipped Hero Chat, On-Demand Command Scroll & World Focus Aura

Label: ready-for-agent
Status: resolved

## Problem Statement

1. **Missing Overhead Question Mark (`?`) on Conversational & Long Questions**:
   - When an OpenCode assistant outputs an analysis followed by conversational/grilling questions (`❓ **Q1** ...` or a trailing question) and finishes its turn to wait for user input, the character on the **Guild Floorplan** frequently fails to display the `?` **Quest Gate** marker above its head and instead sits in the **Break Lounge** as `Resting`.
   - Root causes across the ingress and state seams:
     - `daemon-sse-mapper.ts` (`lines 139–144, 323–326, 338–340`) slices `lastAssistantText` at `text.slice(0, 4000)` and never calls `detectConversationalQuestionPrompt()`. Whenever an assistant response exceeds 4,000 characters before asking `❓ **Q1**`, the question at the end is chopped off before `handleSessionIdle` inspects `char.lastAssistantText`.
     - `daemon-location-state.ts` (`lines 48–57, 256–276`) caches idle session hydration in `idleMessageHydrationCache` keyed only by `s.time?.updated` (ignoring `s.time?.idle` / `s.time?.busy`), while `daemon-http-client.ts` caches `/api/session` for 6 seconds. Right after a turn finishes, `/api/session/active` returns `[]` (`isIdle = true`), while `/api/session` returns the stale pre-completion `time.updated`, hitting the stale cache entry (`pendingQuestion: null`) and skipping `hydrateSessionMessages()`. Worse, if `hydrateSessionMessages()` returns `null` on a timeout, `effectiveHydration = {}` permanently poisons `idleMessageHydrationCache`.
     - `daemon-message-hydration.ts` (`line 201`), `daemon-location-state.ts` (`line 297`), and `batch-reconciler.ts` (`line 126`) enforce an arbitrary 10-minute (`600,000 ms`) cutoff that deletes unanswered conversational **Quest Gate**s while the operator is still reading and answering the questions.
     - `handleStreamReconnected` (`batch-reconciler.ts:303-312, 372-379`), `handleSessionUpserted` (`session-handlers.ts:218-235`), `handleSessionStatus("idle")` (`session-handlers.ts:310-319`), and `GET /api/guild/session/:id/messages` (`api-router.ts:193-212`) either wipe out SSE-opened conversational `questGate`s or ignore `hydrated.pendingQuestion` / `detectConversationalQuestionPrompt(char.lastAssistantText)`.
     - `station-and-workflow-routing.ts` (`line 171`) checks `if (!isActivelyWorking || c.lifecycleState === "RestingInLounge" || c.lifecycleState === "Archived")` and forces `questMarker: null` even if `c.questGate` is present.

2. **Hero Chat & `Quest Gate` Questions Cut Off Text**:
   - `detectConversationalQuestionPrompt()` (`daemon-message-hydration.ts:37-52`) inspects only a single line (`grillingLine ?? lastLine`) and slices `reason` at `.slice(0, 200)`, discarding multi-paragraph question context and choices.
   - `renderQuestGateCardHtml()` (`src/web/quest-gate-card.ts:77-105`) only renders `opt.label` and **completely discards `opt.description`** on question options, while duplicating `firstQ.question` in both `.gate-prompt-text` and `.gate-field-question`.
   - `buildAdventurerDispatchLogViewModel()` (`src/hud/chat-markdown-formatter.ts:45-61, 341-374`) auto-slices every message over 550 chars or 10 lines down to **273–420 chars** (`182–280` chars for older turns) behind `Show full message ▾`—including the active turn asking a question. Furthermore, live SSE turns use `messageId: "a:${sessionId}:live"`, which changes to the real `msg_...` ID on the next HTTP poll, resetting `expandedChatMessageIds` and collapsing the message back to 420 chars.
   - In the **Guild Master Ledger**, `.roster-row-reason` (`styles-components.css:276`) truncates open gate reasons with `white-space: nowrap; text-overflow: ellipsis`.

3. **Top-Bar `Worlds:` Buttons (`#room-filter-buttons`) Lack Visual Character Focus & Top-Bar Utility Buttons Waste Space**:
   - Clicking a world button in `#room-filter-buttons` sets `clientState.selectedProjectId`, which updates `getActiveRoom()` (changing the **Goal Assembly Site** and **Dungeon Wilds**), **but `getVisibleProjectCharacters()` and `drawCharacterHero()` (`canvas-hero-painter.ts`) completely ignore `selectedProjectId`**. Characters on the canvas look identical whether a world is clicked or not, `heraldry.auraHex` (`project-heraldry.ts:250`) is unused, and the **Guild Master Ledger** displays host-wide `Active Characters` alongside single-project `Tokens`/`Cost`.
   - Meanwhile, the top bar's right-side utility controls (`👤 username`, `🔄 Refresh Live`, `Roster: Active Squads`, `Style: Clean Cartoon`) render long text labels that crowd the machine switcher strip.

4. **Narrow 40% Gamemaster `Spectator Drawer`, Excessive Stacked Chrome Rows & Always-Visible `Command Scroll` Composer**:
   - `.main-stage` (`src/web/styles.css:193`) restricts the right-hand **Spectator Drawer** to `40%` width (`minmax(0, 6fr) minmax(0, 4fr)`).
   - Inside the drawer, 6 stacked rows (`.drawer-chrome` tab bar + multi-line `.sheet-header-bar`/`.ledger-header-bar` + `.subtab-deck-bar` + static empty cards + `Quest Gate` card + 4-row `Command Scroll Composer`) consume 360px–680px of vertical height, crushing the dynamic chat or roster viewport to a tiny strip.
   - The **Command Scroll** composer (`command-scroll-controller.ts:111-132`) is always expanded (taking ~165px) even when the operator is only reading chat or answering a **Quest Gate** form, and `General` renders a `🧙‍♂️ Roster` subtab that is 100% identical to the roster in `🏰 Overview`, plus static cards when `0` **Bug Monster**s, `0` tasks, or `0` modified Git files exist.

## Solution

1. **Authoritative Conversational & Tool `Quest Gate` Lifecycle (`?` Overhead Question Mark)**:
   - Raise SSE `lastAssistantText` capture in `daemon-sse-mapper.ts` from `4,000` to `16,000` characters, handle `session.message.content.updated`, and preserve the tail of long assistant messages so trailing questions (`❓ **Q1**` or `?`) are never sliced off.
   - Fix `idleMessageHydrationCache` in `daemon-location-state.ts` to include `s.time?.idle` and `s.time?.busy` in `resolveSessionActivityMs()`, never cache failed (`null`) hydrations, and ensure any session that just transitioned from active to idle forces a fresh `/api/session/{id}/message` hydration.
   - Remove the premature 10-minute (`600,000 ms`) conversational question deletion across `daemon-message-hydration.ts`, `daemon-location-state.ts`, and `batch-reconciler.ts`: an unanswered conversational or tool **Quest Gate** on an open (non-archived) session remains in `BlockedAtQuestGate` with its `?` overhead marker until the user sends a reply prompt or archives/deletes the session.
   - Ensure `handleStreamReconnected`, `handleSessionUpserted`, `handleSessionStatus("idle")`, and `GET /api/guild/session/:id/messages` all reconcile `hydrated.pendingQuestion` and `detectConversationalQuestionPrompt(char.lastAssistantText)` into `BlockedAtQuestGate`, and ensure `station-and-workflow-routing.ts` checks `isWaitingAtGate` *before* the `RestingInLounge` branch so a character with an active **Quest Gate** always stands at its station with `questMarker: "?" | "!"`.

2. **Unclipped Hero Chat & Full-Information `Quest Gate` Cards**:
   - Expand `detectConversationalQuestionPrompt()` (`daemon-message-hydration.ts`) to extract the full multi-line question block (all `❓` question paragraphs or trailing question paragraphs up to `2,500` characters) instead of a single 200-char line, and stop falling back to the 80-char `formatInputPreview()` for `question` tool calls.
   - Update `renderQuestGateCardHtml()` (`quest-gate-card.ts`) to render each option's `label` **and** `description`, eliminate duplicate rendering of `firstQ.question`, and allow multi-line wrapping on Ledger `Open Quest Gates` alert rows (`styles-components.css`).
   - Update `buildAdventurerDispatchLogViewModel()` (`chat-markdown-formatter.ts`) so the latest 2 turns (and any turn while a **Quest Gate** is open) **never auto-truncate**, raise the historical turn compaction threshold to `2,500` chars, and use a stable turn key so SSE `:live` to HTTP poll hydration never resets user-expanded messages.
   - Make `💬 Chat` the default Hero subtab (`client-state.ts`) and automatically switch to `Hero -> Chat` whenever selecting a character with an open **Quest Gate**.

3. **Top-Bar `Worlds:` Focus Lens (`World Focus Aura`) & Compact Top-Bar Utility Controls**:
   - Add an explicit `🌐 All Worlds` pill in `#room-filter-buttons` (`selectedProjectId === null`) and make clicking an active project pill toggle focus off back to `All Worlds`.
   - When a project world is focused (`selectedProjectId !== null`), `drawCharacterHero()` (`canvas-hero-painter.ts`) renders an energized underfoot **World Focus Aura** ground ring (`heraldry.auraHex` + `accentHex` pedestal ring beneath the character's feet, with no redundant circle above the head) on every character belonging to that project, while visually separating characters from other projects at `45%` opacity (`globalAlpha = 0.45`) inside the shared **Workshop Room** (preserving **ADR-0001** co-habitation and visible **Quest Gate** markers).
   - Synchronize the **Guild Master Ledger** telemetry counters (`Active Characters`, `Tokens`, `Cost`) and roster ordering (floating focused-world characters first) with `selectedProjectId`.
   - Compact the top-bar right-hand utility controls (`👤 User`, `🔄 Refresh`, `👥 Roster`, `🎨 Style`) into compact icon-first buttons or a compact view/settings pill group so they take minimal horizontal width.

4. **50% Desktop `Spectator Drawer`, Single-Row Navigation, Situational Cards & On-Demand `Command Scroll` Composer**:
   - Change `.main-stage` (`styles.css:193`) on desktop (`> 960px`) from `6fr : 4fr` to `minmax(0, 1fr) minmax(0, 1fr)` (**50% World : 50% `Spectator Drawer`**) and update the camera viewport fallback in `pointer-and-camera.ts` to `0.5`.
   - Merge `.drawer-chrome` and `.subtab-deck-bar` into a **single unified navigation header row** (~36px tall) and compact the Hero identity strip (`[🛡️ TAG] Title · Role · Verb · Mana%`) and Ledger telemetry strip (`👥 Active · 🏰 Worlds · 🪙 Tokens · 💰 Cost`) into single-line bars.
   - Remove the duplicate `🧙‍♂️ Roster` subtab from `General` (since `🏰 Overview` directly renders the full-height live Roster) and remove the duplicate `✨ Summon` button from `.ledger-header-bar`.
   - Render situational cards **only when active**:
     - Hide the **Dungeon Wilds** card in `General -> Overview` when `bugs.length === 0`.
     - Hide the **Goal Assembly Site** summary card in `General -> Overview` when `totalTasks === 0`.
     - Hide the **Squad Subagent** lineage card in `Hero -> Details` when `childSubagents.length === 0`.
     - Hide the Commit Form dock in `General -> Assembly & Commit` when `files.length === 0`, and collapse it to a compact `🚀 Prepare Commit (N files)...` trigger bar until clicked.
   - Turn the **Command Scroll** composer (`command-scroll-controller.ts`) into an **on-demand collapsible bar**:
     - When a **Quest Gate** (`!` or `?`) is open on the selected character, hide the **Command Scroll** composer completely so the **Quest Gate** card is the sole bottom interactive dock.
     - Otherwise on `Hero -> Chat`, render a compact 36px trigger bar (`📜 Compose Command Scroll... [Click or press /]`) that expands into the full composer (textarea, `@skill` chips, `Steer`/`Queue`/`Stop` controls) when clicked or when `/` is pressed, and collapses back after sending or pressing `Esc`.

5. **Prune Dead `src/scene/` Painters & Duplicate `client-state.ts` Aliases**:
   - Consolidate duplicate state aliases and dead pagination counters in `src/web/client-state.ts` and prune unused parallel canvas painter files in `src/scene/canvas-paint-*.ts` while keeping every source file `<= 400` lines.

## User Stories

1. As a **Guild Operator**, when an OpenCode session asks me a conversational or `question`-tool question (including after a long 5,000+ character architectural explanation), I want the character on the **Guild Floorplan** to immediately display a pulsing `?` **Quest Gate** marker above its head and remain in `BlockedAtQuestGate` until I reply, so I never miss that a character is waiting for my answer.
2. As a **Guild Operator**, I want the **Character Sheet** (`Hero -> Chat`) and **Quest Gate** card to display the complete, unclipped text of questions, assistant explanations, and every question option's `label` and `description` without cutting off at 80, 200, or 420 characters, so I have full information before answering.
3. As a **Guild Operator**, when I click a character on the canvas or in the **Guild Master Ledger**, I want the **Character Sheet** to open directly on the `💬 Chat` view with the latest messages fully expanded and stable across live SSE and HTTP poll updates.
4. As a **Guild Operator**, when I click a project button in the top `Worlds:` row, I want all characters belonging to that project to be highlighted by a project-colored **World Focus Aura** ground ring beneath their feet (without a duplicate circle above their heads) while characters from other projects dim to `45%` opacity in the shared **Workshop Room**, and clicking the active world button again (or clicking `🌐 All Worlds`) to restore equal focus.
5. As a **Guild Operator**, I want the top-bar utility controls (`User`, `Refresh Live`, `Roster`, `Style`) to use compact icon buttons / pills so the top header remains clean and uncluttered.
6. As a **Guild Operator** on desktop, I want the right-hand Gamemaster **Spectator Drawer** to occupy **50% of the screen width** (`1fr : 1fr`) with a single unified navigation row and single-line vitals bar, so dynamic chat, code blocks, and rosters have maximum horizontal and vertical space.
7. As a **Guild Operator**, I want the **Command Scroll** composer to stay collapsed as a compact single-line trigger bar (and hidden while a **Quest Gate** card is active) until I click it or press `/` to send a command, so it does not permanently steal 175px of screen height.
8. As a **Guild Operator**, I want situational cards in the **Spectator Drawer** (**Dungeon Wilds** threats, **Goal Assembly Site** tasks, **Squad Subagent** lineage, and the **Assembly Commit Ledger** commit form) to appear only when relevant data exists, eliminating empty placeholder rows and the duplicate `Roster` subtab.

## Implementation Decisions

1. **Authoritative Question Gate Detection & Persistence Seam (`src/ingress/` & `src/state/`)**:
   - In `src/ingress/daemon-message-hydration.ts`, update `detectConversationalQuestionPrompt(text)` to match `❓` markers (even when preceded by markdown headings, bold tags, or list numbers) or trailing `?` prompts across the full assistant text, returning up to `2,500` characters of the multi-line question section instead of `.slice(0, 200)`.
   - In `src/ingress/daemon-sse-mapper.ts`, increase `lastAssistantText` retention to `16,000` characters (keeping the tail when text exceeds 16,000 chars so end-of-message questions are preserved) and support `session.message.content.updated`.
   - In `src/ingress/daemon-location-state.ts`, include `s.time?.idle` and `s.time?.busy` in `resolveSessionActivityMs(s)`, do not cache `null` hydrations in `idleMessageHydrationCache`, and remove the 10-minute `isStaleConversationalTurn` / `TEN_MINUTES_MS` suppression on unanswered questions for open sessions.
   - In `src/state/batch-reconciler.ts`, `src/state/session-handlers.ts`, and `src/server/api-router.ts`, ensure `handleStreamReconnected`, `handleSessionUpserted`, `handleSessionStatus`, and `GET /api/guild/session/:id/messages` preserve or open a conversational `QuestGate` whenever the latest turn of an idle, non-archived session contains an unanswered question prompt (i.e. no newer user prompt after the assistant question), and remove the 10-minute conversational gate auto-expiry in `handleTimerTick`.
   - In `src/web/station-and-workflow-routing.ts`, evaluate `isWaitingAtGate` before the `RestingInLounge` fallback so any character with an open `questGate` routes to its active station (or `ArcaneLectern` / `StudyBookshelf`) with `questMarker: "?" | "!"`.

2. **Full-Fidelity Chat & `Quest Gate` View-Model Seam (`src/hud/` & `src/web/`)**:
   - In `src/hud/chat-markdown-formatter.ts`, never auto-compact the last 2 turns in `buildAdventurerDispatchLogViewModel()`, increase the compaction threshold for older turns to `2,500` chars (`previewLimit = 1,200`), and normalize turn IDs (`turn-${turnIndex}-${role}`) so SSE `:live` messages and hydrated HTTP messages share a stable expansion key.
   - In `src/web/quest-gate-card.ts`, render `<span class="gate-option-desc">${escapeHtml(opt.description)}</span>` inside each option pill whenever `opt.description` is present, and suppress the duplicate `.gate-prompt-text` when `fields[0]?.question === gate.prompt`.
   - Default `currentHeroSubtab` in `src/web/client-state.ts` to `"chat"`, and when clicking a character with an active `questGate` (on canvas or in the Ledger), set `heroSubtab = "chat"`.

3. **`World Focus Aura` & Top-Bar Compaction Seam (`src/spatial/`, `src/hud/`, `src/web/`)**:
   - Export a pure helper `resolveCharacterWorldFocus(char, snapshot, selectedProjectId)` in `src/spatial/project-heraldry.ts` returning `{ isWorldFocused: boolean; isFocusedMember: boolean; isDimmed: boolean; heraldry: ProjectHeraldryDescriptor }`.
   - In `src/web/top-bar-reconciler.ts`, prepend a `🌐 All Worlds` button to `#room-filter-buttons` (active when `selectedProjectId === null`), toggle `selectedProjectId` back to `null` when clicking an already-selected project pill, and compact `#btn-open-account-modal`, `#btn-refresh-live`, `#btn-toggle-lineage`, and `#btn-toggle-style` into concise icon-first pills with descriptive tooltips.
   - In `src/web/canvas-hero-painter.ts`, when `isWorldFocused && isFocusedMember`, paint an energized **World Focus Aura** ground ring beneath the character's feet (using `heraldry.auraHex` and `heraldry.accentHex`, without an overhead halo circle above the head); when `isWorldFocused && isDimmed`, apply `c.globalAlpha = 0.45` to visually separate non-focused projects while keeping their sprites and any `questMarker` legible.

4. **50% Desktop `Spectator Drawer`, Unified Header & Situational Action Dock (`src/web/`)**:
   - Set `.main-stage` in `src/web/styles.css` to `grid-template-columns: minmax(0, 1fr) minmax(0, 1fr)` on desktop and update `pointer-and-camera.ts` fallback width to `0.5`.
   - Render a unified single-row drawer navigation header combining `General` (`Overview`, `Assembly & Commit`), `Hero` (`Chat`, `Details`, `Gear`, `Tools`), and `Ticker`.
   - Add `isCommandScrollExpanded: boolean` (default `false`) to `clientState`. In `src/web/command-scroll-controller.ts`, hide the **Command Scroll** composer completely when `sheet.pendingQuestGate` is non-null; otherwise render a compact 36px trigger bar when `isCommandScrollExpanded === false`, expanding on click or `/` keydown and collapsing on `Esc` or successful prompt dispatch.
   - Omit empty situational cards (`0` bugs in Wilds, `0` tasks in Assembly summary, `0` child subagents in Hero Details, `0` modified files in Commit dock) and remove the duplicate `Roster` subtab and duplicate Ledger `Summon` button.

## Testing Decisions

- **Primary Testing Seams**:
  1. **Conversational & Tool Question Gate Seam**: Verify that long (>5,000 char) assistant turns ending with `❓ **Q1**` or a conversational question open a `?` **Quest Gate**, survive 15-second `stream.reconnected` sweeps and >10-minute idle ticks without disappearing, and route the character on canvas with `questMarker: "?"`.
  2. **Unclipped Chat & Quest Gate Option Description Seam**: Verify that `buildAdventurerDispatchLogViewModel` does not truncate recent/active turns at 420 chars, preserves expansion state across SSE-to-poll hydration, and `renderQuestGateCardHtml` renders full multi-line prompts and `opt.description` text without duplicating `firstQ.question`.
  3. **World Focus Aura & Spatial Projection Seam**: Verify that `resolveCharacterWorldFocus` and `drawCharacterHero` render the underfoot **World Focus Aura** ground ring (`heraldry.auraHex`) for characters in `selectedProjectId` (without an overhead halo), dim sibling projects to `0.45` alpha while keeping them in the unified **Workshop Room**, and toggle back to `All Worlds` (`selectedProjectId = null`).
  4. **50% Spectator Drawer & Situational Action Dock Seam**: Verify the `1fr : 1fr` desktop split, single-row navigation header, `Chat` as default Hero subtab, collapsed-by-default **Command Scroll** trigger bar, mutual exclusion with active **Quest Gate** cards, and omission of empty situational cards.

## Out of Scope

- Isolating projects into separate rooms that hide sibling projects' characters (forbidden by [ADR-0001](../../adr/0001-unified-host-workshop-room-and-project-heraldry.md)).
