import { classifyCapability, deriveMonogram, deriveVisualTraits, formatInputPreview, isBuiltinOpenCodePlugin, resolveResourceCargo } from "../capability/classifier.ts";
import {
  CORE_WORKSTATION_KINDS, LIFECYCLE_TIMERS_MS, MAX_DEDICATED_PLUGIN_ALCOVES, resolveGuildRoleArchetype, WORKSTATION_CATALOG,
  type CharacterLifecycleState, type CharacterState, type PluginAlcoveState, type PluginStatusKind,
  type SessionTokenTelemetry, type SkillActivationSource, type SkillGrimoire, type ToolExecutionRecord,
  type VisualTraitPalette, type WorkshopRoomState, type WorkstationKind,
} from "../types/domain.ts";
import { resolvePreparationStationDisplayName } from "../encounter/index.ts";
import { applyArmoryTransition, resolveToolCategory, syncCharacterWorkflow } from "./armory-and-workflow.ts";
import { createInitialContextMana, syncCharacterTributeRecord } from "./context-mana.ts";
import { deriveEquipmentLoadout } from "./equipment-loadout.ts";
import { deriveProjectName, isDeletedHostDirectory, normalizeLocationDirectory } from "./location-normalization.ts";
import type { HydratedToolRecordInput, InternalWorldStoreState, MutationCollector } from "./reducer-types.ts";

const STATUS_PRIORITY: Record<PluginStatusKind, number> = { connected: 4, needs_auth: 3, failed: 2, disabled: 1 };

export function bumpCharacterRevision(state: InternalWorldStoreState, characterId: string): void {
  state.characterRevisions.set(characterId, (state.characterRevisions.get(characterId) ?? 0) + 1);
}

export function ensureRoom(
  state: InternalWorldStoreState,
  rawDirectory: string,
  timestampMs: number,
  meta?: { projectId?: string; projectName?: string; isWorktree?: boolean; parentProjectDirectory?: string | null },
): WorkshopRoomState {
  const roomId = normalizeLocationDirectory(rawDirectory);
  let room = state.rooms[roomId];
  if (!room) {
    const parentDir = meta?.parentProjectDirectory ? normalizeLocationDirectory(meta.parentProjectDirectory) : null;
    room = {
      roomId, locationDirectory: roomId, projectId: meta?.projectId ?? roomId,
      projectName: deriveProjectName(roomId, meta?.projectName), isWorktree: Boolean(meta?.isWorktree || parentDir),
      parentProjectDirectory: parentDir, workstations: [...CORE_WORKSTATION_KINDS], pluginAlcoves: [],
      overflowPluginNamespaces: [], activeSummoningRituals: [], characterIds: [], activeSessionIds: [],
      activeAdventurerCount: 0, activeSubagentCount: 0, questGateCount: 0, createdAtMs: timestampMs, lastActivityAtMs: timestampMs,
    };
    state.rooms[roomId] = room;
    state.roomOrder.push(roomId);
  } else {
    if (meta?.projectId) room.projectId = meta.projectId;
    if (meta?.projectName) room.projectName = meta.projectName;
    if (typeof meta?.isWorktree === "boolean") room.isWorktree = meta.isWorktree;
    if (meta?.parentProjectDirectory !== undefined) {
      room.parentProjectDirectory = meta.parentProjectDirectory ? normalizeLocationDirectory(meta.parentProjectDirectory) : null;
    }
    room.lastActivityAtMs = Math.max(room.lastActivityAtMs, timestampMs);
  }
  return room;
}

export function rebalanceRoomPluginAlcoves(state: InternalWorldStoreState, room: WorkshopRoomState): void {
  const entries = Object.values(state.roomAllPlugins[room.roomId] ?? {});
  entries.sort((a, b) => {
    const aInvoked = a.lastInvokedAtMs ?? 0;
    const bInvoked = b.lastInvokedAtMs ?? 0;
    return aInvoked !== bInvoked ? bInvoked - aInvoked : STATUS_PRIORITY[b.status] - STATUS_PRIORITY[a.status];
  });
  room.pluginAlcoves = entries.slice(0, MAX_DEDICATED_PLUGIN_ALCOVES);
  room.overflowPluginNamespaces = entries.slice(MAX_DEDICATED_PLUGIN_ALCOVES).map((entry) => entry.namespace);
}

