import { formatPublicSafePath } from "../hud/index.ts";
import { anchorChamberPoint } from "../scene/index.ts";
import { listHostProjectHeraldries } from "../spatial/index.ts";
import {
  createOffscreenBuffer,
  fillStroke,
  INK,
  type OffscreenCanvasBuffer,
  rrect,
} from "./asset-manifests.ts";
import { renderGoalAssemblySite } from "./canvas-assembly-painter.ts";
import {
  paintCompactAlchemyLabStation,
  paintCompactAnvilForgeStation,
  paintCompactArcaneLecternStation,
  paintCompactArmoryStation,
  paintCompactBreakLoungeStation,
  paintCompactCraftingWorkbenchStation,
  paintCompactLibraryStudyStation,
  paintCompactObservatoryStation,
  paintCompactResourceStockpileStation,
} from "./canvas-station-painter.ts";
import { clientState, getActiveRoom, isMobileViewport } from "./client-state.ts";

let cachedRoomBuffer: OffscreenCanvasBuffer | null = null;
let cachedRoomSignature = "";

function paintRadialAmbientPool(
  c: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  innerRgba: string,
): void {
  const grad = c.createRadialGradient(cx, cy, 4, cx, cy, r);
  grad.addColorStop(0, innerRgba);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = grad;
  c.beginPath();
  c.arc(cx, cy, r, 0, Math.PI * 2);
  c.fill();
}

