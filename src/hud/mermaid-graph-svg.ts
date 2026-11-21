import {
  escapeSvgText,
  estimateMonospaceWidth,
  hashMermaidKey,
  type MermaidDirectedGraph,
  type MermaidGraphEdge,
  type MermaidGraphNode,
  wrapDiagramLabel,
} from "./mermaid-types.ts";

interface PositionedNode {
  readonly node: MermaidGraphNode;
  readonly lines: string[];
  readonly members: string[];
  readonly w: number;
  readonly h: number;
  readonly layer: number;
  x: number;
  y: number;
}

const FONT = "'JetBrains Mono','Fira Code',ui-monospace,SFMono-Regular,Menlo,monospace";

function measureNodeBox(node: MermaidGraphNode): { lines: string[]; members: string[]; w: number; h: number } {
  if (node.shape === "start" || node.shape === "end") {
    return { lines: [], members: [], w: 28, h: 28 };
  }
  const lines = wrapDiagramLabel(node.label, 22);
  const members = (node.members ?? []).slice(0, 12);
  const maxLabelChars = Math.max(...lines.map((l) => l.length), 4);
  const maxMemberChars = members.length > 0 ? Math.max(...members.map((m) => m.length), 4) : 0;
  const maxChars = Math.max(maxLabelChars, maxMemberChars);
  const textW = estimateMonospaceWidth("x".repeat(maxChars), 6.8);

  if (node.shape === "card") {
    const w = Math.max(128, Math.min(250, textW + 26));
    const headerH = lines.length * 15 + 14;
    const bodyH = members.length > 0 ? members.length * 14 + 12 : 10;
    return { lines, members, w, h: headerH + bodyH };
  }
  if (node.shape === "diamond") {
    const w = Math.max(96, Math.min(210, textW + 46));
    const h = Math.max(54, lines.length * 15 + 34);
    return { lines, members, w, h };
  }
  if (node.shape === "circle") {
    const d = Math.max(58, Math.min(110, Math.max(textW + 24, lines.length * 16 + 24)));
    return { lines, members, w: d, h: d };
  }
  if (node.shape === "cylinder") {
    const w = Math.max(100, Math.min(220, textW + 28));
    const h = Math.max(48, lines.length * 15 + 26);
    return { lines, members, w, h };
  }
  const padX = node.shape === "hexagon" || node.shape === "parallelogram" ? 36 : 26;
  const w = Math.max(84, Math.min(230, textW + padX));
  const h = Math.max(38, lines.length * 15 + 18);
  return { lines, members, w, h };
}

function assignTopologicalLayers(nodes: readonly MermaidGraphNode[], edges: readonly MermaidGraphEdge[]): Map<string, number> {
  const order = new Map<string, number>();
  nodes.forEach((n, idx) => order.set(n.id, idx));
  const adj = new Map<string, string[]>();
  const indeg = new Map<string, number>();
  for (const n of nodes) {
    adj.set(n.id, []);
    indeg.set(n.id, 0);
  }
  // Ignore obvious back-edges while computing acyclic longest-path layers
  const nonCyclicEdges: MermaidGraphEdge[] = [];
  const state = new Map<string, number>(); // 0 unvisited, 1 visiting, 2 done
  const tempAdj = new Map<string, MermaidGraphEdge[]>();
  for (const n of nodes) tempAdj.set(n.id, []);
  for (const e of edges) {
    if (e.from !== e.to && tempAdj.has(e.from) && tempAdj.has(e.to)) {
      tempAdj.get(e.from)!.push(e);
    }
  }
  const backEdgeSet = new Set<MermaidGraphEdge>();
  const dfs = (u: string) => {
    state.set(u, 1);
    for (const e of tempAdj.get(u) ?? []) {
      const st = state.get(e.to) ?? 0;
      if (st === 1) backEdgeSet.add(e);
      else if (st === 0) dfs(e.to);
    }
    state.set(u, 2);
  };
  for (const n of nodes) {
    if ((state.get(n.id) ?? 0) === 0) dfs(n.id);
  }
  for (const e of edges) {
    if (e.from === e.to || backEdgeSet.has(e)) continue;
    if (!adj.has(e.from) || !adj.has(e.to)) continue;
    nonCyclicEdges.push(e);
    adj.get(e.from)!.push(e.to);
    indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const n of nodes) {
    if ((indeg.get(n.id) ?? 0) === 0) queue.push(n.id);
  }
  const layer = new Map<string, number>();
  for (const n of nodes) layer.set(n.id, 0);

  while (queue.length > 0) {
    const u = queue.shift()!;
    const uLayer = layer.get(u) ?? 0;
    for (const v of adj.get(u) ?? []) {
      if ((layer.get(v) ?? 0) < uLayer + 1) layer.set(v, uLayer + 1);
      const nextIn = (indeg.get(v) ?? 1) - 1;
      indeg.set(v, nextIn);
      if (nextIn === 0) queue.push(v);
    }
  }

  // Ensure disconnected nodes stay ordered cleanly
  if (nonCyclicEdges.length === 0 && nodes.length > 1) {
    nodes.forEach((n, idx) => layer.set(n.id, Math.floor(idx / 3)));
  }
  return layer;
}

