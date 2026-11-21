# 02: SSE Auto-Reconnect & Viewed Session Recency Hydration

Type: task
Label: ready-for-agent
Status: resolved

**What to build:** Make the OpenCode V2 daemon HTTP client's `/api/event` SSE subscription automatically reconnect on stream disconnect/error while active, and include `time.viewed` alongside `time.updated` and `time.created` during location state hydration so existing sessions opened or switched to in the OpenCode TUI immediately appear as active **Guild Adventurers** in their **Workshop Room**.

**Blocked by:** 01: Self-Healing Daemon Discovery & Refresh Reconnection

**Status:** resolved

- [x] `subscribeEvents` in the daemon HTTP client automatically reconnects to `/api/event` (with a configurable retry delay) if the stream closes or errors while not aborted, cleanly stopping when the returned `unsubscribe()` function is called.
- [x] Location state hydration reads `s.time?.viewed` in addition to `s.time?.updated` and `s.time?.created`, computing `updatedAtMs = Math.max(s.time?.updated ?? 0, s.time?.viewed ?? 0, s.time?.created ?? 0)` when timestamps are present.
- [x] A session whose `time.updated` is older than 10 minutes but whose `time.viewed` is within the 10-minute active window is marked `isOpenInOpenCode: true` (unless archived) and sorted by its latest activity/view timestamp so it is visible in `Active Squads` roster mode.
- [x] All files under `src/` remain strictly `<= 400` lines (`tests/00-architecture-invariants.test.ts`).
- [x] Automated tests verify SSE stream auto-reconnection after disconnect and `isOpenInOpenCode: true` hydration for recently viewed sessions.

## Answer

Updated `subscribeEvents` in `src/ingress/daemon-http-client.ts` with a retry loop while `!controller.signal.aborted`, added `resolveSessionActivityMs` in `src/ingress/daemon-location-state.ts` to incorporate `s.time?.viewed` into `updatedAtMs`, `isOpenInOpenCode`, and root session sorting, and woke `Archived` sessions to `RestingInLounge` in `src/state/session-handlers.ts` when `isOpenInOpenCode` becomes `true`. Verified in `tests/14-live-daemon-auto-discovery-and-session-sync.test.ts`.
