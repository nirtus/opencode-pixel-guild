# 02: Workflow Intent Invariance, Active-Only Bug Monsters & Roster Mode Projection

Type: grilling
Label: wayfinder:grilling
Status: resolved
Blocked by: None

## Question

How should **Workflow Intent** classification (`src/encounter/workflow-classifier.ts`), **Bug Monster** derivation (`src/web/canvas-wilds-painter.ts`, `src/encounter/bug-monsters.ts`), character slot/badge resolution (`src/web/station-and-workflow-routing.ts`), and **Project World** session counting (`src/spatial/project-world.ts`) be structured so that switching between `Roster: Active Squads` (`active-squads`) and `Roster: Full Lineage` (`full-lineage`) never changes a character's work representation, role, or station?

## Answer

Confirmed in Grilling Round 1 (`Q3`):
1. **Strict Character-Local Workflow Intent**:
   - Remove `if (options?.hasActiveRoomBug && char.questGate?.kind !== "question") return "debugging-hunt";` from `classifyCharacterWorkflowIntent` (`src/encounter/workflow-classifier.ts:149–151`).
   - Derive each character's `workflowIntent`, `role` (`MAGE`, `WARRIOR`, `SCOUT`, `ALCHEMIST`, `CLERIC`, `SAPPER`), target `station`, and `overheadLabel` strictly from that character's own active turn state.
   - Tighten `inputPreview` matching in `classifyCharacterWorkflowIntent` (`line 144`) so non-test commands (such as `chrome.exe --headless` or reading files with `test` in the path) do not falsely classify a `Feature Build` turn as `debugging-hunt`.
2. **Resting & Archived Priority in Display Badges & Overhead Labels**:
   - In `deriveOverheadActionLabel` (`src/encounter/workflow-classifier.ts`) and `resolveCharacterDisplayBadge` (`src/web/station-and-workflow-routing.ts`), evaluate `state === "RestingInLounge"` (`"Resting"`, station `"Lounge"`), `state === "Archived"` (`"Archived"`, station `"Lounge"`), and `state === "ReportingScroll"` (`"Reporting Scroll"`) *before* `station === "Combat"` or `summoningRitual?.active` so resting and archived characters never display `"Fighting Bug"` or `"Summoning Squad"`.
3. **Active-Only Bug Monster Derivation**:
   - In `deriveProjectBugMonsters` (`src/web/canvas-wilds-painter.ts`) and `deriveBugMonsterEncounter` (`src/encounter/bug-monsters.ts`), filter project characters to actively executing sessions only (excluding `RestingInLounge` and `Archived` sessions) before scanning for tool errors or debug titles. Toggling `rosterMode` between `active-squads` and `full-lineage` must produce the exact same `deriveProjectBugMonsters()` result.
4. **Immediate Roster Mode Toggle & Accurate Project World Tab Counts**:
   - In `countProjectSessions` (`src/spatial/project-world.ts:209–243`), only exclude `Archived` characters when `rosterMode === "active-squads"`; when `rosterMode === "full-lineage"`, count all sessions belonging to the canonical **Project World** (including `Archived` lineage).
   - Include `rosterMode: clientState.rosterMode` in `lastSidePanelSignature` for `mode: "character"` (`src/web/side-panel-reconciler.ts:158–176`).

## Acceptance Criteria

- [x] For every character in a snapshot, `resolveCharacterTargetSlot` and `resolveCharacterDisplayBadge` return the exact same `workflowIntent`, `role`, `station`, and `overheadLabel` regardless of whether `clientState.rosterMode` is `"active-squads"` or `"full-lineage"`.
- [x] `deriveProjectBugMonsters()` ignores `RestingInLounge` and `Archived` sessions and returns identical encounters across `active-squads` and `full-lineage` modes.
- [x] `countProjectSessions(snapshot, projectId, "full-lineage")` includes `Archived` sessions so top-bar **Project World** tabs update accurately when toggling `#btn-toggle-lineage`.
