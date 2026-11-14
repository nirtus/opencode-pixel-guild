import { resolveResourceCargo } from "../capability/classifier.ts";
import {
  WORKSTATION_CATALOG,
  type GuildSnapshot,
  type WorkshopRoomState,
} from "../types/domain.ts";
import type { PluginAlcoveTooltipViewModel } from "./hud-character-types.ts";
import {
  STOCKPILE_CRATE_CATALOG,
  collectRecentStationTools,
  collectRoomCharacters,
  collectStationOccupants,
  detailRow,
  formatAgentDisplayName,
  formatPluginStatusLabel,
  resolvePluginAccentHex,
} from "./hud-formatters.ts";
import type {
  ResourceCargoPickupTooltipEntry,
  ResourceStockpilePluginTooltipEntry,
  SceneHoverTarget,
  SceneObjectTooltipViewModel,
  SceneTooltipDetailRow,
} from "./hud-tooltip-types.ts";

export function buildWorkstationTooltip(
  snapshot: GuildSnapshot,
  target: Extract<SceneHoverTarget, { kind: "workstation" }>,
): SceneObjectTooltipViewModel | null {
  const room =
    snapshot.rooms[target.roomId] ?? Object.values(snapshot.rooms ?? {})[0];
  if (!room) return null;

  const meta =
    WORKSTATION_CATALOG[
      target.workstation as keyof typeof WORKSTATION_CATALOG
    ] ??
    WORKSTATION_CATALOG["Alchemy Lab"];
  const roomChars = collectRoomCharacters(snapshot, room);
  const activeOccupants = collectStationOccupants(roomChars, (c) => {
    if (target.workstation === "Armory Wardrobe") {
      return (
        c.activeWorkstation === "Armory Wardrobe" ||
        c.activePreparationStation === "Armory Wardrobe"
      );
    }
    const effectiveStation =
      c.activePreparationStation &&
      c.activePreparationStation !== "Armory Wardrobe"
        ? c.activePreparationStation
        : c.activeWorkstation;
    return effectiveStation === target.workstation;
  });
  const recentStationTools = collectRecentStationTools(
    roomChars,
    (r) => (r.preparationStation ?? r.workstation) === target.workstation,
    6,
  );

  const cargo = resolveResourceCargo({
    workstation: meta.kind as any,
    toolName: meta.mappedTools[0] ?? "read",
    pluginNamespace: null,
  });
  const recentArtifacts = recentStationTools
    .slice(0, 3)
    .map((r) => r.inputPreview)
    .filter(Boolean);
  const artifactsLabel =
    recentArtifacts.length > 0
      ? `${cargo.label} · ${recentArtifacts.join(" · ")}`
      : `${cargo.label} (${meta.mappedTools.join(", ")})`;

  const rows: SceneTooltipDetailRow[] = [
    detailRow("OpenCode V2 Tools", meta.mappedTools.join(", "), true, meta.accentHex),
    detailRow(
      "Active Occupants",
      activeOccupants.length > 0
        ? activeOccupants
            .map((o) => `${o.title} (${o.toolName ?? "working"}${o.inputPreview ? `: ${o.inputPreview}` : ""})`)
            .join(" | ")
        : "Unoccupied",
    ),
    detailRow(
      "Recent Station Calls",
      recentStationTools.length > 0
        ? recentStationTools
            .slice(0, 3)
            .map((r) => `${r.toolName}(${r.inputPreview}) [${r.sessionTitle}]`)
            .join(" · ")
        : "No recent calls recorded in this room",
    ),
    detailRow("Produced Artifacts & Cargo", artifactsLabel, true, cargo.colorHex),
  ];

  return Object.freeze({
    kind: "workstation",
    roomId: room.roomId,
    workstation: target.workstation,
    title: target.workstation,
    subtitle: `Preparation Station · ${room.projectName}`,
    opencodeBinding: `${target.workstation} -> ${meta.mappedTools.join(", ")}`,
    accentHex: meta.accentHex,
    statusBadge:
      activeOccupants.length > 0 ? `${activeOccupants.length} ACTIVE` : "READY",
    description: meta.description,
    mappedTools: Object.freeze([...meta.mappedTools]),
    activeOccupants: Object.freeze(activeOccupants),
    recentStationTools: Object.freeze(recentStationTools),
    rows: Object.freeze(rows),
  });
}

