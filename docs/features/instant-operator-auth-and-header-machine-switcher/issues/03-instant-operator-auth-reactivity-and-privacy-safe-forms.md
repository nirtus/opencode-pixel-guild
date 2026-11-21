# 03: Instant Client Operator Auth Reactivity, Native Form Submit & Privacy-Safe Identity Prompts

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01, 02

**What to build:** Make `register`, `login`, `logout`, `delete-account`, `save-profile`, `pair-machine`, `activate-machine`, and `delete-machine` update the entire browser UI instantaneously without a page refresh, add native `<form>` `Enter` submission and focus-safe modal opening, and update username and **Guild Master Alias** labels/placeholders with `example (do not use actual name)`.

- [x] In `src/web/operator-modal-views.ts`, update username and alias prompts in the Register and Profile forms to `Choose username: example (do not use actual name)` and `Guild Master alias: example (do not use actual name)` with `placeholder="example (do not use actual name)"`.
- [x] Move `.modal-actions` inside each `<form data-operator-scope="...">` in `src/web/operator-modal-views.ts`, use `type="submit"` on primary form submit buttons, bind `bodySlot.onsubmit` in `src/web/operator-pairing-controller.ts` so pressing `Enter` submits any modal form, and prevent `openOperatorPairingModal()` from overwriting `bodySlot.innerHTML` while the user is actively typing in a focused input.
- [x] Implement an atomic `transitionOperatorState()` in `src/web/operator-pairing-controller.ts` that clears stale URL query params (`?project=`, `?sessionId=`), resets `characterWalkers`, `activeSummoningRituals`, `activeHaulRoutes`, `tickerLog`, and `cachedGitStateByRoom` on operator/machine switch or logout, invalidates `side-panel-reconciler.ts` and `ledger-panel-reconciler.ts` signatures (including `operatorId`, `isAuthenticated`, `operatorLabel`, and `totalRooms`), reconnects the live SSE stream, re-fits the camera, and repaints the HUD and canvas in the same frame.
- [x] Also update ` #btn-refresh-live` in `src/web/top-bar-reconciler.ts` to refresh `GET /api/guild/users/me` alongside `/api/guild/refresh`, and attach `getOperatorHeaders()` to `DELETE /api/guild/room` in `src/web/demolition-modal-controller.ts`.
- [x] Add automated tests covering `dispatchOperatorModalAction` across `register`, `login`, `save-profile`, `activate-machine`, and `logout`, verifying instant state/DOM transitions without page reload, native `Enter` form submission, and privacy-safe `example (do not use actual name)` prompts, keeping all source files `<= 400` lines.

## Answer

Updated Register and Profile forms in `src/web/operator-modal-views.ts` with `Choose username: example (do not use actual name)` and `Guild Master alias: example (do not use actual name)` labels/placeholders, placed `type="submit"` controls inside `<form data-operator-form-action="...">` with `bodySlot.onsubmit` handling, guarded `openOperatorPairingModal()` against clobbering focused inputs, and unified instant client state transitions (`resetClientWorldViewState`, `resetSidePanelSignatures`, `clearCachedGitState`, and `guild-operator-changed` camera/HUD/canvas repaint).
