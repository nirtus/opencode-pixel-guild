import type { CoreWorkstationKind, RoomFixtureKind } from "../types/domain.ts";
import type { TileCoord } from "./tile-grid.ts";
import type {
  BanquetTableDescriptor,
  BookshelfDescriptor,
  ForgeQuenchBarrelDescriptor,
  HearthFireplaceDescriptor,
  NorthWallFaceDescriptor,
  PartitionWallSegmentDescriptor,
  PerimeterWindowDescriptor,
  QuestBulletinBoardDescriptor,
  RadialLightPoolSpec,
  RoomLightingPlan,
  StationRugDescriptor,
  WallTorchDescriptor,
  WeaponRackDescriptor,
  WorkshopFloorZoneDescriptor,
  WorkshopRoomFurnitureDescriptors,
  ResourceStockpileCrateSpec,
} from "./furniture-descriptors.ts";

export const DEFAULT_DROP_SHADOW_RGBA = "rgba(15, 23, 42, 0.22)";

export function createNorthWallFace(): NorthWallFaceDescriptor {
  return {
    elevationPx: 22,
    masonryHex: "#475569",
    timberBeamHex: "#78350f",
    topMoldingHex: "#64748b",
    outlineHex: "#1e293b",
  };
}

export function createPerimeterWindows(): PerimeterWindowDescriptor[] {
  return [
    {
      windowId: "window:north-study",
      wall: "north",
      tile: { x: 2, y: 0 },
      widthTiles: 2,
      heightTiles: 1,
      glassHex: "#bae6fd",
      frameHex: "#78350f",
      outlineHex: "#1e293b",
      daylightShaft: {
        windowId: "window:north-study",
        wall: "north",
        tile: { x: 2, y: 0 },
        widthTiles: 2,
        lengthTiles: 3.5,
        angleDeg: 32,
        colorRgba: "rgba(254, 240, 138, 0.16)",
      },
    },
    {
      windowId: "window:north-arcane",
      wall: "north",
      tile: { x: 12, y: 0 },
      widthTiles: 2,
      heightTiles: 1,
      glassHex: "#bae6fd",
      frameHex: "#78350f",
      outlineHex: "#1e293b",
      daylightShaft: {
        windowId: "window:north-arcane",
        wall: "north",
        tile: { x: 12, y: 0 },
        widthTiles: 2,
        lengthTiles: 3.5,
        angleDeg: 32,
        colorRgba: "rgba(254, 240, 138, 0.16)",
      },
    },
    {
      windowId: "window:west-study",
      wall: "west",
      tile: { x: 0, y: 2 },
      widthTiles: 1,
      heightTiles: 2,
      glassHex: "#bae6fd",
      frameHex: "#78350f",
      outlineHex: "#1e293b",
      daylightShaft: {
        windowId: "window:west-study",
        wall: "west",
        tile: { x: 0, y: 2 },
        widthTiles: 2,
        lengthTiles: 3,
        angleDeg: 25,
        colorRgba: "rgba(254, 240, 138, 0.14)",
      },
    },
    {
      windowId: "window:east-forge",
      wall: "east",
      tile: { x: 15, y: 3 },
      widthTiles: 1,
      heightTiles: 2,
      glassHex: "#bae6fd",
      frameHex: "#78350f",
      outlineHex: "#1e293b",
      daylightShaft: {
        windowId: "window:east-forge",
        wall: "east",
        tile: { x: 15, y: 3 },
        widthTiles: 2,
        lengthTiles: 3,
        angleDeg: -25,
        colorRgba: "rgba(254, 240, 138, 0.14)",
      },
    },
  ];
}