export function ensurePluginAlcove(
  state: InternalWorldStoreState,
  room: WorkshopRoomState,
  namespace: string,
  timestampMs: number,
  meta?: { displayName?: string; status?: PluginStatusKind; toolCount?: number; statusMessage?: string },
): PluginAlcoveState | null {
  const ns = namespace.trim().toLowerCase();
  if (isBuiltinOpenCodePlugin(ns)) return null;

  const roomMap = (state.roomAllPlugins[room.roomId] ??= {});
  const existing = roomMap[ns];
  if (existing) {
    if (meta?.displayName) existing.displayName = meta.displayName;
    if (meta?.status) existing.status = meta.status;
    if (typeof meta?.toolCount === "number") existing.toolCount = meta.toolCount;
    if (meta?.statusMessage !== undefined) existing.statusMessage = meta.statusMessage;
    if (timestampMs > 0) existing.lastInvokedAtMs = Math.max(existing.lastInvokedAtMs ?? 0, timestampMs);
    rebalanceRoomPluginAlcoves(state, room);
    return existing;
  }

  const traits = deriveVisualTraits(ns, state.catalog.plugins[ns]?.color);
  const newAlcove: PluginAlcoveState = {
    namespace: ns,
    displayName: meta?.displayName ?? state.catalog.plugins[ns]?.name ?? ns,
    status: meta?.status ?? state.catalog.plugins[ns]?.status ?? "connected",
    archetype: traits.alcoveArchetype,
    monogram: traits.monogram,
    colorHex: traits.primaryHex,
    toolCount: meta?.toolCount ?? 1,
    activeCharacterIds: [],
    lastInvokedAtMs: timestampMs > 0 ? timestampMs : null,
    statusMessage: meta?.statusMessage,
  };
  roomMap[ns] = newAlcove;
  rebalanceRoomPluginAlcoves(state, room);
  return newAlcove;
}

export function resolveWorkstationAnchorTile(workstation: WorkstationKind | null | undefined): { x: number; y: number } {
  const anchor = workstation ? WORKSTATION_CATALOG[workstation]?.anchorTile : null;
  return anchor ? { ...anchor } : { x: 8, y: 4 };
}

export function transitionCharacterState(
  state: InternalWorldStoreState,
  char: CharacterState,
  nextState: CharacterLifecycleState,
  timestampMs: number,
  options?: { preserveLastActivity?: boolean },
): void {
  char.lifecycleState = nextState;
  char.stateEnteredAtMs = timestampMs;
  if (!options?.preserveLastActivity) char.lastActivityAtMs = Math.max(char.lastActivityAtMs, timestampMs);
  if (nextState === "Archived") char.isOpenInOpenCode = false;
  if (nextState === "Thinking" || nextState === "RestingInLounge" || nextState === "Archived") {
    char.activeWorkstation = null;
    char.activePluginNamespace = null;
    char.secondaryAlcoveTargets = [];
    char.activeCapability = null;
    char.activeResourceCargo = null;
    char.dwellUntilMs = null;
    char.deferredLifecycleState = null;
    char.equippingAtArmory = false;
    if (nextState === "RestingInLounge" || nextState === "Archived") {
      char.currentTile = { x: 3, y: 9 };
      char.targetTile = { x: 3, y: 9 };
    } else if (!char.currentTile) {
      char.currentTile = { x: 8, y: 4 };
      char.targetTile = { x: 8, y: 4 };
    }
  }
  syncCharacterWorkflow(char);
  bumpCharacterRevision(state, char.characterId);
}

