Status: ready-for-agent

# Specification: Project-Agnostic Multi-Harness Agent Setup for `graphify`, `superpowers`, and `mattpocock/skills`

## 1. Problem Statement

Developers across teams use a wide variety of coding agents (**OpenCode V2 & V1**, **Claude Code**, **Cursor**, **Codex CLI & App**, **Gemini CLI**, **GitHub Copilot CLI & VS Code**, **Google Antigravity**, **Pi**, **Devin CLI**, **Factory Droid**, **Kimi Code**, **Qwen Code**, **Grok Build CLI**, **Hermes Agent**, **Muse**, **Windsurf**, **Aider**, **Kilo**, **Amp**, **Trae**, **Kiro**) across different operating systems (Linux, macOS, Windows / WSL2) and across arbitrary software repositories.

Setting up the three core agentic plugin & skill suites—**`graphify`** (`graphifyy` knowledge graph CLI, skill, platform guards, and git hooks), **`superpowers`** (`github.com/obra/superpowers` composable engineering methodology skills), and **`mattpocock/skills`** (`github.com/mattpocock/skills` — all 27 engineering and productivity skills plus per-repository `/setup-matt-pocock-skills` scaffolding)—currently suffers from four friction points:

1. **Harness Fragmentation**: Every coding agent harness uses a different plugin/extension mechanism, skill directory (`~/.agents/skills/`, `~/.config/opencode/`, `.claude-plugin`, etc.), config file path, or in-chat marketplace slash command.
2. **Duplicate or Partial Skill Installation**: For `mattpocock/skills`, some harnesses have native auto-updating plugins (`claude`, `codex`, `copilot`), Gemini CLI uses two `--path` installs (`skills/engineering` and `skills/productivity`), and other harnesses use `npx skills@latest add mattpocock/skills` (which prompts interactively unless automated or synced into `~/.agents/skills/`). Installing both a native plugin and `npx skills` duplicates every skill twice.
3. **Project Coupling & Bootstrap Ambiguity**: Setup notes tied to a single repository's directory structure fail when applied to a new or different project (where a graph may not exist yet, where `GRAPHIFY_OUT` may be `graphify-out/` or `docs/graphify-out/`, or where `docs/agents/{issue-tracker,triage-labels,domain}.md` have not been initialized by `/setup-matt-pocock-skills`).
4. **Machine-Local State Pollution**: `graphify` writes machine-specific interpreter, scan-root, manifest, cache, and lock files (`.graphify_python`, `.graphify_root`, `.rebuild.lock`, `manifest.json`, `cache/`) and harness-specific hook/rule files (`.opencode/`, `.codex/`, `.cursor/`, `.claude/`, `.gemini/`, `.kiro/`, `.kilo/`, `.agents/`). Without universal `.gitignore` rules, every developer's local setup leaks host paths or dirties `git status`.

---

## 2. Solution Overview

Deliver a **100% project-agnostic, self-contained, agent-executable setup runbook** (`docs/agents/plugin-setup.md`) that any developer can hand to any coding agent in **any repository** (or globally on their workstation) to install, configure, and verify all three suites:

1. **`graphify`** (`graphifyy` CLI, user-scope skill, repo git hooks, and AST graph bootstrap in `docs/graphify-out/`).
2. **`superpowers`** (`github.com/obra/superpowers` — all 14 core workflow, TDD, debugging, review, and planning skills).
3. **`mattpocock/skills`** (`github.com/mattpocock/skills` — all 27 engineering and productivity skills across `skills/engineering/*` and `skills/productivity/*`, plus per-repository `/setup-matt-pocock-skills` configuration in `docs/agents/`).

The runbook guides the coding agent through a deterministic **5-Stage Execution Protocol**:

- **Stage 1 — Harness, OS & Target Repository Auto-Detection**: Identify the active coding agent harness, OS platform, tool runners (`uv`/`pipx`/`pip`, `node`/`npx`, `git`), and target repository paths (`GRAPHIFY_OUT`, `AGENTS.md` / `CLAUDE.md`, `docs/agents/`).
- **Stage 2 — `graphify` Global CLI, Platform Skill, Git Hooks & Graph Initialization**: Install `graphifyy`, install the user-scope `graphify` skill (`graphify install --platform <harness>`), configure repo git hooks (`graphify hook install` for `post-commit` and `post-checkout`), bind `.graphify_python` and `.graphify_root` using a verified POSIX-invocable Python interpreter path, and initialize `$GRAPHIFY_OUT/graph.json` via `GRAPHIFY_OUT="$GRAPHIFY_OUT" graphify update .` (deterministic AST-only extraction requiring no LLM API key) if missing.
- **Stage 3 — `superpowers` Plugin Installation Across Harnesses**: Run automated CLI/config installation for supported harnesses (OpenCode V2/V1, Gemini CLI, Copilot CLI, Antigravity, Pi, Devin, Droid, Qwen, Grok, Hermes, Muse) or output exact host slash commands for marketplace-only harnesses (Claude Code, Cursor, Codex, Kimi).
- **Stage 4 — `mattpocock/skills` (All 27 Skills) Installation & Repo Scaffolding (`/setup-matt-pocock-skills`)**:
  - Install **exactly one** delivery mechanism per harness (native auto-updating plugin for Claude Code, Codex, and GitHub Copilot; dual-path `gemini skills install` for Gemini CLI; or `npx skills@latest add mattpocock/skills` / deterministic non-interactive git sync of all 27 skills into `~/.agents/skills/` for OpenCode, Cursor, Devin, Windsurf, Amp, Pi, and all other harnesses).
  - Run or verify the per-repository `/setup-matt-pocock-skills` scaffolding (`docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md`, `docs/agents/domain.md`, and the `## Agent skills` context pointer block in `AGENTS.md` or `CLAUDE.md`).
