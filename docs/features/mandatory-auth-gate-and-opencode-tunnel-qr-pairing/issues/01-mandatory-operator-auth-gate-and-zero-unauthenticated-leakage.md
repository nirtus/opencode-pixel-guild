# 01: Mandatory Operator Auth Gate & Zero Unauthenticated Workspace Leakage

**What to build:** Enforce a mandatory **Operator Auth Gate** so that unauthenticated visitors cannot see any **Project Worlds**, **Workshop Rooms**, characters, or Git working-tree state without logging in. Unauthenticated calls to `/api/guild/users/me` return `authenticated: false` and `/api/guild/snapshot` returns an empty locked snapshot (`0` rooms, `0` characters). Opening the visualizer while unauthenticated displays a non-dismissible full-screen **Operator Auth Gate** (`🔑 Login` / `✨ Register`), registering a new account starts with `0` paired machines (never inheriting the host's local daemon), and logging out immediately locks the UI back behind the **Operator Auth Gate**.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] When `requireAuth` / `operatorStorePath` is active, unauthenticated `GET /api/guild/users/me` returns `authenticated: false` and unauthenticated `GET /api/guild/snapshot` returns an empty locked snapshot (`rooms: {}`, `characters: {}`, `roomOrder: []`).
- [x] Registering a new **Guild Operator** (`POST /api/guild/auth/register`) without an explicit pairing URL/link creates an account with `pairedMachines: []` and `0` rooms, never auto-attaching the host server's default OpenCode daemon.
- [x] When `authenticated === false`, the browser sets `data-auth-locked="true"` and opens the **Operator Auth Gate** modal (`🔑 Login` / `✨ Register`) with the close button and unauthenticated tabs hidden.
- [x] Clicking `🚪 Logout` clears the stored operator token, resets the client snapshot to empty, and immediately locks the UI behind the **Operator Auth Gate**.
- [x] Automated tests and headless Chrome screenshots verify zero unauthenticated leakage and the full-screen **Operator Auth Gate**, with all source files `<= 400` lines.
