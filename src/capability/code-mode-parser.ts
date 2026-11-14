import type {
  ResourceCargoDescriptor,
  ResourceCargoKind,
  WorkstationKind,
} from "../types/domain.ts";

export interface CodeModeToolReference {
  namespace: string;
  toolName: string;
}

export const KNOWN_PLUGIN_PREFIXES = new Set([
  "github",
  "gitlab",
  "linear",
  "jira",
  "slack",
  "discord",
  "notion",
  "supabase",
  "postgres",
  "redis",
  "sqlite",
  "playwright",
  "browser",
  "chrome",
  "puppeteer",
  "docker",
  "kubernetes",
  "sentry",
  "figma",
  "stripe",
]);

export function parseCodeModeToolReferences(code: string): CodeModeToolReference[] {
  const references: CodeModeToolReference[] = [];
  const pattern =
    /\btools\s*(?:\.\s*([a-zA-Z0-9_-]+)|\[\s*["'`]([a-zA-Z0-9_-]+)["'`]\s*\])\s*(?:\.\s*([a-zA-Z0-9_-]+)|\[\s*["'`]([a-zA-Z0-9_.-]+)["'`]\s*\])/g;

  let match: RegExpExecArray | null = pattern.exec(code);
  while (match !== null) {
    const namespace = (match[1] ?? match[2] ?? "").toLowerCase();
    const toolName = match[3] ?? match[4] ?? "";
    if (namespace && toolName) {
      references.push({ namespace, toolName });
    }
    match = pattern.exec(code);
  }
  return references;
}

const RESOURCE_CARGO_META: Record<
  ResourceCargoKind,
  { label: string; colorHex: string; outlineHex: string }
> = {
  "iron-bar": {
    label: "Iron Bar",
    colorHex: "#94a3b8",
    outlineHex: "#1e293b",
  },
  "timber-planks": {
    label: "Timber Planks",
    colorHex: "#d97706",
    outlineHex: "#1e293b",
  },
  "stone-block": {
    label: "Stone Block",
    colorHex: "#a8a29e",
    outlineHex: "#1e293b",
  },
  "arcane-crystal": {
    label: "Arcane Crystal",
    colorHex: "#38bdf8",
    outlineHex: "#1e293b",
  },
  "scroll-bundle": {
    label: "Scroll Bundle",
    colorHex: "#fde68a",
    outlineHex: "#1e293b",
  },
};

export interface ResolveResourceCargoInput {
  workstation: WorkstationKind;
  toolName?: string | null;
  pluginNamespace?: string | null;
}

export function isBuiltinOpenCodePlugin(
  namespaceOrId: string | undefined | null,
  sourceType?: string | null,
): boolean {
  if (
    typeof sourceType === "string" &&
    sourceType.trim().toLowerCase() === "builtin"
  ) {
    return true;
  }
  const ns = (namespaceOrId ?? "").trim().toLowerCase();
  if (!ns) {
    return true;
  }
  return (
    ns === "opencode" ||
    ns.startsWith("opencode.") ||
    ns.startsWith("opencode:") ||
    ns.startsWith("opencode/") ||
    ns.startsWith("opencode_") ||
    ns.startsWith("opencode-")
  );
}

export function resolveResourceCargo(
  input: WorkstationKind | ResolveResourceCargoInput,
): ResourceCargoDescriptor {
  const workstation = typeof input === "string" ? input : input.workstation;
  const rawTool =
    typeof input === "string" ? null : (input.toolName?.trim() ?? null);
  const normTool = rawTool ? rawTool.toLowerCase() : null;
  const rawNs =
    typeof input === "string" ? null : (input.pluginNamespace?.trim() ?? null);
  const pluginNamespace =
    rawNs && !isBuiltinOpenCodePlugin(rawNs) ? rawNs.toLowerCase() : null;

  let kind: ResourceCargoKind;
  if (
    pluginNamespace ||
    workstation === "Resource Stockpile" ||
    workstation === "Alchemy Lab" ||
    normTool === "execute" ||
    normTool === "compact" ||
    normTool === "compaction" ||
    normTool === "summarize"
  ) {
    kind = "arcane-crystal";
  } else if (
    normTool === "read" ||
    normTool === "glob" ||
    normTool === "grep" ||
    normTool === "lsp" ||
    normTool === "list" ||
    normTool === "ls" ||
    normTool === "codesearch" ||
    workstation === "Library Study Bookshelf"
  ) {
    kind = "stone-block";
  } else if (
    normTool === "write" ||
    normTool === "edit" ||
    normTool === "multiedit" ||
    normTool === "apply_patch" ||
    normTool === "notebookedit" ||
    workstation === "Crafting Workbench"
  ) {
    kind = "timber-planks";
  } else if (
    normTool === "shell" ||
    normTool === "bash" ||
    normTool === "terminal" ||
    normTool === "test" ||
    workstation === "Anvil Forge"
  ) {
    kind = "iron-bar";
  } else if (
    normTool === "skill" ||
    normTool === "subagent" ||
    normTool === "task" ||
    normTool === "webfetch" ||
    normTool === "websearch" ||
    normTool === "fetch" ||
    workstation === "Armory Wardrobe" ||
    workstation === "Arcane Lectern" ||
    workstation === "Observatory Spyglass"
  ) {
    kind = "scroll-bundle";
  } else {
    kind = "arcane-crystal";
  }

  const meta = RESOURCE_CARGO_META[kind];
  return Object.freeze({
    kind,
    label: meta.label,
    colorHex: meta.colorHex,
    outlineHex: meta.outlineHex,
    targetWorkstation: workstation,
    toolName: rawTool,
    pluginNamespace,
  });
}
