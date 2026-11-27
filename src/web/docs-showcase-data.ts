import type { RoomGitWorkingTreeState } from "../ingress/index.ts";
import type { DirectionalTurnaround } from "../sprites/index.ts";
import type {
  CharacterLifecycleState,
  ClientOperatorProfile,
  GuildRoleArchetype,
  ModelCatalogEntry,
  ResourceCargoKind,
} from "../types/domain.ts";
import { LAIR_POSITIONS } from "./station-geometry-catalog.ts";

export const DOCS_SHOWCASE_EPOCH_MS = 1_760_000_030_000;

export const SYNTHETIC_PROJECT_DIRS = Object.freeze({
  pixelGuild: "~/workspace/opencode-pixel-guild",
  arcaneEngine: "~/workspace/arcane-engine",
  chronicleCore: "~/workspace/chronicle-core",
  starlightCli: "~/workspace/starlight-cli",
});

export const SYNTHETIC_AVAILABLE_MODELS: readonly ModelCatalogEntry[] = Object.freeze([
  { id: "anthropic/claude-sonnet-4", providerId: "anthropic", providerName: "Anthropic", name: "Claude Sonnet 4", variants: ["high", "max"], limitContext: 200_000, limitOutput: 16_384 },
  { id: "openai/gpt-5", providerId: "openai", providerName: "OpenAI", name: "GPT-5", variants: ["medium", "high"], limitContext: 256_000, limitOutput: 16_384 },
  { id: "google/gemini-2.5-pro", providerId: "google", providerName: "Google", name: "Gemini 2.5 Pro", variants: ["high"], limitContext: 1_000_000, limitOutput: 16_384 },
]);

export const SYNTHETIC_AGENTS = [
  { id: "build", name: "build", kind: "agent" as const, mode: "primary" as const, description: "Feature implementation smith" },
  { id: "plan", name: "plan", kind: "agent" as const, mode: "primary" as const, description: "Architecture & planning scout" },
  { id: "document", name: "document", kind: "agent" as const, mode: "primary" as const, description: "Specification & lore scribe" },
];

export const SYNTHETIC_SKILLS = [
  { id: "tdd", name: "tdd", kind: "skill" as const },
  { id: "codebase-design", name: "codebase-design", kind: "skill" as const },
  { id: "diagnosing-bugs", name: "diagnosing-bugs", kind: "skill" as const },
  { id: "domain-modeling", name: "domain-modeling", kind: "skill" as const },
  { id: "code-review", name: "code-review", kind: "skill" as const },
  { id: "wayfinder", name: "wayfinder", kind: "skill" as const },
];

export const MERMAID_ASSISTANT_TEXT = [
  "Verified the offline showcase architecture and Mermaid renderer seam.",
  "",
  "```mermaid",
  "flowchart LR",
  "  A[Synthetic Fixtures] --> B[Offline Director]",
  "  B --> C[Air-Gapped Chromium]",
  "  C --> D[PNG Strip + OCR Gate]",
  "  D --> E[assets/images/manifest.json]",
  "```",
  "",
  "```mermaid",
  "sequenceDiagram",
  "  participant G as Guild Master",
  "  participant D as Showcase Director",
  "  participant V as OCR Verifier",
  "  G->>D: Load ?demo=docs-showcase",
  "  D-->>G: Paint Deterministic Frame",
  "  D->>V: Strip Metadata & Scan Text",
  "  V-->>G: Manifest SHA-256 Verified",
  "```",
].join("\n");

export interface SyntheticHeroDef {
  sessionId: string;
  parentId: string | null;
  roomId: string;
  projectName: string;
  title: string;
  agentClass: string;
  roleArchetype: GuildRoleArchetype;
  primaryHex: string;
  trimHex: string;
  x: number;
  y: number;
  station: string;
  overheadLabel: string;
  facingDirection: DirectionalTurnaround;
  lifecycleState: CharacterLifecycleState;
  skills: string[];
  cargo?: ResourceCargoKind;
  hasUnviewedResult?: boolean;
  hasQuestGate?: boolean;
  bugError?: string;
}

