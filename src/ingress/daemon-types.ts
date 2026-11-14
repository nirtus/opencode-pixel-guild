import type {
  GuildCommandRequest,
  PluginStatusKind,
  QuestGateQuestionField,
  QuestGateSource,
  ReconnectLogEntry,
  SessionTokenTelemetry,
  TelemetryAdapterKind,
  TelemetryEvent,
  TelemetryIngressAdapter,
  ToolExecutionRecord,
  WorldStateReducer,
} from "../types/domain.ts";

export interface OpenCodeDaemonLocationPayload {
  skills?: Array<{ id: string; name?: string; description?: string }>;
  plugins?: Array<{
    namespace: string;
    name?: string;
    status?: PluginStatusKind;
    toolCount?: number;
    statusMessage?: string;
  }>;
  agents?: Array<{
    id: string;
    name?: string;
    color?: string;
    mode?: string;
    hidden?: boolean;
    disabled?: boolean;
    description?: string;
  }>;
  models?: Array<{
    id: string;
    providerId?: string;
    name?: string;
    limitContext: number;
    limitOutput?: number;
  }>;
  activeSessionIds?: string[];
  sessions?: Array<{
    sessionId: string;
    parentId?: string | null;
    title?: string;
    agentClass?: string;
    modelId?: string;
    tokens?: SessionTokenTelemetry;
    skills?: string[];
    activeTool?: {
      callId?: string;
      toolName: string;
      toolInput?: Record<string, unknown> | string | null;
      outputPreview?: string;
      timestampMs?: number;
    } | null;
    recentTools?: ToolExecutionRecord[];
    compactedAtMs?: number | null;
    archived?: boolean;
    updatedAtMs?: number;
    isOpenInOpenCode?: boolean;
    lastAssistantText?: string | null;
    idleAtMs?: number | null;
    viewedAtMs?: number | null;
    turnOutcome?: "succeeded" | "failed" | "interrupted" | null;
    hasUnviewedResult?: boolean;
  }>;
  pendingPermissions?: Array<{
    gateId: string;
    sessionId: string;
    title: string;
    reason: string;
    source?: QuestGateSource;
    action?: string;
    resources?: readonly string[];
  }>;
  pendingQuestions?: Array<{
    gateId: string;
    sessionId: string;
    title: string;
    reason: string;
    source?: QuestGateSource;
    fields?: readonly QuestGateQuestionField[];
  }>;
  sessionLogs?: Record<string, ReconnectLogEntry[]>;
}

export interface DeleteRoomResourcesInput {
  directory: string;
  projectId?: string;
  isWorktree?: boolean;
}

export interface DeleteRoomResourcesResult {
  deletedSessionIds: string[];
  deletedPtyIds: string[];
  deletedShellIds: string[];
  worktreeRemoved: boolean;
  locationEvicted: boolean;
}

export interface OpenCodeDaemonClientPort {
  recordDirectory?(rawDir: string): void;
  getProjects(): Promise<
    Array<{
      id: string;
      name?: string;
      directory: string;
      sandboxes?: string[];
    }>
  >;
  getLocations(): Promise<Array<{ directory: string; projectId?: string }>>;
  getLocationState(directory: string): Promise<OpenCodeDaemonLocationPayload>;
  deleteSession?(sessionId: string, directory?: string): Promise<boolean>;
  deleteRoomResources?(
    input: DeleteRoomResourcesInput,
  ): Promise<DeleteRoomResourcesResult>;
  executeCommand?(
    cmd: GuildCommandRequest,
  ): Promise<{ ok: boolean; sessionId?: string; error?: string }>;
  runShellCommand?(
    directory: string,
    command: string,
  ): Promise<{ ok: boolean; output: string }>;
  getSessionLogAfter?(
    sessionId: string,
    afterCursor: number,
  ): Promise<ReconnectLogEntry[]>;
  getSessionMessages?(
    sessionId: string,
    directory?: string,
  ): Promise<import("./daemon-message-hydration.ts").SessionMessageHydration | null>;
  subscribeEvents?(
    onEvent: (event: TelemetryEvent) => void,
    onReconnect?: () => void,
  ): Promise<() => void> | (() => void);
  clearCaches?(): void;
}

export interface CreateOpenCodeClientAdapterOptions {
  discoverDaemon?: () => Promise<{ url: string }>;
  client: OpenCodeDaemonClientPort;
}

export interface OpenCodeClientAdapter extends TelemetryIngressAdapter {
  getDaemonUrl(): string | null;
  sweepAllLocations(isReconnect?: boolean): Promise<void>;
  startLiveSubscription?(): Promise<void> | void;
  evictDeletedSessions?(sessionIds: Iterable<string>): void;
  evictDeletedRooms?(roomDirs: Iterable<string>): void;
  registerLocation?(
    directory: string,
    meta?: { projectId?: string; projectName?: string },
  ): Promise<void> | void;
  deleteRoom(
    roomId: string,
    meta?: { projectId?: string; isWorktree?: boolean },
  ): Promise<DeleteRoomResourcesResult>;
  start(
    sink: ((event: TelemetryEvent) => void) | WorldStateReducer,
  ): Promise<void> | void;
}
