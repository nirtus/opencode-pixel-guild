# 01: Anonymous Guild Operator CRUD & Private OpenCode Daemon Pairing

**What to build:** End-to-end anonymous **Guild Operator** workspace provisioning and CRUD (`Create`, `Read`, `Update`, `Delete`) with private OpenCode daemon pairing and complete multi-user state isolation. When a user opens the visualizer, an anonymous **Guild Operator** identity is provisioned (stored via browser token and server registry) with no public cross-user switcher. Through a top-bar pairing & operator modal and REST endpoints (`POST /api/guild/users`, `GET /api/guild/users/me`, `PATCH /api/guild/users/me`, `DELETE /api/guild/users/me`), each **Guild Operator** can pair their own OpenCode daemon endpoint (URL + optional auth credentials or local discovery), inspect pairing status, update preferences, or delete/reset their workspace. Each operator receives an isolated `WorldStateReducer` and private SSE stream so two operators never see or mutate each other's sessions, worlds, or state.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Anonymous **Guild Operator** identity is automatically provisioned on first visit and persisted across requests via `X-Guild-Operator-Id` header / query param (`?operatorId=...` for SSE) and `localStorage`, with backward-compatible fallback when omitted in existing tests.
- [x] Full User CRUD endpoints (`POST /api/guild/users`, `GET /api/guild/users/me`, `PATCH /api/guild/users/me`, `DELETE /api/guild/users/me`) allow creating a fresh operator workspace, reading pairing status and preferences, updating the paired OpenCode daemon URL/credentials and preferences, and deleting/resetting the operator workspace.
- [x] No endpoint or UI control exposes a list of other users or allows switching into another **Guild Operator**'s workspace.
- [x] Each **Guild Operator** owns an isolated `WorldStateReducer`, SSE client subscriber set, and paired OpenCode adapter so actions or presets triggered by Operator A never broadcast to or mutate Operator B's state.
- [x] Top-bar **OpenCode Pairing & Operator Modal** allows the user to view connection status, pair a custom OpenCode daemon URL/token, or reset/delete their anonymous operator profile.
- [x] Automated integration tests verify multi-operator isolation and full User CRUD lifecycle at the server HTTP/SSE seam, and all source files remain `<= 400` lines.
