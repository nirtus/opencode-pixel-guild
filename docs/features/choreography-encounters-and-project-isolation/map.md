# Feature Map: Character Choreography, Station Gestures, Project World Isolation & Memory Stabilization

## Destination

Deliver a fluid, high-definition guild simulator where characters smoothly walk between stations along projected paths without teleporting, perform station-specific acting gestures (hammering, reading, brewing, rune channeling, cat resting, wilds combat), summon subagents with floor spellcasting FX, physically haul finished feature components to the platform, display the active feature's custom title on the monument, isolate project world rooms without cross-project leaking, and run indefinitely without memory leaks via persistent offscreen canvas caching.

## Notes

- **Domain**: 2D Canvas choreography, path interpolation, Fog of War radial masking, OpenCode project world isolation.
- **Rules**: Strictly use the project root directory (`./`). Never create external worktrees or use `/tmp/opencode`.
- **Preservation Rule**: Do not delete anything from the `docs/` folder.
- **Skills to consult**: `codebase-design`, `domain-modeling`, `tdd`.

## Decisions so far

<!-- index of resolved tickets: one line per closed ticket -->

- [01: Reusable Offscreen Canvas & OOM Memory Leak Fix](./issues/01-reusable-offscreen-canvas-and-oom-leak-fix.md): Replaced per-frame canvas allocation in Fog of War with persistent cached offscreen buffer, eliminating the 138 MB/sec memory leak and OOM crash.
- [02: Project World Isolation & Canvas Room Switching](./issues/02-project-world-isolation-and-canvas-room-switching.md): Isolates canvas rendering to the active Project World, draws the north wall title banner, filters rendered characters, and seeds matching wilderness themes.
- [03: Smooth Walking Choreography & Projected Pathlines](./issues/03-smooth-walking-choreography-and-projected-pathlines.md): Implemented persistent position interpolation at 135 px/sec with step bobbing, directional sprite flipping, and glowing dashed projected pathlines.
- [04: Station-Specific Acting Gestures](./issues/04-station-specific-acting-gestures.md): Implemented distinctive station acting gestures (hammer strikes, manuscript reading, cauldron stirring, rune levitation, combat thrusting) in drawVectorHero.
- [05: In-Place Subagent Summoning Ritual Spellcast FX](./issues/05-in-place-subagent-summoning-ritual-spellcast-fx.md): Implemented in-place parent spellcasting rituals with expanding floor pentagrams, rotating runes, and vertical light beams.
- [06: Physical Part Hauling & Dynamic Feature Monument Naming](./issues/06-physical-part-hauling-and-dynamic-feature-monument-naming.md): Implemented golden snap particle bursts upon part fitting and visually fitted monument header text (<feature title> (x/y built)).

## Not yet specified

- **Multi-Agent Collision Avoidance**: Advanced flocking / boids avoidance when more than 10 agents walk through the same narrow doorway simultaneously.
- **Dynamic Floor Rug Color Customization**: Customizable floor rugs matching user-defined team colors.

## Out of scope

- Deleting existing design sketches, visual assets, or specifications in `docs/`.
- 3D rendering engines or WebGL pipelines.
- Modifying OpenCode V2 HTTP daemon protocols or daemon-side telemetry schemas.
