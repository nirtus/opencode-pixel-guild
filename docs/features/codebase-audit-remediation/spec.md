# Specification: Full Codebase Audit Remediation — Security & WAL Hardening, 30 FPS Frame Pacing & Runtime Fixes, and Legacy Split-Brain Retirement

Label: ready-for-agent

## Problem Statement

When a **Guild Operator** runs and interacts with the OpenCode Pixel Guild Visualizer across live **OpenCode Machine Pairing** connections, multiple repositories, and Git worktrees, five systemic problems undermine security, data safety, 2D canvas performance, state accuracy, and long-term maintainability:

1. **Operator Auth Gate Bypass, Path Traversal & SQLite WAL Hazards**:
   - When the **Operator Auth Gate** is locked, unauthenticated callers can still reach the Git working-tree endpoint, workspace-folder browser, and command/room endpoints. Because the Git route falls back to raw caller-supplied directory paths when the room map is empty and reads untracked files without path-confinement validation, an unauthenticated request can read arbitrary files or list arbitrary directories on the host or container.
   - Remote Git synchronization interpolates branch and remote names into fallback shell commands without validating that they are safe Git ref identifiers, and the HTTP JSON body reader buffers request streams without a size cap.
   - Registering or logging into an existing **Guild Operator** profile that lacks a password hash allows an unauthenticated caller to set a password and claim the account, while route error handlers flatten authentication (`401`) and conflict (`409`) status codes into generic `400` responses.
   - If the **Guild Chronicle Store** encounters a momentary SQLite lock on startup, its error recovery deletes active `-wal` and `-shm` journal files, risking uncheckpointed data loss.
   - Inline chat markdown link formatting escapes HTML entities before matching link URLs, allowing quote entities inside URLs to break out of the anchor attribute, and HTML escaping omits single-quote characters.

2. **Uncapped 60–144Hz Canvas Redraws, Synchronous Layout Reflows & Idle Break Lounge Churn**:
   - The **Guild Floorplan** canvas loop runs uncapped at the display's native refresh rate (60Hz to 144Hz), even though non-walking **Guild Character** sprites only step through 6 discrete animation buckets per second and walking sprites step through 12 distance-driven **Stride Cadence** buckets.
   - On every animation frame, the camera viewport synchronizer reads multiple DOM bounding rectangles and unconditionally writes button text, classes, and attributes before checking whether the camera signature changed—forcing synchronous browser layout reflows on every tick.
   - Every character resting in the **Break Lounge** re-triggers a slot transition on every animation frame while completely stationary, churning action counters and slot allocation checks at 60Hz.
   - **Goal Assembly Site** layout derivation and URL viewport parameter parsing are recomputed multiple times per frame without memoization.

3. **Authoritative Live State, Quest Gate, Context Mana & Encounter Inaccuracies**:
   - When a **Command Scroll**, mode switch, turn interrupt, or **Quest Gate** resolution fails on the OpenCode daemon, the companion server still applies optimistic state mutations to the reducer—dismissing a **Quest Gate** in the UI while the OpenCode session remains blocked on the daemon.
   - Opening a new **Quest Gate** merges fields from the character's previous gate before clearing it when the gate identifier changes, contaminating a single-question prompt with stale multi-question fields from an earlier turn, while resolved question suppression permanently blacklists repeated question text for the remainder of the session.
   - **Context Mana** stops updating active token consumption after the first turn whenever usage events omit an explicit pre-summed token total, and fails to update the model context limit when switching between non-default models.
   - Completing a tool without a prior running record drops tool input classification and **Resource Cargo**, and completing one tool while sibling tools are still executing prematurely transitions the character to `Thinking`.
   - When a project has active Git worktrees, the **Goal Assembly Site** and **Project Mini-Assembly** duplicate **Assembly Parts** across the primary repository and worktree rooms even though the deliverables list deduplicates them.
   - Characters standing at the exact `x = 760` wilderness portal boundary bypass indoor corridor routing and walk straight through the **Goal Assembly Site** and **Resource Stockpile** obstacles, while **Dungeon Wilds** bug targeting can leak another project's **Quest Gate** into an empty project's wilderness or morph a surviving **Bug Monster**'s species when an earlier monster is defeated.

