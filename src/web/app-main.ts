import { anchorWorldPoint, hitTestSceneFrame, resolveEffectiveChamberFocus } from "../scene/index.ts";
import { resolvePartyPalette } from "../sprites/index.ts";
import { drawCharacterHero, drawPentagramPortalRitual } from "./canvas-hero-painter.ts";
import { renderWorkshopRoom } from "./canvas-room-painter.ts";
import { deriveProjectBugMonsters, hasHeroFightingMonster, renderOutdoorWilderness } from "./canvas-wilds-painter.ts";
import { resolveHeroWorldCanvasPosition } from "./wilds-bug-targeting.ts";
import { stepClientChoreography } from "./client-choreography.ts";
import {
  clientState,
  getSelectedProjectRoom,
  getVisibleProjectCharacters,
  persistClientUiWindowState,
} from "./client-state.ts";
import {
  getEffectiveViewportWidth,
  initPointerAndCameraControls,
  shouldRenderCanvasFrameAtTimestamp,
  syncViewportCameraFit,
} from "./pointer-and-camera.ts";
import {
  reconcileSidePanel,
  reconcileTicker,
} from "./side-panel-reconciler.ts";
import { type ResolvedCharacterSlot } from "./station-and-workflow-routing.ts";
import {
  initTopBarControls,
  reconcileTopBar,
} from "./top-bar-reconciler.ts";
import {
  initSummonAdventurerControls,
  syncSummonModalDom,
} from "./summon-adventurer-controller.ts";
import {
  getOperatorHeaders,
  syncOperatorAuthGate,
  withOperatorQuery,
} from "./operator-pairing-controller.ts";
import {
  clearCachedGitState,
  invalidateRoomGitCache,
  refreshRoomGitState,
  wasRoomGitMutatedRecently,
} from "./commit-ledger-controller.ts";
import { applyAuthoritativeSnapshot } from "./snapshot-gate.ts";

export { clearCachedGitState, hitTestSceneFrame, stepClientChoreography };

