import { anchorChamberPoint } from "../scene/index.ts";
import { fillStroke, INK, rrect, withShadow } from "./asset-manifests.ts";

export function paintCompactLibraryStudyStation(
  c: CanvasRenderingContext2D,
  w = 800,
  h = 720,
): void {
  const pos = anchorChamberPoint(116, 84, w, h);
  c.save();
  c.translate(pos.x, pos.y);
  c.scale(0.40, 0.40);

  // 3-Bay 2-Row Mahogany Bookcase (01 Grand Library)
  withShadow(c, () => {
    rrect(c, -150, -70, 290, 32, 3);
    fillStroke(c, "#4a2c18", INK, 2.5);
  });
  const cols = ["#b83b2b", "#2e6f95", "#d49b35", "#3b7a57", "#6d4c7d", "#c86432"];
  for (let row = 0; row < 2; row++) {
    const ry = -65 + row * 12;
    for (let bx = -142, i = 0; bx < 130; bx += 9, i++) {
      c.fillStyle = cols[(i + row * 3) % cols.length];
      c.fillRect(bx, ry, 7, 10);
      c.strokeStyle = INK;
      c.lineWidth = 1;
      c.strokeRect(bx, ry, 7, 10);
    }
  }

  // Rolling Library Ladder
  rrect(c, -102, -44, 7, 64, 3);
  fillStroke(c, "#b87e42", INK, 2);
  rrect(c, -72, -44, 7, 64, 3);
  fillStroke(c, "#b87e42", INK, 2);
  for (const ry of [-32, -18, -4, 10]) {
    rrect(c, -96, ry, 25, 5, 1);
    fillStroke(c, "#b87e42", INK, 1.8);
  }

  // Reading Desk + 3 Stacked Books + Open Codex + Candle + Inkwell/Quill + Chair + Globe
  withShadow(c, () => {
    rrect(c, -52, -22, 168, 66, 6);
    fillStroke(c, "#6b4426", INK, 2.6);
  });
  rrect(c, -40, -12, 28, 11, 2); fillStroke(c, "#a83228", INK, 2);
  rrect(c, -38, 0, 26, 11, 2); fillStroke(c, "#2b5b84", INK, 2);
  rrect(c, -42, 12, 30, 11, 2); fillStroke(c, "#d4a238", INK, 2);

  rrect(c, -2, -8, 64, 34, 3);
  fillStroke(c, "#f5ebd6", INK, 2.2);
  c.beginPath(); c.moveTo(30, -8); c.lineTo(30, 26); c.strokeStyle = INK; c.lineWidth = 2; c.stroke();

  c.beginPath(); c.arc(82, -6, 9, 0, Math.PI * 2); fillStroke(c, "#d4a238", INK, 2);
  c.beginPath(); c.arc(82, -6, 4, 0, Math.PI * 2); fillStroke(c, "#fff3b0", INK, 1.4);
  c.beginPath(); c.arc(92, 22, 7.5, 0, Math.PI * 2); fillStroke(c, "#2c3540", INK, 2);

  rrect(c, 10, 50, 42, 30, 5); fillStroke(c, "#3b6e5c", INK, 2.4);
  rrect(c, 6, 78, 50, 9, 4); fillStroke(c, "#2e5748", INK, 2.4);

  c.beginPath(); c.arc(144, 24, 30, 0, Math.PI * 2); fillStroke(c, "#d4a238", INK, 2.6);
  c.beginPath(); c.arc(144, 24, 23, 0, Math.PI * 2); fillStroke(c, "#3875a6", INK, 2.4);
  c.beginPath(); c.arc(140, 22, 11, 0, Math.PI * 2); fillStroke(c, "#659e4c", INK, 1.8);
  c.restore();
}