4. **Station Slot Self-Collision, Clock-Domain Mixing, DOM Reconciler Stale State & Hardware Resource Leaks**:
   - When a character claims a **Preparation Station** perimeter slot and enqueues tool execution records in the same frame, the slot allocator keys session claims with the `:tool:` suffix rather than the base session identifier, causing the character to collide with its own slot claim and reserve multiple perimeter slots.
   - Client choreography mixes browser `requestAnimationFrame` monotonic timestamps with Unix epoch timestamps when evaluating **Armory Wardrobe** dwell windows and sorting the **Toil Queue**.
   - Closing the **OpenCode Machine Pairing** modal or re-clicking camera scan while the browser's camera permission prompt is pending leaves the hardware camera stream active and runs a detached frame loop in the background, and QR image decoding never closes allocated `ImageBitmap` objects.
   - Spawning a second character while viewing the first character's **Character Sheet** updates the `1/2` counter in the header fast path without enabling the `◀` / `▶` navigation buttons.
   - Typing a commit message in the **Assembly Commit Ledger** and switching projects within the debounce window overwrites the newly selected project's commit draft, and previewing files with identical relative paths across different projects serves stale cached diffs.
   - Lifting one finger after a two-finger pinch gesture on the **Guild Floorplan** fails to re-anchor the remaining finger's pan origin, jumping the camera on the next pointer move.

5. **Split-Brain 16×12 Tile-Grid Dead Code & Unchecked TypeScript Contracts**:
   - Over 4,700 lines of legacy 16×12 tile-grid scene builders, painters, BFS pathfinders, hauling routes, telemetry beams, station slot calculators, fog-of-war grids, and unused ingress adapters remain in the repository with zero runtime callers in either the companion server or the live dual-chamber browser application—hidden from the architecture reachability guard because barrel files re-export everything via `export *`.
   - Dead functions, unused event types, missing **Project Heraldry** party `08` CSS rules, and mismatched TypeScript interfaces persist inside live modules because tests execute via `--experimental-strip-types` without a strict `tsc --noEmit` verification gate.

## Solution

Deliver a three-phase remediation across the companion server, ingress adapters, world state reducer, encounter and spatial engines, live web client, and automated architecture guard:

1. **Phase 1 — Server Security, Auth Guard & Data-Safety Hardening**:
   - Enforce the **Operator Auth Gate** across all Git, command, room, session, and workspace-folder endpoints; require all Git operations to resolve to a registered room in the active snapshot; confine untracked file diffs and workspace folder browsing to validated workspace directories; validate Git branch and remote identifiers before remote shell execution; cap HTTP JSON request bodies at `1 MB`; preserve SQLite `-wal` and `-shm` files on startup; and harden HTML and markdown link escaping.

2. **Phase 2 — 30 FPS Frame-Pacing Cap, Runtime Choreography, State Reducer & Resource-Leak Fixes**:
   - Pace the live **Guild Floorplan** canvas loop at **30 FPS** (`~33.3ms` frame budget) to cut redundant 60–144Hz canvas rendering by 50–75% while immediately bypassing the throttle during active user camera pan, pinch, or wheel-zoom gestures; move DOM mutations in camera fitting behind the signature guard; memoize **Goal Assembly Site** layout derivation; and stop idle **Break Lounge** characters from re-triggering slot transitions on every frame.
   - Gate optimistic reducer mutations on daemon command success; isolate **Quest Gate** fields across distinct gate IDs and allow repeat questions in new turns; fix **Context Mana** multi-turn token updates and model-switch limits; deduplicate **Goal Assembly Site** and **Project Mini-Assembly** parts across Git worktrees; fix `x = 760` corridor routing and **Resource Stockpile** obstacle avoidance; fix **Dungeon Wilds** project scoping and sticky **Bug Monster** identities; normalize station slot session keys and choreography clock domains; and close the QR camera stream, `ImageBitmap`, Hero `◀`/`▶` nav, commit draft/diff, and pinch-to-pan bugs.

3. **Phase 3 — Legacy Split-Brain Dead-Code Retirement & Symbol-Level Architecture Gate**:
   - Remove all dead functions, unused types, and orphaned CSS rules inside live modules; align all TypeScript interfaces so `tsc --noEmit` passes with zero errors; retire the disconnected 16×12 tile-grid scene, spatial, encounter, station-sprite, and ingress modules; and upgrade the automated architecture guard to enforce symbol-level production reachability from the server and web entrypoints.

## User Stories

