# 02: Docker `/workspaces` Ghost Directory Pruning & Default Summon Directory Targeting

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01

## Question

How should `resolveLocalProjectDir` / `isDeletedHostDirectory` (`src/state/location-normalization.ts`), `chronicle-sqlite-store.ts`, and `summon-adventurer-controller.ts` detect and prune deleted host directories (such as `/mnt/c/Users/.../Documents/Development/opencode-guild`) when running inside the Docker container (`..:/workspaces` mount), and ensure `#summon-adventurer-modal` defaults to a valid active project directory without forcing a synthetic prompt when only a Quest Title is entered?

## Specification

Per [Feature Specification](./../spec.md) (Decision 2):
1. **Container `/workspaces` Parent-Mount Awareness in `src/state/location-normalization.ts`**:
   - In `resolveLocalProjectDir` / `isDeletedHostDirectory`:
     - When `/workspaces/opencode-game-visualizer` exists in the container (`..:/workspaces` mount), map the host workspace parent directory (`.../Documents/Development`) to `/workspaces` so `isDeletedHostDirectory` returns `true` for any deleted sibling directory under that parent whose `/workspaces/<leaf>` directory does not exist.
   - Update `opencode-client-adapter.ts` so bare workspace parent directories with `0` sessions are not emitted as project rooms.
2. **Smart Default Summon Directory & Optional Prompt Separation (`src/web/summon-adventurer-controller.ts`)**:
   - In `getDefaultSummonDirectory()`:
     - When `🌐 All` worlds is focused (`clientState.isAllWorldsFocused`), prefer:
       1. The room of `clientState.selectedSessionId` (if selected and present in `allRooms`);
       2. A non-worktree room with active sessions (`r.activeSessionIds?.length > 0`) or characters in `snapshot.characters`;
       3. A room matching `opencode-game-visualizer` before falling back to `allRooms[0]`.
   - In `submitSummon()`:
     - Change `const promptText = promptInput?.value?.trim() || title || undefined;` to `const promptText = promptInput?.value?.trim() || undefined;` so entering only a Quest Title creates a titled session without forcing a prompt POST when the optional prompt input is empty.

## Acceptance Criteria

- [x] `isDeletedHostDirectory("/mnt/c/Users/developer/Documents/Development/opencode-guild", checkExists, "http://host.docker.internal:49374")` returns `true` when `/workspaces/opencode-game-visualizer` exists and `/workspaces/opencode-guild` does not.
- [x] Ghost room `opencode-guild` is pruned from `snapshot.rooms` and `snapshot.roomOrder` on container boot and sweep, eliminating `404 LocationNotFoundError` daemon log spam.
- [x] Opening `#summon-adventurer-modal` in `🌐 All` mode selects the active project (`opencode-game-visualizer` or the selected hero's room) rather than an empty/stale index-0 room.
- [x] Submitting `#summon-adventurer-modal` with a Quest Title and an empty Initial Prompt creates the session without sending `title` as `promptText`.
- [x] Deployed and verified on `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`) with visual proof in `docs/images/`.

## Answer

Implemented in:
- `src/state/location-normalization.ts`: Mapped the host workspace parent directory (`.../Documents/Development`) to `/workspaces` when `/workspaces/opencode-game-visualizer` exists, enabling `isDeletedHostDirectory` to prune deleted sibling folders (`opencode-guild`) inside the Docker container.
- `src/ingress/opencode-client-adapter.ts`: Excluded bare workspace parent directories with `0` sessions from materializing as rooms during `runSweepAllLocations`.
- `src/web/summon-adventurer-controller.ts`: Updated `getDefaultSummonDirectory()` in `🌐 All` mode to prioritize `selectedSessionId`'s room, rooms with active/open characters, and `opencode-game-visualizer` before `allRooms[0]`; separated `promptText` from `title` when `#summon-prompt-input` is blank.
- `tests/36-add-world-folder-and-summon.test.ts`: Added TDD regression test `8` covering Docker `/workspaces` ghost-folder detection, `getDefaultSummonDirectory()` prioritization in `🌐 All` mode, and title-only summons.
