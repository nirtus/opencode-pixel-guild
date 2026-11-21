# 04: Live Reactive Goal Assembly Reset & Assembly Commit Ledger CRUD

**What to build:** A live, self-resetting **Goal Assembly Site** and interactive **Assembly Commit Ledger** CRUD system driven by actual uncommitted Git working-tree state and active feature tasks. Removes all hardcoded `3/5 (60%)` fallbacks across canvas, choreography, and HUD; retires completed feature folders once their files are committed so the scaffold never stays stuck at `100%` forever; derives live **Assembly Parts** from active open issues and uncommitted Git file changes (`git status` / `git diff`); automatically resets the **Feature Assembly Scaffold** to `0/0 Blueprint Ready` when the working tree is clean; and unlocks full Git Commit CRUD (`Create` draft, `Read` changed files/diffs/commits, `Update` staged selection & commit message, `Delete`/discard unstaged edits, and `Execute` `git commit`) when assembly finishes.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Hardcoded `3/5` (`totalTasks: 5, resolvedTasks: 3`) fallbacks are completely removed across canvas assembly painting, choreography, and ledger view-models.
- [x] Live Git working-tree scanner inspects the **Workshop Room** directory (`git status --porcelain -uall`, `git diff --numstat`, branch, and HEAD commit) via an injectable Git adapter seam.
- [x] If the newest feature folder has all issues marked `resolved` and the Git working tree has no uncommitted changes, the scanner retires that completed feature and resets the **Goal Assembly Site** to `0/0 Blueprint Ready` (`totalParts: 0, fittedCount: 0`).
- [x] Server exposes **Assembly Commit Ledger** CRUD operations (`GET /api/guild/git?roomId=...` and `POST /api/guild/git` supporting `git.status`, `git.diff`, `git.stage`, `git.unstage`, `git.draft.update`, `git.discard`, `git.commit`).
- [x] Operators can inspect changed/staged/untracked files with `+add/-del` stats and diff preview, stage/unstage files, edit the commit title/body, discard unstaged file edits, and click `Seal & Commit` to execute `git commit`, trigger the completion burst, and reset the **Goal Assembly Site** to `0/0 Blueprint Ready`.
- [x] Automated tests using an in-memory Git adapter verify clean-tree reset, live part fitting, and all Commit CRUD operations (`status`, `diff`, `stage`, `unstage`, `discard`, `draft.update`, `commit`), and all source files remain `<= 400` lines.
