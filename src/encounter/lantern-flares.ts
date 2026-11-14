import type { TileCoord } from "../spatial/tile-grid.ts";

export const DIAGNOSTIC_TOOLS = [
  "grep",
  "glob",
  "read",
  "diagnose",
  "diagnosing-bugs",
  "find-skills",
  "lsp",
  "hunt",
] as const;

export function isDiagnosticTool(toolName: string): boolean {
  const lower = (toolName ?? "").toLowerCase().trim();
  return DIAGNOSTIC_TOOLS.some((t) => lower.includes(t));
}

export type ClueKind = "slime-tracks" | "claw-marks" | "broken-runes";

export interface ClueLair {
  readonly tile: TileCoord;
  readonly kind: ClueKind;
}

export interface LanternFlare {
  flareId: string;
  toolName: string;
  originTile: TileCoord;
  currentRadius: number;
  maxRadius: number;
  durationMs: number;
  elapsedMs: number;
  active: boolean;
  clueLairs: readonly ClueLair[];
  discoveredClue: ClueLair | null;
  flareColorHex: string;
  particleSparkColorHex: string;
}
