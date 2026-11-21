# 03: Delegated Assembly Commit Ledger Reconciler, Echo Suppression & Live Container Verification

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01, 02

**What to build:** Consolidate the client **Assembly Commit Ledger** module (`src/web/commit-ledger-controller.ts`, `src/web/commit-ledger-view.ts`, `src/web/ledger-panel-reconciler.ts`, and `src/web/app-main.ts`) behind container-delegated event handling, room-scoped cache invalidation, SSE echo suppression, scroll-position preservation, and immediate button pending states, then deploy and verify on the `opencode-pixel-guild-visualizer` Docker container (`port 4310`).

## Acceptance Criteria

- [x] Keep all files under `src/` strictly `<= 400` lines (`tests/00-architecture-invariants.test.ts`).
- [x] In `src/web/commit-ledger-controller.ts` and `src/web/ledger-panel-reconciler.ts`:
  - Replace per-render `addEventListener` attachment on `#btn-toggle-commit-dock`, `#btn-git-clear-draft`, Stage/Unstage/Discard/Preview buttons, and `button[data-select-commit-project]` with idempotent delegated event binding on the panel container so repeated renders never stack duplicate listeners on `#btn-toggle-commit-dock` and project mini-assembly pills work in both `Overview` and `Assembly & Commit`.
  - Add immediate pending button feedback (`Staging...`, `Unstaging...`, `Discarding...`, `Syncing...`, `Committing...`) while a Git action is in flight, and preserve in-flight state across concurrent renders.
  - Preserve `.sheet-scroll-list` scroll positions when updating `staticSlot.innerHTML`.
  - Guard `clientState.currentSnapshot = payload.snapshot` with version comparison (`payload.snapshot.version >= clientState.currentSnapshot.version`) and `syncClientViewedSessionsToSnapshot`.
- [x] In `src/web/app-main.ts` and `src/web/commit-ledger-controller.ts`:
  - Never call `clearCachedGitState(undefined)` on SSE `tasks.hydrated` or `session.idle` when `getSelectedProjectRoom()` is `null` (`🌐 All` mode); only invalidate the specific room from `deltaRoomId` (without wiping `localDraftByRoom`).
  - Track the timestamp/revision of the latest `POST /api/guild/git` mutation per room so the immediate SSE `tasks.hydrated` echo from that `POST` does not trigger a redundant follow-up `GET /api/guild/git` (`refreshRoomGitState`).
- [x] Add regression tests in `tests/26-assembly-commit-ledger-deepening.test.ts` verifying:
  - Calling `renderGuildMasterLedgerPanel` multiple times in a row does not attach duplicate click listeners to `#btn-toggle-commit-dock` (clicking toggles `clientState.isCommitFormExpanded` reliably every time).
  - Clicking `button[data-select-commit-project]` in the `Overview` subtab selects the target project repository.
  - SSE `tasks.hydrated` while `🌐 All` is focused (`selectedProjectId === null`) preserves `localDraftByRoom` and per-room cached Git state.
- [x] Update `README.md`, `GLOSSARY.md`, and feature map/tickets, deploy to the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`), run `npm test`, capture `docs/images/assembly-showcase-and-commit-deepening.png` via headless Chrome, and visually inspect via `read`.

## Answer

- Updated `bindCommitLedgerControls` (`src/web/commit-ledger-controller.ts`) with idempotent `data-bound-room` guards and a module-scoped `activeControlContext` ref on `#btn-toggle-commit-dock` and `#btn-git-clear-draft`, added immediate pending button states (`⏳ Staging...`, `⏳ Unstaging...`, `⏳ Discarding...`, `⏳ Syncing...`, `⏳ Committing...`), guarded `applyServerSnapshot` with version comparison + `syncClientViewedSessionsToSnapshot`, and added `invalidateRoomGitCache` and `wasRoomGitMutatedRecently`.
- Updated `renderGuildMasterLedgerPanel` (`src/web/ledger-panel-reconciler.ts`) to bind `button[data-select-commit-project]` across both `Overview` and `Assembly & Commit` subtabs and preserve `.sheet-scroll-list` `scrollTop` positions across `staticSlot.innerHTML` updates.
- Updated `src/web/app-main.ts` to suppress SSE `tasks.hydrated` echoes after `POST /api/guild/git` mutations and call room-scoped `invalidateRoomGitCache(deltaRoomId)` instead of `clearCachedGitState(room?.roomId)`.
- Added `Ticket 05` regression tests in `tests/26-assembly-commit-ledger-deepening.test.ts`.
