# Feature Map: All-Worlds Composite Mini-Assemblies on the Goal Assembly Site

Label: wayfinder:map

## Destination

Deliver the **All-Worlds Composite Mini-Assemblies** architecture (`docs/features/all-worlds-composite-mini-assemblies/spec.md` and `docs/architecture-review/architecture-review-20261108-all-worlds-mini-assemblies.html`) so that when `🌐 All` is selected in the top-bar `Worlds:` row, the central **Goal Assembly Site** on the 2D canvas (and the **Guild Results Showcase** in the **Guild Master Ledger**) is composed of **Project Mini-Assemblies** for all canonical host projects—preserving each project's **Project Heraldry**, representing its status (`★ COMPLETE`, `⚙️ IN PROGRESS`, `📐 OPEN`, `✨ BLUEPRINT READY`), and making project completion visually unmistakable.

## Notes

- **Domain**: `Goal Assembly Site`, `Project Mini-Assembly`, `Assembly Part`, `Project Heraldry`, `Guild Results Showcase`, and `Guild Master Ledger` (`GLOSSARY.md` & `ADR-0001`).
- **Architecture Review**: `docs/architecture-review/architecture-review-20261108-all-worlds-mini-assemblies.html`.
- **Rules**:
  - Work strictly inside the project root directory (`./`); never create git worktrees or use `/tmp/opencode`.
  - Keep every source file strictly `<= 400` lines (`tests/00-architecture-invariants.test.ts`) by extracting `src/encounter/project-mini-assemblies.ts` and `src/web/canvas-mini-assembly-painter.ts`.
  - Update project documentation (`README.md`, `GLOSSARY.md`, `docs/adr/`), deploy to the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`), run `npm test`, and capture visual proof in `docs/images/all-worlds-composite-mini-assemblies.png`.
- **Skills to consult**: `codebase-design`, `domain-modeling`, `tdd`.

## Decisions so far

<!-- the index: one line per closed ticket, enough to judge relevance, then zoom the link for the detail the ticket holds -->

- [01: Per-Project Mini-Assembly Derivation & Multi-Project Platform Layout](./issues/01-per-project-mini-assembly-derivation-and-layout.md): Created `src/encounter/project-mini-assemblies.ts` and extended `deriveGuildAssemblyShowcase` (`src/encounter/assembly-results.ts`) to expose `isMultiProjectScope` and a `1:1` `projectAssemblies` array (`complete`, `in-progress`, `open`, `blueprint-ready`) alongside `computeMultiProjectAssemblyPlatformLayout`.
- [02: Canvas Composite Mini-Assembly Bays & Visually Distinct Completion Rendering](./issues/02-canvas-composite-mini-assembly-bays-and-completion-visuals.md): Extracted `src/web/canvas-mini-assembly-painter.ts` and updated `renderGoalAssemblySite` (`src/web/canvas-assembly-painter.ts`) so `🌐 All` renders responsive **Project Mini-Assembly** bays with `[CREST SHORT-TAG]` headers, mini mechanisms, **Assembly Part** pip matrices, and visually unmistakable completion (`★ DONE N/N`, dual gold-emerald border, pulsing aura, monument star, and Tesla arcs).
- [03: Mini-Assembly Hitboxes, Hover Tooltips, HUD Showcase Sync & Live Container Verification](./issues/03-mini-assembly-hitboxes-tooltips-hud-showcase-and-verification.md): Synchronized canvas mini-assembly hitboxes, hover tooltips (`★ COMPLETE` / `⚙️ IN PROGRESS` / `📐 OPEN` / `✨ READY`), **Guild Master Ledger** showcase status pills, headless `buildFrameEncounters`, and live Docker container verification (`docs/images/all-worlds-composite-mini-assemblies.png`).

## Not yet specified

<!-- in-scope fog you can't ticket yet; graduates as the frontier advances -->

## Out of scope

- Changing single-project Git staging/commit execution rules in the `Assembly Commit Ledger` (which remain strictly scoped to the selected project repository).
- Changing indoor `Preparation Station` perimeter slots or `Dungeon Wilds` monster combat choreography.
