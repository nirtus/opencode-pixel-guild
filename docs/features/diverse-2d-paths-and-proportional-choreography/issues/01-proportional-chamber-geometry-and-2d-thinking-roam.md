# 01: Screen-Size Proportional Chamber Geometry & Full-Floor 2D Thinking Roaming Circuits

Type: task
Label: wayfinder:task
Status: claimed
Blocked by: None

## Question

How should we deepen `Thinking` roaming so characters utilize all four open floor plazas with horizontal, vertical, and diagonal 2D paths that adapt proportionally to screen/chamber dimensions while keeping `station-and-workflow-routing.ts` and `client-choreography.ts` well under 400 lines?

## Specification

Confirmed in Grilling Round 1 (`Q1`, `Q2`, `Q4`) and [Feature Specification](./../spec.md):
- **Proportional Chamber Geometry (`src/web/walker-separation.ts` / `src/scene/camera.ts`)**:
  - Define `ChamberProportionalContext { chamberWidth: number; chamberHeight: number; wildsWidth: number }` (defaulting to `800, 720, 800`).
  - Export `resolveProportionalAssemblyObstacleBox(chamberW = 800, chamberH = 720)`: projects the rendered **Goal Assembly Site** bounds (`center = (chamberW - 800)/2 + 390, (chamberH - 720)/2 + 345`, `halfW = 112, halfH = 92`) through `unanchorChamberPoint` so obstacle avoidance and open-plaza roaming adapt accurately when `chamberW` or `chamberH` expands/shrinks.
- **Full-Floor 2D `Thinking` Roaming Circuits (`src/web/walker-separation.ts` / `src/web/thinking-roam-circuits.ts`)**:
  - Define 2D multi-waypoint roaming circuits (`4..6` waypoints per circuit combining horizontal, vertical, and diagonal segments) across the four open floor plazas of the **Workshop Room**:
    - `top` / **North Esplanade Circuit** (`x: 178..535, y: 146..234`)
    - `right` / **East Grand Plaza Circuit** (`x: 516..742, y: 168..495`)
    - `left` / **West Artisan Promenade Circuit** (`x: 176..266, y: 202..508`)
    - `bottom` / **South Commons Circuit** (`x: 178..446, y: 444..562`)
  - Export `resolveThinkingRoamCircuit(pacingSide, sideOcc, sessionId, chamberCtx?)` returning `waypoints: ReadonlyArray<{ x: number; y: number }>` (`>= 4` non-collinear points with horizontal, vertical, and diagonal legs, each perturbed in 2D `(dx, dy)` by `hashRouteSeed("${sessionId}:${pacingSide}:${sideOcc}")` and clamped outside the proportional `Goal Assembly Site` box and station hitboxes).
  - Pull the `Thinking` target and waypoint advancement logic into `assignThinkingRoamTarget` and `advanceThinkingRoamLeg` so `src/web/station-and-workflow-routing.ts` and `src/web/client-choreography.ts` delegate cleanly without duplicating low-level `pacingLeg` mutations.
  - Preserve `ASSEMBLY_PACING_SIDES`, `resolveThinkingPacingSegment`, and `resolveThinkingPacingSlot` exports so existing tests in `tests/28-*` and `tests/29-*` continue to pass.

## Acceptance Criteria

- [ ] `resolveThinkingRoamCircuit` produces 4-to-6 waypoint 2D circuits across all four open floor plazas containing horizontal, vertical, and diagonal (`dx !== 0 && dy !== 0`) segments.
- [ ] Any two `Thinking` characters (even with `sideOcc === 0` or entering from the same station) receive distinct, non-collinear 2D waypoint loops.
- [ ] `resolveProportionalAssemblyObstacleBox(chamberW, chamberH)` adapts obstacle bounds proportionally as screen/chamber dimensions change.
- [ ] Every file in `src/` remains `<= 400` lines.
