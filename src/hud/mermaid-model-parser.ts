import {
  type MermaidDirectedGraph,
  type MermaidDirection,
  type MermaidGraphEdge,
  type MermaidGraphNode,
  normalizeMermaidLabel,
} from "./mermaid-types.ts";

function cleanSourceLines(rawSource: string): { lines: string[]; title?: string } {
  const all = rawSource
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.replace(/%%.*$/, "").trim())
    .filter((l) => l.length > 0 && !l.startsWith("---"));
  let title: string | undefined;
  let idx = 0;
  while (idx < all.length && /^title\s*:/i.test(all[idx]!)) {
    title = all[idx]!.replace(/^title\s*:/i, "").trim();
    idx += 1;
  }
  return { lines: all.slice(idx), title };
}

export function parseStateDiagram(rawSource: string): MermaidDirectedGraph | null {
  const { lines, title } = cleanSourceLines(rawSource);
  if (!/^stateDiagram(?:-v2)?\b/i.test(lines[0] ?? "")) return null;

  let direction: MermaidDirection = "TD";
  const nodeMap = new Map<string, MermaidGraphNode>();
  const edges: MermaidGraphEdge[] = [];
  let startCount = 0;
  let endCount = 0;

  const ensureState = (rawId: string, isFrom: boolean): string => {
    const id = rawId.trim();
    if (id === "[*]") {
      const pseudoId = isFrom ? `__start_${++startCount}` : `__end_${++endCount}`;
      nodeMap.set(pseudoId, { id: pseudoId, label: "", shape: isFrom ? "start" : "end" });
      return pseudoId;
    }
    if (!nodeMap.has(id)) {
      nodeMap.set(id, { id, label: id, shape: "round" });
    }
    return id;
  };

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!;
    const dirMatch = /^direction\s+(TD|TB|LR|RL|BT)$/i.exec(line);
    if (dirMatch) { direction = dirMatch[1]!.toUpperCase() as MermaidDirection; continue; }
    if (/^note\b/i.test(line) || /^end\s+note$/i.test(line)) continue;

    const aliasMatch = /^state\s+"([^"]+)"\s+as\s+([A-Za-z0-9_.-]+)$/i.exec(line);
    if (aliasMatch) {
      nodeMap.set(aliasMatch[2]!, { id: aliasMatch[2]!, label: normalizeMermaidLabel(aliasMatch[1]!), shape: "round" });
      continue;
    }

    const transMatch =
      /^(\[\*\]|[A-Za-z0-9_.]+(?:-[A-Za-z0-9_.]+)*)\s*-->\s*(\[\*\]|[A-Za-z0-9_.]+(?:-[A-Za-z0-9_.]+)*)(?:\s*:\s*(.+))?$/.exec(
        line,
      );
    if (transMatch) {
      const from = ensureState(transMatch[1]!, true);
      const to = ensureState(transMatch[2]!, false);
      edges.push({ from, to, label: normalizeMermaidLabel(transMatch[3] ?? ""), style: "solid", arrowStart: false, arrowEnd: true });
      continue;
    }

    const descMatch = /^([A-Za-z0-9_.-]+)\s*:\s*(.+)$/.exec(line);
    if (descMatch) {
      const id = ensureState(descMatch[1]!, true);
      const node = nodeMap.get(id)!;
      node.label = `${node.label}\n${normalizeMermaidLabel(descMatch[2]!)}`;
    }
  }

  const nodes = [...nodeMap.values()];
  if (nodes.length === 0) return null;
  return { kind: "state", direction, title, nodes, edges, subgraphs: [] };
}

export function parseClassOrErDiagram(rawSource: string): MermaidDirectedGraph | null {
  const { lines, title } = cleanSourceLines(rawSource);
  const first = lines[0] ?? "";
  const isClass = /^classDiagram\b/i.test(first);
  const isEr = /^erDiagram\b/i.test(first);
  if (!isClass && !isEr) return null;

  const nodeMap = new Map<string, MermaidGraphNode>();
  const edges: MermaidGraphEdge[] = [];
  let activeBlockId: string | null = null;

  const ensureCard = (id: string): MermaidGraphNode => {
    let existing = nodeMap.get(id);
    if (!existing) {
      existing = { id, label: id, shape: "card", members: [] };
      nodeMap.set(id, existing);
    }
    return existing;
  };

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!;
    if (activeBlockId) {
      if (line === "}") { activeBlockId = null; continue; }
      ensureCard(activeBlockId).members!.push(line.replace(/;+$/, "").trim());
      continue;
    }

    const classBlock = /^class\s+([A-Za-z0-9_.-]+)\s*\{$/i.exec(line);
    if (isClass && classBlock) { ensureCard(classBlock[1]!); activeBlockId = classBlock[1]!; continue; }

    const erBlock = /^([A-Za-z0-9_.-]+)\s*\{$/.exec(line);
    if (isEr && erBlock) { ensureCard(erBlock[1]!); activeBlockId = erBlock[1]!; continue; }

    if (isClass) {
      const rel = /^([A-Za-z0-9_.-]+)\s*(<\|--|--\|>|\*--|--\*|o--|--o|<--|-->|--|\.\.>|\.\.\|>|\.\.)\s*([A-Za-z0-9_.-]+)(?:\s*:\s*(.+))?$/.exec(line);
      if (rel) {
        const a = ensureCard(rel[1]!);
        const b = ensureCard(rel[3]!);
        const op = rel[2]!;
        edges.push({
          from: a.id, to: b.id, label: normalizeMermaidLabel(rel[4] ?? ""),
          style: op.includes("..") ? "dotted" : "solid",
          arrowStart: op.startsWith("<"),
          arrowEnd: op.endsWith(">") || (!op.startsWith("<") && op !== "--" && op !== ".."),
        });
        continue;
      }
      const memberLine = /^([A-Za-z0-9_.-]+)\s*:\s*(.+)$/.exec(line);
      if (memberLine) { ensureCard(memberLine[1]!).members!.push(memberLine[2]!.trim()); continue; }
      const soloClass = /^class\s+([A-Za-z0-9_.-]+)$/i.exec(line);
      if (soloClass) { ensureCard(soloClass[1]!); continue; }
    } else {
      const erRel = /^([A-Za-z0-9_.-]+)\s+([|o}][|o{](?:--|\.\.)[|o}][|o{])\s+([A-Za-z0-9_.-]+)(?:\s*:\s*(.+))?$/.exec(line);
      if (erRel) {
        const a = ensureCard(erRel[1]!);
        const b = ensureCard(erRel[3]!);
        const op = erRel[2]!;
        edges.push({
          from: a.id, to: b.id, label: normalizeMermaidLabel(erRel[4] ?? ""),
          style: op.includes("..") ? "dotted" : "solid",
          arrowStart: false, arrowEnd: true,
        });
      }
    }
  }

  const nodes = [...nodeMap.values()];
  if (nodes.length === 0) return null;
  return { kind: isClass ? "class" : "er", direction: "TD", title, nodes, edges, subgraphs: [] };
}