export function retireParentSubagents(state: InternalWorldStoreState, parent: CharacterState, timestampMs: number, collector?: MutationCollector): void {
  if (parent.parentId || parent.role === "Squad Subagent") return;
  if (parent.summoningRitual?.active) parent.summoningRitual = { ...parent.summoningRitual, active: false };
  const parentRoom = state.rooms[parent.roomId];
  if (parentRoom?.activeSummoningRituals?.length) parentRoom.activeSummoningRituals = parentRoom.activeSummoningRituals.filter((r) => r.parentSessionId !== parent.sessionId);
  const childIds = new Set<string>(parent.childSessionIds);
  for (const ch of Object.values(state.characters)) if (ch.parentId === parent.sessionId || ch.parentSessionId === parent.sessionId) childIds.add(ch.sessionId);
  for (const cid of childIds) {
    const child = state.characters[cid];
    if (!child) continue;
    if (child.questGate) { delete state.questGates[child.questGate.gateId]; child.questGate = null; }
    for (const rec of child.recentTools) if (rec.status === "running") rec.status = "completed";
    if (child.reportScroll && child.reportScroll.deliveredAtMs === null) child.reportScroll.deliveredAtMs = timestampMs;
    if (child.summoningRitual?.active) child.summoningRitual = { ...child.summoningRitual, active: false };
    child.isOpenInOpenCode = false;
    if (child.lifecycleState !== "Archived") transitionCharacterState(state, child, "Archived", timestampMs, { preserveLastActivity: true });
    else bumpCharacterRevision(state, child.characterId);
    collector?.changedCharacterIds.add(child.characterId); collector?.changedRoomIds.add(child.roomId);
  }
}

export function equipSkillGrimoire(
  state: InternalWorldStoreState, character: CharacterState, rawSkillId: string,
  activatedBy: SkillActivationSource, timestampMs: number, explicitName?: string, inheritedFromSessionId: string | null = null,
  triggerArmoryEquip = true,
): SkillGrimoire {
  const skillId = rawSkillId.trim().replace(/^@/, "");
  const existingIdx = character.skillGrimoires.findIndex((g) => g.skillId.toLowerCase() === skillId.toLowerCase());
  if (existingIdx >= 0) {
    const existing = character.skillGrimoires[existingIdx];
    if (!inheritedFromSessionId && existing.activatedBy === "inherited") {
      const updated = { ...existing, activatedBy, activatedAtMs: timestampMs, inheritedFromSessionId: null };
      character.skillGrimoires[existingIdx] = updated;
      character.equipmentLoadout = deriveEquipmentLoadout(character);
      syncCharacterWorkflow(character);
      bumpCharacterRevision(state, character.characterId);
      return updated;
    }
    return existing;
  }
  const catalogSkill = state.catalog.skills[skillId] ?? state.catalog.skills[skillId.toLowerCase()];
  const traits = deriveVisualTraits(skillId, catalogSkill?.color);
  const grimoire: SkillGrimoire = {
    skillId, name: explicitName ?? catalogSkill?.name ?? skillId, activatedBy,
    activatedAtMs: timestampMs, inheritedFromSessionId, emblemHex: traits.primaryHex, monogram: deriveMonogram(skillId),
  };
  character.skillGrimoires.push(grimoire);
  if (!inheritedFromSessionId) {
    if (triggerArmoryEquip) applyArmoryTransition(character, "skill", true);
    for (const childId of character.childSessionIds) {
      const child = state.characters[childId];
      if (child && child.lifecycleState !== "RestingInLounge" && child.lifecycleState !== "Archived") {
        equipSkillGrimoire(state, child, skillId, "inherited", timestampMs, grimoire.name, character.sessionId, false);
      }
    }
  }
  character.equipmentLoadout = deriveEquipmentLoadout(character);
  syncCharacterWorkflow(character);
  bumpCharacterRevision(state, character.characterId);
  return grimoire;
}

export function allocateNextToolSequence(state: InternalWorldStoreState, char?: CharacterState): number {
  let maxSeq = state.nextToolSequence ?? 0;
  for (const rt of char?.recentTools ?? []) {
    if (typeof rt.sequenceOrder === "number" && rt.sequenceOrder > maxSeq) maxSeq = rt.sequenceOrder;
  }
  state.nextToolSequence = maxSeq + 1;
  return state.nextToolSequence;
}

export function sortRecentToolsNewestFirst(records: ToolExecutionRecord[]): ToolExecutionRecord[] {
  return [...records].sort((a, b) => b.timestampMs - a.timestampMs || (b.sequenceOrder ?? 0) - (a.sequenceOrder ?? 0)).slice(0, 30);
}

