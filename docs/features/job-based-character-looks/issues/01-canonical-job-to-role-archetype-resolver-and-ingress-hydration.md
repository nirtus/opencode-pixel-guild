# 01: Canonical Job-to-Role-Archetype Resolver & Ingress Agent Hydration

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: None

## Question

How should `resolveGuildRoleArchetype` and OpenCode V2 message hydration classify a character's job into the 6 canonical **Guild Role Archetypes** (`WARRIOR`, `MAGE`, `SCOUT`, `ALCHEMIST`, `CLERIC`, `SAPPER`) so that builders, planners/scouts, mages/architects, alchemists/prototypers, clerics/reviewers, and sappers each get their agreed job look?

## Specification

- **In `src/types/role-archetypes.ts`**:
  - Support both legacy positional arguments `(agentClass?: string, activeTool?: string, signatureTools?: readonly string[])` and a structured `ResolveGuildRoleInput` object:
    ```ts
    export interface ResolveGuildRoleInput {
      readonly agentClass?: string | null;
      readonly subagentType?: string | null;
      readonly skillIds?: readonly string[];
      readonly title?: string | null;
      readonly activeTool?: string | null;
      readonly signatureTools?: readonly string[];
    }
    ```
  - Implement the 4-tier priority job classification:
    1. **Explicit Non-Default Agent / Subagent Class** (when `agentClass` or `subagentType` is set and is not the generic fallback `"build"`):
       - `WARRIOR`: `implement`, `implement-spec`, `tdd`, `diagnosing-bugs`, `debug`, `warrior`, `fix`
       - `MAGE`: `general`, `document`, `wayfinder`, `domain-modeling`, `writing-for-agents`, `wizard`, `opencode`, `mage`
       - `SCOUT`: `plan`, `explore`, `research`, `find-skills`, `scout`
       - `ALCHEMIST`: `prototype`, `codebase-design`, `migrate-to-shoehorn`, `scaffold-exercises`, `artificer`, `alchemist`
       - `CLERIC`: `code-review`, `grilling`, `pr`, `report`, `setup-pre-commit`, `git-guardrails-claude-code`, `review`, `cleric`
       - `SAPPER`: `demolition`, `demolitionist`, `sapper`, `cleanup`, `prune`, `docker`
    2. **Equipped Skill Grimoires (`skillIds`)** (evaluating from most recently equipped to earliest):
       - `tdd`, `diagnosing-bugs` → `WARRIOR`
       - `wayfinder`, `domain-modeling`, `writing-for-agents`, `wizard`, `opencode` → `MAGE`
       - `research`, `find-skills` → `SCOUT`
       - `prototype`, `codebase-design`, `migrate-to-shoehorn`, `scaffold-exercises` → `ALCHEMIST`
       - `code-review`, `grilling`, `pr`, `report`, `setup-pre-commit`, `git-guardrails-claude-code` → `CLERIC`
    3. **Session Quest Title / Subagent Prefix / Signature Tools**:
       - Titles or prefixes matching `explore`, `research`, `plan`, `scout`, `recon`, `search` → `SCOUT`
       - Titles matching `code-review`, `review`, `grill`, `grilling`, `guardrail`, `audit` → `CLERIC`
       - Titles matching `prototype`, `refactor`, `deepen`, `codebase-design`, `shoehorn`, `artificer`, `alchemist` → `ALCHEMIST`
       - Titles matching `wayfinder`, `document`, `spec`, `glossary`, `adr`, `domain-modeling`, `wizard` → `MAGE`
       - Titles matching `demolish`, `demolition`, `sapper`, `cleanup`, `prune`, `teardown` → `SAPPER`
       - Titles matching `debug`, `bug`, `fix`, `tdd`, `implement`, `build` → `WARRIOR`
       - Tool signatures: `demolition`/`delete`/`bomb`/`sapper` → `SAPPER`; `test`/`diagnosing-bugs`/`debug`/`hunt` → `WARRIOR`; `execute`/`codebase-design`/`alchemist`/`artificer` → `ALCHEMIST`; `code-review`/`question`/`guardrail`/`cleric` → `CLERIC`; `grep`/`glob`/`websearch`/`webfetch`/`find-skills` → `SCOUT`; `write`/`edit` when `agentClass === "general"` or `"document"` → `MAGE`.
    4. **Default Agent Fallback**:
       - `"build"` (and empty/default builder sessions) → **`WARRIOR`**
       - `"general"` → **`MAGE`**
- **In `src/ingress/daemon-message-hydration.ts`**:
  - Extract `latestAgentClass` from `msg.agent ?? msg.info?.agent ?? (msg as any).mode ?? (msg.info as any)?.mode` across `"user"`, `"assistant"`, and `"agent-switched"` messages so sessions whose agent class is stored on user prompt turns or assistant messages hydrate their true agent class.
- Add unit tests in `tests/07-core-domain-and-roles.test.ts` covering all 6 **Guild Role Archetypes** across agent classes, skill grimoires, titles, and signature tools.

## Answer

Implemented the 4-tier job-to-archetype classification in `src/types/role-archetypes.ts` (`resolveGuildRoleArchetype` and `ResolveGuildRoleInput`), mapping explicit non-default agent classes (`build`/`implement`/`tdd`/`diagnosing-bugs` → `WARRIOR`, `general`/`document`/`wayfinder`/`domain-modeling` → `MAGE`, `plan`/`explore`/`research` → `SCOUT`, `prototype`/`codebase-design`/`artificer` → `ALCHEMIST`, `code-review`/`grilling`/`review` → `CLERIC`, `demolition`/`sapper`/`cleanup` → `SAPPER`), equipped **Skill Grimoires**, session quest titles, and signature tools. Updated `hydrateSessionMessages` in `src/ingress/daemon-message-hydration.ts` to extract `latestAgentClass` from `user`, `assistant`, and `agent-switched` messages.