export function buildSyntheticHeroDefs(options: {
  includeQuestGate?: boolean;
  wildsCombat?: boolean;
}): SyntheticHeroDef[] {
  const lair0 = LAIR_POSITIONS[0]!;
  const lair1 = LAIR_POSITIONS[1]!;
  return [
    {
      sessionId: "ses-guild-warrior", parentId: null, roomId: SYNTHETIC_PROJECT_DIRS.pixelGuild,
      projectName: "opencode-pixel-guild", title: "Refactor Floorplan Pathing", agentClass: "build",
      roleArchetype: "WARRIOR", primaryHex: "#34673d", trimHex: "#7ce04b",
      x: options.wildsCombat ? 800 + lair0.x - 52 : 600, y: options.wildsCombat ? lair0.y + 8 : 158,
      station: options.wildsCombat ? "Combat" : "Forge", overheadLabel: options.wildsCombat ? "Fighting Bug" : "Running Tests",
      facingDirection: options.wildsCombat ? "east" : "north", lifecycleState: "WorkingAtStation",
      skills: ["tdd", "codebase-design"], bugError: options.wildsCombat ? "AssertionError: expected lantern radius 140" : undefined,
    },
    {
      sessionId: "ses-guild-mage", parentId: null, roomId: SYNTHETIC_PROJECT_DIRS.pixelGuild,
      projectName: "opencode-pixel-guild", title: "Render Mermaid Dispatch SVGs", agentClass: "document",
      roleArchetype: "MAGE", primaryHex: "#2b547e", trimHex: "#62b6ea",
      x: options.includeQuestGate ? 206 : 122, y: options.includeQuestGate ? 575 : 268,
      station: options.includeQuestGate ? "Enchanter" : "Tinker", overheadLabel: options.includeQuestGate ? "Awaiting Answer" : "Result Ready",
      facingDirection: options.includeQuestGate ? "south" : "west",
      lifecycleState: options.includeQuestGate ? "BlockedAtQuestGate" : "RestingInLounge",
      skills: ["domain-modeling", "wayfinder"], hasUnviewedResult: !options.includeQuestGate, hasQuestGate: Boolean(options.includeQuestGate),
    },
    {
      sessionId: "ses-guild-sub-scout", parentId: "ses-guild-warrior", roomId: SYNTHETIC_PROJECT_DIRS.pixelGuild,
      projectName: "opencode-pixel-guild", title: "Verify SVG ViewBox Bounds", agentClass: "explore",
      roleArchetype: "SCOUT", primaryHex: "#34673d", trimHex: "#7ce04b",
      x: 195, y: 142, station: "Library", overheadLabel: "Reading File",
      facingDirection: "north", lifecycleState: "WorkingAtStation", skills: ["code-review"],
    },
    {
      sessionId: "ses-arcane-alchemist", parentId: null, roomId: SYNTHETIC_PROJECT_DIRS.arcaneEngine,
      projectName: "arcane-engine", title: "Balance Mana Shader Conduit", agentClass: "build",
      roleArchetype: "ALCHEMIST", primaryHex: "#d97706", trimHex: "#fde68a",
      x: 652, y: 468, station: "Alchemy", overheadLabel: "Hauling Crystal",
      facingDirection: "east", lifecycleState: "WorkingAtStation", skills: ["codebase-design"], cargo: "arcane-crystal",
    },
    {
      sessionId: "ses-chronicle-sapper", parentId: null, roomId: SYNTHETIC_PROJECT_DIRS.chronicleCore,
      projectName: "chronicle-core", title: "Fix WAL Checkpoint Timeout", agentClass: "build",
      roleArchetype: "SAPPER", primaryHex: "#be123c", trimHex: "#fda4af",
      x: options.wildsCombat ? 800 + lair1.x - 52 : 342, y: options.wildsCombat ? lair1.y + 8 : 122,
      station: options.wildsCombat ? "Combat" : "Spyglass", overheadLabel: options.wildsCombat ? "Fighting Bug" : "Searching Web",
      facingDirection: options.wildsCombat ? "east" : "north", lifecycleState: "WorkingAtStation",
      skills: ["diagnosing-bugs"], bugError: options.wildsCombat ? "TypeError: undefined sprite frame" : undefined,
    },
    {
      sessionId: "ses-starlight-cleric", parentId: null, roomId: SYNTHETIC_PROJECT_DIRS.starlightCli,
      projectName: "starlight-cli", title: "Review Release Checklist", agentClass: "plan",
      roleArchetype: "CLERIC", primaryHex: "#0d9488", trimHex: "#5eead4",
      x: 472, y: 520, station: "Lounge", overheadLabel: "Result Ready",
      facingDirection: "south", lifecycleState: "RestingInLounge", skills: ["code-review"], hasUnviewedResult: true,
    },
  ];
}

