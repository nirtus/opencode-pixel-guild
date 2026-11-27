# Author Complete Implementation Specification (`spec.md`) for Synthetic Showcase, Provenance Manifest & Pre-Commit Guardrails

Type: task
Label: wayfinder:task
Status: resolved
Blocked by: 05

## Question

Once [Specify Public Asset Manifest Schema, OCR/Metadata Hygiene Gate, Pre-Commit Guard & Governance Rules](./05-design-public-asset-manifest-hygiene-gate-and-pre-commit-guard.md) resolves, synthesize all settled architectural decisions from Tickets `02`, `03`, `04`, and `05` into a single implementation-ready feature specification at `docs/features/public-asset-privacy-remediation/spec.md` covering:

1. **Offline Synthetic Documentation Showcase (`src/web/docs-showcase-*.ts`)**: Exact 18-scene catalog, fictional cast allowlist, `isOfflineDemoModeActive()` short-circuiting across all 6 `src/web/` seams, `seedSyntheticRoomGitState()`, and `window.__docsShowcaseReady` timing contract (keeping every `src/` file `<= 400` lines and 100% reachable from `src/web/app-main.ts`).
2. **Air-Gapped Dockerized Capture & 3-Layer OCR/Metadata Verification (`docs/screenshots/`)**: `docs/screenshots/Dockerfile` (`opencode-pixel-guild-docs-capture:v1`), `--network none` static server (`tryServeStaticAsset`), `png-metadata.ts`, `public-hygiene-rules.ts`, `capture-docs-screenshots.ts` (`npm run docs:screenshots`), and `verify-docs-assets.ts` (`npm run docs:verify-assets`).
3. **Provenance Manifest, Invariant Gates, Pre-Commit Guard & Governance**: `assets/images/manifest.json` schema, `tests/00-architecture-invariants.test.ts` and `tests/test-sandbox.ts` assertions, `.githooks/pre-commit` + `npm run hooks:install`, `AGENTS.md` / `docs/agents/container-deployment.md` guardrails, ADR (`docs/adr/`), and final `README.md` / `docs/awesome-opencode-submission.md` visual refresh & Docker container verification criteria.

Hand off the completed `spec.md` (and ordered TDD implementation slices) for execution in Build mode.

## Answer

Authored `docs/features/public-asset-privacy-remediation/spec.md` and implemented all three architectural seams end-to-end:
1. Offline **Synthetic Documentation Showcase** (`src/web/offline-demo-flag.ts`, `docs-showcase-data.ts`, `docs-showcase-fixtures.ts`, `docs-showcase-scenes.ts`, `docs-showcase-director.ts`, plus all 6 client offline short-circuit seams, every file `<= 400` lines).
2. Air-gapped Docker capture & 3-layer OCR/metadata pipeline (`docs/screenshots/Dockerfile`, `public-hygiene-rules.ts`, `png-metadata.ts`, `manifest-contract.ts`, `ocr-runner.ts`, `capture-docs-screenshots.ts`, `verify-docs-assets.ts`, `pre-commit-guard.ts`, and `docs/video/record-intro-demo.ts` integration), generating all 18 clean `assets/images/showcase-*.png` assets and sealing all 20 entries in `assets/images/manifest.json`.
3. Zero-dependency `.githooks/pre-commit` (`npm run hooks:install`), `tests/test-sandbox.ts`, `tests/00-architecture-invariants.test.ts`, `tests/62-public-asset-privacy-and-docs-showcase.test.ts`, `AGENTS.md`, `docs/agents/container-deployment.md`, `README.md`, and `docs/awesome-opencode-submission.md`.
