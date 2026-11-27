# Full Subagent, 10-Session & 50-Concurrent-Session Operator Workflow Audit

## Overview

End-to-end verification specification for the Pixel Guild Visualizer across:
- **Single-Squad 5-Task Subagent Workflow (`01`–`05`)**
- **10-Session Parallel Subagent Workflow (`01`–`10`)**
- **50-Concurrent-Session Full Function, Visualization, CRUD & User Input Stress Audit (`01`–`50`)**

## Visual Verification Matrix — Single Squad (5 Tasks)

| Stage | Local Dev Capture (Gitignored) | Verified User-Perspective Behavior |
| :---: | :---: | :--- |
| 1. Baseline Split View | `docs/images/workflow-01-baseline.png` | Live Workshop Room + Dungeon Wilds combat (`Fighting Bug`) and Guild Master Ledger. |
| 2. 5 Dummy Tasks Open (`0/5`) | `docs/images/workflow-02-five-tasks-open.png` | Goal Assembly Site renders `0/5` dashed blueprint modules (`#01`–`#05`) for `workflow-e2e-audit`. |
| 3. Answer Gate Alert in Ledger (`2/5`) | `docs/images/workflow-03-answer-gate-ledger.png` | Summoned Scout hero pauses at Arcane Lectern (`?`) and triggers `OPEN QUEST GATES (QUICK JUMP)` in Ledger. |
| 4. Interactive Question Gate Card | `docs/images/workflow-04-answer-gate-hero-sheet.png` | Hero Sheet (`Chat ⚠️`) displays `? QUESTION GATE: QUESTIONS` with clickable option chips, skill browser, and custom answer input. |
| 5. Unread Completed Session Report (`3/5`) | `docs/images/workflow-05-unviewed-report-ledger.png` | Resolving the Question Gate moves the hero to the Break Lounge (`✓ Result Ready`) and surfaces `COMPLETED SESSION RESULTS (UNREAD)` in the Ledger. |
| 6. Assembly Staging & Commit (`5/5`) | `docs/images/workflow-06-assembly-stage-and-diff.png` | All 5 tasks resolved (`5/5 (100%)`), files staged in `ASSEMBLY COMMIT LEDGER (CRUD)`, and `PREPARE COMMIT` dock populated. |
| 7. Hero Chat & Command Scroll (`build` Mode) | `docs/images/workflow-07-hero-sheet-chat-and-scroll.png` | Multi-turn transcript showing Question Gate reply, Command Scroll instruction in `build` mode (`WARRIOR`), and assistant confirmation. |
| 8. Squad Subagent Lineage & Session Details | `docs/images/workflow-08-subagent-lineage-details.png` | `Details` subtab displays all spawned subagents in `SQUAD SUBAGENT LINEAGE` and the `Kill Character (Delete Session)` control. |
| 9. Post-Delete Clean State (`5/5`) | `docs/images/workflow-09-after-session-delete.png` | Dummy session deleted via `DELETE /api/guild/session/:id` and evicted from canvas and roster. |

## Visual Verification Matrix — 10 Parallel Sessions + Subagents (`0/10` → `10/10`)

| Stage | Local Dev Capture (Gitignored) | Verified User-Perspective Behavior |
| :---: | :---: | :--- |
| 10. 10-Task Open Blueprint (`0/10`) | `docs/images/parallel-10-01-open-blueprint.png` | Goal Assembly Site switches to a 4-column grid (`#01`–`#10`) displaying `0/10` open tasks. |
| 11. 10 Parallel Sessions + Subagents & Quest Gates | `docs/images/parallel-10-02-active-crowd-and-gates.png` | 10 parallel root sessions each spawn their own subagent (`26 Subagents` total) and fan out into non-overlapping perimeter slots with `?` Answer Gate badges and `OPEN QUEST GATES` in the Ledger. |
| 12. 10 Parallel Unread Reports in Break Lounge (`10/10`) | `docs/images/parallel-10-03-unviewed-reports-lounge.png` | After 10 parallel `gate.resolve` + `scroll.send` calls, heroes settle into the Break Lounge with `✓ Result Ready` badges and `COMPLETED SESSION RESULTS (UNREAD)` in the Ledger. |
| 13. 10/10 Assembly Staged in Parallel | `docs/images/parallel-10-04-assembly-10-of-10-staged.png` | All 10 modules (`#01`–`#10`) lit on the Goal Assembly Site (`10/10 (100%)`) and 10 task files staged (`10/56 STAGED`) via concurrent `git.stage`. |
| 14. Post-Delete Clean State (`20` Root + Child Sessions Deleted) | `docs/images/parallel-10-05-after-parallel-delete.png` | Concurrent `DELETE /api/guild/session/:id` calls cascade-delete all 10 root sessions and 10 child subagents (`20` total) with `10/10` `ok: true`. |

## Visual Verification Matrix — 50 Concurrent Sessions & All-Function Audit (`50/50`)

| Stage | Local Dev Capture (Gitignored) | Verified User-Perspective Behavior |
| :---: | :---: | :--- |
| 15. 50 Concurrent Sessions (`15` Quest Gates + `35` Unread Reports) | `docs/images/scale-50-01-crowd-and-gates-workshop.png` | `opencode-game-visualizer (51) ✨`, `General (51)`, `Hero ⚠️15`, `OPEN QUEST GATES (QUICK JUMP): 15 WAITING`, and `COMPLETED SESSION RESULTS (UNREAD): 35 READY`. |
| 16. `🌐 All` Worlds Multi-Project Composite Assembly | `docs/images/scale-50-02-all-worlds-composite-assembly.png` | Central Goal Assembly Site renders 7 project mini-assembly bays (`GAME-VIZ ★ DONE 10/10`, `PROJ-B 4/10`, `WORKSPACE READY`, `FRONTEND READY`, `BACKEND READY`, etc.). |
| 17. Hero Sheet `Scrolls & Gear` (4-Slot RPG Paper-Doll & Inventory) | `docs/images/scale-50-03-hero-scrolls-gear-and-tools.png` | Displays `LV.52 · GRAND ARCHON` 4-slot paper-doll (`Forgeplate Visor Helm`, `Archmage Mantle of BUILD`, `Blacksmith's Forge Hammer`, `Skill Grimoire: dispatching-parallel-agents`), connected plugins, and Tool Belt counts. |
| 18. Interactive `✨ Summon New Guild Adventurer` Modal | `docs/images/scale-50-04-summon-and-operator-modals.png` | Renders Workshop Room Directory picker, Adventurer Class selector (`build`, `plan`, `document`), Quest Title input, single-row Available Skills Browser (`filter ◄ @opencode @report 1/58 ►`), and prompt textarea. |
| 19. Post-50-Session Parallel Cleanup (`50/50` Evicted) | `docs/images/scale-50-05-after-50-session-cleanup.png` | All 50 concurrent sessions marked viewed (`50/50` in `2.7s`) and deleted (`0` remaining in snapshot in `7.3s`), restoring the room to `1 Active` with `10/10 (100%)` Goal Assembly intact. |
