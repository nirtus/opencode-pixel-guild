import {
  WORKSTATION_CATALOG,
  type GuildDelta,
  type GuildStateEmission,
  type GuildStateSubscriber,
  type TelemetryAdapterKind,
  type TelemetryEvent,
  type WorldStateReducer,
} from "../types/domain.ts";
import {
  handleCatalogHydrated,
  handleLocationDiscovered,
  handleStreamReconnected,
  handleTasksHydrated,
  handleTimerTick,
} from "./batch-reconciler.ts";
import { pruneDeletedHostRooms } from "./reducer-helpers.ts";
import { mergeSessionTributeRecord, syncCharacterTributeRecord } from "./context-mana.ts";
import { normalizeLocationDirectory } from "./location-normalization.ts";
import {
  SUBAGENT_RETURN_TRANSIT_MS,
  type CreateWorldStateReducerOptions,
  type InternalWorldStoreState,
  type MutationCollector,
  type ReducerTelemetryEvent,
} from "./reducer-types.ts";
import {
  handleSessionArchived,
  handleSessionCompacted,
  handleSessionCompacting,
  handleSessionError,
  handleSessionIdle,
  handleSessionStatus,
  handleSessionUpserted,
  handleSessionViewed,
  handleSubagentSpawned,
} from "./session-handlers.ts";
import {
  buildSnapshot,
  handleRoomDeleted,
  handleSessionDeleted,
  handleSessionMoved,
  handleWorktreeCreated,
} from "./snapshot-builder.ts";
import {
  clearAllResolvedQuestGates,
  handleMessageUserPrompt,
  handlePluginStatusUpdated,
  handleQuestGateOpened,
  handleQuestGateResolved,
  handleSkillActivated,
  handleToolCompleted,
  handleToolStarted,
} from "./tool-and-gate-handlers.ts";

export { WORKSTATION_CATALOG, SUBAGENT_RETURN_TRANSIT_MS };
export type { CreateWorldStateReducerOptions, ReducerTelemetryEvent };
export * from "./location-normalization.ts";
export * from "./context-mana.ts";
export * from "./equipment-loadout.ts";
export * from "./armory-and-workflow.ts";

