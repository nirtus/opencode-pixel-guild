import {
  PREPARATION_STATION_DISPLAY_NAMES, type CanonicalPreparationStationId, type CapabilityDescriptor,
  type CharacterErrorState, type CharacterLifecycleState, type CharacterRole,
  type PreparationStationDisplayName, type QuestGateState, type ResourceCargoDescriptor,
  type SkillGrimoire, type SummoningRitualState, type ToolExecutionRecord,
  type WorkflowIntentKind, type WorkstationKind,
} from "../types/domain.ts";

export { PREPARATION_STATION_DISPLAY_NAMES };
export type { CanonicalPreparationStationId, PreparationStationDisplayName };

export interface ClassifiableCharacterInput {
  readonly sessionId?: string; readonly title?: string; readonly agentClass?: string;
  readonly role?: CharacterRole; readonly lifecycleState?: CharacterLifecycleState | string;
  readonly state?: CharacterLifecycleState | string; readonly activeWorkstation?: WorkstationKind | null;
  readonly activePluginNamespace?: string | null;
  readonly activeCapability?: (Partial<CapabilityDescriptor> & { readonly toolName?: string }) | null;
  readonly activeTool?: { readonly toolName?: string; readonly inputPreview?: string; readonly outputPreview?: string } | null;
  readonly lastTool?: string | null; readonly activeResourceCargo?: ResourceCargoDescriptor | null;
  readonly recentTools?: ReadonlyArray<Partial<ToolExecutionRecord>>;
  readonly skillGrimoires?: ReadonlyArray<Partial<SkillGrimoire>>;
  readonly errorState?: CharacterErrorState | null; readonly questGate?: QuestGateState | null;
  readonly summoningRitual?: SummoningRitualState | null; readonly workflowIntent?: WorkflowIntentKind;
  readonly overheadLabel?: string; readonly equippingAtArmory?: boolean;
  readonly lastEquippedToolCategory?: string; readonly haulingPart?: boolean;
  readonly isHauling?: boolean; readonly haulingPhase?: "pickup" | "haul-to-worksite" | null;
}

export interface WorkflowClassificationOptions {
  readonly hasActiveRoomBug?: boolean; readonly ignoreStoredIntent?: boolean;
}

export interface OverheadLabelDerivationOptions {
  readonly workflowIntent?: WorkflowIntentKind; readonly station?: string;
  readonly isEquippingAtArmory?: boolean; readonly forCanvas?: boolean; readonly ignoreStoredLabel?: boolean;
}

import { isShellFailureOutput } from "./bug-monsters.ts";

const DEBUG_SKILL_PATTERNS = ["diagnosing-bugs", "debug", "bug", "report", "triage", "fix"];
const INFO_SKILL_PATTERNS = ["research", "find-skills", "code-review", "grilling", "domain-modeling", "opencode"];
const BUILD_SKILL_PATTERNS = ["tdd", "codebase-design", "prototype", "scaffold-exercises", "setup-pre-commit", "migrate-to-shoehorn"];

const WRITE_OR_BUILD_TOOLS = new Set(["write", "edit", "multiedit", "apply_patch", "notebookedit"]);
const READ_OR_SEARCH_TOOLS = new Set([
  "read", "grep", "glob", "list", "ls", "lsp", "codesearch",
  "webfetch", "websearch", "fetch", "todoread", "list_mcp_resources", "read_mcp_resource",
]);
const SHELL_TOOLS = new Set(["bash", "shell", "terminal", "test"]);

const DEBUG_TITLE_REGEX =
  /\b(diagnos\w*|debug\w*|bug\b|fix\b|regression|broken|failing|fail\b|crash\w*|flicker\w*|error\b|oom\b|leak\b|hunt\b|issue\b|lag\b|slow\b)\b/i;
const INFO_TITLE_REGEX =
  /\b(research\w*|explor\w*|review\w*|audit\w*|inspect\w*|investigat\w*|search\w*|find\b|explain\w*|question\w*)\b/i;

