import {
  type ProjectHeraldryDescriptor,
  resolveCharacterWorldFocus,
  resolveProjectHeraldry,
} from "../spatial/index.ts";
import {
  type ArticulatedRigPoseKind,
  buildArticulatedHeroSvg,
  composeCharacterSprite,
  type ComposeCharacterSpriteInput,
  type DirectionalTurnaround,
  type HeroEquipmentLoadoutMode,
  resolveCanonicalHeroTraits,
  resolveStationFacingDirection,
} from "../sprites/index.ts";
import type { GuildSnapshot } from "../types/domain.ts";
import { createOffscreenBuffer, fillStroke, INK, rrect } from "./asset-manifests.ts";
import { drawPentagramPortalRitual } from "./canvas-station-painter.ts";
import { clientState, isMobileViewport } from "./client-state.ts";
import type { ResolvedCharacterSlot } from "./station-and-workflow-routing.ts";
import { resolveWalkStrideAnimPhase } from "./walker-separation.ts";
import { isCharacterPhysicallyFightingBug, type NamedWildernessBug } from "./wilds-bug-targeting.ts";

export { drawPentagramPortalRitual };

const pixelSpriteBitmapCache = new Map<string, HTMLCanvasElement>();
const articulatedRigImageCache = new Map<string, HTMLImageElement>();

export function buildPixelAtlasComposeInput(
  role: ResolvedCharacterSlot["role"],
  col: string,
  acc: string,
  isWalking: boolean,
  isActing: boolean,
  hasGrimoire: boolean,
  t: number,
): ComposeCharacterSpriteInput {
  const agentClass = role === "WARRIOR" ? "build" : role === "SCOUT" ? "explore" : role === "CLERIC" ? "review" : "plan";
  const lifecycleState = isWalking || isActing ? "WorkingAtStation" : "RestingInLounge";
  const visualTraits = {
    primaryHex: col,
    secondaryHex: col,
    trimHex: acc,
    auraHex: acc,
    monogram: role.slice(0, 2),
    headgear: "visored-helm" as const,
    alcoveArchetype: "Arcane Conduit" as const,
    hashSeed: 0,
  };
  return {
    agentClass,
    lifecycleState,
    timestampMs: Math.floor(t * 1000),
    visualTraits,
    skillGrimoires: hasGrimoire ? [{ skillId: "skill", name: "Grimoire", emblemHex: acc, monogram: "GR" }] : [],
  };
}

export function resolveCharacterRigPoseAndLoadout(
  slot: ResolvedCharacterSlot,
  isWalking: boolean,
  isCompacting: boolean,
  hasGrimoire = false,
  sessionId?: string,
  bugs?: ReadonlyArray<NamedWildernessBug>,
): { poseMode: ArticulatedRigPoseKind; loadout: HeroEquipmentLoadoutMode } {
  const carryLoadout: HeroEquipmentLoadoutMode =
    slot.overheadLabel === "Reporting Scroll" ? "SCROLL" : slot.carriedCargo ? "CARGO" : hasGrimoire ? "B" : "A";
  if (isWalking) return { poseMode: "walk", loadout: carryLoadout };
  if (isCompacting) return { poseMode: "exhale", loadout: carryLoadout };
  if (!slot.isActing) return { poseMode: "idle", loadout: carryLoadout };
  switch (slot.station) {
    case "Combat":
      return isCharacterPhysicallyFightingBug(sessionId, slot, isWalking, bugs) ? { poseMode: "combat", loadout: "A" } : { poseMode: "idle", loadout: carryLoadout };
    case "Forge": return { poseMode: "forge", loadout: "OPENCODE" };
    case "Tinker":
    case "Assembly": return { poseMode: "tinker", loadout: "OPENCODE" };
    case "Library": return { poseMode: "library", loadout: "OPENCODE" };
    case "Spyglass":
    case "WildsSearch": return { poseMode: "spyglass", loadout: "OPENCODE" };
    case "Alchemy": return { poseMode: "alchemy", loadout: "OPENCODE" };
    case "Enchanter":
    case "Armory": return { poseMode: "spellcast", loadout: "OPENCODE" };
    default: return { poseMode: "idle", loadout: carryLoadout };
  }
}

