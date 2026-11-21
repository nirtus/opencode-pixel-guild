# Corridor Tile-Walk Choreography, Sequential Job Queueing, and Dim Target Pathlines

Type: prototype
Status: closed
Blocked by: 03, 06

## Architectural Decisions Settled

- **Obstacle-Avoiding `findTilePath` Corridor Walking (`Q3: A`)**:
  - Replace stateless per-frame coordinate snapping with a stateful per-character walker that computes 4-way cardinal routes via `findTilePath(room, currentTile, targetSlotTile)` around non-walkable `Workstation` fixtures and walls.
- **Sequential Job Queue Across Live Polls (`Q3: A`)**:
  - Extract chronological `recentTools` (`callId`, `toolName`, `workstation`, `pluginNamespace`, `status`, `inputPreview`, `timestampMs`) from `/api/session/{sessionID}/message`.
  - When a live sweep detects new tool executions since the last poll, enqueue those station visits into the character's `jobQueue` so the character visibly walks from station to station, performs a brief work dwell animation (`~1.8s` hammer sparks, radar sweep, or page flip with a floating `toolName(inputPreview)` badge), and then walks to the next queued station or `Break Lounge`—never teleporting across rooms or furniture.
- **4-Direction Walk Cycle, Footstep Dust Puffs & Dim Target Pathline (`Q3: A`)**:
  - While traversing `waypoints`, animate a 4-frame directional walk cycle (`north`, `south`, `east`, `west` facing, alternating pixel boots/legs, swinging main-hand weapon/tool, bobbing headgear/cape, and fading footstep dust puffs).
  - Render a **dim dotted/dashed pathline** from every walking or queued character along its remaining tile `waypoints` to its destination `Workstation`, `Plugin Alcove`, `Summoning Pad`, or `Break Lounge` slot (brightening when the character is hovered or selected).