export function isExplorationAgentClass(agentClass?: string | null): boolean {
  const norm = (agentClass ?? "").toLowerCase().trim();
  return /^(explore|research|plan|document)$/.test(norm) || norm.includes("scout") || norm.includes("review");
}

const PASSING_TEST_INPUT_REGEX =
  /\b(npm\s+test|npm\s+run\s+test|node\s+.*--test|vitest|jest|pytest|cargo\s+test|go\s+test|mocha|ava|tap\b|playwright\s+test|cypress\b)\b/i;
const PASSING_TEST_OUTPUT_REGEX =
  /#\s*pass\s+\d+|\b\d+\s+pass(?:ed|ing)?\b|\bpass:\s*\d+|\bPASS\b|\bok\s+\d+\s+-|\b0\s+fail(?:ed|ures?)?\b/i;
const HEADLESS_SCREENSHOT_CMD_REGEX =
  /\b(chrome\.exe|google-chrome|chromium(?:-browser)?)\b|--headless\b.*--screenshot|--screenshot\b.*--headless/i;

export function isPassingShellTestRun(t: Partial<ToolExecutionRecord>): boolean {
  const toolName = (t.toolName ?? "").trim().replace(/^tool:/i, "").toLowerCase();
  if (toolName === "test") return true;
  const inp = (t.inputPreview ?? "").trim();
  const out = (t.outputPreview ?? "").trim();
  if (PASSING_TEST_OUTPUT_REGEX.test(out) || PASSING_TEST_INPUT_REGEX.test(inp)) return true;
  return (!inp || inp.toLowerCase() === toolName) && !out;
}

export function evaluateRecentToolHealth(
  recentTools?: ReadonlyArray<Partial<ToolExecutionRecord>>,
): { hasUnresolvedFailure: boolean; hasPassingShellRun: boolean } {
  let hasPassingShellRun = false, seenPassingShell = false, hasPassingWriteOrEdit = false, hasNewerWriteOrRunningTool = false;
  for (const t of recentTools ?? []) {
    const toolName = (t.toolName ?? "").trim().replace(/^tool:/i, "").toLowerCase();
    const isShell = SHELL_TOOLS.has(toolName), isWrite = WRITE_OR_BUILD_TOOLS.has(toolName);
    if (READ_OR_SEARCH_TOOLS.has(toolName) || toolName === "question") continue;
    if (t.status === "running" && (isShell || isWrite)) {
      if (isWrite || !HEADLESS_SCREENSHOT_CMD_REGEX.test(t.inputPreview ?? "")) hasNewerWriteOrRunningTool = true;
      continue;
    }
    if (t.status === "error") {
      return { hasUnresolvedFailure: !(isWrite ? seenPassingShell || hasPassingWriteOrEdit : seenPassingShell), hasPassingShellRun };
    }
    if (isShell) {
      if (isShellFailureOutput(t.outputPreview)) return { hasUnresolvedFailure: !seenPassingShell, hasPassingShellRun };
      if (t.status === "completed") {
        seenPassingShell = true;
        if (!hasNewerWriteOrRunningTool && isPassingShellTestRun(t)) hasPassingShellRun = true;
      }
    } else if (isWrite && t.status === "completed") {
      hasPassingWriteOrEdit = true;
      hasNewerWriteOrRunningTool = true;
    }
  }
  return { hasUnresolvedFailure: false, hasPassingShellRun };
}

export function extractCapabilityToolName(
  cap?: (Partial<CapabilityDescriptor> & { readonly toolName?: string; readonly rawName?: string }) | null,
): string {
  if (!cap) return "";
  if (cap.kind === "skill" || cap.capabilityId?.toLowerCase().startsWith("skill:")) return "skill";
  if (cap.kind === "code-mode" || cap.capabilityId?.toLowerCase().startsWith("codemode:")) return "execute";
  if (cap.kind === "agent" || cap.capabilityId?.toLowerCase().startsWith("agent:")) return "";
  if (cap.capabilityId?.toLowerCase().startsWith("tool:")) return cap.capabilityId.slice(5).trim().toLowerCase();
  if (cap.capabilityId?.toLowerCase().startsWith("plugin:")) return cap.capabilityId.split(":").slice(2).join(":").trim().toLowerCase();
  return (cap.toolName ?? cap.rawName ?? cap.displayName ?? cap.capabilityId ?? "").trim().replace(/^tool:/i, "").toLowerCase();
}

