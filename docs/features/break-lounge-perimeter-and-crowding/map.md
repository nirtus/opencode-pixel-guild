# Wayfinder Map: Break Lounge Multi-Zone Space Filling & One-Third Visible Overflow Crowding

## Destination

Ensure resting **Guild Adventurers** in the **Break Lounge** never hide completely behind each other (`docs/features/break-lounge-perimeter-and-crowding/spec.md`): characters first fill all available space around the crimson carpet (`(622, 632)`) and beside the other **Break Lounge** objects (green armchair, hearth fireplace, ale barrel rack, and open lounge floor — `20` distinct primary slots), and only when all `20` primary slots are occupied do additional characters stagger behind (`dy = -22`, `dx = ±16`) so at least one-third (`>= 33%`) of each character remains visible.

## Notes

- Domain terms: **Break Lounge**, **Guild Adventurer**, **Directional Turnaround**, **Workshop Room** (`GLOSSARY.md`).
- Container verification rule: Must be deployed to and tested on the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`, see `docs/agents/container-deployment.md`).

## Decisions so far

- [Break Lounge Multi-Zone Space Filling & One-Third Visible Overflow Crowding](./issues/01-break-lounge-multi-zone-slots-and-third-visible-overflow.md): Fill 20 distinct primary slots around the crimson carpet and beside the armchair, hearth fireplace, barrel rack, and open lounge floor first; only stagger behind (`dx = ±16px, dy = -22px`, `>= 1/3` visible) when `loungeSeatIndex >= 20`.
- [Sticky Break Lounge Seat Allocation & Stationary Pose Lock (Zero Walking Oscillation or Seat Overlap)](./issues/02-sticky-lounge-seat-allocation-and-stationary-pose-lock.md): Retain sticky `assignedSlotIdx` for **Break Lounge** occupants across roster/world re-sorts, sync `tail.x / tail.y` in `enqueueStationJob`, prevent `shouldEnterViaSouthDoor` from triggering on `RestingInLounge` / `Archived` characters, and make stationary anchored walkers immovable (`weight = 0`) in `enforceWalkerPersonalSpace` so resting characters never collide on the same seat or oscillate in `pose-walk`.

## Not yet specified

*(None — all decisions resolved; ready for implementation in `build` mode.)*

## Out of scope

- Resizing the `800×720` **Workshop Room** chamber dimensions.
