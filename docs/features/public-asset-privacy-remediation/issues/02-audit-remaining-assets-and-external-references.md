# Audit All Remaining 16 Static Images in assets/images/ & Public Repo References

Type: research
Label: wayfinder:research
Status: resolved

## Question

Visually inspect all 16 remaining non-demo static PNG screenshots currently in `assets/images/` and audit tracked public documentation files to determine whether any other images or docs expose real project names, private repository paths, real host/machine names, personal usernames, or private session/chat content:

Images to audit:
1. `assets/images/active-roster-show-subagents.png`
2. `assets/images/mobile-graphics-overhaul-wilds.png`
3. `assets/images/opencode-mode-selection-send-and-summon.png`
4. `assets/images/overhaul-mobile-04-hero-expanded.png`
5. `assets/images/per-bug-monster-combat-targeting-wilds.png`
6. `assets/images/readme-and-docs-rule-verified.png`
7. `assets/images/uniform-mobile-page-general.png`
8. `assets/images/uniform-mobile-page-room.png`
9. `assets/images/unviewed-session-result-sheet.png`
10. `assets/images/verified-desktop-02-ledger-assembly-commit.png`
11. `assets/images/verified-desktop-06-hero-scrolls-gear.png`
12. `assets/images/verified-desktop-07-hero-tool-log.png`
13. `assets/images/verify-v3-02-tunnel-and-qr-pairing.png`
14. `assets/images/world-demolish-persistence.png`
15. `assets/images/world-selection-game-master-scope.png`
16. `assets/images/world-selection-single-world-scope.png`

Also confirm whether `assets/images/intro-demo-video.png` and `assets/images/opencode-pixel-guild-intro-preview.gif` (generated from `src/web/intro-demo-timeline.ts`) contain 100% synthetic text only, and list any remaining markdown image embeds pointing at `docs/images/` or `../images/` across tracked `docs/` files.

**Strict Privacy Rule**: NEVER transcribe any real project name, hostname, username, tunnel URL, or private text into the findings. Report only filename, `CLEAN` vs `LEAKED` verdict, and generic UI region(s) where real data appears (for example, `Worlds bar`, `underfoot nameplate`, `Commit Ledger path`, `Hero Chat`, `top-bar machine strip`).

## Answer

### Executive Summary

- **16 remaining static PNGs in `assets/images/`**: **`16 CLEAN` / `0 LEAKED`** — every file was captured against synthetic demo fixtures (or the unauthenticated Operator Auth Gate modal) and contains zero PNG text/EXIF metadata chunks (`tEXt`/`zTXt`/`iTXt`/`eXIf`). All 16 will still be superseded by deterministic scenes under the 100%-synthetic `Public Asset Manifest` rule, so no extra quarantined binaries are needed beyond the original 11 flagged files.
- **Intro demo assets (`assets/images/intro-demo-video.png` & `assets/images/opencode-pixel-guild-intro-preview.gif`)**: **`SYNTHETIC-SAFE`** — verified visually and by inspecting `src/web/intro-demo-timeline.ts`, `src/web/intro-demo-director.ts`, and `docs/video/record-intro-demo.ts` (hardcoded synthetic projects `opencode-pixel-guild`, `arcane-engine`, `chronicle-core`, `ses-demo-*` sessions, loopback `http://127.0.0.1:4096`, zero live daemon/operator contact).
- **Tracked `docs/` markdown image embeds (excluding `docs/graphify-out/`)**: **`29` embeds across `10` tracked files** (`2` valid raw-GitHub embeds for the `SYNTHETIC-SAFE` GIF in `docs/awesome-opencode-submission.md:55, 93`; `27` stale/broken `docs/images/` embeds across `9` tracked `docs/features/` files).
- **Adjacent Privacy Text Finding**: `docs/features/workflow-e2e-audit/spec.md:39` contains inline table description text listing non-synthetic project short tags from a Goal Assembly Site bay capture; added to [Immediate Containment & Quarantine of Leaked Public Documentation Assets](./01-immediate-containment-and-quarantine-of-leaked-images.md) for immediate redaction.

### 1. Visual & Metadata Audit Table (`assets/images/`)

