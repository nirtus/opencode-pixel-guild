# Feature Specification: Continuous In-Place Compaction Exhalation (Without Visualizer Auto-Compaction on Read)

## 1. Overview & Problem Statement

When a root **Guild Adventurer** finishes a turn (`session.idle`), it transitions to `RestingInLounge` in the **Break Lounge** with an unread result (`hasUnviewedResult = true`, overhead label `✓ Result Ready`, `⚠️ Turn Failed`, or `⏹ Interrupted`). When the user reads the result—by clicking the character's unread result in the **Guild Master Ledger** (`Overview` → `Completed Session Results (Unread)`), opening the **Character Sheet** `Chat` tab (`acknowledgeSessionResultAsRead` → `POST /api/guild/command` `{ command: "session.view" }`), or viewing the session in OpenCode (`session.viewed` SSE)—the session's unread badge clears (`POST /api/session/{sessionID}/view`) **without** the visualizer triggering `POST /api/session/{sessionID}/compact`.

When OpenCode V2 itself executes session compaction (`POST /api/session/{sessionID}/compact`), it emits a multi-event lifecycle on `GET /api/event`:
1. `session.inbox.enqueued` (`item.type === "compaction"`) & `session.inbox.delivered`
2. `session.execution.started` (when triggered on an idle session)
3. `session.compaction.started`
4. `session.compaction.delta` (streaming summary chunks)
5. `session.compaction.ended` (or `session.compaction.failed`), followed by `session.usage.updated`, `session.execution.succeeded`, and `session.idle`

## 2. Requirements & Invariants

1. **Read Acknowledgment Without Visualizer Auto-Compaction (`src/ingress/daemon-command-ops.ts`, `src/server/command-router.ts`, `src/ingress/opencode-client-adapter.ts`, `src/web/command-scroll-controller.ts`)**:
   - Reading a resting session's result via `acknowledgeSessionResultAsRead`, `session.view`, or `session.viewed` marks the session as read (`POST /api/session/${encodeURIComponent(sessionId)}/view${query}`) and clears `hasUnviewedResult = false`, keeping the character in `RestingInLounge` without invoking `POST /api/session/{sessionID}/compact` or dispatching synthetic `session.compacting`.

2. **Full OpenCode Compaction Lifecycle Mapping (`src/types/telemetry-types.ts`, `src/ingress/daemon-sse-mapper.ts`)**:
   - Add `session.compacting` to `NormalizedTelemetryEvent` (or map `session.compaction.started` and `session.compaction.delta` to `{ type: "session.compacting", timestampMs, sessionId }`).
   - Map `session.compacted`, `session.compaction.ended`, `session.compaction.completed`, and `session.compaction.failed` to `{ type: "session.compacted", timestampMs, sessionId, tokens }`.
   - In `session.inbox.enqueued` (`src/ingress/daemon-sse-mapper.ts`), inspect `props.item?.type ?? props.type`: when `itemType === "compaction"`, emit `{ type: "session.compacting", timestampMs, sessionId }` instead of `message.user.prompt`.

3. **Continuous In-Place Compaction Exhalation Until Completion (`src/state/session-handlers.ts`, `src/state/batch-reconciler.ts`)**:
   - When `session.compacting` arrives (`handleSessionCompacting`):
     - Remember whether the character started compaction from rest (`wasResting = char.lifecycleState === "RestingInLounge" || char.lifecycleState === "Archived" || (char.lifecycleState === "DistillingContextMana" && char.deferredLifecycleState === "RestingInLounge")`).
     - Transition `char.lifecycleState = "DistillingContextMana"`, preserve the character's current station/tile in place (keep `activePreparationStation = "Break Lounge"` when `wasResting`), set `char.deferredLifecycleState = wasResting ? "RestingInLounge" : "Thinking"`, and clear `char.dwellUntilMs = null` while compaction is actively running so `handleTimerTick` never prematurely ends the animation before `session.compacted` arrives.
   - While `char.lifecycleState === "DistillingContextMana"` and `char.dwellUntilMs === null` (compaction in flight):
     - Ignore intermediate `session.status` (`"thinking"` / `"working"`) events emitted by OpenCode's internal compaction execution loop (`handleSessionStatus`) so they do not overwrite `DistillingContextMana` or `deferredLifecycleState`.
   - When `session.compacted` (`session.compaction.ended` / `session.compaction.failed`) arrives (`handleSessionCompacted`):
     - Distill `char.contextMana`, increment `compactionCount`, record `lastDistilledAtMs = event.timestampMs`, and move `skillGrimoires` to `distilledSkillHistory`.
     - Preserve `wasResting` (`char.deferredLifecycleState === "RestingInLounge"` or `char.activePreparationStation === "Break Lounge"`).
     - Apply a minimum visual floor (`elapsed = event.timestampMs - char.stateEnteredAtMs`; if `elapsed < DISTILLING_CONTEXT_MANA_DWELL_MS`, set `char.dwellUntilMs = char.stateEnteredAtMs + DISTILLING_CONTEXT_MANA_DWELL_MS`; otherwise transition immediately to `wasResting ? "RestingInLounge" : "Thinking"`).
   - When trailing `session.idle` arrives immediately after or during a rest-initiated compaction (`char.deferredLifecycleState === "RestingInLounge"` or `char.contextMana.lastDistilledAtMs >= (char.idleAtMs ?? 0)` with `hasUnviewedResult === false`):
     - Do **not** set `char.hasUnviewedResult = true` again and do **not** advance `char.idleAtMs` past `char.viewedAtMs`, preventing post-compaction `session.idle` from resurrecting `✓ Result Ready` or causing a compaction loop.

4. **Strict Zero-Movement In-Place Compaction & Suppression from General Tab Unread Results (`src/web/station-and-workflow-routing.ts`, `src/web/client-choreography.ts`, `src/web/walker-separation.ts`, `src/ingress/daemon-message-hydration.ts`, `src/ingress/daemon-location-state.ts`, `src/ingress/opencode-client-adapter.ts`)**:
   - When `c.lifecycleState === "DistillingContextMana"`:
     - Freeze the character at the exact `(walker.currentX, walker.currentY)` coordinates where they were when compaction started (`isWalking = false`, `waypoints = []`, `slotQueue = []`, `targetX = currentX`, `targetY = currentY`, `overheadLabel: "Compacting..."`, `poseMode: "exhale"`) and preserve their sticky seat/station after compaction completes so the character never moves a single pixel during or after compaction.
   - Compaction operations (`agent: "compaction"`, `mode: "compaction"`, `summary: true`, `part.type === "compaction"`, and post-compaction `session.idle` / `time.idle`) must **never** be added to the `Completed Session Results (Unread)` view in the `General` tab (`Guild Master Ledger`) and must never overwrite the session's `lastAssistantText` turn result preview.

## 3. Container Deployment & Verification

- Deploy to and test on the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`), run `npm test`, and capture/inspect headless Chrome visual proof in `docs/images/`.