function renderNodeSvg(pos: PositionedNode): string {
  const { node, lines, members, x, y, w, h } = pos;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const accent = node.accentHex ?? (
    node.shape === "diamond" ? "#f59e0b"
      : node.shape === "cylinder" ? "#a855f7"
        : node.shape === "stadium" || node.shape === "circle" ? "#10b981"
          : node.shape === "card" ? "#38bdf8"
            : "#38bdf8"
  );
  const fill = node.shape === "diamond"
    ? "#261b0e"
    : node.shape === "cylinder"
      ? "#1e1233"
      : node.shape === "stadium" || node.shape === "circle"
        ? "#0b241d"
        : "#121b2e";

  if (node.shape === "start") {
    return `<g class="mmd-node"><circle cx="${cx}" cy="${cy}" r="10" fill="#38bdf8" stroke="#bae6fd" stroke-width="2" /></g>`;
  }
  if (node.shape === "end") {
    return `<g class="mmd-node"><circle cx="${cx}" cy="${cy}" r="12" fill="none" stroke="#f59e0b" stroke-width="2" /><circle cx="${cx}" cy="${cy}" r="7" fill="#f59e0b" /></g>`;
  }

  let shapeSvg = "";
  if (node.shape === "diamond") {
    const pts = `${cx},${y} ${x + w},${cy} ${cx},${y + h} ${x},${cy}`;
    shapeSvg = `<polygon points="${pts}" fill="${fill}" stroke="${accent}" stroke-width="1.6" />`;
  } else if (node.shape === "circle") {
    shapeSvg = `<circle cx="${cx}" cy="${cy}" r="${w / 2}" fill="${fill}" stroke="${accent}" stroke-width="1.6" />`;
  } else if (node.shape === "stadium") {
    shapeSvg = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" ry="${h / 2}" fill="${fill}" stroke="${accent}" stroke-width="1.6" />`;
  } else if (node.shape === "round") {
    shapeSvg = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" ry="10" fill="${fill}" stroke="${accent}" stroke-width="1.6" />`;
  } else if (node.shape === "cylinder") {
    const ry = 7;
    shapeSvg =
      `<path d="M ${x} ${y + ry} L ${x} ${y + h - ry} A ${w / 2} ${ry} 0 0 0 ${x + w} ${y + h - ry} L ${x + w} ${y + ry} Z" fill="${fill}" stroke="${accent}" stroke-width="1.6" />` +
      `<ellipse cx="${cx}" cy="${y + ry}" rx="${w / 2}" ry="${ry}" fill="#2a1947" stroke="${accent}" stroke-width="1.6" />`;
  } else if (node.shape === "hexagon") {
    const inset = 12;
    const pts = `${x + inset},${y} ${x + w - inset},${y} ${x + w},${cy} ${x + w - inset},${y + h} ${x + inset},${y + h} ${x},${cy}`;
    shapeSvg = `<polygon points="${pts}" fill="${fill}" stroke="${accent}" stroke-width="1.6" />`;
  } else if (node.shape === "parallelogram") {
    const skew = 12;
    const pts = `${x + skew},${y} ${x + w},${y} ${x + w - skew},${y + h} ${x},${y + h}`;
    shapeSvg = `<polygon points="${pts}" fill="${fill}" stroke="${accent}" stroke-width="1.6" />`;
  } else if (node.shape === "subroutine") {
    shapeSvg =
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${fill}" stroke="${accent}" stroke-width="1.6" />` +
      `<line x1="${x + 8}" y1="${y}" x2="${x + 8}" y2="${y + h}" stroke="${accent}" stroke-width="1.2" opacity="0.7" />` +
      `<line x1="${x + w - 8}" y1="${y}" x2="${x + w - 8}" y2="${y + h}" stroke="${accent}" stroke-width="1.2" opacity="0.7" />`;
  } else if (node.shape === "card") {
    const headerH = lines.length * 15 + 14;
    shapeSvg =
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#0f172a" stroke="${accent}" stroke-width="1.6" />` +
      `<rect x="${x}" y="${y}" width="${w}" height="${headerH}" rx="6" fill="#172554" stroke="${accent}" stroke-width="1.2" />` +
      `<line x1="${x}" y1="${y + headerH}" x2="${x + w}" y2="${y + headerH}" stroke="${accent}" stroke-width="1.1" />`;
    const headText = lines
      .map((line, idx) => `<text x="${cx}" y="${y + 18 + idx * 15}" text-anchor="middle" fill="#fef08a" font-family="${FONT}" font-size="11" font-weight="700">${escapeSvgText(line)}</text>`)
      .join("");
    const memberText = members
      .map((m, idx) => `<text x="${x + 10}" y="${y + headerH + 15 + idx * 14}" text-anchor="start" fill="#cbd5e1" font-family="${FONT}" font-size="10">${escapeSvgText(m)}</text>`)
      .join("");
    return `<g class="mmd-node">${shapeSvg}${headText}${memberText}</g>`;
  } else {
    shapeSvg = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${fill}" stroke="${accent}" stroke-width="1.6" />`;
  }

  const startY = cy - ((lines.length - 1) * 15) / 2 + (node.shape === "cylinder" ? 5 : 4);
  const textSvg = lines
    .map(
      (line, idx) =>
        `<text x="${cx}" y="${(startY + idx * 15).toFixed(1)}" text-anchor="middle" fill="#f8fafc" font-family="${FONT}" font-size="11" font-weight="600">${escapeSvgText(line)}</text>`,
    )
    .join("");
  return `<g class="mmd-node">${shapeSvg}${textSvg}</g>`;
}

