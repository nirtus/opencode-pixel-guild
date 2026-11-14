import type { QuestGateQuestionField, QuestGateSource } from "./command-types.ts";
import type { GuildRoleArchetype } from "./role-archetypes.ts";
import type {
  CoreWorkstationKind,
  PreparationStationDisplayName,
  WorkstationKind,
} from "./station-catalog.ts";

export type WorkflowIntentKind = "feature-build" | "debugging-hunt" | "information-gathering";

const RESOURCE_CARGO_KINDS = [
  "iron-bar", "timber-planks", "stone-block", "arcane-crystal", "scroll-bundle",
] as const;
export type ResourceCargoKind = (typeof RESOURCE_CARGO_KINDS)[number];

export interface ResourceCargoDescriptor {
  readonly kind: ResourceCargoKind;
  readonly label: string;
  readonly colorHex: string;
  readonly outlineHex: string;
  readonly targetWorkstation: WorkstationKind;
  readonly toolName: string | null;
  readonly pluginNamespace: string | null;
}

const CHARACTER_LIFECYCLE_STATES = [
  "Entering", "Thinking", "WorkingAtStation", "BlockedAtQuestGate",
  "DistillingContextMana", "ReportingScroll", "RestingInLounge", "Archived",
] as const;
export type CharacterLifecycleState = (typeof CHARACTER_LIFECYCLE_STATES)[number];

const CHARACTER_ROLES = ["Guild Adventurer", "Squad Subagent"] as const;
export type CharacterRole = (typeof CHARACTER_ROLES)[number];

const BUILT_IN_AGENT_CLASSES = ["build", "plan", "explore", "general"] as const;
export type BuiltInAgentClass = (typeof BUILT_IN_AGENT_CLASSES)[number];

const SKILL_ACTIVATION_SOURCES = [
  "skill-tool", "prompt-attachment", "skill-message", "inherited",
] as const;
export type SkillActivationSource = (typeof SKILL_ACTIVATION_SOURCES)[number];

const PLUGIN_STATUS_KINDS = ["connected", "needs_auth", "failed", "disabled"] as const;
export type PluginStatusKind = (typeof PLUGIN_STATUS_KINDS)[number];

export const PLUGIN_ALCOVE_ARCHETYPES = [
  "Portal Mirror", "Crystal Vault", "War Table", "Arcane Conduit",
] as const;
export type PluginAlcoveArchetype = (typeof PLUGIN_ALCOVE_ARCHETYPES)[number];

const QUEST_GATE_KINDS = ["permission", "question"] as const;
export type QuestGateKind = (typeof QUEST_GATE_KINDS)[number];

export const HEADGEAR_SILHOUETTES = [
  "hood", "visored-helm", "arcane-circlet", "plumed-cap", "alchemist-goggles", "horned-crown",
] as const;
export type HeadgearSilhouette = (typeof HEADGEAR_SILHOUETTES)[number];

const TELEMETRY_ADAPTER_KINDS = [
  "opencode-plugin", "opencode-client", "demo-simulator",
] as const;
export type TelemetryAdapterKind = (typeof TELEMETRY_ADAPTER_KINDS)[number];

export const LIFECYCLE_TIMERS_MS = {
  ENTERING_DWELL_MS: 600,
  ARCANE_LECTERN_MIN_DWELL_MS: 1500,
  DISTILLING_CONTEXT_MANA_DWELL_MS: 1200,
  REPORTING_SCROLL_DWELL_MS: 900,
  SUMMONING_RITUAL_DWELL_MS: 900,
  HISTORICAL_ARCHIVE_IDLE_MS: 30 * 60 * 1000,
} as const;

export const MAX_DEDICATED_PLUGIN_ALCOVES = 4;

export interface VisualTraitPalette {
  primaryHex: string; secondaryHex: string; trimHex: string; auraHex: string;
  monogram: string; headgear: HeadgearSilhouette; alcoveArchetype: PluginAlcoveArchetype; hashSeed: number;
}

