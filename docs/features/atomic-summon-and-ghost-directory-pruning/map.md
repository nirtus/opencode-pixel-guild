# Feature Map: Atomic `Guild Adventurer` Summoning, Orphan Rollback & Ghost Directory Pruning

Label: wayfinder:map

## Destination

Eliminate orphaned **Guild Adventurer** spawns when summoning fails (`POST /api/session` + `POST /api/session/{id}/prompt` two-step failure or SSE `session.created` race) and prune deleted host directories (`opencode-guild` `404 LocationNotFoundError`) inside the Docker container, as specified in [Specification: Atomic `Guild Adventurer` Summoning, Orphan Rollback & Ghost Directory Pruning](./spec.md), through two implementation tickets:
1. **[01: Atomic Summon Rollback, Deferred Location Registration & SSE Orphan Eviction](./issues/01-atomic-summon-rollback-and-sse-orphan-eviction.md)** (`Status: resolved`)
2. **[02: Docker `/workspaces` Ghost Directory Pruning & Default Summon Directory Targeting](./issues/02-docker-ghost-directory-pruning-and-summon-directory-targeting.md)** (`Status: resolved`)

## Notes

- **Domain**: **Guild Adventurer**, **Workshop Room**, **World Folder Registration**, **Guild Chronicle Store**, **Authoritative Live State**.
- **Specification**: [Feature Specification](./spec.md).
- **Skills to consult**: `diagnosing-bugs`, `codebase-design`, `domain-modeling`, `tdd`, `verification-before-completion`.
- **Standing Rules**: Work strictly inside the project root directory (`./`). Never create git worktrees or write files to `/tmp` or `/tmp/opencode`. Every source file in `src/` must remain `<= 400` lines (`tests/00-architecture-invariants.test.ts`). Deploy and verify on the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`) with visual proof in `docs/images/`.

## Decisions so far

- [GLOSSARY.md](../../../GLOSSARY.md): Updated **Guild Adventurer** `_Avoid_:` guardrails to forbid leaving orphaned characters in the **Workshop Room** or on the OpenCode daemon when a summon or initial prompt fails.
- [Specification: Atomic `Guild Adventurer` Summoning, Orphan Rollback & Ghost Directory Pruning](./spec.md): Confirmed all three Grilling Round 1 decisions (`Q1–Q3`):
  1. **`Q1` — Atomic Summon Rollback & SSE Orphan Eviction**: Pre-validate `!isDeletedHostDirectory(rawDirectory)` before calling the daemon, defer `registerLocation(rawDirectory)` until after `executeCommand` succeeds, immediately roll back `POST /api/session` via `DELETE /api/session/{newSessionId}` if the initial prompt fails, and evict/delete any racing SSE `session.created` session in `handleGuildCommandRoute` so zero characters ever appear in the room on a failed summon.
  2. **`Q2` — Docker `/workspaces` Parent-Mount Awareness & Ghost Directory Pruning**: Update `resolveLocalProjectDir` / `isDeletedHostDirectory` in `src/state/location-normalization.ts` so `/workspaces` is recognized as the local mount of the host workspace parent directory when `/workspaces/opencode-game-visualizer` exists—pruning deleted sibling folders like `opencode-guild` and stopping `404 LocationNotFoundError` polling spam.
  3. **`Q3` — Default Summon Directory in `🌐 All` Mode & Optional Initial Prompt**: Update `getDefaultSummonDirectory()` in `src/web/summon-adventurer-controller.ts` to prefer the selected character's room (`selectedSessionId`), then non-worktree rooms with active sessions, then `opencode-game-visualizer` before `allRooms[0]`, and keep `promptText` separate from `title` when `#summon-prompt-input` is empty.
- [01: Atomic Summon Rollback, Deferred Location Registration & SSE Orphan Eviction](./issues/01-atomic-summon-rollback-and-sse-orphan-eviction.md): Implemented `DELETE /api/session/:id` rollback on prompt failure in `executeDaemonCommand`, pre-flight `isDeletedHostDirectory` validation, deferred `registerLocation`, and SSE orphan eviction in `handleGuildCommandRoute`.
- [02: Docker `/workspaces` Ghost Directory Pruning & Default Summon Directory Targeting](./issues/02-docker-ghost-directory-pruning-and-summon-directory-targeting.md): Mapped host workspace parent directory to `/workspaces` in `location-normalization.ts` so deleted sibling directories (`opencode-guild`) are pruned inside Docker, and updated `summon-adventurer-controller.ts` to prefer active/selected project rooms in `🌐 All` mode and keep `promptText` optional when only a title is entered.

## Not yet specified

<!-- All wayfinder fog has graduated into spec.md and tickets 01..02 -->

## Out of scope

- Modifying OpenCode V2 daemon's internal `POST /api/session` implementation (handled at the visualizer ingress and command-router boundary).
