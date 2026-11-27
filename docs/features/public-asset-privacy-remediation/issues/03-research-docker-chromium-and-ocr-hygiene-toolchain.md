# Research Containerized Chromium Capture & OCR/Metadata Verification Toolchain

Type: research
Label: wayfinder:research
Status: resolved

## Question

Investigate and recommend the exact zero-host-dependency Dockerized capture, PNG metadata-stripping, and automated OCR hygiene verification toolchain for `npm run docs:screenshots`:

1. **Dockerized Headless Chromium Capture**: Inspect `docs/video/record-intro-demo.ts` and determine how to cleanly capture static desktop (`1600×1000`) and mobile (`390×844` / DPR `2`) PNG screenshots from `http://127.0.0.1:4310/?demo=docs-showcase&scene=<id>` using a reproducible Docker image (with zero Chrome/Chromium binary required on the host and zero live daemon/operator access).
2. **PNG Metadata Stripping**: Determine the simplest zero-npm-dependency approach (native Node.js PNG chunk filter stripping `tEXt`/`iTXt`/`zTXt`/`eXIf` chunks, or tool inside the capture container) so generated PNGs contain no stray metadata or host timestamps.
3. **Automated OCR Hygiene Gate**: Evaluate lightweight containerized OCR options (e.g., `tesseract` inside the capture container or a minimal Alpine/Debian layer) for extracting all visible text from every generated PNG and scanning it against:
   - `forbiddenTokenDigests` (from `tests/test-sandbox.ts`),
   - private home-path & tunnel regexes, and
   - an explicit synthetic allowlist / anomaly report.
4. Report exact container image candidates, expected execution time for ~12–16 screenshots, failure modes (e.g., pixel-art fonts vs HUD UI text OCR accuracy), and exact Node.js / Docker CLI invocation contracts so [Specify Public Asset Manifest Schema, OCR/Metadata Hygiene Gate, Pre-Commit Guard & Governance Rules](./05-design-public-asset-manifest-hygiene-gate-and-pre-commit-guard.md) can lock the final design.

## Answer

### 1. Recommended Capture & OCR Container (`docs/screenshots/Dockerfile` → `opencode-pixel-guild-docs-capture:v1`)

- **Base image & packages**: `FROM node:22-alpine` + `apk add --no-cache chromium font-dejavu font-noto-emoji tesseract-ocr tesseract-ocr-data-eng` (~540 MiB total; ~85.5 s one-time cold build cached in Docker layers; **< 1 s** warm start; shares the `node:22-alpine` base layer with the root `Dockerfile`; smaller and simpler than `zenika/alpine-chrome` or `node:22-slim`).
- **Physical Air-Gap Guarantee (`--network none`)**:
  - Instead of connecting to a live container on `--network host`, invoke with `--rm --network none --shm-size=1gb`, mounting only `src:ro`, `docs:ro`, and `assets/images:rw` (**never** mounting `./data/`).
  - Inside `docs/screenshots/capture-docs-screenshots.ts`, boot an ephemeral static-only `node:http` server delegating strictly to `tryServeStaticAsset()` (`src/server/static-router.ts`) and returning HTTP `403` + fatal error on any `/api/*` request.
  - Reuse one Headless Chromium instance via native Node 22 `WebSocket` CDP (same pattern as `docs/video/record-intro-demo.ts`):
    - Desktop: `Emulation.setDeviceMetricsOverride({ width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false })`, touch disabled → `1600×1000` PNG.
    - Mobile: `Emulation.setDeviceMetricsOverride({ width: 390, height: 844, deviceScaleFactor: 2, mobile: true })`, touch enabled → `780×1688` Retina 2× PNG matching `@media (max-width: 960px)` / `isMobileViewport()`.
    - Per-scene isolation via `Page.addScriptToEvaluateOnNewDocument` clearing `localStorage`/`sessionStorage` and wrapping `CanvasRenderingContext2D.prototype.fillText`/`strokeText` into `window.__docsCapturedCanvasText`; wait for `window.__docsShowcaseReady === true` before `Page.captureScreenshot`.

### 2. Six Client-Side Offline Seams Required for Ticket 04

Auditing all 20 `fetch(` / `EventSource` call sites under `src/web/` identified 6 seams (beyond `src/web/app-main.ts:276–284`) that must short-circuit behind a shared `isOfflineDemoModeActive()` check so open HUD panels/modals never trigger `/api/*` calls or mutate `localStorage`:
1. `src/web/ledger-panel-reconciler.ts:133–135, 147–149` (`refreshRoomGitState` → `GET /api/guild/git`; add a synthetic Git seeder in `src/web/commit-ledger-controller.ts`).
2. `src/web/side-panel-reconciler.ts:167–179` (`maybeHydrateSessionMessagesOnDemand` → `GET /api/guild/session/:sid/messages`).
3. `src/web/side-panel-reconciler.ts:163–165` (`acknowledgeSessionResultAsRead` → `POST /api/guild/command`).
4. `src/web/operator-pairing-controller.ts:375–391` (`openOperatorPairingModal` → `refreshCachedOperatorProfile` → `GET /api/guild/users/me`).
5. `src/web/world-persistence.ts:181–200` & `src/web/client-state.ts:352–361` (`PATCH /api/guild/users/me` and `localStorage` UI persistence).
6. `src/web/app-main.ts:336–337` (`guild-operator-changed` / `guild-machine-changed` re-opening `openLiveEventStream`).

