# Feature Map: Mermaid Diagram Graphics in Live Markdown Dispatch Log & Quest Gates

## Destination
Render fenced ` ```mermaid ` blocks inside assistant and user messages in the **Character Sheet** (**Live Markdown Dispatch Log**) and **Quest Gate** cards as crisp, zero-dependency, XSS-safe inline SVG graphics (flowchart, sequence, state, class, ER, and pie diagrams) with a collapsible raw source viewer and graceful streaming/fallback handling.

## Decisions so far
- Zero-dependency inline SVG rendering directly at the `src/hud/` seam (`renderMermaidDiagramSvg` / `renderMermaidBlockHtml`) so diagrams work offline in Docker, inherit O(1) per-turn memoization in `dispatch-log-cache.ts`, and render identically in both **Character Sheet** chat turns and **Quest Gate** cards.
- Dedicated `src/web/styles-mermaid.css` stylesheet linked from `src/web/app.html` to preserve the strict `<= 400`-line file ceiling across all `src/` files.
- **[01: Mermaid Diagram Parser & Pure Inline SVG Renderer](./issues/01-mermaid-diagram-parser-and-svg-renderer.md)** — Resolved: built `mermaid-types.ts`, `mermaid-graph-parser.ts`, `mermaid-model-parser.ts`, `mermaid-graph-svg.ts`, `mermaid-special-svg.ts`, and `mermaid-renderer.ts` supporting flowchart, sequence, state, class, ER, and pie diagrams with XSS escaping and cyclic back-edge `viewBox` bounds.
- **[02: Live Markdown Dispatch Log, Quest Gate Integration & Styles](./issues/02-markdown-chat-quest-gate-integration-and-styles.md)** — Resolved: integrated closed-fence Mermaid rendering in `chat-markdown-formatter.ts`, exported via `spectator-hud.ts`, added `[📊 Mermaid diagram]` collapsed previews in `hero-subtabs-reconciler.ts`, and linked `src/web/styles-mermaid.css` from `src/web/app.html`.
- **[03: Documentation, Docker Deployment & Live Container Visual Proof](./issues/03-docs-docker-deploy-and-visual-verification.md)** — Resolved: updated `README.md`, `GLOSSARY.md`, and `docs/graphify-out/`, deployed via `npm run docker:up`, verified `npm test` 100% green, and captured/inspected `docs/images/mermaid-chat-diagrams.png`.

## Not yet specified
- None.

## Out of scope
- External CDN script loading (`cdn.jsdelivr.net/npm/mermaid`) or adding npm runtime dependencies.
- Editing Mermaid diagrams interactively in-place.
