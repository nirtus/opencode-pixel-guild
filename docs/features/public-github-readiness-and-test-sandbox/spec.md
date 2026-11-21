# Specification: Public GitHub Readiness, Confined Test Sandbox (`tests/`), Guild Chronicle Storage Seam, Secret/PII Scrubbing & View-Model Redaction

## Problem Statement

Preparing `opencode-game-visualizer` to be published to a public GitHub repository (`https://github.com/nirtus/opencode-guild.git`) surfaced four architectural and security gaps across test artifact management, server persistence configuration, Git index hygiene, and UI path/endpoint display:

1. **Scattered Root `mkdtempSync` Calls & Orphaned `test-operator-store-*` Folders (Candidate 1)**:
   - Six test suites (`tests/00`, `08`, `14`, `16`, `17`, `20`) invoke `mkdtempSync(join(process.cwd(), "test-..."))` at 8 call sites directly inside the repository root (`test-operator-store-*`, `test-real-git-repo-*`, `test-svc-disc-*`, `test-issue-tracker-*`, `test-empty-proj-*`, `test-wsl-sync-*`, `test-auth-gate-*`, `test-proj-data-*`) instead of confining temporary test directories inside `tests/`.
   - In `tests/16-user-auth-station-choreography-and-live-git.test.ts` (`lines 9–192`), `rmSync(tempDir)` is placed only inside the second `try / finally` block (`line 191`), leaving all assertions in the first `listener1` phase (`lines 63–167`) unguarded. When Phase 1 threw an assertion error during development, `test-operator-store-O2bwDv/` remained on disk in the repository root and was accidentally committed into Git.
   - In `tests/00-architecture-invariants.test.ts:689` and `tests/14-live-daemon-auto-discovery-and-session-sync.test.ts:342`, `writeFileSync` executes outside the `try / finally` cleanup block.

2. **Shallow `GuildChronicleStore` Configuration & Root `.opencode-guild-operators.json` Auto-Migration (Candidate 2)**:
   - `createOperatorWorkspaceRegistry` (`src/server/operator-registry.ts:27–59`) and `createGuildChronicleStore` (`src/server/chronicle-sqlite-store.ts:30–79`) expose three overlapping path options (`storeFilePath`, `dataDirPath`, `legacyOperatorStorePath`).
   - Passing `operatorStorePath` in a test implicitly enables disk-backed SQLite creation (`guild-chronicle.sqlite`) alongside the JSON file, and previously auto-migrated the host's root `.opencode-guild-operators.json` into `test-operator-store-O2bwDv/`, contaminating test directories with real **Guild Operator** credentials and live **OpenCode Machine Pairing** tokens.

3. **Live Credentials, Tokens, Personal Paths & Screenshots Tracked in Git Index & History (Candidate 3)**:
   - Four credential and database files were tracked in Git (`git ls-files` from commit `a611d5f`):
     - `data/guild-operators.json`
     - `.opencode-guild-operators.json`
     - `test-operator-store-O2bwDv/operators.json`
     - `test-operator-store-O2bwDv/guild-chronicle.sqlite`
   - All four contained a real **Guild Operator** account (`scrypt` salt + password hash), **two plaintext 30-day OpenTunnel bearer tokens** (`daemonPassword` for `*.opentunnel.xyz`), and private host directories.
   - Personal usernames, OS user paths, private project names, and internal WSL IPs appeared across `src/web/operator-modal-views.ts` (`lines 160, 164`), `AGENTS.md` (`lines 5, 28`), `tests/01`, `06`, `16`, `18`, `19`, `20`, `docs/features/**`, 18 `architecture-review*.html` files, and 128 tracked screenshots (`docs/images/*.png`), while commit `a611d5f` recorded a corporate author email.

4. **Raw Host OS User Paths & Full Tunnel Subdomains Rendered on Canvas & HUD (Candidate 4)**:
   - The **Workshop Room** wall banner and **Guild Operator** modals rendered unredacted OS user home paths (`/c/Users/<user>/Documents/...`) and full remote tunnel subdomains (`https://<subdomain>.opentunnel.xyz`), causing any screenshot or screen capture of the live visualizer to leak the operator's OS username and private tunnel host.

---

## Core Design Decisions (Confirmed in Grilling Round 1, Q1–Q7)

### Decision 1: Confined `TestSandbox` Module Inside `tests/` & `.gitignore` Protection (`Candidate 1` · `Q2, Q3`)

- **Single `withTestSandbox` Seam (`tests/test-sandbox.ts`)**:
  - Introduce a dedicated test helper module `tests/test-sandbox.ts` exporting `withTestSandbox(prefix: string, fn: (sandbox: TestSandbox) => Promise<void> | void): Promise<void>`.
  - Every temporary test directory (`test-operator-store-*`, `test-real-git-repo-*`, `test-svc-disc-*`, `test-issue-tracker-*`, `test-empty-proj-*`, `test-wsl-sync-*`, `test-auth-gate-*`, `test-proj-data-*`) is allocated strictly inside `tests/.tmp/<prefix>-<random>` (auto-creating `tests/.tmp/` with `mkdirSync(..., { recursive: true })`).
  - `withTestSandbox` wraps execution in an outer `try / finally` block that always removes `sandbox.dirPath` via `rmSync(sandbox.dirPath, { recursive: true, force: true })`—even when an assertion fails midway through a multi-phase test—and registers a `process.once("exit")` sweep that removes any remaining directories under `tests/.tmp/`.
