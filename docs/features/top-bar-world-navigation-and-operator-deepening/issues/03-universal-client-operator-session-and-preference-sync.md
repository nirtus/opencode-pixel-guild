# 03: Universal Client Guild Operator Session, Declarative Modal Delegation & Preference Sync

**What to build:** Deepen client-side **Guild Operator** and **OpenCode Machine Pairing** session management behind a universal interface that replaces the sixteen hardcoded modal element ID bindings with declarative `data-operator-action` + form-data delegation, automatically hydrates all saved **Guild Operator** preferences (`selectedProjectId`, `selectedRoomId`, `rosterMode`, `visualStyleMode`, and **Spectator Drawer** subtabs) into client state upon login and boot, and persists preference changes universally through one authenticated request seam.

**Blocked by:** 01: Canonical Project World Resolution & Roster-Aware Session Counting Seam

**Status:** resolved

- [x] Modal templates and controller logic communicate through a universal declarative `data-operator-action` and named `<form>` / `FormData` contract rather than sixteen hardcoded element ID selectors.
- [x] Upon login and boot (`syncOperatorAuthGate`), all persisted `GuildOperatorPreferences` fields returned by `/api/guild/users/me` hydrate into client state (while preserving explicit `?project=` URL query parameter overrides when present).
- [x] Switching **Project Worlds**, toggling roster or visual style modes, or changing **Spectator Drawer** subtabs persists through a single universal preference synchronization helper using the shared operator request header seam.
- [x] Automated tests verify universal preference hydration/persistence and declarative modal action handling, with all source files `<= 400` lines.
