import type {
  CoreWorkstationKind,
  PluginAlcoveArchetype,
  PluginStatusKind,
  ResourceCargoKind,
  RoomFixtureKind,
  WorkstationKind,
} from "../types/domain.ts";
import type { TileCoord, TileBounds, RoomTemplateId, RoomTileCell } from "./tile-grid.ts";
import type {
  BanquetTableDescriptor,
  BookshelfDescriptor,
  ForgeQuenchBarrelDescriptor,
  HearthFireplaceDescriptor,
  NorthWallFaceDescriptor,
  OutdoorCompoundPlan,
  PartitionWallSegmentDescriptor,
  PerimeterWindowDescriptor,
  QuestBulletinBoardDescriptor,
  ResourceStockpileCrateSpec,
  RoomLightingPlan,
  StationRugDescriptor,
  WallTorchDescriptor,
  WeaponRackDescriptor,
  WorkshopFloorZoneDescriptor,
  WorkshopRoomFurnitureDescriptors,
} from "./furniture-descriptors.ts";
import type { StatusCrystalVisual } from "./status-crystal.ts";

export interface WorkstationFixtureLayout {
  stationId: string;
  kind: CoreWorkstationKind;
  fixtureTile: TileCoord;
  anchorTile: TileCoord;
}

export interface BreakLoungeFixtureLayout {
  stationId: string;
  kind: "Break Lounge";
  bounds: TileBounds;
  anchorTile: TileCoord;
  hearthTableSlots: TileCoord[];
  sessionBenchSlots: TileCoord[];
}

export interface DemolitionBombFixtureLayout {
  stationId: string;
  fixtureId: "Demolition Bomb";
  kind: "Demolition Bomb";
  label: string;
  fixtureTile: TileCoord;
  anchorTile: TileCoord;
  colorHex: string;
  fuseSparkHex: string;
  outlineHex: string;
}

export interface ResourceStockpileFixtureLayout {
  stationId: string;
  kind: "Resource Stockpile";
  bounds: TileBounds;
  fixtureTile: TileCoord;
  anchorTile: TileCoord;
  crates: ResourceStockpileCrateSpec[];
  configuredPlugins: PluginAlcoveFixtureLayout[];
  overflowPluginNamespaces: string[];
}

export interface PluginAlcoveFixtureLayout {
  alcoveId: string;
  bayIndex?: number;
  namespace: string;
  displayName: string;
  isOverflow: boolean;
  multiplexedNamespaces?: string[];
  status: PluginStatusKind;
  statusCrystal: StatusCrystalVisual;
  crystal: StatusCrystalVisual;
  archetype: PluginAlcoveArchetype;
  monogram: string;
  colorHex: string;
  toolCount?: number;
  activeCharacterIds?: string[];
  lastInvokedAtMs?: number | null;
  fixtureTile: TileCoord;
  anchorTile: TileCoord;
  overflowCount?: number;
}

export interface PluginAlcoveLayoutInput {
  namespace: string;
  displayName?: string;
  status?: PluginStatusKind;
  color?: string;
  colorHex?: string;
  archetype?: PluginAlcoveArchetype;
  monogram?: string;
  toolCount?: number;
  activeCharacterIds?: string[];
  lastInvokedAtMs?: number | null;
  source?: { type?: string };
  tools?: string[];
  capabilities?: string[];
  isOverflow?: boolean;
}

export interface WorkshopRoomLayoutInput {
  roomId: string;
  locationDirectory?: string;
  projectId?: string;
  projectName?: string;
  isWorktree?: boolean;
  parentProjectDirectory?: string | null;
  pluginAlcoves?: PluginAlcoveLayoutInput[];
  plugins?: PluginAlcoveLayoutInput[];
  overflowPluginNamespaces?: string[];
}

export interface WorkshopRoomLayout {
  roomId: string;
  locationDirectory: string;
  projectId: string;
  projectName: string;
  isWorktree: boolean;
  parentProjectDirectory: string | null;
  templateId: RoomTemplateId;
  width: number;
  height: number;
  wallThicknessPx: number;
  dropShadowRgba: string;
  northWallFace: NorthWallFaceDescriptor;
  perimeterWindows: PerimeterWindowDescriptor[];
  partitionWalls: PartitionWallSegmentDescriptor[];
  lightingPlan: RoomLightingPlan;
  coreBounds: TileBounds;
  wingBounds: TileBounds | null;
  doorTile: TileCoord;
  thinkingCenterTile: TileCoord;
  zones: WorkshopFloorZoneDescriptor[];
  workstations: Record<CoreWorkstationKind, WorkstationFixtureLayout>;
  resourceStockpile: ResourceStockpileFixtureLayout;
  breakLounge: BreakLoungeFixtureLayout;
  demolitionBomb: DemolitionBombFixtureLayout;
  goalAssemblyPlatform: {
    bounds: TileBounds;
    anchorTile: TileCoord;
  };
  wallTorches: WallTorchDescriptor[];
  stationRugs: StationRugDescriptor[];
  bookshelves: BookshelfDescriptor[];
  questBulletinBoard: QuestBulletinBoardDescriptor;
  weaponRacks: WeaponRackDescriptor[];
  forgeQuenchBarrel: ForgeQuenchBarrelDescriptor;
  hearthFireplace: HearthFireplaceDescriptor;
  banquetTable: BanquetTableDescriptor;
  resourceStockpileCrates: ResourceStockpileCrateSpec[];
  furniture: WorkshopRoomFurnitureDescriptors;
  pluginAlcoves: PluginAlcoveFixtureLayout[];
  overflowAlcove: PluginAlcoveFixtureLayout | null;
  allAlcoves: PluginAlcoveFixtureLayout[];
  grid: RoomTileCell[][];
  outdoorCompound?: OutdoorCompoundPlan;
}
