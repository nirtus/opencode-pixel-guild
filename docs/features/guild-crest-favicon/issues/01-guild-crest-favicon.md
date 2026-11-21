# Implement System Guild Crest Favicon and Top-Bar Emblem

Type: task
Label: ready-for-agent
Status: resolved

## Question

Implement the system-wide **`Guild Crest`** favicon and top-bar `.brand-crest` emblem according to [Feature Specification: System `Guild Crest` Favicon & Top-Bar Brand Emblem](../spec.md):

1. Create `src/server/guild-crest-assets.ts` (`<= 400` lines) providing the canonical `GUILD_CREST_SVG` artwork (bevelled `#1e1b4b` shield, `#f59e0b` amber-gold trim, crossed blades, and `#38bdf8` cyan arcane crystal) and deterministic binary generators for `/favicon.ico` (`ICO` container wrapping an embedded RGBA PNG) and `/apple-touch-icon.png` (`PNG` binary).
2. Update `src/server/static-router.ts` so `GET` and `HEAD` requests to `/favicon.svg`, `/favicon.ico`, `/apple-touch-icon.png`, and `/favicon.png` return `200 OK` with accurate `Content-Type` headers.
3. Update `src/web/app.html` (`<= 150` lines) and `src/web/styles.css` to link `/favicon.svg`, `/favicon.ico`, and `/apple-touch-icon.png` in `<head>` and render the `Guild Crest` inside `.brand-crest` in the top bar.
4. Add TDD integration tests verifying the HTTP routes, binary headers, HTML `<head>` links, top-bar `.brand-crest` markup, and architecture line-count invariants.
5. Update `README.md`, `GLOSSARY.md`, and `docs/graphify-out/`, deploy to the Docker container (`npm run docker:up` on `http://127.0.0.1:4310`), and inspect a live screenshot (`docs/images/guild-crest-favicon.png`).

## Answer

Implemented and verified:
- Created `src/server/guild-crest-assets.ts` exporting `GUILD_CREST_SVG`, `getGuildCrestPngBuffer()`, and `getGuildCrestIcoBuffer()`.
- Updated `src/server/static-router.ts` to serve `/favicon.svg` (`image/svg+xml; charset=utf-8`), `/favicon.ico` (`image/x-icon`), and `/apple-touch-icon.png` / `/favicon.png` (`image/png`) for both `GET` and `HEAD` requests.
- Updated `src/web/app.html` (`134` lines, within the `<= 150`-line invariant) and `src/web/styles.css` to declare `<link rel="icon">`, `<link rel="alternate icon">`, and `<link rel="apple-touch-icon">` in `<head>` and render the `Guild Crest` SVG inside `<div class="brand-crest">` in the top bar.
- Added `tests/41-guild-crest-favicon.test.ts` and verified all architecture invariants (`tests/00-architecture-invariants.test.ts`).
- Updated `GLOSSARY.md` (added **`Guild Crest`**) and `README.md`, deployed to the `opencode-pixel-guild-visualizer` Docker container on `http://127.0.0.1:4310`, and verified the live rendered UI in `docs/images/guild-crest-favicon.png`.
