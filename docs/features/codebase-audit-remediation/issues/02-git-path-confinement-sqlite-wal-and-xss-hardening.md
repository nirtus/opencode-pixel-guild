# 02: Git Diff & Workspace Path Confinement, SQLite WAL Safety & Markdown Link XSS Hardening

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01

**What to build:** Confine untracked Git file diff previews and workspace folder discovery strictly to validated workspace directories, sanitize Git remote and branch identifiers before remote fallback shell execution, eliminate startup deletion of SQLite `-wal` and `-shm` journal files in the **Guild Chronicle Store**, and harden HTML and inline markdown link escaping against attribute breakout XSS.

**Blocked by:** 01: Server Auth Enforcement, Registered Room Validation & Request Body Limits

**Status:** resolved

## Acceptance Criteria

- [x] Every modified or created source module remains strictly `<= 400` lines.
- [x] Untracked file diff previews resolve the requested path against the repository root and verify that the resolved path stays strictly inside the repository root (and outside `.git/` and companion data directories) before reading from disk.
- [x] Workspace folder discovery (`GET /api/guild/workspace-folders`) verifies that any `?parent=` directory resolves inside the allowed workspace root and computes `hostPath` relative to the actual scanned parent directory, and static source module serving appends a path separator boundary check and excludes server-only slices.
- [x] Remote Git synchronization (`git.sync`) validates remote and branch names against a strict safe Git ref pattern (`/^[A-Za-z0-9._/-]+$/` and not starting with `-`) before constructing fallback remote shell commands.
- [x] Startup initialization of the **Guild Chronicle Store** never deletes or truncates `-wal` or `-shm` SQLite journal files under lock contention.
- [x] `escapeHtml` escapes single quotes (`'` -> `&#39;`), inline markdown link formatting rejects URLs containing quotes (`"`, `'`, `&quot;`, `&#39;`) or angle brackets, and all **Project Heraldry**, **Quest Gate** marker, and **Project Mini-Assembly** attribute interpolations are HTML-escaped.
- [x] Automated behavioral tests verify path traversal rejection, safe Git ref validation, SQLite WAL preservation, and markdown link XSS sanitization, verified on the `opencode-pixel-guild-visualizer` Docker container.

## Answer

- **Git Diff Path Confinement (`src/ingress/git-working-tree.ts`)**: Resolved candidate paths in `getFileDiff` against `resolve(resolved)` via `relative(resolvedRoot, fullUntracked)`, rejecting leading-dash flags (`filePath.startsWith("-")`), path traversal (`..` or absolute relative result), `.git`/`data` directories, and files outside the repository root before running `git diff` or reading untracked files.
- **Workspace Folder Confinement & Static Router Boundary (`src/server/workspace-folder-routes.ts`, `src/server/static-router.ts`)**: Added `isAllowedWorkspaceParent` to reject `..` traversal, system directories (`/etc`, `/proc`, `/sys`, `/root`, `/var`, `/usr`, `/bin`, `/sbin`, `/dev`, `/run`), the companion `data/` directory, and paths outside `defaultLocalRoot`/`process.cwd()` with HTTP `400`, while computing subfolder `hostPath` relative to `scanRoot`. Appended `+ sep` boundary checks in `tryServeStaticAsset` and blocked `/src/server/*` from static module serving.
- **Safe Remote Git Ref Validation (`src/ingress/git-working-tree.ts`)**: Added `isSafeGitRefName` (`/^[A-Za-z0-9._/-]+$/`, not starting with `-`, and not containing `..`) and validated `remoteName`, `before.branch`, and `afterFetch.branch` in `syncRepository` before invoking `tryGitOrRemote`.
- **SQLite WAL/SHM Non-Deletion Guarantee (`src/server/chronicle-sqlite-store.ts`)**: Removed `rmSync("${sqlitePath}-shm")` and `rmSync("${sqlitePath}-wal")` (and the unused `rmSync` import) from the startup retry path so uncheckpointed WAL data is never deleted under transient lock contention.
- **HTML & Markdown Link XSS Hardening (`src/hud/hud-formatters.ts`, `src/hud/chat-markdown-formatter.ts`, `src/web/ledger-panel-reconciler.ts`, `src/web/commit-ledger-view.ts`)**: Added `.replace(/'/g, "&#39;")` to `escapeHtml`, restricted `formatInlineMarkdown` link URLs so quotes, angle brackets, and HTML entity quote/bracket sequences are rejected, and wrapped `questGate.marker`, `partyKey`, `crestIcon`, `status`, and `statusLabel` interpolations in `escapeHtml(...)`.
