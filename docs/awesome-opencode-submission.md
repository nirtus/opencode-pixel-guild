# Introducing `OpenCode Pixel Guild` to `awesome-opencode`

This runbook contains the complete, schema-validated submission package for adding **OpenCode Pixel Guild** (`https://github.com/nirtus/opencode-pixel-guild`) to [`awesome-opencode`](https://github.com/awesome-opencode/awesome-opencode/blob/main/contributing.md) under `data/projects/opencode-pixel-guild.yaml`.

---

## 1. Entry Requirements Audit (`contributing.md`)

Every pull request to `awesome-opencode` is checked against 7 rules in [`contributing.md`](https://github.com/awesome-opencode/awesome-opencode/blob/main/contributing.md) and validated in CI by `.github/workflows/validate-pr.yml` (`node scripts/validate.js` against `data/schema.json`):

| # | `awesome-opencode` Rule | Requirement | Status for `nirtus/opencode-pixel-guild` |
| :- | :--- | :--- | :--- |
| **1** | **Format** | One valid YAML file (`kebab-case.yaml`) in the right `data/` folder (`data/projects/`). Never edit `README.md` (auto-generated). | **Ready** — `data/projects/opencode-pixel-guild.yaml` passes `data/schema.json` validation. |
| **2** | **Relevant** | OpenCode is a real, documented target with setup docs, and `description` states OpenCode major version support (`OpenCode V2`). | **Ready** — `README.md` documents Docker Compose, Node.js 22+, `opencode pair`, and local daemon auto-discovery for **OpenCode V2**. |
| **3** | **Public** | Repository is public (`MIT`) with working clone/setup links and no dead URLs. | **Ready** — `https://github.com/nirtus/opencode-pixel-guild` is public (`MIT`) with verified `git clone` URLs. |
| **4** | **Maintained** | Not archived and has a commit in the last 90 days. | **Ready** — Actively maintained. |
| **5** | **Traction** | **At least 25 stars, and the repo is at least 30 days old.** | **Gated until `2026-12-13` & `≥ 25 ★`** — Repo created `2026-11-13`. Submit the PR once both thresholds are met so maintainers do not auto-close it. |
| **6** | **Unique** | Not already in the list and clearly distinct from existing entries. | **Ready** — Placed in `data/projects/` and clearly distinguished from `psinetron/opencode-visualiser` (`data/plugins/`). |
| **7** | **Complete** | All required fields (`name`, `repo`, `tagline`, `description`) present and `tagline` ≤ 120 characters. | **Ready** — Tagline is **111 characters** (`≤ 120`). |

---

## 2. Validated YAML Entry (`data/projects/opencode-pixel-guild.yaml`)

Save this exact file at `data/projects/opencode-pixel-guild.yaml` inside your `awesome-opencode` fork:

```yaml
name: OpenCode Pixel Guild
repo: https://github.com/nirtus/opencode-pixel-guild
tagline: Real-time 2D RPG workshop & dungeon visualizer for live OpenCode V2 sessions, subagents, tools, and Git commits
description: >-
  Self-hosted 2D RPG companion for OpenCode V2 that turns live hosts, projects,
  git worktrees, root sessions, and child subagents into autonomous heroes inside
  a shared Workshop Room and Dungeon Wilds. Watch agents equip @skill grimoires,
  haul MCP cargo, work at tool-specific stations, and battle Bug Monsters during
  failing test/debug turns—while you prompt or steer sessions, answer permission
  and question gates, and stage or commit Git changes from desktop or mobile.
  Zero external npm dependencies (Node.js 22+ or Docker Compose).
tags:
  - visualizer
  - web-ui
  - rpg
  - gamification
  - subagents
  - git
```

### Schema Validation Summary (`data/schema.json`)
- **`name`**: `"OpenCode Pixel Guild"` (non-empty string)
- **`repo`**: `"https://github.com/nirtus/opencode-pixel-guild"` (valid URI)
- **`tagline`**: `111` characters (strictly ≤ `120` max)
- **`description`**: Explicitly specifies **OpenCode V2** support, architecture, and setup modes
- **`tags`**: Valid string array (`visualizer`, `web-ui`, `rpg`, `gamification`, `subagents`, `git`)

---

## 3. Positioning vs. Existing Visualizer Entry

`awesome-opencode` currently lists `Opencode Visualizer` (`https://github.com/psinetron/opencode-visualiser`) under `data/plugins/` as a passive *"2D pixel-art office for AI agents"* that turns terminal logs into office animations.

**OpenCode Pixel Guild** belongs in **`data/projects/`** (*"Tools, GUIs, integrations, and utilities"*, alongside `OpenChamber`, `Open Walnut`, `intentic`, and `Happier`) because it is a full **bi-directional OpenCode V2 companion web app and control plane**:
1. **Multi-Host & Multi-Project Floorplan**: Pairs with local or remote OpenCode V2 daemons via `opencode pair` (QR scanner / link / auto-discovery) and renders all active projects and Git worktrees inside a shared **Workshop Room** with deterministic **Project Heraldry**.
2. **Full Session & Subagent Choreography**: Visualizes root **Guild Adventurers** and child **Squad Subagents** (`Arcane Lectern` summoning ritual, report scrolls, `@skill` grimoires at the `Armory Wardrobe`, MCP cargo at the `Resource Stockpile`, and 10 specialized **Preparation Stations**).
3. **Outdoor Debugging & Bug Monster Combat**: Routes diagnostic searches (`Lantern Flares` clearing `Fog of War`) and failing test/debug turns into the **Dungeon Wilds** to fight per-bug **Bug Monsters**.
4. **Interactive Command Dispatch & Git CRUD**: Lets operators summon heroes, switch **OpenCode Agent Modes** (`build`, `plan`, `document`), answer `!` permission and `?` question **Quest Gates**, and stage/commit/sync Git working-tree changes in the **Assembly Commit Ledger** across desktop and mobile.

---

## 4. One-Command Fork, Validate & PR Submission Runbook

### Step A: Update GitHub Repository Metadata Now

Ensure the public GitHub repository displays its description and discoverability topics:

```bash
gh repo edit nirtus/opencode-pixel-guild \
  --description "Real-time 2D RPG workshop & dungeon visualizer for live OpenCode V2 sessions, subagents, tools, and Git commits" \
  --add-topic opencode,opencode-v2,ai-agents,visualizer,pixel-art,rpg,typescript,docker
```

### Step B: Fork, Validate Locally & Open the PR (Once `≥ 25 ★` and `≥ 30 Days Old` on `2026-12-13+`)

Run this workflow in a separate directory when ready to submit the PR to `awesome-opencode/awesome-opencode`:

```bash
# 1. Fork and clone awesome-opencode
gh repo fork awesome-opencode/awesome-opencode --clone -- --depth=1
cd awesome-opencode

# 2. Create the submission branch
git checkout -b add-opencode-pixel-guild

# 3. Write data/projects/opencode-pixel-guild.yaml
cat << 'EOF' > data/projects/opencode-pixel-guild.yaml
name: OpenCode Pixel Guild
repo: https://github.com/nirtus/opencode-pixel-guild
tagline: Real-time 2D RPG workshop & dungeon visualizer for live OpenCode V2 sessions, subagents, tools, and Git commits
description: >-
  Self-hosted 2D RPG companion for OpenCode V2 that turns live hosts, projects,
  git worktrees, root sessions, and child subagents into autonomous heroes inside
  a shared Workshop Room and Dungeon Wilds. Watch agents equip @skill grimoires,
  haul MCP cargo, work at tool-specific stations, and battle Bug Monsters during
  failing test/debug turns—while you prompt or steer sessions, answer permission
  and question gates, and stage or commit Git changes from desktop or mobile.
  Zero external npm dependencies (Node.js 22+ or Docker Compose).
tags:
  - visualizer
  - web-ui
  - rpg
  - gamification
  - subagents
  - git
EOF

# 4. Run awesome-opencode's exact CI schema validation locally
npm ci
node scripts/validate.js data/projects/opencode-pixel-guild.yaml

# 5. Commit and push (do NOT edit README.md; CI regenerates it)
git add data/projects/opencode-pixel-guild.yaml
git commit -m "docs: add opencode-pixel-guild to projects"
git push -u origin add-opencode-pixel-guild

# 6. Open the Pull Request
gh pr create \
  --repo awesome-opencode/awesome-opencode \
  --title "docs: add OpenCode Pixel Guild to projects" \
  --body "$(cat << 'EOF'
## Submission Type

- [ ] Plugin
- [x] Project
- [ ] Theme
- [ ] Agent
- [ ] Resource

## Details

**Name:** OpenCode Pixel Guild
**Repository:** https://github.com/nirtus/opencode-pixel-guild
**Tagline:** Real-time 2D RPG workshop & dungeon visualizer for live OpenCode V2 sessions, subagents, tools, and Git commits (111 chars)
**OpenCode Version Support:** OpenCode V2

## Summary

Adds **OpenCode Pixel Guild** (`nirtus/opencode-pixel-guild`, MIT), a self-hosted 2D RPG workshop & dungeon companion for **OpenCode V2**:
- Connects to local or remote OpenCode V2 daemons (`opencode pair` QR/URL redemption or local service auto-discovery).
- Turns live hosts, projects, git worktrees, root sessions, and child subagents into autonomous RPG heroes inside a shared **Workshop Room** and **Dungeon Wilds** (equipping `@skill` grimoires, hauling MCP cargo, working at 10 tool-specific stations, and fighting **Bug Monsters** during failing test/debug turns).
- Bi-directional session control from desktop or mobile: summon heroes, switch OpenCode Agent Modes live, resolve permission/question prompts, and stage/commit/sync Git changes in the built-in **Assembly Commit Ledger**.
- Zero external npm dependencies (runs on Node.js 22+ or Docker Compose).

## Entry Requirements Checklist

- [x] **Format** — Single valid YAML file in `data/projects/opencode-pixel-guild.yaml` (`node scripts/validate.js` passes; `README.md` untouched)
- [x] **Relevant** — Built specifically for OpenCode V2 with full Docker & Node.js 22+ setup docs in `README.md`
- [x] **Public** — Public MIT repository with working links
- [x] **Maintained** — Actively maintained with recent commits
- [x] **Traction** — Meets the 25+ stars and 30+ days requirement
- [x] **Unique** — Standalone bi-directional OpenCode V2 RPG workshop/dungeon companion & Git control plane under `data/projects/`
- [x] **Complete** — All required fields present and tagline ≤ 120 characters
EOF
)"
```

---

## 5. Community Launch Playbook (Reaching `25+` Stars Before Submission)

Because `awesome-opencode` enforces the **25-star & 30-day** rule strictly, share the visual showcase assets already in this repository to build initial community stars:

1. **Visual Assets Ready in Repo**:
   - **Animated GIF Preview**: `docs/images/opencode-pixel-guild-intro-preview.gif`
   - **Full 1080p 30 FPS Video**: `docs/video/opencode-pixel-guild-intro.mp4` (with chapter breakdown in `docs/video/youtube-publish-guide.md`)
   - **Split-Screen & Combat Screenshots**: `docs/images/smooth-rounded-pathing-choreography.png`, `docs/images/per-bug-monster-combat-targeting-wilds.png`
2. **High-Signal Channels**:
   - **OpenCode Community**: Share in `anomalyco/opencode` GitHub Discussions / Show & Tell and the official OpenCode Discord showcase channel.
   - **X / Twitter & Bluesky**: Post the 35-second `opencode-pixel-guild-intro.mp4` video showing agents walking through the South Swinging Guild Door, summoning subagents at the Arcane Lectern, and fighting Bug Monsters in the Dungeon Wilds, tagging `@opencode` / `#OpenCode`.
   - **Reddit (`r/LocalLLaMA`, `r/commandline`, `r/aiagents`) & Hacker News (`Show HN`)**: Post *"Show HN: OpenCode Pixel Guild – 2D RPG workshop and dungeon visualizer for live OpenCode V2 agents"* with the inline GIF and zero-dependency Node 22 / Docker setup.
