# Feature Specification: Persistent Lifetime Tribute Token & Cost Ledger (`session_tribute_ledger`)

## 1. Overview & Motivation

Previously in `opencode-game-visualizer`:
1. **`GuildMasterLedger` Computed Tokens & Cost Only from Surviving In-Memory Characters**:
   - `buildGuildMasterLedgerViewModel` (`src/hud/guild-ledger-vm.ts`) summed `c.contextMana?.usedTokens` and `c.contextMana?.totalCostUsd` exclusively over `snapshot.characters`.
2. **Deleting a Character or Room Erased Its Tokens & Cost**:
   - When `session.deleted` (`DELETE /api/guild/session/:id` or stale-session pruning during daemon sweeps) or `room.deleted` (`DELETE /api/guild/room`) ran in `src/state/snapshot-builder.ts` / `src/state/batch-reconciler.ts`, `delete state.characters[delId]` removed the character and `chronicleStore.saveSnapshot()` overwrote `characters_json` in `world_snapshots` inside `data/guild-chronicle.sqlite`.
   - As a result, all tokens and USD cost accrued by deleted **Guild Adventurers** and **Squad Subagents** disappeared immediately from both the project world total and the `🌐 All` total.
3. **Compaction Shrank Ledger Token Totals**:
   - While `GLOSSARY.md` distinguishes **Context Mana** (active-turn context-window fill ratio, which drops by 75% on **Compaction Exhalation**) from **Lifetime Tribute** (cumulative multi-turn token consumption and monetary cost across session history), `GuildMasterLedger` summed `contextMana.usedTokens` directly rather than a monotonic cumulative session ledger.

---

## 2. Locked Design Decisions (`Q1`–`Q4`)

1. **Direct Specification & Full Vertical-Slice Implementation (`Q1`)**:
   - Deliver the complete feature specification, SQLite schema extension (`session_tribute_ledger`), reducer high-water accounting (`tributeLedger`), HUD view-model aggregation, and Docker container verification in one cohesive vertical slice.
