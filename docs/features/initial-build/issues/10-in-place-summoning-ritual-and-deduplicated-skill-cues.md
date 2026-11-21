# Remove Static Summoning Pad for In-Place Summoning Ritual and Deduplicate Skill Grimoire Cues

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 02, 04, 09

## Description

1. Delete the static `Summoning Pad` fixture at `{ x: 7, y: 8 }` from `Workshop Room` layout, reclaiming those central tiles as walkable floor space.
2. Implement **`Summoning Ritual`** choreography (`computeAdjacentSummonTile`): when a parent `Guild Adventurer` spawns a `Squad Subagent` via the `subagent` tool, the parent casts an in-place ritual spell at their current tile (`parentTile`) and materializes the `Squad Subagent` on the nearest walkable adjacent tile (`parentTile ± 1`).
3. Route completing `Squad Subagent`s (`ReportingScroll`) directly to their parent `Guild Adventurer`'s current tile to hand over the `Report Scroll`.
4. Remove duplicate `Skill Grimoire` visuals: eliminate both the 3 circling spark dots around the character body and the overhead skill dots (`grimoireEmblemRow`) above the character's head, representing equipped `Skill Grimoire`s solely through the held off-hand Grimoire Tome and HUD inspection cards.

## Answer

- Deleted the static `Summoning Pad` fixture (`{ x: 7, y: 8 }`) from `WorkshopRoomLayout` (`src/spatial/floorplan-layout.ts`), `ROOM_FIXTURE_KINDS` (`src/types/domain.ts`), and `src/web/app.html`, reclaiming central tile `{ x: 7, y: 8 }` as walkable floor space (`kind: "floor"`, `walkable: true`, `fixtureId: null`).
- Implemented `computeAdjacentSummonTile`, `computeSummoningRitualChoreography`, and `computeReportScrollRoute` in `src/spatial/floorplan-layout.ts`, and wired in-place `SummoningRitual` (`summoningRitual`, `activeSummoningRituals`, `spawnTile`) and direct parent `ReportingScroll` (`targetTile` = parent's `currentTile`) into `src/state/world-reducer.ts`, `src/roster/roster-choreography.ts`, `src/hud/spectator-hud.ts`, and `src/web/app.html`.
- Deduplicated `Skill Grimoire` visual cues in `src/sprites/pixel-compositor.ts` (`applyPass2SkillGrimoire`, `computeOverheadHudCue`) and `src/web/app.html`, removing the 3 circling body spark dots (`orbitingSparks: []`) and overhead skill dots (`grimoireEmblemRow.visible: false`, `emblems: []`) so equipped `Skill Grimoire`s are represented solely via the held off-hand Grimoire Tome and HUD inspection cards.
