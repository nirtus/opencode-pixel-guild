import { LIFECYCLE_TIMERS_MS } from "../types/domain.ts";
import type {
  CapabilityDescriptor,
  ClassifyCapabilityRequest,
  WorkstationKind,
} from "../types/domain.ts";
import {
  deriveMonogram,
  deriveVisualTraits,
  hashIdentifier,
  inferPluginAlcoveArchetype,
} from "./palette-hash.ts";
import {
  KNOWN_PLUGIN_PREFIXES,
  isBuiltinOpenCodePlugin,
  parseCodeModeToolReferences,
  resolveResourceCargo,
} from "./code-mode-parser.ts";
import type {
  CodeModeToolReference,
  ResolveResourceCargoInput,
} from "./code-mode-parser.ts";

import {
  resolveCanonicalPreparationStation,
  type CanonicalPreparationStationId,
} from "../encounter/workflow-classifier.ts";

export {
  deriveMonogram,
  deriveVisualTraits,
  hashIdentifier,
  inferPluginAlcoveArchetype,
  isBuiltinOpenCodePlugin,
  parseCodeModeToolReferences,
  resolveCanonicalPreparationStation,
  resolveResourceCargo,
};
export type { CanonicalPreparationStationId, CodeModeToolReference, ResolveResourceCargoInput };

const BUILTIN_TOOL_TO_WORKSTATION: Record<string, WorkstationKind> = {
  read: "Library Study Bookshelf",
  list: "Library Study Bookshelf",
  ls: "Library Study Bookshelf",
  grep: "Library Study Bookshelf",
  glob: "Library Study Bookshelf",
  lsp: "Library Study Bookshelf",
  codesearch: "Library Study Bookshelf",
  write: "Crafting Workbench",
  edit: "Crafting Workbench",
  multiedit: "Crafting Workbench",
  apply_patch: "Crafting Workbench",
  notebookedit: "Crafting Workbench",
  bash: "Anvil Forge",
  shell: "Anvil Forge",
  terminal: "Anvil Forge",
  test: "Anvil Forge",
  webfetch: "Observatory Spyglass",
  websearch: "Observatory Spyglass",
  fetch: "Observatory Spyglass",
  compact: "Alchemy Lab",
  compaction: "Alchemy Lab",
  summarize: "Alchemy Lab",
  subagent: "Arcane Lectern",
  task: "Arcane Lectern",
  batch: "Arcane Lectern",
  todowrite: "Arcane Lectern",
  todoread: "Arcane Lectern",
};

export function formatInputPreview(
  input: ClassifyCapabilityRequest["input"],
): string {
  if (!input) return "";
  if (typeof input === "string") {
    const compact = input.trim().replace(/\s+/g, " ");
    return compact.length > 80 ? `${compact.slice(0, 77)}...` : compact;
  }
  const priorityKeys = [
    "path", "command", "pattern", "id", "url",
    "description", "prompt", "code", "name", "query",
  ];
  for (const key of priorityKeys) {
    const val = input[key];
    if (typeof val === "string" && val.trim()) {
      const compactVal = val.trim().replace(/\s+/g, " ");
      const text = `${key}: ${compactVal}`;
      return text.length > 80 ? `${text.slice(0, 77)}...` : text;
    }
  }
  const serialized = JSON.stringify(input);
  return serialized.length > 80 ? `${serialized.slice(0, 77)}...` : serialized;
}

function extractSkillIdFromInput(
  identifier: string,
  input: ClassifyCapabilityRequest["input"],
): string {
  if (typeof input === "object" && input !== null) {
    const candidate = input.id ?? input.name ?? input.skill ?? input.skillId;
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim().replace(/^@/, "");
    }
  }
  if (typeof input === "string" && input.trim()) {
    return input.trim().replace(/^@/, "");
  }
  return identifier.replace(/^@/, "");
}

function inferWorkstationFromVerb(identifier: string): WorkstationKind | null {
  const lower = identifier.toLowerCase();
  if (/(^|[_.-])(write|edit|patch|create_file|update_file|replace)($|[_.-])/.test(lower)) {
    return "Crafting Workbench";
  }
  if (/(^|[_.-])(read|find|search|grep|glob|lookup|query|scan|inspect|list|index|symbol)($|[_.-])/.test(lower)) {
    return "Library Study Bookshelf";
  }
  if (/(^|[_.-])(run|exec|build|compile|test|lint|shell|cmd)($|[_.-])/.test(lower)) {
    return "Anvil Forge";
  }
  if (/(^|[_.-])(http|fetch|crawl|scrape|webhook|download|request)($|[_.-])/.test(lower)) {
    return "Observatory Spyglass";
  }
  if (/(^|[_.-])(compact|distill|summarize|prune)($|[_.-])/.test(lower)) {
    return "Alchemy Lab";
  }
  return null;
}

