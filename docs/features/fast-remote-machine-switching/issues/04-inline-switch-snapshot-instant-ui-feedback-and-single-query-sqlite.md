# 04: Inline Switch Snapshot, Preserved SSE Stream, Instant UI Feedback & Single-Query SQLite Load

Type: task
Label: ready-for-agent
Status: open
Blocked by: 01, 02, 03

## What to build

Eliminate redundant client-server round-trips, unnecessary SSE teardown/reconnection, delayed switch spinner feedback (**R8**), and N+1 SQLite message reads (**R9**) so the browser reflects a completed machine switch immediately and streams Phase B background updates seamlessly.

1. **Return `snapshot` Inline from Machine Activation & Pairing (`src/server/operator-registry.ts`, `src/server/operator-routes.ts`)**:
   - In `pairOperatorMachine`, `updateOperatorMachine`, and `removeOperatorMachine` (`src/server/operator-registry.ts`), include `snapshot: runtime.reducer.getSnapshot()` in the returned payload (preserving all existing operator profile fields for full backwards compatibility).
   - Ensure `stripPrivateOperatorFields` / callers do not leak private tokens/passwords when attaching `snapshot`.

2. **Consume Inline Snapshot, Keep Live SSE Open Across Machine Switches & Instant Spinner Feedback (`src/web/operator-pairing-controller.ts`, `src/web/app-main.ts`)**:
   - In `dispatchOperatorModalAction()` (`src/web/operator-pairing-controller.ts:128–194`):
     - Right after `setPendingOperatorAction(...)`, call `onStateChanged()` immediately so the clicked machine pill switches to `⏳ Switching...` on frame 1 (rather than waiting up to 1s for the next SSE tick).
     - When `action === "activate-machine"`, look up the target machine's `daemonUrl` from `cachedProfile?.pairedMachines` and call `setExpectedMachineDaemonUrl(targetMachine.daemonUrl)` immediately before awaiting `PATCH` (falling back to `null` only if unknown).
     - When `payload?.snapshot` is returned by `PATCH /api/guild/users/me/machines/:id` or `POST /api/guild/users/me/machines`, apply `payload.snapshot` directly via `applyAuthoritativeSnapshot(payload.snapshot, { allowVersionReset: true })` and **skip** the redundant `GET /api/guild/snapshot` fetch in `refreshSnapshotAndRender()`.
   - Separate same-operator machine switching (`"guild-machine-changed"`) from account/operator changes (`"guild-operator-changed"`):
     - In `src/web/app-main.ts`, handle `"guild-machine-changed"` by re-fitting the camera and reconciling the top bar, side panel, and ticker **without** closing and reopening `EventSource("/api/guild/events")` when `activeEventSource` is already `OPEN` for the same `operatorId` (eliminating the 3rd full snapshot transfer and ensuring background `tasks.hydrated` / transcript deltas arrive without interruption).
     - Keep `"guild-operator-changed"` reopening `EventSource` on login, register, logout, and account deletion (where `operatorId` changes).

3. **Replace N+1 SQLite Message Queries on `loadSnapshot` (`src/server/chronicle-sqlite-store.ts`)**:
   - In `loadSnapshot(operatorId)` (`src/server/chronicle-sqlite-store.ts:321–335`), replace the per-character `getSessionMessages(operatorId, ch.sessionId)` loop with **one single prepared `SELECT`** over `session_messages WHERE operator_id = ? ORDER BY session_id ASC, created_at_ms ASC`, grouped into a `Map<string, SessionChatMessage[]>` in memory before reconciling characters.
   - Keep `src/server/chronicle-sqlite-store.ts` strictly `<= 400` lines (currently 388 lines; keep the refactor net-neutral or extract a small row-mapping helper if needed).

## Acceptance Criteria

- [ ] `PATCH /api/guild/users/me/machines/:id` (`{ activate: true }`) returns HTTP 200 with both the updated operator profile and `snapshot` matching `GET /api/guild/snapshot`.
- [ ] In `dispatchOperatorModalAction("activate-machine", ...)`, `onStateChanged()` is invoked synchronously before the `PATCH` fetch resolves so `⏳ Switching...` renders immediately, and zero extra `GET /api/guild/snapshot` fetch is made when `payload.snapshot` is present.
- [ ] Switching machines for the same authenticated operator keeps the existing `EventSource` open instead of closing and re-opening `/api/guild/events`, while login/logout still re-opens `EventSource`.
- [ ] `chronicleStore.loadSnapshot(machineScopeKey)` loads messages for all characters in 1 SQL query instead of N queries and preserves identical message reconciliation output.
- [ ] All source files under `src/` remain `<= 400` lines (`tests/00-architecture-invariants.test.ts`).
