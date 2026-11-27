import type { RoomGitWorkingTreeState } from "../ingress/index.ts";
import type { CharacterState, GuildSnapshot, WorkshopRoomState } from "../types/domain.ts";
import type { DynamicLanternFlare, SummoningRitualFx, WalkerState } from "./client-state.ts";
import {
  buildSyntheticHeroDefs,
  buildSyntheticOperatorProfile,
  buildSyntheticRoomGitState,
  DOCS_SHOWCASE_EPOCH_MS,
  MERMAID_ASSISTANT_TEXT,
  SYNTHETIC_AGENTS,
  SYNTHETIC_AVAILABLE_MODELS,
  SYNTHETIC_PROJECT_DIRS,
  SYNTHETIC_SKILLS,
} from "./docs-showcase-data.ts";
import type { ResolvedCharacterSlot } from "./station-and-workflow-routing.ts";

export {
  buildSyntheticOperatorProfile,
  buildSyntheticRoomGitState,
  DOCS_SHOWCASE_EPOCH_MS,
  SYNTHETIC_PROJECT_DIRS,
};

export interface ShowcaseFixtureBundle {
  readonly snapshot: GuildSnapshot;
  readonly walkers: Map<string, WalkerState>;
  readonly flares: DynamicLanternFlare[];
  readonly rituals: Map<string, SummoningRitualFx>;
  readonly gitStateByRoom: Record<string, RoomGitWorkingTreeState>;
}

function makeRoom(
  roomId: string,
  projectName: string,
  charIds: string[],
  subIds: string[],
  totalTasks: number,
  resolvedTasks: number,
  slug: string,
): WorkshopRoomState {
  return {
    roomId, locationDirectory: roomId, projectId: roomId, projectName,
    isWorktree: false, parentProjectDirectory: null, workstations: [],
    pluginAlcoves: [
      { namespace: "github", displayName: "github", archetype: "Arcane Conduit", activeCallCount: 1, totalCalls: 4, hasError: false, colorHex: "#38bdf8", tile: { x: 2, y: 2 } },
      { namespace: "linear", displayName: "linear", archetype: "Rune Relay", activeCallCount: 0, totalCalls: 2, hasError: false, colorHex: "#a78bfa", tile: { x: 3, y: 2 } },
    ],
    overflowPluginNamespaces: [], activeSessionIds: charIds, characterIds: charIds,
    activeAdventurerCount: charIds.length - subIds.length, activeSubagentCount: subIds.length,
    questGateCount: 0, createdAtMs: DOCS_SHOWCASE_EPOCH_MS - 300_000, lastActivityAtMs: DOCS_SHOWCASE_EPOCH_MS,
    availableAgents: SYNTHETIC_AGENTS, availableSkills: SYNTHETIC_SKILLS,
    availableModels: [...SYNTHETIC_AVAILABLE_MODELS], defaultModelId: "anthropic/claude-sonnet-4",
    taskProgress: {
      source: totalTasks > 0 ? "git-working-tree" : "none",
      featureSlug: totalTasks > 0 ? slug : "Blueprint Ready",
      totalTasks, resolvedTasks,
      tasks: Array.from({ length: totalTasks }, (_, idx) => ({
        id: String(idx + 1).padStart(2, "0"), slug: `item-${idx + 1}`,
        title: `src/modules/part-${String(idx + 1).padStart(2, "0")}.ts`,
        status: idx < resolvedTasks ? ("resolved" as const) : ("open" as const),
      })),
    },
  };
}

