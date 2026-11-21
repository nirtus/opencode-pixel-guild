# 02: Dynamic Goal Assembly State & Responsive Platform Grid

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01

## Question

How should the central Goal Assembly site dynamically scale beyond the 5-part hardcoded limit to support any number of project issues/steps, rendering an auto-scaled platform socket grid with unbuilt wireframes and fitted mechanical components?

## Specification

- In `src/types/domain.ts` and `src/encounter/goal-assembly.ts`:
  - Deprecate the fixed 5-part assumption.
  - Dynamically construct `GoalAssemblyState` where `totalParts = issuesCount + verificationSteps` (e.g. 3, 7, 12, or 20 parts).
  - Dynamically calculate socket coordinates on the platform in a responsive `cols × rows` matrix (e.g. 2×2, 3×2, 4×3, 4×4).
- In `src/scene/frame-builder.ts` and `src/scene/canvas-adapter.ts`:
  - Render each socket as an unbuilt bleak wireframe with dashed outlines when pending, and a vibrant animated mechanical part when resolved.
  - Scale component size so larger issue counts fit comfortably on the platform.
  - Escalate physical structure tiers (Scaffold → Clockwork Engine → Airship) based on percentage of fitted parts.
  - Provide scene tooltip metadata displaying the issue title/slug on hover.

## Answer

Implemented `createGoalAssemblyFromTaskProgress` and `computeGoalAssemblyPlatformLayout` in `src/encounter/goal-assembly.ts` to dynamically generate responsive socket grids for any arbitrary issue count. Updated `resolveGoalAssemblyMilestone` to scale by ratio across all tiers. Connected `src/scene/frame-builder.ts` to derive `goalAssemblyState` directly from `room.taskProgress`, and updated `src/scene/canvas-adapter.ts` to render dynamic sockets with vibrant animated parts vs bleak wireframes. Verified with automated tests (81/81 pass).
