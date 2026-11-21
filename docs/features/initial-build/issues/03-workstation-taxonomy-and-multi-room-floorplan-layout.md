# Adaptive Workshop Room Floorplan, Arcane Lectern, Plugin Alcoves, and Spatial Pathfinding Prototype

Type: prototype
Status: closed
Blocked by: 01, 02

## Architectural Decisions Settled

- **Core Guild Hall + Expandable `Plugin Alcove` Wing (`Q1: A`, `Q3: A`, `Q7: A`)**:
  - Every `Workshop Room` includes the seven core `Workstation`s (`Drafting Table`, `Archive Radar`, `Anvil Forge`, `Reactor Console`, `Comms Dish`, `Altar of Compaction`, and the `Arcane Lectern` for equipping `Skill Grimoire`s) plus the `Summoning Pad` and `Break Lounge`.
  - Module `03` dynamically annexes up to **4 dedicated `Plugin Alcove`s** along the room's expansion wing (prioritizing connected and recently used plugin/MCP namespaces from `/api/plugin`, `/api/mcp`, and live tool calls), plus **1 multiplexing overflow `Plugin Alcove`** when a room has 5+ plugins/MCP servers.
- **Pre-Resolved Capability Target Seam (`Q2: A`, `Q5: A`)**:
  - Module `01` resolves tool, skill, and Code Mode (`execute` `tools.<namespace>.<tool>`) targets before emitting over the snapshot seam, so Module `03` consumes normalized capability descriptors (`Workstation` ID + optional secondary `Plugin Alcove` beam targets) and outputs deterministic tile coordinates.

## Remaining Questions

Building on [Deep Capability, World-State Reducer, and Telemetry Ingress Seam](./01-event-stream-state-machine-and-bridge-seam.md) and [Session and Subagent Persistence, Skill Grimoire Lineage, and Squad Choreography](./02-session-and-subagent-persistence-and-roster-choreography.md), how should a `Workshop Room` spatially lay out its core `Workstation`s, `Arcane Lectern`, dynamic `Plugin Alcove` wing, `Summoning Pad`, and `Break Lounge` on a 2D tile grid, and how should multiple `Workshop Room`s (`Project` roots and git `Worktree`s) arrange themselves on the pannable/zoomable `Guild Floorplan`?

Specifically:
1. What are the exact tile coordinates and layout templates for a `Workshop Room` as its `Plugin Alcove` wing scales from 0 to 4+1 alcoves?
2. Where do multiple characters stand when 3+ `Guild Adventurer`s or `Squad Subagent`s use the same `Workstation` or `Plugin Alcove` at the same time, and how do telemetry beams render between the `Reactor Console` and `Plugin Alcove`s during multi-namespace `execute` scripts?
3. When `worktree_create` or `session_move` spawns a new `Workshop Room`, how does the floorplan annex the new room onto the hallway/grid without shifting existing rooms jarringly?

## Resolution

Implemented in [`src/spatial/floorplan-layout.ts`](../src/spatial/floorplan-layout.ts) and verified via [`tests/03-floorplan-layout.test.ts`](../tests/03-floorplan-layout.test.ts):

1. **`Workshop Room` Tile Coordinates, Core Guild Hall, and Adaptive `Plugin Alcove` Wing Templates (`layoutWorkshopRoom`, `findTilePath`)**:
   - **Core Guild Hall (`16 × 12` tiles, `x: 0..15, y: 0..11`)**:
     - Entrance `doorTile` at `{ x: 8, y: 0 }` and central `thinkingCenterTile` at `{ x: 8, y: 4 }`.
     - **7 Core `Workstation`s** (non-walkable `fixtureTile` + south-facing walkable `anchorTile`):
       - `Drafting Table`: `fixtureTile: { x: 3, y: 2 }`, `anchorTile: { x: 3, y: 3 }`
       - `Archive Radar`: `fixtureTile: { x: 7, y: 2 }`, `anchorTile: { x: 7, y: 3 }`
       - `Arcane Lectern`: `fixtureTile: { x: 11, y: 2 }`, `anchorTile: { x: 11, y: 3 }`
       - `Anvil Forge`: `fixtureTile: { x: 3, y: 5 }`, `anchorTile: { x: 3, y: 6 }`
       - `Reactor Console`: `fixtureTile: { x: 8, y: 5 }`, `anchorTile: { x: 8, y: 6 }`
       - `Comms Dish`: `fixtureTile: { x: 12, y: 5 }`, `anchorTile: { x: 12, y: 6 }`
       - `Altar of Compaction`: `fixtureTile: { x: 11, y: 8 }`, `anchorTile: { x: 11, y: 9 }`
     - **`Summoning Pad`**: walkable rune pad at `fixtureTile: { x: 7, y: 8 }`, `anchorTile: { x: 7, y: 8 }`.
     - **`Break Lounge`** (`bounds: { x: 2, y: 8, width: 4, height: 3 }`, `anchorTile: { x: 3, y: 9 }`):
       - `hearthTableSlots` (`recentlyIdle` coffee seats): `{ x: 2, y: 8 }`, `{ x: 3, y: 8 }`, `{ x: 4, y: 8 }`, `{ x: 2, y: 9 }`, `{ x: 3, y: 9 }`, `{ x: 4, y: 9 }`.
       - `sessionBenchSlots` (`historical` bench seats): `{ x: 2, y: 10 }`, `{ x: 3, y: 10 }`, `{ x: 4, y: 10 }`, `{ x: 5, y: 10 }`, `{ x: 5, y: 9 }`, `{ x: 5, y: 8 }`.
   - **Expandable Eastern `Plugin Alcove` Wing (`wing-0` to `wing-4+1`)**:
     - When `totalAlcoveBays > 0`, the eastern wall at `x = 15` opens into a walkable archway (`y: 2..9`) and annexes `wingWidth = totalAlcoveBays * 3 + 1` tiles (`width = 16 + wingWidth`, `height = 12`), keeping all 7 core `Workstation`s at identical room coordinates:
       - `wing-0` (`0` alcoves): `16 × 12`
       - `wing-1` (`1` alcove): `20 × 12` — bay `0` at `fixtureTile: { x: 17, y: 3 }`, `anchorTile: { x: 17, y: 4 }`
       - `wing-2` (`2` alcoves): `23 × 12` — bays `0..1` at `x = 17, 20`
       - `wing-3` (`3` alcoves): `26 × 12` — bays `0..2` at `x = 17, 20, 23`
       - `wing-4` (`4` alcoves): `29 × 12` — bays `0..3` at `x = 17, 20, 23, 26`
       - `wing-4+1` (`5+` plugins -> `4` prioritized dedicated alcoves + `1` multiplexing overflow alcove `alcove:overflow`): `32 × 12` — dedicated bays `0..3` at `x = 17, 20, 23, 26` plus overflow bay `4` at `fixtureTile: { x: 29, y: 3 }`, `anchorTile: { x: 29, y: 4 }` (`monogram: "MUX"`, `multiplexedNamespaces: string[]`).
     - Each alcove includes its live `statusCrystal` (`connected` = `#10b981` `"lit-emerald"`, `needs_auth` = `#f59e0b` `"pulsing-amber-lock"`, `failed` = `#ef4444` `"red-smoke"`, `disabled` = `#6b7280` `"unlit-stone"`).
     - `findTilePath` computes shortest 4-way cardinal walkable paths across the room and wing, automatically resolving non-walkable fixture targets to their adjacent walkable anchor tile and routing around blocked fixture tiles.

