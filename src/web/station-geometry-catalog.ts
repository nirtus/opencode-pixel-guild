import type { CanonicalPreparationStationId } from "../encounter/index.ts";
import type { DirectionalTurnaround } from "../sprites/index.ts";
import {
  type AllocatePerimeterSlotInput,
  type AllocatePerimeterSlotWalkerView,
  allocateLoungeSeatSlot,
  allocateStationPerimeterSlot,
  ensureAvailableStationSlot,
  resolveInwardStationFacing,
  resolveLoungeSeatSlot,
} from "./station-slot-allocator.ts";

export {
  type AllocatePerimeterSlotInput,
  type AllocatePerimeterSlotWalkerView,
  allocateLoungeSeatSlot,
  allocateStationPerimeterSlot,
  ensureAvailableStationSlot,
  resolveInwardStationFacing,
  resolveLoungeSeatSlot,
};

export type AssemblyPacingSide = "top" | "left" | "right" | "bottom";

export interface StationPerimeterSlotSpec {
  readonly x: number;
  readonly y: number;
  readonly facingDirection: DirectionalTurnaround;
  readonly side:
    | "north"
    | "south"
    | "east"
    | "west"
    | "northwest"
    | "northeast"
    | "southwest"
    | "southeast";
}

export interface PreparationStationGeometrySpec {
  readonly stationId: CanonicalPreparationStationId;
  readonly workstationName: string;
  readonly painterOrigin: { readonly x: number; readonly y: number };
  readonly focalCenter: { readonly x: number; readonly y: number };
  readonly hitbox?: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  readonly perimeterSlots: ReadonlyArray<StationPerimeterSlotSpec>;
}

export const PENTAGRAM_CENTER = Object.freeze({ x: 206, y: 624 });
export const SOUTH_GUILD_DOOR_ENTRANCE = Object.freeze({ x: 400, y: 692, facingDirection: "north" as const });
export const SOUTH_DOOR_FOYER_WAYPOINT = Object.freeze({ x: 400, y: 560, facingDirection: "north" as const });

export const ASSEMBLY_PACING_SIDES: Readonly<
  Record<AssemblyPacingSide, { start: { x: number; y: number }; end: { x: number; y: number }; inwardFacing: DirectionalTurnaround }>
> = Object.freeze({
  top: { start: { x: 305, y: 228 }, end: { x: 475, y: 228 }, inwardFacing: "south" },
  left: { start: { x: 258, y: 280 }, end: { x: 258, y: 410 }, inwardFacing: "east" },
  right: { start: { x: 522, y: 280 }, end: { x: 522, y: 410 }, inwardFacing: "west" },
  bottom: { start: { x: 305, y: 452 }, end: { x: 475, y: 452 }, inwardFacing: "north" },
});

export const LOUNGE_SEAT_SLOTS: ReadonlyArray<StationPerimeterSlotSpec> = Object.freeze([
  // Tier 1 (0..10): 3 vertically-cleared bands (y=542, y=612, y=686) inside Break Lounge (x: 458..746, y: 540..690)
  { x: 556, y: 612, facingDirection: "east", side: "west" },
  { x: 684, y: 612, facingDirection: "west", side: "east" },
  { x: 628, y: 686, facingDirection: "north", side: "south" },
  { x: 616, y: 564, facingDirection: "south", side: "north" },
  { x: 476, y: 610, facingDirection: "east", side: "west" },
  { x: 536, y: 542, facingDirection: "south", side: "northwest" },
  { x: 696, y: 542, facingDirection: "south", side: "northeast" },
  { x: 516, y: 686, facingDirection: "north", side: "southwest" },
  { x: 708, y: 686, facingDirection: "north", side: "southeast" },
  { x: 462, y: 542, facingDirection: "south", side: "northwest" },
  { x: 742, y: 608, facingDirection: "west", side: "east" },
  // Tier 2 (11..19): Secondary honeycomb gaps around carpet & fixtures (pairwise dist >= 26px)
  { x: 582, y: 576, facingDirection: "south", side: "northwest" },
  { x: 658, y: 576, facingDirection: "south", side: "northeast" },
  { x: 576, y: 652, facingDirection: "north", side: "southwest" },
  { x: 666, y: 652, facingDirection: "north", side: "southeast" },
  { x: 502, y: 572, facingDirection: "east", side: "northwest" },
  { x: 464, y: 654, facingDirection: "east", side: "southwest" },
  { x: 578, y: 540, facingDirection: "south", side: "north" },
  { x: 656, y: 540, facingDirection: "south", side: "north" },
  { x: 742, y: 564, facingDirection: "west", side: "northeast" },
]);

