import type { TileCoord } from "../spatial/tile-grid.ts";
import {
  BUG_MONSTER_SEVERITY_TIERS,
  MONSTER_LINEAGE_SETS,
  resolveGuildRoleArchetype,
  type MonsterProfile,
  type GuildSnapshot,
} from "../types/domain.ts";
import { isDiagnosticTool } from "./lantern-flares.ts";

export type BugMonsterStatus = "idle" | "combat" | "mutating" | "defeated";
export type BugMonsterPhase =
  | "hidden-in-fog"
  | "discovered"
  | "in-combat"
  | "vanquished";

export interface VictoryLootCrystal {
  x: number;
  y: number;
  vx: number;
  vy: number;
  colorHex: string;
  size: number;
  lifeMs: number;
}

export interface BugMonsterState {
  monsterId: string;
  name: string;
  bugTitle?: string;
  phase?: BugMonsterPhase;
  set: string;
  tier: 1 | 2 | 3 | 4;
  scale: number;
  role: string;
  auraHex: string;
  maxHp: number;
  currentHp: number;
  status: BugMonsterStatus;
  tile: TileCoord;
  mutationFlashMs: number;
  combatTargetSessionId: string | null;
  victoryLootCrystals: VictoryLootCrystal[];
}

const TIER_BASE_HP: Record<1 | 2 | 3 | 4, number> = {
  1: 100,
  2: 250,
  3: 600,
  4: 1500,
};

const TIER_SPECIES_LABEL: Record<1 | 2 | 3 | 4, string> = {
  1: "Slime",
  2: "Goblin",
  3: "Beast",
  4: "Troll Boss",
};

const DEFAULT_BUG_PREFIX: Record<1 | 2 | 3 | 4, string> = {
  1: "ClickDrop",
  2: "HoverFlicker",
  3: "TypeError",
  4: "CrashLoop",
};

export function deriveBugMonsterTitle(
  tier: 1 | 2 | 3 | 4,
  sourceText?: string | null,
): string {
  const species = TIER_SPECIES_LABEL[tier];
  const raw = (sourceText ?? "").trim();
  if (!raw) return `${DEFAULT_BUG_PREFIX[tier]} ${species}`;

  if (/hover.*flicker|flicker.*hover|tooltip.*flicker/i.test(raw)) {
    return `HoverFlicker ${species}`;
  }
  if (/click.*drop|dropped.*click|click.*miss/i.test(raw)) {
    return `ClickDrop ${species}`;
  }

  const jsErrMatch =
    /\b(TypeError|ReferenceError|SyntaxError|RangeError|AssertionError|URIError)\b/.exec(raw);
  if (jsErrMatch) return `${jsErrMatch[1]} ${species}`;
  if (/oldString not found/i.test(raw)) return `StalePatch ${species}`;
  if (/timeout|timed out/i.test(raw)) return `Timeout ${species}`;
  if (/permission|approval|quest gate/i.test(raw)) return `Gatekeeper ${species}`;
  if (/exit code [1-9]|not ok|ERR_TEST_FAILURE|test failed/i.test(raw)) {
    return `TestFail ${species}`;
  }

  const camelMatch = /\b([A-Z][a-z0-9]+[A-Z][A-Za-z0-9]+)\b/.exec(raw);
  if (camelMatch) return `${camelMatch[1].slice(0, 18)} ${species}`;

  const words = raw
    .replace(/[^A-Za-z0-9\s_-]/g, " ")
    .split(/[\s_-]+/)
    .filter(
      (w) =>
        w.length >= 3 &&
        !/^(the|and|for|with|from|into|fix|bug|diagnose|debug|warning|error|session|agent|warrior|test)$/i.test(w),
    )
    .slice(0, 2);

  if (words.length > 0) {
    const pascal = words
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join("")
      .slice(0, 18);
    if (pascal) return `${pascal} ${species}`;
  }

  return `${DEFAULT_BUG_PREFIX[tier]} ${species}`;
}

