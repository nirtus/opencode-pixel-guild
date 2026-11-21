# Feature Map: Unified Host Workshop Room & Multi-Project Heraldry

Label: wayfinder:map

## Destination

Deliver the complete specification in [Specification: Unified Host Workshop Room & Multi-Project Heraldry](./spec.md) so that all active projects opened in the same host OpenCode instance co-habit a single shared **Workshop Room** and **Dungeon Wilds**, with clear 5-layer **Project Heraldry** distinguishing each character's project membership across the canvas and HUD:

1. **[01: Unified Host Workshop Room Co-Habitation & Non-Isolating Project Legend](./issues/01-project-heraldry-domain-and-party-uniform-seam.md)** (`Blocked by: None`)
2. **[02: Project-Seeded Guild Order Uniforms & Collision-Free Project Heraldry](./issues/02-unified-host-workshop-room-and-multi-project-visibility.md)** (`Blocked by: 01`)
3. **[03: On-Canvas Heraldic Nameplates, Project Pedestal Rings & North Wall Pennants](./issues/03-canvas-heraldic-nameplates-pedestal-rings-and-wall-pennants.md)** (`Blocked by: 02`)
4. **[04: Multi-Project Dungeon Wilds & Project-Tagged Bug Monsters](./issues/04-multi-project-ledger-wilds-and-commit-repo-selector.md)** (`Blocked by: 01, 02`)
5. **[05: Guild Master Ledger Heraldry Pills, Character Sheet Badge & Commit Repository Selector](./issues/05-ledger-heraldry-pills-character-sheet-and-commit-repo-selector.md)** (`Blocked by: 01, 02`)

## Notes

- **Domain**: **Workshop Room**, **Guild Floorplan**, **Project Heraldry**, **Guild Character**, **Guild Adventurer**, **Squad Subagent**, **Guild Master Ledger**, **Character Sheet**, **Assembly Commit Ledger**, **Dungeon Wilds**, **Bug Monster**.
- **ADR**: [ADR-0001: Unified Host Workshop Room and Project Heraldry](../../adr/0001-unified-host-workshop-room-and-project-heraldry.md).
- **Architecture Review**: [Architecture Review Report (2026-11-05)](../../architecture-review/architecture-review-20261105-unified-host-guild-hall.html).
- **Specification**: [Feature Specification](./spec.md).
- **Skills Consulted**: `domain-modeling`, `codebase-design`, `to-spec`, `to-tickets`.
- **Standing Rules**: Work strictly inside the project root directory (`./`). Never create git worktrees or write files to `/tmp` or `/tmp/opencode`. Every source file in `src/` must remain `<= 400` lines.

## Decisions so far

- [ADR-0001: Unified Host Workshop Room and Project Heraldry](../../adr/0001-unified-host-workshop-room-and-project-heraldry.md): Abolished per-project isolated `Project World` rooms in favor of a single unified Host **Workshop Room** per **OpenCode Machine Pairing**, while preserving `locationDirectory`, `projectId`, and `projectName` on `CharacterState` and `WorkshopRoomState` so OpenCode V2 `?directory=` commands and per-repository Git commits remain intact.
- [Specification: Unified Host Workshop Room & Multi-Project Heraldry](./spec.md): Defined the 5-layer **Project Heraldry** system and approved the two high-level testing seams (`Unified Host Spatial & Project Heraldry Seam` and `Spectator HUD & Canvas Heraldry Seam`).
- Split the work into 5 tracer-bullet vertical-slice tickets (`01` -> `02` -> `{03, 04, 05}`) separating **Dungeon Wilds** multi-project encounters (`04`) from **Guild Master Ledger**, **Character Sheet**, and **Assembly Commit Ledger** repository switching (`05`).

## Not yet specified

<!-- All wayfinder fog has graduated into spec.md and tickets 01..05 -->

## Out of scope

- Merging characters from *different* paired physical hosts (**OpenCode Machine Pairings**) into the same room—switching between paired machines remains controlled by `#header-machine-strip`.
