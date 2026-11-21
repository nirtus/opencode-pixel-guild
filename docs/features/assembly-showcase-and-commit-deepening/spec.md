# Feature Specification: Goal Assembly Showcase & Assembly Commit Ledger Deepening

Label: ready-for-agent

## Problem Statement

1. **Out-of-Place `Feature: ... · <milestoneName>` Row & Duplicate Overview Card (`src/web/commit-ledger-view.ts`, `src/encounter/assembly-results.ts`)**:
   - `ProjectTaskProgress.featureSlug` is overloaded with non-feature sentinel strings (`"Blueprint Ready"`, `"Working Tree Changes"`, `"All Guild Worlds (5 Projects)"`, `"<Project> Deliverables"`).
   - `renderOverviewAssemblyShowcaseCardHtml` (`src/web/commit-ledger-view.ts:55`) and `renderAssemblyShowcaseCardHtml` (`src/web/commit-ledger-view.ts:153`) unconditionally render `Feature: <strong>${featureSlug}</strong> · <span>${milestoneName}</span>`, leaking 2D canvas prop tier lore (`Foundation & Steam Conduit` / `Clockwork Engine & Automaton` / `Master Guild Monument (Airship)`) into HUD cards and producing incoherent strings like `Feature: All Guild Worlds (5 Projects) · Foundation & Steam Conduit`.
   - `scanProjectIssueTracker` (`src/ingress/issue-tracker-scanner.ts:134–160`) sorts all subdirectories of `docs/features/` by `mtimeMs` and picks `featureCandidates[0]` even when that feature was already resolved and committed in the past.
   - `Overview` duplicates the `Assembly & Commit` showcase card, and its **Project Mini-Assembly** pills (`button[data-select-commit-project]`) have no click listeners attached (`src/web/ledger-panel-reconciler.ts:216` only binds them when `activeSubtab === "assembly"`).

2. **All Info Disappears Across Sweeps, `🌐 All` View Switches, and `0/0` States (`src/encounter/assembly-results.ts`, `src/server/git-router.ts`, `src/web/app-main.ts`, `src/ingress/opencode-client-adapter.ts`)**:
   - **`0/0` Deliverable Suppression vs. Post-Commit Reset**: In `deriveGuildAssemblyShowcase` (`src/encounter/assembly-results.ts:85`), `if (prog !== undefined) roomsWithHydratedProgress.add(room.roomId)` treats an initial `0/0 Blueprint Ready` room as "hydrated", skipping all session quests, **Squad Subagent** reports, modified files, and fixed issues (`lines 140–261`). When a single project is focused in `Overview`, `totalParts <= 0 && deliverables.length === 0` makes `renderOverviewAssemblyShowcaseCardHtml` return `""` so the entire card vanishes.
   - **`GET /api/guild/git` Wipes Open Features**: In `syncRoomTaskProgress` (`src/server/git-router.ts:64–75`), whenever `prevProg?.source === "docs/features"` and `state.isClean` is `true`, a read-only `GET /api/guild/git` immediately calls `retireCompletedFeatureSlug(prevProg.featureSlug)` and dispatches `BLUEPRINT_READY_TASK_PROGRESS` (`0/0`), erasing even open (`0/N`) or in-progress (`2/N`) feature blueprints.
   - **`🌐 All` Cache & Draft Wipe**: In `src/web/app-main.ts:266`, when `🌐 All` is focused (`getSelectedProjectRoom() === null`), every `tasks.hydrated` or `session.idle` SSE frame calls `clearCachedGitState(undefined)` (`src/web/commit-ledger-controller.ts:50–64`), wiping `cachedGitStateByRoom` and `localDraftByRoom` across **all** rooms.
   - **15s Sweep Cache-Key Mismatch**: `opencode-client-adapter.ts:149–155` caches `deriveProjectTaskProgress` under raw `locMeta.rawDirectory::sessionCount` and attaches `roomId: targetCanonDir` on background sweeps, overwriting updated reducer `taskProgress` with stale cached values.

