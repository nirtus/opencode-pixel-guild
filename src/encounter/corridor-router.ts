import { filletWaypointPolyline } from "./path-curve-fillet.ts";

export interface ObstacleBox {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

export const GOAL_ASSEMBLY_OBSTACLE_BOX: ObstacleBox = Object.freeze({
  minX: 280,
  maxX: 500,
  minY: 250,
  maxY: 430,
});

export const RESOURCE_STOCKPILE_OBSTACLE_BOX: ObstacleBox = Object.freeze({
  minX: 392,
  maxX: 512,
  minY: 42,
  maxY: 128,
});

export const EAST_WILDERNESS_PORTAL = Object.freeze({ x: 774, y: 352 });
export const ARMORY_ANCHOR = Object.freeze({ x: 118, y: 445 });
export const STOCKPILE_ANCHOR = Object.freeze({ x: 452, y: 138 });
export const ASSEMBLY_ANCHOR = Object.freeze({ x: 390, y: 350 });

const RING_CORRIDOR_CORNERS: ReadonlyArray<{ x: number; y: number }> = Object.freeze([
  { x: 240, y: 210 },
  { x: 540, y: 210 },
  { x: 540, y: 470 },
  { x: 240, y: 470 },
]);

export function hashRouteSeed(seed: string | number): number {
  const str = String(seed);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function resolveCharacterWalkSpeed(
  baseSpeedPxPerSec: number,
  sessionId: string,
  legSeed: string | number = 0,
): number {
  const h = hashRouteSeed(`${sessionId}:speed:${legSeed}`);
  const unit = (h % 2001) / 1000 - 1;
  return Number((baseSpeedPxPerSec * (1 + unit * 0.12)).toFixed(2));
}

export function resolveDepartureStaggerMs(
  sessionId: string,
  simultaneousTransitionIndex: number,
): number {
  if (simultaneousTransitionIndex <= 0) return 0;
  const h = hashRouteSeed(`${sessionId}:stagger:${simultaneousTransitionIndex}`);
  return 35 + ((h + simultaneousTransitionIndex * 43) % 146);
}

function pickSignedLaneBandOffset(bits: number, outwardSign: -1 | 1): number {
  const mag = 12 + (bits % 11);
  const sign = (bits & 16) !== 0 ? outwardSign : outwardSign * -1;
  return sign === outwardSign ? outwardSign * mag : -outwardSign * Math.min(12, mag);
}

function buildSeededCorridorCorners(h: number): Array<{ x: number; y: number }> {
  const h2 = hashRouteSeed(`c3:${h}`);
  return [
    { x: 240 + pickSignedLaneBandOffset(h & 0x3f, -1), y: 210 + pickSignedLaneBandOffset((h >>> 6) & 0x3f, -1) },
    { x: 540 + pickSignedLaneBandOffset((h >>> 12) & 0x3f, 1), y: 210 + pickSignedLaneBandOffset((h >>> 18) & 0x3f, -1) },
    { x: 540 + pickSignedLaneBandOffset((h >>> 24) & 0x3f, 1), y: 470 + pickSignedLaneBandOffset(h2 & 0x3f, 1) },
    { x: 240 + pickSignedLaneBandOffset((h2 >>> 6) & 0x3f, -1), y: 470 + pickSignedLaneBandOffset((h2 >>> 12) & 0x3f, 1) },
  ];
}

export function isPointInsideBox(x: number, y: number, box: ObstacleBox): boolean {
  return x > box.minX && x < box.maxX && y > box.minY && y < box.maxY;
}

export function segmentIntersectsBox(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  box: ObstacleBox = GOAL_ASSEMBLY_OBSTACLE_BOX,
): boolean {
  const dx = bx - ax;
  const dy = by - ay;
  let tMin = 0;
  let tMax = 1;
  const p = [-dx, dx, -dy, dy];
  const q = [ax - box.minX, box.maxX - ax, ay - box.minY, box.maxY - ay];
  for (let i = 0; i < 4; i++) {
    if (Math.abs(p[i]) < 1e-9) {
      if (q[i] <= 0) return false;
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) {
        if (t > tMax) return false;
        if (t > tMin) tMin = t;
      } else {
        if (t < tMin) return false;
        if (t < tMax) tMax = t;
      }
    }
  }
  return tMin < tMax;
}

function computeUnobstructedSeededLeg(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  h: number,
): Array<{ x: number; y: number }> {
  const dist = Math.hypot(bx - ax, by - ay);
  const isSouthFoyerNorthWalk = ay >= 560 && Math.abs(ax - 400) <= 56 && Math.abs(bx - 400) <= 56 && by <= ay;
  if (dist <= 165 || isSouthFoyerNorthWalk) return [{ x: bx, y: by }];
  const ux = (bx - ax) / dist;
  const uy = (by - ay) / dist;
  const nx = -uy;
  const ny = ux;
  const midX = (ax + bx) * 0.5;
  const midY = (ay + by) * 0.5;
  const toCenterDot = (390 - midX) * nx + (345 - midY) * ny;
  const baseSign = toCenterDot >= 0 ? 1 : -1;
  const latMag = Math.min(20 + ((h >>> 4) % 26), Math.round(dist * 0.16));
  const t1 = 0.26 + ((h >>> 9) % 21) * 0.01;
  const t2 = 0.64 + ((h >>> 14) % 20) * 0.01;
  const style = h % 3;

  for (const signMul of [((h >>> 3) & 1) === 0 ? baseSign : -baseSign, baseSign, -baseSign]) {
    const lat = signMul * latMag;
    const p1 = {
      x: Math.max(60, Math.min(744, Math.round(ax + (bx - ax) * t1 + nx * lat))),
      y: Math.max(70, Math.min(690, Math.round(ay + (by - ay) * t1 + ny * lat))),
    };
    const p2 =
      style === 0
        ? Math.abs(bx - ax) >= Math.abs(by - ay)
          ? { x: Math.max(60, Math.min(744, Math.round(ax + (bx - ax) * t2))), y: p1.y }
          : { x: p1.x, y: Math.max(70, Math.min(690, Math.round(ay + (by - ay) * t2))) }
        : style === 1
          ? Math.abs(bx - ax) >= Math.abs(by - ay)
            ? {
                x: Math.max(60, Math.min(744, Math.round(ax + (bx - ax) * t2))),
                y: Math.max(70, Math.min(690, Math.round(ay + (by - ay) * t2 + ny * lat * 0.45))),
              }
            : {
                x: Math.max(60, Math.min(744, Math.round(ax + (bx - ax) * t2 + nx * lat * 0.45))),
                y: Math.max(70, Math.min(690, Math.round(ay + (by - ay) * t2))),
              }
          : {
              x: Math.max(60, Math.min(744, Math.round(ax + (bx - ax) * t2 + nx * lat * 0.8))),
              y: Math.max(70, Math.min(690, Math.round(ay + (by - ay) * t2 + ny * lat * 0.8))),
            };

    const forward1 = (p1.x - ax) * ux + (p1.y - ay) * uy;
    const forward2 = (p2.x - p1.x) * ux + (p2.y - p1.y) * uy;
    const forward3 = (bx - p2.x) * ux + (by - p2.y) * uy;
    const backwardsInSouthFoyer = ay >= 560 && by < ay && (p1.y > ay || p2.y > p1.y);

    if (
      forward1 > 4 &&
      forward2 >= 0 &&
      forward3 > 4 &&
      !backwardsInSouthFoyer &&
      !isPointInsideBox(p1.x, p1.y, GOAL_ASSEMBLY_OBSTACLE_BOX) &&
      !isPointInsideBox(p2.x, p2.y, GOAL_ASSEMBLY_OBSTACLE_BOX) &&
      !isPointInsideBox(p1.x, p1.y, RESOURCE_STOCKPILE_OBSTACLE_BOX) &&
      !isPointInsideBox(p2.x, p2.y, RESOURCE_STOCKPILE_OBSTACLE_BOX) &&
      !segmentIntersectsBox(ax, ay, p1.x, p1.y, GOAL_ASSEMBLY_OBSTACLE_BOX) &&
      !segmentIntersectsBox(p1.x, p1.y, p2.x, p2.y, GOAL_ASSEMBLY_OBSTACLE_BOX) &&
      !segmentIntersectsBox(p2.x, p2.y, bx, by, GOAL_ASSEMBLY_OBSTACLE_BOX) &&
      !segmentIntersectsBox(ax, ay, p1.x, p1.y, RESOURCE_STOCKPILE_OBSTACLE_BOX) &&
      !segmentIntersectsBox(p1.x, p1.y, p2.x, p2.y, RESOURCE_STOCKPILE_OBSTACLE_BOX) &&
      !segmentIntersectsBox(p2.x, p2.y, bx, by, RESOURCE_STOCKPILE_OBSTACLE_BOX)
    ) {
      return [p1, p2, { x: bx, y: by }];
    }
  }
  return [{ x: bx, y: by }];
}

function computeIndoorCorridorLeg(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  routeSeed?: string | number,
): Array<{ x: number; y: number }> {
  const h = routeSeed !== undefined ? hashRouteSeed(routeSeed) : undefined;
  if (
    isPointInsideBox(ax, ay, GOAL_ASSEMBLY_OBSTACLE_BOX) ||
    isPointInsideBox(bx, by, GOAL_ASSEMBLY_OBSTACLE_BOX) ||
    isPointInsideBox(ax, ay, RESOURCE_STOCKPILE_OBSTACLE_BOX) ||
    isPointInsideBox(bx, by, RESOURCE_STOCKPILE_OBSTACLE_BOX)
  ) {
    return [{ x: bx, y: by }];
  }
  if (
    !segmentIntersectsBox(ax, ay, bx, by, GOAL_ASSEMBLY_OBSTACLE_BOX) &&
    !segmentIntersectsBox(ax, ay, bx, by, RESOURCE_STOCKPILE_OBSTACLE_BOX)
  ) {
    return h !== undefined ? computeUnobstructedSeededLeg(ax, ay, bx, by, h) : [{ x: bx, y: by }];
  }

  const corners = h !== undefined ? buildSeededCorridorCorners(h) : RING_CORRIDOR_CORNERS;
  const nodes = [{ x: ax, y: ay }, ...corners, { x: bx, y: by }];
  const n = nodes.length;

  if (h !== undefined) {
    const validPaths: Array<{ indices: number[]; dist: number; points: Array<{ x: number; y: number }> }> = [];
    const dfs = (u: number, visitedMask: number, accIndices: number[], accDist: number) => {
      if (u === n - 1) {
        validPaths.push({
          indices: accIndices.filter((idx) => idx > 0 && idx < n - 1),
          dist: accDist,
          points: accIndices.slice(1).map((idx) => ({ x: nodes[idx].x, y: nodes[idx].y })),
        });
        return;
      }
      for (let v = 1; v < n; v++) {
        if ((visitedMask & (1 << v)) !== 0) continue;
        if (
          segmentIntersectsBox(nodes[u].x, nodes[u].y, nodes[v].x, nodes[v].y, GOAL_ASSEMBLY_OBSTACLE_BOX) ||
          segmentIntersectsBox(nodes[u].x, nodes[u].y, nodes[v].x, nodes[v].y, RESOURCE_STOCKPILE_OBSTACLE_BOX)
        ) {
          continue;
        }
        const w = Math.hypot(nodes[v].x - nodes[u].x, nodes[v].y - nodes[u].y);
        dfs(v, visitedMask | (1 << v), [...accIndices, v], accDist + w);
      }
    };
    dfs(0, 1, [0], 0);
    if (validPaths.length > 0) {
      validPaths.sort((a, b) => a.dist - b.dist);
      const primary = validPaths[0];
      const primarySet = new Set(primary.indices);
      const alternate = validPaths.find((p) => p.indices.length > 0 && p.indices.every((idx) => !primarySet.has(idx)));
      if (alternate && alternate.dist <= primary.dist * 1.22 && ((h >>> 3) & 1) === 1) return alternate.points;
      return primary.points;
    }
  }

  const fallbackNodes = [{ x: ax, y: ay }, ...RING_CORRIDOR_CORNERS, { x: bx, y: by }];
  const dist = new Array<number>(n).fill(Number.POSITIVE_INFINITY);
  const prev = new Array<number>(n).fill(-1);
  const visited = new Array<boolean>(n).fill(false);
  dist[0] = 0;

  for (let iter = 0; iter < n; iter++) {
    let u = -1;
    for (let i = 0; i < n; i++) {
      if (!visited[i] && (u === -1 || dist[i] < dist[u])) u = i;
    }
    if (u === -1 || dist[u] === Number.POSITIVE_INFINITY || u === n - 1) break;
    visited[u] = true;
    for (let v = 0; v < n; v++) {
      if (visited[v] || u === v) continue;
      if (
        segmentIntersectsBox(fallbackNodes[u].x, fallbackNodes[u].y, fallbackNodes[v].x, fallbackNodes[v].y, GOAL_ASSEMBLY_OBSTACLE_BOX) ||
        segmentIntersectsBox(fallbackNodes[u].x, fallbackNodes[u].y, fallbackNodes[v].x, fallbackNodes[v].y, RESOURCE_STOCKPILE_OBSTACLE_BOX)
      ) {
        continue;
      }
      const w = Math.hypot(fallbackNodes[v].x - fallbackNodes[u].x, fallbackNodes[v].y - fallbackNodes[u].y);
      if (dist[u] + w < dist[v]) { dist[v] = dist[u] + w; prev[v] = u; }
    }
  }

  const path: Array<{ x: number; y: number }> = [];
  for (let curr = n - 1; curr !== -1 && curr !== 0; curr = prev[curr]) {
    path.unshift({ x: fallbackNodes[curr].x, y: fallbackNodes[curr].y });
  }
  return path.length > 0 ? path : [{ x: bx, y: by }];
}

export function computeRingCorridorWaypoints(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  routeSeed?: string | number,
): ReadonlyArray<{ x: number; y: number }> {
  if (Math.hypot(toX - fromX, toY - fromY) <= 3) return [{ x: toX, y: toY }];
  const h = routeSeed !== undefined ? hashRouteSeed(`portal:${routeSeed}`) : undefined;
  const portal = h !== undefined ? { x: 774 + ((h & 0x0f) - 7), y: 352 + (((h >>> 4) % 25) - 12) } : EAST_WILDERNESS_PORTAL;
  const portalIn = { x: 722, y: portal.y };
  if (fromX < 760 && toX > 760) {
    const indoorLeg =
      fromX < 700
        ? computeIndoorCorridorLeg(fromX, fromY, portalIn.x, portalIn.y, routeSeed)
        : Math.abs(fromY - portal.y) > 24
          ? [portalIn]
          : [];
    const filletedIndoor = filletWaypointPolyline({ x: fromX, y: fromY }, indoorLeg);
    return [...filletedIndoor, { x: portal.x, y: portal.y }, { x: toX, y: toY }];
  }
  if (fromX >= 760 && toX < 760) {
    const indoorLeg = toX < 700 ? computeIndoorCorridorLeg(portalIn.x, portalIn.y, toX, toY, routeSeed) : [{ x: toX, y: toY }];
    const filletedReturn = filletWaypointPolyline(portal, [portalIn, ...indoorLeg]);
    return [{ x: portal.x, y: portal.y }, ...filletedReturn];
  }
  if (fromX < 760 && toX <= 760) {
    const rawIndoor = computeIndoorCorridorLeg(fromX, fromY, toX, toY, routeSeed);
    return filletWaypointPolyline({ x: fromX, y: fromY }, rawIndoor);
  }
  return [{ x: toX, y: toY }];
}