function renderEdgeSvg(
  edge: MermaidGraphEdge,
  fromPos: PositionedNode,
  toPos: PositionedNode,
  isHorizontal: boolean,
  arrowEndId: string,
  arrowStartId: string,
): string {
  const strokeWidth = edge.style === "thick" ? "2.8" : "1.6";
  const dash = edge.style === "dotted" ? ' stroke-dasharray="5 4"' : "";
  const stroke = edge.style === "thick" ? "#fbbf24" : edge.style === "dotted" ? "#94a3b8" : "#38bdf8";
  const markerEnd = edge.arrowEnd ? ` marker-end="url(#${arrowEndId})"` : "";
  const markerStart = edge.arrowStart ? ` marker-start="url(#${arrowStartId})"` : "";

  let pathD = "";
  let labelX = 0;
  let labelY = 0;

  if (fromPos.node.id === toPos.node.id) {
    const sx = fromPos.x + fromPos.w;
    const sy = fromPos.y + fromPos.h * 0.35;
    const ex = fromPos.x + fromPos.w;
    const ey = fromPos.y + fromPos.h * 0.72;
    pathD = `M ${sx} ${sy} C ${sx + 36} ${sy - 14}, ${ex + 36} ${ey + 14}, ${ex} ${ey}`;
    labelX = sx + 32;
    labelY = (sy + ey) / 2;
  } else if (isHorizontal) {
    const forward = toPos.x >= fromPos.x;
    const sx = forward ? fromPos.x + fromPos.w : fromPos.x;
    const sy = fromPos.y + fromPos.h / 2;
    const ex = forward ? toPos.x : toPos.x + toPos.w;
    const ey = toPos.y + toPos.h / 2;
    if (forward) {
      const mx = (sx + ex) / 2;
      pathD = `M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ey}, ${ex} ${ey}`;
      labelX = mx;
      labelY = (sy + ey) / 2 - 6;
    } else {
      const arcY = Math.max(18, Math.min(fromPos.y, toPos.y) - 24);
      pathD = `M ${sx} ${sy} C ${sx - 24} ${arcY}, ${ex + 24} ${arcY}, ${ex} ${ey}`;
      labelX = (sx + ex) / 2;
      labelY = Math.max(12, arcY - 2);
    }
  } else {
    const forward = toPos.y >= fromPos.y;
    const sx = fromPos.x + fromPos.w / 2;
    const sy = forward ? fromPos.y + fromPos.h : fromPos.y;
    const ex = toPos.x + toPos.w / 2;
    const ey = forward ? toPos.y : toPos.y + toPos.h;
    if (forward) {
      const my = (sy + ey) / 2;
      pathD = `M ${sx} ${sy} C ${sx} ${my}, ${ex} ${my}, ${ex} ${ey}`;
      labelX = (sx + ex) / 2;
      labelY = my - 4;
    } else {
      const arcX = Math.max(fromPos.x + fromPos.w, toPos.x + toPos.w) + 28;
      pathD = `M ${sx} ${sy} C ${arcX} ${sy}, ${arcX} ${ey}, ${ex} ${ey}`;
      labelX = arcX + 6;
      labelY = (sy + ey) / 2;
    }
  }

  let labelSvg = "";
  if (edge.label) {
    const lw = Math.max(26, estimateMonospaceWidth(edge.label, 6.2) + 12);
    const lh = 17;
    labelSvg =
      `<rect x="${(labelX - lw / 2).toFixed(1)}" y="${(labelY - lh / 2).toFixed(1)}" width="${lw}" height="${lh}" rx="4" fill="#090d16" stroke="#334155" stroke-width="1" />` +
      `<text x="${labelX.toFixed(1)}" y="${(labelY + 3.5).toFixed(1)}" text-anchor="middle" fill="#fde68a" font-family="${FONT}" font-size="9.5" font-weight="600">${escapeSvgText(edge.label)}</text>`;
  }

  return `<g class="mmd-edge"><path d="${pathD}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"${dash}${markerStart}${markerEnd} />${labelSvg}</g>`;
}

