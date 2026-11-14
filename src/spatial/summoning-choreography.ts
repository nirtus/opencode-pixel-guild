import { LIFECYCLE_TIMERS_MS } from "../types/domain.ts";
import type { TileCoord } from "./tile-grid.ts";
import {
  isInsideRoomGrid,
  resolveToWalkableTile,
  type WalkableGridHolder,
  PATHFINDING_CARDINAL_DELTAS,
} from "./pathfinding-bfs.ts";

export const SUMMONING_RITUAL_DURATION_MS =
  LIFECYCLE_TIMERS_MS.SUMMONING_RITUAL_DWELL_MS;

export interface ComputeAdjacentSummonTileOptions {
  occupantIndex?: number;
  existingOccupiedTiles?: TileCoord[];
}

export function computeAdjacentSummonTile(
  room: WalkableGridHolder,
  parentTile: TileCoord,
  occupantIndexOrOptions: number | ComputeAdjacentSummonTileOptions = 0,
  existingOccupiedTiles: TileCoord[] = [],
): TileCoord {
  const occupantIndex =
    typeof occupantIndexOrOptions === "number"
      ? occupantIndexOrOptions
      : (occupantIndexOrOptions.occupantIndex ?? 0);
  const occupiedList =
    typeof occupantIndexOrOptions === "number"
      ? existingOccupiedTiles
      : (occupantIndexOrOptions.existingOccupiedTiles ?? existingOccupiedTiles);

  const clampedIndex = Math.max(0, Math.floor(occupantIndex));
  const resolvedParent = resolveToWalkableTile(room, parentTile) ?? {
    x: Math.max(0, Math.min(room.width - 1, Math.round(parentTile.x))),
    y: Math.max(0, Math.min(room.height - 1, Math.round(parentTile.y))),
  };

  const occupiedKeys = new Set(
    occupiedList.map((t) => `${Math.round(t.x)},${Math.round(t.y)}`),
  );
  occupiedKeys.add(`${resolvedParent.x},${resolvedParent.y}`);

  // 1. Immediate cardinal neighbors (|dx| + |dy| === 1)
  const cardinalCandidates: TileCoord[] = [];
  for (const delta of PATHFINDING_CARDINAL_DELTAS) {
    const candidate = {
      x: resolvedParent.x + delta.x,
      y: resolvedParent.y + delta.y,
    };
    const key = `${candidate.x},${candidate.y}`;
    if (
      isInsideRoomGrid(room, candidate) &&
      room.grid[candidate.y][candidate.x].walkable &&
      !occupiedKeys.has(key)
    ) {
      cardinalCandidates.push(candidate);
    }
  }

  if (clampedIndex < cardinalCandidates.length) {
    return { ...cardinalCandidates[clampedIndex] };
  }

  // 2. Fallback BFS expansion if surrounded or 4+ concurrent subagents
  const candidates: TileCoord[] = [...cardinalCandidates];
  const seenKeys = new Set<string>(
    candidates.map((t) => `${t.x},${t.y}`),
  );
  const bfsQueue: TileCoord[] = [{ ...resolvedParent }];
  const bfsVisited = new Set<string>([
    `${resolvedParent.x},${resolvedParent.y}`,
  ]);

  let head = 0;
  while (head < bfsQueue.length && candidates.length <= clampedIndex) {
    const curr = bfsQueue[head];
    head += 1;
    for (const delta of PATHFINDING_CARDINAL_DELTAS) {
      const next = { x: curr.x + delta.x, y: curr.y + delta.y };
      const key = `${next.x},${next.y}`;
      if (!isInsideRoomGrid(room, next) || bfsVisited.has(key)) {
        continue;
      }
      bfsVisited.add(key);
      if (room.grid[next.y][next.x].walkable) {
        bfsQueue.push(next);
        if (!occupiedKeys.has(key) && !seenKeys.has(key)) {
          seenKeys.add(key);
          candidates.push(next);
        }
      }
    }
  }

  const chosen =
    candidates[clampedIndex] ??
    candidates[candidates.length - 1] ??
    resolvedParent;
  return { ...chosen };
}
