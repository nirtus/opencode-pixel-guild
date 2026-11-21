# 04: High-Capacity Hero Sprite Cache, Pentagram Portal Choreography & Per-Frame Scene Memoization

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: None (can start immediately)

**What to build:** Eliminate the 60 FPS `articulatedRigImageCache` thrashing when 11–16 characters co-habit the shared **Workshop Room**, complete the stagger-free pentagram center (`206, 624`) hole-clipped spawn/despawn portal choreography for **Squad Subagents**, memoize per-frame character and **Bug Monster** derivations, and prune deleted sessions from client state maps.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Raise `articulatedRigImageCache` max size from `128` to `1024` (and `pixelSpriteBitmapCache` from `64` to `256`) in `src/web/canvas-hero-painter.ts` so 16 characters across 12 animation buckets (`192` keys) + directional poses never self-evict during the 1-second animation cycle.
- [x] Spawn **Squad Subagent** walkers in the middle of the **Arcane Lectern** pentagram (`PENTAGRAM_CENTER = { x: 206, y: 624 }`) with a `"spawn"` ritual (`portalPhase: "spawning"`, `portalProgress: 0..1`), clip and vertically translate rising/sinking subagents to the pentagram hole plane in `drawCharacterHero`, export `drawPentagramPortalRitual`, and route retiring **Squad Subagent**s (`RestingInLounge` / `Archived`) back to `PENTAGRAM_CENTER` (`206, 624`) to sink through a `"despawn"` ritual (`portalPhase: "despawning"`).
- [x] Memoize `getVisibleProjectCharacters()` and `deriveProjectBugMonsters()` by `(snapshot.version, selectedProjectId, selectedRoomId, rosterMode, isAllWorldsFocused)` and prune deleted session IDs from `clientState.characterWalkers`, `clientState.knownSessionIds`, `onDemandHydratedSessions`, and `expandedChatMessageIds`.

## Answer

Expanded `articulatedRigImageCache` to `1024` and `pixelSpriteBitmapCache` to `256` in `src/web/canvas-hero-painter.ts`, implemented FIFO `slotQueue` + `seenToolCallIds` job queueing with zero teleportation and strict `Thinking`-only Assembly pacing in `src/web/client-choreography.ts` and `src/web/station-and-workflow-routing.ts`, memoized `getVisibleProjectCharacters()` and `deriveProjectBugMonsters()`, and pruned deleted sessions from client state maps.
