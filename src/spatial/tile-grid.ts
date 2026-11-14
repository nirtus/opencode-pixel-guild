export interface TileCoord {
  x: number;
  y: number;
}

export interface TileBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type TileKind =
  | "wall"
  | "partition-wall"
  | "floor"
  | "door"
  | "fixture"
  | "lounge"
  | "corridor";

export interface RoomTileCell {
  x: number;
  y: number;
  kind: TileKind;
  walkable: boolean;
  fixtureId: string | null;
}

export type RoomTemplateId =
  | "wing-0"
  | "wing-1"
  | "wing-2"
  | "wing-3"
  | "wing-4"
  | "wing-4+1";

export const CARDINAL_DELTAS: readonly TileCoord[] = Object.freeze([
  Object.freeze({ x: 0, y: 1 }), // South (preferred for anchor tiles below fixtures)
  Object.freeze({ x: 1, y: 0 }), // East
  Object.freeze({ x: -1, y: 0 }), // West
  Object.freeze({ x: 0, y: -1 }), // North
]);

export function isInsideGrid(
  widthOrRoom: number | { width: number; height: number },
  heightOrTile: number | TileCoord,
  maybeTile?: TileCoord,
): boolean {
  if (typeof widthOrRoom === "object" && typeof heightOrTile === "object") {
    const room = widthOrRoom;
    const tile = heightOrTile;
    return tile.x >= 0 && tile.x < room.width && tile.y >= 0 && tile.y < room.height;
  }
  const width = widthOrRoom as number;
  const height = heightOrTile as number;
  const tile = maybeTile as TileCoord;
  return tile.x >= 0 && tile.x < width && tile.y >= 0 && tile.y < height;
}

export function manhattanDistance(a: TileCoord, b: TileCoord): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
