# 02: Live Markdown Dispatch Log, Quest Gate Integration & Styles

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01

## Specification
Integrate `renderMermaidBlockHtml()` into `formatChatMarkdownHtml()` (`src/hud/chat-markdown-formatter.ts`), re-export the Mermaid seam through `src/hud/spectator-hud.ts`, update collapsed chat one-liner previews in `src/web/hero-subtabs-reconciler.ts`, and add responsive dark-theme CSS in `src/web/styles-mermaid.css` linked from `src/web/app.html`.

### Acceptance Criteria
- [x] Closed ` ```mermaid ` fenced blocks in `formatChatMarkdownHtml()` render `.chat-md-mermaid` inline SVG figures with a collapsible `<details class="chat-md-mermaid-source">` source viewer; non-mermaid code fences remain `.chat-md-codeblock`.
- [x] Unclosed streaming ` ```mermaid ` fences render safely as fallback code blocks until closed.
- [x] **Character Sheet** (`buildAdventurerDispatchLogViewModel` + `renderHeroSubtabStaticHtml`) and **Quest Gate** cards (`renderQuestGateCardHtml`) render Mermaid graphics automatically with O(1) turn memoization preserved.
- [x] Collapsed chat turn one-liners display `[📊 Mermaid diagram]` instead of raw Mermaid DSL syntax.
- [x] `src/web/styles-mermaid.css` is linked in `src/web/app.html` (`<= 150` lines) and all files remain `<= 400` lines.

## Answer
Integrated `renderMermaidBlockHtml()` into `formatChatMarkdownHtml()` (`src/hud/chat-markdown-formatter.ts`) with closed-fence gating for jitter-free streaming, re-exported `renderMermaidDiagramSvg` and `renderMermaidBlockHtml` in `src/hud/spectator-hud.ts`, updated collapsed one-liner previews in `src/web/hero-subtabs-reconciler.ts`, and added dark-theme diagram styling in `src/web/styles-mermaid.css` linked from `src/web/app.html` (137 lines). Verified via `tests/55-mermaid-chat-diagrams.test.ts` and `tests/00-architecture-invariants.test.ts`.
