import { anchorChamberPoint } from "../scene/index.ts";
import { seedProjectWorldVisuals } from "../spatial/index.ts";
import { type BiomeDef, createOffscreenBuffer, fillStroke, getImg, INK, type OffscreenCanvasBuffer, rrect, VEGETATION_BIOMES } from "./asset-manifests.ts";
import { clientState, getActiveRoom, isMobileViewport } from "./client-state.ts";
import {
  allocateCombatMonsterPerimeterSlot, buildCombatLairPerimeterSlots, COMBAT_MELEE_PROXIMITY_PX,
  deriveProjectBugMonsters, deriveScopedGameMasterBugMonsters, hasHeroFightingMonster, isBugMonsterPhysicallyEngaged,
  isCharacterPhysicallyFightingBug, LAIR_POSITIONS, type NamedWildernessBug, resolveTargetBugMonsterForCharacter,
} from "./wilds-bug-targeting.ts";

export {
  allocateCombatMonsterPerimeterSlot, buildCombatLairPerimeterSlots, COMBAT_MELEE_PROXIMITY_PX,
  deriveProjectBugMonsters, deriveScopedGameMasterBugMonsters, hasHeroFightingMonster, isBugMonsterPhysicallyEngaged,
  isCharacterPhysicallyFightingBug, LAIR_POSITIONS, type NamedWildernessBug, resolveTargetBugMonsterForCharacter,
};

const cachedFogCanvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
const cachedFogCtx = cachedFogCanvas ? cachedFogCanvas.getContext("2d") : null;
let cachedWildsTerrainBuffer: OffscreenCanvasBuffer | null = null;
let cachedWildsTerrainSig = "";

function paintStaticWildernessTerrain(
  c: CanvasRenderingContext2D,
  w: number,
  h: number,
  biome: BiomeDef,
): void {
  c.fillStyle = biome.groundBase;
  c.fillRect(0, 0, w, h);
  for (let r = 0; r * 40 < h; r++) {
    for (let col = 0; col * 40 < w; col++) {
      if ((r + col) % 2 === 0) {
        c.fillStyle = biome.groundAlt;
        c.fillRect(col * 40, r * 40, 40, 40);
      }
    }
  }

  // Winding Bug-Hunting Trail from East Gateway (0, 352) to Monster Lairs
  const p0 = anchorChamberPoint(0, 352, w, h);
  const p1 = anchorChamberPoint(160, 352, w, h);
  const p2 = anchorChamberPoint(260, 265, w, h);
  const p3 = anchorChamberPoint(515, 380, w, h);
  c.strokeStyle = biome.pathCol;
  c.lineWidth = 34;
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(p0.x, p0.y);
  c.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
  c.stroke();

  // Glowing Monster Tracks & Diagnostic Clue Runes along Trail
  for (let step = 0; step < 10; step++) {
    const u = step / 10;
    const rawTx = 45 + u * 440;
    const rawTy = 350 - Math.sin(u * Math.PI) * 50 + (step % 2) * 10;
    const tp = anchorChamberPoint(rawTx, rawTy, w, h);
    c.fillStyle = "rgba(74, 222, 128, 0.6)";
    c.beginPath();
    c.ellipse(tp.x, tp.y, 5, 3, 0.2, 0, Math.PI * 2);
    c.fill();
  }
}

