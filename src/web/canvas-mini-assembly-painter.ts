import type {
  GoalAssemblyPlatformLayout,
  GoalAssemblyState,
  MultiProjectAssemblyPlatformLayout,
  ProjectMiniAssemblyState,
} from "../encounter/index.ts";
import type { SceneHitboxSpec } from "../scene/index.ts";
import { fillStroke, INK, rrect } from "./asset-manifests.ts";

export const GOAL_ASSEMBLY_MULTI_BAY_BOUNDS_PX = Object.freeze({ x: 280, y: 264, w: 220, h: 160 });

export function appendGoalAssemblySceneHitboxes(
  hitboxes: SceneHitboxSpec[],
  roomId: string,
  resolved: {
    assembly: GoalAssemblyState;
    layout: GoalAssemblyPlatformLayout;
    isMultiProjectScope: boolean;
    projectAssemblies: readonly ProjectMiniAssemblyState[];
    multiProjectLayout: MultiProjectAssemblyPlatformLayout;
  },
): void {
  const { assembly, layout, isMultiProjectScope, projectAssemblies, multiProjectLayout } = resolved;
  if (isMultiProjectScope && projectAssemblies.length > 0) {
    for (const bay of multiProjectLayout.bays) {
      const proj = projectAssemblies[bay.bayIndex];
      if (!proj) continue;
      hitboxes.push({
        priority: 7,
        roomId: proj.roomId || roomId,
        x: bay.x,
        y: bay.y,
        w: bay.w,
        h: bay.h,
        target: {
          kind: "goal-assembly-socket",
          partIndex: bay.bayIndex,
          partId: proj.shortTag,
          name: `${proj.crestIcon} ${proj.projectName} [${proj.shortTag}]`,
          status: proj.isComplete || proj.fittedCount > 0 ? "fitted" : "unbuilt",
          taskTitle: proj.featureSlug,
          projectId: proj.projectId,
          projectName: proj.projectName,
          shortTag: proj.shortTag,
          crestIcon: proj.crestIcon,
          partyKey: proj.partyKey,
          projectStatus: proj.status,
          projectStatusLabel: proj.statusLabel,
          fittedCount: proj.fittedCount,
          totalParts: proj.totalParts,
          percentComplete: proj.percentComplete,
          featureSlug: proj.featureSlug,
          milestoneName: proj.milestone.name,
        },
      });
    }
    return;
  }
  for (const socket of layout.sockets) {
    const part = assembly.parts[socket.partIndex];
    if (!part) continue;
    hitboxes.push({
      priority: 7,
      roomId,
      x: socket.x,
      y: socket.y,
      w: socket.w,
      h: socket.h,
      target: {
        kind: "goal-assembly-socket",
        partIndex: socket.partIndex,
        partId: part.id,
        name: part.name,
        status: part.status,
        taskTitle: part.name,
        shortTag: part.shortTag,
        crestIcon: part.crestIcon,
        partyKey: part.partyKey,
      },
    });
  }
}

export function drawClockworkGear(
  c: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  r: number,
  teeth: number,
  ang: number,
  col: string,
  active: boolean,
): void {
  c.save();
  c.translate(gx, gy);
  c.rotate(active ? ang : 0);
  c.globalAlpha = active ? 0.95 : 0.48;
  c.beginPath();
  for (let i = 0; i < teeth; i++) {
    const a1 = (i / teeth) * Math.PI * 2;
    const a2 = ((i + 0.35) / teeth) * Math.PI * 2;
    const a3 = ((i + 0.65) / teeth) * Math.PI * 2;
    const a4 = ((i + 0.92) / teeth) * Math.PI * 2;
    c.lineTo(Math.cos(a1) * (r - 4), Math.sin(a1) * (r - 4));
    c.lineTo(Math.cos(a2) * (r + 3.5), Math.sin(a2) * (r + 3.5));
    c.lineTo(Math.cos(a3) * (r + 3.5), Math.sin(a3) * (r + 3.5));
    c.lineTo(Math.cos(a4) * (r - 4), Math.sin(a4) * (r - 4));
  }
  c.closePath();
  fillStroke(c, active ? col : "#64748b", INK, 2);
  c.beginPath();
  c.arc(0, 0, r * 0.28, 0, Math.PI * 2);
  fillStroke(c, "#343a40", INK, 1.6);
  c.restore();
}

