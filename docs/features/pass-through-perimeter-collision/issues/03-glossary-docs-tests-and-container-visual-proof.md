# 03: Glossary Domain Update, Regression Suite & Container Visual Proof

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01, 02

## Question

How do we codify **Personal Perimeter**, pass-through transit, and the grace period in `GLOSSARY.md` and `README.md`, verify all invariants in automated tests, and confirm the live visual behavior on the Docker container?

## Specification

1. Update `GLOSSARY.md` to add **Personal Perimeter** and refine **Toil Queue** and **Preparation Station** definitions to reflect smooth pass-through transit, non-overlapping settled perimeters, and grace-period smoothing.
2. Update `README.md` to document smooth pass-through character transit, **Personal Perimeter** non-stop continuation, and the anti-jitter grace period.
3. Add `tests/36-pass-through-perimeter-collision-and-grace-period.test.ts` (and align `tests/29-anti-overlap-walking-choreography.test.ts`) verifying:
   - Head-on and stationary-blocker pass-through transit without detour spikes, lateral shoving, or backward push.
   - Non-stop-while-overlapping invariant: walkers whose target falls inside another character's **Personal Perimeter** continue walking smoothly until outside the perimeter (`>= 36px` radial / outside `46×34px` ellipse) before setting `isWalking = false`.
   - Grace period timers (`PASS_THROUGH_OVERLAP_GRACE_MS = 450`, `ROUTE_RETARGET_GRACE_MS = 500`, `STATION_ACTION_DWELL_GRACE_MS = 750`) suppress mid-overlap and mid-route jitter.
4. Deploy to `opencode-pixel-guild-visualizer` via `npm run docker:up`, run `npm test`, capture `docs/images/pass-through-perimeter-collision.png`, and visually inspect the rendered output.

## Answer

Updated `GLOSSARY.md` (adding **Personal Perimeter** and updating **Toil Queue**) and `README.md`, added `tests/36-pass-through-perimeter-collision-and-grace-period.test.ts`, aligned `tests/29-anti-overlap-walking-choreography.test.ts`, deployed to the `opencode-pixel-guild-visualizer` Docker container on port `4310` (`Up (healthy)`), and captured + visually inspected `docs/images/pass-through-perimeter-collision.png`.

## Acceptance Criteria

- [x] `GLOSSARY.md` and `README.md` are updated.
- [x] `npm test` passes 100% including `tests/00-architecture-invariants.test.ts` and `tests/36-pass-through-perimeter-collision-and-grace-period.test.ts`.
- [x] Live Docker container on port `4310` is healthy and visually verified via `docs/images/pass-through-perimeter-collision.png`.