export function paintMonsterCombatImpactFx(
  c: CanvasRenderingContext2D,
  bx: number,
  by: number,
  t: number,
): void {
  const cycle = (t * 3.2) % 1;
  const isCrossBeat = Math.floor(t * 3.2) % 2 === 1;
  const slashAngle = isCrossBeat ? 0.62 : -0.58;
  const slashSpan = 26 + cycle * 8;
  const flashAlpha = Math.max(0.28, 1 - cycle * 0.78);

  c.save();
  c.translate(bx, by);
  c.globalAlpha = Number(flashAlpha.toFixed(2));

  const qCurve = (cpx: number, cpy: number, x: number, y: number) => {
    if (typeof c.quadraticCurveTo === "function") c.quadraticCurveTo(cpx, cpy, x, y);
    else c.lineTo(x, y);
  };
  // 1. Primary Tapered Diagonal Crescent Slash Cut Across Monster Torso
  c.save();
  c.rotate(slashAngle);
  c.fillStyle = "#f97316";
  c.beginPath();
  c.moveTo(-slashSpan, 0);
  qCurve(0, -10, slashSpan, 0);
  qCurve(0, 3.5, -slashSpan, 0);
  c.closePath();
  c.fill();

  c.fillStyle = "#ffffff";
  c.beginPath();
  c.moveTo(-slashSpan * 0.82, 0);
  qCurve(0, -5, slashSpan * 0.82, 0);
  qCurve(0, 1.5, -slashSpan * 0.82, 0);
  c.closePath();
  c.fill();
  c.restore();

  // 2. Secondary Cross-Cut Echo Slash
  c.save();
  c.rotate(-slashAngle * 0.88);
  c.globalAlpha = Number((flashAlpha * 0.68).toFixed(2));
  c.fillStyle = "#fef08a";
  c.beginPath();
  c.moveTo(-slashSpan * 0.74, 0);
  qCurve(0, -5.5, slashSpan * 0.74, 0);
  qCurve(0, 2, -slashSpan * 0.74, 0);
  c.closePath();
  c.fill();
  c.restore();

  // 3. Asymmetric 8-Point Hit-Spark Starburst + Expanding Shock Ring + Radial Impact Shards
  const starR = 16 + (1 - cycle) * 8;
  const diagR = starR * 0.56;
  c.fillStyle = "#ffffff";
  c.strokeStyle = "#f59e0b";
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(0, -starR);
  c.lineTo(2.6, -4.2);
  c.lineTo(diagR, -diagR);
  c.lineTo(4.2, -2.6);
  c.lineTo(starR, 0);
  c.lineTo(4.2, 2.6);
  c.lineTo(diagR, diagR);
  c.lineTo(2.6, 4.2);
  c.lineTo(0, starR);
  c.lineTo(-2.6, 4.2);
  c.lineTo(-diagR, diagR);
  c.lineTo(-4.2, 2.6);
  c.lineTo(-starR, 0);
  c.lineTo(-4.2, -2.6);
  c.lineTo(-diagR, -diagR);
  c.lineTo(-2.6, -4.2);
  c.closePath();
  c.fill();
  c.stroke();

  const ringR = 14 + cycle * 20;
  c.strokeStyle = "#f97316";
  c.lineWidth = 1.8;
  c.beginPath();
  c.moveTo(ringR, 0);
  c.quadraticCurveTo(ringR, ringR * 0.45, 0, ringR * 0.45);
  c.quadraticCurveTo(-ringR, ringR * 0.45, -ringR, 0);
  c.quadraticCurveTo(-ringR, -ringR * 0.45, 0, -ringR * 0.45);
  c.quadraticCurveTo(ringR, -ringR * 0.45, ringR, 0);
  c.closePath();
  c.stroke();

  c.lineCap = "round";
  c.strokeStyle = "#fef08a";
  c.lineWidth = 2.2;
  const sparkIn = 12 + cycle * 10;
  const sparkOut = 22 + cycle * 16;
  for (const [dx, dy] of [
    [-0.78, -0.62],
    [0.82, -0.58],
    [-0.72, 0.68],
    [0.76, 0.64],
  ] as const) {
    c.beginPath();
    c.moveTo(dx * sparkIn, dy * sparkIn);
    c.lineTo(dx * sparkOut, dy * sparkOut);
    c.stroke();
  }
  c.restore();
}

