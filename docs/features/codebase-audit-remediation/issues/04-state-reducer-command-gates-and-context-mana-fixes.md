# 04: Daemon Command Failure Gating, Quest Gate Field Isolation, Context Mana & Tool Completion Fixes

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01

**What to build:** Gate optimistic reducer state mutations on OpenCode daemon command success, isolate **Quest Gate** fields across distinct gate identifiers while allowing legitimate repeat questions in subsequent turns, fix **Context Mana** token usage updates after Turn 1 and context limit updates on model switches, and fix parallel tool completion, snapshot plugin alcove hydration, and reconnect **Quest Gate** recovery.

**Blocked by:** 01: Server Auth Enforcement, Registered Room Validation & Request Body Limits

**Status:** resolved

## Acceptance Criteria

- [x] Every modified or created source module remains strictly `<= 400` lines.
- [x] When `scroll.send`, `agent.switch`, `turn.interrupt`, or `gate.resolve` fails on the OpenCode daemon (`daemonRes.ok === false`), the command router returns an error without dispatching optimistic state transitions into the world state reducer (keeping a blocking **Quest Gate** visible if resolution failed).
- [x] Opening a **Quest Gate** whose gate identifier differs from the character's existing gate clears the previous gate before merging fields so prior multi-question fields never bleed into a new question, preserves incoming structured field keys, deduplicates `Yes`/`No` recommended options, and clears per-session resolved question text sets on new user turns so repeat confirmations are not suppressed.
- [x] **Context Mana** recomputes `usedTokens` from component token counts (`inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens`) on every usage update that omits an explicit `usedTokens` total (not only when `usedTokens === 0`), and always updates `limitTokens` to the resolved model limit when a session switches models or hydrates model catalog limits.
- [x] Tool completion passes `input` (not `inputPreview`) to capability classification, preserves **Resource Cargo** on fallback tool records, records resolved **Quest Gates** when a `question` tool completes, and keeps the character in `WorkingAtStation` while any sibling tool in `recentTools` is still `running`.
- [x] Snapshot hydration populates `roomAllPlugins` from hydrated alcoves and syncs **Lifetime Tribute** records before pruning demolished rooms, and location sweep reconciliation transitions active sessions out of `BlockedAtQuestGate` when their gate is cleared.
- [x] Automated unit and integration tests verify daemon command failure gating, **Quest Gate** field isolation, Turn 2+ **Context Mana** updates, and parallel tool completion, verified on the `opencode-pixel-guild-visualizer` Docker container.

## Answer

- **Daemon Command Failure Gating (`src/server/command-router.ts`)**: Gated optimistic reducer state mutations for `scroll.send`, `agent.switch`, `turn.interrupt`, and `gate.resolve` on `daemonRes.ok !== false`, returning an unmutated `snapshot` with `ok: false`, `error`, and `daemonResult` whenever the OpenCode daemon rejects a command, and attached `.catch(() => {})` to post-command `sweepAllLocations` timers.
- **Quest Gate Field Isolation, Option Deduplication & Multi-Turn Repeat Question Reopening (`src/state/quest-gate-handlers.ts`, `src/types/question-parser.ts`, `src/state/tool-and-gate-handlers.ts`, `src/state/snapshot-builder.ts`, `src/state/world-reducer.ts`)**: Cleared `char.questGate` before merging fields when an incoming gate's `gateId` differs in `buildQuestionToolQuestGate` and `handleQuestGateOpened`, preserved non-generic structured field keys over generic `q0` fallback keys in `mergeQuestGateFields`, deduplicated explicit `Yes`/`No` bullets against `Yes (Recommended)` / `No (Recommended)` in `extractOptionsFromQuestionText`, stopped permanently blacklisting generic `question:${sessionId}` keys in `handleQuestGateResolved`, and cleared per-session resolved question reasons and conversational gate hashes on new user turns (`handleMessageUserPrompt`), session deletion, and `reducer.reset()`.
- **Context Mana Multi-Turn & Model-Switch Accuracy (`src/state/context-mana.ts`, `src/ingress/daemon-sse-mapper.ts`, `src/state/batch-reconciler.ts`)**: Updated `createInitialContextMana` and `updateContextMana` to recompute `usedTokens` from component token counts (`inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens`) across all turns whenever `usedTokens` is omitted (while preserving active turn `usedTokens` on `cumulativeOnly` `session.usage.updated` frames), updated `limitTokens` whenever `modelId` switches or `catalog.hydrated` updates model limits, and recorded updated characters in `collector.changedCharacterIds`.
- **Parallel Tool Completion, Snapshot Plugin Hydration & Reconnect Recovery (`src/state/tool-and-gate-handlers.ts`, `src/state/world-reducer.ts`, `src/state/batch-reconciler.ts`)**: Passed `input: rawInputPreview` to `classifyCapability` and populated `resourceCargo` on fallback `tool.completed` records, recorded resolved `question` gates on `tool.completed`, kept characters in `WorkingAtStation` while sibling tools in `recentTools` remain `running`, populated `roomAllPlugins` and fallback `roomOrder` while syncing `tributeLedger` before deleting `deletedRoomIds` in `hydrateFromSnapshot`, and transitioned active sessions out of `BlockedAtQuestGate` into `Thinking` on `stream.reconnected` when their gate is cleared.
