import {
  computeGoalAssemblyPlatformLayout,
  computeMultiProjectAssemblyPlatformLayout,
  deriveGuildAssemblyShowcase,
  type GoalAssemblyPlatformLayout,
  type GoalAssemblyState,
  type GuildAssemblyShowcaseState,
  type MultiProjectAssemblyPlatformLayout,
  type ProjectMiniAssemblyState,
} from "../encounter/index.ts";
import { fillStroke, INK, rrect, withShadow } from "./asset-manifests.ts";
import {
  drawClockworkGear,
  GOAL_ASSEMBLY_MULTI_BAY_BOUNDS_PX,
  renderMultiProjectMiniAssembliesOnCanvas,
} from "./canvas-mini-assembly-painter.ts";
import {
  clientState,
  getSelectedProjectRoom,
  getVisibleProjectCharacters,
  isMobileViewport,
} from "./client-state.ts";

export { GOAL_ASSEMBLY_MULTI_BAY_BOUNDS_PX };
export const GOAL_ASSEMBLY_DECK_BOUNDS_PX = Object.freeze({ x: 286, y: 274, w: 148, h: 132 });

export interface ArtificerMachineTelemetry {
  readonly completionRatio: number;
  readonly gearSpeedMultiplier: number;
  readonly gaugeAngleRad: number;
  readonly consoleActive: boolean;
  readonly teslaArcsActive: boolean;
}

export function computeArtificerMachineTelemetry(fittedCount: number, totalParts: number): ArtificerMachineTelemetry {
  const ratio = totalParts > 0 ? Math.max(0, Math.min(1, fittedCount / Math.max(1, totalParts))) : 0;
  return Object.freeze({
    completionRatio: ratio,
    gearSpeedMultiplier: ratio > 0 ? 0.35 + ratio * 0.95 : 0,
    gaugeAngleRad: -1.13 + ratio * 2.26,
    consoleActive: ratio >= 0.5,
    teslaArcsActive: ratio >= 0.8,
  });
}

interface ResolvedGoalAssemblyBundle {
  assembly: GoalAssemblyState;
  layout: GoalAssemblyPlatformLayout;
  isMultiProjectScope: boolean;
  projectAssemblies: readonly ProjectMiniAssemblyState[];
  multiProjectLayout: MultiProjectAssemblyPlatformLayout;
  featureSlug: string;
  showcase: GuildAssemblyShowcaseState;
}

let cachedAssemblyKey = "";
let cachedAssemblySnapshotRef: unknown = null;
let cachedAssemblyBundle: ResolvedGoalAssemblyBundle | null = null;

export function resolveActiveGoalAssemblyAndLayout(): ResolvedGoalAssemblyBundle {
  const snap = clientState.currentSnapshot;
  const rooms = Object.values(snap.rooms || {});
  let taskSig = "";
  for (const r of rooms) {
    const tp = r.taskProgress;
    const itemStatuses = tp?.tasks ? tp.tasks.map((it) => `${it.id}:${it.status}`).join(".") : "";
    taskSig += `${r.roomId}:${tp?.source ?? ""}:${tp?.featureSlug ?? ""}:${tp?.resolvedTasks ?? 0}/${tp?.totalTasks ?? 0}:${itemStatuses},`;
  }
  const cacheKey = `${snap.version}:${clientState.selectedProjectId ?? ""}:${clientState.isAllWorldsFocused ? 1 : 0}:${clientState.selectedRoomId ?? ""}:${rooms.length}:${ Object.keys(snap.characters || {}).length}:${taskSig}`;
  if (cachedAssemblySnapshotRef === snap && cachedAssemblyKey === cacheKey && cachedAssemblyBundle) {
    return cachedAssemblyBundle;
  }
  const selectedRoom = getSelectedProjectRoom();
  const isAllFocused = clientState.isAllWorldsFocused || !selectedRoom;
  const showcase = deriveGuildAssemblyShowcase(snap, {
    selectedRoomId: selectedRoom?.roomId ?? null,
    selectedProjectId: selectedRoom?.projectId ?? (clientState.isAllWorldsFocused ? null : clientState.selectedProjectId),
    isAllWorldsFocused: isAllFocused,
  });
  const layout = computeGoalAssemblyPlatformLayout(showcase.assembly.parts.length, GOAL_ASSEMBLY_DECK_BOUNDS_PX);
  const multiProjectLayout = computeMultiProjectAssemblyPlatformLayout(showcase.projectAssemblies, GOAL_ASSEMBLY_MULTI_BAY_BOUNDS_PX);
  cachedAssemblySnapshotRef = snap;
  cachedAssemblyKey = cacheKey;
  cachedAssemblyBundle = {
    assembly: showcase.assembly, layout, isMultiProjectScope: showcase.isMultiProjectScope,
    projectAssemblies: showcase.projectAssemblies, multiProjectLayout,
    featureSlug: showcase.featureSlug || "Blueprint Ready", showcase,
  };
  return cachedAssemblyBundle;
}