export function createPartitionWalls(dropShadowRgba = DEFAULT_DROP_SHADOW_RGBA): PartitionWallSegmentDescriptor[] {
  return [
    {
      wallId: "partition:study-forge-west",
      label: "Study & Forge West Partition Wall",
      zoneFrom: "study-wood",
      zoneTo: "forge-tile",
      tiles: [
        { x: 1, y: 4 },
        { x: 2, y: 4 },
      ],
      archwayTiles: [
        { x: 3, y: 4 },
        { x: 4, y: 4 },
        { x: 5, y: 4 },
      ],
      archwayWidthTiles: 3,
      fillHex: "#475569",
      topMoldingHex: "#64748b",
      outlineHex: "#1e293b",
      dropShadowRgba,
    },
    {
      wallId: "partition:study-forge-east",
      label: "Study & Forge East Partition Wall",
      zoneFrom: "study-wood",
      zoneTo: "forge-tile",
      tiles: [
        { x: 13, y: 4 },
        { x: 14, y: 4 },
      ],
      archwayTiles: [
        { x: 10, y: 4 },
        { x: 11, y: 4 },
        { x: 12, y: 4 },
      ],
      archwayWidthTiles: 3,
      fillHex: "#475569",
      topMoldingHex: "#64748b",
      outlineHex: "#1e293b",
      dropShadowRgba,
    },
    {
      wallId: "partition:forge-lounge-north",
      label: "Forge & Break Lounge Partition Wall",
      zoneFrom: "forge-tile",
      zoneTo: "lounge-rug",
      tiles: [
        { x: 1, y: 7 },
        { x: 2, y: 7 },
      ],
      archwayTiles: [
        { x: 3, y: 7 },
        { x: 4, y: 7 },
        { x: 5, y: 7 },
      ],
      archwayWidthTiles: 3,
      fillHex: "#475569",
      topMoldingHex: "#64748b",
      outlineHex: "#1e293b",
      dropShadowRgba,
    },
    {
      wallId: "partition:forge-stockpile-north",
      label: "Forge & Resource Stockpile Partition Wall",
      zoneFrom: "forge-tile",
      zoneTo: "stockpile-stone",
      tiles: [
        { x: 13, y: 7 },
        { x: 14, y: 7 },
      ],
      archwayTiles: [
        { x: 9, y: 7 },
        { x: 10, y: 7 },
        { x: 11, y: 7 },
        { x: 12, y: 7 },
      ],
      archwayWidthTiles: 4,
      fillHex: "#475569",
      topMoldingHex: "#64748b",
      outlineHex: "#1e293b",
      dropShadowRgba,
    },
  ];
}

export function createFloorZones(): WorkshopFloorZoneDescriptor[] {
  return [
    {
      zoneId: "zone:study-wood",
      kind: "study-wood",
      label: "Study & Planning Zone",
      bounds: { x: 1, y: 1, width: 14, height: 3 },
      primaryFloorHex: "#e5c188",
      secondaryFloorHex: "#d4a373",
      workstations: ["Library Study Bookshelf", "Observatory Spyglass", "Arcane Lectern"],
    },
    {
      zoneId: "zone:forge-tile",
      kind: "forge-tile",
      label: "Forge & Engineering Zone",
      bounds: { x: 1, y: 4, width: 14, height: 4 },
      primaryFloorHex: "#cbd5e1",
      secondaryFloorHex: "#94a3b8",
      workstations: [
        "Anvil Forge",
        "Alchemy Lab",
        "Crafting Workbench",
        "Armory Wardrobe",
      ],
    },
    {
      zoneId: "zone:lounge-rug",
      kind: "lounge-rug",
      label: "Cozy Break Lounge Zone",
      bounds: { x: 1, y: 8, width: 6, height: 3 },
      primaryFloorHex: "#991b1b",
      secondaryFloorHex: "#fbbf24",
      workstations: ["Break Lounge"],
    },
    {
      zoneId: "zone:stockpile-stone",
      kind: "stockpile-stone",
      label: "Resource Stockpile Depot",
      bounds: { x: 12, y: 8, width: 3, height: 3 },
      primaryFloorHex: "#64748b",
      secondaryFloorHex: "#475569",
      workstations: ["Resource Stockpile"],
    },
  ];
}

