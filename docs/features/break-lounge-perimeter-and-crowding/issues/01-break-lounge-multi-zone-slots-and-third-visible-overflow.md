# Issue 01: Break Lounge Multi-Zone Space Filling & One-Third Visible Overflow Crowding

Type: task
Label: ready-for-agent
Status: resolved

## Goal

Update **Break Lounge** seat allocation (`src/web/station-geometry-catalog.ts` and `src/web/station-and-workflow-routing.ts`) so resting **Guild Adventurers**:
1. Never hide completely behind each other.
2. First fill all available space around the crimson carpet (`(622, 632)`) and next to the other **Break Lounge** objects (green armchair, hearth fireplace, ale barrel rack, and open lounge floor pockets — `20` distinct primary slots).
3. Only when all `20` primary **Break Lounge** slots are filled (`loungeSeatIndex >= 20`), stagger overflow characters behind existing slots (`dy = -22`, `dx = ±16` per tier, rendered behind via Y-depth sorting) so at least one-third (`>= 33%`) of each overflow character's body remains visible behind the character in front.

## Acceptance Criteria

1. **`LOUNGE_SEAT_SLOTS` (`src/web/station-geometry-catalog.ts`)**:
   - Expand `LOUNGE_SEAT_SLOTS` to `20` distinct primary slots covering:
     - Around the crimson carpet & round tavern table (`8` slots with staggered `x` coordinates and inward `DirectionalTurnaround`).
     - Next to the green armchair, hearth fireplace, ale barrel rack, and open **Break Lounge** floor (`12` slots).
   - Add `resolveLoungeSeatSlot(loungeSeatIndex: number): StationPerimeterSlotSpec` in `src/web/station-geometry-catalog.ts`:
     - For `0 <= loungeSeatIndex < LOUNGE_SEAT_SLOTS.length`, returns `LOUNGE_SEAT_SLOTS[loungeSeatIndex]` directly (filling all available resting area space before any stacking occurs).
     - For `loungeSeatIndex >= LOUNGE_SEAT_SLOTS.length` (`overflowTier >= 1`), computes a staggered behind-offset (`dy = -22 * overflowTier`, `dx = ±16 * ceil(overflowTier / 2)`, clamped within lounge bounds `x: 458..746, y: 540..690`) so at least one-third (`>= 18px` offset) of the character's sprite is visible behind the front occupant.
2. **`resolveCharacterTargetSlot` (`src/web/station-and-workflow-routing.ts`)**:
   - Call `resolveLoungeSeatSlot(loungeSeatIndex)` instead of `LOUNGE_SEAT_SLOTS[loungeSeatIndex % LOUNGE_SEAT_SLOTS.length]`.
3. **Tests & Container Verification (`tests/11-articulated-character-graphics-and-fx-overhaul.test.ts` & `docs/agents/container-deployment.md`)**:
   - Add unit tests verifying that:
     - The first `20` resting characters in the **Break Lounge** occupy `20` distinct, non-overlapping positions around the carpet and beside the armchair, hearth, and barrel rack (`min pairwise distance >= 24px`).
     - Overflow characters (`loungeSeatIndex >= 20`) never land on the same `(x, y)` as any primary slot and maintain `>= 18px` (`>= 1/3` body dimension) visible offset behind the front character.
   - Deploy to the Docker container (`npm run docker:up`), verify `docker ps` and `npm test`, and capture/inspect `docs/images/break-lounge-perimeter-and-crowding.png`.

## Answer

Implemented 20 multi-zone primary **Break Lounge** slots (`LOUNGE_SEAT_SLOTS` in `src/web/station-geometry-catalog.ts`) spanning three vertically-cleared bands (`y = 528`, `y = 612`, `y = 684`) around the crimson carpet & round tavern table (`(622, 632)`), green lounge armchair, hearth fireplace, ale barrel rack, and open lounge floor, plus `resolveLoungeSeatSlot(loungeSeatIndex)` in `src/web/station-geometry-catalog.ts` and `src/web/station-and-workflow-routing.ts` which staggers overflow crowds (`loungeSeatIndex >= 20`) behind (`dy = -24 * tier`, `dx = ±18`) with `>= 1/3` body visibility.

- **Container Verification**: Deployed via `npm run docker:up` (`opencode-pixel-guild-visualizer` `Up (healthy)` on `0.0.0.0:4310->4310/tcp`), verified unit tests (`tests/11-articulated-character-graphics-and-fx-overhaul.test.ts` 7/7 passing), and visually verified `docs/images/break-lounge-perimeter-and-crowding.png`.