1. As a **Guild Operator**, I want unauthenticated requests to Git, command, room, session, and workspace-folder APIs to be rejected with `401 Unauthorized` whenever the **Operator Auth Gate** is locked, so that no guest or external script can inspect or mutate my repositories or sessions.
2. As a **Guild Operator**, I want Git status, diff, staging, and commit endpoints to operate strictly on registered **Workshop Room** directories in my active snapshot, so that arbitrary filesystem paths cannot be queried via `?roomId=`.
3. As a **Guild Operator**, I want untracked file diff previews to be strictly confined to files inside the selected project repository (excluding `.git/` and companion `data/` stores), so that path traversal sequences (`../`) can never read sensitive host or operator files.
4. As a **Guild Operator**, I want the `+` **World Folder Registration** browser to only enumerate directories inside the allowed workspace root and compute accurate host paths when navigating subfolders, so that arbitrary system directories are never exposed.
5. As a **Guild Operator**, I want `Sync Git` in the **Assembly Commit Ledger** to validate branch and remote names against safe Git ref rules before invoking any fallback daemon shell command, so that crafted branch or remote names can never execute arbitrary shell commands.
6. As a **Guild Operator**, I want oversized HTTP POST payloads (`> 1 MB`) to be rejected immediately with `413 Payload Too Large`, so that a malformed or malicious request cannot exhaust companion server memory.
7. As a **Guild Operator**, I want existing registered operator accounts to be protected against passwordless overwrite on registration or login and for `401` / `409` status codes to be returned accurately, so that my account cannot be hijacked and the UI displays truthful error states.
8. As a **Guild Operator**, I want the **Guild Chronicle Store** to never delete `-wal` or `-shm` SQLite journal files if startup encounters a transient lock, so that my persisted world state and **Lifetime Tribute** ledger are never corrupted.
9. As a **Guild Operator**, I want chat markdown links and HUD attributes to reject quote breakout payloads and escape single and double quotes, so that assistant or user transcripts can never inject attributes or scripts into the **Character Sheet** or **Guild Master Ledger**.
10. As a **Guild Operator** running the visualizer on a 60Hz, 120Hz, or 144Hz display, I want the **Guild Floorplan** canvas simulation to run at a steady **30 FPS** cadence by default, so that CPU and GPU usage drop by 50–75% without any change to character walking speed, **Stride Cadence**, or 6-bucket/12-bucket sprite fidelity.
11. As a **Guild Operator** panning, pinching, or wheel-zooming the **Guild Floorplan** canvas, I want active camera gestures to bypass the 30 FPS throttle and render immediately at pointer rate, so that camera movement feels locked to my cursor or fingers with zero lag.
12. As a **Guild Operator**, I want the camera viewport synchronizer to skip DOM writes and bounding-rect measurements when the viewport signature has not changed, so that the browser never performs forced synchronous layout reflows during steady-state rendering.
13. As a **Guild Operator**, I want idle **Guild Adventurers** resting in the **Break Lounge** to remain quietly settled without re-running slot transitions on every animation frame, so that action sequence counters and slot allocators do not churn while my sessions are idle.
14. As a **Guild Operator** resolving a **Quest Gate**, sending a **Command Scroll**, switching an **OpenCode Agent Mode**, or interrupting a turn, I want the companion server to only mutate **Authoritative Live State** when the OpenCode daemon accepts the command, so that a failed daemon request never hides an active **Quest Gate** or shows a false state transition.
15. As a **Guild Operator** answering multi-turn questions in the **Character Sheet**, I want each new **Quest Gate** with a new gate identifier to start with a clean field list and for new turns to allow legitimate repeat questions, so that questions from Round 1 never bleed into Round 2 and repeated confirmations are never silently suppressed.
16. As a **Guild Operator** monitoring **Context Mana** across multi-turn sessions and model switches, I want the mana bar to update its token usage on every turn (even when the daemon emits component token counts without a pre-summed total) and immediately reflect the new model's context limit when I switch models.
17. As a **Guild Operator** watching a **Guild Character** execute parallel tools, I want the character to remain in `WorkingAtStation` until all running tools complete and for fallback tool completion records to preserve their input preview and **Resource Cargo**.
18. As a **Guild Operator** working in a project that uses Git worktrees, I want the **Goal Assembly Site** and **Project Mini-Assembly** to deduplicate **Assembly Parts** across the primary repository and its worktrees just like the **Guild Results Showcase** deliverables list, so that part counts never double.
19. As a **Guild Operator**, I want characters returning from the **Dungeon Wilds** portal (`x = 760`) or walking between northern stations to always follow obstacle-safe corridor waypoints around both the **Goal Assembly Site** and the north-wall **Resource Stockpile**, so that characters never walk through furniture.
20. As a **Guild Operator** inspecting a project with zero active characters in the **Dungeon Wilds**, I want **Bug Monsters** to be scoped strictly to the selected project and to retain their monster species when another bug is defeated, so that other projects' gates never leak into the wilderness and monsters never morph mid-battle.
21. As a **Guild Operator**, I want a **Guild Character** executing multiple tools at the same **Preparation Station** to reuse its own claimed perimeter slot rather than colliding with its own `:tool:` slot claim, so that co-workers are not displaced and the character does not oscillate between slots.
22. As a **Guild Operator**, I want **Armory Wardrobe** dwell timers and **Toil Queue** ordering to normalize monotonic animation timestamps and Unix epoch timestamps into a single consistent clock domain, so that characters never get stuck in the Armory or sort actions out of chronological order.
23. As a **Guild Operator** scanning a pairing QR code with my camera or uploading a QR image, I want closing the modal during the camera permission prompt to immediately stop the hardware camera stream and for decoded image bitmaps to release their GPU memory immediately.
24. As a **Guild Operator** viewing the **Character Sheet** when only one character exists (`1/1`), I want the `◀` and `▶` hero navigation buttons to automatically enable as soon as a second character is summoned (`1/2`), so that I can cycle between heroes without closing and reopening the panel.
25. As a **Guild Operator** switching between projects in the **Assembly Commit Ledger**, I want commit message drafts and file diff caches to be isolated per repository room, so that typing a commit draft and switching rooms within 350ms never overwrites another repository's draft or shows the wrong repository's file diff.
26. As a **Guild Operator** pinching to zoom the **Guild Floorplan** on a touchscreen and lifting one finger, I want the remaining finger to continue panning smoothly from its current position without teleporting the camera.
27. As a maintainer of the codebase, I want all disconnected 16×12 tile-grid legacy modules and in-module dead code removed, `[data-herald-party="08"]` styled consistently, `tsc --noEmit` passing with zero type errors, and the architecture invariant suite verifying symbol-level reachability from the live server and web entrypoints.

