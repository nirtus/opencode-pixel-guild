# 01: Unify Workflow Intent, Preparation Station Taxonomy & Toil-Queue Choreography

Type: task
Label: ready-for-agent
Status: resolved

**What to build:** Consolidate **Workflow Intent** classification (`Feature Build`, `Debugging Hunt`, `Information Gathering`), 1–3 word **Overhead Action Label** derivation, and **Preparation Station** routing into a single canonical choreography engine that drives every **Guild Adventurer** and **Squad Subagent** through a deterministic FIFO **Toil Queue** along perimeter ring-corridor waypoints around the central **Goal Assembly Site**.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] A single canonical classifier computes **Workflow Intent** and **Overhead Action Label** identically across the world state reducer, 2D canvas, **Character Sheet**, and **Guild Master Ledger**.
- [x] Every OpenCode tool category maps to a disambiguated **Preparation Station** (`read` to **Library Study Bookshelf** vs `edit`/`write`/`apply_patch` to **Crafting Workbench**), preventing editing characters from teleporting to the library when entering a **Quest Gate**.
- [x] Switching tool categories enqueues a perimeter ring-corridor walk to the **Armory Wardrobe** followed by a self-expiring `1.4s` equipping dwell toil that automatically clears `equippingAtArmory` and advances to the target **Preparation Station** (or **Resource Stockpile** when picking up **Resource Cargo**).
- [x] Characters walking between perimeter stations, the **Break Lounge**, and the East Wilderness Portal follow ring-corridor waypoints around the central **Goal Assembly Site** instead of cutting straight across the platform.
- [x] **Compaction Exhalation** executes strictly in place without routing characters to a deprecated `Altar of Compaction`.
- [x] Completed **Squad Subagent**s in `ReportingScroll` walk to their parent **Guild Adventurer** carrying a visible **Report Scroll** and trigger a handoff burst before transitioning to `RestingInLounge` or despawning.
- [x] Automated unit tests verify multi-step **Toil Queue** progression, ring-corridor obstacle avoidance, self-expiring **Armory Wardrobe** dwell, and **Report Scroll** handoff.

## Answer

- **Canonical Workflow & Overhead Label Authority (`src/encounter/workflow-classifier.ts`)**: Consolidated `classifyCharacterWorkflowIntent`, `deriveOverheadActionLabel`, and `resolveCanonicalPreparationStation` into `src/encounter/workflow-classifier.ts`, with `src/state/armory-and-workflow.ts`, `src/capability/classifier.ts`, `src/hud/character-sheet-vm.ts`, and `src/web/station-and-workflow-routing.ts` delegating to the single classifier. Waiting characters at a `?` **Quest Gate** return `"Waiting"` in the reducer/HUD and `""` on the canvas (`forCanvas: true`) so the bobbing `?` marker is the sole overhead cue.
- **Disambiguated Preparation Station Routing & In-Place Compaction Exhalation**: Disambiguated `read`/`list` (`"Library"`) from `edit`/`write`/`apply_patch`/`multiedit` (`"Tinker"`) using active tool, `recentTools`, and `lastEquippedToolCategory` so editing characters remain at `"Tinker"` when entering a **Quest Gate**. Updated `handleSessionCompacted` in `src/state/session-handlers.ts` to execute **Compaction Exhalation** (`DistillingContextMana`) in place at the character's current/last workstation without overwriting `activeWorkstation` to `"Altar of Compaction"`.
- **Self-Expiring `1.45s` Armory Wardrobe Dwell**: Cleared `equippingAtArmory` after `1450ms` in `handleTimerTick` (`src/state/batch-reconciler.ts`) and bound `walker.armoryUntilMs` to a per-transition trigger key in `src/web/station-and-workflow-routing.ts` so the `1.45s` dwell self-expires even if `c.equippingAtArmory` remains `true` on the snapshot.
- **Deterministic FIFO Toil Queue, Ring-Corridor Pathing & Report Scroll Handoff (`src/encounter/toil-queue.ts`)**: Implemented `CharacterToil`, `compileCharacterToilQueue`, `stepCharacterToilQueue`, and `computeRingCorridorWaypoints(fromX, fromY, toX, toY)` routing indoor walks around `GOAL_ASSEMBLY_OBSTACLE_BOX` (`x: 280..500, y: 250..430`) and through `EAST_WILDERNESS_PORTAL` (`774, 352`) when crossing `x = 760`. Wired multi-waypoint ring-corridor walking and `ReportingScroll` subagent handoff (keeping `ReportingScroll` subagents open in `isCharacterActivelyOpen`, routing to parent coordinates, drawing the held parchment scroll, and triggering `triggerPlatformSnapBurst` on arrival) into `src/web/app-main.ts`, `src/web/client-state.ts`, and `src/web/canvas-hero-painter.ts`.
