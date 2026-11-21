# 02: Project-Seeded Guild Order Uniforms & Collision-Free Project Heraldry

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01: Unified Host Workshop Room Co-Habitation & Non-Isolating Project Legend

**What to build:** Assign every project on the connected OpenCode host a deterministic, collision-free **Project Heraldry** identity (Guild Order uniform palette, crest icon, and concise short tag) so all characters working on the same project wear matching Guild Order uniform colors while retaining their individual **Guild Role Archetype** and facial identity.

**Blocked by:** 01: Unified Host Workshop Room Co-Habitation & Non-Isolating Project Legend

**Status:** resolved

- [x] Each distinct project on the connected OpenCode host is deterministically assigned a unique, collision-free Guild Order palette (Crimson & Gold `🛡️`, Sapphire & Ice `❄️`, Emerald & Oak `🌿`, Amethyst & Dusk `🔮`, Radiant Gold `☀️`, Ocean Teal `⚓`, Forged Steel `⚒️`, Turquoise & Dune `🏜️`, Cobalt & Lightning `⚡`), a crest icon, and a concise 3–10 character uppercase project tag.
- [x] All root **Guild Adventurers**, child **Squad Subagents**, and Git worktree sessions belonging to the same project wear that project's Guild Order uniform colors in both Clean Cartoon and Pixel Atlas visual styles.
- [x] Each character within a project retains their stable **Guild Role Archetype** (`MAGE`, `WARRIOR`, `SCOUT`, `ALCHEMIST`, `CLERIC`, `SAPPER`), **Combat Weapon Archetype**, and distinct hero facial identity across turns.
- [x] End-to-end tests verify that multiple projects on the same host receive non-colliding Guild Order palettes and that teammates within the same project share uniform colors while differing in role archetype.

## Answer

Implemented `resolveProjectHeraldry` and `listHostProjectHeraldries` with linear-probing collision avoidance across host projects in `src/spatial/project-heraldry.ts`, and wired `resolveCharacterProjectHeroTraits` in `src/web/canvas-hero-painter.ts` so all characters of the same project share their project's `CanonicalPartyRoster` uniform palette while preserving individual `roleArchetype` heroes.
