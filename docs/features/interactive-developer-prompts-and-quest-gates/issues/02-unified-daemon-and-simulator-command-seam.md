# 02: Unified Daemon & Simulator Command Seam (`POST /api/guild/command`)

Type: grilling
Label: wayfinder:grilling
Status: resolved
Blocked by: 01

## Question

How should the companion server expose a single deep command interface that supports sending prompts (`scroll.send`), interrupting active turns (`turn.interrupt`), summoning new root sessions (`adventurer.summon`), and resolving permission/form/conversational Quest Gates (`gate.resolve`) identically across both the Live OpenCode V2 HTTP Daemon and the Demo Guild Simulator?

## Specification

### 1. Discriminated Union Contract (`src/types/command-types.ts`)
Define the 4-branch discriminated union `GuildCommandRequest` and unified response `GuildCommandResult`:
```ts
export type GuildCommandRequest =
  | {
      readonly command: "scroll.send";
      readonly sessionId: string;
      readonly directory?: string;
      readonly promptText: string;
      readonly delivery?: "steer" | "queue";
      readonly skills?: readonly string[];
      readonly agentClass?: string;
      readonly modelId?: string;
    }
  | {
      readonly command: "turn.interrupt";
      readonly sessionId: string;
      readonly directory?: string;
    }
  | {
      readonly command: "adventurer.summon";
      readonly directory: string;
      readonly title?: string;
      readonly agentClass?: string;
      readonly modelId?: string;
      readonly promptText?: string;
      readonly skills?: readonly string[];
    }
  | {
      readonly command: "gate.resolve";
      readonly sessionId: string;
      readonly gateId: string;
      readonly directory?: string;
      readonly kind: "permission" | "question";
      readonly source?: "permission" | "form" | "conversational";
      readonly decision?: "once" | "always" | "reject";
      readonly answers?: Readonly<Record<string, string | readonly string[]>>;
      readonly promptText?: string;
    };

export interface GuildCommandResult {
  readonly ok: boolean;
  readonly command: GuildCommandRequest["command"];
  readonly adapter: TelemetryAdapterKind;
  readonly sessionId: string | null;
  readonly gateId?: string | null;
  readonly error?: string;
  readonly delta: GuildDelta;
  readonly snapshot: GuildSnapshot;
}
```

### 2. Live OpenCode V2 Daemon Command Operations (`src/ingress/daemon-command-ops.ts`)
Create `src/ingress/daemon-command-ops.ts` (~220 lines) and expose `executeCommand?(cmd: GuildCommandRequest): Promise<{ ok: boolean; sessionId?: string; error?: string }>` on `OpenCodeDaemonClientPort`:
- **`scroll.send`**:
  - Extracts `@skill-name` tokens from `promptText` and merges with `cmd.skills`.
  - Calls `POST /api/session/{sessionID}/prompt?location[directory]=...` with header `x-opencode-directory` and JSON body:
    ```json
    {
      "text": "<promptText>",
      "parts": [{ "type": "text", "text": "<promptText>" }],
      "skills": ["..."],
      "agent": "<agentClass>",
      "delivery": "steer"
    }
    ```
- **`turn.interrupt`**:
  - Calls `POST /api/session/{sessionID}/interrupt?location[directory]=...`.
- **`adventurer.summon`**:
  - Step 1: Calls `POST /api/session?location[directory]=...` with `{ title, agent: agentClass, model: modelId, directory }` and extracts the created `sessionId` (`id` or `sessionID`).
  - Step 2: If `cmd.promptText?.trim()` is non-empty, immediately calls `POST /api/session/{sessionID}/prompt?location[directory]=...` with the initial prompt and `@skill` attachments.
- **`gate.resolve`**:
  - If `kind === "permission"` (or `source === "permission"`): calls `POST /api/session/{sessionID}/permission/{requestID}/reply?location[directory]=...` with `{ reply: decision ?? "once", decision: decision ?? "once" }`.
  - If `kind === "question"` and `source === "form"` (and `gateId` is not a synthetic `question:<sessionId>:...` conversational ID): calls `POST /api/session/{sessionID}/form/{formID}/reply?location[directory]=...` with `{ answers, data: answers }`; if the daemon returns 404 (e.g. a `question` tool call waiting on a user turn reply), gracefully falls back to `POST /api/session/{sessionID}/prompt` with formatted answer text.
  - If `source === "conversational"` (or fallback): formats `answers` / `promptText` into a concise user reply and calls `POST /api/session/{sessionID}/prompt?location[directory]=...`.

### 3. Server Command Router (`src/server/command-router.ts`)
Create `src/server/command-router.ts` (~240 lines) and delegate `POST /api/guild/command` from `src/server/api-router.ts`:
- Validates the incoming `GuildCommandRequest` payload (returning `400 Bad Request` on missing required fields).
- Invokes `daemonClient.executeCommand(cmd)` when `activeAdapter === "opencode-client"` and `daemonClient` is present.
- Immediately dispatches optimistic `TelemetryEvent`s into `activeReducer` (`message.user.prompt`, `session.idle`, `session.upserted`, `permission.resolved`, `question.resolved`) so the character sprite and HUD react with zero latency.
- In `demo-simulator` mode (or when no live daemon is attached), schedules a realistic simulated follow-up lifecycle sequence (`src/simulator/interactive-command-simulator.ts`) so the developer can test all 4 interactive flows end-to-end in Demo Simulator mode as well.

## Answer

Settled in Q1 & Q3 of the design phase:
1. All interactive developer actions route through a single discriminated-union endpoint `POST /api/guild/command` (`dispatchGuildCommand(cmd: GuildCommandRequest)`), keeping `src/server/api-router.ts` slim and providing a single seam for both live OpenCode V2 HTTP calls (`src/ingress/daemon-command-ops.ts`) and Demo Simulator choreography.
2. `@skill` mentions in prompts are parsed once and forwarded both to the OpenCode V2 prompt endpoint and to the reducer (`message.user.prompt`), equipping the Skill Grimoire and routing the character to the Arcane Lectern.
