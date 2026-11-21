# Feature Map: Persistent Lifetime Tribute Token & Cost Ledger

Label: wayfinder:map

## Destination

Deliver the complete specification in [Feature Specification: Persistent Lifetime Tribute Token & Cost Ledger (`session_tribute_ledger`)](./spec.md) so that cumulative session token consumption and USD cost (**Lifetime Tribute**) are durably persisted in the **Guild Chronicle Store** (`data/guild-chronicle.sqlite`) and never disappear when a **Guild Character** is deleted, compacted, or when a **Workshop Room** is demolished:

1. **[01: Persistent Lifetime Tribute SQLite Ledger, Monotonic Reducer Accounting & Guild Master Ledger Totals](./issues/01-persistent-lifetime-tribute-ledger.md)** (`Blocked by: None`)

## Notes

- **Domain**: **Lifetime Tribute**, **Context Mana**, **Guild Chronicle Store**, **Guild Master Ledger**, **Guild Character**, **Workshop Room**, **Demolition Bomb**.
- **Specification**: [Feature Specification: Persistent Lifetime Tribute Token & Cost Ledger (`session_tribute_ledger`)](./spec.md).
- **Skills to consult**: `wayfinder`, `grilling`, `domain-modeling`, `tdd`, `verification-before-completion`.
- **Standing Rules**:
  - Work strictly inside the project root directory (`./`). Never create git worktrees or write files to `/tmp` or `/tmp/opencode`.
  - Keep every source file under `src/` `<= 400` lines (`tests/00-architecture-invariants.test.ts`).
  - Deploy and verify on the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`) and inspect a live screenshot in `docs/images/persistent-token-cost-ledger.png`.

## Decisions so far

- [Grilling & Domain Modeling Alignment (Q1–Q4)](./spec.md): Locked direct specification and implementation (`Q1`), durable SQLite `session_tribute_ledger` persistence across both character deletion (`session.deleted`) and world demolition (`room.deleted`) (`Q2` — Option A), monotonic high-water session token (`max` of bucket sum and `usedTokens`) and USD cost accounting distinct from active-turn **Context Mana** (`Q3` — Option A), and in-place cumulative `🪙 Tokens` / `💰 Cost` display in the **Guild Master Ledger** with active vs. historical breakdown tooltips (`Q4` — Option A). Updated `GLOSSARY.md` accordingly.
- [01: Persistent Lifetime Tribute SQLite Ledger, Monotonic Reducer Accounting & Guild Master Ledger Totals](./issues/01-persistent-lifetime-tribute-ledger.md): Persisted monotonic per-session token and cost records in SQLite (`session_tribute_ledger` in `data/guild-chronicle.sqlite`) and reducer `tributeLedger`, updated `buildGuildMasterLedgerViewModel` and `renderGuildMasterLedgerPanel` to retain deleted sessions' tokens and cost with active vs. historical breakdown tooltips, and verified on Docker (`docs/images/persistent-token-cost-ledger.png`).

## Not yet specified

<!-- All wayfinder fog has graduated into spec.md and ticket 01 -->

## Out of scope

- Changing active-turn **Context Mana** fill bar math (`usedTokens / limitTokens`) on character overhead bars or in the **Character Sheet**.
- External billing provider invoicing outside OpenCode session token and cost telemetry.