3. **Buggy & Laggy Assembly Committing (`src/ingress/git-working-tree.ts`, `src/server/git-router.ts`, `src/web/commit-ledger-controller.ts`)**:
   - **8–14 Blocking `execFileSync("git")` Calls per Action**: `createLiveGitWorkingTreeAdapter` (`src/ingress/git-working-tree.ts`) uses synchronous `runGit` and `scanGitStatusSync` (up to 4 sequential blocking spawns per scan) instead of async `runGitAsync` / `scanGitStatusAsync`.
   - **SSE Echo Loop**: `POST /api/guild/git` dispatches `tasks.hydrated` -> broadcasts over SSE -> `app-main.ts:263` receives `tasks.hydrated` and immediately fires a duplicate `GET /api/guild/git` (`refreshRoomGitState`), invalidating the cache and running 4 more `git` spawns.
   - **Draft Typing & Diff Preview Overhead**: `git.draft.update` (every 350ms while typing) calls `buildState` -> `scanGitStatusSync`, and `GET /api/guild/git?file=...` re-runs full `getStatus` + `syncRoomTaskProgress` + `getSnapshot()`.
   - **Broken Commit Dock Toggle (`#btn-toggle-commit-dock`)**: `reconcileCommitLedgerDockWithContext` reuses the DOM card in `#sheet-interactive-slot`, while `bindCommitLedgerControls` (`src/web/commit-ledger-controller.ts:251, 272`) attaches a new click listener to `#btn-toggle-commit-dock` and `#btn-git-clear-draft` on every render without a `data-bound-room` guard. When an even number of listeners stack, clicking `Compose Commit ▴ / Collapse ▾` toggles `isCommitFormExpanded` an even number of times and does nothing.

## Architectural Solution (`@improve-codebase-architecture`)

See `docs/architecture-review/architecture-review-20261109-assembly-showcase-and-commit-deepening.html` for the full architectural review and diagrams.

### 1. Deepen World Focus Scope & Guild Results Showcase Derivation (`src/spatial/project-world.ts`, `src/encounter/assembly-results.ts`, `src/encounter/project-mini-assemblies.ts`, `src/hud/guild-ledger-vm.ts`, `src/web/commit-ledger-view.ts`)
- Unify project/room focus resolution behind `resolveWorldFocusScope` in `src/spatial/project-world.ts` so `spatial`, `encounter`, `hud`, and `web` share one canonical resolution of `isMultiProjectScope`, `selectedProjectRoom` (`null` when `🌐 All` is active), `scopedRooms`, and `scopedCharacters`.
- Extend `GuildAssemblyShowcaseState` (and `GuildMasterLedgerViewModel["activeGoalAssembly"]`) with structured source metadata (`sourceLabel`: e.g. `"🌿 Working Tree (1/2 staged)"`, `"📐 Feature Blueprint: <slug> (2/5)"`, `"⚔️ Session Deliverables"`, `"🌐 Multi-Project Assembly (4 worlds)"`, or `"✨ Blueprint Ready"`).
- Remove `Feature: <strong>...</strong> · <span>${milestoneName}</span>` from `renderOverviewAssemblyShowcaseCardHtml` and `renderAssemblyShowcaseCardHtml` (`src/web/commit-ledger-view.ts`), keeping `milestoneName` strictly inside the 2D canvas **Goal Assembly Site** painter and hover tooltip.
- Replace `prog !== undefined` character deliverable suppression in `deriveGuildAssemblyShowcase` with a per-room post-commit / explicit-blueprint rule:
  - When a room has explicit `taskProgress` tasks (`totalTasks > 0`), explicit deliverables drive the assembly parts.
  - When `totalTasks === 0` (`Blueprint Ready`), character deliverables (`file-change`, `issue-fixed`, `subagent`, `quest`) are only suppressed if their activity timestamp is `<= room.lastCommittedAtMs` (or when `taskProgress` was explicitly hydrated at a timestamp `>= ch.lastActivityAtMs` after commit/sync with `0` uncommitted files), so active/new session quests and tool deliverables never disappear on boot while post-commit `0/0 Blueprint Ready` resets cleanly (`tests/33` Slice 1, 3, and 4).
- Make `renderOverviewAssemblyShowcaseCardHtml` a compact interactive summary strip in `Overview` (with working `data-select-commit-project` pills and no redundant `Open Assembly & Commit` button).

