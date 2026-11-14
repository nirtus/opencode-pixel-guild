import { normalizeLocationDirectory } from "../state/world-reducer.ts";
import {
  CORE_WORKSTATION_KINDS,
  WORKSTATION_CATALOG,
  type CoreWorkstationKind,
} from "../types/domain.ts";
import type { TileCoord, RoomTileCell, RoomTemplateId } from "./tile-grid.ts";
import {
  CORE_HALL_WIDTH,
  CORE_HALL_HEIGHT,
  DEMOLITION_BOMB_FIXTURE_TILE,
  DEMOLITION_BOMB_ANCHOR_TILE,
  CORE_WORKSTATION_COORDS,
  HEARTH_TABLE_SLOTS,
  SESSION_BENCH_SLOTS,
  GOAL_ASSEMBLY_PLATFORM_BOUNDS,
  GOAL_ASSEMBLY_PLATFORM_ANCHOR_TILE,
} from "./room-constants.ts";
import {
  createFloorZones,
  createFurnitureDescriptors,
  createLightingPlan,
  createNorthWallFace,
  createPartitionWalls,
  createPerimeterWindows,
  DEFAULT_DROP_SHADOW_RGBA,
} from "./room-architectural-decor.ts";
import {
  buildResourceStockpileFixture,
  buildRoomPluginAlcoves,
  createResourceStockpileCrates,
} from "./room-alcove-layout.ts";
import type {
  BreakLoungeFixtureLayout,
  DemolitionBombFixtureLayout,
  WorkshopRoomLayout,
  WorkshopRoomLayoutInput,
  WorkstationFixtureLayout,
} from "./room-layout-types.ts";

export const normalizeRoomDirectory = normalizeLocationDirectory;
export {
  normalizeLocationDirectory,
  buildRoomPluginAlcoves,
  createResourceStockpileCrates,
  buildResourceStockpileFixture,
};

