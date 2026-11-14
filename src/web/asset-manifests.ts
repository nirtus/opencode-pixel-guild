import { MONSTER_LINEAGE_SETS } from "../types/monster-catalog.ts";

export const INK = "#281e18";

export interface BiomeAssetDef {
  id: string;
  name: string;
  file: string;
  scale: number;
}

export interface BiomeDef {
  name: string;
  groundBase: string;
  groundAlt: string;
  pathCol: string;
  fogTint: string;
  assets: BiomeAssetDef[];
}

export interface MonsterAssetDef {
  tier: number;
  role: string;
  name: string;
  file: string;
  scale: number;
  aura: string;
}

export const VEGETATION_BIOMES: Record<string, BiomeDef> = {
  forest: {
    name: "Dark Forest Wilderness",
    groundBase: "#1d281d",
    groundAlt: "#162016",
    pathCol: "#3d2e20",
    fogTint: "rgba(10, 16, 12, 0.95)",
    assets: [
      { id: "f01", name: "Hangman's Oak", file: "/examples/outside/forest/f01_hangmans_oak.png", scale: 1.25 },
      { id: "f02", name: "Thornwall", file: "/examples/outside/forest/f02_thornwall.png", scale: 1.0 },
      { id: "f03", name: "Weeping Ash", file: "/examples/outside/forest/f03_weeping_ash.png", scale: 1.2 },
      { id: "f04", name: "Lantern Log", file: "/examples/outside/forest/f04_lantern_log.png", scale: 0.95 },
      { id: "f05", name: "Strangler", file: "/examples/outside/forest/f05_strangler.png", scale: 1.1 },
      { id: "f06", name: "Ashen Birch", file: "/examples/outside/forest/f06_ashen_birch.png", scale: 1.1 },
      { id: "f07", name: "Bloodcaps", file: "/examples/outside/forest/f07_bloodcaps.png", scale: 0.85 },
      { id: "f08", name: "Widow Ferns", file: "/examples/outside/forest/f08_widow_ferns.png", scale: 0.95 },
      { id: "f09", name: "Rootfall", file: "/examples/outside/forest/f09_rootfall.png", scale: 1.0 },
      { id: "f10", name: "Mourning Willow", file: "/examples/outside/forest/f10_mourning_willow.png", scale: 1.25 },
    ],
  },
  dungeon: {
    name: "Blighted Dungeon Wilds",
    groundBase: "#221e29",
    groundAlt: "#1a1721",
    pathCol: "#332d3b",
    fogTint: "rgba(12, 9, 18, 0.95)",
    assets: [
      { id: "d01", name: "Leech Moss", file: "/examples/outside/dungeon/d01_leech_moss.png", scale: 0.95 },
      { id: "d02", name: "Bone Root", file: "/examples/outside/dungeon/d02_bone_root.png", scale: 1.1 },
      { id: "d03", name: "Ghostcaps", file: "/examples/outside/dungeon/d03_ghostcaps.png", scale: 0.95 },
      { id: "d04", name: "Rot Creeper", file: "/examples/outside/dungeon/d04_rot_creeper.png", scale: 1.0 },
      { id: "d05", name: "Chainweed", file: "/examples/outside/dungeon/d05_chainweed.png", scale: 1.15 },
      { id: "d06", name: "Tomb Lilies", file: "/examples/outside/dungeon/d06_tomb_lilies.png", scale: 0.9 },
      { id: "d07", name: "Mold Veils", file: "/examples/outside/dungeon/d07_mold_veils.png", scale: 1.0 },
      { id: "d08", name: "Eyestalks", file: "/examples/outside/dungeon/d08_eyestalks.png", scale: 0.95 },
      { id: "d09", name: "Drainroot", file: "/examples/outside/dungeon/d09_drainroot.png", scale: 1.05 },
      { id: "d10", name: "Hollow Pods", file: "/examples/outside/dungeon/d10_hollow_pods.png", scale: 0.95 },
    ],
  },
  dryland: {
    name: "Scorched Dryland Badlands",
    groundBase: "#423325",
    groundAlt: "#36291d",
    pathCol: "#574432",
    fogTint: "rgba(18, 13, 9, 0.94)",
    assets: [
      { id: "y01", name: "Skeleton Tree", file: "/examples/outside/dryland/y01_skeleton_tree.png", scale: 1.25 },
      { id: "y02", name: "Razor Grass", file: "/examples/outside/dryland/y02_razor_grass.png", scale: 0.95 },
      { id: "y03", name: "Gallows Cactus", file: "/examples/outside/dryland/y03_gallows_cactus.png", scale: 1.05 },
      { id: "y04", name: "Tumble Thorns", file: "/examples/outside/dryland/y04_tumble_thorns.png", scale: 0.9 },
      { id: "y05", name: "Bitterroot", file: "/examples/outside/dryland/y05_bitterroot.png", scale: 1.0 },
      { id: "y06", name: "Dust Blossoms", file: "/examples/outside/dryland/y06_dust_blossoms.png", scale: 0.95 },
      { id: "y07", name: "Vulture Shrub", file: "/examples/outside/dryland/y07_vulture_shrub.png", scale: 1.1 },
      { id: "y08", name: "Salt Reeds", file: "/examples/outside/dryland/y08_salt_reeds.png", scale: 0.95 },
      { id: "y09", name: "Scorched Agave", file: "/examples/outside/dryland/y09_scorched_agave.png", scale: 1.0 },
      { id: "y10", name: "Ironwood Stumps", file: "/examples/outside/dryland/y10_ironwood_stumps.png", scale: 1.0 },
    ],
  },
};

