# Feature Specification: Character Choreography, Station Gestures, Project World Isolation & Memory Stabilization

Status: ready-for-agent
Label: ready-for-agent

---

## Problem Statement

While the OpenCode Pixel Guild Visualizer successfully restored its high-definition dual-chamber canvas (the 800×720 Unified Workshop Room and 800×720 Outdoor Bug-Hunting Wilderness), live usage revealed critical visual, choreographic, and stability issues:

1. **Critical Out of Memory Crash**: The application crashes Chrome and Node.js with an Out of Memory (OOM) error within 15–30 seconds. On every 60 FPS animation frame, `renderOutdoorWilderness` calls `document.createElement("canvas")`, allocating full 800×720 uncompressed bitmap buffers (~138 MB per second) that overwhelm the browser garbage collector.
2. **Broken Project World Isolation**: Clicking between Project World tabs (`backend`, `frontend`, `opencode-game-visualizer`, `Development`, `pixel-guild-cloud`) does not switch the room. The canvas renderer hardcodes a fallback to the first room (`roomOrder[0]`), never changes the room banner, and dumps all 80+ sessions from every project into the same room simultaneously. The outdoor wilderness biome and monster sets also fail to switch to the active project's seeded identity.
3. **Teleportation**: Characters have no physical movement. When an agent starts a new tool or changes workstations, they teleport instantly to the destination tile without walking animation, trajectory, or projected path lines.
4. **Static Floating**: While working at stations, characters only play a generic idle breathing bob. They do not perform authentic station gestures: blacksmiths do not hammer, scholars do not read manuscripts, alchemists do not stir cauldrons, enchanters do not levitate, and warriors in the wilds do not assume a combat stance.
5. **Abrupt Subagent Spawning**: Child subagents pop into existence instantly without any summoning ritual or spellcast visual effects from the parent agent.
6. **Passive Part Snapping**: When a project task or issue completes, parts snap into the central Feature Object Assembly passively without any character physically carrying the component across the floorboards to the platform.
7. **Generic Platform Label**: The central assembly platform displays a generic `FEATURE OBJECT ASSEMBLY` banner instead of visually fitting the active feature's actual title and progress.

---

## Solution

A comprehensive visual choreography, project isolation, and memory stabilization overhaul on the high-definition canvas:

1. **Persistent Offscreen Canvas (OOM Fix)**: Eliminate the per-frame `document.createElement("canvas")` in `renderOutdoorWilderness`. Allocate a single persistent, reusable offscreen canvas and 2D context outside the animation loop, resizing only upon canvas dimension change and clearing with `clearRect(0, 0, w, h)`.
2. **Project World Isolation**:
   - When a Project World tab is selected, resolve the active room directly from `selectedProjectId` (matching `room.projectId` or `room.locationDirectory`).
   - Render the active project banner on the room's north wall: `[PROJECT_NAME] [PRIMARY GUILD HALL] (/path/to/project)`.
   - Filter rendered characters on canvas strictly to sessions belonging to the active project's rooms.
   - Seed the outdoor wilderness biome (Forest, Dungeon, Dryland), foliage props, ground palette, and monster lineage set dynamically from the active project's canonical path.
3. **Smooth Walking Choreography & Projected Pathlines**:
   - Maintain active position tracking (`currentX, currentY` toward `targetX, targetY`) for all sessions.
   - Interpolate motion smoothly at a fixed walking speed (~130 px/sec) with animated step bobbing (`Math.sin(t * 12) * 3`).
   - Flip the character sprite left/right based on motion vector.
   - Render a subtle glowing dashed projected pathline on the oak floorboards showing the character's route toward their target station.
4. **Station-Specific Acting Gestures**:
   - Modulate arm, tool, and prop offsets in `drawVectorHero` when a session is `WorkingAtStation`:
     - **Smithy Forge**: Rhythmic hammering arm cycle with anvil spark bursts.
     - **Grand Library**: Raised manuscript reading gesture with page-flutter motion.
     - **Artificer Workbench**: Blueprint measuring and tinkering gesture with drafting tools.
     - **Enchanter Circle**: Levitation bob with raised glowing hands and rotating floor runes.
     - **Alchemy Lab**: Stirring the bubbling green cauldron with steam puffs.
     - **Break Lounge**: Seated relaxation near the sleeping cat with coffee cup.
     - **Wilds / Combat**: Ready combat stance facing the monster with weapon thrusting and shield raised.
5. **In-Place Subagent Summoning Ritual Spellcast FX**:
   - When a new child session (`parentID != null`) is spawned, trigger an 800ms `SummoningRitual` at the parent's coordinates.
   - The parent raises their hands in a spellcasting pose; an expanding cyan/violet floor pentagram with rotating rune text expands beneath them; and a light beam swirls around the adjacent tile where the child subagent materializes.
6. **Physical Part Hauling to the Assembly Platform**:
   - When a task or issue is marked resolved, the responsible crafting character picks up the component sprite at their station.
   - The character visibly walks across the room to the central platform anchor (`x: 380, y: 350`), deposits the part with a bright golden snap particle burst, and returns to their next station.
