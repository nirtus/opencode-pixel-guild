import {
  type TileCoord,
  type RoomTileCell,
  CARDINAL_DELTAS,
  isInsideGrid,
} from "./tile-grid.ts";

export interface WalkableGridHolder {
  readonly width: number;
  readonly height: number;
  readonly grid: readonly (readonly RoomTileCell[])[];
}

export const PATHFINDING_CARDINAL_DELTAS = CARDINAL_DELTAS;

export function isInsideRoomGrid(
  room: WalkableGridHolder,
  tile: TileCoord,
): boolean {
  return isInsideGrid(room, tile);
}

export function resolveToWalkableTile(
  room: WalkableGridHolder,
  target: TileCoord,
): TileCoord | null {
  const clamped: TileCoord = {
    x: Math.max(0, Math.min(room.width - 1, Math.round(target.x))),
    y: Math.max(0, Math.min(room.height - 1, Math.round(target.y))),
  };
  if (room.grid[clamped.y]?.[clamped.x]?.walkable) {
    return clamped;
  }
  for (const delta of CARDINAL_DELTAS) {
    const candidate = { x: clamped.x + delta.x, y: clamped.y + delta.y };
    if (
      isInsideGrid(room, candidate) &&
      room.grid[candidate.y][candidate.x].walkable
    ) {
      return candidate;
    }
  }
  return null;
}
