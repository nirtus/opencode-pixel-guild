# Issue 01: Produce `awesome-opencode` Submission Package and Repository Readiness Polish

Type: `grilling`
Label: `wayfinder:grilling`
Status: `resolved`
Blocked by: none

## Question

How should we position, validate, and time the introduction of **OpenCode Pixel Guild Visualizer** (`https://github.com/nirtus/opencode-pixel-guild`) to [`awesome-opencode`](https://github.com/awesome-opencode/awesome-opencode/blob/main/contributing.md)?

## Answer

Resolved via Round 1 grilling with the user:

1. **Destination & Scope**: Deliver a complete repository readiness polish (`README.md` clone URLs and GitHub metadata), a schema-validated `data/projects/opencode-pixel-guild.yaml` entry, and a step-by-step PR + launch runbook in `docs/awesome-opencode-submission.md`.
2. **Category (`data/projects/`)**: Submit as `data/projects/opencode-pixel-guild.yaml` (standalone web & Docker companion for OpenCode V2), differentiating it from `psinetron/opencode-visualiser` (`data/plugins/`) by highlighting bi-directional session control, multi-project **Project Heraldry**, **Squad Subagent** choreography, **Dungeon Wilds** **Bug Monster** combat, and the interactive **Assembly Commit Ledger**.
3. **Approved YAML Entry**:
   - `name`: `OpenCode Pixel Guild`
   - `repo`: `https://github.com/nirtus/opencode-pixel-guild`
   - `tagline`: `Real-time 2D RPG workshop & dungeon visualizer for live OpenCode V2 sessions, subagents, tools, and Git commits` (111 characters ≤ 120 max)
   - `description`: States **OpenCode V2** support and full feature set.
   - `tags`: `visualizer`, `web-ui`, `rpg`, `gamification`, `subagents`, `git`.
4. **Submission & Upstream Pull Request**:
   - Updated `nirtus/opencode-pixel-guild` repository description and topics (`opencode`, `opencode-v2`, `ai-agents`, `visualizer`, `pixel-art`, `rpg`, `typescript`, `docker`).
   - Forked `awesome-opencode/awesome-opencode` to `nirtus/awesome-opencode`, committed [`data/projects/opencode-pixel-guild.yaml`](https://github.com/nirtus/awesome-opencode/blob/add-opencode-pixel-guild/data/projects/opencode-pixel-guild.yaml) on branch `add-opencode-pixel-guild`, and opened upstream Pull Request [`awesome-opencode/awesome-opencode#1043`](https://github.com/awesome-opencode/awesome-opencode/pull/1043).
5. **Container Verification**: Verified on `opencode-pixel-guild-visualizer` Docker container (`http://127.0.0.1:4310`) with `npm test` (`364/364` passing) and visual proof captured at `docs/images/awesome-opencode-submission-ready.png`.
