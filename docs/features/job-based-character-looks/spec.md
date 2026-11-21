# Feature Specification: Job-Based Character Looks & Per-Session Hero Individuality

Label: ready-for-agent

## Problem Statement

Every new character in a project currently renders with the exact same appearance (an identical Mage clone with the same face, skin tone, hair color, expression, wizard hat, and robes) regardless of their job or session identity. Two root causes in the codebase produce this regression:

1. **Every Session Collapses to `MAGE` (`src/types/role-archetypes.ts`, `src/state/reducer-helpers.ts`, `src/state/session-handlers.ts`)**:
   - `createCharacterDefaultState` and `handleSessionUpserted` compute `roleArchetype` solely via `resolveGuildRoleArchetype(agentClass)`, ignoring equipped **Skill Grimoires**, session titles, subagent spawn metadata, and signature tools.
   - `resolveGuildRoleArchetype` only maps a narrow subset of strings (`plan`/`explore` → `SCOUT`, `review` → `CLERIC`, `debug` → `WARRIOR`, `artificer` → `ALCHEMIST`, `demolition` → `SAPPER`) and falls back to `MAGE` for everything else—including `"build"` (which `src/web/app.html` explicitly labels `⚔️ build (Warrior / Feature Smith)`), `"implement"`, `"implement-spec"`, `"document"`, `"general"`, `"research"`, and `"prototype"`.
   - When a session equips a defining **Skill Grimoire** (`@wayfinder`, `@code-review`, `@prototype`, `@diagnosing-bugs`, `@tdd`, `@research`, etc.) or hydrates its true agent class from messages, `roleArchetype` is never updated from its initial default.

2. **`Project Heraldry` Overrides `sessionId` When Selecting Hero Anatomy (`src/web/canvas-hero-painter.ts`, `src/sprites/hero-vector-rig.ts`)**:
   - `resolveCharacterProjectHeroTraits` passes `heraldry.partyKey` (shared by all sessions in a project) into `resolveCanonicalHeroTraits(partySeed, role, heraldry.partyKey)` and also substitutes `partySeed = char?.parentId ?? sessionId`.
   - Inside `resolveCanonicalHeroTraits`, when `partyKey` is provided, `sessionId` is **completely ignored** and the function selects the single hero of that role from `CANONICAL_PARTY_ROSTERS[partyKey]`.
   - Because all characters in the same project share one `partyKey` and default to `MAGE`, every character in the project resolves to the exact same `CanonicalHeroDef` (`party.heroes[1]`), producing 100% identical clones. Even when two characters in a project legitimately share the same job, ignoring `sessionId` forces them to have identical faces, hair, beards, and expressions.

---

## Core Design Decisions

### Decision 1: Canonical 6-Way Job → Guild Role Archetype Mapping

Every **Guild Character** assumes one of the 6 **Guild Role Archetypes** (`WARRIOR`, `MAGE`, `SCOUT`, `ALCHEMIST`, `CLERIC`, `SAPPER`) based on their OpenCode job:

| Guild Role Archetype | Visual Outfit & Silhouette | OpenCode Jobs (Agent Classes, Subagent Types, Skills & Task Specialties) |
| :--- | :--- | :--- |
| **`WARRIOR`** | Steel breastplate, shoulder pauldrons, flowing cape, knotted headband or horned Viking helm, broadsword & heater shield | Primary builders & bug-hunters: `build`, `implement`, `implement-spec`, `tdd`, `diagnosing-bugs`, `debug`, `warrior`, `fix`, and test/bug-fix tasks |
| **`MAGE`** | Flared arcane robes, contrasting center stole, embroidered star sparkles, pointed bent wizard hat, crystal staff | Generalists, architects & lore/documentation casters: `general`, `document`, `wayfinder`, `domain-modeling`, `writing-for-agents`, `wizard`, `opencode`, `mage` |
| **`SCOUT`** | Split brown leather jerkin, contrasting neck scarf, cross-body strap, ranger hood, arrow-packed quiver, longbow | Reconnaissance, planning & research: `plan`, `explore`, `research`, `find-skills`, `scout`, and codebase/web discovery subagents |
| **`ALCHEMIST`** | White bib-apron with pocket, 3-vial potion bandolier, brass forehead goggles, wooden potion-vial backpack frame | Prototyping, refactoring, architecture deepening & Code Mode/tooling: `prototype`, `codebase-design`, `migrate-to-shoehorn`, `scaffold-exercises`, `artificer`, `alchemist`, and `execute`/MCP synthesis |
| **`CLERIC`** | Flared clerical vestments, sacred sun scapular tabard, golden diamond circlet, luminous pulsing sacred halo | Code review, grilling, QA & guardrails: `code-review`, `grilling`, `pr`, `report`, `setup-pre-commit`, `git-guardrails-claude-code`, `review`, `cleric` |
| **`SAPPER`** | Heavy padded blast vest with high-vis yellow stripe, yellow miner's hardhat with headlamp, strapped 3-stick dynamite bundle, pickaxe | Teardown, cleanup, worktree removal, container/infra ops & pruning: `demolition`, `demolitionist`, `sapper`, `cleanup`, `prune`, `docker` teardown |

### Decision 2: 4-Tier Priority Resolution & Dynamic Job Reconciliation