const canvas = document.getElementById("guild-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

let hudSyncScheduled = false;
export function scheduleHudSync(): void {
  if (hudSyncScheduled) return;
  hudSyncScheduled = true;
  requestAnimationFrame(() => {
    hudSyncScheduled = false;
    persistClientUiWindowState(clientState);
    reconcileTopBar(scheduleHudSync);
    reconcileSidePanel(scheduleHudSync);
    reconcileTicker();
    syncSummonModalDom();
    syncViewportCameraFit(canvas);
  });
}

function drawSummoningRitual(
  c: CanvasRenderingContext2D,
  rx: number,
  ry: number,
  progress: number,
  kind: "spawn" | "despawn" = "spawn",
  t = 0,
): void {
  drawPentagramPortalRitual(c, rx, ry, progress, kind, t);
}

let activeRafId = 0;
let lastRenderedFrameTs = 0;

function scheduleNextCanvasFrame(): void {
  if (activeRafId) cancelAnimationFrame(activeRafId);
  activeRafId = requestAnimationFrame(renderCanvasFrame);
}

function renderCanvasFrame(timestampMs: number): void {
  activeRafId = 0;
  if (
    !shouldRenderCanvasFrameAtTimestamp(timestampMs, lastRenderedFrameTs, {
      isHeadless: isHeadlessBrowser,
      cameraGestureActive: clientState.cameraGestureActive,
    })
  ) {
    scheduleNextCanvasFrame();
    return;
  }
  lastRenderedFrameTs = timestampMs;

  const effectiveTs = isHeadlessBrowser
    ? (headlessFramesRendered < 8 ? (headlessSimTimeMs += 250) : headlessSimTimeMs)
    : timestampMs;
  const t = effectiveTs * 0.001;
  const dtMs = isHeadlessBrowser ? (headlessFramesRendered < 8 ? 250 : 16) : Math.min(80, Math.max(8, timestampMs - clientState.lastFrameTs));
  clientState.lastFrameTs = effectiveTs;

  // Phase 1: Pure pre-render choreography, particle, flare & hitbox step
  stepClientChoreography(dtMs / 1000, effectiveTs);
  syncViewportCameraFit(canvas);

  // Phase 2: Stateless Canvas2D painting
  ctx.fillStyle = "#14100d";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(clientState.cameraPanX, clientState.cameraPanY);
  ctx.scale(clientState.cameraZoom, clientState.cameraZoom);

  const vw = getEffectiveViewportWidth();
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const effective = resolveEffectiveChamberFocus(
    clientState.cameraFocusMode,
    vw,
    vh,
    hasHeroFightingMonster(),
  );
  const cw = clientState.chamberWidth || 800;
  const wildsW = clientState.wildsWidth || cw;
  const ch = clientState.chamberHeight || 720;

  // 1. Left Chamber: Workshop Room (anchored to cw x ch) — painted when Room is visible
  if (effective !== "wilds") {
    renderWorkshopRoom(ctx, cw, ch, t);

    for (const sp of clientState.snapParticles) {
      const spPos = anchorWorldPoint(sp.x, sp.y, cw, ch, wildsW);
      ctx.save();
      ctx.fillStyle = sp.color;
      ctx.beginPath();
      ctx.arc(
        spPos.x + sp.vx * (1 - sp.life) * 35,
        spPos.y + sp.vy * (1 - sp.life) * 35,
        sp.size * sp.life,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.restore();
    }
  }

  // 2. Right Chamber: Outdoor Bug-Hunting Dungeon Wilds (anchored to wildsW x ch) — painted when Wilds is visible
  if (effective !== "workshop") {
    renderOutdoorWilderness(ctx, cw, wildsW, ch, t, effectiveTs);
  }

  // 3. Summoning Rituals & Characters (stateless read from clientState, 1:1 unstretched sprites)
  for (const ritual of clientState.activeSummoningRituals.values()) {
    if (effective === "workshop" && ritual.x >= 800) continue;
    if (effective === "wilds" && ritual.x < 800) continue;
    const rPos = anchorWorldPoint(ritual.x, ritual.y, cw, ch, wildsW);
    const elapsed = effectiveTs - ritual.startedAtMs;
    drawSummoningRitual(
      ctx,
      rPos.x,
      rPos.y,
      Math.max(0, Math.min(1, elapsed / ritual.durationMs)),
      ritual.kind ?? "spawn",
      t,
    );
  }

  const chars = getVisibleProjectCharacters();
  if (chars.length > 0) {
    const activeBugsForPos = deriveProjectBugMonsters();
    const depthSortedChars = [...chars].sort(
      (a, b) =>
        (clientState.characterWalkers.get(a.sessionId)?.currentY ?? 0) -
        (clientState.characterWalkers.get(b.sessionId)?.currentY ?? 0),
    );
    for (const c of depthSortedChars) {
      const walker = clientState.characterWalkers.get(c.sessionId);
      if (!walker || !walker.resolvedSlot || walker.despawnCompleted || walker.awaitingParentSummon) continue;
      if (effective === "workshop" && walker.currentX >= 800) continue;
      if (effective === "wilds" && walker.currentX < 760) continue;
      const heroPos = resolveHeroWorldCanvasPosition(walker, cw, ch, wildsW, activeBugsForPos);
      const partyPalette = resolvePartyPalette(c.parentId ?? c.sessionId);
      drawCharacterHero(
        ctx,
        heroPos.x,
        heroPos.y,
        walker.resolvedSlot,
        c.title || c.sessionId,
        c.visualTraits?.primaryHex || partyPalette.primaryHex,
        c.visualTraits?.trimHex || partyPalette.secondaryHex,
        c.lifecycleState === "DistillingContextMana",
        clientState.selectedSessionId === c.sessionId,
        (c.skillGrimoires || []).length > 0,
        t,
        walker.facingLeft,
        walker.isWalking,
        walker.facingDirection,
        c.sessionId,
      );
    }
  } else if (clientState.currentSnapshot.activeAdapter === "demo-simulator") {
    const demoSlots: Array<[number, number, ResolvedCharacterSlot, string, string, string]> = [
      [195, 135, { x: 195, y: 135, station: "Library", role: "SCOUT", workflowIntent: "information-gathering", overheadLabel: "Reading File", isActing: true }, "Archivist", "#2b547e", "#62b6ea"],
      [600, 155, { x: 600, y: 155, station: "Forge", role: "WARRIOR", workflowIntent: "feature-build", overheadLabel: "Running Shell", isActing: true }, "Forge Smith", "#34673d", "#7ce04b"],
      [118, 265, { x: 118, y: 265, station: "Tinker", role: "MAGE", workflowIntent: "feature-build", overheadLabel: "Crafting Code", isActing: true }, "Artificer", "#c83d28", "#e6a82e"],
      [118, 445, { x: 118, y: 445, station: "Armory", role: "WARRIOR", workflowIntent: "debugging-hunt", overheadLabel: "Equipping Gear", isActing: true }, "Vanguard", "#4d387a", "#b784f7"],
    ];
    for (const [dx, dy, dSlot, dName, dCol, dAcc] of demoSlots) {
      const dp = anchorWorldPoint(dx, dy, cw, ch, wildsW);
      drawCharacterHero(ctx, dp.x, dp.y, dSlot, dName, dCol, dAcc, false, false, true, t, false, false, undefined, dName);
    }
  }

  ctx.restore();
  if (!isHeadlessBrowser || headlessFramesRendered < 8) {
    headlessFramesRendered++;
    scheduleNextCanvasFrame();
  }
}

const isHeadlessBrowser = /HeadlessChrome/i.test(navigator.userAgent);
let headlessFramesRendered = 0;
let headlessSimTimeMs = Date.now();
let headlessSpriteRepaintPending = false;

let activeEventSource: EventSource | null = null;
let lastSseMessageAtMs = Date.now();
let fallbackPollTimer: ReturnType<typeof setInterval> | null = null;

function openLiveEventStream(): void {
  if (isHeadlessBrowser || typeof EventSource === "undefined") return;
  activeEventSource?.close();
  const es = new EventSource(withOperatorQuery("/api/guild/events"));
  activeEventSource = es;
  lastSseMessageAtMs = Date.now();
  es.addEventListener("error", () => {
    if (es.readyState === EventSource.CLOSED) {
      setTimeout(() => {
        if (activeEventSource === es) openLiveEventStream();
      }, 2000);
    }
  });
  if (!fallbackPollTimer) {
    fallbackPollTimer = setInterval(() => {
      if (!activeEventSource || activeEventSource.readyState === EventSource.CLOSED) {
        openLiveEventStream();
      }
      if (Date.now() - lastSseMessageAtMs >= 20_000) {
        void fetch("/api/guild/snapshot", { headers: getOperatorHeaders() })
          .then((r) => (r.ok ? r.json() : null))
          .then((snap) => {
            if (snap && snap.rooms && applyAuthoritativeSnapshot(snap)) {
              lastSseMessageAtMs = Date.now();
              scheduleHudSync();
            }
          })
          .catch(() => {});
      }
    }, 10_000);
  }
  es.addEventListener("message", (ev) => {
    lastSseMessageAtMs = Date.now();
    try {
      const emission = JSON.parse(ev.data);
      if (emission && emission.snapshot) {
        applyAuthoritativeSnapshot(emission.snapshot);
        const kind = emission.delta?.kind;
        if (
          emission.delta?.description &&
          kind !== "timer.tick" &&
          kind !== "location.discovered" &&
          kind !== "catalog.hydrated" &&
          kind !== "tasks.hydrated"
        ) {
          clientState.tickerLog.push(emission);
          if (clientState.tickerLog.length > 40) {
            clientState.tickerLog.splice(0, clientState.tickerLog.length - 40);
          }
        }
        if (
          kind === "tasks.hydrated" ||
          kind === "stream.reconnected" ||
          kind === "session.idle"
        ) {
          const room = getSelectedProjectRoom();
          const changedRooms = Array.isArray((emission.delta as { changedRoomIds?: string[] } | undefined)?.changedRoomIds)
            ? ((emission.delta as { changedRoomIds?: string[] }).changedRoomIds ?? [])
            : [];
          const deltaRoomId =
            (emission.delta as { roomId?: string; locationDirectory?: string } | undefined)?.roomId ||
            (emission.delta as { locationDirectory?: string } | undefined)?.locationDirectory ||
            (changedRooms.length === 1 ? changedRooms[0] : null) ||
            (kind === "stream.reconnected" ? (room?.roomId ?? null) : null);
          const affectsSelectedRoom = Boolean(
            room?.roomId && (deltaRoomId === room.roomId || changedRooms.includes(room.roomId)),
          );
          const isEchoFromMutation =
            kind === "tasks.hydrated" &&
            deltaRoomId !== null &&
            wasRoomGitMutatedRecently(deltaRoomId, 1500);
          if (!isEchoFromMutation) {
            if (room?.roomId && affectsSelectedRoom && !wasRoomGitMutatedRecently(room.roomId, 1500)) {
              void refreshRoomGitState(room.roomId, scheduleHudSync);
            } else if ((kind === "tasks.hydrated" || kind === "session.idle") && deltaRoomId) {
              invalidateRoomGitCache(deltaRoomId);
            }
          }
        }
        scheduleHudSync();
      }
    } catch {
      // Ignore SSE parse errors
    }
  });
}

async function connectCompanionBackend(): Promise<void> {
  try {
    await syncOperatorAuthGate(scheduleHudSync);
    const res = await fetch("/api/guild/snapshot", {
      headers: getOperatorHeaders(),
    });
    if (res.ok) {
      const snapshot = await res.json();
      if (snapshot && snapshot.rooms) {
        applyAuthoritativeSnapshot(snapshot, { allowVersionReset: true });
        clientState.tickerLog.push({
          category: "system",
          summary: `Connected to live OpenCode daemon (${snapshot.summary.totalRooms} rooms, ${Object.keys(snapshot.characters).length} sessions)`,
        });
        reconcileTopBar(scheduleHudSync);
        const room = getSelectedProjectRoom();
        if (room?.roomId) {
          await refreshRoomGitState(room.roomId, scheduleHudSync);
        }
        syncViewportCameraFit(canvas, true);
        reconcileSidePanel(scheduleHudSync);
        reconcileTicker();
        syncSummonModalDom();
        scheduleHudSync();
        if (isHeadlessBrowser) {
          headlessFramesRendered = 0;
          scheduleNextCanvasFrame();
          return;
        }
      }
    }
  } catch {
    // Ignore initial snapshot fetch error
  }

  openLiveEventStream();
}

window.addEventListener("guild-operator-changed", () => {
  openLiveEventStream();
  syncViewportCameraFit(canvas, true);
  reconcileTopBar(scheduleHudSync);
  reconcileSidePanel(scheduleHudSync);
  reconcileTicker();
  scheduleHudSync();
  if (isHeadlessBrowser) {
    headlessFramesRendered = 0;
    scheduleNextCanvasFrame();
  }
});

initTopBarControls(scheduleHudSync);
initSummonAdventurerControls(scheduleHudSync);
initPointerAndCameraControls(canvas, scheduleHudSync);
scheduleHudSync();
connectCompanionBackend();
window.addEventListener("guild-sprite-loaded", () => {
  if (isHeadlessBrowser && !headlessSpriteRepaintPending) {
    headlessSpriteRepaintPending = true;
    requestAnimationFrame((ts) => {
      headlessSpriteRepaintPending = false;
      renderCanvasFrame(ts);
    });
  }
});
scheduleNextCanvasFrame();