function createSvgImage(
  hero: ReturnType<typeof resolveCanonicalHeroTraits>["hero"],
  party: ReturnType<typeof resolveCanonicalHeroTraits>["party"],
  loadout: HeroEquipmentLoadoutMode,
  poseMode: ArticulatedRigPoseKind,
  dir: DirectionalTurnaround,
  animBucket: number,
  bucketCount = poseMode === "walk" ? 12 : 6,
): HTMLImageElement {
  const svg = buildArticulatedHeroSvg(hero, party, loadout, poseMode, false, dir, animBucket / bucketCount);
  const img = typeof Image !== "undefined" ? new Image() : ({ complete: false, naturalWidth: 0, src: "" } as unknown as HTMLImageElement);
  img.src = "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  return img;
}

export function resolveCharacterProjectHeroTraits(
  sessionId: string,
  role: ResolvedCharacterSlot["role"],
  snapshot: GuildSnapshot = clientState.currentSnapshot,
): {
  heraldry: ProjectHeraldryDescriptor;
  party: ReturnType<typeof resolveCanonicalHeroTraits>["party"];
  hero: ReturnType<typeof resolveCanonicalHeroTraits>["hero"];
} {
  const char = snapshot?.characters?.[sessionId];
  const parentChar = char?.parentId ? snapshot?.characters?.[char.parentId] : undefined;
  const target = char ?? parentChar ?? sessionId;
  const heraldry = resolveProjectHeraldry(target, snapshot);
  const { party, hero } = resolveCanonicalHeroTraits(sessionId, role, heraldry.partyKey);
  return { heraldry, party, hero };
}

function getCachedArticulatedHeroImage(
  sessionId: string,
  role: ResolvedCharacterSlot["role"],
  loadout: HeroEquipmentLoadoutMode,
  poseMode: ArticulatedRigPoseKind,
  dir: DirectionalTurnaround,
  animBucket: number,
  preResolvedTraits?: ReturnType<typeof resolveCharacterProjectHeroTraits>,
): { img: HTMLImageElement; heroName: string; heraldry: ProjectHeraldryDescriptor } {
  const { heraldry, party, hero } =
    preResolvedTraits ?? resolveCharacterProjectHeroTraits(sessionId, role, clientState.currentSnapshot);
  const heroPrefix = `${party.key}:${hero.name}:`;
  const basePrefix = `${heroPrefix}${dir}:${poseMode}:${loadout}`;
  const bucketCount = poseMode === "walk" ? 12 : 6;
  const key = `${basePrefix}:${animBucket}`;
  let img = articulatedRigImageCache.get(key);
  if (img) {
    articulatedRigImageCache.delete(key);
    articulatedRigImageCache.set(key, img);
  } else {
    img = createSvgImage(hero, party, loadout, poseMode, dir, animBucket, bucketCount);
    if (articulatedRigImageCache.size >= 1024) {
      const oldest = articulatedRigImageCache.keys().next().value;
      if (oldest) articulatedRigImageCache.delete(oldest);
    }
    articulatedRigImageCache.set(key, img);
  }
  if (!img.complete || img.naturalWidth === 0) {
    for (let b = 0; b < bucketCount; b++) {
      const alt = articulatedRigImageCache.get(`${basePrefix}:${b}`);
      if (alt && alt.complete && alt.naturalWidth > 0) return { img: alt, heroName: hero.name, heraldry };
    }
    for (const [k, candidate] of articulatedRigImageCache.entries()) {
      if (k.startsWith(heroPrefix) && candidate.complete && candidate.naturalWidth > 0) {
        return { img: candidate, heroName: hero.name, heraldry };
      }
    }
  }
  return { img, heroName: hero.name, heraldry };
}

