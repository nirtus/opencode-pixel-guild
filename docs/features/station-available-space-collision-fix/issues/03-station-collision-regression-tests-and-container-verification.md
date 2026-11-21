# 03: Station Collision Regression Suite & Live Container Visual Verification

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01, 02

## Question

How do we verify with deterministic unit/simulation tests and live Docker container visual proof that multiple **Guild Characters** never collide and fail to reach a **Preparation Station**?

## Specification

Confirmed in Grilling Round 1 (`Q1–Q4`) and [Feature Specification](./../spec.md):
- **Comprehensive Regression Tests (`tests/29-anti-overlap-walking-choreography.test.ts` or dedicated test suite)**:
  1. Verify that all 6 perimeter slots for every **Preparation Station** (`Library`, `Spyglass`, `Forge`, `Tinker`, `Armory`, `Enchanter`, `Stockpile`, `Alchemy`, `Assembly`, and `Combat`) have pairwise distance `>= 38px` and valid inward **Directional Turnaround**.
  2. Simulate 4 to 6 **Guild Characters** simultaneously dispatched to the same **Preparation Station** (both via direct `activeCapability` and via multi-step `recentTools` `slotQueue` transitions where earlier sessions transition to `Thinking` while still walking/dwelling at the station), stepping `stepClientChoreography` across frames, and assert that **every** character reaches `isWalking === false` (`dist <= 3`) at a distinct non-overlapping perimeter slot (`>= 24px` apart) and enters acting state.
  3. Simulate two walkers forcibly initialized with identical station target coordinates `(195, 135)` approaching from the corridor, and assert that instead of fighting endlessly at `dist > 3`, they take available space and both settle into `isWalking === false` (`dist <= 3`) at the station.
- **Docker Container Deployment & Visual Proof (`npm run docker:up` on port `4310`)**:
  - Run `npm test` and `tests/00-architecture-invariants.test.ts` to verify all unit and architecture guard tests pass (`<= 400` lines per file in `src/`).
  - Deploy to `opencode-pixel-guild-visualizer` on port `4310` (`npm run docker:up`), capture a live screenshot at `docs/images/station-available-space-collision-fix.png`, and visually inspect the rendered output using `read`.

## Answer

Added `Ticket 04 (Slice 1)` and `Ticket 04 (Slice 2)` regression tests to `tests/29-anti-overlap-walking-choreography.test.ts`, verified all 243 tests pass across 104 suites (`npm test`), deployed to the `opencode-pixel-guild-visualizer` Docker container on port `4310` (`npm run docker:up`), and captured and visually inspected `docs/images/station-available-space-collision-fix.png`.

## Acceptance Criteria

- [x] Automated tests verify `>= 38px` pairwise perimeter slot spacing, multi-character station arrival (`isWalking === false` for all characters), and zero walk-and-repel deadlock on conflicting targets.
- [x] All existing and new tests pass (`npm test`), and every file under `src/` is `<= 400` lines.
- [x] Live Docker container (`opencode-pixel-guild-visualizer` on port `4310`) is deployed, verified healthy, and visually inspected via `docs/images/station-available-space-collision-fix.png`.
