import type { ChamberFocusMode } from "../scene/index.ts";
import type { DirectionalTurnaround } from "../sprites/index.ts";
import type {
  CharacterLifecycleState,
  CharacterState,
  GuildRoleArchetype,
  GuildSnapshot,
  ResourceCargoKind,
  WorkshopRoomState,
} from "../types/domain.ts";
import type { DynamicLanternFlare, SnapParticleFx, SummoningRitualFx, WalkerState } from "./client-state.ts";
import type { ResolvedCharacterSlot } from "./station-and-workflow-routing.ts";
import { LAIR_POSITIONS } from "./station-geometry-catalog.ts";

export const INTRO_DEMO_DURATION_MS = 35_000;
export const INTRO_DEMO_FPS = 30;
export const INTRO_DEMO_TOTAL_FRAMES = Math.round((INTRO_DEMO_DURATION_MS / 1000) * INTRO_DEMO_FPS);

export interface IntroDemoSceneSpec {
  readonly sceneIndex: 1 | 2 | 3 | 4;
  readonly id: string;
  readonly startMs: number;
  readonly endMs: number;
  readonly chapterTag: string;
  readonly title: string;
  readonly mappingSubtitle: string;
  readonly accentHex: string;
}

export const INTRO_DEMO_SCENES: readonly IntroDemoSceneSpec[] = Object.freeze([
  {
    sceneIndex: 1, id: "guild-arrival-and-heraldry", startMs: 0, endMs: 8_000,
    chapterTag: "ACT I · UNIFIED WORKSHOP ROOM & PROJECT HERALDRY",
    title: "Live OpenCode V2 Sessions Enter the Shared Guild Floorplan",
    mappingSubtitle: "Root Sessions → Guild Adventurers · Projects & Worktrees → Project Heraldry & World Focus Aura",
    accentHex: "#f59e0b",
  },
  {
    sceneIndex: 2, id: "preparation-stations-and-cargo", startMs: 8_000, endMs: 18_000,
    chapterTag: "ACT II · AUTONOMOUS PREPARATION STATIONS & RESOURCE CARGO",
    title: "Every OpenCode Tool Execution Routes to a Specialized Guild Station",
    mappingSubtitle: "read/grep → Bookshelf · websearch → Spyglass · MCP/Plugin → Stockpile Cargo · edit → Workbench · bash → Anvil Forge",
    accentHex: "#38bdf8",
  },
  {
    sceneIndex: 3, id: "grimoires-summoning-and-assembly", startMs: 18_000, endMs: 26_000,
    chapterTag: "ACT III · SKILL GRIMOIRES, SUBAGENT SUMMONING & GOAL ASSEMBLY",
    title: "Equip @skill Grimoires & Summon Squad Subagents at the Arcane Lectern",
    mappingSubtitle: "@skill → Off-Hand Grimoire · subagent → Pentagram Ritual & Report Scroll · Deliverables → Goal Assembly Site",
    accentHex: "#a855f7",
  },
  {
    sceneIndex: 4, id: "dungeon-wilds-bug-hunt", startMs: 26_000, endMs: 35_000,
    chapterTag: "ACT IV · DUNGEON WILDS DEBUGGING HUNT & BUG MONSTER COMBAT",
    title: "Part Fog of War with Lantern Flares & Vanquish Failing Tests in Combat",
    mappingSubtitle: "Search/Grep → Lantern Flares · Test/Tool Errors → Named Bug Monsters · Fix & Green Suite → Martial Victory",
    accentHex: "#10b981",
  },
]);

export function resolveIntroDemoSceneAtMs(elapsedMs: number): IntroDemoSceneSpec {
  const clamped = Math.max(0, Math.min(INTRO_DEMO_DURATION_MS - 1, elapsedMs));
  return INTRO_DEMO_SCENES.find((s) => clamped >= s.startMs && clamped < s.endMs) ?? INTRO_DEMO_SCENES[0]!;
}

interface KeyframePose {
  x: number; y: number; station: string; isActing: boolean; overheadLabel: string;
  facingDirection: DirectionalTurnaround; cargo?: ResourceCargoKind; lifecycleState?: CharacterLifecycleState;
}

