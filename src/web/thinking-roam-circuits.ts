import {
  filletWaypointPolyline,
  GOAL_ASSEMBLY_OBSTACLE_BOX,
  hashRouteSeed,
  type ObstacleBox,
  RESOURCE_STOCKPILE_OBSTACLE_BOX,
} from "../encounter/index.ts";
import { unanchorChamberPoint, WORLD_CHAMBER_WIDTH_PX, WORLD_TOTAL_HEIGHT_PX } from "../scene/index.ts";
import { deriveFacingDirectionFromDelta, type DirectionalTurnaround } from "../sprites/index.ts";
import type { WalkerState } from "./client-state.ts";
import {
  ASSEMBLY_PACING_SIDES,
  type AssemblyPacingSide,
  STATION_BASE_ANCHORS,
} from "./station-geometry-catalog.ts";

export interface ChamberProportionalContext {
  readonly chamberWidth: number;
  readonly chamberHeight: number;
  readonly wildsWidth: number;
}

const REPORT_SCROLL_PERIMETER_OFFSETS: ReadonlyArray<{
  readonly dx: number;
  readonly dy: number;
  readonly facingDirection: DirectionalTurnaround;
}> = Object.freeze([
  { dx: 28, dy: 12, facingDirection: "west" },
  { dx: -28, dy: 12, facingDirection: "east" },
  { dx: 34, dy: -26, facingDirection: "west" },
  { dx: -34, dy: -26, facingDirection: "east" },
  { dx: 0, dy: 42, facingDirection: "north" },
  { dx: 0, dy: -42, facingDirection: "south" },
]);

export function resolveReportingScrollSlotOffset(
  parentBase: { x: number; y: number },
  parentId: string | null | undefined,
  stationOccupantCounts: Map<string, number>,
): { x: number; y: number; facingDirection: DirectionalTurnaround } {
  const key = `ReportScroll:${parentId || "root"}`;
  const occIdx = stationOccupantCounts.get(key) ?? 0;
  stationOccupantCounts.set(key, occIdx + 1);
  const spec = REPORT_SCROLL_PERIMETER_OFFSETS[occIdx % REPORT_SCROLL_PERIMETER_OFFSETS.length];
  const ringScale = 1 + Math.floor(occIdx / REPORT_SCROLL_PERIMETER_OFFSETS.length) * 0.75;
  const rawX = Math.round(parentBase.x + spec.dx * ringScale);
  const rawY = Math.round(parentBase.y + spec.dy * ringScale);
  const isWilds = parentBase.x >= 800;
  const x = isWilds ? Math.max(830, Math.min(1540, rawX)) : Math.max(54, Math.min(746, rawX));
  const y = Math.max(68, Math.min(698, rawY));
  return { x, y, facingDirection: spec.facingDirection };
}

export interface ThinkingRoamCircuit {
  readonly side: AssemblyPacingSide;
  readonly waypoints: ReadonlyArray<{ x: number; y: number }>;
  readonly inwardFacing: DirectionalTurnaround;
  readonly legPeriodMs: number;
}

export function resolveProportionalAssemblyObstacleBox(
  chamberW = WORLD_CHAMBER_WIDTH_PX,
  chamberH = WORLD_TOTAL_HEIGHT_PX,
): ObstacleBox {
  const safeW = Math.max(240, chamberW || WORLD_CHAMBER_WIDTH_PX);
  const safeH = Math.max(240, chamberH || WORLD_TOTAL_HEIGHT_PX);
  if (safeW === WORLD_CHAMBER_WIDTH_PX && safeH === WORLD_TOTAL_HEIGHT_PX) {
    return GOAL_ASSEMBLY_OBSTACLE_BOX;
  }
  const shiftX = (safeW - WORLD_CHAMBER_WIDTH_PX) * 0.5;
  const shiftY = (safeH - WORLD_TOTAL_HEIGHT_PX) * 0.5;
  const topLeft = unanchorChamberPoint(
    GOAL_ASSEMBLY_OBSTACLE_BOX.minX + shiftX,
    GOAL_ASSEMBLY_OBSTACLE_BOX.minY + shiftY,
    safeW,
    safeH,
  );
  const bottomRight = unanchorChamberPoint(
    GOAL_ASSEMBLY_OBSTACLE_BOX.maxX + shiftX,
    GOAL_ASSEMBLY_OBSTACLE_BOX.maxY + shiftY,
    safeW,
    safeH,
  );
  return Object.freeze({
    minX: Math.round(Math.min(topLeft.x, bottomRight.x)),
    maxX: Math.round(Math.max(topLeft.x, bottomRight.x)),
    minY: Math.round(Math.min(topLeft.y, bottomRight.y)),
    maxY: Math.round(Math.max(topLeft.y, bottomRight.y)),
  });
}

