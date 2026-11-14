import type { ProjectMiniAssemblyState } from "../encounter/project-mini-assemblies.ts";
import type {
  AssemblyResultDeliverable,
  CharacterLifecycleState,
  CoreWorkstationKind,
  EquipmentLoadout,
  GuildResultsMetrics,
  PairedOpenCodeMachine,
  PluginStatusKind,
  ResourceCargoDescriptor,
  ResourceCargoKind,
  RoomFixtureKind,
  ToolBeltEntry,
  ToolExecutionRecord,
  WorkshopRoomState,
  WorkstationKind,
} from "../types/domain.ts";
import type {
  OverflowAlcoveBadgeViewModel,
  PluginAlcoveBadgeViewModel,
  PluginAlcoveTooltipViewModel,
} from "./hud-character-types.ts";

export type SceneHoverTarget =
  | {
      readonly kind: "character";
      readonly sessionId: string;
      readonly roomId?: string;
      readonly isWalking?: boolean;
      readonly walkingToLabel?: string | null;
      readonly haulingCargo?: string | null;
      readonly haulingPhase?: "pickup" | "haul-to-worksite" | null;
    }
  | {
      readonly kind: "workstation";
      readonly roomId: string;
      readonly workstation: CoreWorkstationKind | WorkstationKind | RoomFixtureKind | string;
    }
  | {
      readonly kind: "alcove";
      readonly roomId: string;
      readonly namespace: string;
    }
  | {
      readonly kind: "resource-stockpile";
      readonly roomId: string;
      readonly workstation?: string;
    }
  | {
      readonly kind: "summoning-ritual";
      readonly roomId: string;
      readonly parentSessionId?: string;
    }
  | {
      readonly kind: "summoning-pad";
      readonly roomId: string;
    }
  | {
      readonly kind: "break-lounge";
      readonly roomId: string;
      readonly workstation?: string;
    }
  | {
      readonly kind: "demolition-bomb";
      readonly roomId: string;
      readonly room?: WorkshopRoomState;
    }
  | {
      readonly kind: "prop";
      readonly roomId: string;
      readonly propId: string;
      readonly label: string;
      readonly zone?: string;
      readonly nearWorkstation?: RoomFixtureKind | null;
      readonly description?: string;
    }
  | {
      readonly kind: "goal-assembly-socket";
      readonly partIndex: number;
      readonly partId?: string;
      readonly name?: string;
      readonly status?: "unbuilt" | "fitted";
      readonly taskTitle?: string;
      readonly projectId?: string;
      readonly projectName?: string;
      readonly shortTag?: string;
      readonly crestIcon?: string;
      readonly partyKey?: string;
      readonly projectStatus?: "complete" | "in-progress" | "open" | "blueprint-ready";
      readonly projectStatusLabel?: string;
      readonly fittedCount?: number;
      readonly totalParts?: number;
      readonly percentComplete?: number;
      readonly featureSlug?: string;
      readonly milestoneName?: string;
    }
  | {
      readonly kind: "bug-monster";
      readonly roomId?: string;
      readonly monsterId?: string;
      readonly name?: string;
      readonly tier?: 1 | 2 | 3 | 4;
      readonly status?: "idle" | "mutating" | "combat" | "defeated";
      readonly currentHp?: number;
      readonly maxHp?: number;
    };

export interface SceneTooltipDetailRow {
  readonly label: string;
  readonly value: string;
  readonly mono?: boolean;
  readonly accentHex?: string;
}

export interface ResourceStockpileCrateTooltipEntry {
  readonly cargoKind: ResourceCargoKind;
  readonly label: string;
  readonly colorHex: string;
  readonly mappedWorkstations: readonly WorkstationKind[];
  readonly mappedTools: readonly string[];
}

export interface ResourceStockpilePluginTooltipEntry {
  readonly namespace: string;
  readonly displayName: string;
  readonly status: PluginStatusKind;
  readonly statusLabel: string;
  readonly toolCount: number;
  readonly statusMessage?: string;
  readonly isOverflow: boolean;
}

export interface ResourceCargoPickupTooltipEntry {
  readonly sessionId: string;
  readonly sessionTitle: string;
  readonly agentClass: string;
  readonly callId: string | null;
  readonly toolName: string;
  readonly inputPreview: string;
  readonly cargoKind: ResourceCargoKind;
  readonly cargoLabel: string;
  readonly cargoColorHex: string;
  readonly targetWorkstation: WorkstationKind;
  readonly pluginNamespace: string | null;
  readonly status: "active" | "completed" | "error";
}

