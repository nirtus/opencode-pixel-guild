import {
  type MermaidDirectedGraph,
  type MermaidDirection,
  type MermaidEdgeStyle,
  type MermaidGraphEdge,
  type MermaidGraphNode,
  type MermaidNodeShape,
  type MermaidSubgraph,
  normalizeMermaidLabel,
  sanitizeMermaidColor,
} from "./mermaid-types.ts";

interface ParsedNodeToken {
  readonly id: string;
  readonly label?: string;
  readonly shape?: MermaidNodeShape;
  readonly className?: string;
}

const EDGE_PATTERN =
  /(<-->|<==>|<-.->|o--o|x--x|-->|--->|==>|===>|-.->|-\.->|---|===|-\.-|--\s+([^-\n]+?)\s+-->|-\.\s+([^.\n]+?)\s+\.->|==\s+([^=\n]+?)\s+==>)(?:\|([^|\n]+)\|)?/g;

function parseNodeSpec(rawToken: string): ParsedNodeToken | null {
  const token = rawToken.trim().replace(/;+$/, "").trim();
  if (!token) return null;

  const classSplit = token.split(":::");
  const core = classSplit[0]!.trim();
  const className = classSplit[1]?.trim() || undefined;

  const patterns: Array<[RegExp, MermaidNodeShape]> = [
    [/^([A-Za-z0-9_.-]+)\s*\(\[([\s\S]+)\]\)$/, "stadium"],
    [/^([A-Za-z0-9_.-]+)\s*\[\(([\s\S]+)\)\]$/, "cylinder"],
    [/^([A-Za-z0-9_.-]+)\s*\[\[([\s\S]+)\]\]$/, "subroutine"],
    [/^([A-Za-z0-9_.-]+)\s*\(\(([\s\S]+)\)\)$/, "circle"],
    [/^([A-Za-z0-9_.-]+)\s*\{\{([\s\S]+)\}\}$/, "hexagon"],
    [/^([A-Za-z0-9_.-]+)\s*\[\/([\s\S]+)\/\]$/, "parallelogram"],
    [/^([A-Za-z0-9_.-]+)\s*\[([\s\S]+)\]$/, "rect"],
    [/^([A-Za-z0-9_.-]+)\s*\(([\s\S]+)\)$/, "round"],
    [/^([A-Za-z0-9_.-]+)\s*\{([\s\S]+)\}$/, "diamond"],
  ];

  for (const [regex, shape] of patterns) {
    const match = regex.exec(core);
    if (match) {
      return {
        id: match[1]!,
        label: normalizeMermaidLabel(match[2]!),
        shape,
        className,
      };
    }
  }

  const bareMatch = /^([A-Za-z0-9_.-]+)$/.exec(core);
  if (bareMatch) {
    return { id: bareMatch[1]!, className };
  }
  return null;
}

function classifyEdgeToken(
  op: string,
  pipeLabel?: string,
  inlineSolid?: string,
  inlineDot?: string,
  inlineThick?: string,
): {
  readonly style: MermaidEdgeStyle;
  readonly arrowStart: boolean;
  readonly arrowEnd: boolean;
  readonly label: string;
} {
  const style: MermaidEdgeStyle =
    op.includes("=") ? "thick" : op.includes(".") ? "dotted" : "solid";
  const arrowStart = op.startsWith("<");
  const arrowEnd = op.endsWith(">");
  const rawLabel = pipeLabel ?? inlineSolid ?? inlineDot ?? inlineThick ?? "";
  return {
    style,
    arrowStart,
    arrowEnd,
    label: normalizeMermaidLabel(rawLabel),
  };
}

function splitNodeGroup(rawGroup: string): ParsedNodeToken[] {
  const parts: string[] = [];
  let depth = 0;
  let inQuote: string | null = null;
  let buf = "";
  for (let i = 0; i < rawGroup.length; i++) {
    const ch = rawGroup[i]!;
    if (inQuote) {
      buf += ch;
      if (ch === inQuote) inQuote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inQuote = ch;
      buf += ch;
      continue;
    }
    if (ch === "[" || ch === "(" || ch === "{") depth += 1;
    else if (ch === "]" || ch === ")" || ch === "}") depth = Math.max(0, depth - 1);
    if (ch === "&" && depth === 0) {
      parts.push(buf);
      buf = "";
    } else {
      buf += ch;
    }
  }
  if (buf.trim()) parts.push(buf);
  return parts
    .map(parseNodeSpec)
    .filter((tok): tok is ParsedNodeToken => tok !== null);
}

