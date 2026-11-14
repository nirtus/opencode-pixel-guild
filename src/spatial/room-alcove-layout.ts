import {
  deriveMonogram,
  deriveVisualTraits,
  isBuiltinOpenCodePlugin,
} from "../capability/classifier.ts";
import { MAX_DEDICATED_PLUGIN_ALCOVES } from "../types/domain.ts";
import type { ResourceStockpileCrateSpec } from "./furniture-descriptors.ts";
import {
  RESOURCE_STOCKPILE_BOUNDS,
  RESOURCE_STOCKPILE_FIXTURE_TILE,
  RESOURCE_STOCKPILE_ANCHOR_TILE,
} from "./room-constants.ts";
import type {
  PluginAlcoveFixtureLayout,
  PluginAlcoveLayoutInput,
  ResourceStockpileFixtureLayout,
  WorkshopRoomLayoutInput,
} from "./room-layout-types.ts";
import { buildStatusCrystal, STATUS_PRIORITY } from "./status-crystal.ts";

export interface ResolvedRoomPluginAlcoves {
  dedicatedAlcoves: PluginAlcoveFixtureLayout[];
  overflowAlcove: PluginAlcoveFixtureLayout | null;
  allAlcoves: PluginAlcoveFixtureLayout[];
  overflowNamespaces: string[];
}

export function buildRoomPluginAlcoves(
  input: WorkshopRoomLayoutInput,
): ResolvedRoomPluginAlcoves {
  const rawList = [...(input.pluginAlcoves ?? []), ...(input.plugins ?? [])];
  const dedupedByNamespace = new Map<string, PluginAlcoveLayoutInput>();
  for (const item of rawList) {
    const ns = item.namespace.trim().toLowerCase();
    if (isBuiltinOpenCodePlugin(ns, item.source?.type)) {
      continue;
    }
    dedupedByNamespace.set(ns, { ...item, namespace: ns });
  }

  const sortedPlugins = [...dedupedByNamespace.values()].sort((a, b) => {
    const aInvoked = a.lastInvokedAtMs ?? 0;
    const bInvoked = b.lastInvokedAtMs ?? 0;
    if (aInvoked !== bInvoked) {
      return bInvoked - aInvoked;
    }
    const aStatus = STATUS_PRIORITY[a.status ?? "connected"];
    const bStatus = STATUS_PRIORITY[b.status ?? "connected"];
    if (aStatus !== bStatus) {
      return bStatus - aStatus;
    }
    return 0;
  });

  const dedicatedInputs = sortedPlugins.slice(0, MAX_DEDICATED_PLUGIN_ALCOVES);
  const extraFromInputs = sortedPlugins
    .slice(MAX_DEDICATED_PLUGIN_ALCOVES)
    .map((p) => p.namespace);
  const explicitOverflow = (input.overflowPluginNamespaces ?? [])
    .map((ns: string) => ns.trim().toLowerCase())
    .filter(
      (ns: string) =>
        !isBuiltinOpenCodePlugin(ns) &&
        !dedicatedInputs.some((d) => d.namespace === ns) &&
        !extraFromInputs.includes(ns),
    );
  const overflowNamespaces = [...extraFromInputs, ...explicitOverflow];

  const dedicatedAlcoves: PluginAlcoveFixtureLayout[] = dedicatedInputs.map(
    (plugin, bayIndex) => {
      const traits = deriveVisualTraits(plugin.namespace, plugin.colorHex);
      const status = plugin.status ?? "connected";
      return {
        alcoveId: `alcove:${plugin.namespace}`,
        bayIndex,
        namespace: plugin.namespace,
        displayName: plugin.displayName ?? plugin.namespace,
        isOverflow: false,
        multiplexedNamespaces: [plugin.namespace],
        status,
        statusCrystal: buildStatusCrystal(status),
        crystal: buildStatusCrystal(status),
        archetype: plugin.archetype ?? traits.alcoveArchetype,
        monogram: plugin.monogram ?? deriveMonogram(plugin.namespace),
        colorHex: plugin.colorHex ?? traits.primaryHex,
        toolCount: plugin.toolCount ?? 1,
        activeCharacterIds: [...(plugin.activeCharacterIds ?? [])],
        lastInvokedAtMs: plugin.lastInvokedAtMs ?? null,
        fixtureTile: { ...RESOURCE_STOCKPILE_FIXTURE_TILE },
        anchorTile: { ...RESOURCE_STOCKPILE_ANCHOR_TILE },
      };
    },
  );

  let overflowAlcove: PluginAlcoveFixtureLayout | null = null;
  if (overflowNamespaces.length > 0) {
    const bayIndex = dedicatedAlcoves.length;
    const overflowTraits = deriveVisualTraits("overflow-alcove", "#8b5cf6");
    overflowAlcove = {
      alcoveId: "alcove:overflow",
      bayIndex,
      namespace: "overflow",
      displayName: `Multiplex Alcove (+${overflowNamespaces.length})`,
      isOverflow: true,
      multiplexedNamespaces: overflowNamespaces,
      status: "connected",
      statusCrystal: buildStatusCrystal("connected"),
      crystal: buildStatusCrystal("connected"),
      archetype: "Arcane Conduit",
      monogram: "MUX",
      colorHex: overflowTraits.primaryHex,
      toolCount: overflowNamespaces.length,
      activeCharacterIds: [],
      lastInvokedAtMs: null,
      fixtureTile: { ...RESOURCE_STOCKPILE_FIXTURE_TILE },
      anchorTile: { ...RESOURCE_STOCKPILE_ANCHOR_TILE },
    };
  }

  const allAlcoves = overflowAlcove
    ? [...dedicatedAlcoves, overflowAlcove]
    : [...dedicatedAlcoves];

  return {
    dedicatedAlcoves,
    overflowAlcove,
    allAlcoves,
    overflowNamespaces,
  };
}