function clampOutsideObstacle(
  x: number,
  y: number,
  box: ObstacleBox,
): { x: number; y: number } {
  const cx = Math.max(64, Math.min(744, Math.round(x)));
  const cy = Math.max(72, Math.min(688, Math.round(y)));
  const pad = 8;
  if (cx > box.minX - pad && cx < box.maxX + pad && cy > box.minY - pad && cy < box.maxY + pad) {
    const dL = Math.abs(cx - (box.minX - pad));
    const dR = Math.abs(box.maxX + pad - cx);
    const dT = Math.abs(cy - (box.minY - pad));
    const dB = Math.abs(box.maxY + pad - cy);
    const minD = Math.min(dL, dR, dT, dB);
    if (minD === dT) return { x: cx, y: box.minY - pad };
    if (minD === dB) return { x: cx, y: box.maxY + pad };
    if (minD === dL) return { x: box.minX - pad, y: cy };
    return { x: box.maxX + pad, y: cy };
  }
  return { x: cx, y: cy };
}

export function resolveThinkingRoamCircuit(
  pacingSide: AssemblyPacingSide,
  sideOcc: number,
  sessionId: string,
  chamberCtx?: Partial<ChamberProportionalContext>,
): ThinkingRoamCircuit {
  const box = resolveProportionalAssemblyObstacleBox(
    chamberCtx?.chamberWidth ?? WORLD_CHAMBER_WIDTH_PX,
    chamberCtx?.chamberHeight ?? WORLD_TOTAL_HEIGHT_PX,
  );
  const h = hashRouteSeed(`roam2d:${sessionId}:${pacingSide}:${sideOcc}`);
  const jx0 = ((h % 19) - 9) + (sideOcc % 3) * 5;
  const jy0 = (((h >>> 5) % 15) - 7) + (sideOcc % 2 === 1 ? -6 : 4);
  const jx1 = (((h >>> 10) % 19) - 9) - (sideOcc % 3) * 4;
  const jy1 = (((h >>> 15) % 15) - 7);
  const jx2 = (((h >>> 20) % 19) - 9);
  const jy2 = (((h >>> 25) % 13) - 6);

  let rawPoints: Array<{ x: number; y: number }>;
  if (pacingSide === "top") {
    const yHoriz = Math.max(198, Math.min(box.minY - 14, 222 + jy0));
    const x0 = Math.max(284, Math.min(360, 304 + jx0));
    const x1 = Math.max(x0 + 64, Math.min(494, 424 + jx0));
    const xVert = Math.max(440, Math.min(534, 488 + jx1));
    const yV0 = Math.max(146, Math.min(yHoriz - 26, 162 + jy1));
    const yV1 = Math.min(box.minY - 12, Math.max(yV0 + 28, 202 + jy2));
    rawPoints = [
      { x: x0, y: yHoriz },
      { x: x1, y: yHoriz }, // Horizontal leg
      { x: xVert, y: yV0 }, // Diagonal leg
      { x: xVert, y: yV1 }, // Vertical leg
      { x: 204 + jx2, y: Math.max(148, yV0 + 6) }, // Diagonal leg
    ];
  } else if (pacingSide === "right") {
    const yHoriz = Math.max(174, Math.min(254, 218 + jy0));
    const xVert = Math.max(668, Math.min(738, 706 + jx1));
    const yV0 = Math.max(276, Math.min(330, 304 + jy1));
    const yV1 = Math.max(yV0 + 36, Math.min(384, 362 + jy2));
    rawPoints = [
      { x: Math.max(box.maxX + 16, 532 + jx0), y: yHoriz },
      { x: 644 + jx0, y: yHoriz }, // Horizontal leg
      { x: xVert, y: yV0 },        // Diagonal leg
      { x: xVert, y: yV1 },        // Vertical leg
      { x: Math.max(box.maxX + 18, 542 + jx2), y: 442 + jy1 }, // Diagonal leg
    ];
  } else if (pacingSide === "left") {
    const yHoriz = Math.max(202, Math.min(256, 228 + jy0));
    const xVert = Math.max(232, Math.min(box.minX - 14, 254 + jx1));
    const yV0 = Math.max(296, Math.min(342, 318 + jy1));
    const yV1 = Math.max(yV0 + 36, Math.min(418, 384 + jy2));
    rawPoints = [
      { x: Math.min(box.minX - 14, 252 + jx0), y: yHoriz },
      { x: 184 + jx0, y: yHoriz }, // Horizontal leg
      { x: xVert, y: yV0 },        // Diagonal leg
      { x: xVert, y: yV1 },        // Vertical leg
      { x: 186 + jx2, y: 472 + jy1 }, // Diagonal leg
    ];
  } else {
    const yHoriz = Math.max(box.maxY + 14, Math.min(490, 456 + jy0));
    const xVert = Math.max(396, Math.min(444, 424 + jx1));
    const yV0 = Math.max(yHoriz + 24, Math.min(518, 502 + jy1));
    const yV1 = Math.max(yV0 + 28, Math.min(558, 542 + jy2));
    rawPoints = [
      { x: 274 + jx0, y: yHoriz },
      { x: 386 + jx0, y: yHoriz }, // Horizontal leg
      { x: xVert, y: yV0 },        // Diagonal leg
      { x: xVert, y: yV1 },        // Vertical leg
      { x: 206 + jx2, y: Math.min(554, yV0 + 12) }, // Diagonal leg
    ];
  }

  const waypoints = rawPoints.map((pt) => clampOutsideObstacle(pt.x, pt.y, box));
  const legPeriodMs = sideOcc <= 0 ? 4000 : 3600 + (h % 801);
  return {
    side: pacingSide,
    waypoints,
    inwardFacing: ASSEMBLY_PACING_SIDES[pacingSide].inwardFacing,
    legPeriodMs,
  };
}

function distancePointToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq <= 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export function assignThinkingRoamTarget(
  walker: WalkerState,
  sessionId: string,
  lastStation: string,
  stationOccupantCounts: Map<string, number>,
  timestampMs: number,
  chamberCtx?: Partial<ChamberProportionalContext>,
): { x: number; y: number; facingDirection: DirectionalTurnaround; pacingSide: AssemblyPacingSide } {
  const lockedInStationJob =
    Boolean(walker.isWalking && walker.resolvedSlot?.isActing && walker.resolvedSlot.station !== "Lounge") ||
    Boolean(walker.slotQueue && walker.slotQueue.length > 0) ||
    Boolean(typeof walker.dwellUntilMs === "number" && walker.dwellUntilMs > timestampMs);
  if (!lockedInStationJob) {
    walker.assignedStation = undefined;
    walker.assignedSlotIdx = undefined;
  }
  const lastAnchor =
    STATION_BASE_ANCHORS[lastStation as keyof typeof STATION_BASE_ANCHORS] ?? STATION_BASE_ANCHORS.Enchanter;
  const candidateSides: AssemblyPacingSide[] = ["top", "left", "right", "bottom"];
  candidateSides.sort((a, b) => {
    const occA = stationOccupantCounts.get(`Assembly:${a}`) ?? 0;
    const occB = stationOccupantCounts.get(`Assembly:${b}`) ?? 0;
    if (occA !== occB) return occA - occB;
    const segA = ASSEMBLY_PACING_SIDES[a];
    const segB = ASSEMBLY_PACING_SIDES[b];
    const distA = distancePointToSegment(lastAnchor.x, lastAnchor.y, segA.start.x, segA.start.y, segA.end.x, segA.end.y);
    const distB = distancePointToSegment(lastAnchor.x, lastAnchor.y, segB.start.x, segB.start.y, segB.end.x, segB.end.y);
    return distA - distB;
  });

  const isWalkingToAssembly = Boolean(walker.isWalking && walker.resolvedSlot?.station === "Assembly");
  const pacingSide = (walker.hasReachedAssemblyPacing || isWalkingToAssembly) && walker.pacingSide ? walker.pacingSide : candidateSides[0];
  const rawSideOcc = stationOccupantCounts.get(`Assembly:${pacingSide}`) ?? 0;
  stationOccupantCounts.set(`Assembly:${pacingSide}`, rawSideOcc + 1);
  stationOccupantCounts.set("Assembly", (stationOccupantCounts.get("Assembly") ?? 0) + 1);
  const sideOcc =
    (walker.hasReachedAssemblyPacing || isWalkingToAssembly) &&
    walker.pacingSide === pacingSide &&
    typeof walker.pacingSideOcc === "number"
      ? walker.pacingSideOcc
      : rawSideOcc;

  const circuit = resolveThinkingRoamCircuit(pacingSide, sideOcc, sessionId, chamberCtx);
  walker.pacingSideOcc = sideOcc;
  let pt: { x: number; y: number };
  if ((walker.isWalking || walker.hasReachedAssemblyPacing) && walker.pacingSide === pacingSide && typeof walker.pacingLeg === "number") {
    pt = circuit.waypoints[walker.pacingLeg % circuit.waypoints.length];
  } else {
    const paceLeg = (Math.floor(timestampMs / circuit.legPeriodMs) + sideOcc) % 2;
    walker.pacingSide = pacingSide;
    walker.pacingLeg = paceLeg;
    pt = circuit.waypoints[paceLeg];
  }
  return { x: pt.x, y: pt.y, facingDirection: circuit.inwardFacing, pacingSide };
}

