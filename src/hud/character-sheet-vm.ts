import {
  classifyCharacterWorkflowIntent,
  deriveOverheadActionLabel,
  extractCapabilityToolName,
  resolvePreparationStationDisplayName,
} from "../encounter/index.ts";
import { hasCharacterUnviewedResult, resolveProjectHeraldry } from "../spatial/index.ts";
import {
  isSelectablePrimaryAgentMode,
  resolveGuildRoleArchetype,
  type EquipmentLoadout,
  type GuildSnapshot,
  type ToolExecutionRecord,
} from "../types/domain.ts";
import { buildAdventurerDispatchLogViewModel } from "./chat-markdown-formatter.ts";
import {
  formatAgentDisplayName,
  formatUsdCost,
  resolveContextManaStatus,
} from "./hud-formatters.ts";
import {
  SOUL_BANISH_ANIMATION_DURATION_MS,
  type ActiveTargetViewModel,
  type CharacterAgentBadgeViewModel,
  type CharacterAgentModeOptionViewModel,
  type CharacterCommandScrollViewModel,
  type CharacterCostViewModel,
  type CharacterKillActionViewModel,
  type CharacterSheetViewModel,
  type ChildSubagentSummaryViewModel,
  type ContextManaViewModel,
  type PendingQuestGateViewModel,
  type SkillGrimoireChipViewModel,
} from "./hud-character-types.ts";

const DEFAULT_PRIMARY_AGENT_MODES: ReadonlyArray<{
  id: string;
  name: string;
  description: string;
  color?: string;
}> = Object.freeze([
  { id: "build", name: "build", description: "Warrior / Feature Smith" },
  { id: "plan", name: "plan", description: "Scout / Strategist" },
  { id: "document", name: "document", description: "Mage / Lore & Specs" },
]);

export const DEFAULT_GUILD_SKILL_IDS: readonly string[] = Object.freeze([
  "tdd",
  "code-review",
  "diagnosing-bugs",
  "codebase-design",
  "domain-modeling",
  "research",
  "prototype",
  "grilling",
  "pr",
]);

