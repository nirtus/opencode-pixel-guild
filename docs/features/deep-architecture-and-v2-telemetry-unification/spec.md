# Feature Specification: Deep Architecture Unification, Toil-Queue Choreography & OpenCode V2 Live Telemetry

Label: ready-for-agent

## Problem Statement

Spectators using the **OpenCode Pixel Guild Visualizer** to watch live OpenCode V2 coding sessions experience several visual, behavioral, and performance issues caused by architectural fragmentation:

1. **Tested Behavior Diverges from Live Browser Rendering**: The repository contains two separate scene and choreography engines—one exercised exclusively by headless unit tests (modeling a legacy `16×12` tile room) and another running in the browser (`1600×720` dual-chamber **Workshop Room** and **Dungeon Wilds**). Improvements and tests written against the scene engine never appear in the browser, while browser painters mutate state during `requestAnimationFrame`, hardcode the **Goal Assembly Site** to at most 5 **Assembly Part**s, and leave station hover tooltips and the **Demolition Bomb** modal unwired.
2. **Broken Character Choreography & Conflicting Status Labels**: **Workflow Intent** and **Overhead Action Label**s are computed by three competing classifiers that produce contradictory labels between the canvas and the HUD panels. **Preparation Station** names are split across four vocabularies where `read` and `edit` collide on the same workstation, causing editing characters at the **Crafting Workbench** to teleport to the **Library Study Bookshelf** when entering a **Quest Gate**. Furthermore, characters walk in straight Euclidean lines right through the central **Goal Assembly Site**, get permanently stuck at the **Armory Wardrobe** because the equip flag is never cleared during active work, and **Squad Subagent**s vanish before they can walk back to their parent **Guild Adventurer** to deliver their **Report Scroll**.
3. **2.5-Second Polling Lag, OpenCode V2 Schema Mismatches & Split Worktree Rooms**: Instead of subscribing to OpenCode V2's live event stream, the ingress adapter polls ~70+ HTTP endpoints every 2.5 seconds and triggers 16+ full state clones and SSE broadcasts per sweep. Mismatches with OpenCode V2's wire schema drop permission actions and target resources on **Quest Gate**s, miss completed tool output needed to trigger **Bug Monster** encounters, and split a project's Git `Worktree`s into separate rooms instead of placing all collaborators inside the canonical project's single unified **Workshop Room**.
4. **Redundant 60fps Canvas Redraws & Unchecked Browser Types**: The browser redraws hundreds of static floorboards, book spines, `shadowBlur` fixtures, and wilderness tiles every frame without offscreen layer caching, drops custom squad colors and off-hand **Skill Grimoire**s in `Pixel Atlas` mode due to mismatched property names, and lacks a compile-time TypeScript check to catch invalid lifecycle state strings and dead modules.

## Solution

Unify the visualizer behind four deep architectural seams:

1. **A Single Choreography & Toil Queue Engine**: Consolidate **Workflow Intent** classification, **Overhead Action Label** derivation, and **Preparation Station** routing into one module that compiles domain transitions into a deterministic per-character FIFO **Toil Queue**. Characters navigate via a perimeter ring-corridor around the central **Goal Assembly Site**, dwell for a self-expiring `1.4s` equip gesture at the **Armory Wardrobe**, pick up visible **Resource Cargo** at the **Resource Stockpile**, perform station-specific gestures at their target **Preparation Station**, fit **Assembly Part**s onto the **Goal Assembly Site**, venture into the **Dungeon Wilds** during **Debugging Hunt** turns, and visibly carry **Report Scroll**s back to their parent **Guild Adventurer** upon **Squad Subagent** completion.
2. **A Single `1600×720` Dual-Chamber Scene Frame Seam**: Promote the `1600×720` dual-chamber layout (`800×720` **Workshop Room** + `800×720` **Dungeon Wilds**) into the canonical **Scene Frame** producer shared by both the live browser `Canvas2D` paint adapter and the automated `HeadlessInspector` test adapter. Move all particle and timer mutations into a pure pre-render step, scale **Goal Assembly Site** sockets dynamically for any number of feature tasks, and wire unified hit-testing for station/monster/part hover tooltips and **Demolition Bomb** room teardown.
3. **Real-Time OpenCode V2 Event Ingress & Single-Room Project Consolidation**: Subscribe to OpenCode V2's live SSE event stream for sub-50ms updates while batching background reconciliation sweeps into a single atomic snapshot emission. Align all telemetry normalizers with OpenCode V2's schemas (permissions, forms, completed tool content, compaction, and archival), preserve `?` **Quest Gate**s for both structured forms/`question` tools and conversational `❓`/`?` assistant questions, and consolidate all workspaces and Git `Worktree`s of a canonical project into its single unified **Workshop Room**.
4. **Multi-Layer OffscreenCanvas Caching, Pure HUD View-Models & Compile-Time Invariants**: Cache static **Workshop Room** architecture, static **Dungeon Wilds** biome terrain, and composed 16×16 pixel sprites onto offscreen canvases (`drawImage`), drive the **Character Sheet** and **Guild Master Ledger** purely from shared HUD view-models, delete dead legacy slices and shallow pass-through shims, and enforce `<= 400` lines per file, zero dead modules, and clean TypeScript compilation across the entire repository.

