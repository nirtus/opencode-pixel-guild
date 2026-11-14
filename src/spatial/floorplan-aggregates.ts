import type { TileCoord, TileBounds } from "./tile-grid.ts";
import { CORE_HALL_WIDTH, CORE_HALL_HEIGHT } from "./room-constants.ts";
import type {
  OutdoorCompoundPlan,
  OutdoorStoneFootpathSegment,
  OutdoorTreeClusterDescriptor,
} from "./furniture-descriptors.ts";
import { normalizeRoomDirectory } from "./room-layout.ts";
import type { WorkshopRoomLayout } from "./room-layout-types.ts";

function computeLineWaypoints(from: TileCoord, to: TileCoord): TileCoord[] {
  const points: TileCoord[] = [];
  let x0 = Math.round(from.x);
  let y0 = Math.round(from.y);
  const x1 = Math.round(to.x);
  const y1 = Math.round(to.y);
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  while (true) {
    points.push({ x: x0, y: y0 });
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
  return points;
}

export const FLOORPLAN_COL_PITCH_TILES = 38;
export const FLOORPLAN_ROW_PITCH_TILES = 18;

export interface PlacedWorkshopRoomLayout {
  roomId: string;
  projectKey: string;
  gridRow: number;
  gridCol: number;
  worldOffset: TileCoord;
  worldBounds: TileBounds;
  worldDoorTile: TileCoord;
  room: WorkshopRoomLayout;
}

export interface HallwayCorridorSegment {
  corridorId: string;
  kind: "worktree-branch" | "project-spine";
  fromRoomId: string;
  toRoomId: string;
  fromWorldTile: TileCoord;
  toWorldTile: TileCoord;
  waypoints: TileCoord[];
}

export interface GuildFloorplanLayout {
  colPitchTiles: number;
  rowPitchTiles: number;
  rooms: Record<string, PlacedWorkshopRoomLayout>;
  roomOrder: string[];
  projectRows: Record<string, number>;
  hallwayCorridors: HallwayCorridorSegment[];
  outdoorCompound: OutdoorCompoundPlan;
  worldBounds: TileBounds;
}

export function inferProjectKey(room: WorkshopRoomLayout): string {
  if (room.parentProjectDirectory) {
    return normalizeRoomDirectory(room.parentProjectDirectory);
  }
  if (room.isWorktree) {
    const wtMatch = /^(.*?)\/\.worktrees\/[^/]+$/.exec(room.locationDirectory);
    if (wtMatch && wtMatch[1]) {
      return normalizeRoomDirectory(wtMatch[1]);
    }
  }
  return room.locationDirectory;
}

export function buildFloorplanAggregates(
  rooms: Record<string, PlacedWorkshopRoomLayout>,
  roomOrder: string[],
  projectRows: Record<string, number>,
): GuildFloorplanLayout {
  const hallwayCorridors: HallwayCorridorSegment[] = [];
  const roomsByRow = new Map<number, PlacedWorkshopRoomLayout[]>();

  for (const roomId of roomOrder) {
    const placed = rooms[roomId];
    if (!placed) {
      continue;
    }
    const list = roomsByRow.get(placed.gridRow) ?? [];
    list.push(placed);
    roomsByRow.set(placed.gridRow, list);
  }

  const sortedRowIndices = [...roomsByRow.keys()].sort((a, b) => a - b);

  for (const rowIdx of sortedRowIndices) {
    const rowRooms = (roomsByRow.get(rowIdx) ?? []).sort(
      (a, b) => a.gridCol - b.gridCol,
    );
    for (let i = 1; i < rowRooms.length; i += 1) {
      const prev = rowRooms[i - 1];
      const curr = rowRooms[i];
      const hallwayY = curr.worldDoorTile.y - 2;
      hallwayCorridors.push({
        corridorId: `corridor:branch:${prev.roomId}->${curr.roomId}`,
        kind: "worktree-branch",
        fromRoomId: prev.roomId,
        toRoomId: curr.roomId,
        fromWorldTile: { ...prev.worldDoorTile },
        toWorldTile: { ...curr.worldDoorTile },
        waypoints: [
          { ...prev.worldDoorTile },
          { x: prev.worldDoorTile.x, y: hallwayY },
          { x: curr.worldDoorTile.x, y: hallwayY },
          { ...curr.worldDoorTile },
        ],
      });
    }
  }

  for (let i = 1; i < sortedRowIndices.length; i += 1) {
    const prevRowRooms = (roomsByRow.get(sortedRowIndices[i - 1]) ?? []).sort(
      (a, b) => a.gridCol - b.gridCol,
    );
    const currRowRooms = (roomsByRow.get(sortedRowIndices[i]) ?? []).sort(
      (a, b) => a.gridCol - b.gridCol,
    );
    const upper = prevRowRooms[0];
    const lower = currRowRooms[0];
    if (upper && lower) {
      const spineX = Math.min(upper.worldBounds.x, lower.worldBounds.x) - 2;
      const upperApronY = upper.worldDoorTile.y - 2;
      const lowerApronY = lower.worldDoorTile.y - 2;
      hallwayCorridors.push({
        corridorId: `corridor:spine:${upper.roomId}->${lower.roomId}`,
        kind: "project-spine",
        fromRoomId: upper.roomId,
        toRoomId: lower.roomId,
        fromWorldTile: { ...upper.worldDoorTile },
        toWorldTile: { ...lower.worldDoorTile },
        waypoints: [
          { ...upper.worldDoorTile },
          { x: upper.worldDoorTile.x, y: upperApronY },
          { x: spineX, y: upperApronY },
          { x: spineX, y: lowerApronY },
          { x: lower.worldDoorTile.x, y: lowerApronY },
          { ...lower.worldDoorTile },
        ],
      });
    }
  }

  let maxRight = CORE_HALL_WIDTH;
  let maxBottom = CORE_HALL_HEIGHT;
  for (const placed of Object.values(rooms)) {
    maxRight = Math.max(
      maxRight,
      placed.worldBounds.x + placed.worldBounds.width,
    );
    maxBottom = Math.max(
      maxBottom,
      placed.worldBounds.y + placed.worldBounds.height,
    );
  }

  const stoneFootpaths: OutdoorStoneFootpathSegment[] = [];
  const treeClusters: OutdoorTreeClusterDescriptor[] = [];

  for (const roomId of roomOrder) {
    const placed = rooms[roomId];
    if (!placed) {
      continue;
    }
    const doorX = placed.worldDoorTile.x;
    const doorY = placed.worldDoorTile.y;
    stoneFootpaths.push({
      pathId: `footpath:apron:${placed.roomId}`,
      kind: "doorway-apron",
      fromRoomId: placed.roomId,
      toRoomId: null,
      tiles: [
        { x: doorX, y: doorY },
        { x: doorX, y: doorY - 1 },
        { x: doorX, y: doorY - 2 },
      ],
      stoneHex: "#94a3b8",
      mortarHex: "#475569",
      outlineHex: "#1e293b",
    });

    const rx = placed.worldBounds.x;
    const ry = placed.worldBounds.y;
    const rw = placed.worldBounds.width;
    const rh = placed.worldBounds.height;
    const perimeterOffsets = [
      { id: "nw", x: rx - 2, y: ry - 2, r: 1.6, canopy: "#15803d", highlight: "#4ade80" },
      { id: "ne", x: rx + rw + 2, y: ry - 2, r: 1.5, canopy: "#166534", highlight: "#22c55e" },
      { id: "sw", x: rx - 2, y: ry + rh + 2, r: 1.7, canopy: "#15803d", highlight: "#4ade80" },
      { id: "se", x: rx + rw + 2, y: ry + rh + 2, r: 1.5, canopy: "#166534", highlight: "#22c55e" },
    ];
    for (const pt of perimeterOffsets) {
      treeClusters.push({
        clusterId: `tree:${placed.roomId}:${pt.id}`,
        worldTile: { x: pt.x, y: pt.y },
        radiusTiles: pt.r,
        canopyHex: pt.canopy,
        highlightHex: pt.highlight,
        trunkHex: "#78350f",
        outlineHex: "#1e293b",
        shadowRgba: "rgba(15, 23, 42, 0.22)",
      });
    }
  }

  for (const corridor of hallwayCorridors) {
    const tiles: TileCoord[] = [];
    for (let i = 1; i < corridor.waypoints.length; i += 1) {
      const segPts = computeLineWaypoints(
        corridor.waypoints[i - 1],
        corridor.waypoints[i],
      );
      for (const pt of segPts) {
        if (
          tiles.length === 0 ||
          tiles[tiles.length - 1].x !== pt.x ||
          tiles[tiles.length - 1].y !== pt.y
        ) {
          tiles.push(pt);
        }
      }
    }
    stoneFootpaths.push({
      pathId: `footpath:${corridor.corridorId}`,
      kind:
        corridor.kind === "worktree-branch"
          ? "worktree-annex-walkway"
          : "courtyard-spine",
      fromRoomId: corridor.fromRoomId,
      toRoomId: corridor.toRoomId,
      tiles: tiles.length > 0 ? tiles : [...corridor.waypoints],
      stoneHex: "#94a3b8",
      mortarHex: "#475569",
      outlineHex: "#1e293b",
    });
  }

  if (treeClusters.length === 0) {
    treeClusters.push(
      { clusterId: "tree:compound:nw", worldTile: { x: -2, y: -2 }, radiusTiles: 1.6, canopyHex: "#15803d", highlightHex: "#4ade80", trunkHex: "#78350f", outlineHex: "#1e293b", shadowRgba: "rgba(15, 23, 42, 0.22)" },
      { clusterId: "tree:compound:ne", worldTile: { x: CORE_HALL_WIDTH + 2, y: -2 }, radiusTiles: 1.5, canopyHex: "#166534", highlightHex: "#22c55e", trunkHex: "#78350f", outlineHex: "#1e293b", shadowRgba: "rgba(15, 23, 42, 0.22)" },
      { clusterId: "tree:compound:sw", worldTile: { x: -2, y: CORE_HALL_HEIGHT + 2 }, radiusTiles: 1.7, canopyHex: "#15803d", highlightHex: "#4ade80", trunkHex: "#78350f", outlineHex: "#1e293b", shadowRgba: "rgba(15, 23, 42, 0.22)" },
      { clusterId: "tree:compound:se", worldTile: { x: CORE_HALL_WIDTH + 2, y: CORE_HALL_HEIGHT + 2 }, radiusTiles: 1.5, canopyHex: "#166534", highlightHex: "#22c55e", trunkHex: "#78350f", outlineHex: "#1e293b", shadowRgba: "rgba(15, 23, 42, 0.22)" },
    );
  }

  const outdoorCompound: OutdoorCompoundPlan = {
    bounds: {
      x: -4,
      y: -4,
      width: maxRight + 8,
      height: maxBottom + 8,
    },
    primaryGrassHex: "#4d7c0f",
    secondaryGrassHex: "#3f6212",
    accentMeadowHex: "#65a30d",
    treeClusters,
    stoneFootpaths,
  };

  return {
    colPitchTiles: FLOORPLAN_COL_PITCH_TILES,
    rowPitchTiles: FLOORPLAN_ROW_PITCH_TILES,
    rooms,
    roomOrder,
    projectRows,
    hallwayCorridors,
    outdoorCompound,
    worldBounds: {
      x: 0,
      y: 0,
      width: maxRight,
      height: maxBottom,
    },
  };
}
