# 01: Ingress Detection for Tool & Conversational User Questions

Type: task
Label: wayfinder:task
Status: resolved

## Question

How should `src/ingress/daemon-message-hydration.ts` and `src/ingress/daemon-location-state.ts` detect when a session is waiting for user answer or clarification from either an active `question` tool call or an assistant turn ending with a question?

## Specification

- In `src/ingress/daemon-message-hydration.ts`:
  - Inspect the most recent message in the session history.
  - Detect an active/pending `question` tool invocation (`part.type === "tool"` with `tool === "question"` / `name === "question"` and `status === "running" | "pending"`).
  - Detect when the latest message is from the assistant (after any user message) and its text content asks the user for an answer or clarification (e.g., contains `❓` grilling/wayfinder question blocks or ends with a question mark `?`).
  - Surface a structured `pendingQuestion?: { gateId: string; title: string; reason: string } | null` on `SessionMessageHydration`.
- In `src/ingress/daemon-location-state.ts`:
  - Merge hydrated `pendingQuestion` entries (from `SessionMessageHydration`) with `/api/form` pending questions into `pendingQuestions` so the location snapshot reports all sessions waiting for user input.
- In `src/ingress/issue-tracker-scanner.ts`:
  - Normalize `/c/Users/...` paths to `/mnt/c/Users/...` when running on Linux/WSL so `scanProjectIssueTracker` resolves `docs/features/waiting-for-user-input-state/issues/*.md` for the Goal Assembly Site.
- Add unit tests in `tests/` covering both `question` tool hydration and conversational assistant question detection (and verifying that once a newer user message arrives or a non-question assistant reply completes, `pendingQuestion` is `null`).

## Answer

Updated `hydrateSessionMessages` in `src/ingress/daemon-message-hydration.ts` to inspect the latest turn (skipping trailing `idle` and `synthetic` entries) and populate `pendingQuestion` when either an active `question` tool call is running/pending or the latest assistant message asks the user a conversational question (`❓` grilling prompts or trailing `?` after stripping `➡️` recommendations). Wired `fetchDaemonLocationState` in `src/ingress/daemon-location-state.ts` to merge hydrated `pendingQuestion` entries into `pendingQuestions`, and added cross-OS path resolution (`/mnt/c/...`, `/c/...`, `C:/...`) in `src/ingress/issue-tracker-scanner.ts`.
