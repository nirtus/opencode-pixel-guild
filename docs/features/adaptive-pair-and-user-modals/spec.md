# Specification: Viewport-Adaptive Modal Shell & Decoupled Pair / User Modals

## 1. Problem Statement

1. **Cluttered 2-in-1 Modal**: `#operator-pairing-modal` hardcoded `"👤 Guild Operator Account & Profile Settings"`, rendered 4 verbose tabs, duplicated the entire **OpenCode Machine Pairing** workflow inside `Profile`, displayed permanent `"Step 2"` onboarding prose and redundant password inputs, and used `.btn-kill-danger` (`width: 100%`) on Delete Account inside `.modal-actions`.
2. **Tablet Off-Screen Clipping & Keyboard Occlusion**: `.modal-overlay` used unsafe CSS Grid `place-items: center` with unpinned monolithic scrolling on `.modal-dialog` (`max-height: 90dvh`, no `vh` fallback), ignored `--keyboard-inset-height`, drifted horizontally when `pointer-and-camera.ts` constrained `document.body.style.width` under `outerWidth < innerWidth`, and hid `#btn-open-pairing-modal` below `960px` while collapsing modals to `460px`.
3. **Fragmented Modal Lifecycle & Circular Cycles**: Four modals implemented divergent open/close/Escape/backdrop patterns, `pointer-and-camera.ts` hosted Demolition Bomb listeners, and `operator-pairing-controller.ts` (390/400 lines) created 5 circular import cycles by combining low-level operator session headers with high-level modal DOM orchestration.

## 2. Architectural Design & Seams

### 2.1 Leaf `Operator Session Store` Seam (`src/web/operator-session-store.ts`)
- Owns `getSavedOperatorId`, `setSavedOperatorId`, `getOperatorHeaders`, `withOperatorQuery`, `getCachedOperatorProfile`, `setCachedOperatorProfile`, `bumpOperatorProfileMutationEpoch`, `refreshCachedOperatorProfile`, `applyOperatorPreferencesToClientState`, and `syncOperatorPreferences`.
- Depends only on `client-state.ts`, `world-persistence.ts`, and `types/domain.ts`.
- All 8 `src/web/` callers (`app-main.ts`, `top-bar-reconciler.ts`, `side-panel-reconciler.ts`, `commit-ledger-controller.ts`, `command-scroll-controller.ts`, `add-world-folder-controller.ts`, `demolition-modal-controller.ts`, `operator-pairing-controller.ts`) import directly from `operator-session-store.ts` with zero pass-through re-exports.

### 2.2 Deep `Modal Shell` & Viewport Geometry Seam (`src/web/modal-shell.ts`, `src/web/styles-modals.css`, `src/web/pointer-and-camera.ts`)
- `modal-shell.ts` provides one uniform interface for all 4 modals (`registerModal`, `openModal`, `closeModal`, `setModalDismissible`, `hasOpenModal`, `syncViewportGeometryCssVars`):
  - Sets `role="dialog"`, `aria-modal="true"`, uniform `.is-open` visibility (removing competing inline `style.display` toggles), optional `data-modal-size="compact" | "wide"`, backdrop click-to-close (when `dismissible !== false`), prioritized LIFO `Escape` handling, and focus restoration.
  - `pointer-and-camera.ts` checks `hasOpenModal()` before running canvas/drawer `Escape` shortcuts, publishes `--viewport-visible-width`, `--viewport-visible-height`, and `--keyboard-inset-height` on `:root` via `syncViewportGeometryCssVars()`, and sheds all Demolition Bomb modal listeners/re-exports (moved into `initDemolitionModalControls` in `demolition-modal-controller.ts`).
