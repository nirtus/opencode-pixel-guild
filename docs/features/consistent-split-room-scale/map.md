# Wayfinder Map: Consistent Workshop Room Scale & Object Spacing in Split View

Label: `wayfinder:map`

## Destination

Feature spec (`docs/features/consistent-split-room-scale/spec.md`) and implementation locking the **Workshop Room** to its canonical `800 × 720` internal coordinate geometry in both single-chamber (`Room`) and `65% / 35%` `Split` (`Both`: `800px` Room + `432px` Wilds = `1232 × 720`) modes so stations and characters never shrink disproportionately or drift apart with extra floor space.

## Notes

- Domain: Spatial camera framing (`src/scene/camera.ts`, `src/web/pointer-and-camera.ts`, `src/web/canvas-wilds-painter.ts`).
- Skills: `grilling`, `domain-modeling`.
- Mandatory Docker deployment and headless Chrome visual verification on `opencode-pixel-guild-visualizer` (`port 4310`).

## Decisions so far

- [Lock Canonical 800x720 Workshop Room Geometry and 1232x720 (800+432) Split World Scale](./issues/01-fixed-canonical-room-scale-and-split-world-dimensions.md): Keep `roomWidth = 800` and `chamberHeight = 720` invariant in all modes, size `Split` mode's `35%` Dungeon Wilds to `wildsWidth = 432` (`worldWidth = 1232`), and eliminate aspect-ratio floor stretching.

## Not yet specified

None — frontier is clear.

## Out of scope

- Redesigning individual station vector artwork or canonical station slot coordinates inside the `800 × 720` room.
