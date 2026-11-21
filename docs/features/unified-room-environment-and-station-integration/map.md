# Wayfinder Map: Unified Room Environment, 1:1 Compact Stations & Combined Goal Assembly

Label: `wayfinder:map`

## Destination

Produce a locked-in visual and architectural specification (`./spec.md`) and interactive prototype (`../../architecture-review/architecture-review-graphics-environments-20261025.html`) for integrating all 11 exact 1:1 `docs/examples/rooms/01..10@1x.png` workstations into a single **Seamless Open-Plan Guildhall** with `0.40×` (60% smaller) perimeter station footprints, hover-only station titles, click-to-open **Station Situation Popover** cards, and a combined **Goal Assembly Site** pairing the feature task-card grid with percentage-driven `10 Artificer's Workshop` machine animations.

## Notes

- **Domain vocabulary**: Consult `./GLOSSARY.md` (`Workshop Room`, `Preparation Station`, `Goal Assembly Site`, `Assembly Part`, `Resource Stockpile`, `Resource Cargo`, `Break Lounge`, `Demolition Bomb`, `Toil Queue`).
- **Visual ground truth**: Every station and central machine element must match the exact 1:1 vector composition, palette, `#26170d` outlines, and lighting of `docs/examples/rooms/01..10@1x.png`.

## Decisions so far

- [Seamless Open-Plan Guildhall with 60% Smaller (0.40×) Stations, Hover Titles & Click Situation Popover](./issues/01-seamless-room-scale-and-hover-click-popover.md): Lock in Variant 1A (Seamless Open-Plan Guildhall with 60% smaller `0.40×` footprints for Library, Observatory, Smithy Forge, Tinker Bench, Arcane Lectern, Resource Stockpile, Alchemy Lab, and Demolition Bomb), remove permanent canvas station titles (show title only on mouse-over), and open an interactive Station Situation Popover on click showing active tasks, occupants, and artifacts.
- [Combined Goal Assembly Site Task-Card Grid & Percentage-Driven Artificer Machine Animation](./issues/02-combined-goal-assembly-grid-and-progressive-machine-animation.md): Combine the feature issue/task socket card grid (`#01..#0N`) on the left half of the central `10 Artificer's Workshop` steel deck with the 3 interlocking spur gears, copper steam manifold & pressure gauge, digital control console, and Tesla coil on the right half, progressively animating each machine subsystem as total task completion percentage rises from 0% to 100%.
- [Ticket 03: Implement Seamless Open-Plan Guildhall & 1:1 Compact (0.40×) Station Painters Without Static Titles](./issues/03-implement-seamless-room-and-compact-1to1-stations.md): Extracted `src/web/canvas-station-painter.ts` and updated `src/web/canvas-room-painter.ts` to render the Seamless Open-Plan Guildhall with 0.40× compact 1:1 reference stations and zero permanent station title labels.
- [Ticket 04: Implement Combined Goal Assembly Site (Task Grid + % Animated Artificer Machine) & Hover Title / Click Situation Popover](./issues/04-implement-combined-goal-assembly-and-hover-click-popover.md): Upgraded `src/web/canvas-assembly-painter.ts`, `src/web/pointer-and-camera.ts`, and `src/web/client-choreography.ts` to render the combined task-card grid + percentage-driven Artificer machine and hover-title / click-situation popover.

## Not yet specified

_None — all visual, spatial, and interaction decisions for the unified room environment and workstation overhaul are resolved and ready for implementation._

## Out of scope

- Multi-room interior partition walls or separate boxed sub-rooms inside the Workshop Room (ruled out in favor of the Seamless Open-Plan Guildhall).
