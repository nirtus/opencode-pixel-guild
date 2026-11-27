# Feature Map: Active Room Roster Counts & Tree-Grouped Squad Subagents

Label: wayfinder:map

## Destination

Deliver [Feature Specification: Active Room Roster Counts & Tree-Grouped Squad Subagents](./spec.md) so the **Active Room Roster & Quick Jump** card in the **Guild Master Ledger** displays stable agent and subagent counts (`agents <A> | [x] show subagents <S>`) and visually groups **Squad Subagents** beneath their parent **Guild Adventurer** using **Project Heraldry**-tinted CSS tree-bracket connectors (`├─` / `└─`), recessed child styling, and `✦ <class>` badges.

## Decisions so far

- **Header Count Refactor (`src/web/ledger-panel-reconciler.ts`, `tests/62-roster-agent-subagent-counts.test.ts`)**: Partitioned scoped characters into `rosterAgents` and `rosterSubagents` via shared `isRosterSubagent`, keeping both counts stable regardless of `clientState.showSubagentsInRoster` while `rosterChars` toggles row visibility.
- **Option A Tree-Grouped Roster Module (`src/web/roster-rows-view.ts`, `tests/63-roster-subagent-tree-grouping.test.ts`)**: Selected Option A (CSS `├─` / `└─` tree-bracket connectors + recessed child rows + `✦ <class>` badge, omitting duplicate `[Project]` pills on attached children) over Option B (framed squad card) and Option C (per-parent collapse state / `[+N sub]` pills). Extracted `src/web/roster-rows-view.ts` (191 lines) so `src/web/ledger-panel-reconciler.ts` (343 lines) stays well below the 400-line file ceiling.
- **CSS Connector Geometry & Depth Clamp (`src/web/styles-components.css`)**: Wrapped each child `<button>` in `.roster-tree-row-wrap` so horizontal ticks and `.is-last` vertical rail termination align to the exact button center even when grandchildren exist; clamped depth 4+ visual indentation via `[data-roster-depth="3"] > .roster-tree-children` with a `2px` inner accent bar; used `@supports (color: color-mix(...))` with `#57463b` fallback.
- **Docs, Synthetic Assets & Container Verification**: Updated `README.md`, `GLOSSARY.md`, `docs/graphify-out/`, regenerated synthetic `assets/images/showcase-*.png` + `assets/images/manifest.json` (`npm run docs:screenshots` + `npm run docs:verify-assets`), passed full `npm test` (469/469), and verified live rendering on the `opencode-pixel-guild-visualizer` Docker container.

## Not yet specified

None — feature complete and shipped.
