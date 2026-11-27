# Wayfinder Map: Viewport-Adaptive Modal Shell & Decoupled Pair / User Modals

## Destination

Refactor the Pair (**OpenCode Machine Pairing**), User (**Guild Operator** Profile), and **Operator Auth Gate** modal architecture across `src/web/` so that:
1. All 4 client modals (`#operator-pairing-modal`, `#summon-adventurer-modal`, `#demolition-modal`, `#add-world-folder-modal`) run behind one deep **Modal Shell** (`src/web/modal-shell.ts`) and dedicated modal stylesheet (`src/web/styles-modals.css`) that guarantee safe viewport containment (zero off-screen top/bottom clipping, zero `outerWidth` horizontal drift, pinned headers/footers, scrollable body, virtual-keyboard inset awareness, and explicit desktop/tablet/phone tiers).
2. **OpenCode Machine Pairing** (`machines`), **Guild Operator** Profile (`profile`), and **Operator Auth Gate** (`login`/`register`) render as focused, de-cluttered views with dynamic modal titles, segmented `Link / QR` vs. `Manual URL` pairing, collapsible password & Danger Zone disclosures, and tablet top-bar Pair access (`>= 600px`).
3. A leaf **Operator Session Store** module (`src/web/operator-session-store.ts`) owns operator ID persistence, auth headers, cached profile, and preference sync with zero shallow pass-through re-exports—breaking all 5 circular import cycles around `operator-pairing-controller.ts`.
4. **Demolition Bomb** modal listeners move out of `pointer-and-camera.ts` into `demolition-modal-controller.ts`, and `:root` viewport-geometry CSS variables (`--viewport-visible-width`, `--viewport-visible-height`, `--keyboard-inset-height`) unify canvas and modal sizing.

## Notes

- Architecture Review Report: `./docs/architecture-review/architecture-review-20261126-pair-and-user-modals.html`
- Specification: `./docs/features/adaptive-pair-and-user-modals/spec.md`
- Strict `<= 400`-line ceiling applies to every file under `src/`, and `<= 150` lines for `src/web/app.html` (`tests/00-architecture-invariants.test.ts`).

## Decisions so far

- **Q1 (Window Structure)**: Keep one shared `#operator-pairing-modal` host behind `Modal Shell` with dynamic header titles (`🔗 OpenCode Machine Pairing` / `👤 Guild Operator Profile` / `🔒 Operator Auth Gate`), a compact 2-pill `Machines / Profile` switcher when signed in, zero duplicated Pairing DOM in Profile, and `Switch Account` / `Register` links inside Profile.
- **Q2 (Pairing Flow)**: Adaptive 2-panel `Machines` view (`>= 840px` 2-column, `< 840px` stacked) combining compact Paired Machines list + `🖥️ Detect Local` with a segmented `Link / QR` vs. `Manual URL` Add Machine card and collapsible setup hints (`open` when `0` machines paired, collapsed `<details>` once paired).
- **Q3 (Profile Flow)**: Compact single-column (`max-width: 500px`) Profile card with Username + Guild Master Alias, collapsible `<details>` Change Password, clean Logout / Switch / Save Profile actions, and collapsed `<details>` `⚠️ Danger Zone` for Delete Account.
- **Q4 (Responsive & Tablet Tiers)**: Dedicated `src/web/styles-modals.css` with safe-centered flex overlay (`margin: auto`), pinned header/footer, flex-scrollable body, `:root` visible viewport & keyboard inset variables, explicit wide (`780px` / `620px`) vs. compact (`500px`) vs. phone (`<= 599px`) tiers, and visible `#btn-open-pairing-modal` on tablets (`>= 600px`).
- **Q5 (Unified Modal Shell)**: Migrate all 4 modals onto `src/web/modal-shell.ts` (`role="dialog"`, `aria-modal="true"`, `.is-open`, backdrop dismiss, prioritized `Escape` stack, `dismissible: false` for locked Auth Gate) and evict Demolition Bomb listeners from `pointer-and-camera.ts`.
- **Q6 (Operator Session Store)**: Extract `src/web/operator-session-store.ts` and update all 8 `src/web/` callers and tests directly with zero shallow pass-through re-exports.
- **ADR-0005**: Recorded viewport-adaptive **Modal Shell**, decoupled Pair & User modals, and acyclic **Operator Session Store** decision (`../../adr/0005-viewport-adaptive-modal-shell-and-decoupled-operator-modals.md`).
- **Ticket 01 Resolved**: Extracted leaf `src/web/operator-session-store.ts` and broke all 5 circular import cycles (`./issues/01-extract-operator-session-store-seam.md`).
- **Ticket 02 Resolved**: Created `src/web/modal-shell.ts` + `src/web/styles-modals.css`, migrated all 4 modals onto the unified seam, published `:root` viewport-geometry CSS vars, and moved Demolition Bomb bindings out of `pointer-and-camera.ts` (`./issues/02-viewport-adaptive-modal-shell-and-geometry-seam.md`).
- **Ticket 03 Resolved**: Decoupled Pair (`machines`), User (`profile`), and Auth Gate (`login`/`register`) views with dynamic titles, segmented `Link / QR` vs. `Manual URL` pairing, and progressive disclosures (`./issues/03-decoupled-pair-and-user-modal-views.md`).
- **Ticket 04 Resolved**: Passed `440/440` automated tests, updated docs/ADR/graphify, deployed to Docker container (`4310`), and verified desktop + tablet portrait/landscape live screenshots (`./issues/04-tests-docs-container-visual-proof.md`).

## Not-yet-specified

None — all 6 grilling decisions settled.

## Out-of-scope

- Changing server-side `/api/guild/auth/*` or `/api/guild/users/me/*` HTTP contracts.
