# Issue 01: Post-Rest Read Auto-Compaction & Continuous In-Place Compaction Exhalation

Type: task
Label: ready-for-agent
Status: resolved

## Goal

When a root **Guild Adventurer** has gone to rest in the **Break Lounge** (`RestingInLounge`) after finishing a turn, and the user reads the completed result (`acknowledgeSessionResultAsRead` / `session.view` / `session.viewed`), automatically compact the OpenCode session (`POST /api/session/{sessionID}/compact`) and play the in-place **Compaction Exhalation** animation (`DistillingContextMana` / `"exhale"` pose with `"Compacting..."` overhead label) continuously in the **Break Lounge** until compaction completes (`session.compaction.ended` / `session.compacted`).

## Acceptance Criteria

1. **Daemon Auto-Compaction on Read (`src/ingress/daemon-command-ops.ts`, `src/server/command-router.ts`, `src/types/command-types.ts`)**:
   - When `session.view` is executed for a resting root session (or via explicit `compactOnView` / `session.compact`), trigger `POST /api/session/${encodeURIComponent(cmd.sessionId)}/compact${query}` with `{ delivery: "steer" }` once per completed turn (`idleAtMs`), guarding against duplicate calls for the same turn.
   - In `command-router.ts` (`session.view`), if the character had an unviewed result (`hasUnviewedResult === true` or `idleAtMs > viewedAtMs`) and is resting (`RestingInLounge`), dispatch `session.compacting` to the state reducer immediately after `session.viewed` so the **Compaction Exhalation** animation starts without delay while the daemon runs compaction.
2. **OpenCode Compaction SSE Lifecycle (`src/types/telemetry-types.ts`, `src/ingress/daemon-sse-mapper.ts`)**:
   - Add `{ type: "session.compacting"; timestampMs: number; sessionId: string }` to `NormalizedTelemetryEvent`.
   - Map `session.compaction.started` and `session.compaction.delta` to `session.compacting`.
   - Map `session.inbox.enqueued` with `item.type === "compaction"` to `session.compacting` (never `message.user.prompt`).
   - Map `session.compacted | session.compaction.ended | session.compaction.completed | session.compaction.failed` to `session.compacted`.
3. **Continuous Compaction State & Post-Compaction Idle Suppression (`src/state/session-handlers.ts`, `src/state/batch-reconciler.ts`, `src/state/reducer.ts`)**:
   - Handle `session.compacting`: set `lifecycleState = "DistillingContextMana"`, `dwellUntilMs = null` (held open while compaction streams), and `deferredLifecycleState = "RestingInLounge"` when initiated from rest (or `"Thinking"` when initiated mid-turn).
   - While compacting (`lifecycleState === "DistillingContextMana"` and `dwellUntilMs === null`), ignore `session.status` (`"thinking"` / `"working"`) so OpenCode's compaction execution loop does not pull the resting character out of `DistillingContextMana` or overwrite `deferredLifecycleState`.
   - On `session.compacted`: distill **Context Mana**, increment `compactionCount`, move `skillGrimoires` to `distilledSkillHistory`, and either transition immediately to `deferredLifecycleState` (`"RestingInLounge"` or `"Thinking"`) if `>= 1200ms` already elapsed since `stateEnteredAtMs`, or set `dwellUntilMs = stateEnteredAtMs + 1200` as a minimum visual floor.
   - In `handleSessionIdle`: if the session is finishing a rest-initiated compaction (`char.lifecycleState === "DistillingContextMana" && char.deferredLifecycleState === "RestingInLounge"`, or compaction completed at/after `char.idleAtMs` with `char.hasUnviewedResult === false`), transition cleanly to `RestingInLounge` without re-setting `hasUnviewedResult = true` or advancing `idleAtMs` ahead of `viewedAtMs`.
4. **In-Place Break Lounge Choreography & Label (`src/web/station-and-workflow-routing.ts`, `src/web/command-scroll-controller.ts`)**:
   - Keep a character in `DistillingContextMana` with `deferredLifecycleState === "RestingInLounge"` (or `activePreparationStation === "Break Lounge"`) seated in its sticky **Break Lounge** slot (`station: "Lounge"`, `overheadLabel: "Compacting..."`, `poseMode: "exhale"`).
   - Optimistically set `ch.lifecycleState = "DistillingContextMana"` and `ch.deferredLifecycleState = "RestingInLounge"` in `acknowledgeSessionResultAsRead` (`src/web/command-scroll-controller.ts`) when marking a resting session's unread result as read so the **Compaction Exhalation** animation starts on the very frame the user clicks the result.
