# 03: Documentation, Docker Deployment & Live Container Visual Proof

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01, 02

## Specification
Update project documentation (`README.md`, `GLOSSARY.md`, `docs/features/mermaid-chat-diagrams/map.md`, and `docs/graphify-out/`), rebuild and deploy the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`), verify the full test suite (`npm test`), and capture + visually inspect a live screenshot (`docs/images/mermaid-chat-diagrams.png`) demonstrating rendered Mermaid graphics served by the running container.

### Acceptance Criteria
- [x] `README.md` and `GLOSSARY.md` accurately describe Mermaid diagram rendering in the **Live Markdown Dispatch Log** and **Quest Gate** cards and reference `docs/images/mermaid-chat-diagrams.png`.
- [x] `npm run docker:up` succeeds and `http://127.0.0.1:4310/api/guild/snapshot` responds `200`.
- [x] `npm test` passes 100% including `tests/00-architecture-invariants.test.ts` (400-line ceiling, 100% module reachability, zero unreferenced images).
- [x] Screenshot `docs/images/mermaid-chat-diagrams.png` is captured from headless Chrome against `http://127.0.0.1:4310/` and visually inspected with `read`.
- [x] `graphify update .` keeps `docs/graphify-out/` up to date.

## Answer
Updated `README.md` and `GLOSSARY.md`, rebuilt and deployed `opencode-pixel-guild-visualizer` via `npm run docker:up` (`Up (healthy)` on `0.0.0.0:4310->4310/tcp`), verified HTTP `200` on `/api/guild/snapshot`, `/src/web/styles-mermaid.css`, and `/src/hud/mermaid-renderer.ts`, captured and visually inspected `docs/images/mermaid-chat-diagrams.png` (which caught and verified the fix for dashed sequence arrows like `C-->>U` previously creating a phantom `C-` participant), refreshed `docs/graphify-out/`, and confirmed the full `npm test` suite passes 100%.