export function resolveActiveToolName(char: ClassifiableCharacterInput): string {
  const normalizedCap = extractCapabilityToolName(char.activeCapability ?? char.activeTool);
  if (normalizedCap && normalizedCap !== "question") return normalizedCap;
  if (char.activeWorkstation === "Armory Wardrobe") return "skill";
  const nonQuestionRecent = (char.recentTools ?? []).find((t) => (t.toolName ?? "").trim().toLowerCase() !== "question");
  return (nonQuestionRecent?.toolName ?? char.lastTool ?? "").trim().replace(/^tool:/i, "").toLowerCase();
}

export function isCharacterExploringOrGatheringInfo(char: ClassifiableCharacterInput): boolean {
  const rawCapTool = extractCapabilityToolName(char.activeCapability ?? char.activeTool);
  const activeTool = resolveActiveToolName(char);
  if (rawCapTool === "skill" || activeTool === "skill" || char.activeWorkstation === "Armory Wardrobe") return false;
  if (isExplorationAgentClass(char.agentClass)) return true;
  if ((rawCapTool && READ_OR_SEARCH_TOOLS.has(rawCapTool)) || (activeTool && READ_OR_SEARCH_TOOLS.has(activeTool))) return true;
  const recentTools = char.recentTools ?? [];
  const hasFixOrTestTool = recentTools.some((t) => {
    const name = (t.toolName ?? "").trim().replace(/^tool:/i, "").toLowerCase();
    return WRITE_OR_BUILD_TOOLS.has(name) || SHELL_TOOLS.has(name) || name === "hunt";
  });
  if (recentTools.length > 0 && !hasFixOrTestTool) return true;
  return (
    recentTools.length === 0 && !rawCapTool && !char.errorState &&
    char.activeWorkstation !== "Crafting Workbench" && char.activeWorkstation !== "Anvil Forge"
  );
}

export function isCharacterActivelyFixingBug(char: ClassifiableCharacterInput): boolean {
  if (isExplorationAgentClass(char.agentClass) || isCharacterExploringOrGatheringInfo(char) || char.activeWorkstation === "Armory Wardrobe") return false;
  if ((char.lifecycleState ?? char.state) === "Thinking" && !char.activeWorkstation && !extractCapabilityToolName(char.activeCapability ?? char.activeTool) && !(char.recentTools ?? []).some((rt) => rt.status === "running" && (rt.toolName ?? "").toLowerCase() !== "question")) return false;
  if (classifyCharacterWorkflowIntent(char) !== "debugging-hunt") return false;
  const { hasUnresolvedFailure, hasPassingShellRun } = evaluateRecentToolHealth(char.recentTools);
  if (hasPassingShellRun && !char.errorState && !hasUnresolvedFailure) return false;
  const activeTool = resolveActiveToolName(char);
  if (activeTool && !WRITE_OR_BUILD_TOOLS.has(activeTool) && !SHELL_TOOLS.has(activeTool) && activeTool !== "hunt") return false;
  if (WRITE_OR_BUILD_TOOLS.has(activeTool) || SHELL_TOOLS.has(activeTool) || activeTool === "hunt" || Boolean(char.errorState) || hasUnresolvedFailure) {
    return true;
  }
  return char.activeWorkstation === "Crafting Workbench" || char.activeWorkstation === "Anvil Forge";
}