export const WILDS_SEARCH_WAYPOINTS: ReadonlyArray<{ readonly x: number; readonly y: number; readonly facingDirection: DirectionalTurnaround }> =
  Object.freeze([
    { x: 925, y: 335, facingDirection: "east" }, { x: 1035, y: 215, facingDirection: "north" },
    { x: 1185, y: 165, facingDirection: "east" }, { x: 1345, y: 245, facingDirection: "south" },
    { x: 1465, y: 345, facingDirection: "east" }, { x: 1385, y: 505, facingDirection: "south" },
    { x: 1215, y: 565, facingDirection: "west" }, { x: 1065, y: 485, facingDirection: "north" },
    { x: 965, y: 425, facingDirection: "west" }, { x: 1135, y: 345, facingDirection: "east" },
  ]);

export const LAIR_POSITIONS: ReadonlyArray<{ readonly x: number; readonly y: number }> = Object.freeze([
  { x: 515, y: 380 }, { x: 645, y: 195 }, { x: 635, y: 560 }, { x: 355, y: 215 },
]);

const COMBAT_LAIR_SLOT_OFFSETS: ReadonlyArray<{
  readonly dx: number; readonly dy: number; readonly facingDirection: DirectionalTurnaround; readonly side: StationPerimeterSlotSpec["side"];
}> = Object.freeze([
  { dx: -48, dy: 4, facingDirection: "east", side: "west" },
  { dx: -43, dy: -36, facingDirection: "east", side: "northwest" },
  { dx: -43, dy: 44, facingDirection: "east", side: "southwest" },
  { dx: 0, dy: -54, facingDirection: "south", side: "north" },
  { dx: 0, dy: 56, facingDirection: "north", side: "south" },
  { dx: 47, dy: 4, facingDirection: "west", side: "east" },
]);

export function buildCombatLairPerimeterSlots(lairX: number, lairY: number): ReadonlyArray<StationPerimeterSlotSpec> {
  const worldX = 800 + lairX;
  return COMBAT_LAIR_SLOT_OFFSETS.map((off) => ({
    x: worldX + off.dx, y: lairY + off.dy, facingDirection: off.facingDirection, side: off.side,
  }));
}

export const PREPARATION_STATION_GEOMETRY_CATALOG: Readonly<
  Record<CanonicalPreparationStationId, PreparationStationGeometrySpec>
