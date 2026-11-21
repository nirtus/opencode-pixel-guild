# Specification: Instant Guild Operator Reactivity, Privacy-Safe Identity Prompts & Inline Header Machine Switcher

Label: ready-for-agent
Status: resolved

## Problem Statement

1. **User Input on `Register`, `Login`, `Logout`, and `Profile` Does Not Take Effect Instantaneously (Requires a Page Refresh)**:
   - On browser boot, `scheduleHudSync()` runs on frame 1 before `syncOperatorAuthGate()` finishes fetching `GET /api/guild/users/me`. `persistClientUiWindowState()` immediately writes unhydrated default preferences into `localStorage["guild.uiWindowState"]`, writes `?project=` into `window.location.search`, and schedules a `PATCH /api/guild/users/me` call—so when auth completes, stale local state overwrites server-saved operator preferences and unauthenticated boot creates phantom `op_<hex>` records on the server.
   - `openOperatorPairingModal()` makes the modal visible (`.is-open`) before `await fetch("/api/guild/users/me")` resolves, then overwrites `bodySlot.innerHTML` when the response arrives, wiping out characters the user already typed and dropping input focus.
   - All four modal `<form>` elements use `onsubmit="return false;"` with `type="button"` controls (and place `.modal-actions` outside `<form>` on `login` and `register`), so pressing `Enter` after typing credentials or machine details does nothing.
   - After `register`, `login`, `logout`, `save-profile`, `pair-machine`, `activate-machine`, or `delete-machine`, `refreshSnapshotAndRender()` leaves stale URL query params (`?project=`, `?sessionId=`) in place (blocking the new operator's or machine's selection), never clears stale `characterWalkers`, `activeSummoningRituals`, `activeHaulRoutes`, `tickerLog`, or `cachedGitStateByRoom`, never invalidates `lastSidePanelSignature` (which omits `operatorId`, `isAuthenticated`, and `totalRooms`), and never re-fits the camera or restarts the headless canvas loop.
2. **Switching Registered `OpenCode Machine Pairings` Requires Navigating Inside the Profile Modal**:
   - `buildTopBarViewModel` collapses all registered **OpenCode Machine Pairings** into a single `#btn-open-pairing-modal` button, forcing the **Guild Operator** through 4 clicks (open modal → navigate tab → click `⚡ Switch to Machine` → close modal) just to switch between already-registered machines.
   - Clicking `#btn-open-account-modal` when already signed in hardcodes opening the `"login"` tab instead of `"profile"`.
3. **Username & Guild Master Alias Lack Privacy-Safe Guidance and Alias Is Ignored by the Header & Ledger**:
   - The registration and profile forms do not prompt the user with privacy-safe guidance (`Choose username: example (do not use actual name)` and `Guild Master alias: example (do not use actual name)`).
   - `TopBarOperatorSummaryInput` and `buildTopBarViewModel` omit `label` (**Guild Master Alias**), so saving a new alias in Profile Settings produces zero visual change in the top header pill or **Guild Master Ledger**.
4. **Server Machine Switching Leaks Prior Machine Rooms & Marks Unreachable Daemons as Connected**:
   - `createHttpOpenCodeDaemonClient` swallows all HTTP/network errors in `fetchJson` and returns `null`/`[]`, so `OperatorWorkspaceRuntime.pairDaemon` never enters its `catch` branch and marks offline tunnels or LAN daemons as `reachable: true` (`🟢 Connected`).
   - `pairDaemon` guards `reducer.reset()` behind `if (Object.keys(stagedSnap.rooms).length > 0)`, so switching from Machine A to an offline or zero-room Machine B leaves Machine A's **Workshop Rooms** and **Guild Adventurers** on screen, while `hydrateFromSnapshot` drops hydrated catalogs and never emits to SSE subscribers.
5. **Triplicated Operator & Preference Schemas Across Server, HUD, and Web**:
   - `GuildOperatorProfile`, `PairedOpenCodeMachine`, and `GuildOperatorPreferences` are defined three separate times (`src/server/operator-store.ts`, `src/hud/hud-tooltip-types.ts`, `src/web/operator-modal-views.ts`), while `clientState` carries duplicate subtab keys (`heroSubtab`/`activeHeroSubtab`, `ledgerSubtab`/`activeLedgerSubtab`) across three competing `PATCH /api/guild/users/me` callers.

