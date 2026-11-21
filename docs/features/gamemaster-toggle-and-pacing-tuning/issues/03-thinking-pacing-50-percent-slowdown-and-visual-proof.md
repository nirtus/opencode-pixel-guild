# 03: Thinking Pacing 50% Slowdown & Container Visual Verification

Type: task
Label: wayfinder:task
Status: resolved
Blocked by: 01, 02

## Question

How should characters pacing around the central **Goal Assembly Site** while `Thinking` be slowed down by `50%` without slowing down normal station-to-station walking transit?

## Specification

Confirmed in Grilling Round 1 (`Q1`, `Q4`) and [Feature Specification](./../spec.md):
- **Pacing Speed & Stride Cycle (`src/web/client-choreography.ts`, `src/web/station-and-workflow-routing.ts`, `src/web/canvas-hero-painter.ts`)**:
  - Export `TRANSIT_WALK_SPEED_PX_PER_SEC = 155` and `THINKING_PACING_SPEED_PX_PER_SEC = 77.5` (`50%` of `155 px/s`).
  - In `stepClientChoreography` (`src/web/client-choreography.ts`), when a character is actively pacing along `ASSEMBLY_PACING_SIDES` at the **Goal Assembly Site** (`activeSlot.station === "Assembly" && !activeSlot.isActing && walker.hasReachedAssemblyPacing && c.lifecycleState === "Thinking"`):
    - Step `compileCharacterToilQueue` and `stepCharacterToilQueue` with `speedPxPerSec = THINKING_PACING_SPEED_PX_PER_SEC` (`77.5 px/s`).
    - Increment `walker.walkCycle` at `50%` rate (`dtMs * 0.006` instead of `dtMs * 0.012`).
  - In `resolveCharacterTargetSlot` (`src/web/station-and-workflow-routing.ts`), change the initial pacing leg period from `2000ms` to `4000ms` (`Math.floor(timestampMs / 4000)`).
  - In `drawCharacterHero` (`src/web/canvas-hero-painter.ts`), when a character is walking during thinking-pacing (`isWalking && slot.station === "Assembly" && !slot.isActing`), scale the walk bobbing and sprite animation bucket cadence by `0.5`.
- **Automated Tests & Live Docker Visual Verification**:
  - Add unit and integration tests verifying the hidable Gamemaster icon toggle, the `65% / 35%` Room/Wilds split ratio and coordinate round-tripping, and the `50%` (`77.5 px/s`) thinking-pacing speed vs `155 px/s` station transit speed.
  - Deploy and verify on `opencode-pixel-guild-visualizer` (`npm run docker:up` on port `4310`), run `npm test`, and capture visual proof in `docs/images/`.

## Answer

Implemented `THINKING_PACING_SPEED_PX_PER_SEC = 77.5` (`50%` of `TRANSIT_WALK_SPEED_PX_PER_SEC = 155`), `dtMs * 0.006` stride cycle rate, `0.5x` bob/frame cadence in `drawCharacterHero`, and `4000ms` initial pacing leg period in `resolveCharacterTargetSlot`. Verified with unit tests in `tests/28-gamemaster-toggle-and-pacing-tuning.test.ts` and live Docker container visual proof in `docs/images/gamemaster-toggle-and-pacing-tuning.png` and `docs/images/gamemaster-hidden-and-split-65-35.png`.

## Acceptance Criteria

- [x] Characters actively pacing around the **Goal Assembly Site** in `Thinking` state (`hasReachedAssemblyPacing === true`) move at `77.5 px/s` (`50%` of `155 px/s`) with `50%` slower `walkCycle` (`dtMs * 0.006`) and a `4000ms` leg cadence.
- [x] Characters walking between stations (or walking toward the **Goal Assembly Site** before reaching it) continue moving at `155 px/s`.
- [x] All unit and architecture invariant tests pass (`npm test`, all `src/` files `<= 400` lines), and live container screenshots in `docs/images/` are visually verified.
