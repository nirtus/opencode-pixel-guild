# Harden Linux Host `uv` Bootstrap and Provision `agent-plugin-setup` on Current Host

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 03, 04

## Question

When executing `docs/agents/plugin-setup.md` on a Linux host where `/usr/bin/python3` has neither `pip`, `ensurepip`, `uv`, nor `pipx` pre-installed, and where all 27 `mattpocock/skills` are already installed in `~/.config/opencode/skills/`, how should the runbook and current repository clone be hardened and provisioned end-to-end?

### Scope & Deliverables

1. **Harden `docs/agents/plugin-setup.md` & `docs/features/agent-plugin-setup/spec.md`**:
   - **Stage 2 Step 1 (User-Space `uv` Auto-Bootstrap)**: Add `$HOME/.local/bin` to `PATH` and automatically bootstrap `uv` in user space (`curl -LsSf https://astral.sh/uv/install.sh | sh`) when `uv`, `pipx`, and `python3 -m pip` are all unavailable on a Linux/macOS host.
   - **Stage 4.2 & Stage 5 (Existing Harness Skill Directory Check)**: Check whether all 27 `mattpocock/skills` are already installed in `~/.config/opencode/skills/` or `~/.agents/skills/` before running the non-interactive sync, preventing duplicate skill registration across `~/.config/opencode/skills/` and `~/.agents/skills/`.
2. **Provision & Verify All 5 Stages on Current Host & Repository Clone**:
   - Bootstrap `uv` in `~/.local/bin/uv` and install `graphifyy` (`~/.local/bin/uv tool install --upgrade graphifyy`).
   - Run `graphify install --platform opencode` to install the user-scope `graphify` skill for OpenCode.
   - Rebind `docs/graphify-out/.graphify_python` (`$HOME/.local/share/uv/tools/graphifyy/bin/python`) and `docs/graphify-out/.graphify_root` (`$(pwd)`), replacing stale foreign paths.
   - Install and patch `.git/hooks/post-commit`, `.git/hooks/post-checkout`, `.git/hooks/post-merge`, and `.git/hooks/post-rewrite` for `GRAPHIFY_OUT="docs/graphify-out"`.
   - Create `.opencode/plugins/graphify.js` (OpenCode V2 + V1 dual-compatible plugin) and ensure `.opencode/opencode.json` remains absent.
   - Refresh `docs/graphify-out/` via `GRAPHIFY_OUT="docs/graphify-out" graphify update .`.
   - Configure `"superpowers@git+https://github.com/obra/superpowers.git"` in `~/.config/opencode/opencode.json` for OpenCode V2 (`v2.3.0`).
   - Verify all 5 Stage 5 completion criteria, update documentation (`README.md`), deploy/verify on the `opencode-pixel-guild-visualizer` Docker container on port `4310`, run `npm test`, and capture visual proof at `docs/images/agent-plugin-setup.png`.

### References

- [Author Portable Project-Agnostic Agent Plugin Setup Runbook](./03-author-multi-harness-agent-plugin-setup-runbook.md)
- [Verify Project-Agnostic Runbook Execution and Worktree Hygiene](./04-gitignore-hygiene-and-local-hook-verification.md)
- [Project-Agnostic Multi-Harness Agent Setup for `graphify`, `superpowers`, and `mattpocock/skills` Specification](../spec.md)

## Answer

1. **Hardened `docs/agents/plugin-setup.md` & `docs/features/agent-plugin-setup/spec.md` for Bare Linux Hosts & `graphify 0.9+`**:
   - **Stage 2 Step 1 (`uv` User-Space Auto-Bootstrap)**: Added `export PATH="$HOME/.local/bin:$PATH"` and automatic `curl -LsSf https://astral.sh/uv/install.sh | sh` bootstrap when `uv`, `pipx`, and `python3 -m pip` are all absent on a Linux/macOS host.
   - **Stage 2 Step 3 (`graphify 0.9+` Hook & Merge-Driver Hygiene)**: Patched all 4 git hooks (`post-commit`, `post-checkout`, `post-merge`, `post-rewrite`) with `export GRAPHIFY_OUT="${GRAPHIFY_OUT:-docs/graphify-out}"`, relocated any untracked root `.gitattributes` created by `graphify hook install` to `.git/info/attributes` so `git status --short` remains clean, and synchronized user-scope `~/.config/opencode/plugins/graphify.js` and repo-local `.opencode/plugins/graphify.js` via `globalThis.__graphifyReminded` and `docs/graphify-out/graph.json`.
   - **Stage 4.2 & Stage 5 (Skill Directory Deduplication)**: Updated the non-interactive skill sync check to inspect both `~/.config/opencode/skills/` and `~/.agents/skills/` before cloning so hosts with all 27 `mattpocock/skills` in `~/.config/opencode/skills/` never duplicate them into `~/.agents/skills/`.
2. **Provisioned & Verified All 5 Stages on Current Linux Host**:
   - Bootstrapped `uv 0.13.8` (`~/.local/bin/uv`) and Node.js `v22.14.0` (`~/.local/bin/node`, `npm`, `npx`), and installed `graphifyy 0.9.108` (`~/.local/bin/graphify`).
   - Ran `graphify install --platform opencode` (installing `~/.config/opencode/skills/graphify` and `~/.config/opencode/plugins/graphify.js`).
   - Rebound `docs/graphify-out/.graphify_python` (`$HOME/.local/share/uv/tools/graphifyy/bin/python`) and `docs/graphify-out/.graphify_root` (`$(pwd)`), installed all 4 git hooks (`post-commit`, `post-checkout`, `post-merge`, `post-rewrite`), created `.opencode/plugins/graphify.js`, and rebuilt `docs/graphify-out/` (`1615 nodes, 5769 edges, 53 communities`).
   - Configured `"superpowers@git+https://github.com/obra/superpowers.git"` in `~/.config/opencode/opencode.json` for OpenCode `v2.3.0`, hot-loading all 15 `superpowers` skills alongside `graphify` and all 27 `mattpocock/skills` in `~/.config/opencode/skills/`.
   - Updated `README.md`, verified all 5 Stage 5 completion criteria, ran `npm test` (`358/358` passing across `125` suites, `0` failures), deployed to the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`, HTTP `200`), and verified visual output at `docs/images/agent-plugin-setup.png`.
