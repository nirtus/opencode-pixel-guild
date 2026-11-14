import {
  GOAL_ASSEMBLY_OBSTACLE_BOX,
  isPointInsideBox,
  type ObstacleBox,
  RESOURCE_STOCKPILE_OBSTACLE_BOX,
  segmentIntersectsBox,
} from "./corridor-router.ts";

export interface FilletPolylineOptions {
  readonly maxRadiusPx?: number;
  readonly samplesPerCorner?: number;
  readonly obstacleBoxes?: ReadonlyArray<ObstacleBox>;
}

const DEFAULT_INDOOR_OBSTACLES: ReadonlyArray<ObstacleBox> = Object.freeze([
  GOAL_ASSEMBLY_OBSTACLE_BOX,
  RESOURCE_STOCKPILE_OBSTACLE_BOX,
]);

function isArcObstacleSafe(
  prevPt: { x: number; y: number },
  arcPts: ReadonlyArray<{ x: number; y: number }>,
  nextRefPt: { x: number; y: number },
  obstacles: ReadonlyArray<ObstacleBox>,
): boolean {
  if (arcPts.length === 0) return true;
  const checkSeq = [prevPt, ...arcPts, nextRefPt];
  for (const pt of arcPts) {
    if (pt.x >= 760) continue;
    for (const box of obstacles) {
      if (isPointInsideBox(pt.x, pt.y, box)) return false;
    }
  }
  for (let i = 0; i < checkSeq.length - 1; i++) {
    const a = checkSeq[i];
    const b = checkSeq[i + 1];
    if (a.x >= 760 && b.x >= 760) continue;
    for (const box of obstacles) {
      if (segmentIntersectsBox(a.x, a.y, b.x, b.y, box)) return false;
    }
  }
  return true;
}

function sampleQuadraticFilletArc(
  prevVertex: { x: number; y: number },
  cornerVertex: { x: number; y: number },
  nextVertex: { x: number; y: number },
  radiusPx: number,
  samples: number,
): Array<{ x: number; y: number }> {
  const inDx = cornerVertex.x - prevVertex.x;
  const inDy = cornerVertex.y - prevVertex.y;
  const outDx = nextVertex.x - cornerVertex.x;
  const outDy = nextVertex.y - cornerVertex.y;
  const inLen = Math.hypot(inDx, inDy) || 1;
  const outLen = Math.hypot(outDx, outDy) || 1;
  const ux = inDx / inLen;
  const uy = inDy / inLen;
  const vx = outDx / outLen;
  const vy = outDy / outLen;

  const rIn = Math.min(radiusPx, inLen * 0.38);
  const rOut = Math.min(radiusPx, outLen * 0.38);
  const ax = cornerVertex.x - ux * rIn;
  const ay = cornerVertex.y - uy * rIn;
  const cx = cornerVertex.x + vx * rOut;
  const cy = cornerVertex.y + vy * rOut;

  const count = Math.max(3, samples);
  const pts: Array<{ x: number; y: number }> = [];
  for (let s = 0; s < count; s++) {
    const t = s / (count - 1);
    const omt = 1 - t;
    const px = omt * omt * ax + 2 * omt * t * cornerVertex.x + t * t * cx;
    const py = omt * omt * ay + 2 * omt * t * cornerVertex.y + t * t * cy;
    pts.push({
      x: Number(px.toFixed(2)),
      y: Number(py.toFixed(2)),
    });
  }
  return pts;
}