function paintStaticWorkshopRoomBase(
  c: CanvasRenderingContext2D,
  w: number,
  h: number,
  bannerTitleText: string,
  bannerIsWorktree: boolean,
  isMobile = false,
): void {
  // 1. Continuous Staggered Oak Plank Floor Across Entire Seamless Open-Plan Guildhall
  const plankA = "#96653f";
  const plankB = "#8b5c38";
  const plankC = "#9e6c45";
  c.fillStyle = plankA;
  c.fillRect(28, 28, w - 56, h - 56);

  const rowH = 32;
  const plankW = 148;
  for (let row = 0; row * rowH < h - 56; row++) {
    const y = 28 + row * rowH;
    const ph = Math.min(h - 28 - y, rowH);
    const off = (row % 2) * 74;
    for (let col = -1; 28 + col * plankW < w - 28; col++) {
      const x0 = Math.max(28, 28 + col * plankW + off);
      const x1 = Math.min(w - 28, 28 + (col + 1) * plankW + off);
      if (x1 <= x0 || ph <= 0) continue;
      c.fillStyle =
        (row + col) % 3 === 0
          ? plankB
          : (row + col) % 2 === 0
            ? plankC
            : plankA;
      c.fillRect(x0, y, x1 - x0, ph);
      if (!isMobile) {
        c.strokeStyle = "#59381f";
        c.lineWidth = 1.3;
        c.strokeRect(x0, y, x1 - x0, ph);
      }
    }
  }

  // 2. Rounded Chiseled-Stone Hearth Pad Under NE Smithy Forge (Variant 1A)
  const forgePad = anchorChamberPoint(595, 28, w, h);
  rrect(c, forgePad.x, forgePad.y, 177, 130, 18);
  fillStroke(c, "#68605a", "#453e39", 2);

  // 3. Soft Radial Ambient Lighting Pools Blending Across Oak Floorboards
  for (const [px, py, pr, rgba] of [
    [116, 95, 85, "rgba(255, 225, 130, 0.34)"],
    [284, 95, 85, "rgba(255, 225, 130, 0.34)"],
    [452, 95, 85, "rgba(255, 225, 130, 0.30)"],
    [670, 95, 95, "rgba(255, 155, 55, 0.38)"],
    [205, 650, 85, "rgba(124, 232, 255, 0.22)"],
    [684, 462, 85, "rgba(82, 227, 136, 0.32)"],
    [610, 620, 105, "rgba(255, 155, 55, 0.36)"],
  ] as const) {
    const p = anchorChamberPoint(px, py, w, h);
    paintRadialAmbientPool(c, p.x, p.y, pr, rgba);
  }

  // 4. Coursed Brick Perimeter Walls
  c.fillStyle = "#5c493e";
  c.fillRect(0, 0, w, 28);
  c.fillRect(0, h - 28, w, 28);
  c.fillRect(0, 28, 28, h - 56);
  c.fillRect(w - 28, 28, 28, h - 56);

  if (!isMobile) {
    c.strokeStyle = "#3d2f26";
    c.lineWidth = 1.3;
    for (let by = 0; by < h; by += 14) {
      const boff = (Math.floor(by / 14) % 2) * 28;
      for (let bx = -boff; bx < w; bx += 56) {
        if (by < 28 || by >= h - 28 || bx < 28 || bx >= w - 56) {
          c.strokeRect(bx, by, 56, 14);
        }
      }
    }
  }
  c.strokeStyle = INK;
  c.lineWidth = 3.2;
  c.strokeRect(28, 28, w - 56, h - 56);

  // 5. Three Paned North Windows + Angled Warm Daylight Shafts (01 Library, 05 Observatory & Stockpile)
  for (const [rawWx, ww] of [
    [88, 64],
    [252, 72],
    [420, 72],
  ] as const) {
    const wx = anchorChamberPoint(rawWx, 4, w, h).x;
    rrect(c, wx, 4, ww, 24, 2);
    fillStroke(c, "#9bd4f0", INK, 2.5);
    c.beginPath();
    c.moveTo(wx + ww / 2, 4);
    c.lineTo(wx + ww / 2, 28);
    c.strokeStyle = INK;
    c.lineWidth = 2.4;
    c.stroke();

    if (!isMobile) {
      const beam = c.createLinearGradient(wx, 28, wx, 155);
      beam.addColorStop(0, "rgba(255, 232, 175, 0.25)");
      beam.addColorStop(1, "rgba(255, 232, 175, 0)");
      c.fillStyle = beam;
      c.beginPath();
      c.moveTo(wx, 28);
      c.lineTo(wx + ww, 28);
      c.lineTo(wx + ww + 20, 155);
      c.lineTo(wx - 20, 155);
      c.closePath();
      c.fill();
    }
  }

  // 6. North Wall Room Banner (omitted on mobile to prevent header text clutter)
  if (bannerTitleText && !isMobile) {
    c.save();
    c.font = "bold 10.5px monospace";
    c.fillStyle = bannerIsWorktree ? "#93c5fd" : "#fef08a";
    c.textAlign = bannerTitleText.startsWith("⚔️") ? "right" : "center";
    c.shadowColor = "rgba(0,0,0,0.85)";
    c.shadowBlur = 5;
    c.fillText(bannerTitleText, bannerTitleText.startsWith("⚔️") ? w - 32 : w / 2, 18);
    c.restore();
  }

  // 7. East Wall Iron Archway Gateway & South Swinging Guild Door
  const eastGateCenterY = anchorChamberPoint(768, 352, w, h).y;
  const eastGateY = eastGateCenterY - 38;
  rrect(c, w - 32, eastGateY, 32, 76, 4);
  fillStroke(c, "#5c646d", INK, 2.6);
  c.beginPath();
  c.arc(w - 34, eastGateY - 10, 4.5, 0, Math.PI * 2);
  c.arc(w - 34, eastGateY + 86, 4.5, 0, Math.PI * 2);
  fillStroke(c, "#fbbf24", INK, 1.5);

  const southDoorX = anchorChamberPoint(368, 692, w, h).x;
  rrect(c, southDoorX, h - 28, 64, 28, 2);
  fillStroke(c, "#8c5d38", INK, 2.4);
  if (!isMobile) {
    rrect(c, southDoorX + 1, h - 76, 9, 50, 2);
    fillStroke(c, "#6e4427", INK, 2.2);
    c.save();
    c.strokeStyle = INK;
    c.lineWidth = 1.8;
    c.setLineDash([5, 4]);
    c.beginPath();
    c.arc(southDoorX + 10, h - 28, 48, -Math.PI / 2, 0);
    c.stroke();
    c.restore();
  }

  // 8. Static 1:1 Compact (0.40x) Stations (Zero Static Title Pills on Floorplan!)
  paintCompactLibraryStudyStation(c, w, h);
  paintCompactCraftingWorkbenchStation(c, w, h);
  paintCompactArmoryStation(c, w, h);
  paintCompactResourceStockpileStation(c, w, h);
  paintCompactAlchemyLabStation(c, w, h);
  paintCompactBreakLoungeStation(c, w, h);
}