### 3. Shared Zero-Dependency Modules (Tracking & Reachability Constraint)

- Because `tests/` is gitignored and `tests/00-architecture-invariants.test.ts` enforces 100% symbol reachability on `src/**/*.ts`, keep shared capture/hygiene utilities in tracked **`docs/screenshots/`**:
  - `docs/screenshots/public-hygiene-rules.ts` — single source of truth for `FORBIDDEN_TOKEN_DIGESTS`, `NON_GENERIC_HOME_REGEX`, `LIVE_OPEN_TUNNEL_REGEX`, private LAN/Tailscale IPv4 checks, and `findPublicHygieneViolations(text)` (imported by `tests/test-sandbox.ts`, `.githooks/pre-commit`, `docs:screenshots`, and `docs:verify-assets` with zero hash duplication).
  - `docs/screenshots/png-metadata.ts` — ~60-line zero-dep Node 22 PNG chunk parser/stripper using built-in `zlib.crc32`: keeps only `IHDR`, `PLTE`, `IDAT`, `IEND`, `tRNS`, `gAMA`, `cHRM`, `sRGB`, `iCCP`, `pHYs`; strips & rejects `tEXt`, `iTXt`, `zTXt`, `eXIf`, `tIME`, invalid CRCs, or trailing bytes.
- Exclude `entry === "screenshots"` in `tests/00-architecture-invariants.test.ts:1001` (`collectDocTexts`) so script references never mask unreferenced PNGs in `assets/images/`.

### 4. Empirical OCR Benchmarks & 3-Layer Verification Strategy

Empirically tested Tesseract 5.5.2 on dark-mode `assets/images/intro-demo-video.png` inside `node:22-alpine`:
- **Raw PNG (`--psm 3` or `--psm 11`)**: `3.75–5.44 s`, **MISSED 0/3 Worlds-bar project names** (unacceptable because `Worlds:` is the #1 leak vector on dark `#14100d` backgrounds!).
- **Pure-Node 2× inverted grayscale PGM piped via `stdin` (`--psm 11`, `OMP_THREAD_LIMIT=1`)**: `2.96 s`, **100% character-exact (3/3) on the Worlds bar** plus recovered `8px` underfoot nameplates and bug headers — zero ImageMagick/Sharp dependencies and zero temp files.

Recommended **3-layer hygiene check**:
1. **Layer 1 (Capture-Time Lossless DOM + Canvas2D Audit, ~5 ms/scene)**: Extract `document.body.innerText`, input values, `title`/`aria-label`/`alt`, and `window.__docsCapturedCanvasText` via CDP and scan with `findPublicHygieneViolations()` — 0% OCR error even on `6.2px` canvas text.
2. **Layer 2 (Independent Containerized Visual OCR)**: Run parallel `tesseract stdin stdout -l eng --psm 11` (`OMP_THREAD_LIMIT=1`, `Math.min(4, cpus)` workers) on both inverted grayscale PGM (`2×` for 1×-DPR desktop, `1×` for 2×-DPR mobile) and raw PNG passes.
3. **Layer 3 (Shared Scanner + Anomaly Report)**: Hard-fail on `FORBIDDEN_TOKEN_DIGESTS`, home-path regex, live OpenTunnel regex, private LAN IPs, or non-allowlisted external URLs; emit an advisory summary of path/host-like tokens without echoing secret literals.

**Measured/Expected Warm Runtime (12–16 scenes)**: ~10–14 s capture + ~16–24 s parallel OCR = **~25–38 s total** warm run.

### 5. Proposed CLI & `package.json` Contracts (Inputs to Ticket 05)

- `npm run docs:screenshots` (`docs/screenshots/capture-docs-screenshots.ts`): lazily builds `opencode-pixel-guild-docs-capture:v1`, runs inside `--network none`, supports `--scene=<id>[,<id>]`, `--rebuild-image`, and `--url=<baseUrl>` (debug-only), runs Layers 1–3 + PNG strip atomically before writing PNGs + `assets/images/manifest.json`.
- `npm run docs:verify-assets` (`docs/screenshots/verify-docs-assets.ts`): host-fast structural check (`manifest.json` schema + SHA-256 + `inspectPngChunks`, `< 50 ms`, selectable via `--fast` / `--no-ocr` for `npm test` and `.githooks/pre-commit`) plus full containerized OCR scan by default (supports `--file=<path>` and `--json`).
