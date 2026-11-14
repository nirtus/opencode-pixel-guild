import { anchorWorldPoint } from "../scene/index.ts";
import { fillStroke, getImg, MONSTER_SETS, rrect, VEGETATION_BIOMES } from "./asset-manifests.ts";
import { drawCharacterHero } from "./canvas-hero-painter.ts";
import { clientState } from "./client-state.ts";
import {
  buildIntroDemoFrameState,
  INTRO_DEMO_DURATION_MS,
  INTRO_DEMO_FPS,
  INTRO_DEMO_SCENES,
  INTRO_DEMO_TOTAL_FRAMES,
  type IntroDemoFrameState,
  resolveIntroDemoSceneAtMs,
} from "./intro-demo-timeline.ts";
import type { ResolvedCharacterSlot } from "./station-and-workflow-routing.ts";
import { reconcileTopBar } from "./top-bar-reconciler.ts";

export {
  buildIntroDemoFrameState,
  INTRO_DEMO_DURATION_MS,
  INTRO_DEMO_FPS,
  INTRO_DEMO_SCENES,
  INTRO_DEMO_TOTAL_FRAMES,
  resolveIntroDemoSceneAtMs,
};

let cachedIsIntroDemo: boolean | null = null;
let demoStartPerfMs: number | null = null;
let pinnedDemoElapsedMs: number | null = null;
let lastAppliedFrameState: IntroDemoFrameState | null = null;
let lastTopBarKey = "";

export function isIntroDemoModeActive(searchStr?: string): boolean {
  if (typeof searchStr === "string") {
    const val = new URLSearchParams(searchStr).get("demo")?.trim().toLowerCase() ?? "";
    return val === "intro-tour" || val === "1" || val === "sizzle" || val === "true";
  }
  if (cachedIsIntroDemo !== null) return cachedIsIntroDemo;
  if (typeof window === "undefined") return false;
  const val = new URLSearchParams(window.location?.search || "").get("demo")?.trim().toLowerCase() ?? "";
  cachedIsIntroDemo = val === "intro-tour" || val === "1" || val === "sizzle" || val === "true";
  return cachedIsIntroDemo;
}

export function preloadIntroDemoAssets(): Promise<void[]> {
  const urls = new Set<string>();
  for (const biome of Object.values(VEGETATION_BIOMES)) {
    for (const asset of biome.assets) urls.add(asset.file);
  }
  for (const mSet of Object.values(MONSTER_SETS)) {
    for (const m of mSet) urls.add(m.file);
  }
  const promises: Array<Promise<void>> = [];
  for (const url of urls) {
    const img = getImg(url);
    if (!img.complete) {
      promises.push(
        new Promise<void>((resolve) => {
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
          setTimeout(resolve, 2500);
        }),
      );
    }
  }
  return Promise.all(promises);
}

export function applyIntroDemoStateAtMs(elapsedMs: number, nowEpochMs = 1_760_000_000_000 + Math.round(elapsedMs)): IntroDemoFrameState {
  const state = buildIntroDemoFrameState(elapsedMs, nowEpochMs);
  lastAppliedFrameState = state;
  clientState.isGamemasterCollapsed = true;
  clientState.isWorldCollapsed = false;
  clientState.cameraFocusMode = state.cameraFocusMode;
  clientState.isAllWorldsFocused = state.isAllWorldsFocused;
  clientState.selectedProjectId = state.selectedProjectId;
  clientState.selectedRoomId = state.selectedRoomId;
  clientState.currentSnapshot = state.snapshot;
  clientState.characterWalkers = state.walkers;
  clientState.activeSummoningRituals = state.rituals;
  clientState.lanternFlares = state.flares;
  clientState.snapParticles = state.particles;

  if (typeof document !== "undefined") {
    const topKey = `${state.scene.sceneIndex}:${state.isAllWorldsFocused ? "all" : state.selectedProjectId}:${state.cameraFocusMode}`;
    if (topKey !== lastTopBarKey) {
      lastTopBarKey = topKey;
      document.getElementById("operator-auth-gate-modal")?.remove();
      document.getElementById("main-stage")?.setAttribute("data-gamemaster-hidden", "true");
      try {
        reconcileTopBar(() => {});
      } catch {
        // ignore top-bar DOM sync errors in minimal test environments
      }
      const daemonEl = document.getElementById("daemon-indicator");
      if (daemonEl) {
        daemonEl.textContent = "⚡ OpenCode V2 Live Showcase";
        daemonEl.className = "badge-pill live";
      }
      const sumEl = document.getElementById("summary-indicator");
      if (sumEl) {
        sumEl.textContent = `3 worlds · 6 adventurers · ${state.snapshot.summary.activeSubagents} subagents`;
      }
    }
  }
  return state;
}

export function stepIntroDemoDirector(timestampMs: number): IntroDemoFrameState {
  if (pinnedDemoElapsedMs !== null) {
    return applyIntroDemoStateAtMs(pinnedDemoElapsedMs);
  }
  if (demoStartPerfMs === null) {
    demoStartPerfMs = timestampMs;
  }
  const elapsedMs = Math.max(0, timestampMs - demoStartPerfMs);
  return applyIntroDemoStateAtMs(elapsedMs);
}

