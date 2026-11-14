import type { RoomFixtureKind, ResourceCargoKind, WorkstationKind } from "../types/domain.ts";
import type { TileCoord, TileBounds } from "./tile-grid.ts";

export type WorkshopFloorZoneKind =
  | "study-wood"
  | "forge-tile"
  | "lounge-rug"
  | "stockpile-stone";

export interface WorkshopFloorZoneDescriptor {
  zoneId: string;
  kind: WorkshopFloorZoneKind;
  label: string;
  bounds: TileBounds;
  primaryFloorHex: string;
  secondaryFloorHex: string;
  workstations: RoomFixtureKind[];
}

export interface WallTorchDescriptor {
  torchId: string;
  wall: "north" | "west" | "east" | "south";
  tile: TileCoord;
  lightRadiusTiles: number;
  flameColorHex: string;
  glowColorHex: string;
  castsWarmLightPool: boolean;
}

export interface StationRugDescriptor {
  rugId: string;
  label: string;
  zone: WorkshopFloorZoneKind;
  workstation: RoomFixtureKind | null;
  bounds: TileBounds;
  primaryColorHex: string;
  trimColorHex: string;
  pattern:
    | "crimson-gold-woven"
    | "azure-blueprint-runner"
    | "amethyst-arcane-runner"
    | "amber-hearth-mat";
}

export interface BookshelfDescriptor {
  shelfId: string;
  label: string;
  zone: "study-wood";
  tile: TileCoord;
  bounds: TileBounds;
  hasSlidingLadder: boolean;
  scrollRackCount: number;
  woodColorHex: string;
  outlineHex: string;
  nearWorkstation: "Library Study Bookshelf" | "Arcane Lectern";
}

export interface QuestBulletinBoardDescriptor {
  boardId: string;
  label: string;
  zone: "study-wood";
  tile: TileCoord;
  bounds: TileBounds;
  woodColorHex: string;
  parchmentHex: string;
  outlineHex: string;
  pinnedNoticeCount: number;
  nearWorkstation: "Library Study Bookshelf" | "Arcane Lectern";
}

export interface WeaponRackDescriptor {
  rackId: string;
  label: string;
  zone: "forge-tile";
  kind: "polearm-broadsword-rack" | "armor-stand" | "practice-dummy";
  tile: TileCoord;
  bounds: TileBounds;
  items: string[];
  metalColorHex: string;
  woodColorHex: string;
  outlineHex: string;
  nearWorkstation: "Anvil Forge" | "Armory Wardrobe";
}

export interface ForgeQuenchBarrelDescriptor {
  barrelId: string;
  label: string;
  zone: "forge-tile";
  tile: TileCoord;
  nearWorkstation: "Anvil Forge";
  woodColorHex: string;
  waterColorHex: string;
  ironHoopsHex: string;
  outlineHex: string;
  emitsSteamOnForgeActive: boolean;
}

export interface HearthFireplaceDescriptor {
  fireplaceId: string;
  label: string;
  zone: "lounge-rug";
  tile: TileCoord;
  bounds: TileBounds;
  stoneColorHex: string;
  flameColorHex: string;
  emberGlowHex: string;
  outlineHex: string;
  lightRadiusTiles: number;
}

export interface BanquetTableDescriptor {
  tableId: string;
  label: string;
  zone: "lounge-rug";
  tile: TileCoord;
  bounds: TileBounds;
  woodColorHex: string;
  trimColorHex: string;
  outlineHex: string;
  steamingMugCount: number;
  sectionalSofaTiles: TileCoord[];
  pottedPlantTiles: TileCoord[];
}

export interface ResourceStockpileCrateSpec {
  crateId: string;
  cargoKind: ResourceCargoKind;
  label: string;
  colorHex: string;
  outlineHex: string;
  tile: TileCoord;
  mappedWorkstations: WorkstationKind[];
  mappedTools: string[];
}

export interface WorkshopRoomFurnitureDescriptors {
  wallTorches: WallTorchDescriptor[];
  stationRugs: StationRugDescriptor[];
  bookshelves: BookshelfDescriptor[];
  questBulletinBoard: QuestBulletinBoardDescriptor;
  weaponRacks: WeaponRackDescriptor[];
  forgeQuenchBarrel: ForgeQuenchBarrelDescriptor;
  hearthFireplace: HearthFireplaceDescriptor;
  banquetTable: BanquetTableDescriptor;
  resourceStockpileCrates: ResourceStockpileCrateSpec[];
}

export interface NorthWallFaceDescriptor {
  elevationPx: number;
  masonryHex: string;
  timberBeamHex: string;
  topMoldingHex: string;
  outlineHex: string;
}

export interface PerimeterWindowDaylightShaft {
  windowId: string;
  wall: "north" | "west" | "east";
  tile: TileCoord;
  widthTiles: number;
  lengthTiles: number;
  angleDeg: number;
  colorRgba: string;
}

export interface PerimeterWindowDescriptor {
  windowId: string;
  wall: "north" | "west" | "east";
  tile: TileCoord;
  widthTiles: number;
  heightTiles: number;
  glassHex: string;
  frameHex: string;
  outlineHex: string;
  daylightShaft: PerimeterWindowDaylightShaft;
}

export interface PartitionWallSegmentDescriptor {
  wallId: string;
  label: string;
  zoneFrom: WorkshopFloorZoneKind;
  zoneTo: WorkshopFloorZoneKind;
  tiles: TileCoord[];
  archwayTiles: TileCoord[];
  archwayWidthTiles: number;
  fillHex: string;
  topMoldingHex: string;
  outlineHex: string;
  dropShadowRgba: string;
}

export interface RadialLightPoolSpec {
  lightId: string;
  sourceKind:
    | "wall-torch"
    | "anvil-forge"
    | "lounge-hearth"
    | "summoning-pentagram";
  tile: TileCoord;
  radiusTiles: number;
  innerColorRgba: string;
  outerColorRgba: string;
  flickerPhase: number;
}

export interface RoomLightingPlan {
  roomId: string;
  roomOriginPx?: { x: number; y: number };
  tilePx?: number;
  ambientDropShadowRgba: string;
  windowDaylightShafts: PerimeterWindowDaylightShaft[];
  radialLightPools: RadialLightPoolSpec[];
}

export interface OutdoorTreeClusterDescriptor {
  clusterId: string;
  worldTile: TileCoord;
  radiusTiles: number;
  canopyHex: string;
  highlightHex: string;
  trunkHex: string;
  outlineHex: string;
  shadowRgba: string;
}

export interface OutdoorStoneFootpathSegment {
  pathId: string;
  kind: "doorway-apron" | "worktree-annex-walkway" | "courtyard-spine";
  fromRoomId: string;
  toRoomId: string | null;
  tiles: TileCoord[];
  stoneHex: string;
  mortarHex: string;
  outlineHex: string;
}

export interface OutdoorCompoundPlan {
  bounds: TileBounds;
  primaryGrassHex: string;
  secondaryGrassHex: string;
  accentMeadowHex: string;
  treeClusters: OutdoorTreeClusterDescriptor[];
  stoneFootpaths: OutdoorStoneFootpathSegment[];
}
