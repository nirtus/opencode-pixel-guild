# Feature Map: Two-Row Universal Top-Bar Navigation, Canonical Project World Seam & Deepened Guild Operator Architecture

Label: wayfinder:map

## Destination

Deliver the complete specification in [Specification: Two-Row Universal Top-Bar Navigation, Canonical Project World Seam & Deepened Guild Operator Architecture](./spec.md) through four vertical-slice tickets:
1. **[01: Canonical Project World Resolution & Roster-Aware Session Counting Seam](./issues/01-canonical-project-world-resolution-and-session-counts.md)** (`Blocked by: None`)
2. **[02: Two-Row Universal Top-Bar Header, Dedicated Project World Row & Dynamic Viewport Sizing](./issues/02-two-row-top-bar-and-dynamic-viewport-sizing.md)** (`Blocked by: 01`)
3. **[03: Universal Client Guild Operator Session, Declarative Modal Delegation & Preference Sync](./issues/03-universal-client-operator-session-and-preference-sync.md)** (`Blocked by: 01`)
4. **[04: Deep Server OperatorWorkspaceRegistry Seam & Centralized Pairing Redemption](./issues/04-deep-server-operator-workspace-registry-seam.md)** (`Blocked by: None`)

## Notes

- **Mode**: Design phase complete (`spec.md`, `map.md`, and tickets `01..04` published; no production code modified).
- **Domain**: **Project World**, **Guild Operator**, **OpenCode Machine Pairing**, **Operator Auth Gate**, **Guild Floorplan**, **Workshop Room**, **Spectator Drawer**.
- **Architecture Review**: [Architecture Review Report (2026-10-27)](../../architecture-review/architecture-review-20261027.html) (`docs/images/architecture-review-20261027.png`).
- **Specification**: [Feature Specification](./spec.md).
- **Skills to consult**: `codebase-design`, `domain-modeling`, `tdd`, `code-review`.
- **Standing Rules**: Work strictly inside the project root directory (`./`). Never create git worktrees or write files to `/tmp` or `/tmp/opencode`. Every source file in `src/` must remain `<= 400` lines.

## Decisions so far

- [Architecture Review & Grilling Alignment (2026-10-27)](../../architecture-review/architecture-review-20261027.html): Resolved `Q1–Q7` across all four deepening candidates and updated `GLOSSARY.md` so **Project World** specifies its dedicated full-width top navigation row.
- [Specification: Two-Row Universal Top-Bar Navigation, Canonical Project World Seam & Deepened Guild Operator Architecture](./spec.md): Locked the two-row universal header layout (Row 1 compact Brand + merged Pairing/Operator/Action controls; Row 2 dedicated 100%-width `Project World` strip), zero hardcoded viewport pixel offsets, canonical `layoutProjectWorld` session counting, universal `data-operator-action` + `GuildOperatorPreferences` sync, and deep `OperatorWorkspaceRegistry` domain methods.
- [01: Canonical Project World Resolution & Roster-Aware Session Counting Seam](./issues/01-canonical-project-world-resolution-and-session-counts.md): Unified canonical project-root matching, persisted selection resolution, and roster-aware `sessionCount` (`active-squads` vs `full-lineage`) in `src/spatial/project-world.ts`.
- [02: Two-Row Universal Top-Bar Header, Dedicated Project World Row & Dynamic Viewport Sizing](./issues/02-two-row-top-bar-and-dynamic-viewport-sizing.md): Implemented `buildTopBarViewModel`, restructured `<header class="top-bar">` into Row 1 (Brand + compact merged connection/operator/action controls) and Row 2 (dedicated 100%-width `Project World` row), and replaced hardcoded `vh - 76` / `vh - 104` viewport offsets with live container bounding-box measurements.
- [03: Universal Client Guild Operator Session, Declarative Modal Delegation & Preference Sync](./issues/03-universal-client-operator-session-and-preference-sync.md): Replaced hardcoded modal `#id` bindings with declarative `data-operator-action` delegation and added universal `GuildOperatorPreferences` hydration/persistence.
- [04: Deep Server OperatorWorkspaceRegistry Seam & Centralized Pairing Redemption](./issues/04-deep-server-operator-workspace-registry-seam.md): Deepened `OperatorWorkspaceRegistry` with domain methods for operator registration, login, preference updates, and machine pairing/activation/removal, turning `src/server/operator-routes.ts` into a thin HTTP adapter.

## Not yet specified

<!-- All wayfinder fog has graduated into spec.md and tickets 01..04 -->

## Out of scope

- Changing indoor **Workshop Room** station coordinates or **Dungeon Wilds** encounter mechanics.
