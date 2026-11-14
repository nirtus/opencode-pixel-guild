import type {
  CharacterState,
  EquipmentLoadout,
  GuildSnapshot,
  RoomDeletedTelemetryEvent,
  SessionDeletedTelemetryEvent,
  TelemetryEvent,
} from "../types/domain.ts";
import { syncCharacterWorkflow } from "./armory-and-workflow.ts";
import { syncAllCharacterTributes, syncCharacterTributeRecord } from "./context-mana.ts";
import { deriveEquipmentLoadout } from "./equipment-loadout.ts";
import { deriveProjectName, normalizeLocationDirectory } from "./location-normalization.ts";
import { clearResolvedQuestGateSession } from "./quest-gate-handlers.ts";
import { bumpCharacterRevision, ensureRoom } from "./reducer-helpers.ts";
import type { InternalWorldStoreState, MutationCollector } from "./reducer-types.ts";

function computeCharacterLoadoutSignature(char: CharacterState, revision: number): string {
  const latestTool = char.recentTools[0];
  return [
    revision,
    char.agentClass,
    char.modelId,
    char.role,
    char.visualTraits.primaryHex,
    char.visualTraits.trimHex,
    char.visualTraits.headgear,
    char.activeWorkstation ?? "",
    char.activePluginNamespace ?? "",
    char.activeCapability?.displayName ?? "",
    char.activeCapability?.inputPreview ?? "",
    char.skillGrimoires.length,
    char.distilledSkillHistory.length,
    char.recentTools.length,
    latestTool ? `${latestTool.callId}:${latestTool.status}:${latestTool.inputPreview}` : "",
    char.childSessionIds.length,
    char.contextMana.usedTokens,
    char.contextMana.limitTokens,
    char.contextMana.compactionCount,
  ].join("|");
}

export function getOrComputeEquipmentLoadout(
  state: InternalWorldStoreState,
  char: CharacterState,
): EquipmentLoadout {
  const revision = state.characterRevisions.get(char.characterId) ?? 0;
  const signature = computeCharacterLoadoutSignature(char, revision);
  const cached = state.loadoutCache.get(char.characterId);
  if (cached && cached.revision === revision && cached.signature === signature) {
    return cached.loadout;
  }
  const loadout = deriveEquipmentLoadout(char);
  state.loadoutCache.set(char.characterId, { revision, signature, loadout });
  return loadout;
}

export function syncRoomAggregates(state: InternalWorldStoreState): void {
  syncAllCharacterTributes(state);
  for (const char of Object.values(state.characters)) {
    char.equipmentLoadout = getOrComputeEquipmentLoadout(state, char);
    if (!char.workflowIntent || !char.overheadLabel) {
      syncCharacterWorkflow(char);
    }
  }
  for (const room of Object.values(state.rooms)) {
    let activeAdventurers = 0;
    let activeSubagents = 0;
    let roomQuestGates = 0;
    const roomActiveSessionIds: string[] = [];

    for (const alcove of room.pluginAlcoves) {
      alcove.activeCharacterIds = [];
    }

    for (const charId of room.characterIds) {
      const char = state.characters[charId];
      if (!char) continue;
      const isActive =
        char.lifecycleState !== "RestingInLounge" && char.lifecycleState !== "Archived";
      if (isActive) {
        roomActiveSessionIds.push(char.sessionId);
        if (char.role === "Guild Adventurer") activeAdventurers += 1;
        else activeSubagents += 1;
      }
      if (char.questGate) roomQuestGates += 1;
      if (char.lifecycleState === "WorkingAtStation" && char.activePluginNamespace) {
        const alcove = room.pluginAlcoves.find((a) => a.namespace === char.activePluginNamespace);
        if (alcove && !alcove.activeCharacterIds.includes(char.characterId)) {
          alcove.activeCharacterIds.push(char.characterId);
        }
      }
    }

    room.activeSessionIds = roomActiveSessionIds;
    room.activeAdventurerCount = activeAdventurers;
    room.activeSubagentCount = activeSubagents;
    room.questGateCount = roomQuestGates;
  }
}

