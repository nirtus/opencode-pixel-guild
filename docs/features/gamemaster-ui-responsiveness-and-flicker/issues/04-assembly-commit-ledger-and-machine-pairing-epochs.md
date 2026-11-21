# 04: Assembly Commit Ledger Git CRUD & OpenCode Machine Pairing (Persistent Spinners & Epoch-Guarded Caches)

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01: Keyed Spectator Drawer Reconciler, Hover Stability & Monotonic Snapshot Gate

**What to build:** Deliver render-persistent `⏳` loading spinners and epoch-guarded cache consistency across the **Assembly Commit Ledger** (`Stage`, `Unstage`, `Discard`, `Stage All`, `Unstage All`, `Sync Git`, `Commit`) and **OpenCode Machine Pairing** controls (`Switch`, `Reconnect`, `Remove`, `Pair`, `Save Profile`), eliminate synchronous Git subprocess stalls in task progress derivation, update documentation, and verify on the live `opencode-pixel-guild-visualizer` Docker container.

**Blocked by:** `01: Keyed Spectator Drawer Reconciler, Hover Stability & Monotonic Snapshot Gate`

**Status:** resolved

## Acceptance Criteria

- [x] Every source file remains strictly `<= 400` lines (`tests/00-architecture-invariants.test.ts`).
- [x] **Render-Persistent `⏳` Spinners in Assembly Commit Ledger & Machine Pairing**:
  - Track per-file in-flight Git actions (`inFlightFileActionsByRoom`: `"stage" | "unstage" | "discard"` keyed by `roomId` and `filePath`) alongside `inFlightActionByRoom` (`"git.stage" | "git.unstage" | "git.sync" | "git.commit"`) so per-file `Stage`, `Unstage`, and `Discard` buttons remain `disabled` with `"⏳ Staging..."`, `"⏳ Unstaging..."`, or `"⏳ Discarding..."` across any SSE frames while `POST /api/guild/git` is in flight, updating the file list authoritatively when the server responds.
  - Track `pendingOperatorAction` across top-bar machine switch buttons (`button[data-machine-switch-id]`) and **Guild Operator Account & Profile Settings** modal buttons (`Switch`, `Reconnect`, `Remove`, `Pair`, `Save Profile`), rendering `disabled` + `"⏳ ..."` until the server response settles.
- [x] **Epoch-Guarded Server & Client Git Caches and Operator Profile Cache**:
  - Add a monotonic `gitCacheEpochByDir` counter to `git-status-scanner.ts` incremented by `invalidateGitStatusCache` and `storeCachedGitStatus`; when an in-flight `scanGitStatusAsync` finishes, only write to `gitStatusCache` if the directory's epoch matches the epoch at scan start—preventing background scans from writing pre-discard or pre-stage file lists back into the cache.
  - Add a monotonic `clientGitMutationEpochByRoom` counter to `commit-ledger-controller.ts` incremented when `postGitAction` starts and finishes; `refreshRoomGitState` (`GET /api/guild/git`) must ignore its response if the room's mutation epoch advanced while the `GET` was in flight, and `wasRoomGitMutatedRecently` must return `true` whenever `inFlightActionByRoom.has(roomId)` or a file action is in flight for that room (stopping double `refreshRoomGitState` echo loops on `tool.completed` / `tasks.hydrated`).
  - Add a monotonic request epoch to `refreshCachedOperatorProfile()` bumped on every operator/machine mutation (`POST` / `PATCH` / `DELETE` on `/api/guild/users/me*`) so overlapping `GET /api/guild/users/me` responses never overwrite `cachedProfile` and resurrect a removed machine.
- [x] **Non-Blocking Git Task Progress Derivation**:
  - Ensure `deriveRoomTaskProgressForGitState` uses the already-scanned `gitStatus` cleanliness and dirty file list without blocking the server event loop on redundant synchronous `execFileSync("git")` calls when the working tree is clean.
- [x] **Documentation, Docker Deployment & Visual Proof**:
  - Update `README.md` and `GLOSSARY.md` to document the deepened Gamemaster HUD responsiveness, hover stability, persistent loading spinners, and non-resurrection guarantees.
  - Deploy to `opencode-pixel-guild-visualizer` (`npm run docker:up` on port `4310`), verify `npm test` passes 100%, capture `docs/images/gamemaster-ui-responsiveness-and-flicker.png` via headless Chrome, and visually inspect via `read`.

## Answer

- Added monotonic `gitCacheEpochByDir` / `globalGitCacheEpoch` in `src/ingress/git-status-scanner.ts` so in-flight `scanGitStatusAsync` promises never overwrite `gitStatusCache` after `invalidateGitStatusCache`.
- Added `inFlightFileActionsByRoom` and `clientGitMutationEpochByRoom` in `src/web/commit-ledger-controller.ts` and `src/web/commit-ledger-view.ts` so per-file `Stage`, `Unstage`, and `Discard` buttons render persistent `⏳ Staging...` / `⏳ Unstaging...` / `⏳ Discarding...` spinners across SSE frames and drop stale in-flight `GET /api/guild/git` responses.
- Wired `getPendingOperatorAction()` into `src/web/operator-modal-views.ts` and `src/web/top-bar-reconciler.ts`, fast-pathed `scanProjectIssueTracker` in `src/ingress/issue-tracker-scanner.ts` when no `docs/features/` files are dirty, updated `README.md` and `GLOSSARY.md`, and verified on the `opencode-pixel-guild-visualizer` Docker container.
