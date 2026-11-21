# 02: Dynamic Role Archetype Reconciliation on Skills, Agents & Tools

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01

## Question

How should the world state reducer and client station router reconcile `char.roleArchetype` when a session's job becomes known or changes via agent selection, equipped **Skill Grimoires**, message hydration, or tool activity?

## Specification

- **In `src/state/reducer-helpers.ts`, `src/state/session-handlers.ts`, and `src/state/tool-and-gate-handlers.ts`**:
  - Introduce a helper `reconcileCharacterRoleArchetype(char: CharacterState): GuildRoleArchetype` that calls `resolveGuildRoleArchetype` with:
    - `agentClass`: `char.agentClass`
    - `skillIds`: `char.skillGrimoires.map((g) => g.skillId)`
    - `title`: `char.title`
    - `activeTool`: `char.activeCapability?.displayName ?? char.activeCapability?.toolName`
    - `signatureTools`: `char.recentTools.map((r) => r.toolName)`
  - Call `reconcileCharacterRoleArchetype(char)` in:
    - `createCharacterDefaultState`
    - `handleSessionUpserted` (whenever `event.agentClass`, `event.title`, `event.recentTools`, or hydrated session state arrives)
    - `equipSkillGrimoire` (so equipping `@wayfinder`, `@grilling`, `@code-review`, `@prototype`, `@diagnosing-bugs`, `@tdd`, `@research`, etc. via either the `skill` tool or `@skill` prompt attachment immediately updates `char.roleArchetype`)
    - `handleToolStarted` and `mergeHydratedRecentTools`
- **In `src/web/station-and-workflow-routing.ts`**:
  - Update `resolveCharacterRole(c: CharacterState)` to resolve via `resolveGuildRoleArchetype({ agentClass: c.agentClass, skillIds: (c.skillGrimoires ?? []).map((g) => g.skillId), title: c.title, activeTool: c.activeCapability?.displayName, signatureTools: (c.recentTools ?? []).map((r) => r.toolName) })` whenever `c.skillGrimoires?.length` or specialized `agentClass`/`title` is present, falling back to `c.roleArchetype`, so live canvas rendering always reflects the character's active job look without mutating their face during a **Debugging Hunt**.
- Update and add unit tests in `tests/` verifying that:
  - A default `"build"` session starts as `WARRIOR` (`⚔️ build (Warrior / Feature Smith)`).
  - Equipping `@wayfinder` or `@domain-modeling` transitions the character's job look to `MAGE`.
  - Equipping `@code-review` or `@grilling` transitions the character's job look to `CLERIC`.
  - Equipping `@prototype` or `@codebase-design` transitions the character's job look to `ALCHEMIST`.
  - Spawning an `explore` or `research` **Squad Subagent** gives the subagent the `SCOUT` look.

## Answer

Added `reconcileCharacterRoleArchetype` in `src/state/armory-and-workflow.ts` (invoked across `syncCharacterWorkflow`, `createCharacterDefaultState`, and `handleSessionUpserted`) and updated `resolveCharacterRole` in `src/web/station-and-workflow-routing.ts` to dynamically resolve `roleArchetype` from `agentClass`, directly equipped **Skill Grimoires** (filtering out inherited parent grimoires so child subagents keep their own specialized subagent job), and session quest titles.
