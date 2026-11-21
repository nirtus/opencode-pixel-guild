# Feature Map: Public GitHub Readiness, Confined Test Sandbox (`tests/`), Guild Chronicle Storage Seam, Secret/PII Scrubbing & View-Model Redaction

Label: wayfinder:map

## Destination

Deliver the complete public-repository readiness and architectural deepening specification in [Specification: Public GitHub Readiness, Confined Test Sandbox (`tests/`), Guild Chronicle Storage Seam, Secret/PII Scrubbing & View-Model Redaction](./spec.md) through four vertical-slice tickets:
1. **[01: Confined Test Sandbox Module Inside `tests/` & Failure-Safe Cleanup](./issues/01-confined-test-sandbox-inside-tests-and-cleanup-guarantees.md)** (`Blocked by: None`)
2. **[02: Deepen `GuildChronicleStore` Storage Seam & Delete Legacy Root Store Migration](./issues/02-deepen-guild-chronicle-store-seam-and-delete-legacy-root-store.md)** (`Blocked by: 01`)
3. **[03: Scrub Tracked Secrets/PII, Harden `.gitignore`, Reset History & Add Hygiene Guardrail](./issues/03-scrub-tracked-secrets-pii-harden-gitignore-and-hygiene-guard.md)** (`Blocked by: 01, 02`)
4. **[04: Redact OS Home Paths & Remote Tunnel Subdomains at the View-Model Seam](./issues/04-redact-home-paths-and-tunnel-subdomains-at-view-model-seam.md)** (`Blocked by: None`)

## Notes

- **Mode**: Wayfinder charting & design phase complete (`map.md`, `spec.md`, and tickets `01..04` resolved; no production or test code in `src/**`, `tests/**`, or `.gitignore` modified yet).
- **Domain**: **Guild Operator**, **OpenCode Machine Pairing**, **Guild Chronicle Store**, **Workshop Room**, **Project World**, **Spectator Drawer**.
- **Architecture Review Report**: [Public GitHub Readiness & Test Sandbox Architecture Review (2026-10-27)](../../architecture-review/architecture-review-20261027-public-github-readiness.html).
- **Specification**: [Feature Specification](./spec.md).
- **Skills to consult**: `codebase-design`, `domain-modeling`, `grilling`, `tdd`, `code-review`.
- **Standing Rules**: Work strictly inside the project root directory (`./`). Never create git worktrees or write files to `/tmp` or `/tmp/opencode`. Every source file in `src/` must remain `<= 400` lines. All temporary test folders must be created inside `tests/.tmp/` (never in the repository root).

## Decisions so far

- [Public GitHub Readiness & Test Sandbox Architecture Review (2026-10-27)](../../architecture-review/architecture-review-20261027-public-github-readiness.html): Audited tracked Git files, test folder creation across `tests/`, and PII/secret leaks across code, tests, docs, and screenshots; confirmed all `Q1–Q7` decisions in Grilling Round 1.
- [01: Confined Test Sandbox Module Inside `tests/` & Failure-Safe Cleanup](./issues/01-confined-test-sandbox-inside-tests-and-cleanup-guarantees.md): Route all 8 `mkdtempSync` test allocations through a single `withTestSandbox` module in `tests/test-sandbox.ts` that writes strictly inside `tests/.tmp/` with outer `try / finally` + `process.once("exit")` cleanup, and gitignore `tests/.tmp/`, `tests/test-*/`, `tests/**/*.sqlite*`, and `test-*/`.
- [02: Deepen `GuildChronicleStore` Storage Seam & Delete Legacy Root Store Migration](./issues/02-deepen-guild-chronicle-store-seam-and-delete-legacy-root-store.md): Simplify `GuildChronicleStore` to two explicit adapters (`:memory:` default for unit tests, confined directory `./data/` or `tests/.tmp/` for persistence) and delete the root `.opencode-guild-operators.json` auto-migration path.
- [03: Scrub Tracked Secrets/PII, Harden `.gitignore`, Reset History & Add Hygiene Guardrail](./issues/03-scrub-tracked-secrets-pii-harden-gitignore-and-hygiene-guard.md): Untrack and remove leaked operator stores, screenshots, and HTML review artifacts from Git, scrub all personal paths/usernames/IPs/project names across `src/`, `tests/`, `AGENTS.md`, and `docs/features/**`, enforce a `git ls-files` secret/PII scanner in `tests/00-architecture-invariants.test.ts`, and squash/reset the branch onto `1122cea` (`nirtus`) to purge `a611d5f`'s leaked tokens and work email from Git history.
- [04: Redact OS Home Paths & Remote Tunnel Subdomains at the View-Model Seam](./issues/04-redact-home-paths-and-tunnel-subdomains-at-view-model-seam.md): Redact OS user home prefixes (`/c/Users/<user>/`, `/Users/<user>/`, `/home/<user>/`) to `~/` on **Workshop Room** wall banners and mask middle characters of remote tunnel subdomains in HUD badges while preserving raw URLs internally.

## Not yet specified

<!-- All wayfinder fog has graduated into spec.md and resolved decision tickets 01..04 -->

## Out of scope

- External OAuth / third-party identity providers beyond the local **Guild Operator** store.
- Automated remote `git push --force` to GitHub without explicit user invocation.
