# Verify Project-Agnostic Runbook Execution and Worktree Hygiene

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 02, 03

## Question

Apply the universal `.gitignore` hygiene rules to exclude machine-local `graphify` interpreter/root files (`**/.graphify_python`, `**/.graphify_root`) and harness-specific local hook directories, untrack any previously committed `.graphify_python` and `.graphify_root` files while keeping them on disk, and verify the end-to-end project-agnostic setup checks across `graphify`, `superpowers`, and all 27 `mattpocock/skills`.

### Scope & Deliverables

1. **Apply Universal `.gitignore` Rules & `docs/graphify-out/` Placement**:
   - Add `**/.graphify_python`, `**/.graphify_root`, `**/.rebuild.lock`, `**/.graphify_detect.json`, `**/.graphify_transcripts.json`, `docs/graphify-out/cache/`, and `docs/graphify-out/manifest.json` to `.gitignore` so per-developer Python interpreter, clone root, lock, manifest (which stores absolute host paths), and cache files are ignored regardless of output folder location (`docs/graphify-out/` or `graphify-out/`).
   - Place the repository's `graphify` output in **`docs/graphify-out/`** (`GRAPHIFY_OUT="docs/graphify-out"`), move any root `graphify-out/` artifacts into `docs/graphify-out/` and remove root `graphify-out/`, and update `.opencode/plugins/graphify.js`, `.git/hooks/post-commit`, and `.git/hooks/post-checkout` to reference `docs/graphify-out/`.
   - Add untracked `/graphify-out/`, `/docs/graphify-out/` (when not committed), and harness-local configuration directories (`.opencode/`, `.superpowers/`, `.codex/`, `.cursor/`, `.claude/`, `.gemini/`, `.kiro/`, `.kilo/`, `.agents/`), and ensure any root-file tracking allowlist in the repository test suite (`tests/test-sandbox.ts` `allowedRootFiles`) or `.gitignore` accommodates `CLAUDE.md`.
2. **Untrack Machine-Local Graphify Files**:
   - Run `git rm --cached -r` on any tracked `.graphify_python`, `.graphify_root`, `manifest.json`, and `cache/` files so git stops tracking machine-specific paths and cache blobs while leaving the local files intact on disk.
   - Verify via `git check-ignore -v` that `.graphify_python`, `.graphify_root`, `manifest.json`, and `cache/` are ignored.
3. **End-to-End Verification (All 5 Stages)**:
   - Run the Stage 5 verification commands from `docs/agents/plugin-setup.md`:
     - `graphify hook status` (`post-commit: installed` and `post-checkout: installed`) and `graphify query`
     - Python `import graphify` check via `.graphify_python`
     - Confirm `superpowers` plugin/skills and all 27 `mattpocock/skills` (`20` engineering + `7` productivity, including `setup-matt-pocock-skills` and `docs/agents/{issue-tracker,triage-labels,domain}.md`) are present
     - Confirm clean `git status --short` and `npm test` (`0` failures)
   - Update project documentation (`README.md`, `GLOSSARY.md` as applicable), verify container deployment (`npm run docker:up` on `opencode-pixel-guild-visualizer` port `4310`), record verification results under `## Answer` in this ticket, and resolve the ticket on `docs/features/agent-plugin-setup/map.md`.

### References

- [Project-Agnostic Graphify Output Resolution and Worktree Hygiene](./02-repo-local-graphify-state-and-worktree-hygiene.md)
- [Author Portable Project-Agnostic Agent Plugin Setup Runbook](./03-author-multi-harness-agent-plugin-setup-runbook.md)
- [Project-Agnostic Multi-Harness Agent Setup for `graphify`, `superpowers`, and `mattpocock/skills` Specification](../spec.md)

## Answer