export function mergeHydratedRecentTools(
  state: InternalWorldStoreState,
  char: CharacterState,
  rawTools: HydratedToolRecordInput[] | undefined,
  fallbackTimestampMs: number,
): void {
  if (!rawTools || rawTools.length === 0) return;
  const byCallId = new Map<string, ToolExecutionRecord>();
  char.recentTools.forEach((existing, i) => {
    if (existing.sequenceOrder === undefined) existing.sequenceOrder = char.recentTools.length - i;
    byCallId.set(existing.callId, existing);
  });
  const baseSeq = allocateNextToolSequence(state, char);

  rawTools.forEach((raw, idx) => {
    const cap = classifyCapability({ kind: "tool", identifier: raw.toolName, input: raw.toolInput, agentColor: char.visualTraits.primaryHex, catalog: state.catalog });
    const ts = raw.startedAtMs ?? raw.timestampMs ?? fallbackTimestampMs;
    const callId = raw.callId ?? `${char.sessionId}:hydrated:${raw.toolName}:${ts}:${idx}`;
    const existing = byCallId.get(callId);
    const preview = raw.inputPreview ?? (formatInputPreview(raw.toolInput) || cap.inputPreview || raw.toolName);
    const resolvedWorkstation = raw.workstation ?? cap.targetWorkstation;
    const resolvedPluginNs = raw.pluginNamespace !== undefined ? raw.pluginNamespace : cap.pluginNamespace;
    const cargo = resolveResourceCargo({ workstation: resolvedWorkstation, toolName: raw.toolName, pluginNamespace: resolvedPluginNs });
    const canonicalTs = existing?.startedAtMs ?? raw.startedAtMs ?? raw.timestampMs ?? existing?.timestampMs ?? fallbackTimestampMs;
    const seqOrder = existing?.sequenceOrder ?? (raw.sequenceOrder !== undefined ? baseSeq + raw.sequenceOrder : baseSeq + (rawTools.length - idx));
    if (seqOrder > (state.nextToolSequence ?? 0)) state.nextToolSequence = seqOrder;
    byCallId.set(callId, {
      callId, toolName: raw.toolName, workstation: resolvedWorkstation,
      preparationStation: resolvePreparationStationDisplayName({
        toolName: raw.toolName, workstation: resolvedWorkstation, pluginNamespace: resolvedPluginNs,
        workflowIntent: char.workflowIntent, agentClass: char.agentClass,
      }),
      pluginNamespace: resolvedPluginNs, resourceCargo: cargo.kind, status: raw.status ?? "completed",
      inputPreview: preview, outputPreview: raw.outputPreview ?? existing?.outputPreview,
      timestampMs: canonicalTs, startedAtMs: existing?.startedAtMs ?? raw.startedAtMs ?? canonicalTs,
      ...(raw.completedAtMs ?? existing?.completedAtMs ? { completedAtMs: raw.completedAtMs ?? existing?.completedAtMs } : {}),
      sequenceOrder: seqOrder,
    });
  });

  char.recentTools = sortRecentToolsNewestFirst([...byCallId.values()]);
  if (!char.lastEquippedToolCategory && char.recentTools.length > 0) {
    char.lastEquippedToolCategory = resolveToolCategory({
      toolName: char.recentTools[0].toolName,
      workstation: char.recentTools[0].workstation,
      pluginNamespace: char.recentTools[0].pluginNamespace,
    });
  }
  char.equipmentLoadout = deriveEquipmentLoadout(char);
  syncCharacterWorkflow(char);
  bumpCharacterRevision(state, char.characterId);
}