export type CapabilityClassificationTier = 1 | 2 | 3;
export type CapabilityKind = "builtin-tool" | "skill" | "plugin-tool" | "code-mode" | "agent";

export interface CapabilityCatalogEntry {
  id: string; name?: string; kind: "tool" | "skill" | "plugin" | "mcp" | "agent";
  namespace?: string; color?: string; status?: PluginStatusKind; description?: string; mode?: string; hidden?: boolean; disabled?: boolean;
}

export interface ModelCatalogEntry {
  id: string; providerId?: string; name?: string; limitContext: number; limitOutput?: number;
}

export interface CapabilityCatalog {
  skills: Record<string, CapabilityCatalogEntry>;
  plugins: Record<string, CapabilityCatalogEntry>;
  agents: Record<string, CapabilityCatalogEntry>;
  tools: Record<string, CapabilityCatalogEntry>;
  models?: Record<string, ModelCatalogEntry>;
}

export interface ClassifyCapabilityRequest {
  kind?: "tool" | "skill" | "plugin" | "agent";
  identifier: string;
  input?: Record<string, unknown> | string | null;
  agentColor?: string | null;
  catalog?: Partial<CapabilityCatalog>;
}

export interface CapabilityDescriptor {
  capabilityId: string; displayName: string; toolName?: string; kind: CapabilityKind; tier: CapabilityClassificationTier;
  targetWorkstation: WorkstationKind; pluginNamespace: string | null; secondaryAlcoveNamespaces: string[];
  skillId: string | null; minimumDwellMs: number; visualTraits: VisualTraitPalette; inputPreview: string;
}

export interface SkillGrimoire {
  skillId: string; name: string; activatedBy: SkillActivationSource; activatedAtMs: number;
  inheritedFromSessionId: string | null; emblemHex: string; monogram: string;
}

export interface QuestGateState {
  gateId: string; sessionId: string; roomId: string; kind: QuestGateKind;
  marker: "!" | "?"; title: string; reason: string; openedAtMs: number;
  source?: QuestGateSource; fields?: readonly QuestGateQuestionField[];
  action?: string; resources?: readonly string[];
}

export interface ContextManaState {
  usedTokens: number; limitTokens: number; fillRatio: number;
  inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number;
  totalCostUsd: number; compactionCount: number; lastDistilledAtMs: number | null;
}

export interface SessionTributeRecord {
  sessionId: string; roomId: string; locationDirectory: string; projectId: string;
  totalTokens: number; inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number;
  totalCostUsd: number; updatedAtMs: number;
}

export interface ReportScrollState {
  fromSubagentSessionId: string; toParentSessionId: string; targetTile?: { x: number; y: number };
  summary: string; createdAtMs: number; deliveredAtMs: number | null;
}

export interface SummoningRitualState {
  ritualId: string; parentSessionId: string; subagentSessionId: string | null; roomId: string;
  parentTile: { x: number; y: number }; summonTile: { x: number; y: number };
  startedAtMs: number; endsAtMs: number; active: boolean;
}

export interface CharacterErrorState {
  message: string; retryCount: number; occurredAtMs: number;
}

export interface ToolExecutionRecord {
  callId: string;
  toolName: string;
  workstation: WorkstationKind;
  preparationStation?: PreparationStationDisplayName;
  pluginNamespace: string | null;
  resourceCargo?: ResourceCargoKind;
  status: "running" | "completed" | "error";
  inputPreview: string;
  outputPreview?: string;
  timestampMs: number;
  startedAtMs?: number;
  completedAtMs?: number;
  sequenceOrder?: number;
}

export interface EquipmentSlotItem {
  slot: "headgear" | "robes" | "mainHand" | "offHand";
  rpgName: string; opencodeBinding: string; tier: 0 | 1 | 2 | 3; iconKey: string; colorHex: string;
}

export interface ToolBeltEntry {
  toolName: string;
  workstation: WorkstationKind;
  preparationStation?: PreparationStationDisplayName;
  count: number;
  lastInputPreview: string;
}

