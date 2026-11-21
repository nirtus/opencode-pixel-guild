# 02: Inline Top-Header Machine Switcher Strip & Guild Master Alias Display

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01

**What to build:** Deepen `buildTopBarViewModel` and `reconcileTopBar` so all registered **OpenCode Machine Pairings** render side-by-side in the top header row for single-click instant switching without opening Profile Settings, while displaying the **Guild Operator**'s **Guild Master Alias** (`label`) in the header account pill and **Guild Master Ledger** and routing signed-in account clicks directly to the `profile` tab.

- [x] Extend `TopBarViewModel` in `src/hud/hud-tooltip-types.ts` and `buildTopBarViewModel` in `src/hud/scene-tooltip-vm.ts` with `machineTabs` (one entry per registered **OpenCode Machine Pairing** with `machineId`, `label`, `buttonText`, `tooltip`, `isActive`, `reachable`, and `status`) and update `accountPill` to display `operatorProfile.label` (falling back to `username`).
- [x] Update `src/web/app.html`, `src/web/styles.css`, and `src/web/top-bar-reconciler.ts` to render `#header-machine-strip` with side-by-side clickable machine pills where a single click dispatches `activate-machine` in place without opening the modal, accompanied by a compact `+ Pair` button (or `🔗 Pair OpenCode` when zero machines are paired) to open the pairing modal.
- [x] Update `#btn-open-account-modal` in `src/web/top-bar-reconciler.ts` so clicking it while signed in opens the `"profile"` tab directly instead of `"login"`, and display the **Guild Master Alias** in the **Guild Master Ledger** header (`src/web/ledger-panel-reconciler.ts`).
- [x] Add unit tests in `tests/18-top-bar-world-navigation-and-operator-deepening.test.ts` verifying side-by-side `machineTabs` projection, 1-click machine activation from the top bar, `+ Pair` button labeling, and **Guild Master Alias** rendering in `accountPill`, keeping all source files `<= 400` lines.

## Answer

Extended `TopBarViewModel` and `buildTopBarViewModel` with `machineTabs` and `pairActionLabel`, added `#header-machine-strip` in `src/web/app.html` and `src/web/top-bar-reconciler.ts` for 1-click inline machine switching, displayed the **Guild Master Alias** (`label`) in `accountPill` and the **Guild Master Ledger**, and routed signed-in `#btn-open-account-modal` clicks directly to the `"profile"` tab.