`resolveGuildRoleArchetype` resolves a character's job using a deterministic 4-tier priority order:
1. **Explicit Non-Default Agent / Subagent Class**: If `agentClass` (or spawned subagent type) is explicitly set to a specialized class other than the generic `"build"` default (`plan`, `explore`, `document`, `general`, `implement`, `implement-spec`, `code-review`, `research`, `prototype`, `artificer`, `demolition`, etc.), map directly to its corresponding **Guild Role Archetype**.
2. **Equipped Skill Grimoires (`skillGrimoires`)**: If the session has equipped one or more **Skill Grimoires** (e.g., `@wayfinder`, `@grilling`, `@domain-modeling`, `@code-review`, `@prototype`, `@codebase-design`, `@diagnosing-bugs`, `@tdd`, `@research`), the most recently equipped job-defining skill determines the character's **Guild Role Archetype** when `agentClass` is the generic default (`"build"`).
3. **Session Quest Title / Subagent Prefix / Signature Tools**: If neither a specialized agent class nor a defining skill is present yet, inspect the session's `title` (such as subagent titles `"explore: ..."`, `"code-review: ..."`, `"research: ..."`, `"prototype: ..."`) and signature tools (`activeTool` / `recentTools`).
4. **Default Agent Fallback**: Sessions remaining on the default `"build"` agent resolve to **`WARRIOR`** (`⚔️ build (Warrior / Feature Smith)`), while `"general"` resolves to **`MAGE`**.

Whenever a session's `agentClass` is updated (via SSE or message hydration, including `"user"` message `agent`/`mode` metadata), a **Skill Grimoire** is equipped (`handleSkillActivated`, `handleMessageUserPrompt`, `equipSkillGrimoire`), or `handleSessionUpserted` hydrates title/tools, `char.roleArchetype` and `char.equipmentLoadout` are reconciled immediately.

### Decision 3: Per-Session Personal Hero Traits + Project Heraldry Uniforms

To ensure that characters in the same project never degenerate into identical clones while preserving **Project Heraldry**:
1. **Uniform Palette from Project Heraldry (`party`)**: The character's clothing and armor palette (`party.primary`, `party.secondary`, `party.accent`, `party.metal`, `party.aura`) continues to come from the project's **Project Heraldry** (`heraldry.partyKey`), keeping faction identity unmistakable across the room.
2. **Job Outfit & Silhouette from Guild Role Archetype (`role`)**: The character's class silhouette, clothing cut, back gear, headgear category, and combat weapon come from their resolved **Guild Role Archetype** (`WARRIOR`, `MAGE`, `SCOUT`, `ALCHEMIST`, `CLERIC`, `SAPPER`).
3. **Personal Physical Traits Seeded by Own `sessionId` (`hero`)**: Instead of picking the single hero inside `CANONICAL_PARTY_ROSTERS[heraldry.partyKey]`, `resolveCanonicalHeroTraits(sessionId, role, partyKey)` selects the character's `CanonicalHeroDef` (`skin`, `hair`, `eyes`, `beard`, `mustache`, `expr`, and role-valid `helm` variant) deterministically using a hash of the character's own `sessionId` across all 9 canonical heroes of that `role` in `CANONICAL_PARTY_ROSTERS`.
   - Child **Squad Subagents** use their own `sessionId` for personal physical traits (so a subagent is not a facial clone of its parent or sibling subagent) while inheriting their parent's **Project Heraldry** uniform palette.
   - When `resolveCanonicalHeroTraits(sessionId, role, partyKey)` is called with a `sessionId` that explicitly matches a canonical party key (`"01"`..`"10"`) or when no `sessionId` seed diversity is requested, it remains deterministic and backward-compatible.

---

## Vertical-Slice Tickets

1. **[01: Canonical Job-to-Role-Archetype Resolver & Ingress Agent Hydration](./issues/01-canonical-job-to-role-archetype-resolver-and-ingress-hydration.md)**
2. **[02: Dynamic Role Archetype Reconciliation on Skills, Agents & Tools](./issues/02-dynamic-role-archetype-reconciliation-on-skills-agents-and-tools.md)**
3. **[03: Per-Session Personal Hero Traits with Project Heraldry Uniforms](./issues/03-per-session-personal-hero-traits-with-project-heraldry-uniforms.md)**

---

## Testing & Verification Requirements

- **Unit & Integration Tests**:
  - Verify the 6-way job-to-archetype mapping across agent classes (`build` → `WARRIOR`, `general`/`document` → `MAGE`, `plan`/`explore`/`research` → `SCOUT`, `prototype`/`artificer` → `ALCHEMIST`, `code-review`/`review` → `CLERIC`, `demolition`/`sapper` → `SAPPER`), equipped **Skill Grimoires** (`@wayfinder`, `@code-review`, `@prototype`, `@tdd`, `@research`), and session titles.
  - Verify that equipping a **Skill Grimoire** or hydrating a user/assistant message agent updates `char.roleArchetype` in the world reducer.
  - Verify that two sessions in the same project (`same partyKey`) with the same **Guild Role Archetype** and different `sessionId`s share the project's `party` uniform palette while resolving distinct personal `CanonicalHeroDef` traits across the 9 canonical heroes of that role.
  - Maintain the strict `<= 400` line ceiling across all files in `src/` (`tests/00-architecture-invariants.test.ts`).
- **Live Docker Container & Visual Proof (`port 4310`)**:
  - Deploy to `opencode-pixel-guild-visualizer` via `npm run docker:up`, capture headless Chrome visual proof in `docs/images/job-based-character-looks.png`, and inspect with `read`.
