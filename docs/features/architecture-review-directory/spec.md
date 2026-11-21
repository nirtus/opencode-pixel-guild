# Feature Specification: Consolidate `architecture-review-*.html` Documents Under `docs/architecture-review/`

Label: ready-for-agent

## Problem Statement

1. **Top-Level `docs/` Clutter (`docs/architecture-review-*.html`)**:
   - Thirty `architecture-review-*.html` files live directly in the top-level `docs/` directory alongside subdirectories (`adr/`, `agents/`, `examples/`, `features/`, `images/`, `research/`), and an untracked `architecture-review.html` file sits in the repository root (`./`).
2. **Agent Rule & Pointer Alignment (`AGENTS.md`, `README.md`, `docs/agents/*`, `docs/features/**`)**:
   - Agent instructions (`AGENTS.md`, `docs/agents/domain.md`, `docs/agents/issue-tracker.md`) and feature maps/specs (`docs/features/**`) previously pointed to `./docs/architecture-review-*.html` or `./architecture-review.html` instead of a dedicated `./docs/architecture-review/` directory.
3. **Relative Asset Links & Build/Hygiene Guards (`.dockerignore`, `tests/test-sandbox.ts`)**:
   - Five HTML review files (`architecture-review-20261027-desktop-space.html`, `architecture-review-20261027-sessions-and-live-sync.html`, `architecture-review-mobile-ux-best-practices-20261025.html`, `architecture-review-graphics-overhaul-20261024.html`, and `architecture-review-graphics-environments-20261025.html`) reference `images/...` or `examples/...` relative to `docs/`, which must become `../images/...` and `../examples/...` inside `docs/architecture-review/`.
   - `.dockerignore` excludes `docs/architecture-review-*.html` and must also exclude `docs/architecture-review/*.html`.
   - `verifyRepositoryPublicHygiene` in `tests/test-sandbox.ts` should assert that no `architecture-review*.html` files exist directly in root `./` or top-level `docs/architecture-review-*.html` outside `docs/architecture-review/`.

## Solution

1. **Agent System & Documentation Rules (Completed in `Document` Mode)**:
   - Updated `AGENTS.md`, `README.md`, `docs/agents/domain.md`, `docs/agents/issue-tracker.md`, and all `docs/features/**` links to specify `docs/architecture-review/architecture-review-<slug>.html` as the canonical path.
   - Created `docs/architecture-review/README.md` and `docs/architecture-review/architecture-review-20261109-assembly-showcase-and-commit-deepening.html`.
2. **File Relocation & Guard Update (`Ticket 01` for `Build` Mode)**:
   - Move all `docs/architecture-review-*.html` files into `docs/architecture-review/` (`git mv docs/architecture-review-*.html docs/architecture-review/`) and remove the untracked root `./architecture-review.html` and duplicate `docs/architecture-review-20261109-assembly-showcase-and-commit-deepening.html`.
   - Update relative `images/` and `examples/` asset paths inside the 5 affected HTML files in `docs/architecture-review/` to `../images/` and `../examples/`.
   - Update `.dockerignore` to include `docs/architecture-review/*.html`.
   - Add an assertion in `verifyRepositoryPublicHygiene` (`tests/test-sandbox.ts`) verifying that any tracked `architecture-review*.html` file resides inside `docs/architecture-review/`.