## Implementation Decisions

### 1. Server Authentication, Path Confinement & SQLite WAL Safety (Phase 1)
- **Route-Level Auth Guard**:
  - Both the Git route handler and the general API route handler must inspect `ctx.authenticated` before processing requests. When `ctx.authenticated === false`, all routes except the read-only bootstrap snapshot (`GET /api/guild/snapshot`), SSE stream (`GET /api/guild/events`), and public auth/operator bootstrap routes must immediately return `401 Unauthorized`.
- **Registered Room Lookup & Path Confinement**:
  - Room resolution for Git operations must match an existing room in the operator's active snapshot (`snapshot.rooms`) or known rooms list; arbitrary unvalidated filesystem paths passed via query or body parameters must return `null` (`404`).
  - Untracked file diff fallback must resolve the candidate file path against the repository root (`resolve(repoRoot, filePath)`) and verify that it begins with `repoRoot + sep` and does not traverse into `.git/` or companion data directories.
  - Workspace folder discovery must verify that any requested `?parent=` directory resolves inside the configured workspace root and must compute each entry's `hostPath` relative to the actual scanned parent directory.
- **Safe Remote Git Ref Validation & Request Body Cap**:
  - Remote and branch names passed to fallback remote Git shell commands must match `/^[A-Za-z0-9._/-]+$/` and must not begin with `-`.
  - The JSON body reader must track accumulated byte length and abort with HTTP `413` if the payload exceeds `1_048_576` bytes (`1 MB`).
- **SQLite WAL Preservation & XSS Sanitization**:
  - Remove all `rmSync` calls targeting `-wal` and `-shm` files from the SQLite store initialization path.
  - Escape single quotes (`'` -> `&#39;`) in `escapeHtml` and restrict inline markdown link URL matching so quotes (`"`, `'`, `&quot;`, `&#39;`) and angle brackets cannot appear inside the `href` URL capture group.

### 2. 30 FPS Frame Pacing, Reflow Elimination & Runtime Accuracy (Phase 2)
- **30 FPS Canvas Pacing with Active Camera-Gesture Bypass**:
  - Gate the browser `requestAnimationFrame` callback in the main web loop to a `30 FPS` target (`FRAME_INTERVAL_MS = 1000 / 30`, skipping frame execution when `< 31ms` has elapsed since the previous rendered frame) unless `clientState.cameraGestureActive` is `true` (active pointer pan, pinch, or wheel zoom) or headless Chrome fast-forward mode is active.
  - Track the active `requestAnimationFrame` handle so re-initializing the backend connection or switching operators never spawns concurrent frame loops.
