# 04: Station-Specific Acting Gestures

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 03

## Question

How can characters perform authentic, distinctive station acting gestures when working at workstations rather than playing a generic idle breathing bob?

## Specification

- In `src/web/app.html`:
  - Enhance `drawVectorHero` to accept `stationKind` and `isActing` when `c.lifecycleState === "WorkingAtStation"`:
    - **Smithy Forge**: Rhythmic hammering arm cycle with anvil spark bursts.
    - **Grand Library**: Raised manuscript reading gesture with page-flutter motion.
    - **Artificer Workbench**: Blueprint measuring / tinkering gesture with drafting tools.
    - **Enchanter Circle**: Levitation bob with raised glowing hands and rotating floor runes.
    - **Alchemy Lab**: Stirring the bubbling green cauldron with steam puffs.
    - **Break Lounge**: Seated relaxation near the sleeping cat with coffee cup.
    - **Wilds / Combat**: Active combat stance facing the monster with weapon thrusting and shield raised.
  - Verify through automated tests in `tests/`.

## Answer

Enhanced `drawVectorHero` in `src/web/app.html` to accept `stationKind` and `isActing`. Implemented station-specific gestures and animations for all stations: Smithy Forge hammer strikes with anvil spark bursts, Grand Library open manuscript reading with page flutter, Alchemy Lab cauldron stirring with steam puffs, Enchanter Circle levitation with rotating cyan rune rings, Artificer Workbench blueprint measuring, and Combat battle stances with weapon thrusts. Verified in automated test Slice 4.
