# Design Curated Synthetic Documentation Showcase Scene Catalog & Fictional Fixture Contract

Type: grilling
Label: wayfinder:grilling
Status: resolved
Blocked by: 02

## Question

Using the audit findings from [Audit All Remaining 16 Static Images in assets/images/ & Public Repo References](./02-audit-remaining-assets-and-external-references.md), decide and lock:

1. **Curated README Scene Catalog (~12–16 canonical scenes)**: Which exact desktop and mobile scenes will replace all legacy static PNGs in `README.md` and `docs/awesome-opencode-submission.md` (exact output filenames under `assets/images/`, viewport dimensions, target `README.md` section, active chamber focus mode, open HUD tab/subtab/modal, and visual highlights—consolidating redundant stacked captures like the 3 overlapping pairing/machine-strip screenshots)?
2. **Fictional Cast & Fixture Allowlist**: Lock the canonical synthetic data universe used across every scene:
   - Fictional projects & heraldry tags (e.g., `pixel-guild-demo`, `arcane-engine`, `starlight-cli`, `nebula-api`)
   - Fictional paired hosts (`Local Guild Hall`, `Forge-Node-East`, `Build-Relay-02`) and synthetic statuses (`Connected` / `Offline` / overflow strip demo)
   - Fictional operator alias (`guild-master`), synthetic paths (`~/workspace/<project>`), synthetic session titles, Mermaid diagrams, Quest Gate prompts, Git diff filenames, and Bug Monster errors.
3. **Strict Offline Isolation Architecture**: Define how `?demo=docs-showcase&scene=<id>` hooks into the client boot sequence (`src/web/app-main.ts` / `intro-demo-director.ts` seam) so it short-circuits `EventSource` SSE, `/api/guild/snapshot`, `/api/guild/users/me`, and `/api/guild/git/*` completely—rendering deterministically with zero live server or `./data/` contact while respecting the strict `<= 400`-line file ceiling.

## Answer

### 1. Locked 18-Scene Curated Catalog (`assets/images/showcase-*.png`)

All 27 legacy static PNG filenames in `README.md` (and `mermaid-chat-diagrams.png` in `docs/awesome-opencode-submission.md`) are retired and replaced by 18 uniform, synthetically generated `assets/images/showcase-*.png` scenes, alongside the 2 preserved synthetic `demo:video` assets (`assets/images/opencode-pixel-guild-intro-preview.gif` and `assets/images/intro-demo-video.png`):

| # | `sceneId` | Output File (`assets/images/`) | Viewport | Target Doc Section(s) | Visual Focus |
| :- | :--- | :--- | :--- | :--- | :--- |
| 1 | `split-chamber` | `showcase-split-chamber.png` | `1600×1000` (`1×`) | `README.md` Visual Tour | `65% / 35%` Split Chamber, smooth rounded choreography, preparation stations, cargo hauling, Project Heraldry |
| 2 | `wilds-combat` | `showcase-wilds-combat.png` | `1600×1000` (`1×`) | `README.md` Visual Tour | Dungeon Wilds Lantern Flares, Fog of War, per-bug named Bug Monster combat |
| 3 | `auth-gate` | `showcase-auth-gate.png` | `1600×1000` (`1×`) | `README.md` §1 Auth Gate | Unauthenticated `Step 1: Register` / Sign In modal over dimmed synthetic Workshop Room |
| 4 | `machine-pairing` | `showcase-machine-pairing.png` | `1600×1000` (`1×`) | `README.md` §2 Pair Machines | Dedicated **OpenCode Machine Pairing** modal (`Link / QR`, `Manual URL`, `Detect Local`, synthetic paired list) |
| 5 | `machine-strip` | `showcase-machine-strip.png` | `1600×1000` (`1×`) | `README.md` §2 Pair Machines | Full Row-1 responsive paired machine strip with `🟢 Connected` / `🟠 Offline` dots, CSS ellipsis, and `◀` / `▶` overflow buttons |
| 6 | `all-worlds` | `showcase-all-worlds.png` | `1600×1000` (`1×`) | `README.md` §3 & §4 Ledger Overview | `🌐 All` worlds scope, composite Project Mini-Assemblies, unread session results, synchronized Active Room Roster |
| 7 | `single-world` | `showcase-single-world.png` | `1600×1000` (`1×`) | `README.md` §3 & §4 Single World | Single focused world with underfoot **World Focus Aura**, `show subagents` checked, single-world `Demolish` button |
| 8 | `assembly-commit` | `showcase-assembly-commit.png` | `1600×1000` (`1×`) | `README.md` Visual Tour & §4 Assembly | `LVL 2 STD` Goal Assembly Site (`0/5`) + `Assembly & Commit` single-row project browser & Git staging/commit CRUD |
| 9 | `assembly-bulk` | `showcase-assembly-bulk.png` | `1600×1000` (`1×`) | `README.md` §4 Assembly Volume | `LVL 4 BULK` reinforced vault stacks (`0/48 ITEMS`) bounded inside the central assembly square |
| 10 | `hero-chat-mermaid` | `showcase-hero-chat-mermaid.png` | `1600×1000` (`1×`) | `README.md` Visual Tour, §5 & `docs/awesome-opencode-submission.md` | `Hero` → `Chat` Dispatch Log with crisp inline SVG Mermaid `flowchart` + `sequenceDiagram` & bottom Command Scroll (`@skill` + Mode selector) |
| 11 | `quest-gate` | `showcase-quest-gate.png` | `1600×1000` (`1×`) | `README.md` §5 Quest Gates | Active `?` **Quest Gate** card with option pills, `Collapse ▾`, `Bypass ✕`, canvas overhead `?`, and unlocked Command Scroll |
| 12 | `hero-scrolls-gear` | `showcase-hero-scrolls-gear.png` | `1600×1000` (`1×`) | `README.md` §5 Character Sheet | `Hero` → `Scrolls & Gear` RPG Equipment Loadout, equipped `@skill` grimoires, MCP plugins, tool counts |
| 13 | `hero-tool-log` | `showcase-hero-tool-log.png` | `1600×1000` (`1×`) | `README.md` §5 Character Sheet | `Hero` → `Tool Log` chronological executed tools with station tags and synthetic `src/` / `tests/` previews |
| 14 | `summon-modal` | `showcase-summon-modal.png` | `1600×1000` (`1×`) | `README.md` §6 Summon & Modal Shell | Unified `Modal Shell` **Summon New Guild Adventurer** modal with directory selector, OpenCode Agent Mode picker, `@skill` chips, explicit `Cancel` / `✕` buttons |
| 15 | `mobile-room` | `showcase-mobile-room.png` | `390×844` (`2×` DPR → `780×1688`) | `README.md` §7 Mobile | Mobile `World` tab (Workshop Room + progress ring + bottom nav) |
| 16 | `mobile-wilds` | `showcase-mobile-wilds.png` | `390×844` (`2×` DPR → `780×1688`) | `README.md` §7 Mobile | Mobile `World` tab (Dungeon Wilds bug combat) |
| 17 | `mobile-ledger` | `showcase-mobile-ledger.png` | `390×844` (`2×` DPR → `780×1688`) | `README.md` §7 Mobile | Mobile `General` tab unified mobile Guild Master Ledger |
| 18 | `mobile-hero` | `showcase-mobile-hero.png` | `390×844` (`2×` DPR → `780×1688`) | `README.md` §7 Mobile | Mobile `Hero` tab Character Sheet |

