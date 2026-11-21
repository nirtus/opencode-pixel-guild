# 01: Unified Host Workshop Room Co-Habitation & Non-Isolating Project Legend

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: None (can start immediately)

**What to build:** Combine all characters across every open project and Git worktree on the connected OpenCode host into the single shared **Workshop Room** and adjacent **Dungeon Wilds** so no project's characters are hidden behind isolating room tabs, while repurposing the top-bar project pills into a live, non-isolating **Project Heraldry** legend.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Every active, blocked, or recently active **Guild Adventurer** and **Squad Subagent** across all projects opened on the active **OpenCode Machine Pairing** appears and moves together inside the same **Workshop Room** and **Dungeon Wilds** without being filtered out by project selection.
- [x] When zero sessions are actively running on the host in `Active Squads` **Roster Visibility Mode**, the single most recent non-archived root **Guild Adventurer** from each open project (up to 4) rests in the **Break Lounge** so every open project on the host remains visibly represented in the room.
- [x] Each character state record carries its canonical `projectId`, `projectName`, and `locationDirectory` so OpenCode V2 directory-scoped daemon commands (`Command Scroll` prompts, interrupts, session deletion, and message hydration) continue to target that character's exact project or worktree directory.
- [x] Top-bar project pills render as a non-isolating **Project Heraldry** legend showing each open project's crest, name, and active character count; clicking a project pill focuses that project for repository inspection without hiding characters from any other project on the **Guild Floorplan**.
- [x] End-to-end tests verify that characters from multiple open projects on the same host simultaneously co-habit the **Workshop Room**, step through station choreography without colliding, and remain visible regardless of which project pill is clicked.

## Answer

Implemented `selectVisibleHostCharacters` in `src/spatial/project-heraldry.ts`, wired `getVisibleProjectCharacters` and `getVisibleHostCharacters` in `src/web/client-state.ts`, enriched `CharacterState` with `projectId` and `projectName`, and projected heraldic crests onto `worldTabs` in `buildTopBarViewModel` and `reconcileTopBar`.