export function createResourceStockpileCrates(): ResourceStockpileCrateSpec[] {
  return [
    {
      crateId: "crate:timber-planks",
      cargoKind: "timber-planks",
      label: "Timber Planks",
      colorHex: "#d97706",
      outlineHex: "#1e293b",
      tile: { x: 13, y: 8 },
      mappedWorkstations: ["Crafting Workbench"],
      mappedTools: ["write", "edit", "multiedit", "apply_patch", "notebookedit"],
    },
    {
      crateId: "crate:stone-block",
      cargoKind: "stone-block",
      label: "Stone Block",
      colorHex: "#a8a29e",
      outlineHex: "#1e293b",
      tile: { x: 14, y: 8 },
      mappedWorkstations: ["Library Study Bookshelf", "Observatory Spyglass"],
      mappedTools: ["read", "glob", "grep", "lsp", "list", "ls", "codesearch"],
    },
    {
      crateId: "crate:iron-bar",
      cargoKind: "iron-bar",
      label: "Iron Bar",
      colorHex: "#94a3b8",
      outlineHex: "#1e293b",
      tile: { x: 13, y: 9 },
      mappedWorkstations: ["Anvil Forge"],
      mappedTools: ["shell", "bash", "terminal", "test"],
    },
    {
      crateId: "crate:arcane-crystal",
      cargoKind: "arcane-crystal",
      label: "Arcane Crystal",
      colorHex: "#38bdf8",
      outlineHex: "#1e293b",
      tile: { x: 14, y: 9 },
      mappedWorkstations: ["Alchemy Lab", "Resource Stockpile"],
      mappedTools: ["execute", "mcp:*", "plugin:*", "compact", "compaction", "summarize"],
    },
    {
      crateId: "crate:scroll-bundle",
      cargoKind: "scroll-bundle",
      label: "Scroll Bundle",
      colorHex: "#fde68a",
      outlineHex: "#1e293b",
      tile: { x: 13, y: 8 },
      mappedWorkstations: ["Armory Wardrobe", "Arcane Lectern", "Observatory Spyglass"],
      mappedTools: ["skill", "subagent", "task", "webfetch", "websearch", "fetch"],
    },
  ];
}

export function buildResourceStockpileFixture(
  dedicatedAlcoves: PluginAlcoveFixtureLayout[],
  overflowNamespaces: string[],
): ResourceStockpileFixtureLayout {
  return {
    stationId: "station:Resource Stockpile",
    kind: "Resource Stockpile",
    bounds: { ...RESOURCE_STOCKPILE_BOUNDS },
    fixtureTile: { ...RESOURCE_STOCKPILE_FIXTURE_TILE },
    anchorTile: { ...RESOURCE_STOCKPILE_ANCHOR_TILE },
    crates: createResourceStockpileCrates(),
    configuredPlugins: dedicatedAlcoves,
    overflowPluginNamespaces: overflowNamespaces,
  };
}
