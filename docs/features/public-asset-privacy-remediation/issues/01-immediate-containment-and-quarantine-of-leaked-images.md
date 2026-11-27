# Immediate Containment & Quarantine of Leaked Public Documentation Assets

Type: task
Label: wayfinder:task
Status: resolved

## Question

Execute immediate local containment so zero confirmed leaked screenshots can be accidentally committed or pushed from the current working tree while remediation proceeds:

1. Remove all 11 confirmed leaked images from `assets/images/` (and ensure `git rm --cached` / unstaging removes them from the Git index):
   - `coalesced-sse-host-switch-ownership.png`
   - `command-scroll-send-reliability.png`
   - `dynamic-assembly-standard-level.png`
   - `dynamic-assembly-volume-levels.png`
   - `header-machine-strip-layout.png` *(currently staged locally only — never pushed!)*
   - `mermaid-chat-diagrams.png`
   - `opencode-sessions-sync.png`
   - `paired-servers-availability.png`
   - `quest-gate-sync-and-bypass.png`
   - `single-row-project-browser.png`
   - `smooth-rounded-pathing-choreography.png`
   *(If [Audit All Remaining 16 Static Images in assets/images/ & Public Repo References](./02-audit-remaining-assets-and-external-references.md) has already identified any additional `LEAKED` images, quarantine those in the same pass.)*
2. Remove the broken/leaked image embeds and adjacent text leak from:
   - `README.md` (lines `47`, `49`, `188`, `190`, `192`, `221`, `229`, `237`, `245`, `253`, `255`)
   - `docs/awesome-opencode-submission.md` (lines `364`, `367`, `372` referencing `mermaid-chat-diagrams.png`)
   - `docs/features/coalesced-sse-host-switch-ownership/spec.md` (line `6` embedding `../../images/coalesced-sse-host-switch-ownership.png`)
   - `docs/features/workflow-e2e-audit/spec.md` (redact non-synthetic project short tags in inline table text at line `39`, and remove stale `./docs/images/` embeds across tracked `docs/features/` files listed in [Audit All Remaining 16 Static Images in assets/images/ & Public Repo References](./02-audit-remaining-assets-and-external-references.md))
3. Verify:
   - `git ls-files docs/images/` returns `0` files.
   - `git ls-files assets/images/` contains none of the quarantined filenames.
   - `tests/00-architecture-invariants.test.ts` and `tests/21-public-github-readiness-and-test-sandbox.test.ts` pass cleanly.
4. Record the exact list of quarantined files and updated doc lines under `## Answer` (without transcribing any real project names).

## Answer

### 1. Quarantined & Removed Binaries (`git rm -f`)
Removed all 11 confirmed leaked PNG files from both `assets/images/` on disk and the Git index:
- `assets/images/coalesced-sse-host-switch-ownership.png`
- `assets/images/command-scroll-send-reliability.png`
- `assets/images/dynamic-assembly-standard-level.png`
- `assets/images/dynamic-assembly-volume-levels.png`
- `assets/images/header-machine-strip-layout.png` *(removed before ever being committed or pushed)*
- `assets/images/mermaid-chat-diagrams.png`
- `assets/images/opencode-sessions-sync.png`
- `assets/images/paired-servers-availability.png`
- `assets/images/quest-gate-sync-and-bypass.png`
- `assets/images/single-row-project-browser.png`
- `assets/images/smooth-rounded-pathing-choreography.png`

### 2. Documentation & Tracker Sanitization
- **`README.md`**: Removed all 11 leaked image embeds and rebalanced the `Visual Tour` table (`2×2` with 4 verified clean/synthetic images) and `Assembly & Commit` / `Character Sheet` sections so all 19 remaining `./assets/images/` references resolve to the 18 verified `CLEAN` / `SYNTHETIC-SAFE` files (`0` missing, `0` leaked).
- **`docs/awesome-opencode-submission.md`**: Replaced plain-text mentions of `assets/images/mermaid-chat-diagrams.png` (lines `364`, `367`, `372`) with the verified `SYNTHETIC-SAFE` `assets/images/opencode-pixel-guild-intro-preview.gif` alongside `docs/video/opencode-pixel-guild-intro.mp4`.
- **`docs/features/` (9 tracked files)**:
  - Removed all `27` stale/broken `docs/images/` / `../../images/` / `../../../images/` markdown embeds across `coalesced-sse-host-switch-ownership/spec.md`, `workflow-e2e-audit/spec.md`, `all-worlds-composite-mini-assemblies/spec.md`, `atomic-summon-and-ghost-directory-pruning/spec.md`, `fast-remote-machine-switching/spec.md`, `paired-machine-switch-leak-prevention/spec.md`, `paired-machine-worlds-and-state/spec.md`, `per-bug-monster-combat-targeting/spec.md`, and `per-bug-monster-combat-targeting/issues/03-regression-tests-and-docker-visual-verification.md`.
  - Redacted the non-synthetic short project tag in inline table prose at `docs/features/workflow-e2e-audit/spec.md:39`.

### 3. Verification Evidence
- **Git & Asset Inventory**:
  - `git ls-files docs/images/` → `0` tracked files.
  - `git ls-files assets/images/` → `18` tracked files (`16` audited `CLEAN` + `intro-demo-video.png` + `opencode-pixel-guild-intro-preview.gif`); `0` quarantined files on disk or in Git index.
  - `git grep -n '!\[.*\](.*images/' -- docs/` → only `docs/awesome-opencode-submission.md:55, 93` (both pointing to `SYNTHETIC-SAFE` `opencode-pixel-guild-intro-preview.gif`).
- **Docker Container (`npm run docker:up`)**:
  - `opencode-pixel-guild-visualizer` rebuilt and running `Up (healthy)` on `0.0.0.0:4310->4310/tcp`.
  - `GET http://127.0.0.1:4310/api/guild/snapshot` → `200`; `HEAD http://127.0.0.1:4310/assets/images/opencode-pixel-guild-intro-preview.gif` → `200`.
  - *(Note: headless Chrome is not installed on this native Linux host; containerized Chromium capture will be introduced via Tickets `04`–`07`.)*
- **Automated Hygiene & Asset Gates**:
  - `tests/00-architecture-invariants.test.ts` subtests `Public GitHub Readiness Invariant` and `Dead Code & Asset Hygiene Gate (assets/images)` passed.
  - `tests/21-public-github-readiness-and-test-sandbox.test.ts`: `7/7` passed.
  - `tests/49-intro-demo-video-director.test.ts`: `3/3` passed.
  - *(Unrelated in-flight failures observed in concurrent session work on `60 Live OpenCode Model & Variant Selection`: `src/hud/character-sheet-vm.ts` at 405 lines and `src/web/command-scroll-target-controls.ts` unreachable; zero `src/` files were modified by this ticket.)*