export function renderWorkshopRoom(
  c: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
): void {
  c.save();

  const isMobile = isMobileViewport();
  const activeRoom = getActiveRoom();
  const hostHeraldries = listHostProjectHeraldries(clientState.currentSnapshot);
  const isWt = Boolean(activeRoom?.isWorktree);
  const tag = isWt ? "WORKTREE ANNEX" : "PRIMARY GUILD HALL";
  const bannerTitleText =
    hostHeraldries.length > 1
      ? `⚔️ HOST GUILD HALL [${tag}] · ${hostHeraldries.length} ACTIVE PROJECTS`
      : activeRoom
        ? `${activeRoom.projectName.toUpperCase()} [${tag}] (${formatPublicSafePath(activeRoom.locationDirectory)})`
        : "";
  const roomSig = `${w}x${h}:${bannerTitleText}:${isWt ? 1 : 0}:${isMobile ? 1 : 0}`;

  if (!cachedRoomBuffer && typeof document !== "undefined") {
    cachedRoomBuffer = createOffscreenBuffer(w, h);
  }
  if (cachedRoomBuffer) {
    if (
      cachedRoomBuffer.canvas.width !== w ||
      cachedRoomBuffer.canvas.height !== h ||
      cachedRoomSignature !== roomSig
    ) {
      cachedRoomBuffer.canvas.width = w;
      cachedRoomBuffer.canvas.height = h;
      cachedRoomBuffer.ctx.clearRect(0, 0, w, h);
      paintStaticWorkshopRoomBase(
        cachedRoomBuffer.ctx,
        w,
        h,
        bannerTitleText,
        isWt,
        isMobile,
      );
      cachedRoomSignature = roomSig;
    }
    c.drawImage(cachedRoomBuffer.canvas, 0, 0);
  } else {
    paintStaticWorkshopRoomBase(c, w, h, bannerTitleText, isWt, isMobile);
  }

  // North Wall Project Heraldry Pennants (desktop only)
  if (!isMobile && hostHeraldries.length > 0) {
    c.save();
    c.font = "bold 8px monospace";
    let px = 32;
    const maxPx = bannerTitleText.startsWith("⚔️") ? w - 340 : w - 32;
    for (const hProj of hostHeraldries.slice(0, 6)) {
      const pText = `${hProj.crestIcon} ${hProj.shortTag}`;
      const pw = c.measureText(pText).width + 10;
      if (px + pw > maxPx && px > 120) break;
      rrect(c, px, 6, pw, 15, 3);
      fillStroke(c, hProj.primaryHex, hProj.accentHex, 1.2);
      c.fillStyle = "#ffffff";
      c.textAlign = "center";
      c.fillText(pText, px + pw / 2, 16);
      px += pw + 5;
    }
    c.restore();
  }

  // Dynamic 1:1 Compact (0.40x) Stations & Combined Central Goal Assembly Site
  paintCompactObservatoryStation(c, t, w, h);
  paintCompactAnvilForgeStation(c, t, w, h);
  paintCompactArcaneLecternStation(c, t, w, h);
  renderGoalAssemblySite(c, t, w, h);

  c.restore();
}