function drawPixelAtlasHero(
  c: CanvasRenderingContext2D,
  role: ResolvedCharacterSlot["role"],
  col: string,
  acc: string,
  isWalking: boolean,
  isActing: boolean,
  hasGrimoire: boolean,
  t: number,
  walkAnimPhase = 0,
): void {
  const animBucket = isWalking ? Math.floor(walkAnimPhase * 4) % 4 : Math.floor(t * 6) % 4;
  const cacheKey = `${role}:${col}:${acc}:${isWalking ? 1 : 0}:${isActing ? 1 : 0}:${hasGrimoire ? 1 : 0}:${animBucket}`;
  const pxSize = 3;
  const offsetX = -24;
  const offsetY = -28;
  const cachedBitmap = pixelSpriteBitmapCache.get(cacheKey);
  if (cachedBitmap) {
    c.drawImage(cachedBitmap, offsetX, offsetY, 48, 48);
    return;
  }
  const composed = composeCharacterSprite(
    buildPixelAtlasComposeInput(role, col, acc, isWalking, isActing, hasGrimoire, animBucket * 0.16),
  );
  const offscreen = createOffscreenBuffer(48, 48);
  const targetCtx = offscreen ? offscreen.ctx : c;
  const baseX = offscreen ? 0 : offsetX;
  const baseY = offscreen ? 0 : offsetY;
  for (let r = 0; r < composed.pixels.length; r++) {
    const row = composed.pixels[r];
    for (let colIdx = 0; colIdx < row.length; colIdx++) {
      const hex = row[colIdx];
      if (!hex) continue;
      targetCtx.fillStyle = hex;
      targetCtx.fillRect(baseX + colIdx * pxSize, baseY + r * pxSize, pxSize, pxSize);
    }
  }
  if (offscreen) {
    if (pixelSpriteBitmapCache.size >= 256) {
      const oldestKey = pixelSpriteBitmapCache.keys().next().value;
      if (oldestKey) pixelSpriteBitmapCache.delete(oldestKey);
    }
    pixelSpriteBitmapCache.set(cacheKey, offscreen.canvas);
    c.drawImage(offscreen.canvas, offsetX, offsetY, 48, 48);
  }
}

export const SUBAGENT_SCALE_RATIO = 0.7;
export const MOBILE_MODEL_SCALE_MULTIPLIER = 2.0;

