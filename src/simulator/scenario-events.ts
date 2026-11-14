import type { TelemetryEvent } from "../types/domain.ts";

export const PRIMARY_HALL_DIR = "/workspace/opencode-pixel-guild";
export const WORKTREE_ANNEX_DIR =
  "/workspace/opencode-pixel-guild/.worktrees/ticket-05";

export const PLUGIN_ALCOVE_CODEMODE_EVENTS: readonly TelemetryEvent[] =
  Object.freeze<TelemetryEvent[]>([
    {
      type: "adapter.switched",
      timestampMs: 3_000,
      adapter: "demo-simulator",
      daemonUrl: "http://127.0.0.1:4096",
    },
    {
      type: "catalog.hydrated",
      timestampMs: 3_050,
      locationDirectory: PRIMARY_HALL_DIR,
      plugins: [
        { namespace: "github", name: "GitHub MCP", status: "connected" },
        { namespace: "linear", name: "Linear MCP", status: "connected" },
        { namespace: "postgres", name: "Postgres MCP", status: "connected" },
        { namespace: "sentry", name: "Sentry MCP", status: "connected" },
        { namespace: "slack", name: "Slack MCP", status: "connected" },
        { namespace: "playwright", name: "Playwright MCP", status: "connected" },
      ],
    },
    {
      type: "session.upserted",
      timestampMs: 3_100,
      sessionId: "ses-plugin-direct",
      locationDirectory: PRIMARY_HALL_DIR,
      title: "Sync GitHub Release Notes",
      agentClass: "build",
      modelId: "anthropic/claude-sonnet-4",
    },
    {
      type: "session.upserted",
      timestampMs: 3_150,
      sessionId: "ses-codemode-multi",
      locationDirectory: PRIMARY_HALL_DIR,
      title: "Cross-Service Release Automation",
      agentClass: "general",
      modelId: "openai/gpt-5",
    },
    {
      type: "tool.started",
      timestampMs: 3_800,
      sessionId: "ses-plugin-direct",
      toolName: "github_create_release",
      toolInput: { tag: "v1.0.0", draft: false },
    },
    {
      type: "tool.started",
      timestampMs: 3_900,
      sessionId: "ses-codemode-multi",
      toolName: "execute",
      toolInput: {
        code: "const pr = await tools.github.getPullRequest({ number: 42 }); await tools.linear.updateIssue({ id: 'OC-42', state: 'Done' }); await tools.sentry.resolveIssue({ id: 'SEN-9' });",
      },
    },
  ]);

export const MCP_AUTH_AND_FAILURE_EVENTS: readonly TelemetryEvent[] =
  Object.freeze<TelemetryEvent[]>([
    {
      type: "adapter.switched",
      timestampMs: 4_000,
      adapter: "demo-simulator",
      daemonUrl: "http://127.0.0.1:4096",
    },
    {
      type: "catalog.hydrated",
      timestampMs: 4_050,
      locationDirectory: PRIMARY_HALL_DIR,
      plugins: [
        { namespace: "github", name: "GitHub MCP", status: "connected" },
        {
          namespace: "linear",
          name: "Linear MCP",
          status: "needs_auth",
          statusMessage: "OAuth 2.0 token expired; re-authenticate via /mcp",
        },
        {
          namespace: "sentry",
          name: "Sentry MCP",
          status: "failed",
          statusMessage: "ECONNREFUSED 127.0.0.1:9411",
        },
        {
          namespace: "postgres",
          name: "Postgres MCP",
          status: "disabled",
          statusMessage: "Disabled in opencode.json",
        },
      ],
    },
    {
      type: "session.upserted",
      timestampMs: 4_100,
      sessionId: "ses-mcp-triage",
      locationDirectory: PRIMARY_HALL_DIR,
      title: "Diagnose MCP Integration Health",
      agentClass: "explore",
      modelId: "anthropic/claude-sonnet-4",
    },
    {
      type: "session.error",
      timestampMs: 4_200,
      sessionId: "ses-mcp-triage",
      message: "Sentry MCP transport closed unexpectedly (retrying 2/3)",
      retryCount: 2,
    },
  ]);

