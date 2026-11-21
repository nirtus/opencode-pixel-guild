# Feature Map: Consolidate `architecture-review-*.html` Documents Under `docs/architecture-review/`

Label: wayfinder:map

## Destination

Store all `architecture-review-*.html` documents inside `docs/architecture-review/` (`docs/architecture-review/architecture-review-<slug>.html`), align all agent rules (`AGENTS.md`, `docs/agents/domain.md`, `docs/agents/issue-tracker.md`), `README.md`, and `docs/features/**` references, relocate existing `docs/architecture-review-*.html` files into `docs/architecture-review/`, and enforce the directory convention in `.dockerignore` and `tests/test-sandbox.ts`.

## Notes

- **Rules Updated (`Document` Mode)**:
  - `AGENTS.md`, `README.md`, `docs/agents/domain.md`, `docs/agents/issue-tracker.md`, `docs/architecture-review/README.md`, and all `docs/features/**` maps/specs/tickets now point to `docs/architecture-review/architecture-review-*.html`.
- **Remaining Build Ticket**:
  - **[01: Relocate `docs/architecture-review-*.html` into `docs/architecture-review/` and Update `.dockerignore` & Hygiene Guard](./issues/01-relocate-architecture-review-html-files-and-update-guards.md)** (`Status: open`, `Label: ready-for-agent`)

## Decisions so far

- **Canonical Architecture Review Directory (`docs/architecture-review/`)**: Updated `AGENTS.md`, `README.md`, `docs/agents/domain.md`, `docs/agents/issue-tracker.md`, and all `docs/features/**` references so all `architecture-review-*.html` documents live under `docs/architecture-review/`.

## Not yet specified

_None._

## Out of scope

- Modifying application runtime logic in `src/`.
