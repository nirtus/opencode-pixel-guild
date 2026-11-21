# 04: Live Bug Monster Spawning & Victory Burst from Real Failures

Type: task
Label: ready-for-agent
Status: resolved

## Question

How should outdoor Bug Monsters in the Dungeon Wilds spawn and mutate dynamically based on verified OpenCode diagnostic failures (test suite failures, command errors, retries, and blocked quest gates), and celebrate with victory loot crystals when resolved?

## Specification

- In `src/encounter/bug-monsters.ts` and `src/scene/frame-builder.ts`:
  - Wire `resolveBugMonsterTier(retries, failures, isCrashLoop)` to real telemetry:
    - Minor warnings or single retry → Tier 1 Slime.
    - Test runner failure (`npm test` non-zero exit) or unhandled error → Tier 2 Goblin.
    - Multiple test suite failures or retries → Tier 3 Cyclops.
    - Blocked quest gates (unresolved permission/question) or crash loops → Tier 4 Troll Boss.
  - Position active bug monster in the outdoor Dungeon Wilds utilizing the project's seeded monster lineage set.
  - When test runs turn green or errors are resolved, transition monster to `defeated`, spawning bursting `victoryLootCrystals`.
- Connect Warrior characters actively running tests or bash commands to face/engage the bug monster across the Wilderness Gate portal.
- Verify state transitions and loot bursts in unit tests.

## Answer

Implemented `deriveBugMonsterEncounter` in `src/encounter/bug-monsters.ts` to inspect real OpenCode diagnostic failures (non-zero test exit outputs, tool errors, blocked quest gates) and spawn the corresponding Bug Monster tier (Slime, Goblin, Cyclops, Troll Boss) using the Project World's seeded lineage set. Targets warrior sessions executing tests, and transitions to defeated with bursting victory loot crystals when failures clear. Verified in unit tests (83/83 pass).
