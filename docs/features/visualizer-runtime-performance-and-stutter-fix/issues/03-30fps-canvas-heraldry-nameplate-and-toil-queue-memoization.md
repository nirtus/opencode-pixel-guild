# 03: 30 FPS Canvas Heraldry, Nameplate Truncation & Snapshot-Versioned Toil Queue Memoization

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01

**What to build:** Eliminate redundant per-frame (30 FPS) CPU allocations and canvas text-measurement loops across the **Guild Floorplan** renderer and **Toil Queue** choreography stepper so idle and walking frames execute in under 1ms regardless of how many projects or historical sessions exist in the snapshot.

## Acceptance Criteria

- [x] Keep all files under `src/` strictly `<= 400` lines (`tests/00-architecture-invariants.test.ts`).
- [x] In `src/spatial/project-heraldry.ts`, cache `listHostProjectHeraldries(snapshot)` in a `WeakMap<GuildSnapshot, ProjectHeraldryDescriptor[]>` so `renderWorkshopRoom()` (`src/web/canvas-room-painter.ts`) reuses the exact computed array across all 30 FPS frames for the same `GuildSnapshot` instance.
- [x] In `src/web/canvas-hero-painter.ts` (`drawCharacterHero`), cache the truncated second-row underfoot nameplate label (`row2Label`) in a bounded LRU map (capped at 512 entries) keyed by `${Math.round(row1TextW)}:${name}` so the `while (k > 1 && c.measureText(...).width > row1TextW) k--` loop runs at most once per unique character title and badge width instead of 30 times per second per character.
- [x] In `src/web/client-choreography.ts` and `src/web/character-action-queue.ts`, track the last processed snapshot version and Armory state on `WalkerState` so `enqueueCharacterActions()` fast-paths on 30 FPS animation frames where `clientState.currentSnapshot.version`, character lifecycle state, and Armory expiration state have not changed.
- [x] Add tests at the 30 FPS Choreography & Canvas Painter seam verifying `listHostProjectHeraldries` WeakMap memoization, bounded nameplate truncation caching in `drawCharacterHero`, and snapshot-versioned `enqueueCharacterActions` fast-pathing without regressing any existing FIFO **Toil Queue** walking choreography tests.

## Answer

- Added `hostHeraldriesCache` (`WeakMap<GuildSnapshot, ...>` storing an immutable `Object.freeze()` array validated by structural counts/version) in `src/spatial/project-heraldry.ts` so `renderWorkshopRoom()` reuses the exact computed host heraldries across 30 FPS frames.
- Created `src/web/nameplate-label-cache.ts` (`resolveTruncatedNameplateRow2`) backed by a per-context `WeakMap<CanvasRenderingContext2D, Map<string, string>>` with a 512-entry LRU cap and wired it into `drawCharacterHero()` (`src/web/canvas-hero-painter.ts`).
- Added `lastActionSyncKey` on `WalkerState` (`src/web/client-state.ts`) and `buildCharacterActionSyncKey()` in `src/web/action-queue-sync-key.ts` (keyed on snapshot version/timestamp, canonical `c.lastActivityAtMs`, lifecycle/Armory state, `recentTools` head, `hasActiveRoomBug`, resolved slot, and queue bounds) so `enqueueCharacterActions()` (`src/web/character-action-queue.ts`) fast-paths across unchanged 30 FPS frames while immediately invalidating on snapshot changes, 1.45s Armory self-expiration, bug-state shifts, `ReportingScroll` parent movement, and urgent `Despawning`.
- Verified with `tests/53-canvas-and-choreography-performance.test.ts` (Slices 1–3), full `npm test`, and live deployment on `opencode-pixel-guild-visualizer` (`port 4310`).
