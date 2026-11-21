# 03: Unified Git & Assembly State Synchronization Across Server & Client

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01, 02

**What to build:** Synchronize `syncRoomTaskProgress` (`src/server/git-router.ts`) and client Git/assembly state (`src/web/commit-ledger-controller.ts`, `src/web/top-bar-reconciler.ts`, `src/web/app-main.ts`, `src/web/ledger-panel-reconciler.ts`) so that opening or switching to a project world immediately reconciles Git working-tree cleanliness and `room.taskProgress` across all **Guild Master Ledger** subtabs (`Overview` and `Assembly & Commit`) and the 2D **Goal Assembly Site** canvas, then deploy and verify on the Docker container (`opencode-pixel-guild-visualizer` on port `4310`).

## Acceptance Criteria

- [x] Keep all files under `src/` strictly `<= 400` lines (`tests/00-architecture-invariants.test.ts`).
- [x] In `src/server/git-router.ts` (`syncRoomTaskProgress`, `lines 74–151`):
  - When `state.isClean` is `true`, always reconcile `nextProg` to `BLUEPRINT_READY_TASK_PROGRESS` (`0/0 Blueprint Ready`) and dispatch `tasks.hydrated` whenever `prevProg` was not already `0/0 Blueprint Ready` (never leaving an open `docs/features` progress stuck on a room when `state.isClean` is `true`).
- [x] In `src/web/top-bar-reconciler.ts`, `src/web/app-main.ts`, and `src/web/commit-ledger-controller.ts`:
  - Call `refreshRoomGitState(room.roomId)` on boot and whenever the user selects a project world in the top bar or `Overview` mini-assembly strip—even when `clientState.ledgerSubtab === "overview"`—so `GET /api/guild/git` immediately reconciles server `room.taskProgress` with live Git working-tree status.
  - Ensure that if `getCachedGitState(room.roomId)?.isClean === true`, the client never renders stale non-zero `room.taskProgress` while awaiting snapshot propagation.
- [x] Update `README.md`, `GLOSSARY.md`, and `docs/adr/0002-uncommitted-working-tree-assembly-truth.md` to reflect the uncommitted working-tree assembly truth architecture.
- [x] Deploy to the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`), run `npm test`, capture a live screenshot (`docs/images/assembly-working-tree-truth-refactor.png`), and visually verify via `read` that a clean project shows `0/0 ✨ Blueprint Ready` on both the 2D Canvas and the **Guild Master Ledger**.

## Answer

- Updated `syncRoomTaskProgress` in `src/server/git-router.ts` so `state.isClean === true` unconditionally transitions `room.taskProgress` to `BLUEPRINT_READY_TASK_PROGRESS` (`0/0 Blueprint Ready`).
- Enabled eager `refreshRoomGitState(room.roomId)` across `src/web/top-bar-reconciler.ts`, `src/web/app-main.ts`, and `src/web/ledger-panel-reconciler.ts` on boot and project switch regardless of active subtab (`Overview` or `Assembly & Commit`), and updated `applyServerSnapshot` in `src/web/commit-ledger-controller.ts` to reconcile `room.taskProgress` even across concurrent `timer.tick` version bumps.
- Updated `README.md`, `GLOSSARY.md`, `docs/adr/0001-unified-host-workshop-room-and-project-heraldry.md`, and `docs/adr/0002-uncommitted-working-tree-assembly-truth.md`, deployed to the `opencode-pixel-guild-visualizer` Docker container (`4310:4310`), verified all 312 tests pass (`npm test`), and captured/inspected `docs/images/assembly-working-tree-truth-refactor.png`.
