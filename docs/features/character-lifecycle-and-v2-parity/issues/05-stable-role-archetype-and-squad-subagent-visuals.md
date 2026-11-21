# 05: Stable Guild Role Archetype Identity & Parent-Tethered Squad Subagent Visuals

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 02: Stateful OpenCode V2 SSE Event Decoder for Tools, Prompts, Skills & Identity, 04: Delete Dead Choreography Modules & Unify Canonical Preparation Station Taxonomy

**What to build:** Persist `roleArchetype` (**Guild Role Archetype**: `MAGE`, `SCOUT`, `WARRIOR`, `ALCHEMIST`, `CLERIC`, `SAPPER`) on `CharacterState` from the session's `agentClass` so a character never mutates into a different person mid-session during a **Debugging Hunt**, and tether every child **Squad Subagent**'s party palette and squad lineage ring/badge to its `parentId`.

- [x] Add `roleArchetype: GuildRoleArchetype` to `CharacterState` and compute it in the reducer via `resolveGuildRoleArchetype` when a session is created or when `agentClass` changes (`build` → `MAGE`, `plan`/`explore` → `SCOUT`, `code-review` → `CLERIC`, `artificer` → `ALCHEMIST`, `demolitionist` → `SAPPER`).
- [x] Update `resolveCharacterRole` in `src/web/station-and-workflow-routing.ts` to read `c.roleArchetype` without forcing `role = "WARRIOR"` when `workflowIntent === "debugging-hunt"`, so a character retains their face, hair, and **Guild Role Archetype** while wielding their role's **Combat Weapon Archetype** in the **Dungeon Wilds**.
- [x] Update `resolveCanonicalHeroTraits` and `canvas-hero-painter.ts` so child **Squad Subagents** derive their party palette seed from `c.parentId ?? c.sessionId`, render a visible squad lineage tether ring/badge in the parent's squad color, and apply custom agent colors (`c.visualTraits.primaryHex`).
- [x] Add unit and visual rendering tests verifying that `plan` and `explore` agents render as `SCOUT`, characters do not swap facial traits when entering a **Debugging Hunt**, and **Squad Subagents** share their parent **Guild Adventurer**'s squad colors.

## Answer

Added `roleArchetype: GuildRoleArchetype` to `CharacterState`, computed and updated it in `createCharacterDefaultState` and `handleSessionUpserted`, updated `resolveCharacterRole` to preserve `roleArchetype` during `debugging-hunt` turns, and updated `resolvePartyPalette`, `resolveCanonicalHeroTraits`, `canvas-hero-painter.ts`, and `app-main.ts` to tether child `Squad Subagent` party palettes to `parentId`.
