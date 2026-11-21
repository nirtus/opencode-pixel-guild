# 03: Read-Write Host Workspace Mount, Live Git Commit CRUD & Committed Feature Retirement

**What to build:** Real end-to-end Git working-tree CRUD (`Stage`, `Unstage`, `Discard`, `Seal & Commit`) backed by a read-write host workspace mount in `docker-compose.yml`, explicit commit status/error feedback in the **Assembly Commit Ledger**, and feature-scoped Git cleanliness retirement so completed features immediately reset the **Goal Assembly Site** to `0/0 Blueprint Ready` with zero leftover `5/5` assembly parts.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] `docker-compose.yml` mounts the host repository (`.:/app:rw`) and parent workspace directory (`..:/workspaces:rw`) read-write so `git status`, `git add`, `git reset`, `git checkout`, and `git commit` operate on the real host working tree.
- [x] `deriveProjectTaskProgress` checks feature-scoped Git cleanliness (`git status --porcelain -- docs/features/<slug>`) and retired feature state so a completed feature (`resolvedTasks >= totalTasks`) whose feature files are committed retires immediately to `0/0 Blueprint Ready`, even if unrelated untracked screenshots exist in `docs/images/`.
- [x] Executing `Seal & Commit` (`git.commit`) commits changes on the real Git repository, retires the completed feature slug, resets the room's **Goal Assembly Site** to `0/0 Blueprint Ready`, and displays a visible `✅ Committed <hash>: <subject>` confirmation banner in the **Assembly Commit Ledger**.
- [x] Automated tests against a real temporary `git init` repository on disk verify `git.status`, `git.stage`, `git.unstage`, `git.discard`, `git.commit`, and immediate post-commit feature retirement.