2. **Multi-Character Co-Occupancy Semicircle Slots & Multi-Namespace `Reactor Console` Telemetry Beams (`computeStationSlot`, `computeTelemetryBeams`)**:
   - **Co-Occupancy Semicircle (`computeStationSlot`)**: When 3+ `Guild Adventurer`s or `Squad Subagent`s occupy the same `Workstation` or `Plugin Alcove`, characters are assigned deterministic, non-overlapping walkable floor tiles around the station's `anchorTile` (`{ x: ax, y: ay }`):
     - `occupantIndex = 0`: `{ x: ax, y: ay }` (front center, `facing: "north"`)
     - `occupantIndex = 1`: `{ x: ax - 1, y: ay }` (left flank, `facing: "north"`)
     - `occupantIndex = 2`: `{ x: ax + 1, y: ay }` (right flank, `facing: "north"`)
     - `occupantIndex = 3`: `{ x: ax, y: ay + 1 }` (rear center, `facing: "north"`)
     - `occupantIndex = 4..5`: `{ x: ax - 1, y: ay + 1 }`, `{ x: ax + 1, y: ay + 1 }` (rear semicircle)
     - `occupantIndex = 6..7`: `{ x: fx - 1, y: fy }` (`facing: "east"`), `{ x: fx + 1, y: fy }` (`facing: "west"`)
     - `occupantIndex >= 8`: deterministic BFS ring expansion over unoccupied walkable floor tiles.
     - Overflow plugin namespaces (`5+`) automatically resolve their standing slots to `alcove:overflow` (`isOverflowAlcove: true`).
   - **Telemetry Beams (`computeTelemetryBeams`)**: During multi-namespace Code Mode `execute` scripts where a character works at the `Reactor Console` with `secondaryAlcoveTargets`, `computeTelemetryBeams` emits a `TelemetryBeam` per referenced namespace from `sourceTile: { x: 8, y: 5 }` to each target alcove's `fixtureTile` (`{ x: 17 + bayIndex * 3, y: 3 }`, routing overflow namespaces to `alcove:overflow` at `{ x: 29, y: 3 }`), complete with elevated arc `controlPoint`, rasterized Bresenham `waypoints`, `distanceTiles`, `colorHex`, and `targetStatus`.

3. **Zero-Shift `Workshop Room` Annexation on the `Guild Floorplan` (`layoutGuildFloorplan`, `annexWorkshopRoom`)**:
   - The `Guild Floorplan` allocates rooms on an append-only 2D world grid with fixed cell pitch `FLOORPLAN_COL_PITCH_TILES = 38` (`>= 32` max `wing-4+1` room width + `6`-tile hallway gap) and `FLOORPLAN_ROW_PITCH_TILES = 18` (`12` room height + `6`-tile boulevard gap):
     - Canonical `Project` roots (`isWorktree: false`) claim a dedicated row `gridRow = 0, 1, 2, ...` at `gridCol = 0` (`worldOffset = { x: 0, y: gridRow * 18 }`), linked vertically by `"project-spine"` `hallwayCorridors`.
     - Git `Worktree` rooms (`worktree_create` or `session_move` with `isWorktree: true` / `parentProjectDirectory`) are annexed onto their parent project's `gridRow` at the next available column `gridCol = 1, 2, 3, ...` (`worldOffset = { x: gridCol * 38, y: parentRow * 18 }`), linked horizontally by `"worktree-branch"` `hallwayCorridors`.
     - Because every grid cell reserves the full `38 × 18` tile envelope and slot coordinates are assigned monotonically, both annexing new rooms (`worktree_create` / `session_move`) and expanding an existing room's `Plugin Alcove` wing from `wing-0` (`width: 16`) to `wing-4+1` (`width: 32`) produce **zero coordinate shift (`dx = 0, dy = 0`)** for all existing rooms.
