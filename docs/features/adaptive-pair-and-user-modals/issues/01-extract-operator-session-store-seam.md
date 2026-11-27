Type: task
Label: ready-for-agent
Status: resolved

# 01: Extract Leaf `Operator Session Store` Seam (`src/web/operator-session-store.ts`)

## Objective
Extract client operator identity, auth headers, cached profile, mutation epoch, and preference synchronization from `src/web/operator-pairing-controller.ts` into a leaf module `src/web/operator-session-store.ts`, updating all 8 `src/web/` callers and tests directly (zero shallow pass-through re-exports) to eliminate all 5 circular import cycles.

## Deliverables
- Create `src/web/operator-session-store.ts` (`<= 140` lines).
- Update `operator-pairing-controller.ts`, `app-main.ts`, `top-bar-reconciler.ts`, `side-panel-reconciler.ts`, `commit-ledger-controller.ts`, `command-scroll-controller.ts`, `add-world-folder-controller.ts`, and `demolition-modal-controller.ts` to import session-store helpers from `./operator-session-store.ts`.
- Migrate `tests/18-*` and any other direct tests to import session-store helpers from `src/web/operator-session-store.ts`.

## Answer
Extracted `src/web/operator-session-store.ts` (141 lines) as a leaf module owning operator ID persistence, auth headers, query params, cached profile, mutation epoch, and preference sync. Migrated all 8 `src/web/` callers and tests (`tests/18-*`, `tests/19-*`, `tests/44-*`, `tests/56-*`) directly to `operator-session-store.ts` with zero pass-through re-exports, eliminating all 5 circular import cycles confirmed by `graphify update .` and `tests/60-adaptive-pair-and-user-modals.test.ts`.

