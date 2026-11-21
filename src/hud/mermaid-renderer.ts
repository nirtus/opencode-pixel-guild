import { escapeHtml } from "./hud-formatters.ts";
import { parseFlowchartDiagram } from "./mermaid-graph-parser.ts";
import { renderDirectedGraphSvg } from "./mermaid-graph-svg.ts";
import { parseClassOrErDiagram, parseStateDiagram } from "./mermaid-model-parser.ts";
import {
  tryRenderPieDiagramSvg,
  tryRenderSequenceDiagramSvg,
} from "./mermaid-special-svg.ts";
import type { MermaidDiagramKind, MermaidRenderOptions, MermaidRenderResult } from "./mermaid-types.ts";

const KIND_LABELS: Record<MermaidDiagramKind, string> = {
  flowchart: "Flowchart",
  sequence: "Sequence",
  state: "State",
  class: "Class",
  er: "ER",
  pie: "Pie",
};

export function renderMermaidDiagramSvg(
  rawSource: string,
  options?: MermaidRenderOptions,
): MermaidRenderResult {
  const source = String(rawSource || "").replace(/\r\n/g, "\n").trim();
  if (!source) {
    return { ok: false, kind: "unknown", reason: "Empty Mermaid diagram" };
  }
  const keySeed = `${options?.diagramId ?? ""}:${source}`;

  const seq = tryRenderSequenceDiagramSvg(source, keySeed);
  if (seq) {
    return { ok: true, kind: "sequence", title: seq.title, svg: seq.svg };
  }

  const pie = tryRenderPieDiagramSvg(source);
  if (pie) {
    return { ok: true, kind: "pie", title: pie.title, svg: pie.svg };
  }

  const graph =
    parseFlowchartDiagram(source) ??
    parseStateDiagram(source) ??
    parseClassOrErDiagram(source);
  if (graph) {
    return {
      ok: true,
      kind: graph.kind,
      title: graph.title ?? null,
      svg: renderDirectedGraphSvg(graph, keySeed),
    };
  }

  return { ok: false, kind: "unknown", reason: "Unsupported or invalid Mermaid syntax" };
}

export function renderMermaidBlockHtml(
  rawSource: string,
  options?: MermaidRenderOptions,
): string {
  const rendered = renderMermaidDiagramSvg(rawSource, options);
  if (!rendered.ok) {
    return (
      `<div class="chat-md-codeblock" data-mermaid-fallback="true">` +
      `<div class="chat-md-codeblock-bar"><span class="chat-md-codeblock-lang">mermaid</span></div>` +
      `<pre class="chat-md-pre tool-log-output">${escapeHtml(rawSource)}</pre>` +
      `</div>`
    );
  }

  const kindBadge = KIND_LABELS[rendered.kind];
  const titleHtml = rendered.title
    ? `<span class="chat-md-mermaid-title">${escapeHtml(rendered.title)}</span>`
    : "";

  return (
    `<figure class="chat-md-mermaid" data-mermaid-kind="${rendered.kind}">` +
    `<div class="chat-md-mermaid-bar">` +
    `<span class="chat-md-mermaid-badge">📊 MERMAID · ${escapeHtml(kindBadge)}</span>` +
    `${titleHtml}` +
    `</div>` +
    `<div class="chat-md-mermaid-viewport">${rendered.svg}</div>` +
    `<details class="chat-md-mermaid-source">` +
    `<summary class="chat-md-mermaid-source-toggle">Source</summary>` +
    `<pre class="chat-md-pre tool-log-output">${escapeHtml(rawSource)}</pre>` +
    `</details>` +
    `</figure>`
  );
}
