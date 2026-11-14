import { WORKSTATION_CATALOG } from "../types/domain.ts";
import type { ProjectHeraldryDescriptor } from "../spatial/index.ts";
import type {
  CharacterLifecycleState,
  CharacterRole,
  EquipmentLoadout,
  GuildDelta,
  GuildStateEmission,
  HeadgearSilhouette,
  PluginAlcoveArchetype,
  PluginStatusKind,
  PreparationStationDisplayName,
  QuestGateKind,
  QuestGateQuestionField,
  QuestGateSource,
  SkillActivationSource,
  ToolExecutionRecord,
  VisualTraitPalette,
  WorkstationCatalogEntry,
  WorkstationKind,
} from "../types/domain.ts";

export { WORKSTATION_CATALOG };
export type { WorkstationCatalogEntry };

export const SOUL_BANISH_ANIMATION_DURATION_MS = 900;

export type ContextManaHudStatus =
  | "normal"
  | "elevated"
  | "critical"
  | "distilling";

export type WorkflowIntentKind =
  | "feature-build"
  | "debugging-hunt"
  | "information-gathering";

export interface CharacterAgentBadgeViewModel {
  readonly agentId: string;
  readonly displayName: string;
  readonly palette: Readonly<VisualTraitPalette>;
  readonly headgear: HeadgearSilhouette;
}

export interface SkillGrimoireChipViewModel {
  readonly skillId: string;
  readonly name: string;
  readonly source: SkillActivationSource;
  readonly emblemHex: string;
  readonly monogram: string;
  readonly inheritedFromSessionId: string | null;
}

export interface ContextManaViewModel {
  readonly percent: number;
  readonly usedTokens: number;
  readonly maxTokens: number;
  readonly limitTokens: number;
  readonly status: ContextManaHudStatus;
  readonly compactionCount: number;
}

export interface CharacterCostViewModel {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheReadTokens: number;
  readonly cacheWriteTokens: number;
  readonly formattedCost: string;
  readonly totalUsdFormatted: string;
  readonly totalCostUsd: number;
}

export interface ActiveTargetViewModel {
  readonly workstation: WorkstationKind | null;
  readonly preparationStation?: PreparationStationDisplayName | null;
  readonly pluginNamespace: string | null;
  readonly secondaryAlcoveNamespaces: readonly string[];
  readonly toolName: string | null;
  readonly inputPreview: string;
}

export interface ChildSubagentSummaryViewModel {
  readonly sessionId: string;
  readonly characterId: string;
  readonly title: string;
  readonly role: CharacterRole;
  readonly agentClass: string;
  readonly lifecycleState: CharacterLifecycleState;
  readonly activeWorkstation: WorkstationKind | null;
  readonly inheritedGrimoireCount: number;
}

export interface PendingQuestGateViewModel {
  readonly gateId: string;
  readonly kind: QuestGateKind;
  readonly title: string;
  readonly prompt: string;
  readonly detail: string;
  readonly badgeSymbol: "!" | "?";
  readonly source?: QuestGateSource;
  readonly fields?: readonly QuestGateQuestionField[];
  readonly action?: string;
  readonly resources?: readonly string[];
}

export interface CharacterAgentModeOptionViewModel {
  readonly id: string;
  readonly displayName: string;
  readonly description: string;
  readonly colorHex?: string;
  readonly roleArchetype: import("../types/domain.ts").GuildRoleArchetype;
  readonly isCurrent: boolean;
}

export interface CharacterCommandScrollViewModel {
  readonly endpoint: "/api/guild/command";
  readonly sessionId: string;
  readonly locationDirectory: string;
  readonly isBusy: boolean;
  readonly canInterrupt: boolean;
  readonly defaultDelivery: "steer" | "queue";
  readonly placeholder: string;
  readonly availableSkillIds: readonly string[];
  readonly selectedAgentClass: string;
  readonly canSwitchAgentMode: boolean;
  readonly availableAgentModes: readonly CharacterAgentModeOptionViewModel[];
}

export interface CharacterKillActionViewModel {
  readonly enabled: boolean;
  readonly label: "☠ Kill Character (Delete Session)";
  readonly confirmPrompt: string;
  readonly method: "DELETE";
  readonly endpoint: string;
  readonly daemonEndpoint: string;
  readonly locationDirectory: string;
  readonly cascadeChildSessionIds: readonly string[];
  readonly animationKind: "soul-banish-gravestone";
  readonly animationDurationMs: number;
}

export interface AdventurerDispatchTurnViewModel {
  readonly messageId: string;
  readonly role: "user" | "assistant";
  readonly speakerLabel: string;
  readonly agentBadgeLabel: string | null;
  readonly cleanText: string;
  readonly skills: readonly string[];
  readonly canCompact: boolean;
  readonly isOlderTurn: boolean;
  readonly isLongMessage: boolean;
  readonly previewText: string;
  readonly fullHtml: string;
  readonly compactHtml: string;
  readonly createdAtMs: number;
}

export interface AdventurerDispatchLogViewModel {
  readonly turns: readonly AdventurerDispatchTurnViewModel[];
  readonly revisionKey: string;
  readonly isBusy: boolean;
  readonly overheadVerb: string;
}