export function createFurnitureDescriptors(
  resourceStockpileCrates: ResourceStockpileCrateSpec[],
): WorkshopRoomFurnitureDescriptors {
  const wallTorches: WallTorchDescriptor[] = [
    { torchId: "torch:north-west", wall: "north", tile: { x: 5, y: 0 }, lightRadiusTiles: 3.5, flameColorHex: "#f59e0b", glowColorHex: "#fef08a", castsWarmLightPool: true },
    { torchId: "torch:north-east", wall: "north", tile: { x: 10, y: 0 }, lightRadiusTiles: 3.5, flameColorHex: "#f59e0b", glowColorHex: "#fef08a", castsWarmLightPool: true },
    { torchId: "torch:west-forge", wall: "west", tile: { x: 0, y: 5 }, lightRadiusTiles: 3.5, flameColorHex: "#f97316", glowColorHex: "#fde047", castsWarmLightPool: true },
    { torchId: "torch:west-lounge", wall: "west", tile: { x: 0, y: 9 }, lightRadiusTiles: 3.5, flameColorHex: "#f59e0b", glowColorHex: "#fef08a", castsWarmLightPool: true },
    { torchId: "torch:east-comms", wall: "east", tile: { x: 15, y: 5 }, lightRadiusTiles: 3.5, flameColorHex: "#f59e0b", glowColorHex: "#fef08a", castsWarmLightPool: true },
    { torchId: "torch:east-stockpile", wall: "east", tile: { x: 15, y: 9 }, lightRadiusTiles: 3.5, flameColorHex: "#f59e0b", glowColorHex: "#fef08a", castsWarmLightPool: true },
  ];

  const stationRugs: StationRugDescriptor[] = [
    { rugId: "rug:break-lounge", label: "Break Lounge Crimson & Gold Woven Rug", zone: "lounge-rug", workstation: "Break Lounge", bounds: { x: 1, y: 8, width: 6, height: 3 }, primaryColorHex: "#991b1b", trimColorHex: "#fbbf24", pattern: "crimson-gold-woven" },
    { rugId: "rug:library-study", label: "Library Study Bookshelf Runner", zone: "study-wood", workstation: "Library Study Bookshelf", bounds: { x: 2, y: 2, width: 3, height: 2 }, primaryColorHex: "#1e3a8a", trimColorHex: "#38bdf8", pattern: "azure-blueprint-runner" },
    { rugId: "rug:arcane-lectern", label: "Arcane Lectern Grimoire Runner", zone: "study-wood", workstation: "Arcane Lectern", bounds: { x: 10, y: 2, width: 3, height: 2 }, primaryColorHex: "#581c87", trimColorHex: "#c084fc", pattern: "amethyst-arcane-runner" },
    { rugId: "rug:armory-wardrobe", label: "Armory Wardrobe Mat", zone: "forge-tile", workstation: "Armory Wardrobe", bounds: { x: 10, y: 8, width: 2, height: 2 }, primaryColorHex: "#831843", trimColorHex: "#f472b6", pattern: "amber-hearth-mat" },
  ];

  const bookshelves: BookshelfDescriptor[] = [
    { shelfId: "bookshelf:study-west", label: "Architect's Blueprint & Lore Bookshelf", zone: "study-wood", tile: { x: 2, y: 1 }, bounds: { x: 1, y: 1, width: 3, height: 1 }, hasSlidingLadder: true, scrollRackCount: 2, woodColorHex: "#78350f", outlineHex: "#1e293b", nearWorkstation: "Library Study Bookshelf" },
    { shelfId: "bookshelf:arcane-east", label: "Grimoire Archive Bookshelf with Sliding Ladder", zone: "study-wood", tile: { x: 11, y: 1 }, bounds: { x: 10, y: 1, width: 3, height: 1 }, hasSlidingLadder: true, scrollRackCount: 3, woodColorHex: "#78350f", outlineHex: "#1e293b", nearWorkstation: "Arcane Lectern" },
  ];

  const questBulletinBoard: QuestBulletinBoardDescriptor = {
    boardId: "prop:quest-bulletin-board",
    label: "Guild Quest Bulletin Board",
    zone: "study-wood",
    tile: { x: 5, y: 1 },
    bounds: { x: 5, y: 1, width: 2, height: 1 },
    woodColorHex: "#78350f",
    parchmentHex: "#fef3c7",
    outlineHex: "#1e293b",
    pinnedNoticeCount: 4,
    nearWorkstation: "Library Study Bookshelf",
  };

  const weaponRacks: WeaponRackDescriptor[] = [
    { rackId: "weapon-rack:forge-arms", label: "Forge Halberd & Broadsword Rack", zone: "forge-tile", kind: "polearm-broadsword-rack", tile: { x: 1, y: 5 }, bounds: { x: 1, y: 4, width: 1, height: 2 }, items: ["halberd", "broadsword", "warhammer"], metalColorHex: "#94a3b8", woodColorHex: "#78350f", outlineHex: "#1e293b", nearWorkstation: "Anvil Forge" },
    { rackId: "weapon-rack:armor-stand", label: "Guild Plate & Visored Helm Stand", zone: "forge-tile", kind: "armor-stand", tile: { x: 1, y: 6 }, bounds: { x: 1, y: 6, width: 1, height: 1 }, items: ["visored-helm", "breastplate"], metalColorHex: "#cbd5e1", woodColorHex: "#78350f", outlineHex: "#1e293b", nearWorkstation: "Anvil Forge" },
    { rackId: "weapon-rack:practice-dummy", label: "Combat Training Practice Dummy", zone: "forge-tile", kind: "practice-dummy", tile: { x: 5, y: 5 }, bounds: { x: 5, y: 5, width: 1, height: 1 }, items: ["wooden-dummy", "straw-target"], metalColorHex: "#94a3b8", woodColorHex: "#b45309", outlineHex: "#1e293b", nearWorkstation: "Anvil Forge" },
  ];

  const forgeQuenchBarrel: ForgeQuenchBarrelDescriptor = {
    barrelId: "prop:forge-quench-barrel",
    label: "Forge Water Quench Barrel",
    zone: "forge-tile",
    tile: { x: 4, y: 5 },
    nearWorkstation: "Anvil Forge",
    woodColorHex: "#78350f",
    waterColorHex: "#38bdf8",
    ironHoopsHex: "#475569",
    outlineHex: "#1e293b",
    emitsSteamOnForgeActive: true,
  };

  const hearthFireplace: HearthFireplaceDescriptor = {
    fireplaceId: "prop:hearth-fireplace",
    label: "Break Lounge Stone Hearth Fireplace",
    zone: "lounge-rug",
    tile: { x: 1, y: 9 },
    bounds: { x: 1, y: 8, width: 1, height: 2 },
    stoneColorHex: "#64748b",
    flameColorHex: "#f97316",
    emberGlowHex: "#fde047",
    outlineHex: "#1e293b",
    lightRadiusTiles: 4.5,
  };

  const banquetTable: BanquetTableDescriptor = {
    tableId: "prop:lounge-banquet-table",
    label: "Guild Hall Hearth Banquet & Coffee Table",
    zone: "lounge-rug",
    tile: { x: 3, y: 8 },
    bounds: { x: 2, y: 8, width: 3, height: 2 },
    woodColorHex: "#92400e",
    trimColorHex: "#d97706",
    outlineHex: "#1e293b",
    steamingMugCount: 3,
    sectionalSofaTiles: [{ x: 2, y: 10 }, { x: 3, y: 10 }, { x: 4, y: 10 }, { x: 5, y: 10 }, { x: 5, y: 9 }],
    pottedPlantTiles: [{ x: 1, y: 10 }, { x: 6, y: 10 }],
  };

  return {
    wallTorches,
    stationRugs,
    bookshelves,
    questBulletinBoard,
    weaponRacks,
    forgeQuenchBarrel,
    hearthFireplace,
    banquetTable,
    resourceStockpileCrates,
  };
}

