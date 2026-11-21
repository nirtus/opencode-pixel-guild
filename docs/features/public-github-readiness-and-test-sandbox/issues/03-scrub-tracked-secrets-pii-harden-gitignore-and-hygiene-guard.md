# 03: Scrub Tracked Secrets/PII, Harden `.gitignore`, Reset History & Add Hygiene Guardrail

Type: grilling
Label: wayfinder:grilling
Status: resolved
Blocked by: 01, 02

## Question

How should tracked credentials (`data/guild-operators.json`, `.opencode-guild-operators.json`, `test-operator-store-O2bwDv/*`), personal paths/usernames/IPs/project names, screenshots (`docs/images/*.png`), HTML reports (`*architecture-review*.html`), and commit `a611d5f` be cleaned up and guarded so no sensitive information can ever be pushed to the public GitHub repository?

## Answer

Confirmed in Grilling Round 1 (`Q5`, `Q6`):
- Untrack (`git rm --cached -r`) `data/guild-operators.json`, `.opencode-guild-operators.json`, `test-operator-store-O2bwDv/`, `docs/images/`, `docs/features/**/images/`, `architecture-review.html`, and `docs/architecture-review-*.html`, and delete `.opencode-guild-operators.json` and `test-operator-store-O2bwDv/` from disk.
- Harden `.gitignore` to block `data/`, `*.sqlite*`, `*.db`, `.opencode-guild-operators.json`, `*operators.json`, `.env*`, `.DS_Store`, `tests/.tmp/`, `tests/test-*/`, `tests/**/*.sqlite*`, `test-*/`, `docs/images/`, `docs/features/**/images/`, `architecture-review*.html`, and `docs/architecture-review*.html`.
- Scrub all personal usernames, OS user paths, private project names, and internal WSL IPs across `src/web/operator-modal-views.ts`, `AGENTS.md`, `tests/01,06,16,18,19,20`, and `docs/features/**`, replacing them with neutral guild fixtures (`guild-master`, `Commander Aria`, `Archmage Aria`, `pixel-guild-cloud`, `pixel-guild-core`, `192.0.2.10`).
- Add an automated public-repository hygiene invariant in `tests/00-architecture-invariants.test.ts` that scans `git ls-files` and all tracked text files for forbidden store files, `test-*` folders, personal identifiers, and root `mkdtempSync` calls.
- Reset/squash the branch history onto the clean initial commit `1122cea` (`nirtus <39859770+nirtus@users.noreply.github.com>`) so commit `a611d5f`'s leaked OpenTunnel tokens and corporate email are purged from Git history.

## Acceptance Criteria

- [x] `git ls-files` contains zero `data/**`, `*.sqlite*`, `*operators.json`, `test-*`, `tests/.tmp/**`, `docs/images/**`, or `*architecture-review*.html` files.
- [x] Zero tracked files contain personal identifiers, private project names, tunnel tokens, or internal WSL IPs.
- [x] `tests/00-architecture-invariants.test.ts` enforces `.gitignore` coverage, `git ls-files` cleanliness, and zero personal identifier leaks on every `npm test`.
- [x] Git commit history on the branch contains no historical commits with leaked tokens or corporate emails.