### 2. Deepen `GitWorkingTreePort` Async Adapter, Issue Tracker Scanner & Server Route Seam (`src/ingress/git-working-tree.ts`, `src/ingress/git-status-scanner.ts`, `src/ingress/issue-tracker-scanner.ts`, `src/server/git-router.ts`)
- Convert `createLiveGitWorkingTreeAdapter` (`src/ingress/git-working-tree.ts`) to use non-blocking async `runGitAsync` and `scanGitStatusAsync` (`src/ingress/git-status-scanner.ts`), running `git log -1` and `git diff --numstat` in parallel after `git status --porcelain=v1 -b -u`, and batching `git reset` / `git checkout` paths in `discardFiles`.
- Make `updateDraft` (`git.draft.update` / `git.draft.clear`) update the in-memory `draftsByRoom` map and return cached status without spawning `git`.
- In `tryHandleGuildGitRoute` (`src/server/git-router.ts`):
  - Only retire a `docs/features` slug (`retireCompletedFeatureSlug`) on `git.commit` completion (or when `resolvedTasks >= totalTasks` and `isCompletedFeatureCommittedInGit` is true)—never retire an open or in-progress feature on `GET /api/guild/git` or `git.status`.
  - When `GET /api/guild/git` includes `?file=...` for diff preview, use cached status if available so clicking a file row returns its diff immediately.
  - Record `lastCommittedAtMs` / `taskProgress` hydration timestamp cleanly on commit so post-commit `0/0 Blueprint Ready` resets without resurrecting pre-commit session tools.
- In `scanProjectIssueTracker` and `deriveProjectTaskProgress` (`src/ingress/issue-tracker-scanner.ts`):
  - Normalize all `taskProgressCache` keys via `normalizeLocationDirectory(projectDir)`.
  - Ensure `scanProjectIssueTracker` only returns a `docs/features/<slug>` candidate when it has unresolved tasks (`resolvedTasks < totalTasks`) or uncommitted files under `docs/features/<slug>/` (skipping historical already-committed features).

### 3. Consolidate Delegated `Assembly Commit Ledger` Client Reconciler (`src/web/commit-ledger-controller.ts`, `src/web/commit-ledger-view.ts`, `src/web/ledger-panel-reconciler.ts`, `src/web/app-main.ts`)
- Replace per-render `addEventListener` loops in `commit-ledger-controller.ts` and `ledger-panel-reconciler.ts` with container-level delegated event handling (`data-ledger-bound="1"` on `container`), permanently fixing the duplicate-listener bug on `#btn-toggle-commit-dock` and `#btn-git-clear-draft` and enabling `button[data-select-commit-project]` clicks in both `Overview` and `Assembly & Commit`.
- Guard `clearCachedGitState(roomId)` on SSE events in `src/web/app-main.ts` so `room === null` (`🌐 All` mode) never triggers a global wipe of `cachedGitStateByRoom` or `localDraftByRoom`, and suppress the redundant follow-up `GET /api/guild/git` echo when `POST /api/guild/git` just updated the room's Git state.
- Guard `clientState.currentSnapshot = payload.snapshot` with version comparison (`payload.snapshot.version >= clientState.currentSnapshot.version`) and `syncClientViewedSessionsToSnapshot`.
- Preserve `.sheet-scroll-list` scroll positions across `staticSlot` renders and show immediate pending button feedback (`Staging...`, `Unstaging...`, `Discarding...`, `Committing...`, `Syncing...`).

## Testing & Verification Decisions

1. **Architecture Invariants (`tests/00-architecture-invariants.test.ts`)**:
   - Every file under `src/` must remain strictly `<= 400` lines.
2. **Unit & Integration Tests (`tests/26-assembly-commit-ledger-deepening.test.ts` & `tests/33-assembly-results-showcase.test.ts`)**:
   - Verify HUD cards no longer render `Feature: All Guild Worlds ... · Foundation & Steam Conduit` and instead display truthful source/scope labels while keeping `milestoneName` in 2D canvas tooltips.
   - Verify `GET /api/guild/git` on a clean working tree does NOT retire an open/in-progress `docs/features/<slug>` blueprint.
   - Verify `clearCachedGitState` on SSE events when `🌐 All` is focused (`room === null`) does NOT wipe cached Git states or commit drafts for project rooms.
   - Verify repeated renders of `renderGuildMasterLedgerPanel` do NOT stack duplicate click listeners on `#btn-toggle-commit-dock` (clicking toggles `clientState.isCommitFormExpanded` reliably every time), and clicking project mini-assembly pills in `Overview` selects the target project.
   - Verify `createLiveGitWorkingTreeAdapter` executes asynchronously and `updateDraft` does not re-scan Git.
3. **Docker Container Deployment & Visual Proof (`opencode-pixel-guild-visualizer` on port `4310`)**:
   - Deploy via `npm run docker:up`, run `npm test`, capture `docs/images/assembly-showcase-and-commit-deepening.png` via headless Chrome, and visually verify via `read`.