function resolveAlcoveTooltipVm(
  room: WorkshopRoomState,
  namespace: string,
): PluginAlcoveTooltipViewModel | null {
  const dedicatedAlcove = room.pluginAlcoves.find(
    (alcove) => alcove.namespace === namespace,
  );
  if (dedicatedAlcove) {
    const errorDetail =
      dedicatedAlcove.status === "failed" ||
      dedicatedAlcove.status === "needs_auth"
        ? (dedicatedAlcove.statusMessage ??
          (dedicatedAlcove.status === "needs_auth"
            ? "Authentication required"
            : "Plugin connection failed"))
        : (dedicatedAlcove.statusMessage ?? null);
    return Object.freeze({
      namespace: dedicatedAlcove.namespace,
      displayName: dedicatedAlcove.displayName,
      archetype: dedicatedAlcove.archetype,
      monogram: dedicatedAlcove.monogram,
      status: dedicatedAlcove.status,
      statusLabel: formatPluginStatusLabel(dedicatedAlcove.status),
      errorDetail,
      isOverflowAlcove: false,
      overflowNamespaces: Object.freeze([...room.overflowPluginNamespaces]),
      activeOccupantIds: Object.freeze([...dedicatedAlcove.activeCharacterIds]),
    });
  }
  if (
    namespace === "overflow" ||
    room.overflowPluginNamespaces.includes(namespace)
  ) {
    const monogram =
      namespace === "overflow"
        ? `+${room.overflowPluginNamespaces.length}`
        : namespace.slice(0, 2).toUpperCase();
    return Object.freeze({
      namespace,
      displayName:
        namespace === "overflow"
          ? `Overflow Conduit (${room.overflowPluginNamespaces.length})`
          : `${formatAgentDisplayName(namespace)} (Overflow)`,
      archetype: "Arcane Conduit",
      monogram,
      status: "connected",
      statusLabel: "Connected",
      errorDetail: null,
      isOverflowAlcove: true,
      overflowNamespaces: Object.freeze([...room.overflowPluginNamespaces]),
      activeOccupantIds: Object.freeze([]),
    });
  }
  return null;
}