- **`.gitignore` Coverage for Test Folders**:
  - Add `tests/.tmp/`, `tests/test-*/`, `tests/**/*.sqlite*`, and root `test-*/` to `.gitignore` so all generated test files and folders inside `tests/` are ignored by Git while keeping the `tests/*.test.ts` test suite tracked for public CI and contributors.

### Decision 2: Deepen `GuildChronicleStore` Storage Seam & Remove Legacy Root Store (`Candidate 2` · `Q4`)

- **Two Explicit Adapters (`memory` vs Confined `directory`)**:
  - Refactor `createGuildChronicleStore` (`src/server/chronicle-sqlite-store.ts`) and `createOperatorWorkspaceRegistry` (`src/server/operator-registry.ts`) so storage is configured cleanly via:
    - **In-memory mode (`:memory:`)**: Default when neither `dataDirPath` nor `operatorStorePath` is provided, creating zero files or directories on disk during unit tests.
    - **Confined directory mode**: Uses `./data/` in production (`src/server/main.ts`) or `sandbox.dirPath` inside `tests/.tmp/` when a test explicitly verifies disk persistence across server restarts.
- **Delete Root `.opencode-guild-operators.json` Auto-Migration**:
  - Remove `legacyOperatorStorePath` from `CreateGuildCompanionServerOptions`, `CreateOperatorRegistryOptions`, and `CreateGuildChronicleStoreOptions`, and delete the `.opencode-guild-operators.json` auto-migration block from `src/server/chronicle-sqlite-store.ts` and `src/server/main.ts`.

### Decision 3: Scrub Tracked Secrets/PII, Harden `.gitignore`, Reset Commit History & Enforce Hygiene Invariant (`Candidate 3` · `Q5, Q6`)

- **Untrack & Delete Leaked Credential Stores and Local Artifacts**:
  - Remove from Git tracking (`git rm --cached -r`) and delete from the working tree:
    - `.opencode-guild-operators.json`
    - `test-operator-store-O2bwDv/`
  - Remove from Git tracking (`git rm --cached -r`):
    - `data/guild-operators.json`
    - `docs/images/` and `docs/features/**/images/`
    - `architecture-review.html` and `docs/architecture-review-*.html`
- **Harden `.gitignore`**:
  - Configure `.gitignore` to ignore:
    - `node_modules/`, `dist/`, `.worktrees/`, `*.log`, `.env*`, `.DS_Store`
    - `data/`, `*.sqlite`, `*.sqlite-*`, `*.db`, `.opencode-guild-operators.json`, `*operators.json`
    - `tests/.tmp/`, `tests/test-*/`, `tests/**/*.sqlite*`, `test-*/`
    - `docs/images/`, `docs/features/**/images/`, `architecture-review*.html`, `docs/architecture-review*.html`
- **Scrub All Personal Identifiers Across `src/`, `tests/`, `AGENTS.md`, and `docs/features/`**:
  - `src/web/operator-modal-views.ts` (`lines 160, 164`): Use `placeholder="e.g. guild-master"` and `placeholder="e.g. Archmage Aria"`.
  - `AGENTS.md` (`lines 5, 28`): Reference `./` (the repository root directory) rather than a developer-specific host path.
  - `tests/01`, `06`, `16`, `18`, `19`, `20` and `docs/features/**`: Replace personal usernames, OS paths, private project names, and internal WSL IPs with neutral guild fixtures (`guild-master`, `Commander Aria`, `Archmage Aria`, `pixel-guild-cloud`, `pixel-guild-core`, `192.0.2.10`).
- **Automated Public-Repo Hygiene Guardrail (`tests/00-architecture-invariants.test.ts`)**:
  - Add an invariant test in `tests/00-architecture-invariants.test.ts` that:
    1. Inspects `git ls-files` and asserts zero tracked files match `data/**`, `*.sqlite*`, `*operators.json`, `test-*`, `tests/.tmp/**`, `tests/test-*`, `docs/images/**`, or `*architecture-review*.html`.
    2. Scans all tracked text files and asserts zero occurrences of personal identifiers or raw `mkdtempSync` calls outside `tests/test-sandbox.ts`.
- **Clean Git History Reset Before Public Push**:
  - Squash/reset the branch onto initial public commit `1122cea` (`nirtus <39859770+nirtus@users.noreply.github.com>`) so commit `a611d5f` (containing the leaked OpenTunnel tokens and corporate author email) is completely removed from the branch history before pushing to GitHub.

### Decision 4: Redact OS Home Paths & Remote Tunnel Subdomains at the View-Model Seam (`Candidate 4` · `Q7`)

- **Public-Safe Display Formatters**:
  - Introduce pure formatting helpers at the scene/HUD seam (`formatPublicSafePath(rawPath: string)` and `formatPublicSafeEndpoint(rawUrl: string)`):
    - `formatPublicSafePath` collapses OS user home prefixes (`/c/Users/<user>/`, `/mnt/c/Users/<user>/`, `/Users/<user>/`, `/home/<user>/`, `C:\Users\<user>\`) to `~/`, so **Workshop Room** wall banners and tooltips display `~/Documents/Development/opencode-game-visualizer` instead of exposing the host OS username.
    - `formatPublicSafeEndpoint` masks the middle characters of multi-segment tunnel hostnames (`*.opentunnel.xyz`, `*.lhr.life`, `*.ngrok-free.app`, `*.trycloudflare.com`) into `https://2a1a•••f556.opentunnel.xyz` in top-bar badges and machine status pills while keeping the unmasked `daemonUrl` in internal runtime state for HTTP/SSE requests.