### 2. Canonical Fictional Cast & Synthetic Allowlist

Every scene draws exclusively from one shared synthetic data universe aligned with `src/web/intro-demo-timeline.ts`:
- **Projects (4)**:
  - `opencode-pixel-guild` (`~/workspace/opencode-pixel-guild`, tag `PIXG`)
  - `arcane-engine` (`~/workspace/arcane-engine`, tag `ARCN`)
  - `chronicle-core` (`~/workspace/chronicle-core`, tag `CHRN`)
  - `starlight-cli` (`~/workspace/starlight-cli`, tag `STAR`)
- **Paired OpenCode Hosts**:
  - Standard set: `Local Guild Hall` (`http://127.0.0.1:4096`, `Connected`), `Forge-Node-East` (`https://forge-east.synthetictunnel.example`, `Connected`), `Build-Relay-02` (`https://relay-02.synthetictunnel.example`, `Offline`).
  - Overflow strip additions (used in `machine-strip`): `Citadel-GPU-01`, `Archive-Runner-West`, `Sanctum-CI-04`.
- **Operator & Synthetic Artifacts**: Operator `guild-master` (alias `Archmage Aldric`), relative repo paths (`src/scene/floorplan.ts`, `src/hud/mermaid-renderer.ts`, `tests/12-guild-combat.test.ts`), synthetic Mermaid diagrams, synthetic Quest Gate options, and synthetic Bug Monster errors (`AssertionError`, `TypeError`).

### 3. Offline Client Boot Seam & `<= 400`-Line Module Split

- **Activation URL**: `?demo=docs-showcase&scene=<sceneId>`.
- **Shared Offline Guard (`isOfflineDemoModeActive()`)**: Returns `true` for both `?demo=intro-tour` and `?demo=docs-showcase`, short-circuiting `connectCompanionBackend()` plus all 6 client seams discovered in [Research Containerized Chromium Capture & OCR/Metadata Verification Toolchain](./03-research-docker-chromium-and-ocr-hygiene-toolchain.md):
  1. `src/web/ledger-panel-reconciler.ts` (`refreshRoomGitState`)
  2. `src/web/side-panel-reconciler.ts` (`maybeHydrateSessionMessagesOnDemand` & `acknowledgeSessionResultAsRead`)
  3. `src/web/operator-pairing-controller.ts` (`refreshCachedOperatorProfile` inside `openOperatorPairingModal`)
  4. `src/web/world-persistence.ts` & `src/web/client-state.ts` (`PATCH /api/guild/users/me` & `localStorage` persistence)
  5. `src/web/app-main.ts` (`guild-operator-changed` / `guild-machine-changed` SSE reconnect listeners)
  6. Synthetic Git working-tree injection via `seedSyntheticRoomGitState()` in `src/web/commit-ledger-controller.ts`.
- **Deterministic Capture Signal**: Sets `window.__docsShowcaseReady = true` strictly after applying scene state, `document.fonts.ready`, `preloadIntroDemoAssets()`, inline SVG hero sprite loads, and 2 deterministic `requestAnimationFrame` paints.
- **Module Split (`<= 400` lines each, 100% reachable from `src/web/app-main.ts`)**:
  - `src/web/docs-showcase-fixtures.ts` — canonical fictional projects, paired machines, operator, sessions, Mermaid turns, Quest Gate, and synthetic Git diffs.
  - `src/web/docs-showcase-scenes.ts` — declarative catalog of the 18 scenes (viewport, camera focus, selected world/hero, HUD tab/subtab, open modal, synthetic Git overrides).
  - `src/web/docs-showcase-director.ts` — query-param parser, `isOfflineDemoModeActive()`, offline boot wiring, modal/tab application, and `window.__docsShowcaseReady` synchronization.
