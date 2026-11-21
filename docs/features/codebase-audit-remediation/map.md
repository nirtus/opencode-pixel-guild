# Feature Map: Full Codebase Audit Remediation — Security & WAL Hardening, 30 FPS Frame Pacing & Runtime Fixes, and Legacy Split-Brain Retirement

Label: wayfinder:map

## Destination

Deliver the **Full Codebase Audit Remediation** (`docs/features/codebase-audit-remediation/spec.md`) across three sequential phases partitioned into eight focused vertical-slice tickets:

- **Phase 1 — Server Security, Auth Guard & Data-Safety Hardening**:
  1. [01: Server Auth Enforcement, Registered Room Validation & Request Body Limits](./issues/01-server-auth-and-route-guards.md)
  2. [02: Git Diff & Workspace Path Confinement, SQLite WAL Safety & Markdown Link XSS Hardening](./issues/02-git-path-confinement-sqlite-wal-and-xss-hardening.md)
- **Phase 2 — 30 FPS Frame-Pacing Cap, Runtime Choreography, State Reducer & Resource-Leak Fixes**:
  3. [03: 30 FPS Canvas Frame-Pacing Cap, Camera Gesture Bypass & 60Hz Layout Reflow Elimination](./issues/03-30fps-canvas-pacing-and-reflow-elimination.md)
  4. [04: Daemon Command Failure Gating, Quest Gate Field Isolation, Context Mana & Tool Completion Fixes](./issues/04-state-reducer-command-gates-and-context-mana-fixes.md)
  5. [05: Worktree Goal Assembly Deduplication, Corridor Boundary Routing & Wilderness Bug Targeting Fixes](./issues/05-encounter-corridor-and-worktree-assembly-deduplication.md)
  6. [06: Station Slot Self-Collision Fix, Clock-Domain Normalization, DOM Reconcilers & Camera/Bitmap Leak Cleanup](./issues/06-web-choreography-dom-reconcilers-and-resource-leaks.md)
- **Phase 3 — Legacy Split-Brain Dead-Code Retirement & Symbol-Level Architecture Gate**:
  7. [07: In-Module Dead Code Removal, CSS Party Selector Completion & Strict TypeScript Contract Alignment](./issues/07-in-module-dead-code-and-strict-typecheck-cleanup.md)
  8. [08: Legacy 16x12 Tile-Grid Subsystem Retirement & Symbol-Level Architecture Reachability Gate](./issues/08-retire-legacy-tile-grid-subsystems-and-upgrade-architecture-gate.md)

## Notes