## User Stories

1. As a spectator, I want all sessions across a canonical project's root workspace and all of its Git worktrees to appear inside that project's single unified **Workshop Room**, so that I can watch the entire project squad collaborate in one place without switching between fragmented worktree rooms.
2. As a spectator, I want telemetry updates from OpenCode V2 (tool starts, tool completions, permission requests, compactions, and session idle transitions) to stream live over SSE with sub-50ms latency, so that character actions on the **Guild Floorplan** react immediately to live coding activity.
3. As a spectator, I want background location reconciliation sweeps to emit a single atomic world snapshot rather than 16+ redundant broadcasts, so that the browser UI and SSE stream remain smooth and free of jitter.
4. As a spectator, I want a **Guild Adventurer** or **Squad Subagent** switching tool categories to walk along the perimeter corridor to the **Armory Wardrobe**, perform a 1.4-second equipping gesture, and automatically proceed to their target **Preparation Station**, so that characters never remain permanently stuck at the **Armory Wardrobe**.
5. As a spectator, I want characters executing MCP or plugin-backed tools to walk to the **Resource Stockpile**, pick up the matching **Resource Cargo** (Stone Block, Iron Bar, Timber Planks, Arcane Crystal, or Scroll Bundle), and visibly carry it in their hands to the target **Preparation Station**, so that external resource dependencies are physically legible.
6. As a spectator, I want characters walking between perimeter **Preparation Station**s, the **Break Lounge**, and the East Wilderness Portal to follow a perimeter ring-corridor around the central **Goal Assembly Site**, so that characters never walk straight through the middle of the construction platform or furniture.
7. As a spectator, I want `read` tool executions to route characters to the **Library Study Bookshelf** and `edit`/`write`/`apply_patch` tool executions to route characters to the **Crafting Workbench** under distinct station identifiers, so that an editing character never teleports to the library when their active tool clears or blocks at a **Quest Gate**.
8. As a spectator, I want every character's **Workflow Intent** (`Feature Build`, `Debugging Hunt`, or `Information Gathering`) and 1–3 word **Overhead Action Label** to be computed by a single canonical classifier, so that the floating pill above the character sprite, the **Character Sheet**, and the **Guild Master Ledger** always display the exact same status text.
9. As a spectator, I want a **Guild Adventurer** or **Squad Subagent** blocked on a `Permission.Request` in OpenCode V2 to display a pulsing `!` **Quest Gate** marker along with the actual permission action and target resource names in the HUD, so that I know exactly which permission is awaiting approval.
10. As a spectator, I want a character whose session is waiting on either a structured OpenCode V2 form / `question` tool or a conversational assistant question (`❓` grilling prompts or a turn ending with `?`) to remain standing attentively at their last active **Preparation Station** (or the **Arcane Lectern** by default) with a bobbing `?` **Quest Gate** over their head instead of walking to the **Break Lounge**, so that I immediately spot sessions waiting for my answer.
11. As a spectator, I want a character waiting at a `?` **Quest Gate** to immediately clear the `?` marker and resume work as soon as I reply or a new tool execution begins, and to walk to the **Break Lounge** when a turn finishes normally without asking a question, so that resting vs waiting states are always accurate.
12. As a spectator, I want completed tool output from OpenCode V2's `state.content` array to be inspected for test and command failures, so that real test failures reliably spawn and mutate named **Bug Monster**s in the **Dungeon Wilds**.
13. As a spectator, I want a character in a **Debugging Hunt** turn to equip warrior gear at the **Armory Wardrobe**, exit through the East Wilderness Portal into the **Dungeon Wilds**, cast an expanding **Lantern Flare** on diagnostic searches (`grep`, `glob`, `read`) to part the **Fog of War**, and engage the discovered **Bug Monster** in melee combat during fix and test turns until vanquished into victory loot crystals upon test pass.
14. As a spectator, I want the central **Goal Assembly Site** to dynamically lay out and render sockets for all tasks in the active feature (`totalTasks`, even when a feature has 6, 8, or 12 tickets), rendering unresolved tasks as dim blueprints and resolved tasks as vibrant fitted **Assembly Part**s with a golden snap burst when a character hauls a finished part to the platform.
15. As a spectator, I want a **Squad Subagent** whose child session completes (`ReportingScroll`) to visibly walk from its workstation back to its parent **Guild Adventurer** carrying a **Report Scroll** and trigger a celebratory handoff burst upon arrival before resting or despawning, so that subagent delegation and completion are clearly told on screen.
16. As a spectator, I want a character performing context compaction (`Session.Message.Compaction`) to execute an in-place **Compaction Exhalation** vapor breath that refills their **Context Mana** bar at their current position without walking to a deprecated `Altar of Compaction`, so that compaction matches the domain model.
17. As a spectator, I want hovering over any **Preparation Station**, **Bug Monster**, **Assembly Part**, or character on the canvas to display a rich **Scene Object Tooltip**, so that I can inspect fixtures and encounters in place.
18. As a spectator, I want clicking the **Demolition Bomb** fixture inside a **Workshop Room** to open a confirmation modal that tears down the room's OpenCode V2 resources when confirmed, so that I can clean up obsolete project locations from the visualizer.
19. As a spectator, I want switching the visual style toggle to `Pixel Atlas` to render each character using their custom squad palette, animated lifecycle pose, and off-hand **Skill Grimoire** tome from the 16×16 pixel compositor, so that both `Cartoon` and `Pixel Atlas` modes have full visual fidelity.
20. As a spectator, I want static **Workshop Room** architecture, static **Dungeon Wilds** biome terrain, and composed 16×16 pixel sprites to be cached on offscreen canvases and blitted via `drawImage`, so that the 60fps render loop stays fast and lightweight on CPU and memory.
21. As a developer or AI agent maintaining this repository, I want the live browser canvas and the headless unit test suite to consume the exact same **Scene Frame** producer and **Scene Paint Adapter** seam, so that every visual behavior verified in automated tests is guaranteed to render in the live browser.
22. As a developer or AI agent maintaining this repository, I want `npm test` to enforce that every file under `src/` is `<= 400` lines, that no dead or unreachable modules exist, and that TypeScript typechecking (`tsc --noEmit`) passes across both server and browser modules, so that broken property names and dead code can never accumulate again.

