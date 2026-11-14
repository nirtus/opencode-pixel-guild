import { isBuiltinOpenCodePlugin } from "../capability/classifier.ts";
import type {
  PluginStatusKind,
  SessionTokenTelemetry,
} from "../types/domain.ts";
import type { OpenCodeDaemonLocationPayload } from "./daemon-types.ts";

export interface RawDaemonModelItem {
  id?: string;
  modelID?: string;
  providerID?: string;
  name?: string;
  limit?: { context?: number; output?: number };
}

export interface RawDaemonPluginItem {
  namespace?: string;
  id?: string;
  name?: string;
  status?: PluginStatusKind;
  state?: { status?: string; error?: string };
  source?: { type?: string };
  toolCount?: number;
  statusMessage?: string;
}

export type RawDaemonMcpStatus =
  | PluginStatusKind
  | { status?: string; error?: string; message?: string };

export type RawDaemonMcpResponse =
  | Array<{
      namespace?: string;
      id?: string;
      name?: string;
      status?: RawDaemonMcpStatus;
      toolCount?: number;
      statusMessage?: string;
    }>
  | Record<
      string,
      {
        name?: string;
        status?: RawDaemonMcpStatus;
        toolCount?: number;
        error?: string;
        statusMessage?: string;
      }
    >;

export function normalizeMcpStatus(
  rawStatus: RawDaemonMcpStatus | undefined,
): PluginStatusKind {
  const val =
    typeof rawStatus === "object" && rawStatus !== null
      ? rawStatus.status === "pending"
        ? "connected"
        : rawStatus.status
      : rawStatus;
  if (val === "connected" || val === "needs_auth" || val === "failed" || val === "disabled") {
    return val;
  }
  return "connected";
}

export function normalizeDaemonModels(
  rawModels: RawDaemonModelItem[] | null | undefined,
) {
  const modelLimitByKey = new Map<string, number>();
  const models: NonNullable<OpenCodeDaemonLocationPayload["models"]> = [];
  if (Array.isArray(rawModels)) {
    for (const m of rawModels) {
      const fullId = m.id ?? m.modelID;
      if (!fullId) continue;
      const contextLimit = m.limit?.context ?? 200_000;
      modelLimitByKey.set(fullId.toLowerCase(), contextLimit);
      const shortId = fullId.split("/").pop();
      if (shortId) modelLimitByKey.set(shortId.toLowerCase(), contextLimit);
      models.push({
        id: fullId,
        providerId: m.providerID,
        name: m.name ?? fullId,
        limitContext: contextLimit,
        limitOutput: m.limit?.output,
      });
    }
  }
  return { models, modelLimitByKey };
}

export function mergeDaemonPluginsAndMcps(
  mcps: RawDaemonMcpResponse | null | undefined,
  plugins: RawDaemonPluginItem[] | null | undefined,
): NonNullable<OpenCodeDaemonLocationPayload["plugins"]> {
  const mergedPlugins: NonNullable<OpenCodeDaemonLocationPayload["plugins"]> = [];
  const seenNs = new Set<string>();

  if (Array.isArray(mcps)) {
    for (const item of mcps) {
      const ns = (item.namespace ?? item.id ?? "").trim().toLowerCase();
      if (!ns || seenNs.has(ns) || isBuiltinOpenCodePlugin(ns)) continue;
      seenNs.add(ns);
      const statusObj = typeof item.status === "object" && item.status !== null ? item.status : null;
      mergedPlugins.push({
        namespace: ns,
        name: item.name ?? ns,
        status: normalizeMcpStatus(item.status),
        toolCount: item.toolCount,
        statusMessage: item.statusMessage ?? statusObj?.error ?? statusObj?.message,
      });
    }
  } else if (mcps && typeof mcps === "object") {
    for (const [nsKey, info] of Object.entries(mcps)) {
      const ns = nsKey.trim().toLowerCase();
      if (!ns || seenNs.has(ns) || isBuiltinOpenCodePlugin(ns)) continue;
      seenNs.add(ns);
      const statusObj = typeof info.status === "object" && info.status !== null ? info.status : null;
      mergedPlugins.push({
        namespace: ns,
        name: info.name ?? ns,
        status: normalizeMcpStatus(info.status),
        toolCount: info.toolCount,
        statusMessage: info.statusMessage ?? info.error ?? statusObj?.error ?? statusObj?.message,
      });
    }
  }

  if (Array.isArray(plugins)) {
    for (const item of plugins) {
      const ns = (item.namespace ?? item.id ?? "").trim().toLowerCase();
      if (!ns || seenNs.has(ns) || isBuiltinOpenCodePlugin(ns, item.source?.type)) continue;
      seenNs.add(ns);
      const mappedStatus: PluginStatusKind =
        item.state?.status === "active"
          ? "connected"
          : item.state?.status === "failed"
            ? "failed"
            : (item.status ?? "connected");
      mergedPlugins.push({
        namespace: ns,
        name: item.name ?? ns,
        status: mappedStatus,
        toolCount: item.toolCount,
        statusMessage: item.statusMessage ?? item.state?.error,
      });
    }
  }

  return mergedPlugins;
}

export function mapDaemonSessionTokens(
  s: {
    cost?: number;
    tokens?: SessionTokenTelemetry & { input?: number; output?: number; cache?: { read?: number; write?: number } };
  },
  shortModelId: string,
  catalogLimit: number | undefined,
  latestContextTokens: number | undefined,
): SessionTokenTelemetry | undefined {
  if (!s.tokens && typeof s.cost !== "number" && catalogLimit === undefined && latestContextTokens === undefined) {
    return undefined;
  }
  const inputTokens = s.tokens?.inputTokens ?? s.tokens?.input ?? 0;
  const outputTokens = s.tokens?.outputTokens ?? s.tokens?.output ?? 0;
  const usedTokens = s.tokens?.usedTokens ?? latestContextTokens ?? inputTokens + outputTokens;
  const lowerShort = shortModelId.toLowerCase();
  const limitTokens =
    s.tokens?.limitTokens ?? catalogLimit ??
    (lowerShort.includes("gemini-") ? 1_048_576 : lowerShort.includes("gpt-5") || lowerShort.includes("codex") ? 400_000 : 200_000);
  const cacheRead = s.tokens?.cacheReadTokens ?? s.tokens?.cacheRead ?? s.tokens?.cache?.read ?? 0;
  const cacheWrite = s.tokens?.cacheWriteTokens ?? s.tokens?.cacheWrite ?? s.tokens?.cache?.write ?? 0;
  const totalUsd = s.tokens?.totalCostUsd ?? s.tokens?.totalUsd ?? (typeof s.cost === "number" ? s.cost : 0);
  return {
    usedTokens, limitTokens, inputTokens, outputTokens,
    cacheReadTokens: cacheRead, cacheWriteTokens: cacheWrite, totalCostUsd: totalUsd,
    input: inputTokens, output: outputTokens, cacheRead, cacheWrite, totalUsd,
    contextWindowPct: Math.min(100, Math.round((usedTokens / Math.max(1, limitTokens)) * 100)),
  };
}
