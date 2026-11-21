# 03: Quest Gate Resolution & Unread Session Results (Persistent Spinners, `frm_`/`call_` Suppression & Idle Tolerance)

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01: Keyed Spectator Drawer Reconciler, Hover Stability & Monotonic Snapshot Gate

**What to build:** Deliver immediate, render-persistent `⏳ Sending...` button feedback and permanent non-resurrection when a **Guild Operator** resolves a **Quest Gate** (`✓ Allow Once`, `✓✓ Always`, `✕ Reject`, or `Send Answer ↵`) or clicks a row in **Completed Session Results (Unread)** to inspect a finished hero's work.

**Blocked by:** `01: Keyed Spectator Drawer Reconciler, Hover Stability & Monotonic Snapshot Gate`

**Status:** resolved

## Acceptance Criteria

- [x] Every source file remains strictly `<= 400` lines (`tests/00-architecture-invariants.test.ts`).
- [x] **Render-Persistent `⏳ Sending...` Spinners & Immediate UI Sync on Quest Gate Resolution**:
  - When the user clicks `#btn-gate-allow-once`, `#btn-gate-allow-always`, `#btn-gate-reject`, or `#btn-gate-submit-answer` (or presses `Enter` in `.gate-custom-input`), record the gate in `resolvingGateIds`, disable the gate action buttons with `"⏳ Sending..."` across SSE frames, call `onStateChanged()` immediately on click, and call `onStateChanged()` again when `dispatchCommand` settles (rolling back `markClientGateResolved` only if the command fails).
- [x] **Unified `call_...` & `frm_...` Quest Gate Suppression Across Sweeps & Badges**:
  - In `isQuestionReasonAlreadyResolved` and `handleStreamReconnected`, remove the `gateId.startsWith("frm_")` bypass so `/api/form` (`frm_...`) gates matching an already-resolved `call_...` question prompt for the same session remain suppressed during post-command location sweeps.
  - Check `isClientGateResolved(c.questGate?.gateId, c.sessionId, c.questGate?.reason)` inside `isCharacterWaitingAtGate` so resolved **Quest Gates** immediately clear from the **Guild Master Ledger** `⚠️ Open Quest Gates` alert card, roster badges, and the `🧙‍♂️ Hero ⚠️N` tab counter.
- [x] **Permanent Non-Resurrection of Acknowledged Completed Session Results (Unread)**:
  - In `syncClientViewedSessionsToSnapshot`, apply a `5_000ms` daemon-idle settlement tolerance around the acknowledged `idleAtMs` when a character is in `RestingInLounge` (or compacting into `RestingInLounge`) so trailing 1.5s location sweeps whose daemon `s.time.idle` is slightly newer than `viewedTs` do not evict `clientViewedAtBySession` and resurrect the unread result card.
  - Ensure `applyAuthoritativeSnapshot` runs `syncClientViewedSessionsToSnapshot` on every incoming SSE and HTTP snapshot before any HUD reconciler reads `hasCharacterUnviewedResult`.
- [x] Add automated tests verifying persistent `⏳ Sending...` state on **Quest Gate** buttons, non-resurrection when a `call_...` question gate is followed by a sweep returning a `frm_...` form with the same prompt, and non-resurrection of acknowledged **Completed Session Results (Unread)** across post-view location sweeps with `+1ms..+2000ms` daemon `idle` timestamps.

## Answer

- Updated `src/web/quest-gate-card.ts` to disable permission and question submit buttons with `"⏳ Sending..."` (`markGateResolving`), call `onStateChanged()` immediately on click, and reconcile again when `dispatchCommand` settles.
- Updated `src/state/quest-gate-handlers.ts` (`isQuestionReasonAlreadyResolved`), `src/state/batch-reconciler.ts` (`handleStreamReconnected`), and `src/web/client-state.ts` (`isCharacterWaitingAtGate`) to suppress `/api/form` (`frm_...`) gates whose session question reason was already resolved under a `call_...` tool ID and immediately clear Ledger/Hero gate badges.
- Updated `src/web/command-scroll-controller.ts` (`syncClientViewedSessionsToSnapshot` and `acknowledgeSessionResultAsRead`) to track `acknowledgedIdleAtBySession` and apply a `5_000ms` daemon-idle settlement tolerance while `RestingInLounge` so trailing sweeps never resurrect acknowledged unread results.