## Implementation Decisions

### 1. Canonical Workflow Intent, Station Taxonomy & Toil Queue Engine
- **Single Workflow & Overhead Label Classifier**: One pure classifier function determines a character's `WorkflowIntent` (`"feature-build" | "debugging-hunt" | "information-gathering"`) and 1–3 word `overheadLabel` from their lifecycle state, active **Quest Gate**, active tool category, recent failure history, and session title. All other slices (state reducer, scene frame builder, **Character Sheet** view-model, and **Guild Master Ledger** view-model) consume this single classifier rather than re-deriving labels locally.
- **Disambiguated Preparation Station Catalog**: Every OpenCode capability maps to a single canonical **Preparation Station** identifier with distinct `1600×720` room coordinates and seat offsets:
  - `read` / `list` $\rightarrow$ `Library Study Bookshelf` (`Library`)
  - `grep` / `glob` / `websearch` / `webfetch` $\rightarrow$ `Observatory Spyglass` (`Spyglass`)
  - `edit` / `write` / `apply_patch` $\rightarrow$ `Crafting Workbench` (`Tinker`)
  - `bash` / `shell` / `terminal` $\rightarrow$ `Anvil Forge` (`Forge`)
  - `skill` $\rightarrow$ `Arcane Lectern` (`Enchanter`)
  - `subagent` / `task` $\rightarrow$ in-place `Summoning Ritual` (`Alchemy` / summoner tile)
  - MCP / external plugin tool $\rightarrow$ `Resource Stockpile` pickup (`Stockpile`) followed by target **Preparation Station**
  - Equipment transition $\rightarrow$ `Armory Wardrobe` (`Armory`)
  - Idle (not waiting on user input) $\rightarrow$ `Break Lounge` (`Lounge`)
