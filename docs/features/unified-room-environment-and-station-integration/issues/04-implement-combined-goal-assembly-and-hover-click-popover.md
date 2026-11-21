# Ticket 04: Implement Combined Goal Assembly Site (Task Grid + % Animated Artificer Machine) & Hover Title / Click Situation Popover

Type: `task`
Label: `ready-for-agent`
Status: resolved
Blocked by: 01, 02

## Description

1. Upgrade `src/web/canvas-assembly-painter.ts` (`renderGoalAssemblySite`) to render the combined **Goal Assembly Site**:
   - Ornate crimson & gold fringed rug (`01`) + riveted blue-grey steel grid plate (`10`) with 4 corner bolts.
   - L-shaped copper steam pipeline, red 4-spoke valve wheel, and brass pressure gauge whose needle angle scales with `completionPct = fittedCount / totalParts`.
   - Left half of the deck (`GOAL_ASSEMBLY_DECK_BOUNDS_PX`): dynamic grid of feature issue/task socket cards (`#01..#0N`, blueprint wireframe when `unbuilt`, vibrant fitted card when `fitted`).
   - Right half of the deck: 3 interlocking trapezoid-tooth spur gears (`16-tooth` gold, `12-tooth` brass, `10-tooth` copper), digital control console, and concentric copper/steel Tesla coil, progressively animating gear rotation speed, console screen telemetry/LEDs, and Tesla coil lightning arcs based on `completionPct`.
2. Upgrade `src/web/pointer-and-camera.ts` and `src/web/client-choreography.ts`:
   - Register `Alchemy Lab` in `PREPARATION_STATION_HITBOX_SPECS` alongside the existing stations.
   - On mouse-over (`handleScenePointerHover` when `pinnedTooltipTarget === null`), render a compact **Hover Title Pill** (`renderSceneHoverTitleHtml`) showing the station's title and status badge.
   - On click (`handleScenePointerClick`), pin the target (`clientState.pinnedTooltipTarget`) and render the full **Station Situation Popover** (`renderSceneTooltipHtml`) showing active tasks/occupants, recent tool calls, and produced artifacts/cargo.