- `styles-modals.css` (linked in `src/web/app.html`):
  - `.modal-overlay` is a fixed flex viewport container clamped to `var(--viewport-visible-width, 100vw)` and `var(--viewport-visible-height, 100dvh)` with `100vh` fallback, safe-area padding, `padding-bottom` absorbing `var(--keyboard-inset-height, 0px)`, and `overscroll-behavior: contain`.
  - `.modal-dialog` uses `margin: auto` (safe centering—top edge never clips above `y = 0`), `display: flex; flex-direction: column; overflow: hidden;`, pinned `.modal-header-row`, scrollable `.modal-body` (`flex: 1 1 auto; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch;`), and pinned `.modal-footer` / `.modal-actions`.
  - Responsive tiers:
    - Desktop & Landscape Tablet (`>= 840px`): wide modals up to `min(780px, 100%)` with 2-column `.operator-pairing-grid`; compact modals up to `min(500px, 100%)`.
    - Portrait Tablet (`600px–839px`): wide modals up to `min(620px, 100%)` stacked cleanly; compact modals up to `min(500px, 100%)`; `#btn-open-pairing-modal` remains visible in `.top-bar`.
    - Compact Mobile Phone (`<= 599px`): full-width viewport-adapted sheet (`max-width: 100%`), `16px` anti-zoom inputs, wrapped modal buttons, `#btn-open-pairing-modal` hidden (accessible via `👤` modal switcher).

### 2.3 Decoupled Pair, User Profile & Auth Gate Views (`src/web/operator-modal-views.ts`, `src/web/operator-pairing-controller.ts`)
- Dynamic modal title helper (`resolveOperatorModalMeta(tab, isAuthLocked)`):
  - `machines`: title `🔗 OpenCode Machine Pairing`, size `"wide"`.
  - `profile`: title `👤 Guild Operator Profile`, size `"compact"`.
  - `login` / `register`: title `🔒 Operator Auth Gate` (when locked) or `🔑 Switch Guild Operator` / `✨ Register Guild Operator`, size `"compact"`.
- Top switcher when authenticated: compact 2-pill bar (`🔗 Machines (N)` / `👤 Profile`); when auth-locked: `🔑 Sign In` / `✨ Register`.
- **Machines (`machines`)**:
  - Panel 1: Paired Machines list (`🟢/🟠/⚪` status rows with public-safe endpoint, `Switch`/`Reconnect` + `Remove`) + one-click `🖥️ Detect Local` button.
  - Panel 2: Add Machine card with segmented mode toggle (`link-qr` default vs. `manual`):
    - `link-qr`: compact pairing link / terminal QR textarea (`#machine-url-input`), optional concise machine label (`#machine-label-input`), `📷 Scan QR` & `🖼️ QR Image` buttons, `#qr-camera-preview-slot`, and primary `🔗 Redeem & Pair` button.
    - `manual`: machine label (`#machine-label-input`), daemon URL (`#machine-url-input`), optional daemon password/token (`#machine-pass-input`), and primary `🔗 Pair Machine` button.
  - Setup hints (`opencode pair --remote`, `opencode pair --url http://<LAN-IP>:4096`): rendered inside `<details class="modal-disclosure" ${machines.length === 0 ? "open" : ""}>` so first-time operators see guidance immediately and paired operators see a clean collapsed summary.
- **Profile (`profile`)**:
  - Compact single-column form: Username (`#profile-username-input`), Guild Master Alias (`#profile-label-input`), collapsed `<details>` Change Password (`#profile-password-input`), clean footer (`🚪 Logout`, compact `Switch` / `Register` tab links, primary `💾 Save Profile`), and collapsed `<details class="modal-danger-zone">` `⚠️ Danger Zone` housing `🗑 Delete Account` (`#btn-delete-operator-profile`).

## 3. Acceptance Criteria

- Zero circular import cycles involving `operator-pairing-controller.ts` or `operator-session-store.ts`.
- Every file under `src/` is `<= 400` lines and `src/web/app.html` is `<= 150` lines.
- All 4 modals use `modal-shell.ts` with `role="dialog"`, `aria-modal="true"`, backdrop click, `Escape` stack, and locked Auth Gate enforcement.
- On tablet viewports (`820×1180` portrait and `1024×768` landscape) and desktop (`1600×1000`), both Pair and User modals stay 100% inside the viewable area with visible pinned header + `✕` close button and primary actions.
- `npm test` passes 100%, Docker container on port `4310` serves the updated UI cleanly, and live container screenshots visually confirm desktop and tablet rendering.
