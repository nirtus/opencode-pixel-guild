# Feature Map: Interactive Developer Prompts, Quest Gate Resolution & Summon Adventurer

Label: wayfinder:map

## Destination

Turn the OpenCode Pixel Guild Visualizer into a full two-way interactive developer companion (`docs/features/interactive-developer-prompts-and-quest-gates/spec.md`) by combining the hybrid Design-It-Twice architecture:
1. **Single Discriminated-Union Command Seam (`POST /api/guild/command` & `dispatchGuildCommand(cmd: GuildCommandRequest)`)** in `src/server/command-router.ts` and `src/ingress/daemon-command-ops.ts` supporting `scroll.send` (`POST /api/session/{id}/prompt` with `steer` / `queue` and `@skill` extraction), `turn.interrupt` (`POST /api/session/{id}/interrupt`), `adventurer.summon` (`POST /api/session` + initial prompt), and `gate.resolve` across both the Live OpenCode V2 HTTP Daemon and the Demo Guild Simulator.
2. **Structured `QuestGateState` Metadata & Assistant Reply Preview**: Enrich `QuestGateState` (`source: "permission" | "form" | "conversational"`, `fields: QuestGateQuestionField[]` with `key: "q0".."qN"`, `options`, `multiple`) and add `lastAssistantText` on `CharacterState` via extracted `src/state/quest-gate-handlers.ts`.
3. **Two-Slot Focus-Safe DOM Reconciliation (`sheet-interactive-slot` + `sheet-static-slot`)** in `src/web/command-scroll-controller.ts` so `<textarea>` focus, cursor selection, and draft text survive 60fps SSE updates.

## Notes

- **Domain**: OpenCode V2 interactive command ingress (`POST /api/session`, `/prompt`, `/interrupt`, `/permission/{id}/reply`, `/form/{id}/reply`), structured Quest Gate reduction, HUD Character Sheet view-models, and focus-safe DOM reconciliation.
- **Rules**: Strictly use the project root directory (`./`). Never create external worktrees or use `/tmp/opencode`. Keep every source file under 400 lines (`tests/00-architecture-invariants.test.ts`). Verify visual changes with a live headless Chrome screenshot on port `4310`.
- **Skills to consult**: `codebase-design`, `domain-modeling`, `tdd`.

## Decisions so far

<!-- the index: one line per closed ticket, enough to judge relevance, then zoom the link for the detail the ticket holds -->

- [01: Structured Quest Gate Metadata & Assistant Reply Preview](./issues/01-structured-quest-gate-metadata-and-assistant-preview.md): Enriches `QuestGateState` with `source: "permission" | "form" | "conversational"` and `fields: QuestGateQuestionField[]` (`key: "q0".."qN"`, `options`, `multiple`), adds `lastAssistantText` on `CharacterState`, and extracts `src/state/quest-gate-handlers.ts`.
- [02: Unified Daemon & Simulator Command Seam (`POST /api/guild/command`)](./issues/02-unified-daemon-and-simulator-command-seam.md): Routes `scroll.send`, `turn.interrupt`, `adventurer.summon`, and `gate.resolve` through a single discriminated union in `src/server/command-router.ts` and `src/ingress/daemon-command-ops.ts` across both the OpenCode V2 HTTP daemon and Demo Guild Simulator.
- [03: Focus-Safe Command Scroll Composer & Interactive Quest Gate Cards](./issues/03-focus-safe-command-scroll-and-gate-cards.md): Splits `#character-sheet` into `#sheet-interactive-slot` (`src/web/command-scroll-controller.ts`) and `#sheet-static-slot` (`src/web/side-panel-reconciler.ts`) with per-session draft caching so 60fps SSE updates never clobber `<textarea>` focus or in-progress gate answers.
- [04: Summon Adventurer Modal & Single Reducer Sink Alignment](./issues/04-summon-adventurer-and-single-reducer-sink.md): Adds `#summon-adventurer-modal` (`src/web/summon-adventurer-controller.ts`) for spawning new root sessions in any Workshop Room and keeps a single `WorldStateReducer` sink in `src/server/main.ts`.

## Not yet specified

<!-- in-scope fog you can't ticket yet; graduates as the frontier advances -->

## Out of scope

- Full multi-turn chat history transcript viewer (only the latest assistant reply preview `lastAssistantText` and active Quest Gate prompt are displayed in the Character Sheet).
- Editing or mutating filesystem files directly from the browser outside of an OpenCode agent session.