- **Domain**: `Guild Floorplan`, `Operator Auth Gate`, `Guild Chronicle Store`, `Authoritative Live State`, `Toil Queue`, `Stride Cadence`, `Preparation Station`, `Goal Assembly Site`, `Project Mini-Assembly`, `Quest Gate`, `Context Mana`, `Spectator Drawer`, `Assembly Commit Ledger` (`GLOSSARY.md`, `ADR-0001`, & `ADR-0002`).
- **Rules**:
  - Work strictly inside the project root directory (`./`); never create git worktrees or use `/tmp/opencode`.
  - Never delete `./data/`, `./data/guild-chronicle.sqlite*`, or `./data/guild-operators.json`.
  - Keep every source file strictly `<= 400` lines (`tests/00-architecture-invariants.test.ts`).
  - After every ticket, update project documentation (`README.md`, `GLOSSARY.md`, and `docs/adr/` as applicable), deploy to the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`), run `npm test`, and capture visual proof in `docs/images/`.
- **Skills to consult**: `codebase-design`, `domain-modeling`, `tdd`, `systematic-debugging`, `verification-before-completion`.

## Decisions so far

<!-- the index: one line per closed ticket, enough to judge relevance, then zoom the link for the detail the ticket holds -->

- [01: Server Auth Enforcement, Registered Room Validation & Request Body Limits](./issues/01-server-auth-and-route-guards.md) — Enforced `401` auth guards across `/api/guild/git` and protected `/api/guild/*` routes when locked, restricted Git operations to registered snapshot rooms (`404`/`400`), prevented passwordless operator takeover on register/login while preserving `401`/`409`/`413` status codes, and capped `readJsonBody` at `1 MB`.
- [02: Git Diff & Workspace Path Confinement, SQLite WAL Safety & Markdown Link XSS Hardening](./issues/02-git-path-confinement-sqlite-wal-and-xss-hardening.md) — Confined `getFileDiff` to repository-internal paths (excluding `..`, `.git/`, `data/`, and leading-dash flags), confined `GET /api/guild/workspace-folders?parent=` to allowed workspace directories with accurate subfolder `hostPath` and blocked `/src/server/*` static serving, validated safe Git refs in `syncRepository`, removed `-wal`/`-shm` deletion from `createGuildChronicleStore` startup recovery, and hardened `escapeHtml`, `formatInlineMarkdown`, and ledger attribute interpolations against XSS.
- [03: 30 FPS Canvas Frame-Pacing Cap, Camera Gesture Bypass & 60Hz Layout Reflow Elimination](./issues/03-30fps-canvas-pacing-and-reflow-elimination.md) — Gated normal `renderCanvasFrame` choreography and painting to `30 FPS` (`>= 31ms` delta) with deduplicated `scheduleNextCanvasFrame()` scheduling and instant bypass on `cameraGestureActive` or headless screenshot capture, moved `syncViewportCameraFit` DOM mutations after the signature check with cached layout measurements, eliminated idle **Break Lounge** `startSlotTransition` and action sequence churn, and memoized `resolveActiveGoalAssemblyAndLayout()` and `?vw=` query parsing.
- [04: Daemon Command Failure Gating, Quest Gate Field Isolation, Context Mana & Tool Completion Fixes](./issues/04-state-reducer-command-gates-and-context-mana-fixes.md) — Gated optimistic reducer mutations on daemon command success for `scroll.send`, `agent.switch`, `turn.interrupt`, and `gate.resolve`, isolated **Quest Gate** fields across distinct gate IDs while preserving structured field keys, deduplicating `Yes`/`No` recommended options, and clearing per-session resolved question reasons on new user turns, fixed Turn 2+ **Context Mana** component token recomputation and model-switch `limitTokens` updates, and fixed parallel tool completion, snapshot `roomAllPlugins` + worktree tribute hydration, and reconnect `BlockedAtQuestGate` recovery.
- [05: Worktree Goal Assembly Deduplication, Corridor Boundary Routing & Wilderness Bug Targeting Fixes](./issues/05-encounter-corridor-and-worktree-assembly-deduplication.md) — Deduplicated **Goal Assembly Site** and **Project Mini-Assembly** deliverables by `${projectId}::${kind}::${title}` across primary and Git worktree rooms before mapping to **Assembly Parts**, closed the `fromX === 760` portal boundary routing hole and checked indoor corridor graph edges against both `GOAL_ASSEMBLY_OBSTACLE_BOX` and `RESOURCE_STOCKPILE_OBSTACLE_BOX`, and prevented cross-project **Quest Gate** bug leaks when `visibleChars` is empty while preserving sticky **Bug Monster** species identities and excluding exploration agents from combat.
- [06: Station Slot Self-Collision Fix, Clock-Domain Normalization, DOM Reconcilers & Camera/Bitmap Leak Cleanup](./issues/06-web-choreography-dom-reconcilers-and-resource-leaks.md) — Normalized `:tool:`-suffixed session IDs to `baseSessionId` in `allocateStationPerimeterSlot` with `"south"` facing fallbacks, normalized `requestAnimationFrame` monotonic timestamps and Unix epoch timestamps in **Armory Wardrobe** dwell checks and **Toil Queue** ordering, updated Hero `◀`/`▶` navigation buttons on the `#sheet-header-slot` fast path, isolated **Assembly Commit Ledger** file diffs and debounced commit drafts by `roomId`, re-anchored 2-to-1 finger pinch-to-pan camera state in `stepPointerUp`, and guarded QR camera streams and `ImageBitmap` decoding against hardware/GPU leaks.
- [07: In-Module Dead Code Removal, CSS Party Selector Completion & Strict TypeScript Contract Alignment](./issues/07-in-module-dead-code-and-strict-typecheck-cleanup.md) — Removed unreferenced functions, constants, variables, V1 reducer event types, and dead DOM queries across live modules (`resolveDynamicDetourWaypoints`, `resolveThinkingPacingSegment`, `resolveThinkingPacingSlot`, `STEERING_AVOIDANCE_RADIUS_PX`, `loadPersistedOperators`, `savePersistedOperators`, `latestTool`, `_fallbackSessions`, `roomSessions`, `#tui-footer-status`, `[data-mark-viewed-session]`, `lastPinnedSelectedCharacter`, `activeHaulRoutes`), added `[data-herald-party="08"]` styling while removing orphaned CSS rules and duplicate `#drawer-tab-world.active`, and aligned TypeScript contracts (`CameraTransform`, `buildPixelAtlasComposeInput`, `LocationReconciliationSnapshot`, `reconcileCharacterRoleArchetype`, `handleSessionMoved`, `handleRoomDeleted`, and `handleQuestGateOpened`) for zero-error `tsc --noEmit` verification.
- [08: Legacy 16x12 Tile-Grid Subsystem Retirement & Symbol-Level Architecture Reachability Gate](./issues/08-retire-legacy-tile-grid-subsystems-and-upgrade-architecture-gate.md) — Retired 22 disconnected 16×12 tile-grid scene, painter, spatial, fog-of-war, station-sprite, and unused ingress adapter modules from `src/`, moved `in-memory-git-working-tree.ts` to `tests/`, pruned dead exports from retained `scene`, `spatial`, `encounter`, `sprites`, and `hud` modules, upgraded `tests/00-architecture-invariants.test.ts` to enforce symbol-level production reachability across barrels, removed side-effectful `rmSync` calls from `verifyRepositoryPublicHygiene`, and eliminated cross-test `clientState` coupling.

## Not yet specified

<!-- in-scope fog you can't ticket yet; graduates as the frontier advances -->

- None — all eight audit remediation slices (`01` through `08`) are specified and resolved.

## Out of scope

- Replacing the wire-compatible `x-guild-operator-id` / `guild_operator_id` operator header and cookie transport with an external OAuth/JWT identity provider.
- Changing the visual design of the 2D `800×720` **Workshop Room** or `800×720` **Dungeon Wilds** dual-chamber art assets.
