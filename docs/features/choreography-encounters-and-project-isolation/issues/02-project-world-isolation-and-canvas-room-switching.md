# 02: Project World Isolation & Canvas Room Switching

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: None

## Question

How can Project World switching be corrected so that clicking top-bar Project World tabs (`backend`, `frontend`, `Development`, `pixel-guild-cloud`) isolates the canvas strictly to that project's room, renders the project title on the room wall, filters characters to that project, and seeds matching wilderness themes?

## Specification

- In `src/web/app.html`:
  - When `selectedProjectId` is selected, find the primary room belonging to that project (`r.projectId === selectedProjectId` or `r.locationDirectory === selectedProjectId`).
  - Render the active project banner on the room's north wall: `[PROJECT_NAME] [PRIMARY GUILD HALL] (/path/to/project)`.
  - Filter rendered characters on canvas strictly to sessions belonging to the active Project World's rooms (preventing sessions from other projects from crowding the room).
  - Pass the active project path to `seedProjectWorldVisuals()`, so switching project tabs immediately switches the outdoor wilderness biome (Forest, Dungeon, Dryland), foliage props, and monster set.
  - Verify through automated tests in `tests/`.

## Answer

Implemented `getActiveProjectRooms()` and `getActiveRoom()` in `src/web/app.html` to resolve the primary room matching `selectedProjectId`. Rendered the active Project World status and directory banner (`[PRIMARY GUILD HALL]` vs `[WORKTREE ANNEX]`) along the room's north wall brickwork. Filtered canvas characters strictly to sessions belonging to the active Project World, and seeded the outdoor wilderness biome and monster sets from the active project root. Verified in automated test Slice 2.
