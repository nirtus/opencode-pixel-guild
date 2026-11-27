# 03: Command Scroll Target Controls (Agent + Provider-Grouped Model + Conditional Variant) & Verification

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01, 02

## Specification

Implement the single canonical UI home for **OpenCode Model** & `#variant` selection inside **`Command Scroll`** ([ADR-0001](../../../adr/0001-single-home-command-scroll-model-selection.md), [spec.md](../spec.md) §3.3 & §4):

1. **Extend HUD View-Model (`src/hud/hud-character-types.ts`, `src/hud/character-sheet-vm.ts`)**:
   - Add `CharacterModelOptionViewModel` and `CharacterModelProviderGroupViewModel`.
   - Extend `CharacterCommandScrollViewModel` with `canSwitchModel` (`role === "Guild Adventurer" && parentId === null`), `selectedModelId`, `selectedModelVariant`, `availableModelGroups` (built via `resolveRoomSelectableModels` + `groupSelectableModelsByProvider` with out-of-catalog active model preservation), and `availableVariants` (for the selected model).
   - Expose `modelVariant?: string` on `CharacterSheetViewModel` and display `modelId#variant` (read-only) in the `Details` subtab (`src/web/hero-subtabs-reconciler.ts`, updating its subtab digest in `src/web/side-panel-reconciler.ts`).
2. **Create Deep Module `src/web/command-scroll-target-controls.ts` (consumed by `src/web/command-scroll-controller.ts`)**:
   - Render `#command-scroll-agent-select`, `#command-scroll-model-select` (native `<select>` with `<optgroup>` per provider, enabled while busy), and conditional `#command-scroll-variant-select` (rendered only when `availableVariants.length > 0`) for root **`Guild Adventurer`**s (omitted for **`Squad Subagent`**s).
   - Compute a target-controls digest (`data-targets-sig`) so `reconcileInteractiveCommandSlot`'s fast path updates `<select>` options seamlessly when late `catalog.hydrated` arrives without clearing user draft prompts or collapsing focus.
   - Bind `change` handlers dispatching `model.switch` (on model or variant change) and `agent.switch` (on agent change), reverting the `<select>` and showing the specific daemon error in `#scroll-feedback-msg` when `!res.ok`.
   - Attach selected `agentClass`, `modelId`, and `modelVariant` on `scroll.send` dispatch.
3. **Two-Row `Command Scroll` Compose Styling (`src/web/styles-components.css`)**:
   - Stack `.command-scroll-compose-row` vertically: full-width `#command-scroll-input` textarea above `.command-scroll-send-actions` holding `[Agent] [Model (flex: 1 1 0; min-width: 0; text-overflow: ellipsis)] [Variant?] [📜 Send Scroll ↵]`, wrapping cleanly on mobile with `>= 44px` touch targets.
   - Do **not** add model switchers to the `Character Sheet` header, `Details` subtab, or `Summon New Guild Adventurer` modal (`src/web/app.html` stays unchanged).
4. **Tests, Documentation & Live Docker Container Visual Proof**:
   - Complete Seam 3 tests in `tests/60-opencode-model-selection.test.ts` and run full `npm test` (including `tests/00-architecture-invariants.test.ts`).
   - Update `README.md` to document live **OpenCode Model** & variant selection in **Command Scroll**.
   - Deploy via `npm run docker:up`, verify `opencode-pixel-guild-visualizer` on port `4310`, capture headless Chrome screenshot of **Command Scroll** showing the Agent + Model (+ Variant) bar, visually inspect the PNG via `read`, and resolve tickets `01`–`03` + `map.md`.

## Acceptance Criteria

- [x] Root **Guild Adventurers** display `#command-scroll-agent-select`, provider-grouped `#command-scroll-model-select`, conditional `#command-scroll-variant-select`, and `#btn-send-command-scroll` in a clean two-row **Command Scroll** compose layout below `#command-scroll-input`.
- [x] Child **Squad Subagents** hide interactive model/variant controls; `Character Sheet` header, `Details`, and `Summon New Guild Adventurer` modal contain zero duplicate model switchers (`ADR-0001`).
- [x] Switching model or variant dispatches `model.switch` immediately (including while busy), updates `Context Mana`, and reverts + displays `#scroll-feedback-msg` on failure.
- [x] Late `catalog.hydrated` refreshes dropdown options in place without wiping `#command-scroll-input` draft text; out-of-catalog active models stay visibly selected without auto-switching.
- [x] Every file under `src/` is `<= 400` lines, `src/web/app.html` is `<= 150` lines, `npm test` passes 100%, `README.md` is updated, and live container visual proof on port `4310` is verified.

## Answer

Projected provider-grouped models, conditional variants, out-of-catalog active model fallback, and `canSwitchModel` onto `CharacterSheetViewModel` (`src/hud/hud-character-types.ts`, `src/hud/character-sheet-vm.ts`), rendered read-only `modelId#variant` in `Details` (`src/web/hero-subtabs-reconciler.ts`, `src/web/side-panel-reconciler.ts`), created `src/web/command-scroll-target-controls.ts` wired into `src/web/command-scroll-controller.ts` with digest-guarded in-place option refreshes, focus-safe conditional `#command-scroll-variant-select` syncing, and error rollback + `#scroll-feedback-msg` surfacing, and styled the two-row compose layout + mobile `>= 44px` touch targets (`src/web/styles-components.css`, `src/web/styles-responsive.css`). Updated `README.md` with visual proof in `assets/images/opencode-model-selection.png` captured from the live `opencode-pixel-guild-visualizer` container on port `4310` and verified `452/452` tests passing.