export function paintCompactObservatoryStation(
  c: CanvasRenderingContext2D,
  t: number,
  w = 800,
  h = 720,
): void {
  const pos = anchorChamberPoint(284, 82, w, h);
  c.save();
  c.translate(pos.x, pos.y);
  c.scale(0.40, 0.40);

  // Walnut Sea-Chart Table + Tilted Map + Islands + Compass Rose + Dividers (05 Navigator's Lookout)
  withShadow(c, () => {
    rrect(c, -140, -44, 210, 122, 8);
    fillStroke(c, "#5e3a22", INK, 2.8);
    rrect(c, -132, -36, 194, 106, 5);
    fillStroke(c, "#4a2c18", INK, 2);
  });
  rrect(c, -120, -28, 172, 92, 3);
  fillStroke(c, "#f2e2b6", INK, 2.2);

  c.beginPath(); c.ellipse(-76, 0, 26, 14, -0.15, 0, Math.PI * 2); fillStroke(c, "#c9b47c", "#6e5a34", 1.6);
  c.beginPath(); c.ellipse(22, 34, 18, 11, 0.1, 0, Math.PI * 2); fillStroke(c, "#c9b47c", "#6e5a34", 1.6);
  c.save();
  c.strokeStyle = "#b83b2b"; c.lineWidth = 2.2; c.setLineDash([5, 5]);
  c.beginPath(); c.moveTo(-52, 4); c.lineTo(16, 32); c.stroke();
  c.restore();
  c.beginPath(); c.arc(-94, 50, 12, 0, Math.PI * 2); fillStroke(c, "#9e3b2b", INK, 1.4);
  c.beginPath(); c.arc(40, -18, 9, 0, Math.PI * 2); fillStroke(c, "#d4a238", INK, 2);

  // 3-Stage Telescoping Brass Spyglass on Splayed Tripod
  c.save();
  c.translate(116, 12);
  c.strokeStyle = "#855634"; c.lineWidth = 5; c.lineCap = "round";
  c.beginPath();
  c.moveTo(-4, 6); c.lineTo(-34, 24);
  c.moveTo(-4, 6); c.lineTo(30, 24);
  c.moveTo(-4, 6); c.lineTo(-2, 34);
  c.stroke();
  c.rotate(0.14 + Math.sin(t * 0.8) * 0.08);
  rrect(c, -13, -60, 26, 22, 3); fillStroke(c, "#c99738", INK, 2.4);
  rrect(c, -10, -38, 20, 22, 2); fillStroke(c, "#b5842b", INK, 2.4);
  rrect(c, -8, -16, 16, 22, 2); fillStroke(c, "#c99738", INK, 2.4);
  rrect(c, -6, 6, 12, 18, 2); fillStroke(c, "#3a2314", INK, 2.4);
  c.beginPath(); c.ellipse(0, -60, 12, 4.5, 0, 0, Math.PI * 2); fillStroke(c, "#9bd4f0", INK, 2.2);
  c.restore();
  c.restore();
}