export const WORKTREE_ANNEXATION_EVENTS: readonly TelemetryEvent[] =
  Object.freeze<TelemetryEvent[]>([
    {
      type: "adapter.switched",
      timestampMs: 5_000,
      adapter: "demo-simulator",
      daemonUrl: "http://127.0.0.1:4096",
    },
    {
      type: "location.discovered",
      timestampMs: 5_050,
      locationDirectory: PRIMARY_HALL_DIR,
      projectId: "proj-pixel-guild",
      projectName: "opencode-pixel-guild",
      isWorktree: false,
    },
    {
      type: "session.upserted",
      timestampMs: 5_100,
      sessionId: "ses-main-guardian",
      locationDirectory: PRIMARY_HALL_DIR,
      title: "Maintain Main Branch Stability",
      agentClass: "plan",
      modelId: "anthropic/claude-sonnet-4",
    },
    {
      type: "session.upserted",
      timestampMs: 5_150,
      sessionId: "ses-worktree-pioneer",
      locationDirectory: PRIMARY_HALL_DIR,
      title: "Implement Ticket 05 Spectator HUD",
      agentClass: "build",
      modelId: "google/gemini-4-argon",
    },
    {
      type: "worktree.created",
      timestampMs: 5_300,
      locationDirectory: WORKTREE_ANNEX_DIR,
      parentProjectDirectory: PRIMARY_HALL_DIR,
      projectId: "proj-pixel-guild",
      projectName: "opencode-pixel-guild (ticket-05)",
    },
    {
      type: "session.moved",
      timestampMs: 5_400,
      sessionId: "ses-worktree-pioneer",
      fromDirectory: PRIMARY_HALL_DIR,
      toDirectory: WORKTREE_ANNEX_DIR,
    },
    {
      type: "tool.started",
      timestampMs: 6_100,
      sessionId: "ses-worktree-pioneer",
      toolName: "write",
      toolInput: { path: "src/hud/spectator-hud.ts" },
    },
  ]);

export const COMPACTION_AND_QUEST_GATE_EVENTS: readonly TelemetryEvent[] =
  Object.freeze<TelemetryEvent[]>([
    {
      type: "adapter.switched",
      timestampMs: 6_000,
      adapter: "demo-simulator",
      daemonUrl: "http://127.0.0.1:4096",
    },
    {
      type: "session.upserted",
      timestampMs: 6_100,
      sessionId: "ses-distiller",
      locationDirectory: PRIMARY_HALL_DIR,
      title: "Long-Horizon Architecture Refactor",
      agentClass: "build",
      modelId: "anthropic/claude-opus-4",
      tokens: {
        usedTokens: 192_000,
        limitTokens: 200_000,
        inputTokens: 160_000,
        outputTokens: 32_000,
        totalCostUsd: 2.94,
      },
    },
    {
      type: "session.compacted",
      timestampMs: 6_250,
      sessionId: "ses-distiller",
      tokens: {
        usedTokens: 28_000,
        limitTokens: 200_000,
        inputTokens: 160_000,
        outputTokens: 34_000,
        totalCostUsd: 3.05,
      },
    },
    {
      type: "session.upserted",
      timestampMs: 6_300,
      sessionId: "ses-perm-blocked",
      locationDirectory: PRIMARY_HALL_DIR,
      title: "Deploy Companion Bundle",
      agentClass: "general",
      modelId: "anthropic/claude-sonnet-4",
      tokens: {
        usedTokens: 145_000,
        limitTokens: 200_000,
        inputTokens: 120_000,
        outputTokens: 25_000,
        totalCostUsd: 0.88,
      },
    },
    {
      type: "permission.requested",
      timestampMs: 6_400,
      sessionId: "ses-perm-blocked",
      gateId: "gate-perm-deploy",
      title: "Execute bash: ./scripts/publish-guild.sh",
      reason: "Requires explicit operator approval before publishing",
    },
    {
      type: "session.upserted",
      timestampMs: 6_450,
      sessionId: "ses-question-blocked",
      locationDirectory: PRIMARY_HALL_DIR,
      title: "Configure HUD Keybind & Theme",
      agentClass: "plan",
      modelId: "openai/gpt-5",
      tokens: {
        usedTokens: 48_000,
        limitTokens: 200_000,
        inputTokens: 38_000,
        outputTokens: 10_000,
        totalCostUsd: 0.31,
      },
    },
    {
      type: "question.requested",
      timestampMs: 6_500,
      sessionId: "ses-question-blocked",
      gateId: "gate-question-theme",
      title: "Choose Default Guild Companion Palette",
      reason: "Select between Obsidian Ember or Arcane Parchment",
    },
  ]);