export interface SceneObjectTooltipViewModel {
  readonly kind?: SceneHoverTarget["kind"];
  readonly roomId?: string;
  readonly title: string;
  readonly subtitle: string;
  readonly opencodeBinding: string;
  readonly accentHex: string;
  readonly statusBadge: string;
  readonly description: string;
  readonly rows: readonly SceneTooltipDetailRow[];
  readonly locationDirectory?: string;
  readonly sessionCount?: number;
  readonly activeAdventurerCount?: number;
  readonly activeSubagentCount?: number;
  readonly activeCount?: number;
  readonly isWorktree?: boolean;
  readonly teardownEndpoints?: readonly string[];
  readonly sessionId?: string;
  readonly agentClass?: string;
  readonly modelId?: string;
  readonly lifecycleState?: CharacterLifecycleState;
  readonly equipmentLoadout?: Readonly<EquipmentLoadout>;
  readonly activeResourceCargo?: Readonly<ResourceCargoDescriptor> | null;
  readonly skillIds?: readonly string[];
  readonly toolBelt?: readonly Readonly<ToolBeltEntry>[];
  readonly recentTools?: readonly Readonly<ToolExecutionRecord>[];
  readonly workstation?: WorkstationKind | RoomFixtureKind | string;
  readonly mappedTools?: readonly string[];
  readonly activeOccupants?: ReadonlyArray<{
    readonly sessionId: string;
    readonly title: string;
    readonly agentClass: string;
    readonly toolName: string | null;
    readonly inputPreview: string;
  }>;
  readonly recentStationTools?: ReadonlyArray<{
    readonly sessionId: string;
    readonly sessionTitle: string;
    readonly toolName: string;
    readonly inputPreview: string;
    readonly status: "running" | "completed" | "error";
    readonly timestampMs: number;
  }>;
  readonly alcoveTooltip?: PluginAlcoveTooltipViewModel;
  readonly stockpileCrates?: readonly ResourceStockpileCrateTooltipEntry[];
  readonly configuredPlugins?: readonly ResourceStockpilePluginTooltipEntry[];
  readonly activeCargoPickups?: readonly ResourceCargoPickupTooltipEntry[];
  readonly activeSubagents?: ReadonlyArray<{
    readonly sessionId: string;
    readonly title: string;
    readonly parentId: string | null;
    readonly agentClass: string;
    readonly lifecycleState: CharacterLifecycleState;
  }>;
  readonly completedSubagentCount?: number;
  readonly hearthIdleSessions?: ReadonlyArray<{
    readonly sessionId: string;
    readonly title: string;
    readonly agentClass: string;
  }>;
  readonly benchArchiveSessions?: ReadonlyArray<{
    readonly sessionId: string;
    readonly title: string;
    readonly agentClass: string;
  }>;
  readonly squadTrophyCount?: number;
}

export interface RoomHeaderStripViewModel {
  readonly daemonIndicatorText: string;
  readonly statusSummaryText: string;
  readonly tuiFooterStatusText: string;
  readonly selectedRoomId: string | null;
  readonly totalRooms: number;
  readonly pluginBadges: readonly PluginAlcoveBadgeViewModel[];
  readonly overflowBadge: Readonly<OverflowAlcoveBadgeViewModel> | null;
}

export interface TopBarOperatorSummaryInput {
  readonly authenticated?: boolean;
  readonly username?: string | null;
  readonly label?: string | null;
  readonly paired?: boolean;
  readonly daemonUrl?: string | null;
  readonly reachable?: boolean;
  readonly pairedMachines?: ReadonlyArray<
    Pick<PairedOpenCodeMachine, "machineId" | "label" | "daemonUrl"> & {
      readonly reachable?: boolean;
      readonly isActive?: boolean;
    }
  >;
}

export interface TopBarMachineTabViewModel {
  readonly machineId: string;
  readonly label: string;
  readonly buttonText: string;
  readonly tooltip: string;
  readonly isActive: boolean;
  readonly reachable: boolean;
  readonly status: "connected" | "unreachable";
}

export interface TopBarClientStateInput {
  readonly selectedProjectId?: string | null;
  readonly selectedRoomId?: string | null;
  readonly rosterMode?: "active-squads" | "full-lineage";
  readonly visualStyleMode?: "clean-cartoon" | "pixel-atlas";
  readonly isAuthenticated?: boolean;
}

export interface TopBarViewModel {
  readonly daemonIndicatorText: string;
  readonly statusSummaryText: string;
  readonly tuiFooterStatusText: string;
  readonly connectionPill: {
    readonly label: string;
    readonly tooltip: string;
    readonly status: "connected" | "unreachable" | "unpaired";
  };
  readonly pairActionLabel: string;
  readonly machineTabs: readonly TopBarMachineTabViewModel[];
  readonly accountPill: {
    readonly label: string;
    readonly tooltip: string;
    readonly authenticated: boolean;
  };
  readonly rosterButtonText: string;
  readonly rosterActive: boolean;
  readonly styleButtonText: string;
  readonly styleActive: boolean;
  readonly worldLabel: "Worlds:" | "Rooms:";
  readonly worldTabs: ReadonlyArray<{
    readonly projectId: string;
    readonly projectName: string;
    readonly sessionCount: number;
    readonly active: boolean;
    readonly crestIcon?: string;
    readonly shortTag?: string;
    readonly partyKey?: string;
    readonly primaryHex?: string;
    readonly accentHex?: string;
    readonly partyName?: string;
  }>;
  readonly totalRooms: number;
}

export interface GuildMasterLedgerViewModel {
  readonly totalRooms: number;
  readonly totalAdventurers: number;
  readonly totalSubagents: number;
  readonly openQuestGates: number;
  readonly totalUsedTokens: number;
  readonly activeUsedTokens: number;
  readonly historicalUsedTokens: number;
  readonly totalCostUsd: number;
  readonly activeCostUsd: number;
  readonly historicalCostUsd: number;
  readonly formattedCost: string;
  readonly tokensTooltip: string;
  readonly costTooltip: string;
  readonly activeGoalAssembly: {
    readonly name: string;
    readonly featureSlug: string;
    readonly sourceLabel: string;
    readonly tier: number;
    readonly milestoneName: string;
    readonly totalParts: number;
    readonly fittedCount: number;
    readonly percentComplete: number;
    readonly isMultiProjectScope?: boolean;
    readonly projectAssemblies?: readonly ProjectMiniAssemblyState[];
    readonly deliverables: readonly AssemblyResultDeliverable[];
    readonly modifiedFiles: readonly string[];
    readonly metrics: GuildResultsMetrics;
  };
  readonly monsterThreat: {
    readonly threatCount: number;
    readonly highestTier: number;
    readonly highestName: string;
    readonly description: string;
  };
  readonly rooms: ReadonlyArray<{
    readonly roomId: string;
    readonly projectName: string;
    readonly sessionCount: number;
    readonly activeCount: number;
  }>;
}
