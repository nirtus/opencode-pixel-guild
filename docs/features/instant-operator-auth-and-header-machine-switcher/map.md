# Feature Map: Instant Guild Operator Reactivity, Privacy-Safe Identity Prompts & Inline Header Machine Switcher

Label: wayfinder:map

## Destination

Deliver the complete specification in [Specification: Instant Guild Operator Reactivity, Privacy-Safe Identity Prompts & Inline Header Machine Switcher](./spec.md) across all four architecture review candidates through four vertical-slice tickets:
1. **[01: Canonical Guild Operator Domain Contracts & Boot-Gated Preference Synchronization Seam](./issues/01-canonical-operator-domain-contracts-and-preference-seam.md)** (`Blocked by: None`)
2. **[02: Inline Top-Header Machine Switcher Strip & Guild Master Alias Display](./issues/02-inline-header-machine-switcher-strip-and-guild-master-alias.md)** (`Blocked by: 01`)
3. **[03: Instant Client Operator Auth Reactivity, Native Form Submit & Privacy-Safe Identity Prompts](./issues/03-instant-operator-auth-reactivity-and-privacy-safe-forms.md)** (`Blocked by: 01, 02`)
4. **[04: Atomic Server Machine-Switch World Reset & Verified Daemon Reachability](./issues/04-atomic-server-machine-switch-and-verified-reachability.md)** (`Blocked by: 01`)

## Notes

- **Mode**: Planning & Wayfinding complete (`spec.md`, `map.md`, `GLOSSARY.md`, and tickets `01..04` published; zero application code modified per `No code` directive).
- **Domain**: **Guild Operator**, **Operator Auth Gate**, **OpenCode Machine Pairing**, **Project World**, **Workshop Room**, **Guild Floorplan**, **Guild Master Ledger**, **Spectator Drawer**.
- **Architecture Review**: [Architecture Review Report (2026-10-28)](../../architecture-review/architecture-review-20261028-operator-auth-and-machine-switching.html).
- **Specification**: [Feature Specification](./spec.md).
- **Skills to consult**: `codebase-design`, `domain-modeling`, `tdd`, `code-review`.
- **Standing Rules**: Work strictly inside the project root directory (`./`). Never create git worktrees or write files to `/tmp` or `/tmp/opencode`. Every source file in `src/` must remain `<= 400` lines.

## Decisions so far

- [Architecture Review & Grilling Alignment (2026-10-28)](../../architecture-review/architecture-review-20261028-operator-auth-and-machine-switching.html): Resolved `Q1–Q5` across all four deepening candidates (`all yes`) and updated `GLOSSARY.md` definitions for **Guild Operator** and **OpenCode Machine Pairing**.
- [Specification: Instant Guild Operator Reactivity, Privacy-Safe Identity Prompts & Inline Header Machine Switcher](./spec.md): Locked privacy-safe `example (do not use actual name)` username and Guild Master Alias prompts, inline side-by-side top-header machine pills with 1-click switching, instant client reactivity without page refresh, verified server daemon reachability with unconditional room reset on machine switch, and canonical operator/preference contracts in `src/types/domain.ts`.
- [01: Canonical Guild Operator Domain Contracts & Boot-Gated Preference Synchronization Seam](./issues/01-canonical-operator-domain-contracts-and-preference-seam.md): Consolidated operator, machine, and preference contracts in `src/types/operator-types.ts`, unified subtab getters/setters on `clientState`, and gated `persistClientUiWindowState` behind `authBootCompleted && isAuthenticated`.
- [02: Inline Top-Header Machine Switcher Strip & Guild Master Alias Display](./issues/02-inline-header-machine-switcher-strip-and-guild-master-alias.md): Projected side-by-side `machineTabs` in `buildTopBarViewModel`, reconciled `#header-machine-strip` in the top bar for 1-click machine switching, surfaced **Guild Master Alias** (`label`) in `accountPill` and **Guild Master Ledger**, and routed signed-in account clicks to `"profile"`.
- [03: Instant Client Operator Auth Reactivity, Native Form Submit & Privacy-Safe Identity Prompts](./issues/03-instant-operator-auth-reactivity-and-privacy-safe-forms.md): Added `Choose username: example (do not use actual name)` and `Guild Master alias: example (do not use actual name)` prompts, native `<form>` `Enter` submission, focus-safe modal opening, and atomic client state/cache/camera/HUD transitions on every auth, profile, and machine action without page reload.
- [04: Atomic Server Machine-Switch World Reset & Verified Daemon Reachability](./issues/04-atomic-server-machine-switch-and-verified-reachability.md): Verified HTTP reachability in `createHttpOpenCodeDaemonClient`, unconditionally cleared prior machine rooms on machine switch in `pairDaemon`, emitted SSE on `hydrateFromSnapshot`, and blocked unauthenticated phantom operator creation.

## Not yet specified

<!-- All wayfinder fog has graduated into spec.md and tickets 01..04 -->

## Out of scope

- Modifying indoor **Workshop Room** station coordinates, character sprite matrices, or **Dungeon Wilds** encounter mechanics.
