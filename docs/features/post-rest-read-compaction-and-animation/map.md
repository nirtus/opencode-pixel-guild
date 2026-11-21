# Wayfinder Map: Continuous In-Place Compaction Exhalation (Without Visualizer Auto-Compaction on Read)

## Destination

Mark a resting **Guild Adventurer**'s completed turn result as read (`POST /api/session/{sessionID}/view`) without triggering visualizer-initiated session compaction, while playing the in-place **Compaction Exhalation** animation (`DistillingContextMana` / `"exhale"` vapor clouds with `"Compacting..."` overhead label) continuously from compaction start until compaction completes whenever OpenCode compacts a session (`docs/features/post-rest-read-compaction-and-animation/spec.md`).

## Notes

- Domain terms: **Break Lounge**, **Compaction Exhalation**, **Context Mana**, **Guild Adventurer**, **Guild Master Ledger** (`GLOSSARY.md`).
- Architectural rules: Strict `<= 400` lines per file in `src/` (`tests/00-architecture-invariants.test.ts`).
- Container verification rule: Must be deployed to and tested on the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`, see `docs/agents/container-deployment.md`).

## Decisions so far

- [Continuous In-Place Compaction Exhalation (Without Visualizer Auto-Compaction on Read)](./issues/01-post-rest-read-compaction-and-in-place-exhalation.md): Mark unread results as read (`session.view` / `session.viewed`) without calling `POST /api/session/{sessionID}/compact`, and hold the in-place **Compaction Exhalation** (`DistillingContextMana` / `"exhale"` vapor cloud animation with `"Compacting..."` overhead label) across `session.compaction.started` and `session.compaction.delta` until `session.compaction.ended` completes and **Context Mana** is distilled, without station transit or re-flagging `hasUnviewedResult = true` on the trailing `session.idle`.

## Not yet specified

*(None — all design decisions settled in Round 1 grilling; frontier is ready for execution.)*

## Out of scope

- Adding a separate physical compaction station or moving characters out of the **Break Lounge** to compact (`GLOSSARY.md` explicitly forbids an `Altar of Compaction` or station transit for **Compaction Exhalation**).