- **Zero-Reflow Viewport Camera Sync & Idle Lounge Stability**:
  - In the viewport camera synchronizer, move all DOM button text, class, and attribute mutations after the signature early-return check, and cache layout container measurements across frames until invalidated by window resize, split-resizer drag, or explicit `force = true`.
  - Memoize active **Goal Assembly Site** showcase and platform layout derivation by `(snapshot.version, selectedProjectId, isAllWorldsFocused, selectedRoomId)`.
  - In client choreography, only invoke `startSlotTransition` for a character resting in the **Break Lounge** when the target station, overhead label, or target coordinates (`> 3px`) differ from the walker's current `resolvedSlot`.
- **State Reducer, Quest Gate, Context Mana & Encounter Fixes**:
  - In the server command router, check `if (daemonRes && !daemonRes.ok)` before applying optimistic reducer events for `scroll.send`, `agent.switch`, `turn.interrupt`, and `gate.resolve`.
  - In **Quest Gate** handlers, clear `char.questGate` whenever an incoming gate's `effectiveGateId` differs from `char.questGate.gateId` prior to merging fields, stop blacklisting generic `question:${sessionId}` keys on resolution, and clear per-session resolved question text sets when a new user prompt starts a new turn.
  - In **Context Mana** calculation, recompute `usedTokens` from component token counts (`inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens`) whenever `tokens` is provided without an explicit `usedTokens` field (on every turn, not only when `usedTokens === 0`), and always update `limitTokens` to the resolved model limit when the model changes.
  - In tool completion handling, pass `input: rawInputPreview` to capability classification, keep the character in `WorkingAtStation` if another tool in `recentTools` is still `running`, and record resolved **Quest Gates** when a `question` tool completes.
  - In **Goal Assembly Site** and **Project Mini-Assembly** derivation, deduplicate deliverables across primary and worktree rooms by `${projectId}::${kind}::${title}` *before* mapping deliverables to **Assembly Parts**.
  - In indoor corridor routing, include `fromX === 760` in the wilderness-to-indoor portal transition branch and test segments against both `GOAL_ASSEMBLY_OBSTACLE_BOX` and `RESOURCE_STOCKPILE_OBSTACLE_BOX`.
  - In **Dungeon Wilds** bug derivation, filter quest gates strictly by the scoped project's sessions even when `visibleIds.size === 0`, assign sticky lair indices before selecting monster species, and exclude exploration agent classes in `isCharacterInCombatStation`.
- **Web Choreography, DOM Reconcilers & Resource Leak Fixes**:
  - Normalize `baseSessionId = sessionId.split(":tool:")[0]` at the top of `allocateStationPerimeterSlot` before checking or recording `SessionSlot` claims, and replace invalid `"down"` facing fallbacks with `"south"`.
  - Normalize `requestAnimationFrame` timestamps to Unix epoch milliseconds before comparing against `stateEnteredAtMs` or stamping queued `ResolvedCharacterSlot` items.
  - Guard `startQrCameraStream` with a monotonic scan generation counter so streams resolving after `stopActiveQrCameraStream()` stop all media tracks immediately, and close `ImageBitmap` instances in a `finally` block inside `decodeQrFromImageBlob`.
  - Update `disabled`, `data-select-hero-session`, and `title` on `button[data-hero-nav="prev"|"next"]` inside the `#sheet-header-slot` fast path.
  - Scope `cachedDiffByFile` by `${roomId}::${path}` and capture `roomId` at input time for debounced commit draft updates.
  - Re-anchor `primaryStartX`, `primaryStartY`, `startPanX`, `startPanY`, and `startZoom` when transitioning from 2 pointers to 1 pointer in `stepPointerUp`.

### 3. Legacy Split-Brain Retirement & Symbol-Level Architecture Gate (Phase 3)
- **In-Module Dead Code Removal & Strict `tsc --noEmit` Alignment**:
  - Remove all unreferenced functions, constants, event types, and DOM queries inside live modules, add `[data-herald-party="08"]` CSS rules, remove orphaned CSS selectors, and align all TypeScript interfaces so `npx tsc --noEmit` succeeds with zero errors.
