# Issue 03: Align Dungeon Wilds Brown Trail with East Archway Across Resizes

Type: bug
Label: ready-for-agent
Status: resolved

## Goal

Ensure the **Dungeon Wilds** brown hunting trail always aligns vertically with the **Workshop Room** East Wall Iron Archway Gateway across all screen sizes and aspect ratios (`src/web/canvas-room-painter.ts` and `src/web/canvas-wilds-painter.ts`).

## Acceptance Criteria

1. **Shared Portal Center Anchor (`src/web/canvas-room-painter.ts` & `src/web/canvas-wilds-painter.ts`)**:
   - In `paintStaticWorkshopRoomBase` (`src/web/canvas-room-painter.ts`):
     - Compute `const eastGateCenterY = anchorChamberPoint(768, 352, w, h).y;` and `const eastGateY = eastGateCenterY - 38;` so the `76px`-tall East Wall Iron Archway is always vertically centered on `anchorChamberPoint(..., 352, w, h).y`.
   - In `paintStaticWildernessTerrain` and `renderOutdoorWilderness` (`src/web/canvas-wilds-painter.ts`):
     - Anchor the brown trail start `p0` and control point `p1` vertical coordinate to `const gateCenterY = anchorChamberPoint(0, 352, w, h).y;` (matching `eastGateCenterY` identically for any `h`).
2. **Tests**:
   - Add a regression test verifying that across multiple chamber dimensions (`800×720`, `800×1100`, `1040×960`, `560×960`), the vertical center of the **Workshop Room** East Archway (`eastGateY + 38`) equals the **Dungeon Wilds** brown trail entry point `p0.y` (`0px` vertical drift).