export function buildSnapshot(state: InternalWorldStoreState): GuildSnapshot {
  syncRoomAggregates(state);
  let activeAdventurers = 0;
  let activeSubagents = 0;
  let equippedGrimoires = 0;
  let connectedPlugins = 0;

  const availableSkillSet = new Set<string>(Object.keys(state.catalog.skills));
  for (const char of Object.values(state.characters)) {
    const isActive =
      char.lifecycleState !== "RestingInLounge" && char.lifecycleState !== "Archived";
    if (isActive) {
      if (char.role === "Guild Adventurer") activeAdventurers += 1;
      else activeSubagents += 1;
    }
    equippedGrimoires += char.skillGrimoires.length;
    for (const grimoire of char.skillGrimoires) {
      if (grimoire.skillId) availableSkillSet.add(grimoire.skillId);
    }
  }

  for (const room of Object.values(state.rooms)) {
    for (const alcove of room.pluginAlcoves) {
      if (alcove.status === "connected") connectedPlugins += 1;
    }
  }

  const primaryAgents = Object.values(state.catalog.agents)
    .filter((a) => !a.hidden && !a.disabled && (!a.mode || a.mode === "primary" || a.mode === "all"))
    .map((a) => ({ id: a.id, name: a.name ?? a.id, ...(a.color ? { color: a.color } : {}), ...(a.description ? { description: a.description } : {}) }));

  return {
    version: state.version,
    timestampMs: state.lastTimestampMs,
    activeAdapter: state.activeAdapter,
    daemonUrl: state.daemonUrl,
    rooms: structuredClone(state.rooms),
    roomOrder: [...state.roomOrder],
    characters: structuredClone(state.characters),
    questGates: structuredClone(state.questGates),
    ...(Object.keys(state.tributeLedger).length > 0 ? { tributeLedger: structuredClone(state.tributeLedger) } : {}),
    ...(availableSkillSet.size > 0 ? { availableSkillIds: [...availableSkillSet] } : {}),
    ...(primaryAgents.length > 0 ? { availableAgentModes: primaryAgents } : {}),
    ...(state.deletedSessionIds.size > 0 ? { deletedSessionIds: [...state.deletedSessionIds] } : {}),
    ...(state.deletedRoomIds.size > 0 ? { deletedRoomIds: [...state.deletedRoomIds] } : {}),
    summary: {
      totalRooms: state.roomOrder.length,
      activeAdventurers,
      activeSubagents,
      openQuestGates: Object.keys(state.questGates).length,
      equippedGrimoires,
      connectedPlugins,
    },
  };
}

function expandCascadeDeleteIds(
  state: InternalWorldStoreState,
  seedIds: Iterable<string>,
): Set<string> {
  const deletedIds = new Set<string>(seedIds);
  let expanded = true;
  while (expanded) {
    expanded = false;
    for (const id of [...deletedIds]) {
      const target = state.characters[id];
      for (const childId of target?.childSessionIds ?? []) {
        if (!deletedIds.has(childId)) {
          deletedIds.add(childId);
          expanded = true;
        }
      }
    }
    for (const candidate of Object.values(state.characters)) {
      const parentRef = candidate.parentSessionId ?? candidate.parentId ?? null;
      if (parentRef && deletedIds.has(parentRef) && !deletedIds.has(candidate.sessionId)) {
        deletedIds.add(candidate.sessionId);
        expanded = true;
      }
    }
  }
  return deletedIds;
}

export function handleWorktreeCreated(
  state: InternalWorldStoreState,
  event: Extract<TelemetryEvent, { type: "worktree.created" }>,
  collector: MutationCollector,
): void {
  state.deletedRoomIds.delete(normalizeLocationDirectory(event.parentProjectDirectory));
  state.deletedRoomIds.delete(normalizeLocationDirectory(event.locationDirectory));
  const parentRoom = ensureRoom(state, event.parentProjectDirectory, event.timestampMs);
  const worktreeRoom = ensureRoom(state, event.locationDirectory, event.timestampMs, {
    projectId: event.projectId ?? parentRoom.projectId,
    projectName: event.projectName,
    isWorktree: true,
    parentProjectDirectory: parentRoom.locationDirectory,
  });
  collector.changedRoomIds.add(parentRoom.roomId);
  collector.changedRoomIds.add(worktreeRoom.roomId);
  collector.deltaRoomId = worktreeRoom.roomId;
  collector.description = `Annexed worktree Workshop Room ${worktreeRoom.projectName}`;
}