export function paintCompactAnvilForgeStation(
  c: CanvasRenderingContext2D,
  t: number,
  w = 800,
  h = 720,
): void {
  const pos = anchorChamberPoint(662, 86, w, h);
  c.save();
  c.translate(pos.x, pos.y);
  c.scale(0.40, 0.40);

  // Coal Bin + Ribbed Leather Bellows + Red-Brick Hearth Furnace (02 Smithy Forge)
  rrect(c, -210, -72, 78, 56, 12);
  fillStroke(c, "#2b211a", "#3d3027", 3);
  for (const [cx, cy] of [[-188, -50], [-164, -42], [-146, -54]]) {
    c.beginPath(); c.arc(cx, cy, 8, 0, Math.PI * 2); fillStroke(c, "#473c35", INK, 1.5);
  }
  rrect(c, -116, -26, 36, 7, 3); fillStroke(c, "#b87e42", INK, 2.2);
  rrect(c, -82, -56, 13, 68, 4); fillStroke(c, "#6b4226", INK, 2.4);
  c.beginPath(); c.moveTo(-64, -52); c.lineTo(-6, -22); c.lineTo(-64, 8); c.closePath();
  fillStroke(c, "#8c5834", INK, 2.4);

  rrect(c, 0, -82, 196, 122, 6);
  fillStroke(c, "#8a4b38", INK, 2.8);
  rrect(c, 28, -62, 140, 82, 14);
  fillStroke(c, "#1c1410", "#362820", 3);
  const pulse = Math.sin(t * 6) * 2.5;
  c.beginPath(); c.ellipse(98, -21, 56 + pulse, 28, 0, 0, Math.PI * 2);
  fillStroke(c, "#ff7b1c", "#ffd000", 2);
  for (const [fx, fy, fr, fc] of [
    [62, -28, 8.5, "#ff922b"], [82, -12, 10, "#ffc048"], [102, -30, 11, "#ffe869"], [126, -16, 9, "#ff922b"],
  ] as const) {
    c.beginPath(); c.arc(fx, fy, fr, 0, Math.PI * 2); fillStroke(c, fc, INK, 1.8);
  }

  // Water Quench Barrel + Tree Stump & Horned Steel Anvil with Glowing Blade
  c.beginPath(); c.arc(-96, 78, 40, 0, Math.PI * 2); fillStroke(c, "#7c4d28", INK, 2.6);
  c.beginPath(); c.arc(-96, 78, 33, 0, Math.PI * 2); fillStroke(c, "#2c6485", INK, 2.2);
  c.beginPath(); c.arc(72, 80, 44, 0, Math.PI * 2); fillStroke(c, "#8a5632", INK, 2.6);
  c.beginPath();
  c.moveTo(0, 80); c.lineTo(32, 64); c.lineTo(114, 64); c.lineTo(114, 96); c.lineTo(32, 96); c.closePath();
  fillStroke(c, "#5c646d", INK, 2.6);
  rrect(c, 26, 76, 86, 8, 2); fillStroke(c, "#ff922b", "#fff3b0", 1.8);
  c.restore();
}

export function paintCompactCraftingWorkbenchStation(
  c: CanvasRenderingContext2D,
  w = 800,
  h = 720,
): void {
  const pos = anchorChamberPoint(96, 260, w, h);
  c.save();
  c.translate(pos.x, pos.y);
  c.scale(0.40, 0.40);

  // Top Workbench with Vise, Clockwork Owl, Magnifier Lamp & Spanner (10 Artificer's Workshop)
  withShadow(c, () => {
    rrect(c, -140, -96, 280, 68, 5);
    fillStroke(c, "#7c5032", INK, 2.6);
  });
  rrect(c, -130, -76, 34, 30, 2); fillStroke(c, "#495057", INK, 2.2);
  c.beginPath(); c.arc(-44, -60, 18, 0, Math.PI * 2); fillStroke(c, "#cfa03c", INK, 2.4);
  c.beginPath(); c.arc(-50, -64, 5.5, 0, Math.PI * 2); fillStroke(c, "#7ce8ff", INK, 1.8);
  c.beginPath(); c.arc(-38, -64, 5.5, 0, Math.PI * 2); fillStroke(c, "#7ce8ff", INK, 1.8);
  c.beginPath(); c.arc(14, -56, 16, 0, Math.PI * 2); fillStroke(c, "#cfa03c", INK, 2.4);
  c.beginPath(); c.arc(14, -56, 11, 0, Math.PI * 2); fillStroke(c, "#ffffff", INK, 2);

  // Left Automaton Table + Right Pinned Cobalt Blueprint Table
  rrect(c, -140, -12, 104, 164, 6); fillStroke(c, "#6b4426", INK, 2.6);
  rrect(c, -112, 14, 48, 52, 6); fillStroke(c, "#c98e2c", INK, 2.4);
  c.beginPath(); c.arc(-88, 0, 15, 0, Math.PI * 2); fillStroke(c, "#c98e2c", INK, 2.4);
  c.beginPath(); c.arc(-88, 0, 6, 0, Math.PI * 2); fillStroke(c, "#7ce8ff", INK, 1.8);
  rrect(c, -20, 34, 154, 104, 5); fillStroke(c, "#5e3a22", INK, 2.6);
  rrect(c, -10, 44, 134, 84, 2); fillStroke(c, "#1d528c", "#ffffff", 1.8);
  c.beginPath(); c.arc(34, 86, 16, 0, Math.PI * 2); c.strokeStyle = "#ffffff"; c.lineWidth = 1.6; c.stroke();
  c.beginPath(); c.arc(124, 42, 5.5, 0, Math.PI * 2); fillStroke(c, "#dc2626", INK, 2);
  c.restore();
}