## Solution

1. **Canonical Domain Contracts & Single Authenticated Preference Seam (Candidate 4)**:
   - Consolidate `GuildOperatorProfile`, `PairedOpenCodeMachine`, and `GuildOperatorPreferences` into `src/types/domain.ts` and share them across `src/server/`, `src/hud/`, and `src/web/`.
   - Eliminate duplicate subtab fields on `clientState` and gate client preference persistence so `persistClientUiWindowState` only writes to `localStorage`, URL search params, and `PATCH /api/guild/users/me` after `syncOperatorAuthGate()` has completed and only when `clientState.isAuthenticated === true`.
2. **Inline Top-Header Machine Switcher Strip & Guild Master Alias Display (Candidate 2)**:
   - Deepen `buildTopBarViewModel` and `reconcileTopBar` to project an inline `machineTabs` array containing every registered **OpenCode Machine Pairing** (`machineId`, `label`, `statusDot`, `reachable`, `isActive`, `tooltip`).
   - Render registered machines side-by-side in the top header row so a **single click** on any machine pill immediately dispatches `activate-machine` in place and switches the live **Guild Floorplan** and **Project World** tabs without opening the modal; render a compact `+ Pair` button beside the strip (or `🔗 Pair OpenCode` when zero machines are registered) to open the pairing modal.
   - Surface the **Guild Operator**'s `label` (**Guild Master Alias**, falling back to `username`) in `accountPill` and the **Guild Master Ledger**, and make clicking `#btn-open-account-modal` when authenticated open the `"profile"` tab directly.
3. **Deep Client `Guild Operator` Session Module & Privacy-Safe Forms (Candidate 1)**:
   - Update registration and profile form labels and placeholders to `Choose username: example (do not use actual name)` and `Guild Master alias: example (do not use actual name)` (with `placeholder="example (do not use actual name)"`).
   - Support native `<form>` submission (`Enter` key) across all operator and machine forms by placing submit buttons (`type="submit"`) inside their respective `<form data-operator-scope="...">` containers and binding `bodySlot.onsubmit`, while preventing `openOperatorPairingModal()` from overwriting `bodySlot.innerHTML` over active user input.
   - Introduce an atomic `transitionOperatorState()` seam invoked by `register`, `login`, `logout`, `delete-account`, `save-profile`, `pair-machine`, `activate-machine`, and `delete-machine` that updates `cachedProfile`, clears stale URL query params and prior walkers/rituals/haul routes/Git caches, invalidates side-panel and ticker render signatures, reconnects the live SSE stream, re-fits the camera, and triggers an immediate HUD and canvas repaint without a page refresh.
4. **Atomic Server Machine-Switch & Verified Daemon Reachability (Candidate 3)**:
   - Deepen `OperatorWorkspaceRuntime.pairDaemon` and `WorldStateReducer` so switching or pairing an **OpenCode Machine Pairing** verifies actual HTTP reachability against the target daemon (marking unreachable endpoints `reachable: false` with an explicit error message on both the profile and the `pairedMachines` entry), unconditionally clears the previous machine's rooms and characters even when the new machine has `0` rooms or is offline, preserves hydrated catalogs during snapshot replacement, and broadcasts the updated snapshot to all connected SSE clients immediately.
   - Guard `updateOperatorProfile` and `pairOperatorMachine` on the server so unauthenticated requests cannot create phantom operator accounts when `requireAuth` is enabled.

## User Stories