- **Deterministic Per-Character FIFO Toil Queue**:
  ```ts
  // Decision-encoding state machine shape for character choreography
  export type CharacterToil =
    | { kind: "walk-corridor"; waypoints: ReadonlyArray<{ x: number; y: number }>; speedPxPerSec: number; label: string }
    | { kind: "dwell-station"; station: CanonicalStationId; durationMs: number; elapsedMs: number; gesture: StationGestureKind; label: string }
    | { kind: "pickup-cargo"; cargo: ResourceCargoKind; durationMs: number; elapsedMs: number; label: string }
    | { kind: "fit-assembly-part"; partIndex: number; durationMs: number; elapsedMs: number; label: string }
    | { kind: "cast-lantern-flare"; targetX: number; targetY: number; radiusPx: number; durationMs: number; elapsedMs: number; label: string }
    | { kind: "melee-strike-monster"; monsterId: string; durationMs: number; elapsedMs: number; label: string }
    | { kind: "deliver-report-scroll"; parentCharacterId: string; durationMs: number; elapsedMs: number; label: string };
  ```
- **Ring-Corridor Obstacle Avoidance**: Indoor walks between perimeter stations or to/from the East Wilderness Portal `(774, 352)` route along a perimeter ring-corridor around the central **Goal Assembly Site** (`x: 280..500, y: 250..430`) so characters never cut across the construction platform.
- **Self-Expiring Armory Dwell**: Switching tool categories pushes a `walk-corridor` toil to the **Armory Wardrobe** followed by a `1400ms` `dwell-station` toil; when `elapsedMs >= durationMs`, the toil pops from the queue and clears `equippingAtArmory`, preventing permanent station locks.
- **Report Scroll Handoff**: When a **Squad Subagent** transitions to `ReportingScroll`, its queue pushes a `walk-corridor` toil to the parent **Guild Adventurer**'s coordinates carrying a `Report Scroll` followed by `deliver-report-scroll` (`450ms` handoff burst) before the subagent transitions to `RestingInLounge` or despawns.

### 2. Unified `1600×720` Scene Frame Seam & Stateless Painters
- **Three-Phase Render Loop**:
  1. `stepChoreography(choreographyStore, snapshot, dtMs, timestampMs)`: Advances walker positions along toil waypoints, expires completed toils, spawns one-shot particle bursts (`snapParticles`, `lanternFlares`, `victoryLootCrystals`, `summoningRituals`) on snapshot version/state transitions, and updates camera damping.
  2. `buildGuildSceneFrame(snapshot, choreographyStore, viewOptions)`: Pure function returning an immutable `GuildSceneFrame` containing the active **Project World**'s unified `800×720` **Workshop Room**, `800×720` **Dungeon Wilds**, dynamic $N$-socket **Goal Assembly Site**, **Bug Monster**s, **Lantern Flare**s, interpolated characters, projected pathlines, particles, and priority-sorted `sceneHitboxes`.
  3. `paintSceneFrame(frame, paintAdapter, timestampMs)`: Stateless consumer that invokes the `ScenePaintAdapter` (`Canvas2D` in browser, `HeadlessInspector` in tests) without mutating any state.
- **Interactive Hit-Testing**: Pointer hover and click events query `hitTestSceneFrame(frame, worldX, worldY)` to select characters, display **Scene Object Tooltip**s (`buildSceneObjectTooltip`) over stations, monsters, and assembly parts, and trigger the **Demolition Bomb** modal.

### 3. OpenCode V2 Live SSE Ingress & Single-Room Project Consolidation
- **Live SSE Subscription + Slow Atomic Sweep**: The HTTP daemon client subscribes to `GET /api/event` and maps live OpenCode V2 events into `TelemetryEvent` dispatches. Background reconciliation sweeps run at a slower interval (e.g., 15 seconds) and dispatch a single `dispatchBatch(events)` transaction on `WorldStateReducer`, emitting at most one `GuildSnapshot` clone per sweep.
- **OpenCode V2 Wire Contract Normalization**:
  - `Permission.Request`: Maps `action`, `resources`, and `message` into structured **Quest Gate** titles and reasons.
  - `Form.Info` & Conversational Questions: Merges structured `/api/form` prompts (`fields`) with hydrated running `question` tools and conversational assistant questions (`❓` blocks or trailing `?` on the latest assistant message) so any session waiting on user input enters `BlockedAtQuestGate` (`marker: "?"`) at its last active **Preparation Station** (or **Arcane Lectern**).
  - `ToolState.Completed`: Reads `part.state.content` (`text` and `file` items) when extracting tool output previews so test and shell failure details are preserved for **Bug Monster** derivation.
  - `Session.Message.Compaction` & `time.archived`: Detects compaction from transcript compaction messages (`status: "running" | "completed" | "failed"`) and archival from `time.archived`.
