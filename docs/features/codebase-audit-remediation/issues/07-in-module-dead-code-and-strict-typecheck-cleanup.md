# 07: In-Module Dead Code Removal, CSS Party Selector Completion & Strict TypeScript Contract Alignment

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 02, 06

**What to build:** Remove all unreferenced functions, unused constants, dead V1 reducer event types, and dead DOM queries inside live modules, add the missing `[data-herald-party="08"]` CSS rules while removing orphaned CSS selectors, and align all TypeScript interfaces so `npx tsc --noEmit` passes with zero errors.

**Blocked by:** 02: Git Diff & Workspace Path Confinement, SQLite WAL Safety & Markdown Link XSS Hardening, 06: Station Slot Self-Collision Fix, Clock-Domain Normalization, DOM Reconcilers & Camera/Bitmap Leak Cleanup

**Status:** resolved

## Acceptance Criteria

- [x] Every modified or created source module remains strictly `<= 400` lines.
- [x] All unreferenced functions, constants, variables, and dead DOM queries inside live modules (`resolveDynamicDetourWaypoints`, `isSettledSameStationCoWorker`, `resolveThinkingPacingSegment`, `resolveThinkingPacingSlot`, `STEERING_AVOIDANCE_RADIUS_PX`, `savePersistedOperators`, `loadPersistedOperators`, `latestTool`, `_fallbackSessions`, dead V1 reducer event types, unused `roomSessions`, `#tui-footer-status`, `[data-mark-viewed-session]`, `lastPinnedSelectedCharacter`, and `activeHaulRoutes`) are removed.
- [x] `[data-herald-party="08"]` styling is added alongside `"01"`..`"10"`, orphaned CSS selectors are removed, and the duplicate initial `.active` class on `#drawer-tab-world` is cleaned up.
- [x] All TypeScript contract mismatches (`CameraTransform`, `buildPixelAtlasComposeInput`, `LocationReconciliationSnapshot`, `CharacterState`, `CapabilityDescriptor`, and `QuestGateOpenedTelemetryEvent`) are aligned so `npx tsc --noEmit` passes with 0 errors.
- [x] Automated tests and `npx tsc --noEmit` pass cleanly, verified on the `opencode-pixel-guild-visualizer` Docker container.

## Answer

1. **In-Module Dead Code Removal (`src/web/`, `src/server/`, `src/ingress/`, `src/state/`, `src/types/`, `src/hud/`)**:
   - Removed `ThinkingPacingTrackSegment`, `resolveThinkingPacingSegment`, and `resolveThinkingPacingSlot` from `src/web/thinking-roam-circuits.ts` and `src/web/walker-separation.ts`.
   - Removed `STEERING_AVOIDANCE_RADIUS_PX`, `isInEastPortalCorridor`, `isSettledSameStationCoWorker`, and `resolveDynamicDetourWaypoints` from `src/web/perimeter-pass-through.ts` and `src/web/walker-separation.ts`, and updated `tests/30-*` and `tests/32-*` to exercise `buildSmoothDetourChicaneArc` directly.
   - Removed legacy file-based `loadPersistedOperators` and `savePersistedOperators` from `src/server/operator-store.ts` and simplified `const savedProfiles = chronicleStore.loadOperators();` in `src/server/operator-registry.ts`.
   - Removed unused `let latestTool` in `src/ingress/daemon-message-hydration.ts`, `_fallbackSessions` and `sessionsWithLifecycle` in `src/ingress/issue-tracker-scanner.ts` and `src/ingress/opencode-client-adapter.ts`, `GitStatusScanResult` in `src/ingress/git-status-scanner.ts` and `src/ingress/git-working-tree.ts`, and unreachable `version === 32 ? 26 :` in `src/ingress/qr-matrix-decoder.ts`.
   - Removed dead V1 reducer event types (`SubagentCompletedTelemetryEvent`, `SkillLoadedTelemetryEvent`, `QuestGateOpenedTelemetryEvent`, `QuestGateResolvedTelemetryEvent`, and `handleSubagentCompleted`) from `src/state/reducer-types.ts`, `src/state/session-handlers.ts`, `src/state/tool-and-gate-handlers.ts`, `src/state/quest-gate-handlers.ts`, and `src/state/world-reducer.ts`.
   - Un-exported the 8 internal union-deriving tuple constants in `src/types/core-types.ts`, removed unused `roomSessions` and `RoomSessionSummaryViewModel` from `src/hud/character-sheet-vm.ts` and `src/hud/hud-character-types.ts`, removed dead `#tui-footer-status` and `[data-mark-viewed-session]` DOM queries from `src/web/top-bar-reconciler.ts` and `src/web/ledger-panel-reconciler.ts`, removed write-only `lastPinnedSelectedCharacter` from `src/web/side-panel-reconciler.ts`, removed `HaulRouteFx` and `activeHaulRoutes` from `src/web/client-state.ts` and `src/web/operator-pairing-controller.ts`, and cleaned up unused imports across `src/web/commit-ledger-controller.ts`, `src/web/demolition-modal-controller.ts`, and `src/web/station-and-workflow-routing.ts`.
2. **CSS Party `08` Completion & Selector Hygiene (`src/web/styles-components.css`, `src/web/styles-responsive.css`, `src/web/app.html`)**:
   - Added `[data-herald-party="08"]` and `.project-mini-assembly-pill[data-herald-party="08"]` rules in `src/web/styles-components.css`.
   - Removed orphaned CSS selectors (`.desel-mobile-label`, `.desel-desktop-label`, `.deck-pagination-bar`, `.deck-page-indicator`, `.ledger-header-bar`, `.ledger-title`, `.ledger-subtitle`, `.ledger-actions`, `.ledger-stats-grid`, `.skill-chip-row`) and removed the duplicate initial `.active` class from `#drawer-tab-world` in `src/web/app.html`.
3. **Strict TypeScript Contract Alignment**:
   - Made `lodTier` and `highDetail` optional on `CameraTransform` (`src/scene/scene-contracts.ts`), aligned `buildPixelAtlasComposeInput` (`src/web/canvas-hero-painter.ts`) with `VisualTraitPalette` and `SkillGrimoireInputItem`, added optional `updatedAtMs` and `isOpenInOpenCode` to `LocationReconciliationSnapshot["sessions"][number]` (`src/types/core-types.ts`), updated `reconcileCharacterRoleArchetype` (`src/types/role-archetypes.ts`) to read `char.recentTools?.[0]?.toolName ?? char.activeCapability?.displayName`, updated `handleSessionMoved` (`src/state/snapshot-builder.ts`) to sync `char.projectId` and `char.projectName` while removing the dead `char.worktreeDirectory` check in `handleRoomDeleted`, and typed `PermissionRequestedTelemetryEvent` / `QuestionAskedTelemetryEvent` in `src/state/reducer-types.ts` and `src/state/quest-gate-handlers.ts`.
