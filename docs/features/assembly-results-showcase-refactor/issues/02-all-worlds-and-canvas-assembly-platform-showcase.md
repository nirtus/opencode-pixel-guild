# 02: `🌐 All` Worlds & 2D Canvas Goal Assembly Platform Showcase

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01

## Description

Refactor `resolveActiveGoalAssemblyAndLayout()` (`src/web/canvas-assembly-painter.ts`), `stepClientChoreography()` (`src/web/client-choreography.ts`), and `buildFrameEncounters()` (`src/scene/frame-encounters.ts`) to use `deriveGuildAssemblyShowcase` so that the central **Goal Assembly Site** on the 2D canvas renders fitted **Assembly Parts**, animates clockwork gears/gauges/console/Tesla arcs, and displays project-tagged sockets in both `🌐 All` and single-project focus modes while keeping empty rooms (`0` characters and `0` tasks) at `0/0 Blueprint Ready`.

## Answer

Refactored `resolveActiveGoalAssemblyAndLayout()` in `src/web/canvas-assembly-painter.ts` and `stepClientChoreography()` in `src/web/client-choreography.ts` to delegate to `deriveGuildAssemblyShowcase`. Verified with `tests/33-assembly-results-showcase.test.ts` (Slice 2).