function getProfileForTier(setKey: string, tier: 1 | 2 | 3 | 4): MonsterProfile {
  const set = MONSTER_LINEAGE_SETS[setKey] ?? MONSTER_LINEAGE_SETS["01"];
  switch (tier) {
    case 1:
      return set.slime;
    case 2:
      return set.goblin;
    case 3:
      return set.cyclops;
    case 4:
      return set.troll;
  }
}

export function createBugMonster(
  setKey = "01",
  tier: 1 | 2 | 3 | 4 = 1,
  tile: TileCoord = { x: 18, y: 8 },
  id?: string,
  bugTitle?: string,
  phase: BugMonsterPhase = "discovered",
): BugMonsterState {
  const profile = getProfileForTier(setKey, tier);
  const tierMeta = BUG_MONSTER_SEVERITY_TIERS[tier - 1];

  return {
    monsterId: id ?? `monster:${Date.now()}:${Math.random().toString(36).slice(2, 6)}`,
    name: profile.name,
    bugTitle: bugTitle ?? deriveBugMonsterTitle(tier),
    phase,
    set: setKey,
    tier,
    scale: profile.scale,
    role: tierMeta.role,
    auraHex: profile.auraHex,
    maxHp: TIER_BASE_HP[tier],
    currentHp: TIER_BASE_HP[tier],
    status: "idle",
    tile: { ...tile },
    mutationFlashMs: 0,
    combatTargetSessionId: null,
    victoryLootCrystals: [],
  };
}

export function spawnVictoryLootCrystals(originTile: TileCoord): VictoryLootCrystal[] {
  const crystals: VictoryLootCrystal[] = [];
  const palette = ["#a855f7", "#c084fc", "#10b981", "#34d399", "#f59e0b", "#38bdf8"];
  const count = 10;

  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const speed = 1.2 + Math.random() * 2.0;
    crystals.push({
      x: originTile.x,
      y: originTile.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      colorHex: palette[i % palette.length],
      size: 3 + Math.floor(Math.random() * 3),
      lifeMs: 1000 + Math.random() * 500,
    });
  }

  return crystals;
}

const SHELL_FAILURE_OUTPUT_REGEX =
  /not ok\b|\bFAIL\b|ERR_TEST_FAILURE|ERR_ASSERTION|\berror:|AssertionError|TypeError|ReferenceError|SyntaxError|exit code [1-9]/i;

