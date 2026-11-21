# Feature Map: User Registration/Login & Multi-Machine OpenCode Pairing Windows, Deterministic Station Routing & Committed Walk Queue, Real Host Git Commit CRUD & Feature Retirement, Border-Locked Camera & iPhone Safe-Area Top Bar

Label: wayfinder:map

## Destination

Deliver the complete specification in [Specification: User Registration/Login & Multi-Machine OpenCode Pairing Windows, Deterministic Station Routing & Committed Walk Queue, Real Host Git Commit CRUD & Feature Retirement, Border-Locked Camera & iPhone Safe-Area Top Bar](./spec.md) through four parallel, non-blocking vertical-slice tickets:
1. **[01: User Registration, Login, Profile Config & Multi-Machine OpenCode Pairing Windows](./issues/01-user-auth-profile-and-multi-machine-opencode-pairing-windows.md)** (`Blocked by: None`)
2. **[02: Deterministic Action-to-Station Routing (Library for Read, Armory for Skill) & Non-Interruptible Committed Walk Queue](./issues/02-deterministic-station-mapping-and-committed-walk-queue.md)** (`Blocked by: None`)
3. **[03: Read-Write Host Workspace Mount, Live Git Commit CRUD & Committed Feature Retirement](./issues/03-real-host-git-commit-crud-and-committed-feature-retirement.md)** (`Blocked by: None`)
4. **[04: Border-Locked Chamber Camera, Post-Navigation Mobile Re-Anchoring & iPhone Home Screen Safe-Area Top Bar](./issues/04-border-locked-chamber-camera-mobile-reanchoring-and-iphone-pwa-safe-area.md)** (`Blocked by: None`)

## Notes

- **Mode**: Design phase complete (`spec.md` and parallel tickets `01..04` published; no production code modified).
- **Domain**: **Guild Operator**, **OpenCode Machine Pairing**, **Project World**, **Workshop Room**, **Preparation Station**, **Armory Wardrobe**, **Library Study Bookshelf**, **Arcane Lectern**, **Goal Assembly Site**, **Assembly Commit Ledger**, **Toil Queue**, **Spectator Drawer**, **Category Subtab Deck**.
- **Architecture Review**: [Root-Cause Architecture Review (2026-10-26 v2)](../../architecture-review/architecture-review-20261026-v2.html) (`docs/images/architecture-review-20261026-v2.png`).
- **Specification**: [Feature Specification](./spec.md).
- **Skills to consult**: `codebase-design`, `domain-modeling`, `tdd`, `code-review`.
- **Standing Rules**: Work strictly inside the project root directory (`./`). Never create git worktrees or write files to `/tmp` or `/tmp/opencode`. Every source file in `src/` must remain `<= 400` lines. Visual proof with headless Chrome screenshots is mandatory for every window and function.

## Decisions so far

- [Root-Cause Architecture Review & Initial Grilling Alignment](../../architecture-review/architecture-review-20261026-v2.html): Locked all 5 Round 1 decisions (`Q1–Q5`), updated `GLOSSARY.md`, and added iPhone Home Screen `safe-area-inset-top` usability and multi-machine pairing windows to scope.
- [Specification: User Registration/Login & Multi-Machine OpenCode Pairing Windows, Deterministic Station Routing & Committed Walk Queue, Real Host Git Commit CRUD & Feature Retirement, Border-Locked Camera & iPhone Safe-Area Top Bar](./spec.md): Published 26 user stories, 4 implementation decisions, and 4 testing seams.
- [01: User Registration, Login, Profile Config & Multi-Machine OpenCode Pairing Windows](./issues/01-user-auth-profile-and-multi-machine-opencode-pairing-windows.md): Parallel vertical slice for User Registration, Login, Profile Config, and Multi-Machine OpenCode Pairing CRUD windows.
- [02: Deterministic Action-to-Station Routing (Library for Read, Armory for Skill) & Non-Interruptible Committed Walk Queue](./issues/02-deterministic-station-mapping-and-committed-walk-queue.md): Parallel vertical slice for `Library` file reads, `Armory` skill equipping, and committed walk legs with zero mid-path U-turns.
- [03: Read-Write Host Workspace Mount, Live Git Commit CRUD & Committed Feature Retirement](./issues/03-real-host-git-commit-crud-and-committed-feature-retirement.md): Parallel vertical slice for read-write host Git mounting, real Git commit execution, and immediate retirement of completed features.
- [04: Border-Locked Chamber Camera, Post-Navigation Mobile Re-Anchoring & iPhone Home Screen Safe-Area Top Bar](./issues/04-border-locked-chamber-camera-mobile-reanchoring-and-iphone-pwa-safe-area.md): Parallel vertical slice for `0px` off-screen camera clamping, post-navigation mobile border re-anchoring, and iPhone Home Screen safe-area top bar.

## Not yet specified

<!-- All wayfinder fog has graduated into spec.md and parallel vertical-slice tickets 01..04 -->

## Out of scope

- Public cross-user account switcher.
- External OAuth / SSO providers.