export function createLightingPlan(
  roomId: string,
  dropShadowRgba: string,
  perimeterWindows: PerimeterWindowDescriptor[],
  wallTorches: WallTorchDescriptor[],
  anvilForgeFixtureTile: TileCoord,
  hearthFireplace: HearthFireplaceDescriptor,
): RoomLightingPlan {
  return {
    roomId,
    ambientDropShadowRgba: dropShadowRgba,
    windowDaylightShafts: perimeterWindows.map((w) => ({
      ...w.daylightShaft,
      tile: { ...w.daylightShaft.tile },
    })),
    radialLightPools: [
      ...wallTorches.map((t, idx) => ({
        lightId: `light:${t.torchId}`,
        sourceKind: "wall-torch" as const,
        tile: { ...t.tile },
        radiusTiles: t.lightRadiusTiles,
        innerColorRgba: "rgba(254, 240, 138, 0.22)",
        outerColorRgba: "rgba(245, 158, 11, 0.0)",
        flickerPhase: idx * 0.8,
      })),
      {
        lightId: "light:anvil-forge-hearth",
        sourceKind: "anvil-forge" as const,
        tile: { ...anvilForgeFixtureTile },
        radiusTiles: 4.0,
        innerColorRgba: "rgba(249, 115, 22, 0.28)",
        outerColorRgba: "rgba(249, 115, 22, 0.0)",
        flickerPhase: 1.5,
      },
      {
        lightId: "light:lounge-hearth-fireplace",
        sourceKind: "lounge-hearth" as const,
        tile: { ...hearthFireplace.tile },
        radiusTiles: hearthFireplace.lightRadiusTiles,
        innerColorRgba: "rgba(251, 146, 60, 0.26)",
        outerColorRgba: "rgba(251, 146, 60, 0.0)",
        flickerPhase: 2.3,
      },
    ],
  };
}