export function parseFlowchartDiagram(rawSource: string): MermaidDirectedGraph | null {
  const lines = rawSource
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.replace(/%%.*$/, "").trim())
    .filter((l) => l.length > 0 && !l.startsWith("---"));

  if (lines.length === 0) return null;

  let headerIdx = 0;
  let title: string | undefined;
  while (headerIdx < lines.length && /^title\s*:/i.test(lines[headerIdx]!)) {
    title = lines[headerIdx]!.replace(/^title\s*:/i, "").trim();
    headerIdx += 1;
  }
  const header = lines[headerIdx] ?? "";
  const headerMatch = /^(?:flowchart|graph)\s*(TD|TB|LR|RL|BT)?\b/i.exec(header);
  if (!headerMatch) return null;

  const direction = (headerMatch[1]?.toUpperCase() as MermaidDirection | undefined) ?? "TD";
  const nodeMap = new Map<string, MermaidGraphNode>();
  const edges: MermaidGraphEdge[] = [];
  const subgraphs: MermaidSubgraph[] = [];
  const subgraphStack: MermaidSubgraph[] = [];
  const classColors = new Map<string, string>();
  const pendingClassByNode = new Map<string, string>();

  const upsertNode = (tok: ParsedNodeToken): MermaidGraphNode => {
    let existing = nodeMap.get(tok.id);
    if (!existing) {
      existing = {
        id: tok.id,
        label: tok.label || tok.id,
        shape: tok.shape ?? "rect",
      };
      nodeMap.set(tok.id, existing);
    } else {
      if (tok.label) existing.label = tok.label;
      if (tok.shape) existing.shape = tok.shape;
    }
    if (tok.className) pendingClassByNode.set(tok.id, tok.className);
    const activeSub = subgraphStack[subgraphStack.length - 1];
    if (activeSub && !existing.subgraphId) {
      existing.subgraphId = activeSub.id;
      if (!activeSub.nodeIds.includes(existing.id)) activeSub.nodeIds.push(existing.id);
    }
    return existing;
  };

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i]!;
    if (/^direction\s+(TD|TB|LR|RL|BT)$/i.test(line)) continue;
    if (/^linkStyle\b/i.test(line) || /^click\b/i.test(line)) continue;

    const classDefMatch = /^classDef\s+([A-Za-z0-9_-]+)\s+(.+)$/i.exec(line);
    if (classDefMatch) {
      const strokeMatch = /(?:stroke|fill)\s*:\s*(#[0-9a-fA-F]{3,8})/i.exec(classDefMatch[2]!);
      const safe = sanitizeMermaidColor(strokeMatch?.[1]);
      if (safe) classColors.set(classDefMatch[1]!, safe);
      continue;
    }

    const styleMatch = /^style\s+([A-Za-z0-9_.-]+)\s+(.+)$/i.exec(line);
    if (styleMatch) {
      const strokeMatch = /(?:stroke|fill)\s*:\s*(#[0-9a-fA-F]{3,8})/i.exec(styleMatch[2]!);
      const safe = sanitizeMermaidColor(strokeMatch?.[1]);
      const target = nodeMap.get(styleMatch[1]!);
      if (target && safe) target.accentHex = safe;
      continue;
    }

    const classAssignMatch = /^class\s+([A-Za-z0-9_.,\s-]+)\s+([A-Za-z0-9_-]+)$/i.exec(line);
    if (classAssignMatch) {
      const cls = classAssignMatch[2]!;
      for (const nid of classAssignMatch[1]!.split(",").map((s) => s.trim()).filter(Boolean)) {
        pendingClassByNode.set(nid, cls);
      }
      continue;
    }

    const subMatch = /^subgraph\s+(.+)$/i.exec(line);
    if (subMatch) {
      const spec = subMatch[1]!.trim();
      const bracketed = /^([A-Za-z0-9_.-]+)\s*\[([\s\S]+)\]$/.exec(spec);
      const id = bracketed ? bracketed[1]! : `sub_${subgraphs.length + 1}`;
      const subTitle = bracketed ? normalizeMermaidLabel(bracketed[2]!) : normalizeMermaidLabel(spec);
      const sub: MermaidSubgraph = { id, title: subTitle, nodeIds: [] };
      subgraphs.push(sub);
      subgraphStack.push(sub);
      continue;
    }

    if (/^end$/i.test(line)) {
      subgraphStack.pop();
      continue;
    }

    // Split line by edge operators outside brackets/quotes
    const segments: string[] = [];
    const operators: Array<ReturnType<typeof classifyEdgeToken>> = [];
    EDGE_PATTERN.lastIndex = 0;
    let lastEnd = 0;
    let match: RegExpExecArray | null;
    while ((match = EDGE_PATTERN.exec(line)) !== null) {
      const before = line.slice(lastEnd, match.index);
      // Skip matches inside unclosed brackets or quotes
      const openBrackets = (before.match(/[\[\(\{]/g) ?? []).length;
      const closeBrackets = (before.match(/[\]\)\}]/g) ?? []).length;
      const quotes = (before.match(/"/g) ?? []).length;
      if (openBrackets > closeBrackets || quotes % 2 === 1) continue;
      segments.push(before.trim());
      operators.push(classifyEdgeToken(match[1]!, match[5], match[2], match[3], match[4]));
      lastEnd = match.index + match[0].length;
    }
    if (operators.length > 0) {
      segments.push(line.slice(lastEnd).trim());
      const groups = segments.map(splitNodeGroup);
      for (let idx = 0; idx < operators.length; idx++) {
        const leftGroup = groups[idx] ?? [];
        const rightGroup = groups[idx + 1] ?? [];
        const op = operators[idx]!;
        for (const lTok of leftGroup) {
          const lNode = upsertNode(lTok);
          for (const rTok of rightGroup) {
            const rNode = upsertNode(rTok);
            edges.push({
              from: lNode.id,
              to: rNode.id,
              label: op.label,
              style: op.style,
              arrowStart: op.arrowStart,
              arrowEnd: op.arrowEnd,
            });
          }
        }
      }
      continue;
    }

    const soloTokens = splitNodeGroup(line);
    for (const tok of soloTokens) upsertNode(tok);
  }

  for (const [nid, cls] of pendingClassByNode.entries()) {
    const node = nodeMap.get(nid);
    const col = classColors.get(cls);
    if (node && col && !node.accentHex) node.accentHex = col;
  }

  const nodes = [...nodeMap.values()];
  if (nodes.length === 0) return null;
  return {
    kind: "flowchart",
    direction,
    title,
    nodes,
    edges,
    subgraphs: subgraphs.filter((s) => s.nodeIds.length > 0),
  };
}
