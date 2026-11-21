# Feature Map: Gamemaster Menus, Lists & Buttons — Keyed DOM Reconciliation, Tombstone & Epoch Gating, and Persistent Action Spinners

Label: wayfinder:map

## Destination

Deliver the **Gamemaster Menus, Lists & Buttons UX Deepening** (`docs/features/gamemaster-ui-responsiveness-and-flicker/spec.md` and `docs/architecture-review/architecture-review-20261111-gamemaster-ui-responsiveness-and-flicker.html`) across four focused vertical-slice tickets (`01` unblocks `02`, `03`, and `04`):
1. **`01` (`./issues/01-keyed-dom-reconciler-and-hover-stability.md`)**: Keyed **Spectator Drawer** & modal DOM reconciliation, subtab-isolated signatures, delegated container events, `0ms` local chat/tool accordion toggles, `.btn:hover` vs. `[data-herald-party]` CSS specificity fix, and the shared `applyAuthoritativeSnapshot` monotonic version gate.
2. **`02` (`./issues/02-monotonic-snapshot-tombstones-and-cache-epochs.md`)**: End-to-end Session Delete (`Kill Character`) & **Demolition Bomb** (`💣 Demolish`) lifecycle with render-persistent `⏳ Deleting...` / `⏳ Demolishing...` spinners, post-await `session.view` snapshot fix, `deletedRoomIds` locked against SSE `session.updated`/`message.updated` echoes, post-await sweep & `hydrateFromSnapshot` `deletedSessionIds` filtering, and tombstone-first parallel (`Promise.allSettled`) server teardown.
3. **`03` (`./issues/03-persistent-action-spinners-and-parallel-server-teardown.md`)**: End-to-end **Quest Gate** resolution (`Allow Once` / `Always` / `Reject` / `Send Answer ↵`) & **Completed Session Results (Unread)** acknowledgment with render-persistent `⏳ Sending...` spinners, immediate `onStateChanged()`, unified `frm_...`/`call_...` gate suppression across sweeps and **Guild Master Ledger** badges, and `5_000ms` daemon-idle settlement tolerance.
4. **`04` (`./issues/04-assembly-commit-ledger-and-machine-pairing-epochs.md`)**: End-to-end **Assembly Commit Ledger** Git CRUD (`Stage`, `Unstage`, `Discard`, `Stage All`, `Unstage All`, `Sync Git`, `Commit`) & **OpenCode Machine Pairing** (`Switch`, `Pair`, `Remove`, `Save`) with render-persistent `⏳` spinners, epoch-guarded `gitStatusCache`, `refreshRoomGitState`, and `refreshCachedOperatorProfile`, non-blocking git status, documentation updates, and live Docker verification.

## Notes

- **Domain**: `Spectator Drawer`, `Guild Master Ledger`, `Character Sheet`, `Category Subtab Deck`, `Assembly Commit Ledger`, `Quest Gate`, `Demolition Bomb`, `Authoritative Live State`, `OpenCode Machine Pairing` (`GLOSSARY.md`, `ADR-0001`, & `ADR-0002`).
- **Architecture Review**: `docs/architecture-review/architecture-review-20261111-gamemaster-ui-responsiveness-and-flicker.html`.
- **Rules**:
  - Work strictly inside the project root directory (`./`); never create git worktrees or use `/tmp/opencode`.
  - Keep every source file strictly `<= 400` lines (`tests/00-architecture-invariants.test.ts`).
  - Update project documentation (`README.md`, `GLOSSARY.md`), deploy to the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`), run `npm test`, and capture visual proof in `docs/images/gamemaster-ui-responsiveness-and-flicker.png`.
- **Skills to consult**: `codebase-design`, `domain-modeling`, `tdd`.

## Decisions so far

<!-- the index: one line per closed ticket, enough to judge relevance, then zoom the link for the detail the ticket holds -->

- **01 (`./issues/01-keyed-dom-reconciler-and-hover-stability.md` — resolved)**: Separated `#sheet-header-slot` and per-subtab `#sheet-static-slot` signatures, patched mounted headers and chat accordions in place (`0ms`), guarded `Summon Modal` `<select>`/skill DOM and `Operator Modal` refreshes by signature, fixed `.btn[data-herald-party]:hover` CSS specificity, and centralized client snapshot ingestion behind `applyAuthoritativeSnapshot`.
- **02 (`./issues/02-monotonic-snapshot-tombstones-and-cache-epochs.md` — resolved)**: Fixed `command-router` stale `session.view` snapshot returns, locked `deletedRoomIds` against `session.updated`/`message.updated` SSE echoes, dispatched `room.deleted` immediately before parallelized (`Promise.allSettled`) daemon teardown, filtered `deletedSessionIds` in `hydrateFromSnapshot` and post-await sweeps, and added persistent `⏳ Deleting...` / `⏳ Demolishing...` spinners.
- **03 (`./issues/03-persistent-action-spinners-and-parallel-server-teardown.md` — resolved)**: Added persistent `⏳ Sending...` spinners and immediate `onStateChanged()` on Quest Gate resolution, unified `frm_...` and `call_...` Question Gate suppression in `isQuestionReasonAlreadyResolved`, `handleStreamReconnected`, and `isCharacterWaitingAtGate`, and added a `5_000ms` daemon-idle settlement tolerance in `syncClientViewedSessionsToSnapshot`.
- **04 (`./issues/04-assembly-commit-ledger-and-machine-pairing-epochs.md` — resolved)**: Added epoch-stamped `gitStatusCache`, `refreshRoomGitState`, and `refreshCachedOperatorProfile` guards, persistent per-file `⏳ Staging...`/`⏳ Unstaging...`/`⏳ Discarding...` and machine-switch spinners, fast-path `scanProjectIssueTracker` when no `docs/features/` files are dirty, updated `README.md` and `GLOSSARY.md`, and verified on the `opencode-pixel-guild-visualizer` Docker container.

## Not yet specified

<!-- in-scope fog you can't ticket yet; graduates as the frontier advances -->

## Out of scope

- Changing 2D canvas `Preparation Station` perimeter slots or `Dungeon Wilds` monster combat choreography.
- Optimistic list item removal before server confirmation (buttons display render-persistent `⏳` loading spinners while in flight and lists update authoritatively when the server responds).