export function buildCharacterSheetViewModel(
  snapshot: GuildSnapshot,
  sessionId: string,
): CharacterSheetViewModel {
  const character = snapshot.characters[sessionId];
  if (!character) {
    throw new Error(`Character not found for session: ${sessionId}`);
  }

  const usedTokens = character.contextMana.usedTokens;
  const maxTokens = character.contextMana.limitTokens;
  const rawRatio =
    maxTokens > 0 ? usedTokens / maxTokens : character.contextMana.fillRatio;
  const percent = Math.round(Math.min(100, Math.max(0, rawRatio * 100)));

  const agentBadge: CharacterAgentBadgeViewModel = Object.freeze({
    agentId: character.agentClass,
    displayName: formatAgentDisplayName(character.agentClass),
    palette: Object.freeze({ ...character.visualTraits }),
    headgear: character.visualTraits.headgear,
  });

  const skillGrimoireStack: readonly SkillGrimoireChipViewModel[] =
    Object.freeze(
      character.skillGrimoires.map((grimoire) =>
        Object.freeze({
          skillId: grimoire.skillId,
          name: grimoire.name,
          source: grimoire.activatedBy,
          emblemHex: grimoire.emblemHex,
          monogram: grimoire.monogram,
          inheritedFromSessionId: grimoire.inheritedFromSessionId,
        }),
      ),
    );

  const contextMana: ContextManaViewModel = Object.freeze({
    percent,
    usedTokens,
    maxTokens,
    limitTokens: maxTokens,
    status: resolveContextManaStatus(percent, character.lifecycleState),
    compactionCount: character.contextMana.compactionCount,
  });

  const totalUsdFormatted = formatUsdCost(character.contextMana.totalCostUsd, 2);
  const cost: CharacterCostViewModel = Object.freeze({
    inputTokens: character.contextMana.inputTokens,
    outputTokens: character.contextMana.outputTokens,
    cacheReadTokens: character.contextMana.cacheReadTokens ?? 0,
    cacheWriteTokens: character.contextMana.cacheWriteTokens ?? 0,
    formattedCost: totalUsdFormatted,
    totalCostUsd: character.contextMana.totalCostUsd,
    totalUsdFormatted,
  });

  const secondaryNamespaces =
    character.secondaryAlcoveTargets.length > 0
      ? character.secondaryAlcoveTargets
      : (character.activeCapability?.secondaryAlcoveNamespaces ?? []);

  const activeTarget: ActiveTargetViewModel = Object.freeze({
    workstation: character.activeWorkstation,
    preparationStation:
      character.activePreparationStation ??
      (character.activeWorkstation
        ? resolvePreparationStationDisplayName({
            toolName: extractCapabilityToolName(character.activeCapability),
            lastToolName: character.recentTools?.[0]?.toolName,
            workstation: character.activeWorkstation,
            lastEquippedToolCategory: character.lastEquippedToolCategory,
            pluginNamespace: character.activePluginNamespace,
          })
        : null),
    pluginNamespace: character.activePluginNamespace,
    secondaryAlcoveNamespaces: Object.freeze([...secondaryNamespaces]),
    toolName: character.activeCapability?.capabilityId ?? null,
    inputPreview: character.activeCapability?.inputPreview ?? "",
  });

  const childSubagents: readonly ChildSubagentSummaryViewModel[] =
    Object.freeze(
      character.childSessionIds
        .map((childId) => snapshot.characters[childId])
        .filter((child): child is NonNullable<typeof child> => Boolean(child))
        .map((child) =>
          Object.freeze({
            sessionId: child.sessionId,
            characterId: child.characterId,
            title: child.title,
            role: child.role,
            agentClass: child.agentClass,
            lifecycleState: child.lifecycleState,
            activeWorkstation: child.activeWorkstation,
            inheritedGrimoireCount: child.skillGrimoires.filter(
              (g) => g.activatedBy === "inherited",
            ).length,
          }),
        ),
    );

  const pendingQuestGate: PendingQuestGateViewModel | null = character.questGate
    ? Object.freeze({
        gateId: character.questGate.gateId,
        kind: character.questGate.kind,
        title: character.questGate.title,
        prompt: character.questGate.reason,
        detail: character.questGate.reason,
        badgeSymbol: character.questGate.marker,
        source:
          character.questGate.source ??
          (character.questGate.kind === "permission" ? "permission" : "form"),
        fields: Object.freeze([...(character.questGate.fields ?? [])]),
        action: character.questGate.action,
        resources: character.questGate.resources
          ? Object.freeze([...character.questGate.resources])
          : undefined,
      })
    : null;

  const equipmentLoadout: Readonly<EquipmentLoadout> = Object.freeze({
    ...character.equipmentLoadout,
    headgear: Object.freeze({ ...character.equipmentLoadout.headgear }),
    robes: Object.freeze({ ...character.equipmentLoadout.robes }),
    mainHand: Object.freeze({ ...character.equipmentLoadout.mainHand }),
    offHand: Object.freeze({ ...character.equipmentLoadout.offHand }),
    toolBelt: Object.freeze(
      character.equipmentLoadout.toolBelt.map((entry) =>
        Object.freeze({ ...entry }),
      ),
    ),
  });

  const recentTools: readonly Readonly<ToolExecutionRecord>[] = Object.freeze(
    (character.recentTools ?? []).map((record) => Object.freeze({ ...record })),
  );

  const encodedSessionId = encodeURIComponent(character.sessionId);
  const encodedDirectory = encodeURIComponent(character.locationDirectory);
  const deleteEndpoint = `/api/guild/session/${encodedSessionId}`;
  const cascadeChildSessionIds = Object.freeze(
    childSubagents.map((c) => c.sessionId),
  );
  const confirmPrompt =
    cascadeChildSessionIds.length > 0
      ? `Terminate session "${character.title}" (${character.sessionId}) and cascade removal to ${cascadeChildSessionIds.length} Squad Subagent(s)?`
      : `Terminate session "${character.title}" (${character.sessionId}) on the OpenCode daemon?`;

  const killAction: CharacterKillActionViewModel = Object.freeze({
    enabled: true,
    label: "☠ Kill Character (Delete Session)",
    confirmPrompt,
    method: "DELETE",
    endpoint: deleteEndpoint,
    daemonEndpoint: `DELETE /api/session/${encodedSessionId}?location[directory]=${encodedDirectory}`,
    locationDirectory: character.locationDirectory,
    cascadeChildSessionIds,
    animationKind: "soul-banish-gravestone",
    animationDurationMs: SOUL_BANISH_ANIMATION_DURATION_MS,
  });

  const room = snapshot.rooms?.[character.roomId];
  const connectedPlugins = room
    ? [
        ...(room.pluginAlcoves ?? []).map((alcove) =>
          Object.freeze({
            namespace: alcove.namespace,
            name: alcove.displayName,
            status: alcove.status,
            toolCount: alcove.toolCount,
          }),
        ),
        ...(room.overflowPluginNamespaces ?? []).map((ns) =>
          Object.freeze({
            namespace: ns,
            name: ns,
            status: "connected",
            toolCount: 1,
          }),
        ),
      ]
    : [];

  const workflowIntent =
    character.workflowIntent ?? classifyCharacterWorkflowIntent(character);
  const overheadLabel =
    character.overheadLabel ?? deriveOverheadActionLabel(character);

  const isBusy =
    character.lifecycleState === "Thinking" ||
    character.lifecycleState === "WorkingAtStation" ||
    character.lifecycleState === "Entering" ||
    character.lifecycleState === "DistillingContextMana";
  const canSwitchAgentMode =
    character.role === "Guild Adventurer" && character.parentId === null;
  const rawRoomModes = Array.isArray(room?.availableAgents)
    ? room.availableAgents.filter((a) => isSelectablePrimaryAgentMode(a))
    : [];
  const rawPrimaryModes =
    rawRoomModes.length > 0
      ? rawRoomModes
      : Array.isArray(snapshot.availableAgentModes) &&
          snapshot.availableAgentModes.length > 0
        ? snapshot.availableAgentModes
        : DEFAULT_PRIMARY_AGENT_MODES;
  const availableAgentModes: readonly CharacterAgentModeOptionViewModel[] =
    Object.freeze(
      rawPrimaryModes.map((m) =>
        Object.freeze({
          id: m.id,
          displayName: formatAgentDisplayName(m.id),
          description:
            m.description ||
            (m.id === "build"
              ? "Warrior / Feature Smith"
              : m.id === "plan"
                ? "Scout / Strategist"
                : m.id === "document"
                  ? "Mage / Lore & Specs"
                  : m.name || "Primary Agent"),
          ...(m.color ? { colorHex: m.color } : {}),
          roleArchetype: resolveGuildRoleArchetype(m.id),
          isCurrent: m.id === character.agentClass,
        }),
      ),
    );
  const commandScroll: CharacterCommandScrollViewModel = Object.freeze({
    endpoint: "/api/guild/command",
    sessionId: character.sessionId,
    locationDirectory: character.locationDirectory,
    isBusy,
    canInterrupt: isBusy,
    defaultDelivery: "steer",
    placeholder: `Inscribe instructions or @skill for ${character.title}...`,
    availableSkillIds: Object.freeze(
      Array.from(
        new Set([
          ...character.skillGrimoires.map((g) => g.skillId),
          ...(snapshot.availableSkillIds ?? []),
          ...DEFAULT_GUILD_SKILL_IDS,
        ].filter(Boolean)),
      ),
    ),
    selectedAgentClass: character.agentClass,
    canSwitchAgentMode,
    availableAgentModes,
  });

  const messages = Object.freeze([...(character.messages ?? [])]);
  const dispatchLog = buildAdventurerDispatchLogViewModel({
    sessionId: character.sessionId,
    agentDisplayName: agentBadge.displayName,
    modelId: character.modelId,
    overheadLabel,
    isBusy,
    messages,
    lastUserPromptText: character.lastUserPromptText ?? null,
    lastAssistantText: character.lastAssistantText ?? null,
  });

  const projectHeraldry = resolveProjectHeraldry(character, snapshot);

  return Object.freeze({
    sessionId: character.sessionId,
    characterId: character.characterId,
    role: character.role,
    roomId: character.roomId,
    lifecycleState: character.lifecycleState,
    title: character.title,
    agentBadge,
    modelId: character.modelId,
    equipmentLoadout,
    recentTools,
    skillGrimoireStack,
    contextMana,
    cost,
    activeTarget,
    childSubagents,
    pendingQuestGate,
    lastAssistantText: character.lastAssistantText ?? null,
    lastUserPromptText: character.lastUserPromptText ?? null,
    messages,
    dispatchLog,
    commandScroll,
    canSwitchAgentMode,
    availableAgentModes,
    canTerminateSession: true,
    deleteEndpoint,
    killAction,
    workflowIntent,
    overheadLabel,
    hasUnviewedResult: hasCharacterUnviewedResult(character),
    turnOutcome: character.turnOutcome ?? null,
    idleAtMs: character.idleAtMs ?? null,
    viewedAtMs: character.viewedAtMs ?? null,
    projectHeraldry,
    connectedPlugins,
  });
}