export function renderOutdoorWilderness(
  c: CanvasRenderingContext2D,
  ox: number,
  w: number,
  h: number,
  t: number,
  timestampMs: number,
): void {
  c.save();
  c.translate(ox, 0);

  const activeRoom = getActiveRoom();
  const activeProjId =
    activeRoom?.projectId ||
    activeRoom?.locationDirectory ||
    clientState.selectedProjectId ||
    "/guild";
  const projectSeed = seedProjectWorldVisuals(activeProjId);
  const currentBiomeKey = projectSeed.biome || "forest";
  const biome =
    VEGETATION_BIOMES[currentBiomeKey] || VEGETATION_BIOMES.forest;

  // Terrain grid + trail + clue tracks (cached on reusable offscreen buffer)
  const terrainSig = `${w}x${h}:${currentBiomeKey}`;
  if (!cachedWildsTerrainBuffer && typeof document !== "undefined") {
    cachedWildsTerrainBuffer = createOffscreenBuffer(w, h);
  }
  if (cachedWildsTerrainBuffer) {
    if (
      cachedWildsTerrainBuffer.canvas.width !== w ||
      cachedWildsTerrainBuffer.canvas.height !== h ||
      cachedWildsTerrainSig !== terrainSig
    ) {
      cachedWildsTerrainBuffer.canvas.width = w;
      cachedWildsTerrainBuffer.canvas.height = h;
      cachedWildsTerrainBuffer.ctx.clearRect(0, 0, w, h);
      paintStaticWildernessTerrain(cachedWildsTerrainBuffer.ctx, w, h, biome);
      cachedWildsTerrainSig = terrainSig;
    }
    c.drawImage(cachedWildsTerrainBuffer.canvas, 0, 0);
  } else {
    paintStaticWildernessTerrain(c, w, h, biome);
  }

  // Render Outside Vegetation Sprites at 0.5x Object Scale
  const vegPositions: ReadonlyArray<[number, number, number]> = [
    [95, 90, 0], [250, 82, 1], [430, 92, 2], [610, 95, 3], [720, 140, 4], [130, 230, 5],
    [350, 185, 6], [690, 310, 7], [115, 560, 8], [320, 590, 9], [540, 610, 2], [710, 595, 5],
  ];
  for (const [rawVx, rawVy, assetIdx] of vegPositions) {
    const asset = biome.assets[assetIdx % biome.assets.length];
    const img = getImg(asset.file);
    if (img.complete && img.naturalWidth > 0) {
      const vp = anchorChamberPoint(rawVx, rawVy, w, h);
      const sz = 72 * asset.scale; // 0.5x scale!
      c.save();
      c.translate(vp.x, vp.y);
      c.rotate(Math.sin(t * 1.2 + assetIdx) * 0.02);
      c.drawImage(img, -sz / 2, -sz / 2, sz, sz);
      c.restore();
    }
  }

  // Derive Active Named Bug Monsters (stateless read; mutations occur in stepClientChoreography)
  const bugs = deriveProjectBugMonsters();
  const isMobile = isMobileViewport();
  const mobileMonsterScale = isMobile ? 2.0 : 1.0;

  // Render Named Bug Monsters (at 0.5x scale on desktop, 2x larger on mobile!)
  for (const bug of bugs) {
    const bp = anchorChamberPoint(bug.x, bug.y, w, h);
    const bx = bp.x;
    const by = bp.y;
    const effectiveBugScale = bug.scale * mobileMonsterScale;
    const auraR = 48 * effectiveBugScale + Math.sin(t * 5) * 5;
    const auraG = c.createRadialGradient(bx, by, 6, bx, by, auraR);
    auraG.addColorStop(0, bug.aura + "77");
    auraG.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = auraG;
    c.beginPath();
    c.arc(bx, by, auraR, 0, Math.PI * 2);
    c.fill();

    const engagedInMelee = isBugMonsterPhysicallyEngaged(bug);
    const mImg = getImg(bug.file);
    if (mImg.complete && mImg.naturalWidth > 0) {
      const baseSz = 68 * effectiveBugScale;
      const squish = Math.sin(t * (engagedInMelee ? 12 : 5)) * 0.06;
      const hitShake = engagedInMelee ? Math.sin(t * 28) * 3 : 0;
      c.save();
      c.translate(bx + hitShake, by + Math.sin(t * 4) * 3);
      c.scale(1 + squish, 1 - squish);
      c.drawImage(mImg, -baseSz / 2, -baseSz / 2, baseSz, baseSz);
      c.restore();
    }

    if (engagedInMelee) {
      paintMonsterCombatImpactFx(c, bx, by, t);
    }
  }

  // Dynamic Fog of War Layer — Shrouds 100% of Dungeon Wilds by default!
  if (cachedFogCanvas && (cachedFogCanvas.width !== w || cachedFogCanvas.height !== h)) {
    cachedFogCanvas.width = w;
    cachedFogCanvas.height = h;
  }
  if (cachedFogCanvas && cachedFogCtx) {
    cachedFogCtx.globalCompositeOperation = "source-over";
    cachedFogCtx.clearRect(0, 0, w, h);
    cachedFogCtx.fillStyle = biome.fogTint;
    cachedFogCtx.fillRect(0, 0, w, h);
    cachedFogCtx.globalCompositeOperation = "destination-out";

    const gateY = anchorChamberPoint(0, 352, w, h).y;
    const gateGrad = cachedFogCtx.createRadialGradient(0, gateY, 10, 0, gateY, 68);
    gateGrad.addColorStop(0, "rgba(0,0,0,0.9)");
    gateGrad.addColorStop(1, "rgba(0,0,0,0)");
    cachedFogCtx.fillStyle = gateGrad;
    cachedFogCtx.beginPath();
    cachedFogCtx.arc(0, gateY, 68, 0, Math.PI * 2);
    cachedFogCtx.fill();

    for (const fl of clientState.lanternFlares) {
      const fp = anchorChamberPoint(fl.x - 800, fl.y, w, h);
      const lx = fp.x;
      const ly = fp.y;
      const lifeRatio = Math.max(0.2, Math.min(1, (fl.expiresAtMs - timestampMs) / 9000));
      const radius = fl.r * (0.75 + 0.25 * lifeRatio) + Math.sin(t * 4) * 5;
      const radG = cachedFogCtx.createRadialGradient(lx, ly, radius * 0.2, lx, ly, radius);
      radG.addColorStop(0, "rgba(0,0,0,1)");
      radG.addColorStop(0.65, "rgba(0,0,0,0.85)");
      radG.addColorStop(1, "rgba(0,0,0,0)");
      cachedFogCtx.fillStyle = radG;
      cachedFogCtx.beginPath();
      cachedFogCtx.arc(lx, ly, radius, 0, Math.PI * 2);
      cachedFogCtx.fill();
    }

    for (const bug of bugs) {
      const bp = anchorChamberPoint(bug.x, bug.y, w, h);
      const revealR = (bug.inCombat ? 115 : 95) * (isMobile ? 1.45 : 1);
      const bugGrad = cachedFogCtx.createRadialGradient(bp.x, bp.y, 18, bp.x, bp.y, revealR);
      bugGrad.addColorStop(0, "rgba(0,0,0,0.95)");
      bugGrad.addColorStop(0.7, "rgba(0,0,0,0.75)");
      bugGrad.addColorStop(1, "rgba(0,0,0,0)");
      cachedFogCtx.fillStyle = bugGrad;
      cachedFogCtx.beginPath();
      cachedFogCtx.arc(bp.x, bp.y, revealR, 0, Math.PI * 2);
      cachedFogCtx.fill();
    }

    c.drawImage(cachedFogCanvas, 0, 0);
  }

  for (const bug of bugs) {
    const bp = anchorChamberPoint(bug.x, bug.y, w, h);
    const bx = bp.x;
    const by = bp.y;
    const effectiveBugScale = bug.scale * mobileMonsterScale;
    const barY = by - Math.min(isMobile ? 92 : 46, Math.round(34 * effectiveBugScale));
    rrect(c, bx - 56, barY - 14, 112, 9, 4);
    fillStroke(c, "#14100d", INK, 1.5);
    const hpFillW = Math.max(14, 108 * (bug.inCombat ? 0.35 + Math.sin(t * 3) * 0.1 : bug.hpPct));
    rrect(c, bx - 54, barY - 12, hpFillW, 5, 3);
    c.fillStyle = bug.inCombat ? "#ef4444" : bug.aura;
    c.fill();

    const tagMatch = /^(\[[^\]]+\])\s*(.*)$/.exec(bug.bugName);
    const coreTitle = (tagMatch ? tagMatch[2] : bug.bugName).trim();
    const labelText = isMobile
      ? `🐛 ${coreTitle.length > 15 ? `${coreTitle.slice(0, 14)}…` : coreTitle}`
      : tagMatch
        ? `🐛 ${tagMatch[1]} BUG: ${tagMatch[2].toUpperCase()} (${bug.monsterName})`
        : `🐛 BUG: ${bug.bugName.toUpperCase()} (${bug.monsterName})`;
    c.font = isMobile ? "bold 13.5px monospace" : "bold 9.5px monospace";
    const lw = c.measureText(labelText).width + (isMobile ? 16 : 12);
    const labelX = Math.max(lw / 2 + 6, Math.min(w - lw / 2 - 6, bx));
    rrect(c, labelX - lw / 2, barY - (isMobile ? 36 : 31), lw, isMobile ? 20 : 14, 4);
    fillStroke(c, "rgba(20, 16, 13, 0.94)", bug.aura, 1.4);
    c.fillStyle = "#fef2f2";
    c.textAlign = "center";
    c.fillText(labelText, labelX, barY - 21);
  }

  // Wilderness HUD status banner on top of Fog of War (desktop only; mobile uses floating chamber switcher)
  if (!isMobileViewport()) {
    c.save();
    c.font = "bold 10.5px monospace";
    c.textAlign = "center";
    const statusBanner =
      bugs.length > 0
        ? `🌫️ DUNGEON WILDS · ${bugs.length} NAMED BUG MONSTER${bugs.length > 1 ? "S" : ""} DETECTED`
        : w < 520
          ? "🌫️ DUNGEON WILDS · SHROUDED IN FOG OF WAR"
          : "🌫️ DUNGEON WILDS SHROUDED IN FOG OF WAR · AWAITING DEBUG HUNT";
    const bw = Math.min(w - 12, c.measureText(statusBanner).width + 18);
    rrect(c, w / 2 - bw / 2, 10, bw, 18, 4);
    fillStroke(c, "rgba(15, 23, 42, 0.88)", bugs.length > 0 ? "#ef4444" : "#475569", 1.2);
    c.fillStyle = bugs.length > 0 ? "#fca5a5" : "#cbd5e1";
    c.fillText(statusBanner, w / 2, 23);
    c.restore();
  }

  c.restore();
}