export function drawCharacterHero(
  c: CanvasRenderingContext2D,
  hx: number,
  hy: number,
  slot: ResolvedCharacterSlot,
  name: string,
  col: string,
  acc: string,
  isCompacting: boolean,
  isSelected: boolean,
  hasGrimoire: boolean,
  t: number,
  facingLeft: boolean,
  isWalking: boolean,
  facingDirection?: DirectionalTurnaround,
  sessionId?: string,
): void {
  c.save();
  const walker = sessionId ? clientState.characterWalkers.get(sessionId) : undefined;
  const portalPhase = walker?.portalPhase;
  const portalProgress = Math.max(0, Math.min(1, walker?.portalProgress ?? 0));
  const effectiveWalkCycle = typeof walker?.walkCycle === "number" ? walker.walkCycle : t * 12;
  const walkStride = resolveWalkStrideAnimPhase(effectiveWalkCycle);
  const bobY = portalPhase ? 0 : isWalking ? walkStride.bobOffsetY : Math.sin(t * 3.2 + hx) * 1.4;
  const isPhysicallyFighting = isCharacterPhysicallyFightingBug(sessionId, slot, isWalking);
  const rawCombatLunge = isPhysicallyFighting ? Math.max(0, Math.sin(t * 14)) * 7 : 0;
  const combatLungeX = facingLeft || facingDirection === "west" ? -rawCombatLunge : rawCombatLunge;
  c.translate(hx + combatLungeX, hy + bobY);

  const charObj = sessionId ? clientState.currentSnapshot.characters?.[sessionId] : undefined;
  const isSummonedSubagent = Boolean(charObj?.parentId || charObj?.parentSessionId || charObj?.role === "Squad Subagent");
  if (isSummonedSubagent) {
    c.scale(SUBAGENT_SCALE_RATIO, SUBAGENT_SCALE_RATIO);
  }
  if (portalPhase === "spawning" || portalPhase === "despawning") {
    c.beginPath();
    if (typeof c.rect === "function") c.rect(-64, -96, 128, 114);
    if (typeof c.clip === "function") c.clip();
    const holeOffsetY = portalPhase === "spawning" ? (1 - portalProgress) * 52 : portalProgress * 52;
    c.translate(0, holeOffsetY);
    if (portalPhase === "despawning") c.globalAlpha = Math.max(0.15, 1 - portalProgress * 0.8);
  }
  const traits = resolveCharacterProjectHeroTraits(sessionId || name, slot.role, clientState.currentSnapshot);
  const { heraldry } = traits;
  const worldFocus = resolveCharacterWorldFocus(
    charObj ?? sessionId ?? name,
    clientState.currentSnapshot,
    clientState.isAllWorldsFocused ? null : clientState.selectedProjectId,
  );
  if (worldFocus.isDimmed && !isSelected) c.globalAlpha = 0.45;

  const isMobile = isMobileViewport();
  const modelScale = isMobile ? MOBILE_MODEL_SCALE_MULTIPLIER : 1.0;
  const isInactiveSub = isSummonedSubagent && Boolean(charObj && !charObj.isOpenInOpenCode);
  if (worldFocus.isFocusedMember && (!isMobile || (slot.station !== "Lounge" && !isInactiveSub))) {
    c.save();
    c.fillStyle = `${heraldry.auraHex || heraldry.primaryHex}55`;
    c.strokeStyle = heraldry.accentHex || col || "#38bdf8";
    c.lineWidth = 2.8;
    if (charObj?.parentId) c.setLineDash([4, 2]);
    c.beginPath();
    c.ellipse(0, 16 * modelScale, 22 * modelScale, 7 * modelScale, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.setLineDash([3, 3]);
    c.strokeStyle = heraldry.auraHex || heraldry.accentHex || "#fbbf24";
    c.lineWidth = 1.4;
    c.beginPath();
    c.ellipse(0, 16 * modelScale, (26 + Math.sin(t * 4.5) * 1.5) * modelScale, 9 * modelScale, 0, 0, Math.PI * 2);
    c.stroke();
    c.restore();
  }

  if (isSelected) {
    c.save();
    const glowGrad = c.createRadialGradient(0, -4 * modelScale, 3 * modelScale, 0, -4 * modelScale, 30 * modelScale);
    glowGrad.addColorStop(0, "rgba(251, 191, 36, 0.72)");
    glowGrad.addColorStop(0.55, "rgba(245, 158, 11, 0.32)");
    glowGrad.addColorStop(1, "rgba(245, 158, 11, 0)");
    c.fillStyle = glowGrad;
    c.beginPath();
    c.arc(0, -4 * modelScale, 30 * modelScale, 0, Math.PI * 2);
    c.fill();
    c.restore();
    c.shadowColor = "#fbbf24";
    c.shadowBlur = 16;
  }

  c.save();
  if (modelScale !== 1.0) {
    c.scale(modelScale, modelScale);
  }
  if (clientState.visualStyleMode === "pixel-atlas") {
    c.save();
    c.scale(facingLeft ? -0.56 : 0.56, 0.56);
    drawPixelAtlasHero(c, slot.role, heraldry.primaryHex || col, heraldry.accentHex || acc, isWalking, slot.isActing, hasGrimoire, t, walkStride.animPhase);
    c.restore();
  } else {
    const dir: DirectionalTurnaround = facingDirection ?? (isWalking ? (facingLeft ? "west" : "east") : (slot.facingDirection ?? resolveStationFacingDirection(slot.station, slot.x, slot.y)));
    const { poseMode, loadout } = resolveCharacterRigPoseAndLoadout(slot, isWalking, isCompacting, hasGrimoire, sessionId);
    const animBucket = poseMode === "walk" ? walkStride.animBucket12 : Math.floor(t * 6) % 6;
    const { img } = getCachedArticulatedHeroImage(sessionId || name, slot.role, loadout, poseMode, dir, animBucket, traits);
    if (img.complete && img.naturalWidth > 0) {
      c.drawImage(img, -54, -58.625, 108, 106.25);
    } else {
      c.save();
      c.scale(facingLeft ? -0.56 : 0.56, 0.56);
      rrect(c, -14, 2, 28, 24, 5);
      fillStroke(c, heraldry.primaryHex || col, INK, 2.2);
      c.beginPath();
      c.arc(0, -10, 13, 0, Math.PI * 2);
      fillStroke(c, "#f4d2bc", INK, 2.2);
      c.restore();
    }
  }
  c.restore();

  c.shadowBlur = 0;
  const shortTitle = name.length > 13 ? `${name.slice(0, 12)}…` : name;

  if (slot.questMarker) {
    const qBob = Math.sin(t * 5.5) * 2.5;
    const qy = (isMobile ? -44 * modelScale : !slot.overheadLabel ? -44 : -54) + qBob;
    const isPerm = slot.questMarker === "!";
    c.save();
    c.beginPath();
    c.arc(0, qy, isMobile ? 15 : 10.5, 0, Math.PI * 2);
    fillStroke(c, isPerm ? "rgba(245, 158, 11, 0.96)" : "rgba(251, 191, 36, 0.96)", isPerm ? "#fef08a" : "#ffffff", 2);
    c.fillStyle = "#0f172a";
    c.font = isMobile ? "bold 18px monospace" : "bold 13px monospace";
    c.textAlign = "center";
    c.fillText(slot.questMarker, 0, qy + (isMobile ? 6 : 4.5));
    c.restore();
  }

  if (isMobile) {
    const isIdleVerb = !slot.overheadLabel || /^(archived|resting|idle|compacting)$/i.test(slot.overheadLabel);
    const isActiveHero = !isInactiveSub && slot.isActing && slot.station !== "Lounge" && !isIdleVerb;
    if (isSelected || isActiveHero || Boolean(slot.questMarker)) {
      const mobileLabel = isSelected ? shortTitle : !isIdleVerb ? slot.overheadLabel! : shortTitle;
      const borderCol = isSelected ? "#fbbf24" : slot.workflowIntent === "debugging-hunt" ? "#f87171" : slot.workflowIntent === "information-gathering" ? "#38bdf8" : "#10b981";
      const pillY = 20 * modelScale;
      c.font = "bold 13.5px monospace";
      const mw = c.measureText(mobileLabel).width + 16;
      rrect(c, -mw / 2, pillY, mw, 21, 5);
      fillStroke(c, isSelected ? "rgba(120, 53, 15, 0.95)" : "rgba(15, 23, 42, 0.94)", borderCol, 1.6);
      c.fillStyle = isSelected ? "#fef08a" : "#f8fafc";
      c.textAlign = "center";
      c.fillText(mobileLabel, 0, pillY + 15);
    }
    c.restore();
    return;
  }

  if (slot.overheadLabel) {
    const isResultReady = slot.overheadLabel === "✓ Result Ready";
    const pillColor = isResultReady ? "#fbbf24" : slot.workflowIntent === "debugging-hunt" ? "#f87171" : slot.workflowIntent === "information-gathering" ? "#38bdf8" : slot.station === "Armory" ? "#fde047" : "#10b981";
    c.font = "bold 8.5px monospace";
    const ow = c.measureText(slot.overheadLabel).width + 10;
    rrect(c, -ow / 2, -42, ow, 13, 4);
    fillStroke(c, isResultReady ? "rgba(6, 78, 59, 0.95)" : "rgba(15, 23, 42, 0.92)", pillColor, isResultReady ? 1.4 : 1.1);
    c.fillStyle = isResultReady ? "#fef08a" : "#f8fafc";
    c.textAlign = "center";
    c.fillText(slot.overheadLabel, 0, -33);
  }

  const badgeLabel = `${heraldry.crestIcon} ${heraldry.shortTag}${heraldry.isWorktree ? " 🌿" : ""}`;
  c.font = "bold 8px monospace";
  const row1TextW = c.measureText(badgeLabel).width, blockW = row1TextW + 8, blockX = -blockW / 2, rowH = 12;
  let row2Label = name;
  if (c.measureText(row2Label).width > row1TextW) {
    const chars = Array.from(row2Label);
    let k = chars.length - 1;
    while (k > 1 && c.measureText(`${chars.slice(0, k).join("")}…`).width > row1TextW) k--;
    row2Label = `${chars.slice(0, Math.max(1, k)).join("")}…`;
  }
  const tagY = slot.y > 670 ? 7 : slot.station === "Lounge" ? 14 : 18, row2Y = tagY + rowH;
  const borderCol = isSelected ? "#fbbf24" : heraldry.accentHex || "#b45309";
  c.textAlign = "center";
  rrect(c, blockX, tagY, blockW, rowH, [3, 3, 0, 0]);
  fillStroke(c, heraldry.primaryHex || "#7c2d12", borderCol, 1.0);
  rrect(c, blockX, row2Y, blockW, rowH, [0, 0, 3, 3]);
  fillStroke(c, isSelected ? "rgba(120, 53, 15, 0.95)" : "rgba(17, 14, 12, 0.92)", borderCol, 1.1);
  rrect(c, blockX, tagY, blockW, rowH * 2, 3);
  c.strokeStyle = borderCol; c.lineWidth = 1.1; c.stroke();
  c.fillStyle = "#ffffff"; c.fillText(badgeLabel, 0, tagY + 8.5);
  c.fillStyle = isSelected ? "#fef08a" : "#fef3c7"; c.fillText(row2Label, 0, row2Y + 8.5);
  c.restore();
}