export function handleSessionMoved(
  state: InternalWorldStoreState,
  event: Extract<TelemetryEvent, { type: "session.moved" }>,
  collector: MutationCollector,
): void {
  state.deletedRoomIds.delete(normalizeLocationDirectory(event.toDirectory));
  const char = state.characters[event.sessionId];
  const targetRoom = ensureRoom(state, event.toDirectory, event.timestampMs);
  if (char) {
    const oldRoom = state.rooms[char.roomId];
    if (oldRoom) {
      oldRoom.characterIds = oldRoom.characterIds.filter((id) => id !== char.characterId);
      collector.changedRoomIds.add(oldRoom.roomId);
    }
    char.roomId = targetRoom.roomId;
    char.locationDirectory = targetRoom.locationDirectory;
    char.projectId = targetRoom.projectId;
    char.projectName = targetRoom.projectName;
    char.lastActivityAtMs = event.timestampMs;
    if (!targetRoom.characterIds.includes(char.characterId)) {
      targetRoom.characterIds.push(char.characterId);
    }
    if (char.questGate) char.questGate.roomId = targetRoom.roomId;
    bumpCharacterRevision(state, char.characterId);
    collector.changedCharacterIds.add(char.characterId);
  }
  collector.changedRoomIds.add(targetRoom.roomId);
  collector.deltaSessionId = event.sessionId;
  collector.deltaRoomId = targetRoom.roomId;
  collector.description = `Moved session ${event.sessionId} to ${targetRoom.roomId}`;
}

export function handleSessionDeleted(
  state: InternalWorldStoreState,
  event: SessionDeletedTelemetryEvent,
  collector: MutationCollector,
): void {
  const deletedIds = expandCascadeDeleteIds(state, [event.sessionId]);
  const rootTarget = state.characters[event.sessionId];
  const survivingParentId = rootTarget?.parentSessionId ?? rootTarget?.parentId ?? null;
  if (survivingParentId && !deletedIds.has(survivingParentId) && state.characters[survivingParentId]) {
    const parentChar = state.characters[survivingParentId];
    parentChar.childSessionIds = parentChar.childSessionIds.filter((id) => !deletedIds.has(id));
    if (parentChar.summoningRitual?.subagentSessionId && deletedIds.has(parentChar.summoningRitual.subagentSessionId)) {
      parentChar.summoningRitual = null;
    }
    parentChar.equipmentLoadout = deriveEquipmentLoadout(parentChar);
    bumpCharacterRevision(state, parentChar.characterId);
    collector.changedCharacterIds.add(parentChar.characterId);
  }

  for (const delId of deletedIds) {
    state.deletedSessionIds.add(delId);
    const delChar = state.characters[delId];
    if (delChar) {
      syncCharacterTributeRecord(state.tributeLedger, delChar, state.rooms);
      if (delChar.questGate) delete state.questGates[delChar.questGate.gateId];
      collector.changedRoomIds.add(delChar.roomId);
      collector.deltaRoomId ??= delChar.roomId;
      delete state.characters[delId];
    }
    state.characterRevisions.delete(delId);
    state.loadoutCache.delete(delId);
    clearResolvedQuestGateSession(state, delId);
    for (const [gateId, gate] of Object.entries(state.questGates)) {
      if (gate.sessionId === delId) delete state.questGates[gateId];
    }
    collector.changedCharacterIds.add(delId);
  }

  if (event.locationDirectory) {
    const normDir = normalizeLocationDirectory(event.locationDirectory);
    if (state.rooms[normDir]) {
      collector.changedRoomIds.add(normDir);
      collector.deltaRoomId ??= normDir;
    }
  }

  for (const room of Object.values(state.rooms)) {
    const hadChar = room.characterIds.some((id) => deletedIds.has(id));
    const hadActive = (room.activeSessionIds ?? []).some((id) => deletedIds.has(id));
    if (hadChar || hadActive) {
      room.characterIds = room.characterIds.filter((id) => !deletedIds.has(id));
      room.activeSessionIds = (room.activeSessionIds ?? []).filter((id) => !deletedIds.has(id));
      collector.changedRoomIds.add(room.roomId);
      collector.deltaRoomId ??= room.roomId;
    }
    if (room.activeSummoningRituals) {
      room.activeSummoningRituals = room.activeSummoningRituals.filter(
        (r) => !deletedIds.has(r.parentSessionId) && !(r.subagentSessionId && deletedIds.has(r.subagentSessionId)),
      );
    }
    for (const alcove of room.pluginAlcoves) {
      alcove.activeCharacterIds = alcove.activeCharacterIds.filter((id) => !deletedIds.has(id));
    }
  }

  collector.deltaSessionId = event.sessionId;
  collector.description =
    deletedIds.size > 1
      ? `Terminated session ${event.sessionId} and cascaded removal to ${deletedIds.size - 1} Squad Subagent(s)`
      : `Terminated session ${event.sessionId}`;
}

