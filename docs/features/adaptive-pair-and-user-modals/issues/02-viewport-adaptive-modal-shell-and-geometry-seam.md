Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01

# 02: Viewport-Adaptive `Modal Shell` Module, `styles-modals.css` & Viewport Geometry Seam

## Objective
Create `src/web/modal-shell.ts` and `src/web/styles-modals.css`, migrate all 4 modals (`#operator-pairing-modal`, `#summon-adventurer-modal`, `#demolition-modal`, `#add-world-folder-modal`) onto the shared seam, publish `:root` visible viewport & keyboard inset variables from `pointer-and-camera.ts`, and evict Demolition Bomb modal bindings out of `pointer-and-camera.ts` into `demolition-modal-controller.ts`.

## Deliverables
- Create `src/web/modal-shell.ts` with `registerModal`, `openModal`, `closeModal`, `setModalDismissible`, `hasOpenModal`, `syncViewportGeometryCssVars`.
- Create `src/web/styles-modals.css` and link it in `src/web/app.html` (`<= 150` lines), moving modal CSS out of `styles-components.css` and adding desktop/tablet/phone tiers, safe `margin: auto` centering, pinned headers/footers, flex-scrollable `.modal-body`, keyboard inset padding, and visible `#btn-open-pairing-modal` on tablets (`>= 600px`).
- Update `app.html` modal shells (`#demolition-modal`, `#summon-adventurer-modal`) with `.modal-body` / `.modal-footer` semantic wrappers while preserving all IDs and `<label class="modal-field-label">`.
- Migrate `demolition-modal-controller.ts`, `summon-adventurer-controller.ts`, `add-world-folder-controller.ts`, `operator-pairing-controller.ts`, `pointer-and-camera.ts`, and `app-main.ts` onto `modal-shell.ts`.

## Answer
Implemented `src/web/modal-shell.ts` (187 lines) and `src/web/styles-modals.css` (372 lines, linked in `src/web/app.html` at 147 lines), migrating all 4 client modals (`#operator-pairing-modal`, `#summon-adventurer-modal`, `#demolition-modal`, `#add-world-folder-modal`) behind one seam with safe flex centering (`margin: auto 0`), pinned `.modal-header-row`/`.modal-footer`, scrollable `.modal-body`, explicit-close-only dismissal with background `Escape` shielding, `:root` visible-viewport & keyboard-inset CSS variables, tablet top-bar Pair visibility (`>= 600px`), and eviction of Demolition Bomb listeners from `pointer-and-camera.ts` into `initDemolitionModalControls`.