export function isShellFailureOutput(rawOutput?: string | null): boolean {
  if (!rawOutput) return false;
  const cleaned = rawOutput
    .replace(/#?\s*\bfail(?:ed|ures?)?:?\s*0\b|\b0\s+fail(?:ed|ures?)?\b|\b0\s+errors?\b|\berrors?:?\s*0\b/gi, "")
    .replace(/ERROR:services[\\/]device[\\/]usb|ERROR:components[\\/](?:device_event_log|headless)/gi, "");
  return SHELL_FAILURE_OUTPUT_REGEX.test(cleaned);
}

export function deriveBugMonsterEncounter(
  snapshot: GuildSnapshot,
  monsterSetKey = "01",
  previousMonsters: BugMonsterState[] = [],
): BugMonsterState[] {
  const characters = Object.values(snapshot.characters ?? {});
  const questGates = Object.values(snapshot.questGates ?? {}).filter(
    (g) => g.kind !== "question",
  );
  const openQuestCount = questGates.length;

  let toolErrors = 0;
  let testFailures = 0;
  let warriorSessionId: string | null = null;
  let hasDiagnosticReveal = false;
  let bugSourceHint = questGates[0]?.title ?? questGates[0]?.reason ?? "";
  let fallbackTitleHint = "";

  for (const char of characters) {
    const activeTool =
      (char.activeCapability as { toolName?: string } | null)?.toolName ??
      char.activeCapability?.displayName ??
      char.recentTools?.[0]?.toolName;
    const isWarrior =
      resolveGuildRoleArchetype(char.agentClass, activeTool) === "WARRIOR" ||
      char.agentClass === "build" ||
      activeTool === "bash";

    if (isWarrior && !warriorSessionId) warriorSessionId = char.sessionId;
    if (activeTool && isDiagnosticTool(activeTool)) hasDiagnosticReveal = true;

    let seenPassingShellRun = false;
    let seenPassingWriteOrEdit = false;
    for (const tool of char.recentTools ?? []) {
      if (isDiagnosticTool(tool.toolName)) hasDiagnosticReveal = true;
      const normTool = (tool.toolName || "").trim().replace(/^tool:/i, "").toLowerCase();
      if (/^(read|grep|glob|list|ls|lsp|codesearch|webfetch|websearch|fetch|todoread|list_mcp_resources|read_mcp_resource|question)$/.test(normTool)) {
        continue;
      }
      const isShell = /^(bash|shell|terminal|test)$/.test(normTool);
      const isWrite = /^(write|edit|multiedit|apply_patch|notebookedit)$/.test(normTool);
      const hasShellFailure = isShell && isShellFailureOutput(tool.outputPreview);
      const isResolved = isWrite ? seenPassingShellRun || seenPassingWriteOrEdit : seenPassingShellRun;
      if (tool.status === "error" && !isResolved) {
        toolErrors += 1;
        if (!bugSourceHint && (tool.outputPreview || tool.inputPreview)) {
          bugSourceHint = tool.outputPreview || tool.inputPreview;
        }
      }
      if (hasShellFailure && !seenPassingShellRun) {
        testFailures += 1;
        if (!bugSourceHint && tool.outputPreview) bugSourceHint = tool.outputPreview;
      } else if (isShell && tool.status === "completed" && !hasShellFailure) {
        seenPassingShellRun = true;
      } else if (isWrite && tool.status === "completed") {
        seenPassingWriteOrEdit = true;
      }
    }

    if (!bugSourceHint && char.errorState?.message) bugSourceHint = char.errorState.message;
    if (!fallbackTitleHint && char.title) fallbackTitleHint = char.title;
  }
  if (!bugSourceHint) bugSourceHint = fallbackTitleHint;

  const rooms = Object.values(snapshot.rooms ?? {});
  const allRoomsResolved =
    rooms.length > 0 &&
    rooms.some((r) => Boolean(r?.taskProgress && r.taskProgress.totalTasks > 0)) &&
    rooms.every(
      (r) =>
        !r?.taskProgress ||
        r.taskProgress.totalTasks === 0 ||
        r.taskProgress.resolvedTasks >= r.taskProgress.totalTasks,
    );
  const hasLatestActiveError = characters.some(
    (c) => c.recentTools?.[0]?.status === "error" || Boolean(c.errorState),
  );
  if (allRoomsResolved && !hasLatestActiveError && openQuestCount === 0) {
    testFailures = 0;
    toolErrors = 0;
  }

  const hasObstacle = openQuestCount > 0 || testFailures > 0 || toolErrors > 0;
  if (hasObstacle) {
    const tier: 1 | 2 | 3 | 4 =
      openQuestCount > 0 ? 4 : testFailures >= 2 ? 3 : testFailures === 1 ? 2 : 1;
    const phase: BugMonsterPhase = warriorSessionId
      ? "in-combat"
      : hasDiagnosticReveal
        ? "discovered"
        : "hidden-in-fog";
    const bugTitle = deriveBugMonsterTitle(tier, bugSourceHint);
    const monster = createBugMonster(monsterSetKey, tier, { x: 18, y: 8 }, undefined, bugTitle, phase);
    if (warriorSessionId) {
      monster.combatTargetSessionId = warriorSessionId;
      monster.status = "combat";
      monster.phase = "in-combat";
    }
    return [monster];
  }

  const prevActive = previousMonsters.find(
    (m) => m.status === "combat" || m.status === "mutating" || m.status === "idle",
  );
  if (prevActive) {
    return [
      {
        ...prevActive,
        status: "defeated",
        phase: "vanquished",
        currentHp: 0,
        victoryLootCrystals: spawnVictoryLootCrystals(prevActive.tile),
      },
    ];
  }

  return [];
}
