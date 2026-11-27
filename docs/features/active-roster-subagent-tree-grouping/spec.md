# Feature Specification: Active Room Roster Counts & Tree-Grouped Squad Subagents

**Status:** Implemented & Container-Verified

## Summary

Refactors the **Active Room Roster & Quick Jump** card inside the **Guild Master Ledger** (`Overview & Roster` subtab) in two cohesive parts:

1. **Stable Agent & Subagent Header Counts**: Replaces the single toggle-dependent visible count with `agents <A> | <checkbox> show subagents <S>`, where `<A>` counts root **Guild Adventurers** and `<S>` counts **Squad Subagents** in the current scoped roster regardless of whether subagents are currently shown.
2. **Option A Tree-Grouped Squad Subagent Rows**: When `show subagents` is checked, renders **Squad Subagents** nested directly beneath their parent **Guild Adventurer** (or parent **Squad Subagent**, capped at 3 visual nesting levels) connected by CSS-drawn `├─` / `└─` rails softly tinted by the parent's **Project Heraldry** (`#57463b` fallback), with recessed child surfaces and `✦ <class>` badges.

## Requirements

- **Subagent Classification**: `Boolean(c.parentId || c.parentSessionId || c.role === "Squad Subagent")`.
- **Parent Resolution**: `c.parentId || c.parentSessionId || null`.
- **Header Format**: `agents <A> | <checkbox> show subagents <S>` inside `.roster-header-controls`, preserving `#roster-show-subagents-checkbox`, `clientState.showSubagentsInRoster`, and its `change` listener. Both `<A>` and `<S>` remain stable when toggling the checkbox and show `0` when the scoped roster is empty.
- **Ordering & Hierarchy**:
  - Top-level rows (root **Guild Adventurers** and detached/orphan **Squad Subagents**) preserve their existing activity sort order from `getScopedGameMasterCharacters()`.
  - Attached subagents render directly underneath their parent in relative sibling activity order, even if a subagent appeared before its parent in the flat activity list.
  - Grandchild nesting is supported recursively, clamped visually at depth 3 (`[data-roster-depth="3"] > .roster-tree-children`), with cycle-safe parent traversal (`isNodeInParentCycle` + visited set) so self-parenting or mutual cycles never loop or drop characters.
- **Visual Distinction**:
  - Attached child rows omit the redundant `[Project]` pill and `⚔️`, rendering `<span class="roster-subagent-badge">✦ <agentClass|sub></span>` (XSS-escaped via `escapeHtml`) inside `.roster-row-subagent`.
  - Detached/orphan subagents remain at top level with `.roster-row-subagent.is-detached`, keeping their `[Project]` pill and `✦ <class>` badge so world context is preserved.
  - Tree brackets (`├─` / `└─`) are drawn with CSS pseudo-elements (never text-glyph padding), with `.roster-tree-row-wrap` isolating the button center so horizontal ticks and last-sibling rail stops remain aligned even when a child owns nested grandchildren.
  - Every button preserves `data-select-session` for quick-jump selection and cascades cleanly with mobile touch targets (`<= 960px` in `src/web/styles-responsive.css`).

## Architecture & Module Boundaries

- **`src/web/roster-rows-view.ts`** (`<= 400` lines): Single-responsibility view module exporting `RosterTreeNode`, `isRosterSubagent`, `buildRosterTree`, and `renderCharacterRosterRowsHtml`.
- **`src/web/ledger-panel-reconciler.ts`** (`<= 400` lines): Computes stable `rosterAgents` / `rosterSubagents` counts, renders the refactored header controls, and delegates row HTML rendering to `src/web/roster-rows-view.ts`.
- **`src/web/styles-components.css`** (`<= 400` lines): Defines `.roster-tree-*`, `.roster-row-subagent`, `.roster-subagent-badge`, progressive `color-mix()` heraldry rail tinting (`#57463b` fallback), and depth-3 clamping.

## Verification

- **Unit & Seam Tests**:
  - `tests/62-roster-agent-subagent-counts.test.ts`: Verifies `agents <A> | show subagents <S>`, stable counts across toggling, empty roster (`agents 0 | show subagents 0`), and row visibility via `renderGuildMasterLedgerPanel`.
  - `tests/63-roster-subagent-tree-grouping.test.ts`: Verifies `buildRosterTree` and `renderCharacterRosterRowsHtml` across interleaved activity order, child-before-parent order, `parentSessionId`, detached/role-only subagents, depth-3 cap, self/mutual cycles, blank/HTML-unsafe `agentClass`, grandchild wrapper geometry, and gate/unread tags.
- **Public Documentation & Container Proof**:
  - Reflected in `README.md`, `GLOSSARY.md`, and offline synthetic showcase capture `assets/images/showcase-single-world.png` (`npm run docs:screenshots` + `npm run docs:verify-assets`).
  - Deployed and verified on the `opencode-pixel-guild-visualizer` Docker container (`port 4310`).
