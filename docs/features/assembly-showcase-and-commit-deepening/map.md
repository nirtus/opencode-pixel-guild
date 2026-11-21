# Feature Map: Goal Assembly Showcase & Assembly Commit Ledger Deepening

Label: wayfinder:map

## Destination

Deliver the **Goal Assembly Showcase & Assembly Commit Ledger Deepening** (`docs/features/assembly-showcase-and-commit-deepening/spec.md` and `docs/architecture-review/architecture-review-20261109-assembly-showcase-and-commit-deepening.html`) across all four architectural candidates:
1. Replace the out-of-place `Feature: ... · <milestoneName>` HUD row with structured **Guild Results Showcase** source/scope metadata, keep steampunk `milestoneName` lore inside the 2D canvas painter and tooltips, and turn the `Overview` assembly card into a compact interactive summary strip with working **Project Mini-Assembly** pills.
2. Deepen `createLiveGitWorkingTreeAdapter` (`GitWorkingTreePort`), `issue-tracker-scanner.ts`, and `git-router.ts` to use non-blocking async Git subprocesses, zero-subprocess draft updates, normalized cache keys across 15s sweeps, and commit-only feature retirement without SSE echo loops.
3. Consolidate `commit-ledger-controller.ts`, `commit-ledger-view.ts`, and `ledger-panel-reconciler.ts` behind delegated container event handling, room-scoped cache invalidation, scroll preservation, and immediate button pending states.

## Notes

- **Domain**: `Goal Assembly Site`, `Project Mini-Assembly`, `Assembly Part`, `Guild Results Showcase`, `Assembly Commit Ledger`, `Guild Master Ledger`, and `Authoritative Live State` (`GLOSSARY.md` & `ADR-0001`).
- **Architecture Review**: `docs/architecture-review/architecture-review-20261109-assembly-showcase-and-commit-deepening.html`.
- **Rules**:
  - Work strictly inside the project root directory (`./`); never create git worktrees or use `/tmp/opencode`.
  - Keep every source file strictly `<= 400` lines (`tests/00-architecture-invariants.test.ts`).
  - Update project documentation (`README.md`, `GLOSSARY.md`, `docs/adr/`), deploy to the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`), run `npm test`, and capture visual proof in `docs/images/assembly-showcase-and-commit-deepening.png`.
- **Skills to consult**: `codebase-design`, `domain-modeling`, `tdd`.

## Decisions so far

<!-- the index: one line per closed ticket, enough to judge relevance, then zoom the link for the detail the ticket holds -->

- **01 (`issues/01-world-focus-scope-and-showcase-source-derivation.md` — resolved)**: Unified project/room focus resolution behind `resolveWorldFocusScope` (`src/spatial/world-focus-scope.ts`), replaced `Feature: ... · <milestoneName>` in HUD cards with structured `sourceLabel` metadata while keeping `milestoneName` in 2D canvas/tooltips, converted `Overview`'s showcase card into a compact interactive summary strip, and replaced boolean `0/0` deliverable suppression with per-room `hydratedAtMs` cutoffs.
- **02 (`issues/02-async-git-adapter-and-echo-free-task-hydration.md` — resolved)**: Converted `createLiveGitWorkingTreeAdapter` to non-blocking async `runGitAsync` + parallel `scanGitStatusAsync`, made `git.draft.update` update in memory with zero `git` spawns, normalized `gitStatusCache` and `taskProgressCache` keys via `normalizeLocationDirectory`, restricted `scanProjectIssueTracker` to active uncommitted/open features, and stopped `GET /api/guild/git` from retiring open `docs/features` blueprints.
- **03 (`issues/03-delegated-commit-ledger-reconciler-and-overview-strip.md` — resolved)**: Eliminated duplicate listener stacking on `#btn-toggle-commit-dock` and `#btn-git-clear-draft`, bound `button[data-select-commit-project]` in both `Overview` and `Assembly & Commit`, preserved `.sheet-scroll-list` scroll positions, added immediate pending button states, stopped `clearCachedGitState(undefined)` global wipes when `🌐 All` is focused, and suppressed SSE `tasks.hydrated` echo loops.

## Not yet specified

<!-- in-scope fog you can't ticket yet; graduates as the frontier advances -->

## Out of scope

- Changing 2D canvas `Preparation Station` perimeter slots or `Dungeon Wilds` monster combat choreography.