export function buildSyntheticOperatorProfile(
  mode: "standard" | "overflow" | "unauthenticated",
): ClientOperatorProfile {
  if (mode === "unauthenticated") {
    return { authenticated: false, operatorId: null, username: null, label: "Unauthenticated", paired: false, daemonUrl: null, reachable: false, pairedMachines: [] };
  }
  const baseMachines = [
    { machineId: "mach-local", label: "Local Guild Hall", daemonUrl: "http://127.0.0.1:4096", isActive: true, reachable: true, lastSyncedAtMs: DOCS_SHOWCASE_EPOCH_MS - 4_000 },
    { machineId: "mach-east", label: "Forge-Node-East", daemonUrl: "https://forge-east.synthetictunnel.example", isActive: false, reachable: true, lastSyncedAtMs: DOCS_SHOWCASE_EPOCH_MS - 12_000 },
    { machineId: "mach-relay", label: "Build-Relay-02", daemonUrl: "https://relay-02.synthetictunnel.example", isActive: false, reachable: false, lastSyncedAtMs: DOCS_SHOWCASE_EPOCH_MS - 300_000, errorMessage: "Daemon unreachable" },
  ];
  const overflowExtras = mode === "overflow"
    ? [
        { machineId: "mach-citadel", label: "Citadel-GPU-01", daemonUrl: "https://citadel-01.synthetictunnel.example", isActive: false, reachable: true, lastSyncedAtMs: DOCS_SHOWCASE_EPOCH_MS - 18_000 },
        { machineId: "mach-archive", label: "Archive-Runner-West", daemonUrl: "https://archive-west.synthetictunnel.example", isActive: false, reachable: true, lastSyncedAtMs: DOCS_SHOWCASE_EPOCH_MS - 25_000 },
        { machineId: "mach-sanctum", label: "Sanctum-CI-04", daemonUrl: "https://sanctum-ci.synthetictunnel.example", isActive: false, reachable: false, lastSyncedAtMs: DOCS_SHOWCASE_EPOCH_MS - 420_000, errorMessage: "Offline" },
        { machineId: "mach-beacon", label: "Beacon-Edge-03", daemonUrl: "https://beacon-03.synthetictunnel.example", isActive: false, reachable: true, lastSyncedAtMs: DOCS_SHOWCASE_EPOCH_MS - 32_000 },
        { machineId: "mach-sentinel", label: "Sentinel-Dev-05", daemonUrl: "https://sentinel-05.synthetictunnel.example", isActive: false, reachable: true, lastSyncedAtMs: DOCS_SHOWCASE_EPOCH_MS - 45_000 },
      ]
    : [];
  return {
    authenticated: true, operatorId: "op-guild-master", username: "guild-master", label: "Archmage Aldric",
    paired: true, daemonUrl: "http://127.0.0.1:4096", reachable: true, pairedMachines: [...baseMachines, ...overflowExtras],
  };
}

export function buildSyntheticRoomGitState(bulk = false): RoomGitWorkingTreeState {
  const files = bulk
    ? Array.from({ length: 48 }, (_, idx) => ({
        path: `src/modules/assembly-part-${String(idx + 1).padStart(2, "0")}.ts`,
        indexStatus: idx < 18 ? "M" : " ", worktreeStatus: idx < 18 ? " " : "M",
        staged: idx < 18, additions: 14 + (idx % 9), deletions: idx % 5,
      }))
    : [
        { path: "src/scene/floorplan.ts", indexStatus: "M", worktreeStatus: " ", staged: true, additions: 42, deletions: 11 },
        { path: "src/hud/mermaid-renderer.ts", indexStatus: "M", worktreeStatus: " ", staged: true, additions: 68, deletions: 9 },
        { path: "src/web/docs-showcase-director.ts", indexStatus: "A", worktreeStatus: " ", staged: true, additions: 184, deletions: 0 },
        { path: "tests/12-guild-combat.test.ts", indexStatus: " ", worktreeStatus: "M", staged: false, additions: 27, deletions: 4 },
        { path: "README.md", indexStatus: " ", worktreeStatus: "M", staged: false, additions: 19, deletions: 6 },
      ];
  return {
    isGitRepo: true, branch: "main", upstream: "origin/main", ahead: 2, behind: 0,
    headCommit: { hash: "a4f9c21", subject: "feat(showcase): wire deterministic guild scenes" },
    isClean: false, files,
    draftCommitTitle: bulk
      ? "feat(assembly): scale Goal Assembly Site to LVL 4 BULK vault stacks"
      : "feat(showcase): finalize synthetic documentation scenes & manifest gate",
    draftCommitBody: "Verified offline fixtures, PNG metadata stripping, and OCR hygiene checks.",
    lastCommittedAtMs: DOCS_SHOWCASE_EPOCH_MS - 900_000, lastError: null,
  };
}