function lerpWaypoints(
  pts: ReadonlyArray<{ x: number; y: number }>,
  u: number,
): { x: number; y: number; dx: number; dy: number; isMoving: boolean } {
  if (pts.length === 0) return { x: 400, y: 560, dx: 0, dy: -1, isMoving: false };
  if (pts.length === 1 || u <= 0) {
    const dx = (pts[1]?.x ?? pts[0]!.x) - pts[0]!.x, dy = (pts[1]?.y ?? pts[0]!.y) - pts[0]!.y;
    return { x: pts[0]!.x, y: pts[0]!.y, dx, dy, isMoving: u > 0 && u < 1 && Math.hypot(dx, dy) > 1 };
  }
  if (u >= 1) {
    const last = pts[pts.length - 1]!, prev = pts[pts.length - 2] ?? last;
    return { x: last.x, y: last.y, dx: last.x - prev.x, dy: last.y - prev.y, isMoving: false };
  }
  const segLengths = pts.slice(0, -1).map((p, i) => Math.hypot(pts[i + 1]!.x - p.x, pts[i + 1]!.y - p.y));
  const totalLen = segLengths.reduce((acc, d) => acc + d, 0);
  if (totalLen <= 0.5) return { x: pts[0]!.x, y: pts[0]!.y, dx: 0, dy: 1, isMoving: false };
  let targetDist = u * totalLen;
  for (let i = 0; i < segLengths.length; i++) {
    const seg = segLengths[i]!;
    if (targetDist <= seg || i === segLengths.length - 1) {
      const t = seg > 0.01 ? Math.max(0, Math.min(1, targetDist / seg)) : 0;
      const a = pts[i]!, b = pts[i + 1]!;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, dx: b.x - a.x, dy: b.y - a.y, isMoving: true };
    }
    targetDist -= seg;
  }
  return { x: pts[pts.length - 1]!.x, y: pts[pts.length - 1]!.y, dx: 0, dy: 1, isMoving: false };
}

function facingFromDelta(dx: number, dy: number, fallback: DirectionalTurnaround): DirectionalTurnaround {
  if (Math.hypot(dx, dy) < 0.5) return fallback;
  return Math.abs(dx) > Math.abs(dy) * 1.1 ? (dx < 0 ? "west" : "east") : dy < 0 ? "north" : "south";
}

interface HeroSpec {
  sessionId: string; parentId: string | null; roomId: string; projectName: string;
  title: string; agentClass: string; roleArchetype: GuildRoleArchetype; primaryHex: string; trimHex: string; skills: string[];
}

const DEMO_HEROES: readonly HeroSpec[] = [
  { sessionId: "ses-demo-warrior", parentId: null, roomId: "/repo/pixel-guild", projectName: "opencode-pixel-guild", title: "Fix TypeError in Walk Stepper", agentClass: "build", roleArchetype: "WARRIOR", primaryHex: "#34673d", trimHex: "#7ce04b", skills: ["tdd", "diagnosing-bugs"] },
  { sessionId: "ses-demo-mage", parentId: null, roomId: "/repo/pixel-guild", projectName: "opencode-pixel-guild", title: "Fix RaceCondition in SSE Stream", agentClass: "document", roleArchetype: "MAGE", primaryHex: "#2b547e", trimHex: "#62b6ea", skills: ["wayfinder", "domain-modeling"] },
  { sessionId: "ses-demo-scout", parentId: null, roomId: "/repo/arcane-engine", projectName: "arcane-engine", title: "Audit Spatial Pathfinding Seams", agentClass: "plan", roleArchetype: "SCOUT", primaryHex: "#8b5cf6", trimHex: "#c4b5fd", skills: ["research"] },
  { sessionId: "ses-demo-alchemist", parentId: null, roomId: "/repo/pixel-guild", projectName: "opencode-pixel-guild", title: "Synthesize MCP Resource Conduit", agentClass: "build", roleArchetype: "ALCHEMIST", primaryHex: "#d97706", trimHex: "#fde68a", skills: ["codebase-design", "prototype"] },
  { sessionId: "ses-demo-cleric", parentId: null, roomId: "/repo/arcane-engine", projectName: "arcane-engine", title: "Review Scene Boundary Invariants", agentClass: "build", roleArchetype: "CLERIC", primaryHex: "#0d9488", trimHex: "#5eead4", skills: ["code-review"] },
  { sessionId: "ses-demo-sapper", parentId: null, roomId: "/repo/chronicle-core", projectName: "chronicle-core", title: "Fix SQLite WAL Lock Timeout", agentClass: "build", roleArchetype: "SAPPER", primaryHex: "#be123c", trimHex: "#fda4af", skills: ["diagnosing-bugs"] },
  { sessionId: "ses-demo-sub-alpha", parentId: "ses-demo-mage", roomId: "/repo/pixel-guild", projectName: "opencode-pixel-guild", title: "Verify Standards Compliance", agentClass: "explore", roleArchetype: "SCOUT", primaryHex: "#2b547e", trimHex: "#62b6ea", skills: ["code-review"] },
  { sessionId: "ses-demo-sub-beta", parentId: "ses-demo-mage", roomId: "/repo/pixel-guild", projectName: "opencode-pixel-guild", title: "Assemble Deliverable Sockets", agentClass: "general", roleArchetype: "ALCHEMIST", primaryHex: "#2b547e", trimHex: "#62b6ea", skills: ["codebase-design"] },
];