export function filletWaypointPolyline(
  start: { x: number; y: number },
  waypoints: ReadonlyArray<{ x: number; y: number }>,
  options?: FilletPolylineOptions,
): Array<{ x: number; y: number }> {
  if (waypoints.length <= 1) {
    return waypoints.map((wp) => ({ x: wp.x, y: wp.y }));
  }

  const maxRadiusPx = options?.maxRadiusPx ?? 44;
  const samplesPerCorner = options?.samplesPerCorner ?? 4;
  const obstacles = options?.obstacleBoxes ?? DEFAULT_INDOOR_OBSTACLES;

  const poly = [start, ...waypoints];
  const result: Array<{ x: number; y: number }> = [];
  let prevEmitted = start;

  for (let i = 1; i < poly.length - 1; i++) {
    const pPrev = poly[i - 1];
    const pCurr = poly[i];
    const pNext = poly[i + 1];

    const inDx = pCurr.x - pPrev.x;
    const inDy = pCurr.y - pPrev.y;
    const outDx = pNext.x - pCurr.x;
    const outDy = pNext.y - pCurr.y;
    const inLen = Math.hypot(inDx, inDy);
    const outLen = Math.hypot(outDx, outDy);

    if (inLen < 18 || outLen < 18) {
      result.push({ x: pCurr.x, y: pCurr.y });
      prevEmitted = pCurr;
      continue;
    }

    const dot = Math.max(-1, Math.min(1, (inDx * outDx + inDy * outDy) / (inLen * outLen)));
    const turnAngleRad = Math.acos(dot);
    if (turnAngleRad < (8 * Math.PI) / 180) {
      result.push({ x: pCurr.x, y: pCurr.y });
      prevEmitted = pCurr;
      continue;
    }

    const baseRadius = Math.min(maxRadiusPx, inLen * 0.38, outLen * 0.38);
    const nextCheckRef =
      i + 1 < poly.length - 1
        ? { x: (pCurr.x + pNext.x) * 0.5, y: (pCurr.y + pNext.y) * 0.5 }
        : pNext;

    let chosenArc: Array<{ x: number; y: number }> | null = null;
    for (const scale of [1.0, 0.5, 0.25] as const) {
      const candidate = sampleQuadraticFilletArc(pPrev, pCurr, pNext, baseRadius * scale, samplesPerCorner);
      if (isArcObstacleSafe(prevEmitted, candidate, nextCheckRef, obstacles)) {
        chosenArc = candidate;
        break;
      }
    }

    if (chosenArc && chosenArc.length > 0) {
      for (const pt of chosenArc) {
        if (Math.hypot(pt.x - prevEmitted.x, pt.y - prevEmitted.y) > 1.5) {
          result.push(pt);
          prevEmitted = pt;
        }
      }
    } else {
      result.push({ x: pCurr.x, y: pCurr.y });
      prevEmitted = pCurr;
    }
  }

  const finalWp = waypoints[waypoints.length - 1];
  if (result.length === 0 || Math.hypot(finalWp.x - prevEmitted.x, finalWp.y - prevEmitted.y) > 0.5) {
    result.push({ x: finalWp.x, y: finalWp.y });
  } else {
    result[result.length - 1] = { x: finalWp.x, y: finalWp.y };
  }
  return result;
}

export interface SmoothDetourChicaneInput {
  readonly currentX: number;
  readonly currentY: number;
  readonly nextWpX: number;
  readonly nextWpY: number;
  readonly forwardMid: number;
  readonly lateralOffsetX: number;
  readonly lateralOffsetY: number;
  readonly clampPoint: (x: number, y: number) => { x: number; y: number };
  readonly isSegmentClear: (ax: number, ay: number, bx: number, by: number) => boolean;
}

export function buildSmoothDetourChicaneArc(
  input: SmoothDetourChicaneInput,
): Array<{ x: number; y: number }> {
  const vx = input.nextWpX - input.currentX;
  const vy = input.nextWpY - input.currentY;
  const segLen = Math.hypot(vx, vy) || 1;
  const fx = vx / segLen;
  const fy = vy / segLen;

  const fEntry = Math.max(12, input.forwardMid * 0.45);
  const fApex = input.forwardMid;
  const fExit = Math.min(segLen * 0.88, Math.max(fApex + 14, input.forwardMid * 1.55));

  const entryPt = input.clampPoint(
    Math.round(input.currentX + fx * fEntry + input.lateralOffsetX * 0.58),
    Math.round(input.currentY + fy * fEntry + input.lateralOffsetY * 0.58),
  );
  const apexPt = input.clampPoint(
    Math.round(input.currentX + fx * fApex + input.lateralOffsetX),
    Math.round(input.currentY + fy * fApex + input.lateralOffsetY),
  );
  const exitPt = input.clampPoint(
    Math.round(input.currentX + fx * fExit + input.lateralOffsetX * 0.58),
    Math.round(input.currentY + fy * fExit + input.lateralOffsetY * 0.58),
  );

  const chicane = [entryPt, apexPt, exitPt];
  const fullSeq = [{ x: input.currentX, y: input.currentY }, ...chicane, { x: input.nextWpX, y: input.nextWpY }];
  for (let i = 0; i < fullSeq.length - 1; i++) {
    if (!input.isSegmentClear(fullSeq[i].x, fullSeq[i].y, fullSeq[i + 1].x, fullSeq[i + 1].y)) {
      return [apexPt];
    }
  }
  return chicane;
}
