# 09: Authoritative Quest Gate Lifecycle (`Permission.Request`, `Form.Info` IDs, Time-Scoped Conversational `?`) & Clean Turn Termination

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 02: Stateful OpenCode V2 SSE Event Decoder for Tools, Prompts, Skills & Identity, 03: Strict V2 Message-Union Hydration, Worktree Parity & Agent Command Endpoint Alignment

**What to build:** Fix OpenCode V2 **Quest Gate** resolution over SSE and HTTP (`permission.replied` via `requestID`, `form.created` via `data.form`, `form.cancelled` via `data.id`, and binding `source: "form"` gates to `Form.ID` `frm_...` instead of `call_...`), expire stale conversational `?` gates on historical idle sessions so they are never permanently locked in `BlockedAtQuestGate`, and transition `session.error`, `session.execution.failed`, and `session.execution.interrupted` to `RestingInLounge` so stopped sessions never stay in **Dungeon Wilds** combat.

- [x] Update `daemon-sse-mapper.ts` to extract `props.requestID` on `permission.replied`, unwrap `props.form` on `form.created`, and map `form.cancelled` to `question.resolved`.
- [x] Correlate hydrated `question` tool calls with pending `Form.Info` records (`id: "frm_..."`) from `GET /api/form` / `form.created` so `POST /api/session/{sessionID}/form/{formID}/reply` uses the valid `Form.ID` (`^frm_`) rather than the tool call ID (`call_...`).
- [x] Scope `source: "conversational"` `?` **Quest Gates** to assistant turns completed within the last `10 minutes` (`CONVERSATIONAL_GATE_MAX_AGE_MS = 600_000`) on non-archived sessions, and automatically expire older conversational `?` gates into `RestingInLounge` during `handleStreamReconnected` and `handleTimerTick` (excluding conversational `?` gates from **Dungeon Wilds** monster threat counts).
- [x] Update `handleSessionError` and `session.execution.failed` / `session.execution.interrupted` handling to transition the character to `RestingInLounge` (clearing `activeCapability`, `activeWorkstation`, and `dwellUntilMs`) so stopped failed turns do not trigger active **Dungeon Wilds** combat.
- [x] Add unit tests verifying `permission.replied` (`requestID`), `form.created` (`data.form`), `form.cancelled`, `frm_...` form replies, automatic expiration of historical conversational `?` gates, and `RestingInLounge` transition on `session.error` / `session.execution.interrupted`, keeping all `src/**` files `<= 400` lines.

## Answer

Updated `daemon-sse-mapper.ts` to resolve `requestID` on `permission.replied`, unwrap `data.form` on `form.created`, and handle `form.cancelled`; merged `GET /api/form` `frm_...` gate IDs with hydrated question fields in `fetchDaemonLocationState`; scoped `conversational` `?` gates to turns `<= 10 minutes` old and expired stale conversational gates in `handleTimerTick`; and transitioned `handleSessionError` to `RestingInLounge`.
