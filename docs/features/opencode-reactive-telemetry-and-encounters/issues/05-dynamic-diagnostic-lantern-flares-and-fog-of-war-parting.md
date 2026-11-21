# 05: Dynamic Diagnostic Lantern Flares & Fog of War Parting

Type: task
Label: ready-for-agent
Status: resolved

## Question

How can diagnostic tools (`read`, `grep`, `glob`, `diagnosing-bugs`) automatically ignite expanding Lantern Flares in the outdoor wilderness to reveal monster clues and clear the 2D Fog of War byte grid without manual button clicks?

## Specification

- In `src/encounter/lantern-flares.ts`, `src/encounter/fog-of-war.ts`, and `src/scene/frame-builder.ts`:
  - Hook live tool executions: when an active session invokes diagnostic capabilities (`read`, `grep`, `glob`, `diagnosing-bugs`), automatically generate a dynamic `LanternFlare` at the character's coordinates or projecting toward the outdoor wilds.
  - Apply the flare's light radius to the 2D Fog of War byte grid (`FogOfWarByteGrid`), revealing creature tracks, broken runes, and monster lairs.
  - Expire flares naturally after their active animation lifespan.
- Remove manual flare spawning hooks and ensure flare animations render cleanly through the modular scene pipeline.
- Verify in unit tests.

## Answer

Connected `buildGuildSceneFrame` in `src/scene/frame-builder.ts` to automatically detect diagnostic tool executions via `isDiagnosticTool(tool)` (`read`, `grep`, `glob`, `diagnosing-bugs`, etc.) and deploy expanding `LanternFlare`s. Flares integrate with `updateLanternFlares` and `revealFogArea` in `src/encounter/fog-of-war.ts` to part the Fog of War byte grid and uncover creature lairs. Verified in unit tests (84/84 pass).
