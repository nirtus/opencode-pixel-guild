import type { SceneHoverTarget } from "../hud/spectator-hud.ts";

export type VisualStyleMode = "clean-cartoon" | "pixel-atlas";
export type ChamberFocusMode = "auto" | "workshop" | "wilds" | "split";
export type EffectiveChamberFocus = "workshop" | "wilds" | "split";
export type SceneHitboxTarget = SceneHoverTarget;

export interface ProportionalWorldDimensions {
  chamberWidth: number;
  chamberHeight: number;
  worldWidth: number;
  worldHeight: number;
  roomWidth: number;
  wildsWidth: number;
}

export interface CameraTransform {
  panX: number;
  panY: number;
  zoom: number;
}

export interface SceneHitboxSpec {
  priority: number;
  target: SceneHitboxTarget;
  sessionId?: string;
  roomId: string;
  x: number;
  y: number;
  w: number;
  h: number;
}
