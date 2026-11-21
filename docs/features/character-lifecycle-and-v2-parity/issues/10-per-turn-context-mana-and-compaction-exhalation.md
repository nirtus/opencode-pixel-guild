# 10: Per-Turn Context Mana Utilization & Single-Pulse Compaction Exhalation

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 02: Stateful OpenCode V2 SSE Event Decoder for Tools, Prompts, Skills & Identity, 03: Strict V2 Message-Union Hydration, Worktree Parity & Agent Command Endpoint Alignment

**What to build:** Compute **Context Mana** (`usedTokens` and `fillRatio`) strictly from the active turn's context-window token usage (`Session.Message.Assistant.tokens` / `session.step.ended`) rather than cumulative multi-turn `Session.Info.tokens`, prevent `session.usage.updated` from waking idle characters into `WorkingAtStation` or pinning **Context Mana** at `100%`, and trigger **Compaction Exhalation** only once on `session.compaction.ended`.

- [x] Separate active-turn `contextWindowTokens` (from the latest assistant message's `tokens` in `hydrateSessionMessages` and `session.step.ended` over SSE) from cumulative session lifetime `Session.Info.tokens` (`input`, `output`, `cache.read`, `cache.write`, `cost`).
- [x] Update `createInitialContextMana` and `updateContextMana` (`src/state/context-mana.ts` and `src/ingress/daemon-mcp-normalizer.ts`) so `usedTokens` and `fillRatio` reflect the latest turn's context utilization against the model's `limitContext`, while preserving cumulative session tokens and USD cost for telemetry display.
- [x] Update `daemon-sse-mapper.ts` so `session.usage.updated` updates cumulative token/cost telemetry without emitting `status: "working"` (which falsely wakes idle sessions into `WorkingAtStation`) and without overwriting active-turn `usedTokens`.
- [x] Update `daemon-sse-mapper.ts` so only `session.compaction.ended` (and `session.compacted`) emits `session.compacted`, ignoring `session.compaction.started` and streaming `session.compaction.delta` chunks so `compactionCount` increments once per compaction.
- [x] Add unit tests verifying that multi-turn cumulative `Session.Info.tokens` and `session.usage.updated` events do not pin **Context Mana** at 100% or wake idle characters, and that streaming compaction deltas only trigger a single **Compaction Exhalation**, keeping all `src/**` files `<= 400` lines.

## Answer

Updated `daemon-sse-mapper.ts` so `session.step.ended` computes turn context utilization while `session.usage.updated` updates cumulative token/cost counters without emitting `status: "working"` or overwriting `usedTokens`; restricted compaction SSE mapping to `session.compacted` / `session.compaction.ended` / `session.compaction.completed`; and updated `updateContextMana` in `src/state/context-mana.ts` so cumulative `input + output` never clobbers an existing turn's `usedTokens`.
