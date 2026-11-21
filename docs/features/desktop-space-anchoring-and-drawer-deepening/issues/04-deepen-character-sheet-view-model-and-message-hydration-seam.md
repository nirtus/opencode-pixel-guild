# 04: Deepen Character Sheet View-Model Seam & Unclip Message Hydration

Type: grilling
Label: wayfinder:grilling
Status: resolved
Blocked by: 01

## Question

How should we deepen `buildCharacterSheetViewModel` and the ingress message hydration seam so that DOM reconcilers consume a single self-sufficient view-model interface (without passing `rawChar: CharacterState` or duplicating `escapeHtml`) and full-height `Hero > Chat` receives unclipped prompt and assistant text?

## Answer

Confirmed in Grilling Round 1 (`Q4`):
- Raise the user prompt and assistant reply hydration caps in `src/ingress/daemon-message-hydration.ts` (`line 233`), `src/ingress/daemon-sse-mapper.ts` (`lines 78, 185, 199`), and `src/state/tool-and-gate-handlers.ts` (`line 268`) from `400` / `600` characters to `4000` characters, and increase `recentTools` retention in `src/state/tool-and-gate-handlers.ts` and `src/state/reducer-helpers.ts` from `12` to `30`.
- Deepen `buildCharacterSheetViewModel` (`src/hud/character-sheet-vm.ts`) so `recentTools` preserves `outputPreview` and `renderHeroSubtabStaticHtml` (`src/web/hero-subtabs-reconciler.ts`) no longer requires `rawChar: CharacterState` in its interface.
- Consolidate the 5 duplicated `escapeHtml` / `esc` implementations across `src/web/` into one shared helper export.

## Acceptance Criteria

- [x] `lastUserPromptText` and `lastAssistantText` retain up to `4000` characters across SSE streaming and message hydration, and `recentTools` retains up to `30` entries.
- [x] `CharacterSheetViewModel` includes `outputPreview` on `recentTools` and `renderHeroSubtabStaticHtml` accepts `sheet: CharacterSheetViewModel` without requiring `rawChar: CharacterState`.
- [x] The 5 duplicate `escapeHtml` / `esc` definitions in `src/web/` are consolidated into a single shared helper, and every file in `src/` remains `<= 400` lines.
