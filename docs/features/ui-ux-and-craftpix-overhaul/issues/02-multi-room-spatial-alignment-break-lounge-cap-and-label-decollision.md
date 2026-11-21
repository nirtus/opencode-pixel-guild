# 02: Unified Multi-Room Spatial Coordinates, Break Lounge Crowd Capping & Label De-Collision

Type: task
Label: `ready-for-agent`
Status: resolved
Blocked by: 01

**What to build:** Unify the multi-room world coordinate grid between `layoutGuildFloorplan` and `buildGuildSceneFrame` so outdoor compound grass bounds, perimeter tree clusters, and cobbled stone footpaths align 1:1 with room origins (eliminating second-column rooms hanging in black void and trees/footpaths cutting through room interiors), auto-fit the `"All Rooms"` camera to the visible rooms' bounding box, cap visible resting characters in the `Break Lounge` to at most `6` seated characters with a `+N resting` overflow badge (hiding overhead `Context Mana` bars on un-highlighted sleeping characters), and de-collide `Workstation` title/tool labels from north-wall bookshelves and standing character sprites.

**Blocked by:** 01: Model-Aware Context Mana Hydration & Character Sheet Runtime Crash Fix

**Status:** resolved

- [x] Unify `layoutGuildFloorplan` and `buildGuildSceneFrame` around a single 2-column world coordinate placement (`placed.worldOffset`, `placed.worldBounds`, `placed.worldDoorTile`) so `OutdoorCompoundPlan` grass bounds encompass every column and row of `Workshop Room`s, perimeter `treeClusters` sit outside room walls, and `stoneFootpaths` route around room exteriors without intersecting any room's interior tile bounds.
- [x] When a single `Workshop Room` is selected (`selectedRoomId !== null`), scope the frame's `outdoorGrounds` to a single-room courtyard framing `{ x: 0, y: 0 }` rather than rendering orphan trees and footpaths for hidden rooms.
- [x] Update camera auto-fitting in `"All Rooms"` / **Center** mode to compute `cameraZoom`, `cameraPanX`, and `cameraPanY` from the pixel bounding box of all visible `Workshop Room`s.
- [x] Cap visible idle/archived characters (`RestingInLounge` / `Archived`) in each room's `Break Lounge` to `MAX_VISIBLE_LOUNGE_CHARACTERS = 6` (most recently active first, passing `existingOccupiedTiles` so no two resting characters stack on the same tile), expose `hiddenRestingCount` on the `Break Lounge` fixture to render a `+N resting` badge when more than 6 idle sessions exist, and hide overhead `Context Mana` bars on `RestingInLounge` / `Archived` characters unless hovered or selected.
- [x] Reposition `Workstation` title and tool sub-labels so north-row stations (`Drafting Table`, `Archive Radar`, `Arcane Lectern`) never overlap the `y = 1` bookshelves and bottom tool labels never collide with standing characters or `activeToolPill` badges.
- [x] Verify at Seam 1 (`layoutGuildFloorplan`, `buildGuildSceneFrame`, `HeadlessFrameInspectionAdapter`) with automated tests asserting zero room/footpath/tree interior intersections across 6 rooms and asserting `<= 6` visible resting characters (with `hiddenRestingCount = 33`) in a 42-session room.

## Answer

Unified multi-room outdoor compound footpath routing so spine and worktree corridors route around room exteriors without intersecting room interiors, added `computeCameraFitForRooms`, capped visible `Break Lounge` resting characters at `MAX_VISIBLE_LOUNGE_CHARACTERS = 6` with `+N resting` overflow badge and distinct seat assignment, suppressed un-highlighted sleeping `Context Mana` bars, and de-collided `Workstation` `labelBoundsPx` and `toolsLabelBoundsPx` from bookshelves and standing characters.
