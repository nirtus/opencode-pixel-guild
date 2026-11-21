# Specification: Unified Room Environment, 1:1 Compact Stations, Station Situation Popover & Combined Goal Assembly

## Overview

Upgrade the Workshop Room environment, Preparation Stations, in-room fixtures, and central Goal Assembly Site to exact 1:1 visual fidelity with `docs/examples/rooms/01..10@1x.png` inside a single **Seamless Open-Plan Guildhall** (`Variant 1A`).

## Requirements

1. **Seamless Open-Plan Guildhall & 1:1 Compact (`0.40×`) Perimeter Workstations**:
   - Render one continuous staggered oak-plank floor across the Workshop Room with coursed brick perimeter walls, 3 paned north windows casting angled warm daylight shafts, a rounded chiseled-stone hearth pad in the NE forge corner, soft radial ambient light pools, an East Wilderness iron archway gate, and a South swinging guild door.
   - Render all 8 compact perimeter stations (`Library Study Bookshelf` from `01`, `Observatory Spyglass` from `05`, `Anvil Forge` from `02`, `Crafting Workbench` from `10`, `Arcane Lectern` from `06`, `Resource Stockpile` from `04/05/07`, `Alchemy Lab` from `04`, and `Demolition Bomb`) at **60% smaller (`0.40×`) footprints** along the perimeter walls, alongside `Armory Wardrobe` (`07`) and `Break Lounge` (`09` + `01` sleeping cat).
2. **Hover-Only Station Titles & Click-to-Open Station Situation Popover**:
   - Remove all permanent station title pills from the Workshop Room canvas.
   - Show a floating station title pill only on mouse-over (`hoveredHitbox`).
   - Clicking a station opens/pins a **Station Situation Popover** displaying the station's name, tool category, active characters currently working there, current/recent OpenCode tasks executed at that station, and produced artifacts/files/cargo.
3. **Combined Central `Goal Assembly Site` (Task-Card Grid + Percentage-Animated `10 Artificer's Workshop` Machine)**:
   - Render the central riveted steel deck on the crimson & gold fringed rug with the L-shaped copper steam manifold, red valve wheel, and brass pressure gauge along the top/right edge.
   - Left half of the deck: render the grid of feature issue/task cards (`#01..#0N`, blueprint wireframe when unbuilt, vibrant fitted card when completed).
   - Right half of the deck: render the 3 interlocking trapezoid-tooth spur gears, digital control console, and Tesla coil, progressively animating gear rotation speed, pressure gauge needle angle, console screen telemetry, and Tesla coil lightning arcs according to the percentage of total tasks completed (`0%` to `100%`).