export interface EquipmentLoadout {
  level: number; readinessTier: 0 | 1 | 2 | 3; tierTitle: string;
  headgear: EquipmentSlotItem; robes: EquipmentSlotItem; mainHand: EquipmentSlotItem; offHand: EquipmentSlotItem;
  toolBelt: readonly ToolBeltEntry[];
}

export interface CharacterState {
  characterId: string;
  sessionId: string;
  parentId: string | null;
  parentSessionId?: string | null;
  role: CharacterRole;
  roomId: string;
  locationDirectory: string;
  projectId?: string;
  projectName?: string;
  title: string;
  agentClass: string;
  roleArchetype?: GuildRoleArchetype;
  modelId: string;
  lifecycleState: CharacterLifecycleState;
  stateEnteredAtMs: number;
  lastActivityAtMs: number;
  dwellUntilMs: number | null;
  deferredLifecycleState: CharacterLifecycleState | null;
  activeWorkstation: WorkstationKind | null;
  activePreparationStation?: PreparationStationDisplayName | null;
  activePluginNamespace: string | null;
  secondaryAlcoveTargets: string[];
  activeCapability: CapabilityDescriptor | null;
  activeResourceCargo?: ResourceCargoDescriptor | null;
  currentTile?: { x: number; y: number };
  spawnTile?: { x: number; y: number } | null;
  targetTile?: { x: number; y: number } | null;
  summoningRitual?: SummoningRitualState | null;
  skillGrimoires: SkillGrimoire[];
  distilledSkillHistory: SkillGrimoire[];
  equipmentLoadout: EquipmentLoadout;
  recentTools: ToolExecutionRecord[];
  contextMana: ContextManaState;
  questGate: QuestGateState | null;
  reportScroll: ReportScrollState | null;
  childSessionIds: string[];
  visualTraits: VisualTraitPalette;
  errorState: CharacterErrorState | null;
  sequenceCursor: number;
  workflowIntent?: WorkflowIntentKind;
  overheadLabel?: string;
  isOpenInOpenCode?: boolean;
  equippingAtArmory?: boolean;
  lastEquippedToolCategory?: string;
  lastAssistantText?: string | null;
  lastUserPromptText?: string | null;
  messages?: SessionChatMessage[];
  idleAtMs?: number | null;
  viewedAtMs?: number | null;
  turnOutcome?: "succeeded" | "failed" | "interrupted" | null;
  hasUnviewedResult?: boolean;
}

export interface SessionChatMessage {
  readonly messageId: string;
  readonly role: "user" | "assistant";
  readonly text: string;
  readonly attachedSkills?: readonly string[];
  readonly createdAtMs: number;
  readonly updatedAtMs?: number;
}

export interface PluginAlcoveState {
  namespace: string; displayName: string; status: PluginStatusKind; archetype: PluginAlcoveArchetype;
  monogram: string; colorHex: string; toolCount: number; activeCharacterIds: string[];
  lastInvokedAtMs: number | null; statusMessage?: string;
}

export interface ProjectTaskItem {
  id: string; slug: string; title: string; status: "open" | "claimed" | "resolved";
}

export interface ProjectTaskProgress {
  source: "docs/features" | "subagents" | "none";
  featureSlug: string | null; totalTasks: number; resolvedTasks: number; tasks: readonly ProjectTaskItem[];
  hydratedAtMs?: number;
}

export type WildernessBiomeKind = "forest" | "dungeon" | "dryland";

export interface ProjectWorldVisualSeed {
  readonly projectId: string; readonly biome: WildernessBiomeKind; readonly biomeName: string;
  readonly monsterSetKey: string; readonly ambientSeverity: "peaceful" | "contested" | "infested";
  readonly groundBaseHex: string; readonly groundAltHex: string; readonly pathColorHex: string; readonly fogTintRgba: string;
}

