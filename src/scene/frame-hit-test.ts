import type { SceneHitboxSpec } from "./scene-contracts.ts";

export interface HitTestSceneFrameOptions {
  hitSlopWorldPx?: number;
}

export function hitTestSceneFrame(
  frame: { sceneHitboxes: ReadonlyArray<SceneHitboxSpec> },
  worldX: number,
  worldY: number,
  options?: HitTestSceneFrameOptions,
): SceneHitboxSpec | null {
  const slop = Math.max(0, options?.hitSlopWorldPx ?? 0);
  let bestHit: SceneHitboxSpec | null = null;
  let bestDistSq = Infinity;

  for (const hb of frame.sceneHitboxes) {
    if (
      worldX >= hb.x - slop &&
      worldX <= hb.x + hb.w + slop &&
      worldY >= hb.y - slop &&
      worldY <= hb.y + hb.h + slop
    ) {
      const cx = hb.x + hb.w / 2;
      const cy = hb.y + hb.h / 2;
      const distSq = (worldX - cx) ** 2 + (worldY - cy) ** 2;

      if (!bestHit || hb.priority > bestHit.priority) {
        bestHit = hb;
        bestDistSq = distSq;
      } else if (hb.priority === bestHit.priority) {
        if (slop > 0 ? distSq < bestDistSq : true) {
          bestHit = hb;
          bestDistSq = distSq;
        }
      }
    }
  }
  return bestHit;
}