function resolveHeroPoseAtMs(
  hero: HeroSpec,
  ms: number,
): (KeyframePose & { visible: boolean; isWalking: boolean; walkCycle: number; inCombatBugErr?: string }) {
  const id = hero.sessionId;
  const isSub = hero.parentId !== null;
  if (isSub && (ms < 20_200 || ms >= 26_000)) {
    return { x: 206, y: 624, station: "Enchanter", isActing: false, overheadLabel: "", facingDirection: "south", visible: false, isWalking: false, walkCycle: 0 };
  }
  if (isSub) {
    const isAlpha = id === "ses-demo-sub-alpha";
    const targetPt = isAlpha ? { x: 318, y: 348 } : { x: 462, y: 348 };
    if (ms < 21_200) return { x: 206, y: 624, station: "Enchanter", isActing: true, overheadLabel: "Summoned", facingDirection: "south", visible: true, isWalking: false, walkCycle: 0 };
    if (ms < 22_600) {
      const w = lerpWaypoints([{ x: 206, y: 624 }, { x: 245, y: 485 }, targetPt], (ms - 21_200) / 1400);
      return { x: w.x, y: w.y, station: "Assembly", isActing: false, overheadLabel: "Walking to Assembly", facingDirection: facingFromDelta(w.dx, w.dy, "east"), visible: true, isWalking: true, walkCycle: (ms * 0.014) % (Math.PI * 2) };
    }
    if (ms < 24_500) return { x: targetPt.x, y: targetPt.y, station: "Assembly", isActing: true, overheadLabel: "Fitting Part", facingDirection: isAlpha ? "east" : "west", visible: true, isWalking: false, walkCycle: 0 };
    const wBack = lerpWaypoints([targetPt, { x: 224, y: 572 }], (ms - 24_500) / 1300);
    return {
      x: wBack.x, y: wBack.y, station: "Enchanter", isActing: !wBack.isMoving, overheadLabel: "Reporting Scroll",
      facingDirection: facingFromDelta(wBack.dx, wBack.dy, "south"), visible: true, isWalking: wBack.isMoving,
      walkCycle: wBack.isMoving ? (ms * 0.014) % (Math.PI * 2) : 0, lifecycleState: "ReportingScroll",
    };
  }

  const plazaSlots: Record<string, { x: number; y: number; face: DirectionalTurnaround; delay: number }> = {
    "ses-demo-warrior": { x: 300, y: 455, face: "north", delay: 0 },
    "ses-demo-mage": { x: 480, y: 455, face: "north", delay: 350 },
    "ses-demo-scout": { x: 255, y: 345, face: "east", delay: 700 },
    "ses-demo-alchemist": { x: 525, y: 345, face: "west", delay: 1050 },
    "ses-demo-cleric": { x: 315, y: 235, face: "south", delay: 1400 },
    "ses-demo-sapper": { x: 465, y: 235, face: "south", delay: 1750 },
  };
  const pSlot = plazaSlots[id] ?? { x: 400, y: 460, face: "north" as const, delay: 0 };

  if (ms < 8_000) {
    const wp = lerpWaypoints([{ x: 400, y: 612 }, { x: 400, y: 525 }, { x: pSlot.x, y: pSlot.y }], Math.max(0, Math.min(1, (ms - pSlot.delay) / 3400)));
    return {
      x: wp.x, y: wp.y, station: "Assembly", isActing: false, overheadLabel: wp.isMoving ? "Entering Hall" : "Thinking...",
      facingDirection: wp.isMoving ? facingFromDelta(wp.dx, wp.dy, "north") : pSlot.face,
      visible: true, isWalking: wp.isMoving, walkCycle: wp.isMoving ? (ms * 0.011) % (Math.PI * 2) : 0,
      lifecycleState: wp.isMoving ? "Entering" : "Thinking",
    };
  }

  const stationTargets: Record<string, { pts: Array<{ x: number; y: number }>; station: string; label: string; face: DirectionalTurnaround }> = {
    "ses-demo-scout": { pts: [{ x: pSlot.x, y: pSlot.y }, { x: 195, y: 142 }], station: "Library", label: "Reading File", face: "north" },
    "ses-demo-sapper": { pts: [{ x: pSlot.x, y: pSlot.y }, { x: 342, y: 122 }], station: "Spyglass", label: "Searching Web", face: "north" },
    "ses-demo-warrior": { pts: [{ x: pSlot.x, y: pSlot.y }, { x: 560, y: 420 }, { x: 600, y: 158 }], station: "Forge", label: "Running Shell", face: "north" },
    "ses-demo-cleric": { pts: [{ x: pSlot.x, y: pSlot.y }, { x: 122, y: 268 }], station: "Tinker", label: "Editing Code", face: "west" },
    "ses-demo-mage": { pts: [{ x: pSlot.x, y: pSlot.y }, { x: 220, y: 450 }, { x: 122, y: 445 }], station: "Armory", label: "Equipping Skill", face: "west" },
    "ses-demo-alchemist": { pts: [{ x: pSlot.x, y: pSlot.y }, { x: 468, y: 128 }], station: "Stockpile", label: "Loading Cargo", face: "north" },
  };

  if (ms < 18_000) {
    if (id === "ses-demo-alchemist") {
      if (ms < 10_600) {
        const w1 = lerpWaypoints([{ x: pSlot.x, y: pSlot.y }, { x: 525, y: 210 }, { x: 468, y: 128 }], (ms - 8_000) / 2200);
        return {
          x: w1.x, y: w1.y, station: "Stockpile", isActing: !w1.isMoving, overheadLabel: w1.isMoving ? "Walking to Stockpile" : "Loading Cargo",
          facingDirection: w1.isMoving ? facingFromDelta(w1.dx, w1.dy, "north") : "north",
          cargo: w1.isMoving ? undefined : "arcane-crystal", visible: true, isWalking: w1.isMoving, walkCycle: w1.isMoving ? (ms * 0.011) % (Math.PI * 2) : 0,
        };
      }
      const w2 = lerpWaypoints([{ x: 468, y: 128 }, { x: 585, y: 250 }, { x: 652, y: 468 }], Math.min(1, (ms - 10_600) / 3000));
      return {
        x: w2.x, y: w2.y, station: "Alchemy", isActing: !w2.isMoving, overheadLabel: w2.isMoving ? "Hauling Crystal" : "Running CodeMode",
        facingDirection: w2.isMoving ? facingFromDelta(w2.dx, w2.dy, "south") : "east",
        cargo: w2.isMoving ? "arcane-crystal" : undefined, visible: true, isWalking: w2.isMoving, walkCycle: w2.isMoving ? (ms * 0.011) % (Math.PI * 2) : 0,
      };
    }
    const st = stationTargets[id]!;
    const w = lerpWaypoints(st.pts, Math.min(1, (ms - 8_000) / 2800));
    return {
      x: w.x, y: w.y, station: st.station, isActing: !w.isMoving, overheadLabel: w.isMoving ? `Walking to ${st.station}` : st.label,
      facingDirection: w.isMoving ? facingFromDelta(w.dx, w.dy, st.face) : st.face, visible: true, isWalking: w.isMoving, walkCycle: w.isMoving ? (ms * 0.011) % (Math.PI * 2) : 0,
    };
  }

  if (ms < 26_000) {
    if (id === "ses-demo-mage") {
      const w = lerpWaypoints([{ x: 122, y: 445 }, { x: 195, y: 585 }], Math.min(1, (ms - 18_000) / 1800));
      return {
        x: w.x, y: w.y, station: "Enchanter", isActing: !w.isMoving,
        overheadLabel: w.isMoving ? "Walking to Lectern" : ms < 24_500 ? "Summoning Squad" : "Receiving Scroll",
        facingDirection: w.isMoving ? facingFromDelta(w.dx, w.dy, "south") : "south", visible: true, isWalking: w.isMoving, walkCycle: w.isMoving ? (ms * 0.011) % (Math.PI * 2) : 0,
      };
    }
    if (id === "ses-demo-warrior" && ms >= 19_500 && ms < 23_500) {
      return { x: 600, y: 158, station: "Forge", isActing: true, overheadLabel: "Compacting...", facingDirection: "north", visible: true, isWalking: false, walkCycle: 0, lifecycleState: "DistillingContextMana" };
    }
    const st = stationTargets[id]!;
    const endPt = id === "ses-demo-alchemist" ? { x: 652, y: 468 } : st.pts[st.pts.length - 1]!;
    return {
      x: endPt.x, y: endPt.y, station: id === "ses-demo-alchemist" ? "Alchemy" : st.station,
      isActing: true, overheadLabel: id === "ses-demo-alchemist" ? "Distilling Spec" : st.label,
      facingDirection: id === "ses-demo-alchemist" ? "east" : st.face, visible: true, isWalking: false, walkCycle: 0,
    };
  }

  const lair0 = LAIR_POSITIONS[0]!, lair1 = LAIR_POSITIONS[1]!, lair2 = LAIR_POSITIONS[2]!;
  const combatAssign: Record<string, { start: { x: number; y: number }; dest: { x: number; y: number }; face: DirectionalTurnaround; errMsg: string }> = {
    "ses-demo-warrior": { start: { x: 600, y: 158 }, dest: { x: 800 + lair0.x - 52, y: lair0.y + 8 }, face: "east", errMsg: "TypeError: null walk" },
    "ses-demo-scout": { start: { x: 195, y: 142 }, dest: { x: 800 + lair0.x + 52, y: lair0.y + 8 }, face: "west", errMsg: "TypeError: null walk" },
    "ses-demo-mage": { start: { x: 195, y: 585 }, dest: { x: 800 + lair1.x - 54, y: lair1.y + 10 }, face: "east", errMsg: "RaceCondition: SSE frame" },
    "ses-demo-sapper": { start: { x: 342, y: 122 }, dest: { x: 800 + lair2.x - 52, y: lair2.y + 8 }, face: "east", errMsg: "SQLiteBusy: WAL lock" },
  };
  const ca = combatAssign[id];
  if (!ca) {
    const restPt = id === "ses-demo-alchemist" ? { x: 652, y: 468 } : { x: 122, y: 268 };
    return { x: restPt.x, y: restPt.y, station: id === "ses-demo-alchemist" ? "Alchemy" : "Tinker", isActing: true, overheadLabel: "Crafting Fix", facingDirection: "east", visible: true, isWalking: false, walkCycle: 0 };
  }
  const march = lerpWaypoints([ca.start, { x: 774, y: 352 }, { x: 935, y: 352 }, ca.dest], Math.min(1, (ms - 26_000) / 2800));
  const victory = ms >= 33_200;
  return {
    x: march.x, y: march.y, station: "Combat", isActing: !march.isMoving,
    overheadLabel: victory ? "Tests Passing ✓" : march.isMoving ? "Hunting Bug" : "Fighting Bug",
    facingDirection: march.isMoving ? facingFromDelta(march.dx, march.dy, ca.face) : ca.face,
    visible: true, isWalking: march.isMoving, walkCycle: march.isMoving ? (ms * 0.013) % (Math.PI * 2) : 0,
    inCombatBugErr: victory ? undefined : ca.errMsg,
  };
}