1. As a **Guild Operator** registering or editing my profile, I want the username field labeled `Choose username: example (do not use actual name)` and the alias field labeled `Guild Master alias: example (do not use actual name)` with matching `example (do not use actual name)` placeholders, so that I am clearly guided not to enter my real personal name.
2. As a **Guild Operator**, I want my **Guild Master Alias** (`label`) displayed in the top header account button (`👤 <alias>`) and in the **Guild Master Ledger**, updating immediately when I save my profile.
3. As a signed-in **Guild Operator**, I want clicking the top-bar account button (`#btn-open-account-modal`) to open my `Profile Settings` tab directly rather than the `Login / Switch Account` tab.
4. As a **Guild Operator** with multiple registered **OpenCode Machine Pairings**, I want all of my registered machines shown next to each other in the top header row as clickable pills (`🟢 🖥️ <label>` / `🟠 🖥️ <label>`), so that I can see all my machines at a glance without opening Profile Settings.
5. As a **Guild Operator**, I want a single click on any registered machine pill in the top header row to switch the active **OpenCode Machine Pairing** immediately in place and update the **Project World** tabs and **Guild Floorplan** without opening a modal or refreshing the page.
6. As a **Guild Operator**, I want a compact `+ Pair` button next to the header machine pills (or `🔗 Pair OpenCode` when no machines are paired yet) so I can still open the pairing modal whenever I want to add, inspect, or remove a machine.
7. As a **Guild Operator** typing in the Login, Register, Profile, or Machine Pairing forms, I want pressing `Enter` to submit the active form immediately, and I want opening the modal never to wipe out text I have already started typing.
8. As a **Guild Operator** submitting `Register`, `Login`, `Logout`, `Save Profile`, `Pair Machine`, `Switch Machine`, or `Remove Machine`, I want the entire UI (auth lock gate, top header pills, **Project World** tabs, **Guild Floorplan** canvas, **Spectator Drawer**, and live SSE stream) to update instantaneously in the same frame without needing a browser refresh.
9. As a **Guild Operator** switching from Machine A (which has open **Workshop Rooms**) to Machine B (which is offline or has zero rooms), I want Machine A's rooms and characters cleared immediately and Machine B's true reachability status (`🟠 Offline`) shown honestly in the header and profile.

## Implementation Decisions

1. **Canonical Operator & Preference Contracts (`src/types/domain.ts`)**:
   - Define `PairedOpenCodeMachine`, `GuildOperatorPreferences`, and `GuildOperatorProfile` in `src/types/domain.ts` and re-export/consume them in `src/server/operator-store.ts`, `src/hud/hud-tooltip-types.ts`, `src/web/operator-modal-views.ts`, and `src/web/client-state.ts`.
   - Remove duplicate subtab state fields on `clientState` so `activeDrawerTab`, `activeHeroSubtab`, and `activeLedgerSubtab` have a single source of truth.
2. **Header Machine Switcher View-Model & Reconciler (`src/hud/scene-tooltip-vm.ts`, `src/web/top-bar-reconciler.ts`, `src/web/app.html`)**:
   - Extend `TopBarViewModel` with `machineTabs: readonly TopBarMachineTabViewModel[]` (`machineId`, `label`, `buttonText`, `tooltip`, `isActive`, `reachable`, `status`).
   - In `reconcileTopBar`, render each entry of `vm.machineTabs` side-by-side inside a dedicated header machine switcher container (`#header-machine-strip`) before `#btn-open-pairing-modal`. When `vm.machineTabs.length > 0`, `#btn-open-pairing-modal` renders as a compact `+ Pair` button; when `0` machines exist, it renders as `🔗 Pair OpenCode`.
   - Clicking a machine button in `#header-machine-strip` calls `dispatchOperatorModalAction("activate-machine", { machineId }, onStateChanged)` directly without opening the modal.
   - Update `buildTopBarViewModel` so `accountPill.label` prefers `operatorProfile?.label?.trim() || operatorProfile?.username?.trim()`.
   - Update `#btn-open-account-modal` click handler in `top-bar-reconciler.ts` to open `"profile"` when `clientState.isAuthenticated && getCachedOperatorProfile()?.authenticated !== false`, and `"login"` otherwise.
