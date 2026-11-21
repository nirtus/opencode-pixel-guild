# 05: Worktree Goal Assembly Deduplication, Corridor Boundary Routing & Wilderness Bug Targeting Fixes

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 04

**What to build:** Deduplicate **Assembly Parts** across a project's primary repository and Git worktree rooms on the **Goal Assembly Site** and **Project Mini-Assembly**, eliminate the `x = 760` portal boundary routing hole and north-wall **Resource Stockpile** obstacle clipping in indoor corridor pathing, and fix cross-project **Quest Gate** leaks and **Bug Monster** species morphing in the **Dungeon Wilds**.

**Blocked by:** 04: Daemon Command Failure Gating, Quest Gate Field Isolation, Context Mana & Tool Completion Fixes

**Status:** resolved

## Acceptance Criteria

- [x] Every modified or created source module remains strictly `<= 400` lines.
- [x] **Goal Assembly Site** and **Project Mini-Assembly** derivation deduplicate deliverables by project, kind, and title across primary and Git worktree rooms *before* mapping them to **Assembly Parts**, ensuring part counts (`totalParts` and `fittedCount`) match the deduplicated deliverables list.
- [x] Indoor corridor routing handles characters starting at the exact `x = 760` wilderness portal boundary (`fromX >= 760 && toX < 760`), routes characters in `700 <= fromX < 760` heading outdoors cleanly through the portal entry point, and tests indoor corridor graph edges against both the **Goal Assembly Site** and **Resource Stockpile** obstacle boxes.
- [x] **Dungeon Wilds** bug derivation filters **Quest Gates** strictly by the scoped project's sessions even when zero characters are currently visible in that project, excludes optimistically resolved gates, assigns sticky lair indices before selecting monster species so surviving **Bug Monsters** never morph when an earlier monster is defeated, and excludes exploration agent classes from combat station classification.
- [x] Automated unit tests verify worktree **Assembly Part** deduplication, `x = 760` and **Resource Stockpile** corridor routing, and cross-project **Bug Monster** isolation, verified on the `opencode-pixel-guild-visualizer` Docker container.

## Answer

- **Worktree Assembly Part Deduplication (`src/encounter/assembly-results.ts`, `src/encounter/project-mini-assemblies.ts`)**:
  - Deduplicated `assemblySourceItems` in `deriveGuildAssemblyShowcase` and `explicitItems` in `deriveProjectMiniAssemblies` by `${d.projectId}::${d.kind}::${d.title}` *before* invoking `mapDeliverablesToAssemblyParts(...)`, ensuring `parts`, `fittedCount`, and `totalParts` match `mergedDeliverables` 1:1 without doubling across primary and Git worktree rooms, and preserved `source = "subagents"` in single-project All Worlds scope.
- **Indoor Corridor Boundary & Resource Stockpile Obstacle Routing (`src/encounter/corridor-router.ts`)**:
  - Updated `computeIndoorCorridorLeg` to test direct segments, seeded DFS graph edges, and fallback Dijkstra edges against both `GOAL_ASSEMBLY_OBSTACLE_BOX` and `RESOURCE_STOCKPILE_OBSTACLE_BOX`.
  - Updated `computeRingCorridorWaypoints` so characters starting at the exact `x = 760` portal boundary (`fromX >= 760 && toX < 760`) route through the portal and indoor corridor waypoints rather than walking straight through indoor obstacles, and characters in `700 <= fromX < 760` with `|fromY - portal.y| > 24` align with `portalIn` (`x = 722`) before crossing the east brick wall.
- **Wilderness Bug Targeting & Sticky Monster Identity (`src/web/wilds-bug-targeting.ts`)**:
  - Excluded exploration agent classes (`isExplorationAgentClass(c.agentClass)`) in `isCharacterInCombatStation`.
  - Included `isAllWorldsFocused` (`all` vs `scoped`) and `selectedRoomId` in `deriveProjectBugMonsters` memoization key, filtered out optimistically resolved gates via `isClientGateResolved`, scoped fallback `questGates` strictly to the active project's sessions/rooms even when `visibleChars` is empty, re-resolved monster species (`monsterName`, `role`, `tier`, `file`, `scale`) from each bug's sticky `lairIndex` after `assignStickyLairPositions(bugs)`, and changed `wildsW >= cw` to `wildsW >= 800` in `resolveHeroWorldCanvasPosition` for mobile viewports.
