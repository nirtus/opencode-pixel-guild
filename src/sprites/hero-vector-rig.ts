import type { GuildRoleArchetype } from "../types/domain.ts";
import {
  type ArticulatedRigPoseKind,
  CANONICAL_PARTY_ROSTERS,
  type CanonicalHeroDef,
  type CanonicalPartyRoster,
  type CombatWeaponArchetypeKind,
  type DirectionalTurnaround,
  type HeroEquipmentLoadoutMode,
  PARTY_KEY_ORDER,
} from "./hero-party-catalog.ts";
import {
  buildNorthAnatomyLayers,
  buildProfileAnatomyLayers,
  buildSouthAnatomyLayers,
} from "./hero-rig-anatomy.ts";
import { buildHandGrippedArmsAndCargo } from "./hero-rig-arms-and-tools.ts";
import {
  buildActionAndCombatFxOverlay,
  buildSpellcastBackMandala,
} from "./hero-rig-fx-and-combat.ts";

export { CANONICAL_PARTY_ROSTERS };
export type {
  ArticulatedRigPoseKind,
  CanonicalHeroDef,
  CanonicalPartyRoster,
  CombatWeaponArchetypeKind,
  DirectionalTurnaround,
  HeroEquipmentLoadoutMode,
};

export interface PartyPaletteTheme {
  partyId: string;
  name: string;
  motto: string;
  bgHex: string;
  cardBgHex: string;
  textHex: string;
  auraHex: string;
  primaryHex: string;
  secondaryHex: string;
  accentHex: string;
  metalHex: string;
  metalDarkHex: string;
}

export const CANONICAL_PARTY_PALETTES: Readonly<Record<string, PartyPaletteTheme>> =
  Object.freeze(
    Object.fromEntries(
      Object.entries(CANONICAL_PARTY_ROSTERS).map(([k, p]) => [
        k,
        Object.freeze({
          partyId: p.id,
          name: p.name,
          motto: p.motto,
          bgHex: p.bg,
          cardBgHex: p.cardBg,
          textHex: p.textCol,
          auraHex: p.aura,
          primaryHex: p.primary,
          secondaryHex: p.secondary,
          accentHex: p.accent,
          metalHex: p.metal,
          metalDarkHex: p.metalDark,
        }),
      ]),
    ),
  );