- **Stage 5 — End-to-End Verification & Worktree Hygiene Gate**: Verify `graphify` CLI/hooks/query, `superpowers` skills, all 27 `mattpocock/skills` + `docs/agents/` config files, and a clean `git status --short`.

---

## 3. Complete `mattpocock/skills` Catalog (All 27 Skills)

Every installation of `https://github.com/mattpocock/skills` must include **all 27 skills** across both directories (`skills/engineering` and `skills/productivity`):

### 3.1 Engineering Skills (`skills/engineering/` — 20 Skills)

- **User-Invoked Orchestrators (11)**:
  1. `ask-matt` — Router over the user-invoked skills in `mattpocock/skills`.
  2. `grill-with-docs` — Grilling session that also builds the project's domain model (`GLOSSARY.md` and ADRs inline).
  3. `triage` — Move issues through the five canonical triage roles (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`).
  4. `improve-codebase-architecture` — Scan a codebase for module-deepening opportunities, generate a visual HTML architecture report, and grill through the chosen candidate.
  5. `setup-matt-pocock-skills` — Configure a repository's issue tracker (`docs/agents/issue-tracker.md`), triage labels (`docs/agents/triage-labels.md`), and domain doc layout (`docs/agents/domain.md`).
  6. `to-spec` — Synthesize the current conversation into a specification and publish it to the configured issue tracker.
  7. `to-tickets` — Break a plan, spec, or conversation into tracer-bullet tickets with blocking dependency edges.
  8. `implement` — Build work described by a spec or tickets, driving `/tdd` at pre-agreed seams and closing out with `/code-review`.
  9. `implement-spec` — Implement an entire spec on one integration branch across the unblocked ticket frontier using parallel subagents, closing out with `/code-review`.
  10. `wayfinder` — Plan multi-session work as a shared map (`wayfinder:map`) and decision tickets (`research`, `prototype`, `grilling`, `task`) on the issue tracker.
  11. `retro` — Suggest post-session improvements to the coding agent's environment (navigation, checks, standards, steering files, tooling).
- **Model-Invoked Disciplines (9)**:
  12. `prototype` — Build a throwaway prototype (single HTML file for state/logic or multi-variation UI route) to answer a design question.
  13. `diagnosing-bugs` — Disciplined 6-phase diagnosis loop for bugs and performance regressions (reproduce red → minimise → hypothesise → instrument → fix → regression-test).
  14. `research` — Investigate a question against primary sources and capture cited findings as Markdown via a background subagent.
  15. `tdd` — Test-driven development with a strict red-green-refactor loop, one vertical slice at a time.
  16. `domain-modeling` — Actively build and sharpen the project's domain model (`GLOSSARY.md`, `GLOSSARY-MAP.md`, `docs/adr/`).
  17. `codebase-design` — Shared vocabulary and principles for designing deep modules behind small interfaces at clean seams.
  18. `code-review` — Parallel two-axis diff review (**Standards** + **Spec**).
  19. `pr` — Pull request body structure (visual summary, before/after evidence, one-way/two-way door merge-danger call).
  20. `wizard` — Generate an interactive bash wizard walking a human through manual infrastructure, credential, or dashboard steps.

### 3.2 Productivity Skills (`skills/productivity/` — 7 Skills)

- **User-Invoked Orchestrators (5)**:
  21. `grill-me` — Relentlessly interview the user about any non-code plan or design until the design tree is resolved.
  22. `handoff` — Compact the current conversation into a handoff document so another agent session can continue seamlessly.
  23. `teach` — Teach the user a new skill or concept over multiple sessions using the current directory as a stateful workspace.
  24. `to-questionnaire` — Turn a decision into a Markdown questionnaire for a stakeholder (grills about the send, not the subject).
  25. `wait-what` — Re-pitch an unclear message in plain English using `GLOSSARY.md` vocabulary.
- **Model-Invoked Disciplines (2)**:
  26. `grilling` — Reusable design-tree interview primitive (frontier rounds with numbered `❓ Q1` questions and `➡️` recommended answers).
  27. `writing-for-agents` — Principles for writing agent-consumed documents (context pointers, progressive disclosure, co-location, leading words, completion criteria, pruning).

---

## 4. Project-Agnostic Multi-Harness Support Matrix (`graphify` + `superpowers` + `mattpocock/skills`)

> **Rule for `mattpocock/skills`**: Pick **one** installation method per harness (either the native auto-updating plugin OR `npx skills@latest` / `~/.agents/skills/` file sync). Never install both on the same harness, as doing so registers every skill twice.

| Coding Agent Harness | `graphify` Setup (Global + Repo) | `superpowers` Setup | `mattpocock/skills` Setup (All 27 Skills) |
| :--- | :--- | :--- | :--- |
| **OpenCode V2** (`>= 2.0.4`) | `graphify install --platform opencode` + `graphify opencode install` | **Config JSON**: Add `"plugins": ["superpowers@git+https://github.com/obra/superpowers.git"]` to `~/.config/opencode/opencode.json` | **CLI / Sync**: `npx skills@latest add mattpocock/skills -a opencode` (or sync all 27 skills from `mattpocock/skills` into `~/.agents/skills/`) |
| **OpenCode V1** (`1.x`) | `graphify install --platform opencode` + `graphify opencode install` | **Config JSON**: Add `"plugin": ["superpowers@git+https://github.com/obra/superpowers.git"]` to `~/.config/opencode/opencode.json` | **CLI / Sync**: `npx skills@latest add mattpocock/skills -a opencode` (or sync all 27 skills into `~/.agents/skills/`) |
| **Claude Code** | `graphify install --platform claude` + `graphify claude install` | **Slash Command**: `/plugin install superpowers@claude-plugins-official` | **Native Plugin (CLI or Slash)**: `claude plugin install mattpocock-skills@claude-plugins-official` (auto-updates) |
| **Cursor** | `graphify install --platform cursor` + `graphify cursor install` | **Slash Command**: `/add-plugin superpowers` in Cursor Agent chat | **CLI / Sync**: `npx skills@latest add mattpocock/skills -a cursor` (or sync all 27 skills into `~/.agents/skills/`) |
| **Codex CLI & App** | `graphify install --platform codex` + `graphify codex install` | **Slash / UI**: `/plugins` → `superpowers` → `Install Plugin` (or App Sidebar `Plugins` → `+`) | **Native Plugin (CLI)**: `codex plugin marketplace add mattpocock/skills && codex plugin add mattpocock-skills@mattpocock` (auto-updates) |
| **Gemini CLI** | `graphify install --platform gemini` + `graphify gemini install` | **CLI**: `gemini extensions install https://github.com/obra/superpowers` | **Native CLI (Both Paths)**: `gemini skills install https://github.com/mattpocock/skills.git --path skills/engineering && gemini skills install https://github.com/mattpocock/skills.git --path skills/productivity` |
| **GitHub Copilot CLI & VS Code** | `graphify copilot install` + `graphify vscode install` | **CLI**: `copilot plugin marketplace add obra/superpowers-marketplace && copilot plugin install superpowers@superpowers-marketplace` | **Native Plugin (CLI + VS Code)**: `copilot plugin marketplace add mattpocock/skills && copilot plugin install mattpocock-skills@mattpocock` + `autoUpdate: true` in `~/.copilot/settings.json` |
| **Google Antigravity** | `graphify install --platform antigravity` + `graphify antigravity install` | **CLI**: `agy plugin install https://github.com/obra/superpowers` | **CLI / Sync**: `npx skills@latest add mattpocock/skills` (or sync all 27 skills into `~/.agents/skills/`) |
| **Pi Coding Agent** | `graphify install --platform pi` + `graphify pi install` | **CLI**: `pi install git:github.com/obra/superpowers` | **CLI / Sync**: `npx skills@latest add mattpocock/skills -a pi` |
| **Devin CLI** | `graphify install --platform codex` (`~/.agents/skills/graphify`) + `graphify codex install` (`AGENTS.md`) | **CLI**: `devin plugins install obra/superpowers` | **CLI / Sync**: `npx skills@latest add mattpocock/skills -a devin` |
| **Factory Droid** | `graphify install --platform droid` + `graphify droid install` | **CLI**: `droid plugin marketplace add https://github.com/obra/superpowers && droid plugin install superpowers@superpowers` | **CLI / Sync**: `npx skills@latest add mattpocock/skills` (or sync all 27 skills into `~/.agents/skills/`) |
| **Kimi Code** | `graphify install --platform kimi` | **Slash Command**: `/plugins install https://github.com/obra/superpowers` | **CLI / Sync**: `npx skills@latest add mattpocock/skills` (or sync all 27 skills into `~/.agents/skills/`) |
| **Qwen Code** | `graphify install --platform codex` (`~/.agents/skills/graphify`) + reads `AGENTS.md` / `CLAUDE.md` | **CLI**: `qwen extensions install obra/superpowers` | **CLI**: `qwen extensions install mattpocock/skills` (or sync all 27 skills into `~/.agents/skills/`) |
| **Grok Build CLI** | `graphify install --platform codex` (`~/.agents/skills/graphify`) + `graphify codex install` (`AGENTS.md`) | **CLI**: `grok plugin install superpowers@xai-official --trust` | **CLI / Sync**: Sync all 27 skills into `~/.agents/skills/` |
| **Hermes Agent** | `graphify install --platform hermes` + `graphify hermes install` | **CLI**: `hermes plugins install obra/superpowers --enable` | **CLI / Sync**: Sync all 27 skills into `~/.agents/skills/` or `~/.hermes/skills/` |
| **Muse** | `graphify install --platform codex` (`~/.agents/skills/graphify`) + reads `AGENTS.md` / `CLAUDE.md` | **CLI**: `git clone https://github.com/obra/superpowers.git "$HOME/.cache/superpowers-install" && muse plugins install "$HOME/.cache/superpowers-install" && muse plugins approve superpowers && rm -rf "$HOME/.cache/superpowers-install"` | **CLI / Sync**: Sync all 27 skills into `~/.agents/skills/` |
| **Aider / Trae / Kiro / OpenClaw** | `graphify install --platform <aider\|trae\|trae-cn\|kiro\|claw>` + `graphify <aider\|trae\|trae-cn\|kiro\|claw> install` | Uses `~/.agents/skills/` | **CLI / Sync**: Sync all 27 skills into `~/.agents/skills/` |
| **Windsurf / Amp / Kilo** | `graphify install --platform codex` (`~/.agents/skills/graphify`) + `graphify codex install` (`AGENTS.md`) | Uses `~/.agents/skills/` | **CLI / Sync**: `npx skills@latest add mattpocock/skills -a <windsurf\|amp>` (or sync all 27 skills into `~/.agents/skills/`) |

---

## 5. Portable Agent-Executable Setup Instructions (Canonical Runbook Content for `docs/agents/plugin-setup.md`)

The following content is completely project-agnostic and designed to be saved as `docs/agents/plugin-setup.md` (or shared standalone across any repository):

### Quick Bootstrap Prompt (For Developers on Any Project)

Paste this into any coding agent session:

```text
Follow the instructions in `docs/agents/plugin-setup.md` to install, configure, and verify the `graphify`, `superpowers`, and `mattpocock/skills` (all 27 skills) plugins for my coding agent environment and current repository.
```

---

### Stage 1: Detect Active Harness, OS & Project Paths

1. **Identify your coding agent harness, OS platform, and tool runners**:
   - Inspect your system prompt, tool names, and environment variables (`OPENCODE`, `CLAUDE_CODE`, `CURSOR_TRACE_ID`, `CODEX_HOME`, `GEMINI_CLI`, etc.) to identify the active harness and OS platform (`uname -s`, `$WSL_DISTRO_NAME`, or Windows environment).
   - Check available tool runners (`command -v uv pipx python3 python node npx git`) and any additional harnesses requested by the developer (`command -v opencode claude cursor codex gemini copilot agy pi devin droid qwen grok hermes muse`).
2. **Determine the project root, instruction files, and `GRAPHIFY_OUT` directory** (when inside a project):
   - Detect the repository root via `git rev-parse --show-toplevel 2>/dev/null || pwd` and check for existing `AGENTS.md`, `CLAUDE.md`, and `docs/agents/`.
   - Resolve the graph output directory (`GRAPHIFY_OUT`):
     - If `GRAPHIFY_OUT` is set in the environment, use it.
     - Otherwise default to `GRAPHIFY_OUT="docs/graphify-out"`.

---

### Stage 2: Install & Configure `graphify` (Global + Repository)

Run the following steps in the shell:

1. **Install or upgrade the `graphifyy` Python package globally** (prefer `uv tool`, fallback to `pipx`, `pip`, or user-space `uv` bootstrap via `curl`):
   ```bash
   export PATH="$HOME/.local/bin:$PATH"
   if ! command -v uv >/dev/null 2>&1 && ! command -v pipx >/dev/null 2>&1 && ! python3 -m pip --version >/dev/null 2>&1; then
     curl -LsSf https://astral.sh/uv/install.sh | sh
     export PATH="$HOME/.local/bin:$PATH"
   fi
   if command -v uv >/dev/null 2>&1; then
     uv tool install --upgrade graphifyy
   elif command -v pipx >/dev/null 2>&1; then
     pipx install --force graphifyy
   else
     python3 -m pip install --user --upgrade graphifyy || python3 -m pip install --upgrade graphifyy --break-system-packages
   fi
   ```
2. **Install the user-scope `graphify` skill for the active harness**:
   ```bash
   # Supported --platform values in graphify 0.7+:
   # claude | windows | codex | opencode | aider | copilot | claw | droid | trae | trae-cn | gemini | cursor | antigravity | hermes | kiro | pi | kimi
   # (For harnesses using ~/.agents/skills/ such as devin, windsurf, amp, kilo, qwen, grok, or muse, use --platform codex)
   graphify install --platform <platform>
   ```
3. **Configure the current git repository** (when inside a git repository):
   - **Resolve a shell-invocable Python interpreter with `graphify` installed and bind `docs/graphify-out/.graphify_python` and `docs/graphify-out/.graphify_root`**:
     ```bash
     GRAPHIFY_OUT="${GRAPHIFY_OUT:-docs/graphify-out}"
     PYTHON=""
     _try_python() {
       local cand="$1"
       if [ -n "$cand" ] && (command -v "$cand" >/dev/null 2>&1 || [ -x "$cand" ]); then
         if "$cand" -c "import graphify" >/dev/null 2>&1; then
           PYTHON="$cand"
           return 0
         fi
       fi
       return 1
     }

     if command -v uv >/dev/null 2>&1; then
       _UV_PY=$(uv tool run --from graphifyy python -c "import sys; print(sys.executable)" 2>/dev/null || true)
       _try_python "$_UV_PY" || true
     fi
     if [ -z "$PYTHON" ] && command -v graphify >/dev/null 2>&1; then
       _SHEBANG=$(head -n 1 "$(command -v graphify)" | sed 's/^#![[:space:]]*//; s#^/usr/bin/env[[:space:]]*##')
       _try_python "$_SHEBANG" || true
     fi
     if [ -z "$PYTHON" ]; then
       for _CAND in \
         "$HOME/.local/share/uv/tools/graphifyy/bin/python" \
         "$HOME/.local/pipx/venvs/graphifyy/bin/python" \
         /mnt/c/Users/*/AppData/Roaming/uv/tools/graphifyy/Scripts/python.exe \
         "$(command -v python3 2>/dev/null || true)" \
         "$(command -v python 2>/dev/null || true)"; do
         _try_python "$_CAND" && break || true
       done
     fi

     mkdir -p "$GRAPHIFY_OUT"
     printf '%s\n' "$PYTHON" > "$GRAPHIFY_OUT/.graphify_python"
     printf '%s\n' "$(pwd)" > "$GRAPHIFY_OUT/.graphify_root"
     ```
   - **Install git hooks (`post-commit`, `post-checkout`, `post-merge`, `post-rewrite`), bind them to `$GRAPHIFY_OUT` (`docs/graphify-out`), and relocate any untracked `.gitattributes` merge-driver rule to `.git/info/attributes`**:
     ```bash
     graphify hook install
     for _HOOK in .git/hooks/post-commit .git/hooks/post-checkout .git/hooks/post-merge .git/hooks/post-rewrite; do
       if [ -f "$_HOOK" ] && ! grep -q 'export GRAPHIFY_OUT=' "$_HOOK"; then
         sed -i 's#export PYTHONHASHSEED=0#export PYTHONHASHSEED=0\nexport GRAPHIFY_OUT="${GRAPHIFY_OUT:-docs/graphify-out}"\nexport WSLENV="${WSLENV:+$WSLENV:}GRAPHIFY_OUT/u"#g' "$_HOOK"
         sed -i 's#if \[ ! -d "graphify-out" \]; then#if [ ! -d "${GRAPHIFY_OUT:-docs/graphify-out}" ] \&\& [ ! -d "graphify-out" ]; then#g' "$_HOOK"
         sed -i 's#_GFY_PYTHON_FILE="graphify-out/.graphify_python"#_GFY_PYTHON_FILE="${GRAPHIFY_OUT:-docs/graphify-out}/.graphify_python"#g' "$_HOOK"
       fi
     done
     if [ -f .gitattributes ] && ! git ls-files --error-unmatch .gitattributes >/dev/null 2>&1; then
       mkdir -p .git/info
       grep -q 'merge=graphify' .git/info/attributes 2>/dev/null || printf 'docs/graphify-out/graph.json merge=graphify\ngraphify-out/graph.json merge=graphify\n' >> .git/info/attributes
       rm -f .gitattributes
     fi
     ```
   - **Wire harness project instructions & tool guards** (if not already present in `AGENTS.md` / `CLAUDE.md`, ensuring paths point to `docs/graphify-out/`):
     - **OpenCode**: `graphify opencode install` *(writes `## graphify` to `AGENTS.md`; then replace `.opencode/plugins/graphify.js` with a dual OpenCode V2 + V1 plugin sharing `globalThis.__graphifyReminded`, update `~/.config/opencode/plugins/graphify.js` if present to check `docs/graphify-out/graph.json`, and remove the legacy `.opencode/opencode.json` file-path entry that OpenCode V2 rejects as an npm package specifier)*:
       ```bash
       if [ -f "$HOME/.config/opencode/plugins/graphify.js" ] && ! grep -q '"docs", "graphify-out"' "$HOME/.config/opencode/plugins/graphify.js"; then
         sed -i 's#existsSync(join(directory, "graphify-out", "graph.json"))#(existsSync(join(directory, "docs", "graphify-out", "graph.json")) || existsSync(join(directory, "graphify-out", "graph.json")))#g' "$HOME/.config/opencode/plugins/graphify.js"
       fi
       mkdir -p .opencode/plugins
       cat > .opencode/plugins/graphify.js << 'EOF'
       // graphify OpenCode plugin (OpenCode V2 + V1 compatible)
       // Injects a knowledge graph reminder before shell/bash tool calls when the graph exists.
       import { existsSync } from "fs";
       import { join } from "path";

       const REMINDER_PREFIX =
         'echo "[graphify] Knowledge graph available. Read docs/graphify-out/GRAPH_REPORT.md for god nodes and architecture context before searching files." ; ';

       const hasGraph = (directory) =>
         Boolean(
           directory &&
             (existsSync(join(directory, "docs", "graphify-out", "graph.json")) ||
               existsSync(join(directory, "graphify-out", "graph.json"))),
         );

       const reminded = (globalThis.__graphifyReminded ??= new Set());

       export const GraphifyPlugin = async ({ directory }) => {
         return {
           "tool.execute.before": async (input, output) => {
             if (reminded.has(directory)) return;
             if (!hasGraph(directory)) return;

             if ((input.tool === "bash" || input.tool === "shell") && output?.args?.command) {
               output.args.command = REMINDER_PREFIX + output.args.command;
               reminded.add(directory);
             }
           },
         };
       };

       export default {
         id: "graphify",
         server: GraphifyPlugin,
         async setup(ctx) {
           if (!ctx?.tool || typeof ctx.tool.hook !== "function") return;
           const directory = ctx.location?.directory;
           if (!directory) return;

           await ctx.tool.hook("execute.before", (event) => {
             const key = event?.sessionID || directory;
             if (reminded.has(key)) return;
             if (!hasGraph(directory)) return;

             const input = event?.input;
             if (
               (event?.tool === "shell" || event?.tool === "bash") &&
               input &&
               typeof input === "object" &&
               typeof input.command === "string"
             ) {
               const nextCommand = REMINDER_PREFIX + input.command;
               input.command = nextCommand;
               event.input = { ...input, command: nextCommand };
               reminded.add(key);
             }
           });
         },
       };
       EOF
       rm -f .opencode/opencode.json
       ```
     - **Claude Code**: `graphify claude install` (or create `CLAUDE.md` containing `@AGENTS.md` if `AGENTS.md` already has the `## graphify` section)
     - **Cursor**: `graphify cursor install`
     - **Codex / Droid / Aider / Trae / OpenClaw / Hermes**: `graphify <codex|droid|aider|trae|trae-cn|claw|hermes> install`
     - **Gemini CLI**: `graphify gemini install`
     - **VS Code / GitHub Copilot**: `graphify copilot install` + `graphify vscode install`
     - **Antigravity / Kiro / Pi**: `graphify <antigravity|kiro|pi> install`
   - **Initialize or update the knowledge graph in `$GRAPHIFY_OUT` (`docs/graphify-out`) deterministically (AST-only, no LLM API key required) if `$GRAPHIFY_OUT/graph.json` does not exist yet**:
     ```bash
     if [ ! -f "$GRAPHIFY_OUT/graph.json" ]; then
       export GRAPHIFY_OUT="$GRAPHIFY_OUT"
       export WSLENV="${WSLENV:+$WSLENV:}GRAPHIFY_OUT/u"
       graphify update .
       if [ "$GRAPHIFY_OUT" != "graphify-out" ] && [ -d "graphify-out" ]; then
         mkdir -p "$GRAPHIFY_OUT"
         cp -Rf graphify-out/. "$GRAPHIFY_OUT/"
         rm -rf graphify-out
       fi
       printf '%s\n' "$PYTHON" > "$GRAPHIFY_OUT/.graphify_python"
       printf '%s\n' "$(pwd)" > "$GRAPHIFY_OUT/.graphify_root"
     fi
     ```
   - **Ensure `.gitignore` excludes machine-local files, host-path manifests/caches, and untracked harness directories**:
     Ensure `.gitignore` ignores `**/.graphify_python`, `**/.graphify_root`, `**/.rebuild.lock`, `**/.graphify_detect.json`, `**/.graphify_transcripts.json`, `docs/graphify-out/cache/`, `docs/graphify-out/manifest.json` (which stores machine-local absolute file paths), `/graphify-out/`, and local harness directories (`.opencode/`, `.superpowers/`, `.codex/`, `.cursor/`, `.claude/`, `.gemini/`, `.kiro/`, `.kilo/`, `.agents/`). If the repository does not commit `$GRAPHIFY_OUT/` (`git ls-files "$GRAPHIFY_OUT"` is empty), also ignore `$GRAPHIFY_OUT/` (`docs/graphify-out/`) in `.gitignore` so local AST builds never dirty `git status`. Untrack any previously committed machine-local or cache files via `git rm --cached -r "$GRAPHIFY_OUT/.graphify_python" "$GRAPHIFY_OUT/.graphify_root" "$GRAPHIFY_OUT/manifest.json" "$GRAPHIFY_OUT/cache" 2>/dev/null || true`.

---

### Stage 3: Install & Configure `superpowers` (By Harness)

Execute the branch matching the developer's coding agent harness:

#### Branch A: OpenCode (V2 `>= 2.0.4` or V1 `1.x`)

1. Locate `~/.config/opencode/opencode.json` (or `$XDG_CONFIG_HOME/opencode/opencode.json`). Create it if missing.
2. Check the installed version via `opencode --version`:
   - **OpenCode V2 (`2.0.4` or later)**: Add `"superpowers@git+https://github.com/obra/superpowers.git"` to `"plugins"` (or `"plugin"`), preserving all existing fields:
     ```json
     {
       "$schema": "https://opencode.ai/config.json",
       "plugins": [
         "superpowers@git+https://github.com/obra/superpowers.git"
       ]
     }
     ```
   - **OpenCode V1 (`1.x`)**: Add `"superpowers@git+https://github.com/obra/superpowers.git"` to `"plugin"`, preserving all existing fields.
   - **Remove legacy V1 symlinks if present**:
     ```bash
     rm -f ~/.config/opencode/plugins/superpowers.js
     rm -rf ~/.config/opencode/skills/superpowers
     ```
   - **Windows Native Fallback** (if Bun/OpenCode on Windows fails to clone `git+https` plugin specs):
     ```powershell
     npm install superpowers@git+https://github.com/obra/superpowers.git --prefix "$HOME\.config\opencode"
     ```
     Then reference `"C:\\Users\\<username>\\.config\\opencode\\node_modules\\superpowers"` in `"plugins"` / `"plugin"` inside `opencode.json`.

#### Branch B: CLI-Installable Harnesses (Agent Runs Automatically)

- **Gemini CLI**: `gemini extensions install https://github.com/obra/superpowers`
- **GitHub Copilot CLI**: `copilot plugin marketplace add obra/superpowers-marketplace && copilot plugin install superpowers@superpowers-marketplace`
- **Google Antigravity**: `agy plugin install https://github.com/obra/superpowers`
- **Pi Coding Agent**: `pi install git:github.com/obra/superpowers`
- **Devin CLI**: `devin plugins install obra/superpowers`
- **Factory Droid**: `droid plugin marketplace add https://github.com/obra/superpowers && droid plugin install superpowers@superpowers`
- **Qwen Code**: `qwen extensions install obra/superpowers`
- **Grok Build CLI**: `grok plugin install superpowers@xai-official --trust`
- **Hermes Agent**: `hermes plugins install obra/superpowers --enable`
- **Muse**: `git clone https://github.com/obra/superpowers.git "$HOME/.cache/superpowers-install" && muse plugins install "$HOME/.cache/superpowers-install" && muse plugins approve superpowers && rm -rf "$HOME/.cache/superpowers-install"`

#### Branch C: Interactive Slash-Command / UI Marketplace Harnesses (Agent Instructs Developer)

Present the exact command below to the developer to run in their host chat interface:

- **Claude Code**: `/plugin install superpowers@claude-plugins-official` *(or `/plugin marketplace add obra/superpowers-marketplace` then `/plugin install superpowers@superpowers-marketplace`)*
- **Cursor**: `/add-plugin superpowers`
- **Codex CLI**: `/plugins` → search `superpowers` → select **Install Plugin**
- **Codex App**: Sidebar **Plugins** → Coding → **Superpowers** → click **`+`**
- **Kimi Code**: `/plugins install https://github.com/obra/superpowers`

---

### Stage 4: Install & Configure `mattpocock/skills` — All 27 Skills (Global + Per-Repo)

> **Important**: Pick **only one** installation method per harness below (never install both the native plugin and `npx skills` on the same harness, or every skill will be registered twice).

#### 4.1 Install All 27 Skills for the Active Harness

- **Claude Code (Native Auto-Updating Plugin)**:
  ```bash
  claude plugin install mattpocock-skills@claude-plugins-official
  ```
  *(Or tell the user to run `/plugin install mattpocock-skills@claude-plugins-official` in Claude Code chat.)*
- **Codex CLI & App (Native Auto-Updating Plugin)**:
  ```bash
  codex plugin marketplace add mattpocock/skills
  codex plugin add mattpocock-skills@mattpocock
  ```
- **GitHub Copilot CLI & VS Code (Native Auto-Updating Plugin)**:
  ```bash
  copilot plugin marketplace add mattpocock/skills
  copilot plugin install mattpocock-skills@mattpocock
  ```
  Then ensure `~/.copilot/settings.json` contains:
  ```json
  {
    "extraKnownMarketplaces": {
      "mattpocock": {
        "source": { "source": "github", "repo": "mattpocock/skills" },
        "autoUpdate": true
      }
    }
  }
  ```
  *(In VS Code, the developer can also run **Chat: Install Plugin From Source** → `https://github.com/mattpocock/skills`.)*
- **Gemini CLI (Both Engineering & Productivity Skill Paths)**:
  ```bash
  gemini skills install https://github.com/mattpocock/skills.git --path skills/engineering
  gemini skills install https://github.com/mattpocock/skills.git --path skills/productivity
  ```
- **OpenCode, Cursor, Devin, Windsurf, Amp, Pi, Antigravity, Factory Droid, Kimi, Qwen, Grok, Hermes, Muse, Aider, Kilo, Trae, Kiro (All 27 Skills via Non-Interactive Sync + `npx skills`)**:
  - First check if all 27 skills (`20` in `skills/engineering/*` and `7` in `skills/productivity/*`, including `setup-matt-pocock-skills`) are already present in `~/.config/opencode/skills/` or `~/.agents/skills/`. If not yet present in either directory, install them non-interactively into the target directory without duplicating across both (using `$HOME/.cache` rather than `/tmp` so repository sandbox rules are respected):
    ```bash
    _TARGET_SKILLS_DIR="$HOME/.agents/skills"
    if [ -d "$HOME/.config/opencode/skills/wayfinder" ] && [ ! -d "$HOME/.agents/skills/wayfinder" ]; then
      _TARGET_SKILLS_DIR="$HOME/.config/opencode/skills"
    fi
    if [ ! -d "$_TARGET_SKILLS_DIR/setup-matt-pocock-skills" ] || [ ! -d "$_TARGET_SKILLS_DIR/wayfinder" ]; then
      _MP_CACHE="$HOME/.cache/mattpocock-skills-sync"
      rm -rf "$_MP_CACHE"
      git clone --depth 1 https://github.com/mattpocock/skills.git "$_MP_CACHE"
      mkdir -p "$_TARGET_SKILLS_DIR"
      cp -R "$_MP_CACHE/skills/engineering/"* "$_TARGET_SKILLS_DIR/"
      cp -R "$_MP_CACHE/skills/productivity/"* "$_TARGET_SKILLS_DIR/"
      rm -rf "$_MP_CACHE"
    fi
    ```
  - **Alternatively**, if the developer's harness uses a dedicated harness-specific skills folder via `npx skills@latest` instead of `~/.agents/skills/` (do **not** run both on a harness that already reads `~/.agents/skills/`):
    ```bash
    npx -y skills@latest add mattpocock/skills --all -g -a <agent> -y || npx skills@latest add mattpocock/skills -a <agent>
    ```
    *(To update later: re-run the `git clone` sync above or run `npx skills@latest update`.)*

#### 4.2 Per-Repository Scaffolding (`/setup-matt-pocock-skills`)

When inside a git repository, check whether `docs/agents/issue-tracker.md` and `docs/agents/domain.md` already exist:
- **If they already exist**: Verify that `AGENTS.md` or `CLAUDE.md` contains the `## Agent skills` context pointer block referencing `docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md` (if `triage` is used), and `docs/agents/domain.md`.
- **If they do not exist yet**: Run the `/setup-matt-pocock-skills` workflow for the current repository:
  1. Explore the repo (`git remote -v`, `AGENTS.md` / `CLAUDE.md`, `GLOSSARY.md` / `GLOSSARY-MAP.md`, `docs/adr/`, monorepo signals).
  2. Confirm with the developer:
     - **Section A (Issue tracker)**: GitHub Issues (`gh`), GitLab Issues (`glab`), Local markdown (`docs/features/<slug>/` or `.scratch/<slug>/`), or custom tracker → write `docs/agents/issue-tracker.md`.
     - **Section B (Triage labels)**: Default 5 canonical triage roles (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`) → write `docs/agents/triage-labels.md`.
     - **Section C (Domain docs)**: Single-context (`GLOSSARY.md` + `docs/adr/` at root) or multi-context (`GLOSSARY-MAP.md`) → write `docs/agents/domain.md`.
  3. Add the `## Agent skills` block to `CLAUDE.md` or `AGENTS.md` (editing whichever already exists).

---

### Stage 5: End-to-End Verification & Worktree Hygiene Gate

Setup is complete only when all five completion criteria pass:

1. **`graphify` CLI & Hook Status**:
   ```bash
   command -v graphify
   graphify hook status
   ```
   - **Completion Criterion**: `graphify` resolves on `PATH` and `graphify hook status` confirms `post-commit: installed` and `post-checkout: installed`.
2. **Knowledge Graph Query & Interpreter Check**:
   ```bash
   GRAPHIFY_OUT="${GRAPHIFY_OUT:-docs/graphify-out}"
   "$(tr -d '\r\n' < "$GRAPHIFY_OUT/.graphify_python")" -c "import graphify; print('graphify import OK')"
   graphify query "main" --graph "$GRAPHIFY_OUT/graph.json" --budget 500
   ```
   - **Completion Criterion**: Python imports `graphify` with exit code `0`, and `graphify query` reads `$GRAPHIFY_OUT/graph.json` without crash or missing-file errors.
3. **`superpowers` Skills Availability**:
   - **Completion Criterion**: For CLI/config harnesses, confirm `superpowers` is registered in the harness plugin list or config file and its skills (`using-superpowers`, `brainstorming`, `writing-plans`, `test-driven-development`, `systematic-debugging`) are discoverable. For slash-command harnesses, confirm the exact slash command was presented to the developer.
4. **`mattpocock/skills` (All 27 Skills) & Repo Scaffolding Availability**:
   - **Completion Criterion**: Confirm all 27 skills (`20` engineering + `7` productivity: `ask-matt`, `grill-with-docs`, `triage`, `improve-codebase-architecture`, `setup-matt-pocock-skills`, `to-spec`, `to-tickets`, `implement`, `implement-spec`, `wayfinder`, `retro`, `prototype`, `diagnosing-bugs`, `research`, `tdd`, `domain-modeling`, `codebase-design`, `code-review`, `pr`, `wizard`, `grill-me`, `handoff`, `teach`, `to-questionnaire`, `wait-what`, `grilling`, `writing-for-agents`) are installed in the harness plugin, `~/.config/opencode/skills/`, or `~/.agents/skills/` directory (without duplicate copies across both), and `docs/agents/issue-tracker.md` + `docs/agents/domain.md` exist in the repository.
5. **Clean Git Working Tree**:
   ```bash
   git status --short
   ```
   - **Completion Criterion**: Machine-local files (`**/.graphify_python`, `**/.graphify_root`, `**/.rebuild.lock`, `docs/graphify-out/manifest.json`, `docs/graphify-out/cache/`, and untracked harness-local directories) are gitignored and do not appear as modified or untracked noise in `git status --short`.

---

## 6. Implementation Decisions

1. **100% Project-Agnostic Runbook (`docs/agents/plugin-setup.md`)**:
   - Zero hardcoded project names, domain terms, or user home paths.
   - Dynamically detects `GRAPHIFY_OUT` (`docs/graphify-out` vs. `graphify-out`), resolves a verified shell-invocable Python interpreter across Linux, macOS, WSL2, and Windows, and handles both repositories with an existing committed graph and fresh repositories without a graph via `GRAPHIFY_OUT="$GRAPHIFY_OUT" graphify update .` (AST-only, zero LLM API key required).
   - Covers all three suites (`graphify`, `superpowers`, and all 27 `mattpocock/skills` + `/setup-matt-pocock-skills`).
2. **No-Duplication Rule for `mattpocock/skills`**:
   - Explicitly separates native auto-updating plugin installs (`claude`, `codex`, `copilot`), Gemini CLI dual-path installs (`skills/engineering` + `skills/productivity`), and `~/.agents/skills/` / `npx skills@latest` installs so no harness registers the 27 skills twice.
3. **Universal `.gitignore` Pattern**:
   - Uses `**/.graphify_python`, `**/.graphify_root`, `**/.rebuild.lock`, `**/.graphify_detect.json`, `**/.graphify_transcripts.json`, `docs/graphify-out/cache/`, and `docs/graphify-out/manifest.json` alongside harness-local directories (`.opencode/`, `.superpowers/`, `.codex/`, `.cursor/`, `.claude/`, `.gemini/`, `.kiro/`, `.kilo/`, `.agents/`) and untracked `/graphify-out/` so the same `.gitignore` snippet keeps `git status` clean and prevents machine-local path leaks in any repository layout.
4. **Cross-Harness Instruction Pointer (`CLAUDE.md` → `@AGENTS.md`)**:
   - Uses `@AGENTS.md` in root `CLAUDE.md` as a universal pattern so repositories maintaining `AGENTS.md` automatically support Claude Code, Qwen Code, and Muse without duplicating instructions (while respecting any repository root-file tracking allowlists in `.gitignore` or test guards).

---

## 7. Out of Scope

- Modifying any project-specific application source code, business logic, or runtime configuration.
- Requiring developers to standardize on a single coding agent harness.
- Automatically creating git commits unless explicitly requested by the developer.
