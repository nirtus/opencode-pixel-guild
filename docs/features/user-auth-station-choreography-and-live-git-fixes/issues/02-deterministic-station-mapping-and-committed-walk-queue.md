# 02: Deterministic Action-to-Station Routing (Library for Read, Armory for Skill) & Non-Interruptible Committed Walk Queue

**What to build:** Exact action-to-station fidelity and non-interruptible walk-leg commitment so characters always perform file reads (`read`, `glob`, `grep`, `list`, `ls`, `lsp`, `codesearch`) at the **Library Study Bookshelf** (`Library`), always equip **Skill Grimoires** (`skill` tool and `@skill`) at the **Armory Wardrobe** (`Armory`), never let a stale `lastEquippedToolCategory` override the current tool, and never brake or reverse direction in the middle of a walk path.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] `resolveCanonicalPreparationStation` evaluates the active/latest tool (`toolName` / `lastToolName`) before consulting `lastEquippedToolCategory`, so a session that previously equipped a skill still routes `read` to `Library` (`Library Study Bookshelf`) rather than `Enchanter`.
- [x] `skill` tool execution and `@skill` activation route characters to `Armory` (`Armory Wardrobe`), while `Enchanter` (`Arcane Lectern`) is reserved for `subagent` / `task` summoning rituals.
- [x] Removes the 1.45s wall-clock `armoryUntilMs` mid-walk preemption that caused characters to turn around halfway across the room.
- [x] `stepClientChoreography` locks a character's committed walk target (`committedTargetX`, `committedTargetY`) while `isWalking === true` and until a minimum station dwell (`1.2s`) completes upon arrival, queuing any newer target in `pendingSlot` so characters never brake or U-turn mid-path.
- [x] Automated tests verify `read -> Library` (even after equipping a skill), `skill -> Armory`, and non-interruptible walk completion without mid-path reversals.
