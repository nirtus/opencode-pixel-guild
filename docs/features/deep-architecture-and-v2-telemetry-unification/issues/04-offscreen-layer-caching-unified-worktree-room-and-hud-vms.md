# 04: Multi-Layer OffscreenCanvas Caching & Pure HUD View-Model Unification

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01, 02, 03

**What to build:** Cache static **Workshop Room** architecture, static **Dungeon Wilds** biome terrain, and composed 16×16 pixel sprites onto persistent offscreen canvases blitted via `drawImage`, fix `Pixel Atlas` sprite composition so custom squad palettes and off-hand **Skill Grimoire** tomes render accurately, remove duplicate asset catalogs, and drive the browser **Character Sheet** and **Guild Master Ledger** purely from shared HUD view-models.

**Blocked by:** 01: Unify Workflow Intent, Preparation Station Taxonomy & Toil-Queue Choreography, 02: Collapse Split-Brain Scene & Canvas Pipeline Behind One Scene Seam, 03: Deepen OpenCode V2 Ingress: Live `/api/event` SSE Stream, V2 Schema Alignment & Unified Project Room

**Status:** resolved

- [x] Static **Workshop Room** floorboards, perimeter walls, East Archway, and base station furniture are pre-rendered to a persistent offscreen canvas (invalidated only on room/theme change) and blitted in one `drawImage` call per frame.
- [x] Static **Dungeon Wilds** biome checkerboard tiles and hunting trails are pre-rendered to a persistent offscreen canvas keyed by biome seed and blitted in one `drawImage` call per frame.
- [x] Composed 16×16 pixel sprites are memoized onto offscreen canvases and pass `visualTraits`, `timestampMs`, `skillGrimoires`, and valid `CharacterLifecycleState` values so `Style: Pixel Atlas` renders custom squad colors, animations, and off-hand **Skill Grimoire**s.
- [x] Duplicate monster and biome catalogs in the browser slice are removed in favor of the single canonical domain catalogs.
- [x] Browser **Character Sheet** and **Guild Master Ledger** DOM reconcilers render 100% from `buildCharacterSheetViewModel` and `buildGuildMasterLedgerViewModel` with zero hardcoded `"Library"` station overrides or inline metric recomputation.
- [x] Automated HUD/compositor tests and a live headless Chrome screenshot verify both `Cartoon` and `Pixel Atlas` modes and HUD parity.

## Answer

Implemented 3-layer offscreen canvas caching (`cachedRoomBuffer` in `src/web/canvas-room-painter.ts`, `cachedWildsTerrainBuffer` in `src/web/canvas-wilds-painter.ts`, and `pixelSpriteBitmapCache` in `src/web/canvas-hero-painter.ts`) using `createOffscreenBuffer` from `src/web/asset-manifests.ts`. Fixed `drawPixelAtlasHero` via `buildPixelAtlasComposeInput` so `composeCharacterSprite` receives valid `visualTraits`, `timestampMs`, `skillGrimoires`, and `CharacterLifecycleState` values. Derived `MONSTER_SETS` in `src/web/asset-manifests.ts` directly from `MONSTER_LINEAGE_SETS` in `src/types/monster-catalog.ts`, and updated `src/web/side-panel-reconciler.ts` and `src/web/ledger-panel-reconciler.ts` to resolve actual station labels without hardcoding `"Library"` and consume `ledger.activeGoalAssembly` from `buildGuildMasterLedgerViewModel`.