7. **Feature-Specific Monument Naming**:
   - Dynamically extract the active feature's title from `taskProgress.featureSlug` or project root.
   - Visually fit and center the banner text on the platform: `<feature title> (${resolvedTasks}/${totalTasks} built)`.

---

## User Stories

1. As a spectator, I want the visualizer to run continuously without running out of memory or crashing the browser, so that I can leave the companion open during long coding sessions.
2. As a spectator, I want the Fog of War rendering to reuse a single persistent offscreen canvas, so that garbage collection pauses and VRAM bloat are completely eliminated.
3. As a spectator, I want clicking a Project World tab (e.g. `backend`, `frontend`, `Development`) to immediately switch the canvas to that project's room, so that I can inspect different projects independently.
4. As a spectator, I want the active room's north wall to clearly display the project's name, guild hall status, and path, so that I immediately know which project world I am viewing.
5. As a spectator, I want the characters rendered on the canvas to be strictly filtered to the active project's sessions, so that sessions from other projects do not crowd the wrong room.
6. As a spectator, I want the outdoor wilderness biome (Forest, Dungeon, Dryland) and monster set to switch when I change Project Worlds, so that each project has its own distinct environmental identity.
7. As a spectator, I want characters to smoothly walk between stations instead of teleporting, so that agent movement feels natural and grounded.
8. As a spectator, I want walking characters to display an animated walking cycle with step bobbing and directional sprite facing, so that motion is expressive.
9. As a spectator, I want moving characters to display a subtle glowing projected pathline on the floor toward their destination, so that I can see where they are heading.
10. As a spectator, I want characters at the Smithy Forge to hammer on the anvil with rhythmic spark bursts, so that terminal and build executions feel industrious.
11. As a spectator, I want characters at the Grand Library to hold open manuscripts with page-flutter animations, so that file reading looks like scholarly research.
12. As a spectator, I want characters at the Artificer Workbench to examine blueprints with drafting tools, so that code editing looks like precise crafting.
13. As a spectator, I want characters at the Enchanter Circle to levitate with raised glowing hands and rotating floor runes, so that skill and subagent invocations feel arcane.
14. As a spectator, I want characters at the Alchemy Lab to stir the cauldron with rising steam puffs, so that Code Mode scripts look like alchemical brewing.
15. As a spectator, I want idle characters in the Break Lounge to sit comfortably near the sleeping cat with a coffee cup, so that non-active sessions feel relaxed.
16. As a spectator, I want characters in the Dungeon Wilds to assume an active battle stance facing the bug monster with weapon thrusts and raised shields, so that debugging looks like combat.
17. As a spectator, I want parent agents summoning a subagent to cast an in-place summoning ritual, so that subagent creation is visually dramatized.
18. As a spectator, I want the summoning ritual to display an expanding cyan/violet magic circle with rotating runic text and a light beam materializing the child on an adjacent tile, so that spawning has clear visual feedback.
19. As a spectator, I want characters to physically carry completed feature components from their station across the floorboards to the assembly platform, so that task completion has physical embodiment.
20. As a spectator, I want parts placed on the platform to play a golden snap particle burst, so that milestone fittings feel satisfying.
21. As a spectator, I want the central assembly platform header to visually fit the active feature's title and progress (e.g. `<feature title> (x/y built)`), so that I know exactly which feature is being built.
22. As a developer, I want all design sketches, images, and specifications in `docs/` preserved without deletion, so that historical assets remain intact.

---

## Implementation Decisions

### 1. Offscreen Canvas Memory Management
- Allocate `cachedFogCanvas` and `cachedFogCtx` once in module scope within `src/web/app.html`.
- On each frame of `renderOutdoorWilderness`, verify if dimensions match the viewport (`w, h`). Resize only if dimensions differ.
- Clear the offscreen buffer using `cachedFogCtx.clearRect(0, 0, w, h)`.
- Never call `document.createElement("canvas")` within the animation or render loop.

### 2. Project World Isolation & Canvas Filtering
- When resolving the active room in `renderUnifiedGenericRoom`, `renderOutdoorWilderness`, and `renderCanvasFrame`:
  ```javascript
  const projectRooms = Object.values(currentSnapshot.rooms || {}).filter(
    (r) => r.projectId === selectedProjectId || r.locationDirectory === selectedProjectId || r.parentProjectDirectory === selectedProjectId
  );
  const activeRoom =
    (selectedRoomId ? currentSnapshot.rooms?.[selectedRoomId] : null) ??
    projectRooms[0] ??
    currentSnapshot.rooms?.[currentSnapshot.roomOrder?.[0]] ??
    Object.values(currentSnapshot.rooms || {})[0];
  ```
- Render a room header banner on the north wall brickwork:
  ```javascript
  c.font = "bold 13px monospace";
  c.fillStyle = "#fef08a";
  c.fillText(`${activeRoom.projectName.toUpperCase()} [${activeRoom.isWorktree ? "WORKTREE ANNEX" : "PRIMARY GUILD HALL"}] (${activeRoom.locationDirectory})`, 400, 24);
  ```