3. **Instant Client Session Transitions & Form Ergonomics (`src/web/operator-pairing-controller.ts`, `src/web/operator-modal-views.ts`, `src/web/world-persistence.ts`, `src/web/side-panel-reconciler.ts`)**:
   - Add an `authBootCompleted` flag in `clientState` (initially `false`, set to `true` once `syncOperatorAuthGate` completes). While `!clientState.authBootCompleted` or `!clientState.isAuthenticated`, `persistClientUiWindowState` must not overwrite `localStorage["guild.uiWindowState"]`, mutate `window.location.search`, or fire `PATCH /api/guild/users/me`.
   - In `openOperatorPairingModal`, mount the current cached profile immediately on open, and if the background `GET /api/guild/users/me` refresh resolves while an input/textarea inside the modal has focus (`modal.contains(document.activeElement)`), update `cachedProfile` without clobbering `bodySlot.innerHTML`.
   - Place `.modal-actions` inside each `<form data-operator-scope="...">` in `operator-modal-views.ts`, change primary submit buttons to `type="submit"`, and handle `bodySlot.onsubmit` so pressing `Enter` dispatches the scoped action cleanly.
   - Centralize post-action state transition in `transitionOperatorState(options)` inside `operator-pairing-controller.ts`:
     - Clear stale `selectedProjectId`, `selectedRoomId`, `selectedSessionId`, `characterWalkers`, `activeSummoningRituals`, `activeHaulRoutes`, `tickerLog`, and `cachedGitStateByRoom` when switching operators, switching machines, or logging out;
     - Apply incoming `profile.preferences` with `{ searchString: "" }` so previous URL query parameters do not block the newly logged-in operator's preferences;
     - Include `operatorId`, `isAuthenticated`, `operatorLabel`, and `totalRooms` in `side-panel-reconciler.ts` render signatures so the **Spectator Drawer** always re-renders immediately;
     - Re-open the SSE stream (`guild-operator-changed`), re-fit the viewport camera, and trigger `onStateChanged()` + canvas repaint immediately.
4. **Verified Server Daemon Reachability & Atomic World Reset (`src/ingress/daemon-http-client.ts`, `src/server/operator-registry.ts`, `src/state/world-reducer.ts`)**:
   - Add an explicit reachability probe / error propagation on `OpenCodeDaemonClientPort` so `pairDaemon` detects HTTP/network failures instead of treating swallowed `null` responses as `reachable: true`.
   - In `pairDaemon`, always reset the operator's `reducer` (`reducer.reset({ adapter: "opencode-client", daemonUrl: cleanUrl })`) when switching machines, even if `stagedSnap.rooms` is empty or the target daemon is unreachable, and update both `runtime.profile` and the matching `runtime.profile.pairedMachines` entry on failure (`reachable: false`, `errorMessage`).
   - Update `world-reducer.ts` `hydrateFromSnapshot` to preserve/copy `catalog` and notify subscribers so connected SSE clients receive the new snapshot immediately.

## Testing Decisions

- **Primary Seams to Test**:
  1. **Domain & Top-Bar View-Model Seam (`tests/18-top-bar-world-navigation-and-operator-deepening.test.ts`)**: Verify `buildTopBarViewModel` outputs `machineTabs` side-by-side for multiple paired machines, uses `label` (Guild Master Alias) in `accountPill`, and switches `#btn-open-pairing-modal` to `+ Pair` when machines exist.
  2. **Instant Client Operator & Machine Action Seam (`tests/17-mandatory-auth-gate-and-opencode-tunnel-qr-pairing.test.ts` & `tests/18-*.test.ts`)**: Exercise `dispatchOperatorModalAction` for `register`, `login`, `save-profile`, `pair-machine`, `activate-machine`, `delete-machine`, and `logout`, verifying privacy-safe placeholders (`example (do not use actual name)`), native form submit, cleared walkers/selection on switch, and immediate DOM updates without page reload.
  3. **Server Machine-Switch & Reachability Seam (`tests/16-user-auth-station-choreography-and-live-git.test.ts`)**: Verify switching from a populated machine to an empty or unreachable machine clears previous rooms, marks `reachable: false` when the daemon is offline, emits to SSE subscribers, and rejects unauthenticated profile mutations when `requireAuth: true`.
  4. **Architecture Invariants (`tests/00-architecture-invariants.test.ts`)**: Every file under `src/` stays `<= 400` lines.

## Out of Scope

- Changing indoor **Workshop Room** station coordinates or **Dungeon Wilds** combat choreography.