export function createWorldStateReducer(
  options: CreateWorldStateReducerOptions = {},
): WorldStateReducer {
  const state: InternalWorldStoreState = {
    catalog: { skills: {}, plugins: {}, agents: {}, tools: {}, models: {} },
    rooms: {},
    roomAllPlugins: {},
    roomOrder: [],
    deletedRoomIds: new Set<string>(),
    deletedSessionIds: new Set<string>(),
    characters: {},
    questGates: {},
    tributeLedger: {},
    subscribers: new Set<GuildStateSubscriber>(),
    characterRevisions: new Map<string, number>(),
    loadoutCache: new Map(),
    version: 0,
    lastTimestampMs: 0,
    activeAdapter: options.initialAdapter ?? "opencode-client",
    daemonUrl: options.daemonUrl ?? null,
  };

  let cachedTickSnapshot: ReturnType<typeof buildSnapshot> | null = null;

  function applyEventInternal(
    rawEvent: TelemetryEvent | ReducerTelemetryEvent,
    collector: MutationCollector,
  ): void {
    const event = rawEvent as ReducerTelemetryEvent;
    if (event.type === "timer.tick") {
      handleTimerTick(state, event, collector);
      if (collector.changedRoomIds.size === 0 && collector.changedCharacterIds.size === 0) {
        return;
      }
    }
    state.version += 1;
    state.lastTimestampMs = Math.max(state.lastTimestampMs, event.timestampMs);
    collector.description = event.type;

    switch (event.type) {
      case "adapter.switched":
        state.activeAdapter = event.adapter;
        if (event.daemonUrl !== undefined) state.daemonUrl = event.daemonUrl;
        collector.description = `Switched telemetry adapter to ${event.adapter}`;
        break;
      case "catalog.hydrated": handleCatalogHydrated(state, event, collector); break;
      case "location.discovered": handleLocationDiscovered(state, event, collector); break;
      case "worktree.created": handleWorktreeCreated(state, event, collector); break;
      case "session.moved": handleSessionMoved(state, event, collector); break;
      case "session.upserted": handleSessionUpserted(state, event, collector); break;
      case "subagent.spawned": handleSubagentSpawned(state, event, collector); break;
      case "session.status": handleSessionStatus(state, event, collector); break;
      case "tool.started": handleToolStarted(state, event, collector); break;
      case "tool.completed": handleToolCompleted(state, event, collector); break;
      case "skill.activated":
      case "message.skill.item":
        handleSkillActivated(state, event, collector);
        break;
      case "message.user.prompt": handleMessageUserPrompt(state, event, collector); break;
      case "permission.requested":
      case "question.requested":
        handleQuestGateOpened(state, event, collector);
        break;
      case "permission.resolved":
      case "question.resolved":
        handleQuestGateResolved(state, event, collector);
        break;
      case "session.compacting": handleSessionCompacting(state, event, collector); break;
      case "session.compacted": handleSessionCompacted(state, event, collector); break;
      case "session.idle": handleSessionIdle(state, event, collector); break;
      case "session.viewed": handleSessionViewed(state, event, collector); break;
      case "session.error": handleSessionError(state, event, collector); break;
      case "session.archived": handleSessionArchived(state, event, collector); break;
      case "session.deleted": handleSessionDeleted(state, event, collector); break;
      case "room.deleted": handleRoomDeleted(state, event, collector); break;
      case "plugin.status.updated": handlePluginStatusUpdated(state, event, collector); break;
      case "timer.tick": break;
      case "stream.reconnected": handleStreamReconnected(state, event, collector); break;
      case "tasks.hydrated":
      case "goal.progress":
        handleTasksHydrated(state, event, collector);
        break;
    }
  }

  function finalizeEmission(
    collector: MutationCollector,
    kind: string,
  ): GuildStateEmission {
    const snapshot = buildSnapshot(state);
    cachedTickSnapshot = snapshot;
    const delta: GuildDelta = {
      version: state.version,
      timestampMs: state.lastTimestampMs,
      kind,
      roomId: collector.deltaRoomId,
      sessionId: collector.deltaSessionId,
      description: collector.description,
      changedRoomIds: [...collector.changedRoomIds],
      changedCharacterIds: [...collector.changedCharacterIds],
    };

    const emission: GuildStateEmission = { snapshot, delta };
    for (const listener of state.subscribers) listener(emission);
    return emission;
  }

  function dispatch(rawEvent: TelemetryEvent | ReducerTelemetryEvent): GuildStateEmission {
    const collector: MutationCollector = {
      changedRoomIds: new Set<string>(),
      changedCharacterIds: new Set<string>(),
      deltaSessionId: null,
      deltaRoomId: null,
      description: rawEvent.type,
    };
    applyEventInternal(rawEvent, collector);
    if (
      rawEvent.type === "timer.tick" &&
      collector.changedRoomIds.size === 0 &&
      collector.changedCharacterIds.size === 0
    ) {
      if (!cachedTickSnapshot || cachedTickSnapshot.version !== state.version) {
        cachedTickSnapshot = buildSnapshot(state);
      }
      return {
        snapshot: cachedTickSnapshot,
        delta: {
          version: state.version,
          timestampMs: Math.max(state.lastTimestampMs, rawEvent.timestampMs),
          kind: "timer.tick",
          roomId: null,
          sessionId: null,
          description: "timer.tick",
          changedRoomIds: [],
          changedCharacterIds: [],
        },
      };
    }
    return finalizeEmission(collector, rawEvent.type);
  }

  function dispatchBatch(
    events: ReadonlyArray<TelemetryEvent | ReducerTelemetryEvent>,
  ): GuildStateEmission | null {
    if (!events || events.length === 0) return null;
    const ordered = events
      .map((ev, idx) => ({ ev, idx }))
      .sort((a, b) => {
        const tsDiff = (a.ev.timestampMs ?? 0) - (b.ev.timestampMs ?? 0);
        if (tsDiff !== 0) return tsDiff;
        const curA = "sequenceCursor" in a.ev && typeof a.ev.sequenceCursor === "number" ? a.ev.sequenceCursor : undefined;
        const curB = "sequenceCursor" in b.ev && typeof b.ev.sequenceCursor === "number" ? b.ev.sequenceCursor : undefined;
        if (curA !== undefined && curB !== undefined && curA !== curB) return curA - curB;
        return a.idx - b.idx;
      })
      .map((entry) => entry.ev);
    const lastEvent = ordered[ordered.length - 1];
    const collector: MutationCollector = {
      changedRoomIds: new Set<string>(),
      changedCharacterIds: new Set<string>(),
      deltaSessionId: null,
      deltaRoomId: null,
      description: lastEvent.type,
    };
    for (const rawEvent of ordered) {
      applyEventInternal(rawEvent, collector);
    }
    return finalizeEmission(collector, lastEvent.type);
  }

  return {
    dispatch,
    dispatchBatch,
    getSnapshot: () => buildSnapshot(state),
    getCatalog: () => structuredClone(state.catalog),
    subscribe(listener: GuildStateSubscriber): () => void {
      state.subscribers.add(listener);
      return () => {
        state.subscribers.delete(listener);
      };
    },
    reset(resetOpts?: { adapter?: TelemetryAdapterKind; daemonUrl?: string | null }): void {
      state.catalog = { skills: {}, plugins: {}, agents: {}, tools: {}, models: {} };
      state.rooms = {};
      state.roomAllPlugins = {};
      state.roomOrder = [];
      state.deletedRoomIds.clear();
      state.deletedSessionIds.clear();
      state.characters = {};
      state.questGates = {};
      state.tributeLedger = {};
      state.characterRevisions.clear();
      state.loadoutCache.clear();
      clearAllResolvedQuestGates(state);
      state.version = 0;
      state.lastTimestampMs = 0;
      state.activeAdapter = resetOpts?.adapter ?? options.initialAdapter ?? "opencode-client";
      state.daemonUrl =
        resetOpts && "daemonUrl" in resetOpts
          ? (resetOpts.daemonUrl ?? null)
          : (options.daemonUrl ?? null);
    },
    hydrateFromSnapshot(persisted, catalog) {
      if (!persisted) return;
      if (catalog && typeof catalog === "object") {
        state.catalog = {
          skills: { ...state.catalog.skills, ...(catalog.skills ?? {}) },
          plugins: { ...state.catalog.plugins, ...(catalog.plugins ?? {}) },
          agents: { ...state.catalog.agents, ...(catalog.agents ?? {}) },
          tools: { ...state.catalog.tools, ...(catalog.tools ?? {}) },
          models: { ...state.catalog.models, ...(catalog.models ?? {}) },
        };
      }
      if (Array.isArray(persisted.availableAgentModes)) {
        for (const a of persisted.availableAgentModes) {
          if (a?.id && !state.catalog.agents[a.id]) {
            state.catalog.agents[a.id] = { id: a.id, name: a.name ?? a.id, kind: "agent", color: a.color, description: a.description, mode: "primary" };
          }
        }
      }
      if (persisted.rooms && typeof persisted.rooms === "object") {
        for (const [roomId, room] of Object.entries(persisted.rooms)) {
          if (room && room.characterIds?.length === 0 && /^\/(?:home|Users|c\/Users)\/[^/]+$/i.test(roomId)) {
            continue;
          }
          if (!state.rooms[roomId] && room) {
            state.rooms[roomId] = structuredClone(room);
            const roomMap = (state.roomAllPlugins[roomId] ??= {});
            for (const alcove of room.pluginAlcoves ?? []) {
              if (alcove?.namespace) roomMap[alcove.namespace.toLowerCase()] = structuredClone(alcove);
            }
          }
        }
      }
      if (Array.isArray(persisted.roomOrder)) {
        for (const roomId of persisted.roomOrder) {
          if (!state.roomOrder.includes(roomId) && state.rooms[roomId]) {
            state.roomOrder.push(roomId);
          }
        }
      } else if (persisted.rooms) {
        state.roomOrder = Object.keys(state.rooms);
      }
      if (persisted.tributeLedger && typeof persisted.tributeLedger === "object") {
        for (const rec of Object.values(persisted.tributeLedger)) {
          if (rec?.sessionId) mergeSessionTributeRecord(state.tributeLedger, rec);
        }
      }
      if (persisted.characters && typeof persisted.characters === "object") {
        for (const char of Object.values(persisted.characters)) {
          if (char) syncCharacterTributeRecord(state.tributeLedger, char, state.rooms);
        }
      }
      if (Array.isArray(persisted.deletedRoomIds)) {
        for (const delRoomId of persisted.deletedRoomIds) {
          if (typeof delRoomId === "string" && delRoomId) {
            const normDel = normalizeLocationDirectory(delRoomId);
            state.deletedRoomIds.add(normDel);
            delete state.rooms[normDel];
            delete state.roomAllPlugins[normDel];
            const idx = state.roomOrder.indexOf(normDel);
            if (idx !== -1) state.roomOrder.splice(idx, 1);
          }
        }
      }
      if (Array.isArray(persisted.deletedSessionIds)) {
        for (const delId of persisted.deletedSessionIds) {
          if (typeof delId === "string" && delId) {
            state.deletedSessionIds.add(delId);
            delete state.characters[delId];
          }
        }
        for (const room of Object.values(state.rooms)) {
          room.characterIds = (room.characterIds ?? []).filter((id) => !state.deletedSessionIds.has(id));
          room.activeSessionIds = (room.activeSessionIds ?? []).filter((id) => !state.deletedSessionIds.has(id));
        }
      }
      if (persisted.characters && typeof persisted.characters === "object") {
        for (const [charId, char] of Object.entries(persisted.characters)) {
          if (!state.deletedSessionIds.has(charId) && !state.characters[charId] && char) {
            state.characters[charId] = structuredClone(char);
            state.characterRevisions.set(charId, 1);
          }
        }
      }
      if (persisted.questGates && typeof persisted.questGates === "object") {
        for (const [gateId, gate] of Object.entries(persisted.questGates)) {
          if (!state.questGates[gateId] && gate) state.questGates[gateId] = structuredClone(gate);
        }
      }
      pruneDeletedHostRooms(state);
      state.version += 1;
      state.lastTimestampMs = Math.max(state.lastTimestampMs, persisted.timestampMs ?? Date.now());
      if (state.subscribers.size > 0) {
        finalizeEmission(
          {
            changedRoomIds: new Set(Object.keys(state.rooms)),
            changedCharacterIds: new Set(Object.keys(state.characters)),
            deltaSessionId: null,
            deltaRoomId: null,
            description: "snapshot.hydrated",
          },
          "snapshot.hydrated",
        );
      }
    },
  };
}
