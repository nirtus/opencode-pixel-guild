# Target Agent Harness Matrix, Execution Flow, and Project-Agnostic Scope

Type: grilling
Label: ready-for-agent
Status: resolved
Blocked by: none

## Question

1. Where should the multi-harness agent setup instructions and planning artifacts live, and how do we ensure the setup instructions are **100% project-agnostic** so they work in any software repository or developer workstation?
2. How should the instructions install and configure **`graphify`**, **`superpowers`**, and **`mattpocock/skills` (all 27 engineering & productivity skills + `/setup-matt-pocock-skills`)** across coding agents that support CLI/config installation versus coding agents that use interactive slash commands or native auto-updating plugins?

## Answer

1. **Project-Agnostic Runbook + Feature Workspace**:
   - Track the planning artifacts in `docs/features/agent-plugin-setup/` (`spec.md`, `map.md`, and child tickets in `issues/`).
   - Author the portable, **100% project-agnostic** agent setup runbook at `docs/agents/plugin-setup.md` with zero project-specific names, paths, or assumptions, so it can be used verbatim in any repository or standalone developer environment.
   - Link `docs/agents/plugin-setup.md` via a concise context pointer in `AGENTS.md` under `## Agent skills`, and provide the universal root `CLAUDE.md` (`@AGENTS.md`) pointer pattern so Claude Code sessions inherit `AGENTS.md` automatically in any repo.
2. **5-Stage Multi-Harness Execution Flow (`graphify` + `superpowers` + `mattpocock/skills`)**:
   - **Stage 1 (Auto-Detect)**: The agent detects its active harness, OS platform (Linux/WSL2, macOS, Windows), tool runners (`uv`/`pipx`/`pip`, `node`/`npx`, `git`), and target repository root + `GRAPHIFY_OUT` path (`docs/graphify-out` if present, else `graphify-out`).
   - **Stage 2 (Automate `graphify`)**: The agent installs `graphifyy` globally, installs the user-scope skill (`graphify install --platform <harness>`), configures repo-level git hooks (`graphify hook install` for `post-commit` and `post-checkout`), binds local `.graphify_python` (using a verified shell-invocable interpreter path across Linux, macOS, WSL2, and Windows) and `.graphify_root`, and initializes an initial AST graph (`GRAPHIFY_OUT="$GRAPHIFY_OUT" graphify update .`, requiring zero LLM API keys) if no `graph.json` exists yet.
   - **Stage 3 (Install `superpowers` by Harness Category)**:
     - For CLI/config harnesses (OpenCode V2 & V1, Gemini CLI, GitHub Copilot CLI, Antigravity, Pi, Devin CLI, Factory Droid, Qwen Code, Grok Build CLI, Hermes Agent, Muse), the agent executes the installation directly.
     - For interactive slash-command marketplace harnesses (Claude Code, Cursor, Codex CLI/App, Kimi Code), the agent outputs the exact 1–2 host slash commands for the developer to run.
   - **Stage 4 (Install All 27 `mattpocock/skills` & Run `/setup-matt-pocock-skills` Repo Scaffolding)**:
     - Pick **one** delivery mechanism per harness to prevent duplicate skill registration:
       - **Claude Code**: `claude plugin install mattpocock-skills@claude-plugins-official`
       - **Codex CLI & App**: `codex plugin marketplace add mattpocock/skills && codex plugin add mattpocock-skills@mattpocock`
       - **GitHub Copilot CLI & VS Code**: `copilot plugin marketplace add mattpocock/skills && copilot plugin install mattpocock-skills@mattpocock` (+ `autoUpdate: true` in `~/.copilot/settings.json`)
       - **Gemini CLI**: `gemini skills install https://github.com/mattpocock/skills.git --path skills/engineering` and `gemini skills install https://github.com/mattpocock/skills.git --path skills/productivity`
       - **OpenCode, Cursor, Devin, Windsurf, Amp, Pi, Antigravity, Droid, Kimi, Qwen, Grok, Hermes, Muse, Aider, Kilo, Trae, Kiro**: Non-interactive sync of all 27 skills (`20` in `skills/engineering/*` + `7` in `skills/productivity/*`) into `~/.agents/skills/` and/or `npx skills@latest add mattpocock/skills -a <agent>`.
     - Verify or run `/setup-matt-pocock-skills` per-repository scaffolding (`docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md`, `docs/agents/domain.md`, and the `## Agent skills` block in `AGENTS.md` / `CLAUDE.md`).
   - **Stage 5 (Verify)**: The agent verifies `graphify hook status`, runs a test `graphify query`, verifies `superpowers` and all 27 `mattpocock/skills` + `docs/agents/` scaffolding, and confirms a clean `git status`.
