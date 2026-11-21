# Wayfinder Map: Proportional North-Wall Stockpile, Weapon-Following Combat Trails, Resize-Aligned Wilds Trail & Gamemaster Demolish Button

## Destination

Deliver the complete specification and implementation tickets (`docs/features/north-wall-stockpile-combat-trail-and-gm-demolish/spec.md`) for:
1. Moving the **Resource Stockpile** to the north wall between **Observatory Spyglass** and **Anvil Forge** (shifting **Observatory Spyglass** left so all four north-wall stations are proportionally spaced and the **South Swinging Guild Door** entrance is unobstructed),
2. Making combat weapon FX arcs follow the weapon swing with peak brightness right next to the weapon and a fading tail,
3. Aligning the **Dungeon Wilds** brown trail with the **Workshop Room** East Archway doorway across all screen sizes, and
4. Removing the **Demolition Bomb** station from the canvas and placing a `💣 Demolish Room` button in the Gamemaster (`General` / **Guild Master Ledger**) section.

## Notes

- Domain terms: **Resource Stockpile**, **Preparation Station**, **Combat Weapon Archetype**, **Dungeon Wilds**, **Demolition Bomb**, **Guild Master Ledger** (`GLOSSARY.md`).
- Container verification rule: Must be deployed to and tested on the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`, see `docs/agents/container-deployment.md`).

## Decisions so far

- [Proportional North-Wall Stockpile & Unobstructed South Entrance](./issues/01-proportional-north-wall-stockpile-and-clear-south-entrance.md): Space `Library` (`x=116`), `Spyglass` (`x=284`), `Stockpile` (`x=452`), and `Anvil Forge` (`x=662`) proportionally along the north wall (`y ≈ 82..86`) and clear the south doorway entrance.
- [Weapon-Following Combat FX with Tip-Bright / Tail-Fading Gradient](./issues/02-weapon-following-fading-combat-fx-arcs.md): Drive combat FX arcs/trails from `animPhase` so they follow the weapon swing, glow brightest next to the weapon tip (`100%` opacity), and fade to `0%` opacity at the tail.
- [Align Dungeon Wilds Brown Trail with East Archway Across Resizes](./issues/03-align-wilds-brown-trail-with-east-archway-across-resizes.md): Anchor both the East Wall Iron Archway center and the Dungeon Wilds brown trail start (`p0`) to `gateCenterY = anchorChamberPoint(..., 352, w, h).y`.
- [Remove Canvas Demolition Bomb & Add Gamemaster Demolish Button](./issues/04-remove-canvas-bomb-and-add-gamemaster-demolish-button.md): Remove the bomb fixture and hitbox from the Workshop Room canvas and add a `💣 Demolish Room` button in the Gamemaster (`General`) section that opens `#demolition-modal`.

## Not yet specified

*(None — all decisions resolved with user confirmation; ready for implementation in `build` mode.)*

## Out of scope

- Altering the server-side `DELETE /api/guild/room` teardown endpoint.