- Filter rendered characters strictly to those matching the active Project World:
  ```javascript
  const chars = Object.values(currentSnapshot.characters || {}).filter((c) =>
    projectRooms.some((r) => r.roomId === c.roomId || r.locationDirectory === c.locationDirectory)
  );
  ```
- Pass `activeRoom.projectId || activeRoom.locationDirectory` to `seedProjectWorldVisuals()`.

### 3. Smooth Walking Choreography & Projected Paths
- Maintain a persistent `characterWalkers` map:
  ```javascript
  interface CharacterWalkerState {
    currentX: number;
    currentY: number;
    targetX: number;
    targetY: number;
    isWalking: boolean;
    facingLeft: boolean;
    walkCycle: number;
    pathPoints: Array<{ x: number; y: number }>;
  }
  ```
- In each frame, update walker position:
  - If distance to target $> 4$ px, increment `currentX, currentY` along the trajectory vector at $130 \text{ px/sec} \times \Delta t$.
  - Update `facingLeft = targetX < currentX`.
  - Animate walking step bob: $\Delta y = \sin(\text{walkCycle} \times 12) \times 3$.
  - Draw a glowing dashed projected pathline from `(currentX, currentY)` to `(targetX, targetY)`.
  - When distance $\le 4$ px, snap to target and set `isWalking = false`.

### 4. Station Acting Gestures in `drawVectorHero`
- Pass `stationKind` and `isActing` into `drawVectorHero`.
- Modulate arm and prop angles:
  - **Forge**: Hammer raised `rotate(-0.8 + Math.sin(t * 8) * 0.9)`, striking anvil at sine minima with spark particles.
  - **Library**: Raised manuscript reading pose, gentle page flutter `rotate(Math.sin(t * 3) * 0.08)`.
  - **Tinker**: Blueprint drafting pose with ruler / wrench arm motion.
  - **Enchanter**: Floating bob `translate(0, Math.sin(t * 3.5) * 5)`, arms raised with glowing cyan floor pentagram runes.
  - **Alchemy**: Stirring gesture around cauldron center with rising steam bubbles.
  - **Break Lounge**: Resting seated pose near cat with coffee steam.
  - **Wilds**: Combat stance facing monster with weapon thrusting `translate(Math.sin(t * 6) * 6, 0)`.

### 5. In-Place Subagent Summoning Ritual Spellcast FX
- Track known session IDs. When a new child session (`parentID != null`) arrives:
  - Locate parent walker coordinates.
  - Spawn an active `SummoningRitual` object:
    `{ parentId, x, y, childId, startedAtMs, durationMs: 1200 }`.
  - Render an expanding cyan/violet magic circle with rotating runic ring and pentagram star beneath the parent.
  - Particle beam swirls to the adjacent target tile where the child subagent materializes.

### 6. Physical Part Hauling Choreography
- Track `completedTaskCount`. When `resolvedTasks` increments:
  - Identify crafting character at the relevant station.
  - Set active haul route: character carries component sprite from station $\rightarrow$ center platform anchor (`x: 380, y: 350`).
  - Upon arrival, trigger golden snap particle burst, increment fitted part on platform, and return character to station.

### 7. Dynamic Feature Monument Naming
- In `renderUnifiedGenericRoom`:
  - Extract feature title from `taskProgress.featureSlug` or active room name.
  - Compute font size dynamically (10–13px bold monospace) to fit within platform banner bounds.
  - Draw: `${featureTitle} (${builtCount}/${totalPartsCount} built)`.

---

## Testing Decisions

### What Makes a Good Test
- Tests verify observable behavior: memory allocation patterns, project isolation filtering, coordinate interpolation, and state transitions.
- Tests do not mock internal variables; they exercise public APIs and DOM/Canvas contracts.

### Tested Seams & Modules
1. **Memory Allocation Seam**:
   - Asserts that the canvas animation loop executes without calling `document.createElement("canvas")` on successive frames.
2. **Project World Isolation Seam**:
   - Asserts that selecting different project world tabs isolates `activeRoom`, filters `chars`, and updates seeded wilderness biomes.
3. **Walking Choreography Seam**:
   - Asserts that when a character's workstation changes, their position changes smoothly across delta-time frames rather than teleporting.
4. **Acting Gesture Seam**:
   - Asserts that characters at stations execute distinct arm/tool orientations.
5. **Summoning Ritual Seam**:
   - Asserts that child session creation triggers a summoning ritual event at parent coordinates.
6. **Part Hauling Seam**:
   - Asserts that task resolution triggers a hauling route to the platform with snap effects.

---

## Out of Scope

- Modifying reference assets or design sketches in `docs/`.
- Changing OpenCode V2 HTTP daemon protocols or API contracts.
- Adding 3D rendering engines or external heavy canvas libraries.

---

## Further Notes

- Runs on port `4310` (`npm start` / `node --experimental-strip-types src/server/main.ts`).
- Fully backwards-compatible with all existing test suites (86/86 pass).