export function buildAlcoveSceneTooltip(
  snapshot: GuildSnapshot,
  target: Extract<SceneHoverTarget, { kind: "alcove" }>,
): SceneObjectTooltipViewModel | null {
  const room = snapshot.rooms[target.roomId];
  if (!room) return null;

  const normNs =
    target.namespace.toLowerCase() === "mux"
      ? "overflow"
      : target.namespace.toLowerCase();
  const alcoveTooltip = resolveAlcoveTooltipVm(room, normNs);
  if (!alcoveTooltip) return null;

  const roomChars = collectRoomCharacters(snapshot, room);
  const activeOccupants = collectStationOccupants(roomChars, (c) =>
    alcoveTooltip.isOverflowAlcove
      ? Boolean(
          c.activePluginNamespace &&
            room.overflowPluginNamespaces.includes(c.activePluginNamespace),
        )
      : c.activePluginNamespace === alcoveTooltip.namespace,
  );

  const recentStationTools = collectRecentStationTools(
    roomChars,
    (r) =>
      alcoveTooltip.isOverflowAlcove
        ? Boolean(
            r.pluginNamespace &&
              room.overflowPluginNamespaces.includes(r.pluginNamespace),
          )
        : r.pluginNamespace === alcoveTooltip.namespace,
    5,
  );

  const rows: SceneTooltipDetailRow[] = [
    detailRow(
      "OpenCode Namespace",
      alcoveTooltip.isOverflowAlcove
        ? `Overflow MUX (${alcoveTooltip.overflowNamespaces.join(", ")})`
        : `mcp / plugin: ${alcoveTooltip.namespace}`,
    ),
    detailRow(
      "Archetype & Status",
      `${alcoveTooltip.archetype} · ${alcoveTooltip.statusLabel}`,
    ),
    detailRow(
      "Active Occupants",
      activeOccupants.length > 0
        ? activeOccupants
            .map((o) => `${o.title} (${o.toolName ?? "invoking"}${o.inputPreview ? `: ${o.inputPreview}` : ""})`)
            .join(" | ")
        : "Idle",
    ),
  ];
  if (alcoveTooltip.errorDetail) {
    rows.push(detailRow("Diagnostic", alcoveTooltip.errorDetail, true, "#fca5a5"));
  }

  return Object.freeze({
    kind: "alcove",
    roomId: room.roomId,
    title: `[${alcoveTooltip.monogram}] ${alcoveTooltip.displayName}`,
    subtitle: `${alcoveTooltip.archetype} · Resource Stockpile Integration`,
    opencodeBinding: alcoveTooltip.isOverflowAlcove
      ? `mcp/plugin overflow -> ${alcoveTooltip.overflowNamespaces.join(", ")}`
      : `mcp/plugin -> ${alcoveTooltip.namespace} (${alcoveTooltip.status})`,
    accentHex: resolvePluginAccentHex(alcoveTooltip.status),
    statusBadge: alcoveTooltip.statusLabel.toUpperCase(),
    description:
      alcoveTooltip.errorDetail ??
      `Routes ${alcoveTooltip.displayName} tool calls and Code Mode tools.${alcoveTooltip.namespace} invocations.`,
    alcoveTooltip,
    activeOccupants: Object.freeze(activeOccupants),
    recentStationTools: Object.freeze(recentStationTools),
    rows: Object.freeze(rows),
  });
}