export function drawStationLabel(c: CanvasRenderingContext2D, text: string, x: number, y: number, color = "#f5d08a"): void {
  c.save();
  c.font = "bold 8.5px monospace";
  const tw = c.measureText(text).width + 10;
  rrect(c, x - tw / 2, y - 9, tw, 13, 3);
  fillStroke(c, "rgba(20, 16, 13, 0.88)", "#574432", 1);
  c.fillStyle = color;
  c.textAlign = "center";
  c.fillText(text, x, y);
  c.restore();
}

const SOCKET_FITTED_PALETTE = ["#d97706", "#059669", "#2563eb", "#b45309", "#7c3aed"] as const;

export function renderMobileGoalAssemblyCore(
  c: CanvasRenderingContext2D,
  assembly: GoalAssemblyState,
  telemetry: ArtificerMachineTelemetry,
  hasBugHunt: boolean,
  hasInfoGather: boolean,
  projectAssemblies?: readonly ProjectMiniAssemblyState[],
): void {
  const accentHex = hasBugHunt ? "#ef4444" : hasInfoGather ? "#38bdf8" : telemetry.completionRatio >= 1 ? "#10b981" : "#f59e0b";
  c.save();
  c.translate(390, 345);
  rrect(c, -96, -72, 192, 144, 16);
  fillStroke(c, "rgba(24, 19, 15, 0.94)", accentHex, 3);
  c.beginPath();
  c.arc(0, -10, 40, 0, Math.PI * 2);
  c.strokeStyle = "#334155";
  c.lineWidth = 8.5;
  c.stroke();

  if (projectAssemblies && projectAssemblies.length > 1) {
    const count = projectAssemblies.length;
    const sliceAngle = (Math.PI * 2) / count;
    const gapAngle = 0.12;
    for (let i = 0; i < count; i += 1) {
      const p = projectAssemblies[i]!;
      const startA = -Math.PI / 2 + i * sliceAngle + gapAngle * 0.5;
      const endA = startA + Math.max(0.08, (sliceAngle - gapAngle) * (p.totalParts > 0 ? Math.max(0.2, p.completionRatio) : 0.25));
      c.beginPath();
      c.arc(0, -10, 40, startA, endA);
      c.strokeStyle = p.status === "complete" ? "#10b981" : p.status === "in-progress" ? p.primaryHex : "#38bdf8";
      c.lineWidth = 8.5;
      c.stroke();
    }
  } else if (assembly.totalParts > 0 && telemetry.completionRatio > 0) {
    c.beginPath();
    c.arc(0, -10, 40, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * telemetry.completionRatio);
    c.strokeStyle = accentHex;
    c.lineWidth = 8.5;
    c.stroke();
  }

  c.fillStyle = "#fef08a";
  c.font = "bold 20px monospace";
  c.textAlign = "center";
  const mainText = assembly.totalParts > 0 ? `${assembly.fittedCount}/${assembly.totalParts}` : hasBugHunt ? "HUNT" : hasInfoGather ? "SCOUT" : "READY";
  c.fillText(mainText, 0, -3);
  c.font = "bold 13.5px monospace";
  c.fillStyle = assembly.totalParts > 0 ? "#cbd5e1" : hasBugHunt ? "#fca5a5" : hasInfoGather ? "#93c5fd" : "#cbd5e1";
  const doneCount = projectAssemblies ? projectAssemblies.filter((p) => p.status === "complete").length : 0;
  const subText =
    projectAssemblies && projectAssemblies.length > 1 && doneCount > 0
      ? `★ ${doneCount}/${projectAssemblies.length} Done · ${Math.round(telemetry.completionRatio * 100)}%`
      : assembly.totalParts > 0
        ? `⚙️ ${Math.round(telemetry.completionRatio * 100)}% Built`
        : hasBugHunt
          ? "👾 Bug Hunt"
          : hasInfoGather
            ? "🔭 Scouting"
            : "⚙️ Guild Core";
  c.fillText(subText, 0, 52);
  c.restore();
}

