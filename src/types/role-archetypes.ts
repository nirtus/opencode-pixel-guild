import type { HeadgearSilhouette } from "./core-types.ts";

export const GUILD_ROLE_ARCHETYPES = [
  "WARRIOR",
  "MAGE",
  "SCOUT",
  "ALCHEMIST",
  "CLERIC",
  "SAPPER",
] as const;

export type GuildRoleArchetype = (typeof GUILD_ROLE_ARCHETYPES)[number];

export const ROLE_ARCHETYPE_ALIASES: Readonly<Record<string, GuildRoleArchetype>> = Object.freeze({
  ARTIFICER: "ALCHEMIST",
  DEMOLITIONIST: "SAPPER",
  ALCHEMIST: "ALCHEMIST",
  SAPPER: "SAPPER",
  MAGE: "MAGE",
  WARRIOR: "WARRIOR",
  SCOUT: "SCOUT",
  CLERIC: "CLERIC",
});

export const ROLE_ARCHETYPE_HEADGEAR: Readonly<Record<GuildRoleArchetype, HeadgearSilhouette>> = Object.freeze({
  WARRIOR: "visored-helm",
  MAGE: "horned-crown",
  SCOUT: "hood",
  ALCHEMIST: "alchemist-goggles",
  CLERIC: "arcane-circlet",
  SAPPER: "plumed-cap",
});

export interface ResolveGuildRoleInput {
  readonly agentClass?: string | null;
  readonly subagentType?: string | null;
  readonly skillIds?: readonly string[];
  readonly title?: string | null;
  readonly activeTool?: string | null;
  readonly signatureTools?: readonly string[];
}

export function isSelectablePrimaryAgentMode(agent: {
  readonly id?: string | null;
  readonly mode?: string | null;
  readonly hidden?: boolean | null;
  readonly disabled?: boolean | null;
} | null | undefined): boolean {
  if (!agent || typeof agent.id !== "string" || !agent.id.trim()) return false;
  if (agent.hidden || agent.disabled) return false;
  return !agent.mode || agent.mode === "primary" || agent.mode === "all";
}

const SPECIALIZED_ROLE_PATTERNS: ReadonlyArray<{
  readonly role: GuildRoleArchetype;
  readonly exact: ReadonlySet<string>;
  readonly substrings: readonly string[];
  readonly titleRegex: RegExp;
}> = [
  {
    role: "SAPPER",
    exact: new Set(["sapper", "demolition", "demolitionist", "cleanup", "prune", "docker"]),
    substrings: ["demolition", "sapper"],
    titleRegex: /\b(demolish|demolition|sapper|cleanup|prune|teardown|docker)\b/,
  },
  {
    role: "CLERIC",
    exact: new Set([
      "cleric",
      "review",
      "code-review",
      "grilling",
      "pr",
      "report",
      "setup-pre-commit",
      "git-guardrails-claude-code",
    ]),
    substrings: ["review", "grilling", "guardrail", "cleric"],
    titleRegex: /\b(code-review|review|grill|grilling|guardrail|audit)\b/,
  },
  {
    role: "ALCHEMIST",
    exact: new Set([
      "alchemist",
      "artificer",
      "prototype",
      "codebase-design",
      "migrate-to-shoehorn",
      "scaffold-exercises",
    ]),
    substrings: ["alchemist", "artificer", "prototype", "codebase-design", "shoehorn"],
    titleRegex: /\b(prototype|refactor|deepen|codebase-design|shoehorn|artificer|alchemist)\b/,
  },
  {
    role: "SCOUT",
    exact: new Set(["scout", "plan", "explore", "research", "find-skills"]),
    substrings: ["explore", "research", "find-skills", "scout"],
    titleRegex: /\b(explore|research|plan|scout|recon|search|find-skills)\b/,
  },
  {
    role: "MAGE",
    exact: new Set([
      "mage",
      "document",
      "wayfinder",
      "domain-modeling",
      "writing-for-agents",
      "wizard",
      "opencode",
    ]),
    substrings: ["wayfinder", "domain-modeling", "writing-for-agents"],
    titleRegex: /\b(wayfinder|document|spec|glossary|adr|domain-modeling|wizard)\b/,
  },
  {
    role: "WARRIOR",
    exact: new Set([
      "warrior",
      "implement",
      "implement-spec",
      "tdd",
      "diagnosing-bugs",
      "debug",
      "fix",
    ]),
    substrings: ["diagnosing-bugs", "implement"],
    titleRegex: /\b(debug|diagnos|tdd|implement)\b/,
  },
];

function matchSpecializedAgentOrSkill(token: string): GuildRoleArchetype | null {
  const norm = token.trim().toLowerCase().replace(/^@/, "");
  if (!norm) return null;
  for (const entry of SPECIALIZED_ROLE_PATTERNS) {
    if (entry.exact.has(norm) || entry.substrings.some((s) => norm.includes(s))) {
      return entry.role;
    }
  }
  return null;
}

function matchRoleFromTitle(title: string): GuildRoleArchetype | null {
  const norm = title.trim().toLowerCase();
  if (!norm) return null;

  const prefixMatch = /^([a-z0-9_-]+)\s*[:\-–—]/i.exec(norm);
  if (prefixMatch) {
    const byPrefix = matchSpecializedAgentOrSkill(prefixMatch[1]);
    if (byPrefix) return byPrefix;
  }

  for (const entry of SPECIALIZED_ROLE_PATTERNS) {
    if (entry.titleRegex.test(norm)) {
      return entry.role;
    }
  }
  return null;
}

