# 03: Cross-Machine Git/Task Cache Invalidation & Client World Focus Reset on Machine Switch

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 02: Authoritative Daemon Room Reconciliation, Self-Healing SQLite Pruning & Remote Refresh Guard

## What to build

Eliminate cross-machine collisions in module-level Git status, feature task progress, remote directory shell runner, and path normalization caches when switching between **OpenCode Machine Pairings** that share identical directory paths, and ensure the browser client resets **World Focus Aura** (`isAllWorldsFocused`), session tracking, and snapshot-gate tombstones cleanly on every machine switch.

1. **Cross-Machine Git, Task & Remote Directory Runner Cache Isolation**:
   - Add a `clearRemoteDirectoryRunners()` (or daemon-scoped runner reset) across `src/ingress/remote-git-ops.ts` and `src/state/location-normalization.ts` (`remoteRunnersByNormDir` and `remoteDaemonDirs`), and invoke it alongside `invalidateGitStatusCache()` and `invalidateTaskProgressCache()` whenever `pairDaemon` switches to a different machine (`isDifferentMachine === true`).
   - Remove the global `knownVisualizerParentNorm` side effect in `normalizeLocationDirectory` (`src/state/location-normalization.ts`) so normalizing a remote daemon path ending in `/opencode-game-visualizer` never causes `resolveLocalProjectDir` to map a remote parent folder to `/workspaces` on the visualizer host.
2. **Client-Side World Focus & Snapshot Gate Reset on Machine Switch**:
   - In `src/web/operator-pairing-controller.ts`, update `resetClientWorldViewState(clearSelection = true)` to reset `clientState.isAllWorldsFocused = true`, clear `clientState.knownSessionIds.clear()`, and call `resetAuthoritativeSnapshotGate()` (`src/web/snapshot-gate.ts`) so neither a single-project **World Focus Aura** filter nor deleted room/session tombstones from Machine A carry over to Machine B.
   - Update project documentation (`README.md`, `GLOSSARY.md`) and deploy/verify on the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`) with visual proof in `docs/images/`.

## Acceptance Criteria

- [x] When Machine A and Machine B both have a project at the same normalized path (e.g., `/home/dev/shared-repo`), switching from Machine A to Machine B invalidates Machine A's cached Git status, remote shell runner, and **Goal Assembly Site** `taskProgress` so Machine B displays its own branch, uncommitted files, and **Assembly Parts**.
- [x] Normalizing a remote machine path ending in `/opencode-game-visualizer` does not cause `resolveLocalProjectDir` to resolve the parent directory to `/workspaces` on the visualizer host.
- [x] Switching machines in the browser UI via `dispatchOperatorModalAction("activate-machine", ...)` resets `clientState.isAllWorldsFocused` to `true`, clears `clientState.selectedProjectId`, `clientState.selectedRoomId`, `clientState.selectedSessionId`, and resets `snapshot-gate` tombstones.
- [x] All source files under `src/` remain `<= 400` lines (`tests/00-architecture-invariants.test.ts`), documentation (`README.md`, `GLOSSARY.md`) is updated, and the container on port `4310` is verified with visual proof.

## Answer

Implemented in:
- `src/state/location-normalization.ts` (`normalizeDaemonEndpointUrl`, `clearRemoteDirectoryScopes`), `src/ingress/remote-git-ops.ts` (`clearRemoteDirectoryRunners`), `src/ingress/index.ts`, and `src/server/machine-switch-reconciler.ts`: Scoped `remoteDaemonDirs` by owning daemon URL, removed global `knownVisualizerParentNorm` mutation from `normalizeLocationDirectory` (recording it only for local daemon paths verified under `/workspaces/opencode-game-visualizer`), and cleared stale remote directory runners, Git status caches, and feature task progress caches on every cross-machine switch.
- `src/web/snapshot-gate.ts` & `src/web/operator-pairing-controller.ts`: Added `setExpectedMachineDaemonUrl` SSE filtering during active machine switches, added `preservePendingAction` to `resetAuthoritativeSnapshotGate`, and updated `resetClientWorldViewState(true)` to reset `clientState.isAllWorldsFocused = true`, clear `clientState.knownSessionIds`, and reset client tombstones cleanly.
- Updated `README.md`, `GLOSSARY.md`, `docs/features/paired-machine-switch-leak-prevention/`, and `docs/graphify-out/`, deployed to `opencode-pixel-guild-visualizer` (`npm run docker:up` on port `4310`), verified all tests pass, and captured visual proof in `docs/images/paired-machine-switch-leak-prevention.png`.