export function renderGoalAssemblySite(c: CanvasRenderingContext2D, t: number, w = 800, h = 720): void {
  const chars = getVisibleProjectCharacters().filter(
    (ch) => ch.lifecycleState !== "RestingInLounge" && ch.lifecycleState !== "Archived",
  );
  const hasBugHunt = chars.some((ch) => ch.workflowIntent === "debugging-hunt");
  const hasInfoGather = !hasBugHunt && chars.some((ch) => ch.workflowIntent === "information-gathering");

  const { assembly, layout, isMultiProjectScope, projectAssemblies, multiProjectLayout, featureSlug } = resolveActiveGoalAssemblyAndLayout();
  const telemetry = computeArtificerMachineTelemetry(assembly.fittedCount, assembly.totalParts);

  c.save();
  c.translate((w - 800) / 2, (h - 720) / 2);

  if (isMobileViewport()) {
    renderMobileGoalAssemblyCore(c, assembly, telemetry, hasBugHunt, hasInfoGather, isMultiProjectScope ? projectAssemblies : undefined);
    c.restore();
    return;
  }

  const useCompositeMiniBays = isMultiProjectScope && projectAssemblies.length > 0;

  c.save();
  c.translate(390, 345);
  c.scale(0.68, 0.68);

  // 1. Ornate Crimson & Gold Fringed Rug + Riveted Steel Grid Plate
  withShadow(c, () => {
    rrect(c, -184, -140, 368, 276, 12);
    fillStroke(c, hasBugHunt ? "#7f1d1d" : hasInfoGather ? "#1e3a8a" : "#7d2927", INK, 2.8);
    c.save();
    c.strokeStyle = "#d4a238";
    c.lineWidth = 2.4;
    c.setLineDash([8, 6]);
    rrect(c, -174, -130, 348, 256, 8);
    c.stroke();
    c.restore();
    rrect(c, -162, -120, 324, 236, 8);
    fillStroke(c, "#49525c", INK, 2.8);
  });

  for (const [bx, by] of [[-150, -108], [150, -108], [-150, 104], [150, 104]] as const) {
    c.beginPath();
    c.arc(bx, by, 4.5, 0, Math.PI * 2);
    fillStroke(c, "#cbd5e1", INK, 1.8);
  }

  // 2. Top/Right L-Shaped Copper Steam Pipeline, Red Valve Wheel & Brass Pressure Gauge
  rrect(c, -156, -132, 320, 11, 3);
  fillStroke(c, "#d98746", INK, 2.2);
  rrect(c, 154, -132, 11, 240, 3);
  fillStroke(c, "#d98746", INK, 2.2);

  c.beginPath();
  c.arc(-8, -126, 13, 0, Math.PI * 2);
  fillStroke(c, "#c94638", INK, 2.2);
  c.strokeStyle = INK;
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(-19, -126); c.lineTo(3, -126);
  c.moveTo(-8, -137); c.lineTo(-8, -115);
  c.stroke();
  c.beginPath();
  c.arc(-8, -126, 4, 0, Math.PI * 2);
  fillStroke(c, "#cfa03c", INK, 1.5);

  if (telemetry.gearSpeedMultiplier > 0) {
    c.fillStyle = "rgba(226, 232, 240, 0.72)";
    c.beginPath();
    c.arc(46, -115, 4 + Math.sin(t * 4) * 1.2, 0, Math.PI * 2);
    c.arc(146, 36, 5.5 + Math.cos(t * 3.5) * 1.5, 0, Math.PI * 2);
    c.fill();
  }

  c.beginPath();
  c.arc(96, -126, 15, 0, Math.PI * 2);
  fillStroke(c, "#cfa03c", INK, 2.2);
  c.beginPath();
  c.arc(96, -126, 11, 0, Math.PI * 2);
  fillStroke(c, "#f5ebd6", INK, 1.4);
  c.save();
  c.translate(96, -126);
  c.rotate(telemetry.gaugeAngleRad);
  c.strokeStyle = "#b91c1c";
  c.lineWidth = 2.2;
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(0, -8.5);
  c.stroke();
  c.restore();

  if (!useCompositeMiniBays) {
    // 3. Single-Project Right Deck Zone: 3 Interlocking Spur Gears, Control Console & Tesla Coil
    const gearsSpinning = telemetry.gearSpeedMultiplier > 0;
    const gSpeed = t * telemetry.gearSpeedMultiplier;
    drawClockworkGear(c, 82, -26, 36, 16, gSpeed, "#cfa03c", gearsSpinning);
    drawClockworkGear(c, 132, -28, 24, 12, -gSpeed * 1.4, "#b88b2e", gearsSpinning);
    drawClockworkGear(c, 84, 28, 20, 10, -gSpeed * 1.6, "#c97a32", gearsSpinning);

    rrect(c, 112, 18, 36, 52, 4);
    fillStroke(c, "#3a4047", INK, 2.2);
    rrect(c, 118, 25, 24, 12, 2);
    fillStroke(c, telemetry.consoleActive ? "#4ce691" : "#1e293b", INK, 1.6);
    if (telemetry.consoleActive) {
      c.fillStyle = "#064e3b";
      c.fillRect(121, 31, 4, 4);
      c.fillRect(128, 28, 4, 7);
      c.fillRect(135, 30, 4, 5);
    }
    c.beginPath();
    c.arc(124, 48, 3.5, 0, Math.PI * 2);
    fillStroke(c, telemetry.consoleActive ? "#d94838" : "#475569", INK, 1.4);
    c.beginPath();
    c.arc(136, 48, 3.5, 0, Math.PI * 2);
    fillStroke(c, telemetry.teslaArcsActive ? "#facc15" : "#475569", INK, 1.4);

    c.beginPath();
    c.arc(82, 74, 20, 0, Math.PI * 2);
    fillStroke(c, "#3a4047", INK, 2.2);
    c.beginPath();
    c.arc(82, 74, 14, 0, Math.PI * 2);
    fillStroke(c, "#c97a32", INK, 1.8);
    c.beginPath();
    c.arc(82, 74, 7, 0, Math.PI * 2);
    fillStroke(c, "#cbd5e1", INK, 1.6);

    if (telemetry.teslaArcsActive) {
      c.save();
      c.strokeStyle = "#d8f8ff";
      c.lineWidth = 2.4;
      c.beginPath();
      c.moveTo(86, 68); c.lineTo(102, 54); c.lineTo(96, 48); c.lineTo(114, 36);
      c.moveTo(76, 80); c.lineTo(62, 94); c.lineTo(68, 98); c.lineTo(54, 108);
      c.stroke();
      c.restore();
    }
  }
  c.restore();

  // 4. Inner Platform Deck: Composite Project Mini-Assemblies (🌐 All) OR Single-Project N-Socket Grid
  if (useCompositeMiniBays) {
    renderMultiProjectMiniAssembliesOnCanvas(c, t, projectAssemblies, multiProjectLayout);
  } else if (assembly.totalParts === 0) {
    const db = GOAL_ASSEMBLY_DECK_BOUNDS_PX;
    c.save();
    c.globalAlpha = 0.72;
    c.setLineDash([4, 3]);
    rrect(c, db.x + 8, db.y + 12, db.w - 16, db.h - 24, 6);
    fillStroke(c, "rgba(15, 23, 42, 0.78)", "#38bdf8", 1.4);
    c.setLineDash([]);
    c.font = "bold 8px monospace";
    c.fillStyle = "#7ce8ff";
    c.textAlign = "center";
    c.fillText("✨ BLUEPRINT READY", db.x + db.w * 0.5, db.y + db.h * 0.45);
    c.font = "bold 6.5px monospace";
    c.fillStyle = "#94a3b8";
    c.fillText("0/0 PARTS · CLEAN", db.x + db.w * 0.5, db.y + db.h * 0.62);
    c.restore();
  } else {
    for (const socket of layout.sockets) {
      const part = assembly.parts[socket.partIndex];
      if (!part) continue;
      const built = part.status === "fitted";
      const fillHex = SOCKET_FITTED_PALETTE[socket.partIndex % SOCKET_FITTED_PALETTE.length];

      c.save();
      if (built) {
        rrect(c, socket.x, socket.y, socket.w, socket.h, 4);
        fillStroke(c, fillHex, "#fbbf24", 1.6);
        if (socket.h >= 34) {
          const cx = socket.x + socket.w * 0.5;
          const cy = socket.y + socket.h * 0.54;
          const r = Math.max(3.2, Math.min(socket.w, socket.h) * 0.14);
          c.beginPath();
          c.arc(cx, cy, r, 0, Math.PI * 2);
          fillStroke(c, "#fef08a", INK, 1.2);
        }
      } else {
        c.globalAlpha = 0.65;
        c.setLineDash([3, 2]);
        rrect(c, socket.x, socket.y, socket.w, socket.h, 4);
        fillStroke(c, "rgba(15, 23, 42, 0.78)", "#7ce8ff", 1.3);
        c.setLineDash([]);
      }

      c.font = "bold 7.5px monospace";
      c.fillStyle = built ? "#fef9c3" : "#7ce8ff";
      c.textAlign = "center";
      c.fillText(`#${part.id}`, socket.x + socket.w * 0.5, socket.y + Math.min(11, socket.h * 0.42));
      if (socket.h >= 24) {
        const baseName = (part.name || "").split("/").pop()?.replace(/\.[a-z0-9]+$/i, "").trim();
        const subLabel = (baseName || part.shortTag || "").slice(0, Math.max(6, Math.floor(socket.w / 5)));
        if (subLabel) {
          c.font = "bold 6px monospace";
          c.fillStyle = built ? "#fde68a" : "#93c5fd";
          c.fillText(subLabel, socket.x + socket.w * 0.5, socket.y + socket.h - 4);
        }
      }
      c.restore();
    }
  }

  const featureTitle = featureSlug
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
  const hasActiveParts = assembly.totalParts > 0;
  const doneProjectCount = useCompositeMiniBays
    ? projectAssemblies.filter((p) => p.status === "complete").length
    : 0;
  const doneSuffix = doneProjectCount > 0 ? ` · ★${doneProjectCount} Done` : "";
  const modeTag = hasActiveParts
    ? `⚙️ BUILD: ${featureTitle}${doneSuffix} (${assembly.fittedCount}/${assembly.totalParts})`
    : hasBugHunt
      ? "👾 WORKFLOW: DEBUGGING HUNT"
      : hasInfoGather
        ? "🔭 WORKFLOW: INFO GATHERING"
        : `⚙️ BUILD: ${featureTitle}${doneSuffix} (${assembly.fittedCount}/${assembly.totalParts})`;
  drawStationLabel(
    c,
    modeTag,
    390,
    244,
    doneProjectCount > 0 ? "#fde047" : hasActiveParts ? "#fcd34d" : hasBugHunt ? "#fca5a5" : hasInfoGather ? "#93c5fd" : "#fcd34d",
  );
  c.restore();
}