export function classifyCharacterWorkflowIntent(
  char: ClassifiableCharacterInput,
  options?: WorkflowClassificationOptions,
): WorkflowIntentKind {
  const skillIds = (char.skillGrimoires ?? [])
    .map((g) => `${g.skillId ?? ""} ${g.name ?? ""}`.toLowerCase())
    .join(" ");

  if (char.errorState) return "debugging-hunt";

  const recentTools = char.recentTools ?? [];
  const { hasUnresolvedFailure, hasPassingShellRun } = evaluateRecentToolHealth(recentTools);
  if (hasUnresolvedFailure) return "debugging-hunt";

  const activeTool = resolveActiveToolName(char);
  const hasWriteOrEdit =
    WRITE_OR_BUILD_TOOLS.has(activeTool) ||
    recentTools.some((t) => WRITE_OR_BUILD_TOOLS.has((t.toolName ?? "").toLowerCase()));
  const title = (char.title ?? "").toLowerCase();
  const agentClass = (char.agentClass ?? "").toLowerCase().trim();

  if (isExplorationAgentClass(agentClass) && !hasWriteOrEdit && activeTool !== "test" && activeTool !== "hunt") {
    return "information-gathering";
  }

  if (!hasPassingShellRun && DEBUG_SKILL_PATTERNS.some((pat) => skillIds.includes(pat))) {
    return "debugging-hunt";
  }

  const inputPreview = (
    char.activeCapability?.inputPreview ??
    char.activeTool?.inputPreview ??
    recentTools[0]?.inputPreview ??
    ""
  ).toLowerCase();

  if (
    activeTool === "test" ||
    activeTool === "hunt" ||
    activeTool.includes("diagnos") ||
    agentClass.includes("debug") ||
    agentClass.includes("warrior") ||
    (!hasPassingShellRun && DEBUG_TITLE_REGEX.test(title)) ||
    (!hasPassingShellRun &&
      SHELL_TOOLS.has(activeTool) &&
      !HEADLESS_SCREENSHOT_CMD_REGEX.test(inputPreview) &&
      /\b(--test|vitest|jest|pytest|diagnos\w*|debug\w*|bug\b)\b/i.test(inputPreview))
  ) {
    return "debugging-hunt";
  }

  if (!options?.ignoreStoredIntent && char.workflowIntent === "debugging-hunt") {
    return "debugging-hunt";
  }

  if (INFO_TITLE_REGEX.test(title) && !hasWriteOrEdit) {
    return "information-gathering";
  }

  if (BUILD_SKILL_PATTERNS.some((pat) => skillIds.includes(pat))) {
    return "feature-build";
  }

  if (hasWriteOrEdit) return "feature-build";

  if (INFO_SKILL_PATTERNS.some((pat) => skillIds.includes(pat))) {
    return "information-gathering";
  }
  if (
    READ_OR_SEARCH_TOOLS.has(activeTool) &&
    !recentTools.some((t) => SHELL_TOOLS.has((t.toolName ?? "").toLowerCase()))
  ) {
    return "information-gathering";
  }

  if (!options?.ignoreStoredIntent && char.workflowIntent) {
    return char.workflowIntent;
  }

  return "feature-build";
}