export function initIntroDemoDirector(renderFrameAtTs: (ts: number) => void): boolean {
  if (!isIntroDemoModeActive()) return false;
  clientState.isAuthenticated = true;
  clientState.authBootCompleted = true;
  clientState.isGamemasterCollapsed = true;

  if (typeof window !== "undefined") {
    const win = window as unknown as Record<string, unknown>;
    win.__preloadIntroDemoAssets = preloadIntroDemoAssets;
    win.__stepIntroDemoFrame = (elapsedMs: number) => {
      pinnedDemoElapsedMs = elapsedMs;
      const simTs = 100_000 + elapsedMs;
      applyIntroDemoStateAtMs(elapsedMs, 1_760_000_000_000 + Math.round(elapsedMs));
      renderFrameAtTs(simTs);
      return {
        sceneIndex: lastAppliedFrameState?.scene.sceneIndex ?? 1,
        chapterTag: lastAppliedFrameState?.scene.chapterTag ?? "",
        cameraFocusMode: clientState.cameraFocusMode,
      };
    };
  }
  void preloadIntroDemoAssets();
  applyIntroDemoStateAtMs(0);
  return true;
}

function formatDemoClock(ms: number): string {
  const totalSec = Math.floor(Math.max(0, ms) / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function paintIntroDemoOverlay(
  c: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const state = lastAppliedFrameState ?? applyIntroDemoStateAtMs(0);
  const { scene, elapsedMs } = state;

  c.save();
  const bannerW = Math.min(760, width - 28);
  const bannerH = 80;
  const bannerX = Math.round((width - bannerW) / 2);
  const bannerY = height - bannerH - 10;
  const innerMaxW = bannerW - 32;

  rrect(c, bannerX, bannerY, bannerW, bannerH, 9);
  fillStroke(c, "rgba(17, 13, 10, 0.92)", scene.accentHex, 2.0);

  // Row 1 Left: Chapter Tag Pill
  c.font = "bold 10.5px monospace";
  const tagW = Math.min(innerMaxW - 170, c.measureText(scene.chapterTag).width + 20);
  rrect(c, bannerX + 16, bannerY + 9, tagW, 19, 4);
  fillStroke(c, "rgba(38, 29, 22, 0.96)", scene.accentHex, 1.2);
  c.fillStyle = scene.accentHex;
  c.textAlign = "left";
  c.fillText(scene.chapterTag, bannerX + 26, bannerY + 22, tagW - 16);

  // Row 1 Right: Scene & Timecode Pill
  const clockText = `SCENE ${scene.sceneIndex}/4 · ${formatDemoClock(elapsedMs)} / 00:35`;
  const clockW = c.measureText(clockText).width + 18;
  const clockX = bannerX + bannerW - clockW - 16;
  rrect(c, clockX, bannerY + 9, clockW, 19, 4);
  fillStroke(c, "rgba(28, 22, 17, 0.96)", "rgba(251, 191, 36, 0.45)", 1.0);
  c.fillStyle = "#fef3c7";
  c.textAlign = "center";
  c.fillText(clockText, clockX + clockW / 2, bannerY + 22);

  // Row 2: Main Scene Headline
  c.textAlign = "left";
  c.font = "bold 16px sans-serif";
  c.fillStyle = "#fffbeb";
  c.fillText(scene.title, bannerX + 16, bannerY + 46, innerMaxW);

  // Row 3: OpenCode V2 -> Pixel Guild Mapping Subtitle
  c.font = "bold 11px monospace";
  c.fillStyle = "#fcd34d";
  c.fillText(scene.mappingSubtitle, bannerX + 16, bannerY + 64, innerMaxW);

  // Bottom Edge: 4-Scene Timeline Progress Bar
  const barX = bannerX + 16;
  const barY = bannerY + bannerH - 7;
  const barW = bannerW - 32;
  rrect(c, barX, barY, barW, 3.5, 2);
  c.fillStyle = "rgba(255, 255, 255, 0.16)";
  c.fill();

  const progressRatio = Math.max(0.01, Math.min(1, elapsedMs / INTRO_DEMO_DURATION_MS));
  rrect(c, barX, barY, barW * progressRatio, 3.5, 2);
  c.fillStyle = scene.accentHex;
  c.fill();
  c.restore();
}

export function renderFallbackDemoSimulatorHeroes(
  c: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  wildsW: number,
  t: number,
): void {
  const demoSlots: Array<[number, number, ResolvedCharacterSlot, string, string, string]> = [
    [195, 135, { x: 195, y: 135, station: "Library", role: "SCOUT", workflowIntent: "information-gathering", overheadLabel: "Reading File", isActing: true }, "Archivist", "#2b547e", "#62b6ea"],
    [600, 155, { x: 600, y: 155, station: "Forge", role: "WARRIOR", workflowIntent: "feature-build", overheadLabel: "Running Shell", isActing: true }, "Forge Smith", "#34673d", "#7ce04b"],
    [118, 265, { x: 118, y: 265, station: "Tinker", role: "MAGE", workflowIntent: "feature-build", overheadLabel: "Crafting Code", isActing: true }, "Artificer", "#c83d28", "#e6a82e"],
    [118, 445, { x: 118, y: 445, station: "Armory", role: "WARRIOR", workflowIntent: "debugging-hunt", overheadLabel: "Equipping Gear", isActing: true }, "Vanguard", "#4d387a", "#b784f7"],
  ];
  for (const [dx, dy, dSlot, dName, dCol, dAcc] of demoSlots) {
    const dp = anchorWorldPoint(dx, dy, cw, ch, wildsW);
    drawCharacterHero(c, dp.x, dp.y, dSlot, dName, dCol, dAcc, false, false, true, t, false, false, undefined, dName);
  }
}