function drawMiniAssemblyPartPips(c: CanvasRenderingContext2D, proj: ProjectMiniAssemblyState, x: number, y: number, w: number, h: number): void {
  const maxPips = Math.min(8, Math.max(1, proj.totalParts));
  const gap = maxPips > 5 ? 2 : 3;
  const pipW = Math.max(4, Math.floor((w - (maxPips - 1) * gap) / maxPips));

  for (let i = 0; i < maxPips; i += 1) {
    const part = proj.parts[i];
    const isFitted = proj.status === "complete" || (part ? part.status === "fitted" : i < proj.fittedCount);
    const px = x + i * (pipW + gap);
    c.save();
    if (proj.status === "complete") {
      rrect(c, px, y, pipW, h, 2);
      fillStroke(c, "#10b981", "#fde047", 1.2);
    } else if (isFitted) {
      rrect(c, px, y, pipW, h, 2);
      fillStroke(c, proj.primaryHex || "#2563eb", "#fbbf24", 1.1);
    } else {
      c.globalAlpha = 0.72;
      c.setLineDash([2, 1.5]);
      rrect(c, px, y, pipW, h, 2);
      fillStroke(c, "rgba(15, 23, 42, 0.85)", "#7ce8ff", 1);
      c.setLineDash([]);
    }
    c.restore();
  }
}