export function paintCompactArmoryStation(
  c: CanvasRenderingContext2D,
  w = 800,
  h = 720,
): void {
  const pos = anchorChamberPoint(26, 376, w, h);
  c.save();
  c.translate(pos.x, pos.y);
  c.scale(0.32, 0.32);
  c.beginPath(); c.arc(110, 58, 26, 0, Math.PI * 2); fillStroke(c, "#8c2d26", "#d4a238", 3.5);
  c.beginPath(); c.arc(190, 58, 26, 0, Math.PI * 2); fillStroke(c, "#254e7a", "#d4a238", 3.5);
  c.beginPath(); c.arc(320, 62, 36, 0, Math.PI * 2); fillStroke(c, "#7c4d28", "#94a3b8", 4);
  rrect(c, 260, 160, 110, 260, 4); fillStroke(c, "#7d2927", "#d4a238", 2.8);
  c.beginPath(); c.arc(315, 220, 42, 0, Math.PI * 2); fillStroke(c, "#333940", INK, 2.6);
  c.beginPath(); c.arc(315, 220, 30, 0, Math.PI * 2); fillStroke(c, "#ff7b1c", "#ffd000", 2);
  for (const ay of [200, 325]) {
    rrect(c, 74, ay - 32, 64, 68, 5); fillStroke(c, "#494e54", INK, 2.6);
    c.beginPath(); c.arc(106, ay, 15, 0, Math.PI * 2); fillStroke(c, "#dce3eb", INK, 2.4);
  }
  rrect(c, 122, 418, 96, 12, 5); fillStroke(c, "#7c4d28", INK, 2.4);
  c.beginPath(); c.ellipse(170, 424, 28, 22, 0, 0, Math.PI * 2); fillStroke(c, "#d8bc74", INK, 2.6);
  c.restore();
}

export function paintCompactArcaneLecternStation(
  c: CanvasRenderingContext2D,
  t: number,
  w = 800,
  h = 720,
): void {
  const pos = anchorChamberPoint(206, 624, w, h);
  c.save();
  c.translate(pos.x, pos.y);
  c.scale(0.40, 0.40);
  c.save();
  c.rotate(t * 0.35);
  c.strokeStyle = "#7ce8ff"; c.lineWidth = 3.2;
  c.beginPath(); c.arc(0, 0, 124, 0, Math.PI * 2); c.arc(0, 0, 102, 0, Math.PI * 2);
  for (let i = 0; i <= 5; i++) {
    const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const px = Math.cos(a) * 100; const py = Math.sin(a) * 100;
    if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
  }
  c.stroke();
  c.restore();
  c.beginPath(); c.arc(0, 0, 32, 0, Math.PI * 2); fillStroke(c, "#463b5c", INK, 2.6);
  c.beginPath(); c.arc(0, 0, 24, 0, Math.PI * 2); fillStroke(c, "#d4a238", INK, 2.2);
  c.beginPath(); c.arc(0, 0, 18, 0, Math.PI * 2); fillStroke(c, "#3b82f6", INK, 2.2);
  for (const [bx, by] of [[-92, -80], [92, -76]]) {
    rrect(c, bx - 30, by - 20, 60, 40, 4); fillStroke(c, "#5c2448", INK, 2.4);
    rrect(c, bx - 24, by - 15, 48, 30, 2); fillStroke(c, "#f5ebd6", INK, 1.8);
  }
  c.restore();
}

