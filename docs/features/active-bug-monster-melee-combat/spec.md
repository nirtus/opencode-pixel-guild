# Feature Specification: Active Bug Monster Melee Combat & Elimination of Wilderness Wandering

Label: ready-for-agent

## Problem Statement

When a session is in a **Debugging Hunt** turn (`workflowIntent === "debugging-hunt"`) and a named **Bug Monster** is active in the **Dungeon Wilds**, the character currently falls back to `station = "WildsSearch"` whenever their active tool does not match `/edit|write|patch|multiedit|bash|test/` (such as while thinking, between tool calls, or inspecting files). In `WildsSearch`, `Math.floor(timestampMs / 4500) % 5` rotates the target waypoint every 4.5 seconds, causing the character to endlessly wander around the wilderness with a stale `"Tracking Bug"` pill instead of standing in front of the **Bug Monster** and fighting it.

## Solution

Update **Debugging Hunt** routing, label derivation, and **Dungeon Wilds** combat rendering so that:
1. Whenever a **Bug Monster** is present in the **Dungeon Wilds** (`hasActiveRoomBug` / `bugs.length > 0`) for a debugging character, the character routes directly to `station = "Combat"` (`bug.inCombat = true`) and displays `"Fighting Bug"` on both the canvas pill and the HUD panels (**Character Sheet** and **Guild Master Ledger**).
2. The 4.5-second `WildsSearch` wandering loop (`Math.floor(timestampMs / 4500)`) is removed so characters never pace aimlessly around the forest.
3. Each fighting character positions at melee range directly in front of their target **Bug Monster**'s lair coordinates (`bugWorldX - 48, bugWorldY + 4`, staggered vertically by `±28px` when multiple characters engage the same monster), faces right toward the monster (`facingLeft = false`), and executes continuous weapon thrust lunges, sword swings, golden slash arcs, and impact sparks against the shaking monster.

## User Stories

1. As a spectator watching a debugging session when a **Bug Monster** is present in the **Dungeon Wilds**, I want the character to walk directly up to the **Bug Monster** and engage it in melee combat (`station = "Combat"`), so that the character visibly fights the bug instead of wandering around empty trees.
2. As a spectator, I want the 4.5-second `WildsSearch` waypoint rotation timer removed, so that characters in the **Dungeon Wilds** never pace in an aimless loop.
3. As a spectator, I want a character in `"Combat"` to always display `"Fighting Bug"` on their floating canvas **Overhead Action Label**, in the **Character Sheet**, and in the **Guild Master Ledger** (overriding any stale `"Tracking Bug"` or `"Reading File"` label stored on the snapshot), so that the canvas and HUD agree 100%.
4. As a spectator, I want each fighting character to stand in melee formation directly facing their target **Bug Monster**'s lair (`bugWorldX - 48, bugWorldY + 4`, with `facingLeft = false`) and animate continuous sword/weapon lunges, slash arcs, and hit sparks while the **Bug Monster** shakes and takes damage, so that combat looks unmistakable and dynamic.

## Implementation Decisions

1. **Immediate `"Combat"` Engagement When a Bug Monster Is Present**:
   - In `resolveCharacterTargetSlot` (`src/web/station-and-workflow-routing.ts`), when `workflowIntent === "debugging-hunt"`, set `station = "Combat"` whenever `hasActiveRoomBug` is true OR the tool matches `/edit|write|patch|multiedit|bash|test/`.
   - Remove `+ Math.floor(timestampMs / 4500)` from `WildsSearch` waypoint selection so a searching character (when `hasActiveRoomBug` is false) stays at a stable reconnaissance point rather than wandering every 4.5 seconds.
   - In `deriveOverheadActionLabel` (`src/encounter/workflow-classifier.ts`), check `if (options?.station === "Combat") return "Fighting Bug";` before returning `char.overheadLabel`, ensuring `"Combat"` always displays `"Fighting Bug"`.
2. **Lair-Locked Melee Positioning, Facing & Impact FX**:
   - In `deriveProjectBugMonsters` (`src/web/canvas-wilds-painter.ts`), mark `inCombat = true` on the active **Bug Monster** whenever any visible debugging character is present in the room (`debugChars.length > 0` or `enc.phase === "in-combat"`).
   - Match each fighting character to their target **Bug Monster**'s lair position (`800 + bug.x - 48, bug.y + 4`, staggered vertically for multiple attackers) and orient the character toward the monster (`facingLeft = false` when standing at melee range to the left of the monster).
   - Enhance `"Combat"` visuals in `src/web/canvas-hero-painter.ts` and `src/web/canvas-wilds-painter.ts` with active melee body lunge (`Math.sin(t * 14) * 6`), sword/weapon swing arc, and impact sparks between the hero and the monster.

## Testing Decisions

1. **Choreography & Routing Seam (`resolveCharacterTargetSlot` & `stepClientChoreography`)**:
   - Verify that a character in `debugging-hunt` with `hasActiveRoomBug = true` (even when `activeCapability` is empty or `read` and `char.overheadLabel` is `"Tracking Bug"`) resolves to `station === "Combat"` with `overheadLabel === "Fighting Bug"`, stands at melee range in front of the monster lair without changing coordinates every 4.5 seconds, and faces the monster (`facingLeft === false`).
2. **Live Container Visual Verification**:
   - Rebuild and restart the Docker container on port `4310`, capture `docs/images/active-bug-monster-melee-combat.png` via headless Chrome, and visually inspect with `read` to confirm the character stands directly in front of the **Bug Monster** fighting it.

## Out of Scope

- Changing indoor **Preparation Station** positions or non-debugging workflows.