export function renderMultiProjectMiniAssembliesOnCanvas(
  c: CanvasRenderingContext2D,
  t: number,
  projectAssemblies: readonly ProjectMiniAssemblyState[],
  layout: MultiProjectAssemblyPlatformLayout,
): void {
  for (const bay of layout.bays) {
    const proj = projectAssemblies[bay.bayIndex];
    if (!proj) continue;

    c.save();
    const isComplete = proj.status === "complete";
    const isInProgress = proj.status === "in-progress";
    const isOpen = proj.status === "open";

    if (isComplete) {
      const pulseAlpha = 0.22 + 0.1 * Math.sin(t * 4.2 + bay.bayIndex);
      c.save();
      c.fillStyle = `rgba(250, 204, 21, ${pulseAlpha.toFixed(2)})`;
      rrect(c, bay.x - 2, bay.y - 2, bay.w + 4, bay.h + 4, 7);
      c.fill();
      c.restore();
      rrect(c, bay.x, bay.y, bay.w, bay.h, 6);
      fillStroke(c, "rgba(6, 78, 59, 0.94)", "#fbbf24", 2.2);
      rrect(c, bay.x + 2.5, bay.y + 2.5, bay.w - 5, bay.h - 5, 4);
      c.strokeStyle = "#10b981";
      c.lineWidth = 1.3;
      c.stroke();
    } else if (isInProgress) {
      rrect(c, bay.x, bay.y, bay.w, bay.h, 6);
      fillStroke(c, "rgba(15, 23, 42, 0.92)", proj.accentHex || proj.primaryHex || "#38bdf8", 1.8);
    } else if (isOpen) {
      rrect(c, bay.x, bay.y, bay.w, bay.h, 6);
      fillStroke(c, "rgba(15, 23, 42, 0.85)", proj.secondaryHex || "#64748b", 1.4);
    } else {
      c.globalAlpha = 0.84;
      c.setLineDash([4, 3]);
      rrect(c, bay.x, bay.y, bay.w, bay.h, 6);
      fillStroke(c, "rgba(15, 23, 42, 0.78)", "#38bdf8", 1.3);
      c.setLineDash([]);
    }

    const headerH = Math.min(15, Math.max(11, Math.floor(bay.h * 0.2)));
    rrect(c, bay.x + 2, bay.y + 2, bay.w - 4, headerH, 3);
    c.fillStyle = isComplete ? "rgba(4, 120, 87, 0.9)" : proj.primaryHex || "#1e293b";
    c.fill();

    c.font = "bold 7px monospace";
    c.fillStyle = isComplete ? "#fef08a" : "#f8fafc";
    c.textAlign = "center";
    const maxTagChars = Math.max(5, Math.floor((bay.w - 8) / 4.8));
    c.fillText(`${proj.crestIcon} ${proj.shortTag.slice(0, maxTagChars)}`, bay.x + bay.w * 0.5, bay.y + headerH - 2);

    const mechCy = bay.y + headerH + (bay.h - headerH - 22) * 0.48;
    const gearR = Math.max(5.5, Math.min(9.5, Math.min(bay.w, bay.h) * 0.12));

    if (isComplete) {
      drawClockworkGear(c, bay.x + bay.w * 0.26, mechCy, gearR, 8, t * 1.35, "#fbbf24", true);
      c.beginPath();
      c.arc(bay.x + bay.w * 0.52, mechCy, gearR * 0.95, 0, Math.PI * 2);
      fillStroke(c, "#10b981", "#fef08a", 1.5);
      c.font = "bold 8.5px monospace";
      c.fillStyle = "#fef9c3";
      c.textAlign = "center";
      c.fillText("★", bay.x + bay.w * 0.52, mechCy + 3);

      c.save();
      c.strokeStyle = "#d8f8ff";
      c.lineWidth = 1.5;
      const sx = bay.x + bay.w * 0.74;
      c.beginPath();
      c.moveTo(sx - 5, mechCy - 6);
      c.lineTo(sx + 2, mechCy - 1);
      c.lineTo(sx - 2, mechCy + 2);
      c.lineTo(sx + 5, mechCy + 7);
      c.stroke();
      c.restore();
    } else if (isInProgress) {
      drawClockworkGear(c, bay.x + bay.w * 0.32, mechCy, gearR, 8, t * (0.45 + proj.completionRatio * 0.9), "#cfa03c", true);
      rrect(c, bay.x + bay.w * 0.56, mechCy - 6, Math.min(20, bay.w * 0.28), 12, 2);
      fillStroke(c, "#064e3b", "#4ce691", 1.2);
    } else if (isOpen) {
      drawClockworkGear(c, bay.x + bay.w * 0.5, mechCy, gearR, 8, 0, "#64748b", false);
    } else {
      c.save();
      c.strokeStyle = "#38bdf8";
      c.lineWidth = 1.1;
      c.setLineDash([2, 2]);
      c.beginPath();
      c.arc(bay.x + bay.w * 0.5, mechCy, gearR * 0.9, 0, Math.PI * 2);
      c.stroke();
      c.setLineDash([]);
      c.restore();
    }

    if (proj.totalParts > 0 && bay.h >= 46) {
      drawMiniAssemblyPartPips(c, proj, bay.x + 5, bay.y + bay.h - 21, Math.max(12, bay.w - 10), 5);
    }

    const footerY = bay.y + bay.h - 4;
    c.font = "bold 6.5px monospace";
    c.textAlign = "center";

    if (isComplete) {
      rrect(c, bay.x + 4, bay.y + bay.h - 13, bay.w - 8, 10, 3);
      fillStroke(c, "#059669", "#fbbf24", 1.1);
      c.fillStyle = "#fef08a";
      c.fillText(`★ DONE ${proj.fittedCount}/${proj.totalParts}`, bay.x + bay.w * 0.5, footerY);
    } else if (isInProgress) {
      c.fillStyle = "#fcd34d";
      c.fillText(`⚙️ ${proj.fittedCount}/${proj.totalParts} (${proj.percentComplete}%)`, bay.x + bay.w * 0.5, footerY);
    } else if (isOpen) {
      c.fillStyle = "#93c5fd";
      c.fillText(`📐 0/${proj.totalParts} OPEN`, bay.x + bay.w * 0.5, footerY);
    } else {
      c.fillStyle = "#7ce8ff";
      c.fillText("✨ READY 0/0", bay.x + bay.w * 0.5, footerY);
    }

    c.restore();
  }
}