5. **Tests, Docs & Container Verification**:
   - Add unit & integration tests covering:
     - Reading a resting session's unread result triggers `POST /api/session/{id}/compact` and starts `DistillingContextMana` (`Compacting...` / `exhale` pose) in place in the **Break Lounge**.
     - `session.compaction.started`, `session.compaction.delta`, `session.inbox.enqueued` (`type: "compaction"`), and `session.execution.started` keep the character in `DistillingContextMana` in the **Break Lounge** until `session.compaction.ended` (`session.compacted`).
     - `session.compaction.ended` + trailing `session.idle` returns the character to `RestingInLounge` (`Resting`) without re-flagging `hasUnviewedResult = true`.
   - Update `README.md` and `GLOSSARY.md`.
   - Deploy to `opencode-pixel-guild-visualizer` (`npm run docker:up` on port `4310`), run `npm test`, and capture/inspect `docs/images/post-rest-read-compaction.png`.

## Answer

Removed visualizer-triggered post-rest read auto-compaction (`POST /api/session/{sessionID}/compact` on `session.view` / `session.viewed` / `acknowledgeSessionResultAsRead`) while preserving continuous in-place **Compaction Exhalation** (`DistillingContextMana` / `"exhale"` vapor cloud animation with `"Compacting..."` overhead label) whenever OpenCode compacts a session:

1. **Read Acknowledgment Without Auto-Compaction (`src/ingress/daemon-command-ops.ts`, `src/server/command-router.ts`, `src/ingress/opencode-client-adapter.ts`, `src/web/command-scroll-controller.ts`, `src/types/command-types.ts`)**:
   - Reading a resting root **Guild Adventurer**'s result marks the session viewed (`POST /api/session/{sessionID}/view` and `session.viewed`) and keeps the character in `RestingInLounge` without invoking `POST /api/session/{sessionID}/compact` or dispatching synthetic `session.compacting`.
2. **Full OpenCode Compaction SSE Lifecycle & Continuous Reducer State (`src/ingress/daemon-sse-mapper.ts`, `src/types/core-types.ts`, `src/state/session-handlers.ts`, `src/state/world-reducer.ts`, `src/state/armory-and-workflow.ts`)**:
   - Mapped `session.compaction.started`, `session.compaction.delta`, and `session.inbox.enqueued` (`item.type === "compaction"`) to `session.compacting`, holding `DistillingContextMana` open (`dwellUntilMs = null`) for the entire in-flight duration of compaction while ignoring intermediate `session.status` (`thinking` / `working`) pulses.
   - Mapped `session.compacted`, `session.compaction.ended`, `session.compaction.completed`, and `session.compaction.failed` to `session.compacted`, distilling **Context Mana** and returning the resting character to `RestingInLounge` (`Resting`) while suppressing false unread-result flags on the trailing `session.idle`.
3. **Zero-Movement In-Place Compaction Choreography & General Tab Unread Suppression (`src/web/station-and-workflow-routing.ts`, `src/web/client-choreography.ts`, `src/web/walker-separation.ts`, `src/web/station-slot-allocator.ts`, `src/ingress/daemon-message-hydration.ts`, `src/ingress/daemon-location-state.ts`)**:
   - Locked characters in `DistillingContextMana` to their exact `(currentX, currentY)` coordinates at the moment compaction started (`isWalking = false`, `waypoints = []`, `slotQueue = []`, `overheadLabel: "Compacting..."`, `poseMode: "exhale"`), and preserved sticky Lounge seat coordinates after compaction ends so the character never moves.
   - Filtered OpenCode internal compaction messages (`agent: "compaction"`, `mode: "compaction"`, `summary: true`, `part.type === "compaction"`), updated daemon `time.viewed` on compaction completion, and suppressed post-compaction `idleAtMs` across SSE and location sweeps so compaction operations are never added to the `Completed Session Results (Unread)` card in the `General` tab.
4. **Tests & Container Verification**:
   - Verified `288/288` tests pass (`npm test`, including `tests/34-unviewed-session-result-retention.test.ts` and `tests/00-architecture-invariants.test.ts`).
   - Deployed to `opencode-pixel-guild-visualizer` (`npm run docker:up` on `0.0.0.0:4310->4310/tcp`), verified `GET /api/guild/snapshot` (`200 OK`), and visually inspected `docs/images/post-rest-read-compaction.png`.