export function layoutWorkshopRoom(
  input: WorkshopRoomLayoutInput,
): WorkshopRoomLayout {
  const locationDirectory = normalizeRoomDirectory(
    input.locationDirectory ?? input.roomId,
  );
  const roomId = normalizeRoomDirectory(input.roomId);
  const parentProjectDirectory = input.parentProjectDirectory
    ? normalizeRoomDirectory(input.parentProjectDirectory)
    : null;
  const isWorktree = Boolean(input.isWorktree || parentProjectDirectory);
  const projectId = input.projectId ?? parentProjectDirectory ?? locationDirectory;
  const projectName =
    input.projectName ??
    (locationDirectory.split("/").filter(Boolean).pop() || "guild-room");

  const {
    dedicatedAlcoves,
    overflowAlcove,
    allAlcoves,
    overflowNamespaces,
  } = buildRoomPluginAlcoves(input);

  const templateId: RoomTemplateId = "wing-0";
  const width = CORE_HALL_WIDTH;
  const height = CORE_HALL_HEIGHT;
  const doorTile: TileCoord = { x: 8, y: 0 };

  const workstations = {} as Record<CoreWorkstationKind, WorkstationFixtureLayout>;
  for (const kind of CORE_WORKSTATION_KINDS) {
    const coords = CORE_WORKSTATION_COORDS[kind];
    workstations[kind] = {
      stationId: `station:${kind}`,
      kind,
      fixtureTile: { ...coords.fixtureTile },
      anchorTile: { ...coords.anchorTile },
    };
  }

  const resourceStockpile = buildResourceStockpileFixture(
    dedicatedAlcoves,
    overflowNamespaces,
  );

  const breakLounge: BreakLoungeFixtureLayout = {
    stationId: "station:Break Lounge",
    kind: "Break Lounge",
    bounds: { x: 2, y: 8, width: 4, height: 3 },
    anchorTile: { x: 3, y: 9 },
    hearthTableSlots: HEARTH_TABLE_SLOTS.map((t) => ({ ...t })),
    sessionBenchSlots: SESSION_BENCH_SLOTS.map((t) => ({ ...t })),
  };

  const demolitionBomb: DemolitionBombFixtureLayout = {
    stationId: "fixture:Demolition Bomb",
    fixtureId: "Demolition Bomb",
    kind: "Demolition Bomb",
    label: "Demolition Bomb",
    fixtureTile: { ...DEMOLITION_BOMB_FIXTURE_TILE },
    anchorTile: { ...DEMOLITION_BOMB_ANCHOR_TILE },
    colorHex: WORKSTATION_CATALOG["Demolition Bomb"].accentHex,
    fuseSparkHex: "#fbbf24",
    outlineHex: "#1e293b",
  };

  const grid: RoomTileCell[][] = [];
  for (let y = 0; y < height; y += 1) {
    const row: RoomTileCell[] = [];
    for (let x = 0; x < width; x += 1) {
      const isOuterBorder =
        x === 0 || y === 0 || y === height - 1 || x === width - 1;
      row.push({
        x,
        y,
        kind: isOuterBorder ? "wall" : "floor",
        walkable: !isOuterBorder,
        fixtureId: null,
      });
    }
    grid.push(row);
  }

  grid[doorTile.y][doorTile.x] = {
    x: doorTile.x,
    y: doorTile.y,
    kind: "door",
    walkable: true,
    fixtureId: "door:entrance",
  };

  for (const station of Object.values(workstations)) {
    const { x, y } = station.fixtureTile;
    grid[y][x] = {
      x,
      y,
      kind: "fixture",
      walkable: false,
      fixtureId: station.stationId,
    };
  }

  for (
    let sy = resourceStockpile.bounds.y;
    sy < resourceStockpile.bounds.y + resourceStockpile.bounds.height;
    sy += 1
  ) {
    for (
      let sx = resourceStockpile.bounds.x;
      sx < resourceStockpile.bounds.x + resourceStockpile.bounds.width;
      sx += 1
    ) {
      grid[sy][sx] = {
        x: sx,
        y: sy,
        kind: "fixture",
        walkable: false,
        fixtureId: resourceStockpile.stationId,
      };
    }
  }

  for (const slot of [
    ...breakLounge.hearthTableSlots,
    ...breakLounge.sessionBenchSlots,
  ]) {
    grid[slot.y][slot.x] = {
      x: slot.x,
      y: slot.y,
      kind: "lounge",
      walkable: true,
      fixtureId: breakLounge.stationId,
    };
  }

  grid[demolitionBomb.fixtureTile.y][demolitionBomb.fixtureTile.x] = {
    x: demolitionBomb.fixtureTile.x,
    y: demolitionBomb.fixtureTile.y,
    kind: "fixture",
    walkable: false,
    fixtureId: demolitionBomb.fixtureId,
  };

  const dropShadowRgba = DEFAULT_DROP_SHADOW_RGBA;
  const wallThicknessPx = 10;
  const northWallFace = createNorthWallFace();
  const perimeterWindows = createPerimeterWindows();
  const partitionWalls = createPartitionWalls(dropShadowRgba);

  for (const pw of partitionWalls) {
    for (const tile of pw.tiles) {
      grid[tile.y][tile.x] = {
        x: tile.x,
        y: tile.y,
        kind: "partition-wall",
        walkable: false,
        fixtureId: pw.wallId,
      };
    }
  }

  const zones = createFloorZones();
  const furniture = createFurnitureDescriptors(resourceStockpile.crates);
  const lightingPlan = createLightingPlan(
    roomId,
    dropShadowRgba,
    perimeterWindows,
    furniture.wallTorches,
    workstations["Anvil Forge"].fixtureTile,
    furniture.hearthFireplace,
  );

  return {
    roomId,
    locationDirectory,
    projectId,
    projectName,
    isWorktree,
    parentProjectDirectory,
    templateId,
    width,
    height,
    wallThicknessPx,
    dropShadowRgba,
    northWallFace,
    perimeterWindows,
    partitionWalls,
    lightingPlan,
    coreBounds: { x: 0, y: 0, width: CORE_HALL_WIDTH, height: CORE_HALL_HEIGHT },
    wingBounds: null,
    doorTile,
    thinkingCenterTile: { x: 8, y: 4 },
    zones,
    workstations,
    resourceStockpile,
    breakLounge,
    demolitionBomb,
    goalAssemblyPlatform: {
      bounds: { ...GOAL_ASSEMBLY_PLATFORM_BOUNDS },
      anchorTile: { ...GOAL_ASSEMBLY_PLATFORM_ANCHOR_TILE },
    },
    wallTorches: furniture.wallTorches,
    stationRugs: furniture.stationRugs,
    bookshelves: furniture.bookshelves,
    questBulletinBoard: furniture.questBulletinBoard,
    weaponRacks: furniture.weaponRacks,
    forgeQuenchBarrel: furniture.forgeQuenchBarrel,
    hearthFireplace: furniture.hearthFireplace,
    banquetTable: furniture.banquetTable,
    resourceStockpileCrates: furniture.resourceStockpileCrates,
    furniture,
    pluginAlcoves: dedicatedAlcoves,
    overflowAlcove,
    allAlcoves,
    grid,
  };
}