export interface WorkshopRoomState {
  roomId: string; locationDirectory: string; projectId: string; projectName: string;
  isWorktree: boolean; parentProjectDirectory: string | null; workstations: CoreWorkstationKind[];
  pluginAlcoves: PluginAlcoveState[]; overflowPluginNamespaces: string[];
  activeSummoningRituals?: SummoningRitualState[]; characterIds: string[]; activeSessionIds?: string[];
  activeAdventurerCount: number; activeSubagentCount: number; questGateCount: number;
  createdAtMs: number; lastActivityAtMs: number;
  taskProgress?: ProjectTaskProgress; visualSeed?: ProjectWorldVisualSeed;
  availableAgents?: CapabilityCatalogEntry[];
}

export interface GuildSummaryStats {
  totalRooms: number; activeAdventurers: number; activeSubagents: number;
  openQuestGates: number; equippedGrimoires: number; connectedPlugins: number;
}

export interface GuildSnapshot {
  version: number; timestampMs: number; activeAdapter: TelemetryAdapterKind; daemonUrl: string | null;
  rooms: Record<string, WorkshopRoomState>; roomOrder: string[];
  characters: Record<string, CharacterState>; questGates: Record<string, QuestGateState>;
  tributeLedger?: Record<string, SessionTributeRecord>;
  availableSkillIds?: string[]; availableAgentModes?: Array<{ id: string; name?: string; color?: string; description?: string }>; deletedSessionIds?: string[]; deletedRoomIds?: string[];
  summary: GuildSummaryStats;
}

export interface GuildDelta {
  version: number; timestampMs: number; kind: string; roomId: string | null; sessionId: string | null;
  description: string; changedRoomIds: string[]; changedCharacterIds: string[];
}

export interface GuildStateEmission {
  snapshot: GuildSnapshot; delta: GuildDelta;
}

export interface SessionTokenTelemetry {
  usedTokens?: number; limitTokens?: number; inputTokens?: number; outputTokens?: number;
  cacheReadTokens?: number; cacheWriteTokens?: number; totalCostUsd?: number;
  input?: number; output?: number; cacheRead?: number; cacheWrite?: number;
  totalUsd?: number; contextWindowPct?: number;
}

export interface ReconnectLogEntry {
  cursor: number;
  timestampMs: number;
  type: "tool.started" | "tool.completed" | "skill.activated" | "message.user.prompt" | "message.skill.item" | "session.compacted" | "session.idle" | "permission.requested" | "permission.resolved" | "question.requested" | "question.resolved";
  toolName?: string; toolInput?: Record<string, unknown> | string;
  skillId?: string; skills?: string[]; promptText?: string;
  tokens?: SessionTokenTelemetry; gateId?: string; title?: string; reason?: string;
}

export interface LocationReconciliationSnapshot {
  locationDirectory: string; projectId?: string; projectName?: string;
  isWorktree?: boolean; parentProjectDirectory?: string | null; activeSessionIds: string[];
  sessions?: Array<{
    sessionId: string; parentId?: string | null; title?: string; agentClass?: string; modelId?: string;
    tokens?: SessionTokenTelemetry; skills?: string[];
    activeTool?: { callId?: string; toolName: string; toolInput?: Record<string, unknown> | string | null; timestampMs?: number } | null;
    recentTools?: Array<{
      callId?: string; toolName: string; workstation?: WorkstationKind; pluginNamespace?: string | null;
      status?: "running" | "completed" | "error"; inputPreview?: string; outputPreview?: string;
      toolInput?: Record<string, unknown> | string | null; timestampMs?: number; startedAtMs?: number; completedAtMs?: number; sequenceOrder?: number;
    }>;
    compactedAtMs?: number | null; archived?: boolean; locationDirectory?: string;
    lastAssistantText?: string | null; lastUserPromptText?: string | null; messages?: SessionChatMessage[];
    updatedAtMs?: number; idleAtMs?: number | null; viewedAtMs?: number | null;
    turnOutcome?: "succeeded" | "failed" | "interrupted" | null; hasUnviewedResult?: boolean; isOpenInOpenCode?: boolean;
  }>;
  pendingPermissions?: Array<{ gateId: string; sessionId: string; title: string; reason: string; source?: QuestGateSource; fields?: readonly QuestGateQuestionField[]; action?: string; resources?: readonly string[] }>;
  pendingQuestions?: Array<{ gateId: string; sessionId: string; title: string; reason: string; source?: QuestGateSource; fields?: readonly QuestGateQuestionField[]; action?: string; resources?: readonly string[] }>;
  sessionLogs?: Record<string, ReconnectLogEntry[]>;
}