- **Retire Disconnected 16×12 Tile-Grid Subsystems & Upgrade Architecture Gate**:
  - Delete the disconnected 16×12 tile-grid scene frame builders, painters, walker stepper, tile-grid hauling/beams/station-slots, fog-of-war grid, station pixel matrices, and unused ingress adapters (`plugin-adapter`, `demo-simulator-adapter`, `ingress-hub`), keeping only the live camera, hit-testing, heraldry, and world-focus exports.
  - Upgrade `tests/00-architecture-invariants.test.ts` to trace symbol-level imports from `src/server/main.ts` and `src/web/app-main.ts` (rather than treating `export *` barrels as blanket file reachability) and enforce `tsc --noEmit` compliance.

## Testing Decisions

### What Makes a Good Test
- Tests must exercise **external behavior at module seams** (HTTP routes, reducer state transitions, pure view-model/encounter outputs, choreography step outputs, and DOM reconciler state) rather than asserting raw source-code substrings with `readFileSync` + `.includes()`.
- Tests must be deterministic, self-contained (resetting shared client state before/after each test), and free of side-effectful filesystem deletions inside assertion helpers.

### Primary Seams Under Test
1. **Companion HTTP Server Seam (`createGuildCompanionServer`)**:
   - Exercises Phase 1 auth enforcement (`401` when locked across `/api/guild/git`, `/api/guild/command`, `/api/guild/room`, `/api/guild/workspace-folders`), registered room validation, path traversal rejection in `GET /api/guild/git?file=...` and `?parent=...`, `413` body size limits, and Phase 2 daemon command failure gating (`scroll.send`, `gate.resolve`, `agent.switch`, `turn.interrupt`).
2. **World State Reducer & Encounter Seam (`createWorldStateReducer`, `deriveGuildAssemblyShowcase`, `deriveProjectMiniAssemblies`, `computeRingCorridorWaypoints`)**:
   - Exercises **Quest Gate** field isolation across distinct gate IDs, repeat conversational question reopening across turns, Turn 2+ **Context Mana** updates, model-switch context limits, parallel tool completion, worktree **Assembly Part** deduplication, and `fromX === 760` + **Resource Stockpile** obstacle routing.
3. **Live Web Choreography, Frame Loop & Reconciler Seam (`stepClientChoreography`, `allocateStationPerimeterSlot`, `syncViewportCameraFit`, `reconcileSidePanel`, `commit-ledger-controller`, `canvas-gesture-controller`, `qr-barcode-scanner`)**:
   - Exercises the 30 FPS frame-pacing gate and camera-gesture bypass, zero-reflow `syncViewportCameraFit` on unchanged signatures, zero `startSlotTransition` churn for resting **Break Lounge** characters, `baseSessionId` station slot reuse across `:tool:` claims, clock-domain normalization, Hero `◀`/`▶` fast-path enablement, room-scoped commit diffs/drafts, 2-to-1 finger pinch pan re-anchoring, and camera `MediaStream` / `ImageBitmap` cleanup.
4. **Architecture & Type-Safety Invariant Seam (`tests/00-architecture-invariants.test.ts` + `tsc --noEmit`)**:
   - Enforces the `<= 400` line ceiling across all `src/**` files, zero TypeScript compiler errors, and symbol-level production reachability from `src/server/main.ts` and `src/web/app-main.ts`.

### Prior Art in the Codebase
- Server & Auth Gate integration tests: `tests/17-mandatory-auth-gate-and-opencode-tunnel-qr-pairing.test.ts`, `tests/26-assembly-commit-ledger-deepening.test.ts`, `tests/44-gamemaster-ui-responsiveness-and-flicker.test.ts`.
- Reducer, Quest Gate & Context Mana tests: `tests/22-character-lifecycle-and-v2-parity.test.ts`, `tests/38-robust-question-rendering-and-selection.test.ts`, `tests/43-persistent-token-cost-ledger.test.ts`.
- Choreography, Corridor & Perimeter tests: `tests/32-smooth-rounded-pathing-choreography.test.ts`, `tests/36-pass-through-perimeter-collision-and-grace-period.test.ts`.
- Architecture guard tests: `tests/00-architecture-invariants.test.ts`.

## Out of Scope

- Replacing the wire-compatible `x-guild-operator-id` / `guild_operator_id` operator header and cookie protocol with an external OAuth or third-party identity provider.
- Redesigning the visual artwork or station layouts of the dual-chamber `800×720` **Workshop Room** and `800×720` **Dungeon Wilds**.

## Further Notes

- Every slice must be deployed to and visually verified on the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`) with headless Chrome screenshot verification in `docs/images/` before marking the ticket resolved.
