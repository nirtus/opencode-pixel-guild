import type { ServerResponse } from "node:http";
import type { CharacterState, GuildStateEmission } from "../types/domain.ts";

export const DEFAULT_SSE_STREAM_COALESCE_MS = 70;

export interface SseBroadcasterOptions {
  readonly coalesceMs?: number;
  readonly now?: () => number;
}

export interface SseBroadcaster {
  broadcast(emission: GuildStateEmission): void;
  flush(): void;
  close(): void;
}

function buildCharMetaKey(char: CharacterState): string {
  return `${char.lifecycleState}:${char.questGate?.gateId ?? ""}`;
}

export function createSseBroadcaster(
  sseClients: Set<ServerResponse>,
  options: SseBroadcasterOptions = {},
): SseBroadcaster {
  const coalesceMs = Math.max(0, options.coalesceMs ?? DEFAULT_SSE_STREAM_COALESCE_MS);
  const now = options.now ?? (() => Date.now());
  const lastSentCharMeta = new Map<string, string>();
  let pendingTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingEmission: GuildStateEmission | null = null;
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
    if (kind === "snapshot.hydrated" || kind === "stream.reconnected") {
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
    if (emission.delta.kind !== "session.upserted") return false;
    const sid = emission.delta.sessionId;
    if (!sid) return false;
    const prevMeta = lastSentCharMeta.get(sid);
    if (!prevMeta) return false;
    const char = emission.snapshot.characters[sid];
    if (!char) return false;
    return buildCharMetaKey(char) === prevMeta;
  }

  function writeNow(emission: GuildStateEmission): void {
    lastBroadcastAtMs = now();
    recordCharMeta(emission);
    if (sseClients.size === 0) return;
    const payload = `data: ${JSON.stringify(emission)}\n\n`;
    for (const client of sseClients) {
      if (!client.writableEnded) {
        try {
          client.write(payload);
        } catch {
          sseClients.delete(client);
        }
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

  function broadcast(emission: GuildStateEmission): void {
    if (isClosed) return;
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
      const delayMs = Math.max(1, coalesceMs - elapsedMs);
      pendingTimer = setTimeout(() => {
        pendingTimer = null;
        const next = pendingEmission;
        pendingEmission = null;
        if (!isClosed && next && sseClients.size > 0) {
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
    if (next && sseClients.size > 0) {
      writeNow(next);
    }
  }

  function close(): void {
    isClosed = true;
    clearPending();
    lastSentCharMeta.clear();
  }

  return { broadcast, flush, close };
}
