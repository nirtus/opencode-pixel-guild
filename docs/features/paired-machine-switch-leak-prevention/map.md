# Feature Map: Paired Machine Switch Leak Prevention & Authoritative Daemon Room Reconciliation

Label: wayfinder:map

## Destination

Deliver the complete specification in [Specification: Paired Machine Switch Leak Prevention & Authoritative Daemon Room Reconciliation](./spec.md) so that switching between multiple **OpenCode Machine Pairings** (even over slow remote tunnels `>1.2s` or when a machine has `0` rooms) never leaks **Workshop Rooms**, **Guild Characters**, **Lifetime Tribute**, or Git/task cache state from one paired machine into another, automatically self-heals any previously polluted SQLite snapshots in the **Guild Chronicle Store**, and resets client world focus and tombstones cleanly:

1. **[01: Atomic Epoch-Guarded Machine Switching, Save-Timer Isolation & Stopped-Adapter Guard](./issues/01-atomic-epoch-guarded-machine-switching-and-save-timer-isolation.md)** (`Status: resolved`)
2. **[02: Authoritative Daemon Room Reconciliation, Self-Healing SQLite Pruning & Remote Refresh Guard](./issues/02-authoritative-daemon-room-reconciliation-and-remote-refresh-guard.md)** (`Status: resolved`)
3. **[03: Cross-Machine Git/Task Cache Invalidation & Client World Focus Reset on Machine Switch](./issues/03-cross-machine-cache-invalidation-and-client-world-focus-reset.md)** (`Status: resolved`)

## Notes

- **Mode**: Wayfinder charting & specification complete (`spec.md`, `map.md`, `GLOSSARY.md`, and tickets `01..03` published).
- **Domain**: **OpenCode Machine Pairing**, **Guild Chronicle Store**, **Workshop Room**, **Guild Character**, **Authoritative Live State**, **Lifetime Tribute**, **World Focus Aura**, **World Folder Registration**, **Assembly Commit Ledger**.
- **Specification**: [Feature Specification](./spec.md).
- **Skills to consult**: `systematic-debugging`, `diagnosing-bugs`, `codebase-design`, `domain-modeling`, `tdd`, `code-review`, `verification-before-completion`.
- **Standing Rules**: Work strictly inside the project root directory (`./`). Never create git worktrees or write files to `/tmp` or `/tmp/opencode`. Never delete `./data/` or modify live operator profiles. Every source file in `src/` must remain `<= 400` lines. Deploy and verify on the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`) with visual proof in `docs/images/`.

## Decisions so far

- [Specification: Paired Machine Switch Leak Prevention & Authoritative Daemon Room Reconciliation](./spec.md): Diagnosed the five root causes of cross-machine project leakage during **OpenCode Machine Pairing** switches and approved the testing seams (`OperatorWorkspaceRegistry`, `GuildCompanionServer`, and `operator-pairing-controller`) and 3-ticket vertical slice plan:
  1. Prevent the `1200ms` debounced `saveTimer` from firing during an in-flight machine switch (`pairDaemon`) while `reducer` still contains the previous machine's **Workshop Rooms** and `profile.daemonUrl` has already been updated to the target machine, and guard `pairDaemon` and `OpenCodeClientAdapter` with monotonic concurrency epochs.
  2. Reconcile persisted **Guild Chronicle Store** rooms and **Lifetime Tribute** rows against the target daemon's live project/location discovery on machine switch so foreign or closed rooms are pruned and previously polluted SQLite rows self-heal, while preventing `onRefresh` (`POST /api/guild/refresh`) from hijacking `0`-room remote machines to local host `discoverService()`.
  3. Invalidate cross-machine Git status, task progress, and remote directory shell runner caches on machine switch, eliminate the global `knownVisualizerParentNorm` `/workspaces` fallback side effect, and reset client `isAllWorldsFocused` and snapshot-gate tombstones cleanly when switching machines.
- [01: Atomic Epoch-Guarded Machine Switching, Save-Timer Isolation & Stopped-Adapter Guard](./issues/01-atomic-epoch-guarded-machine-switching-and-save-timer-isolation.md): Implemented `createRuntimePairingController` in `src/server/machine-switch-reconciler.ts`, wired epoch/in-flight/save-timer guards in `src/server/operator-registry.ts`, and added generation-guarded `stop()` checks in `src/ingress/opencode-client-adapter.ts` + `src/ingress/adapter-sweep-helpers.ts`.
- [02: Authoritative Daemon Room Reconciliation, Self-Healing SQLite Pruning & Remote Refresh Guard](./issues/02-authoritative-daemon-room-reconciliation-and-remote-refresh-guard.md): Implemented `reconcilePersistedSnapshotWithDaemon` in `src/server/snapshot-reconciler.ts`, added `pruneTributeSessions` in `src/server/chronicle-sqlite-store.ts`, preserved casing in `resolveDaemonDir` / `probeDirectory` in `src/ingress/daemon-http-client.ts`, and guarded `onRefresh` with `isLocalDaemonEndpoint`.
- [03: Cross-Machine Git/Task Cache Invalidation & Client World Focus Reset on Machine Switch](./issues/03-cross-machine-cache-invalidation-and-client-world-focus-reset.md): Added `normalizeDaemonEndpointUrl`, `clearRemoteDirectoryScopes`, and `clearRemoteDirectoryRunners`, removed remote mutation of `knownVisualizerParentNorm`, added `setExpectedMachineDaemonUrl` SSE filtering and `resetAuthoritativeSnapshotGate({ preservePendingAction: true })` in `src/web/snapshot-gate.ts` and `src/web/operator-pairing-controller.ts`, updated `README.md` / `GLOSSARY.md`, and verified on the live Docker container (`docs/images/paired-machine-switch-leak-prevention.png`).

## Not yet specified

<!-- All wayfinder fog has graduated into spec.md and tickets 01..03 -->

## Out of scope

- Splitting the shared **Workshop Room** into separate rooms per project on the same host (all projects on the active paired machine continue to co-habit the shared **Workshop Room** per `ADR-0001`).
