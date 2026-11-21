# Seamless Open-Plan Guildhall with 60% Smaller (0.40×) Stations, Hover Titles & Click Situation Popover

Type: `prototype`
Label: `wayfinder:prototype`
Status: resolved

## Question

How should the 1:1 `docs/examples/rooms/01..10@1x.png` workstations be scaled and arranged inside a single unified `800×720` Workshop Room, and how should station titles and live station telemetry be presented without cluttering the floorplan?

## Answer

1. **Seamless Open-Plan Guildhall (`Variant 1A`)**:
   - Render one continuous staggered oak-plank floor across the entire Workshop Room with a rounded chiseled-stone hearth pad under the NE `Anvil Forge` and soft radial ambient light pools around the `Library Study Bookshelf`, `Observatory Spyglass`, `Anvil Forge`, `Arcane Lectern`, `Alchemy Lab`, and `Break Lounge` hearth.
   - Scale the 8 perimeter workstations (`Library Study`, `Observatory Spyglass`, `Anvil Forge`, `Crafting Workbench`, `Arcane Lectern`, `Resource Stockpile`, `Alchemy Lab`, and `Demolition Bomb`) to **60% smaller footprints (`0.40×` scale)** tucked along the perimeter walls so a wide, unobstructed `Toil Queue` walking corridor surrounds the central `Goal Assembly Site`.
2. **Zero Static Station Titles on Canvas (Mouse-Over Title Pill)**:
   - Remove all permanent floating station title banners from the Workshop Room canvas.
   - Display a floating station title pill only when the user hovers over a station hitbox.
3. **Click-to-Open Station Situation Popover**:
   - Clicking any station opens an interactive tooltip/popover card anchored near the station showing its current live situation: active characters working at the station, current/recent OpenCode tool tasks, and produced artifacts/files/cargo.
   - Prototype asset: `../../architecture-review/architecture-review-graphics-environments-20261025.html`
