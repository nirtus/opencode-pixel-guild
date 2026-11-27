import type { ServerResponse } from "node:http";
import { normalizeDaemonEndpointUrl } from "../state/index.ts";
import type { CharacterState, GuildStateEmission } from "../types/domain.ts";

export const DEFAULT_SSE_STREAM_COALESCE_MS = 70;
export const MAX_SSE_CLIENT_BACKPRESSURE_BYTES = 2 * 1024 * 1024;

export interface SseBroadcasterOptions {
  readonly coalesceMs?: number;
  readonly now?: () => number;
}

export interface SseBroadcaster {
  broadcast(emission: GuildStateEmission): void;
  flush(): void;
  reset(): void;
  close(): void;
}

function buildCharMetaKey(char: CharacterState): string {
  return `${char.lifecycleState}:${char.questGate?.gateId ?? ""}:${char.hasUnviewedResult ? 1 : 0}`;
}

export function createSseBroadcaster(
  sseClients: Set<ServerResponse>,
  options: SseBroadcasterOptions = {},
): SseBroadcaster {
  const coalesceMs = Math.max(0, options.coalesceMs ?? DEFAULT_SSE_STREAM_COALESCE_MS);
  const now = options.now ?? (() => Date.now());
  const lastSentCharMeta = new Map<string, string>();
  const drainingClients = new Set<ServerResponse>();
  const lastWrittenVersionByClient = new WeakMap<ServerResponse, number>();
  let pendingTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingEmission: GuildStateEmission | null = null;
  let latestEmission: GuildStateEmission | null = null;
  let activeDaemonUrl: string | null = null;
  let lastBroadcastAtMs = 0;
  let isClosed = false;

  function recordCharMeta(emission: GuildStateEmission): void {
    const kind = emission.delta.kind;
    if (kind === "session.deleted" || kind === "room.deleted") {
      for (const id of emission.delta.changedCharacterIds) {
        lastSentCharMeta.delete(id);
      }
      return;
    }
    if (kind === "snapshot.hydrated" || kind === "stream.reconnected" || kind === "adapter.switched") {
      lastSentCharMeta.clear();
      for (const char of Object.values(emission.snapshot.characters)) {
        if (char) lastSentCharMeta.set(char.sessionId, buildCharMetaKey(char));
      }
      return;
    }
    for (const id of emission.delta.changedCharacterIds) {
      const char = emission.snapshot.characters[id];
      if (char) lastSentCharMeta.set(id, buildCharMetaKey(char));
      else lastSentCharMeta.delete(id);
    }
  }

  function isPassiveStreamingUpsert(emission: GuildStateEmission): boolean {
    if (coalesceMs <= 0) return false;
    const kind = emission.delta.kind;
    if (kind !== "session.upserted" && kind !== "session.status") return false;
    const sid = emission.delta.sessionId;
    if (!sid) return false;
    const prevMeta = lastSentCharMeta.get(sid);
    if (!prevMeta) return false;
    const char = emission.snapshot.characters[sid];
    if (!char) return false;
    return buildCharMetaKey(char) === prevMeta;
  }

  function scheduleDrainCatchup(client: ServerResponse): void {
    if (drainingClients.has(client) || typeof client.once !== "function") return;
    drainingClients.add(client);
    client.once("drain", () => {
      drainingClients.delete(client);
      if (isClosed || client.writableEnded || !sseClients.has(client) || !latestEmission) return;
      if ((normalizeDaemonEndpointUrl(latestEmission.snapshot.daemonUrl) || null) !== activeDaemonUrl) return;
      if (lastWrittenVersionByClient.get(client) === latestEmission.snapshot.version) return;
      try {
        lastWrittenVersionByClient.set(client, latestEmission.snapshot.version);
        client.write(`data: ${JSON.stringify(latestEmission)}\n\n`);
      } catch {
        sseClients.delete(client);
      }
    });
  }

  function writeNow(emission: GuildStateEmission): void {
    lastBroadcastAtMs = now();
    latestEmission = emission;
    recordCharMeta(emission);
    if (sseClients.size === 0) return;
    const payload = `data: ${JSON.stringify(emission)}\n\n`;
    for (const client of sseClients) {
      if (client.writableEnded) continue;
      const buffered = typeof client.writableLength === "number" ? client.writableLength : 0;
      if (buffered >= MAX_SSE_CLIENT_BACKPRESSURE_BYTES) {
        scheduleDrainCatchup(client);
        continue;
      }
      try {
        lastWrittenVersionByClient.set(client, emission.snapshot.version);
        client.write(payload);
      } catch {
        sseClients.delete(client);
      }
    }
  }

  function clearPending(): void {
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      pendingTimer = null;
    }
    pendingEmission = null;
  }

  function reset(): void {
    clearPending();
    lastSentCharMeta.clear();
    drainingClients.clear();
    latestEmission = null;
    activeDaemonUrl = null;
    lastBroadcastAtMs = 0;
  }

  function broadcast(emission: GuildStateEmission): void {
    if (isClosed) return;
    const incomingDaemonUrl = normalizeDaemonEndpointUrl(emission.snapshot.daemonUrl) || null;
    const isHostSwitch =
      emission.delta.kind === "adapter.switched" ||
      (activeDaemonUrl !== null && incomingDaemonUrl !== activeDaemonUrl);
    if (isHostSwitch) {
      clearPending();
      lastSentCharMeta.clear();
      lastBroadcastAtMs = 0;
    }
    activeDaemonUrl = incomingDaemonUrl;

    if (sseClients.size === 0) {
      clearPending();
      recordCharMeta(emission);
      return;
    }

    if (!isPassiveStreamingUpsert(emission)) {
      clearPending();
      writeNow(emission);
      return;
    }

    const nowMs = now();
    const elapsedMs = nowMs - lastBroadcastAtMs;
    if (!pendingTimer && elapsedMs >= coalesceMs) {
      writeNow(emission);
      return;
    }

    pendingEmission = emission;
    if (!pendingTimer) {
      const expectedDaemonUrl = activeDaemonUrl;
      const delayMs = Math.max(1, coalesceMs - elapsedMs);
      pendingTimer = setTimeout(() => {
        pendingTimer = null;
        const next = pendingEmission;
        pendingEmission = null;
        if (
          !isClosed &&
          next &&
          sseClients.size > 0 &&
          (normalizeDaemonEndpointUrl(next.snapshot.daemonUrl) || null) === activeDaemonUrl &&
          activeDaemonUrl === expectedDaemonUrl
        ) {
          writeNow(next);
        }
      }, delayMs);
      pendingTimer.unref?.();
    }
  }

  function flush(): void {
    if (isClosed) return;
    const next = pendingEmission;
    clearPending();
    if (
      next &&
      sseClients.size > 0 &&
      (normalizeDaemonEndpointUrl(next.snapshot.daemonUrl) || null) === activeDaemonUrl
    ) {
      writeNow(next);
    }
  }

  function close(): void {
    isClosed = true;
    reset();
  }

  return { broadcast, flush, reset, close };
}