export function paintCompactResourceStockpileStation(
  c: CanvasRenderingContext2D,
  w = 800,
  h = 720,
): void {
  const pos = anchorChamberPoint(452, 84, w, h);
  c.save();
  c.translate(pos.x, pos.y);
  c.scale(0.40, 0.40);
  rrect(c, -156, -110, 312, 220, 8); fillStroke(c, "#5e3a22", INK, 2.8);
  rrect(c, -146, -100, 292, 200, 5); fillStroke(c, "#4a2c18", INK, 2);
  rrect(c, -132, -84, 124, 68, 5); fillStroke(c, "#d8bc74", INK, 2.6);
  rrect(c, 8, -84, 124, 70, 6); fillStroke(c, "#7c5230", INK, 2.6);
  rrect(c, -132, 4, 86, 82, 4); fillStroke(c, "#9a683e", INK, 2.6);
  c.beginPath(); c.arc(-106, 30, 10, 0, Math.PI * 2); fillStroke(c, "#d93829", INK, 2);
  c.beginPath(); c.arc(-72, 34, 9.5, 0, Math.PI * 2); fillStroke(c, "#7ce8ff", INK, 2);
  rrect(c, -28, 4, 88, 82, 5); fillStroke(c, "#5c646d", INK, 2.6);
  rrect(c, -16, 16, 64, 26, 3); fillStroke(c, "#cbd5e1", INK, 2);
  rrect(c, -16, 50, 64, 26, 3); fillStroke(c, "#cfa03c", INK, 2);
  c.beginPath(); c.arc(102, 45, 36, 0, Math.PI * 2); fillStroke(c, "#7c5230", INK, 2.6);
  c.restore();
}

export function paintCompactAlchemyLabStation(
  c: CanvasRenderingContext2D,
  w = 800,
  h = 720,
): void {
  const pos = anchorChamberPoint(684, 462, w, h);
  c.save();
  c.translate(pos.x, pos.y);
  c.scale(0.40, 0.40);
  rrect(c, -184, -54, 84, 66, 6); fillStroke(c, "#6b4426", INK, 2.6);
  rrect(c, -174, -44, 64, 46, 2); fillStroke(c, "#f5ebd6", INK, 2);
  c.beginPath(); c.arc(-26, 24, 62, 0, Math.PI * 2); fillStroke(c, "#2c2427", "#5e4332", 3);
  c.beginPath(); c.arc(-26, 24, 45, 0, Math.PI * 2); fillStroke(c, "#52e388", INK, 2.4);
  rrect(c, 78, -128, 124, 268, 6); fillStroke(c, "#754728", INK, 2.8);
  c.beginPath(); c.arc(116, -86, 22, 0, Math.PI * 2); fillStroke(c, "#b565f2", INK, 2.4);
  c.beginPath(); c.arc(152, -2, 24, 0, Math.PI * 2); fillStroke(c, "#d97706", INK, 2.4);
  c.beginPath(); c.arc(152, 74, 17, 0, Math.PI * 2); fillStroke(c, "#52e388", INK, 2.4);
  c.beginPath(); c.ellipse(62, 142, 36, 15, 0, 0, Math.PI * 2); fillStroke(c, "#a842c9", INK, 2.2);
  c.restore();
}