export function classifyCapability(
  request: ClassifyCapabilityRequest,
): CapabilityDescriptor {
  const rawId = request.identifier.trim();
  const normalizedId = rawId.toLowerCase();
  const inputPreview = formatInputPreview(request.input);
  const catalog = request.catalog;

  if (request.kind === "agent") {
    const catalogAgent = catalog?.agents?.[rawId] ?? catalog?.agents?.[normalizedId];
    const resolvedColor = request.agentColor ?? catalogAgent?.color ?? null;
    const isBuiltIn =
      normalizedId === "build" || normalizedId === "plan" ||
      normalizedId === "explore" || normalizedId === "general";
    return {
      capabilityId: `agent:${rawId}`,
      displayName: catalogAgent?.name ?? rawId,
      kind: "agent",
      tier: isBuiltIn || catalogAgent ? 1 : 3,
      targetWorkstation: "Arcane Lectern",
      pluginNamespace: null,
      secondaryAlcoveNamespaces: [],
      skillId: null,
      minimumDwellMs: 0,
      visualTraits: deriveVisualTraits(rawId, resolvedColor),
      inputPreview: inputPreview || `agent: ${rawId}`,
    };
  }

  if (
    request.kind === "skill" ||
    normalizedId === "skill" ||
    Boolean(catalog?.skills?.[rawId]) ||
    Boolean(catalog?.skills?.[normalizedId])
  ) {
    const skillId =
      normalizedId === "skill"
        ? extractSkillIdFromInput(rawId, request.input)
        : rawId.replace(/^@/, "");
    const catalogSkill =
      catalog?.skills?.[skillId] ?? catalog?.skills?.[skillId.toLowerCase()];
    return {
      capabilityId: `skill:${skillId}`,
      displayName: catalogSkill?.name ?? skillId,
      kind: "skill",
      tier: 1,
      targetWorkstation: "Armory Wardrobe",
      pluginNamespace: null,
      secondaryAlcoveNamespaces: [],
      skillId,
      minimumDwellMs: LIFECYCLE_TIMERS_MS.ARCANE_LECTERN_MIN_DWELL_MS,
      visualTraits: deriveVisualTraits(skillId, catalogSkill?.color),
      inputPreview: inputPreview || `skill: ${skillId}`,
    };
  }

  if (normalizedId === "execute") {
    const codeText =
      typeof request.input === "string"
        ? request.input
        : typeof request.input === "object" &&
            request.input !== null &&
            typeof request.input.code === "string"
          ? request.input.code
          : "";

    const refs = parseCodeModeToolReferences(codeText);
    const uniqueNamespaces: string[] = [];
    for (const ref of refs) {
      if (!uniqueNamespaces.includes(ref.namespace)) {
        uniqueNamespaces.push(ref.namespace);
      }
    }

    if (uniqueNamespaces.length === 1 && !isBuiltinOpenCodePlugin(uniqueNamespaces[0])) {
      const singleNs = uniqueNamespaces[0];
      const pluginColor = catalog?.plugins?.[singleNs]?.color;
      return {
        capabilityId: `codemode:${singleNs}`,
        displayName: `execute (${singleNs})`,
        kind: "code-mode",
        tier: 2,
        targetWorkstation: "Resource Stockpile",
        pluginNamespace: singleNs,
        secondaryAlcoveNamespaces: [],
        skillId: null,
        minimumDwellMs: 0,
        visualTraits: deriveVisualTraits(singleNs, pluginColor),
        inputPreview,
      };
    }

    return {
      capabilityId:
        uniqueNamespaces.length > 0
          ? `codemode:${uniqueNamespaces.join("+")}`
          : "codemode:reactor",
      displayName:
        uniqueNamespaces.length > 1
          ? `execute (${uniqueNamespaces.join(" + ")})`
          : "execute",
      kind: "code-mode",
      tier: 2,
      targetWorkstation: "Alchemy Lab",
      pluginNamespace: null,
      secondaryAlcoveNamespaces: uniqueNamespaces.filter((ns) => !isBuiltinOpenCodePlugin(ns)),
      skillId: null,
      minimumDwellMs: 0,
      visualTraits: deriveVisualTraits(uniqueNamespaces[0] ?? "execute", request.agentColor),
      inputPreview,
    };
  }

  const builtinStation = BUILTIN_TOOL_TO_WORKSTATION[normalizedId];
  if (builtinStation) {
    return {
      capabilityId: `tool:${normalizedId}`,
      displayName: rawId,
      kind: "builtin-tool",
      tier: 1,
      targetWorkstation: builtinStation,
      pluginNamespace: null,
      secondaryAlcoveNamespaces: [],
      skillId: null,
      minimumDwellMs: 0,
      visualTraits: deriveVisualTraits(normalizedId),
      inputPreview,
    };
  }

  if (catalog?.plugins) {
    for (const [nsKey, entry] of Object.entries(catalog.plugins)) {
      const ns = (entry.namespace ?? nsKey).toLowerCase();
      if (
        normalizedId === ns || normalizedId.startsWith(`${ns}_`) ||
        normalizedId.startsWith(`${ns}.`) || normalizedId.startsWith(`${ns}:`) ||
        normalizedId.startsWith(`${ns}/`)
      ) {
        return {
          capabilityId: `plugin:${ns}:${rawId}`,
          displayName: entry.name ? `${entry.name} (${rawId})` : rawId,
          kind: "plugin-tool",
          tier: 1,
          targetWorkstation: "Resource Stockpile",
          pluginNamespace: ns,
          secondaryAlcoveNamespaces: [],
          skillId: null,
          minimumDwellMs: 0,
          visualTraits: deriveVisualTraits(ns, entry.color),
          inputPreview,
        };
      }
    }
  }

  const explicitDelimiterMatch = /^([a-zA-Z0-9-]+)(?:__|[.:/])([a-zA-Z0-9_.-]+)$/.exec(rawId);
  if (explicitDelimiterMatch) {
    const ns = explicitDelimiterMatch[1].toLowerCase();
    return {
      capabilityId: `plugin:${ns}:${rawId}`,
      displayName: rawId,
      kind: "plugin-tool",
      tier: 2,
      targetWorkstation: "Resource Stockpile",
      pluginNamespace: ns,
      secondaryAlcoveNamespaces: [],
      skillId: null,
      minimumDwellMs: 0,
      visualTraits: deriveVisualTraits(ns),
      inputPreview,
    };
  }

  const underscorePrefixMatch = /^([a-zA-Z0-9-]+)_([a-zA-Z0-9_.-]+)$/.exec(rawId);
  if (
    underscorePrefixMatch &&
    (request.kind === "plugin" || KNOWN_PLUGIN_PREFIXES.has(underscorePrefixMatch[1].toLowerCase()))
  ) {
    const ns = underscorePrefixMatch[1].toLowerCase();
    return {
      capabilityId: `plugin:${ns}:${rawId}`,
      displayName: rawId,
      kind: "plugin-tool",
      tier: 2,
      targetWorkstation: "Resource Stockpile",
      pluginNamespace: ns,
      secondaryAlcoveNamespaces: [],
      skillId: null,
      minimumDwellMs: 0,
      visualTraits: deriveVisualTraits(ns),
      inputPreview,
    };
  }

  const verbStation = inferWorkstationFromVerb(normalizedId);
  if (verbStation) {
    return {
      capabilityId: `tool:${rawId}`,
      displayName: rawId,
      kind: "builtin-tool",
      tier: 2,
      targetWorkstation: verbStation,
      pluginNamespace: null,
      secondaryAlcoveNamespaces: [],
      skillId: null,
      minimumDwellMs: 0,
      visualTraits: deriveVisualTraits(rawId, request.agentColor),
      inputPreview,
    };
  }

  return {
    capabilityId: `tool:${rawId}`,
    displayName: rawId,
    kind: "builtin-tool",
    tier: 3,
    targetWorkstation: "Alchemy Lab",
    pluginNamespace: null,
    secondaryAlcoveNamespaces: [],
    skillId: null,
    minimumDwellMs: 0,
    visualTraits: deriveVisualTraits(rawId, request.agentColor),
    inputPreview,
  };
}
