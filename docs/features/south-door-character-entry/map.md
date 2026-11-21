# Wayfinder Map: South Guild Door Character Entry Choreography

## Destination

Ensure every newly spawned root **Guild Adventurer** enters the **Workshop Room** through the **South Swinging Guild Door** at the bottom wall (`(400, 692)`, facing `"north"`) and walks along the unobstructed corridor into the room toward its target station, **Goal Assembly Site** pacing ring, or **Break Lounge** slot (`docs/features/south-door-character-entry/spec.md`), never materializing out of another character or at a random station/pacing coordinate.

## Notes

- Domain terms: **Guild Adventurer**, **Squad Subagent**, **Workshop Room**, **Toil Queue**, **Directional Turnaround**, **Resource Stockpile** (`GLOSSARY.md`).
- Container verification rule: Must be deployed to and tested on the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`, see `docs/agents/container-deployment.md`).

## Decisions so far

- [Spawn New Characters at South Guild Door & Route Around Stockpile](./issues/01-spawn-new-characters-at-south-guild-door.md): Spawn newly arriving/entering root **Guild Adventurers** at `SOUTH_GUILD_DOOR_ENTRANCE` `(400, 692)` facing `"north"`, eliminate the bogus `"Entering"` detour to `Enchanter`/`Spyglass`, preserve `knownSessionIds` arrival detection across frames, and route the doorway entry path around the **Resource Stockpile** table.

## Not yet specified

*(None — all decisions resolved; ready for implementation in `build` mode.)*

## Out of scope

- Changing **Squad Subagent** summoning portal choreography (`PENTAGRAM_CENTER` at `(206, 624)`).
