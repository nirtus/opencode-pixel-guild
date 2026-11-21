# Project-Agnostic Graphify Output Resolution and Worktree Hygiene

Type: grilling
Label: ready-for-agent
Status: resolved
Blocked by: none

## Question

When an agent runs the setup instructions on any developer's machine across arbitrary repositories:
1. Different repositories either have no graph built yet, store their graph at the default `graphify-out/`, or store it at `docs/graphify-out/`. Furthermore, `.graphify_python` and `.graphify_root` store machine-local absolute paths that dirty `git status` if tracked.
2. Project-scoped `graphify <harness> install` commands (e.g., `graphify cursor install`, `graphify claude install`, `graphify gemini install`, `graphify kiro install`, `graphify kilo install`, `graphify antigravity install`) and `npx skills` project-local installs write harness-specific files (`.cursor/rules/graphify.mdc`, `.claude/settings.json`, `.gemini/`, `.kiro/`, `.kilo/`, `.agents/`) into the repository working tree.

How should the setup instructions handle arbitrary repository layouts and keep `git status` clean across all harnesses?

## Answer

1. **Dynamic `GRAPHIFY_OUT` Resolution (`docs/graphify-out` Default), Cross-Platform Interpreter Binding & Fresh-Repo Bootstrap**:
   - Resolve `GRAPHIFY_OUT` to `docs/graphify-out` by default (`GRAPHIFY_OUT="${GRAPHIFY_OUT:-docs/graphify-out}"`).
   - Resolve `.graphify_python` by testing candidate interpreters (`uv tool run --from graphifyy python`, `graphify` script shebang, `uv`/`pipx` tool venvs including WSL `/mnt/c/Users/*/AppData/Roaming/uv/tools/graphifyy/Scripts/python.exe`, `python3`, `python`) with `"$CAND" -c "import graphify"` and writing the shell-invocable path directly to `docs/graphify-out/.graphify_python` rather than `sys.executable` (avoiding Windows backslash path breakage under WSL bash).
   - If `$GRAPHIFY_OUT/graph.json` does not exist yet in the target repository, bootstrap it with `GRAPHIFY_OUT="$GRAPHIFY_OUT" graphify update .` and sync any root `graphify-out/` output into `docs/graphify-out/` (removing temporary root `graphify-out/`).
2. **Single Source of Truth (`AGENTS.md` + `CLAUDE.md` + `docs/agents/`)**:
   - Use `AGENTS.md` as the single tracked source of truth for repository agent rules, `## Agent skills` (`docs/agents/{issue-tracker,triage-labels,domain,plugin-setup}.md`), and `## graphify` instructions, paired with a root `CLAUDE.md` containing `@AGENTS.md` so Claude Code, Qwen Code, and Muse load `AGENTS.md` without duplicating rules.
3. **Universal `.gitignore` & Untracking of Machine-Local State**:
   - Use wildcard and path gitignore patterns (`**/.graphify_python`, `**/.graphify_root`, `**/.rebuild.lock`, `**/.graphify_detect.json`, `**/.graphify_transcripts.json`, `docs/graphify-out/cache/`, `docs/graphify-out/manifest.json`) so machine-local interpreter, scan-root, lock, manifest (which stores host absolute paths), and cache files are ignored regardless of whether the project uses `graphify-out/` or `docs/graphify-out/`.
   - If `.graphify_python`, `.graphify_root`, `manifest.json`, or `cache/` were previously committed in a repository, untrack them (`git rm --cached -r`) while keeping the local files on disk; if the repository does not commit `$GRAPHIFY_OUT/` (`git ls-files "$GRAPHIFY_OUT"` is empty), also ignore `graphify-out/` in `.gitignore`.
   - Ignore local harness hook/rule directories (`.opencode/`, `.superpowers/`, `.codex/`, `.cursor/`, `.claude/`, `.gemini/`, `.kiro/`, `.kilo/`, `.agents/`) so developers on any harness can enable local tool hooks without polluting version control.