export function deriveOverheadActionLabel(
  char: ClassifiableCharacterInput,
  options?: OverheadLabelDerivationOptions,
): string {
  const state = char.lifecycleState ?? char.state;
  const isQuestionWaiting =
    char.questGate?.kind === "question" ||
    char.questGate?.marker === "?" ||
    (state === "BlockedAtQuestGate" && char.questGate?.kind !== "permission" && char.questGate?.marker !== "!");

  if (
    (state === "BlockedAtQuestGate" && char.questGate?.kind === "permission") ||
    char.questGate?.kind === "permission" ||
    char.questGate?.marker === "!"
  ) {
    return "Needs Permission";
  }

  if (isQuestionWaiting) {
    return options?.forCanvas ? "" : "Waiting";
  }

  if (state === "RestingInLounge") return "Resting";
  if (state === "Archived") return "Archived";
  if (state === "DistillingContextMana") return "Compacting...";
  if (state === "ReportingScroll") return "Reporting Scroll";

  const activeTool = resolveActiveToolName(char);
  const isEquipping =
    options?.isEquippingAtArmory !== undefined
      ? options.isEquippingAtArmory
      : Boolean(char.equippingAtArmory) || options?.station === "Armory";

  if (!isEquipping && options?.station === "Combat") {
    return "Fighting Bug";
  }

  const stored = char.overheadLabel?.trim() ?? "";
  if (
    !options?.ignoreStoredLabel &&
    stored &&
    stored !== "Ready" &&
    !(stored === "Fighting Bug" && options?.station && options.station !== "Combat") &&
    !(stored.startsWith("Equipping ") && options?.station && options.station !== "Armory")
  ) {
    return stored;
  }

  if (isEquipping) {
    const cat = (char.lastEquippedToolCategory || activeTool).toLowerCase();
    if (cat.includes("bash") || cat.includes("shell") || cat.includes("test")) return "Equipping Shell";
    if (cat.includes("skill")) return "Equipping Skill";
    if (cat.includes("edit") || cat.includes("write") || cat.includes("patch") || cat.includes("editor")) return "Equipping Quill";
    if (cat.includes("read") || cat.includes("grep") || cat.includes("glob") || cat.includes("reader")) return "Equipping Lens";
    if (cat.includes("execute") || cat.includes("mcp") || cat.includes("plugin")) return "Equipping Plugin";
    return "Equipping Gear";
  }

  if (char.haulingPart || char.isHauling || char.haulingPhase === "haul-to-worksite") return "Hauling Part";
  if (state === "Entering") return "Entering Hall";
  const ritualEndsAt = char.summoningRitual?.endsAtMs ?? 0;
  const isRitualExpired = ritualEndsAt > 1_000_000_000_000 && Date.now() >= ritualEndsAt;
  if (char.summoningRitual?.active && !isRitualExpired && (!activeTool || activeTool === "subagent" || activeTool === "task")) {
    return "Summoning Squad";
  }

  const intent =
    options?.workflowIntent ??
    (options?.ignoreStoredLabel
      ? classifyCharacterWorkflowIntent(char, { ignoreStoredIntent: true })
      : (char.workflowIntent ?? classifyCharacterWorkflowIntent(char)));

  if ((state === "Thinking" && !char.activeCapability && !char.activeTool) || !activeTool) {
    if (intent === "debugging-hunt") return "Tracking Bug";
    if (intent === "information-gathering") return "Gathering Info";
    return "Thinking...";
  }

  if (activeTool === "skill" || char.activeWorkstation === "Armory Wardrobe") return "Equipping Skill";
  if (activeTool === "subagent" || activeTool === "task") return "Summoning Squad";
  if (activeTool === "compact" || activeTool === "compaction") return "Distilling Mana";

  const isCombatStation = !options?.station || options.station === "Combat";
  if (WRITE_OR_BUILD_TOOLS.has(activeTool) || options?.station === "Combat") {
    return (intent === "debugging-hunt" && isCombatStation) || options?.station === "Combat" ? "Fighting Bug" : "Editing Code";
  }
  if (SHELL_TOOLS.has(activeTool)) return intent === "debugging-hunt" && isCombatStation ? "Fighting Bug" : "Running Shell";
  if (activeTool === "read") return intent === "debugging-hunt" ? "Tracking Bug" : "Reading File";
  if (/^(grep|glob|lsp|list|ls|codesearch|hunt)$/.test(activeTool) || activeTool.includes("diagnos")) {
    return intent === "debugging-hunt" ? "Searching Wilds" : "Searching Code";
  }
  if (activeTool === "webfetch" || activeTool === "websearch" || activeTool === "fetch") return "Querying Web";
  if (activeTool === "execute" || activeTool.startsWith("codemode:")) return "Running Script";
  if (char.activeWorkstation === "Resource Stockpile" || char.activePluginNamespace) return "Channeling Plugin";

  return intent === "debugging-hunt" ? "Tracking Bug" : "Working...";
}

