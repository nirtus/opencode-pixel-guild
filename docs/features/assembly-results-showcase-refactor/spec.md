# Specification: Goal Assembly Site & Guild Results Showcase Refactoring

## Overview

Refactor the **Goal Assembly Site** (on the 2D Workshop Room canvas) and the **Guild Master Ledger** (`Overview` and `Assembly & Commit` subtabs) into a unified **Guild Results Showcase** so that completed and in-progress work across OpenCode sessions, **Squad Subagents**, modified files, vanquished **Bug Monsters**, feature tickets, and Git working-tree changes is always synthesized into visible **Assembly Parts** and a structured **Results Display**—both when viewing `🌐 All` projects and when focusing a single project.

## Problem Statement

1. **`🌐 All` Mode Blanked Out Assembly (`0/0`)**: `getSelectedProjectRoom()` and `getActiveRoom()` returned `null` whenever `clientState.isAllWorldsFocused === true`, forcing `resolveActiveGoalAssemblyAndLayout()` and `renderGuildMasterLedgerPanel()` to render `0/0 Blueprint Ready` on the central canvas platform, hide the Assembly card in `Overview`, and show `⚙️ Assembly & Commit (0/0)` in the subtab bar.
2. **Session Deliverables Were Invisible**: Projects without uncommitted `docs/features/<slug>/issues/*.md` files—or projects whose feature issues were already committed—showed `0/0` even when multiple OpenCode sessions had modified files, fixed issues, delivered subagent reports, and completed quests.
3. **Location Sweeps Overwrote Task Progress**: `opencode-client-adapter.ts` passed raw `state.sessions` without `lifecycleState` into `deriveProjectTaskProgress`, which early-returned `BLUEPRINT_READY_TASK_PROGRESS` (`0/0`).

## Architecture & Seams

1. **Multi-Signal Guild Assembly & Results Engine (`src/encounter/assembly-results.ts`)**:
   - Public seam: `deriveGuildAssemblyShowcase(snapshot, options)`
   - Synthesizes explicit `room.taskProgress` items (`docs/features`, `subagents`, `Working Tree Changes`) and live character deliverables from `snapshot.characters` (files modified via `edit`/`write`/`apply_patch`, fixed issues & passing verification runs, **Squad Subagent** report deliveries, and completed/active root **Guild Adventurer** quests).
   - Preserves `0/0 Blueprint Ready` for genuinely empty rooms (`0` tasks and `0` characters with deliverables) while populating rich **Assembly Parts** (`GoalAssemblyState`), **GuildResultsMetrics**, and **AssemblyResultDeliverable** entries whenever work has occurred.
   - Aggregates across all active rooms when `🌐 All` (`isAllWorldsFocused`) is active, tagging each part and deliverable with its **Project Heraldry** (`shortTag`, `crestIcon`, `partyKey`).
2. **2D Canvas Goal Assembly Site (`src/web/canvas-assembly-painter.ts` & `src/web/client-choreography.ts`)**:
   - `resolveActiveGoalAssemblyAndLayout()` delegates to `deriveGuildAssemblyShowcase`, rendering fitted **Assembly Parts**, spinning clockwork gears, advancing the pressure gauge, activating the digital console/Tesla coil, and drawing project-tagged socket badges in both `🌐 All` and single-project focus modes.
3. **HUD View-Model & Ledger Reconciler (`src/hud/guild-ledger-vm.ts` & `src/web/ledger-panel-reconciler.ts`)**:
   - `buildGuildMasterLedgerViewModel(snapshot, selectedRoomId)` exposes `activeGoalAssembly` backed by `deriveGuildAssemblyShowcase` (including `deliverables`, `modifiedFiles`, and `metrics`).
   - `Overview` subtab renders a **Guild Results & Assembly Showcase** summary card whenever parts or session deliverables exist.
   - `Assembly & Commit` subtab renders the **Goal Assembly Site & Guild Results Showcase** card (metrics ribbon + categorized deliverables list of completed quests, modified files, fixed issues, subagent reports, and feature tasks with **Project Heraldry** pills) above the **Assembly Commit Ledger** Git CRUD panel.
4. **Live Ingress Subagent & Task Hydration (`src/ingress/opencode-client-adapter.ts`)**:
   - Maps `activeSessionIds` onto `state.sessions` (`lifecycleState: "WorkingAtStation" | "RestingInLounge"`) before calling `deriveProjectTaskProgress`, and prevents empty sweep payloads from erasing non-empty room `taskProgress`.