export function handleRoomDeleted(
  state: InternalWorldStoreState,
  event: RoomDeletedTelemetryEvent,
  collector: MutationCollector,
): void {
  const roomId = normalizeLocationDirectory(event.locationDirectory ?? event.roomId);
  const existingRoom = state.rooms[roomId];
  const roomName = existingRoom?.projectName ?? deriveProjectName(roomId);
  const targetRoomIds = new Set<string>([roomId]);
  if (!existingRoom?.isWorktree) {
    for (const r of Object.values(state.rooms)) {
      const parentNorm = r.parentProjectDirectory ? normalizeLocationDirectory(r.parentProjectDirectory) : null;
      if (parentNorm === roomId || r.roomId.startsWith(`${roomId}/.worktrees/`) || r.roomId.startsWith(`${roomId}/worktree/`)) {
        targetRoomIds.add(r.roomId);
      }
    }
  }
  for (const tid of targetRoomIds) state.deletedRoomIds.add(tid);

  const seedCharIds = new Set<string>();
  for (const tid of targetRoomIds) {
    for (const cid of state.rooms[tid]?.characterIds ?? []) seedCharIds.add(cid);
  }
  for (const char of Object.values(state.characters)) {
    const charLoc = normalizeLocationDirectory(char.locationDirectory);
    if (targetRoomIds.has(char.roomId) || targetRoomIds.has(charLoc)) {
      seedCharIds.add(char.sessionId);
    }
  }

  const deletedCharIds = expandCascadeDeleteIds(state, seedCharIds);

  for (const delId of deletedCharIds) {
    state.deletedSessionIds.add(delId);
    const delChar = state.characters[delId];
    if (delChar) {
      syncCharacterTributeRecord(state.tributeLedger, delChar, state.rooms);
      if (delChar.questGate) delete state.questGates[delChar.questGate.gateId];
      if (!targetRoomIds.has(delChar.roomId)) collector.changedRoomIds.add(delChar.roomId);
      delete state.characters[delId];
    }
    state.characterRevisions.delete(delId);
    state.loadoutCache.delete(delId);
    clearResolvedQuestGateSession(state, delId);
    collector.changedCharacterIds.add(delId);
  }

  for (const surviving of Object.values(state.characters)) {
    if (surviving.childSessionIds.some((id) => deletedCharIds.has(id))) {
      surviving.childSessionIds = surviving.childSessionIds.filter((id) => !deletedCharIds.has(id));
      surviving.equipmentLoadout = deriveEquipmentLoadout(surviving);
      bumpCharacterRevision(state, surviving.characterId);
      collector.changedCharacterIds.add(surviving.characterId);
    }
  }

  for (const [gateId, gate] of Object.entries(state.questGates)) {
    if (targetRoomIds.has(gate.roomId) || deletedCharIds.has(gate.sessionId)) {
      delete state.questGates[gateId];
    }
  }

  for (const tid of targetRoomIds) {
    delete state.rooms[tid];
    delete state.roomAllPlugins[tid];
    const orderIdx = state.roomOrder.indexOf(tid);
    if (orderIdx !== -1) state.roomOrder.splice(orderIdx, 1);
    collector.changedRoomIds.add(tid);
  }

  for (const otherRoom of Object.values(state.rooms)) {
    otherRoom.characterIds = otherRoom.characterIds.filter((id) => !deletedCharIds.has(id));
    otherRoom.activeSessionIds = (otherRoom.activeSessionIds ?? []).filter((id) => !deletedCharIds.has(id));
  }

  collector.deltaRoomId = roomId;
  collector.description = `Demolished Workshop Room ${roomName} (${roomId})`;
}
