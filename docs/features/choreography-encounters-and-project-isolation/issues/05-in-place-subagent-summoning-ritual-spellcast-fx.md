# 05: In-Place Subagent Summoning Ritual Spellcast FX

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 03

## Question

How can child subagent spawning be visually dramatized so that parent agents cast an in-place summoning ritual with expanding floor runes and light beams rather than child subagents appearing abruptly?

## Specification

- In `src/web/app.html`:
  - Track known session IDs. When a new child subagent (`parentID != null`) appears:
    - Locate the parent character's coordinates.
    - Trigger an 800ms `SummoningRitual` visual effect at the parent's position:
      - The parent raises their hands in a spellcasting channeling pose.
      - An expanding cyan/violet floor pentagram with rotating rune rings renders beneath the summoner.
      - A light beam and particle swirl materializes the child subagent on an adjacent tile.
      - Child subagent fades in smoothly upon ritual peak.
  - Verify through automated tests in `tests/`.

## Answer

Implemented `activeSummoningRituals` and `drawSummoningRitual` in `src/web/app.html`. Spawning a new child subagent automatically detects the parent character, triggers a 1200ms in-place summoning ritual with an expanding cyan/violet floor pentagram, rotating inner runic star, vertical light beam, and swirling particle sparks, smoothly materializing the child subagent. Verified in automated test Slice 5.