export interface CharacterSheetViewModel {
  readonly sessionId: string;
  readonly characterId: string;
  readonly role: CharacterRole;
  readonly roomId: string;
  readonly lifecycleState: CharacterLifecycleState;
  readonly title: string;
  readonly agentBadge: CharacterAgentBadgeViewModel;
  readonly modelId: string;
  readonly equipmentLoadout: Readonly<EquipmentLoadout>;
  readonly recentTools: readonly Readonly<ToolExecutionRecord>[];
  readonly skillGrimoireStack: readonly SkillGrimoireChipViewModel[];
  readonly contextMana: ContextManaViewModel;
  readonly cost: CharacterCostViewModel;
  readonly activeTarget: ActiveTargetViewModel;
  readonly childSubagents: readonly ChildSubagentSummaryViewModel[];
  readonly pendingQuestGate: PendingQuestGateViewModel | null;
  readonly lastAssistantText?: string | null;
  readonly lastUserPromptText?: string | null;
  readonly messages?: readonly import("../types/domain.ts").SessionChatMessage[];
  readonly dispatchLog?: AdventurerDispatchLogViewModel;
  readonly commandScroll: CharacterCommandScrollViewModel;
  readonly canSwitchAgentMode: boolean;
  readonly availableAgentModes: readonly CharacterAgentModeOptionViewModel[];
  readonly canTerminateSession: boolean;
  readonly deleteEndpoint: string;
  readonly killAction: CharacterKillActionViewModel;
  readonly workflowIntent?: WorkflowIntentKind;
  readonly overheadLabel?: string;
  readonly hasUnviewedResult?: boolean;
  readonly turnOutcome?: "succeeded" | "failed" | "interrupted" | null;
  readonly idleAtMs?: number | null;
  readonly viewedAtMs?: number | null;
  readonly projectHeraldry?: ProjectHeraldryDescriptor;
  readonly connectedPlugins?: Array<{
    namespace: string;
    name: string;
    status: string;
    toolCount?: number;
  }>;
}

export interface PluginAlcoveTooltipViewModel {
  readonly namespace: string;
  readonly displayName: string;
  readonly archetype: PluginAlcoveArchetype;
  readonly monogram: string;
  readonly status: PluginStatusKind;
  readonly statusLabel: string;
  readonly errorDetail: string | null;
  readonly isOverflowAlcove: boolean;
  readonly overflowNamespaces: readonly string[];
  readonly activeOccupantIds: readonly string[];
}

export interface RoomPluginBadgeViewModel {
  readonly namespace: string;
  readonly displayName: string;
  readonly monogram: string;
  readonly status: PluginStatusKind;
  readonly statusLabel: string;
  readonly overflowCount: number;
}

export interface OverflowAlcoveBadgeViewModel {
  readonly label: string;
  readonly count: number;
  readonly namespaces: readonly string[];
}

export type PluginAlcoveBadgeViewModel = RoomPluginBadgeViewModel;

export interface WorkshopRoomHeaderViewModel {
  readonly roomId: string;
  readonly title: string;
  readonly directory: string;
  readonly kind: "primary" | "worktree";
  readonly isWorktree: boolean;
  readonly adventurerCount: number;
  readonly subagentCount: number;
  readonly activeQuestGateCount: number;
  readonly overflowCount: number;
  readonly pluginBadges: readonly RoomPluginBadgeViewModel[];
  readonly overflowBadge: Readonly<OverflowAlcoveBadgeViewModel> | null;
}

export type ActivityTickerCategory =
  | "lifecycle"
  | "capability"
  | "skill"
  | "plugin"
  | "quest-gate"
  | "compaction"
  | "room"
  | "system";

export interface ActivityTickerEntryViewModel {
  readonly timestamp: number;
  readonly roomId: string | null;
  readonly sessionId: string | null;
  readonly category: ActivityTickerCategory;
  readonly summary: string;
  readonly projectId?: string | null;
  readonly projectName?: string | null;
  readonly shortTag?: string | null;
  readonly crestIcon?: string | null;
  readonly partyKey?: string | null;
}

export interface ActivityTickerBuildOptions {
  readonly snapshot?: import("../types/domain.ts").GuildSnapshot | null;
  readonly selectedRoomId?: string | null;
  readonly selectedProjectId?: string | null;
  readonly isAllWorldsFocused?: boolean;
  readonly includeCharacterHistory?: boolean;
  readonly characters?: ReadonlyArray<import("../types/domain.ts").CharacterState>;
}

export type ActivityTickerInputItem =
  | GuildStateEmission
  | GuildDelta
  | ActivityTickerEntryViewModel
  | {
      readonly category?: string;
      readonly summary?: string;
      readonly timestampMs?: number;
      readonly roomId?: string | null;
      readonly sessionId?: string | null;
    };

export interface ActivityTickerViewModel {
  readonly entries: readonly ActivityTickerEntryViewModel[];
}

export interface TuiSlashCommandDescriptor {
  readonly name: "guild";
  readonly aliases: readonly ["pixel-guild"];
  readonly keybind: "ctrl+g";
  readonly targetUrl: string;
}

export interface TuiPluginSurfaceViewModel {
  readonly slashCommand: TuiSlashCommandDescriptor;
  readonly homeFooterStatus: string;
  readonly promptFooterStatus: string;
}
