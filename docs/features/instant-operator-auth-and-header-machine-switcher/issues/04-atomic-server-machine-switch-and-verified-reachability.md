# 04: Atomic Server Machine-Switch World Reset & Verified Daemon Reachability

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01

**What to build:** Deepen `OperatorWorkspaceRuntime.pairDaemon`, `createHttpOpenCodeDaemonClient`, and `WorldStateReducer` so switching or pairing an **OpenCode Machine Pairing** verifies real HTTP reachability (never marking offline daemons as `🟢 Connected`), unconditionally clears the previous machine's **Workshop Rooms** and characters even when the target machine has zero rooms or is offline, preserves hydrated catalogs, and immediately broadcasts the replacement snapshot to SSE subscribers.

- [x] Update `src/ingress/daemon-http-client.ts` and `src/server/operator-registry.ts` so `pairDaemon` probes/verifies HTTP reachability against the target OpenCode daemon and, on connection or HTTP auth failure, marks both `runtime.profile.reachable = false` and the matching `pairedMachines` entry `reachable = false` with an explicit `errorMessage`.
- [x] In `OperatorWorkspaceRuntime.pairDaemon` (`src/server/operator-registry.ts`), unconditionally reset `runtime.reducer` (`reducer.reset({ adapter: "opencode-client", daemonUrl: cleanUrl })`) when switching machines rather than only when `Object.keys(stagedSnap.rooms).length > 0`, and stop `clientAdapter` + reset `reducer` when the last paired machine is removed in `removeOperatorMachine`.
- [x] Update `hydrateFromSnapshot` in `src/state/world-reducer.ts` to preserve/hydrate `catalog` and emit a state transition to `state.subscribers` so connected SSE clients receive the new machine's snapshot immediately.
- [x] Guard `registerOperator`, `updateOperatorProfile`, and `pairOperatorMachine` in `src/server/operator-registry.ts` so explicit registration validates non-empty `username`/`password`, profile username updates check for duplicates (`409`), and unauthenticated `PATCH /api/guild/users/me` calls do not create phantom operators when `requireAuth: true`.
- [x] Add unit and integration tests in `tests/16-user-auth-station-choreography-and-live-git.test.ts` and `tests/17-mandatory-auth-gate-and-opencode-tunnel-qr-pairing.test.ts` verifying machine switching to empty/offline daemons, honest `reachable: false` status, SSE emission on snapshot hydration, and `requireAuth` guards, keeping all source files `<= 400` lines.

## Answer

Updated `createHttpOpenCodeDaemonClient` to surface transport/HTTP errors when all initial sweep probes fail, updated `OperatorWorkspaceRuntime.pairDaemon` to reset `reducer` whenever switching machines (even when the new machine has 0 rooms or is offline) and sync `reachable = false` onto both `profile` and `pairedMachines`, updated `hydrateFromSnapshot` to emit to SSE subscribers, and guarded `updateOperatorProfile` against unauthenticated phantom operator creation.
