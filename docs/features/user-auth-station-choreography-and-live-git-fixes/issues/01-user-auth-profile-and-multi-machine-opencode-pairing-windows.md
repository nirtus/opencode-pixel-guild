# 01: User Registration, Login, Profile Config & Multi-Machine OpenCode Pairing Windows

**What to build:** A complete, disk-persisted **Guild Operator** authentication, profile management, and multi-machine **OpenCode Machine Pairing** CRUD system with visible top-bar `👤 Login / Account` and `🔗 Pair OpenCode` buttons on both desktop and mobile, plus four dedicated modal windows: `Login`, `Register`, `OpenCode Machines` (add, test, activate/switch, edit, and remove multiple OpenCode pairings across different machines), and `Profile & Config` (update alias/password/preferences, logout, or delete account).

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Top bar displays visible `#btn-open-account-modal` (`👤 Login / Register` or `👤 <Username>`) and `#btn-open-pairing-modal` (`🔗 Pair OpenCode`) buttons on both desktop and mobile.
- [x] Server persists **Guild Operator** accounts (`username`, `passwordHash`, `label`, `pairedMachines`, `preferences`) to disk so accounts and machine pairings survive server restarts.
- [x] `POST /api/guild/auth/register`, `POST /api/guild/auth/login`, and `POST /api/guild/auth/logout` provide full registration, credential verification, and session token management.
- [x] `POST /api/guild/users/me/machines`, `PATCH /api/guild/users/me/machines/:machineId`, and `DELETE /api/guild/users/me/machines/:machineId` allow a logged-in user to add multiple OpenCode machines, test reachability, switch the active paired machine, edit machine credentials, or remove a machine.
- [x] All 4 modal windows (`Login`, `Register`, `OpenCode Machines`, `Profile & Config`) are interactive, styled without scrollbars, tested end-to-end, and captured in headless Chrome screenshots.
