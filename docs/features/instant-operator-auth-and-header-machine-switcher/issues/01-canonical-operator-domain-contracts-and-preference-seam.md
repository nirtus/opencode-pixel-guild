# 01: Canonical Guild Operator Domain Contracts & Boot-Gated Preference Synchronization Seam

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: None

**What to build:** Consolidate the triplicated **Guild Operator**, **OpenCode Machine Pairing**, and preference interfaces into `src/types/domain.ts`, remove duplicate subtab keys on `clientState`, and gate `persistClientUiWindowState` so frame-1 unhydrated defaults never overwrite server-saved operator preferences or trigger unauthenticated `PATCH /api/guild/users/me` calls before `syncOperatorAuthGate()` finishes.

- [x] Define canonical `PairedOpenCodeMachine`, `GuildOperatorPreferences`, and `GuildOperatorProfile` interfaces in `src/types/domain.ts` (including `label` for the **Guild Master Alias**) and consume them across `src/server/operator-store.ts`, `src/hud/hud-tooltip-types.ts`, `src/web/operator-modal-views.ts`, and `src/web/client-state.ts`.
- [x] Consolidate duplicate subtab properties on `clientState` (`heroSubtab`/`activeHeroSubtab`, `ledgerSubtab`/`activeLedgerSubtab`) and route client preference persistence through one authenticated synchronization seam.
- [x] Gate `persistClientUiWindowState` in `src/web/world-persistence.ts` behind `clientState.authBootCompleted && clientState.isAuthenticated` so frame-1 boot never overwrites `localStorage["guild.uiWindowState"]`, mutates `window.location.search`, or sends unauthenticated `PATCH /api/guild/users/me` requests.
- [x] Add unit tests verifying canonical preference hydration and confirming that unauthenticated boot frames do not clobber stored operator preferences or emit `PATCH /api/guild/users/me`, keeping all source files `<= 400` lines.

## Answer

Consolidated `GuildOperatorPreferences`, `PairedOpenCodeMachine`, `GuildOperatorProfile`, and client operator aliases in `src/types/operator-types.ts` (re-exported via `src/types/domain.ts`), unified `heroSubtab`/`activeHeroSubtab`, `ledgerSubtab`/`activeLedgerSubtab`, and `activeDrawerTab`/`mobileActiveTab` on `clientState`, and gated `persistClientUiWindowState` on `authBootCompleted && isAuthenticated`.
