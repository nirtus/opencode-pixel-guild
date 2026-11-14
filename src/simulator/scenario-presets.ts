import type {
  GuildSnapshot,
  GuildStateEmission,
  TelemetryEvent,
} from "../types/domain.ts";
import {
  COMPACTION_AND_QUEST_GATE_EVENTS,
  MCP_AUTH_AND_FAILURE_EVENTS,
  PLUGIN_ALCOVE_CODEMODE_EVENTS,
  PRIMARY_HALL_DIR,
  WORKTREE_ANNEX_DIR,
  WORKTREE_ANNEXATION_EVENTS,
} from "./scenario-events.ts";

export {
  COMPACTION_AND_QUEST_GATE_EVENTS,
  MCP_AUTH_AND_FAILURE_EVENTS,
  PLUGIN_ALCOVE_CODEMODE_EVENTS,
  PRIMARY_HALL_DIR,
  WORKTREE_ANNEX_DIR,
  WORKTREE_ANNEXATION_EVENTS,
};

export const DEMO_SCENARIO_PRESET_IDS = [
  "cohabited-guild-hall",
  "skill-grimoire-squad",
  "plugin-alcove-codemode",
  "mcp-auth-and-failure",
  "worktree-annexation",
  "compaction-and-quest-gate",
] as const;

export type DemoScenarioPresetId = (typeof DEMO_SCENARIO_PRESET_IDS)[number];

export interface DemoScenarioPreset {
  readonly id: DemoScenarioPresetId;
  readonly title: string;
  readonly description: string;
  readonly events: readonly TelemetryEvent[];
}

export interface DemoScenarioRunResult {
  readonly preset: DemoScenarioPreset;
  readonly snapshot: GuildSnapshot;
  readonly emissions: readonly GuildStateEmission[];
}

export const DEMO_SCENARIO_PRESETS: Readonly<
  Record<DemoScenarioPresetId, DemoScenarioPreset>
