# Author Portable Project-Agnostic Agent Plugin Setup Runbook

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01, 02

## Question

Author the portable, **100% project-agnostic** agent-consumable setup runbook at `docs/agents/plugin-setup.md`, create the root `CLAUDE.md` pointer (`@AGENTS.md`), and add a concise context pointer in `AGENTS.md` under `## Agent skills` so any coding agent can set up **`graphify`**, **`superpowers`**, and **`mattpocock/skills` (all 27 engineering & productivity skills + `/setup-matt-pocock-skills`)** across OpenCode and all other supported harnesses in any repository.

### Scope & Deliverables

1. **Create `docs/agents/plugin-setup.md` (Project-Agnostic & Following `writing-for-agents` Principles)**:
   - Must contain **zero project-specific references** (no hardcoded project names, domain terms, or user home directories) so the file can be dropped into or executed against any project.
   - Include a copy-pasteable bootstrap prompt at the top for developers.
   - **Stage 1 (Auto-Detect Harness, OS & Project Paths)**: Steps to detect the active harness, OS, tool runners (`uv`/`pipx`/`pip`, `node`/`npx`, `git`), git repository root, and dynamic `GRAPHIFY_OUT` path (`docs/graphify-out` if present, else `graphify-out`).
   - **Stage 2 (`graphify` Global & Repository Setup)**: Exact shell commands to install/upgrade `graphifyy` (`uv tool install --upgrade graphifyy` with `pipx`/`pip` fallbacks), run user-scope `graphify install --platform <harness>` (using supported `graphify 0.7+` platform names or `--platform codex` for `~/.agents/skills/` harnesses), resolve a verified shell-invocable Python interpreter across Linux/macOS/WSL2/Windows and write `$GRAPHIFY_OUT/.graphify_python` + `$GRAPHIFY_OUT/.graphify_root`, run `graphify hook install` (installing `post-commit` and `post-checkout` git hooks and binding them to `$GRAPHIFY_OUT`), wire harness project instructions (`graphify <harness> install` and `.opencode/plugins/graphify.js` normalized to `docs/graphify-out/`), initialize `$GRAPHIFY_OUT/graph.json` via `GRAPHIFY_OUT="$GRAPHIFY_OUT" graphify update .` (deterministic AST-only extraction requiring no LLM API key) if missing, and ensure `**/.graphify_python`, `**/.graphify_root`, `**/.rebuild.lock`, `docs/graphify-out/cache/`, `docs/graphify-out/manifest.json`, and untracked `/graphify-out/` are gitignored.
   - **Stage 3 (`superpowers` Setup by Harness)**:
     - **OpenCode V2 & V1**: JSON config setup in `~/.config/opencode/opencode.json` (`"plugins"` on V2 `>= 2.0.4`, `"plugin"` on V1 `1.x`, preserving existing keys) plus the Windows local `npm install --prefix "$HOME\.config\opencode"` fallback.
     - **CLI-Installable Harnesses**: Direct commands for Gemini CLI, GitHub Copilot CLI, Google Antigravity, Pi, Devin CLI, Factory Droid, Qwen Code, Grok Build CLI, Hermes Agent, and Muse.
     - **Interactive Slash-Command Marketplace Harnesses**: Exact slash commands to hand to the developer for Claude Code (`/plugin install superpowers@claude-plugins-official`), Cursor (`/add-plugin superpowers`), Codex CLI/App (`/plugins`), and Kimi Code (`/plugins install https://github.com/obra/superpowers`).
   - **Stage 4 (`mattpocock/skills` — All 27 Skills & `/setup-matt-pocock-skills` Repo Scaffolding)**:
     - Document the complete catalog of all 27 skills (`20` in `skills/engineering/*` + `7` in `skills/productivity/*`) and enforce the single-method-per-harness rule so skills are never duplicated:
       - **Claude Code**: `claude plugin install mattpocock-skills@claude-plugins-official`
       - **Codex CLI & App**: `codex plugin marketplace add mattpocock/skills && codex plugin add mattpocock-skills@mattpocock`
       - **GitHub Copilot CLI & VS Code**: `copilot plugin marketplace add mattpocock/skills && copilot plugin install mattpocock-skills@mattpocock` + `~/.copilot/settings.json` `autoUpdate: true`
       - **Gemini CLI**: `gemini skills install https://github.com/mattpocock/skills.git --path skills/engineering` and `gemini skills install https://github.com/mattpocock/skills.git --path skills/productivity`
       - **OpenCode, Cursor, Devin, Windsurf, Amp, Pi, Antigravity, and All Other Harnesses**: Non-interactive git clone sync of `skills/engineering/*` and `skills/productivity/*` (via `$HOME/.cache/mattpocock-skills-sync` without touching `/tmp`) into `~/.agents/skills/` and/or `npx skills@latest add mattpocock/skills -a <agent>`.
     - Include the per-repository `/setup-matt-pocock-skills` check and scaffolding workflow (`docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md`, `docs/agents/domain.md`, and the `## Agent skills` block in `AGENTS.md` / `CLAUDE.md`).
   - **Stage 5 (Verification & Completion Criteria)**: Checkable completion criteria verifying `graphify hook status`, `graphify query`, `.graphify_python` import check, `superpowers` skill availability, all 27 `mattpocock/skills` + `docs/agents/` scaffolding, and clean `git status --short`.
