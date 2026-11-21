# 02: Persistent Project World Selection & Refresh Restoration

**What to build:** Deterministic **Project World** memory across browser refreshes and reconnects. Selecting a **Project World** tab in the top bar saves the active world ID to `localStorage`, the URL query parameter (`?project=...` via `history.replaceState`), and the operator preference record if available. Refreshing the page restores the exact last-opened **Project World** rather than snapping back to the first project world tab, even while initial snapshots are still hydrating.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Clicking any **Project World** button in the top navigation bar persists `selectedProjectId` to `localStorage`, updates `?project=<id>` via `window.history.replaceState`, and asynchronously syncs with operator preferences when available.
- [x] On page load or refresh (F5), initial `selectedProjectId` resolves deterministically from URL query (`?project=...`) or `localStorage` before the first snapshot arrives.
- [x] Top-bar reconciliation guards against empty or hydrating snapshots (`snapshot.version === 0` or zero project tabs) so it never clobbers a remembered `selectedProjectId` with `null` or the first project tab during boot.
- [x] Fallback to the first project tab occurs only when project tabs are populated and no remembered **Project World** matches any discovered project ID, directory, or name.
- [x] Automated tests verify that selecting a non-first **Project World** and simulating a page reload restores the selected **Project World** rather than the first tab, and all source files remain `<= 400` lines.