> = Object.freeze({
  Library: {
    stationId: "Library", workstationName: "Library Study Bookshelf",
    painterOrigin: { x: 116, y: 84 }, focalCenter: { x: 150, y: 88 }, hitbox: { x: 52, y: 42, w: 148, h: 98 },
    perimeterSlots: [
      { x: 195, y: 135, facingDirection: "north", side: "southeast" },
      { x: 64, y: 92, facingDirection: "east", side: "west" },
      { x: 204, y: 92, facingDirection: "west", side: "east" },
      { x: 136, y: 140, facingDirection: "north", side: "south" },
      { x: 78, y: 132, facingDirection: "east", side: "southwest" },
      { x: 152, y: 178, facingDirection: "north", side: "south" },
    ],
  },
  Spyglass: {
    stationId: "Spyglass", workstationName: "Observatory Spyglass",
    painterOrigin: { x: 284, y: 82 }, focalCenter: { x: 284, y: 78 }, hitbox: { x: 222, y: 42, w: 132, h: 92 },
    perimeterSlots: [
      { x: 284, y: 112, facingDirection: "north", side: "south" },
      { x: 218, y: 86, facingDirection: "east", side: "west" },
      { x: 354, y: 86, facingDirection: "west", side: "east" },
      { x: 244, y: 136, facingDirection: "north", side: "southwest" },
      { x: 324, y: 136, facingDirection: "north", side: "southeast" },
      { x: 284, y: 154, facingDirection: "north", side: "south" },
    ],
  },
  Forge: {
    stationId: "Forge", workstationName: "Anvil Forge",
    painterOrigin: { x: 662, y: 86 }, focalCenter: { x: 645, y: 102 }, hitbox: { x: 560, y: 42, w: 176, h: 112 },
    perimeterSlots: [
      { x: 600, y: 155, facingDirection: "north", side: "southwest" },
      { x: 552, y: 104, facingDirection: "east", side: "west" },
      { x: 686, y: 155, facingDirection: "north", side: "southeast" },
      { x: 740, y: 112, facingDirection: "west", side: "east" },
      { x: 644, y: 162, facingDirection: "north", side: "south" },
      { x: 556, y: 146, facingDirection: "east", side: "southwest" },
    ],
  },
  Tinker: {
    stationId: "Tinker", workstationName: "Crafting Workbench",
    painterOrigin: { x: 96, y: 260 }, focalCenter: { x: 92, y: 262 }, hitbox: { x: 36, y: 198, w: 124, h: 124 },
    perimeterSlots: [
      { x: 118, y: 265, facingDirection: "west", side: "east" },
      { x: 104, y: 196, facingDirection: "south", side: "north" },
      { x: 108, y: 332, facingDirection: "north", side: "south" },
      { x: 170, y: 264, facingDirection: "west", side: "east" },
      { x: 164, y: 222, facingDirection: "west", side: "northeast" },
      { x: 164, y: 306, facingDirection: "west", side: "southeast" },
    ],
  },
  Armory: {
    stationId: "Armory", workstationName: "Armory Wardrobe",
    painterOrigin: { x: 26, y: 376 }, focalCenter: { x: 92, y: 442 }, hitbox: { x: 36, y: 375, w: 132, h: 135 },
    perimeterSlots: [
      { x: 118, y: 445, facingDirection: "west", side: "east" },
      { x: 106, y: 372, facingDirection: "south", side: "north" },
      { x: 106, y: 514, facingDirection: "north", side: "south" },
      { x: 172, y: 444, facingDirection: "west", side: "east" },
      { x: 166, y: 402, facingDirection: "west", side: "northeast" },
      { x: 166, y: 486, facingDirection: "west", side: "southeast" },
    ],
  },
  Enchanter: {
    stationId: "Enchanter", workstationName: "Arcane Lectern",
    painterOrigin: { x: 206, y: 624 }, focalCenter: { x: 206, y: 624 }, hitbox: { x: 142, y: 570, w: 128, h: 116 },
    perimeterSlots: [
      { x: 206, y: 526, facingDirection: "south", side: "north" },
      { x: 126, y: 608, facingDirection: "east", side: "west" },
      { x: 286, y: 608, facingDirection: "west", side: "east" },
      { x: 206, y: 696, facingDirection: "north", side: "south" },
      { x: 148, y: 544, facingDirection: "south", side: "northwest" },
      { x: 264, y: 544, facingDirection: "south", side: "northeast" },
    ],
  },
  Stockpile: {
    stationId: "Stockpile", workstationName: "Resource Stockpile",
    painterOrigin: { x: 452, y: 84 }, focalCenter: { x: 452, y: 84 }, hitbox: { x: 388, y: 42, w: 132, h: 96 },
    perimeterSlots: [
      { x: 452, y: 138, facingDirection: "north", side: "south" },
      { x: 382, y: 88, facingDirection: "east", side: "west" },
      { x: 522, y: 88, facingDirection: "west", side: "east" },
      { x: 410, y: 142, facingDirection: "north", side: "southwest" },
      { x: 494, y: 142, facingDirection: "north", side: "southeast" },
      { x: 452, y: 178, facingDirection: "north", side: "south" },
    ],
  },
  Alchemy: {
    stationId: "Alchemy", workstationName: "Alchemy Lab",
    painterOrigin: { x: 684, y: 462 }, focalCenter: { x: 680, y: 465 }, hitbox: { x: 596, y: 392, w: 154, h: 128 },
    perimeterSlots: [
      { x: 655, y: 465, facingDirection: "east", side: "west" },
      { x: 672, y: 402, facingDirection: "south", side: "north" },
      { x: 672, y: 526, facingDirection: "north", side: "south" },
      { x: 594, y: 462, facingDirection: "east", side: "west" },
      { x: 626, y: 406, facingDirection: "south", side: "northwest" },
      { x: 626, y: 522, facingDirection: "north", side: "southwest" },
    ],
  },
  Assembly: {
    stationId: "Assembly", workstationName: "Goal Assembly Site",
    painterOrigin: { x: 390, y: 345 }, focalCenter: { x: 390, y: 345 },
    perimeterSlots: [
      { x: 390, y: 350, facingDirection: "north", side: "south" },
      { x: 390, y: 238, facingDirection: "south", side: "north" },
      { x: 266, y: 345, facingDirection: "east", side: "west" },
      { x: 514, y: 345, facingDirection: "west", side: "east" },
      { x: 390, y: 446, facingDirection: "north", side: "south" },
      { x: 312, y: 242, facingDirection: "south", side: "northwest" },
    ],
  },
  Lounge: {
    stationId: "Lounge", workstationName: "Break Lounge",
    painterOrigin: { x: 595, y: 524 }, focalCenter: { x: 622, y: 632 }, hitbox: { x: 452, y: 542, w: 310, h: 142 },
    perimeterSlots: LOUNGE_SEAT_SLOTS,
  },
  WildsSearch: {
    stationId: "WildsSearch", workstationName: "Dungeon Wilds Search",
    painterOrigin: { x: 1035, y: 335 }, focalCenter: { x: 1315, y: 380 },
    perimeterSlots: WILDS_SEARCH_WAYPOINTS.map((wp) => ({ x: wp.x, y: wp.y, facingDirection: wp.facingDirection, side: "west" as const })),
  },
  Combat: {
    stationId: "Combat", workstationName: "Dungeon Wilds Combat",
    painterOrigin: { x: 1315, y: 380 }, focalCenter: { x: 1315, y: 380 },
    perimeterSlots: buildCombatLairPerimeterSlots(515, 380),
  },
});

export const STATION_BASE_ANCHORS = Object.freeze({
  Library: { x: 195, y: 135 }, Spyglass: { x: 284, y: 112 }, Forge: { x: 600, y: 155 },
  Tinker: { x: 118, y: 265 }, Armory: { x: 118, y: 445 }, Enchanter: { x: 206, y: 526 },
  Alchemy: { x: 655, y: 465 }, Stockpile: { x: 452, y: 138 }, Assembly: { x: 390, y: 350 },
  Combat: { x: 800 + 515 - 48, y: 380 + 4 },
});

export const PREPARATION_STATION_HITBOX_SPECS: ReadonlyArray<{ workstation: string; x: number; y: number; w: number; h: number }> =
  Object.freeze(
    Object.values(PREPARATION_STATION_GEOMETRY_CATALOG)
      .filter((s): s is PreparationStationGeometrySpec & { hitbox: NonNullable<PreparationStationGeometrySpec["hitbox"]> } => Boolean(s.hitbox))
      .map((s) => ({ workstation: s.workstationName, x: s.hitbox.x, y: s.hitbox.y, w: s.hitbox.w, h: s.hitbox.h })),
  );
