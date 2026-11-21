# Wayfinder Map: System `Guild Crest` Favicon & Top-Bar Brand Emblem

Label: wayfinder:map

## Destination

Deliver the system-wide **`Guild Crest`** favicon (`/favicon.svg`, `/favicon.ico`, `/apple-touch-icon.png`) and unified top-bar `.brand-crest` emblem as specified in [Feature Specification: System `Guild Crest` Favicon & Top-Bar Brand Emblem](./spec.md), implemented through [Implement System Guild Crest Favicon and Top-Bar Emblem](./issues/01-guild-crest-favicon.md).

## Notes

- **Mode**: Planning + direct implementation in the current session (`@wayfinder` + `@implement`).
- **Domain**: Terminology governed by `./GLOSSARY.md` (**`Guild Crest`**, distinct from per-project **`Project Heraldry`**).
- **Standing Rules**:
  1. Work strictly in the repository root (`./`), never `/tmp/opencode` or external worktrees.
  2. Enforce `<= 400` lines per source file and `<= 150` lines for `src/web/app.html` (`tests/00-architecture-invariants.test.ts`).
  3. Update `GLOSSARY.md` and `README.md` alongside code changes.
  4. Deploy and verify on the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on `http://127.0.0.1:4310`) and inspect a live screenshot (`docs/images/guild-crest-favicon.png`).

## Decisions so far

- [Feature Specification: System `Guild Crest` Favicon & Top-Bar Brand Emblem](./spec.md): Locked Q1–Q4 — defined `Guild Crest` in `GLOSSARY.md`, selected the bevelled dark-indigo shield with amber-gold trim, crossed blades, and cyan arcane crystal motif, chose static `/favicon.svg` + `/favicon.ico` + `/apple-touch-icon.png` routes, and unified the top-bar `.brand-crest` emblem with the new `Guild Crest`.
- [Implement System Guild Crest Favicon and Top-Bar Emblem](./issues/01-guild-crest-favicon.md): Implemented `src/server/guild-crest-assets.ts`, static router endpoints (`/favicon.svg`, `/favicon.ico`, `/apple-touch-icon.png`), `<head>` icon links, unified `.brand-crest` top-bar emblem, TDD test suite (`tests/41-guild-crest-favicon.test.ts`), and Docker container visual verification (`docs/images/guild-crest-favicon.png`).

## Not yet specified

None — the route to the destination is completely specified.

## Out of scope

- Dynamic client-side canvas mutation of the browser tab favicon on session or Quest Gate status changes (ruled out in Q4 in favor of a deterministic static `Guild Crest` asset).