1. **Applied Universal `.gitignore` Rules & Placed Knowledge Graph in `docs/graphify-out/`**:
   - Updated `.gitignore` to exclude `**/.graphify_python`, `**/.graphify_root`, `**/.rebuild.lock`, `**/.graphify_detect.json`, `**/.graphify_transcripts.json`, `docs/graphify-out/cache/`, `docs/graphify-out/manifest.json`, `/graphify-out/`, and local harness configuration directories (`.opencode/`, `.superpowers/`, `.codex/`, `.cursor/`, `.claude/`, `.gemini/`, `.kiro/`, `.kilo/`, `.agents/`).
   - Placed the repository's `graphify` output in **`docs/graphify-out/`** (with `docs/graphify-out/graph.json`, `docs/graphify-out/GRAPH_REPORT.md`, and `docs/graphify-out/graph.html` tracked in git, while machine-local `docs/graphify-out/manifest.json`, `docs/graphify-out/cache/`, `docs/graphify-out/.graphify_python`, and `docs/graphify-out/.graphify_root` remain local on disk and gitignored), removed root `graphify-out/`, updated `.opencode/plugins/graphify.js` to an OpenCode V2 + V1 dual-compatible plugin (`export default { id: "graphify", server: GraphifyPlugin, setup }`) targeting `docs/graphify-out/`, removed `.opencode/opencode.json` so OpenCode V2 auto-discovers `.opencode/plugins/graphify.js` cleanly (`status: "active"`), and updated `.git/hooks/post-commit` and `.git/hooks/post-checkout` to target `docs/graphify-out/`.
   - Added `"CLAUDE.md"` to `allowedRootFiles` and added `.gitignore`, `CLAUDE.md`, `AGENTS.md` (`docs/graphify-out/GRAPH_REPORT.md`), `docs/agents/plugin-setup.md` (`GRAPHIFY_OUT="${GRAPHIFY_OUT:-docs/graphify-out}"`), `docs/graphify-out/graph.json`, `docs/graphify-out/GRAPH_REPORT.md`, and `existsSync("graphify-out") === false` assertions to `verifyRepositoryPublicHygiene()` in `tests/test-sandbox.ts`.
   - Verified via `git check-ignore -v` that `docs/graphify-out/.graphify_python` (`.gitignore:17:**/.graphify_python`), `docs/graphify-out/.graphify_root` (`.gitignore:18:**/.graphify_root`), `docs/graphify-out/cache` (`.gitignore:22:docs/graphify-out/cache/`), and `docs/graphify-out/manifest.json` (`.gitignore:23:docs/graphify-out/manifest.json`) are ignored cleanly.
2. **Executed & Verified All 5 Runbook Stages End-to-End**:
   - **Stage 1 & 2 (`graphify`)**: Bound `docs/graphify-out/.graphify_python` and `docs/graphify-out/.graphify_root`, ran `graphify install --platform opencode` and `graphify hook install` (`post-commit: installed` and `post-checkout: installed` with `GRAPHIFY_OUT="docs/graphify-out"`), and built `docs/graphify-out/graph.json` via `GRAPHIFY_OUT="docs/graphify-out" WSLENV="${WSLENV:+$WSLENV:}GRAPHIFY_OUT/u" graphify update .`.
   - **Stage 3 (`superpowers`)**: Configured `"superpowers@git+https://github.com/obra/superpowers.git"` in `~/.config/opencode/opencode.json` and confirmed live OpenCode V2 skill discovery (`using-superpowers`, `brainstorming`, `writing-plans`, `test-driven-development`, `systematic-debugging`, etc.).
   - **Stage 4 (`mattpocock/skills`)**: Verified all 27 skills (`20` engineering + `7` productivity) in `~/.agents/skills/` alongside `docs/agents/{issue-tracker,triage-labels,domain,plugin-setup}.md`.
   - **Stage 5 (Verification & Container Proof)**: Verified `"$(tr -d '\r\n' < "$GRAPHIFY_OUT/.graphify_python")" -c "import graphify; print('graphify import OK')"` (`graphify import OK`), `graphify query "main" --graph docs/graphify-out/graph.json --budget 500`, `npm test` (`0` failures), and deployed/verified on the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`) with visual proof captured at `docs/images/agent-plugin-setup.png`.
