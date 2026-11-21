# Feature Map: Anti-Overlap Walking Choreography, Corridor Lane Diversity & Personal-Space Separation

Label: wayfinder:map

## Destination

Deliver the complete anti-occlusion walking and station choreography specification in [Specification: Anti-Overlap Walking Choreography, Corridor Lane Diversity & Personal-Space Separation](./spec.md) through three vertical-slice implementation tickets:
1. **[01: De-Synchronized Corridor Lanes, Route Diversity & Individual Stride Variance](./issues/01-corridor-lane-jitter-and-route-diversity.md)** (`Blocked by: None`)
2. **[02: Dedicated Inner Thinking-Pacing Track & Target Slot De-Collision](./issues/02-dedicated-inner-pacing-track-and-target-decollision.md)** (`Blocked by: 01`)
3. **[03: Dynamic In-Transit Steering, Personal-Space Separation & Container Visual Verification](./issues/03-dynamic-walker-separation-and-visual-proof.md)** (`Blocked by: 01, 02`)

## Notes

- **Mode**: Wayfinder charting & specification complete (`map.md`, `spec.md`, and tickets `01..03` created; `GLOSSARY.md` updated).
- **Domain**: **Toil Queue**, **Guild Character**, **Guild Adventurer**, **Squad Subagent**, **Goal Assembly Site**, **Preparation Station**, **Report Scroll**.
- **Specification**: [Feature Specification](./spec.md).
- **Skills to consult**: `codebase-design`, `domain-modeling`, `tdd`, `code-review`.
- **Standing Rules**: Work strictly inside the project root directory (`./`). Never create git worktrees or write files to `/tmp` or `/tmp/opencode`. Every source file in `src/` must remain `<= 400` lines (`src/web/client-choreography.ts` is currently 399 lines and `src/web/station-and-workflow-routing.ts` is 385 lines, so extract new walker separation/lane logic into `src/web/walker-separation.ts`). Deploy and verify on the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`) with visual proof in `docs/images/`.

## Decisions so far

- [Specification: Anti-Overlap Walking Choreography, Corridor Lane Diversity & Personal-Space Separation](./spec.md): Locked all four Grilling Round 1 decisions (`Q1–Q4`) and updated `GLOSSARY.md` (`Toil Queue`):
  1. Extend `computeRingCorridorWaypoints` with session-seeded corridor lane offsets (`±12..22px`) and clockwise/counter-clockwise route diversity around `GOAL_ASSEMBLY_OBSTACLE_BOX` for near-tie paths (`<= 22%` length difference), paired with `±12%` per-character stride speed variance and a `0..180ms` reaction stagger on simultaneous transitions.
  2. Separate the `Thinking` pacing ring (`ASSEMBLY_PACING_SIDES`) onto a dedicated inner track around the **Goal Assembly Site** (`top: y=228, bottom: y=452, left: x=258, right: x=522`), partition shared pacing sides into non-overlapping sub-segments, pass the live `stationOccupantCounts` map to `resolveToolRecordTargetSlot`, and fan out multiple `ReportingScroll` subagents around their parent adventurer.
  3. Enforce continuous personal-space separation (`src/web/walker-separation.ts`) via in-transit lateral steering avoidance (`< 28px` threshold) and a post-step minimum pairwise distance clamp (`>= 24px`) so no two visible characters ever cover each other.
- [01: De-Synchronized Corridor Lanes, Route Diversity & Individual Stride Variance](./issues/01-corridor-lane-jitter-and-route-diversity.md): Extended `computeRingCorridorWaypoints` and `compileCharacterToilQueue` with `routeSeed` support, `±12..22px` corridor corner/portal lane jitter, clockwise/counter-clockwise route diversity around `GOAL_ASSEMBLY_OBSTACLE_BOX` for near-tie paths (`<= 22%` length difference), `±12%` per-character stride speed variance (`resolveCharacterWalkSpeed`), and `35..180ms` simultaneous transition departure stagger (`resolveDepartureStaggerMs`).
- [02: Dedicated Inner Thinking-Pacing Track & Target Slot De-Collision](./issues/02-dedicated-inner-pacing-track-and-target-decollision.md): Moved `ASSEMBLY_PACING_SIDES` onto the dedicated inner pacing ring (`y=228`, `y=452`, `x=258`, `x=522`), partitioned multi-occupant pacing sides into non-overlapping sub-segments (`resolveThinkingPacingSegment` / `resolveThinkingPacingSlot`), incremented `stationOccupantCounts` in `resolveToolRecordTargetSlot`, and fanned out `ReportingScroll` subagents around their parent adventurer (`resolveReportingScrollSlotOffset`).
- [03: Dynamic In-Transit Steering, Personal-Space Separation & Container Visual Verification](./issues/03-dynamic-walker-separation-and-visual-proof.md): Extracted `src/web/walker-separation.ts`, wired in-transit lateral steering avoidance (`< 28px`) and post-step personal-space separation (`>= 24px`) into `stepClientChoreography`, added `tests/29-anti-overlap-walking-choreography.test.ts`, and verified on the `opencode-pixel-guild-visualizer` Docker container (`docs/images/anti-overlap-walking-choreography.png`).

## Not yet specified

<!-- All wayfinder fog has graduated into spec.md and tickets 01..03 -->

## Out of scope

- Changing the base station-to-station average transit speed (`155 px/s`) or base thinking-pacing average speed (`77.5 px/s`) beyond the `±12%` per-character stride variance.
- Altering the 128×128 hero sprite dimensions or `0.7x` subagent scale ratio.
