export type MermaidDiagramKind =
  | "flowchart"
  | "sequence"
  | "state"
  | "class"
  | "er"
  | "pie";

export type MermaidDirection = "TD" | "TB" | "LR" | "RL" | "BT";

export type MermaidNodeShape =
  | "rect"
  | "round"
  | "stadium"
  | "diamond"
  | "circle"
  | "cylinder"
  | "hexagon"
  | "subroutine"
  | "parallelogram"
  | "start"
  | "end"
  | "card";

export type MermaidEdgeStyle = "solid" | "dotted" | "thick";

export interface MermaidGraphNode {
  readonly id: string;
  label: string;
  shape: MermaidNodeShape;
  members?: string[];
  subgraphId?: string;
  accentHex?: string;
}

export interface MermaidGraphEdge {
  readonly from: string;
  readonly to: string;
  readonly label: string;
  readonly style: MermaidEdgeStyle;
  readonly arrowEnd: boolean;
  readonly arrowStart: boolean;
}

export interface MermaidSubgraph {
  readonly id: string;
  readonly title: string;
  readonly nodeIds: string[];
}

export interface MermaidDirectedGraph {
  readonly kind: "flowchart" | "state" | "class" | "er";
  readonly direction: MermaidDirection;
  readonly title?: string;
  readonly nodes: MermaidGraphNode[];
  readonly edges: MermaidGraphEdge[];
  readonly subgraphs: MermaidSubgraph[];
}

export type MermaidRenderResult =
  | {
      readonly ok: true;
      readonly kind: MermaidDiagramKind;
      readonly title: string | null;
      readonly svg: string;
    }
  | {
      readonly ok: false;
      readonly kind: "unknown";
      readonly reason: string;
    };

export interface MermaidRenderOptions {
  readonly diagramId?: string;
}

export function escapeSvgText(raw: string): string {
  return String(raw ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function sanitizeMermaidColor(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  return /^#[0-9a-fA-F]{3,8}$/.test(trimmed) ? trimmed : undefined;
}

export function hashMermaidKey(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

export function stripMermaidQuotes(raw: string): string {
  const trimmed = raw.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith("`") && trimmed.endsWith("`"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export function normalizeMermaidLabel(raw: string): string {
  return stripMermaidQuotes(raw)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\\n/g, "\n")
    .trim();
}

export function wrapDiagramLabel(text: string, maxCharsPerLine = 24): string[] {
  const paragraphs = normalizeMermaidLabel(text).split("\n");
  const lines: string[] = [];
  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;
    if (trimmed.length <= maxCharsPerLine) {
      lines.push(trimmed);
      continue;
    }
    const words = trimmed.split(/\s+/);
    let current = "";
    for (const word of words) {
      if (!current) {
        current = word;
      } else if (current.length + 1 + word.length <= maxCharsPerLine) {
        current += ` ${word}`;
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }
  return lines.length > 0 ? lines : [text.trim() || "?"];
}

export function estimateMonospaceWidth(text: string, charPx = 6.9): number {
  return Math.ceil(text.length * charPx);
}
