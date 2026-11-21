# 01: Route Debugging Characters Directly to `"Combat"` When a Bug Monster Is Active & Stop Wandering

Type: task
Label: wayfinder:task
Status: resolved

**What to build:** Update `resolveCharacterTargetSlot` (`src/web/station-and-workflow-routing.ts`), `deriveOverheadActionLabel` (`src/encounter/workflow-classifier.ts`), and `deriveProjectBugMonsters` (`src/web/canvas-wilds-painter.ts`) so that any character in `debugging-hunt` when a **Bug Monster** is present immediately enters `station = "Combat"` (`inCombat = true`, `overheadLabel = "Fighting Bug"`), and remove the 4.5-second `WildsSearch` wandering loop.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] When `workflowIntent === "debugging-hunt"` and `hasActiveRoomBug` is true, `resolveCharacterTargetSlot` resolves `station = "Combat"` regardless of whether a tool is currently mid-execution.
- [x] The `Math.floor(timestampMs / 4500)` rotation is removed from `WildsSearch` so characters never wander around in a 4.5-second loop.
- [x] `deriveOverheadActionLabel` returns `"Fighting Bug"` whenever `options.station === "Combat"` (overriding any stale `"Tracking Bug"` stored on `char.overheadLabel`).
- [x] `deriveProjectBugMonsters` marks the active **Bug Monster** `inCombat = true` when a debugging character is engaging it.
- [x] Automated unit tests verify that a debugging character with an active room bug locks onto `"Combat"` (`"Fighting Bug"`) and does not change target coordinates across 4.5-second intervals.

## Answer

Updated `resolveCharacterTargetSlot` (`src/web/station-and-workflow-routing.ts`) to route `debugging-hunt` characters to `station = "Combat"` whenever `hasActiveRoomBug` is true, removed `+ Math.floor(timestampMs / 4500)` from `WildsSearch` waypoint selection, updated `deriveOverheadActionLabel` (`src/encounter/workflow-classifier.ts`) to return `"Fighting Bug"` whenever `options.station === "Combat"`, and marked active **Bug Monster**s `inCombat = true` in `deriveProjectBugMonsters` (`src/web/canvas-wilds-painter.ts`).
