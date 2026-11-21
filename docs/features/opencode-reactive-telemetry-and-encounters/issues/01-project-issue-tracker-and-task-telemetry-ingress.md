# 01: Project Issue Tracker & Task Telemetry Ingress

Type: task
Label: ready-for-agent
Status: resolved

## Question

How can the companion server and ingress adapter autonomously discover active project issues and completion steps from `docs/features/*/issues/*.md` (or subagent session rosters when absent) and emit live task telemetry into `WorldStateReducer`?

## Specification

- In `src/ingress/`, add scanning of project root directory for active feature issues:
  - Check `docs/features/<feature-slug>/issues/*.md` to parse issue counts, slugs, and resolution states (`Status: resolved`).
  - Fall back to subagent sessions (`parentID != null`, counting `succeeded` vs `running`) and recent git commits when `docs/features/` does not exist.
- Introduce `tasks.hydrated` / `goal.progress` telemetry event in `src/types/domain.ts` and dispatch through `WorldStateReducer`.
- Update `GuildSnapshot` or room state to include active task/issue telemetry: `totalTasks`, `resolvedTasks`, and task item descriptors.
- Verify through unit tests in `tests/`.

## Answer

Implemented `src/ingress/issue-tracker-scanner.ts` with `scanProjectIssueTracker` and `deriveProjectTaskProgress` to scan `docs/features/<active-feature>/issues/*.md` and extract total tasks, slugs, titles, and resolution status (falling back to subagents when absent). Added `tasks.hydrated` telemetry event to `TelemetryEvent`, updated `WorkshopRoomState.taskProgress`, and wired location sweep dispatch in `opencode-client-adapter.ts`. Verified with 3 new automated test slices (80/80 total tests pass).