export function resolveGuildRoleArchetype(
  agentClassOrInput?: string | ResolveGuildRoleInput,
  activeTool?: string,
  signatureTools: readonly string[] = [],
): GuildRoleArchetype {
  const input: ResolveGuildRoleInput =
    typeof agentClassOrInput === "object" && agentClassOrInput !== null
      ? agentClassOrInput
      : {
          agentClass: agentClassOrInput,
          activeTool,
          signatureTools,
        };

  const agent = (input.subagentType || input.agentClass || "").trim().toLowerCase();
  const tool = (input.activeTool ?? "").trim().toLowerCase();
  const sigTools = (input.signatureTools ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean);
  const allTools = [tool, ...sigTools].filter(Boolean);

  // Tier 1: Explicit non-default agent or subagent class
  if (agent && agent !== "build" && agent !== "general") {
    const directRole = ROLE_ARCHETYPE_ALIASES[agent.toUpperCase()] ?? matchSpecializedAgentOrSkill(agent);
    if (directRole) return directRole;
  }

  // Tier 2: Equipped Skill Grimoires (most recently equipped first)
  const skills = input.skillIds ?? [];
  for (let i = skills.length - 1; i >= 0; i--) {
    const bySkill = matchSpecializedAgentOrSkill(skills[i]);
    if (bySkill) return bySkill;
  }

  // Tier 3a: Session quest title / subagent prefix
  if (input.title) {
    const byTitle = matchRoleFromTitle(input.title);
    if (byTitle) return byTitle;
  }

  // Tier 3b: Signature / active tool specialty
  if (
    allTools.some(
      (t) =>
        t.includes("demolition") ||
        t.includes("delete") ||
        t.includes("bomb") ||
        t.includes("sapper"),
    )
  ) {
    return "SAPPER";
  }

  if (
    allTools.some(
      (t) =>
        t === "test" ||
        t.includes("diagnosing-bugs") ||
        t.includes("debug") ||
        t.includes("hunt"),
    )
  ) {
    return "WARRIOR";
  }

  if (
    allTools.some(
      (t) =>
        t === "execute" ||
        t.startsWith("execute (") ||
        t.includes("codebase-design") ||
        t.includes("alchemist") ||
        t.includes("artificer") ||
        t.includes("prototype"),
    )
  ) {
    return "ALCHEMIST";
  }

  if (
    allTools.some(
      (t) =>
        t.includes("code-review") ||
        t === "question" ||
        t.includes("guardrail") ||
        t.includes("cleric") ||
        t.includes("grilling"),
    )
  ) {
    return "CLERIC";
  }

  const hasMutatingTool = allTools.some((t) =>
    /^(edit|write|multiedit|apply_patch|notebookedit|bash|shell|terminal|test)$/.test(t),
  );
  if (
    allTools.some((t) => t === "find-skills" || t === "research") ||
    (!hasMutatingTool &&
      agent === "general" &&
      allTools.some((t) => t === "grep" || t === "glob" || t === "websearch" || t === "webfetch"))
  ) {
    return "SCOUT";
  }

  // Tier 4: Default agent class fallback
  if (agent === "general") {
    return "MAGE";
  }

  return "WARRIOR";
}

const GENERIC_TURN_TOOL_REGEX =
  /^(test|question|bash|shell|terminal|read|edit|write|multiedit|apply_patch|notebookedit|glob|grep|list|ls|lsp|codesearch|webfetch|websearch|fetch|subagent|task|skill)$/i;

export function reconcileCharacterRoleArchetype(char: {
  readonly agentClass?: string | null;
  readonly title?: string | null;
  readonly skillGrimoires?: ReadonlyArray<{
    readonly skillId: string;
    readonly activatedBy?: string;
  }>;
  readonly distilledSkillHistory?: ReadonlyArray<{
    readonly skillId: string;
    readonly activatedBy?: string;
  }>;
  readonly activeCapability?: {
    readonly displayName?: string | null;
  } | null;
  readonly recentTools?: ReadonlyArray<{ readonly toolName: string }>;
}): GuildRoleArchetype {
  const allGrimoires = [
    ...(char.distilledSkillHistory ?? []),
    ...(char.skillGrimoires ?? []),
  ];
  const directSkills = allGrimoires
    .filter((g) => g.activatedBy !== "inherited")
    .map((g) => g.skillId);
  const rawActive =
    char.recentTools?.[0]?.toolName ?? char.activeCapability?.displayName ?? "";
  const activeTool =
    rawActive && !GENERIC_TURN_TOOL_REGEX.test(rawActive.trim())
      ? rawActive
      : undefined;
  const signatureTools = (char.recentTools ?? [])
    .map((r) => r.toolName)
    .filter((t) => Boolean(t) && !GENERIC_TURN_TOOL_REGEX.test(t.trim()));

  return resolveGuildRoleArchetype({
    agentClass: char.agentClass,
    skillIds: directSkills,
    title: char.title,
    activeTool,
    signatureTools,
  });
}