- **Single Workshop Room per Canonical Project World**: All discovered locations, sandboxes, and Git `Worktree`s (`GET /api/worktree?projectID=...` and `proj.sandboxes`) belonging to a canonical OpenCode `Project` normalize to that project's canonical **Workshop Room** (`roomId = normalizeLocationDirectory(proj.canonical)`), placing all root and worktree sessions in the same room.

### 4. Offscreen Layer Caching, Pure HUD View-Models & Architecture Gate
- **Three Offscreen Caches**: Static room architecture (`cachedRoomCanvas`), static biome terrain (`cachedWildsTerrainCanvas`), and composed 16×16 pixel sprites (`cachedSpriteBitmaps`) are rendered to reusable offscreen canvases and blitted via `drawImage`.
- **Pure HUD Reconcilers**: Browser sidebar and ledger reconcilers render exclusively from `buildCharacterSheetViewModel` and `buildGuildMasterLedgerViewModel`.
- **Contraction & Invariant Gate**: Dead legacy choreography/rig files and 1-line pass-through shims are deleted, and the architecture invariant test suite enforces `<= 400` lines per file, 100% module reachability from the server/web entrypoints, and clean `tsc --noEmit` typechecking.

## Testing Decisions

### Primary Test Seams (4 Seams Total)
1. **Ingress Normalization & Batch Reducer Seam (`Ingress -> WorldStateReducer -> GuildSnapshot`)**:
   - Feed OpenCode V2 SSE events (`GET /api/event` payloads) and V2 REST payloads (`Permission.Request` with `action`/`resources`, `Form.Info` with `fields`, `ToolState.Completed` with `state.content`, `Session.Message.Compaction`, conversational `❓`/`?` turns, and multi-worktree project sessions) into the ingress adapter and assert on the emitted `GuildSnapshot` (verifying 1 snapshot emission per batch sweep, single unified **Workshop Room** per project, accurate **Quest Gate**s, and **Bug Monster** failure counts).
2. **Choreography & Scene Frame Seam (`stepChoreography + buildGuildSceneFrame -> paintSceneFrame(HeadlessInspector)`)**:
   - Advance the **Toil Queue** across multi-step transitions (tool switch $\rightarrow$ `1.4s` **Armory Wardrobe** dwell $\rightarrow$ **Resource Stockpile** pickup $\rightarrow$ ring-corridor walk $\rightarrow$ **Preparation Station** gesture $\rightarrow$ $N$-socket **Goal Assembly Site** fitting; **Debugging Hunt** portal exit $\rightarrow$ **Lantern Flare** $\rightarrow$ **Bug Monster** combat; **Squad Subagent** `ReportingScroll` walk to parent) and assert on the resulting `GuildSceneFrame` and `HeadlessInspector` recorded draw calls and `hitTestSceneFrame` targets.
3. **Spectator HUD View-Model Seam (`GuildSnapshot + GuildSceneFrame -> HUD View-Models`)**:
   - Assert that `buildCharacterSheetViewModel`, `buildGuildMasterLedgerViewModel`, and `buildSceneObjectTooltip` produce identical **Workflow Intent** and **Overhead Action Label** strings as the canvas frame, full **Equipment Loadout** and **Skill Grimoire** lists, and accurate room/threat summaries.
4. **Architecture & Typecheck Invariant Seam (`tests/00-architecture-invariants.test.ts`)**:
   - Assert that every file under `src/` is `<= 400` lines, no dead/unreachable modules or pass-through shims exist, and `tsc --noEmit` succeeds with zero errors across `src/**/*.ts`.

### Prior Art in the Codebase
- `tests/00-architecture-invariants.test.ts` (file size and reducer batching invariants)
- `tests/06-guild-scene-and-painter.test.ts` & `tests/08-task-telemetry-and-encounter-engine.test.ts` (headless scene frame inspection)
- `tests/09-choreography-and-project-isolation.test.ts` (choreography and project world isolation assertions)
- `tests/10-waiting-for-user-input-state.test.ts` (tool and conversational question **Quest Gate** assertions)

## Out of Scope

- Deleting any files, design sketches, or historical reviews inside `docs/`.
- Rendering separate annex rooms for Git `Worktree`s (all workspaces and worktrees of a canonical project share its single unified **Workshop Room**).
- Interactive answering of OpenCode permissions or questions from inside the read-only spectator web UI.
- WebGL or 3D rendering pipelines.

## Further Notes

- Every UI or visual slice must be verified not only by automated tests at the **Scene Frame** seam, but also by capturing a live headless Chrome screenshot (`http://127.0.0.1:4310/`) saved to `docs/images/<task-name>.png` and visually inspecting it with the `read` tool.
