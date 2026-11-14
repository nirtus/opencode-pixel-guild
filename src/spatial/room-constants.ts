import {
  CORE_WORKSTATION_KINDS,
  WORKSTATION_CATALOG,
  type CoreWorkstationKind,
} from "../types/domain.ts";
import type { TileCoord, TileBounds } from "./tile-grid.ts";

export const CORE_HALL_WIDTH = 16;
export const CORE_HALL_HEIGHT = 12;

export const RESOURCE_STOCKPILE_BOUNDS: TileBounds = Object.freeze({
  x: 13,
  y: 8,
  width: 2,
  height: 2,
});

export const RESOURCE_STOCKPILE_FIXTURE_TILE: TileCoord = Object.freeze({
  x: 13,
  y: 8,
});
export const RESOURCE_STOCKPILE_ANCHOR_TILE: TileCoord = Object.freeze({
  x: 12,
  y: 8,
});

export const DEMOLITION_BOMB_FIXTURE_TILE: TileCoord = Object.freeze({
  ...WORKSTATION_CATALOG["Demolition Bomb"].fixtureTile,
});
export const DEMOLITION_BOMB_ANCHOR_TILE: TileCoord = Object.freeze({
  ...WORKSTATION_CATALOG["Demolition Bomb"].anchorTile,
});

export const GOAL_ASSEMBLY_PLATFORM_BOUNDS: TileBounds = Object.freeze({
  x: 6,
  y: 5,
  width: 4,
  height: 3,
});

export const GOAL_ASSEMBLY_PLATFORM_ANCHOR_TILE: TileCoord = Object.freeze({
  x: 8,
  y: 5,
});

export const CORE_WORKSTATION_COORDS: Readonly<
  Record<CoreWorkstationKind, { fixtureTile: TileCoord; anchorTile: TileCoord }>
> = Object.freeze(
  Object.fromEntries(
    CORE_WORKSTATION_KINDS.map((kind) => [
      kind,
      Object.freeze({
        fixtureTile: Object.freeze({ ...WORKSTATION_CATALOG[kind].fixtureTile }),
        anchorTile: Object.freeze({ ...WORKSTATION_CATALOG[kind].anchorTile }),
      }),
    ]),
  ) as Record<CoreWorkstationKind, { fixtureTile: TileCoord; anchorTile: TileCoord }>,
);

export const HEARTH_TABLE_SLOTS: readonly TileCoord[] = Object.freeze([
  Object.freeze({ x: 2, y: 8 }),
  Object.freeze({ x: 3, y: 8 }),
  Object.freeze({ x: 4, y: 8 }),
  Object.freeze({ x: 2, y: 9 }),
  Object.freeze({ x: 3, y: 9 }),
  Object.freeze({ x: 4, y: 9 }),
]);

export const SESSION_BENCH_SLOTS: readonly TileCoord[] = Object.freeze([
  Object.freeze({ x: 2, y: 10 }),
  Object.freeze({ x: 3, y: 10 }),
  Object.freeze({ x: 4, y: 10 }),
  Object.freeze({ x: 5, y: 10 }),
  Object.freeze({ x: 5, y: 9 }),
  Object.freeze({ x: 5, y: 8 }),
]);
