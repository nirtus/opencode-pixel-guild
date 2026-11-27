Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01, 02

# 03: Decoupled Pair (`OpenCode Machine Pairing`) & User (`Guild Operator` Profile) Modal Views

## Objective
Refactor `src/web/operator-modal-views.ts` and `src/web/operator-pairing-controller.ts` so **OpenCode Machine Pairing** (`machines`), **Guild Operator** Profile (`profile`), and **Operator Auth Gate** (`login`/`register`) render as clean, focused, non-duplicated views with dynamic modal titles, adaptive size classes, segmented `Link / QR` vs. `Manual URL` pairing, and collapsible Change Password / Danger Zone / Pairing Commands disclosures.

## Deliverables
- Add `resolveOperatorModalMeta(tab, isAuthLocked)` and `OperatorPairingMode = "link-qr" | "manual"` in `src/web/operator-modal-views.ts`.
- Remove duplicated Pairing section from `profile`, replace 4-tab bar with compact 2-pill `Machines / Profile` switcher when authenticated, and tuck `Switch Account` / `Register` links + collapsible Password & `⚠️ Danger Zone` cleanly inside `profile`.
- Implement adaptive 2-panel `machines` layout (`>= 840px` 2-col, `< 840px` stacked) with segmented `Link / QR` vs `Manual URL` mode toggle and conditional `<details>` setup commands.
- Wire dynamic modal title, `data-modal-size`, pairing mode switching, and `modal-shell.ts` lifecycle in `operator-pairing-controller.ts`.

## Answer
Refactored `src/web/operator-modal-views.ts` (257 lines) and `src/web/operator-pairing-controller.ts` (379 lines) with `resolveOperatorModalMeta` dynamic titles/sizes (`wide` for `machines`, `compact` for `profile`/`login`/`register`), compact 2-pill `Machines / Profile` navigation, decoupled Profile view with collapsible Change Password & `⚠️ Danger Zone`, and adaptive 2-panel `.operator-pairing-grid` with segmented `📷 Link / QR` vs. `🔧 Manual URL` pairing and conditional `<details>` Pairing Commands.

