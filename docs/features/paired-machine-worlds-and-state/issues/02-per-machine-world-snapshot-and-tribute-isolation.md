# 02: Per-Machine World Snapshot, Session, Agent & Lifetime Tribute Isolation

Type: task
Label: wayfinder:task
Status: resolved
Blocked by: None

## Question

How should `OperatorWorkspaceRuntime`, `GuildChronicleStore`, and `location-normalization.ts` isolate **Workshop Rooms**, `0`-session registered worlds, **Guild Characters**, **Quest Gates**, **OpenCode Agent Modes**, and **Lifetime Tribute** per paired machine so switching machines or restarting the server never leaks state or local `/workspaces` paths from the Visualizer Host or another paired machine?

## Specification

Confirmed in Grilling Round 2 (`Q2`) and [Feature Specification](./../spec.md):

1. **Disable Visualizer Host `/workspaces` & `process.cwd()` Path Resolution for Remote Daemons (`src/state/location-normalization.ts`)**:
   - Update `resolveLocalProjectDir(projectDir, checkExists, daemonUrl?)` (and callers or active daemon context) so that when `daemonUrl` is a remote endpoint (`daemonUrl !== undefined && daemonUrl !== null && !isLocalDaemonEndpoint(daemonUrl)`), it returns `null` rather than resolving against `/workspaces/<basename>`, `process.cwd()`, or local directories on the Visualizer Host.
   - Ensure `isDeletedHostDirectory` continues to return `false` for remote daemons (`!isLocalDaemonEndpoint(daemonUrl)`).
2. **Complete Location & Session Discovery on Paired Machines (`src/ingress/daemon-http-client.ts`)**:
   - In `getLocations()`, check both `s?.location?.directory` and `(s as { directory?: string })?.directory` on `/api/session` items, and include `GET /api/location` (`directory` / `worktree`) as a location source so sessions and active directories on the paired machine are always discovered.
3. **Per-Machine Snapshot & Tribute Scoping (`src/server/operator-registry.ts`, `src/server/chronicle-sqlite-store.ts`, `src/server/chronicle-tribute-ledger.ts`)**:
   - Scope persisted snapshots (`world_snapshots`) and tribute ledger entries (`session_tribute_ledger`) by a machine-scoped operator key (e.g. `${operatorId}::${normalizeMachineScope(daemonUrl)}` when `daemonUrl` is present, with backward-compatible fallback to `operatorId` for legacy single-machine rows).
   - In `OperatorWorkspaceRuntime.pairDaemon` (`src/server/operator-registry.ts`):
     - When switching to a different machine (`isDifferentMachine`), do **not** merge `prevSnap.tributeLedger` from the previous machine into the new machine's snapshot.
     - Hydrate `stagingReducer` from the target machine's own persisted snapshot in `chronicleStore` (preserving any `0`-session worlds, tombstones, and tribute records previously saved for that specific machine) before running `ca.start(proxyReducer)`.
     - Unconditionally save `finalSnap` to `chronicleStore` for the active machine after `pairDaemon` completes—even when `Object.keys(finalSnap.rooms).length === 0`—so switching to an empty machine and restarting the server never reloads the previous machine's rooms.

## Acceptance Criteria

- [x] Switching from Machine A to Machine B (including when Machine B has `0` rooms) immediately clears Machine A's rooms, characters, Quest Gates, and **Lifetime Tribute** totals, and persists Machine B's snapshot so a server restart stays on Machine B's state.
- [x] Switching back from Machine B to Machine A restores Machine A's registered `0`-session worlds, tombstones, and **Lifetime Tribute** ledger.
- [x] When paired to a remote machine (`!isLocalDaemonEndpoint(daemonUrl)`), `resolveLocalProjectDir` never maps remote project paths to `/workspaces/<basename>` or `process.cwd()` on the Visualizer Host.
- [x] Every file under `src/` stays `<= 400` lines (`tests/00-architecture-invariants.test.ts`).

## Answer

Implemented in:
- `src/state/location-normalization.ts`: Added `markDirectoryDaemonScope` and guarded `resolveLocalProjectDir` so directories belonging to remote daemons (`!isLocalDaemonEndpoint(daemonUrl)`) never resolve to `/workspaces/<basename>` or `process.cwd()` on the Visualizer Host.
- `src/server/operator-registry.ts` & `src/server/chronicle-sqlite-store.ts`: Scoped persisted snapshots, session messages, and **Lifetime Tribute** records per `(operatorId, daemonUrl)` (`${operatorId}@@${cleanUrl}`), isolated `tributeLedger` on machine switches, and unconditionally saved the active machine's snapshot after `pairDaemon` even when `0` rooms exist.
- `src/ingress/daemon-http-client.ts`, `src/ingress/opencode-client-adapter.ts`, `src/ingress/daemon-location-state.ts`, `src/state/reducer-helpers.ts`: Filtered `0`-session OS drive/home roots (`/c`, `/c/Users`, `/c/Users/<user>`) and prevented caching `null` static catalogs when a remote request times out.
- Verified in `tests/48-paired-machine-worlds-and-state.test.ts` and deployed on `opencode-pixel-guild-visualizer` (`docs/images/paired-machine-worlds-and-state.png`).
