# Feature Map: Waiting for User Input State & Overhead Question Mark

Label: wayfinder:map

## Destination

Deliver the `waiting-for-user-input-state` feature (`docs/features/waiting-for-user-input-state/spec.md`) so that any character waiting on a user answer or clarification—whether via an explicit `question` tool / form Quest Gate or a conversational question at the end of an assistant turn—remains in a waiting state at their last active Preparation Station (defaulting to the Arcane Lectern) with a `?` over their head instead of resting in the Break Lounge.

## Notes

- **Domain**: OpenCode V2 session message hydration, world state reduction (`BlockedAtQuestGate`), station choreography routing, and 2D Canvas hero rendering.
- **Rules**: Strictly use the project root directory (`./`). Never create external worktrees or use `/tmp/opencode`. Keep every source file under 400 lines. Verify visual changes with a live headless Chrome screenshot on port `4310`.
- **Skills to consult**: `codebase-design`, `domain-modeling`, `tdd`.

## Decisions so far

<!-- the index: one line per closed ticket, enough to judge relevance, then zoom the link for the detail the ticket holds -->

- [01: Ingress Detection for Tool & Conversational User Questions](./issues/01-ingress-conversational-and-tool-question-detection.md): Hydrates `pendingQuestion` from both running `question` tool calls and assistant turns ending with user questions (`❓` or trailing `?`), merging them into `pendingQuestions` in `fetchDaemonLocationState`.
- [02: Waiting State Reducer & Quest Gate Reconciliation](./issues/02-waiting-state-reducer-and-quest-gate-reconciliation.md): Transitions characters to `BlockedAtQuestGate` (`marker: "?"`) on `question` tool calls and `pendingQuestions` reconciliation while preserving their last active workstation, and clears the gate when the user responds.
- [03: Station Routing & Overhead Question Mark Rendering](./issues/03-station-routing-and-overhead-question-mark-rendering.md): Keeps waiting characters at their last active Preparation Station (or Arcane Lectern by default) with a bobbing `?` over their head (`questMarker: "?"`, `overheadLabel: ""`) instead of sending them to the Break Lounge.

## Not yet specified

<!-- in-scope fog you can't ticket yet; graduates as the frontier advances -->

## Out of scope

- Interactive answering of OpenCode TUI prompts from inside the read-only spectator web companion.
- Changing Break Lounge behavior for normal completed turns that do not ask the user a question.