2. **Durable Historical Ledger Across Character Deletion & World Demolition (`Q2` — Option A)**:
   - Persist every session's high-water token and cost record in a dedicated SQLite table `session_tribute_ledger` in the **Guild Chronicle Store** (`data/guild-chronicle.sqlite`), keyed by `(operator_id, session_id)` and storing its canonical `room_id`, `location_directory`, and `project_id`.
   - Deleting a **Guild Character** (`session.deleted` or daemon sweep cleanup) preserves its historical spend in both the project world's ledger total and `🌐 All`.
   - Demolishing a **Workshop Room** (`room.deleted` via the **Demolition Bomb**) preserves its historical spend in `🌐 All` (and restores the project's historical spend if that folder is later re-registered).
3. **Monotonic High-Water Session Token & Cost Definition (`Q3` — Option A)**:
   - Track each session's monotonic high-water cumulative token usage:
     - `inputTokens = max(prev.inputTokens, char.contextMana.inputTokens)`
     - `outputTokens = max(prev.outputTokens, char.contextMana.outputTokens)`
     - `cacheReadTokens = max(prev.cacheReadTokens, char.contextMana.cacheReadTokens)`
     - `cacheWriteTokens = max(prev.cacheWriteTokens, char.contextMana.cacheWriteTokens)`
     - `bucketSum = inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens`
     - `totalTokens = max(prev.totalTokens, bucketSum, char.contextMana.usedTokens)`
     - `totalCostUsd = max(prev.totalCostUsd, char.contextMana.totalCostUsd)`
   - **Context Mana** (`char.contextMana.usedTokens / char.contextMana.limitTokens`) remains strictly the active-turn context window occupancy bar on character sprites and in the **Character Sheet**.
4. **In-Place Cumulative Totals + Active vs. Historical Breakdown Tooltip (`Q4` — Option A)**:
   - Keep the existing `🪙 X Tokens` and `💰 $Y` pills in the **Guild Master Ledger** telemetry ribbon (`📜 General` → `Overview`) displaying the combined cumulative total (active sessions + deleted/historical sessions for the focused world or `🌐 All`).
   - Attach descriptive hover tooltips (`tokensTooltip` and `costTooltip`) to those pills breaking down active vs. historical/deleted session contributions.

---

## 3. Architecture & Module Seams

### 3.1 Domain Contract (`src/types/core-types.ts`)
- Define `SessionTributeRecord`:
  ```ts
  export interface SessionTributeRecord {
    sessionId: string; roomId: string; locationDirectory: string; projectId: string;
    totalTokens: number; inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number;
    totalCostUsd: number; updatedAtMs: number;
  }
  ```
- Extend `GuildSnapshot` with `tributeLedger?: Record<string, SessionTributeRecord>;`.

### 3.2 Monotonic Reducer State & Snapshot Hydration (`src/state/context-mana.ts`, `src/state/reducer-types.ts`, `src/state/world-reducer.ts`, `src/state/snapshot-builder.ts`, `src/state/batch-reconciler.ts`, `src/state/reducer-helpers.ts`)
- Add `tributeLedger: Record<string, SessionTributeRecord>` to `InternalWorldStoreState` (`src/state/reducer-types.ts`).
- Export `syncCharacterTributeRecord`, `mergeSessionTributeRecord`, and `syncAllCharacterTributes` from `src/state/context-mana.ts`:
  - Resolves canonical `projectId` (`room?.projectId` or normalized `locationDirectory`) and updates `state.tributeLedger[char.sessionId]` monotonically whenever character token/cost state is created, updated, compacted, or before any character/room deletion (`handleSessionDeleted`, `handleRoomDeleted`, `pruneDeletedHostRooms`, and stale sweep pruning in `batch-reconciler.ts`).
- In `hydrateFromSnapshot` (`src/state/world-reducer.ts`):
  - Merge `persisted.tributeLedger` monotonically into `state.tributeLedger` and also synchronize any `persisted.characters` so legacy snapshots seamlessly seed their tribute ledger.
- In `buildSnapshot` (`src/state/snapshot-builder.ts`):
  - Call `syncAllCharacterTributes(state)` during `syncRoomAggregates(state)` and include `tributeLedger: structuredClone(state.tributeLedger)` in the emitted `GuildSnapshot`.

### 3.3 SQLite Persistence (`src/server/chronicle-tribute-ledger.ts`, `src/server/chronicle-sqlite-store.ts`, `src/server/operator-registry.ts`)
- Extract `src/server/chronicle-tribute-ledger.ts` to keep both `src/server/chronicle-sqlite-store.ts` and `src/server/operator-registry.ts` well below the 400-line ceiling.
- Create table `session_tribute_ledger` in `data/guild-chronicle.sqlite`:
  ```sql
  CREATE TABLE IF NOT EXISTS session_tribute_ledger (
    operator_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    room_id TEXT NOT NULL,
    location_directory TEXT NOT NULL,
    project_id TEXT NOT NULL,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cache_read_tokens INTEGER NOT NULL DEFAULT 0,
    cache_write_tokens INTEGER NOT NULL DEFAULT 0,
    total_cost_usd REAL NOT NULL DEFAULT 0,
    updated_at_ms INTEGER NOT NULL,
    PRIMARY KEY (operator_id, session_id)
  );
  ```
- On `saveSnapshot(operatorId, snapshot)`:
  - Monotonically upsert every entry from `snapshot.tributeLedger` and `snapshot.characters` into `session_tribute_ledger` using `MAX(...)` on conflict.
  - Never delete rows from `session_tribute_ledger` on `session.deleted` or `room.deleted` (only `deleteOperatorData(operatorId)` deletes operator rows when an account is deleted).
- On `loadSnapshot(operatorId)`:
  - Load all rows from `session_tribute_ledger WHERE operator_id = ?` and merge with any characters in `world_snapshots.characters_json` (even for pruned/deleted rooms) so existing databases upgrade without losing a single token or cent.

### 3.4 HUD View-Model & Telemetry Ribbon (`src/hud/hud-tooltip-types.ts`, `src/hud/guild-ledger-vm.ts`, `src/web/ledger-panel-reconciler.ts`)
- Extend `GuildMasterLedgerViewModel` with:
  - `activeUsedTokens: number`, `historicalUsedTokens: number`
  - `activeCostUsd: number`, `historicalCostUsd: number`
  - `tokensTooltip: string`, `costTooltip: string`
- In `buildGuildMasterLedgerViewModel` (`src/hud/guild-ledger-vm.ts`):
  - Aggregate monotonic session tributes across both live scoped characters and matching `snapshot.tributeLedger` records (all records when `🌐 All` is focused, or records matching the focused project world's `scopedRoomSet`, `normFocus`, or `targetProjectRoot` when a specific world is focused).
- In `renderGuildMasterLedgerPanel` (`src/web/ledger-panel-reconciler.ts`):
  - Render `title="${escapeHtml(ledger.tokensTooltip)}"` on the `🪙 ... Tokens` badge and `title="${escapeHtml(ledger.costTooltip)}"` on the `💰 ...` badge.

---

## 4. Verification & Container Deployment Criteria

1. **Automated Tests (`npm test`)**:
   - `tests/00-architecture-invariants.test.ts`: Every file under `src/` stays `<= 400` lines and 100% reachable.
   - New dedicated test suite verifying:
     - Monotonic high-water token and USD cost accounting across multi-turn updates and **Compaction Exhalation** (`session.compacted`).
     - Preservation of project-scoped and `🌐 All` token and cost totals in `GuildMasterLedgerViewModel` when a **Guild Adventurer** or **Squad Subagent** is deleted (`session.deleted`) or pruned on reconnect sweeps.
     - Preservation of historical token and cost totals in `🌐 All` (and upon project re-registration) when a **Workshop Room** is demolished (`room.deleted`).
     - End-to-end SQLite persistence in `createGuildChronicleStore` (`session_tribute_ledger`) across companion restarts (`saveSnapshot` → `loadSnapshot` → `hydrateFromSnapshot`).
2. **Mandatory Docker Container Deployment & Visual Proof (`npm run docker:up` on port `4310`)**:
   - Deploy to `opencode-pixel-guild-visualizer` on port `4310`, verify health, capture a live headless Chrome screenshot in `docs/images/persistent-token-cost-ledger.png`, and visually inspect the rendered output.
