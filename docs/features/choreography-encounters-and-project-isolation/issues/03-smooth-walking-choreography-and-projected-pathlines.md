# 03: Smooth Walking Choreography & Projected Pathlines

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: None

## Question

How can character teleportation be eliminated so that characters smoothly walk across the oak floorboards from their current position to their destination at a steady walking speed, displaying step bobbing, directional sprite facing, and a glowing projected pathline?

## Specification

- In `src/web/app.html`:
  - Implement a persistent `characterWalkers` map tracking per-session coordinates (`currentX, currentY`), target destination (`targetX, targetY`), and walking state.
  - When a character's destination station changes, compute motion delta and interpolate position at ~130 px/sec across frame delta-times.
  - Flip character sprite facing left or right based on motion vector ($\Delta x$).
  - Animate vertical walking step bob (`Math.sin(t * 12) * 3`).
  - Render a subtle glowing dashed projected pathline on the floorboards showing where the character is heading.
  - When the destination is reached within threshold ($\le 4$ px), settle the character into station acting position.
  - Verify through automated tests in `tests/`.

## Answer

Implemented persistent `characterWalkers` state in `src/web/app.html` tracking `currentX/Y`, `targetX/Y`, and `isWalking`. Moving characters interpolate smoothly along trajectories at 135 px/sec with animated walking step bobbing, directional sprite flipping (`facingLeft`), un-flipped name labels, and subtle glowing amber dashed projected pathlines rendered on the floorboards. Verified in automated test Slice 3.
