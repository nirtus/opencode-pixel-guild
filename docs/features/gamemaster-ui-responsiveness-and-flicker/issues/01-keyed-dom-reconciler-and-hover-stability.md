# 01: Keyed Spectator Drawer Reconciler, Hover Stability & Monotonic Snapshot Gate

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: None (can start immediately)

**What to build:** Deliver flicker-free mouseover transitions, preserved click events (`mousedown -> mouseup` never dropped), `0ms` local chat and tool-log accordion toggling, stable modal dropdowns/skill chips, and a shared monotonic client snapshot gate (`applyAuthoritativeSnapshot`) across the **Spectator Drawer** (**Guild Master Ledger** and **Character Sheet**), **Summon New Guild Adventurer** modal, **Guild Operator Account & Profile Settings** modal, and **Guild Floorplan** tooltips.

**Blocked by:** None (can start immediately)

**Status:** resolved

## Acceptance Criteria

- [x] Every source file remains strictly `<= 400` lines (`tests/00-architecture-invariants.test.ts`).
- [x] **Header vs. Static Slot Separation & Subtab-Isolated Signatures**:
  - Reconcile `#sheet-header-slot` independently of `#sheet-static-slot` in both **Guild Master Ledger** and **Character Sheet** modes, updating subtab button text/badges/counts and `◀ 1/N ▶` Hero/Project Browser `<button>` elements in place without replacing `headerSlot.innerHTML` when the current mode's header is already mounted.
  - Scope `#sheet-static-slot` signatures strictly to the active subtab:
    - `Guild Master Ledger` `Overview`: exclude `gitRev` and exclude streaming `lastAssistantText` for active/busy sessions (only include `lastAssistantText` preview for sessions with an unviewed result).
    - `Character Sheet` `Details`: depend only on session identity, **Project Heraldry**, model, **Context Mana**, cost, target station, child **Squad Subagents**, and kill confirmation/pending state (never invalidated by streaming chat text or tool output previews).
    - `Character Sheet` `Scrolls & Gear`: depend only on session identity, **Equipment Loadout**, **Skill Grimoires**, and connected plugins.
    - `Character Sheet` `Tool Log`: depend only on session identity, recent tool entries, and expanded tool call ID.
    - `Character Sheet` `Chat`: depend on session identity, dispatch log revision, busy/verb status, unviewed result flag, **Quest Gate** auto-expand state, and expanded message IDs.
- [x] **Keyed List Reconciliation, Delegated Container Events & 0ms Local Accordions**:
  - Patch list rows (`[data-select-session]`, `[data-commit-file-path]`, `[data-chat-message-id]`, `[data-tool-call-id]`) in place by key or use container-level delegated listeners so `<button>` DOM node identity (`prevBtn === nextBtn`) and `:hover` states survive 10–60 Hz SSE frames.
  - Toggle chat message expand/collapse (`button[data-toggle-chat-msg]`, `button[data-toggle-all-chat-msgs]`) and tool log output preview (`[data-tool-call-id]`) directly on the DOM elements in `0ms` without resetting the panel signature or firing redundant `session.view` requests when already viewed.
  - When on-demand message hydration (`GET /api/guild/session/:id/messages`) resolves, only reset the panel signature if the hydrated message digest or **Quest Gate** actually changed.
- [x] **Modal, Tooltip & Hover CSS Stability**:
  - Guard **Summon New Guild Adventurer** modal `<select>` dropdowns (`#summon-directory-select`, `#summon-agent-class`, `#summon-action-agent-select`) and `#summon-skill-browser-slot` by option/skill-list signatures so `syncSummonModalDom()` never resets open selects or flickers `@skill` chips on SSE ticks.
  - Guard `openOperatorPairingModal()` so the post-fetch DOM mount only runs if the profile signature changed and no modal input/button is active.
  - Guard `#alcove-tooltip` updates in `handleScenePointerHover()` with a content signature and compute horizontal percentage positioning against the active world width (`cw` in single-chamber workshop view, `cw + wildsW` in split view).
  - Fix `.btn[data-herald-party]:hover` and `.btn.active[data-herald-party]` CSS specificity so **Project Heraldry** pills preserve `.btn:hover` / `.btn.active` border and background transitions, and remove `.btn` from non-interactive `.hero-browser-current-btn` and `.skill-browser-track` containers.
- [x] **Shared Monotonic Client Snapshot Gate (`applyAuthoritativeSnapshot`)**:
  - Introduce `applyAuthoritativeSnapshot(nextSnapshot, options)` and route all client snapshot updates through it, rejecting snapshots with `version < currentSnapshot.version` (unless `allowVersionReset` is set) and always calling `syncClientViewedSessionsToSnapshot`.
- [x] Add automated tests verifying DOM button reference stability across SSE frames, subtab signature isolation, 0ms local chat/tool accordion toggling, Summon Modal select/skill stability, and monotonic snapshot version gating.

## Answer

- Added `src/web/snapshot-gate.ts` (`applyAuthoritativeSnapshot`, tombstone pruning, and in-flight pending state tracking) and routed all client snapshot assignments through it.
- Separated `#sheet-header-slot` and per-subtab `#sheet-static-slot` signatures in `src/web/side-panel-reconciler.ts` and `src/web/ledger-panel-reconciler.ts`, patching mounted headers in place, toggling chat/tool accordions in `0ms` without redundant `session.view` calls, and guarding on-demand `/messages` hydration by digest.
- Guarded `Summon Modal` `<select>` options and `#summon-skill-browser-slot` with `data-options-sig` / `data-skills-sig` in `src/web/summon-adventurer-controller.ts`, guarded `openOperatorPairingModal` post-fetch re-renders in `src/web/operator-pairing-controller.ts`, guarded `#alcove-tooltip` innerHTML in `src/web/pointer-and-camera.ts`, and added `.btn[data-herald-party]:hover` specificity in `src/web/styles-components.css`.
- Verified with unit tests in `tests/44-gamemaster-ui-responsiveness-and-flicker.test.ts` and `tests/00-architecture-invariants.test.ts`.