export function createCharacterDefaultState(
  state: InternalWorldStoreState,
  input: {
    sessionId: string;
    parentId: string | null;
    room: WorkshopRoomState;
    title: string;
    agentClass: string;
    modelId: string;
    visualTraits: VisualTraitPalette;
    tokens?: SessionTokenTelemetry;
    timestampMs: number;
    activityTimestampMs: number;
    sequenceCursor: number;
    isOpenInOpenCode: boolean;
  },
): CharacterState {
  const initialContextMana = createInitialContextMana(input.tokens, input.modelId, state.catalog.models);
  const role = input.parentId ? "Squad Subagent" : "Guild Adventurer";
  const char: CharacterState = {
    characterId: input.sessionId,
    sessionId: input.sessionId,
    parentId: input.parentId,
    parentSessionId: input.parentId,
    role,
    roomId: input.room.roomId,
    locationDirectory: input.room.locationDirectory,
    projectId: input.room.projectId,
    projectName: input.room.projectName,
    title: input.title,
    agentClass: input.agentClass,
    roleArchetype: resolveGuildRoleArchetype({
      agentClass: input.agentClass,
      title: input.title,
    }),
    modelId: input.modelId,
    lifecycleState: "Entering",
    stateEnteredAtMs: input.timestampMs,
    lastActivityAtMs: input.activityTimestampMs,
    dwellUntilMs: input.timestampMs + LIFECYCLE_TIMERS_MS.ENTERING_DWELL_MS,
    deferredLifecycleState: "Thinking",
    activeWorkstation: null,
    activePluginNamespace: null,
    secondaryAlcoveTargets: [],
    activeCapability: null,
    activeResourceCargo: null,
    currentTile: { x: 8, y: 4 },
    spawnTile: null,
    targetTile: { x: 8, y: 4 },
    summoningRitual: null,
    skillGrimoires: [],
    distilledSkillHistory: [],
    equipmentLoadout: deriveEquipmentLoadout({
      agentClass: input.agentClass,
      modelId: input.modelId,
      role,
      visualTraits: input.visualTraits,
      activeWorkstation: null,
      activePluginNamespace: null,
      activeCapability: null,
      skillGrimoires: [],
      distilledSkillHistory: [],
      recentTools: [],
      childSessionIds: [],
      contextMana: initialContextMana,
    }),
    recentTools: [],
    contextMana: initialContextMana, questGate: null, reportScroll: null, childSessionIds: [],
    visualTraits: input.visualTraits, errorState: null, sequenceCursor: input.sequenceCursor,
    isOpenInOpenCode: input.isOpenInOpenCode, equippingAtArmory: false, lastEquippedToolCategory: undefined,
  };
  syncCharacterWorkflow(char);
  syncCharacterTributeRecord(state.tributeLedger, char, state.rooms);
  bumpCharacterRevision(state, char.characterId);
  return char;
}

export function pruneDeletedHostRooms(state: InternalWorldStoreState, collector?: MutationCollector): void {
  const roomIds = new Set([...state.roomOrder, ...Object.keys(state.rooms)]);
  for (const roomId of roomIds) {
    const r = state.rooms[roomId];
    const isDeleted = r ? isDeletedHostDirectory(r.locationDirectory || roomId, undefined, state.daemonUrl) : isDeletedHostDirectory(roomId, undefined, state.daemonUrl);
    const isEmptyHome = Boolean(r && r.characterIds.length === 0 && /^\/(?:home|Users|c\/Users)\/[^/]+$/i.test(roomId));
    if (!r || isDeleted || isEmptyHome) {
      if (r) {
        for (const charId of r.characterIds) {
          if (state.characters[charId]) syncCharacterTributeRecord(state.tributeLedger, state.characters[charId], state.rooms);
          delete state.characters[charId]; state.characterRevisions.delete(charId); collector?.changedCharacterIds.add(charId);
        }
      }
      delete state.rooms[roomId]; delete state.roomAllPlugins[roomId];
      state.roomOrder = state.roomOrder.filter((id) => id !== roomId); collector?.changedRoomIds.add(roomId);
    }
  }
  for (const [charId, char] of Object.entries(state.characters)) {
    if (!state.rooms[char.roomId] || isDeletedHostDirectory(char.locationDirectory || char.roomId, undefined, state.daemonUrl)) {
      syncCharacterTributeRecord(state.tributeLedger, char, state.rooms);
      delete state.characters[charId]; state.characterRevisions.delete(charId); collector?.changedCharacterIds.add(charId);
    }
  }
  for (const [gateId, gate] of Object.entries(state.questGates)) {
    if (!state.rooms[gate.roomId] || !state.characters[gate.sessionId]) delete state.questGates[gateId];
  }
}
