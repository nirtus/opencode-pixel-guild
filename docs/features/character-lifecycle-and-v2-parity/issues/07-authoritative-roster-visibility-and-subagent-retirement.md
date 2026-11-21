# 07: Authoritative Roster Visibility Mode & Thrash-Free Squad Subagent Retirement

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01: Directory-Scoped V2 Session Discovery, Per-Directory Cache & Room-Scoped Active Sessions, 09: Authoritative Quest Gate Lifecycle (`Permission.Request`, `Form.Info` IDs, Time-Scoped Conversational `?`) & Clean Turn Termination

**What to build:** Remove the `topRootIds` (top-6) permanent `isOpenInOpenCode = true` override so closed historical sessions are no longer pinned in `Active Squads` forever, eliminate the 15-second `Archived <-> RestingInLounge` state thrashing on completed **Squad Subagents**, and unify character visibility counts across the Top Bar, World Tabs, **Guild Master Ledger**, and **Character Sheet**.

- [x] Remove `topRootIds` from `isOpenInOpenCode` in `src/ingress/daemon-location-state.ts`; compute `isOpenInOpenCode` for root **Guild Adventurers** as `activeIdSet.has(sessionId) || pendingGateSessionIds.has(sessionId) || isRecentlyActive` (`<= 10 minutes`), and for child **Squad Subagents** as `activeIdSet.has(sessionId) || pendingGateSessionIds.has(sessionId)`.
- [x] In `Active Squads` **Roster Visibility Mode**, display all actively open characters (`isCharacterActivelyOpen`), falling back to the single most recent non-archived root **Guild Adventurer** resting in the **Break Lounge** when a **Workshop Room** has `0` actively open sessions.
- [x] Separate explicit OpenCode archiving (`Boolean(s.archived || s.time?.archived)`) from completed **Squad Subagent** retirement so a completed subagent delivers its **Report Scroll** once and retires cleanly from `Active Squads` without flipping `Archived -> RestingInLounge -> Archived` on subsequent 15-second location polls.
- [x] Unify character and subagent count calculations across `src/spatial/project-world.ts`, `src/hud/scene-tooltip-vm.ts`, `src/hud/guild-ledger-vm.ts`, and `src/hud/character-sheet-vm.ts` so every HUD surface reflects the active **Roster Visibility Mode**.
- [x] Add unit tests verifying that 6 closed historical root sessions are not pinned open, completed subagents do not thrash on 15s polls, and HUD session counts match across all views, keeping all `src/**` files `<= 400` lines.

## Answer

Removed the unconditional `topRootIds` (top-6) `isOpenInOpenCode = true` override in `fetchDaemonLocationState` (keeping a 1-character fallback to `mostRecentRootSessionId` only when a room has 0 recently active root sessions), restricted child `Squad Subagent` `isOpenInOpenCode` to `activeIdSet` / `pendingGateSessionIds`, and prevented `handleSessionUpserted` from waking completed `Archived` subagents to `RestingInLounge` on 15s sweeps.