> = Object.freeze({
  "cohabited-guild-hall": Object.freeze({
    id: "cohabited-guild-hall",
    title: "Cohabited Guild Hall",
    description:
      "Multiple top-level Guild Adventurers co-habiting a single Workshop Room across Anvil Forge and Library Study Bookshelf.",
    events: Object.freeze<TelemetryEvent[]>([
      {
        type: "adapter.switched",
        timestampMs: 1_000,
        adapter: "demo-simulator",
        daemonUrl: "http://127.0.0.1:4096",
      },
      {
        type: "location.discovered",
        timestampMs: 1_050,
        locationDirectory: PRIMARY_HALL_DIR,
        projectId: "proj-pixel-guild",
        projectName: "opencode-pixel-guild",
        isWorktree: false,
      },
      {
        type: "session.upserted",
        timestampMs: 1_100,
        sessionId: "ses-hall-forge",
        locationDirectory: PRIMARY_HALL_DIR,
        title: "Implement Pixel Sprite Compositor",
        agentClass: "build",
        modelId: "anthropic/claude-sonnet-4",
        lastUserPromptText:
          "Apply @codebase-design to refactor `src/sprites/pixel-compositor.ts` and verify with `npm test`.",
        lastAssistantText: [
          "### Sprite Compositor Deepening Plan",
          "Inspected `src/sprites/pixel-compositor.ts` and consolidated palette lookup behind a **deep module** seam.",
          "- **Locality**: Layer blending now lives in `src/sprites/sprite-painter.ts`",
          "- **Verification**: Running `npm test` at the Anvil Forge",
          "```ts",
          "export function paintCharacterSprite(ctx: CanvasRenderingContext2D, spec: SpriteSpec): void {",
          "  renderLayeredSilhouette(ctx, spec, resolveRolePalette(spec.role));",
          "}",
          "```",
          "> Context Mana remains healthy at **27%** while compiling the sprite atlas.",
        ].join("\n"),
        tokens: {
          usedTokens: 54_000,
          limitTokens: 200_000,
          inputTokens: 42_000,
          outputTokens: 12_000,
          totalCostUsd: 0.38,
        },
      },
      {
        type: "session.upserted",
        timestampMs: 1_150,
        sessionId: "ses-hall-radar",
        locationDirectory: PRIMARY_HALL_DIR,
        title: "Audit Spatial Pathfinding Seams",
        agentClass: "explore",
        modelId: "anthropic/claude-haiku-4",
        tokens: {
          usedTokens: 28_000,
          limitTokens: 200_000,
          inputTokens: 22_000,
          outputTokens: 6_000,
          totalCostUsd: 0.09,
        },
      },
      {
        type: "session.upserted",
        timestampMs: 1_200,
        sessionId: "ses-hall-reactor",
        locationDirectory: PRIMARY_HALL_DIR,
        title: "Run Integration Test Matrix",
        agentClass: "general",
        modelId: "openai/gpt-5",
        tokens: {
          usedTokens: 82_000,
          limitTokens: 200_000,
          inputTokens: 65_000,
          outputTokens: 17_000,
          totalCostUsd: 0.61,
        },
      },
      {
        type: "tool.started",
        timestampMs: 1_900,
        sessionId: "ses-hall-forge",
        toolName: "shell",
        toolInput: { command: "npm run build -- src/sprites/pixel-compositor.ts" },
      },
      {
        type: "tool.started",
        timestampMs: 1_950,
        sessionId: "ses-hall-radar",
        toolName: "grep",
        toolInput: { pattern: "WORKSTATION_KINDS", path: "src/" },
      },
      {
        type: "tool.started",
        timestampMs: 2_000,
        sessionId: "ses-hall-reactor",
        toolName: "bash",
        toolInput: { command: "node --experimental-strip-types --test" },
      },
    ]),
  }),

  "skill-grimoire-squad": Object.freeze({
    id: "skill-grimoire-squad",
    title: "Skill Grimoire & Squad Inheritance",
    description:
      "Parent Guild Adventurer equips skills at the Armory Wardrobe via tool, prompt attachment, and skill item, then summons Squad Subagents at the Arcane Lectern that inherit the Grimoire stack.",
    events: Object.freeze<TelemetryEvent[]>([
      {
        type: "adapter.switched",
        timestampMs: 2_000,
        adapter: "demo-simulator",
        daemonUrl: "http://127.0.0.1:4096",
      },
      {
        type: "catalog.hydrated",
        timestampMs: 2_050,
        locationDirectory: PRIMARY_HALL_DIR,
        skills: [
          { id: "tdd", name: "Test-Driven Development" },
          { id: "codebase-design", name: "Codebase Design" },
          { id: "code-review", name: "Code Review" },
        ],
      },
      {
        type: "session.upserted",
        timestampMs: 2_100,
        sessionId: "ses-archmage",
        locationDirectory: PRIMARY_HALL_DIR,
        title: "Design Deep World-State Reducer",
        agentClass: "plan",
        modelId: "anthropic/claude-opus-4",
        tokens: {
          usedTokens: 96_000,
          limitTokens: 200_000,
          inputTokens: 76_000,
          outputTokens: 20_000,
          totalCostUsd: 1.85,
        },
      },
      {
        type: "skill.activated",
        timestampMs: 2_200,
        sessionId: "ses-archmage",
        skillId: "tdd",
        skillName: "Test-Driven Development",
        source: "skill-tool",
      },
      {
        type: "message.user.prompt",
        timestampMs: 2_300,
        sessionId: "ses-archmage",
        promptText: "Apply @codebase-design deep module principles",
        skills: ["codebase-design"],
      },
      {
        type: "message.skill.item",
        timestampMs: 2_400,
        sessionId: "ses-archmage",
        skillId: "code-review",
        skillName: "Code Review",
      },
      {
        type: "session.upserted",
        timestampMs: 2_500,
        sessionId: "ses-squad-alpha",
        parentId: "ses-archmage",
        locationDirectory: PRIMARY_HALL_DIR,
        title: "Verify Standards Compliance",
        agentClass: "explore",
        modelId: "anthropic/claude-haiku-4",
      },
      {
        type: "session.upserted",
        timestampMs: 2_550,
        sessionId: "ses-squad-beta",
        parentId: "ses-archmage",
        locationDirectory: PRIMARY_HALL_DIR,
        title: "Verify Spec Conformance",
        agentClass: "general",
        modelId: "anthropic/claude-sonnet-4",
      },
      {
        type: "session.idle",
        timestampMs: 3_200,
        sessionId: "ses-squad-alpha",
        summary: "All coding standards and boundary invariants verified.",
      },
    ]),
  }),

  "plugin-alcove-codemode": Object.freeze({
    id: "plugin-alcove-codemode",
    title: "Resource Stockpile & Code Mode Conduit",
    description:
      "Showcases Resource Stockpile MCP integrations, direct MCP tool calls, and multi-namespace Code Mode execute invocations at the Alchemy Lab.",
    events: PLUGIN_ALCOVE_CODEMODE_EVENTS,
  }),

  "mcp-auth-and-failure": Object.freeze({
    id: "mcp-auth-and-failure",
    title: "MCP Auth & Failure Diagnostics",
    description:
      "Demonstrates external MCP and plugin health states (connected, needs_auth, failed, disabled) with inspection error details and session retry telemetry.",
    events: MCP_AUTH_AND_FAILURE_EVENTS,
  }),

  "worktree-annexation": Object.freeze({
    id: "worktree-annexation",
    title: "Worktree Annexation & Session Migration",
    description:
      "Spawns an annexed git worktree Workshop Room linked to the primary hall and moves an active Guild Adventurer into the worktree annex.",
    events: WORKTREE_ANNEXATION_EVENTS,
  }),

  "compaction-and-quest-gate": Object.freeze({
    id: "compaction-and-quest-gate",
    title: "Compaction Exhalation & Quest Gates",
    description:
      "Demonstrates in-place Context Mana distillation via Compaction Exhalation alongside permission (!) and question (?) Quest Gate blocks.",
    events: COMPACTION_AND_QUEST_GATE_EVENTS,
  }),
});
