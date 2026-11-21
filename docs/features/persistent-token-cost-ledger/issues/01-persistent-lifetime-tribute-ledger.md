# 01: Persistent Lifetime Tribute SQLite Ledger, Monotonic Reducer Accounting & Guild Master Ledger Totals

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: None

## Question / Specification

Implement [Feature Specification: Persistent Lifetime Tribute Token & Cost Ledger (`session_tribute_ledger`)](../spec.md):

1. Add `SessionTributeRecord` and `GuildSnapshot.tributeLedger` in `src/types/core-types.ts`.
2. Track monotonic high-water per-session token and cost records in `InternalWorldStoreState.tributeLedger` (`src/state/context-mana.ts`, `src/state/reducer-types.ts`, `src/state/world-reducer.ts`, `src/state/snapshot-builder.ts`, `src/state/batch-reconciler.ts`, `src/state/reducer-helpers.ts`) so **Compaction Exhalation**, character deletion (`session.deleted` or sweep pruning), and room demolition (`room.deleted`) never reduce or erase accrued tokens and cost.
3. Persist `session_tribute_ledger` in `data/guild-chronicle.sqlite` (`src/server/chronicle-tribute-ledger.ts`, `src/server/chronicle-sqlite-store.ts`, `src/server/operator-registry.ts`) with monotonic `ON CONFLICT DO UPDATE SET ... MAX(...)` upserts and full hydration on `loadSnapshot`.
4. Update `buildGuildMasterLedgerViewModel` (`src/hud/guild-ledger-vm.ts`, `src/hud/hud-tooltip-types.ts`) and `renderGuildMasterLedgerPanel` (`src/web/ledger-panel-reconciler.ts`) to aggregate active + historical/deleted session tokens and cost (scoped to the focused project world or `🌐 All`) and expose breakdown tooltips on the `🪙 Tokens` and `💰 Cost` pills.
5. Verify with unit/integration tests (`npm test`) and live Docker container deployment (`npm run docker:up` on port `4310`).

## Answer

Implemented and verified:
1. Added `SessionTributeRecord` and `GuildSnapshot.tributeLedger` in `src/types/core-types.ts`.
2. Implemented monotonic high-water session token (`max` of `inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens` and `usedTokens`) and USD cost accounting in `src/state/context-mana.ts`, `src/state/reducer-types.ts`, `src/state/world-reducer.ts`, `src/state/snapshot-builder.ts`, `src/state/batch-reconciler.ts`, and `src/state/reducer-helpers.ts`.
3. Created `src/server/chronicle-tribute-ledger.ts` and updated `src/server/chronicle-sqlite-store.ts` and `src/server/operator-registry.ts` to persist `session_tribute_ledger` in `data/guild-chronicle.sqlite` using monotonic `ON CONFLICT DO UPDATE SET ... MAX(...)` upserts that survive character deletion, session compaction, room demolition, and server restarts.
4. Updated `src/hud/hud-tooltip-types.ts`, `src/hud/guild-ledger-vm.ts`, and `src/web/ledger-panel-reconciler.ts` so `buildGuildMasterLedgerViewModel` sums active + historical deleted session tributes (scoped to the focused project world or `🌐 All`) and renders breakdown tooltips on the `🪙 Tokens` and `💰 Cost` pills.
5. Verified with `tests/43-persistent-token-cost-ledger.test.ts`, full `npm test`, and live Docker container deployment (`opencode-pixel-guild-visualizer` on port `4310`, visual proof captured in `docs/images/persistent-token-cost-ledger.png`).
