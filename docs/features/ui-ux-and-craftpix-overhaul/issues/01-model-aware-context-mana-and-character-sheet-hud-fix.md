# 01: Model-Aware Context Mana Hydration & Character Sheet Runtime Crash Fix

Type: task
Label: `ready-for-agent`
Status: resolved
Blocked by: None (can start immediately)

**What to build:** Hydrate real model context-window limits (`limit.context`, e.g. `1,048,576` tokens for `google/gemini-4-argon` and `262,144` for `opencode/flint-40b-free`) from the live OpenCode V2 daemon's `GET /api/model` endpoint into the capability catalog and world-state reducer, compute each character's `Context Mana` `usedTokens` from the latest assistant turn's context footprint (`input + cache.read + cache.write + output + reasoning`) rather than a hardcoded `200,000` limit or multi-turn cumulative sums, fix the 4 breaking `Character Sheet` view-model property mismatches that crash `renderCharacterSheet()` and freeze the Live Activity Ticker, and sort the `Sessions in Room` selector with active sessions pinned to the top.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Query `GET /api/model` in the OpenCode V2 daemon client and hydrate model `limit.context` and `limit.output` entries (indexed by both `<providerID>/<id>` and `<id>`) through `catalog.hydrated` into `CapabilityCatalog`.
- [x] Compute `Context Mana` `usedTokens` from the newest assistant message's context-window footprint (`input + cache.read + cache.write + output + reasoning`, falling back to session token telemetry when no message tokens exist) and resolve `limitTokens` from the active model's catalog `limit.context` (with family fallbacks `1,048,576` for `gemini-*`, `400,000` for `gpt-5*`/`codex*`, `200,000` default) instead of hardcoding `200,000`.
- [x] Align `CharacterSheetViewModel` and the browser `Character Sheet` renderer so `contextMana` provides both `maxTokens` and `limitTokens`, `cost` provides `cacheReadTokens`, `cacheWriteTokens`, `totalUsdFormatted`, and `formattedCost`, and `pendingQuestGate` provides both `prompt` and `detail`—eliminating the `TypeError` crash when selecting or hovering any character and allowing `renderTicker()` to update continuously.
- [x] Sort the `Sessions in Room` peer list in the `Character Sheet` so active sessions (`WorkingAtStation`, `Thinking`, `BlockedAtQuestGate`, `DistillingContextMana`, `ReportingScroll`) appear at the top above `RestingInLounge` and `Archived` sessions.
- [x] Verify at Seam 1 (`createOpenCodeClientAdapter` + `createWorldStateReducer`) and Seam 2 (`buildCharacterSheetViewModel` + `buildSceneObjectTooltip`) with automated tests covering a `1,048,576`-limit model (`google/gemini-4-argon`) at `~250k` tokens (`~24% normal` status, never `100% critical`) and verifying all `Character Sheet` view-model fields.

## Answer

Hydrated `GET /api/model` context limits (`1,048,576` for `google/gemini-4-argon`, `262,144` for `opencode/flint-40b-free`) into `CapabilityCatalog.models`, computed `Context Mana` `usedTokens` from the newest assistant message's context footprint (`input + cache.read + cache.write + output + reasoning`), aligned `CharacterSheetViewModel` properties with the live browser `Character Sheet`, and sorted `roomSessions` with active sessions pinned to the top.
