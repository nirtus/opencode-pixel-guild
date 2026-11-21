import { pruneDispatchLogSessionCaches } from "../hud/spectator-hud.ts";
import type { GuildSnapshot } from "../types/domain.ts";
import { clientState, resolvedClientGateIds, resolvedClientPromptsBySession } from "./client-state.ts";
import { pruneCommandScrollSessionCaches } from "./command-scroll-controller.ts";
import { expandedChatMessageIds } from "./hero-subtabs-reconciler.ts";
import { pruneSessionMessageHydrationGuard } from "./session-message-hydration-guard.ts";
import { pruneSkillBrowserSessionScopes } from "./skill-browser-controller.ts";

export interface PruneSessionCachesOptions {
  readonly hadRemovedSession?: boolean;
  readonly force?: boolean;
}

let lastPrunedSnapshotRef: GuildSnapshot | null = null;
let lastPrunedVersion = -1;

const MAX_RESOLVED_CLIENT_GATE_IDS = 256;

function extractSessionIdFromGateId(gateId: string): string | null {
  const match = /^(?:question|perm|permission):([^:]+)/.exec(gateId);
  return match?.[1] || null;
}

function hasOwn(obj: Readonly<Record<string, unknown>>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function hasAnyOwnKey(obj: Readonly<Record<string, unknown>>): boolean {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) return true;
  }
  return false;
}

export function pruneDeletedSessionClientCaches(
  snapshot: GuildSnapshot | null | undefined,
  options: PruneSessionCachesOptions = {},
): boolean {
  if (!snapshot) return false;
  const snapshotChars = snapshot.characters ?? {};
  const snapshotVersion = snapshot.version ?? 0;
  const isPreHydrationEmptyBoot =
    snapshotVersion === 0 && !hasAnyOwnKey(snapshotChars);
  if (isPreHydrationEmptyBoot && !options.hadRemovedSession) {
    return false;
  }
  if (
    !options.force &&
    !options.hadRemovedSession &&
    snapshot === lastPrunedSnapshotRef &&
    snapshotVersion === lastPrunedVersion
  ) {
    return false;
  }
  lastPrunedSnapshotRef = snapshot;
  lastPrunedVersion = snapshotVersion;

  const hasSession = (sid: string): boolean => hasOwn(snapshotChars, sid);
  let activeGateIds: Set<string> | null = null;
  const getActiveGateIds = (): Set<string> => {
    if (activeGateIds) return activeGateIds;
    activeGateIds = new Set<string>();
    const gates = snapshot.questGates ?? {};
    for (const gateId in gates) {
      if (!hasOwn(gates, gateId)) continue;
      const g = gates[gateId];
      if (g && (!g.sessionId || hasSession(g.sessionId))) {
        activeGateIds.add(gateId);
      }
    }
    for (const sid in snapshotChars) {
      if (!hasOwn(snapshotChars, sid)) continue;
      const gid = snapshotChars[sid]?.questGate?.gateId;
      if (gid) activeGateIds.add(gid);
    }
    return activeGateIds;
  };

  for (const key of expandedChatMessageIds) {
    const sep = key.indexOf(":");
    if (sep > 0 && !hasSession(key.slice(0, sep))) {
      expandedChatMessageIds.delete(key);
    }
  }

  for (const sid of resolvedClientPromptsBySession.keys()) {
    if (!hasSession(sid)) resolvedClientPromptsBySession.delete(sid);
  }
  for (const sid of clientState.draftPromptsBySession.keys()) {
    if (!hasSession(sid)) clientState.draftPromptsBySession.delete(sid);
  }
  for (const sid of clientState.draftDeliveryBySession.keys()) {
    if (!hasSession(sid)) clientState.draftDeliveryBySession.delete(sid);
  }

  if (clientState.draftGateAnswersByGateId.size > 0) {
    const liveGates = getActiveGateIds();
    for (const key of clientState.draftGateAnswersByGateId.keys()) {
      if (key.startsWith("session:")) {
        if (!hasSession(key.slice("session:".length))) {
          clientState.draftGateAnswersByGateId.delete(key);
        }
      } else if (!liveGates.has(key)) {
        clientState.draftGateAnswersByGateId.delete(key);
      }
    }
  }

  if (clientState.collapsedGateIds.size > 0) {
    const liveGates = getActiveGateIds();
    for (const gateId of clientState.collapsedGateIds) {
      if (!liveGates.has(gateId)) {
        clientState.collapsedGateIds.delete(gateId);
      }
    }
  }

  if (resolvedClientGateIds.size > 0) {
    for (const gateId of resolvedClientGateIds) {
      const embeddedSid = extractSessionIdFromGateId(gateId);
      if (embeddedSid && !hasSession(embeddedSid)) {
        resolvedClientGateIds.delete(gateId);
      }
    }
    if (resolvedClientGateIds.size > MAX_RESOLVED_CLIENT_GATE_IDS) {
      const liveGates = getActiveGateIds();
      for (const gateId of resolvedClientGateIds) {
        if (resolvedClientGateIds.size <= MAX_RESOLVED_CLIENT_GATE_IDS) break;
        if (!liveGates.has(gateId)) resolvedClientGateIds.delete(gateId);
      }
      for (const gateId of resolvedClientGateIds) {
        if (resolvedClientGateIds.size <= MAX_RESOLVED_CLIENT_GATE_IDS) break;
        resolvedClientGateIds.delete(gateId);
      }
    }
  }

  pruneCommandScrollSessionCaches(hasSession);
  pruneSkillBrowserSessionScopes(hasSession);
  pruneSessionMessageHydrationGuard(snapshotChars);
  pruneDispatchLogSessionCaches(hasSession);
  return true;
}