function resolvePartyKeyFromSeed(partyKeyOrSeed = "01"): string {
  const padded = partyKeyOrSeed.padStart(2, "0");
  if (padded in CANONICAL_PARTY_ROSTERS) return padded;
  let hash = 2166136261;
  for (let i = 0; i < partyKeyOrSeed.length; i++) {
    hash ^= partyKeyOrSeed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return PARTY_KEY_ORDER[(hash >>> 0) % PARTY_KEY_ORDER.length];
}

export function resolvePartyPalette(partyKeyOrSeed = "01"): PartyPaletteTheme {
  const cleanKey = resolvePartyKeyFromSeed(partyKeyOrSeed);
  return CANONICAL_PARTY_PALETTES[cleanKey] ?? CANONICAL_PARTY_PALETTES["01"];
}

export function resolveCombatWeaponArchetype(
  role: GuildRoleArchetype | string,
): CombatWeaponArchetypeKind {
  switch (role) {
    case "WARRIOR":
      return "sword";
    case "MAGE":
      return "staff";
    case "SCOUT":
      return "bow";
    case "SAPPER":
      return "pickaxe";
    case "ALCHEMIST":
    case "CLERIC":
    default:
      return "dagger";
  }
}

export const DIAGONAL_FACING_HYSTERESIS = 1.18;

export function deriveFacingDirectionFromDelta(
  dx: number,
  dy: number,
  currentFacing?: DirectionalTurnaround,
): DirectionalTurnaround {
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  if (currentFacing === "east" || currentFacing === "west") {
    if (absY > absX * DIAGONAL_FACING_HYSTERESIS) {
      return dy >= 0 ? "south" : "north";
    }
    return absX > 0.01 ? (dx >= 0 ? "east" : "west") : currentFacing;
  }
  if (currentFacing === "north" || currentFacing === "south") {
    if (absX > absY * DIAGONAL_FACING_HYSTERESIS) {
      return dx >= 0 ? "east" : "west";
    }
    return absY > 0.01 ? (dy >= 0 ? "south" : "north") : currentFacing;
  }
  if (absX >= absY) {
    return dx >= 0 ? "east" : "west";
  }
  return dy >= 0 ? "south" : "north";
}

const STATION_FOCAL_CENTERS: Readonly<Record<string, { x: number; y: number }>> =
  Object.freeze({
    Library: { x: 136, y: 88 },
    Spyglass: { x: 284, y: 78 },
    Forge: { x: 645, y: 102 },
    Tinker: { x: 92, y: 262 },
    Armory: { x: 92, y: 442 },
    Enchanter: { x: 206, y: 624 },
    Stockpile: { x: 452, y: 84 },
    Alchemy: { x: 680, y: 465 },
    Assembly: { x: 390, y: 345 },
    Lounge: { x: 622, y: 632 },
    Combat: { x: 1315, y: 380 },
  });

export function resolveStationFacingDirection(
  station: string,
  slotX?: number,
  slotY?: number,
): DirectionalTurnaround {
  if (typeof slotX === "number" && typeof slotY === "number") {
    const focal = STATION_FOCAL_CENTERS[station];
    if (
      focal &&
      (Math.abs(focal.x - slotX) > 2 || Math.abs(focal.y - slotY) > 2)
    ) {
      return deriveFacingDirectionFromDelta(focal.x - slotX, focal.y - slotY);
    }
  }
  if (
    station === "Library" ||
    station === "Spyglass" ||
    station === "Forge" ||
    station === "Assembly"
  ) {
    return "north";
  }
  if (station === "Tinker" || station === "Armory") {
    return "west";
  }
  if (
    station === "Alchemy" ||
    station === "Combat" ||
    station === "WildsSearch"
  ) {
    return "east";
  }
  return "south";
}

export function resolveCanonicalHeroTraits(
  sessionId = "ses_default",
  role: GuildRoleArchetype | string = "WARRIOR",
  partyKey?: string,
): { party: CanonicalPartyRoster; hero: CanonicalHeroDef } {
  const cleanKey = partyKey && partyKey.padStart(2, "0") in CANONICAL_PARTY_ROSTERS
    ? partyKey.padStart(2, "0")
    : resolvePartyKeyFromSeed(sessionId);
  const party = CANONICAL_PARTY_ROSTERS[cleanKey] ?? CANONICAL_PARTY_ROSTERS["01"];
  const normalizedRole = role.toUpperCase();
  const isDirectPartySeed =
    !sessionId ||
    sessionId === "ses_default" ||
    sessionId.padStart(2, "0") in CANONICAL_PARTY_ROSTERS;
  const heroPartyKey = isDirectPartySeed ? cleanKey : resolvePartyKeyFromSeed(sessionId);
  const heroParty = CANONICAL_PARTY_ROSTERS[heroPartyKey] ?? party;
  const hero =
    heroParty.heroes.find((h) => h.role === normalizedRole) ??
    party.heroes.find((h) => h.role === normalizedRole) ??
    party.heroes[0];
  return { party, hero };
}

function buildPhaseKeyframeStyles(phase: number): string {
  const s = Math.sin(phase * Math.PI * 2);
  const c = Math.cos(phase * Math.PI * 2);
  const spinDeg = Math.round(phase * 360);
  const revDeg = Math.round((1 - phase) * 360);
  const smashY = Math.round(s > 0 ? -38 * s : 8 * Math.abs(s));
  const tinkerY = Math.round(s > 0 ? -28 * s : 8 * Math.abs(s));
  const plungeY = Math.round(s > 0 ? -20 * s : 6 * Math.abs(s));
  const swordHeaveY = Math.round(-4 * s);
  const swordArmRot = Math.round(-5 - 42 * s + 32 * c);
  const pickHeaveY = Math.round(-4 * s);
  const pickArmRot = Math.round(-8 - 46 * s + 32 * c);
  const stabX = Math.round(s > 0 ? 28 * s : -14 * Math.abs(s));
  const fxSweepX = Math.round(c * 5);
  const fxSweepY = Math.round(-s * 6);
  const fxSweepRot = Math.round(-s * 12 + c * 6);
  const fxSlashOpacity = Number((0.74 + 0.26 * Math.abs(s)).toFixed(2));
  const arrowX = Math.round(((phase * 2) % 1) * 44);
  const strideDeg = Math.round(s * 18);
  const sparkAScale = Number((0.8 + 0.3 * Math.abs(s)).toFixed(2));
  const sparkBScale = Number((0.8 + 0.3 * Math.abs(c)).toFixed(2));
  const float1Y = Math.round(s * -10);
  const float2Y = Math.round(c * -12);
  const bubble1Y = Math.round(-phase * 18);
  const bubble2Y = Math.round(-((phase + 0.5) % 1) * 18);
  const haloScale = Number((1 + 0.06 * s).toFixed(2));

  return `
    <style>
      .pose-walk .limb-leg-l { transform: rotate(${strideDeg}deg); transform-origin: 99px 198px; }
      .pose-walk .limb-leg-r { transform: rotate(${-strideDeg}deg); transform-origin: 120px 198px; }
      .pose-walk .limb-leg-back { transform: rotate(${-strideDeg}deg); transform-origin: 110px 196px; }
      .pose-walk .limb-leg-front { transform: rotate(${strideDeg}deg); transform-origin: 110px 196px; }
      .pose-walk .limb-arm-l { transform: rotate(${-strideDeg}deg); transform-origin: 80px 146px; }
      .pose-walk .limb-arm-r { transform: rotate(${strideDeg}deg); transform-origin: 140px 146px; }
      .pose-forge .limb-arm-r { transform: translateY(${smashY}px); }
      .pose-tinker .limb-arm-r { transform: translateY(${tinkerY}px); }
      .pose-library .limb-arm-r { transform: translateY(${float1Y}px); }
      .pose-spyglass .limb-arm-r { transform: translateY(${-28 + Math.round(s * 3)}px); }
      .pose-alchemy .limb-arm-r { transform: translateY(${plungeY}px); }
      .pose-combat.weapon-sword .limb-arm-r { transform: translateY(${swordHeaveY}px) rotate(${swordArmRot}deg); transform-origin: 140px 148px; }
      .pose-combat.weapon-pickaxe .limb-arm-r { transform: translateY(${pickHeaveY}px) rotate(${pickArmRot}deg); transform-origin: 140px 148px; }
      .pose-combat.weapon-dagger .limb-arm-r { transform: translate(${stabX}px, -8px); }
      .pose-combat.weapon-bow .limb-arm-r { transform: translate(6px, -18px); }
      .pose-combat.weapon-staff .limb-arm-r { transform: translate(6px, ${-8 + Math.round(s * 5)}px) rotate(${Math.round(10 * s)}deg); transform-origin: 140px 148px; }
      .pose-combat .fx-slash { transform: translate(${fxSweepX}px, ${fxSweepY}px) rotate(${fxSweepRot}deg); opacity: ${fxSlashOpacity}; transform-origin: 140px 160px; }
      .pose-combat .fx-staff-beam { transform: translate(${Math.round(((phase * 2) % 1) * 28)}px, ${Math.round(s * 3)}px); }
      .fx-rune-spin { transform: rotate(${spinDeg}deg); transform-origin: 0px 0px; }
      .fx-rune-rev { transform: rotate(${revDeg}deg); transform-origin: 0px 0px; }
      .fx-spark-a { transform: scale(${sparkAScale}); opacity: ${Number((0.65 + 0.35 * Math.abs(s)).toFixed(2))}; }
      .fx-spark-b { transform: scale(${sparkBScale}); opacity: ${Number((0.65 + 0.35 * Math.abs(c)).toFixed(2))}; }
      .fx-arrow-shot { transform: translateX(${arrowX}px); }
      .fx-nova { transform: scale(${sparkAScale}) rotate(${Math.round(phase * 90)}deg); transform-origin: 0px 0px; }
      .fx-float-1 { transform: translateY(${float1Y}px); }
      .fx-float-2 { transform: translateY(${float2Y}px); }
      .anim-bubble-1, .anim-breath-1 { transform: translateY(${bubble1Y}px); }
      .anim-bubble-2, .anim-breath-2 { transform: translateY(${bubble2Y}px); }
      .anim-halo { transform: scale(${haloScale}); transform-origin: 110px 96px; }
    </style>
  `;
}

export function buildArticulatedHeroSvg(
  hero: CanonicalHeroDef,
  party: CanonicalPartyRoster,
  loadout: HeroEquipmentLoadoutMode = "A",
  poseMode: ArticulatedRigPoseKind = "idle",
  includeCardAura = true,
  dir: DirectionalTurnaround = "south",
  animPhase = 0,
): string {
  const weaponType = resolveCombatWeaponArchetype(hero.role);
  const styleBlock = buildPhaseKeyframeStyles(animPhase);

  let baseAura = includeCardAura
    ? `<circle cx="110" cy="145" r="72" fill="${party.aura}" />`
    : "";
  baseAura += `<ellipse cx="110" cy="242" rx="48" ry="8" fill="rgba(0,0,0,0.22)" />`;
  if (poseMode === "spellcast") {
    baseAura += buildSpellcastBackMandala(party);
  }

  const { leftArmLayer, rightArmLayer, cargoOverlay } =
    buildHandGrippedArmsAndCargo(hero, party, loadout, poseMode);
  const fxOverlay = buildActionAndCombatFxOverlay(party, poseMode, weaponType, animPhase);

  if (dir === "north") {
    const north = buildNorthAnatomyLayers(hero, party);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="330" height="325" viewBox="-55 -32.5 330 325" class="w-full h-auto overflow-visible select-none dir-north pose-${poseMode} weapon-${weaponType}">${styleBlock}<g class="rig-root">${baseAura}${north.legsLayer}${leftArmLayer}${rightArmLayer}${cargoOverlay}${north.torsoLayer}${north.headLayer}${fxOverlay}</g></svg>`;
  }

  if (dir === "east" || dir === "west") {
    const flip = dir === "west" ? `transform="translate(220, 0) scale(-1, 1)"` : "";
    const profile = buildProfileAnatomyLayers(hero, party);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="330" height="325" viewBox="-55 -32.5 330 325" class="w-full h-auto overflow-visible select-none dir-profile pose-${poseMode} weapon-${weaponType}">${styleBlock}<g ${flip}><g class="rig-root">${baseAura}${profile.backGearLayer}${leftArmLayer}${profile.legsLayer}${profile.torsoLayer}${profile.headLayer}<g transform="translate(-14, 0)">${rightArmLayer}</g><g transform="translate(-12, 0)">${cargoOverlay}${fxOverlay}</g></g></g></svg>`;
  }

  const south = buildSouthAnatomyLayers(hero, party);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="330" height="325" viewBox="-55 -32.5 330 325" class="w-full h-auto overflow-visible select-none dir-south pose-${poseMode} weapon-${weaponType}">${styleBlock}<g class="rig-root">${baseAura}${south.backGearLayer}${south.legsLayer}${south.torsoLayer}${leftArmLayer}${rightArmLayer}${cargoOverlay}${south.headLayer}${fxOverlay}</g></svg>`;
}
