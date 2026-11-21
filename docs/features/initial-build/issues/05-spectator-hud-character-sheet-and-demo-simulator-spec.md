# Spectator RPG Character Sheet HUD, OpenCode TUI Plugin Surface, and Demo Guild Simulator Spec

Type: prototype
Status: closed
Blocked by: 01, 03, 04

## Architectural Decisions Settled

- **Transport-Agnostic HUD Consuming Module `01`'s Snapshot Seam (`Q4: A`, `Q8: A`)**:
  - Connection and adapter switching live behind Module `01`'s telemetry ingress seam (`@opencode/plugin` Host Plugin adapter, standalone `@opencode/client` adapter, and `Demo Guild Simulator` adapter). The HUD module (`05`) consumes the unified snapshot + delta interface and triggers adapter or scenario selection without embedding transport hydration logic.
  - When the `@opencode/plugin/tui` adapter is active, `/guild` (`ctrl+g`) opens/focuses the web companion and `"home.footer.status"` / `"prompt.footer.status"` render a live Guild summary (`rooms · adventurers · quest gates`).
- **`Skill Grimoire` & `Plugin Alcove` Visibility in HUD & Simulator (`Q1: A`, `Q6: A`, `Q7: A`)**:
  - The `Character Sheet` displays the character's ordered `Skill Grimoire` stack (showing how each skill was activated: `skill` tool, `@skill-id` prompt attachment, or direct skill message) and current `Workstation` or `Plugin Alcove` target (including multi-alcove Code Mode `execute` targets).
  - The `Workshop Room` header displays badges for installed room plugins/MCP servers and their health status (`connected`, `needs_auth`, `failed`, `disabled`).

## Remaining Questions

Building on [Deep Capability, World-State Reducer, and Telemetry Ingress Seam](./01-event-stream-state-machine-and-bridge-seam.md), [Adaptive Workshop Room Floorplan, Arcane Lectern, Plugin Alcoves, and Spatial Pathfinding Prototype](./03-workstation-taxonomy-and-multi-room-floorplan-layout.md), and [Procedural Pixel Character Sprites, Skill Grimoires, Plugin Alcove Fixtures, and Visual Cues Prototype](./04-pixel-guild-character-sprites-and-visual-cues-prototype.md), how should the read-only spectator HUD (`Character Sheet`, `Workshop Room` header, live event ticker, `Demo Guild Simulator` control bar, and `@opencode/plugin/tui` status bar) frame the 2D canvas, and what goes into the final authoritative `spec.md` and playable prototype?

Specifically:
1. What exact fields and layout appear on the read-only `Character Sheet` when hovering or clicking a `Guild Adventurer` or `Squad Subagent` (session title, agent class emblem, model ID, equipped `Skill Grimoire` stack, `Context Mana` fill, token/USD cost counters, current `Workstation`/`Plugin Alcove` input preview, child subagent list, and pending `Quest Gate` reason) and on the `Plugin Alcove` inspection tooltip?
2. What preset scenarios should the `Demo Guild Simulator` adapter include so a user can showcase multi-session co-habitation in a `Workshop Room`, `Arcane Lectern` skill study + `Skill Grimoire` inheritance by `Squad Subagent`s, `Plugin Alcove` direct and Code Mode (`execute`) tool calls, MCP `needs_auth` / `failed` states, multi-worktree room creation, compactions, and `Quest Gate` blocks with one click?
3. How does the HUD control bar request an adapter switch (between live shared daemon telemetry and `Demo Guild Simulator` presets) across Module `01`'s ingress seam?

## Resolution

Implemented in [`src/hud/spectator-hud.ts`](../src/hud/spectator-hud.ts), [`src/simulator/demo-guild-simulator.ts`](../src/simulator/demo-guild-simulator.ts), [`src/server/main.ts`](../src/server/main.ts), [`src/web/app.html`](../src/web/app.html), and [`spec.md`](../spec.md), and verified via [`tests/05-spectator-hud-and-simulator.test.ts`](../tests/05-spectator-hud-and-simulator.test.ts):

