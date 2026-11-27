# Specify Public Asset Manifest Schema, OCR/Metadata Hygiene Gate, Pre-Commit Guard & Governance Rules

Type: grilling
Label: wayfinder:grilling
Status: resolved
Blocked by: 03, 04

## Question

Using the toolchain findings from [Research Containerized Chromium Capture & OCR/Metadata Verification Toolchain](./03-research-docker-chromium-and-ocr-hygiene-toolchain.md) and the scene catalog from [Design Curated Synthetic Documentation Showcase Scene Catalog & Fictional Fixture Contract](./04-design-synthetic-documentation-showcase-scene-catalog.md), decide and lock all four permanent prevention layers:

1. **`assets/images/manifest.json` Schema & Provenance Invariant**:
   - Exact JSON fields per asset (`filename`, `generator`: `"docs-showcase" | "intro-demo-video"`, `sceneId`, `viewport`, `fixtureSet`, `sha256`, `ocrChecked`).
   - Confirm whether `docs/video/opencode-pixel-guild-intro.mp4` stays outside `assets/images/manifest.json` or also gets a provenance digest.
   - Define the exact assertions in `tests/00-architecture-invariants.test.ts` and `tests/test-sandbox.ts` so any unmanifested file, SHA-256 mismatch, or unreferenced image in `assets/images/` fails `npm test`.
2. **Automated OCR & Metadata Gate Contract**:
   - Define when OCR + PNG metadata stripping runs (mandatory inside `npm run docs:screenshots` before writing `manifest.json`, plus an on-demand `npm run docs:verify-assets` check) and how false positives/negatives on pixel canvas labels vs. DOM HUD text are handled.
3. **Zero-Dependency Local Git Pre-Commit Guard (`.githooks/pre-commit` + `npm run hooks:install`)**:
   - Exact checks executed on staged files: block any staged path under `docs/images/`, verify every staged `assets/images/*` file matches `assets/images/manifest.json` SHA-256 and contains zero PNG text-metadata chunks, and run fast public-hygiene token checks.
   - Decide how `verifyRepositoryPublicHygiene` handles `.githooks/` in `allowedRootFiles` / tracked directories.
4. **Repository Rules & ADR**:
   - Exact updates to `AGENTS.md` and `docs/agents/container-deployment.md` explicitly prohibiting copying `docs/images/*` into `assets/images/` or embedding `docs/images/*` in `README.md`.
   - Confirm whether to author an ADR in `docs/adr/` recording the zero-live-screenshot **Public Documentation Asset** policy and its trade-offs.

## Answer

### 1. `assets/images/manifest.json` Schema & Bijection Invariant

- `assets/images/manifest.json` enforces a strict **1-to-1 bijection** with every image file under `assets/images/` (20 total assets: 18 `docs-showcase` PNGs + 2 `intro-demo-video` outputs `intro-demo-video.png` and `opencode-pixel-guild-intro-preview.gif`):
  ```json
  {
    "schemaVersion": 1,
    "fixtureSet": "synthetic-guild-v1",
    "assets": {
      "showcase-split-chamber.png": {
        "generator": "docs-showcase",
        "sceneId": "split-chamber",
        "viewport": { "width": 1600, "height": 1000, "dpr": 1 },
        "width": 1600,
        "height": 1000,
        "sha256": "<64-hex>",
        "metadataStripped": true,
        "ocrChecked": true
      }
    }
  }
  ```
- `docs/video/record-intro-demo.ts` strips PNG metadata from `assets/images/intro-demo-video.png` and refreshes both `"generator": "intro-demo-video"` entries (`intro-demo-video.png`, `opencode-pixel-guild-intro-preview.gif`) in `assets/images/manifest.json` on `npm run demo:video`.
- `docs/video/opencode-pixel-guild-intro.mp4` remains outside `assets/images/manifest.json` (already verified synthetic via `src/web/intro-demo-timeline.ts` and `tests/49-intro-demo-video-director.test.ts`), closing the map's `Intro Video Asset Audit` fog item.

