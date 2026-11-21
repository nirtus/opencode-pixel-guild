## Destination

Deliver the **UI/UX Usability Fixes, Model-Aware `Context Mana`, CraftPix Guild Hall Sketch-First Graphics Overhaul, and Room Demolition** feature specified in [`./spec.md`](./spec.md) across four tracer-bullet vertical slices:

1. **[01 — Model-Aware `Context Mana` Hydration & `Character Sheet` Runtime Crash Fix](./issues/01-model-aware-context-mana-and-character-sheet-hud-fix.md)**
2. **[02 — Unified Multi-Room Spatial Coordinates, `Break Lounge` Crowd Capping & Label De-Collision](./issues/02-multi-room-spatial-alignment-break-lounge-cap-and-label-decollision.md)**
3. **[03 — CraftPix Guild Hall Visual Sketches & Dual-Style Sprite Painter Overhaul](./issues/03-craftpix-guild-hall-visual-sketches-and-sprite-painter-overhaul.md)**
4. **[04 — In-Room `Demolition Bomb` & 5-Step OpenCode V2 Ghost Room Teardown (`DELETE /api/guild/room`)](./issues/04-in-room-demolition-bomb-and-ghost-room-teardown.md)**

## Notes

- **Critical Project Root Rule (`AGENTS.md`)**: All specs, maps, tickets, sketches, and code live strictly inside the project root directory (`./`). Never call `tools.opencode.worktree_create`, `tools.opencode.session_move`, or `git worktree add`, and never write or read task artifacts in `/tmp/opencode` or `/tmp`.
- **Domain Vocabulary**: Use [`../../../GLOSSARY.md`](../../../GLOSSARY.md) terms (`Guild Floorplan`, `Workshop Room`, `Workstation`, `Arcane Lectern`, `Resource Stockpile`, `Resource Cargo`, `Summoning Ritual`, `Break Lounge`, `Demolition Bomb`, `Guild Adventurer`, `Squad Subagent`, `Skill Grimoire`, `Equipment Loadout`, `Report Scroll`, `Context Mana`, `Quest Gate`, `Character Sheet`, `Demo Guild Simulator`).
- **CraftPix Visual Reference**: `https://craftpix.net/freebies/free-top-down-pixel-art-guild-hall-asset-pack/` — Ticket 03 must deliver visual sketches (`./sketches/craftpix-guild-hall-sketches.html`) modeled on these resources alongside the upgraded canvas painter.

## Decisions so far

- **Authoritative Spec**: Published in [`./spec.md`](./spec.md) with two approved high-level test seams (Seam 1: Ingress + World-State Reducer + Spatial/Scene Frame; Seam 2: Spectator HUD + Companion Server) and four vertical-slice tickets (`01`–`04`).
- **[01 — Model-Aware `Context Mana` Hydration & `Character Sheet` Runtime Crash Fix](./issues/01-model-aware-context-mana-and-character-sheet-hud-fix.md)**: Resolved — hydrated `GET /api/model` context limits (`1,048,576` for `google/gemini-4-argon`, `262,144` for `opencode/flint-40b-free`) into `CapabilityCatalog.models`, computed `Context Mana` `usedTokens` from the newest assistant message's context footprint, aligned `CharacterSheetViewModel` fields with `app.html`, and sorted `roomSessions` with active sessions first.
- **[02 — Unified Multi-Room Spatial Coordinates, `Break Lounge` Crowd Capping & Label De-Collision](./issues/02-multi-room-spatial-alignment-break-lounge-cap-and-label-decollision.md)**: Resolved — routed outdoor spine/worktree footpaths around room exteriors without cutting through room interiors, added `computeCameraFitForRooms`, capped visible `Break Lounge` resting characters at `MAX_VISIBLE_LOUNGE_CHARACTERS = 6` (`+N resting` badge, un-highlighted sleeping mana bars hidden), and de-collided `Workstation` labels from north-wall bookshelves and standing characters.
- **[03 — CraftPix Guild Hall Visual Sketches & Dual-Style Sprite Painter Overhaul](./issues/03-craftpix-guild-hall-visual-sketches-and-sprite-painter-overhaul.md)**: Resolved — created `docs/features/ui-ux-and-craftpix-overhaul/sketches/craftpix-guild-hall-sketches.html` (served at `/sketches`), added the north-wall CraftPix **Quest Bulletin Board** prop, and upgraded `createCanvas2DScenePaintAdapter` so `"pixel-atlas"` and `"clean-cartoon"` execute distinct visual rendering pipelines.
- **[04 — In-Room `Demolition Bomb` & 5-Step OpenCode V2 Ghost Room Teardown (`DELETE /api/guild/room`)](./issues/04-in-room-demolition-bomb-and-ghost-room-teardown.md)**: Resolved — placed the `Demolition Bomb` at `{ x: 14, y: 10 }` (`anchorTile: { x: 13, y: 10 }`), wired the `demolition-bomb` tooltip, `GET /api/worktree?projectID=...` worktree discovery, 5-step `deleteRoomResources` teardown (`DELETE /api/guild/room`), `room.deleted` reduction with 0-session resurrection suppression, and confirmation modal with shockwave animation.

## Not yet specified

- None (all 4 vertical slices are `ready-for-agent`).

## Out of scope

- Deleting primary non-worktree repositories on disk (`DELETE /api/worktree` only runs for worktrees).
- Interactive prompt/permission replies from the browser UI.