export const MONSTER_SETS: Record<string, MonsterAssetDef[]> = Object.fromEntries(
  Object.entries(MONSTER_LINEAGE_SETS).map(([setKey, lineage]) => [
    setKey,
    [
      {
        tier: 1,
        role: "Slime",
        name: lineage.slime.name,
        file: `/examples/monsters/${lineage.slime.file}`,
        scale: lineage.slime.scale,
        aura: lineage.slime.auraHex,
      },
      {
        tier: 2,
        role: "Goblin",
        name: lineage.goblin.name,
        file: `/examples/monsters/${lineage.goblin.file}`,
        scale: lineage.goblin.scale,
        aura: lineage.goblin.auraHex,
      },
      {
        tier: 3,
        role: "Cyclops",
        name: lineage.cyclops.name,
        file: `/examples/monsters/${lineage.cyclops.file}`,
        scale: lineage.cyclops.scale,
        aura: lineage.cyclops.auraHex,
      },
      {
        tier: 4,
        role: "Troll Boss",
        name: lineage.troll.name,
        file: `/examples/monsters/${lineage.troll.file}`,
        scale: lineage.troll.scale,
        aura: lineage.troll.auraHex,
      },
    ],
  ]),
);

export interface OffscreenCanvasBuffer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

export function createOffscreenBuffer(
  width: number,
  height: number,
): OffscreenCanvasBuffer | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  return { canvas, ctx };
}

const imgCache = new Map<string, HTMLImageElement>();

export function getImg(src: string): HTMLImageElement {
  let img = imgCache.get(src);
  if (!img) {
    img =
      typeof Image !== "undefined"
        ? new Image()
        : ({ complete: false, naturalWidth: 0, src: "" } as unknown as HTMLImageElement);
    img.src = src;
    imgCache.set(src, img);
  }
  return img;
}

export function rrect(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number | number[] = 4,
): void {
  c.beginPath();
  if (typeof c.roundRect === "function") {
    c.roundRect(x, y, w, h, r);
  }
  c.closePath();
}

export function fillStroke(
  c: CanvasRenderingContext2D,
  fillCol: string,
  strokeCol = INK,
  lw = 2.0,
): void {
  c.fillStyle = fillCol;
  c.fill();
  c.strokeStyle = strokeCol;
  c.lineWidth = lw;
  c.stroke();
}

export function withShadow(
  c: CanvasRenderingContext2D,
  fn: () => void,
  dx = 3,
  dy = 4,
  blur = 7,
  alpha = 0.35,
): void {
  c.save();
  c.shadowColor = `rgba(0,0,0,${alpha})`;
  c.shadowBlur = blur;
  c.shadowOffsetX = dx;
  c.shadowOffsetY = dy;
  fn();
  c.restore();
}