export function advanceThinkingRoamLeg(
  walker: WalkerState,
  pacingSide: AssemblyPacingSide,
  sessionId: string,
  chamberCtx?: Partial<ChamberProportionalContext>,
): {
  x: number;
  y: number;
  facingDirection: DirectionalTurnaround;
  waypoints: ReadonlyArray<{ x: number; y: number }>;
} {
  const box = resolveProportionalAssemblyObstacleBox(
    chamberCtx?.chamberWidth ?? WORLD_CHAMBER_WIDTH_PX,
    chamberCtx?.chamberHeight ?? WORLD_TOTAL_HEIGHT_PX,
  );
  const circuit = resolveThinkingRoamCircuit(pacingSide, walker.pacingSideOcc ?? 0, sessionId, chamberCtx);
  const len = circuit.waypoints.length;
  const prevLeg = ((walker.pacingLeg ?? 0) % len + len) % len;
  const nextLeg = (prevLeg + 1) % len;
  const prevPrevLeg = (prevLeg + len - 1) % len;
  walker.pacingSide = pacingSide;
  walker.pacingLeg = nextLeg;

  const prevPrevPt = circuit.waypoints[prevPrevLeg];
  const prevPt = circuit.waypoints[prevLeg];
  const nextPt = circuit.waypoints[nextLeg];
  const startPt = { x: walker.currentX, y: walker.currentY };
  const distToCorner = Math.hypot(prevPt.x - startPt.x, prevPt.y - startPt.y);

  let cornerCtrl: { x: number; y: number };
  if (distToCorner >= 8) {
    cornerCtrl = prevPt;
  } else {
    const inDx = prevPt.x - prevPrevPt.x;
    const inDy = prevPt.y - prevPrevPt.y;
    const inLen = Math.hypot(inDx, inDy) || 1;
    const outDx = nextPt.x - startPt.x;
    const outDy = nextPt.y - startPt.y;
    const outLen = Math.hypot(outDx, outDy) || 1;
    cornerCtrl = clampOutsideObstacle(
      startPt.x + (inDx / inLen) * 20 + (outDx / outLen) * 16,
      startPt.y + (inDy / inLen) * 20 + (outDy / outLen) * 16,
      box,
    );
  }

  const waypoints = filletWaypointPolyline(startPt, [cornerCtrl, nextPt], {
    maxRadiusPx: 34,
    samplesPerCorner: 4,
    obstacleBoxes: [box, RESOURCE_STOCKPILE_OBSTACLE_BOX],
  });
  const firstStep = waypoints[0] ?? nextPt;
  const facingDirection = deriveFacingDirectionFromDelta(firstStep.x - walker.currentX, firstStep.y - walker.currentY);
  return { x: nextPt.x, y: nextPt.y, facingDirection, waypoints };
}