export function renderDirectedGraphSvg(graph: MermaidDirectedGraph, keySeed: string): string {
  const isHorizontal = graph.direction === "LR" || graph.direction === "RL";
  const isReversed = graph.direction === "RL" || graph.direction === "BT";
  const layers = assignTopologicalLayers(graph.nodes, graph.edges);
  const maxLayer = Math.max(0, ...layers.values());

  const buckets = new Map<number, PositionedNode[]>();
  const posById = new Map<string, PositionedNode>();
  for (const node of graph.nodes) {
    const rawLayer = layers.get(node.id) ?? 0;
    const effectiveLayer = isReversed ? maxLayer - rawLayer : rawLayer;
    const m = measureNodeBox(node);
    const pos: PositionedNode = { node, ...m, layer: effectiveLayer, x: 0, y: 0 };
    posById.set(node.id, pos);
    const list = buckets.get(effectiveLayer) ?? [];
    list.push(pos);
    buckets.set(effectiveLayer, list);
  }

  const layerKeys = [...buckets.keys()].sort((a, b) => a - b);
  const primaryGap = isHorizontal ? 62 : 52;
  const crossGap = isHorizontal ? 26 : 30;
  const hasBackOrSelfEdge = graph.edges.some((e) => {
    const f = posById.get(e.from);
    const t = posById.get(e.to);
    return f && t && (e.from === e.to || t.layer <= f.layer);
  });
  const pad = graph.subgraphs.length > 0 ? 34 : 20;
  const extraTop = isHorizontal && hasBackOrSelfEdge ? 30 : 0;
  const extraRight = !isHorizontal && hasBackOrSelfEdge ? 58 : 0;
  const titleOffset = graph.title ? 26 : 0;

  const layerSpans = layerKeys.map((k) => {
    const items = buckets.get(k)!;
    const primary = Math.max(...items.map((p) => (isHorizontal ? p.w : p.h)));
    const cross =
      items.reduce((acc, p) => acc + (isHorizontal ? p.h : p.w), 0) +
      Math.max(0, items.length - 1) * crossGap;
    return { key: k, items, primary, cross };
  });
  const maxCross = Math.max(...layerSpans.map((s) => s.cross), 120);

  let cursorPrimary = pad + (isHorizontal ? 0 : titleOffset);
  for (const span of layerSpans) {
    let cursorCross = pad + (maxCross - span.cross) / 2 + (isHorizontal ? titleOffset + extraTop : 0);
    for (const item of span.items) {
      if (isHorizontal) {
        item.x = cursorPrimary + (span.primary - item.w) / 2;
        item.y = cursorCross;
        cursorCross += item.h + crossGap;
      } else {
        item.x = cursorCross;
        item.y = cursorPrimary + (span.primary - item.h) / 2;
        cursorCross += item.w + crossGap;
      }
    }
    cursorPrimary += span.primary + primaryGap;
  }

  const totalPrimary = cursorPrimary - primaryGap + pad;
  const width = Math.ceil(isHorizontal ? totalPrimary + 28 : maxCross + pad * 2 + 24 + extraRight);
  const height = Math.ceil(isHorizontal ? maxCross + pad * 2 + titleOffset + extraTop + 14 : totalPrimary + 14);
  const hash = hashMermaidKey(`${keySeed}:${graph.kind}:${graph.direction}`);
  const arrowEndId = `mmd-arr-end-${hash}`;
  const arrowStartId = `mmd-arr-start-${hash}`;

  const subgraphsSvg = graph.subgraphs
    .map((sub) => {
      const members = sub.nodeIds.map((id) => posById.get(id)).filter((p): p is PositionedNode => Boolean(p));
      if (members.length === 0) return "";
      const minX = Math.min(...members.map((p) => p.x)) - 14;
      const minY = Math.min(...members.map((p) => p.y)) - 24;
      const maxX = Math.max(...members.map((p) => p.x + p.w)) + 14;
      const maxY = Math.max(...members.map((p) => p.y + p.h)) + 12;
      return (
        `<g class="mmd-subgraph">` +
        `<rect x="${minX}" y="${minY}" width="${maxX - minX}" height="${maxY - minY}" rx="8" fill="rgba(56,189,248,0.06)" stroke="#334155" stroke-width="1.2" stroke-dasharray="5 3" />` +
        `<text x="${minX + 10}" y="${minY + 15}" fill="#7dd3fc" font-family="${FONT}" font-size="10" font-weight="700">${escapeSvgText(sub.title)}</text>` +
        `</g>`
      );
    })
    .join("");

  const edgesSvg = graph.edges
    .map((e) => {
      const f = posById.get(e.from);
      const t = posById.get(e.to);
      if (!f || !t) return "";
      return renderEdgeSvg(e, f, t, isHorizontal, arrowEndId, arrowStartId);
    })
    .join("");

  const nodesSvg = graph.nodes
    .map((n) => {
      const p = posById.get(n.id);
      return p ? renderNodeSvg(p) : "";
    })
    .join("");

  const titleSvg = graph.title
    ? `<text x="${width / 2}" y="20" text-anchor="middle" fill="#fef08a" font-family="${FONT}" font-size="12" font-weight="700">${escapeSvgText(graph.title)}</text>`
    : "";

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeSvgText(graph.title || `Mermaid ${graph.kind} diagram`)}" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" class="chat-md-mermaid-svg">` +
    `<defs>` +
    `<marker id="${arrowEndId}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 1 1 L 9 5 L 1 9 z" fill="#38bdf8" /></marker>` +
    `<marker id="${arrowStartId}" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 9 1 L 1 5 L 9 9 z" fill="#38bdf8" /></marker>` +
    `</defs>` +
    `${titleSvg}${subgraphsSvg}${edgesSvg}${nodesSvg}</svg>`
  );
}
