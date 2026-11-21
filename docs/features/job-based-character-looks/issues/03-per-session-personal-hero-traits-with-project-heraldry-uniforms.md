# 03: Per-Session Personal Hero Traits with Project Heraldry Uniforms

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 02

## Question

How should `resolveCanonicalHeroTraits` and `resolveCharacterProjectHeroTraits` combine a project's **Project Heraldry** uniform palette with a character's **Guild Role Archetype** outfit and per-session personal physical traits (`skin`, `hair`, `eyes`, `beard`, `mustache`, `expr`, `helm` variant) so characters in the same project never degenerate into identical clones?

## Specification

- **In `src/sprites/hero-vector-rig.ts`**:
  - Update `resolveCanonicalHeroTraits(sessionId = "ses_default", role: GuildRoleArchetype | string = "WARRIOR", partyKey?: string)`:
    - Resolve `party` from `partyKey` (when `partyKey` is a valid key in `CANONICAL_PARTY_ROSTERS`) or from `resolvePartyKeyFromSeed(sessionId)` when `partyKey` is omitted.
    - When `partyKey` is omitted, or when `sessionId` itself is a direct party key (`"01"`..`"10"`) or `"ses_default"`, select `hero` from `party.heroes.find((h) => h.role === normalizedRole) ?? party.heroes[0]`.
    - When `partyKey` is provided AND `sessionId` is a distinct session identifier, collect the pool of all 9 canonical heroes across `PARTY_KEY_ORDER` whose `h.role === normalizedRole` and select the hero deterministically using a FNV-1a hash of `sessionId`.
- **In `src/web/canvas-hero-painter.ts`**:
  - Update `resolveCharacterProjectHeroTraits(sessionId, role, snapshot)`:
    - Continue resolving `heraldry = resolveProjectHeraldry(target, snapshot)` so the character (and any child **Squad Subagent** tethered to its parent) wears the project's **Project Heraldry** uniform palette (`heraldry.partyKey`).
    - Pass the character's own `sessionId` (rather than `char?.parentId ?? sessionId`) into `resolveCanonicalHeroTraits(sessionId, role, heraldry.partyKey)` so every **Guild Adventurer** and **Squad Subagent** gets their own deterministic face, hair, beard, expression, and headgear variant from the 9 canonical heroes of their **Guild Role Archetype** while sharing their project/squad uniform colors.
- **Verification & Visual Proof**:
  - Add unit tests verifying that multiple sessions in the same project (`same partyKey`) with the same `role` receive the same `party` palette (`heraldry.partyKey`) but distinct `CanonicalHeroDef` personal traits seeded by their `sessionId`, and that different jobs in the same project receive their distinct `WARRIOR`, `MAGE`, `SCOUT`, `ALCHEMIST`, `CLERIC`, and `SAPPER` rigs.
  - Run `npm test` (including `tests/00-architecture-invariants.test.ts`), deploy to the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`), capture a live screenshot at `docs/images/job-based-character-looks.png`, and visually verify with `read`.

## Answer

Updated `resolveCanonicalHeroTraits` (`src/sprites/hero-vector-rig.ts`) to support `{ seedHeroBySessionId: true }`, updated `resolveCharacterProjectHeroTraits` (`src/web/canvas-hero-painter.ts`) to seed each character's personal `CanonicalHeroDef` traits (`skin`, `hair`, `eyes`, `beard`, `mustache`, `expr`, `helm`) from their own `sessionId` across the 9 canonical heroes of their **Guild Role Archetype** while preserving their project's **Project Heraldry** uniform palette (`heraldry.partyKey`), and aligned `deriveEquipmentLoadout` (`src/state/equipment-loadout.ts`) so `headgear` matches the character's resolved **Guild Role Archetype**. Deployed to the `opencode-pixel-guild-visualizer` Docker container (`port 4310`), verified all 223 unit/integration tests pass, and visually verified `docs/images/job-based-character-looks.png`.
