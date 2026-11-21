# Feature Map: Job-Based Character Looks & Per-Session Hero Individuality

Label: wayfinder:map

## Destination

Deliver the complete specification in [Feature Specification: Job-Based Character Looks & Per-Session Hero Individuality](./spec.md) through three vertical-slice tickets so that every **Guild Adventurer** and **Squad Subagent** visibly reflects their specific OpenCode job (`WARRIOR`, `MAGE`, `SCOUT`, `ALCHEMIST`, `CLERIC`, `SAPPER`) and possesses unique per-session personal physical traits while wearing their **Project Heraldry** uniform colors:

1. **[01: Canonical Job-to-Role-Archetype Resolver & Ingress Agent Hydration](./issues/01-canonical-job-to-role-archetype-resolver-and-ingress-hydration.md)** (`Blocked by: None`)
2. **[02: Dynamic Role Archetype Reconciliation on Skills, Agents & Tools](./issues/02-dynamic-role-archetype-reconciliation-on-skills-agents-and-tools.md)** (`Blocked by: 01`)
3. **[03: Per-Session Personal Hero Traits with Project Heraldry Uniforms](./issues/03-per-session-personal-hero-traits-with-project-heraldry-uniforms.md)** (`Blocked by: 02`)

## Notes

- **Domain**: **Guild Role Archetype**, **Guild Character**, **Guild Adventurer**, **Squad Subagent**, **Skill Grimoire**, **Project Heraldry**, **Equipment Loadout**.
- **Rules**: Strictly use the project root directory (`./`). Never create external worktrees or use `/tmp/opencode`. Keep every source file in `src/` under 400 lines. Deploy and verify on the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`) and inspect a live screenshot in `docs/images/job-based-character-looks.png`.
- **Skills to consult**: `codebase-design`, `domain-modeling`, `tdd`, `code-review`.

## Decisions so far

- [Grilling Round 1 (Q1–Q4) & Domain Model Update](./spec.md): Locked the 6-way job-to-archetype mapping (`WARRIOR` for `build`/`implement`/`tdd`/`diagnosing-bugs`, `MAGE` for `general`/`document`/`wayfinder`/`domain-modeling`, `SCOUT` for `plan`/`explore`/`research`, `ALCHEMIST` for `prototype`/`codebase-design`/`artificer`/`execute`, `CLERIC` for `code-review`/`grilling`/`pr`/`report`, `SAPPER` for `demolition`/`sapper`/`cleanup`), the 4-tier priority resolution (`explicit agentClass -> equipped Skill Grimoires -> title/signature tools -> default agentClass`), and per-session hero trait seeding across the 9 canonical heroes of each role while preserving **Project Heraldry** uniform palettes. Updated `GLOSSARY.md` accordingly.
- [01: Canonical Job-to-Role-Archetype Resolver & Ingress Agent Hydration](./issues/01-canonical-job-to-role-archetype-resolver-and-ingress-hydration.md): Implemented the 4-tier job-to-archetype classification in `src/types/role-archetypes.ts` (`resolveGuildRoleArchetype` and `ResolveGuildRoleInput`) and updated `hydrateSessionMessages` in `src/ingress/daemon-message-hydration.ts` to extract `latestAgentClass` from `user`, `assistant`, and `agent-switched` messages.
- [02: Dynamic Role Archetype Reconciliation on Skills, Agents & Tools](./issues/02-dynamic-role-archetype-reconciliation-on-skills-agents-and-tools.md): Added `reconcileCharacterRoleArchetype` in `src/state/armory-and-workflow.ts` and updated `resolveCharacterRole` in `src/web/station-and-workflow-routing.ts` so `roleArchetype` updates dynamically when equipping direct **Skill Grimoires**, changing `agentClass`, or spawning specialized **Squad Subagents**.
- [03: Per-Session Personal Hero Traits with Project Heraldry Uniforms](./issues/03-per-session-personal-hero-traits-with-project-heraldry-uniforms.md): Updated `resolveCanonicalHeroTraits` (`src/sprites/hero-vector-rig.ts`), `resolveCharacterProjectHeroTraits` (`src/web/canvas-hero-painter.ts`), and `deriveEquipmentLoadout` (`src/state/equipment-loadout.ts`) so characters in the same project wear their **Project Heraldry** uniform palette and their job's **Guild Role Archetype** outfit while drawing distinct personal facial/hair/headgear traits seeded from their own `sessionId`.

## Not yet specified

<!-- All wayfinder fog has graduated into spec.md and tickets 01..03 -->

## Out of scope

- Modifying or deleting reference art sheets in `docs/examples/`.
- Changing indoor **Preparation Station** coordinates or **Dungeon Wilds** room geometry.
