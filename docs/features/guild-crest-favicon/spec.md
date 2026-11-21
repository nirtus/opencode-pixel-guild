# Feature Specification: System `Guild Crest` Favicon & Top-Bar Brand Emblem

## 1. Overview & Motivation

Previously, `src/web/app.html` lacked `<link rel="icon">` and `<link rel="apple-touch-icon">` declarations in `<head>`, `src/server/static-router.ts` returned `404 {"error":"Not found"}` for `/favicon.ico`, `/favicon.svg`, and `/apple-touch-icon.png`, and the top-bar `.brand-crest` badge rendered a platform-dependent raw emoji (`⚔️`).

This specification defines the canonical **`Guild Crest`**—a bevelled dark-indigo (`#1e1b4b`) heraldic shield trimmed in warm amber gold (`#f59e0b`) featuring crossed pixel-crisp blades and a glowing cyan arcane telemetry crystal (`#38bdf8`)—and unifies the browser tab favicon (`/favicon.svg`, `/favicon.ico`), iOS/mobile touch icon (`/apple-touch-icon.png`), and top-bar `.brand-crest` header emblem.

## 2. Locked Design Decisions (`Q1`–`Q4`)

- **Q1 — Domain Term (`Guild Crest`) & Single-Session Execution**: Define **`Guild Crest`** in `GLOSSARY.md` as the system-wide heraldic emblem of the OpenCode Pixel Guild Visualizer (distinct from per-project `Project Heraldry`), record the feature map/spec under `docs/features/guild-crest-favicon/`, and implement + verify in Docker (`http://127.0.0.1:4310`).
- **Q2 — Visual Motif & Palette**: Heraldic Shield (`#1e1b4b` fill, `#f59e0b` amber-gold bevel border) with crossed silver/gold blades and a central glowing cyan arcane telemetry gem (`#38bdf8`).
- **Q3 — Asset Formats, Server Routes & Top-Bar `.brand-crest` Unification**:
  1. Serve `/favicon.svg` (`image/svg+xml`), `/favicon.ico` (`image/x-icon` binary fallback so automatic browser `/favicon.ico` requests return `200 OK`), and `/apple-touch-icon.png` (`image/png` for mobile/home-screen web apps) from `src/server/static-router.ts`.
  2. Declare `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />`, `<link rel="alternate icon" href="/favicon.ico" />`, and `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />` in `src/web/app.html` while keeping `src/web/app.html <= 150` lines.
  3. Render the bespoke `Guild Crest` SVG inside `<div class="brand-crest">` in `src/web/app.html` (replacing the raw `⚔️` emoji) so the top-bar brand crest and browser tab favicon share one unified visual identity.
- **Q4 — Clean Static Favicon**: Serve deterministic, cacheable static `Guild Crest` assets without client-side canvas-to-data-URL tab-favicon mutation.

## 3. Architecture & Module Seams

### 3.1 Dedicated `Guild Crest` Asset Catalog (`src/server/guild-crest-assets.ts`)
- Pure data/asset module (`<= 400` lines) exporting:
  - `GUILD_CREST_SVG`: Crisp vector SVG (`viewBox="0 0 64 64"`) of the bevelled indigo shield (`#1e1b4b`), amber-gold trim (`#f59e0b`), crossed blades, and cyan arcane crystal (`#38bdf8`).
  - ` getGuildCrestIcoBuffer()`: Valid `ICO` binary buffer (containing a crisp embedded 32×32 RGBA PNG icon frame of the `Guild Crest`) served at `/favicon.ico` with `Content-Type: image/x-icon`.
  - `getGuildCrestPngBuffer()`: Valid `PNG` binary buffer of the `Guild Crest` served at `/apple-touch-icon.png` (and `/favicon.png`) with `Content-Type: image/png`.

### 3.2 Companion Static Router (`src/server/static-router.ts`)
- Extend `tryServeStaticAsset(req, res, pathname)` to serve:
  - `GET`/`HEAD` `/favicon.svg` → `200 OK`, `Content-Type: image/svg+xml; charset=utf-8`
  - `GET`/`HEAD` `/favicon.ico` → `200 OK`, `Content-Type: image/x-icon`
  - `GET`/`HEAD` `/apple-touch-icon.png` and `/favicon.png` → `200 OK`, `Content-Type: image/png`

### 3.3 Semantic HTML Shell & Top-Bar Crest (`src/web/app.html`, `src/web/styles.css`)
- Wire `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />`, `<link rel="alternate icon" href="/favicon.ico" />`, and `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />` in `<head>` of `src/web/app.html`.
- Render `<img class="brand-crest-img" src="/favicon.svg" alt="" aria-hidden="true" />` inside `<div class="brand-crest">` in `src/web/app.html`, keeping `src/web/app.html <= 150` lines.
- Style `.brand-crest-img` in `src/web/styles.css` so it fills the `.brand-crest` badge cleanly on desktop and mobile viewports.

## 4. Verification & Container Deployment Criteria
- HTTP integration tests at the companion server seam (`createGuildCompanionServer`) verifying `GET` and `HEAD` for `/favicon.svg`, `/favicon.ico` (valid ICO header `00 00 01 00`), and `/apple-touch-icon.png` (valid PNG signature `89 50 4E 47`), plus HTML shell assertions for `<link rel="icon">` and `.brand-crest`.
- Architecture invariant check (`tests/00-architecture-invariants.test.ts` — `src/web/app.html <= 150` lines and all `src/**/* <= 400` lines).
- Live Docker container deployment (`npm run docker:up` on `http://127.0.0.1:4310`) and headless Chrome screenshot inspection (`docs/images/guild-crest-favicon.png`).