export interface IntroDemoFrameState {
  readonly scene: IntroDemoSceneSpec; readonly elapsedMs: number; readonly cameraFocusMode: ChamberFocusMode;
  readonly isAllWorldsFocused: boolean; readonly selectedProjectId: string | null; readonly selectedRoomId: string | null;
  readonly snapshot: GuildSnapshot; readonly walkers: Map<string, WalkerState>;
  readonly rituals: Map<string, SummoningRitualFx>; readonly flares: DynamicLanternFlare[]; readonly particles: SnapParticleFx[];
}

export function buildIntroDemoFrameState(rawElapsedMs: number, nowEpochMs: number): IntroDemoFrameState {
  const elapsedMs = ((rawElapsedMs % INTRO_DEMO_DURATION_MS) + INTRO_DEMO_DURATION_MS) % INTRO_DEMO_DURATION_MS;
  const scene = resolveIntroDemoSceneAtMs(elapsedMs);
  const cameraFocusMode: ChamberFocusMode = elapsedMs < 26_000 ? "workshop" : elapsedMs < 29_200 ? "split" : "wilds";
  const isAllWorldsFocused = elapsedMs < 4_500 || (elapsedMs >= 8_000 && elapsedMs < 18_000);
  const selectedProjectId = isAllWorldsFocused ? null : "/repo/pixel-guild";
  const resolvedTasks = elapsedMs < 18_000 ? 3 : elapsedMs < 22_800 ? 4 : elapsedMs < 24_200 ? 5 : 6;

  const makeRoom = (roomId: string, projectName: string, total: number, resolved: number): WorkshopRoomState => ({
    roomId, locationDirectory: roomId, projectId: roomId, projectName,
    isWorktree: false, parentProjectDirectory: null, workstations: [],
    pluginAlcoves: [], overflowPluginNamespaces: [],
    activeSessionIds: DEMO_HEROES.filter((h) => h.roomId === roomId).map((h) => h.sessionId),
    characterIds: DEMO_HEROES.filter((h) => h.roomId === roomId).map((h) => h.sessionId),
    activeAdventurerCount: DEMO_HEROES.filter((h) => h.roomId === roomId && !h.parentId).length,
    activeSubagentCount: DEMO_HEROES.filter((h) => h.roomId === roomId && h.parentId).length,
    questGateCount: 0, createdAtMs: nowEpochMs - 60_000, lastActivityAtMs: nowEpochMs,
    availableAgents: [
      { id: "build", name: "build", kind: "agent", mode: "primary" },
      { id: "plan", name: "plan", kind: "agent", mode: "primary" },
      { id: "document", name: "document", kind: "agent", mode: "primary" },
    ],
    taskProgress: {
      source: "docs/features", featureSlug: "intro-demo-video", totalTasks: total, resolvedTasks: resolved,
      tasks: Array.from({ length: total }, (_, idx) => ({
        id: String(idx + 1).padStart(2, "0"), slug: `part-${idx + 1}`, title: `Assembly Deliverable #${idx + 1}`,
        status: idx < resolved ? ("resolved" as const) : ("claimed" as const),
      })),
    },
  });

  const rooms: Record<string, WorkshopRoomState> = {
    "/repo/pixel-guild": makeRoom("/repo/pixel-guild", "opencode-pixel-guild", 6, resolvedTasks),
    "/repo/arcane-engine": makeRoom("/repo/arcane-engine", "arcane-engine", 4, 4),
    "/repo/chronicle-core": makeRoom("/repo/chronicle-core", "chronicle-core", 5, 1),
  };

  const characters: Record<string, CharacterState> = {};
  const walkers = new Map<string, WalkerState>();

  for (const hero of DEMO_HEROES) {
    const pose = resolveHeroPoseAtMs(hero, elapsedMs);
    if (!pose.visible) continue;
    const isSub = hero.parentId !== null;
    const hasBugErr = Boolean(pose.inCombatBugErr);
    const safeLifecycle: CharacterLifecycleState = pose.lifecycleState ?? "WorkingAtStation";

    const slot: ResolvedCharacterSlot = {
      x: pose.x, y: pose.y, station: pose.station, role: hero.roleArchetype,
      workflowIntent: hasBugErr || pose.station === "Combat" ? "debugging-hunt" : pose.station === "Library" || pose.station === "Spyglass" ? "information-gathering" : "feature-build",
      overheadLabel: pose.overheadLabel, isActing: pose.isActing, facingDirection: pose.facingDirection, cargo: pose.cargo,
    };

    characters[hero.sessionId] = {
      characterId: hero.sessionId, sessionId: hero.sessionId, parentId: hero.parentId, parentSessionId: hero.parentId,
      role: isSub ? "Squad Subagent" : "Guild Adventurer", roomId: hero.roomId, locationDirectory: hero.roomId,
      projectId: hero.roomId, projectName: hero.projectName, title: hero.title, agentClass: hero.agentClass,
      roleArchetype: hero.roleArchetype, lifecycleState: safeLifecycle, overheadLabel: pose.overheadLabel, isOpenInOpenCode: true,
      currentTile: { x: Math.round(pose.x), y: Math.round(pose.y) }, targetTile: { x: Math.round(pose.x), y: Math.round(pose.y) },
      activeWorkstation: pose.station === "Forge" ? "Anvil Forge" : pose.station === "Library" ? "Library Study Bookshelf" : "Crafting Workbench",
      activeCapability: {
        capabilityId: hasBugErr ? "tool:edit" : "tool:bash", displayName: hasBugErr ? "edit" : "bash", toolName: hasBugErr ? "edit" : "bash",
        kind: "builtin-tool", tier: 1, targetWorkstation: "Anvil Forge", pluginNamespace: null, secondaryAlcoveNamespaces: [],
        skillId: null, minimumDwellMs: 500, inputPreview: "src/web/app-main.ts",
        visualTraits: { primaryHex: hero.primaryHex, secondaryHex: hero.trimHex, trimHex: hero.trimHex, auraHex: hero.trimHex, monogram: "OP", headgear: "visored-helm", alcoveArchetype: "Arcane Conduit", hashSeed: 7 },
      },
      activeResourceCargo: null, equippingAtArmory: pose.station === "Armory",
      skillGrimoires: hero.skills.map((sk, idx) => ({
        skillId: sk, name: sk, activatedBy: "skill-tool", activatedAtMs: 1000 + idx * 100,
        inheritedFromSessionId: hero.parentId, emblemHex: hero.trimHex, monogram: sk.slice(0, 2).toUpperCase(),
      })),
      childSessionIds: hero.sessionId === "ses-demo-mage" && elapsedMs >= 20_200 && elapsedMs < 26_000 ? ["ses-demo-sub-alpha", "ses-demo-sub-beta"] : [],
      questGate: null,
      contextMana: { usedTokens: 64_000, limitTokens: 200_000, fillRatio: 0.32, inputTokens: 50_000, outputTokens: 14_000, cacheReadTokens: 0, cacheWriteTokens: 0, totalCostUsd: 0.42, compactionCount: 1, lastDistilledAtMs: null },
      reportScroll: pose.lifecycleState === "ReportingScroll" ? { fromSubagentSessionId: hero.sessionId, toParentSessionId: hero.parentId ?? "ses-demo-mage", summary: "All checks green", createdAtMs: nowEpochMs, deliveredAtMs: null } : null,
      errorState: hasBugErr ? { message: pose.inCombatBugErr!, retryCount: 1, occurredAtMs: nowEpochMs - 2000 } : null,
      recentTools: hasBugErr
        ? [
            { callId: `err-${hero.sessionId}`, toolName: "bash", workstation: "Anvil Forge", pluginNamespace: null, status: "error", inputPreview: "npm test", outputPreview: `FAIL ${pose.inCombatBugErr}`, timestampMs: nowEpochMs - 1500 },
            { callId: `fix-${hero.sessionId}`, toolName: "edit", workstation: "Crafting Workbench", pluginNamespace: null, status: "running", inputPreview: "src/web/walker.ts", timestampMs: nowEpochMs - 500 },
          ]
        : [],
      equipmentLoadout: {
        level: 4, readinessTier: 3, tierTitle: "Master Artificer",
        headgear: { slot: "headgear", rpgName: "Helm", opencodeBinding: hero.agentClass, tier: 2, iconKey: "helm", colorHex: hero.primaryHex },
        robes: { slot: "robes", rpgName: "Armor", opencodeBinding: "context", tier: 2, iconKey: "armor", colorHex: hero.primaryHex },
        mainHand: { slot: "mainHand", rpgName: "Blade", opencodeBinding: "bash", tier: 2, iconKey: "sword", colorHex: hero.trimHex },
        offHand: { slot: "offHand", rpgName: "Grimoire", opencodeBinding: hero.skills[0] ?? "tdd", tier: 2, iconKey: "tome", colorHex: hero.trimHex },
        toolBelt: [],
      },
      visualTraits: { primaryHex: hero.primaryHex, secondaryHex: hero.trimHex, trimHex: hero.trimHex, auraHex: hero.trimHex, monogram: "OP", headgear: "visored-helm", alcoveArchetype: "Arcane Conduit", hashSeed: 42 },
      stateEnteredAtMs: nowEpochMs - 5000, lastActivityAtMs: nowEpochMs,
    };

    walkers.set(hero.sessionId, {
      currentX: pose.x, currentY: pose.y, targetX: pose.x, targetY: pose.y, resolvedSlot: slot,
      isWalking: pose.isWalking, facingLeft: pose.facingDirection === "west", facingDirection: pose.facingDirection,
      walkCycle: pose.walkCycle, lastToolCategory: "bash", armoryUntilMs: 0, searchWaypointIdx: 0, initializedQueue: true,
    });
  }

  const rituals = new Map<string, SummoningRitualFx>();
  if (elapsedMs >= 19_800 && elapsedMs < 22_000) {
    rituals.set("ses-demo-sub-alpha", {
      ritualId: "ritual-demo-spawn", parentId: "ses-demo-mage", childId: "ses-demo-sub-alpha",
      x: 206, y: 624, startedAtMs: nowEpochMs - (elapsedMs - 19_800), durationMs: 2200, kind: "spawn",
    });
  }

  const flares: DynamicLanternFlare[] = [];
  if (elapsedMs >= 26_000) {
    for (const [idx, pt] of [[0, { x: 960, y: 340 }], [1, { x: 1180, y: 220 }], [2, { x: 1375, y: 290 }], [3, { x: 1230, y: 490 }]] as const) {
      flares.push({ id: `demo-flare-${idx}`, sessionId: "ses-demo-scout", x: pt.x, y: pt.y, r: 135, createdAtMs: nowEpochMs - 1000, expiresAtMs: nowEpochMs + 9000 });
    }
  }

  const particles: SnapParticleFx[] = [];
  if ((elapsedMs >= 22_600 && elapsedMs < 24_600) || elapsedMs >= 33_200) {
    const centers = elapsedMs >= 33_200
      ? [{ x: 800 + LAIR_POSITIONS[0]!.x, y: LAIR_POSITIONS[0]!.y }, { x: 800 + LAIR_POSITIONS[1]!.x, y: LAIR_POSITIONS[1]!.y }, { x: 800 + LAIR_POSITIONS[2]!.x, y: LAIR_POSITIONS[2]!.y }]
      : [{ x: 390, y: 345 }];
    const colors = ["#fbbf24", "#fef08a", "#38bdf8", "#10b981", "#f59e0b"];
    const phase = (elapsedMs % 1000) / 1000;
    for (const center of centers) {
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2 + phase * 1.5;
        particles.push({ x: center.x, y: center.y, vx: Math.cos(ang) * 1.3, vy: Math.sin(ang) * 1.3, size: 3.5, color: colors[i % colors.length]!, life: Math.max(0.2, 1 - phase * 0.7) });
      }
    }
  }

  const snapshot: GuildSnapshot = {
    version: Math.floor(elapsedMs / 33) + 1, timestampMs: nowEpochMs, activeAdapter: "opencode-client", daemonUrl: "http://127.0.0.1:4096",
    roomOrder: ["/repo/pixel-guild", "/repo/arcane-engine", "/repo/chronicle-core"], rooms, characters, questGates: {},
    summary: { totalRooms: 3, activeAdventurers: 6, activeSubagents: elapsedMs >= 20_200 && elapsedMs < 26_000 ? 2 : 0, openQuestGates: 0, equippedGrimoires: 8, connectedPlugins: 3 },
  };

  return { scene, elapsedMs, cameraFocusMode, isAllWorldsFocused, selectedProjectId, selectedRoomId: selectedProjectId, snapshot, walkers, rituals, flares, particles };
}