export function buildResourceStockpileTooltip(
  snapshot: GuildSnapshot,
  target: Extract<SceneHoverTarget, { kind: "resource-stockpile" }>,
): SceneObjectTooltipViewModel | null {
  const room =
    snapshot.rooms[target.roomId] ?? Object.values(snapshot.rooms ?? {})[0];
  if (!room) return null;

  const stockpileCrates = [...STOCKPILE_CRATE_CATALOG];
  const configuredPlugins: ResourceStockpilePluginTooltipEntry[] = [
    ...room.pluginAlcoves.map((a) =>
      Object.freeze({
        namespace: a.namespace,
        displayName: a.displayName,
        status: a.status,
        statusLabel: formatPluginStatusLabel(a.status),
        toolCount: a.toolCount,
        statusMessage: a.statusMessage,
        isOverflow: false,
      }),
    ),
    ...room.overflowPluginNamespaces.map((ns) =>
      Object.freeze({
        namespace: ns,
        displayName: ns,
        status: "connected" as const,
        statusLabel: "Connected" as const,
        toolCount: 1,
        isOverflow: true,
      }),
    ),
  ];

  const roomChars = collectRoomCharacters(snapshot, room);
  const activeCargoPickups: ResourceCargoPickupTooltipEntry[] = [];
  for (const char of roomChars) {
    const isWorking =
      char.activeWorkstation &&
      char.lifecycleState !== "RestingInLounge" &&
      char.lifecycleState !== "Archived";
    if (isWorking && char.activeWorkstation) {
      const toolName =
        char.activeCapability?.displayName ??
        char.recentTools[0]?.toolName ??
        char.activeWorkstation;
      const cargo =
        char.activeResourceCargo ??
        resolveResourceCargo({
          workstation: char.activeWorkstation,
          toolName,
          pluginNamespace: char.activePluginNamespace,
        });
      activeCargoPickups.push(
        Object.freeze({
          sessionId: char.sessionId,
          sessionTitle: char.title,
          agentClass: char.agentClass,
          callId: char.recentTools[0]?.callId ?? null,
          toolName,
          inputPreview:
            char.activeCapability?.inputPreview ??
            char.recentTools[0]?.inputPreview ??
            "",
          cargoKind: cargo.kind,
          cargoLabel: cargo.label,
          cargoColorHex: cargo.colorHex,
          targetWorkstation: char.activeWorkstation,
          pluginNamespace: char.activePluginNamespace,
          status: "active" as const,
        }),
      );
    } else if (char.recentTools.length > 0) {
      const rec = char.recentTools[0];
      const cargo = resolveResourceCargo({
        workstation: rec.workstation,
        toolName: rec.toolName,
        pluginNamespace: rec.pluginNamespace,
      });
      activeCargoPickups.push(
        Object.freeze({
          sessionId: char.sessionId,
          sessionTitle: char.title,
          agentClass: char.agentClass,
          callId: rec.callId,
          toolName: rec.toolName,
          inputPreview: rec.inputPreview,
          cargoKind: cargo.kind,
          cargoLabel: cargo.label,
          cargoColorHex: cargo.colorHex,
          targetWorkstation: rec.workstation,
          pluginNamespace: rec.pluginNamespace,
          status:
            rec.status === "error" ? ("error" as const) : ("completed" as const),
        }),
      );
    }
  }

  const rows: SceneTooltipDetailRow[] = [
    detailRow(
      "Stocked Material Crates",
      stockpileCrates.map((c) => c.label).join(" · "),
      true,
      "#d97706",
    ),
    detailRow(
      `External MCPs & Plugins (${configuredPlugins.length})`,
      configuredPlugins.length > 0
        ? configuredPlugins
            .map((p) => `${p.namespace} (${p.status}${p.statusMessage ? `: ${p.statusMessage}` : ""})`)
            .join(" | ")
        : "None configured (built-in opencode.* filtered)",
    ),
    detailRow(
      `Resource Cargo Pickups (${activeCargoPickups.length})`,
      activeCargoPickups.length > 0
        ? activeCargoPickups
            .map((p) => `${p.sessionId} [${p.toolName}${p.inputPreview ? `: ${p.inputPreview}` : ""}] → ${p.cargoLabel} → ${p.targetWorkstation}`)
            .join(" | ")
        : "No active or recent cargo pickups",
      true,
      "#38bdf8",
    ),
  ];

  const hasFailed = configuredPlugins.some((p) => p.status === "failed");
  const hasNeedsAuth = configuredPlugins.some((p) => p.status === "needs_auth");

  return Object.freeze({
    kind: "resource-stockpile",
    roomId: room.roomId,
    title: "Resource Stockpile",
    subtitle: `In-Room Supply Depot & External Integrations · ${room.projectName}`,
    opencodeBinding:
      configuredPlugins.length > 0
        ? `mcp/plugin: ${configuredPlugins.map((p) => p.namespace).join(", ")} · cargo: ${stockpileCrates.map((c) => c.cargoKind).join(", ")}`
        : `cargo: ${stockpileCrates.map((c) => c.cargoKind).join(", ")}`,
    accentHex: hasFailed ? "#ef4444" : hasNeedsAuth ? "#f59e0b" : "#d97706",
    statusBadge: `${configuredPlugins.length} MCP/PLUGIN · ${activeCargoPickups.length} CARGO`,
    description:
      "In-room supply depot at {x:13,y:8,w:2,h:2} (anchor {x:12,y:8}) stocked with Timber Planks, Stone Blocks, Iron Bars, Arcane Crystals, and Scroll Bundles hauled to active Preparation Stations.",
    stockpileCrates: Object.freeze(stockpileCrates),
    configuredPlugins: Object.freeze(configuredPlugins),
    activeCargoPickups: Object.freeze(activeCargoPickups),
    rows: Object.freeze(rows),
  });
}
