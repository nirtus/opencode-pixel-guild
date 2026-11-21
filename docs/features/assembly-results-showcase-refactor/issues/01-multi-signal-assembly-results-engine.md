# 01: Multi-Signal Assembly & Guild Results Engine (`src/encounter/assembly-results.ts`)

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: None

## Description

Create the deep module `src/encounter/assembly-results.ts` (`deriveGuildAssemblyShowcase`) that synthesizes **Assembly Parts**, **GuildResultsMetrics**, and **AssemblyResultDeliverable** items from explicit `room.taskProgress` (`docs/features`, `subagents`, `Working Tree Changes`) and live `snapshot.characters` deliverables (files modified via `edit`/`write`/`apply_patch`, fixed issues & passing verification runs, **Squad Subagent** report deliveries, and completed/active **Guild Adventurer** quests), tagged with **Project Heraldry**. Also enrich `opencode-client-adapter.ts` sweep task derivation with session lifecycle states and preserve active `taskProgress` against empty sweep overwrites in `batch-reconciler.ts`.

## Answer

Implemented `deriveGuildAssemblyShowcase` in `src/encounter/assembly-results.ts`, updated `handleToolCompleted` in `src/state/tool-and-gate-handlers.ts` to preserve `inputPreview`/`toolInput`, and mapped `activeSessionIds` onto `state.sessions` in `src/ingress/opencode-client-adapter.ts`. Verified with `tests/33-assembly-results-showcase.test.ts` (Slice 1).
