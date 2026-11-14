import type { GuildSnapshot } from "../types/domain.ts";
import type { TileCoord } from "./tile-grid.ts";
import {
  FLOORPLAN_COL_PITCH_TILES,
  FLOORPLAN_ROW_PITCH_TILES,
  buildFloorplanAggregates,
  inferProjectKey,
  type GuildFloorplanLayout,
  type PlacedWorkshopRoomLayout,
} from "./floorplan-aggregates.ts";
import { layoutWorkshopRoom } from "./room-layout.ts";
import type { WorkshopRoomLayoutInput } from "./room-layout-types.ts";

export {
  FLOORPLAN_COL_PITCH_TILES,
  FLOORPLAN_ROW_PITCH_TILES,
  buildFloorplanAggregates,
  inferProjectKey,
};
export type { GuildFloorplanLayout, PlacedWorkshopRoomLayout };

export function annexWorkshopRoom(
  existingFloorplan: GuildFloorplanLayout,
  roomInput: WorkshopRoomLayoutInput,
): GuildFloorplanLayout {
  const roomLayout = layoutWorkshopRoom(roomInput);
  const rooms: Record<string, PlacedWorkshopRoomLayout> = {
    ...existingFloorplan.rooms,
  };
  const roomOrder = [...existingFloorplan.roomOrder];
  const projectRows: Record<string, number> = {
    ...existingFloorplan.projectRows,
  };

  const existingPlaced = rooms[roomLayout.roomId];
  if (existingPlaced) {
    const worldOffset = { ...existingPlaced.worldOffset };
    rooms[roomLayout.roomId] = {
      ...existingPlaced,
      room: roomLayout,
      worldBounds: {
        x: worldOffset.x,
        y: worldOffset.y,
        width: roomLayout.width,
        height: roomLayout.height,
      },
      worldDoorTile: {
        x: worldOffset.x + roomLayout.doorTile.x,
        y: worldOffset.y + roomLayout.doorTile.y,
      },
    };
    return buildFloorplanAggregates(rooms, roomOrder, projectRows);
  }

  const projectKey = inferProjectKey(roomLayout);
  let gridRow = projectRows[projectKey];
  if (gridRow === undefined) {
    const usedRows = Object.values(rooms).map((r) => r.gridRow);
    gridRow = usedRows.length > 0 ? Math.max(...usedRows) + 1 : 0;
    projectRows[projectKey] = gridRow;
  }

  const occupiedColsInRow = new Set<number>();
  for (const placed of Object.values(rooms)) {
    if (placed.gridRow === gridRow) {
      occupiedColsInRow.add(placed.gridCol);
    }
  }

  let gridCol = 0;
  if (roomLayout.isWorktree) {
    const maxColInRow =
      occupiedColsInRow.size > 0 ? Math.max(...occupiedColsInRow) : 0;
    gridCol = Math.max(1, maxColInRow + 1);
  } else if (occupiedColsInRow.has(0)) {
    gridCol = Math.max(...occupiedColsInRow) + 1;
  }

  const worldOffset: TileCoord = {
    x: gridCol * FLOORPLAN_COL_PITCH_TILES,
    y: gridRow * FLOORPLAN_ROW_PITCH_TILES,
  };

  rooms[roomLayout.roomId] = {
    roomId: roomLayout.roomId,
    projectKey,
    gridRow,
    gridCol,
    worldOffset,
    worldBounds: {
      x: worldOffset.x,
      y: worldOffset.y,
      width: roomLayout.width,
      height: roomLayout.height,
    },
    worldDoorTile: {
      x: worldOffset.x + roomLayout.doorTile.x,
      y: worldOffset.y + roomLayout.doorTile.y,
    },
    room: roomLayout,
  };
  roomOrder.push(roomLayout.roomId);

  return buildFloorplanAggregates(rooms, roomOrder, projectRows);
}

export function layoutGuildFloorplan(
  source: WorkshopRoomLayoutInput[] | GuildSnapshot,
  previousFloorplan?: GuildFloorplanLayout,
): GuildFloorplanLayout {
  const inputs: WorkshopRoomLayoutInput[] = Array.isArray(source)
    ? source
    : source.roomOrder
        .map((id) => source.rooms[id])
        .filter((r): r is NonNullable<typeof r> => Boolean(r));

  let floorplan: GuildFloorplanLayout =
    previousFloorplan ??
    buildFloorplanAggregates({}, [], {});

  for (const roomInput of inputs) {
    floorplan = annexWorkshopRoom(floorplan, roomInput);
  }

  return floorplan;
}
