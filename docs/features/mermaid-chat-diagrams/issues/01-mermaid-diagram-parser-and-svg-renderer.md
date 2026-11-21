# 01: Mermaid Diagram Parser & Pure Inline SVG Renderer

Type: task
Label: ready-for-agent
Status: resolved

## Specification
Implement a zero-dependency, XSS-safe Mermaid diagram parser and inline SVG renderer under `src/hud/`:
- `src/hud/mermaid-types.ts`
- `src/hud/mermaid-graph-parser.ts`
- `src/hud/mermaid-model-parser.ts`
- `src/hud/mermaid-graph-svg.ts`
- `src/hud/mermaid-special-svg.ts`
- `src/hud/mermaid-renderer.ts`

### Acceptance Criteria
- [x] Flowcharts (`flowchart TD|TB|LR|RL|BT`, `graph ...`) render nodes (rect, rounded, stadium, diamond, circle, cylinder, hexagon, subroutine, parallelogram), labeled/styled edges (`-->`, `-.->`, `==>`, `<-->`, `---`, chained edges, `&` fan-out/fan-in), and `subgraph ... end` containers as valid inline SVG with unique per-diagram marker IDs.
- [x] `sequenceDiagram` renders participants/actors, vertical lifelines, solid/dashed/self messages, notes, and `alt`/`else`/`opt`/`loop`/`par` blocks as valid inline SVG.
- [x] `stateDiagram` / `stateDiagram-v2` renders `[*]` start/end markers, state labels, and labeled transitions.
- [x] `classDiagram` and `erDiagram` render multi-compartment entity/class cards and labeled relations.
- [x] `pie` charts render SVG slice arcs, percentages, optional title, and legend.
- [x] All labels/titles are strictly XML/HTML escaped with zero `<script>`, `<foreignObject>`, or event-handler attributes.
- [x] Unsupported, empty, or malformed inputs return `{ ok: false }` cleanly and `renderMermaidBlockHtml()` falls back to a safe `.chat-md-codeblock` with `data-mermaid-fallback="true"`.
- [x] Every created file in `src/` is `<= 400` lines.

## Answer
Implemented the zero-dependency Mermaid parser and inline SVG renderer across six focused modules (`src/hud/mermaid-types.ts`, `src/hud/mermaid-graph-parser.ts`, `src/hud/mermaid-model-parser.ts`, `src/hud/mermaid-graph-svg.ts`, `src/hud/mermaid-special-svg.ts`, and `src/hud/mermaid-renderer.ts`), all strictly under 400 lines. Verified with TDD slices in `tests/55-mermaid-chat-diagrams.test.ts` covering flowcharts, state/class/ER diagrams, sequence diagrams (including trailing-hyphen operator safety on dashed arrows like `C-->>U`), pie charts, cyclic back-edge `viewBox` containment, XSS escaping, and graceful fallback.