export function resolveCanonicalPreparationStation(input: {
  toolName?: string | null;
  lastToolName?: string | null;
  workstation?: WorkstationKind | string | null;
  lastEquippedToolCategory?: string | null;
  gateHint?: string | null;
  pluginNamespace?: string | null;
  workflowIntent?: WorkflowIntentKind | null;
  agentClass?: string | null;
}): CanonicalPreparationStationId {
  const rawTool = (input.toolName || input.lastToolName || "").trim().replace(/^tool:/i, "").toLowerCase();
  const cat = (input.lastEquippedToolCategory || "").trim().toLowerCase();
  const probe = `${rawTool} ${input.gateHint || ""}`.trim().toLowerCase();
  const isSpyglassRecon =
    isExplorationAgentClass(input.agentClass) || input.workflowIntent === "debugging-hunt";

  if (/(^|[^a-z0-9])skill(s)?($|[^a-z0-9])/.test(probe)) return "Armory";
  if (input.pluginNamespace || /(^|[^a-z0-9])(mcp|plugin|list_mcp_resources|read_mcp_resource)($|[^a-z0-9])/.test(probe)) return "Stockpile";
  if (/(^|[^a-z0-9])(subagent|task|batch|todowrite|todoread)($|[^a-z0-9])/.test(probe)) return "Enchanter";
  if (/(^|[^a-z0-9])(edit|write|patch|apply_patch|multiedit|notebookedit)($|[^a-z0-9])/.test(probe)) return "Tinker";
  if (/(^|[^a-z0-9])(bash|test|build|shell|terminal)($|[^a-z0-9])/.test(probe)) return "Forge";
  if (/(^|[^a-z0-9])(websearch|webfetch|fetch)($|[^a-z0-9])/.test(probe)) return "Spyglass";
  if (/(^|[^a-z0-9])(read|glob|grep|list|ls|lsp|codesearch)($|[^a-z0-9])/.test(probe)) {
    return isSpyglassRecon ? "Spyglass" : "Library";
  }
  if (/(^|[^a-z0-9])(execute|codemode|compact|compaction|summarize)($|[^a-z0-9])/.test(probe)) return "Alchemy";
  if (/(^|[^a-z0-9])hunt($|[^a-z0-9])/.test(probe)) {
    return input.workflowIntent === "debugging-hunt" ? "Combat" : "WildsSearch";
  }

  switch (input.workstation) {
    case "Library Study Bookshelf": return cat === "edit" || cat === "editor" ? "Tinker" : isSpyglassRecon ? "Spyglass" : "Library";
    case "Observatory Spyglass": return "Spyglass";
    case "Crafting Workbench": return "Tinker";
    case "Anvil Forge": return "Forge";
    case "Armory Wardrobe": return "Armory";
    case "Arcane Lectern": return cat === "skill" ? "Armory" : "Enchanter";
    case "Alchemy Lab": return "Alchemy";
    case "Resource Stockpile": return "Stockpile";
    case "Break Lounge": return "Lounge";
    case "Dungeon Wilds": return input.workflowIntent === "debugging-hunt" ? "Combat" : "WildsSearch";
    default: break;
  }

  if (cat === "edit" || cat === "editor") return "Tinker";
  if (cat === "bash" || cat === "shell") return "Forge";
  if (cat === "read" || cat === "reader") return isSpyglassRecon ? "Spyglass" : "Library";
  if (cat === "comms" || cat === "web") return "Spyglass";
  if (cat === "skill") return "Armory";
  if (cat === "subagent") return "Enchanter";
  if (cat === "execute" || cat === "compact") return "Alchemy";
  if (cat === "plugin") return "Stockpile";
  return rawTool ? "Tinker" : isSpyglassRecon ? "Spyglass" : input.workflowIntent === "information-gathering" ? "Library" : "Enchanter";
}

export function resolvePreparationStationDisplayName(
  input: Parameters<typeof resolveCanonicalPreparationStation>[0],
): PreparationStationDisplayName {
  return PREPARATION_STATION_DISPLAY_NAMES[resolveCanonicalPreparationStation(input)];
}
