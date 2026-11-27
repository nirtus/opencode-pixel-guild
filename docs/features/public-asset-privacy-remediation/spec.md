# Specification: Public Asset Privacy Remediation, Offline Synthetic Documentation Showcase & Cryptographic Manifest Gate

Label: ready-for-agent
Status: resolved

## 1. Problem Statement & Root Cause

Live-container verification screenshots captured against real paired OpenCode daemons and real workspaces under `docs/images/` were previously embedded directly in `README.md` and tracked in Git, leaking real project names across 11 public documentation screenshots while `verifyRepositoryPublicHygiene` (`tests/test-sandbox.ts`) skipped binary image files.

## 2. Canonical Domain Boundaries

Defined in root `./GLOSSARY.md` (`### Documentation & Public Asset Governance`) and locked in [`docs/adr/0006-synthetic-public-documentation-assets-and-manifest-provenance.md`](../../adr/0006-synthetic-public-documentation-assets-and-manifest-provenance.md):

- **Development Verification Capture** (`docs/images/`): Ephemeral, gitignored local screenshots captured against a running container during development. Never committed to Git, never copied into `assets/images/`, and never embedded in tracked markdown.
- **Public Documentation Asset** (`assets/images/`): Git-tracked documentation visuals produced exclusively from deterministic **Synthetic Documentation Showcase** (`?demo=docs-showcase&scene=<id>`) or **Intro Demo Director** (`?demo=intro-tour`) pipelines and registered with their stripped-PNG SHA-256 digests in the **Public Asset Manifest** (`assets/images/manifest.json`).

## 3. Architecture & Implemented Seams

### Seam 1 — Offline Synthetic Documentation Showcase (`src/web/`)
- `src/web/offline-demo-flag.ts`: Zero-import query flag helper (`isIntroDemoQuery`, `isDocsShowcaseModeActive`, `getRequestedDocsShowcaseSceneId`, `isOfflineDemoModeActive`).
- `src/web/docs-showcase-data.ts` & `src/web/docs-showcase-fixtures.ts`: Canonical 100% fictional data universe (`opencode-pixel-guild`, `arcane-engine`, `chronicle-core`, `starlight-cli`; synthetic hosts `Local Guild Hall`, `Forge-Node-East`, `Build-Relay-02` + overflow hosts; operator `guild-master` / `Archmage Aldric`; synthetic Mermaid `flowchart`/`sequenceDiagram` turns, Quest Gate options, Model & Variant catalog, and Git working-tree diffs).
- `src/web/docs-showcase-scenes.ts`: Declarative 18-scene catalog (14 desktop `1600×1000` + 4 mobile `390×844 @2×`).
- `src/web/docs-showcase-director.ts`: Offline showcase boot director setting `window.__docsShowcaseReady = true` after font/asset/sprite loads and 2 rAF paints.
- Short-circuited all 6 client API/storage seams behind `isOfflineDemoModeActive()` (`app-main.ts`, `ledger-panel-reconciler.ts`, `side-panel-reconciler.ts`, `operator-pairing-controller.ts`, `world-persistence.ts`, `client-state.ts`) plus `seedSyntheticRoomGitState()` in `commit-ledger-controller.ts`.

### Seam 2 — Air-Gapped Docker Capture & 3-Layer OCR/Metadata Hygiene (`docs/screenshots/`)
- `docs/screenshots/Dockerfile` (`opencode-pixel-guild-docs-capture:v1`): `node:22-alpine` + Chromium + DejaVu/Noto Emoji fonts + Tesseract 5 (`eng`).
- `docs/screenshots/capture-docs-screenshots.ts` (`npm run docs:screenshots`): Runs with `--network none` (never mounting `./data/`), boots an in-container static-only server (`tryServeStaticAsset`, HTTP `403` on `/api/*`, strips external Google Fonts `@import` in memory), captures all 18 scenes via native Node 22 WebSocket CDP, asserts zero `/api/*` requests and zero browser exceptions, runs Layer 1 lossless CDP DOM + Canvas2D (`fillText`/`strokeText` shim) text audit, strips PNG metadata chunks (`docs/screenshots/png-metadata.ts` using `zlib.crc32`), runs Layer 2 parallel Tesseract OCR (`2×` inverted grayscale PGM + raw `--psm 11` via `docs/screenshots/ocr-runner.ts`), and atomically writes stripped PNGs + `assets/images/manifest.json`.
- `docs/screenshots/verify-docs-assets.ts` (`npm run docs:verify-assets`): Fast structural check (`--fast` / `< 50 ms`) plus full air-gapped containerized OCR scan.
- `docs/video/record-intro-demo.ts`: Strips PNG metadata on `assets/images/intro-demo-video.png` and updates both `"generator": "intro-demo-video"` entries in `assets/images/manifest.json`.

### Seam 3 — Provenance Manifest, Hygiene Tests, Pre-Commit Guard & Rules
- `docs/screenshots/public-hygiene-rules.ts` & `docs/screenshots/manifest-contract.ts`: Single source of truth imported by `tests/test-sandbox.ts`, `tests/00-architecture-invariants.test.ts`, `.githooks/pre-commit`, `docs:screenshots`, and `docs:verify-assets`.
- `.githooks/pre-commit` + `docs/screenshots/pre-commit-guard.ts` (`npm run hooks:install`): Hard-blocks staged `docs/images/*`, validates staged `assets/images/*` against `manifest.json` SHA-256 and PNG chunk rules, and scans staged text/code files against `public-hygiene-rules.ts`.
- Updated `README.md`, `docs/awesome-opencode-submission.md`, `AGENTS.md`, `docs/agents/container-deployment.md`, `tsconfig.json`, and `tests/62-public-asset-privacy-and-docs-showcase.test.ts`.
