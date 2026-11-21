# 09: Central Goal Assembly Site & Vibrant Part Snapping

**What to build:**
Implement the central Goal Assembly Site in the workshop room. Unbuilt task components render as bleak, dim wireframes; as tools complete at Preparation Stations, characters carry the crafted parts to the platform and fit them in. Newly fitted parts snap into position with vibrant brass/copper sheen, glowing power crystals, and particle sparks, escalating across 3 physical tiers: Wooden Scaffold → Clockwork Engine → Guild Airship.

**Blocked by:** 07: Wall-Aligned Preparation Stations & Dungeon Iron Gate Layout.

**Status:** resolved

- [x] Implement `src/encounter/goal-assembly.ts` (<220 lines): tracks assembly components corresponding to tasks/issues.
- [x] Render unbuilt parts as translucent bleak wireframes with dashed outlines.
- [x] Render fitted parts as vibrant, brightly-colored mechanical components with rotating gears and glowing crystal cores.
- [x] Trigger tier escalation: Tier 1 (Scaffold) → Tier 2 (Clockwork Engine) → Tier 3 (Airship Monument) on milestone completion.
- [x] Play celebratory fireworks and character cheer animation upon 100% feature completion.

## Comments
Resolved with `src/encounter/goal-assembly.ts` managing 5-part Feature Object state, bleak wireframe vs vibrant animated part visual progression, milestone tier escalation, and hauling route dispatch. 74/74 automated tests pass green.
