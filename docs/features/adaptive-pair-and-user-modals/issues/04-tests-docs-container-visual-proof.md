Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01, 02, 03

# 04: Regression Tests, Docs, ADR, Graphify Update & Live Container Visual Proof

## Objective
Add comprehensive tests for the deepened seams (`operator-session-store.ts`, `modal-shell.ts`, decoupled Pair/User views, tablet/mobile responsive CSS invariants), update affected legacy tests, update `GLOSSARY.md`, `README.md`, `docs/adr/0005-viewport-adaptive-modal-shell-and-decoupled-operator-modals.md`, refresh `docs/graphify-out/`, run `npm test`, deploy to Docker (`npm run docker:up`), and capture & visually inspect desktop and tablet screenshots of the live containerized modals.

## Answer
- Added `tests/60-adaptive-pair-and-user-modals.test.ts` and updated affected legacy assertions across `tests/09`, `14`, `17`, `18`, `19`, `44`, `56`, `59`; full suite passes `440/440` (`0` failures), including `tests/00-architecture-invariants.test.ts`.
- Updated `GLOSSARY.md` (**Modal Shell**, **Guild Operator**), `README.md`, `docs/adr/0005-viewport-adaptive-modal-shell-and-decoupled-operator-modals.md`, and refreshed `docs/graphify-out/` (confirming `0` import cycles involving `operator-pairing-controller.ts` or `operator-session-store.ts`).
- Deployed to `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up`, healthy on `4310:4310`, HTTP `200` on `/api/guild/snapshot` and `/src/web/styles-modals.css`).
- Captured and visually inspected 6 live container screenshots (`docs/images/adaptive-modals-pair-desktop.png`, `adaptive-modals-profile-desktop.png`, `adaptive-modals-pair-tablet-portrait.png`, `adaptive-modals-pair-tablet-landscape.png`, `adaptive-modals-profile-tablet-portrait.png`, `adaptive-modals-main-tablet-portrait.png`), confirming clean decoupled Pair & User modals, zero tablet off-screen clipping across `820×1180` portrait and `1024×640` short landscape, and visible `+ Pair` top-bar button on tablets.