export function paintCompactBreakLoungeStation(
  c: CanvasRenderingContext2D,
  w = 800,
  h = 720,
): void {
  const pos = anchorChamberPoint(595, 524, w, h);
  c.save();
  c.translate(pos.x - 133, pos.y);
  c.scale(0.38, 0.38);
  rrect(c, 300, 32, 200, 74, 8); fillStroke(c, "#78716c", INK, 2.8);
  rrect(c, 336, 36, 128, 48, 6); fillStroke(c, "#1c1410", "#362820", 2.6);
  c.beginPath(); c.ellipse(400, 60, 48, 16, 0, 0, Math.PI * 2); fillStroke(c, "#ff7b1c", "#ffd000", 2);
  c.beginPath(); c.arc(420, 285, 150, 0, Math.PI * 2); fillStroke(c, "#6b2226", "#d4a238", 3);
  c.beginPath(); c.arc(420, 285, 96, 0, Math.PI * 2); fillStroke(c, "#6b4426", INK, 3);
  rrect(c, 362, 242, 116, 86, 3); fillStroke(c, "#ede0b8", INK, 2.2);
  rrect(c, 48, 180, 110, 110, 12); fillStroke(c, "#2e5748", INK, 2.8);
  rrect(c, 68, 200, 70, 70, 5); fillStroke(c, "#3b6e5c", INK, 2.4);
  c.beginPath(); c.ellipse(105, 239, 24, 20, 0, 0, Math.PI * 2); fillStroke(c, "#d97f2b", INK, 2.4);
  rrect(c, 668, 120, 64, 260, 5); fillStroke(c, "#5e3a22", INK, 2.8);
  c.beginPath(); c.arc(700, 166, 25, 0, Math.PI * 2); fillStroke(c, "#7c5230", "#495057", 3.5);
  c.restore();
}

export function drawPentagramPortalRitual(
  c: CanvasRenderingContext2D,
  rx: number,
  ry: number,
  progress: number,
  kind: "spawn" | "despawn" = "spawn",
  t = 0,
): void {
  const p = Math.max(0, Math.min(1, progress));
  const isDespawn = kind === "despawn";
  const rimCol = isDespawn ? "#f43f5e" : "#38bdf8";
  const glowCol = isDespawn ? "#c084fc" : "#fde047";
  const openRatio = Math.sin(Math.min(0.95, Math.max(0.15, p)) * Math.PI);
  const holeRx = 18 + openRatio * 14;
  const holeRy = 7 + openRatio * 6;

  c.save();
  c.translate(rx, ry);

  const ringR = isDespawn ? 48 * (1 - p * 0.45) : 24 + p * 26;
  c.strokeStyle = glowCol;
  c.lineWidth = 2.2;
  c.beginPath();
  c.arc(0, 0, ringR, 0, Math.PI * 2);
  c.stroke();

  c.save();
  if (typeof c.rotate === "function") c.rotate((isDespawn ? -1 : 1) * (t * 2.2 + p * Math.PI));
  c.strokeStyle = rimCol;
  c.lineWidth = 1.8;
  c.beginPath();
  for (let i = 0; i <= 5; i++) {
    const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const sx = Math.cos(a) * (ringR * 0.85);
    const sy = Math.sin(a) * (ringR * 0.85);
    if (i === 0) c.moveTo(sx, sy); else c.lineTo(sx, sy);
  }
  c.stroke();
  c.restore();

  const holeGrad = c.createRadialGradient(0, 12, 2, 0, 12, holeRx);
  holeGrad.addColorStop(0, "#020617");
  holeGrad.addColorStop(0.65, isDespawn ? "#4c0519" : "#0f172a");
  holeGrad.addColorStop(1, rimCol);
  c.fillStyle = holeGrad;
  c.strokeStyle = glowCol;
  c.lineWidth = 2.4;
  c.beginPath();
  c.ellipse(0, 12, holeRx, holeRy, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();

  c.strokeStyle = glowCol;
  c.lineWidth = 1.6;
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2 + t * 3;
    const bx = Math.cos(ang) * (holeRx * 0.78);
    const by = 12 + Math.sin(ang) * (holeRy * 0.78);
    const beamH = isDespawn ? (1 - p) * 28 : (1 - Math.abs(p - 0.5) * 1.4) * 32;
    c.beginPath(); c.moveTo(bx, by); c.lineTo(bx, by - beamH); c.stroke();
  }
  c.restore();
}
