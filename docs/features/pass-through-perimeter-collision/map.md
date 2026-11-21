# Wayfinder Map: Pass-Through Character Transit, Personal Perimeters & Action Grace Period

Label: wayfinder:map

## Destination

Deliver the complete specification ([`./spec.md`](./spec.md)) and implementation for smooth pass-through character collisions, non-overlapping settled **Personal Perimeters** (characters never stop until outside each other's perimeter), and a three-part **Grace Time Period** (`450ms` overlap grace, `500ms` route-retargeting grace, `750ms` station action dwell grace) across three child tickets:
1. [01: Pass-Through Transit & Personal Perimeter Non-Stop Exit Continuation](./issues/01-pass-through-transit-and-perimeter-exit-continuation.md) (`Blocked by: None`)
2. [02: Collision & Action Grace Period Smoothing in Client Choreography](./issues/02-collision-and-action-grace-period-smoothing.md) (`Blocked by: 01`)
3. [03: Glossary Domain Update, Regression Suite & Container Visual Proof](./issues/03-glossary-docs-tests-and-container-visual-proof.md) (`Blocked by: 01, 02`)

## Notes

- **Mode**: Plan + Execute (locked via Wayfinder grilling & domain-modeling with the user).
- **Domain**: `Personal Perimeter` and `Toil Queue` in `./GLOSSARY.md`.
- **Specification**: [`./spec.md`](./spec.md)
- **Standing Rules**:
  - Work strictly inside `./` (never `/tmp/opencode` or external worktrees).
  - Keep every source file under `src/` `<= 400` lines (`tests/00-architecture-invariants.test.ts`).
  - Update `GLOSSARY.md` and `README.md`, and verify on the live `opencode-pixel-guild-visualizer` Docker container (`http://127.0.0.1:4310`).

## Decisions so far

- [Specification: Pass-Through Character Transit, Personal Perimeter Non-Stop Invariant & Action Grace Period](./spec.md): Moving characters pass smoothly through one another in transit without detour spikes or lateral shoving, maintain their own `36px` radial / `46×34px` elliptical **Personal Perimeter** when settling (never stopping until outside every other character's perimeter), and apply a three-part grace period (`450ms` pass-through overlap grace, `500ms` route-retargeting grace, `750ms` station action dwell grace) to eliminate jitter.
- [01: Pass-Through Transit & Personal Perimeter Non-Stop Exit Continuation](./issues/01-pass-through-transit-and-perimeter-exit-continuation.md): Created `src/web/perimeter-pass-through.ts` and updated `enforceWalkerPersonalSpace` in `src/web/walker-separation.ts` so walking characters pass through each other unimpeded and `resolveSmoothPerimeterExitTarget` extends any overlapping arrival walk until outside all neighbors' perimeters.
- [02: Collision & Action Grace Period Smoothing in Client Choreography](./issues/02-collision-and-action-grace-period-smoothing.md): Wired `PASS_THROUGH_OVERLAP_GRACE_MS = 450`, `ROUTE_RETARGET_GRACE_MS = 500`, and `STATION_ACTION_DWELL_GRACE_MS = 750` into `WalkerState` (`src/web/client-state.ts`) and `stepClientChoreography` (`src/web/client-choreography.ts`).
- [03: Glossary Domain Update, Regression Suite & Container Visual Proof](./issues/03-glossary-docs-tests-and-container-visual-proof.md): Updated `GLOSSARY.md` and `README.md`, added `tests/36-pass-through-perimeter-collision-and-grace-period.test.ts`, and verified on the live `opencode-pixel-guild-visualizer` Docker container (`docs/images/pass-through-perimeter-collision.png`).

## Not yet specified

<!-- All fog cleared and all tickets resolved. -->

## Out of scope

- Changing canonical **Workshop Room** (`800×720`) or **Dungeon Wilds** (`800×720`) dimensions or **Preparation Station** coordinate tables.
