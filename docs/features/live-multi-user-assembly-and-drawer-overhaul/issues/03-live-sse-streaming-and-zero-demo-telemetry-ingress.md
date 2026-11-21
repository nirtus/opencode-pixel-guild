# 03: Real-Time OpenCode SSE Streaming, Parallel Delta Hydration & Zero Demo Pollution

**What to build:** True real-time live telemetry from the paired OpenCode daemon to the visualizer with zero synthetic demo interference. Assistant text deltas (`message.part.updated` with `type: "text"`), user prompts, and tool updates stream directly over SSE into the reducer in sub-100ms real time; incremental session events resolve their **Workshop Room** directory from an adapter session-location cache instead of defaulting to `"/"`; sequential N+1 location sweeps and the 10 post-command polling timers are replaced with parallel TTL-cached sweeps and immediate post-tool targeted hydration; and live mode never injects fake **Demo Guild Simulator** characters into empty rooms.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] OpenCode SSE frame mapping handles `message.part.updated` (`type: "text"` and `type: "tool"`), `message.updated`, and `message.created`, updating `lastAssistantText` and `lastUserPromptText` live without waiting for the 15-second HTTP sweep.
- [x] The live client adapter maintains a `sessionId -> locationDirectory` lookup table so SSE events that omit `location.directory` map to their actual **Workshop Room** rather than `"/"`.
- [x] Location sweeps hydrate discovered locations in parallel (`Promise.all`) and cache static capability catalogs (`skills`, `plugins`, `models`, `agents`) with a 60s TTL, eliminating the 90+ sequential HTTP request bottleneck.
- [x] Completing a file-mutating or shell tool (`edit`, `write`, `apply_patch`, `bash`, `execute`) or `session.idle` triggers an immediate targeted room hydration without waiting for the 15s timer, and redundant client-side `setTimeout` snapshot polls after commands are removed.
- [x] When operating in live `opencode-client` mode, the 4 hardcoded fallback demo characters (`Archivist`, `Forge Smith`, `Artificer`, `Vanguard`) are never rendered; a room with 0 live sessions renders as an authentic empty **Workshop Room**.
- [x] Automated tests verify live SSE text streaming, cached session directory resolution, and zero fake characters in live mode, and all source files remain `<= 400` lines.
