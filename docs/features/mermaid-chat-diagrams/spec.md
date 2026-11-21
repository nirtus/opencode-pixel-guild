# Specification: Mermaid Diagram Graphics in Live Markdown Dispatch Log & Quest Gates

## Problem Statement

Assistant responses displayed in the **Character Sheet** (`Chat` subtab — **Live Markdown Dispatch Log**) and **Quest Gate** cards are formatted through `formatChatMarkdownHtml()` (`src/hud/chat-markdown-formatter.ts`). Today, fenced ` ```mermaid ` code blocks render as raw monospace `<pre>` text rather than visual diagrams, forcing spectators to mentally parse flowcharts, sequence diagrams, state machines, class/ER models, and pie charts when inspecting agent reasoning or answering architectural questions.

Because OpenCode Pixel Guild runs with **zero external npm dependencies** (`node --experimental-strip-types`, airgapped Docker `node:22-alpine` container, direct TypeScript stripping in `src/server/static-router.ts`), Mermaid diagram rendering must work 100% locally and deterministically without CDN fetches or external bundler dependencies.

## Architectural Design & Seams

### Seam 1: Pure Zero-Dependency Mermaid Parser & Inline SVG Renderer (`src/hud/mermaid-*.ts`)
- `src/hud/mermaid-types.ts`: Domain types (`MermaidDiagramKind`, `MermaidRenderResult`, graph/sequence/pie AST models) and XSS-safe SVG text escaping, color allowlisting, label wrapping, and deterministic ID hashing.
- `src/hud/mermaid-graph-parser.ts`: Parses `flowchart` / `graph` (`TD`, `TB`, `LR`, `RL`, `BT`, node shapes `[rect]`, `(round)`, `([stadium])`, `[(cylinder)]`, `((circle))`, `{diamond}`, `{{hexagon}}`, `[[subroutine]]`, `[/parallelogram/]`, chained edges, `&` fan-out/fan-in, labeled solid/dashed/thick/bidirectional arrows, `subgraph ... end`), `stateDiagram` / `stateDiagram-v2` (`[*]`, `state "Label" as id`, transitions), `classDiagram` (classes, member blocks, inheritance/composition/dependency edges), and `erDiagram` (entities, attribute blocks, cardinality relations) into a unified directed-graph AST.
- `src/hud/mermaid-graph-svg.ts`: Deterministic cycle-safe layered graph layout and inline SVG painter with unique per-diagram `<defs><marker>` IDs, subgraph backdrop boxes, shape geometry, curved/back-edge routing, and edge-label pills styled in Pixel Guild's dark obsidian/slate/amber/sky palette.
- `src/hud/mermaid-special-svg.ts`: Parsers and inline SVG painters for `sequenceDiagram` (participants, actors, lifelines, arrows, self-calls, notes, `alt`/`else`/`opt`/`loop`/`par` blocks) and `pie` charts (titled SVG slice arcs, percentage breakdown, legend).
- `src/hud/mermaid-renderer.ts`: Public deep seam exposing `renderMermaidDiagramSvg(rawSource, options)` and `renderMermaidBlockHtml(rawSource, options)`. Wraps valid diagrams in `<figure class="chat-md-mermaid" data-mermaid-kind="...">` with a header badge, responsive `.chat-md-mermaid-viewport` containing the inline `<svg>`, and a native collapsible `<details class="chat-md-mermaid-source">` raw Mermaid source viewer. Gracefully falls back to a safe `.chat-md-codeblock` (`data-mermaid-fallback="true"`) on empty, unsupported, or unclosed streaming blocks.

### Seam 2: Live Markdown Dispatch Log, Quest Gate & HUD Integration
- `src/hud/chat-markdown-formatter.ts`: Routes closed ` ```mermaid ` fenced blocks to `renderMermaidBlockHtml()`, while keeping unclosed streaming ` ```mermaid ` blocks as safe fallback codeblocks until the closing fence arrives so streaming responses never flicker.
- `src/hud/spectator-hud.ts`: Re-exports `renderMermaidDiagramSvg` and `renderMermaidBlockHtml`.
- `src/web/hero-subtabs-reconciler.ts`: Updates `buildOneLinerPreviewText()` so collapsed chat turns containing ` ```mermaid ` blocks display a clear `[📊 Mermaid diagram]` summary tag.
- `src/web/styles-mermaid.css` + `src/web/app.html`: Dedicated dark-theme stylesheet for `.chat-md-mermaid` cards, responsive SVG viewports, and collapsible source viewers, keeping all source files strictly `<= 400` lines and `app.html <= 150` lines.

## Security & Performance Invariants
1. **Strict XSS Prevention**: All labels, titles, notes, and source text are escaped (`&`, `<`, `>`, `"`, `'`); zero `<script>`, `<foreignObject>`, inline event handlers, or unvalidated color attributes are ever emitted.
2. **O(1) Streaming Memoization**: Because SVG generation happens inside `formatChatMarkdownHtml()`, `dispatch-log-cache.ts` automatically caches rendered diagram HTML per turn across high-frequency SSE frames.
3. **Zero External Dependencies & Offline Ready**: Works identically in Node.js unit tests, local dev, and the `opencode-pixel-guild-visualizer` Docker container without internet access.

## Tickets
- [01: Mermaid Diagram Parser & Pure Inline SVG Renderer](./issues/01-mermaid-diagram-parser-and-svg-renderer.md)
- [02: Live Markdown Dispatch Log, Quest Gate Integration & Styles](./issues/02-markdown-chat-quest-gate-integration-and-styles.md)
- [03: Documentation, Docker Deployment & Live Container Visual Proof](./issues/03-docs-docker-deploy-and-visual-verification.md)