### 2. Two-Speed Verification Gate (`npm test` vs. `docs:screenshots` / `docs:verify-assets`)

Shared zero-dependency modules live in tracked `docs/screenshots/public-hygiene-rules.ts` and `docs/screenshots/png-metadata.ts`:
- **Fast Structural Gate (Always in `npm test` & `.githooks/pre-commit`, `< 50 ms`, zero Docker)**:
  - Strict 1-to-1 bijection between `assets/images/*` image files and `assets/images/manifest.json` keys.
  - Exact SHA-256 digest match for every file in `assets/images/`.
  - `inspectPngChunks()` verification on every `.png` (valid PNG signature & CRC-32, zero `tEXt`/`iTXt`/`zTXt`/`eXIf`/`tIME` chunks, zero trailing bytes).
  - Unreferenced-asset check in `tests/00-architecture-invariants.test.ts` (excluding `docs/screenshots` from `collectDocTexts`).
  - Zero tracked files under `docs/images/` and `docs/images/` enforced in `.gitignore` (`tests/test-sandbox.ts`).
- **Full 3-Layer Visual Gate (Mandatory in `npm run docs:screenshots`; standalone via `npm run docs:verify-assets`)**:
  - Air-gapped `--network none` Docker image `opencode-pixel-guild-docs-capture:v1` (`docs/screenshots/Dockerfile`), never mounting `./data/`.
  - Layer 1: Lossless CDP DOM (`innerText`, input values, `title`/`aria-label`/`alt`) + Canvas2D (`fillText`/`strokeText` shim) text scan during capture.
  - Layer 2: Independent containerized Tesseract OCR (`2×` inverted grayscale PGM for 1×-DPR desktop, `1×` for 2×-DPR mobile, plus raw `--psm 11` pass).
  - Layer 3: Shared `public-hygiene-rules.ts` hard-fail scanner (`FORBIDDEN_TOKEN_DIGESTS`, `NON_GENERIC_HOME_REGEX`, `LIVE_OPEN_TUNNEL_REGEX`, private LAN/Tailscale IPv4 regex, non-allowlisted external URLs) — refusing to write `assets/images/manifest.json` on any violation.

### 3. Zero-Dependency Pre-Commit Guard (`.githooks/pre-commit` + `npm run hooks:install`)

- Tracked `.githooks/pre-commit` runs `node --experimental-strip-types docs/screenshots/pre-commit-guard.ts`; activated via `"hooks:install": "git config core.hooksPath .githooks"` in `package.json`.
- On staged files (`git diff --cached --name-status --diff-filter=ACMR`):
  1. Hard-blocks any staged path under `docs/images/`.
  2. When any `assets/images/*` file is staged, runs `verify-docs-assets.ts --fast` (manifest bijection, SHA-256, `inspectPngChunks()`).
  3. Scans all staged text/markdown/code files through `docs/screenshots/public-hygiene-rules.ts` to catch inline text leaks prior to commit.
- `tests/test-sandbox.ts` (`verifyRepositoryPublicHygiene`) allows tracked files under `.githooks/`, and `tsconfig.json` adds `"docs/screenshots/**/*.ts"` to `include`.

### 4. Repository Rules & Governance ADR

- Update `AGENTS.md` and `docs/agents/container-deployment.md` with an explicit **Critical Rule** forbidding copying `docs/images/*` **Development Verification Captures** into `assets/images/` or embedding `docs/images/*` / `../../images/*` paths in `README.md`, `docs/features/*/spec.md`, or any tracked markdown file (`assets/images/*` may only be updated via `npm run docs:screenshots` or `npm run demo:video`).
- Authored and accepted ADR: [`docs/adr/0006-synthetic-public-documentation-assets-and-manifest-provenance.md`](../../../adr/0006-synthetic-public-documentation-assets-and-manifest-provenance.md).
