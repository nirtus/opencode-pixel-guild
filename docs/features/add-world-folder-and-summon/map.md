# Feature Map: Top-Bar `+` World Folder Registration & Focused-World `Guild Adventurer` Summoning

Label: wayfinder:map

## Destination

Deliver the complete UI, server/ingress location registration, host-path translation, and focused-world summoning specification in [Specification: Top-Bar `+` World Folder Registration & Focused-World `Guild Adventurer` Summoning](./spec.md) through two vertical-slice implementation tickets:
1. **[01: Server & Ingress World-Folder Registration, Workspace Browsing & Host Path Translation](./issues/01-server-and-ingress-world-folder-registration.md)** (`Status: resolved`)
2. **[02: Top-Bar `+` Add World Button, Folder Picker Modal, Dynamic Agent Modes & Focused-Folder Summon](./issues/02-top-bar-add-world-button-and-focused-summon.md)** (`Status: resolved`)

## Notes

- **Mode**: Wayfinder charting & specification complete (`map.md`, `spec.md`, and tickets `01..02` created; `GLOSSARY.md` and `docs/architecture-review/architecture-review-20261108-add-world-folder-and-summon.html` updated).
- **Domain**: **World Folder Registration**, **World Focus Aura**, **Project Heraldry**, **Workshop Room**, **Guild Adventurer**, **OpenCode Agent Mode**, **Guild Chronicle Store**.
- **Specification**: [Feature Specification](./spec.md).
- **Architecture Review**: [Architecture Review HTML](../../architecture-review/architecture-review-20261108-add-world-folder-and-summon.html).
- **Skills to consult**: `codebase-design`, `domain-modeling`, `tdd`, `code-review`.
- **Standing Rules**: Work strictly inside the project root directory (`./`). Never create git worktrees or write files to `/tmp` or `/tmp/opencode`. Every source file in `src/` must remain `<= 400` lines. Deploy and verify on the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`) with visual proof in `docs/images/`.

## Decisions so far

- [Specification: Top-Bar `+` World Folder Registration & Focused-World `Guild Adventurer` Summoning](./spec.md): Locked all five Grilling Round 1 decisions (`Q1–Q5`) and updated `GLOSSARY.md` definitions for **World Focus Aura** and **World Folder Registration**:
  1. Add a trailing `＋` icon button (`#btn-add-world-folder`, `data-tab-key="proj:add"`) to the right of the project world buttons in `#room-filter-buttons` that opens the **Add World Folder** modal with clickable workspace folder discovery (`GET /api/guild/workspace-folders`), a direct path input, **`➕ Add World`**, and **`✨ Add & Summon Adventurer`**.
  2. Automatically infer the host workspace parent prefix from existing daemon projects so folders browsed under `/workspaces/<name>` inside the Docker container map cleanly to the host OpenCode daemon's native path format (`/mnt/c/...` or `C:/...`) on `POST /api/guild/room` and `POST /api/session?location[directory]=...`.
  3. Pre-select the focused world's canonical folder when opening `Summon Adventurer`, prevent background SSE ticks from overwriting `#summon-directory-select` while the modal is open, and focus + persist the summoned character's canonical project world after summoning.
  4. Persist `0`-session registered folder worlds across daemon sweeps and restarts (clearing any prior demolition tombstones in `deletedRoomIds` / `deletedRoomDirs`), report `(0)` sessions accurately on `0`-session world pills, and prevent phantom `ses_summon_*` characters if the daemon returns an error.
  5. Dynamically hydrate primary-capable **OpenCode Agent Modes** (`GET /api/agent?location[directory]=...` filtered to `(mode === "primary" || mode === "all" || !mode) && !hidden && !disabled`) per folder world and populate the `Summon Adventurer` modal's agent mode selector.

## Not yet specified

<!-- All wayfinder fog has graduated into spec.md and tickets 01..02 -->

## Out of scope

- Splitting the shared **Workshop Room** into isolated per-project rooms (all project worlds continue to co-habit the shared **Workshop Room** per `ADR-0001`).