export interface SessionDeletedTelemetryEvent { type: "session.deleted"; timestampMs: number; sessionId: string; locationDirectory?: string; }
export interface RoomDeletedTelemetryEvent { type: "room.deleted"; timestampMs: number; roomId: string; locationDirectory?: string; }

export type TelemetryEvent =
  | SessionDeletedTelemetryEvent
  | RoomDeletedTelemetryEvent
  | { type: "adapter.switched"; timestampMs: number; adapter: TelemetryAdapterKind; daemonUrl?: string | null }
  | { type: "catalog.hydrated"; timestampMs: number; locationDirectory?: string; skills?: Array<{ id: string; name?: string; description?: string }>; plugins?: Array<{ namespace: string; name?: string; status?: PluginStatusKind; source?: { type?: string }; toolCount?: number; statusMessage?: string }>; agents?: Array<{ id: string; name?: string; color?: string; mode?: string; hidden?: boolean; disabled?: boolean; description?: string }>; tools?: Array<{ id: string; name?: string; namespace?: string }>; models?: Array<{ id: string; providerId?: string; name?: string; limitContext: number; limitOutput?: number }> }
  | { type: "location.discovered"; timestampMs: number; locationDirectory: string; projectId?: string; projectName?: string; isWorktree?: boolean; parentProjectDirectory?: string | null; explicit?: boolean }
  | { type: "worktree.created"; timestampMs: number; locationDirectory: string; parentProjectDirectory: string; projectId?: string; projectName?: string }
  | { type: "session.moved"; timestampMs: number; sessionId: string; fromDirectory?: string; toDirectory: string }
  | { type: "session.upserted"; timestampMs: number; sessionId: string; parentId?: string | null; locationDirectory: string; worktreeDirectory?: string; title?: string; agentClass?: string; modelId?: string; agentColor?: string | null; tokens?: SessionTokenTelemetry; recentTools?: Array<{ callId?: string; toolName: string; workstation?: WorkstationKind; pluginNamespace?: string | null; status?: "running" | "completed" | "error"; inputPreview?: string; outputPreview?: string; toolInput?: Record<string, unknown> | string | null; timestampMs?: number; startedAtMs?: number; completedAtMs?: number; sequenceOrder?: number }>; lastAssistantText?: string | null; lastUserPromptText?: string | null; messages?: SessionChatMessage[]; updatedAtMs?: number; idleAtMs?: number | null; viewedAtMs?: number | null; turnOutcome?: "succeeded" | "failed" | "interrupted" | null; hasUnviewedResult?: boolean; isOpenInOpenCode?: boolean; preserveActivityTimestamp?: boolean; sequenceCursor?: number }
  | { type: "subagent.spawned"; timestampMs: number; sessionId: string; parentId: string; locationDirectory: string; title?: string; agentClass?: string; modelId?: string; agentColor?: string | null; tokens?: SessionTokenTelemetry; recentTools?: Array<{ callId?: string; toolName: string; workstation?: WorkstationKind; pluginNamespace?: string | null; status?: "running" | "completed" | "error"; inputPreview?: string; outputPreview?: string; toolInput?: Record<string, unknown> | string | null; timestampMs?: number; startedAtMs?: number; completedAtMs?: number; sequenceOrder?: number }>; sequenceCursor?: number; updatedAtMs?: number; isOpenInOpenCode?: boolean }
  | { type: "session.status"; timestampMs: number; sessionId: string; status: "thinking" | "working" | "idle" | "archived"; tokens?: SessionTokenTelemetry; sequenceCursor?: number }
  | { type: "session.idle"; timestampMs: number; sessionId: string; summary?: string; outcome?: "succeeded" | "failed" | "interrupted"; tokens?: SessionTokenTelemetry; sequenceCursor?: number }
  | { type: "session.viewed"; timestampMs: number; sessionId: string; viewedAtMs?: number; sequenceCursor?: number }
  | { type: "session.compacting"; timestampMs: number; sessionId: string; sequenceCursor?: number }
  | { type: "session.compacted"; timestampMs: number; sessionId: string; tokens?: SessionTokenTelemetry; sequenceCursor?: number }
  | { type: "session.error"; timestampMs: number; sessionId: string; message: string; retryCount?: number; sequenceCursor?: number }
  | { type: "session.archived"; timestampMs: number; sessionId: string; sequenceCursor?: number }
  | { type: "tool.started"; timestampMs: number; sessionId: string; callId?: string; toolName: string; toolInput?: Record<string, unknown> | string | null; sequenceCursor?: number }
  | { type: "tool.completed"; timestampMs: number; sessionId: string; callId?: string; toolName: string; inputPreview?: string; toolInput?: Record<string, unknown> | string | null; outputPreview?: string; tokens?: SessionTokenTelemetry; sequenceCursor?: number }
  | { type: "skill.activated"; timestampMs: number; sessionId: string; skillId: string; skillName?: string; source?: SkillActivationSource; sequenceCursor?: number }
  | { type: "message.user.prompt"; timestampMs: number; sessionId: string; promptText: string; skills?: string[]; sequenceCursor?: number }
  | { type: "message.skill.item"; timestampMs: number; sessionId: string; skillId: string; skillName?: string; sequenceCursor?: number }
  | { type: "permission.requested"; timestampMs: number; sessionId: string; gateId: string; title: string; reason: string; source?: QuestGateSource; fields?: readonly QuestGateQuestionField[]; action?: string; resources?: readonly string[]; sequenceCursor?: number }
  | { type: "permission.resolved"; timestampMs: number; sessionId: string; gateId: string; sequenceCursor?: number }
  | { type: "question.requested"; timestampMs: number; sessionId: string; gateId: string; title: string; reason: string; source?: QuestGateSource; fields?: readonly QuestGateQuestionField[]; action?: string; resources?: readonly string[]; sequenceCursor?: number }
  | { type: "question.resolved"; timestampMs: number; sessionId: string; gateId: string; sequenceCursor?: number }
  | { type: "plugin.status.updated"; timestampMs: number; locationDirectory: string; namespace: string; displayName?: string; status: PluginStatusKind; toolCount?: number; statusMessage?: string }
  | { type: "timer.tick"; timestampMs: number }
  | { type: "tasks.hydrated"; timestampMs: number; roomId?: string; locationDirectory: string; taskProgress: ProjectTaskProgress }
  | { type: "goal.progress"; timestampMs: number; roomId?: string; locationDirectory: string; taskProgress: ProjectTaskProgress }
  | { type: "stream.reconnected"; timestampMs: number; locations: LocationReconciliationSnapshot[] };

export type GuildStateSubscriber = (emission: GuildStateEmission) => void;

export interface WorldStateReducer {
  dispatch(event: TelemetryEvent): GuildStateEmission;
  dispatchBatch(events: ReadonlyArray<TelemetryEvent>): GuildStateEmission | null;
  getSnapshot(): GuildSnapshot;
  getCatalog(): CapabilityCatalog;
  subscribe(listener: GuildStateSubscriber): () => void;
  reset?(options?: { adapter?: TelemetryAdapterKind; daemonUrl?: string | null }): void;
  hydrateFromSnapshot?(snapshot: Partial<GuildSnapshot>, catalog?: CapabilityCatalog): void;
}

export interface TelemetryIngressAdapter {
  readonly kind: TelemetryAdapterKind;
  start(sink: (event: TelemetryEvent) => void): Promise<void> | void;
  stop(): Promise<void> | void;
}