export function buildShowcaseFixtureBundle(options: {
  bulkAssembly?: boolean;
  includeQuestGate?: boolean;
  wildsCombat?: boolean;
} = {}): ShowcaseFixtureBundle {
  const now = DOCS_SHOWCASE_EPOCH_MS;
  const heroDefs = buildSyntheticHeroDefs(options);
  const pixelIds = heroDefs.filter((h) => h.roomId === SYNTHETIC_PROJECT_DIRS.pixelGuild).map((h) => h.sessionId);
  const pixelSubs = heroDefs.filter((h) => h.roomId === SYNTHETIC_PROJECT_DIRS.pixelGuild && h.parentId).map((h) => h.sessionId);

  const rooms: Record<string, WorkshopRoomState> = {
    [SYNTHETIC_PROJECT_DIRS.pixelGuild]: makeRoom(
      SYNTHETIC_PROJECT_DIRS.pixelGuild, "opencode-pixel-guild", pixelIds, pixelSubs,
      options.bulkAssembly ? 48 : 5, options.bulkAssembly ? 18 : 3,
      options.bulkAssembly ? "bulk-assembly-refactor" : "public-asset-hygiene",
    ),
    [SYNTHETIC_PROJECT_DIRS.arcaneEngine]: makeRoom(SYNTHETIC_PROJECT_DIRS.arcaneEngine, "arcane-engine", ["ses-arcane-alchemist"], [], 4, 4, "mana-shader-conduit"),
    [SYNTHETIC_PROJECT_DIRS.chronicleCore]: makeRoom(SYNTHETIC_PROJECT_DIRS.chronicleCore, "chronicle-core", ["ses-chronicle-sapper"], [], 6, 2, "wal-checkpoint-guard"),
    [SYNTHETIC_PROJECT_DIRS.starlightCli]: makeRoom(SYNTHETIC_PROJECT_DIRS.starlightCli, "starlight-cli", ["ses-starlight-cleric"], [], 0, 0, "Blueprint Ready"),
  };
  if (options.includeQuestGate) rooms[SYNTHETIC_PROJECT_DIRS.pixelGuild]!.questGateCount = 1;

  const characters: Record<string, CharacterState> = {};
  const walkers = new Map<string, WalkerState>();
  const questGates: GuildSnapshot["questGates"] = {};

  for (const h of heroDefs) {
    const isSub = h.parentId !== null;
    const isMage = h.sessionId === "ses-guild-mage";
    const gate = h.hasQuestGate
      ? {
          gateId: "gate-showcase-01", sessionId: h.sessionId, kind: "question" as const,
          title: "Select Screenshot Capture Scope",
          reason: "Choose which synthetic showcase viewports to regenerate before sealing the manifest.",
          toolName: "question",
          options: ["Desktop + Mobile (Recommended)", "Desktop Only (1600x1000)", "Verify Existing Manifest"],
          fields: [{
            key: "scope", header: "Capture Scope",
            question: "Which synthetic showcase viewports should be regenerated?",
            options: [
              { label: "Desktop + Mobile (Recommended)", description: "Regenerate all 14 desktop and 4 mobile scenes with full OCR verification." },
              { label: "Desktop Only (1600x1000)", description: "Regenerate desktop workspace scenes only." },
              { label: "Verify Existing Manifest", description: "Run SHA-256 and OCR hygiene verification without recapturing." },
            ],
          }],
          createdAtMs: now - 8_000,
        }
      : null;
    if (gate) questGates[gate.gateId] = gate;

    const recentTools = isMage
      ? [
          { callId: "call-1", toolName: "read", workstation: "Library Study Bookshelf" as const, pluginNamespace: null, status: "completed" as const, inputPreview: "src/hud/mermaid-renderer.ts", outputPreview: "Read 242 lines (SVG layout engine)", timestampMs: now - 28_000 },
          { callId: "call-2", toolName: "edit", workstation: "Crafting Workbench" as const, pluginNamespace: null, status: "completed" as const, inputPreview: "src/hud/mermaid-renderer.ts", outputPreview: "Updated sequenceDiagram viewBox padding", timestampMs: now - 16_000 },
          { callId: "call-3", toolName: "bash", workstation: "Anvil Forge" as const, pluginNamespace: null, status: "completed" as const, inputPreview: "npm test", outputPreview: "42/42 assertions passed (0 failures)", timestampMs: now - 6_000 },
        ]
      : h.bugError
        ? [
            { callId: `err-${h.sessionId}`, toolName: "bash", workstation: "Anvil Forge" as const, pluginNamespace: null, status: "error" as const, inputPreview: "npm test", outputPreview: `FAIL ${h.bugError}`, timestampMs: now - 9_000 },
            { callId: `fix-${h.sessionId}`, toolName: "edit", workstation: "Crafting Workbench" as const, pluginNamespace: null, status: "running" as const, inputPreview: "src/scene/floorplan.ts", timestampMs: now - 2_000 },
          ]
        : [
            { callId: `tool-${h.sessionId}`, toolName: "grep", workstation: "Library Study Bookshelf" as const, pluginNamespace: null, status: "completed" as const, inputPreview: "src/scene/floorplan.ts", outputPreview: "Matched 4 station waypoints", timestampMs: now - 12_000 },
          ];

    const slot: ResolvedCharacterSlot = {
      x: h.x, y: h.y, station: h.station, role: h.roleArchetype,
      workflowIntent: h.bugError ? "debugging-hunt" : h.station === "Library" || h.station === "Spyglass" ? "information-gathering" : "feature-build",
      overheadLabel: h.overheadLabel, isActing: true, facingDirection: h.facingDirection, cargo: h.cargo,
    };

    characters[h.sessionId] = {
      characterId: h.sessionId, sessionId: h.sessionId, parentId: h.parentId, parentSessionId: h.parentId,
      role: isSub ? "Squad Subagent" : "Guild Adventurer", roomId: h.roomId, locationDirectory: h.roomId,
      projectId: h.roomId, projectName: h.projectName, title: h.title, agentClass: h.agentClass,
      roleArchetype: h.roleArchetype, modelId: "anthropic/claude-sonnet-4", modelVariant: "high",
      lifecycleState: h.lifecycleState, overheadLabel: h.overheadLabel, isOpenInOpenCode: true,
      hasUnviewedResult: h.hasUnviewedResult, turnOutcome: h.hasUnviewedResult ? "completed" : undefined,
      lastUserPromptText: isMage
        ? "Apply @domain-modeling to document the synthetic showcase pipeline with Mermaid flowchart and sequence diagrams."
        : `Verify ${h.title.toLowerCase()} across src/scene/floorplan.ts and tests/12-guild-combat.test.ts.`,
      lastAssistantText: isMage ? MERMAID_ASSISTANT_TEXT : `Completed checks for ${h.title} with zero regressions across synthetic test fixtures.`,
      messages: isMage
        ? [
            { id: "msg-u1", role: "user", text: "Apply @domain-modeling to document the synthetic showcase pipeline with Mermaid flowchart and sequence diagrams.", timestampMs: now - 40_000, agentClass: "document", modelId: "anthropic/claude-sonnet-4", skills: ["domain-modeling"] },
            { id: "msg-a1", role: "assistant", text: MERMAID_ASSISTANT_TEXT, timestampMs: now - 5_000, agentClass: "document", modelId: "anthropic/claude-sonnet-4" },
          ]
        : [
            { id: `msg-u-${h.sessionId}`, role: "user", text: `Run verification for ${h.title}.`, timestampMs: now - 30_000, agentClass: h.agentClass, modelId: "anthropic/claude-sonnet-4" },
            { id: `msg-a-${h.sessionId}`, role: "assistant", text: `Verified ${h.title} cleanly against synthetic fixtures.`, timestampMs: now - 4_000, agentClass: h.agentClass, modelId: "anthropic/claude-sonnet-4" },
          ],
      currentTile: { x: Math.round(h.x), y: Math.round(h.y) }, targetTile: { x: Math.round(h.x), y: Math.round(h.y) },
      activeWorkstation: h.station === "Forge" ? "Anvil Forge" : h.station === "Library" ? "Library Study Bookshelf" : h.station === "Alchemy" ? "Alchemy Cauldron" : "Crafting Workbench",
      activePluginNamespace: null, secondaryAlcoveTargets: [],
      activeCapability: null, activeResourceCargo: null, equippingAtArmory: false,
      skillGrimoires: h.skills.map((sk, idx) => ({
        skillId: sk, name: sk, activatedBy: "skill-tool" as const, activatedAtMs: now - 50_000 + idx * 1_000,
        inheritedFromSessionId: h.parentId, emblemHex: h.trimHex, monogram: sk.slice(0, 2).toUpperCase(),
      })),
      childSessionIds: h.sessionId === "ses-guild-warrior" ? ["ses-guild-sub-scout"] : [], questGate: gate,
      contextMana: { usedTokens: 68_400, limitTokens: 200_000, fillRatio: 0.342, inputTokens: 54_200, outputTokens: 14_200, cacheReadTokens: 12_000, cacheWriteTokens: 4_000, totalCostUsd: 0.38, compactionCount: 1, lastDistilledAtMs: null },
      reportScroll: null,
      errorState: h.bugError ? { message: h.bugError, retryCount: 1, occurredAtMs: now - 9_000 } : null,
      recentTools,
      equipmentLoadout: {
        level: 14, readinessTier: 3, tierTitle: "Master Artificer",
        headgear: { slot: "headgear", rpgName: "Arcane Sight Circlet", opencodeBinding: h.agentClass, tier: 3, iconKey: "helm", colorHex: h.primaryHex },
        robes: { slot: "robes", rpgName: "Guild Herald Mantle", opencodeBinding: "claude-sonnet-4", tier: 3, iconKey: "armor", colorHex: h.primaryHex },
        mainHand: { slot: "mainHand", rpgName: "Runed Forge Hammer", opencodeBinding: "edit · bash", tier: 3, iconKey: "sword", colorHex: h.trimHex },
        offHand: { slot: "offHand", rpgName: `Grimoire: ${h.skills[0] ?? "tdd"}`, opencodeBinding: h.skills[0] ?? "tdd", tier: 3, iconKey: "tome", colorHex: h.trimHex },
        toolBelt: [{ toolName: "read", count: 8 }, { toolName: "edit", count: 5 }, { toolName: "bash", count: 4 }],
      },
      visualTraits: { primaryHex: h.primaryHex, secondaryHex: h.trimHex, trimHex: h.trimHex, auraHex: h.trimHex, monogram: "OP", headgear: "visored-helm", alcoveArchetype: "Arcane Conduit", hashSeed: 17 },
      stateEnteredAtMs: now - 15_000, lastActivityAtMs: now,
    };

    walkers.set(h.sessionId, {
      currentX: h.x, currentY: h.y, targetX: h.x, targetY: h.y, resolvedSlot: slot,
      isWalking: false, facingLeft: h.facingDirection === "west", facingDirection: h.facingDirection,
      walkCycle: 0, lastToolCategory: "edit", armoryUntilMs: 0, searchWaypointIdx: 0, initializedQueue: true,
    });
  }

  const flares: DynamicLanternFlare[] = options.wildsCombat
    ? [
        { id: "showcase-flare-0", sessionId: "ses-guild-warrior", x: 960, y: 340, r: 140, createdAtMs: now - 1_000, expiresAtMs: now + 9_000 },
        { id: "showcase-flare-1", sessionId: "ses-chronicle-sapper", x: 1180, y: 245, r: 135, createdAtMs: now - 1_000, expiresAtMs: now + 9_000 },
        { id: "showcase-flare-2", sessionId: "ses-guild-warrior", x: 1350, y: 390, r: 135, createdAtMs: now - 1_000, expiresAtMs: now + 9_000 },
      ]
    : [];

  const snapshot: GuildSnapshot = {
    version: 42, timestampMs: now, activeAdapter: "opencode-client", daemonUrl: "http://127.0.0.1:4096",
    roomOrder: [SYNTHETIC_PROJECT_DIRS.pixelGuild, SYNTHETIC_PROJECT_DIRS.arcaneEngine, SYNTHETIC_PROJECT_DIRS.chronicleCore, SYNTHETIC_PROJECT_DIRS.starlightCli],
    rooms, characters, questGates,
    summary: { totalRooms: 4, activeAdventurers: 5, activeSubagents: 1, openQuestGates: Object.keys(questGates).length, equippedGrimoires: 8, connectedPlugins: 2 },
  };

  return {
    snapshot, walkers, flares, rituals: new Map(),
    gitStateByRoom: { [SYNTHETIC_PROJECT_DIRS.pixelGuild]: buildSyntheticRoomGitState(Boolean(options.bulkAssembly)) },
  };
}