1. **Read-Only `Character Sheet` & `Plugin Alcove` Tooltip View-Models (`buildCharacterSheetViewModel`, `buildPluginAlcoveTooltipViewModel`, `buildWorkshopRoomHeaderViewModel`, `formatActivityTickerEntry`, `buildTuiPluginSurface`)**:
   - **`CharacterSheetViewModel`**:
     - Identity & Status: `sessionId`, `characterId`, `role` (`"Guild Adventurer"` | `"Squad Subagent"`), `roomId`, `lifecycleState`, `title`, and `modelId`.
     - `agentBadge`: `agentId`, formatted `displayName`, `palette` (`VisualTraitPalette`), and `headgear` silhouette.
     - `skillGrimoireStack`: Ordered `SkillGrimoireChipViewModel[]` preserving activation order (`skillId`, `name`, `source`: `"skill-tool"` | `"prompt-attachment"` | `"skill-message"` | `"inherited"`, `emblemHex`, `monogram`, and `inheritedFromSessionId`).
     - `contextMana`: `percent` (`0..100`), `usedTokens`, `maxTokens`, `status` (`"normal"` `< 65%`, `"elevated"` `65..84%`, `"critical"` `>= 85%`, or `"distilling"` when `lifecycleState === "DistillingContextMana"`), and `compactionCount`.
     - `cost`: `inputTokens`, `outputTokens`, `totalCostUsd`, and `totalUsdFormatted` (`"$X.XX"`).
     - `activeTarget`: `workstation`, `pluginNamespace`, `secondaryAlcoveNamespaces` (for multi-alcove Code Mode `execute` beams), `toolName`, and truncated `inputPreview`.
     - `childSubagents`: `ChildSubagentSummaryViewModel[]` with `sessionId`, `characterId`, `title`, `role`, `agentClass`, `lifecycleState`, `activeWorkstation`, and `inheritedGrimoireCount`.
     - `pendingQuestGate`: `{ gateId, kind, title, prompt, badgeSymbol: "!" | "?" } | null`.
   - **`PluginAlcoveTooltipViewModel`**: Exposes `namespace`, `displayName`, `archetype`, `monogram`, `status`, `statusLabel`, `errorDetail` (populated for `needs_auth` and `failed` alcoves), `isOverflowAlcove`, `overflowNamespaces`, and `activeOccupantIds`.
   - **`@opencode/plugin/tui` Surface (`buildTuiPluginSurface`)**: Exposes slash command `/guild` (alias `pixel-guild`), keybind `ctrl+g`, and footer status `GUILD: <N> rooms · <M> adventurers · <K> quest gates` for `"home.footer.status"` and `"prompt.footer.status"`.

2. **Six Deterministic `Demo Guild Simulator` Preset Scenarios (`DEMO_SCENARIO_PRESETS`, `runDemoScenarioPreset`)**:
   - `cohabited-guild-hall`: Multi-session co-habitation of 3 `Guild Adventurer`s (`build`, `explore`, `general`) sharing one `Workshop Room` across `Anvil Forge` and `Archive Radar`.
   - `skill-grimoire-squad`: Parent `plan` adventurer studies 3 skills at the `Arcane Lectern` across all 3 OpenCode V2 activation sources (`skill-tool`, `prompt-attachment`, `skill-message`), then spawns 2 `Squad Subagent`s that inherit the 3-grimoire stack and deliver a `Report Scroll`.
   - `plugin-alcove-codemode`: Hydrates 6 MCP plugins (`4` dedicated `Plugin Alcove`s + `2` overflow namespaces in `alcove:overflow`), runs a direct `github_create_release` call, and runs a multi-namespace Code Mode `execute` script firing `Reactor Console` telemetry beams to `github`, `linear`, and `sentry`.
   - `mcp-auth-and-failure`: Showcases all 4 `Plugin Alcove` status crystals (`connected`, `needs_auth`, `failed`, `disabled`) with diagnostic `statusMessage` tooltips and session retry smoke (`retryCount: 2`).
   - `worktree-annexation`: Annexes a git worktree `Workshop Room` (`worktree.created`) and migrates an active `Guild Adventurer` (`session.moved`) into the worktree annex with zero coordinate shift.
   - `compaction-and-quest-gate`: Demonstrates `Altar of Compaction` `Context Mana` distillation alongside concurrent `!` permission and `?` question `Quest Gate` blocks.

3. **Transport-Agnostic Adapter & Preset Switching Across Module `01`'s Ingress Seam (`createGuildCompanionServer`, `TelemetryIngressHub`)**:
   - In-process callers invoke `TelemetryIngressHub.activateAdapter(kind)` or `runDemoScenarioPreset(presetId, reducer)`, which dispatches `adapter.switched` (`demo-simulator`, `opencode-client`, or `opencode-plugin`) into `WorldStateReducer`.
   - Over HTTP, the web companion (`src/web/app.html`) consumes `GET /api/guild/snapshot` and `GET /api/guild/events` (SSE) and triggers preset or adapter switches via `POST /api/guild/preset` and `POST /api/guild/adapter` on `createGuildCompanionServer` (`src/server/main.ts`), while also working standalone in any browser with zero server dependencies.
