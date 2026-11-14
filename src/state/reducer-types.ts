import type {
  CapabilityCatalog,
  CharacterState,
  EquipmentLoadout,
  GuildStateSubscriber,
  PluginAlcoveState,
  QuestGateQuestionField,
  QuestGateSource,
  QuestGateState,
  SessionTokenTelemetry,
  TelemetryAdapterKind,
  TelemetryEvent,
  WorkshopRoomState,
  WorkstationKind,
} from "../types/domain.ts";

export const SUBAGENT_RETURN_TRANSIT_MS = 1_800;

export interface CreateWorldStateReducerOptions {
  initialAdapter?: TelemetryAdapterKind;
  daemonUrl?: string | null;
}

export interface HydratedToolRecordInput {
  callId?: string;
  toolName: string;
  workstation?: WorkstationKind;
  pluginNamespace?: string | null;
  status?: "running" | "completed" | "error";
  inputPreview?: string;
  outputPreview?: string;
  toolInput?: Record<string, unknown> | string | null;
  timestampMs?: number;
  startedAtMs?: number;
  completedAtMs?: number;
  sequenceOrder?: number;
}

export type SessionUpsertedEvent = Extract<
  TelemetryEvent,
  { type: "session.upserted" }
> & {
  updatedAtMs?: number;
  idleAtMs?: number | null;
  viewedAtMs?: number | null;
  turnOutcome?: "succeeded" | "failed" | "interrupted" | null;
  hasUnviewedResult?: boolean;
  isOpenInOpenCode?: boolean;
  preserveActivityTimestamp?: boolean;
  worktreeDirectory?: string;
  recentTools?: HydratedToolRecordInput[];
};

export interface SubagentSpawnedTelemetryEvent {
  type: "subagent.spawned";
  timestampMs: number;
  sessionId: string;
  parentId: string;
  locationDirectory: string;
  title?: string;
  agentClass?: string;
  modelId?: string;
  agentColor?: string | null;
  tokens?: SessionTokenTelemetry;
  recentTools?: HydratedToolRecordInput[];
  sequenceCursor?: number;
  updatedAtMs?: number;
  isOpenInOpenCode?: boolean;
}

export type PermissionRequestedTelemetryEvent = Extract<
  TelemetryEvent,
  { type: "permission.requested" }
> & {
  source?: QuestGateSource;
  fields?: ReadonlyArray<QuestGateQuestionField>;
  action?: string;
  resources?: ReadonlyArray<string>;
};

export type QuestionAskedTelemetryEvent = Extract<
  TelemetryEvent,
  { type: "question.requested" }
> & {
  source?: QuestGateSource;
  fields?: ReadonlyArray<QuestGateQuestionField>;
  action?: string;
  resources?: ReadonlyArray<string>;
};

export type ReducerTelemetryEvent =
  | TelemetryEvent
  | SessionUpsertedEvent
  | SubagentSpawnedTelemetryEvent
  | PermissionRequestedTelemetryEvent
  | QuestionAskedTelemetryEvent;

export interface CachedLoadoutEntry {
  revision: number;
  signature: string;
  loadout: EquipmentLoadout;
}

export interface InternalWorldStoreState {
  catalog: CapabilityCatalog;
  rooms: Record<string, WorkshopRoomState>;
  roomAllPlugins: Record<string, Record<string, PluginAlcoveState>>;
  roomOrder: string[];
  deletedRoomIds: Set<string>;
  deletedSessionIds: Set<string>;
  characters: Record<string, CharacterState>;
  questGates: Record<string, QuestGateState>;
  tributeLedger: Record<string, import("../types/domain.ts").SessionTributeRecord>;
  subscribers: Set<GuildStateSubscriber>;
  characterRevisions: Map<string, number>;
  loadoutCache: Map<string, CachedLoadoutEntry>;
  version: number;
  lastTimestampMs: number;
  nextToolSequence?: number;
  activeAdapter: TelemetryAdapterKind;
  daemonUrl: string | null;
}

export interface MutationCollector {
  changedRoomIds: Set<string>;
  changedCharacterIds: Set<string>;
  deltaSessionId: string | null;
  deltaRoomId: string | null;
  description: string;
}
