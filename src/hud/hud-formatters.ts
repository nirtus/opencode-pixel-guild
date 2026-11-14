import type {
  CharacterLifecycleState,
  CharacterState,
  GuildSnapshot,
  PluginStatusKind,
  ToolExecutionRecord,
  WorkshopRoomState,
} from "../types/domain.ts";
import type { ContextManaHudStatus } from "./hud-character-types.ts";
import type {
  ResourceStockpileCrateTooltipEntry,
  SceneTooltipDetailRow,
} from "./hud-tooltip-types.ts";

export function escapeHtml(text: string): string {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatPublicSafePath(rawPath: string): string {
  const normalized = String(rawPath || "").replace(/\\/g, "/");
  if (!normalized) return "";
  return normalized.replace(
    /^(?:\/mnt\/[a-zA-Z]\/Users\/[^/]+|\/[a-zA-Z]\/Users\/[^/]+|[a-zA-Z]:\/Users\/[^/]+|\/Users\/[^/]+|\/home\/[^/]+)(?=\/|$)/,
    "~",
  );
}

const TUNNEL_BASE_DOMAINS = [
  "opentunnel.xyz",
  "opentunnel.dev",
  "lhr.life",
  "ngrok-free.app",
  "ngrok.io",
  "trycloudflare.com",
];

export function formatPublicSafeEndpoint(rawUrl: string): string {
  const trimmed = String(rawUrl || "").trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    const matchedDomain = TUNNEL_BASE_DOMAINS.find(
      (base) => host.endsWith(`.${base}`) && host.length > base.length + 1,
    );
    if (matchedDomain) {
      const prefix = host.slice(0, host.length - matchedDomain.length - 1);
      const firstSub = prefix.split(".")[0] || prefix;
      const maskedSub =
        firstSub.length > 8
          ? `${firstSub.slice(0, 4)}•••${firstSub.slice(-4)}`
          : `${firstSub.slice(0, 2)}•••`;
      const portPart = parsed.port ? `:${parsed.port}` : "";
      const pathPart =
        parsed.pathname && parsed.pathname !== "/" ? parsed.pathname : "";
      return `${parsed.protocol}//${maskedSub}.${matchedDomain}${portPart}${pathPart}`;
    }
    return trimmed;
  } catch {
    return trimmed;
  }
}

export function formatAgentDisplayName(agentId: string): string {
  const trimmed = agentId.trim();
  if (!trimmed) return "General";
  return trimmed
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function resolveContextManaStatus(
  percent: number,
  lifecycleState: CharacterLifecycleState,
): ContextManaHudStatus {
  if (lifecycleState === "DistillingContextMana") return "distilling";
  if (percent >= 85) return "critical";
  if (percent >= 60) return "elevated";
  return "normal";
}

export function formatPluginStatusLabel(status: PluginStatusKind): string {
  switch (status) {
    case "connected":
      return "Connected";
    case "needs_auth":
      return "Needs Auth";
    case "failed":
      return "Failed";
    case "disabled":
      return "Disabled";
  }
}

export function resolvePluginAccentHex(status: PluginStatusKind): string {
  if (status === "connected") return "#10b981";
  if (status === "needs_auth") return "#f59e0b";
  return "#ef4444";
}

export function formatUsdCost(usd: number, decimals = 2): string {
  const safe = Number.isFinite(usd) ? Math.max(0, usd) : 0;
  return `$${safe.toFixed(decimals)}`;
}

export function collectRoomCharacters(
  snapshot: GuildSnapshot,
  room: WorkshopRoomState,
): CharacterState[] {
  return (room.characterIds ?? [])
    .map((id) => snapshot.characters[id])
    .filter((c): c is CharacterState => Boolean(c));
}

export function collectStationOccupants(
  roomChars: readonly CharacterState[],
  predicate: (c: CharacterState) => boolean,
) {
  return roomChars.filter(predicate).map((c) =>
    Object.freeze({
      sessionId: c.sessionId,
      title: c.title,
      agentClass: c.agentClass,
      toolName:
        c.activeCapability?.displayName ?? c.recentTools[0]?.toolName ?? null,
      inputPreview:
        c.activeCapability?.inputPreview ??
        c.recentTools[0]?.inputPreview ??
        "",
    }),
  );
}

export function collectRecentStationTools(
  roomChars: readonly CharacterState[],
  predicate: (r: ToolExecutionRecord) => boolean,
  limit = 6,
) {
  return roomChars
    .flatMap((c) =>
      (c.recentTools ?? []).filter(predicate).map((r) => ({
        sessionId: c.sessionId,
        sessionTitle: c.title,
        toolName: r.toolName,
        inputPreview: r.inputPreview,
        status: r.status,
        timestampMs: r.timestampMs,
      })),
    )
    .sort((a, b) => b.timestampMs - a.timestampMs)
    .slice(0, limit)
    .map((r) => Object.freeze(r));
}

export function detailRow(
  label: string,
  value: string,
  mono = true,
  accentHex?: string,
): SceneTooltipDetailRow {
  return accentHex ? { label, value, mono, accentHex } : { label, value, mono };
}

export const STOCKPILE_CRATE_CATALOG: readonly ResourceStockpileCrateTooltipEntry[] =
  Object.freeze([
    Object.freeze({
      cargoKind: "timber-planks" as const,
      label: "Timber Planks",
      colorHex: "#d97706",
      mappedWorkstations: Object.freeze(["Crafting Workbench"] as const),
      mappedTools: Object.freeze(["write", "edit", "multiedit", "apply_patch", "notebookedit"] as const),
    }),
    Object.freeze({
      cargoKind: "stone-block" as const,
      label: "Stone Block",
      colorHex: "#a8a29e",
      mappedWorkstations: Object.freeze(["Library Study Bookshelf", "Observatory Spyglass"] as const),
      mappedTools: Object.freeze(["read", "glob", "grep", "lsp", "list", "ls", "codesearch"] as const),
    }),
    Object.freeze({
      cargoKind: "iron-bar" as const,
      label: "Iron Bar",
      colorHex: "#94a3b8",
      mappedWorkstations: Object.freeze(["Anvil Forge"] as const),
      mappedTools: Object.freeze(["shell", "bash", "terminal", "test"] as const),
    }),
    Object.freeze({
      cargoKind: "arcane-crystal" as const,
      label: "Arcane Crystal",
      colorHex: "#38bdf8",
      mappedWorkstations: Object.freeze(["Alchemy Lab", "Resource Stockpile"] as const),
      mappedTools: Object.freeze(["execute", "mcp:*", "plugin:*", "compact", "compaction", "summarize"] as const),
    }),
    Object.freeze({
      cargoKind: "scroll-bundle" as const,
      label: "Scroll Bundle",
      colorHex: "#fde68a",
      mappedWorkstations: Object.freeze(["Armory Wardrobe", "Arcane Lectern", "Observatory Spyglass"] as const),
      mappedTools: Object.freeze(["skill", "subagent", "task", "webfetch", "websearch", "fetch"] as const),
    }),
  ]);
