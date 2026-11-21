# 01: Relocate `docs/architecture-review-*.html` into `docs/architecture-review/` and Update `.dockerignore` & Hygiene Guard

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: None

## Description

Complete the filesystem move and guard updates specified in `docs/features/architecture-review-directory/spec.md`:

1. Move all `docs/architecture-review-*.html` files into `docs/architecture-review/` (`git mv` for tracked files, `rm` for untracked `./architecture-review.html` and top-level `docs/architecture-review-20261109-assembly-showcase-and-commit-deepening.html`).
2. Update relative `images/` and `examples/` asset URLs to `../images/` and `../examples/` in:
   - `docs/architecture-review/architecture-review-20261027-desktop-space.html`
   - `docs/architecture-review/architecture-review-20261027-sessions-and-live-sync.html`
   - `docs/architecture-review/architecture-review-mobile-ux-best-practices-20261025.html`
   - `docs/architecture-review/architecture-review-graphics-overhaul-20261024.html`
   - `docs/architecture-review/architecture-review-graphics-environments-20261025.html`
3. Update `.dockerignore` to exclude `docs/architecture-review/*.html`.
4. Add an assertion in `verifyRepositoryPublicHygiene` (`tests/test-sandbox.ts`) ensuring no tracked `architecture-review*.html` file exists outside `docs/architecture-review/`.

## Acceptance Criteria

- [ ] Zero `architecture-review*.html` files exist in `./` or directly in `docs/architecture-review-*.html`; all live under `docs/architecture-review/`.
- [ ] Relative `../images/` and `../examples/` paths inside `docs/architecture-review/*.html` resolve cleanly.
- [ ] `.dockerignore` includes `docs/architecture-review/*.html`.
- [ ] `npm test` passes with 0 failures.
