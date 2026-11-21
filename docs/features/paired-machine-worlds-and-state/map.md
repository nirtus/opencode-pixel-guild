# Feature Map: Active Paired Machine Workspace Folder Discovery, Per-Machine World Isolation & Remote Game Master State

Label: wayfinder:map

## Destination

Deliver the complete specification in [Specification: Active Paired Machine Workspace Folder Discovery, Per-Machine World Isolation & Remote Game Master State](./spec.md) so that when a **Guild Operator** is paired to any active **OpenCode Machine Pairing**, **World Folder Registration** (`GET /api/guild/workspace-folders` and `POST /api/guild/room`) discovers and registers folders from that paired machine rather than the visualizer host, and all **Workshop Rooms**, **Guild Characters**, **OpenCode Agent Modes**, **Lifetime Tribute**, **Goal Assembly Site** parts, **Guild Results Showcase** cards, and **Assembly Commit Ledger** operations reflect the selected paired machine:

1. **[01: Paired-Machine Workspace Folder Discovery & World Registration via OpenCode Daemon](./issues/01-paired-machine-workspace-folder-discovery-and-room-registration.md)** (`Status: resolved`)
2. **[02: Per-Machine World Snapshot, Session, Agent & Lifetime Tribute Isolation](./issues/02-per-machine-world-snapshot-and-tribute-isolation.md)** (`Status: resolved`)
3. **[03: Remote Daemon Git Working-Tree & Task Progress Adapter for Game Master Objects](./issues/03-remote-daemon-git-and-task-progress-adapter.md)** (`Status: resolved`)

## Notes

- **Mode**: Wayfinder charting & specification complete (`spec.md`, `map.md`, `GLOSSARY.md`, and tickets `01..03` published).
- **Domain**: **World Folder Registration**, **OpenCode Machine Pairing**, **Workshop Room**, **Guild Character**, **OpenCode Agent Mode**, **Goal Assembly Site**, **Project Mini-Assembly**, **Guild Results Showcase**, **Assembly Commit Ledger**, **Guild Master Ledger**, **Lifetime Tribute**, **Guild Chronicle Store**.
- **Specification**: [Feature Specification](./spec.md).
- **Skills to consult**: `codebase-design`, `domain-modeling`, `tdd`, `code-review`, `opencode`.
- **Standing Rules**: Work strictly inside the project root directory (`./`). Never create git worktrees or write files to `/tmp` or `/tmp/opencode`. Never delete `./data/` or modify live operator profiles. Every source file in `src/` must remain `<= 400` lines. Deploy and verify on the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`) with visual proof in `docs/images/`.

## Decisions so far

- [Specification: Active Paired Machine Workspace Folder Discovery, Per-Machine World Isolation & Remote Game Master State](./spec.md): Resolved Grilling Rounds 1 & 2 (`Q1–Q3` and `Q1–Q4`, all `Yes`) and updated `GLOSSARY.md` definitions for **World Folder Registration**, **Assembly Commit Ledger**, **OpenCode Machine Pairing**, and **Guild Chronicle Store**:
  1. Query the active **OpenCode Machine Pairing**'s daemon (`ctx.daemonClient`) for workspace root inference, directory listing (`GET /api/guild/workspace-folders` and `?parent=`), and directory validation (`POST /api/guild/room`), never falling back to scanning the Visualizer Host's local `/workspaces` or `process.cwd()` when paired to a remote machine.
  2. Scope persisted world snapshots, `0`-session registered worlds, tombstones, and **Lifetime Tribute** records per `(operatorId, machine)` in `GuildChronicleStore` (and always persist snapshots on machine switch even when `0` rooms exist), while disabling Visualizer Host `/workspaces/<basename>` path fallbacks in `resolveLocalProjectDir` for remote daemons.
  3. Route Git working-tree inspection/mutations (`status`, `diff`, `stage`, `unstage`, `discard`, `commit`, `sync`) and `docs/features/<slug>/issues/` task progress scanning through the active paired machine's daemon when paired to a remote machine so the **Goal Assembly Site**, **Project Mini-Assemblies**, **Guild Results Showcase**, and **Assembly Commit Ledger** reflect the selected paired machine's repositories.
- [01: Paired-Machine Workspace Folder Discovery & World Registration via OpenCode Daemon](./issues/01-paired-machine-workspace-folder-discovery-and-room-registration.md): Implemented `listDaemonWorkspaceDirectories`, `probeDaemonDirectory`, and `resolveDaemonDefaultWorkspaceRoot` in `src/ingress/daemon-workspace-ops.ts`, wired them onto `OpenCodeDaemonClientPort`, and updated `src/server/workspace-folder-routes.ts` so `GET /api/guild/workspace-folders` and `POST /api/guild/room` discover, browse (`?parent=`), validate, and register directories directly on the active **OpenCode Machine Pairing** without scanning the Visualizer Host's `/workspaces` disk.
- [02: Per-Machine World Snapshot, Session, Agent & Lifetime Tribute Isolation](./issues/02-per-machine-world-snapshot-and-tribute-isolation.md): Scoped `GuildChronicleStore` world snapshots, session messages, and **Lifetime Tribute** records per `(operatorId, daemonUrl)` in `src/server/operator-registry.ts` and `src/server/chronicle-sqlite-store.ts`, guarded `resolveLocalProjectDir` in `src/state/location-normalization.ts` against resolving remote daemon paths to Visualizer Host `/workspaces` or `process.cwd()`, filtered `0`-session OS drive/home roots (`/c`, `/c/Users`), and prevented null catalog caching in `src/ingress/daemon-location-state.ts`.
- [03: Remote Daemon Git Working-Tree & Task Progress Adapter for Game Master Objects](./issues/03-remote-daemon-git-and-task-progress-adapter.md): Created `src/ingress/remote-git-ops.ts`, added `cwd` to `POST /api/shell` in `src/ingress/daemon-session-ops.ts`, and wired `src/ingress/git-status-scanner.ts` and `src/ingress/git-working-tree.ts` so Git status, diff, stage, unstage, discard, commit, sync, and **Goal Assembly Site** task progress run against the active paired machine's daemon (`docs/images/paired-machine-worlds-and-state.png`).

## Not yet specified

<!-- All wayfinder fog has graduated into spec.md and tickets 01..03 -->

## Out of scope

- Splitting the shared **Workshop Room** into separate rooms per project on the same host (all projects on the active paired machine continue to co-habit the shared **Workshop Room** per `ADR-0001`).
