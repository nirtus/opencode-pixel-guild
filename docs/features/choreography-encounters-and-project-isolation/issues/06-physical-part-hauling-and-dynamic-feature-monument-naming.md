# 06: Physical Part Hauling & Dynamic Feature Monument Naming

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01, 02, 03

## Question

How can completed feature parts be physically hauled by characters across the floorboards to the assembly platform and fitted with a snap effect, while visually fitting the active feature's actual title on the platform monument?

## Specification

- In `src/web/app.html`:
  - When an issue or task completes (`resolvedTasks` increments):
    - Identify the crafting character at their station.
    - Initiate a hauling route: character visibly carries the component sprite across the oak floorboards to the platform anchor (`x: 380, y: 350`).
    - Upon arrival, trigger a bright golden snap particle burst and increment the fitted part on the platform structure.
    - Character returns to their next station or break lounge.
  - Dynamically extract the active feature title from `taskProgress.featureSlug` or active room name.
  - Format and center the monument banner text within bounds:
    `<feature title> (${resolvedTasks}/${totalTasks} built)`
  - Verify through automated tests in `tests/`.

## Answer

Implemented physical snap particle bursts (`snapParticles`, `triggerPlatformSnapBurst`) in `src/web/app.html` triggered whenever newly fitted feature parts lock onto the central assembly platform. Dynamically formatted and centered the active feature title on the platform monument banner (`${featureTitle} (${builtCount}/${totalPartsCount} built)`), adjusting font sizes dynamically to visually fit within platform bounds without clipping. Verified in automated test Slice 6.