| File | Verdict | Leaked UI Region(s) | Notes |
| :--- | :--- | :--- | :--- |
| `assets/images/active-roster-show-subagents.png` | `CLEAN` | None | Synthetic demo fixtures only; no PNG text metadata. |
| `assets/images/mobile-graphics-overhaul-wilds.png` | `CLEAN` | None | Synthetic demo fixtures only; no PNG text metadata. |
| `assets/images/opencode-mode-selection-send-and-summon.png` | `CLEAN` | None | Synthetic demo fixtures only; no PNG text metadata. |
| `assets/images/overhaul-mobile-04-hero-expanded.png` | `CLEAN` | None | Synthetic demo fixtures only; no PNG text metadata. |
| `assets/images/per-bug-monster-combat-targeting-wilds.png` | `CLEAN` | None | Synthetic demo fixtures only; no PNG text metadata. |
| `assets/images/readme-and-docs-rule-verified.png` | `CLEAN` | None | Unauthenticated Auth screen only (`Step 1: Register`); no PNG text metadata. |
| `assets/images/uniform-mobile-page-general.png` | `CLEAN` | None | Synthetic demo fixtures only; no PNG text metadata. |
| `assets/images/uniform-mobile-page-room.png` | `CLEAN` | None | Synthetic demo fixtures only; no PNG text metadata. |
| `assets/images/unviewed-session-result-sheet.png` | `CLEAN` | None | Synthetic demo fixtures only + self-project summary; no PNG text metadata. |
| `assets/images/verified-desktop-02-ledger-assembly-commit.png` | `CLEAN` | None | Synthetic demo fixtures & relative `src/...` paths only; no PNG text metadata. |
| `assets/images/verified-desktop-06-hero-scrolls-gear.png` | `CLEAN` | None | Synthetic demo fixtures only; no PNG text metadata. |
| `assets/images/verified-desktop-07-hero-tool-log.png` | `CLEAN` | None | Synthetic demo fixtures & relative `src/...`/`tests/...` paths only; no PNG text metadata. |
| `assets/images/verify-v3-02-tunnel-and-qr-pairing.png` | `CLEAN` | None | Synthetic demo fixtures & masked synthetic tunnel placeholders only; no PNG text metadata. |
| `assets/images/world-demolish-persistence.png` | `CLEAN` | None | Synthetic demo fixtures only; no PNG text metadata. |
| `assets/images/world-selection-game-master-scope.png` | `CLEAN` | None | Synthetic demo fixtures only; no PNG text metadata. |
| `assets/images/world-selection-single-world-scope.png` | `CLEAN` | None | Synthetic demo fixtures only; no PNG text metadata. |
| `assets/images/intro-demo-video.png` | `SYNTHETIC-SAFE` | None | Offline `?demo=intro-tour` Act IV render; no PNG text metadata. |
| `assets/images/opencode-pixel-guild-intro-preview.gif` | `SYNTHETIC-SAFE` | None | Encoded exclusively from `src/web/intro-demo-timeline.ts`. |

### 2. Tracked `docs/` Markdown Image Embeds (Excluding `docs/graphify-out/`)

| Tracked File | Line(s) | Pattern | Action |
| :--- | :--- | :--- | :--- |
| `docs/awesome-opencode-submission.md` | `55`, `93` | Raw GitHub URL → `assets/images/opencode-pixel-guild-intro-preview.gif` | Keep (`SYNTHETIC-SAFE`). |
| `docs/features/coalesced-sse-host-switch-ownership/spec.md` | `6` | `../../images/coalesced-sse-host-switch-ownership.png` | Remove in Ticket `01` (flagged leak). |
| `docs/features/all-worlds-composite-mini-assemblies/spec.md` | `130` | `../../images/all-worlds-composite-mini-assemblies.png` | Stale `docs/images/` embed — clean up. |
| `docs/features/atomic-summon-and-ghost-directory-pruning/spec.md` | `69` | `./../../images/atomic-summon-and-ghost-directory-pruning.png` | Stale `docs/images/` embed — clean up. |
| `docs/features/fast-remote-machine-switching/spec.md` | `6` | `../../images/fast-remote-machine-switching.png` | Stale `docs/images/` embed — clean up. |
| `docs/features/paired-machine-switch-leak-prevention/spec.md` | `6` | `../../images/paired-machine-switch-leak-prevention.png` | Stale `docs/images/` embed — clean up. |
| `docs/features/paired-machine-worlds-and-state/spec.md` | `6` | `../../images/paired-machine-worlds-and-state.png` | Stale `docs/images/` embed — clean up. |
| `docs/features/per-bug-monster-combat-targeting/spec.md` | `77` | `../../images/per-bug-monster-combat-targeting.png` | Stale `docs/images/` embed — clean up. |
| `docs/features/per-bug-monster-combat-targeting/issues/03-regression-tests-and-docker-visual-verification.md` | `26` | `../../../images/per-bug-monster-combat-targeting.png` | Stale `docs/images/` embed — clean up. |
| `docs/features/workflow-e2e-audit/spec.md` | `14`–`22`, `28`–`32`, `38`–`42` | `./docs/images/{workflow,parallel,scale}-*.png` (`19` embeds) + inline short tags at line `39` | Remove stale embeds & redact line `39` in Ticket `01` (also verify git history for `docs/features/workflow-e2e-audit/spec.md` in Ticket `06`). |