2. **Create Root `CLAUDE.md`**:
   - Write `@AGENTS.md` in `/CLAUDE.md` so Claude Code sessions at the repository root automatically load `AGENTS.md` (and ensure any repository root-file allowlist or `.gitignore` accommodates `CLAUDE.md`).
3. **Update `AGENTS.md`**:
   - Add a `### Plugin setup` context pointer under `## Agent skills` pointing to `docs/agents/plugin-setup.md` when setting up or troubleshooting `graphify`, `superpowers`, or `mattpocock/skills` on any coding agent harness.

### References

- [Target Agent Harness Matrix, Execution Flow, and Project-Agnostic Scope](./01-target-harness-matrix-and-execution-flow.md)
- [Project-Agnostic Graphify Output Resolution and Worktree Hygiene](./02-repo-local-graphify-state-and-worktree-hygiene.md)
- [Project-Agnostic Multi-Harness Agent Setup for `graphify`, `superpowers`, and `mattpocock/skills` Specification](../spec.md)

## Answer

1. **Authored `docs/agents/plugin-setup.md` (100% Project-Agnostic 5-Stage Runbook)**:
   - Created `docs/agents/plugin-setup.md` with zero project-specific names, domain terms, or hardcoded user paths.
   - Included the Quick Bootstrap Prompt, the complete Multi-Harness Support Matrix, and the 5-Stage Execution Protocol:
     - **Stage 1**: Auto-detection of active harness, OS, tool runners, and dynamic `GRAPHIFY_OUT` (`docs/graphify-out` vs. `graphify-out`).
     - **Stage 2**: Global `graphifyy` install (`uv tool` / `pipx` / `pip`), user-scope `graphify install --platform <platform>`, cross-platform/WSL shell-invocable Python interpreter resolution (`.graphify_python` and `.graphify_root`), `graphify hook install` (`post-commit` and `post-checkout`), project instruction wiring (including upgrading `.opencode/plugins/graphify.js` to an OpenCode V2 + V1 dual-compatible `export default { id: "graphify", server: GraphifyPlugin, setup }` definition and removing the legacy `.opencode/opencode.json` file-path entry), deterministic AST-only initialization (`GRAPHIFY_OUT="$GRAPHIFY_OUT" graphify update .` requiring no LLM API key), and `.gitignore` hygiene.
     - **Stage 3**: Harness-specific `superpowers` setup across OpenCode V2/V1 (`~/.config/opencode/opencode.json` + Windows fallback), CLI-installable harnesses, and interactive slash-command marketplace harnesses.
     - **Stage 4**: Complete catalog and single-method-per-harness installation of all 27 `mattpocock/skills` (`20` engineering + `7` productivity) plus per-repository `/setup-matt-pocock-skills` verification and scaffolding (`docs/agents/{issue-tracker,triage-labels,domain}.md`).
     - **Stage 5**: Checkable completion criteria for `graphify` CLI/hooks/query, `superpowers`, all 27 `mattpocock/skills`, and clean `git status --short`.
2. **Created Root `CLAUDE.md`**:
   - Wrote `@AGENTS.md` to `/CLAUDE.md` so Claude Code, Qwen Code, and Muse sessions automatically inherit `AGENTS.md`.
3. **Updated `AGENTS.md` & Verified on Docker Container**:
   - Added `### Plugin setup` under `## Agent skills` pointing to `docs/agents/plugin-setup.md` and `## graphify` project rules in `AGENTS.md`, and verified container deployment on `opencode-pixel-guild-visualizer` (`npm run docker:up` on port `4310`, HTTP `200`, `npm test` `291/291` passing, visual proof at `docs/images/agent-plugin-setup.png`).
